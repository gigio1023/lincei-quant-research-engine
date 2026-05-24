import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { databaseEntities } from '../src/data-source';
import { LivePilotStatusRecord } from '../src/entities/live-pilot-status.entity';
import { V1PilotModule } from '../src/modules/v1-pilot/v1-pilot.module';
import { ControlPlaneModule } from '../src/modules/control-plane/control-plane.module';
import { ReportsModule } from '../src/modules/reports/reports.module';
import { NewsModule } from '../src/modules/news/news.module';
import { LlmModule } from '../src/modules/llm/llm.module';
import { RiskGateModule } from '../src/modules/risk-gate/risk-gate.module';

describe('V1 pilot (e2e)', () => {
  let app: INestApplication;
  let livePilotStatusRepository: Repository<LivePilotStatusRecord>;

  beforeAll(async () => {
    process.env.LINCEI_OPENAI_ENV_FILE = '/dev/null';
    process.env.ALLOW_SYNTHETIC_FEATURES = 'true';
    delete process.env.OPENAI_API_KEY;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: databaseEntities,
          synchronize: true,
          logging: false,
        }),
        ReportsModule,
        NewsModule,
        LlmModule,
        RiskGateModule,
        ControlPlaneModule,
        V1PilotModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    livePilotStatusRepository = moduleFixture.get<
      Repository<LivePilotStatusRecord>
    >(getRepositoryToken(LivePilotStatusRecord));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('runs_alpha_cycle_and_blocks_live_preflight_by_default', async () => {
    const alphaResponse = await request(app.getHttpServer())
      .post('/v1-pilot/alpha-cycle')
      .expect(201);
    expect(alphaResponse.body.featureCount).toBeGreaterThan(0);

    const statusCountBefore = await livePilotStatusRepository.count();
    const statusResponse = await request(app.getHttpServer())
      .get('/v1-pilot/status')
      .expect(200);
    expect(await livePilotStatusRepository.count()).toBe(statusCountBefore);
    expect(statusResponse.body.alpha.featureSnapshotCount).toBeGreaterThan(0);
    expect(
      statusResponse.body.stages.map((stage: { key: string }) => stage.key),
    ).toEqual(
      expect.arrayContaining([
        'feature_store',
        'alpha_decisions',
        'lean_backtest',
        'portfolio_targets',
        'paper_execution',
        'broker_read_only',
        'live_preflight',
      ]),
    );
    expect(statusResponse.body.preflight.blockers).toContain(
      'Live preflight has not been run for the latest state.',
    );

    const preflightResponse = await request(app.getHttpServer())
      .get('/v1-pilot/live-preflight')
      .expect(200);
    expect(preflightResponse.body.status).toBe('blocked');
    expect(preflightResponse.body.blockers.length).toBeGreaterThan(0);
  });
});
