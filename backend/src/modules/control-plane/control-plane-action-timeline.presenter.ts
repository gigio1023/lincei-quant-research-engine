import { AutonomousRunSchedule } from '../../entities/autonomous-run-schedule.entity';
import { AutonomousRun } from '../../entities/autonomous-run.entity';
import { BrokerFill } from '../../entities/broker-fill.entity';
import { BrokerSnapshot } from '../../entities/broker-snapshot.entity';
import { BudgetEnvelope } from '../../entities/budget-envelope.entity';
import { ExecutionControlState } from '../../entities/execution-control-state.entity';
import { InvestmentProposal } from '../../entities/investment-proposal.entity';
import { MarketDataIngestionRun } from '../../entities/market-data-ingestion-run.entity';
import { OrderPlanApproval } from '../../entities/order-plan-approval.entity';
import { PaperAccountEvent } from '../../entities/paper-account-event.entity';
import { PaperOrderPlan } from '../../entities/paper-order-plan.entity';
import { PaperReservationHoldRecord } from '../../entities/paper-reservation-hold.entity';
import { ResearchRun } from '../../entities/research-run.entity';
import { RiskEvaluation } from '../../entities/risk-evaluation.entity';
import {
  ControlPlaneAuditCategory,
  ControlPlaneAuditEvent,
  ControlPlaneAuditSeverity,
  ControlPlaneAuditSourceType,
} from './control-plane.types';

export interface BuildControlPlaneActionTimelineInput {
  budgets: BudgetEnvelope[];
  executionControlStates: ExecutionControlState[];
  runSchedules: AutonomousRunSchedule[];
  runs: AutonomousRun[];
  researchRuns: ResearchRun[];
  proposals: InvestmentProposal[];
  riskEvaluations: RiskEvaluation[];
  orderPlanApprovals: OrderPlanApproval[];
  paperAccountEvents: PaperAccountEvent[];
  paperOrderPlans: PaperOrderPlan[];
  paperReservationHolds: PaperReservationHoldRecord[];
  brokerSnapshots: BrokerSnapshot[];
  brokerFills: BrokerFill[];
  marketDataIngestionRuns?: MarketDataIngestionRun[];
  limit?: number;
}

export function buildControlPlaneActionTimeline(
  input: BuildControlPlaneActionTimelineInput,
): ControlPlaneAuditEvent[] {
  return [
    ...input.budgets.map(buildBudgetEvent),
    ...input.executionControlStates.map(buildExecutionControlEvent),
    ...input.runSchedules.map(buildRunScheduleEvent),
    ...input.runs.flatMap(buildRunEvents),
    ...input.researchRuns.map(buildResearchRunEvent),
    ...input.proposals.map(buildProposalEvent),
    ...input.riskEvaluations.map(buildRiskEvaluationEvent),
    ...input.orderPlanApprovals.map(buildApprovalEvent),
    ...input.paperAccountEvents.map(buildPaperAccountEvent),
    ...input.paperOrderPlans.map(buildPaperOrderPlanEvent),
    ...input.paperReservationHolds.map(buildPaperReservationHoldEvent),
    ...input.brokerSnapshots.map(buildBrokerSnapshotEvent),
    ...input.brokerFills.map(buildBrokerFillEvent),
    ...(input.marketDataIngestionRuns ?? []).map(buildMarketDataIngestionEvent),
  ]
    .sort((left, right) => {
      const rightTime = new Date(right.at).getTime();
      const leftTime = new Date(left.at).getTime();
      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }

      return right.id.localeCompare(left.id);
    })
    .slice(0, normalizeLimit(input.limit));
}

function buildExecutionControlEvent(
  state: ExecutionControlState,
): ControlPlaneAuditEvent {
  const severity =
    state.state === 'halted' || state.state === 'paused'
      ? 'blocked'
      : state.state === 'reducing'
        ? 'attention'
        : 'ready';
  return event({
    id: `execution_control:${state.id}`,
    at: toIso(state.createdAt),
    severity,
    category: 'control',
    sourceType: 'execution_control',
    sourceId: state.id,
    title: `Execution control ${state.state}`,
    detail: `${state.actor}: ${state.reason}`,
    blocker:
      severity === 'blocked'
        ? `Execution control is ${state.state}`
        : undefined,
    nextSafeAction:
      severity === 'blocked'
        ? 'Resume execution control before advancing automation.'
        : undefined,
  });
}

function buildBudgetEvent(budget: BudgetEnvelope): ControlPlaneAuditEvent {
  return event({
    id: `budget_envelope:${budget.id}`,
    at: toIso(budget.updatedAt ?? budget.createdAt),
    severity: mapStatusSeverity(budget.status, {
      ready: ['active'],
      attention: ['draft', 'paused'],
      blocked: ['archived'],
    }),
    category: 'control',
    sourceType: 'budget_envelope',
    sourceId: budget.id,
    title: `Budget ${budget.status}`,
    detail: `${budget.name} / ${budget.currency} ${budget.totalBudget}`,
    blocker:
      budget.status === 'archived' ? 'Budget envelope is archived.' : undefined,
  });
}

function buildRunScheduleEvent(
  schedule: AutonomousRunSchedule,
): ControlPlaneAuditEvent {
  const leased =
    schedule.leaseExpiresAt &&
    schedule.leaseExpiresAt.getTime() > new Date().getTime();
  const severity = schedule.lastError
    ? 'blocked'
    : leased
      ? 'attention'
      : schedule.enabled
        ? 'ready'
        : 'info';
  return event({
    id: `autonomous_run_schedule:${schedule.id}`,
    at: toIso(schedule.updatedAt ?? schedule.lastTickAt ?? schedule.createdAt),
    severity,
    category: 'schedule',
    sourceType: 'autonomous_run_schedule',
    sourceId: schedule.id,
    scheduleId: schedule.id,
    cycleKey: schedule.lastCycleKey ?? undefined,
    title: `Schedule ${schedule.enabled ? 'enabled' : 'disabled'}`,
    detail: `${schedule.objective} / ${schedule.cadenceMinutes}m / next ${toIso(schedule.nextRunAt)}`,
    blocker: schedule.lastError ?? undefined,
    nextSafeAction: schedule.lastError
      ? 'Resolve schedule worker error before the next tick.'
      : undefined,
  });
}

function buildRunEvents(run: AutonomousRun): ControlPlaneAuditEvent[] {
  const summary = event({
    id: `autonomous_run:${run.id}`,
    at: toIso(run.updatedAt ?? run.createdAt),
    severity: mapRunSeverity(run.status),
    category: run.scheduleId ? 'schedule' : 'research',
    sourceType: 'autonomous_run',
    sourceId: run.id,
    runId: run.id,
    scheduleId: run.scheduleId,
    cycleKey: run.cycleKey,
    title: `Autonomous run ${run.status}`,
    detail: run.nextAction ?? run.lastAction ?? run.objective,
    blocker: run.status === 'failed' ? run.error : undefined,
    nextSafeAction: run.status === 'failed' ? run.nextAction : undefined,
  });
  const timelineEvents = (run.timeline ?? []).map((timelineEvent, index) =>
    event({
      id: `autonomous_run:${run.id}:timeline:${index}`,
      at: timelineEvent.at,
      severity: mapRunSeverity(timelineEvent.stage),
      category: run.scheduleId ? 'schedule' : 'research',
      sourceType: 'autonomous_run',
      sourceId: run.id,
      runId: run.id,
      scheduleId: run.scheduleId,
      cycleKey: run.cycleKey,
      title: `Run ${timelineEvent.stage}`,
      detail: timelineEvent.message,
      blocker: ['failed', 'halted'].includes(timelineEvent.stage)
        ? timelineEvent.message
        : undefined,
    }),
  );

  return [summary, ...timelineEvents];
}

function buildResearchRunEvent(run: ResearchRun): ControlPlaneAuditEvent {
  return event({
    id: `research_run:${run.id}`,
    at: toIso(run.updatedAt ?? run.createdAt),
    severity: mapStatusSeverity(run.status, {
      ready: ['evidence_ready', 'proposal_ready'],
      attention: ['created', 'running'],
      blocked: ['blocked', 'failed', 'halted', 'cancelled'],
    }),
    category: 'research',
    sourceType: 'research_run',
    sourceId: run.id,
    title: `Research ${run.status}`,
    detail: `${run.strategyFamily} / ${run.phase} / ${run.benchmark}`,
    blocker: run.blockedReasons?.[0],
    nextSafeAction: run.advanceEligible
      ? 'Create or advance an investment proposal from this research run.'
      : undefined,
  });
}

function buildProposalEvent(
  proposal: InvestmentProposal,
): ControlPlaneAuditEvent {
  return event({
    id: `proposal:${proposal.id}`,
    at: toIso(proposal.updatedAt ?? proposal.generatedAt),
    severity: mapStatusSeverity(proposal.status, {
      ready: ['evaluated', 'paper_ready'],
      attention: ['generated', 'needs_review'],
      blocked: ['rejected'],
    }),
    category: 'proposal',
    sourceType: 'proposal',
    sourceId: proposal.id,
    title: `Proposal ${proposal.status}`,
    detail: `${proposal.strategyId} / ${proposal.ruleId} / ${proposal.orders.length} orders`,
    blocker:
      proposal.status === 'rejected'
        ? 'Proposal was rejected before paper execution.'
        : undefined,
  });
}

function buildRiskEvaluationEvent(
  evaluation: RiskEvaluation,
): ControlPlaneAuditEvent {
  const severity =
    evaluation.decision === 'DENY'
      ? 'blocked'
      : evaluation.decision === 'REVIEW'
        ? 'attention'
        : 'ready';
  return event({
    id: `risk_evaluation:${evaluation.id}`,
    at: toIso(evaluation.evaluatedAt ?? evaluation.createdAt),
    severity,
    category: 'risk',
    sourceType: 'risk_evaluation',
    sourceId: evaluation.id,
    title: `Risk ${evaluation.decision}`,
    detail:
      evaluation.reasons[0] ??
      `${evaluation.responseSnapshot.approvedOrderCount} approved orders`,
    blocker:
      severity === 'blocked'
        ? (evaluation.reasons[0] ?? 'Risk gate denied the proposal.')
        : undefined,
    nextSafeAction:
      severity === 'attention'
        ? 'Collect human approval evidence before paper execution.'
        : undefined,
  });
}

function buildApprovalEvent(
  approval: OrderPlanApproval,
): ControlPlaneAuditEvent {
  return event({
    id: `order_plan_approval:${approval.id}`,
    at: toIso(approval.updatedAt ?? approval.approvedAt),
    severity: mapStatusSeverity(approval.status, {
      ready: ['active', 'consumed'],
      blocked: ['revoked', 'expired'],
    }),
    category: 'approval',
    sourceType: 'order_plan_approval',
    sourceId: approval.id,
    runId: approval.approvedByRunId,
    scheduleId: approval.approvedByScheduleId,
    title: `Approval ${approval.status}`,
    detail: `${approval.approvalSource} / ${approval.approver} / ${approval.reason}`,
    blocker:
      approval.status === 'revoked' || approval.status === 'expired'
        ? `Order-plan approval is ${approval.status}.`
        : undefined,
  });
}

function buildPaperAccountEvent(
  accountEvent: PaperAccountEvent,
): ControlPlaneAuditEvent {
  return event({
    id: `paper_account_event:${accountEvent.id}`,
    at: toIso(accountEvent.createdAt),
    severity: 'info',
    category: 'paper',
    sourceType: 'paper_account_event',
    sourceId: accountEvent.id,
    title: `Paper account ${accountEvent.eventType}`,
    detail: `${accountEvent.actor}: ${accountEvent.reason}`,
  });
}

function buildPaperOrderPlanEvent(
  plan: PaperOrderPlan,
): ControlPlaneAuditEvent {
  const severity = mapStatusSeverity(plan.status, {
    ready: ['filled', 'reconciled'],
    attention: ['planned', 'simulating', 'partially_filled'],
    blocked: ['blocked', 'failed', 'reconciliation_failed', 'killed'],
  });
  return event({
    id: `paper_order_plan:${plan.id}`,
    at: toIso(plan.updatedAt ?? plan.submittedAt),
    severity,
    category: 'paper',
    sourceType: 'paper_order_plan',
    sourceId: plan.id,
    title: `Paper plan ${plan.status}`,
    detail: `${plan.orders.length} orders / ${plan.fills.length} fills / ${plan.reconciliation.status}`,
    blocker:
      severity === 'blocked'
        ? (plan.blockedReasons[0] ??
          plan.reconciliation.notes[0] ??
          `Paper plan is ${plan.status}.`)
        : undefined,
    nextSafeAction:
      severity === 'blocked'
        ? 'Resolve paper plan blocker before advancing automation.'
        : undefined,
  });
}

function buildPaperReservationHoldEvent(
  hold: PaperReservationHoldRecord,
): ControlPlaneAuditEvent {
  return event({
    id: `paper_reservation_hold:${hold.id}`,
    at: toIso(hold.updatedAt ?? hold.reservedAt),
    severity: mapStatusSeverity(hold.status, {
      ready: ['consumed'],
      attention: ['reserved'],
      blocked: ['released'],
    }),
    category: 'paper',
    sourceType: 'paper_reservation_hold',
    sourceId: hold.id,
    title: `Paper reservation ${hold.status}`,
    detail: `cash ${hold.cashAmount} / sells ${
      Object.keys(hold.sellNotionalBySymbol).length
    } symbols`,
    blocker:
      hold.status === 'released'
        ? (hold.notes[0] ?? 'Paper reservation hold was released.')
        : undefined,
  });
}

function buildBrokerSnapshotEvent(
  snapshot: BrokerSnapshot,
): ControlPlaneAuditEvent {
  const severity = mapStatusSeverity(snapshot.reconciliation.status, {
    ready: ['matched'],
    attention: ['not_checked'],
    blocked: ['mismatch', 'stale'],
  });
  return event({
    id: `broker_snapshot:${snapshot.id}`,
    at: toIso(snapshot.asOf ?? snapshot.updatedAt ?? snapshot.createdAt),
    severity,
    category: 'broker',
    sourceType: 'broker_snapshot',
    sourceId: snapshot.id,
    title: `Broker snapshot ${snapshot.reconciliation.status}`,
    detail: `${snapshot.provider} / cash ${snapshot.cash} / equity ${snapshot.equity}`,
    blocker:
      severity === 'blocked'
        ? (snapshot.reconciliation.notes[0] ??
          `Broker snapshot is ${snapshot.reconciliation.status}.`)
        : undefined,
    nextSafeAction:
      severity === 'blocked'
        ? 'Pause advancement and reconcile broker account truth.'
        : undefined,
  });
}

function buildBrokerFillEvent(fill: BrokerFill): ControlPlaneAuditEvent {
  const severity = mapStatusSeverity(fill.reconciliation.status, {
    ready: ['matched'],
    attention: ['not_checked'],
    blocked: ['mismatch'],
  });
  return event({
    id: `broker_fill:${fill.id}`,
    at: toIso(fill.filledAt ?? fill.updatedAt ?? fill.createdAt),
    severity,
    category: 'broker',
    sourceType: 'broker_fill',
    sourceId: fill.id,
    title: `Broker fill ${fill.reconciliation.status}`,
    detail: `${fill.symbol} ${fill.side} / ${fill.quantity} / ${fill.grossNotional}`,
    blocker:
      severity === 'blocked'
        ? (fill.reconciliation.notes[0] ??
          'Broker fill mismatches paper fill evidence.')
        : undefined,
    nextSafeAction:
      severity === 'blocked'
        ? 'Pause advancement and reconcile fill evidence.'
        : undefined,
  });
}

function buildMarketDataIngestionEvent(
  run: MarketDataIngestionRun,
): ControlPlaneAuditEvent {
  const severity = mapStatusSeverity(run.status, {
    ready: ['succeeded'],
    attention: ['running', 'partial', 'skipped'],
    blocked: ['failed'],
  });
  return event({
    id: `market_data_ingestion:${run.id}`,
    at: toIso(run.updatedAt ?? run.createdAt),
    severity,
    category: 'market_data',
    sourceType: 'market_data_ingestion',
    sourceId: run.id,
    title: `Market data ingestion ${run.status}`,
    detail: `${run.provider} / ${run.datasetId} / ${run.imported} imported`,
    blocker:
      severity === 'blocked'
        ? (run.error ??
          run.blockedReasons[0] ??
          'Market data ingestion failed.')
        : run.status === 'skipped'
          ? run.blockedReasons[0]
          : undefined,
  });
}

function event(input: {
  id: string;
  at: string;
  severity: ControlPlaneAuditSeverity;
  category: ControlPlaneAuditCategory;
  sourceType: ControlPlaneAuditSourceType;
  sourceId?: number | string;
  runId?: number | string;
  scheduleId?: number | string;
  cycleKey?: string;
  title: string;
  detail: string;
  blocker?: string;
  nextSafeAction?: string;
}): ControlPlaneAuditEvent {
  return {
    ...input,
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
  };
}

function mapRunSeverity(status: string): ControlPlaneAuditSeverity {
  return mapStatusSeverity(status, {
    ready: ['risk_checked', 'paper_ready', 'completed'],
    attention: ['researching', 'proposed'],
    blocked: ['failed', 'halted', 'paused'],
  });
}

function mapStatusSeverity(
  status: string,
  groups: {
    ready?: string[];
    attention?: string[];
    blocked?: string[];
  },
): ControlPlaneAuditSeverity {
  if (groups.blocked?.includes(status)) {
    return 'blocked';
  }

  if (groups.attention?.includes(status)) {
    return 'attention';
  }

  if (groups.ready?.includes(status)) {
    return 'ready';
  }

  return 'info';
}

function normalizeLimit(value: number | undefined): number {
  if (!Number.isFinite(value)) {
    return 100;
  }

  return Math.max(1, Math.min(250, Math.trunc(value ?? 100)));
}

function toIso(value: Date | string | undefined): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value) {
    return new Date(value).toISOString();
  }

  return new Date(0).toISOString();
}
