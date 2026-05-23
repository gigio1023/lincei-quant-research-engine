import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LivePilotStatusRecord } from '../../../entities/live-pilot-status.entity';
import { LeanRun } from '../../../entities/lean-run.entity';
import { PortfolioTargetSnapshot } from '../../../entities/portfolio-target-snapshot.entity';
import { PaperOrderPlan } from '../../../entities/paper-order-plan.entity';
import { BrokerSnapshot } from '../../../entities/broker-snapshot.entity';
import { ExecutionControlState } from '../../../entities/execution-control-state.entity';
import {
  LivePilotPreflightContract,
  MAX_LIVE_PILOT_NOTIONAL_USD,
} from '../contracts/v1-pilot.contracts';
import { LeanRunImportService } from '../lean/lean-run-import.service';
import { MockBrokerAdapter } from '../broker/mock-broker.adapter';

@Injectable()
export class LivePreflightService {
  constructor(
    @InjectRepository(LivePilotStatusRecord)
    private readonly statusRepository: Repository<LivePilotStatusRecord>,
    @InjectRepository(LeanRun)
    private readonly leanRunRepository: Repository<LeanRun>,
    @InjectRepository(PortfolioTargetSnapshot)
    private readonly targetRepository: Repository<PortfolioTargetSnapshot>,
    @InjectRepository(PaperOrderPlan)
    private readonly paperPlanRepository: Repository<PaperOrderPlan>,
    @InjectRepository(BrokerSnapshot)
    private readonly brokerSnapshotRepository: Repository<BrokerSnapshot>,
    @InjectRepository(ExecutionControlState)
    private readonly executionControlRepository: Repository<ExecutionControlState>,
    private readonly leanRunImportService: LeanRunImportService,
    private readonly mockBrokerAdapter: MockBrokerAdapter,
  ) {}

  async runPreflight(): Promise<LivePilotPreflightContract> {
    const blockers: string[] = [];
    const latestLeanRun = await this.leanRunImportService.getLatestRun();
    if (!latestLeanRun || latestLeanRun.status !== 'passed') {
      blockers.push('Latest LEAN backtest did not pass.');
    }

    const latestTargets = latestLeanRun
      ? await this.targetRepository.find({
          where: { leanRunId: latestLeanRun.runId },
          order: { asOf: 'DESC' },
          take: 1,
        })
      : [];
    const latestTarget = latestTargets[0];
    if (!latestTarget || latestTarget.targets.length === 0) {
      blockers.push('Latest portfolio target snapshot is missing.');
    }

    const latestPaperPlans = await this.paperPlanRepository.find({
      where: { status: 'filled' },
      order: { updatedAt: 'DESC' },
      take: 1,
    });
    const latestPaperPlan = latestPaperPlans[0];
    if (!latestPaperPlan) {
      blockers.push('Latest paper cycle has not produced a filled plan.');
    }

    const latestBrokerSnapshots = await this.brokerSnapshotRepository.find({
      order: { asOf: 'DESC' },
      take: 1,
    });
    const latestBrokerSnapshot = latestBrokerSnapshots[0];
    if (!latestBrokerSnapshot) {
      blockers.push('Broker read-only snapshot is missing.');
    }

    const executionControls = await this.executionControlRepository.find({
      order: { createdAt: 'DESC' },
      take: 1,
    });
    const executionControl = executionControls[0];
    if (executionControl?.state === 'halted') {
      blockers.push('Kill switch is tripped.');
    }

    const requiredFlags = {
      brokerWriteEnabled: process.env.BROKER_WRITE_ENABLED === 'true',
      liveTradingEnabled: process.env.LIVE_TRADING_ENABLED === 'true',
      maxPilotNotionalUsd:
        Number(process.env.MAX_LIVE_PILOT_NOTIONAL_USD ?? 0) ===
        MAX_LIVE_PILOT_NOTIONAL_USD,
      tossOrderSchemaVerified: process.env.TOSS_ORDER_SCHEMA_VERIFIED === 'true',
      tossOpenApiSchemaVerified:
        process.env.TOSS_OPEN_API_SCHEMA_VERIFIED === 'true',
      cancelFlattenReady: process.env.BROKER_CANCEL_FLATTEN_READY === 'true',
    };

    Object.entries(requiredFlags).forEach(([flag, ready]) => {
      if (!ready) {
        blockers.push(`Required flag not ready: ${flag}`);
      }
    });

    const openOrders = await this.mockBrokerAdapter.getOpenOrders();
    if (openOrders.some((order) => order.status === 'open')) {
      blockers.push('Unknown open broker orders detected.');
    }

    const credentialMode = process.env.BROKER_CREDENTIAL_SECRET_REF
      ? 'external-secret'
      : process.env.TOSS_CLIENT_ID
        ? 'local-dev-env'
        : 'missing';
    if (credentialMode === 'missing') {
      blockers.push('Broker credentials are missing.');
    }

    const preflight: LivePilotPreflightContract = {
      status: blockers.length === 0 ? 'ready' : 'blocked',
      checkedAt: new Date().toISOString(),
      maxPilotNotionalUsd: MAX_LIVE_PILOT_NOTIONAL_USD,
      broker: process.env.BROKER_PROVIDER ?? 'toss',
      blockers,
      requiredFlags,
      latestLeanRunId: latestLeanRun?.runId,
      latestPaperPlanId: latestPaperPlan?.id,
      latestBrokerSnapshotId: latestBrokerSnapshot?.id,
      openOrderRefs: openOrders.map((order) => order.orderRefHash),
      credentialMode,
    };

    await this.statusRepository.save(
      this.statusRepository.create({
        status: preflight.status,
        checkedAt: new Date(preflight.checkedAt),
        preflight,
        realOrderSent: false,
        blockers,
        latestLeanRunId: latestLeanRun?.runId,
        latestPaperPlanId: latestPaperPlan?.id,
      }),
    );

    return preflight;
  }
}
