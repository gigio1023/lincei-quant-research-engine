export type MlModelRegistryStatus = 'promoted' | 'not_promoted';
export type MlModelReadinessStatus =
  | 'missing_registry'
  | 'not_promoted'
  | 'promoted_ready'
  | 'promoted_missing_artifact'
  | 'promoted_missing_config'
  | 'promoted_local_only_artifact'
  | 'promoted_hash_mismatch';

export type MlModelRegistryRecord = {
  modelName: string;
  modelType: 'lightgbm' | 'sklearn-hgb' | 'ridge' | 'stub';
  framework: string;
  status: MlModelRegistryStatus;
  featureVersion: string;
  featureColumns: string[];
  target: string;
  horizonDays: number;
  artifactPath: string;
  configPath?: string;
  modelHash: string;
  dataSource: string;
  hfRepo?: string;
  hfSha?: string;
  hfLastModified?: string;
  artifactSha256?: string;
  configSha256?: string;
  trainingCutoff?: string;
  source?: 'external-download' | 'local-train';
  license?: string;
  securityManifest?: string;
  trainedAt: string;
  validation: {
    mse: number;
    directionalAccuracy: number;
    walkForwardFolds: number;
  };
  promotionThreshold: {
    directionalAccuracy: number;
  };
  notes: string;
};

export type MlPrediction = {
  symbol: string;
  rawScore: number;
  score: number;
  expectedReturnBps: number;
};

export type MlModelReadiness = {
  status: MlModelReadinessStatus;
  modelName?: string;
  registryStatus?: MlModelRegistryStatus;
  blocker?: string;
};
