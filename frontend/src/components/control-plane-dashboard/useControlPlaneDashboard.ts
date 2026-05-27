import { useEffect, useState } from "react";
import { controlPlaneApi, riskGateApi } from "../../services/api";
import {
  AutonomousRun,
  AutonomousRunSchedule,
  BrokerAdapterStatus,
  BrokerFill,
  BrokerOrderCommand,
  BrokerOrderStatusRecord,
  BrokerSnapshot,
  BudgetEnvelope,
  ControlPlaneAuditEvent,
  ControlPlaneReadinessItem,
  ControlPlaneStatus,
  ExecutionControlState,
  FundingReadinessRecord,
  InvestmentProposal,
  LivePilotReadinessRecord,
  MarketDataIngestionRun,
  MarketDataIngestionStatus,
  OrderPlanApproval,
  PaperAccount,
  PaperAccountEvent,
  PaperLedgerChange,
  PaperOrderPlan,
  ResearchRun,
  RiskEvaluation,
  RiskGateStatus,
  RunScheduleWorkerStatus,
} from "../../types";
import {
  BASELINE_RESEARCH_REQUEST,
  DOCUMENTED_ACTION_TIMELINE,
  DOCUMENTED_AUTONOMOUS_RUNS,
  DOCUMENTED_AUTONOMOUS_RUN_SCHEDULES,
  DOCUMENTED_BROKER_ADAPTER_STATUS,
  DOCUMENTED_BROKER_FILLS,
  DOCUMENTED_BROKER_ORDER_COMMANDS,
  DOCUMENTED_BROKER_ORDER_STATUSES,
  DOCUMENTED_BROKER_SNAPSHOTS,
  DOCUMENTED_BUDGET_ENVELOPES,
  DOCUMENTED_CONTROL_PLANE_STATUS,
  DOCUMENTED_EXECUTION_CONTROL,
  DOCUMENTED_FUNDING_READINESS,
  DOCUMENTED_INVESTMENT_PROPOSALS,
  DOCUMENTED_LIVE_PILOT_READINESS,
  DOCUMENTED_MARKET_DATA_INGESTION_RUNS,
  DOCUMENTED_MARKET_DATA_INGESTION_STATUS,
  DOCUMENTED_ORDER_PLAN_APPROVALS,
  DOCUMENTED_PAPER_ACCOUNT_EVENTS,
  DOCUMENTED_PAPER_ORDER_PLANS,
  DOCUMENTED_RISK_EVALUATIONS,
  DOCUMENTED_RESEARCH_RUNS,
  DOCUMENTED_RUN_SCHEDULE_WORKER_STATUS,
  DOCUMENTED_STATUS,
} from "./dashboardConstants";
import {
  buildCurrentCycleEvidence,
  CurrentCycleEvidence,
} from "./currentCycleEvidence";

export interface WorkflowStage {
  key: string;
  label: string;
  status: string;
  detail: string;
  source: string;
  ready: boolean;
  blocked: boolean;
}

export interface DashboardModel {
  status: RiskGateStatus;
  controlStatus: ControlPlaneStatus;
  visibleBudgets: BudgetEnvelope[];
  visibleResearchRuns: ResearchRun[];
  visibleProposals: InvestmentProposal[];
  visibleRiskEvaluations: RiskEvaluation[];
  visibleRuns: AutonomousRun[];
  visibleRunSchedules: AutonomousRunSchedule[];
  visibleRunScheduleWorkerStatus: RunScheduleWorkerStatus;
  visiblePaperOrderPlans: PaperOrderPlan[];
  visiblePaperAccount: PaperAccount | null;
  visiblePaperAccountEvents: PaperAccountEvent[];
  visibleBrokerSnapshots: BrokerSnapshot[];
  visibleFundingReadiness: FundingReadinessRecord[];
  visibleLivePilotReadiness: LivePilotReadinessRecord[];
  visibleBrokerOrderCommands: BrokerOrderCommand[];
  visibleBrokerOrderStatuses: BrokerOrderStatusRecord[];
  visibleBrokerFills: BrokerFill[];
  visibleBrokerAdapterStatus: BrokerAdapterStatus;
  visibleOrderPlanApprovals: OrderPlanApproval[];
  visibleMarketDataIngestionStatus: MarketDataIngestionStatus;
  visibleMarketDataIngestionRuns: MarketDataIngestionRun[];
  visibleActionTimeline: ControlPlaneAuditEvent[];
  visibleExecutionControl: ExecutionControlState;
  latestPaperOrderPlans: PaperOrderPlan[];
  latestBrokerSnapshot?: BrokerSnapshot;
  latestFundingReadiness?: FundingReadinessRecord;
  latestLivePilotReadiness?: LivePilotReadinessRecord;
  latestBrokerOrderCommand?: BrokerOrderCommand;
  latestBrokerOrderStatus?: BrokerOrderStatusRecord;
  latestBrokerFill?: BrokerFill;
  latestOrderPlanApproval?: OrderPlanApproval;
  latestReconciledPlan?: PaperOrderPlan;
  latestRun?: AutonomousRun;
  latestRunSchedule?: AutonomousRunSchedule;
  currentCycleEvidence: CurrentCycleEvidence;
  workflowStages: WorkflowStage[];
  recentPaperLedgerChanges: PaperLedgerChange[];
  paperExecutionReadiness: ControlPlaneReadinessItem;
  sources: {
    status: string;
    budgets: string;
    researchRuns: string;
    proposals: string;
    riskEvaluations: string;
    runs: string;
    runSchedules: string;
    runScheduleWorker: string;
    paperOrderPlans: string;
    paperAccount: string;
    paperAccountEvents: string;
    brokerSnapshots: string;
    fundingReadiness: string;
    livePilotReadiness: string;
    brokerOrderCommands: string;
    brokerOrderStatuses: string;
    brokerFills: string;
    brokerAdapter: string;
    orderPlanApprovals: string;
    marketDataIngestion: string;
    actionTimeline: string;
  };
  errors: {
    status: string | null;
    budgets: string | null;
    researchRuns: string | null;
    proposals: string | null;
    riskEvaluations: string | null;
    runs: string | null;
    runSchedules: string | null;
    runScheduleWorker: string | null;
    paperOrderPlans: string | null;
    paperAccount: string | null;
    paperAccountEvents: string | null;
    brokerSnapshots: string | null;
    fundingReadiness: string | null;
    livePilotReadiness: string | null;
    brokerOrderCommands: string | null;
    brokerOrderStatuses: string | null;
    brokerFills: string | null;
    brokerAdapter: string | null;
    orderPlanApprovals: string | null;
    marketDataIngestion: string | null;
    actionTimeline: string | null;
    killSwitch: string | null;
    baselineResearch: string | null;
    recoveryProposal: string | null;
  };
  loading: {
    researchRuns: boolean;
    budgets: boolean;
    proposals: boolean;
    riskEvaluations: boolean;
    runs: boolean;
    runSchedules: boolean;
    runScheduleWorker: boolean;
    paperAccount: boolean;
    paperAccountEvents: boolean;
    paperOrderPlans: boolean;
    brokerSnapshots: boolean;
    fundingReadiness: boolean;
    livePilotReadiness: boolean;
    brokerOrderCommands: boolean;
    brokerOrderStatuses: boolean;
    brokerFills: boolean;
    brokerAdapter: boolean;
    orderPlanApprovals: boolean;
    marketDataIngestion: boolean;
    actionTimeline: boolean;
  };
  baselineResearchSuccess: string | null;
  recoveryProposalSuccess: string | null;
  runningBaselineResearch: boolean;
  runningRecoveryProposal: boolean;
  runningKillSwitchTrip: boolean;
  advancingRun: boolean;
  tickingSchedule: boolean;
  readinessReadyCount: number;
  runBaselineResearch: () => Promise<void>;
  runRecoveryProposal: () => Promise<void>;
  tripKillSwitch: () => Promise<void>;
  advanceLatestRun: () => Promise<void>;
  tickLatestSchedule: () => Promise<void>;
}

const idEquals = (
  left: number | string | undefined,
  right: number | string | undefined,
) =>
  left !== undefined && right !== undefined && String(left) === String(right);

const sortByUpdatedAtDesc = <T extends { updatedAt: string }>(items: T[]) =>
  [...items].sort(
    (leftItem, rightItem) =>
      new Date(rightItem.updatedAt).getTime() -
      new Date(leftItem.updatedAt).getTime(),
  );

const sortRiskEvaluations = (evaluations: RiskEvaluation[]) =>
  [...evaluations].sort(
    (leftEvaluation, rightEvaluation) =>
      new Date(rightEvaluation.evaluatedAt).getTime() -
      new Date(leftEvaluation.evaluatedAt).getTime(),
  );

const buildWorkflowStages = (input: {
  budgets: BudgetEnvelope[];
  researchRuns: ResearchRun[];
  proposals: InvestmentProposal[];
  riskEvaluations: RiskEvaluation[];
  approvals: OrderPlanApproval[];
  paperPlans: PaperOrderPlan[];
  brokerSnapshots: BrokerSnapshot[];
  paperAccount: PaperAccount | null;
}): WorkflowStage[] => {
  const latestProposal = sortByUpdatedAtDesc(input.proposals)[0];
  const latestResearchRun =
    input.researchRuns.find((run) =>
      idEquals(run.id, latestProposal?.researchRunId),
    ) ?? sortByUpdatedAtDesc(input.researchRuns)[0];
  const latestBudget =
    input.budgets.find((budget) =>
      idEquals(budget.id, latestProposal?.budgetEnvelopeId),
    ) ??
    input.budgets.find((budget) =>
      idEquals(budget.id, latestResearchRun?.budgetEnvelopeId),
    ) ??
    input.budgets.find((budget) => budget.status === "active") ??
    sortByUpdatedAtDesc(input.budgets)[0];
  const latestRiskEvaluation =
    input.riskEvaluations.find((evaluation) =>
      idEquals(evaluation.proposalId, latestProposal?.id),
    ) ?? sortRiskEvaluations(input.riskEvaluations)[0];
  const latestApproval =
    input.approvals.find((approval) =>
      idEquals(approval.proposalId, latestProposal?.id),
    ) ?? sortByUpdatedAtDesc(input.approvals)[0];
  const latestPaperPlan =
    input.paperPlans.find((plan) =>
      idEquals(plan.proposalId, latestProposal?.id),
    ) ?? sortByUpdatedAtDesc(input.paperPlans)[0];
  const latestBrokerSnapshot = [...input.brokerSnapshots].sort(
    (leftSnapshot, rightSnapshot) =>
      new Date(rightSnapshot.asOf).getTime() -
      new Date(leftSnapshot.asOf).getTime(),
  )[0];
  const proposalMissingAfterReadyResearch =
    Boolean(latestResearchRun?.advanceEligible) && !latestProposal;

  return [
    {
      key: "budget",
      label: "Budget",
      status: latestBudget?.status ?? "missing",
      detail: latestBudget
        ? `${latestBudget.name} / ${latestBudget.currency} ${latestBudget.totalBudget.toLocaleString()}`
        : "No active budget envelope",
      source: latestBudget ? `budget ${latestBudget.id}` : "missing",
      ready: latestBudget?.status === "active",
      blocked: !latestBudget || latestBudget.status !== "active",
    },
    {
      key: "research",
      label: "Research",
      status: latestResearchRun?.status ?? "missing",
      detail: latestResearchRun
        ? `${latestResearchRun.strategyFamily} / ${latestResearchRun.benchmark}`
        : "No reproducible research run",
      source: latestResearchRun ? `run ${latestResearchRun.id}` : "missing",
      ready: Boolean(latestResearchRun?.advanceEligible),
      blocked: !latestResearchRun || !latestResearchRun.advanceEligible,
    },
    {
      key: "proposal",
      label: "Proposal",
      status: latestProposal?.status ?? "missing",
      detail: latestProposal
        ? `${latestProposal.strategyId} / ${latestProposal.orders.length} orders`
        : proposalMissingAfterReadyResearch
          ? "Create proposal from proposal-ready research run"
          : "No generated proposal",
      source: latestProposal ? `proposal ${latestProposal.id}` : "missing",
      ready: Boolean(latestProposal),
      blocked: !latestProposal,
    },
    {
      key: "risk",
      label: "Risk",
      status: latestRiskEvaluation?.decision ?? "missing",
      detail: latestRiskEvaluation
        ? (latestRiskEvaluation.reasons[0] ?? "Risk evaluation recorded")
        : "No proposal risk evaluation",
      source: latestRiskEvaluation
        ? `risk ${latestRiskEvaluation.id}`
        : "missing",
      ready: latestRiskEvaluation?.decision === "ALLOW",
      blocked:
        !latestRiskEvaluation || latestRiskEvaluation.decision !== "ALLOW",
    },
    {
      key: "approval",
      label: "Approval",
      status: latestApproval?.status ?? "missing",
      detail: latestApproval
        ? `${latestApproval.approvalSource ?? "human"} / ${latestApproval.status} / ${latestApproval.reason}`
        : "No signed paper order approval",
      source: latestApproval ? `approval ${latestApproval.id}` : "missing",
      ready:
        latestApproval?.status === "active" ||
        latestApproval?.status === "consumed",
      blocked: !latestApproval,
    },
    {
      key: "account",
      label: "Paper Account",
      status: input.paperAccount?.status ?? "missing",
      detail: input.paperAccount
        ? `${input.paperAccount.name} / cash ${input.paperAccount.cash.toLocaleString()}`
        : "Seed and promote a paper account",
      source: input.paperAccount
        ? `account ${input.paperAccount.id}`
        : "missing",
      ready: input.paperAccount?.status === "active",
      blocked: input.paperAccount?.status !== "active",
    },
    {
      key: "paper",
      label: "Paper Execution",
      status: latestPaperPlan?.status ?? "missing",
      detail: latestPaperPlan
        ? `${latestPaperPlan.orders.length} orders / ${latestPaperPlan.fills.length} fills`
        : "No paper order plan",
      source: latestPaperPlan ? `plan ${latestPaperPlan.id}` : "missing",
      ready: ["filled", "reconciled"].includes(latestPaperPlan?.status ?? ""),
      blocked: !latestPaperPlan || latestPaperPlan.status === "blocked",
    },
    {
      key: "broker",
      label: "Broker Truth",
      status: latestBrokerSnapshot?.status ?? "missing",
      detail: latestBrokerSnapshot
        ? `${latestBrokerSnapshot.provider} snapshot / ${latestBrokerSnapshot.reconciliation.status}`
        : "No read-only broker snapshot",
      source: latestBrokerSnapshot
        ? `snapshot ${latestBrokerSnapshot.id}`
        : "missing",
      ready: latestBrokerSnapshot?.status === "matched",
      blocked: latestBrokerSnapshot?.status !== "matched",
    },
  ];
};

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
  const [budgets, setBudgets] = useState<BudgetEnvelope[] | null>(null);
  const [researchRuns, setResearchRuns] = useState<ResearchRun[] | null>(null);
  const [proposals, setProposals] = useState<InvestmentProposal[] | null>(null);
  const [riskEvaluations, setRiskEvaluations] = useState<
    RiskEvaluation[] | null
  >(null);
  const [runs, setRuns] = useState<AutonomousRun[] | null>(null);
  const [runSchedules, setRunSchedules] = useState<
    AutonomousRunSchedule[] | null
  >(null);
  const [runScheduleWorkerStatus, setRunScheduleWorkerStatus] =
    useState<RunScheduleWorkerStatus | null>(null);
  const [paperAccount, setPaperAccount] = useState<PaperAccount | null>(null);
  const [paperAccountEvents, setPaperAccountEvents] = useState<
    PaperAccountEvent[] | null
  >(null);
  const [executionControl, setExecutionControl] =
    useState<ExecutionControlState | null>(null);
  const [paperOrderPlans, setPaperOrderPlans] = useState<
    PaperOrderPlan[] | null
  >(null);
  const [brokerSnapshots, setBrokerSnapshots] = useState<
    BrokerSnapshot[] | null
  >(null);
  const [fundingReadiness, setFundingReadiness] = useState<
    FundingReadinessRecord[] | null
  >(null);
  const [livePilotReadiness, setLivePilotReadiness] = useState<
    LivePilotReadinessRecord[] | null
  >(null);
  const [brokerOrderCommands, setBrokerOrderCommands] = useState<
    BrokerOrderCommand[] | null
  >(null);
  const [brokerOrderStatuses, setBrokerOrderStatuses] = useState<
    BrokerOrderStatusRecord[] | null
  >(null);
  const [brokerFills, setBrokerFills] = useState<BrokerFill[] | null>(null);
  const [brokerAdapterStatus, setBrokerAdapterStatus] =
    useState<BrokerAdapterStatus | null>(null);
  const [orderPlanApprovals, setOrderPlanApprovals] = useState<
    OrderPlanApproval[] | null
  >(null);
  const [marketDataIngestionStatus, setMarketDataIngestionStatus] =
    useState<MarketDataIngestionStatus | null>(null);
  const [marketDataIngestionRuns, setMarketDataIngestionRuns] = useState<
    MarketDataIngestionRun[] | null
  >(null);
  const [actionTimeline, setActionTimeline] = useState<
    ControlPlaneAuditEvent[] | null
  >(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingBudgets, setLoadingBudgets] = useState(true);
  const [loadingResearchRuns, setLoadingResearchRuns] = useState(true);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [loadingRiskEvaluations, setLoadingRiskEvaluations] = useState(true);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadingRunSchedules, setLoadingRunSchedules] = useState(true);
  const [loadingRunScheduleWorker, setLoadingRunScheduleWorker] =
    useState(true);
  const [loadingPaperAccount, setLoadingPaperAccount] = useState(true);
  const [loadingPaperAccountEvents, setLoadingPaperAccountEvents] =
    useState(true);
  const [loadingPaperOrderPlans, setLoadingPaperOrderPlans] = useState(true);
  const [loadingBrokerSnapshots, setLoadingBrokerSnapshots] = useState(true);
  const [loadingFundingReadiness, setLoadingFundingReadiness] = useState(true);
  const [loadingLivePilotReadiness, setLoadingLivePilotReadiness] =
    useState(true);
  const [loadingBrokerOrderCommands, setLoadingBrokerOrderCommands] =
    useState(true);
  const [loadingBrokerOrderStatuses, setLoadingBrokerOrderStatuses] =
    useState(true);
  const [loadingBrokerFills, setLoadingBrokerFills] = useState(true);
  const [loadingBrokerAdapter, setLoadingBrokerAdapter] = useState(true);
  const [loadingOrderPlanApprovals, setLoadingOrderPlanApprovals] =
    useState(true);
  const [loadingMarketDataIngestion, setLoadingMarketDataIngestion] =
    useState(true);
  const [loadingActionTimeline, setLoadingActionTimeline] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [budgetsError, setBudgetsError] = useState<string | null>(null);
  const [researchRunsError, setResearchRunsError] = useState<string | null>(
    null,
  );
  const [proposalsError, setProposalsError] = useState<string | null>(null);
  const [riskEvaluationsError, setRiskEvaluationsError] = useState<
    string | null
  >(null);
  const [runsError, setRunsError] = useState<string | null>(null);
  const [runSchedulesError, setRunSchedulesError] = useState<string | null>(
    null,
  );
  const [runScheduleWorkerError, setRunScheduleWorkerError] = useState<
    string | null
  >(null);
  const [paperOrderPlansError, setPaperOrderPlansError] = useState<
    string | null
  >(null);
  const [paperAccountError, setPaperAccountError] = useState<string | null>(
    null,
  );
  const [paperAccountEventsError, setPaperAccountEventsError] = useState<
    string | null
  >(null);
  const [brokerSnapshotsError, setBrokerSnapshotsError] = useState<
    string | null
  >(null);
  const [fundingReadinessError, setFundingReadinessError] = useState<
    string | null
  >(null);
  const [livePilotReadinessError, setLivePilotReadinessError] = useState<
    string | null
  >(null);
  const [brokerOrderCommandsError, setBrokerOrderCommandsError] = useState<
    string | null
  >(null);
  const [brokerOrderStatusesError, setBrokerOrderStatusesError] = useState<
    string | null
  >(null);
  const [brokerFillsError, setBrokerFillsError] = useState<string | null>(null);
  const [brokerAdapterError, setBrokerAdapterError] = useState<string | null>(
    null,
  );
  const [orderPlanApprovalsError, setOrderPlanApprovalsError] = useState<
    string | null
  >(null);
  const [marketDataIngestionError, setMarketDataIngestionError] = useState<
    string | null
  >(null);
  const [actionTimelineError, setActionTimelineError] = useState<string | null>(
    null,
  );
  const [runningBaselineResearch, setRunningBaselineResearch] = useState(false);
  const [runningRecoveryProposal, setRunningRecoveryProposal] = useState(false);
  const [runningKillSwitchTrip, setRunningKillSwitchTrip] = useState(false);
  const [advancingRun, setAdvancingRun] = useState(false);
  const [tickingSchedule, setTickingSchedule] = useState(false);
  const [baselineResearchError, setBaselineResearchError] = useState<
    string | null
  >(null);
  const [recoveryProposalError, setRecoveryProposalError] = useState<
    string | null
  >(null);
  const [killSwitchError, setKillSwitchError] = useState<string | null>(null);
  const [baselineResearchSuccess, setBaselineResearchSuccess] = useState<
    string | null
  >(null);
  const [recoveryProposalSuccess, setRecoveryProposalSuccess] = useState<
    string | null
  >(null);

  useEffect(() => {
    let ignore = false;

    const fetchStatus = async () => {
      try {
        const [
          riskStatus,
          controlPlaneStatusResult,
          budgetsStatus,
          researchRunsStatus,
          proposalsStatus,
          riskEvaluationsStatus,
          runsStatus,
          runSchedulesStatus,
          runScheduleWorkerStatus,
          paperAccountStatus,
          paperAccountEventsStatus,
          executionControlStatus,
          paperOrderPlansStatus,
          brokerSnapshotsStatus,
          fundingReadinessStatus,
          livePilotReadinessStatus,
          brokerOrderCommandsStatus,
          brokerOrderStatusesStatus,
          brokerFillsStatus,
          brokerAdapterStatus,
          orderPlanApprovalsStatus,
          marketDataIngestionStatusResult,
          marketDataIngestionRunsStatus,
          actionTimelineStatus,
        ] = await Promise.allSettled([
          riskGateApi.getStatus(),
          controlPlaneApi.getStatus(),
          controlPlaneApi.getBudgets(),
          controlPlaneApi.getResearchRuns(),
          controlPlaneApi.getProposals(),
          controlPlaneApi.getRiskEvaluations(),
          controlPlaneApi.getRuns(),
          controlPlaneApi.getRunSchedules(),
          controlPlaneApi.getRunScheduleWorkerStatus(),
          controlPlaneApi.getPaperAccount(),
          controlPlaneApi.getPaperAccountEvents(),
          controlPlaneApi.getExecutionControl(),
          controlPlaneApi.getPaperOrderPlans(),
          controlPlaneApi.getBrokerSnapshots(),
          controlPlaneApi.getFundingReadinessRecords(),
          controlPlaneApi.getLivePilotReadinessRecords(),
          controlPlaneApi.getBrokerOrderCommands(),
          controlPlaneApi.getBrokerOrderStatuses(),
          controlPlaneApi.getBrokerFills(),
          controlPlaneApi.getBrokerAdapterStatus(),
          controlPlaneApi.getOrderPlanApprovals(),
          controlPlaneApi.getMarketDataIngestionStatus(),
          controlPlaneApi.getMarketDataIngestionRuns(),
          controlPlaneApi.getActionTimeline(100),
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
        if (budgetsStatus.status === "fulfilled") {
          setBudgets(budgetsStatus.value);
          setBudgetsError(null);
        } else {
          setBudgetsError(
            "Budget envelope API is unavailable. Showing documented sample budget.",
          );
        }
        if (researchRunsStatus.status === "fulfilled") {
          setResearchRuns(researchRunsStatus.value);
          setResearchRunsError(null);
        } else {
          setResearchRunsError(
            "Research-run ledger API is unavailable. Showing documented sample runs.",
          );
        }
        if (proposalsStatus.status === "fulfilled") {
          setProposals(proposalsStatus.value);
          setProposalsError(null);
        } else {
          setProposalsError(
            "Proposal ledger API is unavailable. Showing documented sample proposal.",
          );
        }
        if (riskEvaluationsStatus.status === "fulfilled") {
          setRiskEvaluations(riskEvaluationsStatus.value);
          setRiskEvaluationsError(null);
        } else {
          setRiskEvaluationsError(
            "Risk evaluation API is unavailable. Showing documented sample evaluation.",
          );
        }
        if (runsStatus.status === "fulfilled") {
          setRuns(runsStatus.value);
          setRunsError(null);
        } else {
          setRunsError(
            "Autonomous-run API is unavailable. Showing documented sample run.",
          );
        }
        if (runSchedulesStatus.status === "fulfilled") {
          setRunSchedules(runSchedulesStatus.value);
          setRunSchedulesError(null);
        } else {
          setRunSchedulesError(
            "Autonomous schedule API is unavailable. Showing documented sample schedule.",
          );
        }
        if (runScheduleWorkerStatus.status === "fulfilled") {
          setRunScheduleWorkerStatus(runScheduleWorkerStatus.value);
          setRunScheduleWorkerError(null);
        } else {
          setRunScheduleWorkerError(
            "Autonomous schedule worker API is unavailable. Showing documented worker status.",
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
        if (paperAccountEventsStatus.status === "fulfilled") {
          setPaperAccountEvents(paperAccountEventsStatus.value);
          setPaperAccountEventsError(null);
        } else {
          setPaperAccountEventsError(
            "Paper account event API is unavailable. Showing documented append-only sample.",
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
        if (brokerSnapshotsStatus.status === "fulfilled") {
          setBrokerSnapshots(brokerSnapshotsStatus.value);
          setBrokerSnapshotsError(null);
        } else {
          setBrokerSnapshotsError(
            "Broker snapshot API is unavailable. Showing documented read-only sample.",
          );
        }
        if (fundingReadinessStatus.status === "fulfilled") {
          setFundingReadiness(fundingReadinessStatus.value);
          setFundingReadinessError(null);
        } else {
          setFundingReadinessError(
            "Funding readiness API is unavailable. Showing documented funding sample.",
          );
        }
        if (livePilotReadinessStatus.status === "fulfilled") {
          setLivePilotReadiness(livePilotReadinessStatus.value);
          setLivePilotReadinessError(null);
        } else {
          setLivePilotReadinessError(
            "Broker-write pre-trade risk check API is unavailable. Showing documented pre-trade check sample.",
          );
        }
        if (brokerOrderCommandsStatus.status === "fulfilled") {
          setBrokerOrderCommands(brokerOrderCommandsStatus.value);
          setBrokerOrderCommandsError(null);
        } else {
          setBrokerOrderCommandsError(
            "Broker order command API is unavailable. Showing documented broker command sample.",
          );
        }
        if (brokerOrderStatusesStatus.status === "fulfilled") {
          setBrokerOrderStatuses(brokerOrderStatusesStatus.value);
          setBrokerOrderStatusesError(null);
        } else {
          setBrokerOrderStatusesError(
            "Broker order status API is unavailable. Showing documented broker lifecycle sample.",
          );
        }
        if (brokerFillsStatus.status === "fulfilled") {
          setBrokerFills(brokerFillsStatus.value);
          setBrokerFillsError(null);
        } else {
          setBrokerFillsError(
            "Broker fill API is unavailable. Showing documented read-only fill sample.",
          );
        }
        if (brokerAdapterStatus.status === "fulfilled") {
          setBrokerAdapterStatus(brokerAdapterStatus.value);
          setBrokerAdapterError(null);
        } else {
          setBrokerAdapterError(
            "Broker adapter status API is unavailable. Showing documented Toss readiness sample.",
          );
        }
        if (orderPlanApprovalsStatus.status === "fulfilled") {
          setOrderPlanApprovals(orderPlanApprovalsStatus.value);
          setOrderPlanApprovalsError(null);
        } else {
          setOrderPlanApprovalsError(
            "Order-plan approval API is unavailable. Showing documented approval sample.",
          );
        }
        if (marketDataIngestionStatusResult.status === "fulfilled") {
          setMarketDataIngestionStatus(marketDataIngestionStatusResult.value);
          setMarketDataIngestionError(null);
        } else {
          setMarketDataIngestionError(
            "Market-data ingestion API is unavailable. Showing documented disabled worker sample.",
          );
        }
        if (marketDataIngestionRunsStatus.status === "fulfilled") {
          setMarketDataIngestionRuns(marketDataIngestionRunsStatus.value);
        } else {
          setMarketDataIngestionError(
            "Market-data ingestion run API is unavailable. Showing documented disabled worker sample.",
          );
        }
        if (actionTimelineStatus.status === "fulfilled") {
          setActionTimeline(actionTimelineStatus.value);
          setActionTimelineError(null);
        } else {
          setActionTimelineError(
            "Action timeline API is unavailable. Showing documented audit sample.",
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
          setBudgetsError(
            "Budget envelope API is unavailable. Showing documented sample budget.",
          );
          setResearchRunsError(
            "Research-run ledger API is unavailable. Showing documented sample runs.",
          );
          setProposalsError(
            "Proposal ledger API is unavailable. Showing documented sample proposal.",
          );
          setRiskEvaluationsError(
            "Risk evaluation API is unavailable. Showing documented sample evaluation.",
          );
          setRunsError(
            "Autonomous-run API is unavailable. Showing documented sample run.",
          );
          setRunSchedulesError(
            "Autonomous schedule API is unavailable. Showing documented sample schedule.",
          );
          setRunScheduleWorkerError(
            "Autonomous schedule worker API is unavailable. Showing documented worker status.",
          );
          setPaperOrderPlansError(
            "Paper order-plan API is unavailable. Showing documented sample paper plans.",
          );
          setPaperAccountEventsError(
            "Paper account event API is unavailable. Showing documented append-only sample.",
          );
          setBrokerSnapshotsError(
            "Broker snapshot API is unavailable. Showing documented read-only sample.",
          );
          setFundingReadinessError(
            "Funding readiness API is unavailable. Showing documented funding sample.",
          );
          setLivePilotReadinessError(
            "Broker-write pre-trade risk check API is unavailable. Showing documented pre-trade check sample.",
          );
          setBrokerOrderCommandsError(
            "Broker order command API is unavailable. Showing documented broker command sample.",
          );
          setBrokerOrderStatusesError(
            "Broker order status API is unavailable. Showing documented broker lifecycle sample.",
          );
          setBrokerFillsError(
            "Broker fill API is unavailable. Showing documented read-only fill sample.",
          );
          setBrokerAdapterError(
            "Broker adapter status API is unavailable. Showing documented Toss readiness sample.",
          );
          setOrderPlanApprovalsError(
            "Order-plan approval API is unavailable. Showing documented approval sample.",
          );
          setMarketDataIngestionError(
            "Market-data ingestion API is unavailable. Showing documented disabled worker sample.",
          );
          setActionTimelineError(
            "Action timeline API is unavailable. Showing documented audit sample.",
          );
          setPaperAccountError(
            "No live paper account state was returned. A filled paper execution must create one before account values are shown.",
          );
        }
      } finally {
        if (!ignore) {
          setLoadingStatus(false);
          setLoadingBudgets(false);
          setLoadingResearchRuns(false);
          setLoadingProposals(false);
          setLoadingRiskEvaluations(false);
          setLoadingRuns(false);
          setLoadingRunSchedules(false);
          setLoadingRunScheduleWorker(false);
          setLoadingPaperAccount(false);
          setLoadingPaperAccountEvents(false);
          setLoadingPaperOrderPlans(false);
          setLoadingBrokerSnapshots(false);
          setLoadingFundingReadiness(false);
          setLoadingLivePilotReadiness(false);
          setLoadingBrokerOrderCommands(false);
          setLoadingBrokerOrderStatuses(false);
          setLoadingBrokerFills(false);
          setLoadingBrokerAdapter(false);
          setLoadingOrderPlanApprovals(false);
          setLoadingMarketDataIngestion(false);
          setLoadingActionTimeline(false);
        }
      }
    };

    fetchStatus();

    return () => {
      ignore = true;
    };
  }, []);

  const visibleBudgets =
    budgets ?? (loadingBudgets ? [] : DOCUMENTED_BUDGET_ENVELOPES);
  const visibleProposals =
    proposals ?? (loadingProposals ? [] : DOCUMENTED_INVESTMENT_PROPOSALS);
  const visibleRiskEvaluations =
    riskEvaluations ??
    (loadingRiskEvaluations ? [] : DOCUMENTED_RISK_EVALUATIONS);
  const visibleRuns = runs ?? (loadingRuns ? [] : DOCUMENTED_AUTONOMOUS_RUNS);
  const visibleRunSchedules =
    runSchedules ??
    (loadingRunSchedules ? [] : DOCUMENTED_AUTONOMOUS_RUN_SCHEDULES);
  const visibleRunScheduleWorkerStatus =
    runScheduleWorkerStatus ?? DOCUMENTED_RUN_SCHEDULE_WORKER_STATUS;
  const visiblePaperOrderPlans =
    paperOrderPlans ??
    (loadingPaperOrderPlans ? [] : DOCUMENTED_PAPER_ORDER_PLANS);
  const visibleBrokerSnapshots =
    brokerSnapshots ??
    (loadingBrokerSnapshots ? [] : DOCUMENTED_BROKER_SNAPSHOTS);
  const visibleFundingReadiness =
    fundingReadiness ??
    (loadingFundingReadiness ? [] : DOCUMENTED_FUNDING_READINESS);
  const visibleLivePilotReadiness =
    livePilotReadiness ??
    (loadingLivePilotReadiness ? [] : DOCUMENTED_LIVE_PILOT_READINESS);
  const visibleBrokerOrderCommands =
    brokerOrderCommands ??
    (loadingBrokerOrderCommands ? [] : DOCUMENTED_BROKER_ORDER_COMMANDS);
  const visibleBrokerOrderStatuses =
    brokerOrderStatuses ??
    (loadingBrokerOrderStatuses ? [] : DOCUMENTED_BROKER_ORDER_STATUSES);
  const visibleBrokerFills =
    brokerFills ?? (loadingBrokerFills ? [] : DOCUMENTED_BROKER_FILLS);
  const visibleBrokerAdapterStatus =
    brokerAdapterStatus ?? DOCUMENTED_BROKER_ADAPTER_STATUS;
  const visibleOrderPlanApprovals =
    orderPlanApprovals ??
    (loadingOrderPlanApprovals ? [] : DOCUMENTED_ORDER_PLAN_APPROVALS);
  const visibleMarketDataIngestionStatus =
    marketDataIngestionStatus ?? DOCUMENTED_MARKET_DATA_INGESTION_STATUS;
  const visibleMarketDataIngestionRuns =
    marketDataIngestionRuns ??
    (loadingMarketDataIngestion ? [] : DOCUMENTED_MARKET_DATA_INGESTION_RUNS);
  const visibleActionTimeline =
    actionTimeline ?? (loadingActionTimeline ? [] : DOCUMENTED_ACTION_TIMELINE);
  const visiblePaperAccountEvents =
    paperAccountEvents ??
    (loadingPaperAccountEvents ? [] : DOCUMENTED_PAPER_ACCOUNT_EVENTS);
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

  const runRecoveryProposal = async () => {
    if (!paperAccount) {
      setRecoveryProposalError(
        "Recovery proposal requires a live active paper account.",
      );
      return;
    }

    setRunningRecoveryProposal(true);
    setRecoveryProposalError(null);
    setRecoveryProposalSuccess(null);

    try {
      const recoveryRequest = {
        ...(typeof paperAccount.id === "number"
          ? { paperAccountId: paperAccount.id }
          : {}),
        ...(typeof paperAccount.budgetEnvelopeId === "number"
          ? { budgetEnvelopeId: paperAccount.budgetEnvelopeId }
          : {}),
        maxPositions: 10,
      };
      const recovery =
        await controlPlaneApi.runRecoveryProposal(recoveryRequest);

      setResearchRuns((currentRuns) => [
        recovery.researchRun,
        ...(currentRuns ?? []).filter(
          (run) => run.id !== recovery.researchRun.id,
        ),
      ]);
      setProposals((currentProposals) => [
        recovery.proposal,
        ...(currentProposals ?? []).filter(
          (proposal) => proposal.id !== recovery.proposal.id,
        ),
      ]);
      setRiskEvaluations((currentEvaluations) => [
        recovery.riskEvaluation,
        ...(currentEvaluations ?? []).filter(
          (evaluation) => evaluation.id !== recovery.riskEvaluation.id,
        ),
      ]);
      setRecoveryProposalSuccess(
        `SELL-only recovery proposal ${recovery.proposal.id} created; no paper fill or broker order was submitted.`,
      );
    } catch {
      setRecoveryProposalError(
        "Recovery proposal failed. No paper execution, broker, or live order path was called.",
      );
    } finally {
      setRunningRecoveryProposal(false);
    }
  };

  const refreshAutomationLedgers = async () => {
    const [
      refreshedResearchRuns,
      refreshedProposals,
      refreshedRiskEvaluations,
      refreshedPaperPlans,
      refreshedPaperEvents,
      refreshedRunSchedules,
      refreshedRunScheduleWorkerStatus,
      refreshedPaperAccount,
      refreshedBrokerSnapshots,
      refreshedFundingReadiness,
      refreshedLivePilotReadiness,
      refreshedBrokerOrderCommands,
      refreshedBrokerOrderStatuses,
      refreshedBrokerFills,
      refreshedBrokerAdapterStatus,
      refreshedOrderPlanApprovals,
      refreshedMarketDataIngestionStatus,
      refreshedMarketDataIngestionRuns,
      refreshedExecutionControl,
      refreshedRiskGateStatus,
      refreshedControlPlaneStatus,
      refreshedActionTimeline,
    ] = await Promise.allSettled([
      controlPlaneApi.getResearchRuns(),
      controlPlaneApi.getProposals(),
      controlPlaneApi.getRiskEvaluations(),
      controlPlaneApi.getPaperOrderPlans(),
      controlPlaneApi.getPaperAccountEvents(),
      controlPlaneApi.getRunSchedules(),
      controlPlaneApi.getRunScheduleWorkerStatus(),
      controlPlaneApi.getPaperAccount(),
      controlPlaneApi.getBrokerSnapshots(),
      controlPlaneApi.getFundingReadinessRecords(),
      controlPlaneApi.getLivePilotReadinessRecords(),
      controlPlaneApi.getBrokerOrderCommands(),
      controlPlaneApi.getBrokerOrderStatuses(),
      controlPlaneApi.getBrokerFills(),
      controlPlaneApi.getBrokerAdapterStatus(),
      controlPlaneApi.getOrderPlanApprovals(),
      controlPlaneApi.getMarketDataIngestionStatus(),
      controlPlaneApi.getMarketDataIngestionRuns(),
      controlPlaneApi.getExecutionControl(),
      riskGateApi.getStatus(),
      controlPlaneApi.getStatus(),
      controlPlaneApi.getActionTimeline(100),
    ]);

    if (refreshedResearchRuns.status === "fulfilled") {
      setResearchRuns(refreshedResearchRuns.value);
      setResearchRunsError(null);
    } else {
      setResearchRunsError("Research refresh failed after automation action.");
    }

    if (refreshedProposals.status === "fulfilled") {
      setProposals(refreshedProposals.value);
      setProposalsError(null);
    } else {
      setProposalsError("Proposal refresh failed after automation action.");
    }

    if (refreshedRiskEvaluations.status === "fulfilled") {
      setRiskEvaluations(refreshedRiskEvaluations.value);
      setRiskEvaluationsError(null);
    } else {
      setRiskEvaluationsError(
        "Risk evaluation refresh failed after automation action.",
      );
    }

    if (refreshedPaperPlans.status === "fulfilled") {
      setPaperOrderPlans(refreshedPaperPlans.value);
      setPaperOrderPlansError(null);
    } else {
      setPaperOrderPlansError(
        "Paper order-plan refresh failed after automation action.",
      );
    }

    if (refreshedPaperEvents.status === "fulfilled") {
      setPaperAccountEvents(refreshedPaperEvents.value);
      setPaperAccountEventsError(null);
    } else {
      setPaperAccountEventsError(
        "Paper account event refresh failed after automation action.",
      );
    }

    if (refreshedRunSchedules.status === "fulfilled") {
      setRunSchedules(refreshedRunSchedules.value);
      setRunSchedulesError(null);
    } else {
      setRunSchedulesError("Schedule refresh failed after automation action.");
    }

    if (refreshedRunScheduleWorkerStatus.status === "fulfilled") {
      setRunScheduleWorkerStatus(refreshedRunScheduleWorkerStatus.value);
      setRunScheduleWorkerError(null);
    } else {
      setRunScheduleWorkerError(
        "Schedule worker refresh failed after automation action.",
      );
    }

    if (refreshedPaperAccount.status === "fulfilled") {
      setPaperAccount(refreshedPaperAccount.value);
      setPaperAccountError(null);
    } else {
      setPaperAccountError(
        "Paper account refresh failed after automation action.",
      );
    }

    if (refreshedBrokerAdapterStatus.status === "fulfilled") {
      setBrokerAdapterStatus(refreshedBrokerAdapterStatus.value);
      setBrokerAdapterError(null);
    } else {
      setBrokerAdapterError(
        "Broker adapter refresh failed after automation action.",
      );
    }

    if (refreshedBrokerSnapshots.status === "fulfilled") {
      setBrokerSnapshots(refreshedBrokerSnapshots.value);
      setBrokerSnapshotsError(null);
    } else {
      setBrokerSnapshotsError(
        "Broker snapshot refresh failed after automation action.",
      );
    }

    if (refreshedFundingReadiness.status === "fulfilled") {
      setFundingReadiness(refreshedFundingReadiness.value);
      setFundingReadinessError(null);
    } else {
      setFundingReadinessError(
        "Funding readiness refresh failed after automation action.",
      );
    }

    if (refreshedLivePilotReadiness.status === "fulfilled") {
      setLivePilotReadiness(refreshedLivePilotReadiness.value);
      setLivePilotReadinessError(null);
    } else {
      setLivePilotReadinessError(
        "Broker-write pre-trade risk check refresh failed after automation action.",
      );
    }

    if (refreshedBrokerOrderCommands.status === "fulfilled") {
      setBrokerOrderCommands(refreshedBrokerOrderCommands.value);
      setBrokerOrderCommandsError(null);
    } else {
      setBrokerOrderCommandsError(
        "Broker order command refresh failed after automation action.",
      );
    }

    if (refreshedBrokerOrderStatuses.status === "fulfilled") {
      setBrokerOrderStatuses(refreshedBrokerOrderStatuses.value);
      setBrokerOrderStatusesError(null);
    } else {
      setBrokerOrderStatusesError(
        "Broker order status refresh failed after automation action.",
      );
    }

    if (refreshedBrokerFills.status === "fulfilled") {
      setBrokerFills(refreshedBrokerFills.value);
      setBrokerFillsError(null);
    } else {
      setBrokerFillsError(
        "Broker fill refresh failed after automation action.",
      );
    }

    if (refreshedOrderPlanApprovals.status === "fulfilled") {
      setOrderPlanApprovals(refreshedOrderPlanApprovals.value);
      setOrderPlanApprovalsError(null);
    } else {
      setOrderPlanApprovalsError(
        "Approval refresh failed after automation action.",
      );
    }

    if (refreshedMarketDataIngestionStatus.status === "fulfilled") {
      setMarketDataIngestionStatus(refreshedMarketDataIngestionStatus.value);
      setMarketDataIngestionError(null);
    } else {
      setMarketDataIngestionError(
        "Market-data ingestion status refresh failed after automation action.",
      );
    }

    if (refreshedMarketDataIngestionRuns.status === "fulfilled") {
      setMarketDataIngestionRuns(refreshedMarketDataIngestionRuns.value);
    } else {
      setMarketDataIngestionError(
        "Market-data ingestion run refresh failed after automation action.",
      );
    }

    if (refreshedExecutionControl.status === "fulfilled") {
      setExecutionControl(refreshedExecutionControl.value);
    }

    if (refreshedRiskGateStatus.status === "fulfilled") {
      setRiskGateStatus(refreshedRiskGateStatus.value);
    }

    if (refreshedControlPlaneStatus.status === "fulfilled") {
      setControlPlaneStatus(refreshedControlPlaneStatus.value);
    }

    if (refreshedActionTimeline.status === "fulfilled") {
      setActionTimeline(refreshedActionTimeline.value);
      setActionTimelineError(null);
    } else {
      setActionTimelineError(
        "Action timeline refresh failed after automation action.",
      );
    }

    setStatusError(
      refreshedRiskGateStatus.status === "rejected" ||
        refreshedControlPlaneStatus.status === "rejected"
        ? "One or more control-plane status APIs are unavailable after automation action."
        : null,
    );
  };

  const advanceLatestRun = async () => {
    const latestRun = runs ? sortByUpdatedAtDesc(runs)[0] : undefined;

    if (!latestRun) {
      setRunsError("No live autonomous run is available to advance.");
      return;
    }

    setAdvancingRun(true);
    setRunsError(null);

    try {
      const advancedRun = await controlPlaneApi.advanceRun(latestRun.id, {
        attemptPaperExecution: true,
      });
      setRuns((currentRuns) => [
        advancedRun,
        ...(currentRuns ?? []).filter((run) => run.id !== advancedRun.id),
      ]);
      await refreshAutomationLedgers();
    } catch {
      setRunsError(
        "Autonomous run advance failed. No broker or live order path was called.",
      );
    } finally {
      setAdvancingRun(false);
    }
  };

  const tickLatestSchedule = async () => {
    const latestSchedule = runSchedules
      ? sortByUpdatedAtDesc(runSchedules)[0]
      : undefined;

    if (!latestSchedule) {
      setRunSchedulesError("No live autonomous schedule is available to tick.");
      return;
    }

    setTickingSchedule(true);
    setRunSchedulesError(null);

    try {
      const advancedRun = await controlPlaneApi.tickRunSchedule(
        latestSchedule.id,
        {
          leaseOwner: "dashboard-manual-tick",
          attemptPaperExecution:
            latestSchedule.mode === "paper" &&
            latestSchedule.attemptPaperExecution,
        },
      );
      setRuns((currentRuns) => [
        advancedRun,
        ...(currentRuns ?? []).filter((run) => run.id !== advancedRun.id),
      ]);
      await refreshAutomationLedgers();
    } catch {
      setRunSchedulesError(
        "Autonomous schedule tick failed. No broker or live order path was called.",
      );
    } finally {
      setTickingSchedule(false);
    }
  };

  const tripKillSwitch = async () => {
    setRunningKillSwitchTrip(true);
    setKillSwitchError(null);

    try {
      await controlPlaneApi.tripKillSwitch({
        actor: "dashboard-operator",
        reason: "Dashboard emergency stop",
      });
      await refreshAutomationLedgers();
    } catch {
      setKillSwitchError(
        "Kill switch trip failed. Verify the control-plane API before any further automation.",
      );
    } finally {
      setRunningKillSwitchTrip(false);
    }
  };

  return {
    status: riskGateStatus ?? DOCUMENTED_STATUS,
    controlStatus,
    visibleBudgets,
    visibleResearchRuns:
      researchRuns ?? (loadingResearchRuns ? [] : DOCUMENTED_RESEARCH_RUNS),
    visibleProposals,
    visibleRiskEvaluations,
    visibleRuns,
    visibleRunSchedules,
    visibleRunScheduleWorkerStatus,
    visiblePaperOrderPlans,
    visiblePaperAccount: paperAccount,
    visiblePaperAccountEvents,
    visibleBrokerSnapshots,
    visibleFundingReadiness,
    visibleLivePilotReadiness,
    visibleBrokerOrderCommands,
    visibleBrokerOrderStatuses,
    visibleBrokerFills,
    visibleBrokerAdapterStatus,
    visibleOrderPlanApprovals,
    visibleMarketDataIngestionStatus,
    visibleMarketDataIngestionRuns,
    visibleActionTimeline,
    visibleExecutionControl: executionControl ?? DOCUMENTED_EXECUTION_CONTROL,
    latestPaperOrderPlans: sortByUpdatedAtDesc(visiblePaperOrderPlans).slice(
      0,
      3,
    ),
    latestBrokerSnapshot: [...visibleBrokerSnapshots].sort(
      (leftSnapshot, rightSnapshot) =>
        new Date(rightSnapshot.asOf).getTime() -
        new Date(leftSnapshot.asOf).getTime(),
    )[0],
    latestFundingReadiness: [...visibleFundingReadiness].sort(
      (leftRecord, rightRecord) =>
        new Date(rightRecord.checkedAt).getTime() -
        new Date(leftRecord.checkedAt).getTime(),
    )[0],
    latestLivePilotReadiness: [...visibleLivePilotReadiness].sort(
      (leftRecord, rightRecord) =>
        new Date(rightRecord.checkedAt).getTime() -
        new Date(leftRecord.checkedAt).getTime(),
    )[0],
    latestBrokerOrderCommand: [...visibleBrokerOrderCommands].sort(
      (leftCommand, rightCommand) =>
        new Date(rightCommand.checkedAt).getTime() -
        new Date(leftCommand.checkedAt).getTime(),
    )[0],
    latestBrokerOrderStatus: [...visibleBrokerOrderStatuses].sort(
      (leftStatus, rightStatus) =>
        new Date(rightStatus.asOf).getTime() -
        new Date(leftStatus.asOf).getTime(),
    )[0],
    latestBrokerFill: [...visibleBrokerFills].sort(
      (leftFill, rightFill) =>
        new Date(rightFill.filledAt).getTime() -
        new Date(leftFill.filledAt).getTime(),
    )[0],
    latestOrderPlanApproval: [...visibleOrderPlanApprovals].sort(
      (leftApproval, rightApproval) =>
        new Date(rightApproval.updatedAt).getTime() -
        new Date(leftApproval.updatedAt).getTime(),
    )[0],
    latestReconciledPlan: sortByUpdatedAtDesc(visiblePaperOrderPlans).find(
      (plan) => plan.reconciliation.reconciledAt,
    ),
    latestRun: sortByUpdatedAtDesc(visibleRuns)[0],
    latestRunSchedule: sortByUpdatedAtDesc(visibleRunSchedules)[0],
    currentCycleEvidence: buildCurrentCycleEvidence({
      runs: visibleRuns,
      schedules: visibleRunSchedules,
      researchRuns:
        researchRuns ?? (loadingResearchRuns ? [] : DOCUMENTED_RESEARCH_RUNS),
      proposals: visibleProposals,
      riskEvaluations: visibleRiskEvaluations,
      approvals: visibleOrderPlanApprovals,
      paperPlans: visiblePaperOrderPlans,
      paperAccount,
      workerStatus: visibleRunScheduleWorkerStatus,
    }),
    workflowStages: buildWorkflowStages({
      budgets: visibleBudgets,
      researchRuns:
        researchRuns ?? (loadingResearchRuns ? [] : DOCUMENTED_RESEARCH_RUNS),
      proposals: visibleProposals,
      riskEvaluations: visibleRiskEvaluations,
      approvals: visibleOrderPlanApprovals,
      paperPlans: visiblePaperOrderPlans,
      brokerSnapshots: visibleBrokerSnapshots,
      paperAccount,
    }),
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
      budgets: budgets
        ? "Live budgets"
        : loadingBudgets
          ? "Loading budgets"
          : "Documented budget sample",
      researchRuns: researchRuns
        ? "Live research ledger"
        : loadingResearchRuns
          ? "Loading research ledger"
          : "Documented sample runs",
      proposals: proposals
        ? "Live proposals"
        : loadingProposals
          ? "Loading proposals"
          : "Documented proposal sample",
      riskEvaluations: riskEvaluations
        ? "Live risk evaluations"
        : loadingRiskEvaluations
          ? "Loading risk evaluations"
          : "Documented risk sample",
      runs: runs
        ? "Live autonomous runs"
        : loadingRuns
          ? "Loading autonomous runs"
          : "Documented run sample",
      runSchedules: runSchedules
        ? "Live run schedules"
        : loadingRunSchedules
          ? "Loading run schedules"
          : "Documented schedule sample",
      runScheduleWorker: runScheduleWorkerStatus
        ? "Live schedule worker"
        : loadingRunScheduleWorker
          ? "Loading schedule worker"
          : "Documented worker sample",
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
      paperAccountEvents: paperAccountEvents
        ? "Live account events"
        : loadingPaperAccountEvents
          ? "Loading account events"
          : "Documented account events",
      brokerSnapshots: brokerSnapshots
        ? "API broker snapshots"
        : loadingBrokerSnapshots
          ? "Loading broker snapshots"
          : "Documented broker sample",
      fundingReadiness: fundingReadiness
        ? "API funding readiness"
        : loadingFundingReadiness
          ? "Loading funding readiness"
          : "Documented funding sample",
      livePilotReadiness: livePilotReadiness
        ? "API broker-write pre-trade risk check"
        : loadingLivePilotReadiness
          ? "Loading broker-write pre-trade risk check"
          : "Documented broker-write pre-trade risk check sample",
      brokerOrderCommands: brokerOrderCommands
        ? "API broker order commands"
        : loadingBrokerOrderCommands
          ? "Loading broker order commands"
          : "Documented broker command sample",
      brokerOrderStatuses: brokerOrderStatuses
        ? "API broker order statuses"
        : loadingBrokerOrderStatuses
          ? "Loading broker order statuses"
          : "Documented broker lifecycle sample",
      brokerFills: brokerFills
        ? "API broker fills"
        : loadingBrokerFills
          ? "Loading broker fills"
          : "Documented broker fill sample",
      brokerAdapter: brokerAdapterStatus
        ? "API broker adapter status"
        : loadingBrokerAdapter
          ? "Loading broker adapter"
          : "Documented broker adapter sample",
      orderPlanApprovals: orderPlanApprovals
        ? "Live signed approvals"
        : loadingOrderPlanApprovals
          ? "Loading signed approvals"
          : "Documented approval sample",
      marketDataIngestion: marketDataIngestionStatus
        ? "Live market-data ingestion"
        : loadingMarketDataIngestion
          ? "Loading market-data ingestion"
          : "Documented ingestion sample",
      actionTimeline: actionTimeline
        ? "Live action timeline"
        : loadingActionTimeline
          ? "Loading action timeline"
          : "Documented audit sample",
    },
    errors: {
      status: statusError,
      budgets: budgetsError,
      researchRuns: researchRunsError,
      proposals: proposalsError,
      riskEvaluations: riskEvaluationsError,
      runs: runsError,
      runSchedules: runSchedulesError,
      runScheduleWorker: runScheduleWorkerError,
      paperOrderPlans: paperOrderPlansError,
      paperAccount: paperAccountError,
      paperAccountEvents: paperAccountEventsError,
      brokerSnapshots: brokerSnapshotsError,
      fundingReadiness: fundingReadinessError,
      livePilotReadiness: livePilotReadinessError,
      brokerOrderCommands: brokerOrderCommandsError,
      brokerOrderStatuses: brokerOrderStatusesError,
      brokerFills: brokerFillsError,
      brokerAdapter: brokerAdapterError,
      orderPlanApprovals: orderPlanApprovalsError,
      marketDataIngestion: marketDataIngestionError,
      actionTimeline: actionTimelineError,
      killSwitch: killSwitchError,
      baselineResearch: baselineResearchError,
      recoveryProposal: recoveryProposalError,
    },
    loading: {
      researchRuns: loadingResearchRuns,
      budgets: loadingBudgets,
      proposals: loadingProposals,
      riskEvaluations: loadingRiskEvaluations,
      runs: loadingRuns,
      runSchedules: loadingRunSchedules,
      runScheduleWorker: loadingRunScheduleWorker,
      paperAccount: loadingPaperAccount,
      paperAccountEvents: loadingPaperAccountEvents,
      paperOrderPlans: loadingPaperOrderPlans,
      brokerSnapshots: loadingBrokerSnapshots,
      fundingReadiness: loadingFundingReadiness,
      livePilotReadiness: loadingLivePilotReadiness,
      brokerOrderCommands: loadingBrokerOrderCommands,
      brokerOrderStatuses: loadingBrokerOrderStatuses,
      brokerFills: loadingBrokerFills,
      brokerAdapter: loadingBrokerAdapter,
      orderPlanApprovals: loadingOrderPlanApprovals,
      marketDataIngestion: loadingMarketDataIngestion,
      actionTimeline: loadingActionTimeline,
    },
    baselineResearchSuccess,
    recoveryProposalSuccess,
    runningBaselineResearch,
    runningRecoveryProposal,
    runningKillSwitchTrip,
    advancingRun,
    tickingSchedule,
    readinessReadyCount: controlStatus.readiness.filter((item) => item.ready)
      .length,
    runBaselineResearch,
    runRecoveryProposal,
    tripKillSwitch,
    advanceLatestRun,
    tickLatestSchedule,
  };
};
