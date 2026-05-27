import type { BacktestCycleDashboardModel } from "./useBacktestCycleDashboard";
import { metricToneClass, stageBadgeClass } from "./statusStyles";

interface CycleHeroProps {
  model: BacktestCycleDashboardModel;
}

export const CycleHero = ({ model }: CycleHeroProps) => {
  const verdict = model.status?.currentMilestone.verdict ?? "missing";
  const milestone = model.status?.currentMilestone;

  return (
    <section className="rounded-lg border border-[#2b3139] bg-[#181a20]">
      <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-[#fcd535] px-2 py-1 text-[11px] font-bold uppercase text-[#181a20]">
              Backtest Cycle
            </span>
            <span
              className={`${stageBadgeClass[verdict]} rounded-md border px-2 py-1 text-[11px] font-bold uppercase`}
            >
              {verdict}
            </span>
            <span className="rounded-md border border-[#2b3139] bg-[#0b0e11] px-2 py-1 text-[11px] font-bold uppercase text-[#929aa5]">
              current milestone
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
            Self-Funded Capital Evidence Loop
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#929aa5]">
            Current work should move research hypotheses into retained variants,
            point-in-time features, LEAN/QuantConnect Cloud validation, paper
            trading or shadow trading artifacts, reconciliation, and learning.
            Broker-write and Darwinex/Zero work stay deferred until this
            evidence is defensible.
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void model.refresh()}
              className="h-10 rounded-md bg-[#fcd535] px-4 text-sm font-bold text-[#181a20] hover:bg-[#f0b90b]"
            >
              Refresh Status
            </button>
            <span className="flex h-10 items-center rounded-md border border-[#2b3139] bg-[#0b0e11] px-3 font-mono text-xs text-[#929aa5]">
              {model.status?.checkedAt ?? "status not loaded"}
            </span>
          </div>

          {model.primaryBlockers.length > 0 ? (
            <div className="mt-5 rounded-lg border border-[#f0b90b]/30 bg-[#f0b90b]/10 p-3">
              <div className="text-[11px] font-bold uppercase text-[#fcd535]">
                Current blockers
              </div>
              <ul className="mt-2 space-y-1 text-sm leading-6 text-[#eaecef]">
                {model.primaryBlockers.slice(0, 3).map((blocker) => (
                  <li key={blocker}>{blocker}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="border-t border-[#2b3139] p-5 sm:p-6 lg:border-l lg:border-t-0">
          {milestone ? (
            <div className="mb-3 rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
              <div className="text-[11px] font-semibold uppercase text-[#707a8a]">
                {milestone.label}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center font-mono text-sm font-bold">
                <span className="rounded-md bg-[#0ecb81]/10 px-2 py-2 text-[#0ecb81]">
                  {milestone.readyStageCount} ready
                </span>
                <span className="rounded-md bg-[#f0b90b]/10 px-2 py-2 text-[#fcd535]">
                  {milestone.blockedStageCount} blocked
                </span>
                <span className="rounded-md bg-[#707a8a]/10 px-2 py-2 text-[#929aa5]">
                  {milestone.deferredStageCount} deferred
                </span>
              </div>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            {model.metrics.map((metric) => (
              <div
                key={metric.label}
                className="min-w-0 rounded-md border border-[#2b3139] bg-[#0b0e11] p-3"
              >
                <div className="text-[11px] font-semibold uppercase text-[#707a8a]">
                  {metric.label}
                </div>
                <div
                  className={`mt-2 truncate font-mono text-lg font-bold ${metricToneClass[metric.tone]}`}
                >
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
          {model.error ? (
            <p className="mt-3 rounded-lg border border-[#f6465d]/30 bg-[#f6465d]/10 p-3 text-sm text-[#f6465d]">
              {model.error}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
};
