import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
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
    getFundingReadinessRecords: vi.fn(),
    getLivePilotReadinessRecords: vi.fn(),
    getBrokerOrderCommands: vi.fn(),
    getBrokerOrderStatuses: vi.fn(),
    getBrokerFills: vi.fn(),
    reconcileBrokerFill: vi.fn(),
    pollBrokerReadOnlyFills: vi.fn(),
    getBrokerAdapterStatus: vi.fn(),
    getOrderPlanApprovals: vi.fn(),
    getRuns: vi.fn(),
    getRunSchedules: vi.fn(),
    getRunScheduleWorkerStatus: vi.fn(),
    getMarketDataIngestionStatus: vi.fn(),
    getMarketDataIngestionRuns: vi.fn(),
    getActionTimeline: vi.fn(),
    advanceRun: vi.fn(),
    tickRunSchedule: vi.fn(),
    runBaselineResearch: vi.fn(),
    runRecoveryProposal: vi.fn(),
    tripKillSwitch: vi.fn(),
  },
  v1PilotApi: {
    getStatus: vi.fn(() =>
      Promise.resolve({
        checkedAt: "2026-05-22T09:00:00.000Z",
        verdict: "blocked",
        leanRun: null,
        alpha: {
          featureSnapshotCount: 0,
          numericDecisionCount: 0,
          llmDecisionCount: 0,
          metaDecisionCount: 0,
          mlModelStatus: "not_promoted",
        },
        portfolioTarget: { targetCount: 0 },
        paper: { status: "missing", fillCount: 0 },
        broker: { snapshotStatus: "missing", openOrderCount: 0 },
        livePilot: { realOrderSent: false },
        preflight: {
          status: "blocked",
          checkedAt: "2026-05-22T09:00:00.000Z",
          maxPilotNotionalUsd: 10,
          broker: "toss",
          blockers: ["Test preflight blocked."],
          requiredFlags: {},
          openOrderRefs: [],
          credentialMode: "missing",
        },
        stages: [
          {
            key: "live_preflight",
            label: "Live Preflight",
            status: "blocked",
            detail: "blocked",
            blockers: ["Test preflight blocked."],
            refs: [],
          },
        ],
        nextActions: ["Resolve Live Preflight: Test preflight blocked."],
      }),
    ),
    listLeanRuns: vi.fn(() => Promise.resolve([])),
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
    killSwitchReady: true,
    credentialCustodyRequired: true,
    blockers: ["Live order endpoint is not implemented"],
    detail: "Live trading gate is disabled.",
  },
  killSwitch: {
    armed: true,
    tripped: false,
    runtimeReady: true,
    executionControlState: "active",
    lastEventId: "execution-control-api-1",
    lastActor: "system",
    lastReason: "Default execution-control state for paper simulation only.",
    lastChangedAt: "2026-05-22T09:00:00.000Z",
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
    detail: "Kill switch is armed; execution control is active.",
  },
  actionStatus: {
    checkedAt: "2026-05-22T09:08:00.000Z",
    verdict: "ready",
    latestAction: {
      stage: "broker_fill",
      status: "matched",
      id: "broker-fill-api-1",
      detail: "Broker fill matched paper fill evidence.",
      updatedAt: "2026-05-22T09:08:00.000Z",
    },
    paper: {
      planId: "paper-plan-api-1",
      status: "reconciled",
      reconciliationStatus: "matched",
      fillCount: 1,
      detail: "1 paper orders / 1 fills",
    },
    brokerSnapshot: {
      snapshotId: "broker-snapshot-api-1",
      status: "matched",
      reconciliationStatus: "matched",
      asOf: "2026-05-22T09:07:00.000Z",
      detail: "manual snapshot / matched",
    },
    brokerFill: {
      fillId: "broker-fill-api-1",
      status: "matched",
      reconciliationStatus: "matched",
      paperOrderPlanId: "paper-plan-api-1",
      paperFillId: "paper-order:proposal-api-1:0:fill:0",
      checkedAt: "2026-05-22T09:08:00.000Z",
      detail: "005930 BUY / matched",
    },
    nextSafeAction: "Continue monitoring; live trading remains disabled.",
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
  },
  fundingReadiness: {
    id: "funding-readiness-api-1",
    provider: "manual",
    idempotencyKey: "funding-api-1",
    brokerSnapshotId: "broker-snapshot-api-1",
    accountRefHash: "sha256:broker-account",
    currency: "KRW",
    expectedDepositAmount: 9500000,
    actualBrokerCash: 9500000,
    actualBrokerEquity: 9999850,
    brokerSnapshotAsOf: "2026-05-22T09:07:00.000Z",
    brokerSnapshotReconciliationStatus: "matched",
    cashDiff: 0,
    equityDiff: 499850,
    snapshotAgeMinutes: 1,
    status: "ready",
    checkedAt: "2026-05-22T09:08:00.000Z",
    tolerance: 0.01,
    maxAgeMinutes: 60,
    readinessSnapshot: {
      expectedDepositAmount: 9500000,
      actualBrokerCash: 9500000,
      actualBrokerEquity: 9999850,
      cashDiff: 0,
      equityDiff: 499850,
      tolerance: 0.01,
      maxAgeMinutes: 60,
      ageMinutes: 1,
      brokerSnapshotAsOf: "2026-05-22T09:07:00.000Z",
      brokerSnapshotReconciliationStatus: "matched",
      cashSufficient: true,
      equitySufficient: true,
      currencyMatched: true,
      accountMatched: true,
      snapshotFresh: true,
      brokerExecutionEnabled: false,
      liveTradingEnabled: false,
      blockers: [],
      notes: [
        "Funding readiness is read-only broker evidence. No order endpoint was called.",
      ],
    },
    blockers: [],
    notes: [
      "Funding readiness is read-only broker evidence. No order endpoint was called.",
    ],
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
    createdAt: "2026-05-22T09:08:00.000Z",
    updatedAt: "2026-05-22T09:08:00.000Z",
  },
  livePilotReadiness: {
    id: "live-pilot-readiness-api-1",
    idempotencyKey: "live-pilot-api-1",
    fundingReadinessId: "funding-readiness-api-1",
    currency: "KRW",
    pilotBudgetAmount: 500000,
    maxPilotBudgetAmount: 1000000,
    maxSingleOrderNotional: 100000,
    status: "blocked",
    checkedAt: "2026-05-22T09:09:00.000Z",
    readinessSnapshot: {
      pilotBudgetAmount: 500000,
      maxPilotBudgetAmount: 1000000,
      maxSingleOrderNotional: 100000,
      fundingReadinessId: "funding-readiness-api-1",
      fundingReady: true,
      schemaMigrationReady: false,
      credentialCustodyReady: false,
      brokerSchemaVerified: false,
      brokerSandboxVerified: false,
      brokerReadOnlyReady: false,
      brokerFillPollingReady: false,
      brokerCancelReady: false,
      brokerFlattenReady: false,
      openOrderPollingReady: false,
      orderEndpointImplemented: false,
      brokerWriteEnabled: false,
      productionApprovalCustodyReady: false,
      brokerExecutionEnabled: false,
      liveTradingEnabled: false,
      blockers: [
        "Broker cancel/flatten/open-order emergency controls are not ready",
        "Live order endpoint is not implemented",
      ],
      notes: [
        "Broker-write preflight readiness is evidence only. No broker order endpoint was called.",
      ],
    },
    blockers: [
      "Broker cancel/flatten/open-order emergency controls are not ready",
      "Live order endpoint is not implemented",
    ],
    notes: [
      "Broker-write preflight readiness is evidence only. No broker order endpoint was called.",
    ],
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
    createdAt: "2026-05-22T09:09:00.000Z",
    updatedAt: "2026-05-22T09:09:00.000Z",
  },
  brokerOrderCommand: {
    id: "broker-order-command-api-1",
    provider: "toss",
    commandType: "submit_order_plan",
    status: "blocked",
    mode: "dry_run",
    sourceType: "paper_order_plan",
    proposalId: "proposal-api-1",
    paperOrderPlanId: "paper-plan-api-1",
    orderPlanApprovalId: "approval-api-1",
    livePilotReadinessId: "live-pilot-readiness-api-1",
    idempotencyKey: "broker-command-api-1",
    checkedAt: "2026-05-22T09:10:00.000Z",
    commandHash: "sha256:broker-command-api",
    readinessSnapshot: {
      livePilotReadinessId: "live-pilot-readiness-api-1",
      livePilotStatus: "blocked",
      orderEndpointImplemented: false,
      brokerWriteEnabled: false,
      brokerExecutionEnabled: false,
      liveTradingEnabled: false,
      cancelReady: false,
      flattenReady: false,
      openOrderPollingReady: false,
      blockers: [
        "Live broker order endpoint is not implemented",
        "Broker write access is disabled",
        "Broker order command is dry-run only",
      ],
    },
    orderIntents: [
      {
        brokerOrderIntentId: "broker-intent-api-0",
        symbol: "005930",
        side: "BUY",
        orderType: "MARKET",
        requestedNotional: 140000,
        requestedQuantity: 2,
        requestedPrice: 0,
        proposalOrderIndex: 0,
        status: "blocked",
        blockedReason: "Broker order command is dry-run only",
      },
    ],
    emergencyActions: [],
    blockedReasons: [
      "Live broker order endpoint is not implemented",
      "Broker write access is disabled",
      "Broker order command is dry-run only",
    ],
    notes: ["Broker command captured for dry-run review only."],
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
    createdAt: "2026-05-22T09:10:00.000Z",
    updatedAt: "2026-05-22T09:10:00.000Z",
  },
  brokerOrderStatus: {
    id: "broker-order-status-api-1",
    provider: "manual",
    sourceRef: "manual-order-status-import",
    accountRefHash: "sha256:broker-account",
    brokerOrderRefHash: "sha256:broker-order-open",
    brokerOrderCommandId: "broker-order-command-api-1",
    brokerOrderIntentId: "broker-intent-api-0",
    paperOrderPlanId: "paper-plan-api-1",
    status: "mismatch",
    externalStatus: "open",
    symbol: "005930",
    side: "BUY",
    orderType: "MARKET",
    requestedQuantity: 2,
    filledQuantity: 0,
    remainingQuantity: 2,
    requestedNotional: 140000,
    currency: "KRW",
    submittedAt: "2026-05-22T09:10:00.000Z",
    asOf: "2026-05-22T09:11:00.000Z",
    reconciliation: {
      status: "mismatch",
      checkedAt: "2026-05-22T09:11:00.000Z",
      brokerOrderCommandId: "broker-order-command-api-1",
      brokerOrderIntentId: "broker-intent-api-0",
      paperOrderPlanId: "paper-plan-api-1",
      sourcePaperOrderId: "paper-order-api-1",
      symbolMatched: true,
      sideMatched: true,
      orderTypeMatched: true,
      notionalWithinPlan: true,
      quantityWithinPlan: true,
      commandDryRunOnly: true,
      brokerExternalStatus: "open",
      expectedSymbol: "005930",
      expectedSide: "BUY",
      expectedOrderType: "MARKET",
      expectedNotional: 140000,
      expectedQuantity: 2,
      notionalDiff: 0,
      quantityDiff: 0,
      notes: ["Dry-run command cannot be linked to real broker write."],
    },
    notes: ["Read-only broker order status evidence."],
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
    createdAt: "2026-05-22T09:11:00.000Z",
    updatedAt: "2026-05-22T09:11:00.000Z",
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
    {
      key: "paperAccountReservationLockReady",
      ready: true,
      detail:
        "Paper account reservation readiness, hold creation, and final apply run inside a TypeORM transaction after an optimistic account lock-version claim",
    },
    {
      key: "schemaMigrationPolicyReady",
      ready: false,
      detail:
        "Production schema policy requires TYPEORM_SYNCHRONIZE=false and TYPEORM_MIGRATIONS_RUN=true",
    },
    {
      key: "fundingReadinessLedgerReady",
      ready: true,
      detail: "1 funding readiness records",
    },
    {
      key: "fundingCapitalUsable",
      ready: true,
      detail:
        "Latest funding readiness is ready: expected deposit matches read-only broker cash and equity",
    },
    {
      key: "livePilotReadinessLedgerReady",
      ready: true,
      detail: "1 broker-write preflight readiness records",
    },
    {
      key: "livePilotReady",
      ready: false,
      detail:
        "Latest broker-write preflight readiness is blocked: broker write gates are not ready",
    },
    {
      key: "brokerOrderCommandLedgerReady",
      ready: true,
      detail: "1 broker order command dry-run records",
    },
    {
      key: "brokerOrderStatusLedgerReady",
      ready: true,
      detail: "1 read-only broker order status records imported",
    },
  ],
  blockers: [
    "No production signed order-plan workflow",
    "Production schema migrations are not enforced",
  ],
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
        id: "api-daily-bars",
        source: "manual",
        windowStart: "2025-01-01",
        windowEnd: "2026-05-21",
        availabilityTimestamp: "2026-05-22T08:55:00.000Z",
        marketDataTimestamp: "2026-05-22T08:55:00.000Z",
        universe: ["005930", "KOSPI200"],
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
    researchDatasetId: "api-daily-bars",
    researchSymbol: "005930",
    researchBenchmark: "KOSPI200",
    researchMaxDataAgeMinutes: 1440,
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
    orderPlanApprovalId: "approval-api-1",
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
      approvalCustodyVerified: true,
      accountEventFresh: true,
      approvalPaperAccountEventHash: "sha256:account-event-api",
      currentPaperAccountEventHash: "sha256:account-event-api",
      paperAccountEventSequence: 2,
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
  emergencyControls: {
    runtimeKillSwitchReady: true,
    brokerCancelReady: false,
    brokerFlattenReady: false,
    openOrderPollingReady: false,
    brokerWriteEnabled: false,
    dryRunOnly: true,
    checkedAt: "2026-05-22T09:00:00.000Z",
    blockers: [
      "Broker write access is disabled.",
      "Broker open-order polling is not implemented.",
      "Broker cancel/replace endpoint is not implemented.",
      "Broker flatten-position order path is not implemented.",
      "Emergency broker action reconciliation is not implemented.",
    ],
    detail:
      "Runtime stop can halt autonomous advancement, but broker-order cancel/flatten emergency controls are not implemented.",
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
    approvalSource: "paper_auto",
    approvedByRunId: "run-api-1",
    approvedByScheduleId: "schedule-api-1",
    autoApprovalPolicyRef: "sha256:auto-policy-api",
    approver: "system:paper-auto-approval",
    reason:
      "Standing schedule authorization for paper-only autonomous execution. Broker and live trading remain disabled.",
    status: "consumed",
    proposalHash: "sha256:proposal-api",
    riskRequestHash: "sha256:risk-api",
    paperAccountId: "paper-account-api-1",
    paperAccountEventHash: "sha256:event-promote-api",
    paperAccountEventSequence: 2,
    custodyMode: "local_hash_signature",
    signerKeyRef: "local-paper-approval-key-v1",
    canonicalPayloadHash: "sha256:canonical-api",
    signature: "local-sha256:signature-api",
    approvalHash: "sha256:approval-api",
    approvalSnapshot: {
      proposalId: 1,
      riskEvaluationId: 1,
      mode: "paper",
      approvalSource: "paper_auto",
      approvedByRunId: "run-api-1",
      approvedByScheduleId: "schedule-api-1",
      autoApprovalPolicyRef: "sha256:auto-policy-api",
      approver: "system:paper-auto-approval",
      reason:
        "Standing schedule authorization for paper-only autonomous execution. Broker and live trading remain disabled.",
      idempotencyKey: "paper-api-1",
      approvedOrderCount: 1,
      approvedAt: "2026-05-22T09:03:00.000Z",
      proposalHash: "sha256:proposal-api",
      riskRequestHash: "sha256:risk-api",
      paperAccountId: 1,
      paperAccountEventHash: "sha256:event-promote-api",
      paperAccountEventSequence: 2,
      custodyMode: "local_hash_signature",
      signerKeyRef: "local-paper-approval-key-v1",
      canonicalPayloadHash: "sha256:canonical-api",
      signature: "local-sha256:signature-api",
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

const mockMarketDataIngestionStatus = {
  enabled: false,
  provider: "stooq",
  datasetId: "scheduled-daily-bars",
  symbols: ["005930"],
  benchmark: "KOSPI200",
  timeframe: "1d",
  currency: "KRW",
  lookbackDays: 30,
  cron: "*/30 * * * *",
  running: false,
  lastRunId: "market-data-ingestion-api-1",
  brokerExecutionEnabled: false,
  liveTradingEnabled: false,
};

const mockMarketDataIngestionRuns = [
  {
    id: "market-data-ingestion-api-1",
    trigger: "manual",
    status: "skipped",
    provider: "stooq",
    datasetId: "scheduled-daily-bars",
    symbols: ["005930", "KOSPI200"],
    timeframe: "1d",
    currency: "KRW",
    windowStart: "2026-04-23T00:00:00.000Z",
    windowEnd: "2026-05-23T00:00:00.000Z",
    requestHash: "sha256:market-data-ingestion-api",
    imported: 0,
    replaced: 0,
    importedSymbols: [],
    failedSymbols: [],
    blockedReasons: ["Market data ingestion is disabled"],
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
    createdAt: "2026-05-23T00:00:00.000Z",
    updatedAt: "2026-05-23T00:00:00.000Z",
  },
];

const mockActionTimeline = [
  {
    id: "broker_fill:broker-fill-api-1",
    at: "2026-05-22T09:08:00.000Z",
    severity: "ready",
    category: "broker",
    sourceType: "broker_fill",
    sourceId: "broker-fill-api-1",
    title: "Broker fill matched",
    detail: "Broker fill matched paper fill evidence.",
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
  },
  {
    id: "risk_evaluation:risk-api-1",
    at: "2026-05-22T09:02:00.000Z",
    severity: "ready",
    category: "risk",
    sourceType: "risk_evaluation",
    sourceId: "risk-api-1",
    title: "Risk ALLOW",
    detail: "API paper proposal is inside policy limits.",
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
  },
];

describe("ControlPlaneDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
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
    vi.mocked(controlPlaneApi.getFundingReadinessRecords).mockResolvedValue([
      mockControlPlaneStatus.fundingReadiness,
    ]);
    vi.mocked(controlPlaneApi.getLivePilotReadinessRecords).mockResolvedValue([
      mockControlPlaneStatus.livePilotReadiness,
    ]);
    vi.mocked(controlPlaneApi.getBrokerOrderCommands).mockResolvedValue([
      mockControlPlaneStatus.brokerOrderCommand,
    ]);
    vi.mocked(controlPlaneApi.getBrokerOrderStatuses).mockResolvedValue([
      mockControlPlaneStatus.brokerOrderStatus,
    ]);
    vi.mocked(controlPlaneApi.getBrokerFills).mockResolvedValue(
      mockBrokerFills,
    );
    vi.mocked(controlPlaneApi.getBrokerAdapterStatus).mockResolvedValue(
      mockBrokerAdapterStatus,
    );
    vi.mocked(controlPlaneApi.getOrderPlanApprovals).mockResolvedValue(
      mockOrderPlanApprovals,
    );
    vi.mocked(controlPlaneApi.getMarketDataIngestionStatus).mockResolvedValue(
      mockMarketDataIngestionStatus,
    );
    vi.mocked(controlPlaneApi.getMarketDataIngestionRuns).mockResolvedValue(
      mockMarketDataIngestionRuns,
    );
    vi.mocked(controlPlaneApi.getActionTimeline).mockResolvedValue(
      mockActionTimeline,
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
    vi.mocked(controlPlaneApi.tripKillSwitch).mockResolvedValue({
      ...mockControlPlaneStatus.killSwitch,
      tripped: true,
      executionControlState: "halted",
      lastActor: "dashboard-operator",
      lastReason: "Kill switch trip: Dashboard emergency stop",
    });
  });

  it("should_render_read_only_control_plane_status", async () => {
    render(<ControlPlaneDashboard />);

    expect(
      screen.getByRole("heading", { name: "Control Plane Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No live trading")).toBeInTheDocument();
    expect(screen.getByText("Broker execution")).toBeInTheDocument();
    expect(screen.getByText("Live gate")).toBeInTheDocument();
    expect(screen.getAllByText("disabled").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("false").length).toBeGreaterThanOrEqual(1);

    await waitFor(() => {
      expect(screen.getByText("Live API status")).toBeInTheDocument();
    });
    const actionStatus = within(
      screen.getByRole("region", { name: "Action Status" }),
    );
    expect(actionStatus.getByText("Latest system action")).toBeInTheDocument();
    expect(actionStatus.getByText("Kill switch")).toBeInTheDocument();
    expect(actionStatus.getByText("armed")).toBeInTheDocument();
    expect(
      actionStatus.getByRole("button", { name: "Emergency stop" }),
    ).toBeInTheDocument();
    expect(actionStatus.getByText("broker_fill / matched")).toBeInTheDocument();
    expect(
      actionStatus.getByText("Broker fill matched paper fill evidence."),
    ).toBeInTheDocument();
    expect(actionStatus.getByText("Paper evidence")).toBeInTheDocument();
    expect(
      actionStatus.getByText("plan paper-plan-api-1 / matched"),
    ).toBeInTheDocument();
    expect(actionStatus.getByText("Approval evidence")).toBeInTheDocument();
    expect(actionStatus.getByText("paper_auto")).toBeInTheDocument();
    expect(
      actionStatus.getByText("approval approval-api-1 / consumed"),
    ).toBeInTheDocument();
    expect(actionStatus.getByText("Broker truth")).toBeInTheDocument();
    expect(
      actionStatus.getByText("snapshot broker-snapshot-api-1 / matched"),
    ).toBeInTheDocument();
    expect(actionStatus.getByText("Broker fill")).toBeInTheDocument();
    expect(
      actionStatus.getByText("fill broker-fill-api-1 / matched"),
    ).toBeInTheDocument();
    expect(actionStatus.getByText("Current blocker")).toBeInTheDocument();
    expect(
      actionStatus.getByText("No immediate action blocker detected"),
    ).toBeInTheDocument();
    expect(actionStatus.getByText("Next safe action")).toBeInTheDocument();
    expect(
      actionStatus.getByText(
        "Continue monitoring; live trading remains disabled.",
      ),
    ).toBeInTheDocument();
    expect(
      actionStatus.queryByRole("button", { name: "Paper execute" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Autonomous Action Chain")).toBeInTheDocument();
    expect(screen.getByText("Live budgets")).toBeInTheDocument();
    expect(screen.getByText("Live proposals")).toBeInTheDocument();
    expect(screen.getByText("Live risk evaluations")).toBeInTheDocument();
    expect(screen.getByText("Automation Action Ledger")).toBeInTheDocument();
    expect(screen.getByText("Action Audit Timeline")).toBeInTheDocument();
    expect(screen.getByText("Live action timeline")).toBeInTheDocument();
    expect(screen.getByText("Broker fill matched")).toBeInTheDocument();
    expect(screen.getByText("Current Cycle Evidence")).toBeInTheDocument();
    expect(screen.getByText("Research Data")).toBeInTheDocument();
    expect(screen.getByText("Decision Chain")).toBeInTheDocument();
    expect(screen.getByText("Paper Result")).toBeInTheDocument();
    expect(screen.getByText("Market ingestion")).toBeInTheDocument();
    expect(screen.getByText("stooq / 1d")).toBeInTheDocument();
    expect(screen.getByText("Live autonomous runs")).toBeInTheDocument();
    expect(screen.getByText("Live run schedules")).toBeInTheDocument();
    expect(screen.getByText("Live schedule worker")).toBeInTheDocument();
    expect(screen.getByText("Worker Idle")).toBeInTheDocument();
    expect(screen.getByText("test-worker")).toBeInTheDocument();
    expect(screen.getAllByText("schedule-api-1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("api-daily-bars").length).toBeGreaterThan(0);
    expect(screen.getAllByText("fresh").length).toBeGreaterThan(0);
    expect(screen.getAllByText("paper_auto / consumed").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getAllByText("sha256:auto-policy-api").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("KOSPI200").length).toBeGreaterThan(0);
    expect(screen.getByText("1440m")).toBeInTheDocument();
    expect(screen.getAllByText("run-api-1").length).toBeGreaterThan(0);
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
    expect(screen.getByText("schemaMigrationPolicyReady")).toBeInTheDocument();
    expect(screen.getByText("fundingCapitalUsable")).toBeInTheDocument();
    expect(screen.getByText("livePilotReady")).toBeInTheDocument();
    expect(
      screen.getAllByText("Production schema migrations are not enforced")
        .length,
    ).toBeGreaterThanOrEqual(1);
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
    expect(screen.getAllByText("paper-plan-api-1").length).toBeGreaterThan(0);
    expect(screen.getByText("Proposal proposal-api-1")).toBeInTheDocument();
    expect(
      screen.getByText(
        (_, element) => element?.textContent === "Approval: approval-api-1",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("paper auto approval")).toBeInTheDocument();
    expect(
      screen.getAllByText("sha256:auto-policy-api").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Paper fills")).toBeInTheDocument();
    expect(screen.getByText("Reconciliation")).toBeInTheDocument();
    expect(screen.getByText("Plan hash: sha256:plan-api")).toBeInTheDocument();
    expect(screen.getByText("Expected cash")).toBeInTheDocument();
    expect(
      screen.getByText("Paper cash ledger matched simulated fills."),
    ).toBeInTheDocument();
    expect(screen.getByText("Broker Snapshot Monitor")).toBeInTheDocument();
    expect(screen.getByText("API broker snapshots")).toBeInTheDocument();
    expect(screen.getByText("Funding Readiness")).toBeInTheDocument();
    expect(screen.getByText("API funding readiness")).toBeInTheDocument();
    expect(screen.getByText("Expected deposit")).toBeInTheDocument();
    expect(screen.getByText("Broker cash")).toBeInTheDocument();
    expect(
      screen.getByText("expected deposit matches read-only broker truth"),
    ).toBeInTheDocument();
    expect(screen.getByText("Broker Write Readiness")).toBeInTheDocument();
    expect(
      screen.getByText("API broker-write preflight readiness"),
    ).toBeInTheDocument();
    expect(screen.getByText("Broker write blockers")).toBeInTheDocument();
    expect(
      screen.getAllByText("Live order endpoint is not implemented").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Broker Order Command Ledger")).toBeInTheDocument();
    expect(screen.getByText("API broker order commands")).toBeInTheDocument();
    expect(screen.getByText("submit_order_plan")).toBeInTheDocument();
    expect(screen.getByText("hash")).toBeInTheDocument();
    expect(screen.getByText("sha256:broker-command-api")).toBeInTheDocument();
    expect(screen.getAllByText("005930 BUY MARKET").length).toBeGreaterThan(0);
    expect(screen.getByText("Command blockers")).toBeInTheDocument();
    expect(screen.getByText("Broker Order Lifecycle")).toBeInTheDocument();
    expect(screen.getByText("API broker order statuses")).toBeInTheDocument();
    expect(
      screen.getAllByText("sha256:broker-order-open").length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Dry-run command mismatch")).toBeInTheDocument();
    expect(
      screen.getAllByText("Live broker order endpoint is not implemented")
        .length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("API broker adapter status")).toBeInTheDocument();
    expect(
      screen.getByText("toss / oauth2_client_credentials"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Read-only polling").length).toBeGreaterThan(0);
    expect(screen.getByText("Emergency controls")).toBeInTheDocument();
    expect(screen.getByText("runtime stop")).toBeInTheDocument();
    expect(screen.getByText("cancel orders")).toBeInTheDocument();
    expect(screen.getByText("flatten positions")).toBeInTheDocument();
    expect(screen.getAllByText("Fill polling").length).toBeGreaterThan(0);
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
    expect(screen.getByText("Paper Order Approval")).toBeInTheDocument();
    expect(screen.getByText("Live signed approvals")).toBeInTheDocument();
    expect(
      screen.getAllByText("approval approval-api-1").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        "Standing schedule authorization for paper-only autonomous execution. Broker and live trading remain disabled.",
      ).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Broker execution: false").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.queryByRole("button", {
        name: /paper execute|reconcile|pause|halt/i,
      }),
    ).not.toBeInTheDocument();
  }, 20_000);

  it("should_default_to_english_and_toggle_dashboard_copy_to_korean", async () => {
    render(<ControlPlaneDashboard />);

    expect(
      screen.getByRole("heading", { name: "Control Plane Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Dashboard language")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await waitFor(() => {
      expect(screen.getByText("Live API status")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "한국어" }));

    expect(
      screen.getByRole("heading", { name: "컨트롤 플레인 대시보드" }),
    ).toBeInTheDocument();
    expect(screen.getByText("실거래 차단")).toBeInTheDocument();
    expect(screen.getByText("대시보드 언어")).toBeInTheDocument();
    expect(
      screen.getAllByText("운영 스키마 마이그레이션이 강제되지 않았습니다.")
        .length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByRole("region", { name: "행동 상태" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "행동 감사 타임라인" }),
    ).toBeInTheDocument();
    expect(screen.getByText("자금 준비 상태")).toBeInTheDocument();
    expect(screen.getByText("API 자금 준비")).toBeInTheDocument();
    expect(screen.getByText("브로커 쓰기 준비 상태")).toBeInTheDocument();
    expect(screen.getByText("API 브로커 쓰기 사전 점검")).toBeInTheDocument();
    expect(screen.getByText("브로커 주문 명령 원장")).toBeInTheDocument();
    expect(screen.getByText("API 브로커 주문 명령")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "한국어" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "English" }));

    expect(
      screen.getByRole("heading", { name: "Control Plane Dashboard" }),
    ).toBeInTheDocument();
  });

  it("should_trip_the_runtime_kill_switch_from_the_action_panel", async () => {
    render(<ControlPlaneDashboard />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Emergency stop" }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Emergency stop" }));

    await waitFor(() => {
      expect(controlPlaneApi.tripKillSwitch).toHaveBeenCalledWith({
        actor: "dashboard-operator",
        reason: "Dashboard emergency stop",
      });
    });
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
    vi.mocked(controlPlaneApi.getBrokerOrderCommands).mockRejectedValue(
      new Error("offline"),
    );
    vi.mocked(controlPlaneApi.getBrokerOrderStatuses).mockRejectedValue(
      new Error("offline"),
    );
    vi.mocked(controlPlaneApi.getBrokerAdapterStatus).mockRejectedValue(
      new Error("offline"),
    );
    vi.mocked(controlPlaneApi.getOrderPlanApprovals).mockRejectedValue(
      new Error("offline"),
    );
    vi.mocked(controlPlaneApi.getActionTimeline).mockRejectedValue(
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
    expect(screen.getAllByText("paper-docs-plan-001").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("Documented broker sample")).toBeInTheDocument();
    expect(screen.getByText("broker-snapshot-docs-001")).toBeInTheDocument();
    expect(screen.getByText("Documented audit sample")).toBeInTheDocument();
    expect(screen.getByText("Broker snapshot matched")).toBeInTheDocument();
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
