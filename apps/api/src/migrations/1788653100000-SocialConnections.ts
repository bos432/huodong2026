import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex, TableUnique } from 'typeorm';
export class SocialConnections1788653100000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    if (!(await runner.hasTable('social_connections'))) await runner.createTable(new Table({ name: 'social_connections', columns: [
      { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
      { name: 'tenantId', type: 'int', isNullable: true }, { name: 'tenantScopeKey', type: 'varchar', length: '32' },
      { name: 'lowUserId', type: 'int' }, { name: 'highUserId', type: 'int' }, { name: 'requesterId', type: 'int' },
      { name: 'intent', type: 'varchar', length: '24' }, { name: 'status', type: 'varchar', length: '24', default: "'pending'" },
      { name: 'lowBlocked', type: 'tinyint', width: 1, default: 0 }, { name: 'highBlocked', type: 'tinyint', width: 1, default: 0 },
      { name: 'requestedAt', type: 'datetime' }, { name: 'closedAt', type: 'datetime', isNullable: true }, { name: 'revision', type: 'int', default: 1 },
      { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' }, { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }
    ], uniques: [new TableUnique({ name: 'UQ_social_connection_pair', columnNames: ['tenantScopeKey', 'lowUserId', 'highUserId'] })],
    indices: [new TableIndex({ name: 'IDX_social_connection_requests', columnNames: ['requesterId', 'requestedAt'] })],
    foreignKeys: [['tenantId', 'tenants'], ['lowUserId', 'users'], ['highUserId', 'users']].map(([column, table]) => new TableForeignKey({ columnNames: [column], referencedTableName: table, referencedColumnNames: ['id'], onDelete: 'CASCADE' })) }));
    if (!(await runner.hasTable('social_connection_events'))) await runner.createTable(new Table({ name: 'social_connection_events', columns: [
      { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
      { name: 'connectionId', type: 'int' }, { name: 'actorId', type: 'int' }, { name: 'revision', type: 'int' }, { name: 'action', type: 'varchar', length: '24' }, { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' }
    ], uniques: [new TableUnique({ name: 'UQ_social_connection_event', columnNames: ['connectionId', 'revision'] })],
    foreignKeys: [new TableForeignKey({ columnNames: ['connectionId'], referencedTableName: 'social_connections', referencedColumnNames: ['id'], onDelete: 'CASCADE' })] }));
  }
  async down(runner: QueryRunner): Promise<void> {
    if (await runner.hasTable('social_connection_events')) await runner.dropTable('social_connection_events');
    if (await runner.hasTable('social_connections')) await runner.dropTable('social_connections');
  }
}
