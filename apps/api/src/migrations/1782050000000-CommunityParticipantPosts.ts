import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from "typeorm";

export class CommunityParticipantPosts1782050000000 implements MigrationInterface {
  name = "CommunityParticipantPosts1782050000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.addColumnIfMissing(queryRunner, "community_posts", new TableColumn({ name: "activityId", type: "int", isNullable: true }));
    await this.addColumnIfMissing(queryRunner, "community_posts", new TableColumn({ name: "shareCount", type: "int", default: 0 }));
    await this.addColumnIfMissing(queryRunner, "community_posts", new TableColumn({ name: "source", type: "varchar", length: "24", default: "'official'" }));
    await this.addColumnIfMissing(queryRunner, "community_posts", new TableColumn({ name: "status", type: "varchar", length: "24", default: "'approved'" }));
    await this.addColumnIfMissing(queryRunner, "community_posts", new TableColumn({ name: "city", type: "varchar", length: "120", isNullable: true }));
    await this.addColumnIfMissing(queryRunner, "community_posts", new TableColumn({ name: "tags", type: "text", isNullable: true }));
    await this.addColumnIfMissing(queryRunner, "community_posts", new TableColumn({ name: "reviewRemark", type: "text", isNullable: true }));
    await this.addColumnIfMissing(queryRunner, "community_posts", new TableColumn({ name: "posterConfig", type: "text", isNullable: true }));
    await this.addColumnIfMissing(queryRunner, "community_posts", new TableColumn({ name: "approvedAt", type: "datetime", isNullable: true }));

    if (!(await this.hasForeignKey(queryRunner, "community_posts", "FK_community_posts_activity"))) {
      await queryRunner.createForeignKey("community_posts", new TableForeignKey({
        name: "FK_community_posts_activity",
        columnNames: ["activityId"],
        referencedTableName: "activities",
        referencedColumnNames: ["id"],
        onDelete: "SET NULL"
      }));
    }
    await this.addIndexIfMissing(queryRunner, "community_posts", new TableIndex({ name: "IDX_community_posts_public_flow", columnNames: ["status", "visible", "createdAt"] }));
    await this.addIndexIfMissing(queryRunner, "community_posts", new TableIndex({ name: "IDX_community_posts_activity_status", columnNames: ["activityId", "status", "visible"] }));
    await this.addIndexIfMissing(queryRunner, "community_posts", new TableIndex({ name: "IDX_community_posts_user_status", columnNames: ["userId", "status"] }));
    await queryRunner.query("UPDATE community_posts SET source = 'official' WHERE source IS NULL OR source = ''");
    await queryRunner.query("UPDATE community_posts SET status = CASE WHEN visible = 1 THEN 'approved' ELSE 'pending' END WHERE status IS NULL OR status = ''");
    await queryRunner.query("UPDATE community_posts SET approvedAt = COALESCE(approvedAt, createdAt) WHERE status = 'approved'");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropIndexIfExists(queryRunner, "community_posts", "IDX_community_posts_user_status");
    await this.dropIndexIfExists(queryRunner, "community_posts", "IDX_community_posts_activity_status");
    await this.dropIndexIfExists(queryRunner, "community_posts", "IDX_community_posts_public_flow");
    if (await this.hasForeignKey(queryRunner, "community_posts", "FK_community_posts_activity")) {
      await queryRunner.dropForeignKey("community_posts", "FK_community_posts_activity");
    }
    for (const name of ["approvedAt", "posterConfig", "reviewRemark", "tags", "city", "status", "source", "shareCount", "activityId"]) {
      if (await queryRunner.hasColumn("community_posts", name)) await queryRunner.dropColumn("community_posts", name);
    }
  }

  private async addColumnIfMissing(queryRunner: QueryRunner, tableName: string, column: TableColumn) {
    if (!(await queryRunner.hasColumn(tableName, column.name))) await queryRunner.addColumn(tableName, column);
  }

  private async addIndexIfMissing(queryRunner: QueryRunner, tableName: string, index: TableIndex) {
    const table = await queryRunner.getTable(tableName);
    if (!table?.indices.some((item) => item.name === index.name)) await queryRunner.createIndex(tableName, index);
  }

  private async dropIndexIfExists(queryRunner: QueryRunner, tableName: string, name: string) {
    const table = await queryRunner.getTable(tableName);
    const index = table?.indices.find((item) => item.name === name);
    if (index) await queryRunner.dropIndex(tableName, index);
  }

  private async hasForeignKey(queryRunner: QueryRunner, tableName: string, name: string) {
    const table = await queryRunner.getTable(tableName);
    return Boolean(table?.foreignKeys.some((item) => item.name === name));
  }
}
