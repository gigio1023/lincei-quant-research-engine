/**
 * Capped $10 live pilot behind --confirm-real-money and preflight.ready.
 * Uses mock adapter until Toss write schema flags pass; records whether a real broker order was sent.
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExecutionIntent } from '../../../entities/execution-intent.entity';
import { LivePilotStatusRecord } from '../../../entities/live-pilot-status.entity';
import { PortfolioTargetSnapshot } from '../../../entities/portfolio-target-snapshot.entity';
import {
  ExecutionIntentContract,
  MAX_LIVE_PILOT_NOTIONAL_USD,
  MAX_SINGLE_LIVE_ORDER_NOTIONAL_USD,
} from '../contracts/v1-pilot.contracts';
import { validateExecutionIntent } from '../contracts/v1-pilot.validators';
import { hashObject } from '../../../shared/hash.util';
import { LivePreflightService } from './live-preflight.service';
import { MockBrokerAdapter } from '../broker/mock-broker.adapter';
import { TossWriteBrokerAdapter } from '../broker/toss-write-broker.adapter';

@Injectable()
export class LivePilot10UsdService {
  constructor(
    @InjectRepository(ExecutionIntent)
    private readonly intentRepository: Repository<ExecutionIntent>,
    @InjectRepository(PortfolioTargetSnapshot)
    private readonly targetRepository: Repository<PortfolioTargetSnapshot>,
    @InjectRepository(LivePilotStatusRecord)
    private readonly statusRepository: Repository<LivePilotStatusRecord>,
    private readonly livePreflightService: LivePreflightService,
    private readonly mockBrokerAdapter: MockBrokerAdapter,
    private readonly tossWriteBrokerAdapter: TossWriteBrokerAdapter,
  ) {}

  async execute(options: {
    confirmRealMoney: boolean;
    idempotencyKey?: string;
  }): Promise<{ submitted: boolean; intentId: string; blockers: string[] }> {
    // Explicit operator intent required so automated scripts cannot submit live orders by accident.
    if (!options.confirmRealMoney) {
      throw new BadRequestException(
        'Refusing live pilot without --confirm-real-money flag.',
      );
    }

    const preflight = await this.livePreflightService.runPreflight();
    if (preflight.status !== 'ready') {
      return {
        submitted: false,
        intentId: 'blocked',
        blockers: preflight.blockers,
      };
    }

    const latestTarget = await this.targetRepository.findOne({
      where: { leanRunId: preflight.latestLeanRunId },
      order: { asOf: 'DESC' },
    });
    const topTarget = latestTarget?.targets[0];
    if (!topTarget) {
      throw new BadRequestException('No portfolio target available for live pilot.');
    }

    const notionalUsd = Math.min(
      MAX_SINGLE_LIVE_ORDER_NOTIONAL_USD,
      MAX_LIVE_PILOT_NOTIONAL_USD,
    );
    const intent: ExecutionIntentContract = {
      id: `live-intent-${Date.now()}`,
      mode: 'live',
      source: 'lean-target',
      portfolioTargetSnapshotId: latestTarget.id,
      symbol: topTarget.symbol,
      side: 'buy',
      orderType: 'limit',
      notionalUsd,
      limitPrice: 100,
      timeInForce: 'day',
      maxSlippageBps: 25,
      idempotencyKey: options.idempotencyKey ?? `live-pilot-10usd:${topTarget.symbol}`,
      approvalRef: 'live-pilot-v1',
      intentHash: hashObject({ symbol: topTarget.symbol, notionalUsd }),
    };
    validateExecutionIntent(intent);

    const existing = await this.intentRepository.findOne({
      where: { idempotencyKey: intent.idempotencyKey },
    });
    if (existing?.status === 'filled') {
      return {
        submitted: true,
        intentId: existing.id,
        blockers: [],
      };
    }

    // Real Toss adapter only after explicit schema + write flags; otherwise mock proves plumbing only.
    const adapter =
      process.env.TOSS_ORDER_SCHEMA_VERIFIED === 'true' &&
      process.env.BROKER_WRITE_ENABLED === 'true'
        ? this.tossWriteBrokerAdapter
        : this.mockBrokerAdapter;

    const preview = await adapter.previewOrder(intent);
    if (!preview.allowed) {
      return {
        submitted: false,
        intentId: intent.id,
        blockers: preview.blockers,
      };
    }

    const order = await adapter.submitOrder(intent);
    await this.intentRepository.save(
      this.intentRepository.create({
        ...intent,
        status: order.status === 'filled' ? 'filled' : 'submitted',
        blockers: [],
      }),
    );

    const realOrderSent =
      process.env.TOSS_ORDER_SCHEMA_VERIFIED === 'true' &&
      process.env.BROKER_WRITE_ENABLED === 'true';

    await this.statusRepository.save(
      this.statusRepository.create({
        status: realOrderSent ? 'ready' : 'blocked',
        checkedAt: new Date(),
        preflight,
        realOrderSent,
        blockers: realOrderSent
          ? []
          : ['Live pilot used mock adapter because Toss write gates are not verified.'],
        latestLeanRunId: preflight.latestLeanRunId,
        latestPaperPlanId: preflight.latestPaperPlanId,
      }),
    );

    return {
      submitted: true,
      intentId: intent.id,
      blockers: realOrderSent
        ? []
        : ['No real broker order sent; mock adapter used for plumbing verification.'],
    };
  }
}
