export type MlModelRegistryStatus = 'promoted' | 'not_promoted';

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
  modelHash: string;
  dataSource: string;
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
