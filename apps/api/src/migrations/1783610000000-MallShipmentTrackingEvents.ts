import { MigrationInterface, QueryRunner } from "typeorm";

export class MallShipmentTrackingEvents1783610000000 implements MigrationInterface {
  name = "MallShipmentTrackingEvents1783610000000";
  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_shipment_tracking_events")) return;
    await queryRunner.query("CREATE TABLE `mall_shipment_tracking_events` (`id` int NOT NULL AUTO_INCREMENT, `tenantId` int NOT NULL, `orderId` int NOT NULL, `shipmentId` int NOT NULL, `eventKey` varchar(80) NOT NULL, `status` varchar(32) NOT NULL, `description` varchar(255) NOT NULL, `location` varchar(120) NULL, `source` varchar(32) NOT NULL, `rawPayload` json NULL, `eventAt` datetime NOT NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX `UQ_mall_shipment_tracking_event_key` (`shipmentId`,`eventKey`), INDEX `IDX_mall_shipment_tracking_order_time` (`orderId`,`eventAt`), PRIMARY KEY (`id`), CONSTRAINT `FK_mall_shipment_tracking_tenant` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE, CONSTRAINT `FK_mall_shipment_tracking_order` FOREIGN KEY (`orderId`) REFERENCES `mall_orders`(`id`) ON DELETE CASCADE, CONSTRAINT `FK_mall_shipment_tracking_shipment` FOREIGN KEY (`shipmentId`) REFERENCES `mall_shipments`(`id`) ON DELETE CASCADE) ENGINE=InnoDB");
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_shipment_tracking_events")) await queryRunner.query("DROP TABLE `mall_shipment_tracking_events`");
  }
}
