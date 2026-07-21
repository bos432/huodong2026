import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class CheckInPerformanceIndexes1783350000000 implements MigrationInterface {
  name = "CheckInPerformanceIndexes1783350000000";
  async up(queryRunner: QueryRunner) {
    const registrations = await queryRunner.getTable("registrations");
    if (!registrations?.indices.some(index => index.name === "IDX_registrations_activity_status_created")) await queryRunner.createIndex("registrations", new TableIndex({ name: "IDX_registrations_activity_status_created", columnNames: ["activityId", "status", "createdAt"] }));
    const checkIns = await queryRunner.getTable("check_ins");
    if (!checkIns?.indices.some(index => index.name === "IDX_check_ins_registration_revoked_created")) await queryRunner.createIndex("check_ins", new TableIndex({ name: "IDX_check_ins_registration_revoked_created", columnNames: ["registrationId", "revokedAt", "createdAt"] }));
  }
  async down(queryRunner: QueryRunner) {
    for (const [table, index] of [["check_ins", "IDX_check_ins_registration_revoked_created"], ["registrations", "IDX_registrations_activity_status_created"]] as const) {
      const current = await queryRunner.getTable(table); if (current?.indices.some(item => item.name === index)) await queryRunner.dropIndex(table, index);
    }
  }
}
