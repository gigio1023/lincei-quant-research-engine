import { formatCurrency, formatDateTime } from "./dashboardFormat";
import { useDashboardLanguage } from "./dashboardLanguage";
import { DashboardModel } from "./useControlPlaneDashboard";

interface BrokerOrderCommandPanelProps {
  model: DashboardModel;
}

export const BrokerOrderCommandPanel = ({
  model,
}: BrokerOrderCommandPanelProps) => {
  const { t } = useDashboardLanguage();
  const command = model.latestBrokerOrderCommand;
  const snapshot = command?.readinessSnapshot;
  const orderIntents = command?.orderIntents ?? [];
  const emergencyActions = command?.emergencyActions ?? [];
  const blockers = command?.blockedReasons.slice(0, 5) ?? [
    "No broker order command dry-run has been recorded.",
  ];
  const readinessRows: Array<[string, boolean]> = [
    ["broker-write preflight", snapshot?.livePilotReady ?? false],
    ["signed approval", snapshot?.signedPaperApprovalReady ?? false],
    ["schema", snapshot?.brokerSchemaVerified ?? false],
    ["sandbox", snapshot?.brokerSandboxVerified ?? false],
    ["read-only", snapshot?.brokerReadOnlyReady ?? false],
    ["fill polling", snapshot?.brokerFillPollingReady ?? false],
    ["cancel", snapshot?.brokerCancelReady ?? false],
    ["flatten", snapshot?.brokerFlattenReady ?? false],
    ["open orders", snapshot?.openOrderPollingReady ?? false],
    ["dry run only", snapshot?.dryRunOnly ?? true],
  ];

  return (
    <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white">
            {t("Broker Order Command Ledger")}
          </h3>
          <div className="mt-1 text-[11px] font-bold uppercase text-[#fcd535]">
            {t(model.sources.brokerOrderCommands)}
          </div>
          <p className="mt-1 text-xs leading-5 text-[#707a8a]">
            {t(
              "Dry-run broker command evidence. It shows what would be prepared, not submitted.",
            )}
          </p>
        </div>
        <span className="rounded-md border border-[#f6465d]/40 bg-[#f6465d]/10 px-2 py-1 text-[11px] font-bold uppercase text-[#f6465d]">
          {t(command?.status ?? "blocked")}
        </span>
      </div>

      {model.errors.brokerOrderCommands && (
        <div className="mt-3 rounded-lg border border-[#f0b90b]/30 bg-[#f0b90b]/10 p-3 text-xs font-semibold text-[#fcd535]">
          {t(model.errors.brokerOrderCommands)}
        </div>
      )}

      {command && (
        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
          {[
            ["command", command.commandType],
            ["mode", command.mode],
            ["provider", command.provider],
            ["checked", formatDateTime(command.checkedAt)],
            ["paper plan", command.paperOrderPlanId ?? "none"],
            ["approval", command.orderPlanApprovalId ?? "none"],
            ["preflight", command.livePilotReadinessId ?? "none"],
            ["hash", command.commandHash],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-3 rounded-md border border-[#2b3139] bg-[#0b0e11] px-3 py-2"
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
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {readinessRows.map(([label, ready]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-3 rounded-md border border-[#2b3139] bg-[#0b0e11] px-3 py-2 text-xs"
          >
            <span className="font-semibold text-[#eaecef]">
              {t(String(label))}
            </span>
            <span
              className={`rounded px-2 py-1 font-mono text-[11px] font-bold uppercase ${
                ready
                  ? "bg-[#0ecb81]/10 text-[#0ecb81]"
                  : "bg-[#f6465d]/10 text-[#f6465d]"
              }`}
            >
              {t(ready ? "ready" : "blocked")}
            </span>
          </div>
        ))}
      </div>

      {orderIntents.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-[11px] font-bold uppercase text-[#707a8a]">
            {t("Order intents")}
          </div>
          {orderIntents.map((intent, index) => (
            <div
              key={intent.brokerOrderIntentId ?? `${intent.symbol}-${index}`}
              className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono font-bold text-white">
                  {intent.symbol} {intent.side} {intent.orderType}
                </span>
                <span className="font-mono text-[#fcd535]">
                  {formatCurrency(intent.requestedNotional)}
                </span>
              </div>
              <div className="mt-2 font-mono text-[#929aa5]">
                {t(intent.blockedReason)}
              </div>
            </div>
          ))}
        </div>
      )}

      {emergencyActions.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-[11px] font-bold uppercase text-[#707a8a]">
            {t("Emergency dry runs")}
          </div>
          {emergencyActions.map((action, index) => (
            <div
              key={action.actionId ?? `${action.actionType}-${index}`}
              className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3 text-xs"
            >
              <div className="font-mono font-bold text-white">
                {t(action.actionType)}
              </div>
              <div className="mt-2 font-mono text-[#929aa5]">
                {t(action.blockedReason)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-lg border border-[#f6465d]/30 bg-[#f6465d]/10 p-3 text-xs text-[#eaecef]">
        <div className="text-[11px] font-bold uppercase text-[#f6465d]">
          {t("Command blockers")}
        </div>
        <div className="mt-2 space-y-1 font-mono">
          {blockers.map((blocker) => (
            <div key={blocker}>{t(blocker)}</div>
          ))}
        </div>
      </div>
    </section>
  );
};
