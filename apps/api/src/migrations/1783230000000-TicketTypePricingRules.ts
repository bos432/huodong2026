import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class TicketTypePricingRules1783230000000 implements MigrationInterface {
  name = "TicketTypePricingRules1783230000000";
  async up(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("ticket_types"))) return;
    const columns = [
      new TableColumn({ name: "perUserLimit", type: "int", default: 1 }), new TableColumn({ name: "saleStartsAt", type: "datetime", isNullable: true }), new TableColumn({ name: "saleEndsAt", type: "datetime", isNullable: true }),
      new TableColumn({ name: "earlyBirdPrice", type: "decimal", precision: 10, scale: 2, isNullable: true }), new TableColumn({ name: "earlyBirdEndsAt", type: "datetime", isNullable: true }),
      new TableColumn({ name: "memberPrice", type: "decimal", precision: 10, scale: 2, isNullable: true }), new TableColumn({ name: "tierPrices", type: "json", isNullable: true })
    ];
    for (const column of columns) if (!(await queryRunner.hasColumn("ticket_types", column.name))) await queryRunner.addColumn("ticket_types", column);
  }
  async down(queryRunner: QueryRunner) {
    if (!(await queryRunner.hasTable("ticket_types"))) return;
    for (const name of ["tierPrices", "memberPrice", "earlyBirdEndsAt", "earlyBirdPrice", "saleEndsAt", "saleStartsAt", "perUserLimit"]) if (await queryRunner.hasColumn("ticket_types", name)) await queryRunner.dropColumn("ticket_types", name);
  }
}
