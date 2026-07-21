import { MigrationInterface, QueryRunner, Table, TableColumn } from "typeorm";

export class CredentialTemplateCustomization1783990000000 implements MigrationInterface {
  name = "CredentialTemplateCustomization1783990000000";

  async up(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("credential_templates"))) await queryRunner.createTable(new Table({
      name: "credential_templates",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
        { name: "scopeKey", type: "varchar", length: "40" },
        { name: "templateKey", type: "varchar", length: "40" },
        { name: "tenantId", type: "int", isNullable: true },
        { name: "draftConfig", type: "json" },
        { name: "publishedConfig", type: "json", isNullable: true },
        { name: "publishedVersion", type: "int", default: 0 },
        { name: "updatedById", type: "int", isNullable: true },
        { name: "publishedById", type: "int", isNullable: true },
        { name: "publishedAt", type: "datetime", isNullable: true },
        { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
        { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
      ],
      indices: [{ name: "UQ_credential_template_scope_key", columnNames: ["scopeKey", "templateKey"], isUnique: true }],
      foreignKeys: [
        { name: "FK_credential_template_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" },
        { name: "FK_credential_template_updated_by", columnNames: ["updatedById"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" },
        { name: "FK_credential_template_published_by", columnNames: ["publishedById"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }
      ]
    }));
    if (!(await queryRunner.hasTable("credential_template_versions"))) await queryRunner.createTable(new Table({
      name: "credential_template_versions",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
        { name: "templateId", type: "int" },
        { name: "version", type: "int" },
        { name: "config", type: "json" },
        { name: "note", type: "varchar", length: "300", isNullable: true },
        { name: "publishedById", type: "int", isNullable: true },
        { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
      ],
      indices: [{ name: "UQ_credential_template_version", columnNames: ["templateId", "version"], isUnique: true }],
      foreignKeys: [
        { name: "FK_credential_template_version_template", columnNames: ["templateId"], referencedTableName: "credential_templates", referencedColumnNames: ["id"], onDelete: "CASCADE" },
        { name: "FK_credential_template_version_admin", columnNames: ["publishedById"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }
      ]
    }));
    for (const [table, columns] of [
      ["certificates", [new TableColumn({ name: "templateVersion", type: "int", default: 0 }), new TableColumn({ name: "templateSnapshot", type: "json", isNullable: true })]],
      ["charity_fund_transactions", [new TableColumn({ name: "certificateTemplateVersion", type: "int", default: 0 }), new TableColumn({ name: "certificateTemplateSnapshot", type: "json", isNullable: true })]]
    ] as const) {
      for (const column of columns) if (!(await queryRunner.hasColumn(table, column.name))) await queryRunner.addColumn(table, column);
    }
  }

  async down(queryRunner: QueryRunner) {
    for (const [table, columns] of [["charity_fund_transactions", ["certificateTemplateSnapshot", "certificateTemplateVersion"]], ["certificates", ["templateSnapshot", "templateVersion"]]] as const) {
      for (const column of columns) if (await queryRunner.hasColumn(table, column)) await queryRunner.dropColumn(table, column);
    }
    if (await queryRunner.hasTable("credential_template_versions")) await queryRunner.dropTable("credential_template_versions", true);
    if (await queryRunner.hasTable("credential_templates")) await queryRunner.dropTable("credential_templates", true);
  }
}
