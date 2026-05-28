import type { CycleGate, CycleStageView } from "./cycleModel";
import { laneClass, stageBadgeClass, stageRailClass } from "./statusStyles";

interface ArchitectureFlowProps {
  stages: CycleStageView[];
}

const GROUPS: Array<{ gate: CycleGate; title: string; subtitle: string }> = [
  {
    gate: "parallel",
    title: "Parallel Research Jobs",
    subtitle: "Independent ingestion, feature, ablation, and validation work.",
  },
  {
    gate: "single-writer",
    title: "Single-Writer Evidence Gates",
    subtitle:
      "One canonical path for targets, risk, execution artifacts, and reconciliation.",
  },
  {
    gate: "deferred",
    title: "Deferred Monetization Paths",
    subtitle: "Broker-write and Darwinex/Zero wait for explicit future specs.",
  },
];

export const ArchitectureFlow = ({ stages }: ArchitectureFlowProps) => (
  <section className="rounded-lg border border-[#2b3139] bg-[#181a20] p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold text-white">Long-Term Spec Flow</h2>
        <p className="mt-1 text-sm text-[#929aa5]">
          Parallel before promotion, single-writer after promotion, deferred for
          account mutation and external-capital fees.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase">
        <span className="rounded-md border border-[#2b3139] px-2 py-1 text-[#929aa5]">
          LEAN owns runtime
        </span>
        <span className="rounded-md border border-[#fcd535]/30 px-2 py-1 text-[#fcd535]">
          LLM remains feature source
        </span>
        <span className="rounded-md border border-[#f6465d]/30 px-2 py-1 text-[#f6465d]">
          broker-write deferred
        </span>
      </div>
    </div>

    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px]">
      {GROUPS.map((group) => (
        <div key={group.gate} className="min-w-0">
          <div className="mb-3">
            <h3 className="text-sm font-bold uppercase text-[#eaecef]">
              {group.title}
            </h3>
            <p className="mt-1 text-xs leading-5 text-[#929aa5]">
              {group.subtitle}
            </p>
          </div>
          <div className="space-y-2">
            {stages
              .filter((stage) => stage.gate === group.gate)
              .map((stage) => (
                <div
                  key={stage.key}
                  className={`${laneClass[stage.lane]} rounded-md border p-3`}
                >
                  <div
                    className={`${stageRailClass[stage.status]} mb-3 h-1 rounded-full`}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase text-[#707a8a]">
                        {stage.lane}
                      </div>
                      <h4 className="mt-1 text-sm font-bold leading-5 text-white">
                        {stage.label}
                      </h4>
                    </div>
                    <span
                      className={`${stageBadgeClass[stage.status]} shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase`}
                    >
                      {stage.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-[#929aa5]">
                    {stage.artifactSummary}
                  </p>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  </section>
);
