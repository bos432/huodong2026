import { MigrationInterface, QueryRunner } from "typeorm";

export class ActivityPriorityBooking1780500000000 implements MigrationInterface {
  name = "ActivityPriorityBooking1780500000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasColumn("activities", "priorityMemberLevelId"))) {
      await queryRunner.query("ALTER TABLE activities ADD priorityMemberLevelId int NULL");
      await queryRunner.query("ALTER TABLE activities ADD CONSTRAINT FK_activities_priority_member_level FOREIGN KEY (priorityMemberLevelId) REFERENCES member_levels(id)");
    }
    if (!(await queryRunner.hasColumn("activities", "priorityRegistrationEndsAt"))) {
      await queryRunner.query("ALTER TABLE activities ADD priorityRegistrationEndsAt datetime NULL");
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasColumn("activities", "priorityMemberLevelId")) {
      await queryRunner.query("ALTER TABLE activities DROP FOREIGN KEY FK_activities_priority_member_level");
      await queryRunner.query("ALTER TABLE activities DROP COLUMN priorityMemberLevelId");
    }
    if (await queryRunner.hasColumn("activities", "priorityRegistrationEndsAt")) {
      await queryRunner.query("ALTER TABLE activities DROP COLUMN priorityRegistrationEndsAt");
    }
  }
}
