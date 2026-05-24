import { BadRequestException } from '@nestjs/common';
import {
  validateAlphaDecision,
  validateExecutionIntent,
  validateFeatureSnapshot,
  validateLlmEventFeature,
} from './v1-pilot.validators';
import {
  AlphaDecisionContract,
  ExecutionIntentContract,
  FeatureSnapshotContract,
} from './v1-pilot.contracts';

describe('v1-pilot.validators', () => {
  const freshSnapshot = (): FeatureSnapshotContract => ({
    id: 'feature-spy',
    symbol: 'SPY',
    asOf: new Date().toISOString(),
    dataAvailabilityTime: new Date().toISOString(),
    timeframe: 'daily',
    features: {
      return_20d: 0.01,
      return_63d: 0.02,
      return_126d: 0.03,
      realized_vol_20d: 0.15,
      drawdown_63d: -0.02,
      price_vs_sma_200d: 1.01,
      dollar_volume_20d: 1_000_000,
      market_regime_score: 0.55,
    },
    sourceRefs: ['bar:1'],
    inputHash: 'sha256:test',
    featureVersion: 'v1',
  });

  it('rejects_stale_feature_snapshot', () => {
    const stale = freshSnapshot();
    stale.dataAvailabilityTime = new Date(
      Date.now() - 96 * 60 * 60 * 1000,
    ).toISOString();
    expect(() => validateFeatureSnapshot(stale)).toThrow(BadRequestException);
  });

  it('requires_thesis_for_non_flat_alpha', () => {
    const decision: AlphaDecisionContract = {
      id: 'alpha-1',
      source: 'numeric',
      symbol: 'SPY',
      asOf: new Date().toISOString(),
      horizonDays: 21,
      direction: 'up',
      confidence: 0.8,
      conviction: 'high',
      featureSnapshotHash: 'sha256:test',
      sourceModels: ['numeric'],
      evidenceRefs: [],
      inputHash: 'sha256:in',
      outputHash: 'sha256:out',
    };
    expect(() => validateAlphaDecision(decision)).toThrow(BadRequestException);
  });

  it('enforces_live_notional_cap', () => {
    const intent: ExecutionIntentContract = {
      id: 'intent-1',
      mode: 'live',
      source: 'lean-target',
      symbol: 'SPY',
      side: 'buy',
      orderType: 'limit',
      notionalUsd: 20,
      timeInForce: 'day',
      maxSlippageBps: 20,
      idempotencyKey: 'live-1',
      approvalRef: 'approval',
      intentHash: 'sha256:intent',
    };
    expect(() => validateExecutionIntent(intent)).toThrow(BadRequestException);
  });

  it('rejects_llm_event_feature_processed_before_availability', () => {
    expect(() =>
      validateLlmEventFeature({
        id: 'llm-feature-1',
        symbol: 'SPY',
        eventId: 'event-1',
        eventTime: '2026-01-01T00:00:00.000Z',
        availableAt: '2026-01-02T00:00:00.000Z',
        processedAt: '2026-01-01T12:00:00.000Z',
        horizonHours: 24,
        eventType: 'event',
        direction: 'up',
        sentimentScore: 0.7,
        catalystStrength: 0.7,
        noveltyScore: 0.6,
        uncertainty: 0.2,
        downsideRisk: 0.3,
        confidence: 0.7,
        thesis: 'Structured feature test.',
        counterThesis: 'Availability time is in the future.',
        evidenceRefs: ['raw-evidence:1'],
        model: 'test-model',
        promptVersion: 'test-prompt',
        inputHash: 'sha256:in',
        outputHash: 'sha256:out',
      }),
    ).toThrow(BadRequestException);
  });
});
