import type {
  V1PilotSystemStatus,
  V1SystemStage,
  V1SystemStageStatus,
} from "../../types/v1Pilot";

export interface CycleStageDefinition {
  key: string;
  label: string;
  lane: "data" | "alpha" | "lean" | "execution" | "learning";
  sourceStageKey?: string;
  detail: string;
  command: string;
}

export interface CycleStageView extends CycleStageDefinition {
  status: V1SystemStageStatus;
  evidence: string;
  blockers: string[];
}

export interface CycleMetric {
  label: string;
  value: string;
  tone: "neutral" | "positive" | "warning" | "danger";
}

export const CYCLE_STAGES: CycleStageDefinition[] = [
  {
    key: "semantic_data",
    label: "Semantic Evidence",
    lane: "data",
    detail: "Timestamped macro/news/filing text becomes replayable evidence.",
    command:
      "./scripts/ingest-semantic-evidence --source hf-fomc-statements-minutes",
  },
  {
    key: "feature_store",
    label: "Feature Store",
    lane: "data",
    sourceStageKey: "feature_store",
    detail: "Point-in-time numeric and semantic features are stored.",
    command: "./scripts/run-alpha-cycle",
  },
  {
    key: "alpha_decisions",
    label: "Alpha Decisions",
    lane: "alpha",
    sourceStageKey: "alpha_decisions",
    detail: "Numeric alpha, LLM alpha, and meta alpha produce typed decisions.",
    command: "./scripts/run-alpha-cycle",
  },
  {
    key: "cloud_backtest",
    label: "Cloud/LEAN Backtest Evidence",
    lane: "lean",
    sourceStageKey: "lean_backtest",
    detail: "Cloud/LEAN artifacts become the strategy evidence baseline.",
    command:
      "./scripts/run-v1-cycle --skip-alpha-cycle --skip-market-data-ingest --no-download-data",
  },
  {
    key: "portfolio_targets",
    label: "Portfolio Targets",
    lane: "lean",
    sourceStageKey: "portfolio_targets",
    detail: "LEAN insights are converted into auditable target snapshots.",
    command: "./scripts/import-lean-run latest",
  },
  {
    key: "paper_execution",
    label: "Paper Execution",
    lane: "execution",
    sourceStageKey: "paper_execution",
    detail: "Targets become paper/live-shadow order intent and fill evidence.",
    command: "./scripts/run-paper-cycle",
  },
  {
    key: "broker_boundary",
    label: "Broker Boundary",
    lane: "execution",
    sourceStageKey: "broker_read_only",
    detail: "Broker evidence stays read-only until a future live-money spec.",
    command: "./scripts/run-live-shadow",
  },
  {
    key: "preflight",
    label: "Live Preflight",
    lane: "execution",
    sourceStageKey: "live_preflight",
    detail: "Unknown, stale, or unsafe state stays blocked.",
    command: "./scripts/live-preflight",
  },
  {
    key: "learning",
    label: "Learning Loop",
    lane: "learning",
    detail: "Backtest, paper, and shadow outcomes feed promotion/rejection.",
    command: "./scripts/run-learning-loop",
  },
];

export const CYCLE_RUNBOOK = [
  {
    label: "Run no-paid local cycle smoke",
    command:
      "./scripts/run-v1-cycle --skip-alpha-cycle --skip-market-data-ingest --no-download-data",
    evidence:
      "local LEAN run, imported targets, paper blocker, preflight blocker",
  },
  {
    label: "Import cloud baseline",
    command:
      "./scripts/import-cloud-backtest --project-id 32077023 --backtest-id <id>",
    evidence: "cloud run id, insights, orders, fills, portfolio targets",
  },
  {
    label: "Replay alpha features",
    command: "./scripts/ingest-semantic-evidence && ./scripts/run-alpha-cycle",
    evidence: "feature snapshots, LLM event features, alpha decisions",
  },
  {
    label: "Bridge into execution evidence",
    command: "./scripts/run-paper-cycle || ./scripts/run-paper-replay",
    evidence: "paper order plan, fills, reconciliation status",
  },
  {
    label: "Record broker-safe shadow path",
    command: "./scripts/run-live-shadow && ./scripts/live-preflight",
    evidence: "would-have-traded record, fail-closed preflight blockers",
  },
  {
    label: "Review promotion evidence",
    command: "./scripts/run-learning-loop",
    evidence: "promotion decision, blockers, retained failed decisions",
  },
];

export const buildCycleStages = (
  status: V1PilotSystemStatus | null,
): CycleStageView[] =>
  CYCLE_STAGES.map((stage) => {
    const sourceStage = findSourceStage(status, stage.sourceStageKey);
    const derived = deriveStageStatus(status, stage.key);
    return {
      ...stage,
      status: sourceStage?.status ?? derived.status,
      evidence: sourceStage?.detail ?? derived.evidence,
      blockers: sourceStage?.blockers ?? derived.blockers,
    };
  });

export const buildCycleMetrics = (
  status: V1PilotSystemStatus | null,
): CycleMetric[] => [
  {
    label: "Backtest",
    value: status?.leanRun?.runId ?? "missing",
    tone: status?.leanRun ? "positive" : "warning",
  },
  {
    label: "Alpha N/L/M",
    value: status
      ? `${status.alpha.numericDecisionCount}/${status.alpha.llmDecisionCount}/${status.alpha.metaDecisionCount}`
      : "0/0/0",
    tone:
      status &&
      status.alpha.numericDecisionCount > 0 &&
      status.alpha.llmDecisionCount > 0 &&
      status.alpha.metaDecisionCount > 0
        ? "positive"
        : "warning",
  },
  {
    label: "Targets",
    value: String(status?.portfolioTarget.targetCount ?? 0),
    tone: status?.portfolioTarget.targetCount ? "positive" : "warning",
  },
  {
    label: "Paper",
    value: paperMetricValue(status),
    tone:
      status?.paper.reconciliationStatus === "matched" ? "positive" : "warning",
  },
  {
    label: "Preflight",
    value: status?.preflight.status ?? "blocked",
    tone: status?.preflight.status === "ready" ? "positive" : "danger",
  },
];

const paperMetricValue = (status: V1PilotSystemStatus | null): string => {
  if (!status) {
    return "missing";
  }
  if (status.paper.planId) {
    return `${status.paper.status}/${status.paper.reconciliationStatus ?? "unknown"}`;
  }
  if (status.paper.replayPlanId) {
    return `replay/${status.paper.replayReconciliationStatus ?? "unknown"}`;
  }
  return "missing";
};

const findSourceStage = (
  status: V1PilotSystemStatus | null,
  sourceStageKey: string | undefined,
): V1SystemStage | undefined =>
  sourceStageKey
    ? status?.stages.find((stage) => stage.key === sourceStageKey)
    : undefined;

const deriveStageStatus = (
  status: V1PilotSystemStatus | null,
  stageKey: string,
): { status: V1SystemStageStatus; evidence: string; blockers: string[] } => {
  if (!status) {
    return {
      status: "missing",
      evidence: "Status API has not returned yet.",
      blockers: ["Load /v1-pilot/status."],
    };
  }

  if (stageKey === "semantic_data") {
    return status.alpha.llmDecisionCount > 0
      ? {
          status: "ready",
          evidence: `${status.alpha.llmDecisionCount} LLM alpha decisions available`,
          blockers: [],
        }
      : {
          status: "blocked",
          evidence: "No LLM alpha decisions are available yet.",
          blockers: ["Ingest timestamped semantic evidence and rerun alpha."],
        };
  }

  if (stageKey === "learning") {
    const ready = status.leanRun && status.portfolioTarget.targetCount > 0;
    return ready
      ? {
          status: "blocked",
          evidence:
            "Learning loop can run, but promotion stays evidence-gated.",
          blockers: status.nextActions.slice(0, 2),
        }
      : {
          status: "missing",
          evidence: "Backtest evidence is missing.",
          blockers: ["Import a passing LEAN/Cloud backtest first."],
        };
  }

  return {
    status: "missing",
    evidence: "No mapped evidence.",
    blockers: [],
  };
};
