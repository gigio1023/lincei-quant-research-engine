import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Repository } from 'typeorm';
import { LeanRun } from '../../../entities/lean-run.entity';
import { PortfolioTargetSnapshot } from '../../../entities/portfolio-target-snapshot.entity';
import { LeanRunResult } from './lean-run.types';
import { LeanPortfolioTargetsPayload } from './lean-run.types';
import { hashObject } from '../../../shared/hash.util';

@Injectable()
export class LeanRunImportService {
  constructor(
    @InjectRepository(LeanRun)
    private readonly leanRunRepository: Repository<LeanRun>,
    @InjectRepository(PortfolioTargetSnapshot)
    private readonly targetRepository: Repository<PortfolioTargetSnapshot>,
  ) {}

  async importFromDirectory(
    resultDirectory: string,
    idempotencyKey?: string,
  ): Promise<LeanRun> {
    const manifestPath = join(resultDirectory, 'statistics.json');
    if (!existsSync(manifestPath)) {
      throw new BadRequestException(
        `Missing statistics.json in ${resultDirectory}. Run lean-backtest first.`,
      );
    }

    const configPath = join(resultDirectory, 'config.json');
    const config = existsSync(configPath)
      ? (JSON.parse(readFileSync(configPath, 'utf8')) as {
          projectName?: string;
          algorithmVersion?: string;
          parameters?: Record<string, string | number | boolean>;
        })
      : {};

    const runId = resultDirectory.split('/').pop() ?? `import-${Date.now()}`;
    const importKey = idempotencyKey ?? `import:${runId}`;
    const existing = await this.leanRunRepository.findOne({
      where: { importIdempotencyKey: importKey },
    });
    if (existing) {
      return existing;
    }

    const startedAt = new Date();
    const completedAt = new Date();
    const statistics = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<
      string,
      string | number
    >;
    const result: LeanRunResult = {
      runId,
      projectName: config.projectName ?? 'aggressive_llm_momentum',
      algorithmVersion: config.algorithmVersion ?? 'v1',
      parameters: config.parameters ?? {},
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      status: 'passed',
      resultDirectory,
      sourceHash: hashObject({ runId }),
      configHash: hashObject(config),
      dataManifestHash: hashObject({ runId, statistics }),
      statistics,
      insightsRef: join(resultDirectory, 'insights.json'),
      portfolioTargetsRef: join(resultDirectory, 'portfolio_targets.json'),
      orderEventsRef: join(resultDirectory, 'order_events.json'),
      fillsRef: join(resultDirectory, 'fills.json'),
      logsRef: join(resultDirectory, 'logs.txt'),
      blockerReasons: [],
    };

    this.assertArtifacts(result);
    const saved = await this.leanRunRepository.save(
      this.leanRunRepository.create({
        ...result,
        startedAt: new Date(result.startedAt),
        completedAt: new Date(result.completedAt),
        importIdempotencyKey: importKey,
      }),
    );
    await this.importPortfolioTargets(saved.runId, result.portfolioTargetsRef!);
    return saved;
  }

  async importLatestFromArtifactsRoot(
    artifactsRoot: string,
  ): Promise<LeanRun> {
    if (!existsSync(artifactsRoot)) {
      throw new BadRequestException(`Artifacts root not found: ${artifactsRoot}`);
    }
    const entries = readFileSync(join(artifactsRoot, '.latest'), 'utf8').trim();
    return this.importFromDirectory(join(artifactsRoot, entries));
  }

  async listRuns(): Promise<LeanRun[]> {
    return this.leanRunRepository.find({ order: { completedAt: 'DESC' } });
  }

  async getLatestRun(): Promise<LeanRun | null> {
    const runs = await this.listRuns();
    return runs[0] ?? null;
  }

  private assertArtifacts(result: LeanRunResult): void {
    const required = [
      result.insightsRef,
      result.portfolioTargetsRef,
      result.orderEventsRef,
      result.fillsRef,
      result.logsRef,
    ];
    required.forEach((artifactPath) => {
      if (!artifactPath || !existsSync(artifactPath)) {
        throw new BadRequestException(`Missing required artifact: ${artifactPath}`);
      }
    });
  }

  private async importPortfolioTargets(
    leanRunId: string,
    portfolioTargetsRef: string,
  ): Promise<PortfolioTargetSnapshot> {
    const payload = JSON.parse(
      readFileSync(portfolioTargetsRef, 'utf8'),
    ) as LeanPortfolioTargetsPayload;
    const existing = await this.targetRepository.findOne({
      where: { id: payload.id },
    });
    if (existing) {
      return existing;
    }
    return this.targetRepository.save(
      this.targetRepository.create({
        id: payload.id,
        leanRunId: payload.leanRunId ?? leanRunId,
        asOf: payload.asOf,
        targets: payload.targets,
        grossExposurePct: payload.grossExposurePct,
        maxSingleNamePct: payload.maxSingleNamePct,
        targetHash: payload.targetHash ?? hashObject(payload),
      }),
    );
  }
}
