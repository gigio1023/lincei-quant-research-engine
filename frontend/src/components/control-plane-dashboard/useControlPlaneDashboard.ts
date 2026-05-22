import { useEffect, useState } from "react";
import { controlPlaneApi, riskGateApi } from "../../services/api";
import {
  ControlPlaneReadinessItem,
  ControlPlaneStatus,
  ExecutionControlState,
  PaperAccount,
  PaperLedgerChange,
  PaperOrderPlan,
  ResearchRun,
  RiskGateStatus,
} from "../../types";
import {
  BASELINE_RESEARCH_REQUEST,
  DOCUMENTED_CONTROL_PLANE_STATUS,
  DOCUMENTED_EXECUTION_CONTROL,
  DOCUMENTED_PAPER_ORDER_PLANS,
  DOCUMENTED_RESEARCH_RUNS,
  DOCUMENTED_STATUS,
} from "./dashboardConstants";

export interface DashboardModel {
  status: RiskGateStatus;
  controlStatus: ControlPlaneStatus;
  visibleResearchRuns: ResearchRun[];
  visiblePaperOrderPlans: PaperOrderPlan[];
  visiblePaperAccount: PaperAccount | null;
  visibleExecutionControl: ExecutionControlState;
  latestPaperOrderPlans: PaperOrderPlan[];
  latestReconciledPlan?: PaperOrderPlan;
  recentPaperLedgerChanges: PaperLedgerChange[];
  paperExecutionReadiness: ControlPlaneReadinessItem;
  sources: {
    status: string;
    researchRuns: string;
    paperOrderPlans: string;
    paperAccount: string;
  };
  errors: {
    status: string | null;
    researchRuns: string | null;
    paperOrderPlans: string | null;
    paperAccount: string | null;
    baselineResearch: string | null;
  };
  loading: {
    researchRuns: boolean;
    paperAccount: boolean;
    paperOrderPlans: boolean;
  };
  baselineResearchSuccess: string | null;
  runningBaselineResearch: boolean;
  readinessReadyCount: number;
  runBaselineResearch: () => Promise<void>;
}

const sortByUpdatedAtDesc = (plans: PaperOrderPlan[]) =>
  [...plans].sort(
    (leftPlan, rightPlan) =>
      new Date(rightPlan.updatedAt).getTime() -
      new Date(leftPlan.updatedAt).getTime(),
  );

const mergeLedgerChanges = (account: PaperAccount | null) => {
  if (!account) {
    return [];
  }

  return [
    ...account.cashLedger.map((entry) => ({
      ...entry,
      kind: "cash" as const,
      id: entry.paperCashEventId,
    })),
    ...account.positionLedger.map((entry) => ({
      ...entry,
      kind: "position" as const,
      id: entry.paperPositionEventId,
    })),
  ]
    .sort(
      (leftEntry, rightEntry) =>
        new Date(rightEntry.timestamp).getTime() -
        new Date(leftEntry.timestamp).getTime(),
    )
    .slice(0, 10);
};

export const useControlPlaneDashboard = (): DashboardModel => {
  const [riskGateStatus, setRiskGateStatus] = useState<RiskGateStatus | null>(
    null,
  );
  const [controlPlaneStatus, setControlPlaneStatus] =
    useState<ControlPlaneStatus | null>(null);
  const [researchRuns, setResearchRuns] = useState<ResearchRun[] | null>(null);
  const [paperAccount, setPaperAccount] = useState<PaperAccount | null>(null);
  const [executionControl, setExecutionControl] =
    useState<ExecutionControlState | null>(null);
  const [paperOrderPlans, setPaperOrderPlans] = useState<
    PaperOrderPlan[] | null
  >(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingResearchRuns, setLoadingResearchRuns] = useState(true);
  const [loadingPaperAccount, setLoadingPaperAccount] = useState(true);
  const [loadingPaperOrderPlans, setLoadingPaperOrderPlans] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [researchRunsError, setResearchRunsError] = useState<string | null>(
    null,
  );
  const [paperOrderPlansError, setPaperOrderPlansError] = useState<
    string | null
  >(null);
  const [paperAccountError, setPaperAccountError] = useState<string | null>(
    null,
  );
  const [runningBaselineResearch, setRunningBaselineResearch] = useState(false);
  const [baselineResearchError, setBaselineResearchError] = useState<
    string | null
  >(null);
  const [baselineResearchSuccess, setBaselineResearchSuccess] = useState<
    string | null
  >(null);

  useEffect(() => {
    let ignore = false;

    const fetchStatus = async () => {
      try {
        const [
          riskStatus,
          controlPlaneStatusResult,
          researchRunsStatus,
          paperAccountStatus,
          executionControlStatus,
          paperOrderPlansStatus,
        ] = await Promise.allSettled([
          riskGateApi.getStatus(),
          controlPlaneApi.getStatus(),
          controlPlaneApi.getResearchRuns(),
          controlPlaneApi.getPaperAccount(),
          controlPlaneApi.getExecutionControl(),
          controlPlaneApi.getPaperOrderPlans(),
        ]);

        if (ignore) {
          return;
        }

        if (riskStatus.status === "fulfilled") {
          setRiskGateStatus(riskStatus.value);
        }
        if (controlPlaneStatusResult.status === "fulfilled") {
          setControlPlaneStatus(controlPlaneStatusResult.value);
        }
        if (researchRunsStatus.status === "fulfilled") {
          setResearchRuns(researchRunsStatus.value);
          setResearchRunsError(null);
        } else {
          setResearchRunsError(
            "Research-run ledger API is unavailable. Showing documented sample runs.",
          );
        }
        if (paperAccountStatus.status === "fulfilled") {
          setPaperAccount(paperAccountStatus.value);
          setPaperAccountError(null);
        } else {
          setPaperAccount(null);
          setPaperAccountError(
            "No live paper account state was returned. A filled paper execution must create one before account values are shown.",
          );
        }
        if (executionControlStatus.status === "fulfilled") {
          setExecutionControl(executionControlStatus.value);
        }
        if (paperOrderPlansStatus.status === "fulfilled") {
          setPaperOrderPlans(paperOrderPlansStatus.value);
          setPaperOrderPlansError(null);
        } else {
          setPaperOrderPlansError(
            "Paper order-plan API is unavailable. Showing documented sample paper plans.",
          );
        }

        setStatusError(
          riskStatus.status === "rejected" ||
            controlPlaneStatusResult.status === "rejected"
            ? "One or more control-plane status APIs are unavailable."
            : null,
        );
      } catch {
        if (!ignore) {
          setStatusError("Control-plane status APIs are unavailable.");
          setResearchRunsError(
            "Research-run ledger API is unavailable. Showing documented sample runs.",
          );
          setPaperOrderPlansError(
            "Paper order-plan API is unavailable. Showing documented sample paper plans.",
          );
          setPaperAccountError(
            "No live paper account state was returned. A filled paper execution must create one before account values are shown.",
          );
        }
      } finally {
        if (!ignore) {
          setLoadingStatus(false);
          setLoadingResearchRuns(false);
          setLoadingPaperAccount(false);
          setLoadingPaperOrderPlans(false);
        }
      }
    };

    fetchStatus();

    return () => {
      ignore = true;
    };
  }, []);

  const visiblePaperOrderPlans =
    paperOrderPlans ??
    (loadingPaperOrderPlans ? [] : DOCUMENTED_PAPER_ORDER_PLANS);
  const controlStatus = controlPlaneStatus ?? DOCUMENTED_CONTROL_PLANE_STATUS;

  const runBaselineResearch = async () => {
    setRunningBaselineResearch(true);
    setBaselineResearchError(null);
    setBaselineResearchSuccess(null);

    try {
      const researchRun = await controlPlaneApi.runBaselineResearch(
        BASELINE_RESEARCH_REQUEST,
      );

      setResearchRuns((currentRuns) => [
        researchRun,
        ...(currentRuns ?? []).filter((run) => run.id !== researchRun.id),
      ]);
      setResearchRunsError(null);
      setBaselineResearchSuccess(
        "Baseline dry-run completed. Returned research run added to the ledger.",
      );
    } catch {
      setBaselineResearchError(
        "Baseline dry-run failed. No broker or live order path was called.",
      );
    } finally {
      setRunningBaselineResearch(false);
    }
  };

  return {
    status: riskGateStatus ?? DOCUMENTED_STATUS,
    controlStatus,
    visibleResearchRuns: researchRuns ?? DOCUMENTED_RESEARCH_RUNS,
    visiblePaperOrderPlans,
    visiblePaperAccount: paperAccount,
    visibleExecutionControl: executionControl ?? DOCUMENTED_EXECUTION_CONTROL,
    latestPaperOrderPlans: sortByUpdatedAtDesc(visiblePaperOrderPlans).slice(
      0,
      3,
    ),
    latestReconciledPlan: sortByUpdatedAtDesc(visiblePaperOrderPlans).find(
      (plan) => plan.reconciliation.reconciledAt,
    ),
    recentPaperLedgerChanges: mergeLedgerChanges(paperAccount),
    paperExecutionReadiness: controlStatus.readiness.find(
      (item) => item.key === "paperExecutionReady",
    ) ?? {
      key: "paperExecutionReady",
      ready: paperOrderPlans !== null,
      detail:
        "Paper readiness is inferred from the paper order-plan API response.",
    },
    sources: {
      status: riskGateStatus
        ? "Live API status"
        : loadingStatus
          ? "Loading API status"
          : "Documented fallback",
      researchRuns: researchRuns
        ? "Live research ledger"
        : loadingResearchRuns
          ? "Loading research ledger"
          : "Documented sample runs",
      paperOrderPlans: paperOrderPlans
        ? "Live paper plans"
        : loadingPaperOrderPlans
          ? "Loading paper plans"
          : "Documented sample plans",
      paperAccount: paperAccount
        ? "Live paper account"
        : loadingPaperAccount
          ? "Loading paper account"
          : "No paper account",
    },
    errors: {
      status: statusError,
      researchRuns: researchRunsError,
      paperOrderPlans: paperOrderPlansError,
      paperAccount: paperAccountError,
      baselineResearch: baselineResearchError,
    },
    loading: {
      researchRuns: loadingResearchRuns,
      paperAccount: loadingPaperAccount,
      paperOrderPlans: loadingPaperOrderPlans,
    },
    baselineResearchSuccess,
    runningBaselineResearch,
    readinessReadyCount: controlStatus.readiness.filter((item) => item.ready)
      .length,
    runBaselineResearch,
  };
};
