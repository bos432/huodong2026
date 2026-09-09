import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from "typeorm";

export class MallMembershipAndDirectReferral1788653300000 implements MigrationInterface {
  name = "MallMembershipAndDirectReferral1788653300000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("mall_products", "membershipProduct"))) await queryRunner.addColumn("mall_products", new TableColumn({ name: "membershipProduct", type: "tinyint", width: 1, default: 0 }));
    if (!(await queryRunner.hasColumn("mall_products", "membershipValidityDays"))) await queryRunner.addColumn("mall_products", new TableColumn({ name: "membershipValidityDays", type: "int", isNullable: true }));
    if (!(await queryRunner.hasColumn("mall_merchants", "membershipEnabled"))) await queryRunner.addColumn("mall_merchants", new TableColumn({ name: "membershipEnabled", type: "tinyint", width: 1, default: 1 }));
    if (!(await queryRunner.hasColumn("mall_merchants", "memberDiscountRate"))) await queryRunner.addColumn("mall_merchants", new TableColumn({ name: "memberDiscountRate", type: "decimal", precision: 5, scale: 2, default: "1.00" }));
    if (!(await queryRunner.hasColumn("mall_orders", "memberDiscountAmount"))) await queryRunner.addColumn("mall_orders", new TableColumn({ name: "memberDiscountAmount", type: "decimal", precision: 10, scale: 2, default: 0 }));
    if (await queryRunner.hasTable("mall_commission_rules") && !(await queryRunner.hasColumn("mall_commission_rules", "directFixedAmount"))) await queryRunner.addColumn("mall_commission_rules", new TableColumn({ name: "directFixedAmount", type: "decimal", precision: 10, scale: 2, isNullable: true }));

    if (await queryRunner.hasTable("mall_commission_rules") && await queryRunner.hasColumn("mall_commission_rules", "agentLevelRatesBps")) {
      await queryRunner.query("UPDATE mall_commission_rules SET agentLevelRatesBps = NULL WHERE agentLevelRatesBps IS NOT NULL");
    }

    if (!(await queryRunner.hasTable("mall_membership_purchases"))) {
      await queryRunner.createTable(new Table({
        name: "mall_membership_purchases",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int" },
          { name: "merchantId", type: "int", isNullable: true },
          { name: "userId", type: "int" },
          { name: "orderId", type: "int" },
          { name: "orderItemId", type: "int" },
          { name: "productId", type: "int", isNullable: true },
          { name: "price", type: "decimal", precision: 10, scale: 2 },
          { name: "validityDays", type: "int" },
          { name: "startsAt", type: "datetime" },
          { name: "expiresAt", type: "datetime" },
          { name: "status", type: "varchar", length: "16", default: "'active'" },
          { name: "revokedAt", type: "datetime", isNullable: true },
          { name: "revokeReason", type: "varchar", length: "255", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ]
      }), true);
      for (const key of [
        new TableForeignKey({ name: "FK_mall_membership_purchase_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
        new TableForeignKey({ name: "FK_mall_membership_purchase_merchant", columnNames: ["merchantId"], referencedTableName: "mall_merchants", referencedColumnNames: ["id"], onDelete: "SET NULL" }),
        new TableForeignKey({ name: "FK_mall_membership_purchase_user", columnNames: ["userId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
        new TableForeignKey({ name: "FK_mall_membership_purchase_order", columnNames: ["orderId"], referencedTableName: "mall_orders", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
        new TableForeignKey({ name: "FK_mall_membership_purchase_order_item", columnNames: ["orderItemId"], referencedTableName: "mall_order_items", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
        new TableForeignKey({ name: "FK_mall_membership_purchase_product", columnNames: ["productId"], referencedTableName: "mall_products", referencedColumnNames: ["id"], onDelete: "SET NULL" })
      ]) await queryRunner.createForeignKey("mall_membership_purchases", key);
      await queryRunner.createIndex("mall_membership_purchases", new TableIndex({ name: "UQ_mall_membership_purchase_order_item", columnNames: ["orderItemId"], isUnique: true }));
      await queryRunner.createIndex("mall_membership_purchases", new TableIndex({ name: "IDX_mall_membership_purchase_user_merchant_status", columnNames: ["tenantId", "userId", "merchantId", "status", "expiresAt"] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_membership_purchases")) await queryRunner.dropTable("mall_membership_purchases", true);
    if (await queryRunner.hasTable("mall_commission_rules") && await queryRunner.hasColumn("mall_commission_rules", "directFixedAmount")) await queryRunner.dropColumn("mall_commission_rules", "directFixedAmount");
    if (await queryRunner.hasColumn("mall_orders", "memberDiscountAmount")) await queryRunner.dropColumn("mall_orders", "memberDiscountAmount");
    if (await queryRunner.hasColumn("mall_merchants", "memberDiscountRate")) await queryRunner.dropColumn("mall_merchants", "memberDiscountRate");
    if (await queryRunner.hasColumn("mall_merchants", "membershipEnabled")) await queryRunner.dropColumn("mall_merchants", "membershipEnabled");
    if (await queryRunner.hasColumn("mall_products", "membershipValidityDays")) await queryRunner.dropColumn("mall_products", "membershipValidityDays");
    if (await queryRunner.hasColumn("mall_products", "membershipProduct")) await queryRunner.dropColumn("mall_products", "membershipProduct");
  }
}
