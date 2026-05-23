import { AutonomousRun } from '../../entities/autonomous-run.entity';
import { BrokerFill } from '../../entities/broker-fill.entity';
import { BrokerSnapshot } from '../../entities/broker-snapshot.entity';
import { ExecutionControlState } from '../../entities/execution-control-state.entity';
import { PaperOrderPlan } from '../../entities/paper-order-plan.entity';
import { ControlPlaneActionStatus } from './control-plane.types';

export interface BuildControlPlaneActionStatusInput {
  checkedAt: string;
  executionControlState: ExecutionControlState;
  runs: AutonomousRun[];
  paperPlans: PaperOrderPlan[];
  brokerSnapshots: BrokerSnapshot[];
  brokerFills: BrokerFill[];
}

export function buildControlPlaneActionStatus(
  input: BuildControlPlaneActionStatusInput,
): ControlPlaneActionStatus {
  const latestRun = latestByUpdatedAt(input.runs);
  const latestPaperPlan =
    input.paperPlans.find((plan) => plan.id === latestRun?.paperOrderPlanId) ??
    latestByUpdatedAt(input.paperPlans);
  const latestBrokerSnapshot = latestByDate(
    input.brokerSnapshots,
    (snapshot) => snapshot.asOf,
  );
  const latestBrokerFill = latestByDate(
    input.brokerFills,
    (fill) => fill.filledAt,
  );
  const latestAction = buildLatestAction(latestRun);
  const paper = latestPaperPlan
    ? {
        planId: latestPaperPlan.id,
        status: latestPaperPlan.status,
        reconciliationStatus: latestPaperPlan.reconciliation?.status,
        fillCount: latestPaperPlan.fills?.length ?? 0,
        detail: `${latestPaperPlan.orders?.length ?? 0} paper orders / ${
          latestPaperPlan.fills?.length ?? 0
        } fills`,
      }
    : {
        status: 'missing',
        fillCount: 0,
        detail: 'No paper order plan has been created yet',
      };
  const brokerSnapshot = latestBrokerSnapshot
    ? {
        snapshotId: latestBrokerSnapshot.id,
        status: latestBrokerSnapshot.status,
        reconciliationStatus: latestBrokerSnapshot.reconciliation?.status,
        asOf: latestBrokerSnapshot.asOf.toISOString(),
        detail: `${latestBrokerSnapshot.provider} snapshot / ${latestBrokerSnapshot.reconciliation?.status}`,
      }
    : {
        status: 'missing',
        detail: 'No broker snapshot evidence has been imported yet',
      };
  const brokerFill = latestBrokerFill
    ? {
        fillId: latestBrokerFill.id,
        status: latestBrokerFill.status,
        reconciliationStatus: latestBrokerFill.reconciliation?.status,
        paperOrderPlanId: latestBrokerFill.reconciliation?.paperOrderPlanId,
        paperFillId: latestBrokerFill.reconciliation?.paperFillId,
        checkedAt: latestBrokerFill.reconciliation?.checkedAt,
        detail: `${latestBrokerFill.symbol} ${latestBrokerFill.side} / ${latestBrokerFill.reconciliation?.status}`,
      }
    : {
        status: 'missing',
        detail: 'No broker fill evidence has been imported yet',
      };
  const blocker = getActionBlocker(
    input.executionControlState,
    latestPaperPlan,
    latestBrokerSnapshot,
    latestBrokerFill,
  );
  const nextSafeAction = getNextSafeAction({
    executionControlState: input.executionControlState,
    latestRun,
    latestPaperPlan,
    latestBrokerSnapshot,
    latestBrokerFill,
    blocker,
  });
  const verdict =
    blocker !== undefined
      ? 'blocked'
      : isBrokerEvidenceMatched(latestBrokerSnapshot, latestBrokerFill)
        ? 'ready'
        : 'attention';

  return {
    checkedAt: input.checkedAt,
    verdict,
    latestAction,
    paper,
    brokerSnapshot,
    brokerFill,
    blocker,
    nextSafeAction,
    brokerExecutionEnabled: false,
    liveTradingEnabled: false,
  };
}

function buildLatestAction(
  latestRun?: AutonomousRun,
): ControlPlaneActionStatus['latestAction'] {
  if (latestRun) {
    return {
      stage: 'autonomous_run',
      status: latestRun.status,
      id: latestRun.id,
      detail:
        latestRun.nextAction ?? latestRun.lastAction ?? latestRun.objective,
      updatedAt: latestRun.updatedAt?.toISOString(),
    };
  }

  return {
    stage: 'idle',
    status: 'missing',
    detail: 'No autonomous action has been recorded yet',
  };
}

function getActionBlocker(
  executionControlState: ExecutionControlState,
  paperPlan?: PaperOrderPlan,
  brokerSnapshot?: BrokerSnapshot,
  brokerFill?: BrokerFill,
): string | undefined {
  if (['halted', 'paused'].includes(executionControlState.state)) {
    return `Execution control is ${executionControlState.state}`;
  }

  if (brokerFill?.reconciliation?.status === 'mismatch') {
    return 'Latest broker fill mismatches the paper fill evidence';
  }

  if (brokerSnapshot?.reconciliation?.status === 'mismatch') {
    return 'Latest broker snapshot mismatches the paper account state';
  }

  if (brokerSnapshot?.reconciliation?.status === 'stale') {
    return 'Latest broker snapshot is stale';
  }

  if (paperPlan?.status === 'reconciliation_failed') {
    return 'Latest paper order plan failed local reconciliation';
  }

  if (paperPlan?.status === 'blocked') {
    return 'Latest paper order plan is blocked';
  }

  return undefined;
}

function getNextSafeAction(input: {
  executionControlState: ExecutionControlState;
  latestRun?: AutonomousRun;
  latestPaperPlan?: PaperOrderPlan;
  latestBrokerSnapshot?: BrokerSnapshot;
  latestBrokerFill?: BrokerFill;
  blocker?: string;
}): string {
  if (input.blocker) {
    if (['halted', 'paused'].includes(input.executionControlState.state)) {
      return `Resume execution control before advancing the autonomous run.`;
    }

    return 'Pause advancement and resolve the blocker before any further execution.';
  }

  if (!input.latestRun) {
    return 'Create or tick an autonomous run against an active budget envelope.';
  }

  if (!input.latestPaperPlan) {
    return 'Collect signed paper approval and active paper-account evidence before execution.';
  }

  if (!input.latestBrokerSnapshot) {
    return 'Import or poll a read-only broker snapshot for account reconciliation.';
  }

  if (!input.latestBrokerFill) {
    return 'Import or poll read-only broker fills and match them to paper fills.';
  }

  if (
    isBrokerEvidenceMatched(input.latestBrokerSnapshot, input.latestBrokerFill)
  ) {
    return 'Continue monitoring; live trading remains disabled.';
  }

  return 'Reconcile broker evidence before promoting the next cycle.';
}

function isBrokerEvidenceMatched(
  brokerSnapshot?: BrokerSnapshot,
  brokerFill?: BrokerFill,
): boolean {
  return (
    brokerSnapshot?.reconciliation?.status === 'matched' &&
    brokerFill?.reconciliation?.status === 'matched'
  );
}

function latestByUpdatedAt<T extends { updatedAt?: Date; createdAt?: Date }>(
  items: T[],
): T | undefined {
  return [...items].sort(
    (left, right) =>
      (right.updatedAt ?? right.createdAt ?? new Date(0)).getTime() -
      (left.updatedAt ?? left.createdAt ?? new Date(0)).getTime(),
  )[0];
}

function latestByDate<T extends { updatedAt?: Date; createdAt?: Date }>(
  items: T[],
  getDate: (item: T) => Date | undefined,
): T | undefined {
  return [...items].sort(
    (left, right) =>
      (
        getDate(right) ??
        right.updatedAt ??
        right.createdAt ??
        new Date(0)
      ).getTime() -
      (
        getDate(left) ??
        left.updatedAt ??
        left.createdAt ??
        new Date(0)
      ).getTime(),
  )[0];
}
