import {
  assertTossReadOnlyEndpointAllowed,
  TossReadOnlyBrokerService,
} from './toss-read-only-broker.service';
import { ControlPlaneService } from './control-plane.service';

describe('TossReadOnlyBrokerService', () => {
  const originalEnv = process.env;
  let importBrokerSnapshot: jest.Mock;
  let importBrokerFill: jest.Mock;
  let reconcileBrokerSnapshot: jest.Mock;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.BROKER_READ_ONLY_ENABLED;
    delete process.env.TOSS_READ_ONLY_POLLER_ENABLED;
    delete process.env.TOSS_OPEN_API_BASE_URL;
    delete process.env.TOSS_OPEN_API_CLIENT_ID;
    delete process.env.TOSS_OPEN_API_CLIENT_SECRET;
    delete process.env.TOSS_OPEN_API_ACCOUNT_REF;
    delete process.env.TOSS_OPEN_API_ACCOUNT_SEQ;
    delete process.env.TOSS_OPEN_API_SCHEMA_VERIFIED;
    importBrokerSnapshot = jest.fn(async (request) => ({
      id: 77,
      ...request,
      brokerExecutionEnabled: false,
      liveTradingEnabled: false,
    }));
    importBrokerFill = jest.fn(async (request) => ({
      id: 88,
      ...request,
      status: 'matched',
      brokerExecutionEnabled: false,
      liveTradingEnabled: false,
      reconciliation: {
        status: 'matched',
        checkedAt: '2026-05-23T00:01:00.000Z',
      },
    }));
    reconcileBrokerSnapshot = jest.fn(async (_snapshotId, _request) => ({
      id: 77,
      status: 'matched',
      brokerExecutionEnabled: false,
      liveTradingEnabled: false,
      reconciliation: {
        status: 'matched',
        checkedAt: '2026-05-23T00:00:00.000Z',
      },
    }));
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('stays disabled by default and does not call the network', async () => {
    const requester = jest.fn();
    const service = new TossReadOnlyBrokerService(
      {
        importBrokerSnapshot,
        importBrokerFill,
        reconcileBrokerSnapshot,
      } as unknown as ControlPlaneService,
      requester,
    );

    expect(service.getReadOnlyPollStatus()).toEqual(
      expect.objectContaining({
        enabled: false,
        configured: false,
        canPoll: false,
        accountRef: 'missing',
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
      }),
    );
    await expect(service.pollReadOnlySnapshot()).rejects.toThrow(
      'Toss read-only polling requires',
    );
    expect(requester).not.toHaveBeenCalled();
    expect(importBrokerSnapshot).not.toHaveBeenCalled();
    expect(importBrokerFill).not.toHaveBeenCalled();
    expect(reconcileBrokerSnapshot).not.toHaveBeenCalled();
    await service.pollReadOnlySnapshotCron();
    expect(requester).not.toHaveBeenCalled();
  });

  it('imports a Toss read-only holdings snapshot when explicitly enabled', async () => {
    process.env.BROKER_READ_ONLY_ENABLED = 'true';
    process.env.TOSS_READ_ONLY_POLLER_ENABLED = 'true';
    process.env.TOSS_OPEN_API_BASE_URL = 'https://openapi.tossinvest.com';
    process.env.TOSS_OPEN_API_CLIENT_ID = 'client-123456';
    process.env.TOSS_OPEN_API_CLIENT_SECRET = 'secret-123456';
    process.env.TOSS_OPEN_API_ACCOUNT_SEQ = 'account-123456';
    process.env.TOSS_OPEN_API_SCHEMA_VERIFIED = 'true';
    const requester = jest
      .fn()
      .mockResolvedValueOnce({ access_token: 'token-value' })
      .mockResolvedValueOnce({ result: [{ accountSeq: 'account-123456' }] })
      .mockResolvedValueOnce({
        cash: 6_500_000,
        equity: 10_000_000,
        items: [
          {
            symbol: '005930',
            marketValue: 3_500_000,
          },
        ],
      });
    const service = new TossReadOnlyBrokerService(
      {
        importBrokerSnapshot,
        importBrokerFill,
        reconcileBrokerSnapshot,
      } as unknown as ControlPlaneService,
      requester,
    );

    const result = await service.pollReadOnlySnapshot();

    expect(requester).toHaveBeenCalledTimes(3);
    expect(requester.mock.calls.map(([request]) => request.path)).toEqual([
      '/oauth2/token',
      '/api/v1/accounts',
      '/v1/holdings',
    ]);
    expect(requester.mock.calls[2][0].headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer token-value',
        'X-Tossinvest-Account': 'account-123456',
      }),
    );
    expect(importBrokerSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'toss',
        accountRef: 'account-123456',
        sourceRef: 'toss-read-only-poll:manual',
        cash: 6_500_000,
        equity: 10_000_000,
        positions: [
          expect.objectContaining({
            symbol: '005930',
            marketValue: 3_500_000,
          }),
        ],
      }),
    );
    expect(result.status).toEqual(
      expect.objectContaining({
        canPoll: true,
        running: false,
        lastSnapshotId: 77,
        lastReconciliationStatus: 'matched',
        lastReconciledAt: '2026-05-23T00:00:00.000Z',
        lastAttemptAt: expect.any(String),
        lastPollAt: expect.any(String),
        accountRef: 'acc***456',
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
      }),
    );
    expect(reconcileBrokerSnapshot).toHaveBeenCalledWith(
      77,
      expect.objectContaining({
        notes: ['Auto-reconciled after Toss read-only poll.'],
      }),
    );
    expect(result.snapshot).toEqual(
      expect.objectContaining({
        id: 77,
        status: 'matched',
        reconciliation: expect.objectContaining({ status: 'matched' }),
      }),
    );
  });

  it('keeps an imported snapshot when auto-reconciliation is unavailable', async () => {
    process.env.BROKER_READ_ONLY_ENABLED = 'true';
    process.env.TOSS_READ_ONLY_POLLER_ENABLED = 'true';
    process.env.TOSS_OPEN_API_CLIENT_ID = 'client-123456';
    process.env.TOSS_OPEN_API_CLIENT_SECRET = 'secret-123456';
    process.env.TOSS_OPEN_API_ACCOUNT_SEQ = 'account-123456';
    process.env.TOSS_OPEN_API_SCHEMA_VERIFIED = 'true';
    reconcileBrokerSnapshot.mockRejectedValueOnce(
      new Error(
        'Broker snapshot reconciliation requires an active paper account',
      ),
    );
    const requester = jest
      .fn()
      .mockResolvedValueOnce({ access_token: 'token-value' })
      .mockResolvedValueOnce({ result: [{ accountSeq: 'account-123456' }] })
      .mockResolvedValueOnce({
        cash: 6_500_000,
        equity: 10_000_000,
        items: [],
      });
    const service = new TossReadOnlyBrokerService(
      {
        importBrokerSnapshot,
        importBrokerFill,
        reconcileBrokerSnapshot,
      } as unknown as ControlPlaneService,
      requester,
    );

    const result = await service.pollReadOnlySnapshot();

    expect(result.snapshot).toEqual(
      expect.objectContaining({
        id: 77,
        provider: 'toss',
      }),
    );
    expect(result.status).toEqual(
      expect.objectContaining({
        lastSnapshotId: 77,
        lastReconciliationStatus: 'not_checked',
        lastReconciliationError:
          'Broker snapshot reconciliation requires an active paper account',
        lastError: undefined,
      }),
    );
  });

  it('imports Toss read-only fill evidence when fill polling is explicitly enabled', async () => {
    process.env.BROKER_READ_ONLY_ENABLED = 'true';
    process.env.TOSS_READ_ONLY_POLLER_ENABLED = 'true';
    process.env.TOSS_READ_ONLY_FILL_POLLER_ENABLED = 'true';
    process.env.TOSS_OPEN_API_CLIENT_ID = 'client-123456';
    process.env.TOSS_OPEN_API_CLIENT_SECRET = 'secret-123456';
    process.env.TOSS_OPEN_API_ACCOUNT_SEQ = 'account-123456';
    process.env.TOSS_OPEN_API_SCHEMA_VERIFIED = 'true';
    process.env.TOSS_OPEN_API_FILL_SCHEMA_VERIFIED = 'true';
    process.env.TOSS_OPEN_API_FILLS_PATH = '/v1/fills';
    const requester = jest
      .fn()
      .mockResolvedValueOnce({ access_token: 'token-value' })
      .mockResolvedValueOnce({
        items: [
          {
            executionId: 'execution-1',
            orderId: 'order-1',
            symbol: '005930',
            side: 'BUY',
            quantity: 10,
            fillPrice: 50_000,
            executedAmount: 500_000,
            commission: 500,
            currency: 'KRW',
            executedAt: '2026-05-23T00:00:00.000Z',
          },
        ],
      });
    const service = new TossReadOnlyBrokerService(
      {
        importBrokerSnapshot,
        importBrokerFill,
        reconcileBrokerSnapshot,
      } as unknown as ControlPlaneService,
      requester,
    );

    const result = await service.pollReadOnlyFills();

    expect(requester).toHaveBeenCalledTimes(2);
    expect(requester.mock.calls.map(([request]) => request.path)).toEqual([
      '/oauth2/token',
      '/v1/fills',
    ]);
    expect(importBrokerFill).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'toss',
        accountRef: 'account-123456',
        brokerOrderRef: 'order-1',
        brokerFillRef: 'execution-1',
        symbol: '005930',
        side: 'BUY',
        quantity: 10,
        fillPrice: 50_000,
        grossNotional: 500_000,
        fee: 500,
        sourceRef: 'toss-read-only-fill-poll:0:manual',
      }),
    );
    expect(result.status).toEqual(
      expect.objectContaining({
        canPollFills: true,
        lastBrokerFillIds: [88],
        lastFillCount: 1,
        lastFillReconciliationStatus: 'matched',
        lastFillReconciledAt: '2026-05-23T00:01:00.000Z',
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
      }),
    );
    expect(result.fills?.[0]).toEqual(
      expect.objectContaining({
        id: 88,
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
      }),
    );
  });

  it('keeps Toss fill polling disabled without explicit fill schema and path', async () => {
    process.env.BROKER_READ_ONLY_ENABLED = 'true';
    process.env.TOSS_READ_ONLY_POLLER_ENABLED = 'true';
    process.env.TOSS_READ_ONLY_FILL_POLLER_ENABLED = 'true';
    process.env.TOSS_OPEN_API_CLIENT_ID = 'client-123456';
    process.env.TOSS_OPEN_API_CLIENT_SECRET = 'secret-123456';
    process.env.TOSS_OPEN_API_ACCOUNT_SEQ = 'account-123456';
    process.env.TOSS_OPEN_API_SCHEMA_VERIFIED = 'true';
    const requester = jest.fn();
    const service = new TossReadOnlyBrokerService(
      {
        importBrokerSnapshot,
        importBrokerFill,
        reconcileBrokerSnapshot,
      } as unknown as ControlPlaneService,
      requester,
    );

    expect(service.getReadOnlyPollStatus()).toEqual(
      expect.objectContaining({
        canPoll: true,
        canPollFills: false,
        fillPollingEnabled: true,
        fillSchemaVerified: false,
        fillPathConfigured: false,
      }),
    );
    await expect(service.pollReadOnlyFills()).rejects.toThrow(
      'Toss read-only fill polling requires',
    );
    expect(requester).not.toHaveBeenCalled();
    expect(importBrokerFill).not.toHaveBeenCalled();
  });

  it('blocks every non-read-only Toss endpoint', () => {
    expect(() =>
      assertTossReadOnlyEndpointAllowed('POST', '/api/v1/orders'),
    ).toThrow('Toss read-only adapter blocks POST /api/v1/orders');
  });
});
