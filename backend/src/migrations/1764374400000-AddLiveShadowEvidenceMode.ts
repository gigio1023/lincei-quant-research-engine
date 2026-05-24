import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLiveShadowEvidenceMode1764374400000
  implements MigrationInterface
{
  name = 'AddLiveShadowEvidenceMode1764374400000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "live_shadow_records"
      ADD COLUMN "evidenceMode" varchar NOT NULL DEFAULT ('historical_target_replay')
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "live_shadow_records"
      DROP COLUMN "evidenceMode"
    `);
  }
}
