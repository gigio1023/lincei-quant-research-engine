import { useEffect, useState } from "react";
import { ActionAuditTimelinePanel } from "./control-plane-dashboard/ActionAuditTimelinePanel";
import { AutonomousRunLedger } from "./control-plane-dashboard/AutonomousRunLedger";
import { AutonomousActionStatusPanel } from "./control-plane-dashboard/AutonomousActionStatusPanel";
import { BrokerWriteReadinessPanel } from "./control-plane-dashboard/BrokerWriteReadinessPanel";
import { BrokerOrderCommandPanel } from "./control-plane-dashboard/BrokerOrderCommandPanel";
import { BrokerOrderLifecyclePanel } from "./control-plane-dashboard/BrokerOrderLifecyclePanel";
import { BrokerSnapshotPanel } from "./control-plane-dashboard/BrokerSnapshotPanel";
import { CurrentCycleEvidencePanel } from "./control-plane-dashboard/CurrentCycleEvidencePanel";
import { DashboardHeader } from "./control-plane-dashboard/DashboardHeader";
import { FundingReadinessPanel } from "./control-plane-dashboard/FundingReadinessPanel";
import {
  DashboardLanguage,
  DashboardLanguageProvider,
} from "./control-plane-dashboard/dashboardLanguage";
import { PaperExecutionPanel } from "./control-plane-dashboard/PaperExecutionPanel";
import { ReadinessPanel } from "./control-plane-dashboard/ReadinessPanel";
import { ResearchLedgerPanel } from "./control-plane-dashboard/ResearchLedgerPanel";
import { RightRail } from "./control-plane-dashboard/RightRail";
import { WorkflowActionRail } from "./control-plane-dashboard/WorkflowActionRail";
import { useControlPlaneDashboard } from "./control-plane-dashboard/useControlPlaneDashboard";

const ControlPlaneDashboard = () => {
  const [language, setLanguage] = useState<DashboardLanguage>(() => {
    if (typeof window === "undefined") {
      return "en";
    }

    return window.localStorage.getItem("control-plane-dashboard-language") ===
      "ko"
      ? "ko"
      : "en";
  });
  const model = useControlPlaneDashboard();

  useEffect(() => {
    window.localStorage.setItem("control-plane-dashboard-language", language);
  }, [language]);

  return (
    <DashboardLanguageProvider language={language} setLanguage={setLanguage}>
      <div className="min-h-screen w-full bg-[#0b0e11] px-4 py-4 text-[#eaecef] sm:px-5 lg:px-6">
        <div className="mx-auto max-w-[1440px] space-y-4">
          <DashboardHeader model={model} />
          <AutonomousActionStatusPanel model={model} />
          <ActionAuditTimelinePanel model={model} />
          <CurrentCycleEvidencePanel model={model} />
          <WorkflowActionRail model={model} />
          <AutonomousRunLedger model={model} />
          <section className="grid gap-4 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)_minmax(0,0.72fr)]">
            <ReadinessPanel model={model} />
            <div className="min-w-0 space-y-4">
              <ResearchLedgerPanel model={model} />
              <PaperExecutionPanel model={model} />
              <FundingReadinessPanel model={model} />
              <BrokerWriteReadinessPanel model={model} />
              <BrokerOrderCommandPanel model={model} />
              <BrokerOrderLifecyclePanel model={model} />
              <BrokerSnapshotPanel model={model} />
            </div>
            <RightRail model={model} />
          </section>
        </div>
      </div>
    </DashboardLanguageProvider>
  );
};

export default ControlPlaneDashboard;
