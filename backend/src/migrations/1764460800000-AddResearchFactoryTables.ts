import { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds the durable parallel research factory ledger required by SPEC.md. */
export class AddResearchFactoryTables1764460800000
  implements MigrationInterface
{
  name = 'AddResearchFactoryTables1764460800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "research_hypotheses" (
        "id" varchar PRIMARY KEY NOT NULL,
        "sourceCorpus" varchar NOT NULL,
        "sourceRef" varchar NOT NULL,
        "sourceUrl" varchar NOT NULL,
        "sourceTitle" varchar NOT NULL,
        "sourceAuthor" varchar,
        "sourcePublished" varchar,
        "localPath" varchar,
        "priority" varchar NOT NULL,
        "status" varchar NOT NULL,
        "strategyFamily" varchar NOT NULL,
        "hypothesis" text NOT NULL,
        "requiredData" text NOT NULL,
        "currentProjectGap" text NOT NULL,
        "evidenceRefs" text NOT NULL,
        "blockerReasons" text NOT NULL,
        "extractionVersion" varchar NOT NULL,
        "contentHash" varchar NOT NULL,
        "inputHash" varchar NOT NULL,
        "hypothesisHash" varchar NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_research_hypotheses_priority_status"
      ON "research_hypotheses" ("priority", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_research_hypotheses_source_ref"
      ON "research_hypotheses" ("sourceCorpus", "sourceRef")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "research_job_records" (
        "jobId" varchar PRIMARY KEY NOT NULL,
        "runId" varchar NOT NULL,
        "parentJobId" varchar,
        "jobType" varchar NOT NULL,
        "partitionKey" varchar NOT NULL,
        "inputRefs" text NOT NULL,
        "inputHash" varchar NOT NULL,
        "outputRefs" text NOT NULL,
        "outputHash" varchar,
        "startedAt" varchar NOT NULL,
        "completedAt" varchar,
        "status" varchar NOT NULL,
        "retryOf" varchar,
        "costRef" varchar,
        "blockerReasons" text NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_research_job_records_run_status"
      ON "research_job_records" ("runId", "status")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_research_job_records_type_partition"
      ON "research_job_records" ("jobType", "partitionKey")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_research_job_records_type_partition"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_research_job_records_run_status"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "research_job_records"');
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_research_hypotheses_source_ref"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_research_hypotheses_priority_status"',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "research_hypotheses"');
  }
}
