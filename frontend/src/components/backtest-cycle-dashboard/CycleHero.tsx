import type { BacktestCycleDashboardModel } from "./useBacktestCycleDashboard";
import { metricToneClass, stageBadgeClass } from "./statusStyles";

interface CycleHeroProps {
  model: BacktestCycleDashboardModel;
}

export const CycleHero = ({ model }: CycleHeroProps) => {
  const verdict = model.status?.verdict ?? "missing";

  return (
    <section className="rounded-xl border border-[#2b3139] bg-[#181a20]">
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
              read-only
            </span>
          </div>

          <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
            Backtest-Based Architecture Cycle
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#929aa5]">
            This view treats QuantConnect Cloud/LEAN backtest imports as the
            baseline validation artifacts, then shows how alpha, portfolio
            targets, paper trading, shadow trading, pre-trade risk checks, and
            learning should advance without enabling real-money broker writes.
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
        </div>

        <div className="border-t border-[#2b3139] p-5 sm:p-6 lg:border-l lg:border-t-0">
          <div className="grid grid-cols-2 gap-3">
            {model.metrics.map((metric) => (
              <div
                key={metric.label}
                className="min-w-0 rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3"
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
