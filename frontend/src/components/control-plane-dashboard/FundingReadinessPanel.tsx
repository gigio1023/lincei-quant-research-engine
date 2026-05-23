import {
  formatCurrency,
  formatDateTime,
  formatNumber,
} from "./dashboardFormat";
import { useDashboardLanguage } from "./dashboardLanguage";
import { DashboardModel } from "./useControlPlaneDashboard";

interface FundingReadinessPanelProps {
  model: DashboardModel;
}

export const FundingReadinessPanel = ({
  model,
}: FundingReadinessPanelProps) => {
  const { t } = useDashboardLanguage();
  const funding = model.latestFundingReadiness;

  return (
    <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white">
            {t("Funding Readiness")}
          </h3>
          <p className="mt-1 text-xs leading-5 text-[#707a8a]">
            {t(
              "Expected deposit must match a reconciled read-only broker snapshot before automation can treat capital as usable.",
            )}
          </p>
        </div>
        <span
          className={`rounded-md border px-2 py-1 text-[11px] font-bold uppercase ${
            funding?.status === "ready"
              ? "border-[#0ecb81]/40 bg-[#0ecb81]/10 text-[#0ecb81]"
              : "border-[#f6465d]/40 bg-[#f6465d]/10 text-[#f6465d]"
          }`}
        >
          {t(funding?.status ?? "blocked")}
        </span>
      </div>

      {model.errors.fundingReadiness && (
        <div className="mt-3 rounded-lg border border-[#f0b90b]/30 bg-[#f0b90b]/10 p-3 text-xs font-semibold text-[#fcd535]">
          {t(model.errors.fundingReadiness)}
        </div>
      )}

      {funding ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              [
                "Expected deposit",
                formatCurrency(funding.expectedDepositAmount, funding.currency),
              ],
              [
                "Broker cash",
                formatCurrency(funding.actualBrokerCash ?? 0, funding.currency),
              ],
              [
                "Cash diff",
                formatCurrency(
                  funding.readinessSnapshot.cashDiff ?? 0,
                  funding.currency,
                ),
              ],
              [
                "Snapshot age",
                `${formatNumber(
                  funding.readinessSnapshot.ageMinutes ?? 0,
                )} ${t("minutes")}`,
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3"
              >
                <div className="text-[11px] font-bold uppercase text-[#707a8a]">
                  {t(String(label))}
                </div>
                <div className="mt-1 font-mono text-sm font-bold text-white">
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
            {[
              ["broker snapshot", funding.brokerSnapshotId ?? "none"],
              [
                "reconciliation",
                funding.readinessSnapshot.brokerSnapshotReconciliationStatus ??
                  "not_checked",
              ],
              ["checked", formatDateTime(funding.checkedAt)],
              ["source", model.sources.fundingReadiness],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between gap-3 rounded-md border border-[#2b3139] bg-[#0b0e11] px-3 py-2"
              >
                <span className="font-bold uppercase text-[#707a8a]">
                  {t(String(label))}
                </span>
                <span className="font-mono font-bold text-[#eaecef]">
                  {t(String(value))}
                </span>
              </div>
            ))}
          </div>

          <div
            className={`mt-4 rounded-lg border p-3 text-xs ${
              funding.blockers.length === 0
                ? "border-[#0ecb81]/30 bg-[#0ecb81]/10 text-[#0ecb81]"
                : "border-[#f6465d]/30 bg-[#f6465d]/10 text-[#eaecef]"
            }`}
          >
            <div className="text-[11px] font-bold uppercase">
              {t("Funding blockers")}
            </div>
            <div className="mt-2 space-y-1 font-mono">
              {(funding.blockers.length > 0
                ? funding.blockers
                : ["expected deposit matches read-only broker truth"]
              ).map((blocker) => (
                <div key={blocker}>{t(blocker)}</div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-lg border border-[#f6465d]/30 bg-[#f6465d]/10 p-3 text-xs font-semibold text-[#eaecef]">
          {t(
            "No funding readiness record has matched expected deposit to read-only broker truth",
          )}
        </div>
      )}
    </section>
  );
};
