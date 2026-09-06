import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex, TableUnique } from 'typeorm';
export class AiOperationDrafts1788653200000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    if (await runner.hasTable('ai_operation_drafts')) return;
    await runner.createTable(new Table({ name: 'ai_operation_drafts', columns: [
      { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
      { name: 'requestKey', type: 'varchar', length: '80' }, { name: 'activityId', type: 'int' }, { name: 'actorId', type: 'int' },
      { name: 'tenantScopeKey', type: 'varchar', length: '32' }, { name: 'mode', type: 'varchar', length: '24' },
      { name: 'payloadHash', type: 'varchar', length: '64' }, { name: 'sourceSnapshot', type: 'json' },
      { name: 'status', type: 'varchar', length: '24', default: "'pending'" }, { name: 'model', type: 'varchar', length: '120' },
      { name: 'providerHost', type: 'varchar', length: '255' }, { name: 'simulation', type: 'tinyint', width: 1, default: 0 },
      { name: 'text', type: 'text', isNullable: true }, { name: 'error', type: 'varchar', length: '255', isNullable: true },
      { name: 'totalTokens', type: 'int', isNullable: true }, { name: 'createdAt', type: 'datetime', default: 'CURRENT_TIMESTAMP' },
      { name: 'updatedAt', type: 'datetime', default: 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' }
    ], uniques: [new TableUnique({ name: 'UQ_ai_operation_request', columnNames: ['requestKey'] })],
    indices: [new TableIndex({ name: 'IDX_ai_operation_actor_created', columnNames: ['actorId', 'createdAt'] })],
    foreignKeys: [new TableForeignKey({ columnNames: ['activityId'], referencedTableName: 'activities', referencedColumnNames: ['id'], onDelete: 'RESTRICT' })] }));
  }
  async down(runner: QueryRunner): Promise<void> { if (await runner.hasTable('ai_operation_drafts')) await runner.dropTable('ai_operation_drafts'); }
}
