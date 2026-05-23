import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { MarketDataIngestionService } from './market-data-ingestion.service';

const MARKET_DATA_INGESTION_CRON = '*/30 * * * *';

@Injectable()
export class MarketDataIngestionSchedulerService {
  private readonly logger = new Logger(
    MarketDataIngestionSchedulerService.name,
  );

  constructor(private readonly ingestionService: MarketDataIngestionService) {}

  @Cron(MARKET_DATA_INGESTION_CRON, {
    name: 'market-data-ingestion-worker',
  })
  async pollMarketDataCron(): Promise<void> {
    if (!this.ingestionService.getStatus().enabled) {
      return;
    }

    try {
      await this.ingestionService.poll({}, 'cron');
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Market data ingestion cron failed';
      this.logger.error(`Market data ingestion cron failed: ${message}`);
    }
  }

  getWorkerStatus() {
    return {
      ...this.ingestionService.getStatus(),
      cron: MARKET_DATA_INGESTION_CRON,
    };
  }
}
