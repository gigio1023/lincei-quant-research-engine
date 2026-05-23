import { BadRequestException } from '@nestjs/common';
import { LivePilot10UsdService } from './live-pilot-10usd.service';
import { hashObject } from '../../../shared/hash.util';

const latestTarget = {
  id: 'targets-1',
  targets: [{ symbol: 'SPY', targetWeight: 0.35 }],
};

describe('LivePilot10UsdService', () => {
  const envBackup = { ...process.env };
  const preflight = {
    status: 'ready',
    latestLeanRunId: 'lean-1',
    blockers: [],
  };

  beforeEach(() => {
    process.env = { ...envBackup };
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  function buildService(existingIntent?: Record<string, unknown>) {
    const intentRepository = {
      findOne: jest.fn(async () => existingIntent ?? null),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const targetRepository = {
      findOne: jest.fn(async () => latestTarget),
    };
    const statusRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const livePreflightService = {
      runPreflight: jest.fn(async () => preflight),
    };
    const mockBrokerAdapter = {
      previewOrder: jest.fn(async () => ({ allowed: true, blockers: [] })),
      submitOrder: jest.fn(async () => ({ status: 'filled' })),
    };
    const tossWriteBrokerAdapter = {
      previewOrder: jest.fn(),
      submitOrder: jest.fn(),
      isLiveReady: jest.fn(() => false),
    };
    const service = new LivePilot10UsdService(
      intentRepository as any,
      targetRepository as any,
      statusRepository as any,
      livePreflightService as any,
      mockBrokerAdapter as any,
      tossWriteBrokerAdapter as any,
    );

    return {
      service,
      intentRepository,
      mockBrokerAdapter,
      tossWriteBrokerAdapter,
    };
  }

  it('replays an existing submitted intent without broker I/O', async () => {
    const existingIntent = {
      id: 'intent-1',
      status: 'submitted',
      intentHash: expectedIntentHash(),
      blockers: [],
    };
    const { service, intentRepository, mockBrokerAdapter } =
      buildService(existingIntent);

    const result = await service.execute({
      confirmRealMoney: true,
      idempotencyKey: 'live-pilot-10usd:SPY',
    });

    expect(result).toEqual({
      submitted: true,
      intentId: 'intent-1',
      blockers: [],
    });
    expect(mockBrokerAdapter.previewOrder).not.toHaveBeenCalled();
    expect(mockBrokerAdapter.submitOrder).not.toHaveBeenCalled();
    expect(intentRepository.save).not.toHaveBeenCalled();
  });

  it('blocks idempotency key reuse for a different intent hash', async () => {
    const { service, mockBrokerAdapter } = buildService({
      id: 'intent-1',
      status: 'submitted',
      intentHash: 'sha256:different',
      blockers: [],
    });

    await expect(
      service.execute({
        confirmRealMoney: true,
        idempotencyKey: 'live-pilot-10usd:SPY',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockBrokerAdapter.submitOrder).not.toHaveBeenCalled();
  });

  it('does not select Toss write unless live adapter readiness passes', async () => {
    process.env.TOSS_ORDER_SCHEMA_VERIFIED = 'true';
    process.env.BROKER_WRITE_ENABLED = 'true';
    process.env.LIVE_TRADING_ENABLED = 'true';
    const { service, mockBrokerAdapter, tossWriteBrokerAdapter } =
      buildService();

    const result = await service.execute({
      confirmRealMoney: true,
      idempotencyKey: 'live-pilot-10usd:SPY',
    });

    expect(tossWriteBrokerAdapter.isLiveReady).toHaveBeenCalled();
    expect(tossWriteBrokerAdapter.previewOrder).not.toHaveBeenCalled();
    expect(tossWriteBrokerAdapter.submitOrder).not.toHaveBeenCalled();
    expect(mockBrokerAdapter.previewOrder).toHaveBeenCalled();
    expect(mockBrokerAdapter.submitOrder).toHaveBeenCalled();
    expect(result.blockers).toContain(
      'No real broker order sent; mock adapter used for plumbing verification.',
    );
  });
});

function expectedIntentHash(): string {
  return hashObject({
    portfolioTargetSnapshotId: latestTarget.id,
    symbol: 'SPY',
    side: 'buy',
    orderType: 'limit',
    notionalUsd: 5,
    limitPrice: 100,
  });
}
