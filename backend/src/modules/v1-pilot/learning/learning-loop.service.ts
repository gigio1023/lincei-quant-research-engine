import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { AlphaDecision } from '../../../entities/alpha-decision.entity';
import { AlphaOutcomeLabel } from '../../../entities/alpha-outcome-label.entity';
import { LiveShadowRecord } from '../../../entities/live-shadow-record.entity';
import { MarketDataBar } from '../../../entities/market-data-bar.entity';
import { PromotionDecision } from '../../../entities/promotion-decision.entity';
import { hashObject } from '../../../shared/hash.util';
import { alphaHorizonHours } from '../contracts/spec-contracts';
import { LeanRunImportService } from '../lean/lean-run-import.service';

@Injectable()
export class LearningLoopService {
  constructor(
    private readonly leanRunImportService: LeanRunImportService,
    @InjectRepository(AlphaDecision)
    private readonly alphaRepository: Repository<AlphaDecision>,
    @InjectRepository(AlphaOutcomeLabel)
    private readonly labelRepository: Repository<AlphaOutcomeLabel>,
    @InjectRepository(MarketDataBar)
    private readonly marketDataRepository: Repository<MarketDataBar>,
    @InjectRepository(LiveShadowRecord)
    private readonly liveShadowRepository: Repository<LiveShadowRecord>,
    @InjectRepository(PromotionDecision)
    private readonly promotionRepository: Repository<PromotionDecision>,
  ) {}

  async runLearningLoop(): Promise<{
    labelsCreated: number;
    promotionDecision: PromotionDecision;
  }> {
    const labels = await this.labelAvailableAlphaOutcomes();
    const promotionDecision = await this.recordStrategyPromotionDecision();
    return { labelsCreated: labels.length, promotionDecision };
  }

  async labelAvailableAlphaOutcomes(): Promise<AlphaOutcomeLabel[]> {
    const decisions = await this.alphaRepository.find({
      order: { asOf: 'DESC' },
      take: 250,
    });
    const created: AlphaOutcomeLabel[] = [];

    for (const decision of decisions) {
      const existing = await this.labelRepository.findOne({
        where: { alphaDecisionId: decision.id },
      });
      if (existing) {
        continue;
      }
      const label = await this.buildLabel(decision);
      if (label) {
        created.push(await this.labelRepository.save(label));
      }
    }

    return created;
  }

  async recordStrategyPromotionDecision(): Promise<PromotionDecision> {
    const latestRun = await this.leanRunImportService.getLatestRun();
    const liveShadow = (
      await this.liveShadowRepository.find({
        order: { createdAt: 'DESC' },
        take: 1,
      })
    )[0];
    const decidedAt = new Date().toISOString();
    const blockers: string[] = [];

    if (!latestRun) {
      blockers.push('No LEAN run exists.');
    } else {
      if (latestRun.runtime !== 'quantconnect-cloud') {
        blockers.push('Latest LEAN run is not QuantConnect Cloud evidence.');
      }
      if (latestRun.status !== 'passed') {
        blockers.push(`Latest LEAN run status is ${latestRun.status}.`);
      }
      if (!latestRun.promotionEligible) {
        blockers.push('Latest LEAN run is not promotion eligible.');
      }
    }
    if (!liveShadow) {
      blockers.push('No live-shadow evidence exists.');
    } else if (liveShadow.status !== 'recorded') {
      blockers.push('Latest live-shadow evidence is blocked.');
    }

    const evidenceRefs = [
      ...(latestRun ? [`lean-run:${latestRun.runId}`] : []),
      ...(liveShadow ? [`live-shadow:${liveShadow.id}`] : []),
    ];
    const targetRef = latestRun
      ? `strategy:${latestRun.projectName}:${latestRun.runId}`
      : 'strategy:missing-run';
    const metrics = {
      labels: await this.labelRepository.count(),
      cloudRuntime: latestRun?.runtime === 'quantconnect-cloud',
      liveShadowRecorded: liveShadow?.status === 'recorded',
    };
    const payload = {
      scope: 'strategy' as const,
      targetRef,
      decidedAt,
      status: blockers.length ? ('blocked' as const) : ('accepted' as const),
      evidenceRefs,
      blockerReasons: blockers,
      metrics,
    };

    return this.promotionRepository.save(
      this.promotionRepository.create({
        id: `promotion-${decidedAt.replace(/[-:TZ.]/g, '').slice(0, 14)}`,
        decisionHash: hashObject(payload),
        ...payload,
      }),
    );
  }

  private async buildLabel(
    decision: AlphaDecision,
  ): Promise<AlphaOutcomeLabel | null> {
    const horizonHours = alphaHorizonHours(decision);
    const labelAt = new Date(
      new Date(decision.asOf).getTime() + horizonHours * 60 * 60 * 1000,
    ).toISOString();
    const startBar = await this.firstBarAtOrAfter(
      decision.symbol,
      decision.asOf,
    );
    const endBar = await this.firstBarAtOrAfter(decision.symbol, labelAt);
    const startBenchmark = await this.firstBarAtOrAfter('SPY', decision.asOf);
    const endBenchmark = await this.firstBarAtOrAfter('SPY', labelAt);
    if (!startBar || !endBar || !startBenchmark || !endBenchmark) {
      return null;
    }

    const forwardReturnBps = this.returnBps(startBar.close, endBar.close);
    const benchmarkReturnBps = this.returnBps(
      startBenchmark.close,
      endBenchmark.close,
    );
    const payload = {
      alphaDecisionId: decision.id,
      symbol: decision.symbol,
      asOf: decision.asOf,
      availableAt: decision.availableAt ?? decision.asOf,
      horizonHours,
      labelAt,
      forwardReturnBps,
      benchmarkReturnBps,
      relativeReturnBps: Number(
        (forwardReturnBps - benchmarkReturnBps).toFixed(4),
      ),
      sourceRefs: [
        `market-data-bar:${startBar.id}`,
        `market-data-bar:${endBar.id}`,
        `market-data-bar:${startBenchmark.id}`,
        `market-data-bar:${endBenchmark.id}`,
      ],
    };
    return this.labelRepository.create({
      id: `label-${decision.id}-${horizonHours}h`,
      labelHash: hashObject(payload),
      ...payload,
    });
  }

  private async firstBarAtOrAfter(
    symbol: string,
    timestamp: string,
  ): Promise<MarketDataBar | null> {
    const records = await this.marketDataRepository.find({
      where: {
        datasetId: 'v1-lean-universe',
        timeframe: '1d',
        symbol,
        timestamp: MoreThanOrEqual(timestamp),
      },
      order: { timestamp: 'ASC' },
      take: 1,
    });
    return records[0] ?? null;
  }

  private returnBps(startPrice: number, endPrice: number): number {
    if (startPrice <= 0) {
      return 0;
    }
    return Number(((endPrice / startPrice - 1) * 10_000).toFixed(4));
  }
}
