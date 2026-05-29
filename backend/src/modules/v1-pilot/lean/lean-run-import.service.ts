/**
 * Idempotent import of artifacts/lean-runs into SQLite. Missing files fail import to avoid
 * paper/live cycles running on partial evidence.
 */
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, readFileSync } from 'fs';
import { join, resolve, sep } from 'path';
import { Repository } from 'typeorm';
import { LeanRun } from '../../../entities/lean-run.entity';
import { PortfolioTargetSnapshot } from '../../../entities/portfolio-target-snapshot.entity';
import { LeanRunResult } from './lean-run.types';
import { hashObject } from '../../../shared/hash.util';
import {
  LeanAcceptanceMode,
  assessLeanRunArtifacts,
} from './lean-run-acceptance';
import { importPortfolioTargetSnapshot } from './lean-portfolio-target-importer';

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
    options: { acceptanceMode?: LeanAcceptanceMode } = {},
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
          simulator?: string;
          runtime?: LeanRunResult['runtime'];
          mode?: LeanRunResult['mode'];
          parameters?: Record<string, string | number | boolean>;
        })
      : {};

    const runId = resultDirectory.split('/').pop() ?? `import-${Date.now()}`;
    const importKey = idempotencyKey ?? `import:${runId}`;

    const startedAt = new Date();
    const completedAt = new Date();
    const statistics = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<
      string,
      string | number
    >;
    const mode = options.acceptanceMode ?? 'schema-import';
    const acceptance = assessLeanRunArtifacts(resultDirectory, mode);
    const strategyAcceptance = assessLeanRunArtifacts(
      resultDirectory,
      'strategy-backtest',
    );
    if (!acceptance.passed) {
      throw new BadRequestException(
        `LEAN ${acceptance.mode} rejected: ${acceptance.blockers.join('; ')}`,
      );
    }

    const existing = await this.leanRunRepository.findOne({
      where: { importIdempotencyKey: importKey },
    });
    if (existing) {
      await importPortfolioTargetSnapshot(
        this.targetRepository,
        existing.runId,
        existing.portfolioTargetsRef,
      );
      return existing;
    }

    const result: LeanRunResult = {
      runId,
      runtime: this.runtimeFromConfig(config),
      mode: config.mode ?? 'backtest',
      projectName: config.projectName ?? 'aggressive_llm_momentum',
      algorithmVersion: config.algorithmVersion ?? 'v1',
      parameters: config.parameters ?? {},
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      status: strategyAcceptance.passed ? 'passed' : 'failed',
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
      blockerReasons: strategyAcceptance.blockers,
    };

    this.assertArtifacts(result);
    const saved = await this.leanRunRepository.save(
      this.leanRunRepository.create({
        ...result,
        startedAt: new Date(result.startedAt),
        completedAt: new Date(result.completedAt),
        promotionEligible: strategyAcceptance.passed,
        cloudProjectId: this.optionalStat(statistics, 'cloudProjectId'),
        cloudBacktestId: this.optionalStat(statistics, 'cloudBacktestId'),
        importIdempotencyKey: importKey,
      }),
    );
    await importPortfolioTargetSnapshot(
      this.targetRepository,
      saved.runId,
      result.portfolioTargetsRef,
    );
    return saved;
  }

  async importLatestFromArtifactsRoot(
    artifactsRoot: string,
    options: {
      acceptanceMode?: LeanAcceptanceMode;
      latestMarker?: string;
    } = {},
  ): Promise<LeanRun> {
    if (!existsSync(artifactsRoot)) {
      throw new BadRequestException(
        `Artifacts root not found: ${artifactsRoot}`,
      );
    }
    const latestMarker = options.latestMarker ?? '.latest';
    const latestPath = join(artifactsRoot, latestMarker);
    if (!existsSync(latestPath)) {
      throw new BadRequestException(
        `Latest LEAN run marker not found: ${latestPath}`,
      );
    }
    const runId = readFileSync(latestPath, 'utf8').trim();
    const resultDirectory = this.resolveSafeRunDirectory(artifactsRoot, runId);
    return this.importFromDirectory(resultDirectory, undefined, options);
  }

  async listRuns(): Promise<LeanRun[]> {
    return this.leanRunRepository.find({ order: { completedAt: 'DESC' } });
  }

  async getLatestRun(): Promise<LeanRun | null> {
    const runs = await this.listRuns();
    return runs[0] ?? null;
  }

  async getLatestStrategyRun(): Promise<LeanRun | null> {
    const runs = await this.leanRunRepository.find({
      where: {
        mode: 'backtest',
        status: 'passed',
        promotionEligible: true,
      },
      order: { completedAt: 'DESC' },
      take: 10,
    });
    return runs.find((run) => run.runtime !== 'simulator') ?? null;
  }

  async getLatestCloudStrategyRun(): Promise<LeanRun | null> {
    const runs = await this.leanRunRepository.find({
      where: {
        mode: 'backtest',
        runtime: 'quantconnect-cloud',
        status: 'passed',
        promotionEligible: true,
      },
      order: { completedAt: 'DESC' },
      take: 1,
    });
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
        throw new BadRequestException(
          `Missing required artifact: ${artifactPath}`,
        );
      }
    });
  }

  private resolveSafeRunDirectory(
    artifactsRoot: string,
    runId: string,
  ): string {
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(runId)) {
      throw new BadRequestException(`Unsafe LEAN run id in marker: ${runId}`);
    }
    const root = resolve(artifactsRoot);
    const resultDirectory = resolve(root, runId);
    if (
      resultDirectory !== root &&
      !resultDirectory.startsWith(`${root}${sep}`)
    ) {
      throw new BadRequestException(`Unsafe LEAN run path in marker: ${runId}`);
    }
    return resultDirectory;
  }

  private runtimeFromConfig(config: {
    simulator?: string;
    runtime?: LeanRunResult['runtime'];
  }): LeanRunResult['runtime'] {
    if (
      config.runtime === 'quantconnect-cloud' ||
      config.runtime === 'local-lean' ||
      config.runtime === 'simulator'
    ) {
      return config.runtime;
    }
    return config.simulator ? 'simulator' : 'local-lean';
  }

  private optionalStat(
    statistics: Record<string, string | number>,
    key: string,
  ): string | undefined {
    const value = statistics[key];
    if (value === undefined || value === '') {
      return undefined;
    }
    return String(value);
  }
}
