import {
  LIVE_MONEY_OUT_OF_SCOPE_BLOCKER,
  LivePilot10UsdService,
} from './live-pilot-10usd.service';

describe('LivePilot10UsdService', () => {
  const preflight = {
    status: 'ready',
    latestLeanRunId: 'lean-1',
    latestPaperPlanId: 10,
    blockers: [],
  };

  function buildService(blockers: string[] = []) {
    const statusRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const livePreflightService = {
      runPreflight: jest.fn(async () => ({
        ...preflight,
        status: blockers.length ? 'blocked' : 'ready',
        blockers,
      })),
    };
    const service = new LivePilot10UsdService(
      statusRepository as never,
      livePreflightService as never,
    );

    return { service, statusRepository, livePreflightService };
  }

  it('always blocks the legacy live-money command under the active spec', async () => {
    const { service, statusRepository } = buildService();

    const result = await service.execute({
      confirmRealMoney: true,
      idempotencyKey: 'legacy-live-command',
    });

    expect(result).toEqual({
      submitted: false,
      intentId: 'legacy-live-command',
      blockers: [LIVE_MONEY_OUT_OF_SCOPE_BLOCKER],
    });
    expect(statusRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'blocked',
        realOrderSent: false,
        blockers: [LIVE_MONEY_OUT_OF_SCOPE_BLOCKER],
      }),
    );
  });

  it('preserves preflight blockers and missing confirmation as blocked evidence', async () => {
    const { service } = buildService(['Latest LEAN backtest did not pass.']);

    const result = await service.execute({ confirmRealMoney: false });

    expect(result.submitted).toBe(false);
    expect(result.blockers).toEqual(
      expect.arrayContaining([
        LIVE_MONEY_OUT_OF_SCOPE_BLOCKER,
        'Latest LEAN backtest did not pass.',
        'Legacy command was invoked without --confirm-real-money.',
      ]),
    );
  });
});
