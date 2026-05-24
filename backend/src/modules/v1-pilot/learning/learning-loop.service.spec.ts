import { AlphaDecision } from '../../../entities/alpha-decision.entity';
import { LearningLoopService } from './learning-loop.service';

describe('LearningLoopService', () => {
  it('labels outcomes from availableAt for both symbol and benchmark', async () => {
    const labelRepository = {
      create: jest.fn((value) => value),
    };
    const service = new LearningLoopService(
      {} as never,
      {} as never,
      labelRepository as never,
      {} as never,
      {} as never,
      {} as never,
    );
    const firstBarAtOrAfter = jest.fn(
      async (symbol: string, timestamp: string) => ({
        id: `bar-${symbol}-${timestamp}`,
        close: timestamp === '2026-01-03T00:00:00.000Z' ? 100 : 110,
      }),
    );
    (
      service as unknown as { firstBarAtOrAfter: typeof firstBarAtOrAfter }
    ).firstBarAtOrAfter = firstBarAtOrAfter;

    const label = await (
      service as unknown as {
        buildLabel: (decision: AlphaDecision) => Promise<unknown>;
      }
    ).buildLabel({
      id: 'alpha-1',
      symbol: 'QQQ',
      asOf: '2026-01-01T00:00:00.000Z',
      availableAt: '2026-01-03T00:00:00.000Z',
      horizonHours: 24,
    } as AlphaDecision);

    expect(firstBarAtOrAfter).toHaveBeenNthCalledWith(
      1,
      'QQQ',
      '2026-01-03T00:00:00.000Z',
    );
    expect(firstBarAtOrAfter).toHaveBeenNthCalledWith(
      3,
      'SPY',
      '2026-01-03T00:00:00.000Z',
    );
    expect(label).toEqual(
      expect.objectContaining({
        alphaDecisionId: 'alpha-1',
        labelAt: '2026-01-04T00:00:00.000Z',
      }),
    );
  });
});
