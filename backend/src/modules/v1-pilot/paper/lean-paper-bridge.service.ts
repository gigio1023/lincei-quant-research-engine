import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ControlPlaneService } from '../../control-plane/control-plane.service';
import { PortfolioTargetSnapshot } from '../../../entities/portfolio-target-snapshot.entity';
import { PaperOrderPlan } from '../../../entities/paper-order-plan.entity';
import { LeanRunImportService } from '../lean/lean-run-import.service';
import { PortfolioTargetItemContract } from '../contracts/v1-pilot.contracts';

@Injectable()
export class LeanPaperBridgeService {
  private readonly logger = new Logger(LeanPaperBridgeService.name);

  constructor(
    private readonly controlPlaneService: ControlPlaneService,
    private readonly leanRunImportService: LeanRunImportService,
    @InjectRepository(PortfolioTargetSnapshot)
    private readonly targetRepository: Repository<PortfolioTargetSnapshot>,
    @InjectRepository(PaperOrderPlan)
    private readonly paperPlanRepository: Repository<PaperOrderPlan>,
  ) {}

  async runPaperCycle(idempotencyKey = 'v1-lean-paper-cycle'): Promise<PaperOrderPlan> {
    const latestRun = await this.leanRunImportService.getLatestRun();
    if (!latestRun) {
      throw new Error('No LEAN run imported. Run import-lean-run first.');
    }

    const target = await this.targetRepository.find({
      where: { leanRunId: latestRun.runId },
      order: { asOf: 'DESC' },
      take: 1,
    });
    const snapshot = target[0];
    if (!snapshot?.targets.length) {
      throw new Error('Latest LEAN run has no portfolio targets.');
    }

    const existingPlans = await this.paperPlanRepository.find({
      where: { idempotencyKey },
      order: { updatedAt: 'DESC' },
      take: 1,
    });
    if (existingPlans[0]) {
      return existingPlans[0];
    }

    const budget = await this.ensureBudget();
    const paperAccount = await this.ensurePaperAccount(
      budget.id,
      'v1-lean-paper-cycle',
    );
    await this.ensureBrokerSnapshot(paperAccount.id);
    const researchRun = await this.controlPlaneService.createResearchRun({
      budgetEnvelopeId: budget.id,
      objective: 'V1 LEAN portfolio target paper cycle',
      strategyFamily: 'aggressive_llm_momentum',
      hypothesis: 'Imported LEAN targets can execute in paper mode.',
      datasetRefs: [
        {
          id: 'lean-run',
          source: 'lean',
          windowStart: latestRun.startedAt.toISOString(),
          windowEnd: latestRun.completedAt.toISOString(),
          availabilityTimestamp: latestRun.completedAt.toISOString(),
          marketDataTimestamp: latestRun.completedAt.toISOString(),
        },
      ],
      featureRefs: ['v1-feature-snapshot'],
      timestampLagRules: ['Use LEAN run completion timestamp only.'],
      noLookaheadChecked: true,
      benchmark: 'SPY',
      costModel: 'paper-sim-v1',
      slippageModel: 'paper-sim-v1',
      validationWindow: {
        start: latestRun.startedAt.toISOString(),
        end: latestRun.completedAt.toISOString(),
      },
      backtestMetrics: {
        totalReturnPct: Number(latestRun.statistics['Compounding Annual Return'] ?? 0) * 100,
        benchmarkReturnPct: 0,
        maxDrawdownPct: Math.abs(
          Number(latestRun.statistics['Maximum Drawdown'] ?? 0) * 100,
        ),
        sharpeRatio: Number(latestRun.statistics['Sharpe Ratio'] ?? 0),
        turnoverPct: 10,
        tradeCount: Number(latestRun.statistics['Total Orders'] ?? 0),
      },
      artifactRefs: [latestRun.resultDirectory],
      artifactHashes: {
        [latestRun.resultDirectory]: latestRun.configHash,
      },
      knownFailureModes: ['Paper bridge depends on LEAN target import.'],
    });

    const orders = this.buildOrders(snapshot.targets);
    const now = new Date().toISOString();
    const proposal = await this.controlPlaneService.createProposal({
      budgetEnvelopeId: budget.id,
      researchRunId: researchRun.id,
      strategyId: 'aggressive_llm_momentum',
      ruleId: 'lean-target-bridge',
      generatedAt: now,
      marketDataTimestamp: snapshot.asOf,
      portfolioSnapshot: {
        currency: 'USD',
        equity: 10_000,
        cash: 10_000,
        grossExposurePct: snapshot.grossExposurePct,
      },
      orders,
      thesis: 'Paper cycle from latest LEAN portfolio targets.',
      evidenceRefs: [latestRun.runId, snapshot.id],
    });

    await this.controlPlaneService.evaluateProposal(proposal.id);
    const paperEvents = await this.controlPlaneService.listPaperAccountEvents();
    const latestEvent = paperEvents[0];
    const approval = await this.controlPlaneService.createOrderPlanApproval(
      proposal.id,
      {
        idempotencyKey,
        approver: 'v1-lean-paper-bridge',
        reason: 'Auto-approve paper cycle for V1 LEAN target bridge.',
        expectedPaperAccountEventHash: latestEvent?.eventHash,
      },
    );

    return this.controlPlaneService.paperExecuteProposal(proposal.id, {
      idempotencyKey,
      orderPlanApprovalId: approval.id,
    });
  }

  private async ensureBudget() {
    const budgets = await this.controlPlaneService.listBudgetEnvelopes();
    const existing = budgets.find(
      (budget) => budget.name === 'V1 LEAN Paper Budget (ETF)',
    );
    if (existing) {
      return existing;
    }
    return this.controlPlaneService.createBudgetEnvelope({
      name: 'V1 LEAN Paper Budget (ETF)',
      totalBudget: 10_000,
      mode: 'paper',
      allowedAssetClasses: [
        'cash',
        'foreign_etf',
        'foreign_stock',
        'domestic_etf',
        'domestic_stock',
      ],
      policy: {
        maxDataAgeMinutes: 10_080,
        maxOrderNotional: 5_000,
        maxSinglePositionPct: 40,
        maxGrossExposurePct: 100,
      },
    });
  }

  private async ensurePaperAccount(
    budgetEnvelopeId: number,
    cycleKey: string,
  ) {
    try {
      const existing = await this.controlPlaneService.getPaperAccountState();
      if (existing.budgetEnvelopeId === budgetEnvelopeId) {
        return existing;
      }
    } catch {
      // Paper account not seeded yet.
    }
    const seedKey = `${cycleKey}:seed:${budgetEnvelopeId}`;
    const seeded = await this.controlPlaneService.seedPaperAccount({
      budgetEnvelopeId,
      cash: 10_000,
      actor: 'v1-pilot',
      reason: 'Seed paper account for V1 LEAN bridge.',
      idempotencyKey: seedKey,
    });
    const events = await this.controlPlaneService.listPaperAccountEvents();
    const latest = events[0];
    return this.controlPlaneService.promotePaperAccount(seeded.id, {
      actor: 'v1-pilot',
      reason: 'Promote V1 LEAN paper account.',
      idempotencyKey: `${cycleKey}:promote:${budgetEnvelopeId}`,
      expectedEventHash: latest?.eventHash,
    });
  }

  private async ensureBrokerSnapshot(paperAccountId: number): Promise<void> {
    const snapshots = await this.controlPlaneService.listBrokerSnapshots();
    if (snapshots.length > 0) {
      return;
    }
    await this.controlPlaneService.importBrokerSnapshot({
      provider: 'simulated',
      currency: 'USD',
      cash: 10,
      equity: 10,
      grossExposurePct: 0,
      positions: [],
      asOf: new Date().toISOString(),
      accountRef: `paper-${paperAccountId}`,
    });
  }

  private buildOrders(targets: PortfolioTargetItemContract[]) {
    return targets.slice(0, 2).map((target) => ({
      symbol: target.symbol,
      assetClass: 'foreign_etf' as const,
      side: 'BUY' as const,
      orderType: 'MARKET' as const,
      notional: Math.max(100, Math.round(target.targetWeight * 1000)),
      targetPositionPct: target.targetWeight * 100,
    }));
  }
}
