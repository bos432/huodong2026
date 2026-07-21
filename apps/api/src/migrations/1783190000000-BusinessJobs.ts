import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class BusinessJobs1783190000000 implements MigrationInterface {
  name = "BusinessJobs1783190000000";
  async up(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable("business_jobs")) return;
    await queryRunner.createTable(new Table({ name: "business_jobs", columns: [
      { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
      { name: "tenantId", type: "int", default: 0 }, { name: "type", type: "varchar", length: "80" }, { name: "idempotencyKey", type: "varchar", length: "120" },
      { name: "status", type: "varchar", length: "20", default: "'pending'" }, { name: "payload", type: "json" }, { name: "result", type: "json", isNullable: true },
      { name: "attemptCount", type: "int", default: 0 }, { name: "maxAttempts", type: "int", default: 5 }, { name: "nextAttemptAt", type: "datetime" },
      { name: "lockedUntil", type: "datetime", isNullable: true }, { name: "lockedBy", type: "varchar", length: "80", isNullable: true },
      { name: "lastError", type: "varchar", length: "1000", isNullable: true }, { name: "requestId", type: "varchar", length: "80", isNullable: true },
      { name: "completedAt", type: "datetime", isNullable: true }, { name: "deadLetteredAt", type: "datetime", isNullable: true },
      { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }, { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
    ] }));
    await queryRunner.createIndex("business_jobs", new TableIndex({ name: "IDX_business_jobs_idempotency", columnNames: ["tenantId", "type", "idempotencyKey"], isUnique: true }));
    await queryRunner.createIndex("business_jobs", new TableIndex({ name: "IDX_business_jobs_due", columnNames: ["status", "nextAttemptAt", "lockedUntil"] }));
    await queryRunner.createIndex("business_jobs", new TableIndex({ name: "IDX_business_jobs_tenant_created", columnNames: ["tenantId", "createdAt"] }));
  }
  async down(queryRunner: QueryRunner) { if (await queryRunner.hasTable("business_jobs")) await queryRunner.dropTable("business_jobs", true); }
}
