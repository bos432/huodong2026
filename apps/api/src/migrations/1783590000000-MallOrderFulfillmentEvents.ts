import { MigrationInterface, QueryRunner } from "typeorm";

export class MallOrderFulfillmentEvents1783590000000 implements MigrationInterface {
  name = "MallOrderFulfillmentEvents1783590000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_order_events")) return;
    await queryRunner.query("CREATE TABLE `mall_order_events` (`id` int NOT NULL AUTO_INCREMENT, `tenantId` int NOT NULL, `merchantId` int NULL, `orderId` int NOT NULL, `eventKey` varchar(80) NOT NULL, `eventType` varchar(40) NOT NULL, `fromStatus` varchar(32) NULL, `toStatus` varchar(32) NOT NULL, `source` varchar(32) NOT NULL, `operator` varchar(80) NULL, `remark` varchar(255) NULL, `detail` json NULL, `occurredAt` datetime NOT NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX `UQ_mall_order_events_order_key` (`orderId`,`eventKey`), INDEX `IDX_mall_order_events_tenant_order_time` (`tenantId`,`orderId`,`occurredAt`), PRIMARY KEY (`id`), CONSTRAINT `FK_mall_order_events_tenant` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE, CONSTRAINT `FK_mall_order_events_merchant` FOREIGN KEY (`merchantId`) REFERENCES `mall_merchants`(`id`) ON DELETE SET NULL, CONSTRAINT `FK_mall_order_events_order` FOREIGN KEY (`orderId`) REFERENCES `mall_orders`(`id`) ON DELETE CASCADE) ENGINE=InnoDB");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_order_events")) await queryRunner.query("DROP TABLE `mall_order_events`");
  }
}
