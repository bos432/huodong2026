import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class VolunteerCredentialIdempotency1783760000000 implements MigrationInterface {
  name = "VolunteerCredentialIdempotency1783760000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const tableName of ["volunteer_badge_awards", "volunteer_service_proofs"]) {
      if (!(await queryRunner.hasTable(tableName))) continue;
      if (!(await queryRunner.hasColumn(tableName, "revokeBusinessKey"))) {
        await queryRunner.addColumn(tableName, new TableColumn({ name: "revokeBusinessKey", type: "varchar", length: "160", isNullable: true }));
      }
      const table = await queryRunner.getTable(tableName);
      const indexName = tableName === "volunteer_badge_awards" ? "UQ_volunteer_badge_award_revoke_business_key" : "UQ_volunteer_proof_revoke_business_key";
      if (table && !table.indices.some((index) => index.name === indexName)) await queryRunner.createIndex(tableName, new TableIndex({ name: indexName, columnNames: ["revokeBusinessKey"], isUnique: true }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const tableName of ["volunteer_badge_awards", "volunteer_service_proofs"]) {
      if (!(await queryRunner.hasTable(tableName))) continue;
      const table = await queryRunner.getTable(tableName);
      const indexName = tableName === "volunteer_badge_awards" ? "UQ_volunteer_badge_award_revoke_business_key" : "UQ_volunteer_proof_revoke_business_key";
      if (table?.indices.some((index) => index.name === indexName)) await queryRunner.dropIndex(tableName, indexName);
      if (await queryRunner.hasColumn(tableName, "revokeBusinessKey")) await queryRunner.dropColumn(tableName, "revokeBusinessKey");
    }
  }
}
