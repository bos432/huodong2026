import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class RegistrationFormSnapshots1783240000000 implements MigrationInterface {
  name = "RegistrationFormSnapshots1783240000000";
  async up(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable("activities")) {
      if (!(await queryRunner.hasColumn("activities", "formSchemaVersion"))) await queryRunner.addColumn("activities", new TableColumn({ name: "formSchemaVersion", type: "int", default: 1 }));
      if (!(await queryRunner.hasColumn("activities", "eligibilityRules"))) await queryRunner.addColumn("activities", new TableColumn({ name: "eligibilityRules", type: "json", isNullable: true }));
    }
    if (await queryRunner.hasTable("registrations")) {
      const columns = [new TableColumn({ name: "formSchemaVersion", type: "int", default: 1 }), new TableColumn({ name: "formSnapshot", type: "json", isNullable: true }), new TableColumn({ name: "companions", type: "json", isNullable: true }), new TableColumn({ name: "privacyConsentAt", type: "datetime", isNullable: true })];
      for (const column of columns) if (!(await queryRunner.hasColumn("registrations", column.name))) await queryRunner.addColumn("registrations", column);
    }
  }
  async down(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable("registrations")) for (const name of ["privacyConsentAt", "companions", "formSnapshot", "formSchemaVersion"]) if (await queryRunner.hasColumn("registrations", name)) await queryRunner.dropColumn("registrations", name);
    if (await queryRunner.hasTable("activities")) for (const name of ["eligibilityRules", "formSchemaVersion"]) if (await queryRunner.hasColumn("activities", name)) await queryRunner.dropColumn("activities", name);
  }
}
