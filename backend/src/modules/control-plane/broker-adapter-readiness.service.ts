import { Injectable } from '@nestjs/common';
import {
  BrokerAdapterCapability,
  BrokerAdapterProvider,
  BrokerAdapterStatus,
} from './control-plane.types';

@Injectable()
export class BrokerAdapterReadinessService {
  getStatus(): BrokerAdapterStatus {
    const provider = this.parseProvider(process.env.BROKER_PROVIDER);
    const baseUrl = process.env.TOSS_OPEN_API_BASE_URL;
    const clientIdConfigured = Boolean(process.env.TOSS_OPEN_API_CLIENT_ID);
    const clientSecretConfigured = Boolean(
      process.env.TOSS_OPEN_API_CLIENT_SECRET,
    );
    const accountRefConfigured = Boolean(process.env.TOSS_OPEN_API_ACCOUNT_REF);
    const schemaVerified = process.env.TOSS_OPEN_API_SCHEMA_VERIFIED === 'true';
    const sandboxVerified =
      process.env.TOSS_OPEN_API_SANDBOX_VERIFIED === 'true';
    const readOnlyEnabled =
      process.env.BROKER_READ_ONLY_ENABLED === 'true' &&
      clientIdConfigured &&
      clientSecretConfigured &&
      accountRefConfigured &&
      schemaVerified;
    const configured =
      clientIdConfigured && clientSecretConfigured && accountRefConfigured;
    const credentialRef = configured
      ? this.maskCredentialRef(process.env.TOSS_OPEN_API_CLIENT_ID)
      : 'missing';

    const capabilities: BrokerAdapterCapability[] = [
      {
        key: 'credentials',
        status: configured ? 'configured' : 'blocked',
        detail: configured
          ? 'Toss credential environment variables are present and masked.'
          : 'TOSS_OPEN_API_CLIENT_ID, TOSS_OPEN_API_CLIENT_SECRET, and TOSS_OPEN_API_ACCOUNT_REF are required.',
      },
      {
        key: 'openApiSchema',
        status: schemaVerified ? 'ready' : 'blocked',
        detail: schemaVerified
          ? 'Operator marked the Toss OpenAPI schema as verified.'
          : 'Exact Toss OpenAPI schema is not verified in this repo.',
      },
      {
        key: 'readOnlyAccountSnapshot',
        status: readOnlyEnabled ? 'ready' : 'blocked',
        detail: readOnlyEnabled
          ? 'Read-only snapshot polling can be wired to the broker adapter.'
          : 'Read-only polling remains disabled until credentials, schema, and BROKER_READ_ONLY_ENABLED=true are present.',
      },
      {
        key: 'holdingsSnapshot',
        status: readOnlyEnabled ? 'ready' : 'blocked',
        detail:
          'Holdings can only be trusted after account and holdings response schemas are verified.',
      },
      {
        key: 'orderPreview',
        status: 'not_implemented',
        detail:
          'Order preview or orderable amount support is not implemented yet.',
      },
      {
        key: 'paperOrSandbox',
        status: sandboxVerified ? 'configured' : 'blocked',
        detail: sandboxVerified
          ? 'Operator marked a sandbox or paper environment as verified.'
          : 'No Toss sandbox or paper environment is verified.',
      },
      {
        key: 'orderPlacement',
        status: 'blocked',
        detail:
          'Live order placement is intentionally blocked until read-only reconciliation, sandbox parity, approval custody, and kill switch runtime exist.',
      },
      {
        key: 'orderCancelReplace',
        status: 'not_implemented',
        detail:
          'Cancel and modify endpoints are not implemented and must share the same signed order-plan guard.',
      },
      {
        key: 'fillPolling',
        status: 'not_implemented',
        detail:
          'Fill and order-state polling are not implemented; paper fills remain local simulator evidence.',
      },
      {
        key: 'reconciliation',
        status: 'blocked',
        detail:
          'Broker-backed reconciliation requires read-only polling plus account/holdings/fill mapping.',
      },
      {
        key: 'killSwitch',
        status: 'blocked',
        detail:
          'Production kill switch runtime is not implemented for broker orders.',
      },
    ];

    return {
      provider,
      configured,
      readOnlyEnabled,
      paperTradingEnabled: false,
      liveTradingEnabled: false,
      baseUrl,
      authMethod: 'oauth2_client_credentials',
      credentialRef,
      schemaVerified,
      sandboxVerified,
      lastVerifiedAt: process.env.TOSS_OPEN_API_LAST_VERIFIED_AT,
      capabilities,
      blockers: capabilities
        .filter((capability) =>
          ['blocked', 'not_implemented'].includes(capability.status),
        )
        .map((capability) => `${capability.key}: ${capability.detail}`),
      brokerExecutionEnabled: false,
    };
  }

  private parseProvider(value: string | undefined): BrokerAdapterProvider {
    if (value === 'manual' || value === 'simulated' || value === 'toss') {
      return value;
    }

    return 'toss';
  }

  private maskCredentialRef(value: string | undefined): string {
    if (!value) {
      return 'missing';
    }

    if (value.length <= 6) {
      return 'configured';
    }

    return `${value.slice(0, 3)}***${value.slice(-3)}`;
  }
}
