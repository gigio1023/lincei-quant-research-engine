/**
 * Coordinates the V1 vertical slice invoked by repo scripts and the v1-pilot CLI.
 *
 * Order of operations matches docs/v1-live-pilot-spec: alpha → LEAN backtest/import →
 * paper bridge → live preflight → optional $10 pilot. LEAN CLI is preferred; the local
 * simulator exists so CI and dev machines without Docker/Lean can still prove artifact flow.
 */
import { Injectable } from '@nestjs/common';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';
import { LeanAcceptanceMode } from './lean/lean-run-acceptance';
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
    const shouldRunAlphaCycle =
      options.skipAlphaCycle !== true && (!noStaticMeta || !noStaticMl);
    const validationMode =
      options.validationMode ??
      (noStaticMeta && noStaticMl ? 'historical-research' : 'flow-validation');
    const usesStaticMetaOverlay = !noStaticMeta;
    const usesStaticMlPredictions = !noStaticMl;
    const alphaMode = noStaticMeta ? 'numeric-only' : 'meta-overlay';

    if (
      options.ingestUniverseBars === true ||
      (options.ingestUniverseBars !== false && shouldRunAlphaCycle)
    ) {
      const windowEnd = new Date();
      const windowStart = new Date(
        windowEnd.getTime() - 400 * 24 * 60 * 60_000,
      );
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

    if (shouldRunAlphaCycle) {
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
      noStaticMeta,
      noStaticMl,
      alphaMode,
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
    llmCount: number;
    metaCount: number;
  }> {
    const snapshots =
      await this.featureSnapshotService.buildSnapshotsForUniverse(
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

  async runLivePreflight() {
    return this.livePreflightService.runPreflight();
  }

  async runLivePilot10Usd(confirmRealMoney: boolean) {
    return this.livePilot10UsdService.execute({ confirmRealMoney });
  }
}
