import { ControlPlaneAuditEvent } from "../../types";
import { formatDateTime } from "./dashboardFormat";
import { useDashboardLanguage } from "./dashboardLanguage";
import { DashboardModel } from "./useControlPlaneDashboard";

interface ActionAuditTimelinePanelProps {
  model: DashboardModel;
}

const severityClass: Record<ControlPlaneAuditEvent["severity"], string> = {
  ready: "border-[#0ecb81]/40 bg-[#0ecb81]/10 text-[#0ecb81]",
  attention: "border-[#f0b90b]/40 bg-[#f0b90b]/10 text-[#fcd535]",
  blocked: "border-[#f6465d]/40 bg-[#f6465d]/10 text-[#f6465d]",
  info: "border-[#2b3139] bg-[#0b0e11] text-[#929aa5]",
};

export const ActionAuditTimelinePanel = ({
  model,
}: ActionAuditTimelinePanelProps) => {
  const { t } = useDashboardLanguage();
  const events = model.visibleActionTimeline.slice(0, 8);

  return (
    <section
      aria-label={t("Action Audit Timeline")}
      className="rounded-xl border border-[#2b3139] bg-[#181a20]"
    >
      <div className="flex flex-col gap-3 border-b border-[#2b3139] p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-bold text-white">
            {t("Action Audit Timeline")}
          </h3>
          <p className="mt-1 text-xs text-[#929aa5]">
            {t(
              "Chronological audit feed across research, schedules, approvals, paper execution, broker evidence, and emergency controls.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-md border border-[#2b3139] bg-[#0b0e11] px-2 py-1 font-bold uppercase text-[#929aa5]">
            {t(model.sources.actionTimeline)}
          </span>
          <span className="font-mono font-bold text-[#fcd535]">
            {events.length} {t("events")}
          </span>
        </div>
      </div>

      <div className="p-4">
        {model.errors.actionTimeline && (
          <div className="mb-3 rounded-lg border border-[#f0b90b]/30 bg-[#f0b90b]/10 p-3 text-xs font-semibold text-[#fcd535]">
            {t(model.errors.actionTimeline)}
          </div>
        )}

        {events.length === 0 ? (
          <div className="rounded-lg border border-[#2b3139] bg-[#0b0e11] p-4 text-sm font-semibold text-[#929aa5]">
            {t("No action audit events recorded yet.")}
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {events.map((event) => (
              <article
                key={event.id}
                className="min-w-0 rounded-lg border border-[#2b3139] bg-[#0b0e11] p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span
                    className={`rounded-md border px-2 py-1 text-[11px] font-bold uppercase ${severityClass[event.severity]}`}
                  >
                    {t(event.severity)}
                  </span>
                  <span className="truncate font-mono text-[11px] text-[#707a8a]">
                    {formatDateTime(event.at)}
                  </span>
                </div>
                <div className="text-[11px] font-bold uppercase text-[#707a8a]">
                  {t(event.category)}
                </div>
                <div className="mt-1 truncate text-sm font-bold text-white">
                  {t(event.title)}
                </div>
                <div className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-[#929aa5]">
                  {t(event.detail)}
                </div>
                <div className="mt-2 truncate font-mono text-[11px] text-[#707a8a]">
                  {event.sourceType}
                  {event.sourceId ? `:${event.sourceId}` : ""}
                  {event.cycleKey ? ` / ${event.cycleKey}` : ""}
                </div>
                {event.blocker && (
                  <div className="mt-2 line-clamp-2 text-xs font-semibold text-[#f6465d]">
                    {t(event.blocker)}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
