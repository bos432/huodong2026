import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class MallPromotionRateLimits1783660000000 implements MigrationInterface {
  name = "MallPromotionRateLimits1783660000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("mall_promotion_rate_limits"))) {
      await queryRunner.createTable(new Table({
        name: "mall_promotion_rate_limits",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int" },
          { name: "dimension", type: "varchar", length: "16" },
          { name: "keyHash", type: "varchar", length: "64" },
          { name: "windowStartedAt", type: "datetime" },
          { name: "count", type: "int", default: 0 },
          { name: "expiresAt", type: "datetime" },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ]
      }));
      await queryRunner.createForeignKey("mall_promotion_rate_limits", new TableForeignKey({ name: "FK_mall_promotion_rate_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
      await queryRunner.createIndex("mall_promotion_rate_limits", new TableIndex({ name: "UQ_mall_promotion_rate_window", columnNames: ["tenantId", "dimension", "keyHash", "windowStartedAt"], isUnique: true }));
      await queryRunner.createIndex("mall_promotion_rate_limits", new TableIndex({ name: "IDX_mall_promotion_rate_expires", columnNames: ["expiresAt"] }));
    }

    if (!(await queryRunner.hasTable("mall_promotion_risk_events"))) {
      await queryRunner.createTable(new Table({
        name: "mall_promotion_risk_events",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int" },
          { name: "userId", type: "int", isNullable: true },
          { name: "merchantId", type: "int", isNullable: true },
          { name: "action", type: "varchar", length: "40" },
          { name: "promotionType", type: "varchar", length: "24", isNullable: true },
          { name: "promotionId", type: "int", isNullable: true },
          { name: "deviceHash", type: "varchar", length: "64", isNullable: true },
          { name: "ipHash", type: "varchar", length: "64", isNullable: true },
          { name: "requestId", type: "varchar", length: "80", isNullable: true },
          { name: "clientOrderKey", type: "varchar", length: "80", isNullable: true },
          { name: "outcome", type: "varchar", length: "16" },
          { name: "reason", type: "varchar", length: "500", isNullable: true },
          { name: "detail", type: "json", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ]
      }));
      await queryRunner.createForeignKey("mall_promotion_risk_events", new TableForeignKey({ name: "FK_mall_promotion_risk_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
      await queryRunner.createForeignKey("mall_promotion_risk_events", new TableForeignKey({ name: "FK_mall_promotion_risk_user", columnNames: ["userId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
      await queryRunner.createForeignKey("mall_promotion_risk_events", new TableForeignKey({ name: "FK_mall_promotion_risk_merchant", columnNames: ["merchantId"], referencedTableName: "mall_merchants", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
      await queryRunner.createIndex("mall_promotion_risk_events", new TableIndex({ name: "IDX_mall_promotion_risk_scope_created", columnNames: ["tenantId", "merchantId", "createdAt"] }));
      await queryRunner.createIndex("mall_promotion_risk_events", new TableIndex({ name: "IDX_mall_promotion_risk_outcome_created", columnNames: ["outcome", "createdAt"] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_promotion_risk_events")) await queryRunner.dropTable("mall_promotion_risk_events", true);
    if (await queryRunner.hasTable("mall_promotion_rate_limits")) await queryRunner.dropTable("mall_promotion_rate_limits", true);
  }
}
