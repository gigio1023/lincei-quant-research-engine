import { BrokerAdapterReadinessService } from './broker-adapter-readiness.service';

describe('BrokerAdapterReadinessService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.BROKER_PROVIDER;
    delete process.env.BROKER_READ_ONLY_ENABLED;
    delete process.env.TOSS_OPEN_API_BASE_URL;
    delete process.env.TOSS_OPEN_API_CLIENT_ID;
    delete process.env.TOSS_OPEN_API_CLIENT_SECRET;
    delete process.env.TOSS_OPEN_API_ACCOUNT_REF;
    delete process.env.TOSS_OPEN_API_ACCOUNT_SEQ;
    delete process.env.TOSS_READ_ONLY_POLLER_ENABLED;
    delete process.env.TOSS_OPEN_API_SCHEMA_VERIFIED;
    delete process.env.TOSS_OPEN_API_SANDBOX_VERIFIED;
    delete process.env.TOSS_OPEN_API_LAST_VERIFIED_AT;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('reports Toss broker readiness as blocked by default', () => {
    const service = new BrokerAdapterReadinessService();

    const status = service.getStatus();

    expect(status).toEqual(
      expect.objectContaining({
        provider: 'toss',
        configured: false,
        readOnlyEnabled: false,
        paperTradingEnabled: false,
        liveTradingEnabled: false,
        authMethod: 'oauth2_client_credentials',
        credentialRef: 'missing',
        schemaVerified: false,
        sandboxVerified: false,
        brokerExecutionEnabled: false,
        readOnlyPoll: expect.objectContaining({
          enabled: false,
          canPoll: false,
          brokerExecutionEnabled: false,
          liveTradingEnabled: false,
        }),
      }),
    );
    expect(status.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining('credentials'),
        expect.stringContaining('openApiSchema'),
        expect.stringContaining('orderPlacement'),
      ]),
    );
  });

  it('marks read-only capability ready only after credentials and schema are verified', () => {
    process.env.BROKER_READ_ONLY_ENABLED = 'true';
    process.env.TOSS_OPEN_API_BASE_URL = 'https://openapi.tossinvest.com';
    process.env.TOSS_OPEN_API_CLIENT_ID = 'client-123456';
    process.env.TOSS_OPEN_API_CLIENT_SECRET = 'secret-value';
    process.env.TOSS_OPEN_API_ACCOUNT_REF = 'account-ref';
    process.env.TOSS_OPEN_API_SCHEMA_VERIFIED = 'true';
    process.env.TOSS_OPEN_API_LAST_VERIFIED_AT = '2026-05-23T00:00:00.000Z';

    const service = new BrokerAdapterReadinessService();

    const status = service.getStatus();

    expect(status).toEqual(
      expect.objectContaining({
        configured: true,
        readOnlyEnabled: true,
        liveTradingEnabled: false,
        credentialRef: 'cli***456',
        schemaVerified: true,
        sandboxVerified: false,
        lastVerifiedAt: '2026-05-23T00:00:00.000Z',
        readOnlyPoll: expect.objectContaining({
          enabled: false,
          configured: true,
          schemaVerified: true,
          canPoll: false,
        }),
      }),
    );
    expect(status.capabilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'readOnlyAccountSnapshot',
          status: 'ready',
        }),
        expect.objectContaining({
          key: 'orderPlacement',
          status: 'blocked',
        }),
      ]),
    );
  });
});
