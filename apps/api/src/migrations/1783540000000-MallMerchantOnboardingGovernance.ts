import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class MallMerchantOnboardingGovernance1783540000000 implements MigrationInterface {
  name = "MallMerchantOnboardingGovernance1783540000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("mall_merchants", "onboardingStatus"))) await queryRunner.query("ALTER TABLE `mall_merchants` ADD `onboardingStatus` varchar(32) NOT NULL DEFAULT 'legacy_approved', ADD `contractRequired` tinyint NOT NULL DEFAULT 0, ADD `platformCommissionBps` int NOT NULL DEFAULT 0, ADD `serviceFeeBps` int NOT NULL DEFAULT 0, ADD `settlementCycleDays` int NOT NULL DEFAULT 30, ADD `suspendedAt` datetime NULL, ADD `suspensionReason` varchar(500) NULL");
    if (!(await queryRunner.hasColumn("admin_mall_merchant_access", "permissions"))) await queryRunner.query("ALTER TABLE `admin_mall_merchant_access` ADD `permissions` json NULL, ADD `validFrom` datetime NULL, ADD `validUntil` datetime NULL, ADD `disabledReason` varchar(500) NULL");
    if (!(await queryRunner.hasTable("mall_merchant_applications"))) await queryRunner.createTable(new Table({
      name: "mall_merchant_applications",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "tenantId", type: "int" }, { name: "applicantUserId", type: "int" }, { name: "merchantId", type: "int", isNullable: true },
        { name: "desiredName", type: "varchar", length: "120" }, { name: "legalName", type: "varchar", length: "160" }, { name: "unifiedSocialCreditCode", type: "varchar", length: "40" }, { name: "legalRepresentative", type: "varchar", length: "80" },
        { name: "contactName", type: "varchar", length: "100" }, { name: "contactPhone", type: "varchar", length: "40" }, { name: "region", type: "varchar", length: "120", isNullable: true },
        { name: "businessLicenseUrl", type: "varchar", length: "500" }, { name: "qualificationFiles", type: "json", isNullable: true }, { name: "status", type: "varchar", length: "24", default: "'pending'" },
        { name: "applyRemark", type: "varchar", length: "1000", isNullable: true }, { name: "reviewRemark", type: "varchar", length: "1000", isNullable: true }, { name: "submittedAt", type: "datetime", isNullable: true }, { name: "reviewedAt", type: "datetime", isNullable: true }, { name: "reviewedByAdminId", type: "int", isNullable: true },
        { name: "createdAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)" }, { name: "updatedAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" }
      ],
      foreignKeys: [
        { name: "FK_mall_merchant_application_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" },
        { name: "FK_mall_merchant_application_user", columnNames: ["applicantUserId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "CASCADE" },
        { name: "FK_mall_merchant_application_merchant", columnNames: ["merchantId"], referencedTableName: "mall_merchants", referencedColumnNames: ["id"], onDelete: "SET NULL" }
      ],
      indices: [{ name: "IDX_mall_merchant_application_tenant_status", columnNames: ["tenantId", "status", "createdAt"] }, { name: "IDX_mall_merchant_application_user", columnNames: ["applicantUserId", "createdAt"] }]
    }));
    if (!(await queryRunner.hasTable("mall_merchant_qualifications"))) await queryRunner.createTable(new Table({
      name: "mall_merchant_qualifications",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "tenantId", type: "int" }, { name: "merchantId", type: "int" },
        { name: "type", type: "varchar", length: "40" }, { name: "name", type: "varchar", length: "120" }, { name: "certificateNo", type: "varchar", length: "120", isNullable: true }, { name: "fileUrls", type: "json" },
        { name: "validFrom", type: "date", isNullable: true }, { name: "validUntil", type: "date", isNullable: true }, { name: "status", type: "varchar", length: "24", default: "'pending'" },
        { name: "reviewRemark", type: "varchar", length: "1000", isNullable: true }, { name: "reviewedByAdminId", type: "int", isNullable: true }, { name: "reviewedAt", type: "datetime", isNullable: true },
        { name: "createdAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)" }, { name: "updatedAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" }
      ],
      foreignKeys: [{ name: "FK_mall_merchant_qualification_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }, { name: "FK_mall_merchant_qualification_merchant", columnNames: ["merchantId"], referencedTableName: "mall_merchants", referencedColumnNames: ["id"], onDelete: "CASCADE" }],
      indices: [{ name: "IDX_mall_merchant_qualification_validity", columnNames: ["merchantId", "status", "validUntil"] }]
    }));
    if (!(await queryRunner.hasTable("mall_merchant_contracts"))) await queryRunner.createTable(new Table({
      name: "mall_merchant_contracts",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "tenantId", type: "int" }, { name: "merchantId", type: "int" },
        { name: "contractNo", type: "varchar", length: "100" }, { name: "version", type: "int", default: 1 }, { name: "name", type: "varchar", length: "160" }, { name: "fileUrl", type: "varchar", length: "500" },
        { name: "startsAt", type: "date" }, { name: "endsAt", type: "date" }, { name: "signedAt", type: "datetime", isNullable: true }, { name: "status", type: "varchar", length: "24", default: "'draft'" },
        { name: "platformCommissionBps", type: "int", default: 0 }, { name: "serviceFeeBps", type: "int", default: 0 }, { name: "settlementCycleDays", type: "int", default: 30 },
        { name: "snapshot", type: "json", isNullable: true }, { name: "remark", type: "varchar", length: "1000", isNullable: true }, { name: "activatedByAdminId", type: "int", isNullable: true }, { name: "activatedAt", type: "datetime", isNullable: true },
        { name: "createdAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)" }, { name: "updatedAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" }
      ],
      foreignKeys: [{ name: "FK_mall_merchant_contract_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }, { name: "FK_mall_merchant_contract_merchant", columnNames: ["merchantId"], referencedTableName: "mall_merchants", referencedColumnNames: ["id"], onDelete: "CASCADE" }],
      indices: [{ name: "IDX_mall_merchant_contract_validity", columnNames: ["merchantId", "status", "endsAt"] }, { name: "IDX_mall_merchant_contract_no_version", columnNames: ["contractNo", "version"], isUnique: true }]
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_merchant_contracts")) await queryRunner.dropTable("mall_merchant_contracts", true);
    if (await queryRunner.hasTable("mall_merchant_qualifications")) await queryRunner.dropTable("mall_merchant_qualifications", true);
    if (await queryRunner.hasTable("mall_merchant_applications")) await queryRunner.dropTable("mall_merchant_applications", true);
    if (await queryRunner.hasColumn("admin_mall_merchant_access", "permissions")) await queryRunner.query("ALTER TABLE `admin_mall_merchant_access` DROP COLUMN `disabledReason`, DROP COLUMN `validUntil`, DROP COLUMN `validFrom`, DROP COLUMN `permissions`");
    if (await queryRunner.hasColumn("mall_merchants", "onboardingStatus")) await queryRunner.query("ALTER TABLE `mall_merchants` DROP COLUMN `suspensionReason`, DROP COLUMN `suspendedAt`, DROP COLUMN `settlementCycleDays`, DROP COLUMN `serviceFeeBps`, DROP COLUMN `platformCommissionBps`, DROP COLUMN `contractRequired`, DROP COLUMN `onboardingStatus`");
  }
}
