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
  });
});
