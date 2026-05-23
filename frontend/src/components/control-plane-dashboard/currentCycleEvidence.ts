import {
  AutonomousRun,
  AutonomousRunSchedule,
  InvestmentProposal,
  OrderPlanApproval,
  PaperAccount,
  PaperOrderPlan,
  ResearchRun,
  RiskEvaluation,
  RunScheduleWorkerStatus,
} from "../../types";

export type DataFreshnessVerdict = "fresh" | "stale" | "unknown";

export type RecoveryState =
  | "not_needed"
  | "available"
  | "proposal_created"
  | "risk_checked"
  | "waiting_approval"
  | "paper_executed"
  | "blocked";

export interface CurrentCycleEvidence {
  cycleKey: string;
  scheduleId: string;
  mode: string;
  worker: string;
  datasetId: string;
  symbol: string;
  benchmark: string;
  maxAgeMinutes?: number;
  availabilityTimestamp?: string;
  marketDataTimestamp?: string;
  freshness: DataFreshnessVerdict;
  decisionChain: {
    researchRun: string;
    proposal: string;
    risk: string;
    nextAction: string;
  };
  approval: {
    source: string;
    status: string;
    policyRef: string;
    consumedBy: string;
  };
  paper: {
    plan: string;
    status: string;
    orders: number;
    fills: number;
    reconciliation: string;
    accountEvent: string;
  };
  recoveryState: RecoveryState;
}

const idEquals = (
  left: number | string | undefined | null,
  right: number | string | undefined | null,
) =>
  left !== undefined &&
  left !== null &&
  right !== undefined &&
  right !== null &&
  String(left) === String(right);

const sortByUpdatedAtDesc = <T extends { updatedAt: string }>(items: T[]) =>
  [...items].sort(
    (leftItem, rightItem) =>
      new Date(rightItem.updatedAt).getTime() -
      new Date(leftItem.updatedAt).getTime(),
  );

const sortRiskEvaluations = (items: RiskEvaluation[]) =>
  [...items].sort(
    (leftItem, rightItem) =>
      new Date(rightItem.evaluatedAt).getTime() -
      new Date(leftItem.evaluatedAt).getTime(),
  );

const formatId = (prefix: string, id?: number | string | null) =>
  id === undefined || id === null ? "missing" : `${prefix} ${id}`;

const computeFreshness = ({
  availabilityTimestamp,
  maxAgeMinutes,
  checkedAt,
}: {
  availabilityTimestamp?: string;
  maxAgeMinutes?: number | null;
  checkedAt?: string;
}): DataFreshnessVerdict => {
  if (!availabilityTimestamp || !maxAgeMinutes) {
    return "unknown";
  }

  const availabilityMs = new Date(availabilityTimestamp).getTime();
  const checkedMs = checkedAt ? new Date(checkedAt).getTime() : Date.now();

  if (Number.isNaN(availabilityMs) || Number.isNaN(checkedMs)) {
    return "unknown";
  }

  return checkedMs - availabilityMs <= maxAgeMinutes * 60_000
    ? "fresh"
    : "stale";
};

const findLatestRecoveryProposal = (proposals: InvestmentProposal[]) =>
  sortByUpdatedAtDesc(proposals).find(
    (proposal) => proposal.ruleId === "paper-account-recovery-sell-only-v1",
  );

const buildRecoveryState = ({
  paperAccount,
  recoveryProposal,
  recoveryRisk,
  recoveryApproval,
  recoveryPlan,
}: {
  paperAccount: PaperAccount | null;
  recoveryProposal?: InvestmentProposal;
  recoveryRisk?: RiskEvaluation;
  recoveryApproval?: OrderPlanApproval;
  recoveryPlan?: PaperOrderPlan;
}): RecoveryState => {
  const hasLongPositions = Boolean(
    paperAccount?.positions?.some((position) => position.marketValue > 0),
  );

  if (recoveryPlan?.status === "blocked") {
    return "blocked";
  }

  if (recoveryPlan && ["filled", "reconciled"].includes(recoveryPlan.status)) {
    return "paper_executed";
  }

  if (!hasLongPositions) {
    return "not_needed";
  }

  if (recoveryRisk?.decision === "ALLOW" && !recoveryApproval) {
    return "waiting_approval";
  }

  if (recoveryRisk) {
    return "risk_checked";
  }

  if (recoveryProposal) {
    return "proposal_created";
  }

  return "available";
};

export const buildCurrentCycleEvidence = (input: {
  runs: AutonomousRun[];
  schedules: AutonomousRunSchedule[];
  researchRuns: ResearchRun[];
  proposals: InvestmentProposal[];
  riskEvaluations: RiskEvaluation[];
  approvals: OrderPlanApproval[];
  paperPlans: PaperOrderPlan[];
  paperAccount: PaperAccount | null;
  workerStatus: RunScheduleWorkerStatus;
}): CurrentCycleEvidence => {
  const latestRun = sortByUpdatedAtDesc(input.runs)[0];
  const schedule =
    input.schedules.find((item) => idEquals(item.id, latestRun?.scheduleId)) ??
    sortByUpdatedAtDesc(input.schedules)[0];
  const researchRun =
    input.researchRuns.find((item) =>
      idEquals(item.id, latestRun?.researchRunId),
    ) ?? sortByUpdatedAtDesc(input.researchRuns)[0];
  const proposal =
    input.proposals.find((item) => idEquals(item.id, latestRun?.proposalId)) ??
    input.proposals.find((item) =>
      idEquals(item.researchRunId, researchRun?.id),
    ) ??
    sortByUpdatedAtDesc(input.proposals)[0];
  const risk =
    input.riskEvaluations.find((item) =>
      idEquals(item.id, latestRun?.riskEvaluationId),
    ) ??
    input.riskEvaluations.find((item) =>
      idEquals(item.proposalId, proposal?.id),
    ) ??
    sortRiskEvaluations(input.riskEvaluations)[0];
  const approval =
    input.approvals.find((item) =>
      idEquals(item.approvedByRunId, latestRun?.id),
    ) ??
    input.approvals.find((item) => idEquals(item.proposalId, proposal?.id)) ??
    sortByUpdatedAtDesc(input.approvals)[0];
  const paperPlan =
    input.paperPlans.find((item) =>
      idEquals(item.id, latestRun?.paperOrderPlanId),
    ) ??
    input.paperPlans.find((item) =>
      idEquals(item.id, approval?.consumedByPaperOrderPlanId),
    ) ??
    input.paperPlans.find((item) => idEquals(item.proposalId, proposal?.id)) ??
    sortByUpdatedAtDesc(input.paperPlans)[0];
  const datasetRef = researchRun?.datasetRefs?.[0];
  const recoveryProposal = findLatestRecoveryProposal(input.proposals);
  const recoveryRisk = recoveryProposal
    ? input.riskEvaluations.find((item) =>
        idEquals(item.proposalId, recoveryProposal.id),
      )
    : undefined;
  const recoveryApproval = recoveryProposal
    ? input.approvals.find((item) =>
        idEquals(item.proposalId, recoveryProposal.id),
      )
    : undefined;
  const recoveryPlan = recoveryProposal
    ? input.paperPlans.find((item) =>
        idEquals(item.proposalId, recoveryProposal.id),
      )
    : undefined;

  return {
    cycleKey: latestRun?.cycleKey ?? schedule?.lastCycleKey ?? "missing",
    scheduleId: String(schedule?.id ?? "missing"),
    mode: schedule?.mode ?? latestRun?.status ?? "unknown",
    worker: input.workerStatus.lastResult
      ? `${input.workerStatus.lastResult.ticked} ticked / ${input.workerStatus.lastResult.failed} failed`
      : input.workerStatus.enabled
        ? "waiting"
        : "disabled",
    datasetId: datasetRef?.id ?? schedule?.researchDatasetId ?? "missing",
    symbol: schedule?.researchSymbol ?? datasetRef?.universe?.[0] ?? "missing",
    benchmark:
      schedule?.researchBenchmark ?? datasetRef?.universe?.[1] ?? "missing",
    maxAgeMinutes: schedule?.researchMaxDataAgeMinutes ?? undefined,
    availabilityTimestamp: datasetRef?.availabilityTimestamp,
    marketDataTimestamp: datasetRef?.marketDataTimestamp,
    freshness: computeFreshness({
      availabilityTimestamp: datasetRef?.availabilityTimestamp,
      maxAgeMinutes: schedule?.researchMaxDataAgeMinutes,
      checkedAt:
        latestRun?.updatedAt ??
        schedule?.lastTickAt ??
        input.workerStatus.currentTime,
    }),
    decisionChain: {
      researchRun: formatId("research", researchRun?.id),
      proposal: formatId("proposal", proposal?.id),
      risk: risk
        ? `${formatId("risk", risk.id)} / ${risk.decision}`
        : "missing",
      nextAction: latestRun?.nextAction ?? "No autonomous run recorded",
    },
    approval: {
      source: approval?.approvalSource ?? "missing",
      status: approval?.status ?? "missing",
      policyRef: approval?.autoApprovalPolicyRef ?? "none",
      consumedBy:
        approval?.consumedByPaperOrderPlanId === undefined
          ? "none"
          : String(approval.consumedByPaperOrderPlanId),
    },
    paper: {
      plan: formatId("plan", paperPlan?.id),
      status: paperPlan?.status ?? "missing",
      orders: paperPlan?.orders.length ?? 0,
      fills: paperPlan?.fills.length ?? 0,
      reconciliation: paperPlan?.reconciliation.status ?? "missing",
      accountEvent: paperPlan?.readinessSnapshot.currentPaperAccountEventHash
        ? `seq ${paperPlan.readinessSnapshot.paperAccountEventSequence ?? "?"}`
        : "missing",
    },
    recoveryState: buildRecoveryState({
      paperAccount: input.paperAccount,
      recoveryProposal,
      recoveryRisk,
      recoveryApproval,
      recoveryPlan,
    }),
  };
};
