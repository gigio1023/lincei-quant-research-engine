import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLivePilotReadinessRecords1763932800000
  implements MigrationInterface
{
  name = 'AddLivePilotReadinessRecords1763932800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "live_pilot_readiness_records" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "idempotencyKey" varchar,
        "budgetEnvelopeId" integer,
        "fundingReadinessId" integer,
        "currency" varchar NOT NULL DEFAULT ('KRW'),
        "pilotBudgetAmount" float NOT NULL,
        "maxPilotBudgetAmount" float NOT NULL,
        "maxSingleOrderNotional" float NOT NULL,
        "status" varchar NOT NULL DEFAULT ('blocked'),
        "checkedAt" datetime NOT NULL,
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
      'CREATE INDEX IF NOT EXISTS "IDX_live_pilot_readiness_records_status_checked_at" ON "live_pilot_readiness_records" ("status", "checkedAt")',
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_live_pilot_readiness_records_funding_readiness_id" ON "live_pilot_readiness_records" ("fundingReadinessId")',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_live_pilot_readiness_records_idempotency_key" ON "live_pilot_readiness_records" ("idempotencyKey")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_live_pilot_readiness_records_idempotency_key"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_live_pilot_readiness_records_funding_readiness_id"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_live_pilot_readiness_records_status_checked_at"',
    );
    await queryRunner.query(
      'DROP TABLE IF EXISTS "live_pilot_readiness_records"',
    );
  }
}
