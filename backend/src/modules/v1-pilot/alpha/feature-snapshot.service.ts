/**
 * Builds deterministic feature snapshots from ingested bars (or synthetic fallbacks).
 * Stale snapshots are rejected downstream so live exposure cannot rely on expired inputs.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureSnapshot } from '../../../entities/feature-snapshot.entity';
import { FeatureSnapshotContract } from '../contracts/v1-pilot.contracts';
import { validateFeatureSnapshot } from '../contracts/v1-pilot.validators';
import { hashObject } from '../../../shared/hash.util';
import { MarketDataBar } from '../../../entities/market-data-bar.entity';

const V1_UNIVERSE = ['SPY', 'QQQ', 'IWM', 'TLT', 'GLD'] as const;

@Injectable()
export class FeatureSnapshotService {
  constructor(
    @InjectRepository(FeatureSnapshot)
    private readonly featureRepository: Repository<FeatureSnapshot>,
    @InjectRepository(MarketDataBar)
    private readonly marketDataRepository: Repository<MarketDataBar>,
  ) {}

  async buildSnapshotsForUniverse(
    datasetId = 'v1-lean-universe',
  ): Promise<FeatureSnapshotContract[]> {
    const asOf = new Date().toISOString();
    const snapshots: FeatureSnapshotContract[] = [];

    for (const symbol of V1_UNIVERSE) {
      const bars = await this.marketDataRepository.find({
        where: { datasetId, symbol },
        order: { timestamp: 'DESC' },
        take: 260,
      });
      const features = this.computeFeatures(bars);
      const snapshot: FeatureSnapshotContract = {
        id: `feature-${symbol}-${asOf.slice(0, 10)}`,
        symbol,
        asOf,
        dataAvailabilityTime:
          bars[0]?.availabilityTimestamp ?? new Date(Date.now() - 86_400_000).toISOString(),
        timeframe: 'daily',
        features,
        sourceRefs: bars.length
          ? [`market-data-bar:${bars[0].id}`]
          : [`synthetic:${symbol}`],
        inputHash: hashObject({ symbol, features, asOf }),
        featureVersion: 'v1',
      };
      validateFeatureSnapshot(snapshot);
      snapshots.push(snapshot);
      await this.featureRepository.save(this.featureRepository.create(snapshot));
    }

    return snapshots;
  }

  private computeFeatures(
    bars: MarketDataBar[],
  ): Record<string, number | string | boolean | null> {
    if (bars.length < 2) {
      return {
        return_20d: 0.02,
        return_63d: 0.04,
        return_126d: 0.06,
        realized_vol_20d: 0.15,
        drawdown_63d: -0.03,
        price_vs_sma_200d: 1.01,
        dollar_volume_20d: 1_000_000,
        market_regime_score: 0.55,
      };
    }

    const closes = [...bars].reverse().map((bar) => bar.close);
    const latest = closes[closes.length - 1];
    const returnFor = (lookback: number): number => {
      const index = Math.max(0, closes.length - 1 - lookback);
      const base = closes[index] || latest;
      return base === 0 ? 0 : latest / base - 1;
    };
    const returns = closes.slice(-21).map((value, index, array) => {
      if (index === 0) {
        return 0;
      }
      const previous = array[index - 1];
      return previous === 0 ? 0 : value / previous - 1;
    });
    const mean =
      returns.reduce((sum, value) => sum + value, 0) / Math.max(returns.length, 1);
    const variance =
      returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      Math.max(returns.length, 1);
    const sma200 =
      closes.slice(-200).reduce((sum, value) => sum + value, 0) /
      Math.max(Math.min(closes.length, 200), 1);
    const peak = Math.max(...closes.slice(-63));
    const drawdown = peak === 0 ? 0 : latest / peak - 1;
    const dollarVolume =
      bars
        .slice(0, 20)
        .reduce((sum, bar) => sum + bar.close * (bar.volume ?? 0), 0) /
      Math.max(Math.min(bars.length, 20), 1);

    return {
      return_20d: Number(returnFor(20).toFixed(6)),
      return_63d: Number(returnFor(63).toFixed(6)),
      return_126d: Number(returnFor(126).toFixed(6)),
      realized_vol_20d: Number(Math.sqrt(variance * 252).toFixed(6)),
      drawdown_63d: Number(drawdown.toFixed(6)),
      price_vs_sma_200d: Number((latest / sma200).toFixed(6)),
      dollar_volume_20d: Number(dollarVolume.toFixed(2)),
      market_regime_score: Number((0.5 + returnFor(63) * 2).toFixed(6)),
    };
  }
}
