import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { AutonomousRun } from '../src/entities/autonomous-run.entity';
import { BudgetEnvelope } from '../src/entities/budget-envelope.entity';
import { InvestmentProposal } from '../src/entities/investment-proposal.entity';
import { ResearchRun } from '../src/entities/research-run.entity';
import { RiskEvaluation } from '../src/entities/risk-evaluation.entity';
import { ControlPlaneModule } from '../src/modules/control-plane/control-plane.module';

describe('ControlPlane research provenance (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [
            AutonomousRun,
            BudgetEnvelope,
            InvestmentProposal,
            ResearchRun,
            RiskEvaluation,
          ],
          synchronize: true,
          logging: false,
        }),
        ControlPlaneModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates a research run before creating and evaluating a proposal', async () => {
    const generatedAt = new Date(Date.now() - 60_000).toISOString();
    const marketDataTimestamp = new Date(Date.now() - 5 * 60_000).toISOString();

    const budgetResponse = await request(app.getHttpServer())
      .post('/control-plane/budgets')
      .send({
        name: 'Aggressive dry-run budget',
        totalBudget: 10_000_000,
        mode: 'dry_run',
      })
      .expect(201);

    const researchRunResponse = await request(app.getHttpServer())
      .post('/control-plane/research-runs')
      .send({
        budgetEnvelopeId: budgetResponse.body.id,
        objective: 'Find a liquid long-only allocation candidate',
        strategyFamily: 'momentum',
        hypothesis: 'Recent relative strength can outperform the benchmark.',
        datasetRefs: [
          {
            id: 'krx-daily-bars',
            source: 'sample',
            windowStart: '2025-01-01',
            windowEnd: '2026-05-22',
            availabilityTimestamp: '2026-05-22T23:50:00.000Z',
          },
        ],
        featureRefs: ['close_20d_return', 'volatility_20d'],
        timestampLagRules: ['Signals use data available before proposal time.'],
        noLookaheadChecked: true,
        benchmark: 'KOSPI',
        costModel: '10bps fixed transaction cost',
        slippageModel: '5bps notional slippage',
        validationWindow: {
          start: '2026-01-01',
          end: '2026-05-22',
        },
        backtestMetrics: {
          totalReturnPct: 8.2,
          benchmarkReturnPct: 3.1,
          maxDrawdownPct: 4.3,
          sharpeRatio: 1.1,
          turnoverPct: 22,
          tradeCount: 12,
        },
        artifactRefs: ['artifacts/research-runs/momentum-v1/report.md'],
        artifactHashes: {
          'artifacts/research-runs/momentum-v1/report.md': 'sha256:test',
        },
        knownFailureModes: ['Trend reversal can cause delayed exits.'],
      })
      .expect(201);

    expect(researchRunResponse.body.brokerExecutionEnabled).toBe(false);
    expect(researchRunResponse.body.liveTradingEnabled).toBe(false);

    const proposalResponse = await request(app.getHttpServer())
      .post('/control-plane/proposals')
      .send({
        budgetEnvelopeId: budgetResponse.body.id,
        researchRunId: researchRunResponse.body.id,
        strategyId: 'momentum-v1',
        ruleId: 'long-only-breakout',
        generatedAt,
        marketDataTimestamp,
        portfolioSnapshot: {
          currency: 'KRW',
          equity: 10_000_000,
          cash: 10_000_000,
          grossExposurePct: 0,
        },
        orders: [
          {
            symbol: '005930',
            assetClass: 'domestic_stock',
            side: 'BUY',
            orderType: 'MARKET',
            notional: 500_000,
            targetPositionPct: 5,
          },
        ],
        thesis: 'Momentum dry-run proposal from a persisted research run.',
      })
      .expect(201);

    expect(proposalResponse.body.researchRunId).toBe(
      researchRunResponse.body.id,
    );

    const evaluationResponse = await request(app.getHttpServer())
      .post(
        `/control-plane/proposals/${proposalResponse.body.id}/evaluate-risk`,
      )
      .expect(201);

    expect(evaluationResponse.body.decision).toBe('ALLOW');
    expect(evaluationResponse.body.requestSnapshot.researchRunId).toBe(
      researchRunResponse.body.id,
    );
    expect(evaluationResponse.body.brokerExecutionEnabled).toBe(false);

    const statusResponse = await request(app.getHttpServer())
      .get('/control-plane/status')
      .expect(200);

    expect(statusResponse.body.readiness).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'researchRunLedgerReady',
          ready: true,
        }),
      ]),
    );
  });

  it('rejects proposals without a research run id', async () => {
    await request(app.getHttpServer())
      .post('/control-plane/proposals')
      .send({
        strategyId: 'momentum-v1',
        ruleId: 'long-only-breakout',
        generatedAt: '2026-05-22T23:59:00.000Z',
        marketDataTimestamp: '2026-05-22T23:55:00.000Z',
        portfolioSnapshot: {
          currency: 'KRW',
          equity: 10_000_000,
          cash: 10_000_000,
          grossExposurePct: 0,
        },
        orders: [],
      })
      .expect(400);
  });

  it('runs the deterministic baseline research endpoint', async () => {
    const budgetResponse = await request(app.getHttpServer())
      .post('/control-plane/budgets')
      .send({
        name: 'Baseline runner budget',
        totalBudget: 12_000_000,
        mode: 'dry_run',
      })
      .expect(201);

    const researchRunResponse = await request(app.getHttpServer())
      .post('/control-plane/research-runs/run-baseline')
      .send({
        budgetEnvelopeId: budgetResponse.body.id,
        objective: 'Run baseline research through HTTP',
      })
      .expect(201);

    expect(researchRunResponse.body.budgetEnvelopeId).toBe(
      budgetResponse.body.id,
    );
    expect(researchRunResponse.body.status).toBe('proposal_ready');
    expect(researchRunResponse.body.advanceEligible).toBe(true);
    expect(researchRunResponse.body.noLookaheadChecked).toBe(true);
    expect(researchRunResponse.body.backtestMetrics.tradeCount).toBeGreaterThan(
      0,
    );
    expect(researchRunResponse.body.artifactRefs).toEqual(
      expect.arrayContaining([
        expect.stringContaining('/run-input.json'),
        expect.stringContaining('/metrics.json'),
        expect.stringContaining('/report.md'),
      ]),
    );
    expect(
      researchRunResponse.body.artifactHashes[
        researchRunResponse.body.artifactRefs[0]
      ],
    ).toMatch(/^sha256:/);
    expect(researchRunResponse.body.brokerExecutionEnabled).toBe(false);
    expect(researchRunResponse.body.liveTradingEnabled).toBe(false);
  });
});
