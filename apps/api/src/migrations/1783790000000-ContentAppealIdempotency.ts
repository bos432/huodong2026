import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class ContentAppealIdempotency1783790000000 implements MigrationInterface {
  name = "ContentAppealIdempotency1783790000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("content_appeals");
    if (!table) return;
    if (!table.findColumnByName("businessKey")) {
      await queryRunner.addColumn("content_appeals", new TableColumn({ name: "businessKey", type: "varchar", length: "160", isNullable: true }));
    }
    if (!table.findColumnByName("pendingKey")) {
      await queryRunner.addColumn("content_appeals", new TableColumn({ name: "pendingKey", type: "varchar", length: "160", isNullable: true }));
    }
    await queryRunner.query("UPDATE content_appeals SET businessKey = CONCAT('legacy-content-appeal:', id) WHERE businessKey IS NULL OR businessKey = ''");
    await queryRunner.changeColumn("content_appeals", "businessKey", new TableColumn({ name: "businessKey", type: "varchar", length: "160", isNullable: false }));
    let refreshed = await queryRunner.getTable("content_appeals");
    if (!refreshed?.indices.some((index) => index.name === "UQ_content_appeal_business_key")) {
      await queryRunner.createIndex("content_appeals", new TableIndex({ name: "UQ_content_appeal_business_key", columnNames: ["businessKey"], isUnique: true }));
    }
    refreshed = await queryRunner.getTable("content_appeals");
    if (!refreshed?.indices.some((index) => index.name === "UQ_content_appeal_pending_key")) {
      await queryRunner.createIndex("content_appeals", new TableIndex({ name: "UQ_content_appeal_pending_key", columnNames: ["pendingKey"], isUnique: true }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    let table = await queryRunner.getTable("content_appeals");
    if (!table) return;
    if (table.indices.some((index) => index.name === "UQ_content_appeal_pending_key")) await queryRunner.dropIndex("content_appeals", "UQ_content_appeal_pending_key");
    table = await queryRunner.getTable("content_appeals");
    if (table?.indices.some((index) => index.name === "UQ_content_appeal_business_key")) await queryRunner.dropIndex("content_appeals", "UQ_content_appeal_business_key");
    table = await queryRunner.getTable("content_appeals");
    if (table?.findColumnByName("pendingKey")) await queryRunner.dropColumn("content_appeals", "pendingKey");
    table = await queryRunner.getTable("content_appeals");
    if (table?.findColumnByName("businessKey")) await queryRunner.dropColumn("content_appeals", "businessKey");
  }
}
