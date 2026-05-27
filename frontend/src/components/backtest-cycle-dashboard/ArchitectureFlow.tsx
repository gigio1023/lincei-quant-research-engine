import type { CycleStageView } from "./cycleModel";
import { laneClass, stageBadgeClass, stageRailClass } from "./statusStyles";

interface ArchitectureFlowProps {
  stages: CycleStageView[];
}

export const ArchitectureFlow = ({ stages }: ArchitectureFlowProps) => (
  <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold text-white">Architecture Flow</h2>
        <p className="mt-1 text-sm text-[#929aa5]">
          One validation loop from point-in-time source material to a
          fail-closed pre-trade risk check and learning.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase">
        <span className="rounded-md border border-[#2b3139] px-2 py-1 text-[#929aa5]">
          LEAN owns strategy runtime
        </span>
        <span className="rounded-md border border-[#fcd535]/30 px-2 py-1 text-[#fcd535]">
          LLM stays in alpha/risk features
        </span>
      </div>
    </div>

    <div className="mt-4 grid gap-3 lg:grid-cols-9">
      {stages.map((stage, index) => (
        <div key={stage.key} className="relative min-w-0">
          {index > 0 ? (
            <div className="absolute -left-3 top-8 hidden h-px w-3 bg-[#2b3139] lg:block" />
          ) : null}
          <div
            className={`${laneClass[stage.lane]} min-h-40 rounded-lg border p-3`}
          >
            <div
              className={`${stageRailClass[stage.status]} mb-3 h-1 rounded-full`}
            />
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0 text-sm font-bold leading-5 text-white">
                {stage.label}
              </h3>
              <span
                className={`${stageBadgeClass[stage.status]} shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase`}
              >
                {stage.status}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-[#929aa5]">
              {stage.detail}
            </p>
            <p className="mt-3 line-clamp-2 font-mono text-[11px] leading-5 text-[#707a8a]">
              {stage.artifactSummary}
            </p>
          </div>
        </div>
      ))}
    </div>
  </section>
);
