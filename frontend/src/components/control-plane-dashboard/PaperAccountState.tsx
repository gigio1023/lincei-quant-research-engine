import {
  formatCurrency,
  formatDateTime,
  formatPercent,
  formatSignedCurrency,
  paperOrderPlanStatusClass,
} from "./dashboardFormat";
import { useDashboardLanguage } from "./dashboardLanguage";
import { DashboardModel } from "./useControlPlaneDashboard";

interface PaperAccountStateProps {
  model: DashboardModel;
}

export const PaperAccountState = ({ model }: PaperAccountStateProps) => {
  const { t } = useDashboardLanguage();
  const account = model.visiblePaperAccount;

  return (
    <div className="border-b border-[#2b3139] p-4 xl:border-b-0 xl:border-r">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-white">
          {t("Paper Account State")}
        </h4>
        <span className="rounded-md border border-[#2b3139] px-2 py-1 text-[11px] font-bold uppercase text-[#929aa5]">
          {t(model.sources.paperAccount)}
        </span>
      </div>

      <RecoveryProposalAction model={model} />

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
              ? t("Paper account state is loading.")
              : t(
                  "No promoted paper account is active yet. Seed and promote a paper account before paper execution.",
                )}
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

const RecoveryProposalAction = ({ model }: PaperAccountStateProps) => {
  const { t } = useDashboardLanguage();
  const account = model.visiblePaperAccount;
  const hasLongPosition = Boolean(
    account?.positions.some((position) => position.marketValue > 0),
  );
  const disabled =
    !account ||
    account.status !== "active" ||
    !hasLongPosition ||
    model.controlStatus.killSwitch.tripped ||
    model.visibleExecutionControl.state === "halted" ||
    model.runningRecoveryProposal;

  return (
    <div className="mb-3 rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase text-[#707a8a]">
            {t("Recovery proposal")}
          </div>
          <div className="mt-1 text-sm font-semibold text-[#eaecef]">
            {t(
              "Generate a SELL-only recovery proposal from active paper positions.",
            )}
          </div>
        </div>
        <button
          className="min-h-10 rounded-md bg-[#fcd535] px-4 py-2 text-sm font-bold text-[#181a20] transition hover:bg-[#f0b90b] disabled:cursor-not-allowed disabled:bg-[#3a3a1f] disabled:text-[#707a8a]"
          type="button"
          onClick={model.runRecoveryProposal}
          disabled={disabled}
        >
          {model.runningRecoveryProposal
            ? t("Creating...")
            : t("Create sell-only recovery")}
        </button>
      </div>
      {model.recoveryProposalSuccess && (
        <div className="mt-3 rounded-md border border-[#0ecb81]/30 bg-[#0ecb81]/10 p-2 text-xs font-semibold text-[#0ecb81]">
          {model.recoveryProposalSuccess}
        </div>
      )}
      {model.errors.recoveryProposal && (
        <div className="mt-3 rounded-md border border-[#f6465d]/30 bg-[#f6465d]/10 p-2 text-xs font-semibold text-[#f6465d]">
          {model.errors.recoveryProposal}
        </div>
      )}
      {!hasLongPosition && account && (
        <div className="mt-2 text-xs font-semibold text-[#707a8a]">
          {t("No long paper positions are available for a recovery proposal.")}
        </div>
      )}
    </div>
  );
};

const AccountStats = ({ model }: PaperAccountStateProps) => {
  const { t } = useDashboardLanguage();
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
            {t(label)}
          </div>
          <div className="mt-2 font-mono text-base font-bold text-white">
            {value}
          </div>
        </div>
      ))}
    </div>
  );
};

const ExecutionControl = ({ model }: PaperAccountStateProps) => {
  const { t } = useDashboardLanguage();

  return (
    <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-bold uppercase text-[#707a8a]">
          {t("Execution control")}
        </div>
        <span
          className={`${paperOrderPlanStatusClass(
            model.visibleExecutionControl.state,
          )} rounded-md border px-2 py-1 text-[11px] font-bold uppercase`}
        >
          {t(model.visibleExecutionControl.state)}
        </span>
      </div>
      <p className="mt-2 text-xs font-semibold leading-5 text-[#eaecef]">
        {t(model.visibleExecutionControl.reason)}
      </p>
      <div className="mt-2 text-xs text-[#707a8a]">
        {model.visibleExecutionControl.actor} /{" "}
        {formatDateTime(model.visibleExecutionControl.createdAt)}
      </div>
    </div>
  );
};

const Positions = ({ model }: PaperAccountStateProps) => {
  const { t } = useDashboardLanguage();
  const positions = model.visiblePaperAccount?.positions ?? [];

  return (
    <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
      <div className="mb-2 text-xs font-bold uppercase text-[#707a8a]">
        {t("Positions")}
      </div>
      {positions.length === 0 ? (
        <div className="text-sm font-semibold text-[#929aa5]">
          {t("No paper positions recorded.")}
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
              <span className="col-span-3 font-mono text-xs text-[#929aa5]">
                {t("qty")} {position.quantity?.toLocaleString() ?? "n/a"} /{" "}
                {t("avg")}{" "}
                {position.averagePrice === undefined
                  ? "n/a"
                  : formatCurrency(position.averagePrice)}{" "}
                / {t("cost")}{" "}
                {position.costBasis === undefined
                  ? "n/a"
                  : formatCurrency(position.costBasis)}{" "}
                / {t("realized")}{" "}
                {position.realizedPnl === undefined
                  ? "n/a"
                  : formatSignedCurrency(position.realizedPnl)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const LedgerSummary = ({ model }: PaperAccountStateProps) => {
  const { t } = useDashboardLanguage();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
        <div className="text-xs font-bold uppercase text-[#707a8a]">
          {t("Last reconciliation")}
        </div>
        <div className="mt-2 text-sm font-semibold text-[#eaecef]">
          {model.visiblePaperAccount?.lastReconciledAt
            ? formatDateTime(model.visiblePaperAccount.lastReconciledAt)
            : t("Not reconciled")}
        </div>
        <div className="mt-1 text-xs text-[#707a8a]">
          {t("Latest plan")}:{" "}
          {model.latestReconciledPlan
            ? `${model.latestReconciledPlan.id} / ${t(
                model.latestReconciledPlan.reconciliation.status,
              )}`
            : t("No reconciled plan")}
        </div>
      </div>

      <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3">
        <AccountEventChain model={model} compact />
        <div className="mt-3 text-xs font-bold uppercase text-[#707a8a]">
          {t("Recent ledger changes")}
        </div>
        {model.recentPaperLedgerChanges.length === 0 ? (
          <div className="mt-2 text-sm font-semibold text-[#929aa5]">
            {t("No paper ledger changes recorded.")}
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            {model.recentPaperLedgerChanges.slice(0, 4).map((entry) => (
              <div
                key={`paper-ledger-${entry.id}`}
                className="grid grid-cols-[0.5fr_0.8fr_1fr] gap-2 text-xs"
              >
                <span className="uppercase text-[#707a8a]">
                  {t(entry.kind)}
                </span>
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
                    : `${entry.symbol} ${t("position")}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const AccountEventChain = ({
  model,
  compact = false,
}: PaperAccountStateProps & { compact?: boolean }) => {
  const { t } = useDashboardLanguage();

  return (
    <div
      className={
        compact ? "" : "rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-bold uppercase text-[#707a8a]">
          {t("Account event chain")}
        </div>
        <span className="rounded-md border border-[#2b3139] px-2 py-1 text-[10px] font-bold uppercase text-[#929aa5]">
          {t(model.sources.paperAccountEvents)}
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
            {t(model.visiblePaperAccountEvents[0].reason)}
          </div>
          <div className="mt-1 truncate font-mono text-[#707a8a]">
            {model.visiblePaperAccountEvents[0].eventHash}
          </div>
        </div>
      ) : (
        <div className="mt-2 text-sm font-semibold text-[#929aa5]">
          {t("No paper account events recorded.")}
        </div>
      )}
    </div>
  );
};
