import { FeatureSnapshotContract } from '../contracts/v1-pilot.contracts';

/**
 * Emergency fallback when no promoted ML model or inference fails.
 * Not the default alpha path — kept only for replay/degraded mode.
 */
export function scoreSnapshotHeuristic(
  snapshot: FeatureSnapshotContract,
): number {
  const features = snapshot.features;
  const return63 = Number(features.return_63d ?? 0);
  const return126 = Number(features.return_126d ?? 0);
  const vol = Number(features.realized_vol_20d ?? 0.2);
  const drawdown = Number(features.drawdown_63d ?? 0);
  const trend = Number(features.price_vs_sma_200d ?? 1) > 1 ? 0.08 : -0.04;
  const liquidity =
    Number(features.dollar_volume_20d ?? 0) < 500_000 ? -0.08 : 0.04;
  const raw =
    return63 * 0.35 +
    return126 * 0.25 +
    trend +
    liquidity -
    vol * 0.2 +
    drawdown * 0.15;
  return Math.min(1, Math.max(0, 0.5 + raw));
}
