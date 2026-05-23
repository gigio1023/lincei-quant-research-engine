import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { MlModelRegistryService } from './ml-model-registry.service';

describe('MlModelRegistryService', () => {
  it('returns_promoted_model_when_registry_and_artifact_exist', () => {
    const service = new MlModelRegistryService();
    const promoted = service.getPromotedModel();
    if (!promoted) {
      expect(promoted).toBeNull();
      return;
    }
    expect(promoted.status).toBe('promoted');
    expect(promoted.featureColumns.length).toBeGreaterThan(0);
    expect(promoted.modelHash).toMatch(/^sha256:/);
  });

  it('verifyArtifactHash_accepts_matching_sha256', () => {
    const service = new MlModelRegistryService();
    const tempDir = mkdtempSync(join(tmpdir(), 'ml-registry-'));
    const artifactPath = join(tempDir, 'model.txt');
    writeFileSync(artifactPath, 'test-booster-content');
    const expectedHash = service.hashArtifactFile(artifactPath);

    expect(
      service.verifyArtifactHash(artifactPath, expectedHash, 'test-model'),
    ).toBe(true);
  });

  it('verifyArtifactHash_rejects_mismatch', () => {
    const service = new MlModelRegistryService();
    const tempDir = mkdtempSync(join(tmpdir(), 'ml-registry-'));
    const artifactPath = join(tempDir, 'model.txt');
    writeFileSync(artifactPath, 'test-booster-content');

    expect(
      service.verifyArtifactHash(artifactPath, 'sha256:deadbeef', 'test-model'),
    ).toBe(false);
  });

  it('isLocalOnlyJoblibArtifact_detects_joblib_and_pickle', () => {
    const service = new MlModelRegistryService();
    expect(service.isLocalOnlyJoblibArtifact('artifacts/model.joblib')).toBe(
      true,
    );
    expect(service.isLocalOnlyJoblibArtifact('artifacts/model.pkl')).toBe(true);
    expect(service.isLocalOnlyJoblibArtifact('artifacts/model.txt')).toBe(
      false,
    );
  });

  it('reports_promoted_missing_artifact_distinctly', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'ml-readiness-'));
    const backendDir = join(tempRoot, 'backend');
    mkdirSync(join(tempRoot, 'ml/registry'), { recursive: true });
    mkdirSync(backendDir, { recursive: true });
    writeFileSync(
      join(tempRoot, 'ml/registry/model_registry.json'),
      `${JSON.stringify({
        modelName: 'missing-live-model',
        modelType: 'lightgbm',
        framework: 'test',
        status: 'promoted',
        featureVersion: 'test-v1',
        featureColumns: ['x'],
        target: 'next_return',
        horizonDays: 1,
        artifactPath: 'artifacts/missing/model.txt',
        modelHash: 'sha256:deadbeef',
        dataSource: 'test',
        trainedAt: '2026-05-24T00:00:00.000Z',
        validation: { mse: 0, directionalAccuracy: 0, walkForwardFolds: 0 },
        promotionThreshold: { directionalAccuracy: 0 },
        notes: 'test',
      })}\n`,
      'utf8',
    );

    const previousCwd = process.cwd();
    try {
      process.chdir(backendDir);
      const service = new MlModelRegistryService();
      expect(service.getModelReadiness()).toMatchObject({
        status: 'promoted_missing_artifact',
        modelName: 'missing-live-model',
      });
      expect(service.getPromotedModel()).toBeNull();
    } finally {
      process.chdir(previousCwd);
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
