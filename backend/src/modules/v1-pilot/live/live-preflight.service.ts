/**
 * Fail-closed gate before any live notional. "Unknown" broker, LEAN run mode, or reconciliation
 * state is treated as blocked — never optimistically ready.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
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
import {
  LeanRunConfigEvidence,
  assessBrokerSnapshotForLive,
  assessStaticLeanRunBlockers,
  readLeanParameter,
} from './live-preflight-readiness';
import { MlModelRegistryService } from '../ml/ml-model-registry.service';

type LeanRunConfigOnDisk = LeanRunConfigEvidence & {
  projectName?: string;
  algorithmVersion?: string;
};

@Injectable()
export class LivePreflightService {
  constructor(
    @InjectRepository(LivePilotStatusRecord)
    private readonly statusRepository: Repository<LivePilotStatusRecord>,
    @InjectRepository(PortfolioTargetSnapshot)
    private readonly targetRepository: Repository<PortfolioTargetSnapshot>,
    @InjectRepository(PaperOrderPlan)
    private readonly paperPlanRepository: Repository<PaperOrderPlan>,
    @InjectRepository(BrokerSnapshot)
    private readonly brokerSnapshotRepository: Repository<BrokerSnapshot>,
    @InjectRepository(ExecutionControlState)
    private readonly executionControlRepository: Repository<ExecutionControlState>,
    private readonly leanRunImportService: LeanRunImportService,
    private readonly mlModelRegistryService: MlModelRegistryService,
  ) {}

  async runPreflight(): Promise<LivePilotPreflightContract> {
    const blockers: string[] = [];
    const latestLeanRun = await this.leanRunImportService.getLatestRun();
    if (!latestLeanRun || latestLeanRun.status !== 'passed') {
      blockers.push('Latest LEAN backtest did not pass.');
    } else {
      blockers.push(...this.assessLeanRunReadiness(latestLeanRun));
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
    } else {
      blockers.push(...this.assessPaperReconciliation(latestPaperPlan));
    }

    const latestBrokerSnapshots = await this.brokerSnapshotRepository.find({
      order: { asOf: 'DESC' },
      take: 1,
    });
    const latestBrokerSnapshot = latestBrokerSnapshots[0];
    if (!latestBrokerSnapshot) {
      blockers.push('Broker read-only snapshot is missing.');
    } else {
      blockers.push(...this.assessBrokerSnapshot(latestBrokerSnapshot));
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
      tossOrderSchemaVerified:
        process.env.TOSS_ORDER_SCHEMA_VERIFIED === 'true',
      tossOpenApiSchemaVerified:
        process.env.TOSS_OPEN_API_SCHEMA_VERIFIED === 'true',
      cancelFlattenReady: process.env.BROKER_CANCEL_FLATTEN_READY === 'true',
      brokerOpenOrderPollVerified:
        process.env.BROKER_OPEN_ORDER_POLL_VERIFIED === 'true',
    };

    Object.entries(requiredFlags).forEach(([flag, ready]) => {
      if (!ready) {
        blockers.push(`Required flag not ready: ${flag}`);
      }
    });

    const mlReadiness = this.mlModelRegistryService.getModelReadiness();
    if (
      mlReadiness.registryStatus === 'promoted' &&
      mlReadiness.status !== 'promoted_ready'
    ) {
      blockers.push(
        mlReadiness.blocker ??
          `Promoted ML model is not ready: ${mlReadiness.status}`,
      );
    }

    const openOrderRefs: string[] = [];
    if (!requiredFlags.brokerOpenOrderPollVerified) {
      blockers.push('Broker open-order polling is not verified.');
    }

    const credentialMode = process.env.BROKER_CREDENTIAL_SECRET_REF
      ? 'external-secret'
      : process.env.TOSS_CLIENT_ID
        ? 'local-dev-env'
        : 'missing';
    if (credentialMode === 'missing') {
      blockers.push('Broker credentials are missing.');
    }
    if (credentialMode === 'local-dev-env') {
      blockers.push(
        'Live pilot requires broker credentials from an external secret reference.',
      );
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
      openOrderRefs,
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

  private assessLeanRunReadiness(leanRun: LeanRun): string[] {
    const blockers: string[] = [];
    const configOnDisk = this.readLeanRunConfig(leanRun.resultDirectory);
    const parameters = {
      ...leanRun.parameters,
      ...(configOnDisk?.parameters ?? {}),
    };
    const researchAllowed = this.isResearchPreflightAllowed(
      parameters,
      configOnDisk,
    );

    if (this.isSimulatorLeanRun(leanRun, configOnDisk, parameters)) {
      blockers.push(
        'Latest LEAN run used the local simulator or smoke mode; live requires a Lean CLI historical backtest.',
      );
    }

    blockers.push(
      ...assessStaticLeanRunBlockers(parameters, configOnDisk, researchAllowed),
    );

    return blockers;
  }

  private readLeanRunConfig(
    resultDirectory: string,
  ): LeanRunConfigOnDisk | null {
    const configPath = join(resultDirectory, 'config.json');
    if (!existsSync(configPath)) {
      return null;
    }
    try {
      return JSON.parse(
        readFileSync(configPath, 'utf8'),
      ) as LeanRunConfigOnDisk;
    } catch {
      return null;
    }
  }

  private isResearchPreflightAllowed(
    parameters: Record<string, string | number | boolean>,
    configOnDisk: LeanRunConfigOnDisk | null,
  ): boolean {
    if (process.env.LIVE_PREFLIGHT_ALLOW_RESEARCH === 'true') {
      return true;
    }
    const mode = String(
      readLeanParameter(parameters, 'mode') ?? configOnDisk?.mode ?? '',
    );
    return mode === 'research';
  }

  private isSimulatorLeanRun(
    leanRun: LeanRun,
    configOnDisk: LeanRunConfigOnDisk | null,
    parameters: Record<string, string | number | boolean>,
  ): boolean {
    if (configOnDisk?.simulator) {
      return true;
    }
    const mode = String(
      readLeanParameter(parameters, 'mode') ?? configOnDisk?.mode ?? '',
    );
    if (mode.startsWith('simulator') || mode === 'simulator') {
      return true;
    }
    const simulatorStatistic = leanRun.statistics?.Simulator;
    if (
      typeof simulatorStatistic === 'string' &&
      simulatorStatistic.includes('simulator')
    ) {
      return true;
    }
    if (leanRun.runId.startsWith('sim-')) {
      return true;
    }
    return false;
  }

  private assessBrokerSnapshot(snapshot: BrokerSnapshot): string[] {
    return assessBrokerSnapshotForLive(snapshot);
  }

  private assessPaperReconciliation(plan: PaperOrderPlan): string[] {
    const reconciliationStatus = plan.reconciliation?.status;
    if (reconciliationStatus !== 'matched') {
      return [
        `Paper plan reconciliation is "${reconciliationStatus ?? 'unknown'}"; matched required before live.`,
      ];
    }
    return [];
  }
}
