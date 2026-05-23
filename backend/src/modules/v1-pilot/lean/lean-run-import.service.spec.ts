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
      'Unsafe LEAN run id in .latest',
    );
  });
});
