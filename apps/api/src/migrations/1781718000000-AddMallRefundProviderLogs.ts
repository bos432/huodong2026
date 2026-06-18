import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddMallRefundProviderLogs1781718000000 implements MigrationInterface {
  name = "AddMallRefundProviderLogs1781718000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const refundColumns = await queryRunner.getTable("mall_refunds");
    const addColumn = async (column: TableColumn) => {
      if (!refundColumns?.findColumnByName(column.name)) await queryRunner.addColumn("mall_refunds", column);
    };

    await addColumn(new TableColumn({ name: "completedAt", type: "datetime", isNullable: true }));
    await addColumn(new TableColumn({ name: "providerRefundNo", type: "varchar", length: "128", isNullable: true }));
    await addColumn(new TableColumn({ name: "providerRefundStatus", type: "varchar", length: "40", isNullable: true }));
    await addColumn(new TableColumn({ name: "providerRefundSyncedAt", type: "datetime", isNullable: true }));
    await addColumn(new TableColumn({ name: "providerRefundPayload", type: "json", isNullable: true }));
    await addColumn(new TableColumn({ name: "providerRefundFailureReason", type: "varchar", length: "255", isNullable: true }));
    await addColumn(new TableColumn({ name: "providerRefundRetryCount", type: "int", default: 0 }));
    await addColumn(new TableColumn({ name: "providerRefundNextQueryAt", type: "datetime", isNullable: true }));

    if (!(await queryRunner.hasTable("mall_refund_logs"))) {
      await queryRunner.query(`
        CREATE TABLE mall_refund_logs (
          id INT NOT NULL AUTO_INCREMENT,
          refundId INT NOT NULL,
          orderId INT NULL,
          tenantId INT NULL,
          provider VARCHAR(40) NOT NULL,
          action VARCHAR(40) NOT NULL,
          status VARCHAR(40) NOT NULL,
          providerRefundNo VARCHAR(128) NULL,
          amount DECIMAL(10,2) NOT NULL,
          message VARCHAR(255) NULL,
          operator VARCHAR(80) NULL,
          payload JSON NULL,
          createdAt DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          INDEX IDX_mall_refund_logs_refundId (refundId),
          INDEX IDX_mall_refund_logs_orderId (orderId),
          INDEX IDX_mall_refund_logs_tenantId (tenantId),
          INDEX IDX_mall_refund_logs_providerRefundNo (providerRefundNo),
          PRIMARY KEY (id),
          CONSTRAINT FK_mall_refund_logs_refund FOREIGN KEY (refundId) REFERENCES mall_refunds(id) ON DELETE CASCADE,
          CONSTRAINT FK_mall_refund_logs_order FOREIGN KEY (orderId) REFERENCES mall_orders(id) ON DELETE SET NULL,
          CONSTRAINT FK_mall_refund_logs_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id) ON DELETE SET NULL
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_refund_logs")) await queryRunner.query("DROP TABLE mall_refund_logs");
    const table = await queryRunner.getTable("mall_refunds");
    for (const name of ["providerRefundNextQueryAt", "providerRefundRetryCount", "providerRefundFailureReason", "providerRefundPayload", "providerRefundSyncedAt", "providerRefundStatus", "providerRefundNo", "completedAt"]) {
      if (table?.findColumnByName(name)) await queryRunner.dropColumn("mall_refunds", name);
    }
  }
}
