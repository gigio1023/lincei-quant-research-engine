/**
 * Fast-path numeric alpha (no network). Used for backtest replay and de-risking when LLM is unavailable.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlphaDecision } from '../../../entities/alpha-decision.entity';
import { AlphaDecisionContract, FeatureSnapshotContract } from '../contracts/v1-pilot.contracts';
import { validateAlphaDecision } from '../contracts/v1-pilot.validators';
import { hashObject } from '../../../shared/hash.util';

@Injectable()
export class NumericAlphaService {
  constructor(
    @InjectRepository(AlphaDecision)
    private readonly alphaRepository: Repository<AlphaDecision>,
  ) {}

  async buildDecisions(
    snapshots: FeatureSnapshotContract[],
  ): Promise<AlphaDecisionContract[]> {
    const ranked = snapshots
      .map((snapshot) => ({
        snapshot,
        score: this.scoreSnapshot(snapshot),
      }))
      .sort((left, right) => right.score - left.score);

    const decisions: AlphaDecisionContract[] = [];
    ranked.forEach((entry, index) => {
      const direction =
        entry.score >= 0.65 ? 'up' : entry.score <= 0.35 ? 'flat' : 'flat';
      const confidence = Math.min(
        1,
        Math.max(0.2, Math.abs(entry.score - 0.5) * 2),
      );
      const decision: AlphaDecisionContract = {
        id: `numeric-${entry.snapshot.symbol}-${entry.snapshot.asOf.slice(0, 10)}`,
        source: 'numeric',
        symbol: entry.snapshot.symbol,
        asOf: entry.snapshot.asOf,
        horizonDays: 21,
        direction,
        expectedReturnBps: Number(((entry.score - 0.5) * 400).toFixed(2)),
        confidence,
        conviction: confidence > 0.7 ? 'high' : confidence > 0.5 ? 'medium' : 'low',
        maxPositionPct: direction === 'up' ? 0.35 : 0,
        featureSnapshotHash: entry.snapshot.inputHash,
        sourceModels: ['LinceiNumericAlphaModel'],
        evidenceRefs: entry.snapshot.sourceRefs,
        thesis:
          direction === 'up'
            ? `Numeric momentum score ${entry.score.toFixed(3)} supports long exposure.`
            : undefined,
        counterThesis:
          direction === 'up'
            ? 'Trend reversal or liquidity shock could invalidate the signal.'
            : undefined,
        abstainReason: direction === 'flat' ? 'Numeric score in neutral band.' : undefined,
        inputHash: entry.snapshot.inputHash,
        outputHash: hashObject({ symbol: entry.snapshot.symbol, score: entry.score, index }),
      };
      if (direction !== 'flat') {
        validateAlphaDecision(decision);
      }
      decisions.push(decision);
      void this.alphaRepository.save(this.alphaRepository.create(decision));
    });

    return decisions;
  }

  private scoreSnapshot(snapshot: FeatureSnapshotContract): number {
    const features = snapshot.features;
    const return63 = Number(features.return_63d ?? 0);
    const return126 = Number(features.return_126d ?? 0);
    const vol = Number(features.realized_vol_20d ?? 0.2);
    const drawdown = Number(features.drawdown_63d ?? 0);
    const trend = Number(features.price_vs_sma_200d ?? 1) > 1 ? 0.08 : -0.04;
    const liquidity =
      Number(features.dollar_volume_20d ?? 0) < 500_000 ? -0.08 : 0.04;
    const raw =
      return63 * 0.35 +
      return126 * 0.25 +
      trend +
      liquidity -
      vol * 0.2 +
      drawdown * 0.15;
    return Math.min(1, Math.max(0, 0.5 + raw));
  }
}
