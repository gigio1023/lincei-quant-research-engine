/**
 * Coordinates the V1 vertical slice invoked by repo scripts and the v1-pilot CLI.
 *
 * Order of operations matches docs/v1-live-pilot-spec: alpha → LEAN backtest/import →
 * paper bridge → live preflight → optional $10 pilot. LEAN CLI is preferred; the local
 * simulator exists so CI and dev machines without Docker/Lean can still prove artifact flow.
 */
import { Injectable } from '@nestjs/common';
import { execSync } from 'child_process';
import { existsSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { FeatureSnapshotService } from './alpha/feature-snapshot.service';
import { NumericAlphaService } from './alpha/numeric-alpha.service';
import { LlmAlphaService } from './alpha/llm-alpha.service';
import { MetaAlphaService } from './alpha/meta-alpha.service';
import { LeanLocalSimulatorService } from './lean/lean-local-simulator.service';
import { LeanRunImportService } from './lean/lean-run-import.service';
import { LeanPaperBridgeService } from './paper/lean-paper-bridge.service';
import { LivePreflightService } from './live/live-preflight.service';
import { LivePilot10UsdService } from './live/live-pilot-10usd.service';
import { MlPythonRunner } from './ml/ml-python.runner';
import { MlModelRegistryService } from './ml/ml-model-registry.service';
import { LeanCliRunner } from './lean/lean-cli.runner';
import { MarketDataIngestionService } from '../control-plane/market-data-ingestion.service';

@Injectable()
export class V1PilotOrchestratorService {
  constructor(
    private readonly featureSnapshotService: FeatureSnapshotService,
    private readonly numericAlphaService: NumericAlphaService,
    private readonly llmAlphaService: LlmAlphaService,
    private readonly metaAlphaService: MetaAlphaService,
    private readonly leanLocalSimulatorService: LeanLocalSimulatorService,
    private readonly leanRunImportService: LeanRunImportService,
    private readonly leanPaperBridgeService: LeanPaperBridgeService,
    private readonly livePreflightService: LivePreflightService,
    private readonly livePilot10UsdService: LivePilot10UsdService,
    private readonly mlPythonRunner: MlPythonRunner,
    private readonly mlModelRegistryService: MlModelRegistryService,
    private readonly leanCliRunner: LeanCliRunner,
    private readonly marketDataIngestionService: MarketDataIngestionService,
  ) {}

  async trainMlBaseline(): Promise<Record<string, unknown>> {
    return this.mlPythonRunner.runTraining();
  }

  async downloadExternalBaselines(): Promise<Record<string, unknown>> {
    return this.mlPythonRunner.runExternalBaselineDownload();
  }

  /**
   * End-to-end production backtest: optional Stooq ingest → alpha → Lean CLI → DB import.
   * Does not fall back to the local simulator.
   */
  async runFullBacktest(options: {
    skipAlphaCycle?: boolean;
    downloadData?: boolean;
    ingestUniverseBars?: boolean;
    validationMode?: string;
    noStaticMeta?: boolean;
    noStaticMl?: boolean;
  } = {}): Promise<Record<string, unknown>> {
    const repoRoot = resolve(process.cwd(), '..');
    const steps: Record<string, unknown> = {};
    const validationMode =
      options.validationMode ??
      (options.noStaticMeta || options.noStaticMl
        ? 'historical-research'
        : !options.skipAlphaCycle
          ? 'flow-validation'
          : undefined);
    const usesStaticMetaOverlay =
      !options.skipAlphaCycle && !options.noStaticMeta;
    const usesStaticMlPredictions = !options.noStaticMl;
    const alphaMode = options.noStaticMeta ? 'numeric-only' : 'meta-overlay';

    if (options.ingestUniverseBars !== false) {
      const windowEnd = new Date();
      const windowStart = new Date(windowEnd.getTime() - 400 * 24 * 60 * 60_000);
      try {
        steps.marketDataIngestion = await this.marketDataIngestionService.poll(
          {
            force: true,
            datasetId: 'v1-lean-universe',
            symbols: ['SPY', 'QQQ', 'IWM', 'TLT', 'GLD'],
            provider: 'stooq',
            timeframe: '1d',
            currency: 'USD',
            windowStart: windowStart.toISOString(),
            windowEnd: windowEnd.toISOString(),
          },
          'v1-full-backtest',
        );
      } catch (error) {
        steps.marketDataIngestion = {
          status: 'skipped',
          reason: error instanceof Error ? error.message : 'ingestion failed',
        };
      }
    }

    if (!options.skipAlphaCycle) {
      steps.alphaCycle = await this.runAlphaCycle();
    }

    if (validationMode === 'flow-validation') {
      console.warn(
        '[v1-pilot] validationMode=flow-validation: static Nest alpha/ML overlay is pipeline proof only, not historical performance validation.',
      );
    }

    const leanResult = this.leanCliRunner.runBacktest({
      downloadData: options.downloadData !== false,
      validationMode,
      usesStaticMetaOverlay,
      usesStaticMlPredictions,
      noStaticMeta: options.noStaticMeta,
      noStaticMl: options.noStaticMl,
      alphaMode,
    });
    steps.leanBacktest = leanResult;

    const artifactsRoot = join(repoRoot, 'artifacts/lean-runs');
    writeFileSync(join(artifactsRoot, '.latest'), `${leanResult.runId}\n`, 'utf8');
    steps.import = await this.leanRunImportService.importFromDirectory(
      leanResult.outputDirectory,
    );

    return {
      status: 'completed',
      runId: leanResult.runId,
      mode: leanResult.mode,
      validation: {
        validationMode,
        usesStaticMetaOverlay,
        usesStaticMlPredictions,
        noStaticMeta: options.noStaticMeta ?? false,
        noStaticMl: options.noStaticMl ?? false,
        alphaMode,
      },
      steps,
    };
  }

  getMlModelStatus(): { status: string; modelName?: string } {
    const registry = this.mlModelRegistryService.getRegistry();
    if (!registry) {
      return { status: 'missing' };
    }
    return { status: registry.status, modelName: registry.modelName };
  }

  async runAlphaCycle(): Promise<{
    featureCount: number;
    numericCount: number;
    llmCount: number;
    metaCount: number;
  }> {
    const snapshots = await this.featureSnapshotService.buildSnapshotsForUniverse(
      'v1-lean-universe',
      { allowSynthetic: false },
    );
    const numeric = await this.numericAlphaService.buildDecisions(snapshots);
    const llm = await this.llmAlphaService.buildDecisions(snapshots, numeric);
    const meta = await this.metaAlphaService.combine(snapshots, numeric, llm);
    return {
      featureCount: snapshots.length,
      numericCount: numeric.length,
      llmCount: llm.length,
      metaCount: meta.length,
    };
  }

  async runLeanBacktest(projectName: string): Promise<{ runId: string; mode: string }> {
    if (projectName !== 'aggressive_llm_momentum') {
      throw new Error(`Unsupported LEAN project: ${projectName}`);
    }

    const repoRoot = resolve(process.cwd(), '..');
    const leanConfig = join(repoRoot, 'engines/lean/lean.json');
    const preferSimulator = process.env.LEAN_ALLOW_SIMULATOR === 'true';

    if (preferSimulator) {
      const workspaceRoot = join(repoRoot, 'engines/lean', projectName);
      const metaDecisionsPath = join(workspaceRoot, 'input/meta_decisions.json');
      const result = this.leanLocalSimulatorService.simulateRun({
        projectName,
        workspaceRoot,
        resultRoot: join(repoRoot, 'artifacts/lean-runs'),
        metaDecisionsPath: existsSync(metaDecisionsPath)
          ? metaDecisionsPath
          : join(workspaceRoot, 'input/meta_decisions.json.example'),
      });
      const artifactsRoot = join(repoRoot, 'artifacts/lean-runs');
      mkdirSync(artifactsRoot, { recursive: true });
      writeFileSync(join(artifactsRoot, '.latest'), `${result.runId}\n`, 'utf8');
      return { runId: result.runId, mode: 'simulator' };
    }

    if (existsSync(leanConfig)) {
      try {
        const result = this.leanCliRunner.runBacktest({ projectName });
        const artifactsRoot = join(repoRoot, 'artifacts/lean-runs');
        writeFileSync(join(artifactsRoot, '.latest'), `${result.runId}\n`, 'utf8');
        return { runId: result.runId, mode: result.mode };
      } catch (error) {
        if (process.env.LEAN_STRICT_CLI !== 'false') {
          throw error;
        }
      }
    }

    const leanCli = process.env.LEAN_CLI_PATH ?? 'lean';
    try {
      execSync(`${leanCli} backtest "${projectName}"`, {
        cwd: join(repoRoot, 'engines/lean'),
        stdio: 'pipe',
      });
      const artifactsRoot = join(repoRoot, 'artifacts/lean-runs');
      const latestRunId = this.findLatestRunDirectory(artifactsRoot);
      writeFileSync(join(artifactsRoot, '.latest'), `${latestRunId}\n`, 'utf8');
      return { runId: latestRunId, mode: 'lean-cli' };
    } catch (error) {
      const workspaceRoot = join(repoRoot, 'engines/lean', projectName);
      const metaDecisionsPath = join(workspaceRoot, 'input/meta_decisions.json');
      const result = this.leanLocalSimulatorService.simulateRun({
        projectName,
        workspaceRoot,
        resultRoot: join(repoRoot, 'artifacts/lean-runs'),
        metaDecisionsPath: existsSync(metaDecisionsPath)
          ? metaDecisionsPath
          : join(workspaceRoot, 'input/meta_decisions.json.example'),
      });
      const artifactsRoot = join(repoRoot, 'artifacts/lean-runs');
      mkdirSync(artifactsRoot, { recursive: true });
      writeFileSync(join(artifactsRoot, '.latest'), `${result.runId}\n`, 'utf8');
      return {
        runId: result.runId,
        mode: `simulator:${error instanceof Error ? error.message : 'lean-cli-unavailable'}`,
      };
    }
  }

  async importLeanRun(target: string) {
    const repoRoot = resolve(process.cwd(), '..');
    const artifactsRoot = join(repoRoot, 'artifacts/lean-runs');
    if (target === 'latest') {
      if (!existsSync(join(artifactsRoot, '.latest'))) {
        const simulated = await this.runLeanBacktest('aggressive_llm_momentum');
        return this.leanRunImportService.importFromDirectory(
          join(artifactsRoot, simulated.runId),
        );
      }
      return this.leanRunImportService.importLatestFromArtifactsRoot(artifactsRoot);
    }
    return this.leanRunImportService.importFromDirectory(
      join(artifactsRoot, target),
    );
  }

  async runPaperCycle() {
    return this.leanPaperBridgeService.runPaperCycle();
  }

  async runLivePreflight() {
    return this.livePreflightService.runPreflight();
  }

  async runLivePilot10Usd(confirmRealMoney: boolean) {
    return this.livePilot10UsdService.execute({ confirmRealMoney });
  }

  private findLatestRunDirectory(artifactsRoot: string): string {
    if (!existsSync(artifactsRoot)) {
      throw new Error(`Artifacts root not found: ${artifactsRoot}`);
    }
    const entries = readdirSync(artifactsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    const latest = entries[entries.length - 1];
    if (!latest) {
      throw new Error('No LEAN run directories found.');
    }
    return latest;
  }
}
