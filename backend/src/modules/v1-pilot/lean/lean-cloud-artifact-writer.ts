import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export type LeanCloudArtifactWriteInput = {
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
};

export class LeanCloudArtifactWriter {
  writeCloudArtifacts(input: LeanCloudArtifactWriteInput): void {
    const manifest = {
      runtime: 'quantconnect-cloud',
      mode: 'backtest',
      ...input,
      startedAt: input.startedAt.toISOString(),
      completedAt: input.completedAt.toISOString(),
    };
    this.writeJson(
      join(input.resultDirectory, 'cloud-run-manifest.json'),
      manifest,
    );
    this.writeJsonIfMissing(join(input.resultDirectory, 'statistics.json'), {
      cloudBacktestId: input.cloudBacktestId ?? '',
      status: input.status,
    });
    this.writeJson(join(input.resultDirectory, 'config.json'), {
      projectName: input.projectName,
      algorithmVersion: 'v1',
      runtime: 'quantconnect-cloud',
      mode: 'backtest',
      parameters: input.parameters,
    });
    writeFileSync(
      join(input.resultDirectory, 'logs.txt'),
      `${input.stdout}\n${input.stderr}\n`,
      'utf8',
    );
    this.writeJsonIfMissing(join(input.resultDirectory, 'insights.json'), {
      runId: input.runId,
      insights: [],
    });
    this.writeJsonIfMissing(
      join(input.resultDirectory, 'portfolio_targets.json'),
      {
        id: `targets-${input.runId}`,
        leanRunId: input.runId,
        asOf: input.completedAt.toISOString(),
        targets: [],
        grossExposurePct: 0,
        maxSingleNamePct: 0,
        riskNotes: ['cloud_artifact_import_pending'],
      },
    );
    this.writeJsonIfMissing(join(input.resultDirectory, 'order_events.json'), {
      events: [],
    });
    this.writeJsonIfMissing(join(input.resultDirectory, 'fills.json'), {
      fills: [],
    });
  }

  writeLatestMarker(
    artifactsRoot: string,
    markerName: string,
    runId: string,
  ): void {
    mkdirSync(artifactsRoot, { recursive: true });
    writeFileSync(join(artifactsRoot, markerName), `${runId}\n`, 'utf8');
  }

  private writeJson(path: string, payload: unknown): void {
    writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }

  private writeJsonIfMissing(path: string, payload: unknown): void {
    if (existsSync(path)) {
      return;
    }
    this.writeJson(path, payload);
  }
}
