import { BASELINE_RESEARCH_REQUEST } from "./dashboardConstants";
import { type ReactNode } from "react";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatSignedPercent,
  formatWindow,
  researchRunStatusClass,
} from "./dashboardFormat";
import { DashboardModel } from "./useControlPlaneDashboard";

interface ResearchLedgerPanelProps {
  model: DashboardModel;
}

export const ResearchLedgerPanel = ({ model }: ResearchLedgerPanelProps) => (
  <section className="rounded-xl border border-[#2b3139] bg-[#181a20]">
    <div className="flex flex-col gap-3 border-b border-[#2b3139] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 className="text-base font-bold text-white">Research Run Ledger</h3>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-[#929aa5]">
            {model.sources.researchRuns}
          </span>
          <span className="font-bold text-[#f6465d]">Broker disabled</span>
        </div>
      </div>
      <button
        type="button"
        onClick={model.runBaselineResearch}
        disabled={model.loading.researchRuns || model.runningBaselineResearch}
        className="h-10 rounded-md bg-[#fcd535] px-4 text-sm font-bold text-[#181a20] transition hover:bg-[#f0b90b] disabled:cursor-not-allowed disabled:bg-[#3a3a1f] disabled:text-[#707a8a]"
      >
        {model.runningBaselineResearch
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
            {formatCurrency(BASELINE_RESEARCH_REQUEST.initialCapital ?? 0)}
          </span>
        </div>
      </div>

      {model.baselineResearchSuccess && (
        <Notice tone="green">{model.baselineResearchSuccess}</Notice>
      )}
      {model.errors.baselineResearch && (
        <Notice tone="red">{model.errors.baselineResearch}</Notice>
      )}
      {model.errors.researchRuns && (
        <Notice tone="yellow">{model.errors.researchRuns}</Notice>
      )}

      {model.visibleResearchRuns.length === 0 ? (
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
              {model.visibleResearchRuns.slice(0, 5).map((run) => (
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
                  </td>
                  <td className="py-3 pr-4 align-top">
                    <div className="font-mono text-lg font-bold text-[#0ecb81]">
                      {formatSignedPercent(run.backtestMetrics.totalReturnPct)}
                    </div>
                    <div className="text-xs text-[#707a8a]">
                      Sharpe {formatNumber(run.backtestMetrics.sharpeRatio)} /{" "}
                      Trades {run.backtestMetrics.tradeCount}
                    </div>
                  </td>
                  <td className="py-3 pr-4 align-top font-mono text-sm text-[#eaecef]">
                    {formatSignedPercent(
                      run.backtestMetrics.benchmarkReturnPct,
                    )}
                  </td>
                  <td className="py-3 pr-4 align-top font-mono text-sm text-[#f6465d]">
                    {formatPercent(run.backtestMetrics.maxDrawdownPct)}
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
                            {datasetRef.id} / {datasetRef.source}
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
);

const Notice = ({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "green" | "red" | "yellow";
}) => {
  const toneClass = {
    green: "border-[#0ecb81]/30 bg-[#0ecb81]/10 text-[#0ecb81]",
    red: "border-[#f6465d]/30 bg-[#f6465d]/10 text-[#f6465d]",
    yellow: "border-[#f0b90b]/30 bg-[#f0b90b]/10 text-[#fcd535]",
  }[tone];

  return (
    <div
      className={`mb-3 rounded-lg border p-3 text-xs font-semibold ${toneClass}`}
    >
      {children}
    </div>
  );
};
