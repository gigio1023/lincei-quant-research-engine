import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as request from 'supertest';
import { AutonomousRun } from '../src/entities/autonomous-run.entity';
import { AutonomousRunSchedule } from '../src/entities/autonomous-run-schedule.entity';
import { BrokerFill } from '../src/entities/broker-fill.entity';
import { BrokerSnapshot } from '../src/entities/broker-snapshot.entity';
import { BudgetEnvelope } from '../src/entities/budget-envelope.entity';
import { ExecutionControlState } from '../src/entities/execution-control-state.entity';
import { InvestmentProposal } from '../src/entities/investment-proposal.entity';
import { OrderPlanApproval } from '../src/entities/order-plan-approval.entity';
import { PaperAccountEvent } from '../src/entities/paper-account-event.entity';
import { PaperAccount } from '../src/entities/paper-account.entity';
import { PaperOrderPlan } from '../src/entities/paper-order-plan.entity';
import { PaperReservationHoldRecord } from '../src/entities/paper-reservation-hold.entity';
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
            AutonomousRunSchedule,
            BrokerFill,
            BrokerSnapshot,
            BudgetEnvelope,
            ExecutionControlState,
            InvestmentProposal,
            OrderPlanApproval,
            PaperAccountEvent,
            PaperAccount,
            PaperOrderPlan,
            PaperReservationHoldRecord,
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

  it('advances an autonomous run through research proposal and risk', async () => {
    const budgetResponse = await request(app.getHttpServer())
      .post('/control-plane/budgets')
      .send({
        name: 'Autonomous e2e budget',
        totalBudget: 10_000_000,
        mode: 'dry_run',
      })
      .expect(201);

    const runResponse = await request(app.getHttpServer())
      .post('/control-plane/runs')
      .send({
        objective: 'Autonomously research and prepare a dry-run allocation',
        budgetEnvelopeId: budgetResponse.body.id,
      })
      .expect(201);

    expect(runResponse.body.status).toBe('idle');
    expect(runResponse.body.budgetEnvelopeId).toBe(budgetResponse.body.id);

    const advancedResponse = await request(app.getHttpServer())
      .post(`/control-plane/runs/${runResponse.body.id}/advance`)
      .send({ attemptPaperExecution: false })
      .expect(201);

    expect(advancedResponse.body.status).toBe('risk_checked');
    expect(advancedResponse.body.researchRunId).toEqual(expect.any(Number));
    expect(advancedResponse.body.proposalId).toEqual(expect.any(Number));
    expect(advancedResponse.body.riskEvaluationId).toEqual(expect.any(Number));
    expect(advancedResponse.body.nextAction).toContain('signed paper approval');
    expect(advancedResponse.body.timeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ stage: 'researching' }),
        expect.objectContaining({ stage: 'proposed' }),
        expect.objectContaining({ stage: 'risk_checked' }),
      ]),
    );

    const proposalsResponse = await request(app.getHttpServer())
      .get('/control-plane/proposals')
      .expect(200);
    const autonomousProposal = proposalsResponse.body.find(
      (proposal: { id: number }) =>
        proposal.id === advancedResponse.body.proposalId,
    );
    expect(autonomousProposal).toEqual(
      expect.objectContaining({
        actor: 'scheduler',
        brokerExecutionEnabled: false,
      }),
    );
  });

  it('ticks an autonomous run schedule through the same safe advance path', async () => {
    const budgetResponse = await request(app.getHttpServer())
      .post('/control-plane/budgets')
      .send({
        name: 'Scheduled autonomous e2e budget',
        totalBudget: 10_000_000,
        mode: 'dry_run',
      })
      .expect(201);

    const scheduleResponse = await request(app.getHttpServer())
      .post('/control-plane/run-schedules')
      .send({
        budgetEnvelopeId: budgetResponse.body.id,
        objective: 'Tick scheduled autonomous research',
        cadenceMinutes: 30,
        nextRunAt: new Date(Date.now() - 60_000).toISOString(),
      })
      .expect(201);

    expect(scheduleResponse.body.enabled).toBe(true);
    expect(scheduleResponse.body.attemptPaperExecution).toBe(false);
    expect(scheduleResponse.body.brokerExecutionEnabled).toBe(false);

    await request(app.getHttpServer())
      .post(`/control-plane/run-schedules/${scheduleResponse.body.id}/tick`)
      .send({
        force: 'false',
      })
      .expect(400);

    const tickResponse = await request(app.getHttpServer())
      .post(`/control-plane/run-schedules/${scheduleResponse.body.id}/tick`)
      .send({
        leaseOwner: 'e2e-scheduler',
        attemptPaperExecution: false,
      })
      .expect(201);

    expect(tickResponse.body.status).toBe('risk_checked');
    expect(tickResponse.body.scheduleId).toBe(scheduleResponse.body.id);
    expect(tickResponse.body.cycleKey).toContain(
      `schedule:${scheduleResponse.body.id}:`,
    );
    expect(tickResponse.body.researchRunId).toEqual(expect.any(Number));
    expect(tickResponse.body.proposalId).toEqual(expect.any(Number));
    expect(tickResponse.body.riskEvaluationId).toEqual(expect.any(Number));

    const schedulesResponse = await request(app.getHttpServer())
      .get('/control-plane/run-schedules')
      .expect(200);
    const updatedSchedule = schedulesResponse.body.find(
      (schedule: { id: number }) => schedule.id === scheduleResponse.body.id,
    );
    expect(updatedSchedule).toEqual(
      expect.objectContaining({
        lastRunId: tickResponse.body.id,
        leaseOwner: null,
        leaseExpiresAt: null,
        liveTradingEnabled: false,
      }),
    );

    const workerStatusResponse = await request(app.getHttpServer())
      .get('/control-plane/run-schedules/worker-status')
      .expect(200);
    expect(workerStatusResponse.body).toEqual(
      expect.objectContaining({
        enabled: false,
        workerId: expect.any(String),
        maxSchedulesPerTick: expect.any(Number),
        leaseTtlSeconds: expect.any(Number),
      }),
    );
  });

  it('paper executes an allowed proposal without broker access', async () => {
    const generatedAt = new Date(Date.now() - 60_000).toISOString();
    const marketDataTimestamp = new Date(Date.now() - 5 * 60_000).toISOString();

    const budgetResponse = await request(app.getHttpServer())
      .post('/control-plane/budgets')
      .send({
        name: 'Paper execution budget',
        totalBudget: 10_000_000,
        mode: 'dry_run',
      })
      .expect(201);
    const seededAccountResponse = await request(app.getHttpServer())
      .post('/control-plane/paper-account/seed')
      .send({
        budgetEnvelopeId: budgetResponse.body.id,
        cash: 10_000_000,
        actor: 'e2e-operator',
        reason: 'Explicitly seed the paper account before execution.',
        idempotencyKey: 'e2e-paper-seed-1',
      })
      .expect(201);

    expect(seededAccountResponse.body.cash).toBe(10_000_000);
    expect(seededAccountResponse.body.status).toBe('seeded');
    expect(seededAccountResponse.body.brokerExecutionEnabled).toBe(false);
    const promotedAccountResponse = await request(app.getHttpServer())
      .post(
        `/control-plane/paper-account/${seededAccountResponse.body.id}/promote`,
      )
      .send({
        actor: 'e2e-operator',
        reason: 'Promote the seeded paper account for paper execution.',
        idempotencyKey: 'e2e-paper-promote-1',
      })
      .expect(201);

    expect(promotedAccountResponse.body.status).toBe('active');
    const researchRunResponse = await request(app.getHttpServer())
      .post('/control-plane/research-runs/run-baseline')
      .send({
        budgetEnvelopeId: budgetResponse.body.id,
        objective: 'Create paper execution evidence',
      })
      .expect(201);
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
        thesis: 'Paper execute after risk evaluation.',
      })
      .expect(201);

    const evaluationResponse = await request(app.getHttpServer())
      .post(
        `/control-plane/proposals/${proposalResponse.body.id}/evaluate-risk`,
      )
      .expect(201);

    const approvalResponse = await request(app.getHttpServer())
      .post(
        `/control-plane/proposals/${proposalResponse.body.id}/order-plan-approvals`,
      )
      .send({
        idempotencyKey: 'e2e-paper-plan-1',
        approver: 'e2e-operator',
        reason: 'Approve paper execution evidence.',
      })
      .expect(201);

    expect(approvalResponse.body.status).toBe('active');
    expect(approvalResponse.body.approvalHash).toMatch(/^sha256:/);
    expect(approvalResponse.body.brokerExecutionEnabled).toBe(false);

    const paperResponse = await request(app.getHttpServer())
      .post(
        `/control-plane/proposals/${proposalResponse.body.id}/paper-execute`,
      )
      .send({
        idempotencyKey: 'e2e-paper-plan-1',
        orderPlanApprovalId: approvalResponse.body.id,
      })
      .expect(201);

    expect(paperResponse.body.status).toBe('filled');
    expect(paperResponse.body.riskEvaluationId).not.toBe(
      evaluationResponse.body.id,
    );
    expect(paperResponse.body.idempotencyKey).toBe('e2e-paper-plan-1');
    expect(paperResponse.body.orderPlanApprovalId).toBe(
      approvalResponse.body.id,
    );
    expect(paperResponse.body.proposalHash).toMatch(/^sha256:/);
    expect(paperResponse.body.planHash).toMatch(/^sha256:/);
    expect(paperResponse.body.readinessSnapshot.latestRiskAllow).toBe(true);
    expect(paperResponse.body.readinessSnapshot.riskMatchesProposal).toBe(true);
    expect(paperResponse.body.brokerExecutionEnabled).toBe(false);
    expect(paperResponse.body.liveTradingEnabled).toBe(false);
    expect(paperResponse.body.orders[0].paperOrderId).toContain('paper-order:');
    expect(paperResponse.body.fills).toHaveLength(1);
    expect(paperResponse.body.fills[0].paperFillId).toContain(':fill:0');
    expect(paperResponse.body.cashLedger).toHaveLength(1);
    expect(paperResponse.body.positionLedger).toHaveLength(1);
    expect(paperResponse.body.endingCash).toBe(9_499_250);
    expect(paperResponse.body.reconciliation.status).toBe('pending');
    expect(paperResponse.body.reconciliation.cashMatched).toBe(false);

    const paperAccountResponse = await request(app.getHttpServer())
      .get('/control-plane/paper-account')
      .expect(200);
    expect(paperAccountResponse.body.cash).toBe(9_499_250);
    expect(paperAccountResponse.body.equity).toBe(9_999_250);
    expect(paperAccountResponse.body.lastAppliedPlanId).toBe(
      paperResponse.body.id,
    );
    expect(paperAccountResponse.body.appliedPlanIds).toEqual([
      paperResponse.body.id,
    ]);
    expect(paperAccountResponse.body.positions).toEqual([
      expect.objectContaining({
        symbol: '005930',
        marketValue: 500_000,
      }),
    ]);

    const fetchedPlanResponse = await request(app.getHttpServer())
      .get(`/control-plane/paper-order-plans/${paperResponse.body.id}`)
      .expect(200);
    expect(fetchedPlanResponse.body.id).toBe(paperResponse.body.id);

    const replayResponse = await request(app.getHttpServer())
      .post(
        `/control-plane/proposals/${proposalResponse.body.id}/paper-execute`,
      )
      .send({
        idempotencyKey: 'e2e-paper-plan-1',
      })
      .expect(201);
    expect(replayResponse.body.id).toBe(paperResponse.body.id);

    const reconcileResponse = await request(app.getHttpServer())
      .post(
        `/control-plane/paper-order-plans/${paperResponse.body.id}/reconcile`,
      )
      .send({
        notes: ['E2E paper reconciliation.'],
      })
      .expect(201);
    expect(reconcileResponse.body.status).toBe('reconciled');
    expect(reconcileResponse.body.reconciliation.status).toBe('matched');
    expect(reconcileResponse.body.reconciliation.cashMatched).toBe(true);

    const plansResponse = await request(app.getHttpServer())
      .get('/control-plane/paper-order-plans')
      .expect(200);

    expect(plansResponse.body).toHaveLength(1);
    expect(plansResponse.body[0].proposalId).toBe(proposalResponse.body.id);

    const accountEventsResponse = await request(app.getHttpServer())
      .get('/control-plane/paper-account/events')
      .expect(200);
    expect(accountEventsResponse.body).toHaveLength(3);
    expect(accountEventsResponse.body[0]).toEqual(
      expect.objectContaining({
        eventType: 'paper_order_plan',
        sourceId: paperResponse.body.id,
        sequence: 3,
      }),
    );
    expect(accountEventsResponse.body[1]).toEqual(
      expect.objectContaining({
        eventType: 'account_promoted',
        sequence: 2,
      }),
    );
    expect(accountEventsResponse.body[2]).toEqual(
      expect.objectContaining({
        eventType: 'explicit_seed',
        sequence: 1,
        cashAfter: 10_000_000,
      }),
    );

    const approvalsResponse = await request(app.getHttpServer())
      .get('/control-plane/order-plan-approvals')
      .expect(200);
    expect(approvalsResponse.body[0]).toEqual(
      expect.objectContaining({
        id: approvalResponse.body.id,
        status: 'consumed',
        consumedByPaperOrderPlanId: paperResponse.body.id,
      }),
    );

    const brokerSnapshotResponse = await request(app.getHttpServer())
      .post('/control-plane/broker-snapshots/import-read-only')
      .send({
        provider: 'manual',
        accountRef: 'e2e-account-ref',
        sourceRef: 'operator-import',
        asOf: new Date(Date.now() - 10 * 60_000).toISOString(),
        currency: 'KRW',
        cash: paperAccountResponse.body.cash,
        equity: paperAccountResponse.body.equity,
        positions: paperAccountResponse.body.positions,
      })
      .expect(201);

    expect(brokerSnapshotResponse.body.accountRefHash).toMatch(/^sha256:/);
    expect(brokerSnapshotResponse.body.brokerExecutionEnabled).toBe(false);
    expect(brokerSnapshotResponse.body.liveTradingEnabled).toBe(false);
    expect(brokerSnapshotResponse.body.reconciliation.status).toBe(
      'not_checked',
    );

    const brokerReconcileResponse = await request(app.getHttpServer())
      .post(
        `/control-plane/broker-snapshots/${brokerSnapshotResponse.body.id}/reconcile-paper`,
      )
      .send({
        tolerance: 0.01,
        maxAgeMinutes: 60,
        notes: ['E2E broker read-only reconciliation.'],
      })
      .expect(201);

    expect(brokerReconcileResponse.body.status).toBe('matched');
    expect(brokerReconcileResponse.body.reconciliation.cashMatched).toBe(true);
    expect(brokerReconcileResponse.body.reconciliation.positionsMatched).toBe(
      true,
    );

    const latestBrokerSnapshotResponse = await request(app.getHttpServer())
      .get('/control-plane/broker-snapshots/latest')
      .expect(200);
    expect(latestBrokerSnapshotResponse.body.id).toBe(
      brokerSnapshotResponse.body.id,
    );

    const brokerFillResponse = await request(app.getHttpServer())
      .post('/control-plane/broker-fills/import-read-only')
      .send({
        provider: 'manual',
        accountRef: 'e2e-account-ref',
        brokerOrderRef: 'e2e-broker-order',
        brokerFillRef: 'e2e-broker-fill',
        sourceRef: 'operator-fill-import',
        symbol: '005930',
        side: 'BUY',
        quantity: 1,
        fillPrice: 50_000,
        fee: 50,
        filledAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      })
      .expect(201);

    expect(brokerFillResponse.body.accountRefHash).toMatch(/^sha256:/);
    expect(brokerFillResponse.body.brokerExecutionEnabled).toBe(false);
    expect(brokerFillResponse.body.liveTradingEnabled).toBe(false);
    expect(brokerFillResponse.body.reconciliation.status).toBe('not_checked');

    const brokerFillsResponse = await request(app.getHttpServer())
      .get('/control-plane/broker-fills')
      .expect(200);
    expect(brokerFillsResponse.body[0].id).toBe(brokerFillResponse.body.id);

    await request(app.getHttpServer())
      .post('/control-plane/broker-snapshots/import-read-only')
      .send({
        provider: 'manual',
        asOf: new Date(Date.now() - 10 * 60_000).toISOString(),
        cash: 1_000_000,
        equity: 1_000_000,
        positions: [],
        brokerCredentials: { token: 'secret' },
      })
      .expect(400);
  });

  it('creates and paper executes a SELL-only recovery proposal without broker access', async () => {
    const budgetResponse = await request(app.getHttpServer())
      .post('/control-plane/budgets')
      .send({
        name: 'Recovery e2e paper budget',
        totalBudget: 10_000_000,
        mode: 'paper',
      })
      .expect(201);
    const seededAccountResponse = await request(app.getHttpServer())
      .post('/control-plane/paper-account/seed')
      .send({
        budgetEnvelopeId: budgetResponse.body.id,
        cash: 6_500_000,
        positions: [
          {
            symbol: '005930',
            assetClass: 'domestic_stock',
            marketValue: 3_500_000,
            weightPct: 35,
          },
        ],
        actor: 'e2e-operator',
        reason: 'Seed recovery paper account.',
        idempotencyKey: 'e2e-recovery-paper-seed-1',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post(
        `/control-plane/paper-account/${seededAccountResponse.body.id}/promote`,
      )
      .send({
        actor: 'e2e-operator',
        reason: 'Promote recovery paper account.',
        idempotencyKey: 'e2e-recovery-paper-promote-1',
      })
      .expect(201);

    const recoveryResponse = await request(app.getHttpServer())
      .post('/control-plane/recovery/run-baseline')
      .send({
        budgetEnvelopeId: budgetResponse.body.id,
        paperAccountId: seededAccountResponse.body.id,
        maxPositions: 1,
      })
      .expect(201);

    expect(recoveryResponse.body.researchRun.strategyFamily).toBe(
      'paper_recovery',
    );
    expect(recoveryResponse.body.proposal.researchRunId).toBe(
      recoveryResponse.body.researchRun.id,
    );
    expect(recoveryResponse.body.proposal.orders).toEqual([
      expect.objectContaining({
        symbol: '005930',
        side: 'SELL',
        notional: 1_000_000,
        targetPositionPct: 0,
      }),
    ]);
    expect(recoveryResponse.body.riskEvaluation.proposalId).toBe(
      recoveryResponse.body.proposal.id,
    );
    expect(recoveryResponse.body.riskEvaluation.requestSnapshot.orders).toEqual(
      recoveryResponse.body.proposal.orders,
    );
    expect(recoveryResponse.body.proposal.brokerExecutionEnabled).toBe(false);
    expect(recoveryResponse.body.riskEvaluation.brokerExecutionEnabled).toBe(
      false,
    );

    const replayRecoveryResponse = await request(app.getHttpServer())
      .post('/control-plane/recovery/run-baseline')
      .send({
        budgetEnvelopeId: budgetResponse.body.id,
        paperAccountId: seededAccountResponse.body.id,
        maxPositions: 1,
      })
      .expect(201);

    expect(replayRecoveryResponse.body.researchRun.id).toBe(
      recoveryResponse.body.researchRun.id,
    );
    expect(replayRecoveryResponse.body.proposal.id).toBe(
      recoveryResponse.body.proposal.id,
    );
    expect(replayRecoveryResponse.body.riskEvaluation.id).toBe(
      recoveryResponse.body.riskEvaluation.id,
    );
    expect(recoveryResponse.body.proposal.evidenceRefs).toEqual(
      expect.arrayContaining([expect.stringMatching(/^paper-recovery-state:/)]),
    );

    const approvalResponse = await request(app.getHttpServer())
      .post(
        `/control-plane/proposals/${recoveryResponse.body.proposal.id}/order-plan-approvals`,
      )
      .send({
        idempotencyKey: 'e2e-recovery-paper-plan-1',
        approver: 'e2e-operator',
        reason: 'Approve SELL-only recovery plan.',
      })
      .expect(201);
    const paperResponse = await request(app.getHttpServer())
      .post(
        `/control-plane/proposals/${recoveryResponse.body.proposal.id}/paper-execute`,
      )
      .send({
        idempotencyKey: 'e2e-recovery-paper-plan-1',
        orderPlanApprovalId: approvalResponse.body.id,
      })
      .expect(201);

    expect(paperResponse.body.status).toBe('filled');
    expect(paperResponse.body.orders[0].side).toBe('SELL');
    expect(paperResponse.body.fills[0]).toEqual(
      expect.objectContaining({
        symbol: '005930',
        side: 'SELL',
        filledNotional: 1_000_000,
        costBasisBefore: 3_500_000,
        costBasisAfter: 2_500_000,
        realizedPnl: -1_500,
      }),
    );
    expect(paperResponse.body.brokerExecutionEnabled).toBe(false);
    expect(paperResponse.body.liveTradingEnabled).toBe(false);

    expect(paperResponse.body.portfolioAfter.cash).toBe(7_498_500);
    expect(paperResponse.body.portfolioAfter.positions).toEqual([
      expect.objectContaining({
        symbol: '005930',
        marketValue: 2_500_000,
        quantity: 2_500_000,
        costBasis: 2_500_000,
        realizedPnl: -1_500,
      }),
    ]);
  });

  it('reports broker adapter readiness without exposing credentials or live access', async () => {
    const response = await request(app.getHttpServer())
      .get('/control-plane/broker-adapter/status')
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        provider: 'toss',
        configured: false,
        readOnlyEnabled: false,
        paperTradingEnabled: false,
        liveTradingEnabled: false,
        credentialRef: 'missing',
        brokerExecutionEnabled: false,
        readOnlyPoll: expect.objectContaining({
          enabled: false,
          canPoll: false,
          brokerExecutionEnabled: false,
          liveTradingEnabled: false,
        }),
      }),
    );
    expect(response.body.capabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'orderPlacement',
          status: 'blocked',
        }),
      ]),
    );
    await request(app.getHttpServer())
      .post('/control-plane/broker-adapter/poll-read-only')
      .send({})
      .expect(400);
  });
});
