import {
  formatCurrency,
  formatDateTime,
  formatPercent,
  formatSignedCurrency,
  paperOrderPlanStatusClass,
} from "./dashboardFormat";
import { DashboardModel } from "./useControlPlaneDashboard";

interface PaperAccountStateProps {
  model: DashboardModel;
}

export const PaperAccountState = ({ model }: PaperAccountStateProps) => {
  const account = model.visiblePaperAccount;

  return (
    <div className="border-b border-[#2b3139] p-4 xl:border-b-0 xl:border-r">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-white">Paper Account State</h4>
        <span className="rounded-md border border-[#2b3139] px-2 py-1 text-[11px] font-bold uppercase text-[#929aa5]">
          {model.sources.paperAccount}
        </span>
      </div>

      {model.errors.paperAccount && (
        <div className="mb-3 rounded-lg border border-[#f0b90b]/30 bg-[#f0b90b]/10 p-3 text-xs font-semibold text-[#fcd535]">
          {model.errors.paperAccount}
        </div>
      )}
      {model.errors.paperAccountEvents && (
        <div className="mb-3 rounded-lg border border-[#f0b90b]/30 bg-[#f0b90b]/10 p-3 text-xs font-semibold text-[#fcd535]">
          {model.errors.paperAccountEvents}
        </div>
      )}

      {!account ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-4 text-sm font-semibold text-[#929aa5]">
            {model.loading.paperAccount
              ? "Paper account state is loading."
              : "No promoted paper account is active yet. Seed and promote a paper account before paper execution."}
          </div>
          <AccountEventChain model={model} />
        </div>
      ) : (
        <div className="space-y-4">
          <AccountStats model={model} />
          <ExecutionControl model={model} />
          <Positions model={model} />
          <LedgerSummary model={model} />
        </div>
      )}
    </div>
  );
};

const AccountStats = ({ model }: PaperAccountStateProps) => {
  const account = model.visiblePaperAccount;
  if (!account) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        ["Cash", formatCurrency(account.cash)],
        ["Equity", formatCurrency(account.equity)],
        ["Gross exposure", formatPercent(account.grossExposurePct)],
        ["Currency", account.currency],
      ].map(([label, value]) => (
        <div
          key={`paper-account-${label}`}
          className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3"
        >
          <div className="text-[11px] font-semibold uppercase text-[#707a8a]">
            {label}
          </div>
          <div className="mt-2 font-mono text-base font-bold text-white">
            {value}
          </div>
        </div>
      ))}
    </div>
  );
};

const ExecutionControl = ({ model }: PaperAccountStateProps) => (
  <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs font-bold uppercase text-[#707a8a]">
        Execution control
      </div>
      <span
        className={`${paperOrderPlanStatusClass(
          model.visibleExecutionControl.state,
        )} rounded-md border px-2 py-1 text-[11px] font-bold uppercase`}
      >
        {model.visibleExecutionControl.state}
      </span>
    </div>
    <p className="mt-2 text-xs font-semibold leading-5 text-[#eaecef]">
      {model.visibleExecutionControl.reason}
    </p>
    <div className="mt-2 text-xs text-[#707a8a]">
      {model.visibleExecutionControl.actor} /{" "}
      {formatDateTime(model.visibleExecutionControl.createdAt)}
    </div>
  </div>
);

const Positions = ({ model }: PaperAccountStateProps) => {
  const positions = model.visiblePaperAccount?.positions ?? [];

  return (
    <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
      <div className="mb-2 text-xs font-bold uppercase text-[#707a8a]">
        Positions
      </div>
      {positions.length === 0 ? (
        <div className="text-sm font-semibold text-[#929aa5]">
          No paper positions recorded.
        </div>
      ) : (
        <div className="divide-y divide-[#2b3139]">
          {positions.map((position) => (
            <div
              key={`paper-account-position-${position.symbol}`}
              className="grid grid-cols-[1fr_1fr_0.7fr] gap-3 py-2 text-sm"
            >
              <span className="font-mono font-bold text-white">
                {position.symbol}
              </span>
              <span className="font-mono text-[#eaecef]">
                {formatCurrency(position.marketValue)}
              </span>
              <span className="font-mono text-[#0ecb81]">
                {formatPercent(position.weightPct)}
              </span>
              <span className="col-span-3 text-xs uppercase text-[#707a8a]">
                {position.assetClass}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const LedgerSummary = ({ model }: PaperAccountStateProps) => (
  <div className="grid gap-3 sm:grid-cols-2">
    <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
      <div className="text-xs font-bold uppercase text-[#707a8a]">
        Last reconciliation
      </div>
      <div className="mt-2 text-sm font-semibold text-[#eaecef]">
        {model.visiblePaperAccount?.lastReconciledAt
          ? formatDateTime(model.visiblePaperAccount.lastReconciledAt)
          : "Not reconciled"}
      </div>
      <div className="mt-1 text-xs text-[#707a8a]">
        Latest plan:{" "}
        {model.latestReconciledPlan
          ? `${model.latestReconciledPlan.id} / ${model.latestReconciledPlan.reconciliation.status}`
          : "No reconciled plan"}
      </div>
    </div>

    <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
      <AccountEventChain model={model} compact />
      <div className="mt-3 text-xs font-bold uppercase text-[#707a8a]">
        Recent ledger changes
      </div>
      {model.recentPaperLedgerChanges.length === 0 ? (
        <div className="mt-2 text-sm font-semibold text-[#929aa5]">
          No paper ledger changes recorded.
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          {model.recentPaperLedgerChanges.slice(0, 4).map((entry) => (
            <div
              key={`paper-ledger-${entry.id}`}
              className="grid grid-cols-[0.5fr_0.8fr_1fr] gap-2 text-xs"
            >
              <span className="uppercase text-[#707a8a]">{entry.kind}</span>
              <span
                className={
                  entry.kind === "cash"
                    ? entry.amount < 0
                      ? "font-mono text-[#f6465d]"
                      : "font-mono text-[#0ecb81]"
                    : entry.notionalDelta < 0
                      ? "font-mono text-[#f6465d]"
                      : "font-mono text-[#0ecb81]"
                }
              >
                {entry.kind === "cash"
                  ? formatSignedCurrency(entry.amount)
                  : formatSignedCurrency(entry.notionalDelta)}
              </span>
              <span className="truncate text-[#929aa5]">
                {entry.kind === "cash"
                  ? entry.reason
                  : `${entry.symbol} position`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

const AccountEventChain = ({
  model,
  compact = false,
}: PaperAccountStateProps & { compact?: boolean }) => (
  <div
    className={
      compact ? "" : "rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3"
    }
  >
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs font-bold uppercase text-[#707a8a]">
        Account event chain
      </div>
      <span className="rounded-md border border-[#2b3139] px-2 py-1 text-[10px] font-bold uppercase text-[#929aa5]">
        {model.sources.paperAccountEvents}
      </span>
    </div>
    {model.visiblePaperAccountEvents.length > 0 ? (
      <div className="mt-2 rounded-md border border-[#2b3139] bg-[#151a21] p-2 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono font-bold text-white">
            {model.visiblePaperAccountEvents[0].eventType}
          </span>
          <span className="font-mono text-[#fcd535]">
            #{model.visiblePaperAccountEvents[0].sequence}
          </span>
        </div>
        <div className="mt-1 truncate text-[#929aa5]">
          {model.visiblePaperAccountEvents[0].reason}
        </div>
        <div className="mt-1 truncate font-mono text-[#707a8a]">
          {model.visiblePaperAccountEvents[0].eventHash}
        </div>
      </div>
    ) : (
      <div className="mt-2 text-sm font-semibold text-[#929aa5]">
        No paper account events recorded.
      </div>
    )}
  </div>
);
