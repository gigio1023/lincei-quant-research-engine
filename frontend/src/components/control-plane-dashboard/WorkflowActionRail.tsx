import { paperOrderPlanStatusClass } from "./dashboardFormat";
import { DashboardModel, WorkflowStage } from "./useControlPlaneDashboard";

interface WorkflowActionRailProps {
  model: DashboardModel;
}

export const WorkflowActionRail = ({ model }: WorkflowActionRailProps) => (
  <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 className="text-base font-bold text-white">
          Autonomous Action Chain
        </h3>
        <p className="mt-1 text-xs font-semibold text-[#707a8a]">
          Budget / research / proposal / risk / approval / paper / broker
        </p>
      </div>
      <div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase">
        <span className="rounded-md border border-[#2b3139] bg-[#0b0e11] px-2 py-1 text-[#929aa5]">
          {model.sources.budgets}
        </span>
        <span className="rounded-md border border-[#2b3139] bg-[#0b0e11] px-2 py-1 text-[#929aa5]">
          {model.sources.proposals}
        </span>
        <span className="rounded-md border border-[#2b3139] bg-[#0b0e11] px-2 py-1 text-[#929aa5]">
          {model.sources.riskEvaluations}
        </span>
      </div>
    </div>

    {[
      model.errors.budgets,
      model.errors.proposals,
      model.errors.riskEvaluations,
    ]
      .filter(Boolean)
      .map((error) => (
        <div
          key={`workflow-error-${error}`}
          className="mb-3 rounded-lg border border-[#f0b90b]/30 bg-[#f0b90b]/10 p-3 text-xs font-semibold text-[#fcd535]"
        >
          {error}
        </div>
      ))}

    <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
      {model.workflowStages.map((stage, index) => (
        <WorkflowStageCard
          key={`workflow-stage-${stage.key}`}
          stage={stage}
          index={index}
        />
      ))}
    </div>
  </section>
);

const WorkflowStageCard = ({
  stage,
  index,
}: {
  stage: WorkflowStage;
  index: number;
}) => (
  <div className="min-h-[148px] rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
    <div className="flex items-center justify-between gap-2">
      <span className="font-mono text-xs font-bold text-[#707a8a]">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span
        className={`${paperOrderPlanStatusClass(
          stage.status,
        )} rounded-md border px-2 py-1 text-[10px] font-bold uppercase`}
      >
        {stage.status}
      </span>
    </div>
    <div className="mt-3 text-sm font-bold text-white">{stage.label}</div>
    <div className="mt-2 min-h-[36px] text-xs font-semibold leading-5 text-[#eaecef]">
      {stage.detail}
    </div>
    <div className="mt-3 truncate font-mono text-[11px] text-[#707a8a]">
      {stage.source}
    </div>
    <div
      className={`mt-3 h-1 rounded-full ${
        stage.ready
          ? "bg-[#0ecb81]"
          : stage.blocked
            ? "bg-[#f6465d]"
            : "bg-[#fcd535]"
      }`}
    />
  </div>
);
