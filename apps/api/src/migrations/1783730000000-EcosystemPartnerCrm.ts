import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from "typeorm";

export class EcosystemPartnerCrm1783730000000 implements MigrationInterface {
  name = "EcosystemPartnerCrm1783730000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const column of [
      new TableColumn({ name: "businessKey", type: "varchar", length: "160", isNullable: true }),
      new TableColumn({ name: "kind", type: "varchar", length: "24", default: "'ambassador'" }),
      new TableColumn({ name: "province", type: "varchar", length: "80", isNullable: true }),
      new TableColumn({ name: "district", type: "varchar", length: "80", isNullable: true }),
      new TableColumn({ name: "organizationName", type: "varchar", length: "160", isNullable: true }),
      new TableColumn({ name: "cooperationIntent", type: "varchar", length: "160", isNullable: true }),
      new TableColumn({ name: "remarkEncrypted", type: "text", isNullable: true }),
      new TableColumn({ name: "ownerAdminId", type: "int", isNullable: true }),
      new TableColumn({ name: "convertedTenantId", type: "int", isNullable: true }),
      new TableColumn({ name: "convertedMerchantId", type: "int", isNullable: true }),
      new TableColumn({ name: "conversionBusinessKey", type: "varchar", length: "160", isNullable: true }),
      new TableColumn({ name: "convertedAt", type: "datetime", isNullable: true }),
      new TableColumn({ name: "version", type: "int", default: 1 })
    ]) await this.addColumnIfMissing(queryRunner, "ambassador_applications", column);
    await queryRunner.query("UPDATE ambassador_applications SET kind = CASE WHEN source IN ('dean_recruit','partner_apply','brand_story_contact') THEN 'partner' ELSE 'ambassador' END");
    await queryRunner.query("UPDATE ambassador_applications SET businessKey = CONCAT('legacy-ecosystem:', id) WHERE businessKey IS NULL");
    await this.addIndexIfMissing(queryRunner, "ambassador_applications", new TableIndex({ name: "UQ_ambassador_application_business_key", columnNames: ["businessKey"], isUnique: true }));
    await this.addIndexIfMissing(queryRunner, "ambassador_applications", new TableIndex({ name: "IDX_ambassador_application_kind_status", columnNames: ["kind", "status", "createdAt"] }));
    await this.addIndexIfMissing(queryRunner, "ambassador_applications", new TableIndex({ name: "UQ_ambassador_application_conversion_key", columnNames: ["conversionBusinessKey"], isUnique: true }));
    await this.addForeignKeyIfMissing(queryRunner, "ambassador_applications", new TableForeignKey({ name: "FK_ambassador_application_owner_admin", columnNames: ["ownerAdminId"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
    await this.addForeignKeyIfMissing(queryRunner, "ambassador_applications", new TableForeignKey({ name: "FK_ambassador_application_converted_tenant", columnNames: ["convertedTenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
    await this.addForeignKeyIfMissing(queryRunner, "ambassador_applications", new TableForeignKey({ name: "FK_ambassador_application_converted_merchant", columnNames: ["convertedMerchantId"], referencedTableName: "mall_merchants", referencedColumnNames: ["id"], onDelete: "SET NULL" }));

    for (const column of [
      new TableColumn({ name: "businessKey", type: "varchar", length: "160", isNullable: true }),
      new TableColumn({ name: "contentEncrypted", type: "text", isNullable: true }),
      new TableColumn({ name: "fromStatus", type: "varchar", length: "24", isNullable: true }),
      new TableColumn({ name: "toStatus", type: "varchar", length: "24", isNullable: true })
    ]) await this.addColumnIfMissing(queryRunner, "ambassador_application_followups", column);
    await queryRunner.query("UPDATE ambassador_application_followups SET businessKey = CONCAT('legacy-followup:', id), fromStatus = NULL, toStatus = result WHERE businessKey IS NULL");
    await this.addIndexIfMissing(queryRunner, "ambassador_application_followups", new TableIndex({ name: "UQ_ambassador_followup_business_key", columnNames: ["businessKey"], isUnique: true }));

    await queryRunner.createTable(new Table({
      name: "ambassador_profiles",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
        { name: "profileNo", type: "varchar", length: "64" }, { name: "applicationId", type: "int" }, { name: "userId", type: "int", isNullable: true }, { name: "activatedById", type: "int", isNullable: true },
        { name: "name", type: "varchar", length: "40" }, { name: "phoneMasked", type: "varchar", length: "20" }, { name: "phoneLookupHash", type: "varchar", length: "64" }, { name: "city", type: "varchar", length: "80" },
        { name: "regionScope", type: "json", isNullable: true }, { name: "status", type: "varchar", length: "24", default: "'active'" }, { name: "level", type: "varchar", length: "24", default: "'starter'" }, { name: "contributionPoints", type: "int", default: 0 },
        { name: "startsAt", type: "datetime" }, { name: "expiresAt", type: "datetime" }, { name: "lastContributionAt", type: "datetime", isNullable: true }, { name: "suspendedAt", type: "datetime", isNullable: true }, { name: "statusReason", type: "varchar", length: "500", isNullable: true },
        { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }, { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }, { name: "version", type: "int", default: 1 }
      ]
    }));
    for (const key of [
      new TableForeignKey({ name: "FK_ambassador_profile_application", columnNames: ["applicationId"], referencedTableName: "ambassador_applications", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
      new TableForeignKey({ name: "FK_ambassador_profile_user", columnNames: ["userId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "SET NULL" }),
      new TableForeignKey({ name: "FK_ambassador_profile_activated_by", columnNames: ["activatedById"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" })
    ]) await queryRunner.createForeignKey("ambassador_profiles", key);
    for (const index of [
      new TableIndex({ name: "UQ_ambassador_profile_no", columnNames: ["profileNo"], isUnique: true }),
      new TableIndex({ name: "UQ_ambassador_profile_application", columnNames: ["applicationId"], isUnique: true }),
      new TableIndex({ name: "IDX_ambassador_profile_phone_hash", columnNames: ["phoneLookupHash"] }),
      new TableIndex({ name: "IDX_ambassador_profile_region_status", columnNames: ["city", "status", "expiresAt"] })
    ]) await queryRunner.createIndex("ambassador_profiles", index);

    await queryRunner.createTable(new Table({
      name: "ambassador_tasks",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "taskNo", type: "varchar", length: "64" }, { name: "title", type: "varchar", length: "120" }, { name: "city", type: "varchar", length: "80", isNullable: true }, { name: "description", type: "text" },
        { name: "pointValue", type: "int", default: 0 }, { name: "quota", type: "int", default: 0 }, { name: "status", type: "varchar", length: "24", default: "'draft'" }, { name: "startsAt", type: "datetime", isNullable: true }, { name: "endsAt", type: "datetime", isNullable: true }, { name: "createdById", type: "int", isNullable: true },
        { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }, { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }, { name: "version", type: "int", default: 1 }
      ],
      foreignKeys: [{ name: "FK_ambassador_task_created_by", columnNames: ["createdById"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }],
      indices: [{ name: "UQ_ambassador_task_no", columnNames: ["taskNo"], isUnique: true }, { name: "IDX_ambassador_task_status_time", columnNames: ["status", "startsAt", "endsAt"] }]
    }));

    await queryRunner.createTable(new Table({
      name: "ambassador_contributions",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "businessKey", type: "varchar", length: "160" }, { name: "profileId", type: "int" }, { name: "taskId", type: "int", isNullable: true },
        { name: "sourceType", type: "varchar", length: "40" }, { name: "title", type: "varchar", length: "160" }, { name: "quantity", type: "int", default: 1 }, { name: "points", type: "int", default: 0 }, { name: "status", type: "varchar", length: "24", default: "'pending'" },
        { name: "evidenceEncrypted", type: "text", isNullable: true }, { name: "reviewRemarkEncrypted", type: "text", isNullable: true }, { name: "submittedById", type: "int", isNullable: true }, { name: "reviewedById", type: "int", isNullable: true }, { name: "reviewBusinessKey", type: "varchar", length: "160", isNullable: true }, { name: "reversalBusinessKey", type: "varchar", length: "160", isNullable: true }, { name: "reviewedAt", type: "datetime", isNullable: true }, { name: "reversedAt", type: "datetime", isNullable: true }, { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
      ],
      foreignKeys: [
        { name: "FK_ambassador_contribution_profile", columnNames: ["profileId"], referencedTableName: "ambassador_profiles", referencedColumnNames: ["id"], onDelete: "CASCADE" },
        { name: "FK_ambassador_contribution_task", columnNames: ["taskId"], referencedTableName: "ambassador_tasks", referencedColumnNames: ["id"], onDelete: "SET NULL" },
        { name: "FK_ambassador_contribution_submitted_by", columnNames: ["submittedById"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" },
        { name: "FK_ambassador_contribution_reviewed_by", columnNames: ["reviewedById"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }
      ],
      indices: [{ name: "UQ_ambassador_contribution_business_key", columnNames: ["businessKey"], isUnique: true }, { name: "UQ_ambassador_contribution_review_key", columnNames: ["reviewBusinessKey"], isUnique: true }, { name: "UQ_ambassador_contribution_reversal_key", columnNames: ["reversalBusinessKey"], isUnique: true }, { name: "IDX_ambassador_contribution_profile_status", columnNames: ["profileId", "status", "createdAt"] }]
    }));

    await queryRunner.createTable(new Table({
      name: "partner_contracts",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "contractNo", type: "varchar", length: "80" }, { name: "businessKey", type: "varchar", length: "160" }, { name: "applicationId", type: "int" }, { name: "contractVersion", type: "int" },
        { name: "cooperationType", type: "varchar", length: "32" }, { name: "status", type: "varchar", length: "24", default: "'draft'" }, { name: "startsAt", type: "datetime" }, { name: "endsAt", type: "datetime" }, { name: "signedAt", type: "datetime", isNullable: true },
        { name: "termsEncrypted", type: "text", isNullable: true }, { name: "documentReferenceEncrypted", type: "text", isNullable: true }, { name: "createdById", type: "int", isNullable: true }, { name: "reviewedById", type: "int", isNullable: true }, { name: "reviewBusinessKey", type: "varchar", length: "160", isNullable: true }, { name: "terminationBusinessKey", type: "varchar", length: "160", isNullable: true }, { name: "reviewRemarkEncrypted", type: "text", isNullable: true }, { name: "reviewedAt", type: "datetime", isNullable: true }, { name: "terminatedAt", type: "datetime", isNullable: true },
        { name: "snapshot", type: "json", isNullable: true }, { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }, { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }, { name: "version", type: "int", default: 1 }
      ],
      foreignKeys: [
        { name: "FK_partner_contract_application", columnNames: ["applicationId"], referencedTableName: "ambassador_applications", referencedColumnNames: ["id"], onDelete: "CASCADE" },
        { name: "FK_partner_contract_created_by", columnNames: ["createdById"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" },
        { name: "FK_partner_contract_reviewed_by", columnNames: ["reviewedById"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }
      ],
      indices: [
        { name: "UQ_partner_contract_no", columnNames: ["contractNo"], isUnique: true }, { name: "UQ_partner_contract_business_key", columnNames: ["businessKey"], isUnique: true }, { name: "UQ_partner_contract_application_version", columnNames: ["applicationId", "contractVersion"], isUnique: true }, { name: "UQ_partner_contract_review_key", columnNames: ["reviewBusinessKey"], isUnique: true }, { name: "UQ_partner_contract_termination_key", columnNames: ["terminationBusinessKey"], isUnique: true }, { name: "IDX_partner_contract_status_expiry", columnNames: ["status", "endsAt"] }
      ]
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ["partner_contracts", "ambassador_contributions", "ambassador_tasks", "ambassador_profiles"]) if (await queryRunner.hasTable(table)) await queryRunner.dropTable(table, true);
    const application = await queryRunner.getTable("ambassador_applications");
    for (const key of ["FK_ambassador_application_converted_merchant", "FK_ambassador_application_converted_tenant", "FK_ambassador_application_owner_admin"]) {
      const foreignKey = application?.foreignKeys.find((item) => item.name === key);
      if (foreignKey) await queryRunner.dropForeignKey("ambassador_applications", foreignKey);
    }
    for (const column of ["version", "convertedAt", "conversionBusinessKey", "convertedMerchantId", "convertedTenantId", "ownerAdminId", "remarkEncrypted", "cooperationIntent", "organizationName", "district", "province", "kind", "businessKey"]) if (await queryRunner.hasColumn("ambassador_applications", column)) await queryRunner.dropColumn("ambassador_applications", column);
    for (const column of ["toStatus", "fromStatus", "contentEncrypted", "businessKey"]) if (await queryRunner.hasColumn("ambassador_application_followups", column)) await queryRunner.dropColumn("ambassador_application_followups", column);
  }

  private async addColumnIfMissing(queryRunner: QueryRunner, table: string, column: TableColumn) {
    if (!(await queryRunner.hasColumn(table, column.name))) await queryRunner.addColumn(table, column);
  }

  private async addIndexIfMissing(queryRunner: QueryRunner, table: string, index: TableIndex) {
    const current = await queryRunner.getTable(table);
    if (!current?.indices.some((item) => item.name === index.name)) await queryRunner.createIndex(table, index);
  }

  private async addForeignKeyIfMissing(queryRunner: QueryRunner, table: string, key: TableForeignKey) {
    const current = await queryRunner.getTable(table);
    if (!current?.foreignKeys.some((item) => item.name === key.name)) await queryRunner.createForeignKey(table, key);
  }
}
