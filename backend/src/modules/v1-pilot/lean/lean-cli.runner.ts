/**
 * Runs official `lean backtest` in Docker. Requires lean.json, Docker, and QC data (see docs/full-lean-backtest-setup.md).
 */
import { Injectable, Logger } from '@nestjs/common';
import { execFileSync, spawnSync } from 'child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { join, resolve } from 'path';
import { randomBytes } from 'crypto';
import { assertLeanRunArtifactsAccepted } from './lean-run-acceptance';
import {
  summarizeLeanCliFailure,
  writeLeanCliFailureDiagnostics,
} from './lean-cli-failure-diagnostics';
import {
  copyArtifactsFromBacktestDirectory,
  copyDataMonitorReport,
  findBacktestDirectoryForRunId,
  latestBacktestDirectory,
  prepareRunLeanConfig,
  readLeanLog,
} from './lean-cli-backtest-files';

const REQUIRED_ARTIFACTS = [
  'statistics.json',
  'insights.json',
  'portfolio_targets.json',
  'order_events.json',
  'fills.json',
  'config.json',
  'logs.txt',
] as const;

export type LeanCliBacktestRequest = {
  projectName?: string;
  runId?: string;
  downloadData?: boolean;
  skipAlphaCycle?: boolean;
  validationMode?: string;
  usesStaticMetaOverlay?: boolean;
  usesStaticMlPredictions?: boolean;
  noStaticMeta?: boolean;
  noStaticMl?: boolean;
  alphaMode?: string;
  universeSymbols?: string[];
  allowSummaryHydration?: boolean;
  requireStrategyEvidence?: boolean;
};

export type LeanCliBacktestResult = {
  runId: string;
  mode: 'lean-cli';
  outputDirectory: string;
  artifactRelativeDir: string;
  stdout: string;
  stderr: string;
};

@Injectable()
export class LeanCliRunner {
  private readonly logger = new Logger(LeanCliRunner.name);
  private readonly repoRoot = resolve(process.cwd(), '..');
  private readonly leanWorkspace = join(this.repoRoot, 'engines/lean');

  resolveLeanBin(): string {
    if (process.env.LEAN_CLI_PATH) {
      return process.env.LEAN_CLI_PATH;
    }
    const venvLean = join(this.repoRoot, '.venv-lean-cli/bin/lean');
    if (existsSync(venvLean)) {
      return venvLean;
    }
    return 'lean';
  }

  assertPrerequisites(): {
    leanBin: string;
    leanConfigPath: string;
    processEnv: NodeJS.ProcessEnv;
  } {
    const leanBin = this.resolveLeanBin();
    const leanConfigPath = join(this.leanWorkspace, 'lean.json');
    if (!existsSync(leanConfigPath)) {
      throw new Error(
        `Missing ${leanConfigPath}. Run ./scripts/setup-lean-workspace.sh (requires QuantConnect login).`,
      );
    }
    const processEnv = this.buildLeanProcessEnv();
    const dockerCheck = spawnSync('docker', ['info'], {
      encoding: 'utf8',
      env: processEnv,
    });
    if (dockerCheck.status !== 0) {
      const diagnostic = [dockerCheck.stderr, dockerCheck.stdout]
        .filter(Boolean)
        .join('\n')
        .trim();
      throw new Error(
        `Docker is unavailable to the current process. Lean CLI backtests require Docker socket access (see docs/full-lean-backtest-setup.md).${diagnostic ? ` Docker diagnostic: ${diagnostic}` : ''}`,
      );
    }
    return { leanBin, leanConfigPath, processEnv };
  }

  buildLeanProcessEnv(): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env };
    const home = env.HOME;
    const colimaSocket = home ? join(home, '.colima/default/docker.sock') : '';

    if (!env.DOCKER_HOST && colimaSocket && existsSync(colimaSocket)) {
      env.DOCKER_HOST = `unix://${colimaSocket}`;
    }

    if (!env.TMPDIR || env.TMPDIR.startsWith('/var/folders/')) {
      const leanTmpDir = join(this.repoRoot, '.tmp/lean-cli');
      mkdirSync(leanTmpDir, { recursive: true });
      env.TMPDIR = `${leanTmpDir}/`;
    }

    return env;
  }

  runBacktest(request: LeanCliBacktestRequest = {}): LeanCliBacktestResult {
    const { leanBin, processEnv } = this.assertPrerequisites();
    const projectName = request.projectName ?? 'aggressive_llm_momentum';
    const runId =
      request.runId ??
      `bt-${new Date()
        .toISOString()
        .replace(/[-:TZ.]/g, '')
        .slice(0, 14)}-${randomBytes(4).toString('hex')}`;
    const outputDirectory = join(this.repoRoot, 'artifacts/lean-runs', runId);
    mkdirSync(outputDirectory, { recursive: true });
    const artifactRelativeDir = `lincei-artifacts/${runId}`;
    const artifactOutputDir = `/Results/${artifactRelativeDir}`;
    const runLeanConfigPath = prepareRunLeanConfig({
      leanWorkspace: this.leanWorkspace,
      runId,
      downloadData: request.downloadData !== false,
    });
    const projectArtifactDir = join(
      this.leanWorkspace,
      projectName,
      'backtests',
      artifactRelativeDir,
    );

    const args = [
      'backtest',
      projectName,
      '--lean-config',
      runLeanConfigPath,
      '--parameter',
      'run-id',
      runId,
      '--parameter',
      'artifact-output-dir',
      artifactOutputDir,
    ];
    if (!request.noStaticMeta) {
      args.push(
        '--parameter',
        'meta-decisions-path',
        'input/meta_decisions.json',
      );
    }
    this.appendParameter(args, 'validation-mode', request.validationMode);
    this.appendParameter(
      args,
      'uses-static-meta-overlay',
      request.usesStaticMetaOverlay,
    );
    this.appendParameter(
      args,
      'uses-static-ml-predictions',
      request.usesStaticMlPredictions,
    );
    this.appendParameter(args, 'no-static-meta', request.noStaticMeta);
    this.appendParameter(args, 'no-static-ml', request.noStaticMl);
    this.appendParameter(args, 'alpha-mode', request.alphaMode);
    this.appendParameter(
      args,
      'universe-symbols',
      request.universeSymbols?.join(','),
    );
    if (request.downloadData === false) {
      args.push('--data-provider-historical', 'Local');
      this.appendParameter(args, 'backtest-start-date', '2020-01-01');
      this.appendParameter(args, 'backtest-end-date', '2021-03-31');
    } else {
      args.push('--download-data');
      this.appendParameter(args, 'backtest-start-date', '2024-01-01');
      this.appendParameter(args, 'backtest-end-date', '2025-12-31');
    }

    this.logger.log(`Starting lean backtest ${runId} (Docker)...`);
    let stdout = '';
    let stderr = '';
    try {
      stdout = execFileSync(leanBin, args, {
        cwd: this.leanWorkspace,
        encoding: 'utf8',
        maxBuffer: 32 * 1024 * 1024,
        env: processEnv,
      });
    } catch (error) {
      const execError = error as {
        stdout?: string;
        stderr?: string;
        message?: string;
      };
      stdout = execError.stdout ?? '';
      stderr = execError.stderr ?? '';
      const matchedBacktestDirectory =
        findBacktestDirectoryForRunId({
          leanWorkspace: this.leanWorkspace,
          projectName,
          runId,
        }) ??
        latestBacktestDirectory({
          leanWorkspace: this.leanWorkspace,
          projectName,
        });
      copyArtifactsFromBacktestDirectory({
        backtestDirectory: matchedBacktestDirectory,
        outputDirectory,
        runId,
      });
      const dataMonitorReportPath = copyDataMonitorReport({
        backtestDirectory: matchedBacktestDirectory,
        outputDirectory,
      });
      const latestLog = readLeanLog(matchedBacktestDirectory);
      const diagnostic = summarizeLeanCliFailure({
        stdout,
        stderr,
        logText: latestLog?.text,
      });
      writeLeanCliFailureDiagnostics({
        outputDirectory,
        runId,
        projectName,
        args,
        diagnostic,
        stdout,
        stderr,
        latestLog,
        matchedBacktestDirectory,
        dataMonitorReportPath,
      });
      this.logger.warn(`Lean CLI exited non-zero for ${runId}: ${diagnostic}`);
      throw new Error(
        `Lean CLI backtest failed for ${runId}: ${diagnostic}${
          latestLog?.path ? ` (latest log: ${latestLog.path})` : ''
        }`,
      );
    }

    if (existsSync(projectArtifactDir)) {
      cpSync(projectArtifactDir, outputDirectory, { recursive: true });
    }
    const matchedBacktestDirectory =
      findBacktestDirectoryForRunId({
        leanWorkspace: this.leanWorkspace,
        projectName,
        runId,
      }) ??
      latestBacktestDirectory({
        leanWorkspace: this.leanWorkspace,
        projectName,
      });
    copyArtifactsFromBacktestDirectory({
      backtestDirectory: matchedBacktestDirectory,
      outputDirectory,
      runId,
    });
    copyDataMonitorReport({
      backtestDirectory: matchedBacktestDirectory,
      outputDirectory,
    });
    if (!existsSync(join(outputDirectory, 'statistics.json'))) {
      if (!request.allowSummaryHydration) {
        throw new Error(
          `Lean backtest did not export host-visible artifacts for ${runId}. Expected ${projectArtifactDir}.`,
        );
      }
      this.hydrateArtifactsFromLeanBacktest(
        projectName,
        outputDirectory,
        runId,
      );
    }
    this.verifyRequiredArtifacts(outputDirectory);
    if (request.requireStrategyEvidence) {
      assertLeanRunArtifactsAccepted(outputDirectory, 'strategy-backtest');
    }

    return {
      runId,
      mode: 'lean-cli',
      outputDirectory,
      artifactRelativeDir,
      stdout,
      stderr,
    };
  }

  verifyRequiredArtifacts(outputDirectory: string): void {
    const missing = REQUIRED_ARTIFACTS.filter(
      (name) => !existsSync(join(outputDirectory, name)),
    );
    if (missing.length > 0) {
      throw new Error(
        `Lean backtest missing required artifacts in ${outputDirectory}: ${missing.join(', ')}`,
      );
    }
  }

  private hydrateArtifactsFromLeanBacktest(
    projectName: string,
    outputDirectory: string,
    runId: string,
  ): void {
    const latest = latestBacktestDirectory({
      leanWorkspace: this.leanWorkspace,
      projectName,
    });
    if (!latest) {
      return;
    }

    const summaryPath = readdirSync(latest)
      .filter((name) => name.endsWith('-summary.json'))
      .map((name) => join(latest, name))[0];
    if (summaryPath && existsSync(summaryPath)) {
      const summary = JSON.parse(readFileSync(summaryPath, 'utf8')) as {
        statistics?: Record<string, string | number>;
        runtimeStatistics?: Record<string, string | number>;
      };
      const statistics = {
        ...(summary.statistics ?? {}),
        ...(summary.runtimeStatistics ?? {}),
        leanBacktestFolder: latest,
      };
      writeFileSync(
        join(outputDirectory, 'statistics.json'),
        `${JSON.stringify(statistics, null, 2)}\n`,
        'utf8',
      );
    }

    const logPath = readdirSync(latest).find((name) =>
      name.endsWith('-log.txt'),
    );
    if (logPath) {
      cpSync(join(latest, logPath), join(outputDirectory, 'logs.txt'));
    }

    const placeholders: Record<string, unknown> = {
      runId,
      asOf: new Date().toISOString(),
      insights: [],
      events: [],
      fills: [],
      targets: [],
    };
    if (!existsSync(join(outputDirectory, 'insights.json'))) {
      writeFileSync(
        join(outputDirectory, 'insights.json'),
        `${JSON.stringify({ runId, asOf: placeholders.asOf, insights: [] }, null, 2)}\n`,
      );
    }
    if (!existsSync(join(outputDirectory, 'portfolio_targets.json'))) {
      writeFileSync(
        join(outputDirectory, 'portfolio_targets.json'),
        `${JSON.stringify(
          {
            id: `targets-${runId}`,
            leanRunId: runId,
            asOf: placeholders.asOf,
            targets: [],
            grossExposurePct: 0,
            maxSingleNamePct: 0,
            riskNotes: ['hydrated_from_lean_summary_only'],
          },
          null,
          2,
        )}\n`,
      );
    }
    if (!existsSync(join(outputDirectory, 'order_events.json'))) {
      writeFileSync(
        join(outputDirectory, 'order_events.json'),
        '{"events":[]}\n',
      );
    }
    if (!existsSync(join(outputDirectory, 'fills.json'))) {
      writeFileSync(join(outputDirectory, 'fills.json'), '{"fills":[]}\n');
    }
    if (!existsSync(join(outputDirectory, 'config.json'))) {
      writeFileSync(
        join(outputDirectory, 'config.json'),
        `${JSON.stringify(
          {
            projectName,
            algorithmVersion: 'v1',
            parameters: { runId, hydrated: true },
            exportedAt: placeholders.asOf,
          },
          null,
          2,
        )}\n`,
      );
    }
    if (!existsSync(join(outputDirectory, 'logs.txt'))) {
      writeFileSync(
        join(outputDirectory, 'logs.txt'),
        `hydrated from ${latest}\n`,
      );
    }
  }

  private appendParameter(
    args: string[],
    name: string,
    value: string | boolean | undefined,
  ): void {
    if (value === undefined) {
      return;
    }
    args.push('--parameter', name, String(value));
  }
}
