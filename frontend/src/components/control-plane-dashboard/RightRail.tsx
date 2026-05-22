import { CONTROL_PLANE_STAGES, SAFETY_GATES } from "./dashboardConstants";
import { OrderPlanApprovalPanel } from "./OrderPlanApprovalPanel";
import {
  decisionClasses,
  formatBoolean,
  formatCurrency,
  STATUS_LABELS,
  statusBadge,
} from "./dashboardFormat";
import { DashboardModel } from "./useControlPlaneDashboard";

interface RightRailProps {
  model: DashboardModel;
}

export const RightRail = ({ model }: RightRailProps) => (
  <aside className="min-w-0 space-y-4">
    <RiskPolicyCard model={model} />
    <OrderPlanApprovalPanel model={model} />
    <LatestRiskEvaluationCard model={model} />
    <SafetyGatesCard />
    <LifecycleCard />
  </aside>
);

const RiskPolicyCard = ({ model }: RightRailProps) => (
  <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4">
    <h3 className="text-base font-bold text-white">Risk Policy</h3>
    <div className="mt-3 grid grid-cols-2 gap-3">
      {[
        ["Gross", `${model.status.defaultPolicy.maxGrossExposurePct}%`],
        ["Single", `${model.status.defaultPolicy.maxSinglePositionPct}%`],
        ["Order", formatCurrency(model.status.defaultPolicy.maxOrderNotional)],
        ["Data age", `${model.status.defaultPolicy.maxDataAgeMinutes}m`],
        ["Daily loss", `${model.status.defaultPolicy.maxDailyLossPct}%`],
        ["Drawdown", `${model.status.defaultPolicy.maxDrawdownPct}%`],
      ].map(([label, value]) => (
        <div
          key={label}
          className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3"
        >
          <div className="text-[11px] font-semibold uppercase text-[#707a8a]">
            {label}
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-white">
            {value}
          </div>
        </div>
      ))}
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      {model.status.defaultPolicy.allowedAssetClasses.map((assetClass) => (
        <span
          key={assetClass}
          className="rounded-md border border-[#2b3139] px-2 py-1 font-mono text-[11px] font-bold text-[#929aa5]"
        >
          {assetClass}
        </span>
      ))}
    </div>
  </section>
);

const LatestRiskEvaluationCard = ({ model }: RightRailProps) => {
  const evaluation = [...model.visibleRiskEvaluations].sort(
    (leftEvaluation, rightEvaluation) =>
      new Date(rightEvaluation.evaluatedAt).getTime() -
      new Date(leftEvaluation.evaluatedAt).getTime(),
  )[0];

  return (
    <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-white">Latest Risk</h3>
        {evaluation ? (
          <span
            className={`${decisionClasses[evaluation.decision]} rounded-md border px-2 py-1 text-[11px] font-bold`}
          >
            {evaluation.decision}
          </span>
        ) : (
          <span className="rounded-md border border-[#f0b90b]/30 bg-[#f0b90b]/10 px-2 py-1 text-[11px] font-bold text-[#fcd535]">
            missing
          </span>
        )}
      </div>
      {evaluation ? (
        <div className="mt-3 divide-y divide-[#2b3139] text-xs">
          {[
            ["source", `risk ${evaluation.id}`],
            ["proposal", evaluation.proposalId ?? "none"],
            ["mode", evaluation.responseSnapshot.mode],
            ["broker flag", formatBoolean(evaluation.brokerExecutionEnabled)],
            [
              "requiresHumanApproval",
              formatBoolean(evaluation.requiresHumanApproval),
            ],
            ["orders", evaluation.responseSnapshot.approvedOrderCount],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 py-2">
              <span className="text-[#707a8a]">{label}</span>
              <span className="text-right font-mono font-bold text-[#eaecef]">
                {value}
              </span>
            </div>
          ))}
          <div className="py-2 text-[#929aa5]">
            {evaluation.reasons[0] ?? "Risk evaluation recorded."}
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3 text-sm font-semibold text-[#929aa5]">
          No risk evaluation has been recorded yet.
        </div>
      )}
    </section>
  );
};

const SafetyGatesCard = () => (
  <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4">
    <h3 className="text-base font-bold text-white">Safety Gates</h3>
    <div className="mt-3 space-y-2">
      {SAFETY_GATES.map((gate) => (
        <details
          key={gate.name}
          className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3"
        >
          <summary className="flex cursor-pointer items-center justify-between gap-3">
            <span className="text-sm font-semibold text-[#eaecef]">
              {gate.name}
            </span>
            <span className={statusBadge(gate.status)}>
              {STATUS_LABELS[gate.status]}
            </span>
          </summary>
          <p className="mt-2 text-xs leading-5 text-[#929aa5]">{gate.notes}</p>
        </details>
      ))}
    </div>
  </section>
);

const LifecycleCard = () => (
  <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4">
    <h3 className="text-base font-bold text-white">
      Autonomous Investing Lifecycle
    </h3>
    <div className="mt-3 space-y-2">
      {CONTROL_PLANE_STAGES.map((stage) => (
        <div
          key={stage.phase}
          className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase text-[#707a8a]">
                {stage.phase}
              </div>
              <div className="mt-1 text-sm font-semibold text-white">
                {stage.title}
              </div>
            </div>
            <span className={statusBadge(stage.status)}>
              {STATUS_LABELS[stage.status]}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-[#929aa5]">
            {stage.description}
          </p>
        </div>
      ))}
    </div>
  </section>
);
