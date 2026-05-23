import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaperLockReservationIndexes1763760000000
  implements MigrationInterface
{
  name = 'AddPaperLockReservationIndexes1763760000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable('paper_accounts')) {
      if (!(await queryRunner.hasColumn('paper_accounts', 'lockVersion'))) {
        await queryRunner.query(
          'ALTER TABLE "paper_accounts" ADD COLUMN "lockVersion" integer NOT NULL DEFAULT 0',
        );
      }

      if (!(await queryRunner.hasColumn('paper_accounts', 'latestEventHash'))) {
        await queryRunner.query(
          'ALTER TABLE "paper_accounts" ADD COLUMN "latestEventHash" varchar',
        );
      }

      if (
        !(await queryRunner.hasColumn('paper_accounts', 'latestEventSequence'))
      ) {
        await queryRunner.query(
          'ALTER TABLE "paper_accounts" ADD COLUMN "latestEventSequence" integer NOT NULL DEFAULT 0',
        );
      }

      await queryRunner.query(
        'CREATE INDEX IF NOT EXISTS "IDX_paper_accounts_lock_version" ON "paper_accounts" ("id", "lockVersion")',
      );
      await queryRunner.query(
        'CREATE INDEX IF NOT EXISTS "IDX_paper_accounts_latest_event" ON "paper_accounts" ("id", "latestEventSequence", "latestEventHash")',
      );
    }

    if (await queryRunner.hasTable('paper_reservation_holds')) {
      if (
        !(await queryRunner.hasColumn(
          'paper_reservation_holds',
          'paperAccountEventHashAtHold',
        ))
      ) {
        await queryRunner.query(
          'ALTER TABLE "paper_reservation_holds" ADD COLUMN "paperAccountEventHashAtHold" varchar',
        );
      }

      if (
        !(await queryRunner.hasColumn(
          'paper_reservation_holds',
          'paperAccountEventSequenceAtHold',
        ))
      ) {
        await queryRunner.query(
          'ALTER TABLE "paper_reservation_holds" ADD COLUMN "paperAccountEventSequenceAtHold" integer',
        );
      }

      if (
        !(await queryRunner.hasColumn(
          'paper_reservation_holds',
          'accountLockVersionAtHold',
        ))
      ) {
        await queryRunner.query(
          'ALTER TABLE "paper_reservation_holds" ADD COLUMN "accountLockVersionAtHold" integer',
        );
      }

      await queryRunner.query(
        'CREATE INDEX IF NOT EXISTS "IDX_paper_reservation_account_status" ON "paper_reservation_holds" ("paperAccountId", "status")',
      );
      await queryRunner.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_paper_reservation_account_proposal_idempotency" ON "paper_reservation_holds" ("paperAccountId", "proposalId", "idempotencyKey")',
      );
      await queryRunner.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_paper_reservation_hold_id" ON "paper_reservation_holds" ("holdId")',
      );
    }

    if (await queryRunner.hasTable('paper_order_plans')) {
      await queryRunner.query(
        'CREATE INDEX IF NOT EXISTS "IDX_paper_order_plan_account_status" ON "paper_order_plans" ("paperAccountId", "status")',
      );
      await queryRunner.query(
        'CREATE INDEX IF NOT EXISTS "IDX_paper_order_plan_proposal_status" ON "paper_order_plans" ("proposalId", "status")',
      );
      await queryRunner.query(
        'CREATE UNIQUE INDEX IF NOT EXISTS "IDX_paper_order_plan_proposal_id_idempotency_key" ON "paper_order_plans" ("proposalId", "idempotencyKey")',
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_paper_order_plan_proposal_id_idempotency_key"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_paper_order_plan_proposal_status"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_paper_order_plan_account_status"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_paper_reservation_hold_id"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_paper_reservation_account_proposal_idempotency"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_paper_reservation_account_status"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_paper_accounts_latest_event"',
    );
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_paper_accounts_lock_version"',
    );
  }
}
