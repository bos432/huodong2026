import { MigrationInterface, QueryRunner, Table } from "typeorm";

const AD_CENTER_PERMISSION = "ad_center.manage";

export class AdCenter1782200000000 implements MigrationInterface {
  name = "AdCenter1782200000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("ad_advertisers"))) {
      await queryRunner.createTable(new Table({
        name: "ad_advertisers",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "companyName", type: "varchar", length: "160" },
          { name: "contactName", type: "varchar", length: "80", isNullable: true },
          { name: "contactPhone", type: "varchar", length: "40", isNullable: true },
          { name: "wechat", type: "varchar", length: "80", isNullable: true },
          { name: "licenseUrl", type: "varchar", length: "500", isNullable: true },
          { name: "remark", type: "text", isNullable: true },
          { name: "status", type: "varchar", length: "40", default: "'active'" },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ],
        indices: [
          { name: "IDX_ad_advertisers_tenant_status", columnNames: ["tenantId", "status"] },
          { name: "IDX_ad_advertisers_company", columnNames: ["companyName"] }
        ],
        foreignKeys: [
          { name: "FK_ad_advertisers_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" }
        ]
      }));
    }

    if (!(await queryRunner.hasTable("ad_contracts"))) {
      await queryRunner.createTable(new Table({
        name: "ad_contracts",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "advertiserId", type: "int", isNullable: true },
          { name: "contractNo", type: "varchar", length: "80" },
          { name: "title", type: "varchar", length: "160" },
          { name: "billingModel", type: "varchar", length: "40", default: "'fixed'" },
          { name: "amount", type: "decimal", precision: 12, scale: 2, default: 0 },
          { name: "fixedFee", type: "decimal", precision: 12, scale: 2, default: 0 },
          { name: "cpmPrice", type: "decimal", precision: 12, scale: 4, default: 0 },
          { name: "cpcPrice", type: "decimal", precision: 12, scale: 4, default: 0 },
          { name: "startAt", type: "datetime", isNullable: true },
          { name: "endAt", type: "datetime", isNullable: true },
          { name: "paymentStatus", type: "varchar", length: "40", default: "'unpaid'" },
          { name: "attachmentUrl", type: "varchar", length: "500", isNullable: true },
          { name: "remark", type: "text", isNullable: true },
          { name: "status", type: "varchar", length: "40", default: "'active'" },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ],
        indices: [
          { name: "IDX_ad_contracts_tenant_status", columnNames: ["tenantId", "status"] },
          { name: "IDX_ad_contracts_advertiser", columnNames: ["advertiserId"] },
          { name: "IDX_ad_contracts_no", columnNames: ["contractNo"] }
        ],
        foreignKeys: [
          { name: "FK_ad_contracts_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" },
          { name: "FK_ad_contracts_advertiser", columnNames: ["advertiserId"], referencedTableName: "ad_advertisers", referencedColumnNames: ["id"], onDelete: "SET NULL" }
        ]
      }));
    }

    if (!(await queryRunner.hasTable("ad_campaigns"))) {
      await queryRunner.createTable(new Table({
        name: "ad_campaigns",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "advertiserId", type: "int", isNullable: true },
          { name: "contractId", type: "int", isNullable: true },
          { name: "name", type: "varchar", length: "160" },
          { name: "title", type: "varchar", length: "160" },
          { name: "subtitle", type: "varchar", length: "220", isNullable: true },
          { name: "imageUrl", type: "varchar", length: "500", isNullable: true },
          { name: "source", type: "varchar", length: "40", default: "'custom'" },
          { name: "format", type: "varchar", length: "60", default: "'banner'" },
          { name: "slotKey", type: "varchar", length: "80", default: "'home_top_banner'" },
          { name: "pageKey", type: "varchar", length: "80", default: "'home'" },
          { name: "platforms", type: "json", isNullable: true },
          { name: "link", type: "varchar", length: "500", isNullable: true },
          { name: "billingModel", type: "varchar", length: "40", default: "'fixed'" },
          { name: "fixedFee", type: "decimal", precision: 12, scale: 2, default: 0 },
          { name: "cpmPrice", type: "decimal", precision: 12, scale: 4, default: 0 },
          { name: "cpcPrice", type: "decimal", precision: 12, scale: 4, default: 0 },
          { name: "totalBudget", type: "decimal", precision: 12, scale: 2, default: 0 },
          { name: "dailyBudget", type: "decimal", precision: 12, scale: 2, default: 0 },
          { name: "impressionLimit", type: "int", default: 0 },
          { name: "clickLimit", type: "int", default: 0 },
          { name: "officialAdUnitId", type: "varchar", length: "120", isNullable: true },
          { name: "officialAdType", type: "varchar", length: "60", isNullable: true },
          { name: "frequency", type: "varchar", length: "40", default: "'once_per_day'" },
          { name: "priority", type: "int", default: 0 },
          { name: "enabled", type: "tinyint", default: 1 },
          { name: "startAt", type: "datetime", isNullable: true },
          { name: "endAt", type: "datetime", isNullable: true },
          { name: "impressionCount", type: "int", default: 0 },
          { name: "clickCount", type: "int", default: 0 },
          { name: "skipCount", type: "int", default: 0 },
          { name: "closeCount", type: "int", default: 0 },
          { name: "loadCount", type: "int", default: 0 },
          { name: "errorCount", type: "int", default: 0 },
          { name: "rewardCount", type: "int", default: 0 },
          { name: "spentAmount", type: "decimal", precision: 12, scale: 2, default: 0 },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ],
        indices: [
          { name: "IDX_ad_campaigns_tenant_enabled", columnNames: ["tenantId", "enabled", "priority"] },
          { name: "IDX_ad_campaigns_slot", columnNames: ["slotKey", "pageKey"] },
          { name: "IDX_ad_campaigns_schedule", columnNames: ["startAt", "endAt"] },
          { name: "IDX_ad_campaigns_advertiser", columnNames: ["advertiserId"] },
          { name: "IDX_ad_campaigns_contract", columnNames: ["contractId"] }
        ],
        foreignKeys: [
          { name: "FK_ad_campaigns_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" },
          { name: "FK_ad_campaigns_advertiser", columnNames: ["advertiserId"], referencedTableName: "ad_advertisers", referencedColumnNames: ["id"], onDelete: "SET NULL" },
          { name: "FK_ad_campaigns_contract", columnNames: ["contractId"], referencedTableName: "ad_contracts", referencedColumnNames: ["id"], onDelete: "SET NULL" }
        ]
      }));
    }

    if (!(await queryRunner.hasTable("ad_daily_stats"))) {
      await queryRunner.createTable(new Table({
        name: "ad_daily_stats",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "advertiserId", type: "int", isNullable: true },
          { name: "contractId", type: "int", isNullable: true },
          { name: "campaignId", type: "int", isNullable: true },
          { name: "statDate", type: "date" },
          { name: "source", type: "varchar", length: "40", default: "'custom'" },
          { name: "format", type: "varchar", length: "60", default: "'banner'" },
          { name: "slotKey", type: "varchar", length: "80", default: "'home_top_banner'" },
          { name: "pageKey", type: "varchar", length: "80", default: "'home'" },
          { name: "platform", type: "varchar", length: "40", default: "'h5'" },
          { name: "impressionCount", type: "int", default: 0 },
          { name: "clickCount", type: "int", default: 0 },
          { name: "skipCount", type: "int", default: 0 },
          { name: "closeCount", type: "int", default: 0 },
          { name: "loadCount", type: "int", default: 0 },
          { name: "errorCount", type: "int", default: 0 },
          { name: "rewardCount", type: "int", default: 0 },
          { name: "spentAmount", type: "decimal", precision: 12, scale: 2, default: 0 },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ],
        indices: [
          { name: "IDX_ad_daily_stats_campaign_date", columnNames: ["campaignId", "statDate"] },
          { name: "IDX_ad_daily_stats_tenant_date", columnNames: ["tenantId", "statDate"] },
          { name: "IDX_ad_daily_stats_slot_date", columnNames: ["slotKey", "pageKey", "statDate"] }
        ],
        foreignKeys: [
          { name: "FK_ad_daily_stats_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" },
          { name: "FK_ad_daily_stats_advertiser", columnNames: ["advertiserId"], referencedTableName: "ad_advertisers", referencedColumnNames: ["id"], onDelete: "SET NULL" },
          { name: "FK_ad_daily_stats_contract", columnNames: ["contractId"], referencedTableName: "ad_contracts", referencedColumnNames: ["id"], onDelete: "SET NULL" },
          { name: "FK_ad_daily_stats_campaign", columnNames: ["campaignId"], referencedTableName: "ad_campaigns", referencedColumnNames: ["id"], onDelete: "CASCADE" }
        ]
      }));
    }

    if (!(await queryRunner.hasTable("ad_settlements"))) {
      await queryRunner.createTable(new Table({
        name: "ad_settlements",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "advertiserId", type: "int", isNullable: true },
          { name: "contractId", type: "int", isNullable: true },
          { name: "settlementNo", type: "varchar", length: "80" },
          { name: "periodStart", type: "date" },
          { name: "periodEnd", type: "date" },
          { name: "billingModel", type: "varchar", length: "40", default: "'fixed'" },
          { name: "amount", type: "decimal", precision: 12, scale: 2, default: 0 },
          { name: "status", type: "varchar", length: "40", default: "'pending'" },
          { name: "remark", type: "text", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ],
        indices: [
          { name: "IDX_ad_settlements_tenant_status", columnNames: ["tenantId", "status"] },
          { name: "IDX_ad_settlements_contract", columnNames: ["contractId"] },
          { name: "IDX_ad_settlements_no", columnNames: ["settlementNo"] }
        ],
        foreignKeys: [
          { name: "FK_ad_settlements_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" },
          { name: "FK_ad_settlements_advertiser", columnNames: ["advertiserId"], referencedTableName: "ad_advertisers", referencedColumnNames: ["id"], onDelete: "SET NULL" },
          { name: "FK_ad_settlements_contract", columnNames: ["contractId"], referencedTableName: "ad_contracts", referencedColumnNames: ["id"], onDelete: "SET NULL" }
        ]
      }));
    }

    if (!(await queryRunner.hasTable("ad_settlement_items"))) {
      await queryRunner.createTable(new Table({
        name: "ad_settlement_items",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "settlementId", type: "int" },
          { name: "campaignId", type: "int", isNullable: true },
          { name: "description", type: "varchar", length: "180" },
          { name: "billingModel", type: "varchar", length: "40", default: "'fixed'" },
          { name: "quantity", type: "decimal", precision: 12, scale: 2, default: 0 },
          { name: "unitPrice", type: "decimal", precision: 12, scale: 4, default: 0 },
          { name: "amount", type: "decimal", precision: 12, scale: 2, default: 0 },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ],
        indices: [
          { name: "IDX_ad_settlement_items_settlement", columnNames: ["settlementId"] },
          { name: "IDX_ad_settlement_items_campaign", columnNames: ["campaignId"] }
        ],
        foreignKeys: [
          { name: "FK_ad_settlement_items_settlement", columnNames: ["settlementId"], referencedTableName: "ad_settlements", referencedColumnNames: ["id"], onDelete: "CASCADE" },
          { name: "FK_ad_settlement_items_campaign", columnNames: ["campaignId"], referencedTableName: "ad_campaigns", referencedColumnNames: ["id"], onDelete: "SET NULL" }
        ]
      }));
    }

    if (!(await queryRunner.hasTable("ad_official_revenue_imports"))) {
      await queryRunner.createTable(new Table({
        name: "ad_official_revenue_imports",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "importDate", type: "date" },
          { name: "revenueAmount", type: "decimal", precision: 12, scale: 2, default: 0 },
          { name: "impressionCount", type: "int", default: 0 },
          { name: "clickCount", type: "int", default: 0 },
          { name: "ecpm", type: "decimal", precision: 12, scale: 4, default: 0 },
          { name: "fileUrl", type: "varchar", length: "500", isNullable: true },
          { name: "remark", type: "text", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ],
        indices: [
          { name: "IDX_ad_official_revenue_tenant_date", columnNames: ["tenantId", "importDate"] }
        ],
        foreignKeys: [
          { name: "FK_ad_official_revenue_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" }
        ]
      }));
    }

    await this.backfillAdCenterPermission(queryRunner);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      "ad_official_revenue_imports",
      "ad_settlement_items",
      "ad_settlements",
      "ad_daily_stats",
      "ad_campaigns",
      "ad_contracts",
      "ad_advertisers"
    ]) {
      if (await queryRunner.hasTable(table)) await queryRunner.dropTable(table);
    }
  }

  private async backfillAdCenterPermission(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("admin_users"))) return;
    if (!(await queryRunner.hasColumn("admin_users", "permissions"))) return;
    const rows = await queryRunner.query(
      "SELECT id, permissions FROM admin_users WHERE role IN (?, ?, ?, ?) AND permissions IS NOT NULL",
      ["super_admin", "admin", "operator", "finance"]
    );
    for (const row of rows as Array<{ id: number; permissions: unknown }>) {
      const permissions = this.parsePermissions(row.permissions);
      if (permissions.includes(AD_CENTER_PERMISSION)) continue;
      permissions.push(AD_CENTER_PERMISSION);
      await queryRunner.query("UPDATE admin_users SET permissions = ? WHERE id = ?", [JSON.stringify(Array.from(new Set(permissions))), row.id]);
    }
  }

  private parsePermissions(value: unknown): string[] {
    if (Array.isArray(value)) return value.map((item) => String(item));
    if (Buffer.isBuffer(value)) return this.parsePermissions(value.toString("utf8"));
    if (typeof value !== "string") return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }
}
