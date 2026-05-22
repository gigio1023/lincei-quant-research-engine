import {
  CONTROL_PLANE_STAGES,
  EXAMPLE_EVALUATION,
  EXAMPLE_REQUEST,
  SAFETY_GATES,
} from "./dashboardConstants";
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
  <aside className="space-y-4">
    <RiskPolicyCard model={model} />
    <OrderPlanApprovalPanel model={model} />
    <ExampleEvaluationCard />
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

const ExampleEvaluationCard = () => {
  const exampleOrder = EXAMPLE_REQUEST.orders[0];

  return (
    <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-white">Example Evaluation</h3>
        <span
          className={`${decisionClasses[EXAMPLE_EVALUATION.decision]} rounded-md border px-2 py-1 text-[11px] font-bold`}
        >
          {EXAMPLE_EVALUATION.decision}
        </span>
      </div>
      <div className="mt-3 divide-y divide-[#2b3139] text-xs">
        {[
          ["mode", EXAMPLE_EVALUATION.mode],
          [
            "broker flag",
            formatBoolean(EXAMPLE_EVALUATION.brokerExecutionEnabled),
          ],
          [
            "requiresHumanApproval",
            formatBoolean(EXAMPLE_EVALUATION.requiresHumanApproval),
          ],
          ["symbol", exampleOrder.symbol],
          ["notional", formatCurrency(exampleOrder.notional)],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 py-2">
            <span className="text-[#707a8a]">{label}</span>
            <span className="text-right font-mono font-bold text-[#eaecef]">
              {value}
            </span>
          </div>
        ))}
      </div>
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
