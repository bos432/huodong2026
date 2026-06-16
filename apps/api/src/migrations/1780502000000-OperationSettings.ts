import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class OperationSettings1780502000000 implements MigrationInterface {
  name = "OperationSettings1780502000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("operation_settings")) return;
    await queryRunner.createTable(
      new Table({
        name: "operation_settings",
        columns: [
          { name: "id", type: "int", isPrimary: true },
          { name: "offlinePaymentInstructions", type: "text" },
          { name: "customerServiceName", type: "varchar", length: "100", isNullable: true },
          { name: "customerServicePhone", type: "varchar", length: "40", isNullable: true },
          { name: "customerServiceWechat", type: "varchar", length: "80", isNullable: true },
          { name: "refundInstructions", type: "text" },
          { name: "invoiceInstructions", type: "text", isNullable: true },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ]
      })
    );
    await queryRunner.query(
      "INSERT INTO operation_settings (id, offlinePaymentInstructions, customerServiceName, customerServicePhone, customerServiceWechat, refundInstructions, invoiceInstructions) VALUES (1, ?, ?, ?, ?, ?, ?)",
      [
        "请在付款截止前完成线下转账或现场付款，并在备注中填写报名手机号。主办方确认收款后，报名状态会自动更新。",
        "活动运营客服",
        "13800000000",
        "activity_service",
        "如需取消报名或申请退款，请先联系主办方客服。已签到或活动开始后的退款规则以活动报名须知为准。",
        "如需发票，请在付款后联系客服登记抬头、税号和接收邮箱。"
      ]
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("operation_settings")) await queryRunner.dropTable("operation_settings");
  }
}
