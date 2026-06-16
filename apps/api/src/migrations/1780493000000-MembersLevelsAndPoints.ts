import { MigrationInterface, QueryRunner } from "typeorm";

export class MembersLevelsAndPoints1780493000000 implements MigrationInterface {
  name = "MembersLevelsAndPoints1780493000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("member_levels"))) {
      await queryRunner.query(`
        CREATE TABLE member_levels (
          id int NOT NULL AUTO_INCREMENT,
          name varchar(80) NOT NULL,
          minPoints int NOT NULL DEFAULT 0,
          discountRate decimal(5,2) NOT NULL DEFAULT 1,
          priorityBooking tinyint NOT NULL DEFAULT 0,
          enabled tinyint NOT NULL DEFAULT 1,
          sortOrder int NOT NULL DEFAULT 0,
          createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          PRIMARY KEY (id)
        ) ENGINE=InnoDB
      `);
    }

    if (!(await queryRunner.hasTable("member_profiles"))) {
      await queryRunner.query(`
        CREATE TABLE member_profiles (
          id int NOT NULL AUTO_INCREMENT,
          userId int NULL,
          levelId int NULL,
          points int NOT NULL DEFAULT 0,
          totalSpent decimal(10,2) NOT NULL DEFAULT 0,
          registrationCount int NOT NULL DEFAULT 0,
          checkInCount int NOT NULL DEFAULT 0,
          reviewCount int NOT NULL DEFAULT 0,
          lastActiveAt datetime NULL,
          createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          updatedAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
          UNIQUE KEY IDX_member_profiles_user (userId),
          PRIMARY KEY (id),
          CONSTRAINT FK_member_profiles_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT FK_member_profiles_level FOREIGN KEY (levelId) REFERENCES member_levels(id)
        ) ENGINE=InnoDB
      `);
    }

    if (!(await queryRunner.hasTable("member_point_logs"))) {
      await queryRunner.query(`
        CREATE TABLE member_point_logs (
          id int NOT NULL AUTO_INCREMENT,
          userId int NULL,
          points int NOT NULL,
          type varchar(40) NOT NULL,
          sourceType varchar(60) NOT NULL,
          sourceId varchar(80) NOT NULL,
          remark varchar(255) NULL,
          createdAt datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
          UNIQUE KEY IDX_member_point_source (sourceType, sourceId),
          PRIMARY KEY (id),
          CONSTRAINT FK_member_point_logs_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("member_point_logs")) await queryRunner.query("DROP TABLE member_point_logs");
    if (await queryRunner.hasTable("member_profiles")) await queryRunner.query("DROP TABLE member_profiles");
    if (await queryRunner.hasTable("member_levels")) await queryRunner.query("DROP TABLE member_levels");
  }
}
