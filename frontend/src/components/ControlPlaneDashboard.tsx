import { AutonomousRunLedger } from "./control-plane-dashboard/AutonomousRunLedger";
import { AutonomousActionStatusPanel } from "./control-plane-dashboard/AutonomousActionStatusPanel";
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
    <div className="min-h-screen w-full bg-[#0b0e11] px-4 py-4 text-[#eaecef] sm:px-5 lg:px-6">
      <div className="mx-auto max-w-[1440px] space-y-4">
        <DashboardHeader model={model} />
        <AutonomousActionStatusPanel model={model} />
        <WorkflowActionRail model={model} />
        <AutonomousRunLedger model={model} />
        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)_minmax(0,0.72fr)]">
          <ReadinessPanel model={model} />
          <div className="min-w-0 space-y-4">
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
