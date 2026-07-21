import { MigrationInterface, QueryRunner } from "typeorm";

const LEGACY_TYPES = ["text", "single_choice", "multiple_choice", "phone", "id_card", "remark"];
const FIELD_TYPES = [...LEGACY_TYPES, "email", "number", "date", "date_time", "region", "address", "attachment"];

function enumSql(values: string[]) {
  return values.map((value) => `'${value}'`).join(",");
}

export class ActivityFieldTypes1783810000000 implements MigrationInterface {
  name = "ActivityFieldTypes1783810000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("activity_fields"))) return;
    await queryRunner.query(`ALTER TABLE \`activity_fields\` MODIFY \`type\` enum(${enumSql(FIELD_TYPES)}) NOT NULL`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("activity_fields"))) return;
    const [row] = await queryRunner.query(`SELECT COUNT(*) AS count FROM \`activity_fields\` WHERE \`type\` NOT IN (${enumSql(LEGACY_TYPES)})`);
    if (Number(row?.count || 0) > 0) throw new Error("Cannot restore the legacy activity field enum while newer field types are in use");
    await queryRunner.query(`ALTER TABLE \`activity_fields\` MODIFY \`type\` enum(${enumSql(LEGACY_TYPES)}) NOT NULL`);
  }
}
