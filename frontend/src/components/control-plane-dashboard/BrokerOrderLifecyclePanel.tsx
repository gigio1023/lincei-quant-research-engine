import {
  formatCurrency,
  formatDateTime,
  formatNumber,
} from "./dashboardFormat";
import { useDashboardLanguage } from "./dashboardLanguage";
import { DashboardModel } from "./useControlPlaneDashboard";

interface BrokerOrderLifecyclePanelProps {
  model: DashboardModel;
}

const OPEN_STATUSES = new Set([
  "submitted",
  "accepted",
  "open",
  "partially_filled",
  "pending_cancel",
  "unknown",
]);

const TERMINAL_STATUSES = new Set([
  "filled",
  "cancelled",
  "rejected",
  "expired",
]);

export const BrokerOrderLifecyclePanel = ({
  model,
}: BrokerOrderLifecyclePanelProps) => {
  const { t } = useDashboardLanguage();
  const latestStatus = model.latestBrokerOrderStatus;
  const records = model.visibleBrokerOrderStatuses;
  const openCount = records.filter((record) =>
    OPEN_STATUSES.has(record.externalStatus),
  ).length;
  const terminalCount = records.filter((record) =>
    TERMINAL_STATUSES.has(record.externalStatus),
  ).length;
  const mismatchCount = records.filter(
    (record) => record.status === "mismatch",
  ).length;
  const unlinkedCount = records.filter(
    (record) => record.status === "unlinked",
  ).length;
  const rows = [...records]
    .sort(
      (leftRecord, rightRecord) =>
        new Date(rightRecord.asOf).getTime() -
        new Date(leftRecord.asOf).getTime(),
    )
    .slice(0, 4);

  return (
    <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white">
            {t("Broker Order Lifecycle")}
          </h3>
          <div className="mt-1 text-[11px] font-bold uppercase text-[#fcd535]">
            {t(model.sources.brokerOrderStatuses)}
          </div>
          <p className="mt-1 text-xs leading-5 text-[#707a8a]">
            {t(
              "Read-only broker order lifecycle evidence. It shows broker-side order truth, not broker writes.",
            )}
          </p>
        </div>
        <span
          className={`rounded-md border px-2 py-1 text-[11px] font-bold uppercase ${
            openCount > 0
              ? "border-[#f0b90b]/40 bg-[#f0b90b]/10 text-[#fcd535]"
              : "border-[#2b3139] bg-[#0b0e11] text-[#929aa5]"
          }`}
        >
          {formatNumber(openCount)} {t("open")}
        </span>
      </div>

      {model.errors.brokerOrderStatuses && (
        <div className="mt-3 rounded-lg border border-[#f0b90b]/30 bg-[#f0b90b]/10 p-3 text-xs font-semibold text-[#fcd535]">
          {t(model.errors.brokerOrderStatuses)}
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        {[
          ["Open orders", openCount],
          ["Terminal orders", terminalCount],
          ["Dry-run mismatches", mismatchCount],
          ["Unlinked orders", unlinkedCount],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3"
          >
            <div className="text-[11px] font-bold uppercase text-[#707a8a]">
              {t(String(label))}
            </div>
            <div className="mt-1 font-mono text-lg font-bold text-white">
              {formatNumber(Number(value))}
            </div>
          </div>
        ))}
      </div>

      {latestStatus && (
        <div className="mt-4 rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono font-bold text-white">
              {latestStatus.symbol} {latestStatus.side} {latestStatus.orderType}
            </span>
            <span
              className={`rounded px-2 py-1 font-mono text-[11px] font-bold uppercase ${
                latestStatus.status === "matched"
                  ? "bg-[#0ecb81]/10 text-[#0ecb81]"
                  : latestStatus.status === "mismatch"
                    ? "bg-[#f6465d]/10 text-[#f6465d]"
                    : "bg-[#f0b90b]/10 text-[#fcd535]"
              }`}
            >
              {t(latestStatus.status)}
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              ["external", latestStatus.externalStatus],
              ["as of", formatDateTime(latestStatus.asOf)],
              ["broker ref", latestStatus.brokerOrderRefHash],
              ["paper plan", latestStatus.paperOrderPlanId ?? "none"],
              [
                "requested",
                latestStatus.requestedNotional
                  ? formatCurrency(latestStatus.requestedNotional)
                  : "none",
              ],
              [
                "remaining",
                latestStatus.remainingQuantity !== undefined
                  ? formatNumber(latestStatus.remainingQuantity)
                  : "none",
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between gap-3 rounded-md border border-[#2b3139] bg-[#151a21] px-3 py-2"
              >
                <span className="font-bold uppercase text-[#707a8a]">
                  {t(String(label))}
                </span>
                <span className="min-w-0 truncate text-right font-mono font-bold text-[#eaecef]">
                  {t(String(value))}
                </span>
              </div>
            ))}
          </div>
          {latestStatus.reconciliation.commandDryRunOnly && (
            <div className="mt-3 rounded-md border border-[#f6465d]/30 bg-[#f6465d]/10 p-3 font-mono text-xs text-[#f6465d]">
              {t("Dry-run command mismatch")}
            </div>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-[11px] font-bold uppercase text-[#707a8a]">
            {t("Recent broker order statuses")}
          </div>
          {rows.map((record) => (
            <div
              key={record.id}
              className="grid gap-2 rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3 text-xs sm:grid-cols-[0.9fr_0.7fr_1fr]"
            >
              <div className="min-w-0">
                <div className="truncate font-mono font-bold text-white">
                  {record.brokerOrderRefHash}
                </div>
                <div className="mt-1 text-[#707a8a]">
                  {record.symbol} / {record.side}
                </div>
              </div>
              <div>
                <div className="font-bold uppercase text-[#707a8a]">
                  {t("external")}
                </div>
                <div className="mt-1 font-mono font-bold text-[#fcd535]">
                  {t(record.externalStatus)}
                </div>
              </div>
              <div>
                <div className="font-bold uppercase text-[#707a8a]">
                  {t("reconciliation")}
                </div>
                <div className="mt-1 font-mono font-bold text-[#eaecef]">
                  {t(record.reconciliation.status)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
