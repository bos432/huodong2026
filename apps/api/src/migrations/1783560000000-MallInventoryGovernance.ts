import { MigrationInterface, QueryRunner, Table, TableColumn, TableIndex } from "typeorm";

export class MallInventoryGovernance1783560000000 implements MigrationInterface {
  name = "MallInventoryGovernance1783560000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("mall_inventory_logs", "operationKey"))) await queryRunner.addColumn("mall_inventory_logs", new TableColumn({ name: "operationKey", type: "varchar", length: "160", isNullable: true }));
    if (!(await queryRunner.hasColumn("mall_inventory_logs", "sourceType"))) await queryRunner.addColumn("mall_inventory_logs", new TableColumn({ name: "sourceType", type: "varchar", length: "32", isNullable: true }));
    if (!(await queryRunner.hasColumn("mall_inventory_logs", "sourceId"))) await queryRunner.addColumn("mall_inventory_logs", new TableColumn({ name: "sourceId", type: "varchar", length: "100", isNullable: true }));
    await queryRunner.query("UPDATE `mall_inventory_logs` SET `operationKey` = COALESCE(`operationKey`, CONCAT('legacy:', `id`)), `sourceType` = COALESCE(`sourceType`, 'legacy'), `sourceId` = COALESCE(`sourceId`, CAST(`id` AS CHAR))");
    await queryRunner.changeColumn("mall_inventory_logs", "operationKey", new TableColumn({ name: "operationKey", type: "varchar", length: "160", isNullable: false }));
    const logTable = await queryRunner.getTable("mall_inventory_logs");
    if (logTable && !logTable.indices.some((item) => item.name === "UQ_mall_inventory_log_tenant_operation")) await queryRunner.createIndex("mall_inventory_logs", new TableIndex({ name: "UQ_mall_inventory_log_tenant_operation", columnNames: ["tenantId", "operationKey"], isUnique: true }));

    if (!(await queryRunner.hasTable("mall_inventory_anomalies"))) await queryRunner.createTable(new Table({
      name: "mall_inventory_anomalies",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "tenantId", type: "int" }, { name: "merchantId", type: "int", isNullable: true }, { name: "skuId", type: "int", isNullable: true },
        { name: "fingerprint", type: "varchar", length: "160" }, { name: "type", type: "varchar", length: "48" }, { name: "severity", type: "varchar", length: "16", default: "'high'" }, { name: "status", type: "varchar", length: "16", default: "'open'" },
        { name: "title", type: "varchar", length: "160" }, { name: "message", type: "varchar", length: "1000" }, { name: "sourceType", type: "varchar", length: "32" }, { name: "sourceId", type: "varchar", length: "100" },
        { name: "expectedState", type: "json", isNullable: true }, { name: "actualState", type: "json", isNullable: true }, { name: "occurrenceCount", type: "int", default: 1 }, { name: "firstDetectedAt", type: "datetime" }, { name: "lastDetectedAt", type: "datetime" },
        { name: "resolvedByAdminId", type: "int", isNullable: true }, { name: "resolvedBy", type: "varchar", length: "100", isNullable: true }, { name: "resolvedAt", type: "datetime", isNullable: true }, { name: "resolutionRemark", type: "varchar", length: "1000", isNullable: true },
        { name: "createdAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)" }, { name: "updatedAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" }
      ],
      foreignKeys: [
        { name: "FK_mall_inventory_anomaly_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" },
        { name: "FK_mall_inventory_anomaly_merchant", columnNames: ["merchantId"], referencedTableName: "mall_merchants", referencedColumnNames: ["id"], onDelete: "SET NULL" },
        { name: "FK_mall_inventory_anomaly_sku", columnNames: ["skuId"], referencedTableName: "mall_skus", referencedColumnNames: ["id"], onDelete: "SET NULL" }
      ],
      indices: [
        { name: "UQ_mall_inventory_anomaly_fingerprint", columnNames: ["fingerprint"], isUnique: true },
        { name: "IDX_mall_inventory_anomaly_scope_status", columnNames: ["tenantId", "status", "lastDetectedAt"] }
      ]
    }));

    await queryRunner.query("UPDATE `mall_skus` SET `stock` = GREATEST(`stock`, 0), `lockedStock` = GREATEST(LEAST(`lockedStock`, GREATEST(`stock`, 0)), 0)");
    await queryRunner.query("UPDATE `mall_flash_sales` SET `lockedStock` = GREATEST(`lockedStock`, 0), `soldStock` = GREATEST(`soldStock`, 0), `saleStock` = GREATEST(`saleStock`, GREATEST(`lockedStock`, 0) + GREATEST(`soldStock`, 0), 0)");
    await queryRunner.query("UPDATE `mall_group_buys` SET `lockedStock` = GREATEST(`lockedStock`, 0), `soldStock` = GREATEST(`soldStock`, 0), `groupStock` = GREATEST(`groupStock`, GREATEST(`lockedStock`, 0) + GREATEST(`soldStock`, 0), 0)");
    const checks = [
      ["mall_skus", "CHK_mall_sku_stock_nonnegative", "`stock` >= 0"], ["mall_skus", "CHK_mall_sku_locked_nonnegative", "`lockedStock` >= 0"], ["mall_skus", "CHK_mall_sku_locked_within_stock", "`lockedStock` <= `stock`"],
      ["mall_flash_sales", "CHK_mall_flash_inventory", "`saleStock` >= 0 AND `lockedStock` >= 0 AND `soldStock` >= 0 AND (`lockedStock` + `soldStock`) <= `saleStock`"],
      ["mall_group_buys", "CHK_mall_group_inventory", "`groupStock` >= 0 AND `lockedStock` >= 0 AND `soldStock` >= 0 AND (`lockedStock` + `soldStock`) <= `groupStock`"]
    ];
    for (const [table, name, expression] of checks) {
      const current = await queryRunner.getTable(table);
      if (!current?.checks.some((item) => item.name === name)) await queryRunner.query(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`${name}\` CHECK (${expression})`);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, name] of [["mall_group_buys", "CHK_mall_group_inventory"], ["mall_flash_sales", "CHK_mall_flash_inventory"], ["mall_skus", "CHK_mall_sku_locked_within_stock"], ["mall_skus", "CHK_mall_sku_locked_nonnegative"], ["mall_skus", "CHK_mall_sku_stock_nonnegative"]]) {
      const current = await queryRunner.getTable(table);
      if (current?.checks.some((item) => item.name === name)) await queryRunner.query(`ALTER TABLE \`${table}\` DROP CHECK \`${name}\``);
    }
    if (await queryRunner.hasTable("mall_inventory_anomalies")) await queryRunner.dropTable("mall_inventory_anomalies", true);
    const logTable = await queryRunner.getTable("mall_inventory_logs");
    const index = logTable?.indices.find((item) => item.name === "UQ_mall_inventory_log_tenant_operation");
    if (index) await queryRunner.dropIndex("mall_inventory_logs", index);
    for (const column of ["sourceId", "sourceType", "operationKey"]) if (await queryRunner.hasColumn("mall_inventory_logs", column)) await queryRunner.dropColumn("mall_inventory_logs", column);
  }
}
