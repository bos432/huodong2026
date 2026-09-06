import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class ActivitySeries1788652800000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    if (!(await runner.hasTable('activity_series'))) await runner.createTable(new Table({ name: 'activity_series', columns: [
      { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
      { name: 'tenantId', type: 'int', isNullable: true }, { name: 'title', type: 'varchar', length: '120' },
      { name: 'revision', type: 'int', default: 1 }, { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
      { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }
    ], foreignKeys: [new TableForeignKey({ columnNames: ['tenantId'], referencedTableName: 'tenants', referencedColumnNames: ['id'], onDelete: 'RESTRICT' })] }));
    if (!(await runner.hasColumn('activities', 'seriesId'))) await runner.addColumn('activities', new TableColumn({ name: 'seriesId', type: 'int', isNullable: true }));
    const table = await runner.getTable('activities');
    if (!table?.indices.some(index => index.name === 'IDX_activities_series')) await runner.createIndex('activities', new TableIndex({ name: 'IDX_activities_series', columnNames: ['seriesId', 'startTime'] }));
    if (!table?.foreignKeys.some(key => key.columnNames.includes('seriesId'))) await runner.createForeignKey('activities', new TableForeignKey({ columnNames: ['seriesId'], referencedTableName: 'activity_series', referencedColumnNames: ['id'], onDelete: 'SET NULL' }));
  }
  async down(runner: QueryRunner): Promise<void> {
    const table = await runner.getTable('activities');
    for (const key of table?.foreignKeys.filter(key => key.columnNames.includes('seriesId')) || []) await runner.dropForeignKey('activities', key);
    if (table?.indices.some(index => index.name === 'IDX_activities_series')) await runner.dropIndex('activities', 'IDX_activities_series');
    if (await runner.hasColumn('activities', 'seriesId')) await runner.dropColumn('activities', 'seriesId');
    if (await runner.hasTable('activity_series')) await runner.dropTable('activity_series');
  }
}
