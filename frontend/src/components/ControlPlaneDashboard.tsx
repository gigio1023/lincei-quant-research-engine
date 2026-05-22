import { AutonomousRunLedger } from "./control-plane-dashboard/AutonomousRunLedger";
import { BrokerSnapshotPanel } from "./control-plane-dashboard/BrokerSnapshotPanel";
import { DashboardHeader } from "./control-plane-dashboard/DashboardHeader";
import { PaperExecutionPanel } from "./control-plane-dashboard/PaperExecutionPanel";
import { ReadinessPanel } from "./control-plane-dashboard/ReadinessPanel";
import { ResearchLedgerPanel } from "./control-plane-dashboard/ResearchLedgerPanel";
import { RightRail } from "./control-plane-dashboard/RightRail";
import { WorkflowActionRail } from "./control-plane-dashboard/WorkflowActionRail";
import { useControlPlaneDashboard } from "./control-plane-dashboard/useControlPlaneDashboard";

const ControlPlaneDashboard = () => {
  const model = useControlPlaneDashboard();

  return (
    <div className="relative left-1/2 min-h-screen w-screen -translate-x-1/2 bg-[#0b0e11] px-4 py-4 text-[#eaecef] sm:px-5 lg:px-6">
      <div className="mx-auto max-w-[1440px] space-y-4">
        <DashboardHeader model={model} />
        <WorkflowActionRail model={model} />
        <AutonomousRunLedger model={model} />
        <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr_0.72fr]">
          <ReadinessPanel model={model} />
          <div className="space-y-4">
            <ResearchLedgerPanel model={model} />
            <PaperExecutionPanel model={model} />
            <BrokerSnapshotPanel model={model} />
          </div>
          <RightRail model={model} />
        </section>
      </div>
    </div>
  );
};

export default ControlPlaneDashboard;
