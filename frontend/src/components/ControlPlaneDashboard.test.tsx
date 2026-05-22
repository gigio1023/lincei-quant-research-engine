import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import ControlPlaneDashboard from "./ControlPlaneDashboard";
import { riskGateApi } from "../services/api";

vi.mock("../services/api", () => ({
  riskGateApi: {
    getStatus: vi.fn(),
  },
  controlPlaneApi: {
    getStatus: vi.fn(),
    getBudgets: vi.fn(),
    getResearchRuns: vi.fn(),
    getProposals: vi.fn(),
    getRiskEvaluations: vi.fn(),
    getPaperAccount: vi.fn(),
    getPaperAccountEvents: vi.fn(),
    getExecutionControl: vi.fn(),
    getPaperOrderPlans: vi.fn(),
    getBrokerSnapshots: vi.fn(),
    getBrokerFills: vi.fn(),
    reconcileBrokerFill: vi.fn(),
    pollBrokerReadOnlyFills: vi.fn(),
    getBrokerAdapterStatus: vi.fn(),
    getOrderPlanApprovals: vi.fn(),
    getRuns: vi.fn(),
    getRunSchedules: vi.fn(),
    getRunScheduleWorkerStatus: vi.fn(),
    advanceRun: vi.fn(),
    tickRunSchedule: vi.fn(),
    runBaselineResearch: vi.fn(),
    runRecoveryProposal: vi.fn(),
  },
}));

import { controlPlaneApi } from "../services/api";

const mockRiskGateStatus = {
  brokerExecutionEnabled: false,
  liveTradingEnabled: false,
  defaultPolicy: {
    maxGrossExposurePct: 100,
    maxSinglePositionPct: 20,
    maxOrderNotional: 1000000,
    maxDailyLossPct: 3,
    maxDrawdownPct: 10,
    maxDataAgeMinutes: 60,
    allowedAssetClasses: [
      "cash",
      "domestic_stock",
      "foreign_stock",
      "domestic_etf",
      "foreign_etf",
    ],
    allowLiveTrading: false,
    requireHumanApproval: true,
  },
};

const mockControlPlaneStatus = {
  brokerExecutionEnabled: false,
  liveTradingReady: false,
  liveTradingGate: {
    enabled: false,
    mode: "disabled",
    checkedAt: "2026-05-22T09:00:00.000Z",
    orderEndpointImplemented: false,
    brokerWriteEnabled: false,
    killSwitchReady: false,
    credentialCustodyRequired: true,
    blockers: ["Live order endpoint is not implemented"],
    detail: "Live trading gate is disabled.",
  },
  readiness: [
    {
      key: "riskGateReady",
      ready: true,
      detail: "Deterministic risk gate is registered",
    },
    {
      key: "researchRunLedgerReady",
      ready: true,
      detail: "Research-run ledger exposes reproducible backtest records",
    },
    {
      key: "paperExecutionReady",
      ready: false,
      detail:
        "Paper simulator ledger registered; broker-grade readiness is blocked",
    },
    {
      key: "paperSimulationLedgerReady",
      ready: true,
      detail:
        "Deterministic paper order-plan, fill, and reconciliation ledger is registered",
    },
  ],
  blockers: ["No production signed order-plan workflow"],
};

const mockBudgets = [
  {
    id: "budget-api-1",
    name: "API dry-run budget",
    status: "active",
    mode: "dry_run",
    currency: "KRW",
    totalBudget: 10000000,
    cashReservePct: 20,
    allowedAssetClasses: ["cash", "domestic_stock", "domestic_etf"],
    policy: mockRiskGateStatus.defaultPolicy,
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
    createdAt: "2026-05-22T08:20:00.000Z",
    updatedAt: "2026-05-22T08:20:00.000Z",
  },
];

const mockResearchRuns = [
  {
    id: "rr-api-1",
    budgetEnvelopeId: "budget-api-1",
    objective: "Validate API momentum baseline",
    strategyFamily: "cross-sectional momentum",
    hypothesis: "Momentum should beat the benchmark after costs.",
    status: "proposal_ready",
    phase: "artifacts_persisted",
    advanceEligible: true,
    datasetRefs: [
      {
        id: "krx-daily-bars",
        source: "sample",
        windowStart: "2025-01-01",
        windowEnd: "2026-05-21",
        availabilityTimestamp: "2026-05-21T23:50:00.000Z",
      },
    ],
    featureRefs: ["return_60d", "volatility_20d"],
    timestampLagRules: ["Signals use data available before proposal time."],
    noLookaheadChecked: true,
    benchmark: "KOSPI 200",
    costModel: "10 bps per side",
    slippageModel: "5 bps fixed haircut",
    modelName: "deterministic-ranking-baseline",
    validationWindow: {
      start: "2025-01-01",
      end: "2026-05-21",
    },
    backtestMetrics: {
      totalReturnPct: 12.4,
      benchmarkReturnPct: 8.1,
      maxDrawdownPct: 7.6,
      sharpeRatio: 1.22,
      turnoverPct: 96,
      tradeCount: 31,
    },
    artifactRefs: ["s3://research-runs/rr-api-1/report.json"],
    artifactHashes: {
      "s3://research-runs/rr-api-1/report.json": "sha256:test",
    },
    knownFailureModes: ["Momentum reversal"],
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
    createdAt: "2026-05-22T08:30:00.000Z",
    updatedAt: "2026-05-22T08:42:00.000Z",
  },
];

const mockBaselineResearchRun = {
  id: "rr-baseline-api-1",
  budgetEnvelopeId: "budget-baseline-1",
  objective: "Run deterministic dry-run momentum baseline backtest",
  strategyFamily: "cross-sectional momentum",
  hypothesis: "The baseline evaluates historical bars without broker access.",
  status: "proposal_ready",
  phase: "artifacts_persisted",
  advanceEligible: true,
  datasetRefs: [
    {
      id: "krx-daily-bars",
      source: "baseline-runner",
      windowStart: "2025-01-01",
      windowEnd: "2026-05-21",
      availabilityTimestamp: "2026-05-21T23:50:00.000Z",
    },
  ],
  featureRefs: ["return_60d"],
  timestampLagRules: ["Signals use data available before proposal time."],
  noLookaheadChecked: true,
  benchmark: "KOSPI 200 total return proxy",
  costModel: "10 bps per side",
  slippageModel: "5 bps fixed haircut",
  modelName: "deterministic-ranking-baseline",
  validationWindow: {
    start: "2025-01-01",
    end: "2026-05-21",
  },
  backtestMetrics: {
    totalReturnPct: 9.2,
    benchmarkReturnPct: 7.3,
    maxDrawdownPct: 6.8,
    sharpeRatio: 1.05,
    turnoverPct: 88,
    tradeCount: 19,
  },
  artifactRefs: ["s3://research-runs/rr-baseline-api-1/report.json"],
  artifactHashes: {
    "s3://research-runs/rr-baseline-api-1/report.json": "sha256:baseline",
  },
  knownFailureModes: ["Momentum reversal"],
  brokerExecutionEnabled: false,
  liveTradingEnabled: false,
  createdAt: "2026-05-22T09:00:00.000Z",
  updatedAt: "2026-05-22T09:12:00.000Z",
};

const mockProposals = [
  {
    id: "proposal-api-1",
    budgetEnvelopeId: "budget-api-1",
    researchRunId: "rr-api-1",
    strategyId: "momentum-v1",
    ruleId: "long-only-breakout",
    actor: "strategy",
    status: "paper_ready",
    generatedAt: "2026-05-22T09:00:00.000Z",
    marketDataTimestamp: "2026-05-22T08:55:00.000Z",
    portfolioSnapshot: {
      currency: "KRW",
      equity: 10000000,
      cash: 10000000,
      grossExposurePct: 0,
      positions: [],
    },
    orders: [
      {
        symbol: "005930",
        assetClass: "domestic_stock",
        side: "BUY",
        orderType: "MARKET",
        notional: 500000,
        targetPositionPct: 5,
      },
    ],
    thesis: "API momentum proposal.",
    evidenceRefs: ["s3://research-runs/rr-api-1/report.json"],
    brokerExecutionEnabled: false,
    requiresHumanApproval: false,
    createdAt: "2026-05-22T09:00:00.000Z",
    updatedAt: "2026-05-22T09:03:00.000Z",
  },
];

const mockRiskEvaluations = [
  {
    id: "risk-api-1",
    proposalId: "proposal-api-1",
    decision: "ALLOW",
    reasons: ["API paper proposal is inside policy limits."],
    requestSnapshot: {
      mode: "paper",
      actor: "strategy",
      researchRunId: 1,
      strategyId: "momentum-v1",
      ruleId: "long-only-breakout",
      generatedAt: "2026-05-22T09:00:00.000Z",
      marketDataTimestamp: "2026-05-22T08:55:00.000Z",
      portfolio: mockProposals[0].portfolioSnapshot,
      orders: mockProposals[0].orders,
      evidenceRefs: mockProposals[0].evidenceRefs,
      executionIntent: "evaluate_only",
    },
    responseSnapshot: {
      decision: "ALLOW",
      evaluatedAt: "2026-05-22T09:02:00.000Z",
      mode: "paper",
      brokerExecutionEnabled: false,
      requiresHumanApproval: false,
      reasons: ["API paper proposal is inside policy limits."],
      policy: mockRiskGateStatus.defaultPolicy,
      approvedOrderCount: 1,
    },
    brokerExecutionEnabled: false,
    requiresHumanApproval: false,
    evaluatedAt: "2026-05-22T09:02:00.000Z",
    createdAt: "2026-05-22T09:02:00.000Z",
  },
];

const mockRecoveryProposal = {
  id: "proposal-recovery-api-1",
  budgetEnvelopeId: "budget-api-1",
  researchRunId: "rr-recovery-api-1",
  strategyId: "paper_recovery:sell-only-baseline",
  ruleId: "paper-account-recovery-sell-only-v1",
  actor: "scheduler",
  status: "generated",
  generatedAt: "2026-05-22T09:10:00.000Z",
  marketDataTimestamp: "2026-05-22T09:10:00.000Z",
  portfolioSnapshot: {
    currency: "KRW",
    equity: 9999250,
    cash: 9499250,
    grossExposurePct: 5,
    positions: [
      {
        symbol: "005930",
        assetClass: "domestic_stock",
        marketValue: 500000,
        weightPct: 5,
      },
    ],
  },
  orders: [
    {
      symbol: "005930",
      assetClass: "domestic_stock",
      side: "SELL",
      orderType: "MARKET",
      notional: 500000,
      targetPositionPct: 0,
    },
  ],
  thesis: "Recovery proposal from paper positions.",
  evidenceRefs: ["paper-account:paper-account-api-1"],
  brokerExecutionEnabled: false,
  requiresHumanApproval: true,
  createdAt: "2026-05-22T09:10:00.000Z",
  updatedAt: "2026-05-22T09:10:00.000Z",
};

const mockRecoveryRiskEvaluation = {
  id: "risk-recovery-api-1",
  proposalId: "proposal-recovery-api-1",
  decision: "REVIEW",
  reasons: ["Human approval is required outside dry-run mode"],
  requestSnapshot: {
    mode: "paper",
    actor: "scheduler",
    researchRunId: "rr-recovery-api-1",
    strategyId: "paper_recovery:sell-only-baseline",
    ruleId: "paper-account-recovery-sell-only-v1",
    generatedAt: "2026-05-22T09:10:00.000Z",
    marketDataTimestamp: "2026-05-22T09:10:00.000Z",
    portfolio: mockRecoveryProposal.portfolioSnapshot,
    orders: mockRecoveryProposal.orders,
    evidenceRefs: mockRecoveryProposal.evidenceRefs,
    executionIntent: "evaluate_only",
  },
  responseSnapshot: {
    decision: "REVIEW",
    evaluatedAt: "2026-05-22T09:10:01.000Z",
    mode: "paper",
    brokerExecutionEnabled: false,
    requiresHumanApproval: true,
    reasons: ["Human approval is required outside dry-run mode"],
    policy: mockRiskGateStatus.defaultPolicy,
    approvedOrderCount: 1,
  },
  brokerExecutionEnabled: false,
  requiresHumanApproval: true,
  evaluatedAt: "2026-05-22T09:10:01.000Z",
  createdAt: "2026-05-22T09:10:01.000Z",
};

const mockAutonomousRuns = [
  {
    id: "run-api-1",
    objective: "Autonomously prepare API paper allocation",
    status: "risk_checked",
    currentStage: "risk_evaluated",
    budgetEnvelopeId: "budget-api-1",
    scheduleId: "schedule-api-1",
    cycleKey: "schedule:schedule-api-1:2026-05-22T08:50:00.000Z",
    researchRunId: "rr-api-1",
    proposalId: "proposal-api-1",
    riskEvaluationId: "risk-api-1",
    timeline: [
      {
        at: "2026-05-22T08:50:00.000Z",
        stage: "idle",
        message: "Run created.",
      },
      {
        at: "2026-05-22T09:02:00.000Z",
        stage: "risk_checked",
        message: "Risk evaluation risk-api-1 returned ALLOW.",
      },
    ],
    lastAction: "Risk evaluation risk-api-1 returned ALLOW",
    nextAction: "Wait for signed paper approval and active paper account.",
    createdAt: "2026-05-22T08:50:00.000Z",
    updatedAt: "2026-05-22T09:02:00.000Z",
  },
];

const mockAutonomousRunSchedules = [
  {
    id: "schedule-api-1",
    budgetEnvelopeId: "budget-api-1",
    objective: "Autonomously prepare API paper allocation",
    mode: "dry_run",
    cadenceMinutes: 60,
    nextRunAt: "2026-05-22T09:50:00.000Z",
    enabled: true,
    attemptPaperExecution: false,
    lastRunId: "run-api-1",
    lastCycleKey: "schedule:schedule-api-1:2026-05-22T08:50:00.000Z",
    lastTickAt: "2026-05-22T08:50:00.000Z",
    leaseOwner: null,
    leaseExpiresAt: null,
    lastError: null,
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
    createdAt: "2026-05-22T08:45:00.000Z",
    updatedAt: "2026-05-22T09:02:00.000Z",
  },
];

const mockRunScheduleWorkerStatus = {
  enabled: true,
  cron: "*/1 * * * *",
  workerId: "test-worker",
  maxSchedulesPerTick: 5,
  leaseTtlSeconds: 120,
  lastTickAt: "2026-05-22T09:00:00.000Z",
  currentTime: "2026-05-22T09:02:00.000Z",
  lastResult: {
    trigger: "cron",
    workerId: "test-worker",
    enabled: true,
    startedAt: "2026-05-22T09:00:00.000Z",
    completedAt: "2026-05-22T09:00:03.000Z",
    scanned: 1,
    ticked: 1,
    failed: 0,
    skipped: 0,
    items: [
      {
        scheduleId: "schedule-api-1",
        status: "ticked",
        runId: "run-api-1",
        message: "risk_evaluated",
      },
    ],
  },
};

const mockPaperOrderPlans = [
  {
    id: "paper-plan-api-1",
    proposalId: "proposal-api-1",
    researchRunId: "rr-api-1",
    budgetEnvelopeId: "budget-api-1",
    riskEvaluationId: "risk-api-1",
    proposalHash: "sha256:proposal-api",
    riskRequestHash: "sha256:risk-api",
    planHash: "sha256:plan-api",
    idempotencyKey: "paper-api-1",
    status: "filled",
    mode: "paper",
    submittedAt: "2026-05-22T09:05:00.000Z",
    completedAt: "2026-05-22T09:06:00.000Z",
    readinessSnapshot: {
      budgetActive: true,
      latestRiskAllow: true,
      riskMatchesProposal: true,
      paperEngineEnabled: true,
      brokerExecutionDisabled: true,
      liveTradingDisabled: true,
      explicitPaperAccountActive: true,
      killSwitchArmed: true,
      killSwitchTripped: false,
      cashSufficient: true,
      positionsSufficient: true,
      noDuplicatePlan: true,
      requiredCash: 500_750,
      reservedCash: 0,
      availableCash: 10_000_000,
      requiredSellNotionalBySymbol: {},
      reservedSellNotionalBySymbol: {},
      availableSellNotionalBySymbol: {},
    },
    orders: [
      {
        paperOrderId: "paper-order:api:0",
        proposalOrderIndex: 0,
        symbol: "005930",
        side: "BUY",
        orderType: "MARKET",
        requestedNotional: 500000,
        targetPositionPct: 5,
        marketDataTimestamp: "2026-05-22T09:00:00.000Z",
        feeModelRef: "fixed-10bps-paper-fee-v1",
        slippageModelRef: "fixed-5bps-paper-slippage-v1",
        sourceOrder: {
          symbol: "005930",
          assetClass: "domestic_stock",
          side: "BUY",
          orderType: "MARKET",
          notional: 500000,
          targetPositionPct: 5,
        },
      },
    ],
    fills: [
      {
        paperFillId: "paper-order:api:0:fill:0",
        paperOrderId: "paper-order:api:0",
        timestamp: "2026-05-22T09:05:00.000Z",
        symbol: "005930",
        side: "BUY",
        quantity: 6.80027211,
        fillPrice: 73500,
        grossNotional: 499850,
        requestedNotional: 500000,
        filledNotional: 499850,
        fee: 500,
        feeCurrency: "KRW",
        slippage: 150,
        netCashDelta: -500500,
        positionDelta: 6.80027211,
        status: "filled",
      },
    ],
    portfolioBefore: {
      currency: "KRW",
      equity: 10000000,
      cash: 10000000,
      grossExposurePct: 0,
    },
    portfolioAfter: {
      currency: "KRW",
      equity: 9999850,
      cash: 9500000,
      grossExposurePct: 5,
    },
    cashLedger: [
      {
        paperCashEventId: "paper-order:api:0:fill:0:cash",
        paperFillId: "paper-order:api:0:fill:0",
        timestamp: "2026-05-22T09:05:00.000Z",
        currency: "KRW",
        amount: -500500,
        balanceAfter: 9500000,
        reason: "BUY paper fill net cash delta",
      },
    ],
    positionLedger: [
      {
        paperPositionEventId: "paper-order:api:0:fill:0:position",
        paperFillId: "paper-order:api:0:fill:0",
        timestamp: "2026-05-22T09:05:00.000Z",
        symbol: "005930",
        quantityDelta: 6.80027211,
        notionalDelta: 499850,
        positionNotionalAfter: 499850,
      },
    ],
    startingCash: 10000000,
    endingCash: 9500000,
    startingEquity: 10000000,
    endingEquity: 9999850,
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
    reconciliation: {
      status: "matched",
      reconciledAt: "2026-05-22T09:06:00.000Z",
      cashMatched: true,
      positionsMatched: true,
      expectedCash: 9500000,
      actualCash: 9500000,
      cashDiff: 0,
      expectedPositions: {
        "005930": 499850,
      },
      actualPositions: {
        "005930": 499850,
      },
      positionDiffs: {
        "005930": 0,
      },
      tolerance: 0.01,
      notes: ["Paper cash ledger matched simulated fills."],
    },
    killSwitchSnapshot: {
      armed: true,
      tripped: false,
      checkedAt: "2026-05-22T09:05:00.000Z",
      reason: "Execution control state is active.",
    },
    blockedReasons: [],
    createdAt: "2026-05-22T09:04:00.000Z",
    updatedAt: "2026-05-22T09:06:30.000Z",
  },
];

const mockPaperAccount = {
  id: "paper-account-api-1",
  name: "API paper account",
  budgetEnvelopeId: "budget-api-1",
  status: "active",
  currency: "KRW",
  cash: 9500000,
  equity: 9999850,
  grossExposurePct: 5,
  positions: [
    {
      symbol: "005930",
      assetClass: "domestic_stock",
      marketValue: 499850,
      weightPct: 5,
    },
  ],
  cashLedger: mockPaperOrderPlans[0].cashLedger,
  positionLedger: mockPaperOrderPlans[0].positionLedger,
  appliedPlanIds: ["paper-plan-api-1"],
  lastAppliedPlanId: "paper-plan-api-1",
  lastReconciledAt: "2026-05-22T09:06:00.000Z",
  brokerExecutionEnabled: false,
  liveTradingEnabled: false,
  createdAt: "2026-05-22T09:00:00.000Z",
  updatedAt: "2026-05-22T09:06:30.000Z",
};

const mockPaperAccountEvents = [
  {
    id: "paper-account-event-api-2",
    paperAccountId: mockPaperAccount.id,
    budgetEnvelopeId: "budget-api-1",
    eventType: "paper_order_plan",
    sourceId: "paper-plan-api-1",
    idempotencyKey: "paper-account-plan:paper-plan-api-1",
    actor: "paper-execution-engine",
    reason: "Applied API paper order plan.",
    sequence: 2,
    currency: "KRW",
    cashBefore: 10000000,
    cashAfter: 9500000,
    equityBefore: 10000000,
    equityAfter: 9999850,
    cashDelta: -500000,
    equityDelta: -150,
    previousEventHash: "sha256:account-seed-api",
    requestHash: "sha256:account-plan-request-api",
    eventHash: "sha256:account-plan-api",
    eventSnapshot: {
      paperAccountId: 1,
      budgetEnvelopeId: 1,
      eventType: "paper_order_plan",
      sourceId: 1,
      idempotencyKey: "paper-account-plan:paper-plan-api-1",
      actor: "paper-execution-engine",
      reason: "Applied API paper order plan.",
      sequence: 2,
      currency: "KRW",
      cashBefore: 10000000,
      cashAfter: 9500000,
      equityBefore: 10000000,
      equityAfter: 9999850,
      positionsBefore: [],
      positionsAfter: mockPaperAccount.positions,
      previousEventHash: "sha256:account-seed-api",
      requestHash: "sha256:account-plan-request-api",
      recordedAt: "2026-05-22T09:05:00.000Z",
    },
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
    createdAt: "2026-05-22T09:05:00.000Z",
  },
];

const mockExecutionControl = {
  id: "execution-control-api-1",
  state: "active",
  actor: "system",
  reason: "Paper execution control is active.",
  createdAt: "2026-05-22T09:00:00.000Z",
};

const mockBrokerSnapshots = [
  {
    id: "broker-snapshot-api-1",
    provider: "manual",
    sourceRef: "operator-import",
    accountRefHash: "sha256:broker-account",
    status: "matched",
    currency: "KRW",
    cash: 9500000,
    equity: 9999850,
    grossExposurePct: 5,
    positions: mockPaperAccount.positions,
    asOf: "2026-05-22T09:07:00.000Z",
    reconciliation: {
      status: "matched",
      checkedAt: "2026-05-22T09:08:00.000Z",
      paperAccountId: mockPaperAccount.id,
      cashMatched: true,
      equityMatched: true,
      positionsMatched: true,
      expectedPaperCash: 9500000,
      actualBrokerCash: 9500000,
      cashDiff: 0,
      expectedPaperEquity: 9999850,
      actualBrokerEquity: 9999850,
      equityDiff: 0,
      expectedPaperPositions: { "005930": 499850 },
      actualBrokerPositions: { "005930": 499850 },
      positionDiffs: { "005930": 0 },
      tolerance: 0.01,
      maxAgeMinutes: 60,
      notes: ["Broker snapshot compared against active paper account state."],
    },
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
    createdAt: "2026-05-22T09:07:00.000Z",
    updatedAt: "2026-05-22T09:08:00.000Z",
  },
];

const mockBrokerFills = [
  {
    id: "broker-fill-api-1",
    provider: "manual",
    sourceRef: "operator-fill-import",
    accountRefHash: "sha256:broker-account",
    brokerOrderRefHash: "sha256:broker-order",
    brokerFillRefHash: "sha256:broker-fill",
    status: "matched",
    symbol: "005930",
    side: "BUY",
    quantity: 6.8,
    fillPrice: 73500,
    grossNotional: 499800,
    fee: 500,
    feeCurrency: "KRW",
    currency: "KRW",
    filledAt: "2026-05-22T09:06:00.000Z",
    asOf: "2026-05-22T09:07:00.000Z",
    reconciliation: {
      status: "matched",
      checkedAt: "2026-05-22T09:08:00.000Z",
      paperOrderPlanId: "paper-plan-api-1",
      paperFillId: "paper-order:proposal-api-1:0:fill:0",
      symbolMatched: true,
      sideMatched: true,
      quantityMatched: true,
      notionalMatched: true,
      feeMatched: true,
      brokerQuantity: 6.8,
      brokerGrossNotional: 499800,
      brokerFee: 500,
      expectedQuantity: 6.8,
      expectedGrossNotional: 499800,
      expectedFee: 500,
      quantityDiff: 0,
      notionalDiff: 0,
      feeDiff: 0,
      tolerance: 0.01,
      notes: [
        "Broker fill compared against paper fill paper-order:proposal-api-1:0:fill:0 from paper order plan paper-plan-api-1.",
      ],
    },
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
    createdAt: "2026-05-22T09:07:00.000Z",
    updatedAt: "2026-05-22T09:08:00.000Z",
  },
];

const mockBrokerAdapterStatus = {
  provider: "toss",
  configured: false,
  readOnlyEnabled: false,
  paperTradingEnabled: false,
  liveTradingEnabled: false,
  authMethod: "oauth2_client_credentials",
  credentialRef: "missing",
  credentialCustody: {
    mode: "missing",
    configured: false,
    productionReady: false,
    secretRef: "missing",
    detail: "External secret custody is required.",
  },
  schemaVerified: false,
  sandboxVerified: false,
  readOnlyPoll: {
    provider: "toss",
    enabled: false,
    configured: false,
    schemaVerified: false,
    fillPollingEnabled: false,
    fillSchemaVerified: false,
    fillPathConfigured: false,
    canPoll: false,
    canPollFills: false,
    baseUrl: "https://openapi.tossinvest.com",
    accountRef: "missing",
    allowedEndpoints: [
      "POST /oauth2/token",
      "GET /api/v1/accounts",
      "GET /v1/holdings",
    ],
    cron: "*/5 * * * *",
    running: false,
    lastFillCount: 0,
    lastReconciliationStatus: "not_checked",
    lastFillReconciliationStatus: "not_checked",
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
  },
  capabilities: [
    {
      key: "credentials",
      status: "blocked",
      detail: "Toss credentials are missing.",
    },
    {
      key: "credentialCustody",
      status: "blocked",
      detail: "External secret custody is required.",
    },
    {
      key: "openApiSchema",
      status: "blocked",
      detail: "Exact Toss schema is not verified.",
    },
    {
      key: "readOnlyAccountSnapshot",
      status: "blocked",
      detail: "Read-only polling remains disabled.",
    },
    {
      key: "orderPlacement",
      status: "blocked",
      detail: "Live order placement is intentionally blocked.",
    },
  ],
  blockers: ["orderPlacement: Live order placement is intentionally blocked."],
  brokerExecutionEnabled: false,
};

const mockOrderPlanApprovals = [
  {
    id: "approval-api-1",
    proposalId: "proposal-api-1",
    riskEvaluationId: "risk-api-1",
    idempotencyKey: "paper-api-1",
    mode: "paper",
    approver: "api-operator",
    reason: "Approve API paper plan.",
    status: "consumed",
    proposalHash: "sha256:proposal-api",
    riskRequestHash: "sha256:risk-api",
    approvalHash: "sha256:approval-api",
    approvalSnapshot: {
      proposalId: 1,
      riskEvaluationId: 1,
      mode: "paper",
      approver: "api-operator",
      reason: "Approve API paper plan.",
      idempotencyKey: "paper-api-1",
      approvedOrderCount: 1,
      approvedAt: "2026-05-22T09:03:00.000Z",
      proposalHash: "sha256:proposal-api",
      riskRequestHash: "sha256:risk-api",
    },
    approvedAt: "2026-05-22T09:03:00.000Z",
    consumedAt: "2026-05-22T09:05:00.000Z",
    consumedByPaperOrderPlanId: "paper-plan-api-1",
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
    createdAt: "2026-05-22T09:03:00.000Z",
    updatedAt: "2026-05-22T09:05:00.000Z",
  },
];

describe("ControlPlaneDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(riskGateApi.getStatus).mockResolvedValue(mockRiskGateStatus);
    vi.mocked(controlPlaneApi.getStatus).mockResolvedValue(
      mockControlPlaneStatus,
    );
    vi.mocked(controlPlaneApi.getBudgets).mockResolvedValue(mockBudgets);
    vi.mocked(controlPlaneApi.getResearchRuns).mockResolvedValue(
      mockResearchRuns,
    );
    vi.mocked(controlPlaneApi.getProposals).mockResolvedValue(mockProposals);
    vi.mocked(controlPlaneApi.getRiskEvaluations).mockResolvedValue(
      mockRiskEvaluations,
    );
    vi.mocked(controlPlaneApi.getRuns).mockResolvedValue(mockAutonomousRuns);
    vi.mocked(controlPlaneApi.getRunSchedules).mockResolvedValue(
      mockAutonomousRunSchedules,
    );
    vi.mocked(controlPlaneApi.getRunScheduleWorkerStatus).mockResolvedValue(
      mockRunScheduleWorkerStatus,
    );
    vi.mocked(controlPlaneApi.getPaperAccount).mockResolvedValue(
      mockPaperAccount,
    );
    vi.mocked(controlPlaneApi.getPaperAccountEvents).mockResolvedValue(
      mockPaperAccountEvents,
    );
    vi.mocked(controlPlaneApi.getExecutionControl).mockResolvedValue(
      mockExecutionControl,
    );
    vi.mocked(controlPlaneApi.getPaperOrderPlans).mockResolvedValue(
      mockPaperOrderPlans,
    );
    vi.mocked(controlPlaneApi.getBrokerSnapshots).mockResolvedValue(
      mockBrokerSnapshots,
    );
    vi.mocked(controlPlaneApi.getBrokerFills).mockResolvedValue(
      mockBrokerFills,
    );
    vi.mocked(controlPlaneApi.getBrokerAdapterStatus).mockResolvedValue(
      mockBrokerAdapterStatus,
    );
    vi.mocked(controlPlaneApi.getOrderPlanApprovals).mockResolvedValue(
      mockOrderPlanApprovals,
    );
    vi.mocked(controlPlaneApi.runBaselineResearch).mockResolvedValue(
      mockBaselineResearchRun,
    );
    vi.mocked(controlPlaneApi.runRecoveryProposal).mockResolvedValue({
      researchRun: {
        ...mockBaselineResearchRun,
        id: "rr-recovery-api-1",
        objective: "Reduce paper account exposure",
        strategyFamily: "paper_recovery",
      },
      proposal: mockRecoveryProposal,
      riskEvaluation: mockRecoveryRiskEvaluation,
    });
    vi.mocked(controlPlaneApi.advanceRun).mockResolvedValue(
      mockAutonomousRuns[0],
    );
  });

  it("should_render_read_only_control_plane_status", async () => {
    render(<ControlPlaneDashboard />);

    expect(
      screen.getByRole("heading", { name: "Control Plane Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No live trading")).toBeInTheDocument();
    expect(screen.getByText("brokerExecutionEnabled")).toBeInTheDocument();
    expect(screen.getByText("liveGate")).toBeInTheDocument();
    expect(screen.getAllByText("disabled").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("false").length).toBeGreaterThanOrEqual(1);

    await waitFor(() => {
      expect(screen.getByText("Live API status")).toBeInTheDocument();
    });
    expect(screen.getByText("Autonomous Action Chain")).toBeInTheDocument();
    expect(screen.getByText("Live budgets")).toBeInTheDocument();
    expect(screen.getByText("Live proposals")).toBeInTheDocument();
    expect(screen.getByText("Live risk evaluations")).toBeInTheDocument();
    expect(screen.getByText("Automation Action Ledger")).toBeInTheDocument();
    expect(screen.getByText("Live autonomous runs")).toBeInTheDocument();
    expect(screen.getByText("Live run schedules")).toBeInTheDocument();
    expect(screen.getByText("Live schedule worker")).toBeInTheDocument();
    expect(screen.getByText("Worker Idle")).toBeInTheDocument();
    expect(screen.getByText("test-worker")).toBeInTheDocument();
    expect(screen.getAllByText("schedule-api-1").length).toBeGreaterThan(0);
    expect(screen.getByText("run-api-1")).toBeInTheDocument();
    expect(
      screen.getByText("Autonomously prepare API paper allocation"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Wait for signed paper approval and active paper account.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) => content.includes("API dry-run budget")),
    ).toBeInTheDocument();
    expect(screen.getByText("proposal proposal-api-1")).toBeInTheDocument();
    expect(screen.getAllByText("risk risk-api-1").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("API paper proposal is inside policy limits.").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("System Readiness Matrix")).toBeInTheDocument();
    expect(screen.getByText("riskGateReady")).toBeInTheDocument();
    expect(screen.getByText("researchRunLedgerReady")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        "Paper simulator ledger registered; broker-grade readiness is blocked",
      ).length,
    ).toBeGreaterThanOrEqual(1);

    expect(screen.getByText("Research Run Ledger")).toBeInTheDocument();
    expect(screen.getByText("Live research ledger")).toBeInTheDocument();
    expect(screen.getByText("Baseline research dry-run")).toBeInTheDocument();
    expect(screen.getByText("Run dry-run backtest")).toBeInTheDocument();
    expect(
      screen.getByText("Validate API momentum baseline"),
    ).toBeInTheDocument();
    expect(screen.getByText("Backtest Metrics")).toBeInTheDocument();
    expect(screen.getByText("+12.4%")).toBeInTheDocument();
    expect(screen.getByText("Broker disabled")).toBeInTheDocument();

    expect(screen.getByText("Paper Execution Enclave")).toBeInTheDocument();
    expect(screen.getByText("Paper Account State")).toBeInTheDocument();
    expect(screen.getByText("Live paper account")).toBeInTheDocument();
    expect(screen.getByText("Execution control")).toBeInTheDocument();
    expect(
      screen.getByText("Paper execution control is active."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Positions").length).toBeGreaterThan(0);
    expect(screen.getAllByText("005930").length).toBeGreaterThan(0);
    expect(screen.getByText("Last reconciliation")).toBeInTheDocument();
    expect(screen.getByText("Account event chain")).toBeInTheDocument();
    expect(screen.getByText("Live account events")).toBeInTheDocument();
    expect(
      screen.getByText("Applied API paper order plan."),
    ).toBeInTheDocument();
    expect(screen.getByText("Recent ledger changes")).toBeInTheDocument();
    expect(
      screen.getByText("BUY paper fill net cash delta"),
    ).toBeInTheDocument();
    expect(screen.getByText("Live paper plans")).toBeInTheDocument();
    expect(screen.getByText("paper-plan-api-1")).toBeInTheDocument();
    expect(screen.getByText("Proposal proposal-api-1")).toBeInTheDocument();
    expect(screen.getByText("Paper fills")).toBeInTheDocument();
    expect(screen.getByText("Reconciliation")).toBeInTheDocument();
    expect(screen.getByText("Plan hash: sha256:plan-api")).toBeInTheDocument();
    expect(screen.getByText("Expected cash")).toBeInTheDocument();
    expect(
      screen.getByText("Paper cash ledger matched simulated fills."),
    ).toBeInTheDocument();
    expect(screen.getByText("Broker Snapshot Monitor")).toBeInTheDocument();
    expect(screen.getByText("API broker snapshots")).toBeInTheDocument();
    expect(screen.getByText("API broker adapter status")).toBeInTheDocument();
    expect(
      screen.getByText("toss / oauth2_client_credentials"),
    ).toBeInTheDocument();
    expect(screen.getByText("Read-only polling")).toBeInTheDocument();
    expect(screen.getByText("Fill polling")).toBeInTheDocument();
    expect(screen.getByText("last fill poll")).toBeInTheDocument();
    expect(screen.getByText("fill reconcile")).toBeInTheDocument();
    expect(screen.getAllByText("blocked").length).toBeGreaterThan(0);
    expect(screen.getByText("last poll")).toBeInTheDocument();
    expect(screen.getAllByText("never").length).toBeGreaterThan(0);
    expect(screen.getByText("orderPlacement")).toBeInTheDocument();
    expect(screen.getByText("manual / operator-import")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Broker snapshot compared against active paper account state.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Broker Fill Evidence")).toBeInTheDocument();
    expect(screen.getByText("API broker fills")).toBeInTheDocument();
    expect(screen.getByText("plan paper-plan-api-1")).toBeInTheDocument();
    expect(
      screen.getAllByText(/paper-order:proposal-api-1:0:fill:0/).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Qty diff")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Broker fill compared against paper fill paper-order:proposal-api-1:0:fill:0 from paper order plan paper-plan-api-1.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Signed Order Approval")).toBeInTheDocument();
    expect(screen.getByText("Live signed approvals")).toBeInTheDocument();
    expect(
      screen.getAllByText("approval approval-api-1").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Approve API paper plan.").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("brokerExecutionEnabled: false").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.queryByRole("button", {
        name: /paper execute|reconcile|pause|halt/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("should_show_documented_fallback_when_status_api_fails", async () => {
    vi.mocked(riskGateApi.getStatus).mockRejectedValue(new Error("offline"));
    vi.mocked(controlPlaneApi.getStatus).mockRejectedValue(
      new Error("offline"),
    );
    vi.mocked(controlPlaneApi.getBudgets).mockRejectedValue(
      new Error("offline"),
    );
    vi.mocked(controlPlaneApi.getResearchRuns).mockRejectedValue(
      new Error("offline"),
    );
    vi.mocked(controlPlaneApi.getProposals).mockRejectedValue(
      new Error("offline"),
    );
    vi.mocked(controlPlaneApi.getRiskEvaluations).mockRejectedValue(
      new Error("offline"),
    );
    vi.mocked(controlPlaneApi.getRuns).mockRejectedValue(new Error("offline"));
    vi.mocked(controlPlaneApi.getRunSchedules).mockRejectedValue(
      new Error("offline"),
    );
    vi.mocked(controlPlaneApi.getRunScheduleWorkerStatus).mockRejectedValue(
      new Error("offline"),
    );
    vi.mocked(controlPlaneApi.getPaperAccount).mockRejectedValue(
      new Error("offline"),
    );
    vi.mocked(controlPlaneApi.getPaperOrderPlans).mockRejectedValue(
      new Error("offline"),
    );
    vi.mocked(controlPlaneApi.getBrokerSnapshots).mockRejectedValue(
      new Error("offline"),
    );
    vi.mocked(controlPlaneApi.getBrokerFills).mockRejectedValue(
      new Error("offline"),
    );
    vi.mocked(controlPlaneApi.getBrokerAdapterStatus).mockRejectedValue(
      new Error("offline"),
    );
    vi.mocked(controlPlaneApi.getOrderPlanApprovals).mockRejectedValue(
      new Error("offline"),
    );

    render(<ControlPlaneDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Documented fallback")).toBeInTheDocument();
    });

    expect(
      screen.getByText((content) =>
        content.includes("control-plane status APIs are unavailable"),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Live trading")).toBeInTheDocument();
    expect(screen.getAllByText("Blocked").length).toBeGreaterThan(0);
    expect(screen.getByText("Documented sample runs")).toBeInTheDocument();
    expect(screen.getByText("Documented run sample")).toBeInTheDocument();
    expect(screen.getByText("Documented schedule sample")).toBeInTheDocument();
    expect(screen.getByText("Documented worker sample")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Validate a dry-run momentum baseline before any proposal",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) =>
        content.includes("Research-run ledger API is unavailable"),
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Documented sample plans")).toBeInTheDocument();
    expect(
      screen.getByText("Documented broker adapter sample"),
    ).toBeInTheDocument();
    expect(screen.getByText("No paper account")).toBeInTheDocument();
    expect(
      screen.getByText((content) =>
        content.includes("Paper order-plan API is unavailable"),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText((content) =>
        content.includes("No live paper account state was returned"),
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "No promoted paper account is active yet. Seed and promote a paper account before paper execution.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("paper-docs-plan-001")).toBeInTheDocument();
    expect(screen.getByText("Documented broker sample")).toBeInTheDocument();
    expect(screen.getByText("broker-snapshot-docs-001")).toBeInTheDocument();
  });

  it("should_show_empty_state_when_live_research_ledger_is_empty", async () => {
    vi.mocked(controlPlaneApi.getResearchRuns).mockResolvedValue([]);

    render(<ControlPlaneDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Live research ledger")).toBeInTheDocument();
    });

    expect(
      screen.getByText("No research runs recorded yet."),
    ).toBeInTheDocument();
  });

  it("should_show_next_action_when_research_is_ready_but_proposal_is_missing", async () => {
    vi.mocked(controlPlaneApi.getProposals).mockResolvedValue([]);
    vi.mocked(controlPlaneApi.getRiskEvaluations).mockResolvedValue([]);

    render(<ControlPlaneDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Autonomous Action Chain")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Create proposal from proposal-ready research run"),
    ).toBeInTheDocument();
    expect(screen.getByText("No proposal risk evaluation")).toBeInTheDocument();
  });

  it("should_show_empty_state_when_live_paper_plan_ledger_is_empty", async () => {
    vi.mocked(controlPlaneApi.getPaperOrderPlans).mockResolvedValue([]);

    render(<ControlPlaneDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Live paper plans")).toBeInTheDocument();
    });

    expect(
      screen.getByText("No paper order plans recorded yet."),
    ).toBeInTheDocument();
  });

  it("should_run_baseline_dry_run_backtest_and_add_returned_research_run", async () => {
    render(<ControlPlaneDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Live research ledger")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Run dry-run backtest" }),
    );

    await waitFor(() => {
      expect(controlPlaneApi.runBaselineResearch).toHaveBeenCalledWith({
        objective: "Run deterministic dry-run momentum baseline backtest",
        strategyFamily: "cross-sectional momentum",
        symbol: "005930",
        benchmark: "KOSPI 200 total return proxy",
        initialCapital: 10000000,
      });
    });

    expect(
      await screen.findByText(
        "Baseline dry-run completed. Returned research run added to the ledger.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Run deterministic dry-run momentum baseline backtest"),
    ).toBeInTheDocument();
    expect(screen.getByText("+9.2%")).toBeInTheDocument();
  });

  it("should_create_sell_only_recovery_proposal_without_paper_execution", async () => {
    render(<ControlPlaneDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Live paper account")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Create sell-only recovery" }),
    );

    await waitFor(() => {
      expect(controlPlaneApi.runRecoveryProposal).toHaveBeenCalledWith({
        maxPositions: 10,
      });
    });

    expect(controlPlaneApi.runBaselineResearch).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        "SELL-only recovery proposal proposal-recovery-api-1 created; no paper fill or broker order was submitted.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Reduce paper account exposure"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("proposal proposal-recovery-api-1"),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText("risk risk-recovery-api-1").length,
    ).toBeGreaterThan(0);
  });

  it("should_advance_latest_autonomous_run_and_refresh_ledgers", async () => {
    const advancedRun = {
      ...mockAutonomousRuns[0],
      status: "paper_ready",
      currentStage: "paper_execution_recorded",
      paperOrderPlanId: "paper-plan-api-1",
      nextAction: "Reconcile paper order plan and broker read-only snapshot",
      updatedAt: "2026-05-22T09:06:00.000Z",
    };
    vi.mocked(controlPlaneApi.advanceRun).mockResolvedValue(advancedRun);

    render(<ControlPlaneDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Live autonomous runs")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Advance latest run" }));

    await waitFor(() => {
      expect(controlPlaneApi.advanceRun).toHaveBeenCalledWith("run-api-1", {
        attemptPaperExecution: true,
      });
    });
    expect(controlPlaneApi.getResearchRuns).toHaveBeenCalledTimes(2);
    expect(
      await screen.findByText(
        "Reconcile paper order plan and broker read-only snapshot",
      ),
    ).toBeInTheDocument();
  });

  it("should_keep_advanced_run_when_a_refresh_after_advance_fails", async () => {
    const advancedRun = {
      ...mockAutonomousRuns[0],
      status: "paper_ready",
      currentStage: "paper_execution_recorded",
      paperOrderPlanId: "paper-plan-api-1",
      nextAction: "Reconcile paper order plan and broker read-only snapshot",
      updatedAt: "2026-05-22T09:06:00.000Z",
    };
    vi.mocked(controlPlaneApi.advanceRun).mockResolvedValue(advancedRun);

    render(<ControlPlaneDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Live autonomous runs")).toBeInTheDocument();
    });

    vi.mocked(controlPlaneApi.getRunSchedules).mockRejectedValueOnce(
      new Error("refresh failed"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Advance latest run" }));

    expect(
      await screen.findByText(
        "Reconcile paper order plan and broker read-only snapshot",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Autonomous run advance failed. No broker or live order path was called.",
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Schedule refresh failed after automation action."),
    ).toBeInTheDocument();
  });

  it("should_show_failure_when_baseline_dry_run_backtest_fails", async () => {
    vi.mocked(controlPlaneApi.runBaselineResearch).mockRejectedValue(
      new Error("runner failed"),
    );

    render(<ControlPlaneDashboard />);

    await waitFor(() => {
      expect(screen.getByText("Live research ledger")).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: "Run dry-run backtest" }),
    );

    expect(
      await screen.findByText(
        "Baseline dry-run failed. No broker or live order path was called.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Validate API momentum baseline"),
    ).toBeInTheDocument();
  });
});
