import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateReleaseReadinessCenter1788653500000 implements MigrationInterface {
  name = "CreateReleaseReadinessCenter1788653500000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(new Table({
      name: "release_readiness_items",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
        { name: "scopeKey", type: "varchar", length: "80" }, { name: "tenantId", type: "int", isNullable: true },
        { name: "itemKey", type: "varchar", length: "64" }, { name: "category", type: "varchar", length: "80" },
        { name: "label", type: "varchar", length: "160" }, { name: "status", type: "varchar", length: "24", default: "'unconfigured'" },
        { name: "owner", type: "varchar", length: "120", isNullable: true }, { name: "reviewer", type: "varchar", length: "120", isNullable: true },
        { name: "blockingReason", type: "varchar", length: "500", isNullable: true }, { name: "evidence", type: "json", isNullable: true },
        { name: "lastCheckedAt", type: "datetime", isNullable: true }, { name: "expiresAt", type: "datetime", isNullable: true },
        { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }, { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
      ], indices: [new TableIndex({ name: "IDX_release_readiness_scope", columnNames: ["scopeKey"] }), new TableIndex({ name: "UQ_release_readiness_item", columnNames: ["scopeKey", "itemKey"], isUnique: true })]
    }), true);
    await queryRunner.createTable(new Table({
      name: "release_acceptance_fixtures",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "scopeKey", type: "varchar", length: "80" },
        { name: "kind", type: "varchar", length: "32" }, { name: "label", type: "varchar", length: "160" }, { name: "maskedIdentifier", type: "varchar", length: "160" },
        { name: "status", type: "varchar", length: "24", default: "'planned'" }, { name: "notes", type: "varchar", length: "500", isNullable: true },
        { name: "evidence", type: "json", isNullable: true }, { name: "updatedBy", type: "varchar", length: "120", isNullable: true },
        { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }, { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
      ], indices: [new TableIndex({ name: "UQ_release_fixture_identity", columnNames: ["scopeKey", "kind", "maskedIdentifier"], isUnique: true })]
    }), true);
    await queryRunner.createTable(new Table({
      name: "release_readiness_events",
      columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "scopeKey", type: "varchar", length: "80" },
        { name: "itemKey", type: "varchar", length: "64" }, { name: "action", type: "varchar", length: "32" }, { name: "fromStatus", type: "varchar", length: "24" },
        { name: "toStatus", type: "varchar", length: "24" }, { name: "actorId", type: "int", isNullable: true }, { name: "actorUsername", type: "varchar", length: "120", isNullable: true },
        { name: "reason", type: "varchar", length: "500", isNullable: true }, { name: "evidence", type: "json", isNullable: true }, { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
      ], indices: [new TableIndex({ name: "IDX_release_events_scope_item", columnNames: ["scopeKey", "itemKey"] })]
    }), true);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("release_readiness_events", true);
    await queryRunner.dropTable("release_acceptance_fixtures", true);
    await queryRunner.dropTable("release_readiness_items", true);
  }
}
