import { DashboardModel } from "./useControlPlaneDashboard";
import { statusBadge } from "./dashboardFormat";
import { useDashboardLanguage } from "./dashboardLanguage";

interface ReadinessPanelProps {
  model: DashboardModel;
}

export const ReadinessPanel = ({ model }: ReadinessPanelProps) => {
  const { t } = useDashboardLanguage();

  return (
    <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white">
            {t("System Readiness Matrix")}
          </h3>
          <p className="mt-1 text-xs font-medium text-[#707a8a]">
            {model.readinessReadyCount}/{model.controlStatus.readiness.length}{" "}
            {t("gates ready")}
          </p>
        </div>
        <span
          className={statusBadge(model.errors.status ? "partial" : "started")}
        >
          {model.errors.status ? t("Fallback") : t("API Connected")}
        </span>
      </div>

      {model.errors.status && (
        <div className="mt-3 rounded-lg border border-[#f0b90b]/30 bg-[#f0b90b]/10 p-3 text-xs font-semibold text-[#fcd535]">
          {model.errors.status} {t("Showing documented defaults.")}
        </div>
      )}

      <div className="mt-4 divide-y divide-[#2b3139]">
        {model.controlStatus.readiness.map((item) => (
          <div key={item.key} className="grid grid-cols-[1fr_auto] gap-3 py-3">
            <div>
              <div className="font-mono text-xs font-bold text-[#eaecef]">
                {item.key}
              </div>
              <div className="mt-1 text-xs leading-5 text-[#707a8a]">
                {t(item.detail)}
              </div>
            </div>
            <span className={statusBadge(item.ready ? "started" : "blocked")}>
              {item.ready ? t("Ready") : t("Blocked")}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] font-bold uppercase text-[#707a8a]">
            {t("Live Trading Gate")}
          </div>
          <span className={statusBadge("blocked")}>
            {t(model.controlStatus.liveTradingGate.mode)}
          </span>
        </div>
        <div className="mt-2 text-xs leading-5 text-[#929aa5]">
          {t(model.controlStatus.liveTradingGate.detail)}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-[#f6465d]/30 bg-[#f6465d]/10 p-3">
        <div className="text-[11px] font-bold uppercase text-[#f6465d]">
          {t("Remaining blockers")}
        </div>
        <div className="mt-2 space-y-1 text-xs font-semibold text-[#eaecef]">
          {model.controlStatus.blockers.map((blocker) => (
            <div key={blocker}>{t(blocker)}</div>
          ))}
        </div>
      </div>
    </section>
  );
};
