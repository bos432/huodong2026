import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

export class ForumBoardGovernance1783520000000 implements MigrationInterface {
  name = "ForumBoardGovernance1783520000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("forum_topics", "locked"))) {
      await queryRunner.query("ALTER TABLE `forum_topics` ADD `locked` tinyint NOT NULL DEFAULT 0, ADD `lockReason` varchar(500) NULL, ADD `lockedAt` datetime NULL, ADD `lockedByAdminId` int NULL, ADD `nextFloorNo` int NOT NULL DEFAULT 1");
    }
    if (!(await queryRunner.hasColumn("forum_replies", "floorNo"))) {
      await queryRunner.query("ALTER TABLE `forum_replies` ADD `floorNo` int NULL, ADD `quoteReplyId` int NULL, ADD `quoteFloorNo` int NULL, ADD `quoteAuthorName` varchar(120) NULL, ADD `quoteContent` varchar(500) NULL");
      await queryRunner.query("UPDATE `forum_replies` r JOIN (SELECT r1.id, COUNT(r2.id) AS floorNo FROM `forum_replies` r1 LEFT JOIN `forum_replies` r2 ON r2.topicId = r1.topicId AND r2.parentId IS NULL AND r2.id <= r1.id WHERE r1.parentId IS NULL GROUP BY r1.id) x ON x.id = r.id SET r.floorNo = x.floorNo");
      await queryRunner.query("UPDATE `forum_topics` t LEFT JOIN (SELECT topicId, COALESCE(MAX(floorNo), 0) + 1 AS nextFloorNo FROM `forum_replies` GROUP BY topicId) r ON r.topicId = t.id SET t.nextFloorNo = COALESCE(r.nextFloorNo, 1)");
      await queryRunner.createIndex("forum_replies", new TableIndex({ name: "IDX_forum_reply_topic_floor", columnNames: ["topicId", "floorNo"], isUnique: true }));
      await queryRunner.createForeignKey("forum_replies", new TableForeignKey({ name: "FK_forum_reply_quote", columnNames: ["quoteReplyId"], referencedTableName: "forum_replies", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
    }
    const topicTable = await queryRunner.getTable("forum_topics");
    if (topicTable && !topicTable.foreignKeys.some((key) => key.name === "FK_forum_topic_locked_by")) {
      await queryRunner.createForeignKey("forum_topics", new TableForeignKey({ name: "FK_forum_topic_locked_by", columnNames: ["lockedByAdminId"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }));
    }
    if (!(await queryRunner.hasTable("forum_category_moderators"))) {
      await queryRunner.createTable(new Table({
        name: "forum_category_moderators",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "tenantId", type: "int", isNullable: true },
          { name: "categoryId", type: "int" },
          { name: "adminId", type: "int" },
          { name: "permissions", type: "json", isNullable: true },
          { name: "createdByAdminId", type: "int", isNullable: true },
          { name: "createdAt", type: "datetime", precision: 6, default: "CURRENT_TIMESTAMP(6)" }
        ],
        foreignKeys: [
          { name: "FK_forum_category_moderator_tenant", columnNames: ["tenantId"], referencedTableName: "tenants", referencedColumnNames: ["id"], onDelete: "SET NULL" },
          { name: "FK_forum_category_moderator_category", columnNames: ["categoryId"], referencedTableName: "forum_categories", referencedColumnNames: ["id"], onDelete: "CASCADE" },
          { name: "FK_forum_category_moderator_admin", columnNames: ["adminId"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "CASCADE" },
          { name: "FK_forum_category_moderator_creator", columnNames: ["createdByAdminId"], referencedTableName: "admin_users", referencedColumnNames: ["id"], onDelete: "SET NULL" }
        ],
        indices: [
          { name: "IDX_forum_category_moderator_pair", columnNames: ["categoryId", "adminId"], isUnique: true },
          { name: "IDX_forum_category_moderator_tenant", columnNames: ["tenantId", "categoryId"] }
        ]
      }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("forum_category_moderators")) await queryRunner.dropTable("forum_category_moderators", true);
    const topicTable = await queryRunner.getTable("forum_topics");
    const lockedByKey = topicTable?.foreignKeys.find((key) => key.name === "FK_forum_topic_locked_by");
    if (lockedByKey) await queryRunner.dropForeignKey("forum_topics", lockedByKey);
    const replyTable = await queryRunner.getTable("forum_replies");
    const quoteKey = replyTable?.foreignKeys.find((key) => key.name === "FK_forum_reply_quote");
    if (quoteKey) await queryRunner.dropForeignKey("forum_replies", quoteKey);
    const floorIndex = replyTable?.indices.find((index) => index.name === "IDX_forum_reply_topic_floor");
    if (floorIndex) await queryRunner.dropIndex("forum_replies", floorIndex);
    if (await queryRunner.hasColumn("forum_replies", "floorNo")) await queryRunner.query("ALTER TABLE `forum_replies` DROP COLUMN `quoteContent`, DROP COLUMN `quoteAuthorName`, DROP COLUMN `quoteFloorNo`, DROP COLUMN `quoteReplyId`, DROP COLUMN `floorNo`");
    if (await queryRunner.hasColumn("forum_topics", "locked")) await queryRunner.query("ALTER TABLE `forum_topics` DROP COLUMN `nextFloorNo`, DROP COLUMN `lockedByAdminId`, DROP COLUMN `lockedAt`, DROP COLUMN `lockReason`, DROP COLUMN `locked`");
  }
}
