/**
 * Structured (non-LLM) alpha: promoted LightGBM regressor by default, heuristic fallback only when ML is unavailable.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlphaDecision } from '../../../entities/alpha-decision.entity';
import { AlphaDecisionContract, FeatureSnapshotContract } from '../contracts/v1-pilot.contracts';
import { validateAlphaDecision } from '../contracts/v1-pilot.validators';
import { hashObject } from '../../../shared/hash.util';
import { MlBaselineInferenceService } from '../ml/ml-baseline-inference.service';
import { MlPrediction } from '../ml/ml-model-registry.types';
import { scoreSnapshotHeuristic } from './heuristic-numeric.scorer';

const UP_THRESHOLD = 0.65;
const FLAT_THRESHOLD = 0.35;

@Injectable()
export class NumericAlphaService {
  private readonly logger = new Logger(NumericAlphaService.name);

  constructor(
    @InjectRepository(AlphaDecision)
    private readonly alphaRepository: Repository<AlphaDecision>,
    private readonly mlInference: MlBaselineInferenceService,
  ) {}

  async buildDecisions(
    snapshots: FeatureSnapshotContract[],
  ): Promise<AlphaDecisionContract[]> {
    const mlPredictions = this.mlInference.predict(snapshots);
    if (mlPredictions.length > 0) {
      return this.buildFromMl(snapshots, mlPredictions);
    }
    this.logger.warn(
      'No promoted LightGBM model or inference failed; using heuristic fallback (degraded mode).',
    );
    return this.buildFromHeuristic(snapshots);
  }

  private async buildFromMl(
    snapshots: FeatureSnapshotContract[],
    predictions: MlPrediction[],
  ): Promise<AlphaDecisionContract[]> {
    const predictionBySymbol = new Map(predictions.map((item) => [item.symbol, item]));
    const decisions: AlphaDecisionContract[] = [];

    snapshots.forEach((snapshot) => {
      const prediction = predictionBySymbol.get(snapshot.symbol);
      if (!prediction) {
        return;
      }
      const score = prediction.score;
      const direction = score >= UP_THRESHOLD ? 'up' : score <= FLAT_THRESHOLD ? 'flat' : 'flat';
      const confidence = Math.min(1, Math.max(0.2, Math.abs(score - 0.5) * 2));
      const decision = this.buildDecision({
        snapshot,
        score,
        direction,
        confidence,
        sourceModels: ['tabular-forward-return-21d-v1'],
        thesis:
          direction === 'up'
            ? `LightGBM 21d forward-return score ${score.toFixed(3)} (raw ${prediction.rawScore.toFixed(4)}).`
            : undefined,
        outputExtra: { rawScore: prediction.rawScore, expectedReturnBps: prediction.expectedReturnBps },
      });
      if (direction !== 'flat') {
        validateAlphaDecision(decision);
      }
      decisions.push(decision);
      void this.alphaRepository.save(this.alphaRepository.create(decision));
    });

    return decisions.sort((left, right) => right.confidence - left.confidence);
  }

  private async buildFromHeuristic(
    snapshots: FeatureSnapshotContract[],
  ): Promise<AlphaDecisionContract[]> {
    const ranked = snapshots
      .map((snapshot) => ({
        snapshot,
        score: scoreSnapshotHeuristic(snapshot),
      }))
      .sort((left, right) => right.score - left.score);

    const decisions: AlphaDecisionContract[] = [];
    ranked.forEach((entry) => {
      const direction =
        entry.score >= UP_THRESHOLD ? 'up' : entry.score <= FLAT_THRESHOLD ? 'flat' : 'flat';
      const confidence = Math.min(1, Math.max(0.2, Math.abs(entry.score - 0.5) * 2));
      const decision = this.buildDecision({
        snapshot: entry.snapshot,
        score: entry.score,
        direction,
        confidence,
        sourceModels: ['heuristic-fallback-v1'],
        thesis:
          direction === 'up'
            ? `Heuristic momentum score ${entry.score.toFixed(3)} (ML unavailable).`
            : undefined,
        outputExtra: { degraded: true },
      });
      if (direction !== 'flat') {
        validateAlphaDecision(decision);
      }
      decisions.push(decision);
      void this.alphaRepository.save(this.alphaRepository.create(decision));
    });
    return decisions;
  }

  private buildDecision(input: {
    snapshot: FeatureSnapshotContract;
    score: number;
    direction: AlphaDecisionContract['direction'];
    confidence: number;
    sourceModels: string[];
    thesis?: string;
    outputExtra: Record<string, unknown>;
  }): AlphaDecisionContract {
    return {
      id: `numeric-${input.snapshot.symbol}-${input.snapshot.asOf.slice(0, 10)}`,
      source: 'numeric',
      symbol: input.snapshot.symbol,
      asOf: input.snapshot.asOf,
      horizonDays: 21,
      direction: input.direction,
      expectedReturnBps: Number(((input.score - 0.5) * 400).toFixed(2)),
      confidence: input.confidence,
      conviction: input.confidence > 0.7 ? 'high' : input.confidence > 0.5 ? 'medium' : 'low',
      maxPositionPct: input.direction === 'up' ? 0.35 : 0,
      featureSnapshotHash: input.snapshot.inputHash,
      sourceModels: input.sourceModels,
      evidenceRefs: [...input.snapshot.sourceRefs, 'ml/registry/model_registry.json'],
      thesis: input.thesis,
      counterThesis:
        input.direction === 'up'
          ? 'Model or regime shift can invalidate the forward-return estimate.'
          : undefined,
      abstainReason: input.direction === 'flat' ? 'Score in neutral band.' : undefined,
      inputHash: input.snapshot.inputHash,
      outputHash: hashObject({
        symbol: input.snapshot.symbol,
        score: input.score,
        sourceModels: input.sourceModels,
        ...input.outputExtra,
      }),
    };
  }
}
