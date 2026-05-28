import { MigrationInterface, QueryRunner } from 'typeorm';

/** V1 pilot ledgers: LEAN runs, alpha decisions, targets, execution intents, and legacy live-preflight history. */
export class AddV1PilotTables1764201600000 implements MigrationInterface {
  name = 'AddV1PilotTables1764201600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "lean_runs" (
        "runId" varchar PRIMARY KEY NOT NULL,
        "projectName" varchar NOT NULL,
        "algorithmVersion" varchar NOT NULL,
        "parameters" text NOT NULL,
        "startedAt" datetime NOT NULL,
        "completedAt" datetime NOT NULL,
        "status" varchar NOT NULL DEFAULT ('passed'),
        "resultDirectory" varchar NOT NULL,
        "sourceHash" varchar NOT NULL,
        "configHash" varchar NOT NULL,
        "dataManifestHash" varchar NOT NULL,
        "statistics" text NOT NULL,
        "equityCurveRef" varchar,
        "insightsRef" varchar,
        "portfolioTargetsRef" varchar,
        "orderEventsRef" varchar,
        "fillsRef" varchar,
        "logsRef" varchar,
        "blockerReasons" text NOT NULL,
        "importIdempotencyKey" varchar NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "UQ_lean_runs_import_idempotency" UNIQUE ("importIdempotencyKey")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "feature_snapshots" (
        "id" varchar PRIMARY KEY NOT NULL,
        "symbol" varchar NOT NULL,
        "asOf" varchar NOT NULL,
        "dataAvailabilityTime" varchar NOT NULL,
        "timeframe" varchar NOT NULL DEFAULT ('daily'),
        "features" text NOT NULL,
        "sourceRefs" text NOT NULL,
        "inputHash" varchar NOT NULL,
        "featureVersion" varchar NOT NULL DEFAULT ('v1'),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "alpha_decisions" (
        "id" varchar PRIMARY KEY NOT NULL,
        "source" varchar NOT NULL,
        "symbol" varchar NOT NULL,
        "asOf" varchar NOT NULL,
        "horizonDays" integer NOT NULL,
        "direction" varchar NOT NULL,
        "expectedReturnBps" float,
        "confidence" float NOT NULL,
        "conviction" varchar NOT NULL,
        "maxPositionPct" float,
        "stopLossPct" float,
        "takeProfitPct" float,
        "featureSnapshotHash" varchar NOT NULL,
        "sourceModels" text NOT NULL,
        "evidenceRefs" text NOT NULL,
        "thesis" varchar,
        "counterThesis" varchar,
        "abstainReason" varchar,
        "inputHash" varchar NOT NULL,
        "outputHash" varchar NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "portfolio_target_snapshots" (
        "id" varchar PRIMARY KEY NOT NULL,
        "leanRunId" varchar NOT NULL,
        "asOf" varchar NOT NULL,
        "targets" text NOT NULL,
        "grossExposurePct" float NOT NULL,
        "maxSingleNamePct" float NOT NULL,
        "targetHash" varchar NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "execution_intents" (
        "id" varchar PRIMARY KEY NOT NULL,
        "mode" varchar NOT NULL,
        "source" varchar NOT NULL,
        "portfolioTargetSnapshotId" varchar,
        "symbol" varchar NOT NULL,
        "side" varchar NOT NULL,
        "orderType" varchar NOT NULL,
        "quantity" float,
        "notionalUsd" float,
        "limitPrice" float,
        "timeInForce" varchar NOT NULL DEFAULT ('day'),
        "maxSlippageBps" integer NOT NULL,
        "idempotencyKey" varchar NOT NULL,
        "approvalRef" varchar NOT NULL,
        "intentHash" varchar NOT NULL,
        "status" varchar NOT NULL DEFAULT ('planned'),
        "blockers" text NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "UQ_execution_intents_idempotency" UNIQUE ("idempotencyKey")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "live_pilot_status_records" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "status" varchar NOT NULL,
        "checkedAt" datetime NOT NULL,
        "preflight" text NOT NULL,
        "realOrderSent" boolean NOT NULL DEFAULT (0),
        "blockers" text NOT NULL,
        "latestLeanRunId" varchar,
        "latestPaperPlanId" integer,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "live_pilot_status_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "execution_intents"`);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "portfolio_target_snapshots"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "alpha_decisions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "feature_snapshots"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "lean_runs"`);
  }
}
