import { formatCurrency, formatDateTime } from "./dashboardFormat";
import { useDashboardLanguage } from "./dashboardLanguage";
import { DashboardModel } from "./useControlPlaneDashboard";

interface BrokerWriteReadinessPanelProps {
  model: DashboardModel;
}

export const BrokerWriteReadinessPanel = ({
  model,
}: BrokerWriteReadinessPanelProps) => {
  const { t } = useDashboardLanguage();
  const liveGate = model.controlStatus.liveTradingGate;
  const adapter = model.visibleBrokerAdapterStatus;
  const pilot = model.latestLivePilotReadiness;
  const snapshot = pilot?.readinessSnapshot;
  const hardStates: Array<[string, string]> = [
    [
      "brokerExecutionEnabled",
      String(model.controlStatus.brokerExecutionEnabled),
    ],
    ["liveTradingEnabled", String(model.status.liveTradingEnabled)],
    ["brokerWriteEnabled", String(liveGate.brokerWriteEnabled)],
    ["orderEndpointImplemented", String(liveGate.orderEndpointImplemented)],
  ];
  const preTradeCheckRows: Array<[string, boolean]> = [
    ["Funding", snapshot?.fundingReady ?? false],
    ["Schema migrations", snapshot?.schemaMigrationReady ?? false],
    ["Credential custody", adapter.credentialCustody.productionReady],
    ["Broker schema", adapter.schemaVerified],
    ["Sandbox parity", adapter.sandboxVerified],
    ["Read-only polling", adapter.readOnlyPoll.canPoll],
    ["Fill polling", adapter.readOnlyPoll.canPollFills === true],
    ["Cancel orders", adapter.emergencyControls.brokerCancelReady],
    ["Flatten positions", adapter.emergencyControls.brokerFlattenReady],
    ["Open-order polling", adapter.emergencyControls.openOrderPollingReady],
  ];
  const blockers = [
    ...(pilot?.blockers ?? []),
    ...liveGate.blockers,
    ...adapter.emergencyControls.blockers,
  ];
  const uniqueBlockers = [...new Set(blockers)].slice(0, 8);
  const pilotRows: Array<[string, string]> = pilot
    ? [
        [
          "pre-trade check budget",
          formatCurrency(pilot.pilotBudgetAmount, pilot.currency),
        ],
        [
          "single order cap",
          formatCurrency(pilot.maxSingleOrderNotional, pilot.currency),
        ],
        ["funding", String(pilot.fundingReadinessId ?? "none")],
        ["checked", formatDateTime(pilot.checkedAt)],
      ]
    : [];

  return (
    <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-white">
            {t("Broker Write Readiness")}
          </h3>
          <div className="mt-1 text-[11px] font-bold uppercase text-[#fcd535]">
            {t(model.sources.livePilotReadiness)}
          </div>
          <p className="mt-1 text-xs leading-5 text-[#707a8a]">
            {t(
              "Broker-write pre-trade risk check artifacts. This panel explains why real-money broker writes remain out of active scope.",
            )}
          </p>
        </div>
        <span className="rounded-md border border-[#f6465d]/40 bg-[#f6465d]/10 px-2 py-1 text-[11px] font-bold uppercase text-[#f6465d]">
          {t(pilot?.status ?? "blocked")}
        </span>
      </div>

      {model.errors.livePilotReadiness && (
        <div className="mt-3 rounded-lg border border-[#f0b90b]/30 bg-[#f0b90b]/10 p-3 text-xs font-semibold text-[#fcd535]">
          {t(model.errors.livePilotReadiness)}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        {hardStates.map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3"
          >
            <div className="text-[11px] font-bold uppercase text-[#707a8a]">
              {t(label)}
            </div>
            <div className="mt-1 font-mono text-sm font-bold text-[#f6465d]">
              {t(value)}
            </div>
          </div>
        ))}
      </div>

      {pilot && (
        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
          {pilotRows.map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-3 rounded-md border border-[#2b3139] bg-[#0b0e11] px-3 py-2"
            >
              <span className="font-bold uppercase text-[#707a8a]">
                {t(String(label))}
              </span>
              <span className="text-right font-mono font-bold text-[#eaecef]">
                {t(String(value))}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {preTradeCheckRows.map(([label, ready]) => (
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

      <div className="mt-4 rounded-lg border border-[#f6465d]/30 bg-[#f6465d]/10 p-3 text-xs text-[#eaecef]">
        <div className="text-[11px] font-bold uppercase text-[#f6465d]">
          {t("Broker write blockers")}
        </div>
        <div className="mt-2 space-y-1 font-mono">
          {uniqueBlockers.map((blocker) => (
            <div key={blocker}>{t(blocker)}</div>
          ))}
        </div>
      </div>
    </section>
  );
};
