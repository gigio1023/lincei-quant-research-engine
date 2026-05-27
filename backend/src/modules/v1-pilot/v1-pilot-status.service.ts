import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AlphaDecision } from '../../entities/alpha-decision.entity';
import { BrokerFill } from '../../entities/broker-fill.entity';
import { BrokerOrderStatusRecord } from '../../entities/broker-order-status.entity';
import { BrokerSnapshot } from '../../entities/broker-snapshot.entity';
import { ExecutionIntent } from '../../entities/execution-intent.entity';
import { FeatureSnapshot } from '../../entities/feature-snapshot.entity';
import { InvestmentProposal } from '../../entities/investment-proposal.entity';
import { LeanRun } from '../../entities/lean-run.entity';
import { LivePilotStatusRecord } from '../../entities/live-pilot-status.entity';
import { PaperOrderPlan } from '../../entities/paper-order-plan.entity';
import { PortfolioTargetSnapshot } from '../../entities/portfolio-target-snapshot.entity';
import {
  LivePilotPreflightContract,
  MAX_LIVE_PILOT_NOTIONAL_USD,
} from './contracts/v1-pilot.contracts';
import { MlModelRegistryService } from './ml/ml-model-registry.service';
import {
  buildV1NextActions,
  buildV1SystemStages,
} from './v1-pilot-status-stage.builder';
import { V1PilotSystemStatus } from './v1-pilot-status.types';
import { ResearchFactoryService } from './research/research-factory.service';

@Injectable()
export class V1PilotStatusService {
  constructor(
    @InjectRepository(FeatureSnapshot)
    private readonly featureRepository: Repository<FeatureSnapshot>,
    @InjectRepository(AlphaDecision)
    private readonly alphaRepository: Repository<AlphaDecision>,
    @InjectRepository(LeanRun)
    private readonly leanRunRepository: Repository<LeanRun>,
    @InjectRepository(PortfolioTargetSnapshot)
    private readonly targetRepository: Repository<PortfolioTargetSnapshot>,
    @InjectRepository(PaperOrderPlan)
    private readonly paperPlanRepository: Repository<PaperOrderPlan>,
    @InjectRepository(InvestmentProposal)
    private readonly proposalRepository: Repository<InvestmentProposal>,
    @InjectRepository(BrokerSnapshot)
    private readonly brokerSnapshotRepository: Repository<BrokerSnapshot>,
    @InjectRepository(BrokerFill)
    private readonly brokerFillRepository: Repository<BrokerFill>,
    @InjectRepository(BrokerOrderStatusRecord)
    private readonly brokerOrderStatusRepository: Repository<BrokerOrderStatusRecord>,
    @InjectRepository(ExecutionIntent)
    private readonly executionIntentRepository: Repository<ExecutionIntent>,
    @InjectRepository(LivePilotStatusRecord)
    private readonly livePilotStatusRepository: Repository<LivePilotStatusRecord>,
    private readonly mlModelRegistryService: MlModelRegistryService,
    private readonly researchFactoryService: ResearchFactoryService,
  ) {}

  async getStatus(): Promise<V1PilotSystemStatus> {
    const checkedAt = new Date().toISOString();
    const [
      latestFeature,
      featureSnapshotCount,
      alphaCounts,
      latestAlpha,
      latestLeanRun,
      latestBrokerSnapshot,
      latestBrokerFill,
      latestIntent,
      latestStatusRecord,
      openOrderCount,
      research,
    ] = await Promise.all([
      this.featureRepository.findOne({ where: {}, order: { asOf: 'DESC' } }),
      this.featureRepository.count(),
      this.countAlphaDecisions(),
      this.alphaRepository.findOne({ where: {}, order: { asOf: 'DESC' } }),
      this.leanRunRepository.findOne({
        where: {
          mode: 'backtest',
          status: 'passed',
          promotionEligible: true,
        },
        order: { completedAt: 'DESC' },
      }),
      this.brokerSnapshotRepository.findOne({
        where: {},
        order: { asOf: 'DESC' },
      }),
      this.brokerFillRepository.findOne({
        where: {},
        order: { filledAt: 'DESC' },
      }),
      this.executionIntentRepository.findOne({
        where: {},
        order: { updatedAt: 'DESC' },
      }),
      this.livePilotStatusRepository.findOne({
        where: {},
        order: { checkedAt: 'DESC' },
      }),
      this.brokerOrderStatusRepository.count({
        where: [
          {
            externalStatus: In([
              'submitted',
              'accepted',
              'open',
              'partially_filled',
              'pending_cancel',
              'unknown',
            ]),
          },
          { status: 'mismatch' },
        ],
      }),
      this.researchFactoryService.getStatus(),
    ]);
    const latestTarget = latestLeanRun
      ? await this.targetRepository.findOne({
          where: { leanRunId: latestLeanRun.runId },
          order: { asOf: 'DESC' },
        })
      : await this.targetRepository.findOne({
          where: {},
          order: { asOf: 'DESC' },
        });
    const paperPlan =
      latestLeanRun && latestTarget
        ? await this.findPaperPlanForEvidence(
            latestLeanRun.runId,
            latestTarget.id,
          )
        : await this.paperPlanRepository.findOne({
            where: {},
            order: { updatedAt: 'DESC' },
          });
    const paperReplayPlan =
      latestLeanRun && latestTarget
        ? await this.findPaperReplayPlanForEvidence(
            latestLeanRun.runId,
            latestTarget.id,
          )
        : null;
    const latestOrderStatus = await this.brokerOrderStatusRepository.findOne({
      where: {},
      order: { asOf: 'DESC' },
    });
    const mlReadiness = this.mlModelRegistryService.getModelReadiness();
    const preflight =
      latestStatusRecord?.preflight ?? this.notRunPreflight(checkedAt);

    const alpha = {
      featureSnapshotCount,
      numericDecisionCount: alphaCounts.numeric,
      llmDecisionCount: alphaCounts.llm,
      metaDecisionCount: alphaCounts.meta,
      latestFeatureAsOf: latestFeature?.asOf,
      latestAlphaAsOf: latestAlpha?.asOf,
      mlModelStatus: mlReadiness.status,
      mlModelName: mlReadiness.modelName,
      mlBlocker: mlReadiness.blocker,
    };
    const portfolioTarget = {
      id: latestTarget?.id,
      leanRunId: latestTarget?.leanRunId,
      targetCount: latestTarget?.targets.length ?? 0,
      grossExposurePct: latestTarget?.grossExposurePct,
      maxSingleNamePct: latestTarget?.maxSingleNamePct,
    };
    const paper = {
      planId: paperPlan?.id,
      status: paperPlan?.status ?? 'missing',
      reconciliationStatus: paperPlan?.reconciliation?.status,
      fillCount: paperPlan?.fills.length ?? 0,
      replayPlanId: paperReplayPlan?.id,
      replayStatus: paperReplayPlan?.status,
      replayReconciliationStatus: paperReplayPlan?.reconciliation?.status,
      replayFillCount: paperReplayPlan?.fills.length,
    };
    const broker = {
      snapshotId: latestBrokerSnapshot?.id,
      provider: latestBrokerSnapshot?.provider,
      snapshotStatus: latestBrokerSnapshot?.status ?? 'missing',
      snapshotReconciliationStatus:
        latestBrokerSnapshot?.reconciliation?.status,
      orderStatusId: latestOrderStatus?.id,
      openOrderCount,
      fillId: latestBrokerFill?.id,
      fillReconciliationStatus: latestBrokerFill?.reconciliation?.status,
    };
    const livePilot = {
      latestIntentId: latestIntent?.id,
      latestIntentStatus: latestIntent?.status,
      latestStatusRecordId: latestStatusRecord?.id,
      realOrderSent: latestStatusRecord?.realOrderSent ?? false,
    };
    const stages = buildV1SystemStages({
      research,
      alpha,
      latestLeanRun,
      portfolioTarget,
      paper,
      broker,
      preflight,
      livePilot,
    });
    const nextActions = buildV1NextActions(stages);

    return {
      checkedAt,
      verdict: stages.every((stage) => stage.status === 'ready')
        ? 'ready'
        : stages.some((stage) => stage.status === 'blocked')
          ? 'blocked'
          : 'missing',
      leanRun: latestLeanRun
        ? {
            runId: latestLeanRun.runId,
            status: latestLeanRun.status,
            projectName: latestLeanRun.projectName,
          }
        : null,
      alpha,
      research,
      portfolioTarget,
      paper,
      broker,
      livePilot,
      preflight,
      stages,
      nextActions,
    };
  }

  private async countAlphaDecisions(): Promise<{
    numeric: number;
    llm: number;
    meta: number;
  }> {
    const [numeric, llm, meta] = await Promise.all([
      this.alphaRepository.countBy({ source: 'numeric' }),
      this.alphaRepository.countBy({ source: 'llm' }),
      this.alphaRepository.countBy({ source: 'meta' }),
    ]);
    return { numeric, llm, meta };
  }

  private async findPaperPlanForEvidence(
    leanRunId: string,
    targetSnapshotId: string,
  ): Promise<PaperOrderPlan | null> {
    return this.findPaperPlanForEvidenceMode(
      leanRunId,
      targetSnapshotId,
      'current-paper-cycle',
    );
  }

  private async findPaperReplayPlanForEvidence(
    leanRunId: string,
    targetSnapshotId: string,
  ): Promise<PaperOrderPlan | null> {
    return this.findPaperPlanForEvidenceMode(
      leanRunId,
      targetSnapshotId,
      'historical-target-replay',
    );
  }

  private async findPaperPlanForEvidenceMode(
    leanRunId: string,
    targetSnapshotId: string,
    mode: 'current-paper-cycle' | 'historical-target-replay',
  ): Promise<PaperOrderPlan | null> {
    const candidates = await this.paperPlanRepository.find({
      where: { status: In(['filled', 'reconciled']) },
      order: { updatedAt: 'DESC' },
      take: 20,
    });
    for (const plan of candidates) {
      const proposal = await this.proposalRepository.findOne({
        where: { id: plan.proposalId },
      });
      const evidenceRefs = new Set(proposal?.evidenceRefs ?? []);
      const isReplay = [...evidenceRefs].some((ref) =>
        ref.startsWith('paper-replay:'),
      );
      if (mode === 'current-paper-cycle' && isReplay) {
        continue;
      }
      if (mode === 'historical-target-replay' && !isReplay) {
        continue;
      }
      if (
        evidenceRefs.has(`lean-run:${leanRunId}`) &&
        evidenceRefs.has(`portfolio-target:${targetSnapshotId}`)
      ) {
        return plan;
      }
    }
    return null;
  }

  private notRunPreflight(checkedAt: string): LivePilotPreflightContract {
    return {
      status: 'blocked',
      checkedAt,
      maxPilotNotionalUsd: MAX_LIVE_PILOT_NOTIONAL_USD,
      broker: process.env.BROKER_PROVIDER ?? 'toss',
      blockers: [
        'The live-preflight legacy command has not run for the latest state.',
      ],
      requiredFlags: {
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
        tossWriteAdapterReady: false,
      },
      openOrderRefs: [],
      credentialMode: this.credentialMode(),
    };
  }

  private credentialMode(): 'external-secret' | 'local-dev-env' | 'missing' {
    if (process.env.BROKER_CREDENTIAL_SECRET_REF) {
      return 'external-secret';
    }
    if (process.env.TOSS_OPEN_API_CLIENT_ID ?? process.env.TOSS_CLIENT_ID) {
      return 'local-dev-env';
    }
    return 'missing';
  }
}
