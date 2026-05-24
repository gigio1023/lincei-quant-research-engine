import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { execFileSync } from 'child_process';
import { mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { LeanRun } from '../../../entities/lean-run.entity';
import { hashObject } from '../../../shared/hash.util';
import { LeanCliRunner } from './lean-cli.runner';
import { assessLeanRunArtifacts } from './lean-run-acceptance';
import { LeanCloudArtifactWriter } from './lean-cloud-artifact-writer';
import { QuantConnectCloudRestImporter } from './lean-cloud-rest-importer';

export type LeanCloudBacktestRequest = {
  projectName?: string;
  push?: boolean;
  parameters?: Record<string, string | number | boolean>;
};

@Injectable()
export class LeanCloudRunner {
  private readonly repoRoot = resolve(process.cwd(), '..');
  private readonly leanWorkspace = join(this.repoRoot, 'engines/lean');
  private readonly cloudArtifactWriter = new LeanCloudArtifactWriter();
  private readonly cloudRestImporter = new QuantConnectCloudRestImporter();

  constructor(
    private readonly leanCliRunner: LeanCliRunner,
    @InjectRepository(LeanRun)
    private readonly leanRunRepository: Repository<LeanRun>,
  ) {}

  async runCloudBacktest(
    request: LeanCloudBacktestRequest = {},
  ): Promise<LeanRun> {
    const projectName = request.projectName ?? 'aggressive_llm_momentum';
    const runId = `qc-${new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, '')
      .slice(0, 14)}-${randomBytes(4).toString('hex')}`;
    const resultDirectory = join(this.repoRoot, 'artifacts/lean-runs', runId);
    const artifactsRoot = join(this.repoRoot, 'artifacts/lean-runs');
    mkdirSync(resultDirectory, { recursive: true });
    this.cloudArtifactWriter.writeLatestMarker(artifactsRoot, '.latest', runId);
    this.cloudArtifactWriter.writeLatestMarker(
      artifactsRoot,
      '.latest-cloud-attempt',
      runId,
    );

    const parameters = {
      'run-id': runId,
      'validation-mode': 'historical-research',
      'no-static-meta': true,
      'no-static-ml': true,
      'alpha-mode': 'numeric-only',
      ...(request.parameters ?? {}),
    };
    const args = [
      'cloud',
      'backtest',
      projectName,
      '--name',
      runId,
      ...(request.push ? ['--push'] : []),
      ...this.parameterArgs(parameters),
    ];
    const startedAt = new Date();
    let stdout = '';
    let stderr = '';
    let status: 'passed' | 'failed' | 'blocked' = 'passed';
    let blockerReasons: string[] = [];

    try {
      stdout = execFileSync(this.leanCliRunner.resolveLeanBin(), args, {
        cwd: this.leanWorkspace,
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
        env: this.leanCliRunner.buildLeanProcessEnv(),
      });
    } catch (error) {
      const execError = error as {
        stdout?: string;
        stderr?: string;
        message?: string;
      };
      stdout = execError.stdout ?? '';
      stderr = execError.stderr ?? execError.message ?? '';
      blockerReasons = this.classifyBlockers(`${stdout}\n${stderr}`);
      status = blockerReasons.length > 0 ? 'blocked' : 'failed';
      if (status === 'failed') {
        blockerReasons = ['QuantConnect Cloud backtest command failed.'];
      }
    }

    const completedAt = new Date();
    const cloudUrl =
      this.extractFirstUrl(stdout) ?? this.extractFirstUrl(stderr);
    const cloudBacktestId = this.extractBacktestId(stdout) ?? undefined;
    if (status === 'passed') {
      const restImport = await this.cloudRestImporter.importArtifacts({
        resultDirectory,
        runId,
        cloudUrl,
        cloudBacktestId,
        completedAt,
      });
      blockerReasons.push(...restImport.blockers);
      if (restImport.blockers.length > 0) {
        status = 'blocked';
      }
    }
    this.cloudArtifactWriter.writeCloudArtifacts({
      resultDirectory,
      runId,
      projectName,
      parameters,
      startedAt,
      completedAt,
      status,
      stdout,
      stderr,
      blockerReasons,
      cloudUrl,
      cloudBacktestId,
    });
    if (status === 'passed') {
      const acceptance = assessLeanRunArtifacts(
        resultDirectory,
        'strategy-backtest',
      );
      if (!acceptance.passed) {
        status = 'blocked';
        blockerReasons = [
          'QuantConnect Cloud command completed, but cloud result artifacts were not imported; command success is not promotion evidence.',
          ...acceptance.blockers,
        ];
        this.cloudArtifactWriter.writeCloudArtifacts({
          resultDirectory,
          runId,
          projectName,
          parameters,
          startedAt,
          completedAt,
          status,
          stdout,
          stderr,
          blockerReasons,
          cloudUrl,
          cloudBacktestId,
        });
      } else {
        this.cloudArtifactWriter.writeLatestMarker(
          artifactsRoot,
          '.latest-strategy',
          runId,
        );
      }
    }

    const existing = await this.leanRunRepository.findOne({
      where: { importIdempotencyKey: `cloud:${runId}` },
    });
    if (existing) {
      return existing;
    }

    return this.leanRunRepository.save(
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
        sourceHash: hashObject({ projectName, runId }),
        configHash: hashObject({ parameters, cloudUrl, cloudBacktestId }),
        dataManifestHash: hashObject({ runtime: 'quantconnect-cloud', runId }),
        statistics: {
          cloudCommand: args.join(' '),
          cloudBacktestId: cloudBacktestId ?? '',
          status,
        },
        logsRef: join(resultDirectory, 'logs.txt'),
        insightsRef: join(resultDirectory, 'insights.json'),
        portfolioTargetsRef: join(resultDirectory, 'portfolio_targets.json'),
        orderEventsRef: join(resultDirectory, 'order_events.json'),
        fillsRef: join(resultDirectory, 'fills.json'),
        blockerReasons,
        promotionEligible: status === 'passed' && blockerReasons.length === 0,
        cloudBacktestId,
        cloudUrl,
        importIdempotencyKey: `cloud:${runId}`,
      }),
    );
  }

  async syncObjectStore(
    key: string,
    sourcePath: string,
  ): Promise<{
    status: 'passed' | 'blocked';
    key: string;
    sourcePath: string;
    blockers: string[];
  }> {
    const args = ['cloud', 'object-store', 'set', key, sourcePath];
    try {
      execFileSync(this.leanCliRunner.resolveLeanBin(), args, {
        cwd: this.leanWorkspace,
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
        env: this.leanCliRunner.buildLeanProcessEnv(),
      });
      return { status: 'passed', key, sourcePath, blockers: [] };
    } catch (error) {
      const execError = error as {
        stdout?: string;
        stderr?: string;
        message?: string;
      };
      const blockers = this.classifyBlockers(
        `${execError.stdout ?? ''}\n${execError.stderr ?? execError.message ?? ''}`,
      );
      return {
        status: 'blocked',
        key,
        sourcePath,
        blockers: blockers.length
          ? blockers
          : ['QuantConnect Object Store sync failed.'],
      };
    }
  }

  private parameterArgs(
    parameters: Record<string, string | number | boolean>,
  ): string[] {
    return Object.entries(parameters).flatMap(([key, value]) => [
      '--parameter',
      key,
      String(value),
    ]);
  }

  private classifyBlockers(output: string): string[] {
    const normalized = output.toLowerCase();
    const blockers: string[] = [];
    if (normalized.includes('paid tier')) {
      blockers.push('QuantConnect paid organization tier is required.');
    }
    if (
      normalized.includes('not logged in') ||
      normalized.includes('credentials') ||
      normalized.includes('api token')
    ) {
      blockers.push('QuantConnect credentials are missing or invalid.');
    }
    if (normalized.includes('lock')) {
      blockers.push('QuantConnect cloud project lock blocked push/backtest.');
    }
    if (normalized.includes('no project') || normalized.includes('not found')) {
      blockers.push(
        'QuantConnect Cloud project is missing; rerun with --push or create/pull the project.',
      );
    }
    if (normalized.includes('dataset') || normalized.includes('data')) {
      blockers.push('QuantConnect dataset access may be blocked.');
    }
    return blockers;
  }

  private extractFirstUrl(output: string): string | undefined {
    return output.match(/https?:\/\/\S+/)?.[0];
  }

  private extractBacktestId(output: string): string | undefined {
    return output.match(/[a-f0-9]{32}/i)?.[0];
  }
}
