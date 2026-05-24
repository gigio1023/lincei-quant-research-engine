import { LeanRun } from '../../entities/lean-run.entity';
import { LivePilotPreflightContract } from './contracts/v1-pilot.contracts';
import {
  V1PilotSystemStatus,
  V1SystemStage,
  V1SystemStageStatus,
} from './v1-pilot-status.types';

export interface V1SystemStageInput {
  alpha: V1PilotSystemStatus['alpha'];
  latestLeanRun: LeanRun | null;
  portfolioTarget: V1PilotSystemStatus['portfolioTarget'];
  paper: V1PilotSystemStatus['paper'];
  broker: V1PilotSystemStatus['broker'];
  preflight: LivePilotPreflightContract;
  livePilot: V1PilotSystemStatus['livePilot'];
}

export function buildV1SystemStages(
  input: V1SystemStageInput,
): V1SystemStage[] {
  return [
    stage(
      'feature_store',
      'Feature Store',
      input.alpha.featureSnapshotCount > 0 ? 'ready' : 'missing',
      `${input.alpha.featureSnapshotCount} feature snapshots`,
      input.alpha.featureSnapshotCount > 0
        ? []
        : ['No timestamped feature snapshots have been stored.'],
      input.alpha.latestFeatureAsOf ? [input.alpha.latestFeatureAsOf] : [],
    ),
    stage(
      'alpha_decisions',
      'Alpha Decisions',
      input.alpha.numericDecisionCount > 0 &&
        input.alpha.llmDecisionCount > 0 &&
        input.alpha.metaDecisionCount > 0
        ? 'ready'
        : input.alpha.numericDecisionCount > 0
          ? 'blocked'
          : 'missing',
      `numeric=${input.alpha.numericDecisionCount}, llm=${input.alpha.llmDecisionCount}, meta=${input.alpha.metaDecisionCount}`,
      [
        input.alpha.numericDecisionCount <= 0
          ? 'Numeric alpha decisions are missing.'
          : '',
        input.alpha.llmDecisionCount <= 0
          ? 'LLM alpha decisions are missing.'
          : '',
        input.alpha.metaDecisionCount <= 0
          ? 'Meta alpha decisions are missing.'
          : '',
      ].filter(Boolean),
      input.alpha.latestAlphaAsOf ? [input.alpha.latestAlphaAsOf] : [],
    ),
    stage(
      'lean_backtest',
      'LEAN Backtest',
      input.latestLeanRun?.status === 'passed'
        ? 'ready'
        : input.latestLeanRun
          ? 'blocked'
          : 'missing',
      input.latestLeanRun
        ? `${input.latestLeanRun.runId} / ${input.latestLeanRun.status}`
        : 'No LEAN run has been imported.',
      input.latestLeanRun?.status === 'passed'
        ? []
        : ['Latest LEAN run has not passed strict import gates.'],
      input.latestLeanRun ? [input.latestLeanRun.runId] : [],
    ),
    stage(
      'portfolio_targets',
      'Portfolio Targets',
      input.portfolioTarget.targetCount > 0 ? 'ready' : 'missing',
      `${input.portfolioTarget.targetCount} imported targets`,
      input.portfolioTarget.targetCount > 0
        ? []
        : ['No portfolio targets are available for the latest LEAN run.'],
      input.portfolioTarget.id ? [input.portfolioTarget.id] : [],
    ),
    stage(
      'paper_execution',
      'Paper Execution',
      input.paper.reconciliationStatus === 'matched'
        ? 'ready'
        : input.paper.planId
          ? 'blocked'
          : 'missing',
      input.paper.planId
        ? `plan=${input.paper.planId}, status=${input.paper.status}, reconciliation=${input.paper.reconciliationStatus ?? 'unknown'}`
        : 'No paper plan exists for the latest LEAN target.',
      input.paper.reconciliationStatus === 'matched'
        ? []
        : ['Latest matching paper plan is not reconciled.'],
      input.paper.planId ? [String(input.paper.planId)] : [],
    ),
    stage(
      'broker_read_only',
      'Broker Read-Only',
      input.broker.provider === 'toss' &&
        input.broker.snapshotReconciliationStatus === 'matched'
        ? 'ready'
        : input.broker.snapshotId
          ? 'blocked'
          : 'missing',
      input.broker.snapshotId
        ? `${input.broker.provider} snapshot=${input.broker.snapshotId}, reconciliation=${input.broker.snapshotReconciliationStatus ?? 'unknown'}`
        : 'No broker read-only snapshot evidence exists.',
      input.broker.provider === 'toss' &&
        input.broker.snapshotReconciliationStatus === 'matched'
        ? []
        : ['Latest broker snapshot is not matched Toss read-only evidence.'],
      input.broker.snapshotId ? [String(input.broker.snapshotId)] : [],
    ),
    stage(
      'open_orders',
      'Open Orders',
      input.broker.openOrderCount === 0 ? 'ready' : 'blocked',
      `${input.broker.openOrderCount} open or mismatched broker order records`,
      input.broker.openOrderCount === 0
        ? []
        : ['Open or mismatched broker order evidence must be resolved.'],
      input.broker.orderStatusId ? [String(input.broker.orderStatusId)] : [],
    ),
    buildLivePreflightStage(input.latestLeanRun, input.paper, input.preflight),
    stage(
      'live_pilot',
      'Live Pilot',
      input.livePilot.realOrderSent ? 'ready' : 'blocked',
      input.livePilot.realOrderSent
        ? `real order sent via ${input.livePilot.latestIntentId}`
        : 'No real broker order has been sent.',
      input.livePilot.realOrderSent
        ? []
        : ['Live pilot is blocked until live preflight is ready.'],
      input.livePilot.latestIntentId ? [input.livePilot.latestIntentId] : [],
    ),
    stage(
      'live_reconciliation',
      'Live Reconciliation',
      input.livePilot.realOrderSent &&
        input.broker.fillReconciliationStatus === 'matched' &&
        input.broker.snapshotReconciliationStatus === 'matched'
        ? 'ready'
        : input.livePilot.realOrderSent
          ? 'blocked'
          : 'missing',
      input.livePilot.realOrderSent
        ? `fill=${input.broker.fillReconciliationStatus ?? 'missing'}, snapshot=${input.broker.snapshotReconciliationStatus ?? 'missing'}`
        : 'No live order has been sent, so live reconciliation is not applicable yet.',
      input.livePilot.realOrderSent &&
        input.broker.fillReconciliationStatus === 'matched' &&
        input.broker.snapshotReconciliationStatus === 'matched'
        ? []
        : ['Live fills and broker snapshot are not both matched.'],
      input.broker.fillId ? [String(input.broker.fillId)] : [],
    ),
  ];
}

export function buildV1NextActions(stages: V1SystemStage[]): string[] {
  const firstBlocker = stages.find((stageItem) => stageItem.status !== 'ready');
  if (!firstBlocker) {
    return [
      'All V1 stages are ready; real-money pilot can run only with explicit confirmation.',
    ];
  }
  return [
    `Resolve ${firstBlocker.label}: ${firstBlocker.blockers[0] ?? firstBlocker.detail}`,
    'Run ./scripts/run-v1-cycle after the blocker is resolved.',
  ];
}

function buildLivePreflightStage(
  latestLeanRun: LeanRun | null,
  paper: V1PilotSystemStatus['paper'],
  preflight: LivePilotPreflightContract,
): V1SystemStage {
  const staleBlockers = [
    latestLeanRun &&
    preflight.latestLeanRunId &&
    preflight.latestLeanRunId !== latestLeanRun.runId
      ? `Latest preflight used LEAN run ${preflight.latestLeanRunId}, not current ${latestLeanRun.runId}.`
      : '',
    paper.planId &&
    preflight.latestPaperPlanId &&
    String(preflight.latestPaperPlanId) !== String(paper.planId)
      ? `Latest preflight used paper plan ${preflight.latestPaperPlanId}, not current ${paper.planId}.`
      : '',
  ].filter((blocker): blocker is string => blocker.length > 0);
  const blockers = [...preflight.blockers, ...staleBlockers];

  return stage(
    'live_preflight',
    'Live Preflight',
    preflight.status === 'ready' && staleBlockers.length === 0
      ? 'ready'
      : 'blocked',
    preflight.status,
    blockers,
    [
      preflight.latestLeanRunId,
      preflight.latestPaperPlanId
        ? String(preflight.latestPaperPlanId)
        : undefined,
      preflight.latestBrokerSnapshotId
        ? String(preflight.latestBrokerSnapshotId)
        : undefined,
    ].filter((ref): ref is string => Boolean(ref)),
  );
}

function stage(
  key: string,
  label: string,
  status: V1SystemStageStatus,
  detail: string,
  blockers: string[],
  refs: string[],
): V1SystemStage {
  return { key, label, status, detail, blockers, refs };
}
