import { Injectable, Logger } from '@nestjs/common';
import { writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import type { FeatureSnapshotContract } from '../contracts/v1-pilot.contracts';
import { MlModelRegistryService } from './ml-model-registry.service';
import type { MlPrediction } from './ml-model-registry.types';
import { MlPythonRunner } from './ml-python.runner';

@Injectable()
export class MlBaselineInferenceService {
  private readonly logger = new Logger(MlBaselineInferenceService.name);
  private readonly repoRoot = resolve(process.cwd(), '..');

  constructor(
    private readonly registryService: MlModelRegistryService,
    private readonly pythonRunner: MlPythonRunner,
  ) {}

  /**
   * Uses promoted LightGBM artifact when present. Returns empty when ML env/deps are missing
   * so callers can fall back to heuristic only when justified.
   */
  predict(snapshots: FeatureSnapshotContract[]): MlPrediction[] {
    const registry = this.registryService.getPromotedModel();
    if (!registry) {
      return [];
    }
    try {
      const modelPath = join(this.repoRoot, registry.artifactPath);
      const payload: Record<string, unknown> = {
        modelPath,
        registry,
      };
      if (registry.framework === 'jc-stockprediction-lgb') {
        payload.configPath = join(this.repoRoot, registry.configPath ?? '');
        payload.databasePath =
          process.env.DATABASE_PATH ??
          join(this.repoRoot, 'backend/data/investment.db');
        payload.datasetId = 'v1-lean-universe';
        payload.symbols = snapshots.map((snapshot) => snapshot.symbol);
      } else {
        payload.snapshots = snapshots.map((snapshot) => ({
          symbol: snapshot.symbol,
          features: snapshot.features,
        }));
      }
      const response = this.pythonRunner.runJsonScript<{
        predictions: MlPrediction[];
      }>('ml/inference/predict.py', payload);
      const snapshotBySymbol = new Map(
        snapshots.map((snapshot) => [snapshot.symbol, snapshot]),
      );
      const predictions = (response.predictions ?? []).map((prediction) => {
        const snapshot = snapshotBySymbol.get(prediction.symbol);
        return {
          ...prediction,
          asOf: prediction.asOf ?? snapshot?.asOf,
          availableAt: prediction.availableAt ?? snapshot?.availableAt,
          inputHash: prediction.inputHash ?? snapshot?.inputHash,
        };
      });
      this.exportPredictionsForLean(registry.modelName, predictions);
      return predictions;
    } catch (error) {
      this.logger.warn(
        `Structured ML inference unavailable: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return [];
    }
  }

  private exportPredictionsForLean(
    modelName: string,
    predictions: MlPrediction[],
  ): void {
    const workspaceRoot = join(
      this.repoRoot,
      'engines/lean/aggressive_llm_momentum',
    );
    const inputDir = join(workspaceRoot, 'input');
    mkdirSync(inputDir, { recursive: true });
    writeFileSync(
      join(inputDir, 'ml_predictions.json'),
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          modelName,
          predictions,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
  }
}
