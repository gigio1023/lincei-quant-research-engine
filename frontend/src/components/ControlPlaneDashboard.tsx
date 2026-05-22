import React, { useEffect, useState } from "react";
import { controlPlaneApi, riskGateApi } from "../services/api";
import {
  ControlPlaneStatus,
  ControlPlaneGateStatus,
  ControlPlaneStage,
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

const formatBoolean = (value: boolean) => (value ? "true" : "false");

const statusBadge = (status: ControlPlaneGateStatus) =>
  `${STATUS_CLASSES[status]} inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase`;

const ControlPlaneDashboard: React.FC = () => {
  const [riskGateStatus, setRiskGateStatus] = useState<RiskGateStatus | null>(
    null,
  );
  const [controlPlaneStatus, setControlPlaneStatus] =
    useState<ControlPlaneStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;

    const fetchStatus = async () => {
      try {
        const [riskStatus, controlStatus] = await Promise.allSettled([
          riskGateApi.getStatus(),
          controlPlaneApi.getStatus(),
        ]);
        if (!ignore) {
          if (riskStatus.status === "fulfilled") {
            setRiskGateStatus(riskStatus.value);
          }

          if (controlStatus.status === "fulfilled") {
            setControlPlaneStatus(controlStatus.value);
          }

          setStatusError(
            riskStatus.status === "rejected" ||
              controlStatus.status === "rejected"
              ? "One or more control-plane status APIs are unavailable."
              : null,
          );
        }
      } catch {
        if (!ignore) {
          setStatusError("Control-plane status APIs are unavailable.");
        }
      } finally {
        if (!ignore) {
          setLoadingStatus(false);
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
  const policy = status.defaultPolicy;
  const exampleOrder = EXAMPLE_REQUEST.orders[0];
  const statusSource = riskGateStatus
    ? "Live API status"
    : loadingStatus
      ? "Loading API status"
      : "Documented fallback";

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
