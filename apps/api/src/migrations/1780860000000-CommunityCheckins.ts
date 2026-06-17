import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CommunityCheckins1780860000000 implements MigrationInterface {
  name = "CommunityCheckins1780860000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("community_checkins")) return;
    await queryRunner.createTable(
      new Table({
        name: "community_checkins",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "userId", type: "int" },
          { name: "taskId", type: "int" },
          { name: "date", type: "date" },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ]
      })
    );
    await queryRunner.createIndex("community_checkins", new TableIndex({ name: "IDX_community_checkins_user_date", columnNames: ["userId", "date"], isUnique: true }));
    await queryRunner.createIndex("community_checkins", new TableIndex({ name: "IDX_community_checkins_task_date", columnNames: ["taskId", "date"] }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("community_checkins")) await queryRunner.dropTable("community_checkins");
  }
}
