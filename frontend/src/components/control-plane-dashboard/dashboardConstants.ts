import {
  ControlPlaneStage,
  ControlPlaneStatus,
  ExecutionControlState,
  RunBaselineResearchRequest,
  RiskGateRequest,
  RiskGateResponse,
  RiskGateStatus,
  RiskPolicy,
  SafetyGate,
} from "../../types";
export {
  DOCUMENTED_BROKER_SNAPSHOTS,
  DOCUMENTED_ORDER_PLAN_APPROVALS,
  DOCUMENTED_PAPER_ACCOUNT_EVENTS,
  DOCUMENTED_PAPER_ORDER_PLANS,
  DOCUMENTED_RESEARCH_RUNS,
} from "./dashboardSamples";

export const DEFAULT_POLICY: RiskPolicy = {
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

export const DOCUMENTED_STATUS: RiskGateStatus = {
  brokerExecutionEnabled: false,
  liveTradingEnabled: false,
  defaultPolicy: DEFAULT_POLICY,
};

export const DOCUMENTED_CONTROL_PLANE_STATUS: ControlPlaneStatus = {
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
        "Paper simulator ledger exists; broker-grade paper readiness is blocked by production signing custody and broker reconciliation",
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
      detail: "Execution control state defaults to active",
    },
    {
      key: "signedOrderPlanApprovalReady",
      ready: true,
      detail: "Documented signed order-plan approval sample is available",
    },
    {
      key: "brokerReadOnlyReady",
      ready: false,
      detail:
        "Live broker adapter is not implemented; read-only snapshot ledger is available",
    },
    {
      key: "brokerSnapshotLedgerReady",
      ready: true,
      detail: "Documented broker read-only snapshot sample is available",
    },
    {
      key: "liveTradingReady",
      ready: false,
      detail: "Live trading is blocked",
    },
  ],
  blockers: [
    "No verified Toss read-only adapter schema or credentials",
    "No production signed order-plan workflow",
    "No broker reconciliation loop",
    "No production kill switch runtime",
  ],
};

export const DOCUMENTED_EXECUTION_CONTROL: ExecutionControlState = {
  id: "execution-control-docs-active",
  state: "active",
  actor: "system",
  reason: "Documented paper simulation state. No broker order path is enabled.",
  createdAt: "2026-05-22T09:00:00.000Z",
};

export const BASELINE_RESEARCH_REQUEST: RunBaselineResearchRequest = {
  objective: "Run deterministic dry-run momentum baseline backtest",
  strategyFamily: "cross-sectional momentum",
  symbol: "005930",
  benchmark: "KOSPI 200 total return proxy",
  initialCapital: 10_000_000,
};

export const EXAMPLE_REQUEST: RiskGateRequest = {
  mode: "dry_run",
  actor: "strategy",
  generatedAt: "2026-05-22T12:00:00.000Z",
  marketDataTimestamp: "2026-05-22T11:45:00.000Z",
  executionIntent: "evaluate_only",
  portfolio: {
    currency: "KRW",
    equity: 10_000_000,
    cash: 9_000_000,
    grossExposurePct: 10,
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

export const EXAMPLE_EVALUATION: RiskGateResponse = {
  decision: "ALLOW",
  evaluatedAt: "2026-05-22T12:00:00.000Z",
  mode: "dry_run",
  brokerExecutionEnabled: false,
  requiresHumanApproval: false,
  reasons: [],
  policy: DEFAULT_POLICY,
  approvedOrderCount: 1,
};

export const SAFETY_GATES: SafetyGate[] = [
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
    name: "Paper execution",
    status: "partial",
    notes:
      "Paper simulator ledger, durable paper account, fills, and plan-scoped reconciliation exist; signed plans and broker reconciliation are still missing.",
  },
  {
    name: "Signed approvals",
    status: "partial",
    notes:
      "Durable paper order-plan approvals exist; production signing and live custody review are still missing.",
  },
  {
    name: "Broker read-only",
    status: "partial",
    notes:
      "Read-only broker snapshot ledger and paper reconciliation exist; a verified Toss adapter is still missing.",
  },
  {
    name: "Live trading",
    status: "blocked",
    notes: "No real-money order path is implemented in this repository.",
  },
];

export const CONTROL_PLANE_STAGES: ControlPlaneStage[] = [
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
    status: "partial",
    description:
      "Manual read-only broker snapshots and paper-account reconciliation without any callable order endpoint.",
  },
  {
    phase: "Phase 5",
    title: "Tiny live pilot",
    status: "blocked",
    description:
      "Separate design review, tiny budget cap, explicit approval, and immediate kill switch.",
  },
];
