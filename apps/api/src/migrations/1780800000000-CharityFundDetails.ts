import { TableColumn, TableIndex, MigrationInterface, QueryRunner } from "typeorm";

export class CharityFundDetails1780800000000 implements MigrationInterface {
  name = "CharityFundDetails1780800000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await this.addColumnIfMissing(queryRunner, "charity_fund_settings", new TableColumn({ name: "retainOnActivityRefund", type: "tinyint", default: 1 }));
    await this.addColumnIfMissing(queryRunner, "charity_fund_settings", new TableColumn({ name: "ambassadorThreshold", type: "decimal", precision: 10, scale: 2, default: 100 }));
    await this.addColumnIfMissing(queryRunner, "charity_fund_settings", new TableColumn({ name: "ambassadorTitle", type: "varchar", length: "80", default: "'公益大使'" }));
    await this.addColumnIfMissing(queryRunner, "charity_fund_transactions", new TableColumn({ name: "sourceType", type: "varchar", length: "32", default: "'activity_order'" }));
    await this.addColumnIfMissing(queryRunner, "charity_fund_transactions", new TableColumn({ name: "sourceTitle", type: "varchar", length: "180", isNullable: true }));
    await this.addColumnIfMissing(queryRunner, "charity_fund_transactions", new TableColumn({ name: "retainedOnRefund", type: "tinyint", default: 0 }));
    await this.addColumnIfMissing(queryRunner, "charity_fund_transactions", new TableColumn({ name: "certificateEligible", type: "tinyint", default: 1 }));
    if (!(await this.hasIndex(queryRunner, "charity_fund_transactions", "IDX_charity_tx_source"))) {
      await queryRunner.createIndex("charity_fund_transactions", new TableIndex({ name: "IDX_charity_tx_source", columnNames: ["sourceType"] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await this.hasIndex(queryRunner, "charity_fund_transactions", "IDX_charity_tx_source")) await queryRunner.dropIndex("charity_fund_transactions", "IDX_charity_tx_source");
    for (const column of ["certificateEligible", "retainedOnRefund", "sourceTitle", "sourceType"]) {
      if (await queryRunner.hasColumn("charity_fund_transactions", column)) await queryRunner.dropColumn("charity_fund_transactions", column);
    }
    for (const column of ["ambassadorTitle", "ambassadorThreshold", "retainOnActivityRefund"]) {
      if (await queryRunner.hasColumn("charity_fund_settings", column)) await queryRunner.dropColumn("charity_fund_settings", column);
    }
  }

  private async addColumnIfMissing(queryRunner: QueryRunner, tableName: string, column: TableColumn) {
    if (!(await queryRunner.hasColumn(tableName, column.name))) await queryRunner.addColumn(tableName, column);
  }

  private async hasIndex(queryRunner: QueryRunner, tableName: string, indexName: string) {
    const table = await queryRunner.getTable(tableName);
    return Boolean(table?.indices.some((index) => index.name === indexName));
  }
}
