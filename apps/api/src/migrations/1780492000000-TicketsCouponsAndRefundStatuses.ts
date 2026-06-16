import { MigrationInterface, QueryRunner } from "typeorm";

export class TicketsCouponsAndRefundStatuses1780492000000 implements MigrationInterface {
  name = "TicketsCouponsAndRefundStatuses1780492000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("ticket_types"))) {
      await queryRunner.query(`
        CREATE TABLE ticket_types (
          id int NOT NULL AUTO_INCREMENT,
          activityId int NULL,
          name varchar(100) NOT NULL,
          price decimal(10,2) NOT NULL,
          capacity int NULL,
          enabled tinyint NOT NULL DEFAULT 1,
          createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (id),
          CONSTRAINT FK_ticket_types_activity FOREIGN KEY (activityId) REFERENCES activities(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
      `);
    }

    if (!(await queryRunner.hasTable("coupons"))) {
      await queryRunner.query(`
        CREATE TABLE coupons (
          id int NOT NULL AUTO_INCREMENT,
          code varchar(64) NOT NULL,
          name varchar(120) NOT NULL,
          discountType varchar(20) NOT NULL DEFAULT 'fixed',
          discountValue decimal(10,2) NOT NULL,
          minAmount decimal(10,2) NOT NULL DEFAULT 0,
          usageLimit int NULL,
          usedCount int NOT NULL DEFAULT 0,
          activityId int NULL,
          enabled tinyint NOT NULL DEFAULT 1,
          startsAt datetime NULL,
          endsAt datetime NULL,
          createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          UNIQUE KEY IDX_coupons_code (code),
          PRIMARY KEY (id),
          CONSTRAINT FK_coupons_activity FOREIGN KEY (activityId) REFERENCES activities(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
      `);
    }

    if (!(await queryRunner.hasColumn("orders", "originalAmount"))) {
      await queryRunner.query("ALTER TABLE orders ADD originalAmount decimal(10,2) NOT NULL DEFAULT 0");
    }
    if (!(await queryRunner.hasColumn("orders", "discountAmount"))) {
      await queryRunner.query("ALTER TABLE orders ADD discountAmount decimal(10,2) NOT NULL DEFAULT 0");
    }
    if (!(await queryRunner.hasColumn("orders", "ticketTypeId"))) {
      await queryRunner.query("ALTER TABLE orders ADD ticketTypeId int NULL");
      await queryRunner.query("ALTER TABLE orders ADD CONSTRAINT FK_orders_ticket_type FOREIGN KEY (ticketTypeId) REFERENCES ticket_types(id)");
    }
    if (!(await queryRunner.hasColumn("orders", "couponId"))) {
      await queryRunner.query("ALTER TABLE orders ADD couponId int NULL");
      await queryRunner.query("ALTER TABLE orders ADD CONSTRAINT FK_orders_coupon FOREIGN KEY (couponId) REFERENCES coupons(id)");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("orders", "couponId")) {
      await queryRunner.query("ALTER TABLE orders DROP FOREIGN KEY FK_orders_coupon");
      await queryRunner.query("ALTER TABLE orders DROP COLUMN couponId");
    }
    if (await queryRunner.hasColumn("orders", "ticketTypeId")) {
      await queryRunner.query("ALTER TABLE orders DROP FOREIGN KEY FK_orders_ticket_type");
      await queryRunner.query("ALTER TABLE orders DROP COLUMN ticketTypeId");
    }
    if (await queryRunner.hasColumn("orders", "discountAmount")) await queryRunner.query("ALTER TABLE orders DROP COLUMN discountAmount");
    if (await queryRunner.hasColumn("orders", "originalAmount")) await queryRunner.query("ALTER TABLE orders DROP COLUMN originalAmount");
    if (await queryRunner.hasTable("coupons")) await queryRunner.query("DROP TABLE coupons");
    if (await queryRunner.hasTable("ticket_types")) await queryRunner.query("DROP TABLE ticket_types");
  }
}
