/**
 * Produces LEAN-shaped artifacts when Lean CLI is unavailable. Proves ingest/paper wiring only;
 * must not be treated as strategy validation equivalent to a real Lean backtest.
 */
import { createHash, randomUUID } from 'crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { Injectable } from '@nestjs/common';
import {
  LeanFillArtifact,
  LeanInsightArtifact,
  LeanLocalSimulatorRequest,
  LeanOrderEventArtifact,
  LeanPortfolioTargetArtifact,
  LeanPortfolioTargetsPayload,
  LeanRunResult,
} from './lean-run.types';

const DEFAULT_UNIVERSE = ['SPY', 'QQQ', 'IWM', 'TLT', 'GLD'] as const;
const DEFAULT_PROJECT = 'aggressive_llm_momentum';
const ALGORITHM_VERSION = 'v1';

type MetaDecisionRecord = {
  symbol: string;
  direction?: string;
  confidence?: number;
  llmScores?: {
    event?: number;
    macro?: number;
    riskAdjustment?: number;
  };
  id?: string;
};

@Injectable()
export class LeanLocalSimulatorService {
  /**
   * Generates deterministic LEAN artifacts when Lean CLI is unavailable.
   */
  simulateRun(request: LeanLocalSimulatorRequest = {}): LeanRunResult {
    const startedAt = new Date();
    const runId = request.runId ?? this.buildRunId(startedAt);
    const projectName = request.projectName ?? DEFAULT_PROJECT;
    const workspaceRoot = resolve(
      request.workspaceRoot ?? join(process.cwd(), '..', 'engines/lean', projectName),
    );
    const resultRoot = resolve(
      request.resultRoot ?? join(process.cwd(), '..', 'artifacts/lean-runs'),
    );
    const resultDirectory = join(resultRoot, runId);
    mkdirSync(resultDirectory, { recursive: true });

    const parameters = this.resolveParameters(request.parameters);
    const metaDecisions = this.loadMetaDecisions(
      request.metaDecisionsPath ??
        join(workspaceRoot, 'input/meta_decisions.json.example'),
    );
    const insights = this.buildInsights(metaDecisions);
    const targets = this.buildPortfolioTargets(insights, parameters);
    const { orderEvents, fills } = this.buildOrdersAndFills(targets, startedAt);
    const statistics = this.buildStatistics(targets, orderEvents.length);
    const configPayload = {
      projectName,
      algorithmVersion: ALGORITHM_VERSION,
      parameters,
      simulator: 'lean-local-simulator-v1',
      exportedAt: startedAt.toISOString(),
    };

    const insightsRef = join(resultDirectory, 'insights.json');
    const portfolioTargetsRef = join(resultDirectory, 'portfolio_targets.json');
    const orderEventsRef = join(resultDirectory, 'order_events.json');
    const fillsRef = join(resultDirectory, 'fills.json');
    const logsRef = join(resultDirectory, 'logs.txt');
    const configRef = join(resultDirectory, 'config.json');
    const statisticsRef = join(resultDirectory, 'statistics.json');

    this.writeJson(insightsRef, {
      runId,
      asOf: startedAt.toISOString(),
      insights,
    });
    this.writeJson(portfolioTargetsRef, this.buildTargetsPayload(runId, startedAt, targets));
    this.writeJson(orderEventsRef, { events: orderEvents });
    this.writeJson(fillsRef, { fills });
    this.writeJson(statisticsRef, statistics);
    this.writeJson(configRef, configPayload);
    writeFileSync(
      logsRef,
      [
        `[${startedAt.toISOString()}] lean-local-simulator started`,
        `[${startedAt.toISOString()}] universe=${DEFAULT_UNIVERSE.join(',')}`,
        `[${startedAt.toISOString()}] generated ${insights.length} insights`,
        `[${startedAt.toISOString()}] generated ${targets.length} portfolio targets`,
        `[${startedAt.toISOString()}] lean-local-simulator completed`,
      ].join('\n'),
      'utf8',
    );

    const completedAt = new Date();
    const sourceHash = this.hashDirectory(workspaceRoot, ['main.py', 'config.json']);
    const configHash = this.hashObject(configPayload);
    const dataManifestHash = this.hashObject({
      universe: DEFAULT_UNIVERSE,
      metaDecisionCount: metaDecisions.length,
      simulator: ALGORITHM_VERSION,
    });

    return {
      runId,
      projectName,
      algorithmVersion: ALGORITHM_VERSION,
      parameters,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      status: 'passed',
      resultDirectory,
      sourceHash,
      configHash,
      dataManifestHash,
      statistics,
      insightsRef,
      portfolioTargetsRef,
      orderEventsRef,
      fillsRef,
      logsRef,
      blockerReasons: [],
    };
  }

  private resolveParameters(
    overrides: LeanLocalSimulatorRequest['parameters'] = {},
  ): Record<string, string | number | boolean> {
    return {
      'max-single-name-pct': 0.35,
      'top-k': 2,
      'live-pilot-max-notional-usd': 10,
      'meta-decisions-path': 'input/meta_decisions.json',
      'vol-target-annual': 0.15,
      'max-drawdown-pct': 0.12,
      'max-gross-exposure-pct': 1.0,
      'stale-data-hours': 48,
      ...overrides,
    };
  }

  private loadMetaDecisions(path: string): MetaDecisionRecord[] {
    if (!existsSync(path)) {
      return DEFAULT_UNIVERSE.map((symbol, index) => ({
        symbol,
        direction: index < 2 ? 'up' : 'flat',
        confidence: index < 2 ? 0.7 : 0.45,
        llmScores: {
          event: index < 2 ? 0.68 : 0.5,
          macro: 0.6,
          riskAdjustment: 0.52,
        },
        id: `sim-${symbol.toLowerCase()}`,
      }));
    }

    const payload = JSON.parse(readFileSync(path, 'utf8')) as {
      decisions?: MetaDecisionRecord[];
    };
    return payload.decisions ?? [];
  }

  private buildInsights(metaDecisions: MetaDecisionRecord[]): LeanInsightArtifact[] {
    const generatedTime = new Date().toISOString();
    const insights: LeanInsightArtifact[] = [];

    metaDecisions.forEach((decision) => {
      const numericScore = decision.direction === 'up' ? 0.72 : 0.42;
      const llmScores = decision.llmScores ?? {};
      const finalScore = Math.min(
        1,
        Math.max(
          0,
          numericScore * 0.5 +
            (llmScores.event ?? 0.5) * 0.25 +
            (llmScores.macro ?? 0.5) * 0.15 +
            (llmScores.riskAdjustment ?? 0.5) * 0.1,
        ),
      );
      const direction = finalScore >= 0.65 ? 'up' : 'flat';
      if (direction === 'flat') {
        return;
      }

      insights.push({
        id: `insight-${decision.symbol}-${generatedTime.slice(0, 10)}`,
        symbol: decision.symbol,
        direction,
        periodDays: 21,
        confidence: decision.confidence ?? 0.65,
        magnitude: Number((finalScore - 0.5).toFixed(6)),
        sourceModel: 'LinceiMetaAlphaModel',
        generatedTime,
        finalScore: Number(finalScore.toFixed(6)),
        conflictNotes: [],
        metaDecisionId: decision.id ?? null,
      });
    });

    return insights;
  }

  private buildPortfolioTargets(
    insights: LeanInsightArtifact[],
    parameters: Record<string, string | number | boolean>,
  ): LeanPortfolioTargetArtifact[] {
    const topK = Number(parameters['top-k'] ?? 2);
    const maxSingleNamePct = Number(parameters['max-single-name-pct'] ?? 0.35);
    const ranked = [...insights]
      .sort((left, right) => right.finalScore! - left.finalScore!)
      .slice(0, topK);
    if (ranked.length === 0) {
      return [];
    }

    const rawWeights = ranked.map((insight) => (insight.finalScore ?? 0.5) + 0.25);
    const total = rawWeights.reduce((sum, weight) => sum + weight, 0);
    return ranked.map((insight, index) => ({
      symbol: insight.symbol,
      targetWeight: Number(
        Math.min(maxSingleNamePct, rawWeights[index] / total).toFixed(6),
      ),
      sourceInsightIds: [insight.id],
      riskAdjusted: false,
      riskNotes: [],
    }));
  }

  private buildTargetsPayload(
    runId: string,
    asOf: Date,
    targets: LeanPortfolioTargetArtifact[],
  ): LeanPortfolioTargetsPayload {
    const grossExposurePct = targets.reduce(
      (sum, target) => sum + Math.abs(target.targetWeight),
      0,
    );
    const maxSingleNamePct = targets.reduce(
      (max, target) => Math.max(max, Math.abs(target.targetWeight)),
      0,
    );
    const payload: LeanPortfolioTargetsPayload = {
      id: `targets-${runId}`,
      leanRunId: runId,
      asOf: asOf.toISOString(),
      targets,
      grossExposurePct: Number(grossExposurePct.toFixed(6)),
      maxSingleNamePct: Number(maxSingleNamePct.toFixed(6)),
      riskNotes: [],
    };
    payload.targetHash = this.hashObject(payload);
    return payload;
  }

  private buildOrdersAndFills(
    targets: LeanPortfolioTargetArtifact[],
    asOf: Date,
  ): { orderEvents: LeanOrderEventArtifact[]; fills: LeanFillArtifact[] } {
    const orderEvents: LeanOrderEventArtifact[] = [];
    const fills: LeanFillArtifact[] = [];
    const baseTime = asOf.toISOString();

    targets.forEach((target, index) => {
      const orderId = `sim-order-${index + 1}`;
      const quantity = Number((target.targetWeight * 100).toFixed(4));
      const price = 100 + index * 5;
      orderEvents.push({
        id: orderId,
        symbol: target.symbol,
        status: 'Filled',
        direction: 'Buy',
        fillQuantity: quantity,
        fillPrice: price,
        orderFee: 0.01,
        utcTime: baseTime,
      });
      fills.push({
        id: `fill-${orderId}`,
        orderId,
        symbol: target.symbol,
        quantity,
        price,
        fee: 0.01,
        filledAt: baseTime,
      });
    });

    return { orderEvents, fills };
  }

  private buildStatistics(
    targets: LeanPortfolioTargetArtifact[],
    orderCount: number,
  ): Record<string, string | number> {
    const grossExposurePct = targets.reduce(
      (sum, target) => sum + Math.abs(target.targetWeight),
      0,
    );
    return {
      'Total Orders': orderCount,
      'Net Profit': Number((grossExposurePct * 1200).toFixed(2)),
      'End Equity': 101200,
      'Compounding Annual Return': 0.012,
      'Sharpe Ratio': 1.05,
      'Maximum Drawdown': -0.04,
      Simulator: 'lean-local-simulator-v1',
    };
  }

  private buildRunId(startedAt: Date): string {
    const stamp = startedAt.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
    return `sim-${stamp}-${randomUUID().slice(0, 8)}`;
  }

  private writeJson(path: string, payload: unknown): void {
    writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }

  private hashObject(payload: unknown): string {
    return `sha256:${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;
  }

  private hashDirectory(root: string, relativePaths: string[]): string {
    const hash = createHash('sha256');
    relativePaths.forEach((relativePath) => {
      const absolutePath = join(root, relativePath);
      if (!existsSync(absolutePath)) {
        return;
      }
      hash.update(relativePath);
      hash.update(readFileSync(absolutePath));
    });
    return `sha256:${hash.digest('hex')}`;
  }
}
