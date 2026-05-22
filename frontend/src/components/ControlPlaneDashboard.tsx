import React, { useEffect, useState } from "react";
import { controlPlaneApi, riskGateApi } from "../services/api";
import {
  ControlPlaneStatus,
  ControlPlaneGateStatus,
  ControlPlaneStage,
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
      detail: "Paper execution enclave is not implemented",
    },
    {
      key: "liveTradingReady",
      ready: false,
      detail: "Live trading is blocked",
    },
  ],
  blockers: [
    "No paper execution enclave",
    "No broker read-only adapter",
    "No signed order-plan workflow",
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
      "Budget envelopes, proposal records, risk evaluations, and autonomous run ledgers are implemented; research-run provenance is next.",
  },
  {
    name: "Deterministic risk gate",
    status: "started",
    notes:
      "Evaluation-only API checks policy limits without LLM or broker calls.",
  },
  {
    name: "Paper execution",
    status: "missing",
    notes:
      "No paper order enclave, signed plan, reconciliation loop, or kill switch exists.",
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
    status: "missing",
    description:
      "Reproducible research runs with backtests, costs, turnover, drawdown, and benchmarks.",
  },
  {
    phase: "Phase 3",
    title: "Paper execution",
    status: "missing",
    description:
      "Signed paper order plans, paper adapter, reconciliation, and tested kill switch.",
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
  partial:
    "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:border-sky-400/30",
  started:
    "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-400/30",
  missing:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-400/30",
  blocked:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-200 dark:border-red-400/30",
};

const decisionClasses: Record<RiskGateResponse["decision"], string> = {
  ALLOW:
    "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-400/30",
  REVIEW:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-400/30",
  DENY: "bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-200 dark:border-red-400/30",
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
  `${STATUS_CLASSES[status]} inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase`;

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
  const [paperOrderPlans, setPaperOrderPlans] = useState<
    PaperOrderPlan[] | null
  >(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingResearchRuns, setLoadingResearchRuns] = useState(true);
  const [loadingPaperOrderPlans, setLoadingPaperOrderPlans] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [researchRunsError, setResearchRunsError] = useState<string | null>(
    null,
  );
  const [paperOrderPlansError, setPaperOrderPlansError] = useState<
    string | null
  >(null);
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
          paperOrderPlansStatus,
        ] = await Promise.allSettled([
          riskGateApi.getStatus(),
          controlPlaneApi.getStatus(),
          controlPlaneApi.getResearchRuns(),
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
        }
      } finally {
        if (!ignore) {
          setLoadingStatus(false);
          setLoadingResearchRuns(false);
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
  const latestPaperOrderPlans = [...visiblePaperOrderPlans]
    .sort(
      (leftPlan, rightPlan) =>
        new Date(rightPlan.updatedAt).getTime() -
        new Date(leftPlan.updatedAt).getTime(),
    )
    .slice(0, 3);
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
    <div className="container mx-auto px-6 py-12 space-y-8">
      <section className="glass-card p-8 md:p-10 border-glass-white-border-strong dark:border-glass-black-border-strong">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-xs font-bold uppercase text-primary-700 dark:text-primary-200">
                Read-only
              </span>
              <span className="inline-flex rounded-full border border-red-300 bg-red-100 px-3 py-1 text-xs font-bold uppercase text-red-800 dark:border-red-400/30 dark:bg-red-500/15 dark:text-red-200">
                No live trading
              </span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white md:text-5xl">
              Control Plane Dashboard
            </h2>
            <p className="mt-4 text-lg font-medium leading-relaxed text-gray-700 dark:text-gray-300">
              Deterministic risk visibility for the current autonomous investing
              plan. This view exposes live readiness, proposal gates, and risk
              audit readiness; it has no order controls.
            </p>
          </div>

          <div className="rounded-2xl border-2 border-red-300 bg-red-50/80 p-5 shadow-glass dark:border-red-400/30 dark:bg-red-950/30">
            <div className="text-sm font-bold uppercase text-red-700 dark:text-red-200">
              Broker execution enabled
            </div>
            <div className="mt-2 font-mono text-4xl font-bold text-red-800 dark:text-red-100">
              {formatBoolean(status.brokerExecutionEnabled)}
            </div>
            <div className="mt-2 text-sm font-semibold text-red-700 dark:text-red-200">
              No broker adapter or live order path is callable from this UI.
            </div>
          </div>
        </div>
      </section>

      <section className="glass-card p-6 md:p-8">
        <div className="relative z-10">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                System Readiness Matrix
              </h3>
              <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
                Live status from the control-plane API when available.
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

          <div className="grid gap-4 lg:grid-cols-2">
            {controlStatus.readiness.map((item) => (
              <div
                key={item.key}
                className="rounded-xl border border-white/50 bg-white/40 p-5 dark:border-white/10 dark:bg-black/20"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <h4 className="break-words font-mono text-sm font-bold text-gray-900 dark:text-white">
                    {item.key}
                  </h4>
                  <span
                    className={statusBadge(item.ready ? "started" : "blocked")}
                  >
                    {item.ready ? "Ready" : "Blocked"}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium leading-relaxed text-gray-700 dark:text-gray-300">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-red-200 bg-red-50/70 p-5 dark:border-red-400/30 dark:bg-red-500/10">
            <div className="text-sm font-bold uppercase text-red-800 dark:text-red-200">
              Remaining blockers
            </div>
            <ul className="mt-3 space-y-2 text-sm font-semibold text-red-700 dark:text-red-200">
              {controlStatus.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="glass-card p-6">
          <div className="relative z-10">
            <div className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400">
              Risk gate status
            </div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {statusSource}
              </div>
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase ${
                  riskGateStatus
                    ? "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200"
                    : "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200"
                }`}
              >
                {riskGateStatus ? "Connected" : "Fallback"}
              </span>
            </div>
            {statusError && (
              <p className="mt-3 text-sm font-medium text-amber-700 dark:text-amber-200">
                {statusError} Showing documented defaults.
              </p>
            )}
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="relative z-10">
            <div className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400">
              Live trading enabled
            </div>
            <div className="mt-4 font-mono text-4xl font-bold text-red-700 dark:text-red-200">
              {formatBoolean(status.liveTradingEnabled)}
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Live mode remains blocked until a separate live gate exists.
            </p>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="relative z-10">
            <div className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400">
              Evaluation intent
            </div>
            <div className="mt-4 font-mono text-2xl font-bold text-gray-900 dark:text-white">
              evaluate_only
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              Risk requests must not include broker credentials or account ids.
            </p>
          </div>
        </div>
      </section>

      <section className="glass-card p-6 md:p-8">
        <div className="relative z-10">
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Research Run Ledger
              </h3>
              <p className="mt-1 max-w-3xl text-sm font-medium text-gray-600 dark:text-gray-300">
                Latest reproducible research runs and backtest results. This
                section is read-only and does not expose broker or live-trading
                controls.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase ${
                  researchRuns
                    ? "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200"
                    : "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200"
                }`}
              >
                {researchRunsSource}
              </span>
              <span className="inline-flex rounded-full border border-red-300 bg-red-100 px-3 py-1 text-xs font-bold uppercase text-red-800 dark:border-red-400/30 dark:bg-red-500/15 dark:text-red-200">
                Broker disabled
              </span>
              <button
                type="button"
                onClick={handleRunBaselineResearch}
                disabled={loadingResearchRuns || runningBaselineResearch}
                className="rounded-lg border border-primary-500/40 bg-primary-600 px-4 py-2 text-sm font-bold text-white shadow-glass transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-400 disabled:text-gray-100 dark:border-primary-300/40 dark:bg-primary-500 dark:hover:bg-primary-400"
              >
                {runningBaselineResearch
                  ? "Running dry-run backtest"
                  : "Run dry-run backtest"}
              </button>
            </div>
          </div>

          <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50/80 p-4 dark:border-sky-400/30 dark:bg-sky-500/10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-sm font-bold uppercase text-sky-800 dark:text-sky-200">
                  Baseline research dry-run
                </div>
                <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-sky-800 dark:text-sky-100">
                  Starts the deterministic research/backtest runner only. It
                  sends no broker credentials, opens no live order path, and
                  records the returned ResearchRun for review.
                </p>
              </div>
              <div className="grid gap-2 text-xs font-bold text-sky-900 dark:text-sky-100 sm:grid-cols-3 lg:min-w-96">
                <div className="rounded-lg bg-white/60 p-3 dark:bg-black/20">
                  Symbol: {BASELINE_RESEARCH_REQUEST.symbol}
                </div>
                <div className="rounded-lg bg-white/60 p-3 dark:bg-black/20">
                  Benchmark: {BASELINE_RESEARCH_REQUEST.benchmark}
                </div>
                <div className="rounded-lg bg-white/60 p-3 dark:bg-black/20">
                  Capital:{" "}
                  {formatCurrency(
                    BASELINE_RESEARCH_REQUEST.initialCapital ?? 0,
                  )}
                </div>
              </div>
            </div>
          </div>

          {baselineResearchSuccess && (
            <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">
              {baselineResearchSuccess}
            </p>
          )}

          {baselineResearchError && (
            <p className="mb-5 rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm font-semibold text-red-800 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-200">
              {baselineResearchError}
            </p>
          )}

          {researchRunsError && (
            <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm font-semibold text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
              {researchRunsError}
            </p>
          )}

          {visibleResearchRuns.length === 0 ? (
            <div className="rounded-xl border border-white/50 bg-white/40 p-5 text-sm font-semibold text-gray-700 dark:border-white/10 dark:bg-black/20 dark:text-gray-300">
              No research runs recorded yet.
            </div>
          ) : (
            <div className="space-y-5">
              {visibleResearchRuns.slice(0, 3).map((run) => (
                <article
                  key={run.id}
                  className="rounded-xl border border-white/50 bg-white/40 p-5 dark:border-white/10 dark:bg-black/20"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                          {run.id}
                        </span>
                        <span
                          className={`${researchRunStatusClass(
                            run.status,
                          )} inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase`}
                        >
                          {run.status}
                        </span>
                      </div>
                      <h4 className="mt-3 text-xl font-bold text-gray-900 dark:text-white">
                        {run.objective}
                      </h4>
                      <p className="mt-2 text-sm font-medium leading-relaxed text-gray-700 dark:text-gray-300">
                        {run.hypothesis}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-red-200 bg-red-50/70 p-4 dark:border-red-400/30 dark:bg-red-500/10 lg:min-w-64">
                      <div className="text-xs font-bold uppercase text-red-700 dark:text-red-200">
                        Execution path
                      </div>
                      <div className="mt-2 font-mono text-lg font-bold text-red-800 dark:text-red-100">
                        disabled
                      </div>
                      <p className="mt-1 text-xs font-semibold text-red-700 dark:text-red-200">
                        Backtest evidence only; no broker order path.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                    <div className="space-y-3">
                      {[
                        ["Strategy family", run.strategyFamily],
                        ["Benchmark", run.benchmark],
                        ["Cost model", run.costModel],
                        ["Slippage model", run.slippageModel],
                        [
                          "Validation window",
                          formatWindow(run.validationWindow),
                        ],
                        [
                          "Training window",
                          run.trainingWindow
                            ? formatWindow(run.trainingWindow)
                            : "Not trained",
                        ],
                        ["Updated", formatDateTime(run.updatedAt)],
                      ].map(([label, value]) => (
                        <div
                          key={`${run.id}-${label}`}
                          className="flex flex-col gap-1 rounded-lg border border-white/50 bg-white/40 p-3 dark:border-white/10 dark:bg-black/20 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                            {label}
                          </span>
                          <span className="break-words text-sm font-bold text-gray-900 dark:text-white sm:text-right">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div>
                      <div className="mb-3 text-sm font-bold uppercase text-gray-500 dark:text-gray-400">
                        Backtest Metrics
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {[
                          [
                            "Total return",
                            formatSignedPercent(
                              run.backtestMetrics.totalReturnPct,
                            ),
                          ],
                          [
                            "Benchmark return",
                            formatSignedPercent(
                              run.backtestMetrics.benchmarkReturnPct,
                            ),
                          ],
                          [
                            "Max drawdown",
                            formatPercent(run.backtestMetrics.maxDrawdownPct),
                          ],
                          [
                            "Sharpe ratio",
                            formatNumber(run.backtestMetrics.sharpeRatio),
                          ],
                          [
                            "Turnover",
                            formatPercent(run.backtestMetrics.turnoverPct),
                          ],
                          [
                            "Trade count",
                            String(run.backtestMetrics.tradeCount),
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={`${run.id}-${label}`}
                            className="rounded-lg border border-white/50 bg-white/40 p-3 dark:border-white/10 dark:bg-black/20"
                          >
                            <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                              {label}
                            </div>
                            <div className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg border border-white/50 bg-white/40 p-3 dark:border-white/10 dark:bg-black/20">
                          <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                            Data and features
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {[
                              ...run.datasetRefs.map(formatDatasetRef),
                              ...run.featureRefs,
                            ].map((ref) => (
                              <span
                                key={`${run.id}-${ref}`}
                                className="rounded-full bg-gray-900/10 px-2.5 py-1 font-mono text-xs font-bold text-gray-800 dark:bg-white/10 dark:text-gray-100"
                              >
                                {ref}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-lg border border-white/50 bg-white/40 p-3 dark:border-white/10 dark:bg-black/20">
                          <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                            Failure modes
                          </div>
                          <ul className="mt-2 space-y-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {run.knownFailureModes.map((failureMode) => (
                              <li key={`${run.id}-${failureMode}`}>
                                {failureMode}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="mt-3 rounded-lg border border-white/50 bg-white/40 p-3 dark:border-white/10 dark:bg-black/20">
                        <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                          Artifacts
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {run.artifactRefs.map((artifactRef) => (
                            <span
                              key={`${run.id}-${artifactRef}`}
                              className="break-all rounded-full bg-gray-900/10 px-2.5 py-1 font-mono text-xs font-bold text-gray-800 dark:bg-white/10 dark:text-gray-100"
                            >
                              {artifactRef}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="glass-card p-6 md:p-8">
        <div className="relative z-10">
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Paper Execution Enclave
              </h3>
              <p className="mt-1 max-w-3xl text-sm font-medium text-gray-600 dark:text-gray-300">
                Latest paper order plans, simulated fills, and reconciliation
                checks. This dashboard is read-only and does not render proposal
                paper-execute buttons because proposal records are not fetched
                here.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase ${
                  paperOrderPlans
                    ? "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/15 dark:text-emerald-200"
                    : "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-200"
                }`}
              >
                {paperOrderPlansSource}
              </span>
              <span className="inline-flex rounded-full border border-red-300 bg-red-100 px-3 py-1 text-xs font-bold uppercase text-red-800 dark:border-red-400/30 dark:bg-red-500/15 dark:text-red-200">
                Live disabled
              </span>
            </div>
          </div>

          <div className="mb-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-white/50 bg-white/40 p-5 dark:border-white/10 dark:bg-black/20">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                    {paperExecutionReadiness.key}
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-700 dark:text-gray-300">
                    {paperExecutionReadiness.detail}
                  </p>
                </div>
                <span
                  className={statusBadge(
                    paperExecutionReadiness.ready ? "started" : "blocked",
                  )}
                >
                  {paperExecutionReadiness.ready ? "Ready" : "Blocked"}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-white/50 bg-white/40 p-5 dark:border-white/10 dark:bg-black/20">
              <div className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                Latest plans visible
              </div>
              <div className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {latestPaperOrderPlans.length}
              </div>
              <p className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                Displaying the most recently updated paper plans only.
              </p>
            </div>

            <div className="rounded-xl border border-red-200 bg-red-50/70 p-5 dark:border-red-400/30 dark:bg-red-500/10">
              <div className="text-xs font-bold uppercase text-red-700 dark:text-red-200">
                Execution guardrails
              </div>
              <div className="mt-3 grid gap-2 text-sm font-bold text-red-800 dark:text-red-100">
                <div>brokerExecutionEnabled: false</div>
                <div>liveTradingEnabled: false</div>
                <div>mode: paper</div>
              </div>
            </div>
          </div>

          <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50/80 p-4 dark:border-sky-400/30 dark:bg-sky-500/10">
            <div className="text-sm font-bold uppercase text-sky-800 dark:text-sky-200">
              Non-destructive proposal status
            </div>
            <p className="mt-2 max-w-4xl text-sm font-semibold leading-relaxed text-sky-800 dark:text-sky-100">
              Proposal data is not loaded on this dashboard. A proposal surface
              should label any paper action as paper execution only and call the
              typed paper-execute API for that proposal; this panel only reads
              plan readiness and returned plans.
            </p>
          </div>

          {paperOrderPlansError && (
            <p className="mb-5 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm font-semibold text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
              {paperOrderPlansError}
            </p>
          )}

          {latestPaperOrderPlans.length === 0 ? (
            <div className="rounded-xl border border-white/50 bg-white/40 p-5 text-sm font-semibold text-gray-700 dark:border-white/10 dark:bg-black/20 dark:text-gray-300">
              No paper order plans recorded yet.
            </div>
          ) : (
            <div className="space-y-5">
              {latestPaperOrderPlans.map((plan) => (
                <article
                  key={plan.id}
                  className="rounded-xl border border-white/50 bg-white/40 p-5 dark:border-white/10 dark:bg-black/20"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                          {plan.id}
                        </span>
                        <span
                          className={`${paperOrderPlanStatusClass(
                            plan.status,
                          )} inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase`}
                        >
                          {plan.status}
                        </span>
                        <span className="inline-flex rounded-full border border-primary-500/30 bg-primary-500/10 px-3 py-1 text-xs font-bold uppercase text-primary-700 dark:text-primary-200">
                          {plan.mode}
                        </span>
                      </div>
                      <h4 className="mt-3 text-xl font-bold text-gray-900 dark:text-white">
                        Proposal {plan.proposalId}
                      </h4>
                      <p className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Submitted {formatDateTime(plan.submittedAt)}
                        {plan.completedAt
                          ? `; completed ${formatDateTime(plan.completedAt)}`
                          : "; completion pending"}
                      </p>
                      <div className="mt-3 grid gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        <div>Plan hash: {plan.planHash}</div>
                        <div>Proposal hash: {plan.proposalHash}</div>
                        <div>Idempotency: {plan.idempotencyKey}</div>
                      </div>
                    </div>

                    <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:min-w-96">
                      {[
                        [
                          "Starting equity",
                          formatCurrency(plan.startingEquity),
                        ],
                        ["Ending equity", formatCurrency(plan.endingEquity)],
                        [
                          "Equity change",
                          formatSignedCurrency(
                            plan.endingEquity - plan.startingEquity,
                          ),
                        ],
                        ["Ending cash", formatCurrency(plan.endingCash)],
                      ].map(([label, value]) => (
                        <div
                          key={`${plan.id}-${label}`}
                          className="rounded-lg border border-white/50 bg-white/40 p-3 dark:border-white/10 dark:bg-black/20"
                        >
                          <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                            {label}
                          </div>
                          <div className="mt-1 text-base font-bold text-gray-900 dark:text-white">
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr_0.8fr]">
                    <div className="rounded-lg border border-white/50 bg-white/40 p-4 dark:border-white/10 dark:bg-black/20">
                      <div className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400">
                        Planned orders
                      </div>
                      <div className="mt-3 space-y-3">
                        {plan.orders.map((order) => (
                          <div
                            key={`${plan.id}-${order.symbol}-${order.side}`}
                            className="rounded-lg bg-white/60 p-3 text-sm font-semibold text-gray-800 dark:bg-black/20 dark:text-gray-200"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-mono font-bold">
                                {order.symbol}
                              </span>
                              <span>
                                {order.side}{" "}
                                {formatCurrency(order.requestedNotional)}
                              </span>
                            </div>
                            <div className="mt-2 text-xs uppercase text-gray-500 dark:text-gray-400">
                              {order.orderType} / {order.sourceOrder.assetClass}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/50 bg-white/40 p-4 dark:border-white/10 dark:bg-black/20">
                      <div className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400">
                        Paper fills
                      </div>
                      {plan.fills.length === 0 ? (
                        <p className="mt-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                          No fills recorded for this paper plan.
                        </p>
                      ) : (
                        <div className="mt-3 space-y-3">
                          {plan.fills.map((fill) => (
                            <div
                              key={`${plan.id}-${fill.symbol}-${fill.side}-${fill.status}`}
                              className="rounded-lg bg-white/60 p-3 text-sm font-semibold text-gray-800 dark:bg-black/20 dark:text-gray-200"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-mono font-bold">
                                  {fill.symbol}
                                </span>
                                <span>{fill.status}</span>
                              </div>
                              <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                                <div>
                                  Requested:{" "}
                                  {formatCurrency(fill.requestedNotional)}
                                </div>
                                <div>
                                  Filled: {formatCurrency(fill.filledNotional)}
                                </div>
                                <div>
                                  Price: {formatCurrency(fill.fillPrice)}
                                </div>
                                <div>Fee: {formatCurrency(fill.fee)}</div>
                                <div>
                                  Slippage: {formatCurrency(fill.slippage)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-white/50 bg-white/40 p-4 dark:border-white/10 dark:bg-black/20">
                      <div className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400">
                        Reconciliation
                      </div>
                      <div className="mt-3 space-y-3">
                        {[
                          [
                            "Cash matched",
                            formatBoolean(plan.reconciliation.cashMatched),
                          ],
                          [
                            "Positions matched",
                            formatBoolean(plan.reconciliation.positionsMatched),
                          ],
                          ["Status", plan.reconciliation.status],
                          [
                            "Expected cash",
                            formatCurrency(plan.reconciliation.expectedCash),
                          ],
                          [
                            "Cash diff",
                            formatSignedCurrency(
                              plan.reconciliation.cashDiff ?? 0,
                            ),
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={`${plan.id}-${label}`}
                            className="flex items-center justify-between gap-3 rounded-lg bg-white/60 p-3 text-sm font-semibold text-gray-800 dark:bg-black/20 dark:text-gray-200"
                          >
                            <span>{label}</span>
                            <span className="font-mono font-bold">{value}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4">
                        <div className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                          Notes
                        </div>
                        <ul className="mt-2 space-y-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {plan.reconciliation.notes.map((note) => (
                            <li key={`${plan.id}-${note}`}>{note}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-4">
                        <div className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                          Blocked reasons
                        </div>
                        <p className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                          {plan.blockedReasons.length === 0
                            ? "None reported for this paper plan."
                            : plan.blockedReasons.join(", ")}
                        </p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card p-6 md:p-8">
          <div className="relative z-10">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Default Risk Policy
                </h3>
                <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
                  Current policy limits from the risk gate status contract.
                </p>
              </div>
              <span className={statusBadge("started")}>Deterministic</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["Max gross exposure", `${policy.maxGrossExposurePct}%`],
                ["Max single position", `${policy.maxSinglePositionPct}%`],
                ["Max order notional", formatCurrency(policy.maxOrderNotional)],
                ["Daily loss limit", `${policy.maxDailyLossPct}%`],
                ["Drawdown limit", `${policy.maxDrawdownPct}%`],
                ["Max data age", `${policy.maxDataAgeMinutes} minutes`],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/50 bg-white/40 p-4 dark:border-white/10 dark:bg-black/20"
                >
                  <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    {label}
                  </div>
                  <div className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-white/50 bg-white/40 p-4 dark:border-white/10 dark:bg-black/20">
              <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                Allowed asset classes
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {policy.allowedAssetClasses.map((assetClass) => (
                  <span
                    key={assetClass}
                    className="rounded-full bg-gray-900/10 px-3 py-1 font-mono text-xs font-bold text-gray-800 dark:bg-white/10 dark:text-gray-100"
                  >
                    {assetClass}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 md:p-8">
          <div className="relative z-10">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Example Evaluation
                </h3>
                <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
                  Static docs example; no request is submitted from this view.
                </p>
              </div>
              <span
                className={`${decisionClasses[EXAMPLE_EVALUATION.decision]} inline-flex rounded-full border px-3 py-1 text-xs font-bold`}
              >
                {EXAMPLE_EVALUATION.decision}
              </span>
            </div>

            <div className="space-y-4">
              {[
                ["mode", EXAMPLE_EVALUATION.mode],
                [
                  "brokerExecutionEnabled",
                  formatBoolean(EXAMPLE_EVALUATION.brokerExecutionEnabled),
                ],
                [
                  "requiresHumanApproval",
                  formatBoolean(EXAMPLE_EVALUATION.requiresHumanApproval),
                ],
                [
                  "approvedOrderCount",
                  String(EXAMPLE_EVALUATION.approvedOrderCount),
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/50 bg-white/40 p-4 dark:border-white/10 dark:bg-black/20"
                >
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                    {label}
                  </span>
                  <span className="break-words text-right font-mono text-sm font-bold text-gray-900 dark:text-white">
                    {value}
                  </span>
                </div>
              ))}

              <div className="rounded-xl border border-white/50 bg-white/40 p-4 dark:border-white/10 dark:bg-black/20">
                <div className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                  Sample order
                </div>
                <div className="mt-3 grid gap-3 text-sm font-semibold text-gray-800 dark:text-gray-200 sm:grid-cols-2">
                  <div>Symbol: {exampleOrder.symbol}</div>
                  <div>Side: {exampleOrder.side}</div>
                  <div>Asset: {exampleOrder.assetClass}</div>
                  <div>Notional: {formatCurrency(exampleOrder.notional)}</div>
                  <div>Target: {exampleOrder.targetPositionPct}%</div>
                  <div>Intent: {EXAMPLE_REQUEST.executionIntent}</div>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-400/30 dark:bg-emerald-500/10">
                <div className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
                  Reasons
                </div>
                <p className="mt-2 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
                  {EXAMPLE_EVALUATION.reasons.length === 0
                    ? "No denial or review reasons for this dry-run example."
                    : EXAMPLE_EVALUATION.reasons.join(", ")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="glass-card p-6 md:p-8">
        <div className="relative z-10">
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              Safety Gates
            </h3>
            <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
              Current readiness gates from the autonomous control-plane docs.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {SAFETY_GATES.map((gate) => (
              <div
                key={gate.name}
                className="rounded-xl border border-white/50 bg-white/40 p-5 dark:border-white/10 dark:bg-black/20"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                    {gate.name}
                  </h4>
                  <span className={statusBadge(gate.status)}>
                    {STATUS_LABELS[gate.status]}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium leading-relaxed text-gray-700 dark:text-gray-300">
                  {gate.notes}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="glass-card p-6 md:p-8">
        <div className="relative z-10">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              Autonomous Investing Lifecycle
            </h3>
            <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
              Staged path from safe specification work to a separately reviewed
              tiny live pilot.
            </p>
          </div>

          <div className="space-y-5">
            {CONTROL_PLANE_STAGES.map((stage, index) => (
              <div key={stage.phase} className="relative pl-10">
                {index < CONTROL_PLANE_STAGES.length - 1 && (
                  <div className="absolute left-[13px] top-8 h-full w-0.5 bg-gray-300 dark:bg-white/20" />
                )}
                <div className="absolute left-0 top-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary-400 bg-white text-xs font-bold text-primary-700 dark:bg-slate-900 dark:text-primary-200">
                  {index + 1}
                </div>
                <div className="rounded-xl border border-white/50 bg-white/40 p-5 dark:border-white/10 dark:bg-black/20">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-bold uppercase text-gray-500 dark:text-gray-400">
                        {stage.phase}
                      </div>
                      <h4 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                        {stage.title}
                      </h4>
                    </div>
                    <span className={statusBadge(stage.status)}>
                      {STATUS_LABELS[stage.status]}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-gray-700 dark:text-gray-300">
                    {stage.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ControlPlaneDashboard;
