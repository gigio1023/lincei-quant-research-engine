import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddBrokerOrderStatusRecords1764105600000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'broker_order_status_records',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true, isGenerated: true },
          { name: 'provider', type: 'varchar', default: "'manual'" },
          { name: 'sourceRef', type: 'varchar', isNullable: true },
          { name: 'accountRefHash', type: 'varchar', isNullable: true },
          { name: 'brokerOrderRefHash', type: 'varchar' },
          {
            name: 'brokerOrderCommandId',
            type: 'integer',
            isNullable: true,
          },
          { name: 'brokerOrderIntentId', type: 'varchar', isNullable: true },
          { name: 'paperOrderPlanId', type: 'integer', isNullable: true },
          { name: 'status', type: 'varchar', default: "'imported'" },
          { name: 'externalStatus', type: 'varchar' },
          { name: 'symbol', type: 'varchar' },
          { name: 'side', type: 'varchar' },
          { name: 'orderType', type: 'varchar' },
          { name: 'requestedQuantity', type: 'float', isNullable: true },
          { name: 'filledQuantity', type: 'float', isNullable: true },
          { name: 'remainingQuantity', type: 'float', isNullable: true },
          { name: 'requestedNotional', type: 'float', isNullable: true },
          { name: 'averageFillPrice', type: 'float', isNullable: true },
          { name: 'limitPrice', type: 'float', isNullable: true },
          { name: 'currency', type: 'varchar', default: "'KRW'" },
          { name: 'submittedAt', type: 'datetime', isNullable: true },
          { name: 'asOf', type: 'datetime' },
          { name: 'reconciliation', type: 'text' },
          { name: 'notes', type: 'text' },
          { name: 'brokerExecutionEnabled', type: 'boolean', default: false },
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
    );
    await queryRunner.createIndex(
      'broker_order_status_records',
      new TableIndex({
        name: 'IDX_broker_order_status_provider_as_of',
        columnNames: ['provider', 'asOf'],
      }),
    );
    await queryRunner.createIndex(
      'broker_order_status_records',
      new TableIndex({
        name: 'IDX_broker_order_status_external_status_as_of',
        columnNames: ['externalStatus', 'asOf'],
      }),
    );
    await queryRunner.createIndex(
      'broker_order_status_records',
      new TableIndex({
        name: 'IDX_broker_order_status_ref_hash',
        columnNames: ['brokerOrderRefHash'],
        isUnique: true,
      }),
    );
    await queryRunner.createIndex(
      'broker_order_status_records',
      new TableIndex({
        name: 'IDX_broker_order_status_command_id',
        columnNames: ['brokerOrderCommandId'],
      }),
    );
    await queryRunner.createIndex(
      'broker_order_status_records',
      new TableIndex({
        name: 'IDX_broker_order_status_paper_plan_id',
        columnNames: ['paperOrderPlanId'],
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex(
      'broker_order_status_records',
      'IDX_broker_order_status_paper_plan_id',
    );
    await queryRunner.dropIndex(
      'broker_order_status_records',
      'IDX_broker_order_status_command_id',
    );
    await queryRunner.dropIndex(
      'broker_order_status_records',
      'IDX_broker_order_status_ref_hash',
    );
    await queryRunner.dropIndex(
      'broker_order_status_records',
      'IDX_broker_order_status_external_status_as_of',
    );
    await queryRunner.dropIndex(
      'broker_order_status_records',
      'IDX_broker_order_status_provider_as_of',
    );
    await queryRunner.dropTable('broker_order_status_records');
  }
}
