import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { execFileSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { LeanRun } from '../../../entities/lean-run.entity';
import { hashObject } from '../../../shared/hash.util';
import { LeanCliRunner } from './lean-cli.runner';

export type LeanCloudBacktestRequest = {
  projectName?: string;
  push?: boolean;
  parameters?: Record<string, string | number | boolean>;
};

@Injectable()
export class LeanCloudRunner {
  private readonly repoRoot = resolve(process.cwd(), '..');
  private readonly leanWorkspace = join(this.repoRoot, 'engines/lean');

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
    mkdirSync(resultDirectory, { recursive: true });

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
    this.writeCloudArtifacts({
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
        promotionEligible: status === 'passed',
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

  private writeCloudArtifacts(input: {
    resultDirectory: string;
    runId: string;
    projectName: string;
    parameters: Record<string, string | number | boolean>;
    startedAt: Date;
    completedAt: Date;
    status: 'passed' | 'failed' | 'blocked';
    stdout: string;
    stderr: string;
    blockerReasons: string[];
    cloudUrl?: string;
    cloudBacktestId?: string;
  }): void {
    const manifest = {
      runtime: 'quantconnect-cloud',
      mode: 'backtest',
      ...input,
      startedAt: input.startedAt.toISOString(),
      completedAt: input.completedAt.toISOString(),
    };
    writeFileSync(
      join(input.resultDirectory, 'cloud-run-manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );
    writeFileSync(
      join(input.resultDirectory, 'statistics.json'),
      `${JSON.stringify(
        {
          cloudBacktestId: input.cloudBacktestId ?? '',
          status: input.status,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    writeFileSync(
      join(input.resultDirectory, 'config.json'),
      `${JSON.stringify(
        {
          projectName: input.projectName,
          algorithmVersion: 'v1',
          runtime: 'quantconnect-cloud',
          mode: 'backtest',
          parameters: input.parameters,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    writeFileSync(
      join(input.resultDirectory, 'logs.txt'),
      `${input.stdout}\n${input.stderr}\n`,
      'utf8',
    );
    writeFileSync(
      join(input.resultDirectory, 'insights.json'),
      `${JSON.stringify({ runId: input.runId, insights: [] }, null, 2)}\n`,
      'utf8',
    );
    writeFileSync(
      join(input.resultDirectory, 'portfolio_targets.json'),
      `${JSON.stringify(
        {
          id: `targets-${input.runId}`,
          leanRunId: input.runId,
          asOf: input.completedAt.toISOString(),
          targets: [],
          grossExposurePct: 0,
          maxSingleNamePct: 0,
          riskNotes: ['cloud_artifact_import_pending'],
        },
        null,
        2,
      )}\n`,
      'utf8',
    );
    writeFileSync(
      join(input.resultDirectory, 'order_events.json'),
      '{"events":[]}\n',
    );
    writeFileSync(join(input.resultDirectory, 'fills.json'), '{"fills":[]}\n');
  }

  private extractFirstUrl(output: string): string | undefined {
    return output.match(/https?:\/\/\S+/)?.[0];
  }

  private extractBacktestId(output: string): string | undefined {
    return output.match(/[a-f0-9]{32}/i)?.[0];
  }
}
