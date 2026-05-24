import { scoreSnapshotHeuristic } from './heuristic-numeric.scorer';
import { FeatureSnapshotContract } from '../contracts/v1-pilot.contracts';

describe('scoreSnapshotHeuristic', () => {
  const snapshot = (): FeatureSnapshotContract => ({
    id: 'f1',
    symbol: 'SPY',
    asOf: new Date().toISOString(),
    dataAvailabilityTime: new Date().toISOString(),
    availableAt: new Date().toISOString(),
    timeframe: 'daily',
    features: {
      return_20d: 0.05,
      return_63d: 0.08,
      return_126d: 0.1,
      realized_vol_20d: 0.15,
      drawdown_63d: -0.02,
      price_vs_sma_200d: 1.05,
      dollar_volume_20d: 2_000_000,
      market_regime_score: 0.6,
    },
    sourceRefs: [],
    inputHash: 'sha256:test',
    featureVersion: 'v1',
  });

  it('returns_bounded_score', () => {
    const score = scoreSnapshotHeuristic(snapshot());
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
