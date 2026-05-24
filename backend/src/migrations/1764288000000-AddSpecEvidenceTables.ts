import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/** Adds active-spec evidence fields while preserving legacy v1-pilot storage. */
export class AddSpecEvidenceTables1764288000000 implements MigrationInterface {
  name = 'AddSpecEvidenceTables1764288000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.addColumnIfMissing(
      queryRunner,
      'feature_snapshots',
      new TableColumn({
        name: 'availableAt',
        type: 'varchar',
        isNullable: true,
      }),
    );
    await this.addColumnIfMissing(
      queryRunner,
      'alpha_decisions',
      new TableColumn({
        name: 'availableAt',
        type: 'varchar',
        isNullable: true,
      }),
    );
    await this.addColumnIfMissing(
      queryRunner,
      'alpha_decisions',
      new TableColumn({
        name: 'horizonHours',
        type: 'integer',
        isNullable: true,
      }),
    );
    await this.addColumnIfMissing(
      queryRunner,
      'alpha_decisions',
      new TableColumn({
        name: 'llmFeatureRefs',
        type: 'text',
        isNullable: true,
      }),
    );
    await this.addColumnIfMissing(
      queryRunner,
      'alpha_decisions',
      new TableColumn({
        name: 'numericFeatureRefs',
        type: 'text',
        isNullable: true,
      }),
    );
    await this.addColumnIfMissing(
      queryRunner,
      'alpha_decisions',
      new TableColumn({
        name: 'promptVersion',
        type: 'varchar',
        isNullable: true,
      }),
    );
    await this.addColumnIfMissing(
      queryRunner,
      'lean_runs',
      new TableColumn({
        name: 'runtime',
        type: 'varchar',
        default: "'local-lean'",
      }),
    );
    await this.addColumnIfMissing(
      queryRunner,
      'lean_runs',
      new TableColumn({ name: 'mode', type: 'varchar', default: "'backtest'" }),
    );
    await this.addColumnIfMissing(
      queryRunner,
      'lean_runs',
      new TableColumn({
        name: 'cloudProjectId',
        type: 'varchar',
        isNullable: true,
      }),
    );
    await this.addColumnIfMissing(
      queryRunner,
      'lean_runs',
      new TableColumn({
        name: 'cloudBacktestId',
        type: 'varchar',
        isNullable: true,
      }),
    );
    await this.addColumnIfMissing(
      queryRunner,
      'lean_runs',
      new TableColumn({ name: 'cloudUrl', type: 'varchar', isNullable: true }),
    );
    await this.addColumnIfMissing(
      queryRunner,
      'lean_runs',
      new TableColumn({
        name: 'promotionEligible',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "raw_evidence_records" (
        "id" varchar PRIMARY KEY NOT NULL,
        "sourceType" varchar NOT NULL,
        "symbol" varchar,
        "sourceUrl" varchar NOT NULL,
        "title" varchar NOT NULL,
        "content" text NOT NULL,
        "eventTime" varchar NOT NULL,
        "publishedAt" varchar NOT NULL,
        "retrievedAt" varchar NOT NULL,
        "availableAt" varchar NOT NULL,
        "parserVersion" varchar NOT NULL,
        "contentHash" varchar NOT NULL,
        "metadata" text NOT NULL,
        "status" varchar NOT NULL DEFAULT ('parsed'),
        "blockerReasons" text NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_raw_evidence_source_available"
      ON "raw_evidence_records" ("sourceType", "availableAt")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "llm_event_features" (
        "id" varchar PRIMARY KEY NOT NULL,
        "symbol" varchar NOT NULL,
        "eventId" varchar NOT NULL,
        "eventTime" varchar NOT NULL,
        "availableAt" varchar NOT NULL,
        "processedAt" varchar NOT NULL,
        "horizonHours" integer NOT NULL,
        "eventType" varchar NOT NULL,
        "direction" varchar NOT NULL,
        "sentimentScore" float NOT NULL,
        "catalystStrength" float NOT NULL,
        "noveltyScore" float NOT NULL,
        "uncertainty" float NOT NULL,
        "downsideRisk" float NOT NULL,
        "confidence" float NOT NULL,
        "thesis" text NOT NULL,
        "counterThesis" text NOT NULL,
        "evidenceRefs" text NOT NULL,
        "model" varchar NOT NULL,
        "promptVersion" varchar NOT NULL,
        "inputHash" varchar NOT NULL,
        "outputHash" varchar NOT NULL,
        "abstainReason" varchar,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_llm_features_symbol_available_type"
      ON "llm_event_features" ("symbol", "availableAt", "eventType")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "live_shadow_records" (
        "id" varchar PRIMARY KEY NOT NULL,
        "leanRunId" varchar,
        "portfolioTargetSnapshotId" varchar,
        "asOf" varchar NOT NULL,
        "mode" varchar NOT NULL DEFAULT ('live-shadow'),
        "status" varchar NOT NULL,
        "proposedTargets" text NOT NULL,
        "riskAdjustedTargets" text NOT NULL,
        "wouldHaveTraded" text NOT NULL,
        "reconciliation" text NOT NULL,
        "blockerReasons" text NOT NULL,
        "evidenceRefs" text NOT NULL,
        "recordHash" varchar NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_live_shadow_asof_status"
      ON "live_shadow_records" ("asOf", "status")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "promotion_decisions" (
        "id" varchar PRIMARY KEY NOT NULL,
        "scope" varchar NOT NULL,
        "targetRef" varchar NOT NULL,
        "decidedAt" varchar NOT NULL,
        "status" varchar NOT NULL,
        "evidenceRefs" text NOT NULL,
        "blockerReasons" text NOT NULL,
        "metrics" text NOT NULL,
        "decisionHash" varchar NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_promotion_scope_status_decided"
      ON "promotion_decisions" ("scope", "status", "decidedAt")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "alpha_outcome_labels" (
        "id" varchar PRIMARY KEY NOT NULL,
        "alphaDecisionId" varchar NOT NULL,
        "symbol" varchar NOT NULL,
        "asOf" varchar NOT NULL,
        "availableAt" varchar NOT NULL,
        "horizonHours" integer NOT NULL,
        "labelAt" varchar NOT NULL,
        "forwardReturnBps" float NOT NULL,
        "benchmarkReturnBps" float NOT NULL,
        "relativeReturnBps" float NOT NULL,
        "sourceRefs" text NOT NULL,
        "labelHash" varchar NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_alpha_outcome_symbol_label"
      ON "alpha_outcome_labels" ("symbol", "labelAt")
    `);

    await queryRunner.query(`
      UPDATE "feature_snapshots"
      SET "availableAt" = "dataAvailabilityTime"
      WHERE "availableAt" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "alpha_decisions"
      SET "availableAt" = "asOf"
      WHERE "availableAt" IS NULL
    `);
    await queryRunner.query(`
      UPDATE "alpha_decisions"
      SET "horizonHours" = "horizonDays" * 24
      WHERE "horizonHours" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "alpha_outcome_labels"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promotion_decisions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "live_shadow_records"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "llm_event_features"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "raw_evidence_records"`);
  }

  private async addColumnIfMissing(
    queryRunner: QueryRunner,
    tableName: string,
    column: TableColumn,
  ): Promise<void> {
    const exists = await queryRunner.hasColumn(tableName, column.name);
    if (!exists) {
      await queryRunner.addColumn(tableName, column);
    }
  }
}
