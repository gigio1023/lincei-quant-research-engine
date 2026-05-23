import { DashboardModel } from "./useControlPlaneDashboard";
import { useDashboardLanguage } from "./dashboardLanguage";

interface CurrentCycleEvidencePanelProps {
  model: DashboardModel;
}

const freshnessClass = (freshness: string) => {
  if (freshness === "fresh") {
    return "border-[#0ecb81]/30 bg-[#0ecb81]/10 text-[#0ecb81]";
  }

  if (freshness === "stale") {
    return "border-[#f6465d]/30 bg-[#f6465d]/10 text-[#f6465d]";
  }

  return "border-[#2b3139] bg-[#181a20] text-[#929aa5]";
};

export const CurrentCycleEvidencePanel = ({
  model,
}: CurrentCycleEvidencePanelProps) => {
  const { t } = useDashboardLanguage();
  const cycle = model.currentCycleEvidence;
  const ingestion = model.visibleMarketDataIngestionStatus;
  const latestIngestionRun = model.visibleMarketDataIngestionRuns[0];
  const items = [
    {
      label: "Cycle",
      value: cycle.cycleKey,
      meta: `${t("schedule")} ${cycle.scheduleId} / ${cycle.mode}`,
    },
    {
      label: "Research Data",
      value: cycle.datasetId,
      meta: `${cycle.symbol} / ${cycle.benchmark}`,
    },
    {
      label: "Decision Chain",
      value: cycle.decisionChain.risk,
      meta: `${cycle.decisionChain.researchRun} -> ${cycle.decisionChain.proposal}`,
    },
    {
      label: "Auto Approval",
      value: `${t(cycle.approval.source)} / ${t(cycle.approval.status)}`,
      meta: cycle.approval.policyRef,
    },
    {
      label: "Paper Result",
      value: `${cycle.paper.plan} / ${t(cycle.paper.status)}`,
      meta: `${cycle.paper.orders} orders / ${cycle.paper.fills} fills / ${cycle.paper.reconciliation}`,
    },
    {
      label: "Recovery",
      value: t(cycle.recoveryState),
      meta: `${t("Next action")}: ${cycle.decisionChain.nextAction}`,
    },
  ];

  return (
    <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white">
            {t("Current Cycle Evidence")}
          </h3>
          <p className="mt-1 text-xs text-[#707a8a]">
            {t(
              "Latest autonomous cycle data, approval, paper result, and recovery state.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`${freshnessClass(cycle.freshness)} rounded-md border px-2 py-1 text-[11px] font-bold uppercase`}
          >
            {t(cycle.freshness)}
          </span>
          <span className="rounded-md border border-[#2b3139] bg-[#0b0e11] px-2 py-1 text-[11px] font-bold uppercase text-[#929aa5]">
            {cycle.maxAgeMinutes
              ? `${t("freshness")} ${cycle.maxAgeMinutes}m`
              : t("not enforced")}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        {items.map((item) => (
          <div
            key={item.label}
            className="min-w-0 rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3"
          >
            <div className="text-[11px] font-bold uppercase text-[#707a8a]">
              {t(item.label)}
            </div>
            <div className="mt-2 truncate font-mono text-sm font-bold text-white">
              {item.value}
            </div>
            <div className="mt-1 break-words text-xs leading-5 text-[#929aa5]">
              {item.meta}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2 text-xs text-[#929aa5] md:grid-cols-3">
        <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
          <span className="font-bold uppercase text-[#707a8a]">
            {t("available")}
          </span>{" "}
          {cycle.availabilityTimestamp ?? t("missing")}
        </div>
        <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
          <span className="font-bold uppercase text-[#707a8a]">
            {t("market data")}
          </span>{" "}
          {cycle.marketDataTimestamp ?? t("missing")}
        </div>
        <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
          <span className="font-bold uppercase text-[#707a8a]">
            {t("Worker")}
          </span>{" "}
          {cycle.worker}
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-[#929aa5] md:grid-cols-[1.15fr_1fr_1fr]">
        <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
          <span className="font-bold uppercase text-[#707a8a]">
            {t("Market ingestion")}
          </span>{" "}
          <span
            className={ingestion.enabled ? "text-[#0ecb81]" : "text-[#f6465d]"}
          >
            {t(ingestion.enabled ? "enabled" : "disabled")}
          </span>
          <span className="ml-2 font-mono text-[#eaecef]">
            {ingestion.provider} / {ingestion.timeframe}
          </span>
        </div>
        <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
          <span className="font-bold uppercase text-[#707a8a]">
            {t("universe")}
          </span>{" "}
          {ingestion.symbols.join(" / ") || t("missing")} /{" "}
          {ingestion.benchmark || t("missing")}
        </div>
        <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
          <span className="font-bold uppercase text-[#707a8a]">
            {t("last ingestion")}
          </span>{" "}
          {latestIngestionRun
            ? `${t(latestIngestionRun.status)} / ${latestIngestionRun.imported} ${t("bars")}`
            : t("missing")}
        </div>
      </div>
      {model.errors.marketDataIngestion && (
        <div className="mt-3 rounded-lg border border-[#f0b90b]/30 bg-[#f0b90b]/10 p-3 text-xs font-semibold text-[#fcd535]">
          {t(model.errors.marketDataIngestion)}
        </div>
      )}
    </section>
  );
};
