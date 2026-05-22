import { DashboardModel } from "./useControlPlaneDashboard";
import { EXAMPLE_REQUEST } from "./dashboardConstants";
import { formatBoolean } from "./dashboardFormat";

interface DashboardHeaderProps {
  model: DashboardModel;
}

export const DashboardHeader = ({ model }: DashboardHeaderProps) => {
  const summaryStats = [
    [
      "brokerExecutionEnabled",
      formatBoolean(model.status.brokerExecutionEnabled),
      "text-[#f6465d]",
    ],
    [
      "liveTradingEnabled",
      formatBoolean(model.status.liveTradingEnabled),
      "text-[#f6465d]",
    ],
    [
      "Intent",
      EXAMPLE_REQUEST.executionIntent ?? "evaluate_only",
      "text-white",
    ],
    ["Blockers", String(model.controlStatus.blockers.length), "text-[#fcd535]"],
  ];

  return (
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
              {model.sources.status}
            </span>
          </div>

          <h2 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
            Control Plane Dashboard
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[#929aa5]">
            One-page operating surface for autonomous research, deterministic
            risk, paper account state, and promotion blockers. The only callable
            action here is a dry-run research backtest.
          </p>
        </div>

        <div className="border-t border-[#2b3139] p-5 sm:p-6 lg:border-l lg:border-t-0">
          <div className="grid grid-cols-2 gap-3">
            {summaryStats.map(([label, value, className]) => (
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
  );
};
