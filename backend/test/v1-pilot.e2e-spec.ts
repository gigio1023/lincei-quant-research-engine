import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { databaseEntities } from '../src/data-source';
import { V1PilotModule } from '../src/modules/v1-pilot/v1-pilot.module';
import { ControlPlaneModule } from '../src/modules/control-plane/control-plane.module';
import { ReportsModule } from '../src/modules/reports/reports.module';
import { NewsModule } from '../src/modules/news/news.module';
import { LlmModule } from '../src/modules/llm/llm.module';
import { RiskGateModule } from '../src/modules/risk-gate/risk-gate.module';

describe('V1 pilot (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.LINCEI_OPENAI_ENV_FILE = '/dev/null';
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

    const preflightResponse = await request(app.getHttpServer())
      .get('/v1-pilot/live-preflight')
      .expect(200);
    expect(preflightResponse.body.status).toBe('blocked');
    expect(preflightResponse.body.blockers.length).toBeGreaterThan(0);
  });
});
