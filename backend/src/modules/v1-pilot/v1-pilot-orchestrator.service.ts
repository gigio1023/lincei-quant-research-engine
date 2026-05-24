/**
 * Coordinates the V1 validation loop invoked by repo scripts and the v1-pilot CLI.
 *
 * Order of operations follows SPEC.md: alpha -> LEAN backtest/import -> paper bridge
 * -> broker-write preflight. Real-money broker writes remain blocked unless a future
 * user-approved spec changes the active scope. LEAN CLI is preferred; the local
 * simulator exists so CI and dev machines without Docker/LEAN can still prove artifact flow.
 */
import { Injectable, Logger } from '@nestjs/common';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { LeanAcceptanceMode } from './lean/lean-run-acceptance';
import { FeatureSnapshotService } from './alpha/feature-snapshot.service';
import { LlmEventFeatureService } from './alpha/llm-event-feature.service';
import { NumericAlphaService } from './alpha/numeric-alpha.service';
import { LlmAlphaService } from './alpha/llm-alpha.service';
import { MetaAlphaService } from './alpha/meta-alpha.service';
import { LeanLocalSimulatorService } from './lean/lean-local-simulator.service';
import { LeanRunImportService } from './lean/lean-run-import.service';
import { LeanPaperBridgeService } from './paper/lean-paper-bridge.service';
import { LearningLoopService } from './learning/learning-loop.service';
import { LiveShadowService } from './live/live-shadow.service';
import { LivePreflightService } from './live/live-preflight.service';
import { LivePilot10UsdService } from './live/live-pilot-10usd.service';
import { MlPythonRunner } from './ml/ml-python.runner';
import { MlModelRegistryService } from './ml/ml-model-registry.service';
import { LeanCloudRunner } from './lean/lean-cloud.runner';
import { LeanCliRunner } from './lean/lean-cli.runner';
import { LeanDailyDataExportService } from './lean/lean-daily-data-export.service';
import { MarketDataIngestionService } from '../control-plane/market-data-ingestion.service';

@Injectable()
export class V1PilotOrchestratorService {
  private readonly logger = new Logger(V1PilotOrchestratorService.name);

  constructor(
    private readonly featureSnapshotService: FeatureSnapshotService,
    private readonly llmEventFeatureService: LlmEventFeatureService,
    private readonly numericAlphaService: NumericAlphaService,
    private readonly llmAlphaService: LlmAlphaService,
    private readonly metaAlphaService: MetaAlphaService,
    private readonly leanLocalSimulatorService: LeanLocalSimulatorService,
    private readonly leanRunImportService: LeanRunImportService,
    private readonly leanPaperBridgeService: LeanPaperBridgeService,
    private readonly learningLoopService: LearningLoopService,
    private readonly liveShadowService: LiveShadowService,
    private readonly livePreflightService: LivePreflightService,
    private readonly livePilot10UsdService: LivePilot10UsdService,
    private readonly mlPythonRunner: MlPythonRunner,
    private readonly mlModelRegistryService: MlModelRegistryService,
    private readonly leanCloudRunner: LeanCloudRunner,
    private readonly leanCliRunner: LeanCliRunner,
    private readonly leanDailyDataExportService: LeanDailyDataExportService,
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
  async runFullBacktest(
    options: {
      skipAlphaCycle?: boolean;
      downloadData?: boolean;
      ingestUniverseBars?: boolean;
      validationMode?: string;
      noStaticMeta?: boolean;
      noStaticMl?: boolean;
    } = {},
  ): Promise<Record<string, unknown>> {
    const repoRoot = resolve(process.cwd(), '..');
    const steps: Record<string, unknown> = {};
    const noStaticMeta = options.noStaticMeta ?? true;
    const noStaticMl = options.noStaticMl ?? true;
    const universeSymbols = this.v1UniverseSymbols();
    const shouldRunAlphaCycle =
      options.skipAlphaCycle !== true && (!noStaticMeta || !noStaticMl);
    const validationMode =
      options.validationMode ??
      (noStaticMeta && noStaticMl ? 'historical-research' : 'flow-validation');
    const usesStaticMetaOverlay = !noStaticMeta;
    const usesStaticMlPredictions = !noStaticMl;
    const alphaMode = noStaticMeta ? 'numeric-only' : 'meta-overlay';

    if (options.ingestUniverseBars !== false) {
      const windowEnd = new Date();
      const windowStart = new Date('2019-01-01T00:00:00.000Z');
      try {
        steps.marketDataIngestion = await this.marketDataIngestionService.poll(
          {
            force: true,
            datasetId: 'v1-lean-universe',
            symbols: universeSymbols,
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
      steps.leanDailyDataExport =
        await this.leanDailyDataExportService.exportMissingDailyEquityData({
          repoRoot,
          datasetId: 'v1-lean-universe',
          symbols: universeSymbols,
        });
      steps.leanDailyDataHydration =
        await this.leanDailyDataExportService.hydrateMarketDataFromLeanDailyData(
          {
            repoRoot,
            datasetId: 'v1-lean-universe',
            symbols: universeSymbols,
          },
        );
    }

    if (shouldRunAlphaCycle) {
      steps.alphaCycle = await this.runAlphaCycle();
    }

    if (validationMode === 'flow-validation') {
      this.logger.warn(
        '[v1-pilot] validationMode=flow-validation: static Nest alpha/ML overlay is pipeline proof only, not historical performance validation.',
      );
    }

    const leanResult = this.leanCliRunner.runBacktest({
      downloadData: options.downloadData !== false,
      validationMode,
      usesStaticMetaOverlay,
      usesStaticMlPredictions,
      noStaticMeta,
      noStaticMl,
      alphaMode,
      universeSymbols,
      requireStrategyEvidence: true,
    });
    steps.leanBacktest = leanResult;

    const artifactsRoot = join(repoRoot, 'artifacts/lean-runs');
    writeFileSync(
      join(artifactsRoot, '.latest'),
      `${leanResult.runId}\n`,
      'utf8',
    );
    steps.import = await this.leanRunImportService.importFromDirectory(
      leanResult.outputDirectory,
      undefined,
      { acceptanceMode: 'strategy-backtest' },
    );

    return {
      status: 'completed',
      runId: leanResult.runId,
      mode: leanResult.mode,
      validation: {
        validationMode,
        usesStaticMetaOverlay,
        usesStaticMlPredictions,
        noStaticMeta,
        noStaticMl,
        alphaMode,
      },
      steps,
    };
  }

  getMlModelStatus(): { status: string; modelName?: string; blocker?: string } {
    const readiness = this.mlModelRegistryService.getModelReadiness();
    return {
      status: readiness.status,
      modelName: readiness.modelName,
      blocker: readiness.blocker,
    };
  }

  async runAlphaCycle(): Promise<{
    featureCount: number;
    numericCount: number;
    llmFeatureCount: number;
    llmCount: number;
    metaCount: number;
  }> {
    const snapshots =
      await this.featureSnapshotService.buildSnapshotsForUniverse(
        'v1-lean-universe',
        { allowSynthetic: false },
      );
    const numeric = await this.numericAlphaService.buildDecisions(snapshots);
    const llmFeatures = await this.llmEventFeatureService.buildFeatures(
      snapshots,
      numeric,
    );
    const llm = await this.llmAlphaService.buildDecisions(
      snapshots,
      numeric,
      llmFeatures,
    );
    const meta = await this.metaAlphaService.combine(snapshots, numeric, llm);
    return {
      featureCount: snapshots.length,
      numericCount: numeric.length,
      llmFeatureCount: llmFeatures.length,
      llmCount: llm.length,
      metaCount: meta.length,
    };
  }

  private v1UniverseSymbols(): string[] {
    const configured = process.env.V1_UNIVERSE_SYMBOLS;
    if (!configured) {
      return ['SPY', 'QQQ', 'IWM', 'TLT', 'GLD'];
    }
    const symbols = configured
      .split(',')
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean);
    return symbols.length > 0 ? symbols : ['SPY', 'QQQ', 'IWM', 'TLT', 'GLD'];
  }

  async runLeanBacktest(
    projectName: string,
  ): Promise<{ runId: string; mode: string }> {
    if (projectName !== 'aggressive_llm_momentum') {
      throw new Error(`Unsupported LEAN project: ${projectName}`);
    }

    const repoRoot = resolve(process.cwd(), '..');
    const preferSimulator = process.env.LEAN_ALLOW_SIMULATOR === 'true';

    if (preferSimulator) {
      const workspaceRoot = join(repoRoot, 'engines/lean', projectName);
      const metaDecisionsPath = join(
        workspaceRoot,
        'input/meta_decisions.json',
      );
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
      writeFileSync(
        join(artifactsRoot, '.latest'),
        `${result.runId}\n`,
        'utf8',
      );
      return { runId: result.runId, mode: 'simulator' };
    }

    const result = this.leanCliRunner.runBacktest({ projectName });
    const artifactsRoot = join(repoRoot, 'artifacts/lean-runs');
    writeFileSync(join(artifactsRoot, '.latest'), `${result.runId}\n`, 'utf8');
    return { runId: result.runId, mode: result.mode };
  }

  async runQuantConnectCloudBacktest(
    projectName = 'aggressive_llm_momentum',
    options: { push?: boolean } = {},
  ) {
    return this.leanCloudRunner.runCloudBacktest({
      projectName,
      push: options.push,
    });
  }

  async syncQuantConnectObjectStore(key: string, sourcePath: string) {
    return this.leanCloudRunner.syncObjectStore(key, sourcePath);
  }

  async importLeanRun(
    target: string,
    options: { acceptanceMode?: LeanAcceptanceMode } = {
      acceptanceMode: 'strategy-backtest',
    },
  ) {
    const repoRoot = resolve(process.cwd(), '..');
    const artifactsRoot = join(repoRoot, 'artifacts/lean-runs');
    if (target === 'latest') {
      if (!existsSync(join(artifactsRoot, '.latest'))) {
        throw new Error(
          'No latest LEAN run marker found. Run lean-backtest or run-full-backtest first.',
        );
      }
      return this.leanRunImportService.importLatestFromArtifactsRoot(
        artifactsRoot,
        options,
      );
    }
    return this.leanRunImportService.importFromDirectory(
      join(artifactsRoot, target),
      undefined,
      options,
    );
  }

  async runPaperCycle() {
    return this.leanPaperBridgeService.runPaperCycle();
  }

  async runLiveShadow() {
    return this.liveShadowService.runLiveShadow();
  }

  async runLearningLoop() {
    return this.learningLoopService.runLearningLoop();
  }

  async runLivePreflight() {
    return this.livePreflightService.runPreflight();
  }

  async runLivePilot10Usd(confirmRealMoney: boolean) {
    return this.livePilot10UsdService.execute({ confirmRealMoney });
  }
}
