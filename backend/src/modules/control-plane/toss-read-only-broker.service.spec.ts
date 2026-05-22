import {
  assertTossReadOnlyEndpointAllowed,
  TossReadOnlyBrokerService,
} from './toss-read-only-broker.service';
import { ControlPlaneService } from './control-plane.service';

describe('TossReadOnlyBrokerService', () => {
  const originalEnv = process.env;
  let importBrokerSnapshot: jest.Mock;
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

  it('blocks every non-read-only Toss endpoint', () => {
    expect(() =>
      assertTossReadOnlyEndpointAllowed('POST', '/api/v1/orders'),
    ).toThrow('Toss read-only adapter blocks POST /api/v1/orders');
  });
});
