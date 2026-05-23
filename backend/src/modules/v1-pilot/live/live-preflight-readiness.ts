import { BrokerSnapshot } from '../../../entities/broker-snapshot.entity';

export type LeanRunConfigEvidence = {
  parameters?: Record<string, string | number | boolean>;
  simulator?: string;
  mode?: string;
};

export function readLeanParameter(
  parameters: Record<string, string | number | boolean>,
  key: string,
): string | number | boolean | undefined {
  const camelKey = key.replace(/-([a-z])/g, (_, char: string) =>
    char.toUpperCase(),
  );
  return parameters[key] ?? parameters[camelKey];
}

export function readLeanBooleanParameter(
  parameters: Record<string, string | number | boolean>,
  key: string,
): boolean {
  const raw = readLeanParameter(parameters, key);
  if (typeof raw === 'boolean') {
    return raw;
  }
  if (typeof raw === 'number') {
    return raw !== 0;
  }
  return String(raw).toLowerCase() === 'true';
}

export function assessStaticLeanRunBlockers(
  parameters: Record<string, string | number | boolean>,
  configOnDisk: LeanRunConfigEvidence | null,
  researchAllowed: boolean,
): string[] {
  if (researchAllowed) {
    return [];
  }

  const blockers: string[] = [];
  const validationMode = String(
    readLeanParameter(parameters, 'validation-mode') ?? '',
  );
  if (validationMode === 'flow-validation') {
    blockers.push(
      'Latest LEAN run is flow-validation only (artifact plumbing), not a historical numeric backtest.',
    );
  }
  if (readLeanBooleanParameter(parameters, 'uses-static-meta-overlay')) {
    blockers.push(
      'Latest LEAN run used a static LLM/meta overlay; that is not historical alpha validation for live readiness.',
    );
  }
  if (readLeanBooleanParameter(parameters, 'uses-static-ml-predictions')) {
    blockers.push(
      'Latest LEAN run used static ML predictions; live readiness requires point-in-time or in-LEAN predictions.',
    );
  }
  if (!configOnDisk && !Object.keys(parameters).length) {
    blockers.push(
      'Latest LEAN run has no config.json or parameters evidence on disk.',
    );
  }
  return blockers;
}

export function assessBrokerSnapshotForLive(
  snapshot: BrokerSnapshot,
): string[] {
  const blockers: string[] = [];
  if (snapshot.provider !== 'toss') {
    blockers.push(
      `Latest broker snapshot provider is "${snapshot.provider}"; live requires a Toss read-only poll.`,
    );
  }
  if (!snapshot.sourceRef?.startsWith('toss-read-only-poll')) {
    blockers.push(
      'Latest broker snapshot does not come from Toss read-only polling.',
    );
  }

  const reconciliationStatus = snapshot.reconciliation?.status;
  if (reconciliationStatus !== 'matched') {
    blockers.push(
      `Broker snapshot reconciliation is "${reconciliationStatus ?? 'unknown'}"; matched required before live.`,
    );
  }
  return blockers;
}
