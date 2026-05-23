import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import axios from 'axios';
import {
  FetchMarketDataBarsRequest,
  FetchMarketDataBarsResponse,
  MarketDataProviderService,
} from './market-data-provider.types';
import { parseStooqDailyCsv } from './stooq-market-data.mapper';

type StooqRequester = (url: string, timeoutMs: number) => Promise<string>;

export const STOOQ_MARKET_DATA_REQUESTER = 'STOOQ_MARKET_DATA_REQUESTER';

@Injectable()
export class StooqMarketDataService implements MarketDataProviderService {
  constructor(
    @Optional()
    @Inject(STOOQ_MARKET_DATA_REQUESTER)
    private readonly requester: StooqRequester = defaultRequester,
  ) {}

  async fetchBars(
    request: FetchMarketDataBarsRequest,
  ): Promise<FetchMarketDataBarsResponse> {
    if (request.provider !== 'stooq') {
      throw new BadRequestException(
        `Stooq provider cannot fetch ${request.provider} data`,
      );
    }

    if (request.timeframe !== '1d') {
      throw new BadRequestException(
        'Stooq provider currently supports 1d bars',
      );
    }

    const baseUrl =
      process.env.STOOQ_DAILY_CSV_BASE_URL ?? 'https://stooq.com/q/d/l/';
    const timeoutMs = Number(process.env.MARKET_DATA_HTTP_TIMEOUT_MS ?? 10_000);
    const url = `${baseUrl}?s=${encodeURIComponent(
      request.symbol.toLowerCase(),
    )}&d1=${formatStooqDate(request.windowStart)}&d2=${formatStooqDate(
      request.windowEnd,
    )}&i=d`;
    const csv = await this.requester(url, timeoutMs);
    const bars = parseStooqDailyCsv(csv, request.symbol).filter((bar) => {
      const timestamp = new Date(bar.timestamp).getTime();
      return (
        timestamp >= new Date(request.windowStart).getTime() &&
        timestamp <= new Date(request.windowEnd).getTime()
      );
    });

    if (!bars.length) {
      throw new BadRequestException(
        `Stooq provider returned no bars for ${request.symbol}`,
      );
    }

    return {
      provider: 'stooq',
      sourceRef: url,
      symbol: request.symbol,
      timeframe: request.timeframe,
      currency: request.currency,
      bars,
    };
  }
}

function formatStooqDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`Invalid Stooq request date ${value}`);
  }

  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

async function defaultRequester(
  url: string,
  timeoutMs: number,
): Promise<string> {
  const response = await axios.get<string>(url, {
    responseType: 'text',
    timeout: timeoutMs,
  });

  return response.data;
}
