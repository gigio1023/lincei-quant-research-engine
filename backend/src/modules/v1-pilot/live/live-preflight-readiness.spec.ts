import { BrokerSnapshot } from '../../../entities/broker-snapshot.entity';
import {
  assessBrokerSnapshotForLive,
  assessStaticLeanRunBlockers,
  readLeanBooleanParameter,
  readLeanParameter,
} from './live-preflight-readiness';

describe('live preflight readiness helpers', () => {
  it('reads LEAN parameters in kebab-case and camelCase', () => {
    const parameters = {
      'validation-mode': 'flow-validation',
      usesStaticMlPredictions: true,
    };

    expect(readLeanParameter(parameters, 'validation-mode')).toBe(
      'flow-validation',
    );
    expect(
      readLeanBooleanParameter(parameters, 'uses-static-ml-predictions'),
    ).toBe(true);
  });

  it('blocks flow validation and static overlays for live readiness', () => {
    const blockers = assessStaticLeanRunBlockers(
      {
        'validation-mode': 'flow-validation',
        'uses-static-meta-overlay': true,
        'uses-static-ml-predictions': true,
      },
      { parameters: {} },
      false,
    );

    expect(blockers).toEqual(
      expect.arrayContaining([
        'Latest LEAN run is flow-validation only (artifact plumbing), not a historical numeric backtest.',
        'Latest LEAN run used a static LLM/meta overlay; that is not historical alpha validation for live readiness.',
        'Latest LEAN run used static ML predictions; live readiness requires point-in-time or in-LEAN predictions.',
      ]),
    );
  });

  it('requires Toss read-only broker evidence', () => {
    const manual = {
      provider: 'manual',
      sourceRef: 'operator-import',
      reconciliation: { status: 'matched' },
    } as BrokerSnapshot;

    expect(assessBrokerSnapshotForLive(manual)).toEqual(
      expect.arrayContaining([
        'Latest broker snapshot provider is "manual"; live requires a Toss read-only poll.',
        'Latest broker snapshot does not come from Toss read-only polling.',
      ]),
    );
  });

  it('accepts matched Toss read-only broker evidence', () => {
    const toss = {
      provider: 'toss',
      sourceRef: 'toss-read-only-poll:manual',
      reconciliation: { status: 'matched' },
    } as BrokerSnapshot;

    expect(assessBrokerSnapshotForLive(toss)).toEqual([]);
  });
});
