import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from "typeorm";

export class CheckInGovernance1783340000000 implements MigrationInterface {
  name = "CheckInGovernance1783340000000";
  async up(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("check_in_points"))) {
      await queryRunner.createTable(new Table({ name: "check_in_points", columns: [
        { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" }, { name: "tenantId", type: "int", isNullable: true }, { name: "activityId", type: "int" },
        { name: "name", type: "varchar", length: "100" }, { name: "location", type: "varchar", length: "255", isNullable: true }, { name: "enabled", type: "tinyint", default: 1 },
        { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }, { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
      ] }));
      await queryRunner.createForeignKey("check_in_points", new TableForeignKey({ columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
      await queryRunner.createForeignKey("check_in_points", new TableForeignKey({ columnNames: ["activityId"], referencedTableName: "activities", referencedColumnNames: ["id"], onDelete: "CASCADE" }));
      await queryRunner.createIndex("check_in_points", new TableIndex({ name: "UQ_check_in_point_activity_name", columnNames: ["activityId", "name"], isUnique: true }));
    }
    for (const column of [new TableColumn({ name: "pointId", type: "int", isNullable: true }), new TableColumn({ name: "revokedAt", type: "datetime", isNullable: true }), new TableColumn({ name: "revokedById", type: "int", isNullable: true }), new TableColumn({ name: "revokeReason", type: "varchar", length: "500", isNullable: true })]) if (!(await queryRunner.hasColumn("check_ins", column.name))) await queryRunner.addColumn("check_ins", column);
    const table = await queryRunner.getTable("check_ins");
    if (!table?.foreignKeys.some(f => f.columnNames.includes("pointId"))) await queryRunner.createForeignKey("check_ins", new TableForeignKey({ columnNames: ["pointId"], referencedTableName: "check_in_points", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
    if (!table?.foreignKeys.some(f => f.columnNames.includes("revokedById"))) await queryRunner.createForeignKey("check_ins", new TableForeignKey({ columnNames: ["revokedById"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
  }
  async down(queryRunner: QueryRunner) {
    if (await queryRunner.hasTable("check_ins")) {
      const table = await queryRunner.getTable("check_ins");
      for (const foreignKey of table?.foreignKeys.filter(f => f.columnNames.includes("pointId") || f.columnNames.includes("revokedById")) || []) await queryRunner.dropForeignKey("check_ins", foreignKey);
      for (const name of ["revokeReason", "revokedById", "revokedAt", "pointId"]) if (await queryRunner.hasColumn("check_ins", name)) await queryRunner.dropColumn("check_ins", name);
    }
    if (await queryRunner.hasTable("check_in_points")) await queryRunner.dropTable("check_in_points");
  }
}
