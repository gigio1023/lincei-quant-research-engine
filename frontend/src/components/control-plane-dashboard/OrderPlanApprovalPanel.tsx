import { formatDateTime, paperOrderPlanStatusClass } from "./dashboardFormat";
import { useDashboardLanguage } from "./dashboardLanguage";
import { DashboardModel } from "./useControlPlaneDashboard";

interface OrderPlanApprovalPanelProps {
  model: DashboardModel;
}

export const OrderPlanApprovalPanel = ({
  model,
}: OrderPlanApprovalPanelProps) => {
  const { t } = useDashboardLanguage();
  const approval = model.latestOrderPlanApproval;
  const approvalSource = approval?.approvalSource ?? "human";

  return (
    <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white">
            {t("Paper Order Approval")}
          </h3>
          <p className="mt-1 text-xs text-[#707a8a]">
            {t("Durable approval record required before paper fills.")}
          </p>
        </div>
        <span className="rounded-md border border-[#f6465d]/30 bg-[#f6465d]/10 px-2 py-1 text-[11px] font-bold uppercase text-[#f6465d]">
          {t("live signing disabled")}
        </span>
      </div>

      {model.errors.orderPlanApprovals && (
        <div className="mt-3 rounded-lg border border-[#f0b90b]/30 bg-[#f0b90b]/10 p-3 text-xs font-semibold text-[#fcd535]">
          {model.errors.orderPlanApprovals}
        </div>
      )}

      {approval ? (
        <div className="mt-4 rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase text-[#707a8a]">
                {t(model.sources.orderPlanApprovals)}
              </div>
              <div className="mt-1 font-mono text-sm font-bold text-white">
                {t("approval")} {approval.id}
              </div>
              <div className="mt-1 text-xs text-[#929aa5]">
                {approval.approver} / {approval.mode}
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <span
                className={
                  approvalSource === "paper_auto" ||
                  approvalSource === "recovery_auto"
                    ? "rounded-md border border-[#fcd535]/30 bg-[#fcd535]/10 px-2 py-1 text-[11px] font-bold uppercase text-[#fcd535]"
                    : "rounded-md border border-[#2b3139] bg-[#181a20] px-2 py-1 text-[11px] font-bold uppercase text-[#eaecef]"
                }
              >
                {t(
                  approvalSource === "paper_auto"
                    ? "paper auto approval"
                    : approvalSource === "recovery_auto"
                      ? "recovery auto approval"
                      : "human approval",
                )}
              </span>
              <span
                className={`${paperOrderPlanStatusClass(approval.status)} rounded-md border px-2 py-1 text-[11px] font-bold uppercase`}
              >
                {t(approval.status)}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-xs">
            {[
              ["source", approvalSource],
              ["approvedByRun", approval.approvedByRunId ?? t("none")],
              [
                "approvedBySchedule",
                approval.approvedByScheduleId ?? t("none"),
              ],
              [
                "autoApprovalPolicy",
                approval.autoApprovalPolicyRef ?? t("none"),
              ],
              ["idempotency", approval.idempotencyKey],
              ["riskEvaluation", approval.riskEvaluationId],
              ["custodyMode", approval.custodyMode],
              ["proposalHash", approval.proposalHash],
              ["payloadHash", approval.canonicalPayloadHash],
              ["signature", approval.signature],
              ["signerKey", approval.signerKeyRef],
              [
                "accountEvent",
                `${approval.paperAccountEventHash} / seq ${approval.paperAccountEventSequence}`,
              ],
              ["approvalHash", approval.approvalHash],
              ["approvedAt", formatDateTime(approval.approvedAt)],
              [
                "expiresAt",
                approval.expiresAt
                  ? formatDateTime(approval.expiresAt)
                  : t("none"),
              ],
              [
                "consumedBy",
                approval.consumedByPaperOrderPlanId
                  ? `${t("paper plan")} ${approval.consumedByPaperOrderPlanId}`
                  : t("not consumed"),
              ],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <span className="text-[#707a8a]">{t(String(label))}</span>
                <span className="max-w-[58%] truncate text-right font-mono font-bold text-[#eaecef]">
                  {value}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs leading-5 text-[#929aa5]">
            {t(approval.reason)}
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3 text-sm text-[#929aa5]">
          {t("No signed order-plan approval has been recorded yet.")}
        </div>
      )}
    </section>
  );
};
