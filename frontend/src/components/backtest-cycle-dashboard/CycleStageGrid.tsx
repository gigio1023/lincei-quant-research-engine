import type { CycleStageView } from "./cycleModel";
import { laneClass, stageBadgeClass } from "./statusStyles";

interface CycleStageGridProps {
  stages: CycleStageView[];
}

export const CycleStageGrid = ({ stages }: CycleStageGridProps) => (
  <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-bold text-white">Cycle Stages</h2>
        <p className="mt-1 text-sm text-[#929aa5]">
          Each card maps to one executable command or imported artifact
          boundary.
        </p>
      </div>
    </div>

    <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
      {stages.map((stage) => (
        <article
          key={stage.key}
          className={`${laneClass[stage.lane]} rounded-lg border p-4`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase text-[#707a8a]">
                {stage.lane}
              </div>
              <h3 className="mt-1 text-base font-bold text-white">
                {stage.label}
              </h3>
            </div>
            <span
              className={`${stageBadgeClass[stage.status]} shrink-0 rounded-md border px-2 py-1 text-[11px] font-bold uppercase`}
            >
              {stage.status}
            </span>
          </div>

          <p className="mt-3 text-sm leading-6 text-[#929aa5]">
            {stage.artifactSummary}
          </p>

          {stage.blockers.length > 0 ? (
            <ul className="mt-3 space-y-1 text-xs leading-5 text-[#fcd535]">
              {stage.blockers.slice(0, 3).map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs font-semibold uppercase text-[#0ecb81]">
              Artifacts ready
            </p>
          )}

          <div className="mt-4 rounded-md border border-[#2b3139] bg-[#0b0e11] p-3 font-mono text-[11px] leading-5 text-[#eaecef]">
            {stage.command}
          </div>
        </article>
      ))}
    </div>
  </section>
);
