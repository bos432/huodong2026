import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class MallAfterSaleFoundation1783620000000 implements MigrationInterface {
  name = "MallAfterSaleFoundation1783620000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const refundColumns = [
      new TableColumn({ name: "businessKey", type: "varchar", length: "80", isNullable: true }),
      new TableColumn({ name: "returnAddressSnapshot", type: "json", isNullable: true }),
      new TableColumn({ name: "returnExpressCompany", type: "varchar", length: "80", isNullable: true }),
      new TableColumn({ name: "returnExpressNo", type: "varchar", length: "100", isNullable: true }),
      new TableColumn({ name: "returnRemark", type: "varchar", length: "255", isNullable: true }),
      new TableColumn({ name: "returnedAt", type: "datetime", isNullable: true }),
      new TableColumn({ name: "merchantReceivedAt", type: "datetime", isNullable: true }),
      new TableColumn({ name: "exchangeShipmentId", type: "int", isNullable: true }),
      new TableColumn({ name: "responsibility", type: "varchar", length: "24", default: "'undetermined'" }),
      new TableColumn({ name: "platformInterventionRequested", type: "boolean", default: false }),
      new TableColumn({ name: "interventionBy", type: "varchar", length: "80", isNullable: true }),
      new TableColumn({ name: "interventionAt", type: "datetime", isNullable: true }),
      new TableColumn({ name: "responseDeadlineAt", type: "datetime", isNullable: true })
    ];
    if (await queryRunner.hasTable("mall_refunds")) {
      for (const column of refundColumns) if (!(await queryRunner.hasColumn("mall_refunds", column.name))) await queryRunner.addColumn("mall_refunds", column);
      await queryRunner.query("CREATE UNIQUE INDEX `UQ_mall_refunds_order_business_key` ON `mall_refunds` (`orderId`,`businessKey`)").catch(() => undefined);
    }
    if (await queryRunner.hasTable("mall_shipments")) {
      if (!(await queryRunner.hasColumn("mall_shipments", "refundId"))) await queryRunner.addColumn("mall_shipments", new TableColumn({ name: "refundId", type: "int", isNullable: true }));
      if (!(await queryRunner.hasColumn("mall_shipments", "shipmentType"))) await queryRunner.addColumn("mall_shipments", new TableColumn({ name: "shipmentType", type: "varchar", length: "24", default: "'order'" }));
      await queryRunner.query("ALTER TABLE `mall_shipments` ADD CONSTRAINT `FK_mall_shipments_refund` FOREIGN KEY (`refundId`) REFERENCES `mall_refunds`(`id`) ON DELETE SET NULL").catch(() => undefined);
      await queryRunner.query("CREATE INDEX `IDX_mall_shipments_refund_type` ON `mall_shipments` (`refundId`,`shipmentType`)").catch(() => undefined);
    }
    if (await queryRunner.hasTable("mall_commissions")) {
      if (!(await queryRunner.hasColumn("mall_commissions", "refundedOrderAmount"))) await queryRunner.addColumn("mall_commissions", new TableColumn({ name: "refundedOrderAmount", type: "decimal", precision: 10, scale: 2, default: 0 }));
      if (!(await queryRunner.hasColumn("mall_commissions", "clawbackAmount"))) await queryRunner.addColumn("mall_commissions", new TableColumn({ name: "clawbackAmount", type: "decimal", precision: 10, scale: 2, default: 0 }));
      if (!(await queryRunner.hasColumn("mall_commissions", "clawbackStatus"))) await queryRunner.addColumn("mall_commissions", new TableColumn({ name: "clawbackStatus", type: "varchar", length: "24", default: "'none'" }));
    }
    if (!(await queryRunner.hasTable("mall_refund_items"))) {
      await queryRunner.query("CREATE TABLE `mall_refund_items` (`id` int NOT NULL AUTO_INCREMENT, `tenantId` int NOT NULL, `refundId` int NOT NULL, `orderId` int NOT NULL, `orderItemId` int NOT NULL, `requestedQuantity` int NOT NULL, `approvedQuantity` int NOT NULL DEFAULT 0, `receivedQuantity` int NOT NULL DEFAULT 0, `stockRestoredQuantity` int NOT NULL DEFAULT 0, `refundableAmountFen` bigint NOT NULL DEFAULT 0, `refundedAmountFen` bigint NOT NULL DEFAULT 0, `itemSnapshot` json NOT NULL, UNIQUE INDEX `UQ_mall_refund_items_refund_order_item` (`refundId`,`orderItemId`), INDEX `IDX_mall_refund_items_order_item` (`orderId`,`orderItemId`), PRIMARY KEY (`id`), CONSTRAINT `FK_mall_refund_items_tenant` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE, CONSTRAINT `FK_mall_refund_items_refund` FOREIGN KEY (`refundId`) REFERENCES `mall_refunds`(`id`) ON DELETE CASCADE, CONSTRAINT `FK_mall_refund_items_order` FOREIGN KEY (`orderId`) REFERENCES `mall_orders`(`id`) ON DELETE CASCADE, CONSTRAINT `FK_mall_refund_items_order_item` FOREIGN KEY (`orderItemId`) REFERENCES `mall_order_items`(`id`) ON DELETE CASCADE) ENGINE=InnoDB");
    }
    if (!(await queryRunner.hasTable("mall_refund_messages"))) {
      await queryRunner.query("CREATE TABLE `mall_refund_messages` (`id` int NOT NULL AUTO_INCREMENT, `tenantId` int NOT NULL, `refundId` int NOT NULL, `actorType` varchar(24) NOT NULL, `actorName` varchar(80) NULL, `messageType` varchar(32) NOT NULL DEFAULT 'message', `content` text NOT NULL, `images` json NULL, `detail` json NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX `IDX_mall_refund_messages_refund_time` (`refundId`,`createdAt`), PRIMARY KEY (`id`), CONSTRAINT `FK_mall_refund_messages_tenant` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE, CONSTRAINT `FK_mall_refund_messages_refund` FOREIGN KEY (`refundId`) REFERENCES `mall_refunds`(`id`) ON DELETE CASCADE) ENGINE=InnoDB");
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_refund_messages")) await queryRunner.query("DROP TABLE `mall_refund_messages`");
    if (await queryRunner.hasTable("mall_refund_items")) await queryRunner.query("DROP TABLE `mall_refund_items`");
    if (await queryRunner.hasTable("mall_shipments")) {
      await queryRunner.query("ALTER TABLE `mall_shipments` DROP FOREIGN KEY `FK_mall_shipments_refund`").catch(() => undefined);
      if (await queryRunner.hasColumn("mall_shipments", "shipmentType")) await queryRunner.dropColumn("mall_shipments", "shipmentType");
      if (await queryRunner.hasColumn("mall_shipments", "refundId")) await queryRunner.dropColumn("mall_shipments", "refundId");
    }
    if (await queryRunner.hasTable("mall_refunds")) {
      await queryRunner.query("DROP INDEX `UQ_mall_refunds_order_business_key` ON `mall_refunds`").catch(() => undefined);
      for (const name of ["responseDeadlineAt", "interventionAt", "interventionBy", "platformInterventionRequested", "responsibility", "exchangeShipmentId", "merchantReceivedAt", "returnedAt", "returnRemark", "returnExpressNo", "returnExpressCompany", "returnAddressSnapshot", "businessKey"]) {
        if (await queryRunner.hasColumn("mall_refunds", name)) await queryRunner.dropColumn("mall_refunds", name);
      }
    }
    if (await queryRunner.hasTable("mall_commissions")) {
      for (const name of ["clawbackStatus", "clawbackAmount", "refundedOrderAmount"]) if (await queryRunner.hasColumn("mall_commissions", name)) await queryRunner.dropColumn("mall_commissions", name);
    }
  }
}
