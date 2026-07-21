import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from "typeorm";

export class VolunteerCredentials1783750000000 implements MigrationInterface {
  name = "VolunteerCredentials1783750000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const column of [
      new TableColumn({ name: "issueBusinessKey", type: "varchar", length: "160", isNullable: true }),
      new TableColumn({ name: "certificateVersion", type: "int", default: 1 }),
      new TableColumn({ name: "revokeReasonEncrypted", type: "text", isNullable: true })
    ]) if (await queryRunner.hasTable("certificates") && !(await queryRunner.hasColumn("certificates", column.name))) await queryRunner.addColumn("certificates", column);
    if (await queryRunner.hasTable("certificates")) await this.addIndex(queryRunner, "certificates", new TableIndex({ name: "UQ_certificate_issue_business_key", columnNames: ["issueBusinessKey"], isUnique: true }));

    if (!(await queryRunner.hasTable("volunteer_badge_definitions"))) await queryRunner.createTable(new Table({
      name: "volunteer_badge_definitions",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "code", type: "varchar", length: "64" }, { name: "name", type: "varchar", length: "120" }, { name: "description", type: "varchar", length: "500", isNullable: true }, { name: "iconUrl", type: "varchar", length: "500", isNullable: true }, { name: "ruleType", type: "varchar", length: "40", default: "'service_hours'" }, { name: "threshold", type: "decimal", precision: 8, scale: 2, default: 0 }, { name: "enabled", type: "boolean", default: true }, { name: "version", type: "int", default: 1 }, { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }, { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
      ], indices: [{ name: "UQ_volunteer_badge_definition_code", columnNames: ["code"], isUnique: true }]
    }));
    if (!(await queryRunner.hasTable("volunteer_badge_awards"))) await queryRunner.createTable(new Table({
      name: "volunteer_badge_awards",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "businessKey", type: "varchar", length: "160" }, { name: "definitionId", type: "int" }, { name: "profileId", type: "int" }, { name: "sourceServiceRecordId", type: "int", isNullable: true }, { name: "status", type: "varchar", length: "24", default: "'active'" }, { name: "awardedAt", type: "datetime" }, { name: "awardedById", type: "int", isNullable: true }, { name: "revokedAt", type: "datetime", isNullable: true }, { name: "revokedBy", type: "varchar", length: "120", isNullable: true }, { name: "revokeReasonEncrypted", type: "text", isNullable: true }, { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
      ],
      foreignKeys: [
        { name: "FK_volunteer_badge_award_definition", columnNames: ["definitionId"], referencedTableName: "volunteer_badge_definitions", referencedColumnNames: ["id"], onDelete: "RESTRICT" }, { name: "FK_volunteer_badge_award_profile", columnNames: ["profileId"], referencedTableName: "volunteer_profiles", referencedColumnNames: ["id"], onDelete: "CASCADE" }, { name: "FK_volunteer_badge_award_record", columnNames: ["sourceServiceRecordId"], referencedTableName: "volunteer_service_records", referencedColumnNames: ["id"], onDelete: "SET NULL" }, { name: "FK_volunteer_badge_award_admin", columnNames: ["awardedById"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }
      ], indices: [{ name: "UQ_volunteer_badge_award_business_key", columnNames: ["businessKey"], isUnique: true }, { name: "IDX_volunteer_badge_award_profile", columnNames: ["profileId", "status", "awardedAt"] }]
    }));
    if (!(await queryRunner.hasTable("volunteer_service_proofs"))) await queryRunner.createTable(new Table({
      name: "volunteer_service_proofs",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "proofNo", type: "varchar", length: "80" }, { name: "businessKey", type: "varchar", length: "160" }, { name: "profileId", type: "int" }, { name: "serviceRecordId", type: "int", isNullable: true }, { name: "title", type: "varchar", length: "160" }, { name: "hours", type: "decimal", precision: 8, scale: 2, default: 0 }, { name: "snapshot", type: "json", isNullable: true }, { name: "evidenceEncrypted", type: "text", isNullable: true }, { name: "status", type: "varchar", length: "24", default: "'active'" }, { name: "issuerId", type: "int", isNullable: true }, { name: "revokedAt", type: "datetime", isNullable: true }, { name: "revokedBy", type: "varchar", length: "120", isNullable: true }, { name: "revokeReasonEncrypted", type: "text", isNullable: true }, { name: "issuedAt", type: "datetime", default: "CURRENT_TIMESTAMP" }, { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
      ],
      foreignKeys: [
        { name: "FK_volunteer_proof_profile", columnNames: ["profileId"], referencedTableName: "volunteer_profiles", referencedColumnNames: ["id"], onDelete: "CASCADE" }, { name: "FK_volunteer_proof_record", columnNames: ["serviceRecordId"], referencedTableName: "volunteer_service_records", referencedColumnNames: ["id"], onDelete: "SET NULL" }, { name: "FK_volunteer_proof_issuer", columnNames: ["issuerId"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }
      ], indices: [{ name: "UQ_volunteer_proof_no", columnNames: ["proofNo"], isUnique: true }, { name: "UQ_volunteer_proof_business_key", columnNames: ["businessKey"], isUnique: true }]
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ["volunteer_service_proofs", "volunteer_badge_awards", "volunteer_badge_definitions"]) if (await queryRunner.hasTable(table)) await queryRunner.dropTable(table, true);
  }

  private async addIndex(queryRunner: QueryRunner, tableName: string, index: TableIndex) {
    const table = await queryRunner.getTable(tableName);
    if (table && !table.indices.some((item) => item.name === index.name)) await queryRunner.createIndex(tableName, index);
  }
}
