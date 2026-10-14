import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class SlowExperienceRecords1788653900000 implements MigrationInterface {
  name = "SlowExperienceRecords1788653900000";
  async up(runner: QueryRunner) {
    if (!(await runner.hasTable("slow_experience_records"))) await runner.createTable(new Table({ name: "slow_experience_records", columns: [
      { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
      { name: "ownerUserId", type: "int" }, { name: "tenantId", type: "int", isNullable: true },
      { name: "tenantScopeKey", type: "varchar", length: "80" }, { name: "businessKey", type: "varchar", length: "120" },
      ...["discovery", "lightNote", "feeling"].map(name => ({ name, type: "text" })),
      { name: "visibility", type: "varchar", length: "20" }, { name: "moderationStatus", type: "varchar", length: "24" },
      { name: "revision", type: "int", default: 0 }, { name: "photoReference", type: "varchar", length: "255", isNullable: true },
      { name: "photoMime", type: "varchar", length: "80", isNullable: true }, { name: "photoSize", type: "int", isNullable: true },
      { name: "reviewRemark", type: "text", isNullable: true }, { name: "reviewedBy", type: "int", isNullable: true },
      ...["reviewedAt", "deletedAt"].map(name => ({ name, type: "datetime", isNullable: true })),
      { name: "createdAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)" },
      { name: "updatedAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" }
    ], indices: [new TableIndex({ name: "UQ_slow_record_attempt", columnNames: ["ownerUserId", "tenantScopeKey", "businessKey"], isUnique: true }), new TableIndex({ name: "IDX_slow_record_public", columnNames: ["tenantScopeKey", "visibility", "moderationStatus", "deletedAt", "id"] })] }));
    if (!(await runner.hasTable("slow_experience_events"))) await runner.createTable(new Table({ name: "slow_experience_events", columns: [
      { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
      { name: "recordId", type: "int" }, { name: "actorId", type: "int" }, { name: "actorType", type: "varchar", length: "16" },
      { name: "action", type: "varchar", length: "24" }, { name: "previousStatus", type: "varchar", length: "24", isNullable: true },
      { name: "nextStatus", type: "varchar", length: "24" }, { name: "revision", type: "int" },
      { name: "createdAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)" }
    ], indices: [new TableIndex({ name: "IDX_slow_record_events", columnNames: ["recordId", "id"] })] }));
  }
  async down(runner: QueryRunner) {
    for (const name of ["slow_experience_events", "slow_experience_records"]) if (await runner.hasTable(name)) await runner.dropTable(name);
  }
}
