import { RiskGateRequest } from './risk-gate.types';
import { RiskGateService } from './risk-gate.service';

describe('RiskGateService', () => {
  let service: RiskGateService;

  const now = new Date('2026-05-22T12:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(now);
    service = new RiskGateService();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const baseRequest = (
    overrides: Partial<RiskGateRequest> = {},
  ): RiskGateRequest => ({
    mode: 'dry_run',
    actor: 'strategy',
    strategyId: 'momentum-v1',
    ruleId: 'long-only-breakout',
    generatedAt: '2026-05-22T11:59:00.000Z',
    marketDataTimestamp: '2026-05-22T11:55:00.000Z',
    portfolio: {
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
    ...overrides,
  });

  it('allows a dry-run long-only proposal inside policy limits', () => {
    const result = service.evaluate(baseRequest());

    expect(result.decision).toBe('ALLOW');
    expect(result.brokerExecutionEnabled).toBe(false);
    expect(result.approvedOrderCount).toBe(1);
  });

  it('denies live trading even if policy tries to allow it', () => {
    const result = service.evaluate(
      baseRequest({
        mode: 'live',
        policy: { allowLiveTrading: true },
        humanApprovalId: 'approval-1',
      }),
    );

    expect(result.decision).toBe('DENY');
    expect(result.reasons).toContain(
      'Live trading is not implemented in this service',
    );
    expect(result.policy.allowLiveTrading).toBe(false);
  });

  it('denies broker credentials, account ids, and execution intents', () => {
    const result = service.evaluate(
      baseRequest({
        brokerCredentials: { token: 'secret' },
        accountId: '123',
        executionIntent: 'place_order',
      }),
    );

    expect(result.decision).toBe('DENY');
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        'Broker credentials are not allowed in risk requests',
        'Broker account ids are not allowed in risk requests',
        'Risk gate accepts evaluate_only intent only',
      ]),
    );
  });

  it('denies stale market data and lookahead timestamps', () => {
    const stale = service.evaluate(
      baseRequest({
        marketDataTimestamp: '2026-05-22T10:00:00.000Z',
      }),
    );
    const lookahead = service.evaluate(
      baseRequest({
        generatedAt: '2026-05-22T11:00:00.000Z',
        marketDataTimestamp: '2026-05-22T11:10:00.000Z',
      }),
    );

    expect(stale.decision).toBe('DENY');
    expect(stale.reasons).toContain(
      'Market data is stale for the active policy',
    );
    expect(lookahead.decision).toBe('DENY');
    expect(lookahead.reasons).toContain(
      'Market data timestamp cannot be after proposal time',
    );
  });

  it('denies LLM proposals without deterministic provenance', () => {
    const result = service.evaluate(
      baseRequest({
        actor: 'llm',
        strategyId: undefined,
        ruleId: undefined,
      }),
    );

    expect(result.decision).toBe('DENY');
    expect(result.reasons).toContain(
      'LLM proposals require strategyId and ruleId provenance',
    );
  });

  it('requires review for paper mode without human approval', () => {
    const result = service.evaluate(baseRequest({ mode: 'paper' }));

    expect(result.decision).toBe('REVIEW');
    expect(result.requiresHumanApproval).toBe(true);
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        'Paper execution requires human approval',
        'Human approval is required outside dry-run mode',
      ]),
    );
  });

  it('allows paper mode with human approval inside policy limits', () => {
    const result = service.evaluate(
      baseRequest({
        mode: 'paper',
        humanApprovalId: 'approval-paper-1',
      }),
    );

    expect(result.decision).toBe('ALLOW');
    expect(result.requiresHumanApproval).toBe(false);
    expect(result.reasons).toEqual([]);
  });

  it('denies prohibited assets, shorts, leverage, and concentration', () => {
    const result = service.evaluate(
      baseRequest({
        orders: [
          {
            symbol: 'BTC-PERP',
            assetClass: 'crypto_derivative',
            side: 'SHORT',
            orderType: 'LIMIT',
            notional: 2_000_000,
            targetPositionPct: 30,
            leverage: 2,
          },
        ],
      }),
    );

    expect(result.decision).toBe('DENY');
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        'Asset class crypto_derivative is not allowed by policy',
        'Asset class crypto_derivative is prohibited',
        'Short orders are prohibited',
        'Order BTC-PERP exceeds max order notional',
        'Order BTC-PERP exceeds single-position limit',
        'Order BTC-PERP uses leverage',
      ]),
    );
  });

  it('allows reducing SELL orders for existing overweight long positions', () => {
    const result = service.evaluate(
      baseRequest({
        mode: 'paper',
        humanApprovalId: 'approval-recovery-1',
        portfolio: {
          currency: 'KRW',
          equity: 10_000_000,
          cash: 6_500_000,
          grossExposurePct: 35,
          positions: [
            {
              symbol: '005930',
              assetClass: 'domestic_stock',
              marketValue: 3_500_000,
              weightPct: 35,
            },
          ],
        },
        orders: [
          {
            symbol: '005930',
            assetClass: 'domestic_stock',
            side: 'SELL',
            orderType: 'MARKET',
            notional: 1_000_000,
            targetPositionPct: 0,
          },
        ],
      }),
    );

    expect(result.decision).toBe('ALLOW');
    expect(result.reasons).toEqual([]);
  });

  it('still denies non-reducing SELL orders from breached positions', () => {
    const result = service.evaluate(
      baseRequest({
        mode: 'paper',
        humanApprovalId: 'approval-recovery-2',
        portfolio: {
          currency: 'KRW',
          equity: 10_000_000,
          cash: 6_500_000,
          grossExposurePct: 35,
          positions: [
            {
              symbol: '005930',
              assetClass: 'domestic_stock',
              marketValue: 3_500_000,
              weightPct: 35,
            },
          ],
        },
        orders: [
          {
            symbol: '005930',
            assetClass: 'domestic_stock',
            side: 'SELL',
            orderType: 'MARKET',
            notional: 4_000_000,
            targetPositionPct: 0,
          },
        ],
      }),
    );

    expect(result.decision).toBe('DENY');
    expect(result.reasons).toEqual(
      expect.arrayContaining([
        'Existing position 005930 exceeds single-position limit',
        'Order 005930 exceeds max order notional',
      ]),
    );
  });
});
