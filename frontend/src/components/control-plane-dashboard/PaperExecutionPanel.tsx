import { PaperAccountState } from "./PaperAccountState";
import { PaperPlans } from "./PaperPlans";
import { statusBadge } from "./dashboardFormat";
import { useDashboardLanguage } from "./dashboardLanguage";
import { DashboardModel } from "./useControlPlaneDashboard";

interface PaperExecutionPanelProps {
  model: DashboardModel;
}

export const PaperExecutionPanel = ({ model }: PaperExecutionPanelProps) => {
  const { t } = useDashboardLanguage();

  return (
    <section className="rounded-xl border border-[#2b3139] bg-[#181a20]">
      <div className="flex flex-col gap-3 border-b border-[#2b3139] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-bold text-white">
            {t("Paper Execution Enclave")}
          </h3>
          <p className="mt-1 text-xs text-[#707a8a]">
            {t(model.paperExecutionReadiness.detail)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={statusBadge(
              model.paperExecutionReadiness.ready ? "started" : "blocked",
            )}
          >
            {model.paperExecutionReadiness.ready ? t("Started") : t("Blocked")}
          </span>
          <span className="rounded-md border border-[#f6465d]/30 bg-[#f6465d]/10 px-2 py-1 text-[11px] font-bold uppercase text-[#f6465d]">
            {t("Broker execution")}: {t("false")}
          </span>
          <span className="rounded-md border border-[#f6465d]/30 bg-[#f6465d]/10 px-2 py-1 text-[11px] font-bold uppercase text-[#f6465d]">
            {t("Live trading")}: {t("false")}
          </span>
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-[0.95fr_1.05fr]">
        <PaperAccountState model={model} />
        <PaperPlans model={model} />
      </div>
    </section>
  );
};
