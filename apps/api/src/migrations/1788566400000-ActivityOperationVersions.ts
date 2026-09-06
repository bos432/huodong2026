import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableUnique } from 'typeorm';
export class ActivityOperationVersions1788566400000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    if (await runner.hasTable('activity_operation_versions')) return;
    await runner.createTable(new Table({ name: 'activity_operation_versions', columns: [
      { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
      { name: 'activityId', type: 'int' }, { name: 'revision', type: 'int' }, { name: 'plan', type: 'json' },
      { name: 'updatedBy', type: 'varchar', length: '100' }, { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' }
    ], uniques: [new TableUnique({ name: 'UQ_activity_operation_version', columnNames: ['activityId', 'revision'] })],
    foreignKeys: [new TableForeignKey({ columnNames: ['activityId'], referencedTableName: 'activities', referencedColumnNames: ['id'], onDelete: 'RESTRICT' })] }));
  }
  async down(runner: QueryRunner): Promise<void> {
    if (await runner.hasTable('activity_operation_versions')) await runner.dropTable('activity_operation_versions');
  }
}
