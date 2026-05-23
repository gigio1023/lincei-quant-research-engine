import { formatDateTime } from "./dashboardFormat";
import { useDashboardLanguage } from "./dashboardLanguage";
import { DashboardModel } from "./useControlPlaneDashboard";

interface AutonomousActionStatusPanelProps {
  model: DashboardModel;
}

export const AutonomousActionStatusPanel = ({
  model,
}: AutonomousActionStatusPanelProps) => {
  const { t } = useDashboardLanguage();
  const status = model.controlStatus.actionStatus ?? {
    checkedAt: model.controlStatus.liveTradingGate.checkedAt,
    verdict: "attention" as const,
    latestAction: {
      stage: "idle",
      status: "missing",
      detail: "No action status reported yet",
    },
    paper: {
      status: "missing",
      fillCount: 0,
      detail: "No paper order plan has been created yet",
    },
    brokerSnapshot: {
      status: "missing",
      detail: "No broker snapshot evidence has been imported yet",
    },
    brokerFill: {
      status: "missing",
      detail: "No broker fill evidence has been imported yet",
    },
    nextSafeAction: "Refresh control-plane status before advancing.",
    brokerExecutionEnabled: false as const,
    liveTradingEnabled: false as const,
  };
  const verdictClass = {
    ready: "border-[#0ecb81] text-[#0ecb81]",
    attention: "border-[#f0b90b] text-[#fcd535]",
    blocked: "border-[#f6465d] text-[#f6465d]",
  }[status.verdict];
  const approval = model.latestOrderPlanApproval;

  return (
    <section
      aria-label={t("Action Status")}
      className="rounded-xl border border-[#2b3139] bg-[#181a20]"
    >
      <div className="flex flex-col gap-3 border-b border-[#2b3139] p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-bold text-white">
            {t("Action Status")}
          </h3>
          <div className="mt-1 text-xs font-semibold text-[#929aa5]">
            {t("checked")} {formatDateTime(status.checkedAt)}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-md border border-[#f6465d]/40 bg-[#f6465d]/10 px-3 py-2 text-xs font-bold text-[#f6465d]">
            {t("brokerExecutionEnabled")}: {t("false")}
          </span>
          <span className="rounded-md border border-[#f6465d]/40 bg-[#f6465d]/10 px-3 py-2 text-xs font-bold text-[#f6465d]">
            {t("liveTradingEnabled")}: {t("false")}
          </span>
          <span
            className={`w-fit rounded-md border px-3 py-2 text-xs font-bold uppercase ${verdictClass}`}
          >
            {t(status.verdict)}
          </span>
        </div>
      </div>

      <div className="grid gap-3 p-4 lg:grid-cols-[1.1fr_1fr_1fr_1fr_1fr]">
        <StatusBlock
          label={t("Latest system action")}
          value={`${status.latestAction.stage} / ${t(status.latestAction.status)}`}
          detail={t(status.latestAction.detail)}
          meta={
            status.latestAction.id
              ? `id ${status.latestAction.id}`
              : t("no action id")
          }
        />
        <StatusBlock
          label={t("Paper evidence")}
          value={t(status.paper.status)}
          detail={t(status.paper.detail)}
          meta={
            status.paper.planId
              ? `${t("plan")} ${status.paper.planId} / ${t(status.paper.reconciliationStatus ?? "not_checked")}`
              : t("no paper plan")
          }
        />
        <StatusBlock
          label={t("Approval evidence")}
          value={
            approval ? t(approval.approvalSource ?? "human") : t("missing")
          }
          detail={
            approval ? t(approval.reason) : t("No signed paper order approval")
          }
          meta={
            approval
              ? `${t("approval")} ${approval.id} / ${t(approval.status)}`
              : t("no approval")
          }
        />
        <StatusBlock
          label={t("Broker truth")}
          value={t(status.brokerSnapshot.status)}
          detail={t(status.brokerSnapshot.detail)}
          meta={
            status.brokerSnapshot.snapshotId
              ? `${t("snapshot")} ${status.brokerSnapshot.snapshotId} / ${t(status.brokerSnapshot.reconciliationStatus ?? "not_checked")}`
              : t("no snapshot")
          }
        />
        <StatusBlock
          label={t("Broker fill")}
          value={t(status.brokerFill.status)}
          detail={t(status.brokerFill.detail)}
          meta={
            status.brokerFill.fillId
              ? `${t("fill")} ${status.brokerFill.fillId} / ${t(status.brokerFill.reconciliationStatus ?? "not_checked")}`
              : t("no fill")
          }
        />
      </div>

      <div className="grid gap-3 border-t border-[#2b3139] p-4 md:grid-cols-2">
        <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
          <div className="text-[11px] font-bold uppercase text-[#707a8a]">
            {t("Current blocker")}
          </div>
          <div className="mt-2 text-sm font-semibold text-[#eaecef]">
            {t(status.blocker ?? "No immediate action blocker detected")}
          </div>
        </div>
        <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
          <div className="text-[11px] font-bold uppercase text-[#707a8a]">
            {t("Next safe action")}
          </div>
          <div className="mt-2 text-sm font-semibold text-[#fcd535]">
            {t(status.nextSafeAction)}
          </div>
        </div>
      </div>
    </section>
  );
};

const StatusBlock = ({
  label,
  value,
  detail,
  meta,
}: {
  label: string;
  value: string;
  detail: string;
  meta: string;
}) => (
  <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
    <div className="text-[11px] font-bold uppercase text-[#707a8a]">
      {label}
    </div>
    <div className="mt-2 font-mono text-sm font-bold text-white">{value}</div>
    <div className="mt-1 text-xs text-[#929aa5]">{detail}</div>
    <div className="mt-2 font-mono text-[11px] text-[#707a8a]">{meta}</div>
  </div>
);
