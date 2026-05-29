import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { mkdirSync, readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { Repository } from 'typeorm';
import { LeanRun } from '../../../entities/lean-run.entity';
import { PortfolioTargetSnapshot } from '../../../entities/portfolio-target-snapshot.entity';
import { hashObject } from '../../../shared/hash.util';
import { LeanCloudArtifactWriter } from './lean-cloud-artifact-writer';
import { QuantConnectCloudRestImporter } from './lean-cloud-rest-importer';
import { assessLeanRunArtifacts } from './lean-run-acceptance';
import { importPortfolioTargetSnapshot } from './lean-portfolio-target-importer';
import {
  leanRuntimeUniverseManifestParameter,
  prepareLeanRuntimeUniverseManifest,
  resolveUniverseSelection,
  writeUniverseSelectionReport,
} from '../universe/universe-manifest';

export type LeanCloudManualImportRequest = {
  projectName?: string;
  projectId?: number;
  backtestId: string;
  parameters?: Record<string, string | number | boolean>;
};

@Injectable()
export class LeanCloudManualImporter {
  private readonly repoRoot = resolve(process.cwd(), '..');
  private readonly cloudArtifactWriter = new LeanCloudArtifactWriter();
  private readonly cloudRestImporter = new QuantConnectCloudRestImporter();

  constructor(
    @InjectRepository(LeanRun)
    private readonly leanRunRepository: Repository<LeanRun>,
    @InjectRepository(PortfolioTargetSnapshot)
    private readonly targetRepository: Repository<PortfolioTargetSnapshot>,
  ) {}

  async listCloudProjects(options: { limit?: number } = {}) {
    return this.cloudRestImporter.listProjects(options);
  }

  async listCloudBacktests(options: {
    projectId?: number;
    projectName?: string;
    limit?: number;
  }) {
    return this.cloudRestImporter.listBacktests(options);
  }

  async importCloudBacktest(
    request: LeanCloudManualImportRequest,
  ): Promise<LeanRun> {
    const projectName = request.projectName ?? 'aggressive_llm_momentum';
    if (!request.backtestId?.trim()) {
      throw new Error('QuantConnect Cloud backtest id is required.');
    }

    const importKey = `cloud:${request.projectId ?? 'env'}:${request.backtestId}`;
    const existing = await this.leanRunRepository.findOne({
      where: { importIdempotencyKey: importKey },
    });
    if (existing?.status === 'passed') {
      const existingAcceptance = assessLeanRunArtifacts(
        existing.resultDirectory,
        'strategy-backtest',
      );
      if (existingAcceptance.passed) {
        await importPortfolioTargetSnapshot(
          this.targetRepository,
          existing.runId,
          existing.portfolioTargetsRef,
        );
        return existing;
      }
    }

    const runId = `qc-import-${request.backtestId.slice(0, 12)}`;
    const resultDirectory = join(this.repoRoot, 'artifacts/lean-runs', runId);
    const artifactsRoot = join(this.repoRoot, 'artifacts/lean-runs');
    mkdirSync(resultDirectory, { recursive: true });

    const universeSelection = resolveUniverseSelection();
    prepareLeanRuntimeUniverseManifest();
    writeUniverseSelectionReport(resultDirectory, universeSelection);
    this.cloudArtifactWriter.writeLatestMarker(artifactsRoot, '.latest', runId);
    this.cloudArtifactWriter.writeLatestMarker(
      artifactsRoot,
      '.latest-cloud-import',
      runId,
    );

    const parameters = {
      'run-id': runId,
      'validation-mode': 'historical-research',
      'no-static-meta': true,
      'no-static-ml': true,
      'alpha-mode': 'numeric-only',
      'universe-profile': universeSelection.profile,
      'universe-manifest-path': leanRuntimeUniverseManifestParameter(),
      'allow-leveraged-etf': universeSelection.allowLeveragedEtf,
      'universe-symbols': universeSelection.activeSymbols.join(','),
      'manual-cloud-import': true,
      ...(request.parameters ?? {}),
    };
    const startedAt = new Date();
    const completedAt = new Date();
    const cloudUrl = request.projectId
      ? `https://www.quantconnect.com/project/${request.projectId}`
      : undefined;
    let status: 'passed' | 'failed' | 'blocked' = 'passed';
    let blockerReasons: string[] = [];

    const restImport = await this.cloudRestImporter.importArtifacts({
      resultDirectory,
      runId,
      projectId: request.projectId,
      cloudUrl,
      cloudBacktestId: request.backtestId,
      completedAt,
    });
    blockerReasons = restImport.blockers;
    if (blockerReasons.length > 0) {
      status = 'blocked';
    }

    this.writeCloudArtifacts({
      resultDirectory,
      runId,
      projectName,
      parameters,
      startedAt,
      completedAt,
      status,
      blockerReasons,
      cloudUrl,
      backtestId: request.backtestId,
    });

    if (status === 'passed') {
      const acceptance = assessLeanRunArtifacts(
        resultDirectory,
        'strategy-backtest',
      );
      if (!acceptance.passed) {
        status = 'blocked';
        blockerReasons = [
          'QuantConnect Cloud REST import completed, but imported artifacts did not pass strategy-evidence acceptance.',
          ...acceptance.blockers,
        ];
        this.writeCloudArtifacts({
          resultDirectory,
          runId,
          projectName,
          parameters,
          startedAt,
          completedAt,
          status,
          blockerReasons,
          cloudUrl,
          backtestId: request.backtestId,
        });
      } else {
        this.cloudArtifactWriter.writeLatestMarker(
          artifactsRoot,
          '.latest-strategy',
          runId,
        );
      }
    }

    const saved = await this.leanRunRepository.save(
      this.leanRunRepository.create({
        runId,
        runtime: 'quantconnect-cloud',
        mode: 'backtest',
        projectName,
        algorithmVersion: 'v1',
        parameters,
        startedAt,
        completedAt,
        status,
        resultDirectory,
        sourceHash: hashObject({
          projectName,
          projectId: request.projectId ?? '',
          backtestId: request.backtestId,
        }),
        configHash: hashObject({ parameters, cloudUrl }),
        dataManifestHash: hashObject({
          runtime: 'quantconnect-cloud',
          backtestId: request.backtestId,
        }),
        statistics: this.readStatistics(resultDirectory),
        logsRef: join(resultDirectory, 'logs.txt'),
        insightsRef: join(resultDirectory, 'insights.json'),
        portfolioTargetsRef: join(resultDirectory, 'portfolio_targets.json'),
        orderEventsRef: join(resultDirectory, 'order_events.json'),
        fillsRef: join(resultDirectory, 'fills.json'),
        blockerReasons,
        promotionEligible: status === 'passed' && blockerReasons.length === 0,
        cloudProjectId: request.projectId ? String(request.projectId) : '',
        cloudBacktestId: request.backtestId,
        cloudUrl,
        importIdempotencyKey: importKey,
      }),
    );
    await importPortfolioTargetSnapshot(
      this.targetRepository,
      saved.runId,
      saved.portfolioTargetsRef,
    );
    return saved;
  }

  private writeCloudArtifacts(input: {
    resultDirectory: string;
    runId: string;
    projectName: string;
    parameters: Record<string, string | number | boolean>;
    startedAt: Date;
    completedAt: Date;
    status: 'passed' | 'failed' | 'blocked';
    blockerReasons: string[];
    cloudUrl?: string;
    backtestId: string;
  }): void {
    this.cloudArtifactWriter.writeCloudArtifacts({
      resultDirectory: input.resultDirectory,
      runId: input.runId,
      projectName: input.projectName,
      parameters: input.parameters,
      startedAt: input.startedAt,
      completedAt: input.completedAt,
      status: input.status,
      stdout: `Imported QuantConnect Cloud backtest ${input.backtestId}.`,
      stderr: '',
      blockerReasons: input.blockerReasons,
      cloudUrl: input.cloudUrl,
      cloudBacktestId: input.backtestId,
    });
  }

  private readStatistics(
    resultDirectory: string,
  ): Record<string, string | number> {
    const path = join(resultDirectory, 'statistics.json');
    if (!existsSync(path)) {
      return {};
    }
    return JSON.parse(readFileSync(path, 'utf8')) as Record<
      string,
      string | number
    >;
  }
}
