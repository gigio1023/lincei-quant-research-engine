/** Schema and policy guards at module boundaries — reject early before persistence or broker I/O. */
import { BadRequestException } from '@nestjs/common';
import {
  AlphaDecisionContract,
  FeatureSnapshotContract,
  REQUIRED_FEATURE_KEYS,
  MAX_LIVE_PILOT_NOTIONAL_USD,
  MAX_SINGLE_LIVE_ORDER_NOTIONAL_USD,
  ExecutionIntentContract,
} from './v1-pilot.contracts';
import { LlmEventFeatureContract } from './spec-contracts';

const MAX_FEATURE_AGE_MS = 72 * 60 * 60 * 1000;

export function validateFeatureSnapshot(
  snapshot: FeatureSnapshotContract,
): void {
  REQUIRED_FEATURE_KEYS.forEach((key) => {
    if (!(key in snapshot.features)) {
      throw new BadRequestException(
        `Feature snapshot missing required key: ${key}`,
      );
    }
  });

  const availability = new Date(
    snapshot.availableAt ?? snapshot.dataAvailabilityTime,
  ).getTime();
  const asOf = new Date(snapshot.asOf).getTime();
  if (Number.isNaN(availability) || Number.isNaN(asOf)) {
    throw new BadRequestException('Feature snapshot timestamps are invalid.');
  }

  if (asOf < availability) {
    throw new BadRequestException(
      'Feature snapshot asOf precedes data availability.',
    );
  }

  // Execution-like paths fail closed on stale features so old data cannot silently size new exposure.
  if (Date.now() - availability > MAX_FEATURE_AGE_MS) {
    throw new BadRequestException(
      'Feature snapshot is stale for execution policy.',
    );
  }
}

export function validateAlphaDecision(decision: AlphaDecisionContract): void {
  const availableAt = new Date(decision.availableAt).getTime();
  const asOf = new Date(decision.asOf).getTime();
  if (!Number.isFinite(availableAt) || asOf < availableAt) {
    throw new BadRequestException(
      'Alpha decision asOf precedes availability time.',
    );
  }

  if (!Number.isInteger(decision.horizonHours) || decision.horizonHours <= 0) {
    throw new BadRequestException(
      'Alpha decision horizonHours must be a positive integer.',
    );
  }

  if (decision.confidence < 0 || decision.confidence > 1) {
    throw new BadRequestException(
      'Alpha decision confidence must be between 0 and 1.',
    );
  }

  if (decision.maxPositionPct !== undefined && decision.maxPositionPct > 0.35) {
    throw new BadRequestException(
      'Alpha decision maxPositionPct exceeds live policy.',
    );
  }

  if (decision.direction !== 'flat') {
    if (!decision.thesis || !decision.counterThesis) {
      throw new BadRequestException(
        'Non-flat alpha decisions require thesis and counterThesis.',
      );
    }
    if (!decision.evidenceRefs.length) {
      throw new BadRequestException(
        'Non-flat alpha decisions require at least one evidence ref.',
      );
    }
  }
}

export function validateLlmEventFeature(
  feature: LlmEventFeatureContract,
): void {
  const timestamps = [
    feature.eventTime,
    feature.availableAt,
    feature.processedAt,
  ].map((value) => new Date(value).getTime());
  if (timestamps.some((value) => !Number.isFinite(value))) {
    throw new BadRequestException('LLM event feature timestamps are invalid.');
  }
  if (new Date(feature.processedAt).getTime() < timestamps[1]) {
    throw new BadRequestException(
      'LLM event feature processedAt precedes availableAt.',
    );
  }
  if (feature.horizonHours <= 0) {
    throw new BadRequestException(
      'LLM event feature horizonHours must be positive.',
    );
  }
  [
    feature.sentimentScore,
    feature.catalystStrength,
    feature.noveltyScore,
    feature.uncertainty,
    feature.downsideRisk,
    feature.confidence,
  ].forEach((value) => {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new BadRequestException(
        'LLM event feature scores must be finite values between 0 and 1.',
      );
    }
  });
  if (!feature.evidenceRefs.length) {
    throw new BadRequestException(
      'LLM event feature requires at least one evidence ref.',
    );
  }
}

export function validateExecutionIntent(intent: ExecutionIntentContract): void {
  if (intent.mode === 'live') {
    const notional = intent.notionalUsd ?? 0;
    if (notional > MAX_LIVE_PILOT_NOTIONAL_USD) {
      throw new BadRequestException(
        `Live execution intent exceeds ${MAX_LIVE_PILOT_NOTIONAL_USD} USD cap.`,
      );
    }
    if (notional > MAX_SINGLE_LIVE_ORDER_NOTIONAL_USD) {
      throw new BadRequestException(
        `Live single order exceeds ${MAX_SINGLE_LIVE_ORDER_NOTIONAL_USD} USD cap.`,
      );
    }
    if (intent.orderType === 'market') {
      throw new BadRequestException(
        'Broker-write market orders are disabled by policy.',
      );
    }
  }
}
