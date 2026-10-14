import { MigrationInterface, QueryRunner } from "typeorm";
import { INITIAL_SCHEMA_QUERIES } from "./initial-schema-queries";

export class InitialApplicationSchema1780480000000 implements MigrationInterface {
  name = "InitialApplicationSchema1780480000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const currentTables: { name: string }[] = await queryRunner.query("SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()");
    const tables = currentTables.filter(table => !["migrations", "typeorm_metadata"].includes(table.name));
    if (tables.length) {
      if (["users", "activities", "notifications"].every(name => tables.some(table => table.name === name))) return;
      throw new Error("Initial schema requires an empty database; database is not empty. Restore a verified backup or use a new database.");
    }
    for (const query of INITIAL_SCHEMA_QUERIES) await queryRunner.query(query);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    throw new Error("Initial schema cannot be reverted by dropping business data. Restore a verified backup instead.");
  }
}
