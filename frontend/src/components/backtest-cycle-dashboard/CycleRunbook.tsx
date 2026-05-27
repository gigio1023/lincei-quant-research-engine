import { CYCLE_RUNBOOK } from "./cycleModel";

export const CycleRunbook = () => (
  <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4">
    <h2 className="text-lg font-bold text-white">One-Cycle Runbook</h2>
    <p className="mt-1 text-sm leading-6 text-[#929aa5]">
      These commands avoid paid local QuantConnect data downloads by treating
      Cloud backtest import as the strategy validation anchor.
    </p>

    <ol className="mt-4 space-y-3">
      {CYCLE_RUNBOOK.map((step, index) => (
        <li
          key={step.label}
          className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#fcd535] font-mono text-xs font-black text-[#181a20]">
              {index + 1}
            </span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-white">{step.label}</div>
              <div className="mt-2 rounded-md border border-[#2b3139] bg-[#181a20] p-2 font-mono text-[11px] leading-5 text-[#eaecef]">
                {step.command}
              </div>
              <p className="mt-2 text-xs leading-5 text-[#929aa5]">
                {step.evidence}
              </p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  </section>
);
