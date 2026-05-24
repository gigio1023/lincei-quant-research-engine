import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { MarketDataBar } from '../../../entities/market-data-bar.entity';
import {
  leanDate,
  parseLeanDailyCsv,
  toLeanDailyCsv,
} from './lean-daily-data-format';
import { writeStoredZip } from './stored-zip.writer';

export interface LeanDailyDataExportResult {
  exported: string[];
  skipped: string[];
  blockers: string[];
}

export interface LeanDailyDataHydrationResult {
  imported: string[];
  skipped: string[];
}

@Injectable()
export class LeanDailyDataExportService {
  constructor(
    @InjectRepository(MarketDataBar)
    private readonly marketDataRepository: Repository<MarketDataBar>,
  ) {}

  async exportMissingDailyEquityData(request: {
    repoRoot: string;
    datasetId: string;
    symbols: string[];
  }): Promise<LeanDailyDataExportResult> {
    const result: LeanDailyDataExportResult = {
      exported: [],
      skipped: [],
      blockers: [],
    };
    const dataRoot = join(request.repoRoot, 'engines/lean/data/equity/usa');

    for (const symbol of request.symbols) {
      const lowerSymbol = symbol.toLowerCase();
      const zipPath = join(dataRoot, 'daily', `${lowerSymbol}.zip`);
      if (existsSync(zipPath)) {
        result.skipped.push(`${symbol}:daily-exists`);
        continue;
      }

      const bars = await this.marketDataRepository.find({
        where: {
          datasetId: request.datasetId,
          symbol,
          timeframe: '1d',
        },
        order: { timestamp: 'ASC' },
      });
      if (bars.length < 2) {
        result.blockers.push(
          `${symbol} has ${bars.length} ingested bars; LEAN daily export requires at least 2.`,
        );
        continue;
      }

      this.writeMapAndFactorFiles(dataRoot, lowerSymbol, bars);
      writeStoredZip(
        zipPath,
        `${lowerSymbol}.csv`,
        Buffer.from(toLeanDailyCsv(bars), 'utf8'),
      );
      result.exported.push(`${symbol}:${bars.length}`);
    }

    if (result.blockers.length > 0) {
      throw new Error(
        `Cannot export local LEAN daily data: ${result.blockers.join('; ')}`,
      );
    }
    return result;
  }

  async hydrateMarketDataFromLeanDailyData(request: {
    repoRoot: string;
    datasetId: string;
    symbols: string[];
  }): Promise<LeanDailyDataHydrationResult> {
    const result: LeanDailyDataHydrationResult = {
      imported: [],
      skipped: [],
    };
    const dataRoot = join(
      request.repoRoot,
      'engines/lean/data/equity/usa/daily',
    );

    for (const symbol of request.symbols) {
      const existingCount = await this.marketDataRepository.count({
        where: {
          datasetId: request.datasetId,
          symbol,
          timeframe: '1d',
        },
      });
      if (existingCount >= 2) {
        result.skipped.push(`${symbol}:db-exists`);
        continue;
      }

      const lowerSymbol = symbol.toLowerCase();
      const zipPath = join(dataRoot, `${lowerSymbol}.zip`);
      if (!existsSync(zipPath)) {
        result.skipped.push(`${symbol}:zip-missing`);
        continue;
      }

      const csv = execFileSync('unzip', ['-p', zipPath, `${lowerSymbol}.csv`], {
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
      });
      const bars = parseLeanDailyCsv(csv, request.datasetId, symbol, zipPath);
      for (let index = 0; index < bars.length; index += 500) {
        await this.marketDataRepository.save(bars.slice(index, index + 500));
      }
      result.imported.push(`${symbol}:${bars.length}`);
    }

    return result;
  }

  private writeMapAndFactorFiles(
    dataRoot: string,
    lowerSymbol: string,
    bars: MarketDataBar[],
  ): void {
    const firstDate = leanDate(bars[0].timestamp);
    const firstClose = bars[0].adjustedClose ?? bars[0].close;
    const mapPath = join(dataRoot, 'map_files', `${lowerSymbol}.csv`);
    const factorPath = join(dataRoot, 'factor_files', `${lowerSymbol}.csv`);
    mkdirSync(join(dataRoot, 'map_files'), { recursive: true });
    mkdirSync(join(dataRoot, 'factor_files'), { recursive: true });

    if (!existsSync(mapPath)) {
      writeFileSync(
        mapPath,
        `${firstDate},${lowerSymbol},${lowerSymbol[0].toUpperCase()}\n20501231,${lowerSymbol},${lowerSymbol[0].toUpperCase()}\n`,
        'utf8',
      );
    }
    if (!existsSync(factorPath)) {
      writeFileSync(factorPath, `${firstDate},1,1,${firstClose}\n`, 'utf8');
    }
  }
}
