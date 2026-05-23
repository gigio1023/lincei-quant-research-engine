import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import {
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
  simulator?: string;
  parameters?: Record<string, string | number | boolean>;
};

type InsightsPayload = {
  insights?: LeanInsightArtifact[];
};

type OrderEventsPayload = {
  events?: LeanOrderEventArtifact[];
};

type FillsPayload = {
  fills?: unknown[];
};

const HYDRATION_NOTE = 'hydrated_from_lean_summary_only';

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
    blockers.push(...strategyEvidenceBlockers(config, targets, metrics));
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
  config: LeanRunConfig | null,
  targets: LeanPortfolioTargetsPayload | null,
  metrics: LeanRunAcceptanceReport['metrics'],
): string[] {
  const blockers: string[] = [];
  const parameters = config?.parameters ?? {};

  if (config?.simulator) {
    blockers.push('Run used the local simulator.');
  }
  if (parameters.hydrated === true) {
    blockers.push('Run artifacts were hydrated from LEAN summary only.');
  }
  if (targets?.riskNotes?.includes(HYDRATION_NOTE)) {
    blockers.push('Portfolio targets are hydration-only placeholders.');
  }

  const validationMode = String(
    parameters['validation-mode'] ?? parameters.validationMode ?? '',
  );
  if (validationMode === 'flow-validation') {
    blockers.push('Run is flow-validation only, not strategy evidence.');
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

  return blockers;
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
  const camelKey = key.replace(/-([a-z])/g, (_, char: string) =>
    char.toUpperCase(),
  );
  const raw = parameters[key] ?? parameters[camelKey];
  if (typeof raw === 'boolean') {
    return raw;
  }
  if (typeof raw === 'number') {
    return raw !== 0;
  }
  return String(raw).toLowerCase() === 'true';
}
