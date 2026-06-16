import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class ProductClosureEnhancements1780820000000 implements MigrationInterface {
  name = "ProductClosureEnhancements1780820000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.addColumnIfMissing(queryRunner, "activity_categories", new TableColumn({ name: "iconUrl", type: "varchar", length: "500", isNullable: true }));
    await this.addColumnIfMissing(queryRunner, "activity_categories", new TableColumn({ name: "coverUrl", type: "varchar", length: "500", isNullable: true }));
    await this.addColumnIfMissing(queryRunner, "activity_categories", new TableColumn({ name: "publicVisible", type: "tinyint", default: 1 }));
    await this.addColumnIfMissing(queryRunner, "activity_categories", new TableColumn({ name: "scene", type: "varchar", length: "40", default: "'activity'" }));
    if (!(await this.hasIndex(queryRunner, "activity_categories", "IDX_activity_categories_scene_visible"))) {
      await queryRunner.createIndex("activity_categories", new TableIndex({ name: "IDX_activity_categories_scene_visible", columnNames: ["scene", "publicVisible"] }));
    }

    await this.addColumnIfMissing(queryRunner, "ambassador_applications", new TableColumn({ name: "source", type: "varchar", length: "80", isNullable: true }));
    await this.addColumnIfMissing(queryRunner, "ambassador_applications", new TableColumn({ name: "channelCode", type: "varchar", length: "80", isNullable: true }));
    await this.addColumnIfMissing(queryRunner, "ambassador_applications", new TableColumn({ name: "assignee", type: "varchar", length: "80", isNullable: true }));
    await this.addColumnIfMissing(queryRunner, "ambassador_applications", new TableColumn({ name: "priority", type: "varchar", length: "20", default: "'normal'" }));
    await this.addColumnIfMissing(queryRunner, "ambassador_applications", new TableColumn({ name: "nextFollowAt", type: "datetime", isNullable: true }));
    if (!(await this.hasIndex(queryRunner, "ambassador_applications", "IDX_ambassador_applications_follow"))) {
      await queryRunner.createIndex("ambassador_applications", new TableIndex({ name: "IDX_ambassador_applications_follow", columnNames: ["priority", "nextFollowAt"] }));
    }

    await this.seedDefaultCategories(queryRunner);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasIndex(queryRunner, "ambassador_applications", "IDX_ambassador_applications_follow")) await queryRunner.dropIndex("ambassador_applications", "IDX_ambassador_applications_follow");
    for (const column of ["nextFollowAt", "priority", "assignee", "channelCode", "source"]) {
      if (await queryRunner.hasColumn("ambassador_applications", column)) await queryRunner.dropColumn("ambassador_applications", column);
    }
    if (await this.hasIndex(queryRunner, "activity_categories", "IDX_activity_categories_scene_visible")) await queryRunner.dropIndex("activity_categories", "IDX_activity_categories_scene_visible");
    for (const column of ["scene", "publicVisible", "coverUrl", "iconUrl"]) {
      if (await queryRunner.hasColumn("activity_categories", column)) await queryRunner.dropColumn("activity_categories", column);
    }
  }

  private async addColumnIfMissing(queryRunner: QueryRunner, tableName: string, column: TableColumn) {
    if (!(await queryRunner.hasColumn(tableName, column.name))) await queryRunner.addColumn(tableName, column);
  }

  private async hasIndex(queryRunner: QueryRunner, tableName: string, indexName: string) {
    const table = await queryRunner.getTable(tableName);
    return Boolean(table?.indices.some((index) => index.name === indexName));
  }

  private async seedDefaultCategories(queryRunner: QueryRunner) {
    const names = ["传统文化", "国学经典", "书法美学", "公益活动", "创业成长", "亲子教育", "健康生活", "城市沙龙"];
    for (let index = 0; index < names.length; index += 1) {
      const name = names[index];
      const rows = await queryRunner.query("SELECT id FROM activity_categories WHERE tenantId IS NULL AND name = ? LIMIT 1", [name]);
      if (rows.length) continue;
      await queryRunner.query(
        "INSERT INTO activity_categories (name, iconUrl, coverUrl, publicVisible, scene, sortOrder, enabled, createdAt, updatedAt, tenantId) VALUES (?, NULL, NULL, 1, 'activity', ?, 1, NOW(), NOW(), NULL)",
        [name, (index + 1) * 10]
      );
    }
  }
}
