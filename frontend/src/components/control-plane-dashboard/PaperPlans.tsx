import {
  formatCurrency,
  formatSignedCurrency,
  paperOrderPlanStatusClass,
} from "./dashboardFormat";
import { useDashboardLanguage } from "./dashboardLanguage";
import { DashboardModel } from "./useControlPlaneDashboard";

interface PaperPlansProps {
  model: DashboardModel;
}

type PaperPlan = DashboardModel["latestPaperOrderPlans"][number];

export const PaperPlans = ({ model }: PaperPlansProps) => {
  const { t } = useDashboardLanguage();

  return (
    <div className="p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-[#2b3139] px-2 py-1 text-[11px] font-bold uppercase text-[#929aa5]">
          {t(model.sources.paperOrderPlans)}
        </span>
        {model.errors.paperOrderPlans && (
          <span className="rounded-md border border-[#f0b90b]/30 bg-[#f0b90b]/10 px-2 py-1 text-[11px] font-bold uppercase text-[#fcd535]">
            {t("API fallback")}
          </span>
        )}
      </div>

      {model.errors.paperOrderPlans && (
        <div className="mb-3 rounded-lg border border-[#f0b90b]/30 bg-[#f0b90b]/10 p-3 text-xs font-semibold text-[#fcd535]">
          {model.errors.paperOrderPlans}
        </div>
      )}

      {model.visiblePaperOrderPlans.length === 0 ? (
        <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-4 text-sm font-semibold text-[#929aa5]">
          {t("No paper order plans recorded yet.")}
        </div>
      ) : (
        <div className="space-y-3">
          {model.latestPaperOrderPlans.map((plan) => (
            <PaperPlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      )}
    </div>
  );
};

const PaperPlanCard = ({ plan }: { plan: PaperPlan }) => {
  const { t } = useDashboardLanguage();

  return (
    <article className="rounded-lg border border-[#2b3139] bg-[#0b0e11]">
      <div className="border-b border-[#2b3139] p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-[#929aa5]">
                {plan.id}
              </span>
              <span
                className={`${paperOrderPlanStatusClass(
                  plan.status,
                )} rounded-md border px-2 py-1 text-[11px] font-bold uppercase`}
              >
                {t(plan.status)}
              </span>
            </div>
            <div className="mt-2 font-semibold text-white">
              {t("Proposal")} {plan.proposalId}
            </div>
          </div>
          <div className="text-right font-mono text-sm">
            <div className="text-[#eaecef]">
              {formatCurrency(plan.endingEquity)}
            </div>
            <div
              className={
                plan.endingEquity - plan.startingEquity >= 0
                  ? "text-[#0ecb81]"
                  : "text-[#f6465d]"
              }
            >
              {formatSignedCurrency(plan.endingEquity - plan.startingEquity)}
            </div>
          </div>
        </div>
        <div className="mt-2 grid gap-1 text-xs text-[#707a8a]">
          <div>
            {t("Plan hash")}: {plan.planHash}
          </div>
          <div>
            {t("Proposal hash")}: {plan.proposalHash}
          </div>
          <div>
            {t("Idempotency")}: {plan.idempotencyKey}
          </div>
          <div>
            {t("Approval")}: {plan.orderPlanApprovalId ?? t("none")}
          </div>
          {plan.reservationHold && (
            <div>
              {t("Hold")}: {t(plan.reservationHold.status)} /{" "}
              {formatCurrency(plan.reservationHold.cashAmount)} /{" "}
              {plan.reservationHold.holdHash}
              {plan.reservationHold.accountLockVersionAtHold !== undefined
                ? ` / ${t("lock")} ${plan.reservationHold.accountLockVersionAtHold}`
                : ""}
            </div>
          )}
          <div>
            {t("Reservations")}: {t("cash")}{" "}
            {formatCurrency(plan.readinessSnapshot.requiredCash ?? 0)}
            {" / "}
            {t("available")}{" "}
            {formatCurrency(plan.readinessSnapshot.availableCash ?? 0)}
            {" / "}
            {t("reserved")}{" "}
            {formatCurrency(plan.readinessSnapshot.reservedCash ?? 0)}
          </div>
          <div>
            {t("Custody")}:{" "}
            {plan.readinessSnapshot.approvalCustodyVerified
              ? t("verified")
              : t("blocked")}
            {" / "}
            {t("account event")}{" "}
            {plan.readinessSnapshot.accountEventFresh ? t("fresh") : t("stale")}
            {plan.readinessSnapshot.paperAccountEventSequence
              ? ` / seq ${plan.readinessSnapshot.paperAccountEventSequence}`
              : ""}
            {plan.readinessSnapshot.paperAccountLockVersion !== undefined
              ? ` / ${t("lock")} ${plan.readinessSnapshot.paperAccountLockVersion}`
              : ""}
          </div>
          <div>
            {t("Approval event")}:{" "}
            <span className="font-mono">
              {plan.readinessSnapshot.approvalPaperAccountEventHash ?? "none"}
            </span>
          </div>
          <div>
            {t("Current event")}:{" "}
            <span className="font-mono">
              {plan.readinessSnapshot.currentPaperAccountEventHash ?? "none"}
            </span>
          </div>
          {plan.blockedReasons.length > 0 && (
            <div className="rounded-md border border-[#f6465d]/30 bg-[#f6465d]/10 p-2 text-[#f6465d]">
              {plan.blockedReasons.map((reason) => (
                <div key={reason} className="font-mono">
                  {reason}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-0 2xl:grid-cols-3">
        <PlanOrders plan={plan} />
        <PlanFills plan={plan} />
        <PlanReconciliation plan={plan} />
      </div>
    </article>
  );
};

const PlanOrders = ({ plan }: { plan: PaperPlan }) => {
  const { t } = useDashboardLanguage();

  return (
    <div className="border-b border-[#2b3139] p-3 2xl:border-b-0 2xl:border-r">
      <div className="text-xs font-bold uppercase text-[#707a8a]">
        {t("Planned orders")}
      </div>
      <div className="mt-2 space-y-2">
        {plan.orders.map((order) => (
          <div
            key={`${plan.id}-${order.symbol}-${order.side}`}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-xs"
          >
            <span className="font-mono font-bold text-white">
              {order.symbol}
            </span>
            <span className="font-mono text-[#eaecef]">
              {order.side} {formatCurrency(order.requestedNotional)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const PlanFills = ({ plan }: { plan: PaperPlan }) => {
  const { t } = useDashboardLanguage();

  return (
    <div className="border-b border-[#2b3139] p-3 2xl:border-b-0 2xl:border-r">
      <div className="text-xs font-bold uppercase text-[#707a8a]">
        {t("Paper fills")}
      </div>
      {plan.fills.length === 0 ? (
        <div className="mt-2 text-xs font-semibold text-[#929aa5]">
          {t("No fills recorded for this paper plan.")}
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {plan.fills.map((fill) => (
            <div
              key={`${plan.id}-${fill.symbol}-${fill.side}-${fill.status}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-xs"
            >
              <span className="font-mono font-bold text-white">
                {fill.symbol}
              </span>
              <span
                className={
                  fill.netCashDelta < 0
                    ? "font-mono text-[#f6465d]"
                    : "font-mono text-[#0ecb81]"
                }
              >
                {formatSignedCurrency(fill.netCashDelta, fill.feeCurrency)}
              </span>
              <span className="col-span-2 text-[#707a8a]">
                {t(fill.status)} / {t("fee")} {formatCurrency(fill.fee)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const PlanReconciliation = ({ plan }: { plan: PaperPlan }) => {
  const { t } = useDashboardLanguage();

  return (
    <div className="p-3">
      <div className="text-xs font-bold uppercase text-[#707a8a]">
        {t("Reconciliation")}
      </div>
      <div className="mt-2 space-y-2 text-xs">
        <Row label={t("Status")} value={t(plan.reconciliation.status)} />
        <Row
          label={t("Expected cash")}
          value={formatCurrency(plan.reconciliation.expectedCash)}
        />
        <Row
          label={t("Cash diff")}
          value={formatSignedCurrency(plan.reconciliation.cashDiff ?? 0)}
          valueClass="text-[#0ecb81]"
        />
      </div>
      <details className="mt-2 text-xs text-[#929aa5]">
        <summary className="cursor-pointer text-[#fcd535]">
          {t("notes")}
        </summary>
        <ul className="mt-2 space-y-1">
          {plan.reconciliation.notes.map((note) => (
            <li key={`${plan.id}-${note}`}>{note}</li>
          ))}
        </ul>
      </details>
    </div>
  );
};

const Row = ({
  label,
  value,
  valueClass = "text-white",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) => (
  <div className="flex justify-between gap-3">
    <span className="text-[#929aa5]">{label}</span>
    <span className={`text-right font-mono ${valueClass}`}>{value}</span>
  </div>
);
