import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class ContentGovernance1783530000000 implements MigrationInterface {
  name = "ContentGovernance1783530000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("content_keyword_rules"))) await queryRunner.createTable(new Table({
      name: "content_keyword_rules",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "tenantId", type: "int", isNullable: true },
        { name: "scope", type: "varchar", length: "20", default: "'all'" }, { name: "keyword", type: "varchar", length: "120" },
        { name: "matchMode", type: "varchar", length: "20", default: "'contains'" }, { name: "action", type: "varchar", length: "20", default: "'review'" },
        { name: "replacement", type: "varchar", length: "120", isNullable: true }, { name: "enabled", type: "tinyint", default: 1 },
        { name: "createdByAdminId", type: "int", isNullable: true }, { name: "createdAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)" },
        { name: "updatedAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" }
      ],
      foreignKeys: [{ name: "FK_content_keyword_rule_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }],
      indices: [{ name: "IDX_content_keyword_rule_scope", columnNames: ["tenantId", "scope", "enabled"] }, { name: "IDX_content_keyword_rule_keyword", columnNames: ["keyword"] }]
    }));
    if (!(await queryRunner.hasTable("content_user_sanctions"))) await queryRunner.createTable(new Table({
      name: "content_user_sanctions",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "tenantId", type: "int", isNullable: true },
        { name: "userId", type: "int" }, { name: "scope", type: "varchar", length: "20", default: "'all'" }, { name: "type", type: "varchar", length: "20", default: "'mute'" },
        { name: "status", type: "varchar", length: "20", default: "'active'" }, { name: "reason", type: "varchar", length: "500" },
        { name: "sourceType", type: "varchar", length: "40", isNullable: true }, { name: "sourceId", type: "int", isNullable: true },
        { name: "startsAt", type: "datetime" }, { name: "endsAt", type: "datetime", isNullable: true }, { name: "issuedByAdminId", type: "int", isNullable: true },
        { name: "revokedByAdminId", type: "int", isNullable: true }, { name: "revokedAt", type: "datetime", isNullable: true }, { name: "revokeRemark", type: "varchar", length: "500", isNullable: true },
        { name: "createdAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)" }, { name: "updatedAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" }
      ],
      foreignKeys: [{ name: "FK_content_sanction_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }, { name: "FK_content_sanction_user", columnNames: ["userId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "CASCADE" }],
      indices: [{ name: "IDX_content_sanction_user_active", columnNames: ["userId", "status", "endsAt"] }, { name: "IDX_content_sanction_tenant_scope", columnNames: ["tenantId", "scope", "status"] }]
    }));
    if (!(await queryRunner.hasTable("content_appeals"))) await queryRunner.createTable(new Table({
      name: "content_appeals",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "tenantId", type: "int", isNullable: true },
        { name: "userId", type: "int" }, { name: "sanctionId", type: "int", isNullable: true }, { name: "targetType", type: "varchar", length: "40", isNullable: true },
        { name: "targetId", type: "int", isNullable: true }, { name: "reason", type: "varchar", length: "2000" }, { name: "evidenceUrls", type: "json", isNullable: true },
        { name: "status", type: "varchar", length: "20", default: "'pending'" }, { name: "handleRemark", type: "varchar", length: "1000", isNullable: true },
        { name: "handledByAdminId", type: "int", isNullable: true }, { name: "handledAt", type: "datetime", isNullable: true },
        { name: "createdAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)" }, { name: "updatedAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" }
      ],
      foreignKeys: [
        { name: "FK_content_appeal_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" },
        { name: "FK_content_appeal_user", columnNames: ["userId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "CASCADE" },
        { name: "FK_content_appeal_sanction", columnNames: ["sanctionId"], referencedTableName: "content_user_sanctions", referencedColumnNames: ["id"], onDelete: "SET NULL" }
      ],
      indices: [{ name: "IDX_content_appeal_tenant_status", columnNames: ["tenantId", "status", "createdAt"] }, { name: "IDX_content_appeal_user", columnNames: ["userId", "createdAt"] }]
    }));
    if (!(await queryRunner.hasTable("community_content_reports"))) await queryRunner.createTable(new Table({
      name: "community_content_reports",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "tenantId", type: "int", isNullable: true },
        { name: "reporterId", type: "int" }, { name: "targetType", type: "varchar", length: "30" }, { name: "targetId", type: "int" }, { name: "targetUserId", type: "int" },
        { name: "type", type: "varchar", length: "40" }, { name: "description", type: "varchar", length: "1000", isNullable: true },
        { name: "status", type: "varchar", length: "20", default: "'pending'" }, { name: "action", type: "varchar", length: "30", isNullable: true },
        { name: "handleRemark", type: "varchar", length: "1000", isNullable: true }, { name: "handledByAdminId", type: "int", isNullable: true }, { name: "handledAt", type: "datetime", isNullable: true },
        { name: "createdAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)" }, { name: "updatedAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" }
      ],
      foreignKeys: [
        { name: "FK_community_content_report_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" },
        { name: "FK_community_content_report_reporter", columnNames: ["reporterId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "CASCADE" },
        { name: "FK_community_content_report_target_user", columnNames: ["targetUserId"], referencedTableName: "users", referencedColumnNames: ["id"], onDelete: "CASCADE" }
      ],
      indices: [{ name: "IDX_community_content_report_tenant_status", columnNames: ["tenantId", "status", "createdAt"] }, { name: "IDX_community_content_report_target", columnNames: ["targetType", "targetId", "status"] }]
    }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("community_content_reports")) await queryRunner.dropTable("community_content_reports", true);
    if (await queryRunner.hasTable("content_appeals")) await queryRunner.dropTable("content_appeals", true);
    if (await queryRunner.hasTable("content_user_sanctions")) await queryRunner.dropTable("content_user_sanctions", true);
    if (await queryRunner.hasTable("content_keyword_rules")) await queryRunner.dropTable("content_keyword_rules", true);
  }
}
