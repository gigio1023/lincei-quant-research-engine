import type { MarketDataProvider } from '../../entities/market-data-bar.entity';
import { ImportMarketDataBarInput } from './control-plane.types';

export interface FetchMarketDataBarsRequest {
  provider: MarketDataProvider;
  symbol: string;
  timeframe: string;
  currency: string;
  windowStart: string;
  windowEnd: string;
}

export interface FetchMarketDataBarsResponse {
  provider: MarketDataProvider;
  sourceRef: string;
  symbol: string;
  timeframe: string;
  currency: string;
  bars: ImportMarketDataBarInput[];
}

export interface MarketDataProviderService {
  fetchBars(
    request: FetchMarketDataBarsRequest,
  ): Promise<FetchMarketDataBarsResponse>;
}

export const MARKET_DATA_PROVIDER = 'MARKET_DATA_PROVIDER';
