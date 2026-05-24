import { readFileSync } from 'fs';
import { join } from 'path';
import {
  combineMetaFromDecisions,
  combineMetaLeanReplay,
  directionFromMetaScore,
  MetaDirectionInput,
} from './meta-alpha.combiner';

type FixtureCase = {
  name: string;
  numeric?: MetaDirectionInput;
  llmEvent?: MetaDirectionInput;
  llmMacro?: MetaDirectionInput;
  llmRisk?: MetaDirectionInput;
  expected: {
    numericScore: number;
    eventScore: number;
    macroScore: number;
    riskAdjustment: number;
    finalScore: number;
    direction: 'up' | 'flat';
  };
};

const fixturePath = join(__dirname, 'fixtures/meta-alpha-parity.fixture.json');
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')) as {
  cases: FixtureCase[];
};

describe('meta-alpha combiner parity', () => {
  it.each(fixture.cases)(
    'nest combiner matches fixture for $name',
    ({ numeric, llmEvent, llmMacro, llmRisk, expected }) => {
      const result = combineMetaFromDecisions({
        numeric,
        llmEvent,
        llmMacro,
        llmRisk,
      });

      expect(result.numericScore).toBeCloseTo(expected.numericScore, 4);
      expect(result.eventScore).toBeCloseTo(expected.eventScore, 4);
      expect(result.macroScore).toBeCloseTo(expected.macroScore, 4);
      expect(result.riskAdjustment).toBeCloseTo(expected.riskAdjustment, 4);
      expect(result.finalScore).toBeCloseTo(expected.finalScore, 4);
      expect(directionFromMetaScore(result.finalScore)).toBe(
        expected.direction,
      );
    },
  );

  it.each(fixture.cases)(
    'lean replay uses exported component scores for $name',
    ({ numeric, llmEvent, llmMacro, llmRisk, expected }) => {
      const nest = combineMetaFromDecisions({
        numeric,
        llmEvent,
        llmMacro,
        llmRisk,
      });
      const exportRecord = {
        id: `meta-test-${expected.direction}`,
        symbol: 'SPY',
        asOf: '2026-05-24T00:00:00.000Z',
        availableAt: '2026-05-24T00:00:00.000Z',
        horizonHours: 504,
        direction: expected.direction,
        confidence: nest.finalScore,
        numericScore: nest.numericScore,
        eventScore: nest.eventScore,
        macroScore: nest.macroScore,
        riskAdjustment: nest.riskAdjustment,
        finalScore: nest.finalScore,
        llmScores: {
          event: nest.eventScore,
          macro: nest.macroScore,
          riskAdjustment: nest.riskAdjustment,
        },
        featureSnapshotHash: 'sha256:feature',
        evidenceRefs: ['fixture:evidence'],
        llmFeatureRefs: [],
        numericFeatureRefs: ['sha256:numeric'],
        outputHash: 'sha256:output',
      };

      const lean = combineMetaLeanReplay(0.42, exportRecord);

      expect(lean.finalScore).toBeCloseTo(expected.finalScore, 4);
      expect(lean.direction).toBe(expected.direction);
      expect(lean.numericScore).toBeCloseTo(expected.numericScore, 4);
      expect(lean.eventScore).toBeCloseTo(expected.eventScore, 4);
      expect(lean.macroScore).toBeCloseTo(expected.macroScore, 4);
      expect(lean.riskAdjustment).toBeCloseTo(expected.riskAdjustment, 4);
    },
  );

  it('exported_record_replay uses precomputed scores not live numeric', () => {
    const exportRecord = {
      id: 'meta-spy-export',
      symbol: 'SPY',
      asOf: '2026-05-24T00:00:00.000Z',
      availableAt: '2026-05-24T00:00:00.000Z',
      horizonHours: 504,
      direction: 'up' as const,
      confidence: 0.739,
      numericScore: 0.82,
      eventScore: 0.7,
      macroScore: 0.65,
      riskAdjustment: 0.48,
      finalScore: 0.739,
      llmScores: {
        event: 0.7,
        macro: 0.65,
        riskAdjustment: 0.48,
      },
      featureSnapshotHash: 'sha256:feature',
      evidenceRefs: ['fixture:evidence'],
      llmFeatureRefs: [],
      numericFeatureRefs: ['sha256:numeric'],
      outputHash: 'sha256:output',
    };

    const lean = combineMetaLeanReplay(0.99, exportRecord);
    expect(lean.finalScore).toBeCloseTo(0.739, 4);
    expect(lean.numericScore).toBeCloseTo(0.82, 4);
    expect(lean.direction).toBe('up');
  });
});
