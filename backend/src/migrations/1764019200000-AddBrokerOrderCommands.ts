import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddBrokerOrderCommands1764019200000 implements MigrationInterface {
  name = 'AddBrokerOrderCommands1764019200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'broker_order_commands',
        columns: [
          {
            name: 'id',
            type: 'integer',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'idempotencyKey', type: 'varchar', isNullable: true },
          { name: 'provider', type: 'varchar', default: "'toss'" },
          { name: 'commandType', type: 'varchar' },
          { name: 'status', type: 'varchar', default: "'blocked'" },
          { name: 'mode', type: 'varchar', default: "'dry_run'" },
          { name: 'sourceType', type: 'varchar' },
          { name: 'proposalId', type: 'integer', isNullable: true },
          { name: 'paperOrderPlanId', type: 'integer', isNullable: true },
          { name: 'orderPlanApprovalId', type: 'integer', isNullable: true },
          { name: 'livePilotReadinessId', type: 'integer', isNullable: true },
          { name: 'checkedAt', type: 'datetime' },
          { name: 'commandHash', type: 'varchar' },
          { name: 'readinessSnapshot', type: 'text' },
          { name: 'orderIntents', type: 'text' },
          { name: 'emergencyActions', type: 'text' },
          { name: 'blockedReasons', type: 'text' },
          { name: 'notes', type: 'text' },
          {
            name: 'brokerExecutionEnabled',
            type: 'boolean',
            default: false,
          },
          { name: 'liveTradingEnabled', type: 'boolean', default: false },
          {
            name: 'createdAt',
            type: 'datetime',
            default: "datetime('now')",
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: "datetime('now')",
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'broker_order_commands',
      new TableIndex({
        name: 'IDX_broker_order_commands_command_type_created_at',
        columnNames: ['commandType', 'createdAt'],
      }),
    );
    await queryRunner.createIndex(
      'broker_order_commands',
      new TableIndex({
        name: 'IDX_broker_order_commands_paper_order_plan_id',
        columnNames: ['paperOrderPlanId'],
      }),
    );
    await queryRunner.createIndex(
      'broker_order_commands',
      new TableIndex({
        name: 'IDX_broker_order_commands_live_pilot_readiness_id',
        columnNames: ['livePilotReadinessId'],
      }),
    );
    await queryRunner.createIndex(
      'broker_order_commands',
      new TableIndex({
        name: 'IDX_broker_order_commands_idempotency_key',
        columnNames: ['idempotencyKey'],
        isUnique: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'broker_order_commands',
      'IDX_broker_order_commands_idempotency_key',
    );
    await queryRunner.dropIndex(
      'broker_order_commands',
      'IDX_broker_order_commands_live_pilot_readiness_id',
    );
    await queryRunner.dropIndex(
      'broker_order_commands',
      'IDX_broker_order_commands_paper_order_plan_id',
    );
    await queryRunner.dropIndex(
      'broker_order_commands',
      'IDX_broker_order_commands_command_type_created_at',
    );
    await queryRunner.dropTable('broker_order_commands');
  }
}
