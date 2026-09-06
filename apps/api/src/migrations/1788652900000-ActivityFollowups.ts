import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex, TableUnique } from 'typeorm';
export class ActivityFollowups1788652900000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    if (await runner.hasTable('activity_followups')) return;
    await runner.createTable(new Table({ name: 'activity_followups', columns: [
      { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
      { name: 'activityId', type: 'int' }, { name: 'registrationId', type: 'int' }, { name: 'assigneeId', type: 'int' },
      { name: 'kind', type: 'varchar', length: '30' }, { name: 'status', type: 'varchar', length: '20', default: "'pending'" },
      { name: 'dueAt', type: 'datetime' }, { name: 'outcome', type: 'varchar', length: '1000', default: "''" },
      { name: 'revision', type: 'int', default: 1 }, { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
      { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }
    ], uniques: [new TableUnique({ name: 'UQ_followup_registration_kind', columnNames: ['registrationId', 'kind'] })],
    indices: [new TableIndex({ name: 'IDX_followup_activity_due', columnNames: ['activityId', 'status', 'dueAt'] })],
    foreignKeys: [ ['activityId', 'activities'], ['registrationId', 'registrations'], ['assigneeId', 'admin_users'] ].map(([column, table]) => new TableForeignKey({ columnNames: [column], referencedTableName: table, referencedColumnNames: ['id'], onDelete: 'RESTRICT' })) }));
  }
  async down(runner: QueryRunner): Promise<void> { if (await runner.hasTable('activity_followups')) await runner.dropTable('activity_followups'); }
}
