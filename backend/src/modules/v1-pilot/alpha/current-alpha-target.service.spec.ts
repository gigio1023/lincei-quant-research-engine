import { CurrentAlphaTargetService } from './current-alpha-target.service';

describe('CurrentAlphaTargetService', () => {
  it('creates a long-only current target snapshot from latest numeric alpha', async () => {
    const targetRepository = {
      create: jest.fn((record) => record),
      upsert: jest.fn().mockResolvedValue(undefined),
    };
    const service = new CurrentAlphaTargetService(
      {
        find: jest.fn().mockResolvedValue([
          alphaDecision({
            id: 'numeric-qqq',
            symbol: 'QQQ',
            expectedReturnBps: 90,
            confidence: 0.6,
          }),
          alphaDecision({
            id: 'numeric-spy',
            symbol: 'SPY',
            expectedReturnBps: 70,
            confidence: 0.4,
          }),
          alphaDecision({
            id: 'numeric-down',
            symbol: 'TLT',
            direction: 'down',
            expectedReturnBps: 80,
            confidence: 0.8,
          }),
        ]),
      } as never,
      targetRepository as never,
    );

    const snapshot = await service.ensureCurrentTargetSnapshot({
      runId: 'qc-import-test',
      parameters: {
        'alpha-mode': 'numeric-only',
        'universe-profile': 'self_funded_etf_baseline',
        'universe-symbols': 'SPY,QQQ,TLT,IEF',
      },
    } as never);

    expect(snapshot.id).toMatch(
      /^current-alpha-target-qc-import-test-numeric-/,
    );
    expect(snapshot.targets).toEqual([
      expect.objectContaining({
        symbol: 'QQQ',
        targetWeight: 0.1,
        sourceInsightIds: ['numeric-qqq'],
        riskNotes: expect.arrayContaining([
          'current_alpha_target',
          'alpha-source:numeric',
          'market-data-timestamp:2026-05-28T22:00:00.000Z',
          'validated-universe-profile:self_funded_etf_baseline',
          'long-only',
        ]),
      }),
      expect.objectContaining({
        symbol: 'SPY',
        targetWeight: 0.1,
        sourceInsightIds: ['numeric-spy'],
      }),
    ]);
    expect(snapshot.grossExposurePct).toBe(0.2);
    expect(snapshot.maxSingleNamePct).toBe(0.1);
    expect(targetRepository.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        leanRunId: 'qc-import-test',
        targetHash: expect.stringMatching(/^sha256:/),
      }),
      ['id'],
    );
  });

  it('blocks when the validated run alpha mode has no orderable decisions', async () => {
    const service = new CurrentAlphaTargetService(
      {
        find: jest.fn().mockResolvedValue([
          alphaDecision({
            id: 'meta-flat',
            source: 'meta',
            symbol: 'SPY',
            direction: 'flat',
            expectedReturnBps: 0,
            confidence: 0,
          }),
        ]),
      } as never,
      { create: jest.fn(), upsert: jest.fn() } as never,
    );

    await expect(
      service.ensureCurrentTargetSnapshot({
        runId: 'qc-import-test',
        parameters: { 'alpha-mode': 'meta-overlay' },
      } as never),
    ).rejects.toThrow(
      'No orderable current meta alpha decisions are available for paper trading.',
    );
  });

  it('blocks when current alpha symbols are outside the validated run universe', async () => {
    const service = new CurrentAlphaTargetService(
      {
        find: jest.fn().mockResolvedValue([
          alphaDecision({
            id: 'numeric-spy',
            symbol: 'SPY',
            expectedReturnBps: 90,
            confidence: 0.6,
          }),
        ]),
      } as never,
      { create: jest.fn(), upsert: jest.fn() } as never,
    );

    await expect(
      service.ensureCurrentTargetSnapshot({
        runId: 'qc-import-quality',
        parameters: {
          'alpha-mode': 'numeric-only',
          'universe-symbols': 'AMD,NVDA,MRVL',
        },
      } as never),
    ).rejects.toThrow(
      'Current alpha target symbols are outside the validated LEAN run universe: SPY.',
    );
  });
});

function alphaDecision(
  overrides: Partial<{
    id: string;
    source: 'numeric' | 'llm' | 'meta';
    symbol: string;
    asOf: string;
    availableAt: string;
    direction: 'up' | 'down' | 'flat';
    expectedReturnBps: number;
    confidence: number;
    maxPositionPct: number;
  }>,
) {
  return {
    id: overrides.id ?? 'numeric-spy',
    source: overrides.source ?? 'numeric',
    symbol: overrides.symbol ?? 'SPY',
    asOf: overrides.asOf ?? '2026-05-29T00:21:53.133Z',
    availableAt: overrides.availableAt ?? '2026-05-28T22:00:00.000Z',
    direction: overrides.direction ?? 'up',
    expectedReturnBps: overrides.expectedReturnBps ?? 50,
    confidence: overrides.confidence ?? 0.5,
    maxPositionPct: overrides.maxPositionPct ?? 0.35,
  };
}
