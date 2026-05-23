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
  ) {}

  async runAlphaCycle(): Promise<{
    featureCount: number;
    numericCount: number;
    llmCount: number;
    metaCount: number;
  }> {
    const snapshots = await this.featureSnapshotService.buildSnapshotsForUniverse();
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
      const result = this.leanLocalSimulatorService.simulateRun({
        projectName,
        workspaceRoot: join(repoRoot, 'engines/lean', projectName),
        resultRoot: join(repoRoot, 'artifacts/lean-runs'),
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
