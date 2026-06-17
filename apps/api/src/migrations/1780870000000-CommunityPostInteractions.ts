import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CommunityPostInteractions1780870000000 implements MigrationInterface {
  name = "CommunityPostInteractions1780870000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("community_post_likes"))) {
      await queryRunner.createTable(new Table({
        name: "community_post_likes",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "postId", type: "int" },
          { name: "userId", type: "int" },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" }
        ]
      }));
      await queryRunner.createIndex("community_post_likes", new TableIndex({ name: "IDX_community_post_likes_post_user", columnNames: ["postId", "userId"], isUnique: true }));
      await queryRunner.createIndex("community_post_likes", new TableIndex({ name: "IDX_community_post_likes_user", columnNames: ["userId"] }));
    }

    if (!(await queryRunner.hasTable("community_post_comments"))) {
      await queryRunner.createTable(new Table({
        name: "community_post_comments",
        columns: [
          { name: "id", type: "int", isPrimary: true, isGenerated: true, generationStrategy: "increment" },
          { name: "postId", type: "int" },
          { name: "userId", type: "int" },
          { name: "content", type: "text" },
          { name: "status", type: "varchar", length: "20", default: "'pending'" },
          { name: "reviewRemark", type: "varchar", length: "255", isNullable: true },
          { name: "createdAt", type: "datetime", default: "CURRENT_TIMESTAMP" },
          { name: "updatedAt", type: "datetime", default: "CURRENT_TIMESTAMP", onUpdate: "CURRENT_TIMESTAMP" }
        ]
      }));
      await queryRunner.createIndex("community_post_comments", new TableIndex({ name: "IDX_community_post_comments_post_status_created", columnNames: ["postId", "status", "createdAt"] }));
      await queryRunner.createIndex("community_post_comments", new TableIndex({ name: "IDX_community_post_comments_user", columnNames: ["userId"] }));
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("community_post_comments")) await queryRunner.dropTable("community_post_comments");
    if (await queryRunner.hasTable("community_post_likes")) await queryRunner.dropTable("community_post_likes");
  }
}
