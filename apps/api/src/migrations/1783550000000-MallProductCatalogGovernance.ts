import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from "typeorm";

export class MallProductCatalogGovernance1783550000000 implements MigrationInterface {
  name = "MallProductCatalogGovernance1783550000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("mall_brands"))) await queryRunner.createTable(new Table({
      name: "mall_brands",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "tenantId", type: "int" },
        { name: "code", type: "varchar", length: "80" }, { name: "name", type: "varchar", length: "120" }, { name: "logoUrl", type: "varchar", length: "500", isNullable: true },
        { name: "description", type: "varchar", length: "1000", isNullable: true }, { name: "status", type: "varchar", length: "24", default: "'active'" }, { name: "sortOrder", type: "int", default: 0 },
        { name: "createdAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)" }, { name: "updatedAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" }
      ],
      foreignKeys: [{ name: "FK_mall_brand_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }],
      indices: [{ name: "UQ_mall_brand_tenant_code", columnNames: ["tenantId", "code"], isUnique: true }, { name: "IDX_mall_brand_tenant_status", columnNames: ["tenantId", "status", "sortOrder"] }]
    }));

    if (!(await queryRunner.hasTable("mall_product_audit_logs"))) await queryRunner.createTable(new Table({
      name: "mall_product_audit_logs",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "tenantId", type: "int" }, { name: "merchantId", type: "int", isNullable: true }, { name: "productId", type: "int" },
        { name: "action", type: "varchar", length: "32" }, { name: "fromStatus", type: "varchar", length: "32" }, { name: "toStatus", type: "varchar", length: "32" }, { name: "remark", type: "varchar", length: "1000", isNullable: true },
        { name: "snapshot", type: "json" }, { name: "operatorAdminId", type: "int", isNullable: true }, { name: "operatorName", type: "varchar", length: "100", isNullable: true }, { name: "createdAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)" }
      ],
      foreignKeys: [
        { name: "FK_mall_product_audit_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" },
        { name: "FK_mall_product_audit_merchant", columnNames: ["merchantId"], referencedTableName: "mall_merchants", referencedColumnNames: ["id"], onDelete: "SET NULL" },
        { name: "FK_mall_product_audit_product", columnNames: ["productId"], referencedTableName: "mall_products", referencedColumnNames: ["id"], onDelete: "CASCADE" }
      ],
      indices: [{ name: "IDX_mall_product_audit_product_time", columnNames: ["productId", "createdAt"] }]
    }));

    const add = async (table: string, column: TableColumn) => { if (!(await queryRunner.hasColumn(table, column.name))) await queryRunner.addColumn(table, column); };
    await add("mall_categories", new TableColumn({ name: "scope", type: "varchar", length: "24", default: "'merchant'" }));
    await add("mall_categories", new TableColumn({ name: "code", type: "varchar", length: "80", isNullable: true }));
    await add("mall_categories", new TableColumn({ name: "parentId", type: "int", isNullable: true }));
    await add("mall_products", new TableColumn({ name: "platformCategoryId", type: "int", isNullable: true }));
    await add("mall_products", new TableColumn({ name: "brandId", type: "int", isNullable: true }));
    await add("mall_products", new TableColumn({ name: "productCode", type: "varchar", length: "80", isNullable: true }));
    await add("mall_products", new TableColumn({ name: "galleryUrls", type: "json", isNullable: true }));
    await add("mall_products", new TableColumn({ name: "detailBlocks", type: "json", isNullable: true }));
    await add("mall_products", new TableColumn({ name: "attributes", type: "json", isNullable: true }));
    await add("mall_products", new TableColumn({ name: "contentVersion", type: "int", default: 1 }));
    await add("mall_products", new TableColumn({ name: "reviewRemark", type: "varchar", length: "1000", isNullable: true }));
    await add("mall_products", new TableColumn({ name: "submittedAt", type: "datetime", isNullable: true }));
    await add("mall_products", new TableColumn({ name: "reviewedAt", type: "datetime", isNullable: true }));
    await add("mall_products", new TableColumn({ name: "reviewedByAdminId", type: "int", isNullable: true }));
    await add("mall_products", new TableColumn({ name: "publishedSnapshot", type: "json", isNullable: true }));
    await add("mall_skus", new TableColumn({ name: "barcode", type: "varchar", length: "80", isNullable: true }));
    await add("mall_skus", new TableColumn({ name: "attributes", type: "json", isNullable: true }));
    await add("mall_skus", new TableColumn({ name: "weightGrams", type: "int", default: 0 }));
    await add("mall_order_items", new TableColumn({ name: "productSnapshot", type: "json", isNullable: true }));
    await add("mall_order_items", new TableColumn({ name: "skuSnapshot", type: "json", isNullable: true }));

    const categoryTable = await queryRunner.getTable("mall_categories");
    if (categoryTable && !categoryTable.foreignKeys.some((item) => item.columnNames.includes("parentId"))) await queryRunner.createForeignKey("mall_categories", new TableForeignKey({ name: "FK_mall_category_parent", columnNames: ["parentId"], referencedTableName: "mall_categories", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
    if (categoryTable && !categoryTable.indices.some((item) => item.name === "UQ_mall_category_tenant_scope_code")) await queryRunner.createIndex("mall_categories", new TableIndex({ name: "UQ_mall_category_tenant_scope_code", columnNames: ["tenantId", "scope", "code"], isUnique: true }));
    const productTable = await queryRunner.getTable("mall_products");
    if (productTable && !productTable.foreignKeys.some((item) => item.columnNames.includes("platformCategoryId"))) await queryRunner.createForeignKey("mall_products", new TableForeignKey({ name: "FK_mall_product_platform_category", columnNames: ["platformCategoryId"], referencedTableName: "mall_categories", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
    if (productTable && !productTable.foreignKeys.some((item) => item.columnNames.includes("brandId"))) await queryRunner.createForeignKey("mall_products", new TableForeignKey({ name: "FK_mall_product_brand", columnNames: ["brandId"], referencedTableName: "mall_brands", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
    if (productTable && !productTable.indices.some((item) => item.name === "UQ_mall_product_merchant_code")) await queryRunner.createIndex("mall_products", new TableIndex({ name: "UQ_mall_product_merchant_code", columnNames: ["merchantId", "productCode"], isUnique: true }));
    const skuTable = await queryRunner.getTable("mall_skus");
    if (skuTable && !skuTable.indices.some((item) => item.name === "UQ_mall_sku_merchant_code")) await queryRunner.createIndex("mall_skus", new TableIndex({ name: "UQ_mall_sku_merchant_code", columnNames: ["merchantId", "skuCode"], isUnique: true }));
    if (skuTable && !skuTable.indices.some((item) => item.name === "UQ_mall_sku_merchant_barcode")) await queryRunner.createIndex("mall_skus", new TableIndex({ name: "UQ_mall_sku_merchant_barcode", columnNames: ["merchantId", "barcode"], isUnique: true }));

    await queryRunner.query("UPDATE `mall_categories` SET `scope` = CASE WHEN `merchantId` IS NULL THEN 'platform' ELSE 'merchant' END, `code` = COALESCE(`code`, CONCAT('C', `id`))");
    await queryRunner.query("UPDATE `mall_products` SET `productCode` = COALESCE(`productCode`, CONCAT('P', `id`)), `galleryUrls` = COALESCE(`galleryUrls`, JSON_ARRAY(`coverUrl`)), `attributes` = COALESCE(`attributes`, JSON_OBJECT()), `publishedSnapshot` = CASE WHEN `status` = 'published' AND `publishedSnapshot` IS NULL THEN JSON_OBJECT('title', `title`, 'brandName', `brandName`, 'coverUrl', `coverUrl`, 'description', `description`, 'price', `price`, 'originalPrice', `originalPrice`) ELSE `publishedSnapshot` END");
    await queryRunner.query("UPDATE `mall_skus` SET `attributes` = COALESCE(`attributes`, JSON_OBJECT())");
    await queryRunner.query("UPDATE `mall_order_items` SET `productSnapshot` = COALESCE(`productSnapshot`, JSON_OBJECT('productTitle', `productTitle`, 'coverUrl', `coverUrl`)), `skuSnapshot` = COALESCE(`skuSnapshot`, JSON_OBJECT('skuName', `skuName`, 'price', `price`))");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const tableName of ["mall_products", "mall_categories", "mall_skus"]) {
      const table = await queryRunner.getTable(tableName);
      for (const index of table?.indices || []) if (["UQ_mall_product_merchant_code", "UQ_mall_category_tenant_scope_code", "UQ_mall_sku_merchant_code", "UQ_mall_sku_merchant_barcode"].includes(index.name || "")) await queryRunner.dropIndex(tableName, index);
    }
    for (const tableName of ["mall_products", "mall_categories"]) {
      const table = await queryRunner.getTable(tableName);
      for (const foreignKey of table?.foreignKeys || []) if (["FK_mall_product_platform_category", "FK_mall_product_brand", "FK_mall_category_parent"].includes(foreignKey.name || "")) await queryRunner.dropForeignKey(tableName, foreignKey);
    }
    for (const [table, columns] of [["mall_order_items", ["skuSnapshot", "productSnapshot"]], ["mall_skus", ["weightGrams", "attributes", "barcode"]], ["mall_products", ["publishedSnapshot", "reviewedByAdminId", "reviewedAt", "submittedAt", "reviewRemark", "contentVersion", "attributes", "detailBlocks", "galleryUrls", "productCode", "brandId", "platformCategoryId"]], ["mall_categories", ["parentId", "code", "scope"]]] as Array<[string, string[]]>) {
      for (const column of columns) if (await queryRunner.hasColumn(table, column)) await queryRunner.dropColumn(table, column);
    }
    if (await queryRunner.hasTable("mall_product_audit_logs")) await queryRunner.dropTable("mall_product_audit_logs", true);
    if (await queryRunner.hasTable("mall_brands")) await queryRunner.dropTable("mall_brands", true);
  }
}
