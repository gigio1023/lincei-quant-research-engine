import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlphaDecision } from '../../../entities/alpha-decision.entity';
import { LeanRun } from '../../../entities/lean-run.entity';
import { PortfolioTargetSnapshot } from '../../../entities/portfolio-target-snapshot.entity';
import { hashObject } from '../../../shared/hash.util';
import type { AlphaSource } from '../contracts/v1-pilot.contracts';

const CURRENT_TARGET_MAX_COUNT = 2;
const CURRENT_TARGET_MAX_SINGLE_WEIGHT = 0.1;
const CURRENT_TARGET_MAX_GROSS_WEIGHT = 0.25;
const CURRENT_TARGET_MIN_WEIGHT = 0.005;
const CONFIDENCE_WEIGHT_SCALE = 0.25;

type OrderableAlphaDecision = AlphaDecision & {
  availableAt: string;
  expectedReturnBps: number;
  maxPositionPct: number;
};

@Injectable()
export class CurrentAlphaTargetService {
  constructor(
    @InjectRepository(AlphaDecision)
    private readonly alphaRepository: Repository<AlphaDecision>,
    @InjectRepository(PortfolioTargetSnapshot)
    private readonly targetRepository: Repository<PortfolioTargetSnapshot>,
  ) {}

  async ensureCurrentTargetSnapshot(
    leanRun: LeanRun,
  ): Promise<PortfolioTargetSnapshot> {
    const alphaSource = this.alphaSourceForRun(leanRun);
    const decisions = await this.latestDecisionsForSource(alphaSource);
    const selected = this.orderableDecisions(decisions).slice(
      0,
      CURRENT_TARGET_MAX_COUNT,
    );

    if (selected.length === 0) {
      throw new Error(
        `No orderable current ${alphaSource} alpha decisions are available for paper trading.`,
      );
    }

    const marketDataTimestamp = this.latestTimestamp(
      selected.map((decision) => decision.availableAt),
    );
    const generatedAt = new Date().toISOString();
    const rawTargets = selected.map((decision) => ({
      symbol: decision.symbol,
      targetWeight: this.targetWeight(decision),
      sourceInsightIds: [decision.id],
      riskAdjusted: true,
      riskNotes: [
        'current_alpha_target',
        `alpha-source:${alphaSource}`,
        `alpha-decision:${decision.id}`,
        `alpha-as-of:${decision.asOf}`,
        `alpha-available-at:${decision.availableAt}`,
        `market-data-timestamp:${marketDataTimestamp}`,
        `linked-lean-run:${leanRun.runId}`,
        'long-only',
        'broker-write-disabled',
      ],
    }));
    const targets = this.scaleGrossExposure(rawTargets).filter(
      (target) => Math.abs(target.targetWeight) >= CURRENT_TARGET_MIN_WEIGHT,
    );
    if (targets.length === 0) {
      throw new Error(
        `Current ${alphaSource} alpha decisions produced only sub-threshold target weights.`,
      );
    }

    const targetHash = hashObject({
      leanRunId: leanRun.runId,
      alphaSource,
      marketDataTimestamp,
      targets: targets.map((target) => ({
        symbol: target.symbol,
        targetWeight: target.targetWeight,
        sourceInsightIds: target.sourceInsightIds,
      })),
    });
    const id = `current-alpha-target-${leanRun.runId}-${alphaSource}-${this.shortHash(targetHash)}`;
    const record = this.targetRepository.create({
      id,
      leanRunId: leanRun.runId,
      asOf: generatedAt,
      targets,
      ...this.targetExposure(targets),
      targetHash,
    });
    await this.targetRepository.upsert(record, ['id']);
    return record;
  }

  isCurrentAlphaTarget(snapshot: PortfolioTargetSnapshot | undefined): boolean {
    return Boolean(
      snapshot?.id.startsWith('current-alpha-target-') ||
        snapshot?.targets.some((target) =>
          target.riskNotes?.includes('current_alpha_target'),
        ),
    );
  }

  currentTargetMarketDataTimestamp(
    snapshot: PortfolioTargetSnapshot,
  ): string | undefined {
    for (const target of snapshot.targets) {
      const note = target.riskNotes?.find((entry) =>
        entry.startsWith('market-data-timestamp:'),
      );
      if (note) {
        return note.slice('market-data-timestamp:'.length);
      }
    }
    return undefined;
  }

  private async latestDecisionsForSource(
    source: AlphaSource,
  ): Promise<AlphaDecision[]> {
    const candidates = await this.alphaRepository.find({
      where: { source },
      order: { asOf: 'DESC', updatedAt: 'DESC' },
      take: 100,
    });
    const latestAsOf = candidates[0]?.asOf;
    return latestAsOf
      ? candidates.filter((decision) => decision.asOf === latestAsOf)
      : [];
  }

  private orderableDecisions(
    decisions: AlphaDecision[],
  ): OrderableAlphaDecision[] {
    return decisions
      .filter((decision): decision is OrderableAlphaDecision => {
        return (
          decision.direction === 'up' &&
          Boolean(decision.availableAt) &&
          Number.isFinite(decision.confidence) &&
          decision.confidence > 0 &&
          Number.isFinite(decision.expectedReturnBps) &&
          Number(decision.expectedReturnBps) > 0 &&
          Number.isFinite(decision.maxPositionPct) &&
          Number(decision.maxPositionPct) > 0
        );
      })
      .sort((left, right) => this.alphaScore(right) - this.alphaScore(left));
  }

  private alphaScore(decision: OrderableAlphaDecision): number {
    return decision.expectedReturnBps * decision.confidence;
  }

  private targetWeight(decision: OrderableAlphaDecision): number {
    return Number(
      Math.min(
        decision.maxPositionPct,
        CURRENT_TARGET_MAX_SINGLE_WEIGHT,
        decision.confidence * CONFIDENCE_WEIGHT_SCALE,
      ).toFixed(6),
    );
  }

  private scaleGrossExposure<T extends { targetWeight: number }>(targets: T[]) {
    const gross = targets.reduce(
      (sum, target) => sum + Math.abs(target.targetWeight),
      0,
    );
    if (gross <= CURRENT_TARGET_MAX_GROSS_WEIGHT) {
      return targets;
    }
    const scale = CURRENT_TARGET_MAX_GROSS_WEIGHT / gross;
    return targets.map((target) => ({
      ...target,
      targetWeight: Number((target.targetWeight * scale).toFixed(6)),
    }));
  }

  private targetExposure(targets: { targetWeight: number }[]): {
    grossExposurePct: number;
    maxSingleNamePct: number;
  } {
    const weights = targets.map((target) => Math.abs(target.targetWeight));
    return {
      grossExposurePct: Number(
        weights.reduce((sum, weight) => sum + weight, 0).toFixed(6),
      ),
      maxSingleNamePct: Number(Math.max(0, ...weights).toFixed(6)),
    };
  }

  private latestTimestamp(timestamps: string[]): string {
    const latest = timestamps
      .map((timestamp) => new Date(timestamp))
      .filter((date) => Number.isFinite(date.getTime()))
      .sort((left, right) => right.getTime() - left.getTime())[0];
    if (!latest) {
      throw new Error(
        'Current alpha target generation requires at least one valid alpha availability timestamp.',
      );
    }
    return latest.toISOString();
  }

  private alphaSourceForRun(leanRun: LeanRun): AlphaSource {
    const alphaMode = String(leanRun.parameters['alpha-mode'] ?? '');
    if (alphaMode === 'numeric-only') {
      return 'numeric';
    }
    if (alphaMode === 'llm-only' || alphaMode === 'semantic-llm') {
      return 'llm';
    }
    return 'meta';
  }

  private shortHash(hash: string): string {
    return hash.replace(/^sha256:/, '').slice(0, 12);
  }
}
