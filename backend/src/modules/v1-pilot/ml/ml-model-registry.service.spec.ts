import { mkdtempSync, writeFileSync } from 'fs';
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

    expect(service.verifyArtifactHash(artifactPath, expectedHash, 'test-model')).toBe(true);
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
    expect(service.isLocalOnlyJoblibArtifact('artifacts/model.joblib')).toBe(true);
    expect(service.isLocalOnlyJoblibArtifact('artifacts/model.pkl')).toBe(true);
    expect(service.isLocalOnlyJoblibArtifact('artifacts/model.txt')).toBe(false);
  });
});
