import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class MallReviewGovernance1783630000000 implements MigrationInterface {
  name = "MallReviewGovernance1783630000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_reviews")) {
      const columns = [
        new TableColumn({ name: "appendContent", type: "varchar", length: "500", isNullable: true }),
        new TableColumn({ name: "appendImages", type: "json", isNullable: true }),
        new TableColumn({ name: "appendedAt", type: "datetime", isNullable: true }),
        new TableColumn({ name: "appendStatus", type: "varchar", length: "24", isNullable: true }),
        new TableColumn({ name: "appendReviewRemark", type: "varchar", length: "255", isNullable: true }),
        new TableColumn({ name: "appendReviewedBy", type: "varchar", length: "80", isNullable: true }),
        new TableColumn({ name: "appendReviewedAt", type: "datetime", isNullable: true }),
        new TableColumn({ name: "reportCount", type: "int", default: 0 }),
        new TableColumn({ name: "hiddenAt", type: "datetime", isNullable: true }),
        new TableColumn({ name: "hiddenReason", type: "varchar", length: "255", isNullable: true })
      ];
      for (const column of columns) if (!(await queryRunner.hasColumn("mall_reviews", column.name))) await queryRunner.addColumn("mall_reviews", column);
      await queryRunner.query("UPDATE `mall_reviews` SET `appendStatus` = 'approved', `appendReviewedBy` = COALESCE(`reviewedBy`, 'migration'), `appendReviewedAt` = COALESCE(`appendedAt`, `updatedAt`) WHERE `appendContent` IS NOT NULL AND `appendStatus` IS NULL");
      await queryRunner.query("CREATE TABLE IF NOT EXISTS `mall_review_duplicate_archives` (`originalReviewId` int NOT NULL, `canonicalReviewId` int NOT NULL, `tenantId` int NOT NULL, `orderItemId` int NOT NULL, `userId` int NOT NULL, `snapshot` json NOT NULL, `archivedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (`originalReviewId`), INDEX `IDX_mall_review_duplicate_canonical` (`canonicalReviewId`)) ENGINE=InnoDB");
      await queryRunner.query(`
        INSERT IGNORE INTO \`mall_review_duplicate_archives\` (\`originalReviewId\`, \`canonicalReviewId\`, \`tenantId\`, \`orderItemId\`, \`userId\`, \`snapshot\`)
        SELECT duplicate.id, canonical.canonicalReviewId, duplicate.tenantId, duplicate.orderItemId, duplicate.userId,
          JSON_OBJECT(
            'id', duplicate.id, 'merchantId', duplicate.merchantId, 'orderId', duplicate.orderId,
            'productId', duplicate.productId, 'skuId', duplicate.skuId, 'rating', duplicate.rating,
            'content', duplicate.content, 'images', duplicate.images, 'status', duplicate.status,
            'reviewRemark', duplicate.reviewRemark, 'merchantReply', duplicate.merchantReply,
            'repliedBy', duplicate.repliedBy, 'repliedAt', duplicate.repliedAt,
            'reviewedBy', duplicate.reviewedBy, 'reviewedAt', duplicate.reviewedAt,
            'appendContent', duplicate.appendContent, 'appendImages', duplicate.appendImages,
            'appendedAt', duplicate.appendedAt, 'appendStatus', duplicate.appendStatus,
            'createdAt', duplicate.createdAt, 'updatedAt', duplicate.updatedAt
          )
        FROM \`mall_reviews\` duplicate
        JOIN (
          SELECT orderItemId, userId, MIN(id) AS canonicalReviewId
          FROM \`mall_reviews\`
          GROUP BY orderItemId, userId
          HAVING COUNT(*) > 1
        ) canonical ON canonical.orderItemId = duplicate.orderItemId AND canonical.userId = duplicate.userId
        WHERE duplicate.id <> canonical.canonicalReviewId
      `);
      await queryRunner.query(`
        DELETE duplicate FROM \`mall_reviews\` duplicate
        JOIN (
          SELECT orderItemId, userId, MIN(id) AS canonicalReviewId
          FROM \`mall_reviews\`
          GROUP BY orderItemId, userId
          HAVING COUNT(*) > 1
        ) canonical ON canonical.orderItemId = duplicate.orderItemId AND canonical.userId = duplicate.userId
        WHERE duplicate.id <> canonical.canonicalReviewId
      `);
      const table = await queryRunner.getTable("mall_reviews");
      const hasUniqueReviewIndex = table?.indices.some((index) => index.isUnique && index.columnNames.length === 2 && index.columnNames.includes("orderItemId") && index.columnNames.includes("userId"));
      if (!hasUniqueReviewIndex) await queryRunner.query("CREATE UNIQUE INDEX `UQ_mall_reviews_order_item_user` ON `mall_reviews` (`orderItemId`,`userId`)");
    }
    if (!(await queryRunner.hasTable("mall_review_reports"))) {
      await queryRunner.query("CREATE TABLE `mall_review_reports` (`id` int NOT NULL AUTO_INCREMENT, `tenantId` int NOT NULL, `reviewId` int NOT NULL, `userId` int NOT NULL, `reason` varchar(255) NOT NULL, `images` json NULL, `status` varchar(24) NOT NULL DEFAULT 'pending', `resolution` varchar(255) NULL, `reviewedBy` varchar(80) NULL, `reviewedAt` datetime NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `UQ_mall_review_reports_review_user` (`reviewId`,`userId`), INDEX `IDX_mall_review_reports_tenant_status_time` (`tenantId`,`status`,`createdAt`), PRIMARY KEY (`id`), CONSTRAINT `FK_mall_review_reports_tenant` FOREIGN KEY (`tenantId`) REFERENCES `tenants`(`id`) ON DELETE CASCADE, CONSTRAINT `FK_mall_review_reports_review` FOREIGN KEY (`reviewId`) REFERENCES `mall_reviews`(`id`) ON DELETE CASCADE, CONSTRAINT `FK_mall_review_reports_user` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE) ENGINE=InnoDB");
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("mall_review_reports")) await queryRunner.query("DROP TABLE `mall_review_reports`");
    if (await queryRunner.hasTable("mall_reviews")) {
      const table = await queryRunner.getTable("mall_reviews");
      if (table?.indices.some((index) => index.name === "UQ_mall_reviews_order_item_user")) await queryRunner.query("DROP INDEX `UQ_mall_reviews_order_item_user` ON `mall_reviews`");
      for (const name of ["hiddenReason", "hiddenAt", "reportCount", "appendReviewedAt", "appendReviewedBy", "appendReviewRemark", "appendStatus", "appendedAt", "appendImages", "appendContent"]) if (await queryRunner.hasColumn("mall_reviews", name)) await queryRunner.dropColumn("mall_reviews", name);
    }
    if (await queryRunner.hasTable("mall_review_duplicate_archives")) await queryRunner.query("DROP TABLE `mall_review_duplicate_archives`");
  }
}
