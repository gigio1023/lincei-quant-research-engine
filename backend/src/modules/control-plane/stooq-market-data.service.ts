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
    const url = this.buildUrl(baseUrl, request);
    const csv = await this.requester(url, timeoutMs);
    this.assertCsvDownloadAvailable(csv, request);
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

  buildUrl(baseUrl: string, request: FetchMarketDataBarsRequest): string {
    const params = new URLSearchParams({
      s: this.stooqSymbol(request),
      d1: formatStooqDate(request.windowStart),
      d2: formatStooqDate(request.windowEnd),
      i: 'd',
    });
    const apiKey = process.env.STOOQ_API_KEY?.trim();
    if (apiKey) {
      params.set('apikey', apiKey);
    }
    return `${baseUrl}?${params.toString()}`;
  }

  private stooqSymbol(request: FetchMarketDataBarsRequest): string {
    const symbol = request.symbol.toLowerCase();
    if (request.currency === 'USD' && !symbol.includes('.')) {
      return `${symbol}.us`;
    }
    return symbol;
  }

  private assertCsvDownloadAvailable(
    csv: string,
    request: FetchMarketDataBarsRequest,
  ): void {
    if (!/get your apikey/i.test(csv)) {
      return;
    }

    const stooqSymbol = this.stooqSymbol(request);
    throw new BadRequestException(
      [
        `Stooq CSV download requires STOOQ_API_KEY for ${request.symbol}.`,
        `Open https://stooq.com/q/d/?s=${stooqSymbol}&get_apikey, complete the captcha, and set STOOQ_API_KEY in backend/.env.`,
      ].join(' '),
    );
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
