/** Read-only V1 validation-loop status for operators; does not trigger execution. */
import { useEffect, useState } from "react";
import { v1PilotApi } from "../../services/api";
import type {
  V1PilotSystemStatus,
  V1SystemStageStatus,
} from "../../types/v1Pilot";

const stageClass: Record<V1SystemStageStatus, string> = {
  ready: "border-[#0ecb81]/30 bg-[#0ecb81]/10 text-[#0ecb81]",
  blocked: "border-[#f0b90b]/30 bg-[#f0b90b]/10 text-[#fcd535]",
  missing: "border-[#707a8a]/30 bg-[#707a8a]/10 text-[#929aa5]",
};

const compactId = (value: string | number | undefined) =>
  value === undefined ? "none" : String(value);

export const V1PilotPanel = () => {
  const [status, setStatus] = useState<V1PilotSystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    v1PilotApi
      .getStatus()
      .then(setStatus)
      .catch((fetchError: Error) => setError(fetchError.message));
  }, []);

  return (
    <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4">
      <h3 className="text-base font-bold text-white">V1 Validation Loop</h3>
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      {status ? (
        <div className="mt-3 space-y-3 text-sm text-[#b7bdc6]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase text-[#707a8a]">
                current milestone verdict
              </div>
              <div className="mt-1 font-mono text-sm font-bold text-white">
                {status.leanRun?.runId ?? "no-lean-run"}
              </div>
            </div>
            <span
              className={`${stageClass[status.verdict]} rounded-md border px-2 py-1 text-[11px] font-bold uppercase`}
            >
              {status.verdict}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs">
            <Metric
              label="ready stages"
              value={`${status.currentMilestone.readyStageCount}/${status.currentMilestone.currentStageCount}`}
            />
            <Metric
              label="blocked"
              value={status.currentMilestone.blockedStageCount}
            />
            <Metric
              label="deferred"
              value={status.currentMilestone.deferredStageCount}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <Metric
              label="research"
              value={`${status.research.p1CandidateCount}/${status.research.hypothesisCount}`}
            />
            <Metric label="alpha" value={alphaSummary(status)} />
            <Metric
              label="targets"
              value={status.portfolioTarget.targetCount}
            />
            <Metric
              label="paper"
              value={`${status.paper.status}/${status.paper.reconciliationStatus ?? "none"}`}
            />
            <Metric
              label="broker"
              value={`${status.broker.provider ?? "none"}/${status.broker.snapshotReconciliationStatus ?? "none"}`}
            />
            <Metric label="open orders" value={status.broker.openOrderCount} />
            <Metric label="pre-trade check" value={status.preflight.status} />
            <Metric
              label="variants"
              value={`${status.research.variantJobCount}/${status.research.failedOrBlockedVariantJobCount}`}
            />
          </div>

          <ol className="space-y-2">
            {status.stages.map((stage) => (
              <li
                key={stage.key}
                className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-[#eaecef]">
                      {stage.label}
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase text-[#707a8a]">
                      {stage.scope}
                      {stage.blocksCurrentMilestone ? " / current blocker" : ""}
                    </div>
                    <div className="mt-1 truncate font-mono text-[11px] text-[#929aa5]">
                      {stage.detail}
                    </div>
                  </div>
                  <span
                    className={`${stageClass[stage.status]} shrink-0 rounded-md border px-2 py-1 text-[10px] font-bold uppercase`}
                  >
                    {stage.status}
                  </span>
                </div>
                {stage.blockers.length > 0 ? (
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[#fcd535]">
                    {stage.blockers.slice(0, 2).map((blocker) => (
                      <li key={blocker}>{blocker}</li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ol>

          <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3 text-xs">
            <div className="font-bold uppercase text-[#707a8a]">
              next actions
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[#eaecef]">
              {status.nextActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </div>

          <div className="grid gap-1 text-[11px] text-[#707a8a]">
            <span>checked {status.checkedAt}</span>
            <span>
              paper plan {compactId(status.paper.planId)} / broker snapshot{" "}
              {compactId(status.broker.snapshotId)}
            </span>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm text-[#707a8a]">
          Loading V1 validation status...
        </p>
      )}
    </section>
  );
};

const Metric = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className="min-w-0 rounded-lg border border-[#2b3139] bg-[#0b0e11] p-2">
    <div className="text-[10px] font-bold uppercase text-[#707a8a]">
      {label}
    </div>
    <div className="mt-1 truncate font-mono font-bold text-[#eaecef]">
      {value}
    </div>
  </div>
);

const alphaSummary = (status: V1PilotSystemStatus) =>
  `${status.alpha.numericDecisionCount}/${status.alpha.llmDecisionCount}/${status.alpha.metaDecisionCount}`;
