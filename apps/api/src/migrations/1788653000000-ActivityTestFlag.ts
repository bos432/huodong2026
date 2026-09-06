import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';
export class ActivityTestFlag1788653000000 implements MigrationInterface {
  async up(runner: QueryRunner): Promise<void> {
    if (!(await runner.hasColumn('activities', 'isTest'))) await runner.addColumn('activities', new TableColumn({ name: 'isTest', type: 'tinyint', width: 1, default: 0 }));
  }
  async down(runner: QueryRunner): Promise<void> {
    if (await runner.hasColumn('activities', 'isTest')) await runner.dropColumn('activities', 'isTest');
  }
}
