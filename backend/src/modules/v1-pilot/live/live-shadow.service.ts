import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LiveShadowRecord } from '../../../entities/live-shadow-record.entity';
import { PortfolioTargetSnapshot } from '../../../entities/portfolio-target-snapshot.entity';
import { hashObject } from '../../../shared/hash.util';
import { assessLeanRunArtifacts } from '../lean/lean-run-acceptance';
import { LeanRunImportService } from '../lean/lean-run-import.service';

@Injectable()
export class LiveShadowService {
  constructor(
    private readonly leanRunImportService: LeanRunImportService,
    @InjectRepository(PortfolioTargetSnapshot)
    private readonly targetRepository: Repository<PortfolioTargetSnapshot>,
    @InjectRepository(LiveShadowRecord)
    private readonly liveShadowRepository: Repository<LiveShadowRecord>,
  ) {}

  async runLiveShadow(): Promise<LiveShadowRecord> {
    const latestRun = await this.leanRunImportService.getLatestStrategyRun();
    const now = new Date().toISOString();
    const blockers: string[] = [];

    if (!latestRun) {
      blockers.push(
        'No accepted LEAN strategy run is available for shadow trading.',
      );
    } else if (latestRun.status !== 'passed') {
      blockers.push(`Latest LEAN run status is ${latestRun.status}.`);
    } else {
      const acceptance = assessLeanRunArtifacts(
        latestRun.resultDirectory,
        'strategy-backtest',
      );
      blockers.push(...acceptance.blockers);
    }

    const snapshot = latestRun
      ? (
          await this.targetRepository.find({
            where: { leanRunId: latestRun.runId },
            order: { asOf: 'DESC' },
            take: 1,
          })
        )[0]
      : undefined;
    if (!snapshot?.targets.length) {
      blockers.push(
        'No portfolio target snapshot is available for shadow trading.',
      );
    }

    const evidenceMode: LiveShadowRecord['evidenceMode'] =
      this.isCurrentTargetSnapshot(snapshot?.asOf, now)
        ? 'current_live_shadow'
        : 'historical_target_replay';
    const proposedTargets = snapshot?.targets ?? [];
    const wouldHaveTraded = proposedTargets.map((target) => ({
      symbol: target.symbol,
      side: target.targetWeight >= 0 ? 'buy' : 'sell',
      targetWeight: target.targetWeight,
      estimatedNotionalUsd: Number(
        Math.abs(target.targetWeight * 10_000).toFixed(2),
      ),
      brokerWriteEnabled: false,
    }));
    const reconciliation = {
      status: blockers.length > 0 ? 'blocked' : 'matched',
      observedSource:
        evidenceMode === 'current_live_shadow'
          ? 'live-shadow-current-target'
          : 'historical-target-replay',
      brokerWriteEnabled: false,
      checkedAt: now,
    };
    const payload = {
      leanRunId: latestRun?.runId,
      portfolioTargetSnapshotId: snapshot?.id,
      asOf: now,
      evidenceMode,
      proposedTargets,
      riskAdjustedTargets: proposedTargets,
      wouldHaveTraded,
      reconciliation,
      blockerReasons: blockers,
      evidenceRefs: [
        `evidence-mode:${evidenceMode}`,
        ...(latestRun ? [`lean-run:${latestRun.runId}`] : []),
        ...(snapshot ? [`portfolio-target:${snapshot.id}`] : []),
      ],
    };

    return this.liveShadowRepository.save(
      this.liveShadowRepository.create({
        id: `live-shadow-${now.replace(/[-:TZ.]/g, '').slice(0, 14)}`,
        mode: 'live-shadow',
        evidenceMode,
        status: blockers.length > 0 ? 'blocked' : 'recorded',
        recordHash: hashObject(payload),
        ...payload,
      }),
    );
  }

  async getLatest(): Promise<LiveShadowRecord | null> {
    const records = await this.liveShadowRepository.find({
      order: { createdAt: 'DESC' },
      take: 1,
    });
    return records[0] ?? null;
  }

  private isCurrentTargetSnapshot(
    asOf: string | undefined,
    now: string,
  ): boolean {
    if (!asOf) {
      return false;
    }
    const targetTime = new Date(asOf).getTime();
    const nowTime = new Date(now).getTime();
    if (!Number.isFinite(targetTime) || !Number.isFinite(nowTime)) {
      return false;
    }
    return Math.abs(nowTime - targetTime) <= 30 * 60 * 1000;
  }
}
