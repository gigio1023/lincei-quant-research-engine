import { Injectable, Logger } from '@nestjs/common';
import { writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { FeatureSnapshotContract } from '../contracts/v1-pilot.contracts';
import { MlModelRegistryService } from './ml-model-registry.service';
import { MlPrediction } from './ml-model-registry.types';
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
      const response = this.pythonRunner.runJsonScript<{ predictions: MlPrediction[] }>(
        'ml/inference/predict.py',
        {
          modelPath,
          registry,
          snapshots: snapshots.map((snapshot) => ({
            symbol: snapshot.symbol,
            features: snapshot.features,
          })),
        },
      );
      const predictions = response.predictions ?? [];
      this.exportPredictionsForLean(predictions);
      return predictions;
    } catch (error) {
      this.logger.warn(
        `LightGBM inference unavailable: ${error instanceof Error ? error.message : 'unknown'}`,
      );
      return [];
    }
  }

  private exportPredictionsForLean(predictions: MlPrediction[]): void {
    const workspaceRoot = join(this.repoRoot, 'engines/lean/aggressive_llm_momentum');
    const inputDir = join(workspaceRoot, 'input');
    mkdirSync(inputDir, { recursive: true });
    writeFileSync(
      join(inputDir, 'ml_predictions.json'),
      `${JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          modelName: 'tabular-forward-return-21d-v1',
          predictions,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
  }
}
