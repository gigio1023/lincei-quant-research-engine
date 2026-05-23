import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFundingReadinessRecords1763846400000
  implements MigrationInterface
{
  name = 'AddFundingReadinessRecords1763846400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "funding_readiness_records" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "provider" varchar NOT NULL DEFAULT ('manual'),
        "idempotencyKey" varchar,
        "brokerSnapshotId" integer,
        "accountRefHash" varchar,
        "currency" varchar NOT NULL DEFAULT ('KRW'),
        "expectedDepositAmount" float NOT NULL,
        "actualBrokerCash" float,
        "actualBrokerEquity" float,
        "brokerSnapshotAsOf" datetime NOT NULL,
        "brokerSnapshotReconciliationStatus" varchar,
        "cashDiff" float,
        "equityDiff" float,
        "snapshotAgeMinutes" float NOT NULL,
        "status" varchar NOT NULL DEFAULT ('blocked'),
        "checkedAt" datetime NOT NULL,
        "tolerance" float NOT NULL,
        "maxAgeMinutes" integer NOT NULL,
        "readinessSnapshot" json NOT NULL,
        "blockers" json NOT NULL,
        "notes" json NOT NULL,
        "brokerExecutionEnabled" boolean NOT NULL DEFAULT (0),
        "liveTradingEnabled" boolean NOT NULL DEFAULT (0),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )`,
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_funding_readiness_records_status_checked_at" ON "funding_readiness_records" ("status", "checkedAt")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_funding_readiness_records_broker_snapshot_id" ON "funding_readiness_records" ("brokerSnapshotId")',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_funding_readiness_records_idempotency_key" ON "funding_readiness_records" ("idempotencyKey")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_funding_readiness_records_idempotency_key"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_funding_readiness_records_broker_snapshot_id"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_funding_readiness_records_status_checked_at"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "funding_readiness_records"');
  }
}
