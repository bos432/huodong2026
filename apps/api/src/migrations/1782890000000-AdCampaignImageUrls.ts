import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AdCampaignImageUrls1782890000000 implements MigrationInterface {
  name = "AdCampaignImageUrls1782890000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("ad_campaigns"))) return;
    if (await queryRunner.hasColumn("ad_campaigns", "imageUrls")) return;
    await queryRunner.addColumn("ad_campaigns", new TableColumn({ name: "imageUrls", type: "json", isNullable: true }));
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("ad_campaigns"))) return;
    if (await queryRunner.hasColumn("ad_campaigns", "imageUrls")) await queryRunner.dropColumn("ad_campaigns", "imageUrls");
  }
}
