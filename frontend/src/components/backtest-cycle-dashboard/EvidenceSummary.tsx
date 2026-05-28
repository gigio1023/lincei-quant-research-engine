import type { BacktestCycleDashboardModel } from "./useBacktestCycleDashboard";
import { stageBadgeClass } from "./statusStyles";

interface EvidenceSummaryProps {
  model: BacktestCycleDashboardModel;
}

export const EvidenceSummary = ({ model }: EvidenceSummaryProps) => {
  const status = model.status;

  return (
    <section className="rounded-lg border border-[#2b3139] bg-[#181a20] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Evidence Summary</h2>
          <p className="mt-1 text-sm text-[#929aa5]">
            Current stored state behind the active milestone.
          </p>
        </div>
        <span
          className={`${stageBadgeClass[status?.verdict ?? "missing"]} rounded-md border px-2 py-1 text-[11px] font-bold uppercase`}
        >
          {model.loading ? "loading" : (status?.verdict ?? "missing")}
        </span>
      </div>

      <div className="mt-4 divide-y divide-[#2b3139] text-sm">
        <Row
          label="Milestone"
          value={
            status
              ? `${status.currentMilestone.readyStageCount}/${status.currentMilestone.currentStageCount} ready`
              : "missing"
          }
        />
        <Row
          label="Variants"
          value={
            status
              ? `${status.research.variantJobCount} retained / ${status.research.failedOrBlockedVariantJobCount} rejected`
              : "missing"
          }
        />
        <Row label="LEAN run" value={status?.leanRun?.runId ?? "missing"} />
        <Row label="Cloud run" value={status?.cloudRun?.runId ?? "missing"} />
        <Row
          label="Project"
          value={status?.leanRun?.projectName ?? "aggressive_llm_momentum"}
        />
        <Row
          label="Alpha"
          value={
            status
              ? `numeric ${status.alpha.numericDecisionCount} / llm ${status.alpha.llmDecisionCount} / meta ${status.alpha.metaDecisionCount}`
              : "missing"
          }
        />
        <Row
          label="Portfolio"
          value={`${status?.portfolioTarget.targetCount ?? 0} targets / gross ${status?.portfolioTarget.grossExposurePct ?? 0}%`}
        />
        <Row
          label="Current paper"
          value={`${status?.paper.status ?? "missing"} / fills ${status?.paper.fillCount ?? 0}`}
        />
        <Row
          label="Paper replay"
          value={
            status?.paper.replayPlanId
              ? `${status.paper.replayStatus ?? "unknown"} / ${status.paper.replayReconciliationStatus ?? "unknown"}`
              : "missing"
          }
        />
        <Row
          label="Broker"
          value={`${status?.broker.provider ?? "none"} / open orders ${status?.broker.openOrderCount ?? 0}`}
        />
        <Row
          label="Deferred"
          value={`${status?.currentMilestone.deferredStageCount ?? 0} future stages`}
        />
      </div>

      <div className="mt-4 rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
        <div className="text-[11px] font-bold uppercase text-[#707a8a]">
          Next safe action
        </div>
        <ul className="mt-2 space-y-1 text-sm leading-6 text-[#fcd535]">
          {(status?.nextActions ?? ["Load status API."]).map((action) => (
            <li key={action}>{action}</li>
          ))}
        </ul>
      </div>
    </section>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-start justify-between gap-4 py-2">
    <span className="shrink-0 text-[#707a8a]">{label}</span>
    <span className="min-w-0 text-right font-mono font-semibold text-[#eaecef]">
      {value}
    </span>
  </div>
);
