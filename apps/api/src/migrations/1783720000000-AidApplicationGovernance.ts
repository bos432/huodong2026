import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class AidApplicationGovernance1783720000000 implements MigrationInterface {
  name = "AidApplicationGovernance1783720000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: "aid_applications",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
        { name: "applicationNo", type: "varchar", length: "64" },
        { name: "submitBusinessKey", type: "varchar", length: "160" },
        { name: "tenantId", type: "int", isNullable: true },
        { name: "userId", type: "int" },
        { name: "assigneeId", type: "int", isNullable: true },
        { name: "reviewerId", type: "int", isNullable: true },
        { name: "type", type: "varchar", length: "20" },
        { name: "status", type: "varchar", length: "32", default: "'submitted'" },
        { name: "city", type: "varchar", length: "80" },
        { name: "supportCategory", type: "varchar", length: "80" },
        { name: "sensitivePayloadEncrypted", type: "text" },
        { name: "phoneLookupHash", type: "varchar", length: "64" },
        { name: "applicantNameMasked", type: "varchar", length: "40" },
        { name: "phoneMasked", type: "varchar", length: "20" },
        { name: "materialCount", type: "int", default: 0 },
        { name: "consentVersion", type: "varchar", length: "40" },
        { name: "consentAt", type: "datetime" },
        { name: "supplementRequestEncrypted", type: "text", isNullable: true },
        { name: "reviewRemarkEncrypted", type: "text", isNullable: true },
        { name: "reviewBusinessKey", type: "varchar", length: "160", isNullable: true },
        { name: "reviewedAt", type: "datetime", isNullable: true },
        { name: "closedAt", type: "datetime", isNullable: true },
        { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
        { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" },
        { name: "version", type: "int", default: 1 }
      ]
    }));
    for (const key of [
      new TableForeignKey({ name: "FK_aid_application_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" }),
      new TableForeignKey({ name: "FK_aid_application_user", columnNames: ["userId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
      new TableForeignKey({ name: "FK_aid_application_assignee", columnNames: ["assigneeId"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }),
      new TableForeignKey({ name: "FK_aid_application_reviewer", columnNames: ["reviewerId"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" })
    ]) await queryRunner.createForeignKey("aid_applications", key);
    for (const index of [
      new TableIndex({ name: "UQ_aid_application_no", columnNames: ["applicationNo"], isUnique: true }),
      new TableIndex({ name: "UQ_aid_application_submit_key", columnNames: ["submitBusinessKey"], isUnique: true }),
      new TableIndex({ name: "UQ_aid_application_review_key", columnNames: ["reviewBusinessKey"], isUnique: true }),
      new TableIndex({ name: "IDX_aid_application_scope_status", columnNames: ["tenantId", "status", "createdAt"] }),
      new TableIndex({ name: "IDX_aid_application_user", columnNames: ["userId", "createdAt"] }),
      new TableIndex({ name: "IDX_aid_application_phone_hash", columnNames: ["phoneLookupHash"] })
    ]) await queryRunner.createIndex("aid_applications", index);

    await queryRunner.createTable(new Table({
      name: "aid_application_materials",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
        { name: "applicationId", type: "int" },
        { name: "tenantId", type: "int", isNullable: true },
        { name: "uploadedByUserId", type: "int", isNullable: true },
        { name: "uploadedByAdminId", type: "int", isNullable: true },
        { name: "category", type: "varchar", length: "40" },
        { name: "originalNameEncrypted", type: "text" },
        { name: "mimetype", type: "varchar", length: "100" },
        { name: "size", type: "bigint" },
        { name: "encryptedReference", type: "varchar", length: "255" },
        { name: "status", type: "varchar", length: "20", default: "'active'" },
        { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
      ]
    }));
    for (const key of [
      new TableForeignKey({ name: "FK_aid_material_application", columnNames: ["applicationId"], referencedTableName: "aid_applications", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
      new TableForeignKey({ name: "FK_aid_material_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" }),
      new TableForeignKey({ name: "FK_aid_material_user", columnNames: ["uploadedByUserId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "SET NULL" }),
      new TableForeignKey({ name: "FK_aid_material_admin", columnNames: ["uploadedByAdminId"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" })
    ]) await queryRunner.createForeignKey("aid_application_materials", key);
    await queryRunner.createIndex("aid_application_materials", new TableIndex({ name: "IDX_aid_material_application_status", columnNames: ["applicationId", "status", "createdAt"] }));

    await queryRunner.createTable(new Table({
      name: "aid_application_events",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
        { name: "applicationId", type: "int" },
        { name: "tenantId", type: "int", isNullable: true },
        { name: "userId", type: "int", isNullable: true },
        { name: "adminId", type: "int", isNullable: true },
        { name: "businessKey", type: "varchar", length: "160" },
        { name: "action", type: "varchar", length: "40" },
        { name: "fromStatus", type: "varchar", length: "32", isNullable: true },
        { name: "toStatus", type: "varchar", length: "32" },
        { name: "contentEncrypted", type: "text", isNullable: true },
        { name: "snapshot", type: "json", isNullable: true },
        { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
      ]
    }));
    for (const key of [
      new TableForeignKey({ name: "FK_aid_event_application", columnNames: ["applicationId"], referencedTableName: "aid_applications", referencedColumnNames: ["id"], onDelete: "CASCADE" }),
      new TableForeignKey({ name: "FK_aid_event_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" }),
      new TableForeignKey({ name: "FK_aid_event_user", columnNames: ["userId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "SET NULL" }),
      new TableForeignKey({ name: "FK_aid_event_admin", columnNames: ["adminId"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" })
    ]) await queryRunner.createForeignKey("aid_application_events", key);
    await queryRunner.createIndex("aid_application_events", new TableIndex({ name: "UQ_aid_event_business_key", columnNames: ["businessKey"], isUnique: true }));
    await queryRunner.createIndex("aid_application_events", new TableIndex({ name: "IDX_aid_event_timeline", columnNames: ["applicationId", "createdAt"] }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("aid_application_events", true);
    await queryRunner.dropTable("aid_application_materials", true);
    await queryRunner.dropTable("aid_applications", true);
  }
}
