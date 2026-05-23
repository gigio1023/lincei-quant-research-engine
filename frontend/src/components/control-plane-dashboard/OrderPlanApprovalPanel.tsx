import { formatDateTime, paperOrderPlanStatusClass } from "./dashboardFormat";
import { DashboardModel } from "./useControlPlaneDashboard";

interface OrderPlanApprovalPanelProps {
  model: DashboardModel;
}

export const OrderPlanApprovalPanel = ({
  model,
}: OrderPlanApprovalPanelProps) => {
  const approval = model.latestOrderPlanApproval;

  return (
    <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white">
            Signed Order Approval
          </h3>
          <p className="mt-1 text-xs text-[#707a8a]">
            Durable approval record required before paper fills.
          </p>
        </div>
        <span className="rounded-md border border-[#f6465d]/30 bg-[#f6465d]/10 px-2 py-1 text-[11px] font-bold uppercase text-[#f6465d]">
          live signing disabled
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
                {model.sources.orderPlanApprovals}
              </div>
              <div className="mt-1 font-mono text-sm font-bold text-white">
                approval {approval.id}
              </div>
              <div className="mt-1 text-xs text-[#929aa5]">
                {approval.approver} / {approval.mode}
              </div>
            </div>
            <span
              className={`${paperOrderPlanStatusClass(approval.status)} rounded-md border px-2 py-1 text-[11px] font-bold uppercase`}
            >
              {approval.status}
            </span>
          </div>

          <div className="mt-4 grid gap-2 text-xs">
            {[
              ["idempotency", approval.idempotencyKey],
              ["riskEvaluation", approval.riskEvaluationId],
              ["proposalHash", approval.proposalHash],
              ["payloadHash", approval.canonicalPayloadHash],
              ["signerKey", approval.signerKeyRef],
              ["accountEvent", approval.paperAccountEventHash],
              ["approvalHash", approval.approvalHash],
              ["approvedAt", formatDateTime(approval.approvedAt)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <span className="text-[#707a8a]">{label}</span>
                <span className="max-w-[58%] truncate text-right font-mono font-bold text-[#eaecef]">
                  {value}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs leading-5 text-[#929aa5]">
            {approval.reason}
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3 text-sm text-[#929aa5]">
          No signed order-plan approval has been recorded yet.
        </div>
      )}
    </section>
  );
};
