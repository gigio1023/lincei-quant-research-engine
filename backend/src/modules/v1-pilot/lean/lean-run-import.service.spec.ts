import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { LeanRun } from '../../../entities/lean-run.entity';
import { PortfolioTargetSnapshot } from '../../../entities/portfolio-target-snapshot.entity';
import { LeanRunImportService } from './lean-run-import.service';
import { LeanLocalSimulatorService } from './lean-local-simulator.service';

describe('LeanRunImportService', () => {
  let service: LeanRunImportService;
  const tempRoot = join(process.cwd(), 'tmp-test-lean-runs');

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [LeanRun, PortfolioTargetSnapshot],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([LeanRun, PortfolioTargetSnapshot]),
      ],
      providers: [LeanRunImportService, LeanLocalSimulatorService],
    }).compile();
    service = moduleRef.get(LeanRunImportService);
  });

  afterAll(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('imports_and_replays_idempotently', async () => {
    const simulator = new LeanLocalSimulatorService();
    const result = simulator.simulateRun({ resultRoot: tempRoot });
    const first = await service.importFromDirectory(result.resultDirectory);
    const second = await service.importFromDirectory(result.resultDirectory);
    expect(second.runId).toBe(first.runId);
  });

  it('does not let idempotent replay bypass strict strategy acceptance', async () => {
    const simulator = new LeanLocalSimulatorService();
    const result = simulator.simulateRun({ resultRoot: tempRoot });
    await service.importFromDirectory(result.resultDirectory, 'strict-replay');

    await expect(
      service.importFromDirectory(result.resultDirectory, 'strict-replay', {
        acceptanceMode: 'strategy-backtest',
      }),
    ).rejects.toThrow('LEAN strategy-backtest rejected');
  });

  it('rejects_missing_artifacts', async () => {
    const dir = join(tempRoot, 'missing-artifacts');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'statistics.json'), '{}', 'utf8');
    await expect(service.importFromDirectory(dir)).rejects.toThrow(
      'LEAN schema-import rejected',
    );
  });

  it('rejects_latest_import_without_marker', async () => {
    const dir = join(tempRoot, 'no-latest-marker');
    mkdirSync(dir, { recursive: true });

    await expect(service.importLatestFromArtifactsRoot(dir)).rejects.toThrow(
      'Latest LEAN run marker not found',
    );
  });

  it('rejects_unsafe_latest_marker', async () => {
    const dir = join(tempRoot, 'unsafe-latest-marker');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '.latest'), '../../outside\n', 'utf8');

    await expect(service.importLatestFromArtifactsRoot(dir)).rejects.toThrow(
      'Unsafe LEAN run id in marker',
    );
  });

  it('preserves_quantconnect_cloud_runtime_when_importing_cloud_artifacts', async () => {
    const dir = join(tempRoot, 'qc-import-test');
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, 'statistics.json'),
      JSON.stringify({
        'Total Orders': 1,
        'End Equity': 100100,
        cloudProjectId: 32077023,
        cloudBacktestId: 'ecd033aae81ec9f98e1c24b4c5a58d4c',
      }),
      'utf8',
    );
    writeFileSync(
      join(dir, 'config.json'),
      JSON.stringify({
        projectName: 'aggressive_llm_momentum',
        algorithmVersion: 'v1',
        runtime: 'quantconnect-cloud',
        mode: 'backtest',
        parameters: { 'run-id': 'qc-import-test' },
      }),
      'utf8',
    );
    writeFileSync(join(dir, 'logs.txt'), 'imported\n', 'utf8');
    writeFileSync(
      join(dir, 'insights.json'),
      JSON.stringify({ runId: 'qc-import-test', insights: [] }),
      'utf8',
    );
    writeFileSync(
      join(dir, 'portfolio_targets.json'),
      JSON.stringify({
        id: 'targets-qc-import-test',
        leanRunId: 'qc-import-test',
        asOf: '2024-12-31T00:00:00Z',
        targets: [],
        grossExposurePct: 0,
        maxSingleNamePct: 0,
        riskNotes: [],
      }),
      'utf8',
    );
    writeFileSync(
      join(dir, 'order_events.json'),
      JSON.stringify({ events: [] }),
      'utf8',
    );
    writeFileSync(
      join(dir, 'fills.json'),
      JSON.stringify({ fills: [] }),
      'utf8',
    );

    const imported = await service.importFromDirectory(dir, undefined, {
      acceptanceMode: 'schema-import',
    });

    expect(imported.runtime).toBe('quantconnect-cloud');
    expect(imported.cloudProjectId).toBe('32077023');
    expect(imported.cloudBacktestId).toBe('ecd033aae81ec9f98e1c24b4c5a58d4c');
  });
});
