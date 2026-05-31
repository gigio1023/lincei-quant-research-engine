import type {
  V1PilotSystemStatus,
  V1SystemStage,
} from '../modules/v1-pilot/v1-pilot-status.types';

export interface CapitalTriageResult {
  status: V1PilotSystemStatus['verdict'];
  checkedAt: string;
  currentMilestone: V1PilotSystemStatus['currentMilestone'];
  recommendedAction: {
    key: string;
    label: string;
    command: string;
    reason: string;
  };
  blockers: string[];
  supportingRefs: string[];
  brokerBoundary: {
    brokerWriteInScope: false;
    note: string;
  };
  currentStages: Array<{
    key: string;
    status: string;
    detail: string;
    blockers: string[];
    refs: string[];
  }>;
}

export function buildCapitalTriage(
  status: V1PilotSystemStatus,
): CapitalTriageResult {
  const currentStages = status.stages.filter(
    (stage) => stage.scope === 'current' && stage.blocksCurrentMilestone,
  );
  const firstBlocker =
    currentStages.find((stage) => stage.status === 'blocked') ??
    currentStages.find((stage) => stage.status === 'missing');
  const selected = firstBlocker ?? currentStages[currentStages.length - 1];
  const recommendedAction = selected
    ? actionForStage(selected)
    : {
        key: 'status',
        label: 'Inspect capital status',
        command: 'bun --cwd=backend run lincei -- capital status --json',
        reason: 'No current milestone stage was available for triage.',
      };

  return {
    status: status.verdict,
    checkedAt: status.checkedAt,
    currentMilestone: status.currentMilestone,
    recommendedAction,
    blockers: selected?.blockers ?? status.nextActions,
    supportingRefs: selected?.refs ?? [],
    brokerBoundary: {
      brokerWriteInScope: false,
      note: 'Broker writes and broker API integration remain out of scope for this broker-excluded evidence loop.',
    },
    currentStages: currentStages.map((stage) => ({
      key: stage.key,
      status: stage.status,
      detail: stage.detail,
      blockers: stage.blockers,
      refs: stage.refs,
    })),
  };
}

function actionForStage(
  stage: V1SystemStage,
): CapitalTriageResult['recommendedAction'] {
  switch (stage.key) {
    case 'hypothesis_registry':
      return {
        key: 'research-corpus',
        label: 'Refresh hypothesis registry',
        command: 'bun --cwd=backend run lincei -- research corpus --json',
        reason:
          'The hypothesis registry is the first source for retained strategy variants.',
      };
    case 'variant_evidence':
    case 'feature_store':
    case 'alpha_decisions':
      return {
        key: 'capital-run',
        label: 'Run broker-excluded capital evidence slice',
        command:
          'bun --cwd=backend run lincei -- capital run --max-backtest-workers 1 --step-timeout-ms 60000 --json',
        reason:
          'Feature, alpha, and retained variant blockers are resolved by rerunning the bounded capital evidence slice.',
      };
    case 'lean_backtest':
      return {
        key: 'lean-full-backtest',
        label: 'Run local LEAN validation path',
        command:
          'bun --cwd=backend run lincei -- lean full-backtest --skip-alpha-cycle --skip-market-data-ingest --no-download-data --json',
        reason:
          'The local LEAN validation artifact is missing or blocked before Cloud promotion evidence can be reviewed.',
      };
    case 'cloud_import':
      return {
        key: 'quantconnect-cloud-import',
        label: 'Import QuantConnect Cloud backtest results',
        command:
          'bun --cwd=backend run lincei -- qc list-backtests --project-name aggressive_llm_momentum --limit 10 --json',
        reason:
          'Promotion evidence requires imported QuantConnect Cloud backtest results tied to project/backtest ids.',
      };
    case 'portfolio_targets':
    case 'paper_execution':
      return {
        key: 'paper-run',
        label: 'Run current paper trading bridge',
        command: 'bun --cwd=backend run lincei -- paper run --json',
        reason:
          'Current paper trading artifacts and reconciliation must exist before pre-trade risk checks are meaningful.',
      };
    case 'open_orders':
      return {
        key: 'preflight-run',
        label: 'Run pre-trade risk check',
        command: 'bun --cwd=backend run lincei -- preflight run --json',
        reason:
          'Open-order state is part of the fail-closed pre-trade risk check.',
      };
    case 'broker_read_only':
    case 'live_preflight':
      return {
        key: 'capital-run',
        label:
          'Refresh broker-excluded evidence while broker boundary stays blocked',
        command:
          'bun --cwd=backend run lincei -- capital run --max-backtest-workers 1 --step-timeout-ms 60000 --json',
        reason:
          'The remaining blocker is broker-read-only or broker-write readiness, so the safe next action is to refresh non-broker promotion, paper trading, shadow trading, reconciliation, and learning artifacts.',
      };
    default:
      return {
        key: 'capital-status',
        label: 'Inspect capital status',
        command: 'bun --cwd=backend run lincei -- capital status --json',
        reason: `No specialized triage action is defined for stage ${stage.key}.`,
      };
  }
}
