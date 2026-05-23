import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { LivePreflightService } from './live-preflight.service';

describe('LivePreflightService', () => {
  const envBackup = { ...process.env };
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'live-preflight-'));
    writeHydratedLeanArtifacts(tempDir);
    Object.assign(process.env, {
      BROKER_WRITE_ENABLED: 'true',
      LIVE_TRADING_ENABLED: 'true',
      MAX_LIVE_PILOT_NOTIONAL_USD: '10',
      TOSS_ORDER_SCHEMA_VERIFIED: 'true',
      TOSS_OPEN_API_SCHEMA_VERIFIED: 'true',
      BROKER_CANCEL_FLATTEN_READY: 'true',
      BROKER_OPEN_ORDER_POLL_VERIFIED: 'true',
      BROKER_CREDENTIAL_SECRET_REF: 'secret://broker/toss',
    });
    delete process.env.TOSS_CLIENT_ID;
    delete process.env.TOSS_OPEN_API_CLIENT_ID;
    delete process.env.TOSS_OPEN_API_SECRET_REF;
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
    process.env = { ...envBackup };
  });

  it('blocks live readiness when latest import is schema-only evidence', async () => {
    const service = new LivePreflightService(
      statusRepository(),
      targetRepository(),
      paperPlanRepository(),
      proposalRepository(),
      brokerSnapshotRepository(),
      executionControlRepository(),
      leanRunImportService(tempDir),
      mlRegistryService(),
      tossWriteBrokerAdapter(),
    );

    const preflight = await service.runPreflight();

    expect(preflight.status).toBe('blocked');
    expect(preflight.blockers).toEqual(
      expect.arrayContaining([
        'Run artifacts were hydrated from LEAN summary only.',
        'No LEAN insights were exported.',
        'LEAN statistics report zero total orders.',
      ]),
    );
  });

  it('classifies Toss OpenAPI env credentials as local-dev only', async () => {
    delete process.env.BROKER_CREDENTIAL_SECRET_REF;
    process.env.TOSS_OPEN_API_CLIENT_ID = 'local-client-id';
    const service = new LivePreflightService(
      statusRepository(),
      targetRepository(),
      paperPlanRepository(),
      proposalRepository(),
      brokerSnapshotRepository(),
      executionControlRepository(),
      leanRunImportService(tempDir),
      mlRegistryService(),
      tossWriteBrokerAdapter(),
    );

    const preflight = await service.runPreflight();

    expect(preflight.credentialMode).toBe('local-dev-env');
    expect(preflight.blockers).toContain(
      'Live pilot requires broker credentials from an external secret reference.',
    );
    expect(preflight.blockers).not.toContain('Broker credentials are missing.');
  });
});

function statusRepository(): any {
  return {
    create: jest.fn((input) => input),
    save: jest.fn(async (input) => input),
  };
}

function targetRepository(): any {
  return {
    find: jest.fn(async () => [
      {
        id: 'targets-db',
        targets: [{ symbol: 'SPY', targetWeight: 0.35 }],
      },
    ]),
  };
}

function proposalRepository(): any {
  return {
    findOne: jest.fn(async () => ({
      evidenceRefs: ['lean-run:bt-schema-only', 'portfolio-target:targets-db'],
    })),
  };
}

function paperPlanRepository(): any {
  return {
    find: jest.fn(async () => [
      {
        id: 'paper-plan-1',
        reconciliation: { status: 'matched' },
      },
    ]),
  };
}

function brokerSnapshotRepository(): any {
  return {
    find: jest.fn(async () => [
      {
        id: 'broker-snapshot-1',
        provider: 'toss',
        sourceRef: 'toss-read-only-poll:test',
        asOf: new Date(),
        reconciliation: {
          status: 'matched',
          checkedAt: new Date().toISOString(),
          maxAgeMinutes: 60,
        },
      },
    ]),
  };
}

function executionControlRepository(): any {
  return { find: jest.fn(async () => []) };
}

function leanRunImportService(resultDirectory: string): any {
  return {
    getLatestRun: jest.fn(async () => ({
      runId: 'bt-schema-only',
      status: 'passed',
      resultDirectory,
      parameters: {},
      statistics: {},
    })),
  };
}

function mlRegistryService(): any {
  return {
    getModelReadiness: jest.fn(() => ({ status: 'not_promoted' })),
  };
}

function tossWriteBrokerAdapter(): any {
  return {
    isLiveReady: jest.fn(() => false),
  };
}

function writeHydratedLeanArtifacts(directory: string): void {
  writeJson(join(directory, 'statistics.json'), {
    'Total Orders': 0,
    'End Equity': 100000,
  });
  writeJson(join(directory, 'insights.json'), { insights: [] });
  writeJson(join(directory, 'portfolio_targets.json'), {
    id: 'targets-schema-only',
    leanRunId: 'bt-schema-only',
    asOf: '2026-05-24T00:00:00.000Z',
    targets: [],
    grossExposurePct: 0,
    maxSingleNamePct: 0,
    riskNotes: ['hydrated_from_lean_summary_only'],
  });
  writeJson(join(directory, 'order_events.json'), { events: [] });
  writeJson(join(directory, 'fills.json'), { fills: [] });
  writeJson(join(directory, 'config.json'), {
    parameters: { hydrated: true },
  });
  writeFileSync(join(directory, 'logs.txt'), 'hydrated\n', 'utf8');
}

function writeJson(path: string, payload: unknown): void {
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
