import { useCallback, useEffect, useMemo, useState } from "react";
import { v1PilotApi } from "../../services/api";
import type { V1PilotSystemStatus } from "../../types/v1Pilot";
import {
  buildCycleMetrics,
  buildCycleStages,
  currentMilestoneBlockers,
  splitCycleStages,
  type CycleMetric,
  type CycleStageView,
} from "./cycleModel";

export interface BacktestCycleDashboardModel {
  status: V1PilotSystemStatus | null;
  stages: CycleStageView[];
  parallelStages: CycleStageView[];
  singleWriterStages: CycleStageView[];
  deferredStages: CycleStageView[];
  primaryBlockers: string[];
  metrics: CycleMetric[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useBacktestCycleDashboard = (): BacktestCycleDashboardModel => {
  const [status, setStatus] = useState<V1PilotSystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await v1PilotApi.getStatus());
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Failed to load V1 pilot status.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(() => {
    const stages = buildCycleStages(status);
    const split = splitCycleStages(stages);
    return {
      status,
      stages,
      parallelStages: split.parallel,
      singleWriterStages: split.singleWriter,
      deferredStages: split.deferred,
      primaryBlockers: currentMilestoneBlockers(stages),
      metrics: buildCycleMetrics(status),
      loading,
      error,
      refresh,
    };
  }, [error, loading, refresh, status]);
};
