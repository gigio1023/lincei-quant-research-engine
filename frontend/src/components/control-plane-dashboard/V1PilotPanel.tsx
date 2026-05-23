import { useEffect, useState } from "react";
import { v1PilotApi } from "../../services/api";

interface V1PilotStatus {
  leanRun: { runId: string; status: string } | null;
  preflight: { status: string; blockers: string[] };
}

export const V1PilotPanel = () => {
  const [status, setStatus] = useState<V1PilotStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    v1PilotApi
      .getStatus()
      .then(setStatus)
      .catch((fetchError: Error) => setError(fetchError.message));
  }, []);

  return (
    <section className="rounded-xl border border-[#2b3139] bg-[#181a20] p-4">
      <h3 className="text-base font-bold text-white">V1 Live Pilot</h3>
      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      {status ? (
        <div className="mt-3 space-y-2 text-sm text-[#b7bdc6]">
          <p>
            LEAN run:{" "}
            <span className="font-mono text-white">
              {status.leanRun?.runId ?? "none"}
            </span>{" "}
            ({status.leanRun?.status ?? "missing"})
          </p>
          <p>
            Preflight:{" "}
            <span
              className={
                status.preflight.status === "ready"
                  ? "text-green-400"
                  : "text-amber-300"
              }
            >
              {status.preflight.status}
            </span>
          </p>
          {status.preflight.blockers.length > 0 ? (
            <ul className="list-disc pl-5 text-xs text-amber-200">
              {status.preflight.blockers.slice(0, 5).map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-sm text-[#707a8a]">Loading V1 pilot status…</p>
      )}
    </section>
  );
};
