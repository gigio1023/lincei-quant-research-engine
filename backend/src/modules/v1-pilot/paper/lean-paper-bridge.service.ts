/**
 * Maps latest LEAN portfolio targets into the existing control-plane proposal → risk → paper path.
 * Reuses human-grade ledgers instead of a parallel paper executor so reconciliation stays unified.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ControlPlaneService } from '../../control-plane/control-plane.service';
import { PortfolioTargetSnapshot } from '../../../entities/portfolio-target-snapshot.entity';
import { PaperOrderPlan } from '../../../entities/paper-order-plan.entity';
import { LeanRunImportService } from '../lean/lean-run-import.service';
import type { PortfolioTargetItemContract } from '../contracts/v1-pilot.contracts';
import { assessLeanRunArtifacts } from '../lean/lean-run-acceptance';
import { CurrentAlphaTargetService } from '../alpha/current-alpha-target.service';

type PaperBridgeMode = 'current-paper-cycle' | 'historical-target-replay';

const PAPER_BRIDGE_EQUITY = 10_000;
const PAPER_BRIDGE_MAX_SINGLE_POSITION_PCT = 40;
const PAPER_BRIDGE_MAX_GROSS_EXPOSURE_PCT = 80;

@Injectable()
export class LeanPaperBridgeService {
  private readonly logger = new Logger(LeanPaperBridgeService.name);

  constructor(
    private readonly controlPlaneService: ControlPlaneService,
    private readonly leanRunImportService: LeanRunImportService,
    private readonly currentAlphaTargetService: CurrentAlphaTargetService,
    @InjectRepository(PortfolioTargetSnapshot)
    private readonly targetRepository: Repository<PortfolioTargetSnapshot>,
    @InjectRepository(PaperOrderPlan)
    private readonly paperPlanRepository: Repository<PaperOrderPlan>,
  ) {}

  async runPaperCycle(
    idempotencyKey = 'v1-lean-paper-cycle',
  ): Promise<PaperOrderPlan> {
    return this.runPaperPath(idempotencyKey, 'current-paper-cycle');
  }

  async runPaperReplay(
    idempotencyKey = 'v1-lean-paper-replay',
  ): Promise<PaperOrderPlan> {
    return this.runPaperPath(idempotencyKey, 'historical-target-replay');
  }

  private async runPaperPath(
    idempotencyKey: string,
    mode: PaperBridgeMode,
  ): Promise<PaperOrderPlan> {
    const latestRun = await this.leanRunImportService.getLatestStrategyRun();
    if (!latestRun) {
      throw new Error(
        'No accepted LEAN strategy run imported. Run run-full-backtest first.',
      );
    }
    if (latestRun.status !== 'passed') {
      throw new Error('Latest accepted LEAN strategy run did not pass gates.');
    }
    const acceptance = assessLeanRunArtifacts(
      latestRun.resultDirectory,
      'strategy-backtest',
    );
    if (!acceptance.passed) {
      throw new Error(
        `Latest LEAN run is not paper eligible: ${acceptance.blockers.join('; ')}`,
      );
    }

    const snapshot =
      mode === 'current-paper-cycle'
        ? await this.currentAlphaTargetService.ensureCurrentTargetSnapshot(
            latestRun,
          )
        : await this.latestHistoricalTargetSnapshot(latestRun.runId);
    if (!snapshot?.targets.length) {
      throw new Error('Latest LEAN run has no portfolio targets.');
    }
    const scopedIdempotencyKey = [
      idempotencyKey,
      latestRun.runId,
      snapshot.id,
      snapshot.targetHash ?? 'no-target-hash',
    ].join(':');
    const leanRunEvidenceRef = `lean-run:${latestRun.runId}`;
    const targetEvidenceRef = `portfolio-target:${snapshot.id}`;
    const replayEvidenceRefs =
      mode === 'historical-target-replay'
        ? [
            'paper-replay:historical-target',
            `historical-target-as-of:${snapshot.asOf}`,
          ]
        : [];

    const existingPlans = await this.paperPlanRepository.find({
      where: { idempotencyKey: scopedIdempotencyKey },
      order: { updatedAt: 'DESC' },
      take: 1,
    });
    if (existingPlans[0]) {
      return this.reconcileFilledPlan(existingPlans[0]);
    }

    const budget = await this.ensureBudget();
    const paperAccount = await this.ensurePaperAccount(
      budget.id,
      scopedIdempotencyKey,
    );
    await this.ensureBrokerSnapshot(paperAccount.id);
    const now = new Date().toISOString();
    const marketDataTimestamp =
      mode === 'historical-target-replay'
        ? now
        : (this.currentAlphaTargetService.currentTargetMarketDataTimestamp(
            snapshot,
          ) ?? snapshot.asOf);
    const researchRun = await this.controlPlaneService.createResearchRun({
      budgetEnvelopeId: budget.id,
      objective:
        mode === 'historical-target-replay'
          ? 'V1 LEAN historical target paper replay'
          : 'V1 current alpha target paper cycle',
      strategyFamily: 'aggressive_llm_momentum',
      hypothesis:
        mode === 'historical-target-replay'
          ? 'Historical LEAN targets can exercise the paper execution plumbing without becoming broker-write pre-trade risk check artifacts.'
          : 'Fresh alpha decisions can create current-market paper targets without becoming broker writes.',
      datasetRefs: [
        {
          id:
            mode === 'historical-target-replay'
              ? 'lean-run'
              : 'current-alpha-target',
          source:
            mode === 'historical-target-replay'
              ? 'lean'
              : 'alpha-decision-ledger',
          windowStart:
            mode === 'historical-target-replay'
              ? latestRun.startedAt.toISOString()
              : marketDataTimestamp,
          windowEnd:
            mode === 'historical-target-replay'
              ? latestRun.completedAt.toISOString()
              : marketDataTimestamp,
          availabilityTimestamp:
            mode === 'historical-target-replay'
              ? latestRun.completedAt.toISOString()
              : snapshot.asOf,
          marketDataTimestamp,
        },
      ],
      featureRefs: ['v1-feature-snapshot'],
      timestampLagRules:
        mode === 'historical-target-replay'
          ? ['Use LEAN run completion timestamp only.']
          : [
              'Use alpha decision availableAt as marketDataTimestamp; portfolio target asOf is generation time only.',
            ],
      noLookaheadChecked: true,
      benchmark: 'SPY',
      costModel: 'paper-sim-v1',
      slippageModel: 'paper-sim-v1',
      validationWindow: {
        start: latestRun.startedAt.toISOString(),
        end: latestRun.completedAt.toISOString(),
      },
      backtestMetrics: this.buildBacktestMetrics(latestRun.statistics),
      artifactRefs: [latestRun.resultDirectory],
      artifactHashes: {
        [latestRun.resultDirectory]: latestRun.configHash,
      },
      knownFailureModes:
        mode === 'historical-target-replay'
          ? [
              'Paper replay uses historical target timestamps and is not a current-market artifact.',
              'The live-preflight legacy command must ignore paper-replay evidence refs.',
            ]
          : [
              'Current paper cycle depends on fresh alpha decisions and remains broker-write disabled.',
              'Latest LEAN/Cloud run is validation evidence, not the source of current target timestamps.',
            ],
    });

    const orders = this.buildOrders(snapshot.targets);
    const proposal = await this.controlPlaneService.createProposal({
      budgetEnvelopeId: budget.id,
      researchRunId: researchRun.id,
      strategyId: 'aggressive_llm_momentum',
      ruleId: 'lean-target-bridge',
      generatedAt: now,
      marketDataTimestamp,
      portfolioSnapshot: {
        currency: paperAccount.currency ?? 'USD',
        equity: paperAccount.equity,
        cash: paperAccount.cash,
        grossExposurePct: paperAccount.grossExposurePct,
        positions: paperAccount.positions ?? [],
      },
      orders,
      thesis:
        mode === 'historical-target-replay'
          ? `Historical paper replay from LEAN targets as of ${snapshot.asOf}; not broker-write pre-trade risk check evidence.`
          : `Current paper cycle from alpha-derived targets generated at ${snapshot.asOf}.`,
      evidenceRefs: [
        leanRunEvidenceRef,
        targetEvidenceRef,
        ...replayEvidenceRefs,
      ],
    });

    const riskEvaluation = await this.controlPlaneService.evaluateProposal(
      proposal.id,
    );
    if (riskEvaluation.decision === 'DENY') {
      throw new Error(
        `Paper risk evaluation ${riskEvaluation.decision}: ${riskEvaluation.reasons.join('; ')}`,
      );
    }
    // listPaperAccountEvents returns newest-first; approval must pin the latest event hash to prevent TOCTOU races.
    const paperEvents = await this.controlPlaneService.listPaperAccountEvents();
    const latestEvent = paperEvents[0];
    const approval = await this.controlPlaneService.createOrderPlanApproval(
      proposal.id,
      {
        idempotencyKey: scopedIdempotencyKey,
        approver: 'v1-lean-paper-bridge',
        reason:
          mode === 'historical-target-replay'
            ? 'Auto-approve historical target replay for V1 LEAN paper plumbing only.'
            : 'Auto-approve paper cycle for V1 LEAN target bridge.',
        expectedPaperAccountEventHash: latestEvent?.eventHash,
      },
    );

    const plan = await this.controlPlaneService.paperExecuteProposal(
      proposal.id,
      {
        idempotencyKey: scopedIdempotencyKey,
        orderPlanApprovalId: approval.id,
      },
    );
    return this.reconcileFilledPlan(plan);
  }

  private async reconcileFilledPlan(
    plan: PaperOrderPlan,
  ): Promise<PaperOrderPlan> {
    if (plan.reconciliation?.status === 'matched' || plan.status !== 'filled') {
      return plan;
    }
    return this.controlPlaneService.reconcilePaperOrderPlan(plan.id, {
      notes: ['Auto-reconciled by V1 LEAN paper bridge.'],
    });
  }

  private async latestHistoricalTargetSnapshot(
    leanRunId: string,
  ): Promise<PortfolioTargetSnapshot | undefined> {
    const candidates = await this.targetRepository.find({
      where: { leanRunId },
      order: { asOf: 'DESC' },
      take: 20,
    });
    return candidates.find(
      (snapshot) =>
        !this.currentAlphaTargetService.isCurrentAlphaTarget(snapshot),
    );
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

  private async ensurePaperAccount(budgetEnvelopeId: number, cycleKey: string) {
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
    const selectedTargets = targets
      .filter(
        (target) =>
          Number.isFinite(target.targetWeight) && target.targetWeight > 0,
      )
      .sort(
        (left, right) =>
          Math.abs(right.targetWeight) - Math.abs(left.targetWeight),
      )
      .slice(0, 2);
    const cappedPercents = selectedTargets.map((target) =>
      Math.min(
        Math.abs(target.targetWeight) * 100,
        PAPER_BRIDGE_MAX_SINGLE_POSITION_PCT,
      ),
    );
    const rawGrossPct = cappedPercents.reduce((sum, pct) => sum + pct, 0);
    const grossScale =
      rawGrossPct > PAPER_BRIDGE_MAX_GROSS_EXPOSURE_PCT
        ? PAPER_BRIDGE_MAX_GROSS_EXPOSURE_PCT / rawGrossPct
        : 1;

    return selectedTargets.map((target, index) => {
      const targetPositionPct = this.roundPercent(
        cappedPercents[index] * grossScale,
      );
      return {
        symbol: target.symbol,
        assetClass: 'foreign_etf' as const,
        side: target.targetWeight >= 0 ? ('BUY' as const) : ('SELL' as const),
        orderType: 'MARKET' as const,
        notional: Math.max(
          100,
          Math.round((targetPositionPct / 100) * PAPER_BRIDGE_EQUITY),
        ),
        targetPositionPct:
          target.targetWeight >= 0 ? targetPositionPct : -targetPositionPct,
      };
    });
  }

  private roundPercent(value: number): number {
    return Number(value.toFixed(2));
  }

  private buildBacktestMetrics(statistics: Record<string, string | number>) {
    return {
      startValue: this.parseLeanNumber(statistics['Start Equity']),
      endValue: this.parseLeanNumber(statistics['End Equity']),
      totalReturnPct: this.parseLeanPercent(
        statistics['Compounding Annual Return'] ?? statistics.Return,
      ),
      benchmarkReturnPct: 0,
      maxDrawdownPct: Math.abs(
        this.parseLeanPercent(
          statistics['Maximum Drawdown'] ?? statistics.Drawdown,
        ),
      ),
      sharpeRatio: this.parseLeanNumber(statistics['Sharpe Ratio']),
      sortinoRatio: this.parseLeanNumber(statistics['Sortino Ratio']),
      informationRatio: this.parseLeanNumber(statistics['Information Ratio']),
      turnoverPct: this.parseLeanPercent(statistics['Portfolio Turnover']),
      totalFees: this.parseLeanNumber(statistics['Total Fees']),
      tradeCount: this.parseLeanNumber(statistics['Total Orders']),
      winRatePct: this.parseLeanPercent(statistics['Win Rate']),
      profitFactor: this.parseLeanNumber(statistics['Profit-Loss Ratio']),
    };
  }

  private parseLeanPercent(value: string | number | undefined): number {
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        return 0;
      }
      return Math.abs(value) <= 1 ? value * 100 : value;
    }
    if (typeof value !== 'string') {
      return 0;
    }
    const parsed = this.parseLeanNumber(value);
    return value.includes('%')
      ? parsed
      : Math.abs(parsed) <= 1
        ? parsed * 100
        : parsed;
  }

  private parseLeanNumber(value: string | number | undefined): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    if (typeof value !== 'string') {
      return 0;
    }
    const parsed = Number(value.replace(/[$%,\s]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
