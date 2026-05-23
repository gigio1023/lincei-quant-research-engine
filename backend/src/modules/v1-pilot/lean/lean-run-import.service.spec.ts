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

  it('rejects_missing_artifacts', async () => {
    const dir = join(tempRoot, 'missing-artifacts');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'statistics.json'), '{}', 'utf8');
    await expect(service.importFromDirectory(dir)).rejects.toThrow(
      'Missing required artifact',
    );
  });
});
