import { AlphaDirection } from '../contracts/v1-pilot.contracts';

export const META_NUMERIC_WEIGHT = 0.5;
export const META_EVENT_WEIGHT = 0.25;
export const META_MACRO_WEIGHT = 0.15;
export const META_RISK_WEIGHT = 0.1;
export const META_UP_THRESHOLD = 0.65;

export interface MetaDirectionInput {
  direction?: AlphaDirection;
  confidence?: number;
}

export interface MetaComponentScores {
  numericScore: number;
  eventScore: number;
  macroScore: number;
  riskAdjustment: number;
  finalScore: number;
}

export interface MetaDecisionExportRecord {
  id: string;
  symbol: string;
  asOf: string;
  availableAt: string;
  horizonHours: number;
  direction: 'up' | 'flat';
  confidence: number;
  numericScore: number;
  eventScore: number;
  macroScore: number;
  riskAdjustment: number;
  finalScore: number;
  llmScores: {
    event: number;
    macro: number;
    riskAdjustment: number;
  };
  maxPositionPct?: number;
  featureSnapshotHash: string;
  evidenceRefs: string[];
  llmFeatureRefs: string[];
  numericFeatureRefs: string[];
  outputHash: string;
}

export function directionScore(
  direction: AlphaDirection | undefined,
  confidence = 0.5,
): number {
  if (direction === 'up') {
    return confidence;
  }
  if (direction === 'down') {
    return 1 - confidence;
  }
  return 0.5;
}

export function combineMetaComponentScores(
  numericScore: number,
  eventScore: number,
  macroScore: number,
  riskAdjustment: number,
): number {
  const finalScore =
    numericScore * META_NUMERIC_WEIGHT +
    eventScore * META_EVENT_WEIGHT +
    macroScore * META_MACRO_WEIGHT +
    riskAdjustment * META_RISK_WEIGHT;
  return Number(Math.min(1, Math.max(0, finalScore)).toFixed(6));
}

export function combineMetaFromDecisions(input: {
  numeric?: MetaDirectionInput;
  llmEvent?: MetaDirectionInput;
  llmMacro?: MetaDirectionInput;
  llmRisk?: MetaDirectionInput;
}): MetaComponentScores {
  const numericScore = directionScore(
    input.numeric?.direction,
    input.numeric?.confidence,
  );
  const eventScore = directionScore(
    input.llmEvent?.direction,
    input.llmEvent?.confidence,
  );
  const macroScore = directionScore(
    input.llmMacro?.direction,
    input.llmMacro?.confidence,
  );
  const riskAdjustment =
    1 - directionScore(input.llmRisk?.direction, input.llmRisk?.confidence);
  const finalScore = combineMetaComponentScores(
    numericScore,
    eventScore,
    macroScore,
    riskAdjustment,
  );
  return { numericScore, eventScore, macroScore, riskAdjustment, finalScore };
}

export function directionFromMetaScore(finalScore: number): 'up' | 'flat' {
  return finalScore >= META_UP_THRESHOLD ? 'up' : 'flat';
}

/** Mirrors LEAN replay path: prefer Nest-exported component scores and finalScore. */
export function combineMetaLeanReplay(
  liveNumericScore: number,
  metaRecord: Partial<MetaDecisionExportRecord> | null | undefined,
): MetaComponentScores & { direction: 'up' | 'flat' } {
  if (!metaRecord) {
    return {
      numericScore: liveNumericScore,
      eventScore: 0.5,
      macroScore: 0.5,
      riskAdjustment: 0.5,
      finalScore: liveNumericScore,
      direction: directionFromMetaScore(liveNumericScore),
    };
  }

  const llmScores = metaRecord.llmScores;
  const numericScore = metaRecord.numericScore ?? liveNumericScore;
  const eventScore = metaRecord.eventScore ?? llmScores?.event ?? 0.5;
  const macroScore = metaRecord.macroScore ?? llmScores?.macro ?? 0.5;
  const riskAdjustment =
    metaRecord.riskAdjustment ?? llmScores?.riskAdjustment ?? 0.5;
  const finalScore =
    metaRecord.finalScore ??
    combineMetaComponentScores(
      numericScore,
      eventScore,
      macroScore,
      riskAdjustment,
    );

  return {
    numericScore,
    eventScore,
    macroScore,
    riskAdjustment,
    finalScore,
    direction: directionFromMetaScore(finalScore),
  };
}
