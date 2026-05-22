import { AutonomousRunStatus } from "../../types";
import { DashboardModel } from "./useControlPlaneDashboard";

interface AutonomousRunLedgerProps {
  model: DashboardModel;
}

const statusClass = (status: AutonomousRunStatus) => {
  if (["paper_ready", "completed"].includes(status)) {
    return "border-[#0ecb81]/40 bg-[#0ecb81]/10 text-[#0ecb81]";
  }

  if (["failed", "halted"].includes(status)) {
    return "border-[#f6465d]/40 bg-[#f6465d]/10 text-[#f6465d]";
  }

  if (["paused", "risk_checked"].includes(status)) {
    return "border-[#f0b90b]/40 bg-[#f0b90b]/10 text-[#fcd535]";
  }

  return "border-[#2b3139] bg-[#0b0e11] text-[#929aa5]";
};

export const AutonomousRunLedger = ({ model }: AutonomousRunLedgerProps) => {
  const run = model.latestRun;
  const schedule = model.latestRunSchedule;

  return (
    <section className="rounded-xl border border-[#2b3139] bg-[#181a20]">
      <div className="flex flex-col gap-3 border-b border-[#2b3139] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-bold text-white">
            Automation Action Ledger
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-[#929aa5]">
              {model.sources.runs}
            </span>
            <span className="font-semibold text-[#929aa5]">
              {model.sources.runSchedules}
            </span>
            <span className="font-bold text-[#f6465d]">Live broker off</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={model.tickLatestSchedule}
            disabled={
              !schedule ||
              model.loading.runSchedules ||
              model.tickingSchedule ||
              model.sources.runSchedules !== "Live run schedules"
            }
            className="h-10 rounded-md border border-[#2b3139] bg-[#1e2329] px-4 text-sm font-bold text-white transition hover:bg-[#2b3139] disabled:cursor-not-allowed disabled:text-[#707a8a]"
          >
            {model.tickingSchedule ? "Ticking schedule" : "Tick schedule"}
          </button>
          <button
            type="button"
            onClick={model.advanceLatestRun}
            disabled={
              !run ||
              model.loading.runs ||
              model.advancingRun ||
              model.sources.runs !== "Live autonomous runs"
            }
            className="h-10 rounded-md bg-[#fcd535] px-4 text-sm font-bold text-[#181a20] transition hover:bg-[#f0b90b] disabled:cursor-not-allowed disabled:bg-[#3a3a1f] disabled:text-[#707a8a]"
          >
            {model.advancingRun ? "Advancing run" : "Advance latest run"}
          </button>
        </div>
      </div>

      <div className="p-4">
        {model.errors.runs && (
          <div className="mb-3 rounded-lg border border-[#f0b90b]/30 bg-[#f0b90b]/10 p-3 text-xs font-semibold text-[#fcd535]">
            {model.errors.runs}
          </div>
        )}
        {model.errors.runSchedules && (
          <div className="mb-3 rounded-lg border border-[#f0b90b]/30 bg-[#f0b90b]/10 p-3 text-xs font-semibold text-[#fcd535]">
            {model.errors.runSchedules}
          </div>
        )}

        {schedule && (
          <div className="mb-4 grid gap-2 rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3 text-xs md:grid-cols-3 xl:grid-cols-6">
            {[
              ["schedule", schedule.id],
              ["state", schedule.enabled ? "enabled" : "disabled"],
              ["cadence", `${schedule.cadenceMinutes}m`],
              ["next", new Date(schedule.nextRunAt).toLocaleString()],
              ["lease", schedule.leaseOwner ?? "free"],
              [
                "expires",
                schedule.leaseExpiresAt
                  ? new Date(schedule.leaseExpiresAt).toLocaleString()
                  : "none",
              ],
              [
                "last tick",
                schedule.lastTickAt
                  ? new Date(schedule.lastTickAt).toLocaleString()
                  : "none",
              ],
              ["paper", schedule.attemptPaperExecution ? "attempt" : "off"],
              ["last cycle", schedule.lastCycleKey ?? "none"],
              ["last error", schedule.lastError ?? "none"],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="font-bold uppercase text-[#707a8a]">
                  {label}
                </div>
                <div className="mt-1 truncate font-mono font-bold text-[#eaecef]">
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}

        {!run ? (
          <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-4 text-sm font-semibold text-[#929aa5]">
            No autonomous run has been recorded yet.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[0.76fr_1.24fr]">
            <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase text-[#707a8a]">
                    Latest run
                  </div>
                  <div className="mt-2 text-sm font-bold leading-5 text-white">
                    {run.objective}
                  </div>
                </div>
                <span
                  className={`${statusClass(
                    run.status,
                  )} rounded-md border px-2 py-1 text-[11px] font-bold uppercase`}
                >
                  {run.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                {[
                  ["run", run.id],
                  ["stage", run.currentStage],
                  ["schedule", run.scheduleId ?? "none"],
                  ["cycle", run.cycleKey ?? "none"],
                  ["budget", run.budgetEnvelopeId ?? "none"],
                  ["research", run.researchRunId ?? "none"],
                  ["proposal", run.proposalId ?? "none"],
                  ["risk", run.riskEvaluationId ?? "none"],
                  ["paper", run.paperOrderPlanId ?? "none"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-md border border-[#2b3139] p-2"
                  >
                    <div className="font-semibold uppercase text-[#707a8a]">
                      {label}
                    </div>
                    <div className="mt-1 truncate font-mono font-bold text-[#eaecef]">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-md border border-[#2b3139] p-3">
                <div className="text-[11px] font-bold uppercase text-[#707a8a]">
                  Next action
                </div>
                <div className="mt-2 text-xs font-semibold leading-5 text-[#eaecef]">
                  {run.nextAction ?? "No next action recorded"}
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-4">
              <div className="mb-3 text-[11px] font-bold uppercase text-[#707a8a]">
                Timeline
              </div>
              <div className="space-y-2">
                {run.timeline.slice(-6).map((event, index) => (
                  <div
                    key={`${event.at}-${event.stage}-${index}`}
                    className="grid gap-2 rounded-md border border-[#2b3139] p-3 text-xs sm:grid-cols-[120px_120px_1fr]"
                  >
                    <div className="font-mono text-[#707a8a]">
                      {new Date(event.at).toLocaleTimeString()}
                    </div>
                    <div className="font-bold uppercase text-[#fcd535]">
                      {event.stage}
                    </div>
                    <div className="font-semibold leading-5 text-[#eaecef]">
                      {event.message}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
