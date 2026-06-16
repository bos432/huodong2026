import { MigrationInterface, QueryRunner } from "typeorm";

export class ActivityMemberAccess1780496000000 implements MigrationInterface {
  name = "ActivityMemberAccess1780496000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("activities", "minMemberLevelId"))) {
      await queryRunner.query("ALTER TABLE activities ADD minMemberLevelId int NULL");
      await queryRunner.query("ALTER TABLE activities ADD CONSTRAINT FK_activities_min_member_level FOREIGN KEY (minMemberLevelId) REFERENCES member_levels(id)");
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("activities", "minMemberLevelId")) {
      await queryRunner.query("ALTER TABLE activities DROP FOREIGN KEY FK_activities_min_member_level");
      await queryRunner.query("ALTER TABLE activities DROP COLUMN minMemberLevelId");
    }
  }
}
