import { existsSync, readFileSync } from 'fs';
import { basename, join } from 'path';
import {
  LeanFillArtifact,
  LeanInsightArtifact,
  LeanOrderEventArtifact,
  LeanPortfolioTargetsPayload,
} from './lean-run.types';

export type LeanAcceptanceMode = 'schema-import' | 'strategy-backtest';

export type LeanRunAcceptanceReport = {
  mode: LeanAcceptanceMode;
  passed: boolean;
  blockers: string[];
  metrics: {
    insightCount: number;
    targetCount: number;
    orderEventCount: number;
    fillCount: number;
    totalOrders: number;
    endEquity: number;
  };
};

type LeanRunConfig = {
  projectName?: string;
  algorithmVersion?: string;
  simulator?: string;
  mode?: string;
  parameters?: Record<string, string | number | boolean>;
};

type InsightsPayload = {
  runId?: string;
  insights?: LeanInsightArtifact[];
};

type OrderEventsPayload = {
  events?: LeanOrderEventArtifact[];
};

type FillsPayload = {
  fills?: LeanFillArtifact[];
};

const HYDRATION_NOTE = 'hydrated_from_lean_summary_only';
const STRATEGY_VALIDATION_MODE = 'historical-research';

export function assessLeanRunArtifacts(
  resultDirectory: string,
  mode: LeanAcceptanceMode,
): LeanRunAcceptanceReport {
  const blockers: string[] = [];
  const statistics = readJson<Record<string, string | number>>(
    resultDirectory,
    'statistics.json',
    blockers,
  );
  const config = readJson<LeanRunConfig>(
    resultDirectory,
    'config.json',
    blockers,
  );
  const insights = readJson<InsightsPayload>(
    resultDirectory,
    'insights.json',
    blockers,
  );
  const targets = readJson<LeanPortfolioTargetsPayload>(
    resultDirectory,
    'portfolio_targets.json',
    blockers,
  );
  const orderEvents = readJson<OrderEventsPayload>(
    resultDirectory,
    'order_events.json',
    blockers,
  );
  const fills = readJson<FillsPayload>(resultDirectory, 'fills.json', blockers);

  const metrics = {
    insightCount: insights?.insights?.length ?? 0,
    targetCount: targets?.targets?.length ?? 0,
    orderEventCount: orderEvents?.events?.length ?? 0,
    fillCount: fills?.fills?.length ?? 0,
    totalOrders: numericStat(statistics, 'Total Orders'),
    endEquity: numericStat(statistics, 'End Equity'),
  };

  if (mode === 'strategy-backtest') {
    blockers.push(
      ...strategyEvidenceBlockers(
        resultDirectory,
        config,
        insights,
        targets,
        orderEvents,
        fills,
        metrics,
      ),
    );
  }

  return {
    mode,
    passed: blockers.length === 0,
    blockers,
    metrics,
  };
}

export function assertLeanRunArtifactsAccepted(
  resultDirectory: string,
  mode: LeanAcceptanceMode,
): LeanRunAcceptanceReport {
  const report = assessLeanRunArtifacts(resultDirectory, mode);
  if (!report.passed) {
    throw new Error(
      `LEAN ${mode} acceptance failed for ${resultDirectory}: ${report.blockers.join('; ')}`,
    );
  }
  return report;
}

function strategyEvidenceBlockers(
  resultDirectory: string,
  config: LeanRunConfig | null,
  insights: InsightsPayload | null,
  targets: LeanPortfolioTargetsPayload | null,
  orderEvents: OrderEventsPayload | null,
  fills: FillsPayload | null,
  metrics: LeanRunAcceptanceReport['metrics'],
): string[] {
  const blockers: string[] = [];
  const parameters = config?.parameters ?? {};
  const runId = basename(resultDirectory);

  if (config?.simulator) {
    blockers.push('Run used the local simulator.');
  }
  if (config?.projectName !== 'aggressive_llm_momentum') {
    blockers.push('Run config projectName is missing or unsupported.');
  }
  if (config?.algorithmVersion !== 'v1') {
    blockers.push('Run config algorithmVersion is missing or unsupported.');
  }
  if (stringParameter(parameters, 'run-id') !== runId) {
    blockers.push('Run id does not match config parameters.');
  }
  if (insights?.runId && insights.runId !== runId) {
    blockers.push('Run id does not match insights artifact.');
  }
  if (targets?.leanRunId !== runId) {
    blockers.push('Run id does not match portfolio targets artifact.');
  }
  if (parameters.hydrated === true) {
    blockers.push('Run artifacts were hydrated from LEAN summary only.');
  }
  if (targets?.riskNotes?.includes(HYDRATION_NOTE)) {
    blockers.push('Portfolio targets are hydration-only placeholders.');
  }

  const validationMode = stringParameter(parameters, 'validation-mode');
  if (validationMode !== STRATEGY_VALIDATION_MODE) {
    if (validationMode === 'flow-validation') {
      blockers.push('Run is flow-validation only, not strategy evidence.');
    } else {
      blockers.push(
        `Run validation mode is "${validationMode || 'missing'}"; ${STRATEGY_VALIDATION_MODE} required for strategy evidence.`,
      );
    }
  }

  const runMode = stringParameter(parameters, 'mode') || config?.mode || '';
  if (runMode === 'simulator' || runMode.startsWith('simulator-')) {
    blockers.push('Run mode is simulator-only, not strategy evidence.');
  }

  if (booleanParameter(parameters, 'uses-static-meta-overlay')) {
    blockers.push('Run used a static meta/LLM overlay.');
  }
  if (booleanParameter(parameters, 'uses-static-ml-predictions')) {
    blockers.push('Run used static ML predictions.');
  }

  if (metrics.insightCount <= 0) {
    blockers.push('No LEAN insights were exported.');
  }
  if (metrics.targetCount <= 0) {
    blockers.push('No portfolio targets were exported.');
  }
  if (metrics.orderEventCount <= 0) {
    blockers.push('No order events were exported.');
  }
  if (metrics.fillCount <= 0) {
    blockers.push('No fills were exported.');
  }
  if (metrics.totalOrders <= 0) {
    blockers.push('LEAN statistics report zero total orders.');
  }
  if (metrics.endEquity <= 0) {
    blockers.push('LEAN statistics do not include a positive ending equity.');
  }
  blockers.push(...targetIntegrityBlockers(insights, targets));
  blockers.push(...fillIntegrityBlockers(orderEvents, fills));

  return blockers;
}

function targetIntegrityBlockers(
  insights: InsightsPayload | null,
  targets: LeanPortfolioTargetsPayload | null,
): string[] {
  const blockers: string[] = [];
  const insightIds = new Set(
    (insights?.insights ?? []).map((insight) => insight.id),
  );
  const targetRows = targets?.targets ?? [];

  for (const target of targetRows) {
    if (!Number.isFinite(target.targetWeight)) {
      blockers.push(`Portfolio target ${target.symbol} has non-finite weight.`);
    }
    const sourceInsightIds = target.sourceInsightIds ?? [];
    if (sourceInsightIds.length === 0) {
      blockers.push(
        `Portfolio target ${target.symbol} has no source insight ids.`,
      );
      continue;
    }
    for (const insightId of sourceInsightIds) {
      if (!insightIds.has(insightId)) {
        blockers.push(
          `Portfolio target ${target.symbol} references unknown insight ${insightId}.`,
        );
      }
    }
  }

  const gross = sumRounded(
    targetRows.map((target) => Math.abs(target.targetWeight)),
  );
  const maxSingle = maxRounded(
    targetRows.map((target) => Math.abs(target.targetWeight)),
  );
  if (targets && Math.abs(gross - targets.grossExposurePct) > 0.0001) {
    blockers.push('Portfolio target gross exposure does not match targets.');
  }
  if (targets && Math.abs(maxSingle - targets.maxSingleNamePct) > 0.0001) {
    blockers.push(
      'Portfolio target max single-name exposure does not match targets.',
    );
  }

  return blockers;
}

function fillIntegrityBlockers(
  orderEvents: OrderEventsPayload | null,
  fills: FillsPayload | null,
): string[] {
  const blockers: string[] = [];
  const filledOrderIds = new Set(
    (orderEvents?.events ?? [])
      .filter((event) => String(event.status).toLowerCase().includes('filled'))
      .map((event) => event.id),
  );

  for (const event of orderEvents?.events ?? []) {
    if (String(event.status).toLowerCase().includes('filled')) {
      if (!Number.isFinite(event.fillQuantity) || event.fillQuantity === 0) {
        blockers.push(
          `Filled order event ${event.id} has invalid fill quantity.`,
        );
      }
      if (!Number.isFinite(event.fillPrice) || event.fillPrice <= 0) {
        blockers.push(`Filled order event ${event.id} has invalid fill price.`);
      }
    }
  }

  for (const fill of fills?.fills ?? []) {
    if (!filledOrderIds.has(fill.orderId)) {
      blockers.push(`Fill ${fill.id} does not match a filled order event.`);
    }
    if (!Number.isFinite(fill.quantity) || fill.quantity === 0) {
      blockers.push(`Fill ${fill.id} has invalid quantity.`);
    }
    if (!Number.isFinite(fill.price) || fill.price <= 0) {
      blockers.push(`Fill ${fill.id} has invalid price.`);
    }
  }

  return blockers;
}

function sumRounded(values: number[]): number {
  return Number(values.reduce((sum, value) => sum + value, 0).toFixed(6));
}

function maxRounded(values: number[]): number {
  return Number(Math.max(0, ...values).toFixed(6));
}

function readJson<T>(
  resultDirectory: string,
  fileName: string,
  blockers: string[],
): T | null {
  const path = join(resultDirectory, fileName);
  if (!existsSync(path)) {
    blockers.push(`Missing ${fileName}.`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch (error) {
    blockers.push(
      `Invalid ${fileName}: ${error instanceof Error ? error.message : 'JSON parse failed'}.`,
    );
    return null;
  }
}

function numericStat(
  statistics: Record<string, string | number> | null,
  key: string,
): number {
  const raw = statistics?.[key];
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : 0;
  }
  if (typeof raw !== 'string') {
    return 0;
  }
  const parsed = Number(raw.replace(/[%$,]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function booleanParameter(
  parameters: Record<string, string | number | boolean>,
  key: string,
): boolean {
  const raw = rawParameter(parameters, key);
  if (typeof raw === 'boolean') {
    return raw;
  }
  if (typeof raw === 'number') {
    return raw !== 0;
  }
  return String(raw).toLowerCase() === 'true';
}

function stringParameter(
  parameters: Record<string, string | number | boolean>,
  key: string,
): string {
  const raw = rawParameter(parameters, key);
  return raw === undefined ? '' : String(raw);
}

function rawParameter(
  parameters: Record<string, string | number | boolean>,
  key: string,
): string | number | boolean | undefined {
  const camelKey = key.replace(/-([a-z])/g, (_, char: string) =>
    char.toUpperCase(),
  );
  return parameters[key] ?? parameters[camelKey];
}
