import React, { useEffect, useState } from "react";
import { controlPlaneApi, riskGateApi } from "../services/api";
import {
  ControlPlaneStatus,
  ControlPlaneGateStatus,
  ControlPlaneStage,
  ExecutionControlState,
  PaperAccount,
  PaperLedgerChange,
  PaperOrderPlan,
  ResearchRun,
  RunBaselineResearchRequest,
  RiskGateRequest,
  RiskGateResponse,
  RiskGateStatus,
  RiskPolicy,
  SafetyGate,
} from "../types";

const DEFAULT_POLICY: RiskPolicy = {
  maxGrossExposurePct: 100,
  maxSinglePositionPct: 20,
  maxOrderNotional: 1_000_000,
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
};

const DOCUMENTED_STATUS: RiskGateStatus = {
  brokerExecutionEnabled: false,
  liveTradingEnabled: false,
  defaultPolicy: DEFAULT_POLICY,
};

const DOCUMENTED_CONTROL_PLANE_STATUS: ControlPlaneStatus = {
  brokerExecutionEnabled: false,
  liveTradingReady: false,
  readiness: [
    {
      key: "budgetEnvelopeActive",
      ready: false,
      detail: "No active budget envelope",
    },
    {
      key: "proposalLedgerReady",
      ready: false,
      detail: "No proposal records yet",
    },
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
        "Paper simulator ledger exists; broker-grade paper readiness is blocked by missing signed order plans and broker reconciliation",
    },
    {
      key: "paperSimulationLedgerReady",
      ready: true,
      detail:
        "Deterministic paper order-plan, fill, and reconciliation ledger is registered",
    },
    {
      key: "paperAccountReady",
      ready: false,
      detail: "No durable paper account records yet",
    },
    {
      key: "executionControlReady",
      ready: true,
      detail: "Execution control state defaults to ARMED",
    },
    {
      key: "liveTradingReady",
      ready: false,
      detail: "Live trading is blocked",
    },
  ],
  blockers: [
    "No broker read-only adapter",
    "No signed order-plan workflow",
    "No broker reconciliation loop",
    "No production kill switch runtime",
  ],
};

const DOCUMENTED_RESEARCH_RUNS: ResearchRun[] = [
  {
    id: "rr-docs-momentum-001",
    budgetEnvelopeId: "budget-docs-dry-run",
    objective: "Validate a dry-run momentum baseline before any proposal",
    strategyFamily: "cross-sectional momentum",
    hypothesis:
      "Liquid domestic equities with stronger 60-day risk-adjusted returns outperform the benchmark after simple cost assumptions.",
    status: "proposal_ready",
    phase: "artifacts_persisted",
    advanceEligible: true,
    datasetRefs: [
      {
        id: "krx-daily-bars",
        source: "documented-sample",
        windowStart: "2024-01-01",
        windowEnd: "2026-05-21",
        availabilityTimestamp: "2026-05-21T23:50:00.000Z",
      },
      {
        id: "krx-corporate-actions",
        source: "documented-sample",
        windowStart: "2024-01-01",
        windowEnd: "2026-05-21",
        availabilityTimestamp: "2026-05-21T23:50:00.000Z",
      },
    ],
    featureRefs: ["return_60d", "volatility_20d", "turnover_rank"],
    benchmark: "KOSPI 200 total return proxy",
    costModel: "10 bps per side plus exchange fees",
    slippageModel: "5 bps spread haircut on entries and exits",
    modelName: "deterministic-ranking-baseline",
    validationWindow: {
      start: "2025-05-22",
      end: "2026-05-21",
    },
    backtestMetrics: {
      totalReturnPct: 11.8,
      benchmarkReturnPct: 7.2,
      maxDrawdownPct: 8.9,
      sharpeRatio: 1.14,
      turnoverPct: 138,
      tradeCount: 42,
    },
    artifactRefs: ["s3://research-runs/docs/momentum-001/report.json"],
    artifactHashes: {
      "s3://research-runs/docs/momentum-001/report.json": "sha256:sample",
    },
    knownFailureModes: [
      "Momentum reversal during high-volatility regimes",
      "Capacity constraints in lower-liquidity names",
    ],
    createdAt: "2026-05-22T08:30:00.000Z",
    updatedAt: "2026-05-22T08:42:00.000Z",
  },
  {
    id: "rr-docs-defensive-002",
    objective: "Compare defensive ranking against benchmark drawdown",
    strategyFamily: "quality and low-volatility ranking",
    hypothesis:
      "A quality-weighted low-volatility basket can reduce drawdown without broker execution.",
    status: "proposal_ready",
    phase: "artifacts_persisted",
    advanceEligible: true,
    datasetRefs: [
      {
        id: "krx-daily-bars",
        source: "documented-sample",
        windowStart: "2023-01-01",
        windowEnd: "2026-05-21",
        availabilityTimestamp: "2026-05-21T23:50:00.000Z",
      },
    ],
    featureRefs: ["volatility_60d", "drawdown_120d", "quality_score_proxy"],
    benchmark: "KOSPI total return proxy",
    costModel: "15 bps round-trip transaction cost",
    slippageModel: "Fixed 7 bps execution haircut",
    validationWindow: "2025-01-01..2026-05-21",
    backtestMetrics: {
      totalReturnPct: 6.4,
      benchmarkReturnPct: 5.9,
      maxDrawdownPct: 5.1,
      sharpeRatio: 0.86,
      turnoverPct: 64,
      tradeCount: 24,
    },
    artifactRefs: ["s3://research-runs/docs/defensive-002/metrics.json"],
    artifactHashes: {
      "s3://research-runs/docs/defensive-002/metrics.json": "sha256:sample",
    },
    knownFailureModes: [
      "Underperforms in sharp growth-led rallies",
      "Accounting proxy can stale without refreshed fundamentals",
    ],
    createdAt: "2026-05-21T07:15:00.000Z",
    updatedAt: "2026-05-21T07:24:00.000Z",
  },
];

const DOCUMENTED_PAPER_ORDER_PLANS: PaperOrderPlan[] = [
  {
    id: "paper-docs-plan-001",
    proposalId: "proposal-docs-momentum-001",
    researchRunId: "rr-docs-momentum-001",
    budgetEnvelopeId: "budget-docs-dry-run",
    riskEvaluationId: "risk-docs-001",
    proposalHash: "sha256:docs-proposal",
    riskRequestHash: "sha256:docs-risk",
    planHash: "sha256:docs-plan",
    idempotencyKey: "docs-paper-plan-001",
    status: "reconciled",
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
      killSwitchArmed: true,
      killSwitchTripped: false,
      cashSufficient: true,
      positionsSufficient: true,
      noDuplicatePlan: true,
    },
    orders: [
      {
        paperOrderId: "paper-order:docs:0",
        proposalOrderIndex: 0,
        symbol: "005930",
        side: "BUY",
        orderType: "MARKET",
        requestedNotional: 500_000,
        targetPositionPct: 5,
        marketDataTimestamp: "2026-05-22T09:00:00.000Z",
        feeModelRef: "fixed-10bps-paper-fee-v1",
        slippageModelRef: "fixed-5bps-paper-slippage-v1",
        sourceOrder: {
          symbol: "005930",
          assetClass: "domestic_stock",
          side: "BUY",
          orderType: "MARKET",
          notional: 500_000,
          targetPositionPct: 5,
        },
      },
      {
        paperOrderId: "paper-order:docs:1",
        proposalOrderIndex: 1,
        symbol: "000660",
        side: "BUY",
        orderType: "MARKET",
        requestedNotional: 350_000,
        targetPositionPct: 3.5,
        marketDataTimestamp: "2026-05-22T09:00:00.000Z",
        feeModelRef: "fixed-10bps-paper-fee-v1",
        slippageModelRef: "fixed-5bps-paper-slippage-v1",
        sourceOrder: {
          symbol: "000660",
          assetClass: "domestic_stock",
          side: "BUY",
          orderType: "MARKET",
          notional: 350_000,
          targetPositionPct: 3.5,
        },
      },
    ],
    fills: [
      {
        paperFillId: "paper-order:docs:0:fill:0",
        paperOrderId: "paper-order:docs:0",
        timestamp: "2026-05-22T09:05:00.000Z",
        symbol: "005930",
        side: "BUY",
        quantity: 6.80027211,
        fillPrice: 73_500,
        grossNotional: 499_850,
        requestedNotional: 500_000,
        filledNotional: 499_850,
        fee: 500,
        feeCurrency: "KRW",
        slippage: 150,
        netCashDelta: -500_500,
        positionDelta: 6.80027211,
        status: "filled",
      },
      {
        paperFillId: "paper-order:docs:1:fill:0",
        paperOrderId: "paper-order:docs:1",
        timestamp: "2026-05-22T09:05:00.000Z",
        symbol: "000660",
        side: "BUY",
        quantity: 1.92153846,
        fillPrice: 182_000,
        grossNotional: 349_720,
        requestedNotional: 350_000,
        filledNotional: 349_720,
        fee: 350,
        feeCurrency: "KRW",
        slippage: 280,
        netCashDelta: -350_350,
        positionDelta: 1.92153846,
        status: "filled",
      },
    ],
    portfolioBefore: {
      currency: "KRW",
      equity: 10_000_000,
      cash: 10_000_000,
      grossExposurePct: 0,
    },
    portfolioAfter: {
      currency: "KRW",
      equity: 9_999_580,
      cash: 9_149_580,
      grossExposurePct: 8.5,
    },
    cashLedger: [
      {
        paperCashEventId: "paper-order:docs:0:fill:0:cash",
        paperFillId: "paper-order:docs:0:fill:0",
        timestamp: "2026-05-22T09:05:00.000Z",
        currency: "KRW",
        amount: -500_500,
        balanceAfter: 9_499_500,
        reason: "BUY paper fill net cash delta",
      },
      {
        paperCashEventId: "paper-order:docs:1:fill:0:cash",
        paperFillId: "paper-order:docs:1:fill:0",
        timestamp: "2026-05-22T09:05:00.000Z",
        currency: "KRW",
        amount: -350_350,
        balanceAfter: 9_149_580,
        reason: "BUY paper fill net cash delta",
      },
    ],
    positionLedger: [
      {
        paperPositionEventId: "paper-order:docs:0:fill:0:position",
        paperFillId: "paper-order:docs:0:fill:0",
        timestamp: "2026-05-22T09:05:00.000Z",
        symbol: "005930",
        quantityDelta: 6.80027211,
        notionalDelta: 499_850,
        positionNotionalAfter: 499_850,
      },
      {
        paperPositionEventId: "paper-order:docs:1:fill:0:position",
        paperFillId: "paper-order:docs:1:fill:0",
        timestamp: "2026-05-22T09:05:00.000Z",
        symbol: "000660",
        quantityDelta: 1.92153846,
        notionalDelta: 349_720,
        positionNotionalAfter: 349_720,
      },
    ],
    startingCash: 10_000_000,
    endingCash: 9_149_580,
    startingEquity: 10_000_000,
    endingEquity: 9_999_580,
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
    reconciliation: {
      status: "matched",
      reconciledAt: "2026-05-22T09:06:00.000Z",
      cashMatched: true,
      positionsMatched: true,
      expectedCash: 9_149_580,
      actualCash: 9_149_580,
      cashDiff: 0,
      expectedPositions: {
        "005930": 499_850,
        "000660": 349_720,
      },
      actualPositions: {
        "005930": 499_850,
        "000660": 349_720,
      },
      positionDiffs: {
        "005930": 0,
        "000660": 0,
      },
      tolerance: 0.01,
      notes: [
        "Paper cash ledger matched simulated fills.",
        "No broker account or live order path was contacted.",
      ],
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

const DOCUMENTED_EXECUTION_CONTROL: ExecutionControlState = {
  id: "execution-control-docs-active",
  state: "active",
  actor: "system",
  reason: "Documented paper simulation state. No broker order path is enabled.",
  createdAt: "2026-05-22T09:00:00.000Z",
};

const BASELINE_RESEARCH_REQUEST: RunBaselineResearchRequest = {
  objective: "Run deterministic dry-run momentum baseline backtest",
  strategyFamily: "cross-sectional momentum",
  symbol: "005930",
  benchmark: "KOSPI 200 total return proxy",
  initialCapital: 10_000_000,
};

const EXAMPLE_REQUEST: RiskGateRequest = {
  mode: "dry_run",
  actor: "strategy",
  strategyId: "momentum-v1",
  ruleId: "long-only-breakout",
  generatedAt: "2026-05-22T11:59:00.000Z",
  marketDataTimestamp: "2026-05-22T11:55:00.000Z",
  executionIntent: "evaluate_only",
  portfolio: {
    currency: "KRW",
    equity: 10_000_000,
    cash: 10_000_000,
    grossExposurePct: 0,
  },
  orders: [
    {
      symbol: "005930",
      assetClass: "domestic_stock",
      side: "BUY",
      orderType: "MARKET",
      notional: 500_000,
      targetPositionPct: 5,
    },
  ],
};

const EXAMPLE_EVALUATION: RiskGateResponse = {
  decision: "ALLOW",
  evaluatedAt: "2026-05-22T12:00:00.000Z",
  mode: "dry_run",
  brokerExecutionEnabled: false,
  requiresHumanApproval: false,
  reasons: [],
  policy: DEFAULT_POLICY,
  approvedOrderCount: 1,
};

const SAFETY_GATES: SafetyGate[] = [
  {
    name: "Research reports",
    status: "partial",
    notes:
      "Existing reports summarize market context; they are not trade proposals.",
  },
  {
    name: "Proposal contract",
    status: "started",
    notes:
      "Budget envelopes, proposal records, risk evaluations, research-run provenance, and autonomous run ledgers are implemented.",
  },
  {
    name: "Deterministic risk gate",
    status: "started",
    notes:
      "Evaluation-only API checks policy limits without LLM or broker calls.",
  },
  {
    name: "Paper execution",
    status: "partial",
    notes:
      "Paper simulator ledger, durable paper account, fills, and plan-scoped reconciliation exist; signed plans and broker reconciliation are still missing.",
  },
  {
    name: "Broker read-only",
    status: "missing",
    notes: "No Toss or broker account snapshot adapter is wired into the app.",
  },
  {
    name: "Broker write access",
    status: "blocked",
    notes:
      "Requires separate gated design, credentials isolation, and approvals.",
  },
  {
    name: "Live trading",
    status: "blocked",
    notes: "No real-money order path is implemented in this repository.",
  },
];

const CONTROL_PLANE_STAGES: ControlPlaneStage[] = [
  {
    phase: "Phase 0",
    title: "Safe control-plane start",
    status: "started",
    description:
      "Spec, reference policy, backend risk gate, and deterministic denial/review tests.",
  },
  {
    phase: "Phase 1",
    title: "Proposal contracts",
    status: "started",
    description:
      "Budget envelopes, proposal entities, risk evaluations, run ledgers, and audit snapshots.",
  },
  {
    phase: "Phase 2",
    title: "Research automation",
    status: "started",
    description:
      "Reproducible research runs with backtests, costs, turnover, drawdown, and benchmarks.",
  },
  {
    phase: "Phase 3",
    title: "Paper execution",
    status: "started",
    description:
      "Paper order plans, simulator fills, durable paper account state, plan-scoped reconciliation, and execution control gates.",
  },
  {
    phase: "Phase 4",
    title: "Broker read-only",
    status: "missing",
    description:
      "Broker snapshots for holdings and cash without any callable order endpoint.",
  },
  {
    phase: "Phase 5",
    title: "Tiny live pilot",
    status: "blocked",
    description:
      "Separate design review, tiny budget cap, explicit approval, and immediate kill switch.",
  },
];

const STATUS_LABELS: Record<ControlPlaneGateStatus, string> = {
  partial: "Partial",
  started: "Started",
  missing: "Missing",
  blocked: "Blocked",
};

const STATUS_CLASSES: Record<ControlPlaneGateStatus, string> = {
  partial: "border-[#2b3139] bg-[#1e2329] text-[#eaecef]",
  started: "border-[#0ecb81]/30 bg-[#0ecb81]/10 text-[#0ecb81]",
  missing: "border-[#f0b90b]/30 bg-[#f0b90b]/10 text-[#fcd535]",
  blocked: "border-[#f6465d]/30 bg-[#f6465d]/10 text-[#f6465d]",
};

const decisionClasses: Record<RiskGateResponse["decision"], string> = {
  ALLOW: "border-[#0ecb81]/30 bg-[#0ecb81]/10 text-[#0ecb81]",
  REVIEW: "border-[#f0b90b]/30 bg-[#f0b90b]/10 text-[#fcd535]",
  DENY: "border-[#f6465d]/30 bg-[#f6465d]/10 text-[#f6465d]",
};

const formatCurrency = (value: number, currency = "KRW") =>
  new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);

const formatSignedCurrency = (value: number, currency = "KRW") =>
  `${value > 0 ? "+" : ""}${formatCurrency(value, currency)}`;

const formatPercent = (value: number) =>
  `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(value)}%`;

const formatSignedPercent = (value: number) =>
  `${value > 0 ? "+" : ""}${formatPercent(value)}`;

const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

const formatWindow = (windowValue: ResearchRun["validationWindow"]) =>
  typeof windowValue === "string"
    ? windowValue
    : `${windowValue.start} to ${windowValue.end}`;

const formatDatasetRef = (datasetRef: ResearchRun["datasetRefs"][number]) =>
  `${datasetRef.id}:${datasetRef.windowStart}..${datasetRef.windowEnd}`;

const formatBoolean = (value: boolean) => (value ? "true" : "false");

const statusBadge = (status: ControlPlaneGateStatus) =>
  `${STATUS_CLASSES[status]} inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-bold uppercase`;

const researchRunStatusClass = (status: string) => {
  const normalizedStatus = status.toLowerCase();

  if (
    [
      "completed",
      "passed",
      "ready",
      "proposal_ready",
      "evidence_ready",
    ].includes(normalizedStatus)
  ) {
    return STATUS_CLASSES.started;
  }

  if (
    ["failed", "blocked", "rejected", "halted", "cancelled"].includes(
      normalizedStatus,
    )
  ) {
    return STATUS_CLASSES.blocked;
  }

  return STATUS_CLASSES.partial;
};

const paperOrderPlanStatusClass = (status: string) => {
  const normalizedStatus = status.toLowerCase();

  if (
    ["completed", "filled", "reconciled", "settled"].includes(normalizedStatus)
  ) {
    return STATUS_CLASSES.started;
  }

  if (
    ["blocked", "failed", "rejected", "cancelled", "halted"].includes(
      normalizedStatus,
    )
  ) {
    return STATUS_CLASSES.blocked;
  }

  return STATUS_CLASSES.partial;
};

const ControlPlaneDashboard: React.FC = () => {
  const [riskGateStatus, setRiskGateStatus] = useState<RiskGateStatus | null>(
    null,
  );
  const [controlPlaneStatus, setControlPlaneStatus] =
    useState<ControlPlaneStatus | null>(null);
  const [researchRuns, setResearchRuns] = useState<ResearchRun[] | null>(null);
  const [paperAccount, setPaperAccount] = useState<PaperAccount | null>(null);
  const [executionControl, setExecutionControl] =
    useState<ExecutionControlState | null>(null);
  const [paperOrderPlans, setPaperOrderPlans] = useState<
    PaperOrderPlan[] | null
  >(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingResearchRuns, setLoadingResearchRuns] = useState(true);
  const [loadingPaperAccount, setLoadingPaperAccount] = useState(true);
  const [loadingPaperOrderPlans, setLoadingPaperOrderPlans] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [researchRunsError, setResearchRunsError] = useState<string | null>(
    null,
  );
  const [paperOrderPlansError, setPaperOrderPlansError] = useState<
    string | null
  >(null);
  const [paperAccountError, setPaperAccountError] = useState<string | null>(
    null,
  );
  const [runningBaselineResearch, setRunningBaselineResearch] = useState(false);
  const [baselineResearchError, setBaselineResearchError] = useState<
    string | null
  >(null);
  const [baselineResearchSuccess, setBaselineResearchSuccess] = useState<
    string | null
  >(null);

  useEffect(() => {
    let ignore = false;

    const fetchStatus = async () => {
      try {
        const [
          riskStatus,
          controlPlaneStatusResult,
          researchRunsStatus,
          paperAccountStatus,
          executionControlStatus,
          paperOrderPlansStatus,
        ] = await Promise.allSettled([
          riskGateApi.getStatus(),
          controlPlaneApi.getStatus(),
          controlPlaneApi.getResearchRuns(),
          controlPlaneApi.getPaperAccount(),
          controlPlaneApi.getExecutionControl(),
          controlPlaneApi.getPaperOrderPlans(),
        ]);
        if (!ignore) {
          if (riskStatus.status === "fulfilled") {
            setRiskGateStatus(riskStatus.value);
          }

          if (controlPlaneStatusResult.status === "fulfilled") {
            setControlPlaneStatus(controlPlaneStatusResult.value);
          }

          if (researchRunsStatus.status === "fulfilled") {
            setResearchRuns(researchRunsStatus.value);
            setResearchRunsError(null);
          } else {
            setResearchRunsError(
              "Research-run ledger API is unavailable. Showing documented sample runs.",
            );
          }

          if (paperAccountStatus.status === "fulfilled") {
            setPaperAccount(paperAccountStatus.value);
            setPaperAccountError(null);
          } else {
            setPaperAccount(null);
            setPaperAccountError(
              "No live paper account state was returned. A filled paper execution must create one before account values are shown.",
            );
          }

          if (executionControlStatus.status === "fulfilled") {
            setExecutionControl(executionControlStatus.value);
          }

          if (paperOrderPlansStatus.status === "fulfilled") {
            setPaperOrderPlans(paperOrderPlansStatus.value);
            setPaperOrderPlansError(null);
          } else {
            setPaperOrderPlansError(
              "Paper order-plan API is unavailable. Showing documented sample paper plans.",
            );
          }

          setStatusError(
            riskStatus.status === "rejected" ||
              controlPlaneStatusResult.status === "rejected"
              ? "One or more control-plane status APIs are unavailable."
              : null,
          );
        }
      } catch {
        if (!ignore) {
          setStatusError("Control-plane status APIs are unavailable.");
          setResearchRunsError(
            "Research-run ledger API is unavailable. Showing documented sample runs.",
          );
          setPaperOrderPlansError(
            "Paper order-plan API is unavailable. Showing documented sample paper plans.",
          );
          setPaperAccountError(
            "No live paper account state was returned. A filled paper execution must create one before account values are shown.",
          );
        }
      } finally {
        if (!ignore) {
          setLoadingStatus(false);
          setLoadingResearchRuns(false);
          setLoadingPaperAccount(false);
          setLoadingPaperOrderPlans(false);
        }
      }
    };

    fetchStatus();

    return () => {
      ignore = true;
    };
  }, []);

  const status = riskGateStatus ?? DOCUMENTED_STATUS;
  const controlStatus = controlPlaneStatus ?? DOCUMENTED_CONTROL_PLANE_STATUS;
  const visibleResearchRuns = researchRuns ?? DOCUMENTED_RESEARCH_RUNS;
  const visiblePaperOrderPlans =
    paperOrderPlans ??
    (loadingPaperOrderPlans ? [] : DOCUMENTED_PAPER_ORDER_PLANS);
  const visiblePaperAccount = paperAccount;
  const visibleExecutionControl =
    executionControl ?? DOCUMENTED_EXECUTION_CONTROL;
  const latestPaperOrderPlans = [...visiblePaperOrderPlans]
    .sort(
      (leftPlan, rightPlan) =>
        new Date(rightPlan.updatedAt).getTime() -
        new Date(leftPlan.updatedAt).getTime(),
    )
    .slice(0, 3);
  const latestReconciledPlan = [...visiblePaperOrderPlans]
    .filter((plan) => plan.reconciliation.reconciledAt)
    .sort(
      (leftPlan, rightPlan) =>
        new Date(rightPlan.reconciliation.reconciledAt ?? 0).getTime() -
        new Date(leftPlan.reconciliation.reconciledAt ?? 0).getTime(),
    )[0];
  const recentPaperLedgerChanges: PaperLedgerChange[] = visiblePaperAccount
    ? [
        ...visiblePaperAccount.cashLedger.map((entry) => ({
          ...entry,
          kind: "cash" as const,
          id: entry.paperCashEventId,
        })),
        ...visiblePaperAccount.positionLedger.map((entry) => ({
          ...entry,
          kind: "position" as const,
          id: entry.paperPositionEventId,
        })),
      ]
        .sort(
          (leftEntry, rightEntry) =>
            new Date(rightEntry.timestamp).getTime() -
            new Date(leftEntry.timestamp).getTime(),
        )
        .slice(0, 10)
    : [];
  const policy = status.defaultPolicy;
  const exampleOrder = EXAMPLE_REQUEST.orders[0];
  const paperExecutionReadiness = controlStatus.readiness.find(
    (item) => item.key === "paperExecutionReady",
  ) ?? {
    key: "paperExecutionReady",
    ready: paperOrderPlans !== null,
    detail:
      "Paper readiness is inferred from the paper order-plan API response.",
  };
  const statusSource = riskGateStatus
    ? "Live API status"
    : loadingStatus
      ? "Loading API status"
      : "Documented fallback";
  const researchRunsSource = researchRuns
    ? "Live research ledger"
    : loadingResearchRuns
      ? "Loading research ledger"
      : "Documented sample runs";
  const paperOrderPlansSource = paperOrderPlans
    ? "Live paper plans"
    : loadingPaperOrderPlans
      ? "Loading paper plans"
      : "Documented sample plans";
  const paperAccountSource = paperAccount
    ? "Live paper account"
    : loadingPaperAccount
      ? "Loading paper account"
      : "No paper account";
  const readinessReadyCount = controlStatus.readiness.filter(
    (item) => item.ready,
  ).length;
  const handleRunBaselineResearch = async () => {
    setRunningBaselineResearch(true);
    setBaselineResearchError(null);
    setBaselineResearchSuccess(null);

    try {
      const researchRun = await controlPlaneApi.runBaselineResearch(
        BASELINE_RESEARCH_REQUEST,
      );

      setResearchRuns((currentRuns) => [
        researchRun,
        ...(currentRuns ?? []).filter((run) => run.id !== researchRun.id),
      ]);
      setResearchRunsError(null);
      setBaselineResearchSuccess(
        "Baseline dry-run completed. Returned research run added to the ledger.",
      );
    } catch {
      setBaselineResearchError(
        "Baseline dry-run failed. No broker or live order path was called.",
      );
    } finally {
      setRunningBaselineResearch(false);
    }
  };

  return (
    <div className="relative left-1/2 min-h-screen w-screen -translate-x-1/2 bg-[#0b0e11] px-4 py-4 text-[#eaecef] sm:px-5 lg:px-6">
      <div className="mx-auto max-w-[1440px] space-y-4">
        <section className="rounded-xl border border-[#2b3139] bg-[#181a20]">
          <div className="grid gap-0 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-[#fcd535]/40 bg-[#fcd535] px-2 py-1 text-[11px] font-bold uppercase text-[#181a20]">
                  Control
                </span>
                <span className="rounded-md border border-[#f6465d]/40 bg-[#f6465d]/10 px-2 py-1 text-[11px] font-bold uppercase text-[#f6465d]">
                  No live trading
                </span>
                <span className="rounded-md border border-[#2b3139] bg-[#0b0e11] px-2 py-1 text-[11px] font-bold uppercase text-[#929aa5]">
                  {statusSource}
                </span>
              </div>

              <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
                Control Plane Dashboard
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-[#929aa5]">
                One-page operating surface for autonomous research,
                deterministic risk, paper account state, and promotion blockers.
                The only callable action here is a dry-run research backtest.
              </p>
            </div>

            <div className="border-t border-[#2b3139] p-5 sm:p-6 lg:border-l lg:border-t-0">
              <div className="grid grid-cols-2 gap-3">
                {[
                  [
                    "brokerExecutionEnabled",
                    formatBoolean(status.brokerExecutionEnabled),
                    "text-[#f6465d]",
                  ],
                  [
                    "liveTradingEnabled",
                    formatBoolean(status.liveTradingEnabled),
                    "text-[#f6465d]",
                  ],
                  [
                    "Intent",
                    EXAMPLE_REQUEST.executionIntent ?? "evaluate_only",
                    "text-white",
                  ],
                  [
                    "Blockers",
                    String(controlStatus.blockers.length),
                    "text-[#fcd535]",
                  ],
                ].map(([label, value, className]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3"
                  >
                    <div className="text-[11px] font-semibold uppercase text-[#707a8a]">
                      {label}
                    </div>
                    <div
                      className={`mt-2 font-mono text-xl font-bold ${className}`}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr_0.72fr]">
          <div className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  System Readiness Matrix
                </h3>
                <p className="mt-1 text-xs font-medium text-[#707a8a]">
                  {readinessReadyCount}/{controlStatus.readiness.length} gates
                  ready
                </p>
              </div>
              <span
                className={statusBadge(
                  controlPlaneStatus ? "started" : "partial",
                )}
              >
                {controlPlaneStatus ? "API Connected" : "Fallback"}
              </span>
            </div>

            {statusError && (
              <div className="mt-3 rounded-lg border border-[#f0b90b]/30 bg-[#f0b90b]/10 p-3 text-xs font-semibold text-[#fcd535]">
                {statusError} Showing documented defaults.
              </div>
            )}

            <div className="mt-4 divide-y divide-[#2b3139]">
              {controlStatus.readiness.map((item) => (
                <div
                  key={item.key}
                  className="grid grid-cols-[1fr_auto] gap-3 py-3"
                >
                  <div>
                    <div className="font-mono text-xs font-bold text-[#eaecef]">
                      {item.key}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-[#707a8a]">
                      {item.detail}
                    </div>
                  </div>
                  <span
                    className={statusBadge(item.ready ? "started" : "blocked")}
                  >
                    {item.ready ? "Ready" : "Blocked"}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg border border-[#f6465d]/30 bg-[#f6465d]/10 p-3">
              <div className="text-[11px] font-bold uppercase text-[#f6465d]">
                Remaining blockers
              </div>
              <div className="mt-2 space-y-1 text-xs font-semibold text-[#eaecef]">
                {controlStatus.blockers.map((blocker) => (
                  <div key={blocker}>{blocker}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-xl border border-[#2b3139] bg-[#181a20]">
              <div className="flex flex-col gap-3 border-b border-[#2b3139] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Research Run Ledger
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-[#929aa5]">
                      {researchRunsSource}
                    </span>
                    <span className="font-bold text-[#f6465d]">
                      Broker disabled
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRunBaselineResearch}
                  disabled={loadingResearchRuns || runningBaselineResearch}
                  className="h-10 rounded-md bg-[#fcd535] px-4 text-sm font-bold text-[#181a20] transition hover:bg-[#f0b90b] disabled:cursor-not-allowed disabled:bg-[#3a3a1f] disabled:text-[#707a8a]"
                >
                  {runningBaselineResearch
                    ? "Running dry-run backtest"
                    : "Run dry-run backtest"}
                </button>
              </div>

              <div className="p-4">
                <div className="mb-3 rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
                  <div className="text-xs font-bold uppercase text-[#fcd535]">
                    Baseline research dry-run
                  </div>
                  <div className="mt-2 grid gap-2 text-xs text-[#929aa5] sm:grid-cols-3">
                    <span>{BASELINE_RESEARCH_REQUEST.symbol}</span>
                    <span>{BASELINE_RESEARCH_REQUEST.benchmark}</span>
                    <span>
                      {formatCurrency(
                        BASELINE_RESEARCH_REQUEST.initialCapital ?? 0,
                      )}
                    </span>
                  </div>
                </div>

                {baselineResearchSuccess && (
                  <div className="mb-3 rounded-lg border border-[#0ecb81]/30 bg-[#0ecb81]/10 p-3 text-xs font-semibold text-[#0ecb81]">
                    {baselineResearchSuccess}
                  </div>
                )}

                {baselineResearchError && (
                  <div className="mb-3 rounded-lg border border-[#f6465d]/30 bg-[#f6465d]/10 p-3 text-xs font-semibold text-[#f6465d]">
                    {baselineResearchError}
                  </div>
                )}

                {researchRunsError && (
                  <div className="mb-3 rounded-lg border border-[#f0b90b]/30 bg-[#f0b90b]/10 p-3 text-xs font-semibold text-[#fcd535]">
                    {researchRunsError}
                  </div>
                )}

                {visibleResearchRuns.length === 0 ? (
                  <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-4 text-sm font-semibold text-[#929aa5]">
                    No research runs recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                      <thead className="text-[11px] uppercase text-[#707a8a]">
                        <tr className="border-b border-[#2b3139]">
                          <th className="py-2 pr-4">Run</th>
                          <th className="py-2 pr-4">Backtest Metrics</th>
                          <th className="py-2 pr-4">Benchmark</th>
                          <th className="py-2 pr-4">Drawdown</th>
                          <th className="py-2 pr-4">Evidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2b3139]">
                        {visibleResearchRuns.slice(0, 5).map((run) => (
                          <tr key={run.id}>
                            <td className="py-3 pr-4 align-top">
                              <div className="font-semibold text-white">
                                {run.objective}
                              </div>
                              <div className="mt-1 font-mono text-xs text-[#707a8a]">
                                {run.id}
                              </div>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <span
                                  className={`${researchRunStatusClass(
                                    run.status,
                                  )} rounded-md border px-2 py-1 text-[11px] font-bold uppercase`}
                                >
                                  {run.status}
                                </span>
                                {run.phase && (
                                  <span className="rounded-md border border-[#2b3139] px-2 py-1 text-[11px] font-bold uppercase text-[#929aa5]">
                                    {run.phase}
                                  </span>
                                )}
                              </div>
                              <details className="mt-2 text-xs text-[#929aa5]">
                                <summary className="cursor-pointer text-[#fcd535]">
                                  thesis
                                </summary>
                                <p className="mt-2 leading-5">
                                  {run.hypothesis}
                                </p>
                              </details>
                            </td>
                            <td className="py-3 pr-4 align-top">
                              <div className="font-mono text-lg font-bold text-[#0ecb81]">
                                {formatSignedPercent(
                                  run.backtestMetrics.totalReturnPct,
                                )}
                              </div>
                              <div className="text-xs text-[#707a8a]">
                                Sharpe{" "}
                                {formatNumber(run.backtestMetrics.sharpeRatio)}
                                {" / "}Trades {run.backtestMetrics.tradeCount}
                              </div>
                            </td>
                            <td className="py-3 pr-4 align-top font-mono text-sm text-[#eaecef]">
                              {formatSignedPercent(
                                run.backtestMetrics.benchmarkReturnPct,
                              )}
                            </td>
                            <td className="py-3 pr-4 align-top font-mono text-sm text-[#f6465d]">
                              {formatPercent(
                                run.backtestMetrics.maxDrawdownPct,
                              )}
                            </td>
                            <td className="py-3 pr-4 align-top text-xs text-[#929aa5]">
                              <div>{run.strategyFamily}</div>
                              <div>{formatWindow(run.validationWindow)}</div>
                              <details className="mt-2">
                                <summary className="cursor-pointer text-[#fcd535]">
                                  lineage
                                </summary>
                                <div className="mt-2 space-y-1">
                                  {run.datasetRefs.map((datasetRef) => (
                                    <div key={`${run.id}-${datasetRef.id}`}>
                                      {formatDatasetRef(datasetRef)}
                                    </div>
                                  ))}
                                  {run.knownFailureModes.map((failureMode) => (
                                    <div key={`${run.id}-${failureMode}`}>
                                      {failureMode}
                                    </div>
                                  ))}
                                </div>
                              </details>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-[#2b3139] bg-[#181a20]">
              <div className="flex flex-col gap-3 border-b border-[#2b3139] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Paper Execution Enclave
                  </h3>
                  <p className="mt-1 text-xs text-[#707a8a]">
                    {paperExecutionReadiness.detail}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span
                    className={statusBadge(
                      paperExecutionReadiness.ready ? "started" : "blocked",
                    )}
                  >
                    {paperExecutionReadiness.ready ? "Started" : "Blocked"}
                  </span>
                  <span className="rounded-md border border-[#f6465d]/30 bg-[#f6465d]/10 px-2 py-1 text-[11px] font-bold uppercase text-[#f6465d]">
                    brokerExecutionEnabled: false
                  </span>
                  <span className="rounded-md border border-[#f6465d]/30 bg-[#f6465d]/10 px-2 py-1 text-[11px] font-bold uppercase text-[#f6465d]">
                    liveTradingEnabled: false
                  </span>
                </div>
              </div>

              <div className="grid gap-0 xl:grid-cols-[0.95fr_1.05fr]">
                <div className="border-b border-[#2b3139] p-4 xl:border-b-0 xl:border-r">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h4 className="text-sm font-bold text-white">
                      Paper Account State
                    </h4>
                    <span className="rounded-md border border-[#2b3139] px-2 py-1 text-[11px] font-bold uppercase text-[#929aa5]">
                      {paperAccountSource}
                    </span>
                  </div>

                  {paperAccountError && (
                    <div className="mb-3 rounded-lg border border-[#f0b90b]/30 bg-[#f0b90b]/10 p-3 text-xs font-semibold text-[#fcd535]">
                      {paperAccountError}
                    </div>
                  )}

                  {!visiblePaperAccount ? (
                    <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-4 text-sm font-semibold text-[#929aa5]">
                      {loadingPaperAccount
                        ? "Paper account state is loading."
                        : "No durable paper account has been recorded yet. A filled paper execution must create it first."}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          ["Cash", formatCurrency(visiblePaperAccount.cash)],
                          [
                            "Equity",
                            formatCurrency(visiblePaperAccount.equity),
                          ],
                          [
                            "Gross exposure",
                            formatPercent(visiblePaperAccount.grossExposurePct),
                          ],
                          ["Currency", visiblePaperAccount.currency],
                        ].map(([label, value]) => (
                          <div
                            key={`paper-account-${label}`}
                            className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3"
                          >
                            <div className="text-[11px] font-semibold uppercase text-[#707a8a]">
                              {label}
                            </div>
                            <div className="mt-2 font-mono text-base font-bold text-white">
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-xs font-bold uppercase text-[#707a8a]">
                            Execution control
                          </div>
                          <span
                            className={`${paperOrderPlanStatusClass(
                              visibleExecutionControl.state,
                            )} rounded-md border px-2 py-1 text-[11px] font-bold uppercase`}
                          >
                            {visibleExecutionControl.state}
                          </span>
                        </div>
                        <p className="mt-2 text-xs font-semibold leading-5 text-[#eaecef]">
                          {visibleExecutionControl.reason}
                        </p>
                        <div className="mt-2 text-xs text-[#707a8a]">
                          {visibleExecutionControl.actor} /{" "}
                          {formatDateTime(visibleExecutionControl.createdAt)}
                        </div>
                      </div>

                      <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
                        <div className="mb-2 text-xs font-bold uppercase text-[#707a8a]">
                          Positions
                        </div>
                        {visiblePaperAccount.positions.length === 0 ? (
                          <div className="text-sm font-semibold text-[#929aa5]">
                            No paper positions recorded.
                          </div>
                        ) : (
                          <div className="divide-y divide-[#2b3139]">
                            {visiblePaperAccount.positions.map((position) => (
                              <div
                                key={`paper-account-position-${position.symbol}`}
                                className="grid grid-cols-[1fr_1fr_0.7fr] gap-3 py-2 text-sm"
                              >
                                <span className="font-mono font-bold text-white">
                                  {position.symbol}
                                </span>
                                <span className="font-mono text-[#eaecef]">
                                  {formatCurrency(position.marketValue)}
                                </span>
                                <span className="font-mono text-[#0ecb81]">
                                  {formatPercent(position.weightPct)}
                                </span>
                                <span className="col-span-3 text-xs uppercase text-[#707a8a]">
                                  {position.assetClass}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
                          <div className="text-xs font-bold uppercase text-[#707a8a]">
                            Last reconciliation
                          </div>
                          <div className="mt-2 text-sm font-semibold text-[#eaecef]">
                            {visiblePaperAccount.lastReconciledAt
                              ? formatDateTime(
                                  visiblePaperAccount.lastReconciledAt,
                                )
                              : "Not reconciled"}
                          </div>
                          <div className="mt-1 text-xs text-[#707a8a]">
                            Latest plan:{" "}
                            {latestReconciledPlan
                              ? `${latestReconciledPlan.id} / ${latestReconciledPlan.reconciliation.status}`
                              : "No reconciled plan"}
                          </div>
                        </div>

                        <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
                          <div className="text-xs font-bold uppercase text-[#707a8a]">
                            Recent ledger changes
                          </div>
                          {recentPaperLedgerChanges.length === 0 ? (
                            <div className="mt-2 text-sm font-semibold text-[#929aa5]">
                              No paper ledger changes recorded.
                            </div>
                          ) : (
                            <div className="mt-2 space-y-2">
                              {recentPaperLedgerChanges
                                .slice(0, 4)
                                .map((entry) => (
                                  <div
                                    key={`paper-ledger-${entry.id}`}
                                    className="grid grid-cols-[0.5fr_0.8fr_1fr] gap-2 text-xs"
                                  >
                                    <span className="uppercase text-[#707a8a]">
                                      {entry.kind}
                                    </span>
                                    <span
                                      className={
                                        entry.kind === "cash"
                                          ? entry.amount < 0
                                            ? "font-mono text-[#f6465d]"
                                            : "font-mono text-[#0ecb81]"
                                          : entry.notionalDelta < 0
                                            ? "font-mono text-[#f6465d]"
                                            : "font-mono text-[#0ecb81]"
                                      }
                                    >
                                      {entry.kind === "cash"
                                        ? formatSignedCurrency(entry.amount)
                                        : formatSignedCurrency(
                                            entry.notionalDelta,
                                          )}
                                    </span>
                                    <span className="truncate text-[#929aa5]">
                                      {entry.kind === "cash"
                                        ? entry.reason
                                        : `${entry.symbol} position`}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-[#2b3139] px-2 py-1 text-[11px] font-bold uppercase text-[#929aa5]">
                      {paperOrderPlansSource}
                    </span>
                    {paperOrderPlansError && (
                      <span className="rounded-md border border-[#f0b90b]/30 bg-[#f0b90b]/10 px-2 py-1 text-[11px] font-bold uppercase text-[#fcd535]">
                        API fallback
                      </span>
                    )}
                  </div>

                  {paperOrderPlansError && (
                    <div className="mb-3 rounded-lg border border-[#f0b90b]/30 bg-[#f0b90b]/10 p-3 text-xs font-semibold text-[#fcd535]">
                      {paperOrderPlansError}
                    </div>
                  )}

                  {visiblePaperOrderPlans.length === 0 ? (
                    <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-4 text-sm font-semibold text-[#929aa5]">
                      No paper order plans recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {latestPaperOrderPlans.map((plan) => (
                        <article
                          key={plan.id}
                          className="rounded-lg border border-[#2b3139] bg-[#0b0e11]"
                        >
                          <div className="border-b border-[#2b3139] p-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-[#929aa5]">
                                    {plan.id}
                                  </span>
                                  <span
                                    className={`${paperOrderPlanStatusClass(
                                      plan.status,
                                    )} rounded-md border px-2 py-1 text-[11px] font-bold uppercase`}
                                  >
                                    {plan.status}
                                  </span>
                                </div>
                                <div className="mt-2 font-semibold text-white">
                                  Proposal {plan.proposalId}
                                </div>
                              </div>
                              <div className="text-right font-mono text-sm">
                                <div className="text-[#eaecef]">
                                  {formatCurrency(plan.endingEquity)}
                                </div>
                                <div
                                  className={
                                    plan.endingEquity - plan.startingEquity >= 0
                                      ? "text-[#0ecb81]"
                                      : "text-[#f6465d]"
                                  }
                                >
                                  {formatSignedCurrency(
                                    plan.endingEquity - plan.startingEquity,
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 grid gap-1 text-xs text-[#707a8a]">
                              <div>Plan hash: {plan.planHash}</div>
                              <div>Proposal hash: {plan.proposalHash}</div>
                              <div>Idempotency: {plan.idempotencyKey}</div>
                            </div>
                          </div>

                          <div className="grid gap-0 md:grid-cols-3">
                            <div className="border-b border-[#2b3139] p-3 md:border-b-0 md:border-r">
                              <div className="text-xs font-bold uppercase text-[#707a8a]">
                                Planned orders
                              </div>
                              <div className="mt-2 space-y-2">
                                {plan.orders.map((order) => (
                                  <div
                                    key={`${plan.id}-${order.symbol}-${order.side}`}
                                    className="grid grid-cols-[1fr_auto] gap-3 text-xs"
                                  >
                                    <span className="font-mono font-bold text-white">
                                      {order.symbol}
                                    </span>
                                    <span className="font-mono text-[#eaecef]">
                                      {order.side}{" "}
                                      {formatCurrency(order.requestedNotional)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="border-b border-[#2b3139] p-3 md:border-b-0 md:border-r">
                              <div className="text-xs font-bold uppercase text-[#707a8a]">
                                Paper fills
                              </div>
                              {plan.fills.length === 0 ? (
                                <div className="mt-2 text-xs font-semibold text-[#929aa5]">
                                  No fills recorded for this paper plan.
                                </div>
                              ) : (
                                <div className="mt-2 space-y-2">
                                  {plan.fills.map((fill) => (
                                    <div
                                      key={`${plan.id}-${fill.symbol}-${fill.side}-${fill.status}`}
                                      className="grid grid-cols-[1fr_auto] gap-3 text-xs"
                                    >
                                      <span className="font-mono font-bold text-white">
                                        {fill.symbol}
                                      </span>
                                      <span
                                        className={
                                          fill.netCashDelta < 0
                                            ? "font-mono text-[#f6465d]"
                                            : "font-mono text-[#0ecb81]"
                                        }
                                      >
                                        {formatSignedCurrency(
                                          fill.netCashDelta,
                                          fill.feeCurrency,
                                        )}
                                      </span>
                                      <span className="col-span-2 text-[#707a8a]">
                                        {fill.status} / fee{" "}
                                        {formatCurrency(fill.fee)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="p-3">
                              <div className="text-xs font-bold uppercase text-[#707a8a]">
                                Reconciliation
                              </div>
                              <div className="mt-2 space-y-2 text-xs">
                                <div className="flex justify-between gap-3">
                                  <span className="text-[#929aa5]">Status</span>
                                  <span className="font-mono text-white">
                                    {plan.reconciliation.status}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-3">
                                  <span className="text-[#929aa5]">
                                    Expected cash
                                  </span>
                                  <span className="font-mono text-white">
                                    {formatCurrency(
                                      plan.reconciliation.expectedCash,
                                    )}
                                  </span>
                                </div>
                                <div className="flex justify-between gap-3">
                                  <span className="text-[#929aa5]">
                                    Cash diff
                                  </span>
                                  <span className="font-mono text-[#0ecb81]">
                                    {formatSignedCurrency(
                                      plan.reconciliation.cashDiff ?? 0,
                                    )}
                                  </span>
                                </div>
                              </div>
                              <details className="mt-2 text-xs text-[#929aa5]">
                                <summary className="cursor-pointer text-[#fcd535]">
                                  notes
                                </summary>
                                <ul className="mt-2 space-y-1">
                                  {plan.reconciliation.notes.map((note) => (
                                    <li key={`${plan.id}-${note}`}>{note}</li>
                                  ))}
                                </ul>
                              </details>
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4">
              <h3 className="text-base font-bold text-white">Risk Policy</h3>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[
                  ["Gross", `${policy.maxGrossExposurePct}%`],
                  ["Single", `${policy.maxSinglePositionPct}%`],
                  ["Order", formatCurrency(policy.maxOrderNotional)],
                  ["Data age", `${policy.maxDataAgeMinutes}m`],
                  ["Daily loss", `${policy.maxDailyLossPct}%`],
                  ["Drawdown", `${policy.maxDrawdownPct}%`],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3"
                  >
                    <div className="text-[11px] font-semibold uppercase text-[#707a8a]">
                      {label}
                    </div>
                    <div className="mt-1 font-mono text-sm font-bold text-white">
                      {value}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {policy.allowedAssetClasses.map((assetClass) => (
                  <span
                    key={assetClass}
                    className="rounded-md border border-[#2b3139] px-2 py-1 font-mono text-[11px] font-bold text-[#929aa5]"
                  >
                    {assetClass}
                  </span>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-bold text-white">
                  Example Evaluation
                </h3>
                <span
                  className={`${decisionClasses[EXAMPLE_EVALUATION.decision]} rounded-md border px-2 py-1 text-[11px] font-bold`}
                >
                  {EXAMPLE_EVALUATION.decision}
                </span>
              </div>
              <div className="mt-3 divide-y divide-[#2b3139] text-xs">
                {[
                  ["mode", EXAMPLE_EVALUATION.mode],
                  [
                    "broker flag",
                    formatBoolean(EXAMPLE_EVALUATION.brokerExecutionEnabled),
                  ],
                  [
                    "requiresHumanApproval",
                    formatBoolean(EXAMPLE_EVALUATION.requiresHumanApproval),
                  ],
                  ["symbol", exampleOrder.symbol],
                  ["notional", formatCurrency(exampleOrder.notional)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 py-2">
                    <span className="text-[#707a8a]">{label}</span>
                    <span className="text-right font-mono font-bold text-[#eaecef]">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4">
              <h3 className="text-base font-bold text-white">Safety Gates</h3>
              <div className="mt-3 space-y-2">
                {SAFETY_GATES.map((gate) => (
                  <details
                    key={gate.name}
                    className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3"
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-[#eaecef]">
                        {gate.name}
                      </span>
                      <span className={statusBadge(gate.status)}>
                        {STATUS_LABELS[gate.status]}
                      </span>
                    </summary>
                    <p className="mt-2 text-xs leading-5 text-[#929aa5]">
                      {gate.notes}
                    </p>
                  </details>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4">
              <h3 className="text-base font-bold text-white">
                Autonomous Investing Lifecycle
              </h3>
              <div className="mt-3 space-y-2">
                {CONTROL_PLANE_STAGES.map((stage) => (
                  <div
                    key={stage.phase}
                    className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-bold uppercase text-[#707a8a]">
                          {stage.phase}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-white">
                          {stage.title}
                        </div>
                      </div>
                      <span className={statusBadge(stage.status)}>
                        {STATUS_LABELS[stage.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-[#929aa5]">
                      {stage.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
};

export default ControlPlaneDashboard;
