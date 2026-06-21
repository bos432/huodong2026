import { MigrationInterface, QueryRunner } from "typeorm";

export class UniqueMallCheckoutGroupClientKey1781730400000 implements MigrationInterface {
  name = "UniqueMallCheckoutGroupClientKey1781730400000";

  async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("mall_checkout_groups"))) return;
    const indexes = await queryRunner.query("SHOW INDEX FROM mall_checkout_groups WHERE Key_name = ?", ["IDX_mall_checkout_groups_client_key"]);
    if (indexes?.length) return;

    await queryRunner.query(`
      UPDATE mall_checkout_groups duplicate_group
      INNER JOIN mall_checkout_groups kept_group
        ON kept_group.tenantId = duplicate_group.tenantId
        AND kept_group.userId = duplicate_group.userId
        AND kept_group.clientOrderKey = duplicate_group.clientOrderKey
        AND kept_group.id < duplicate_group.id
      SET duplicate_group.clientOrderKey = CONCAT(LEFT(duplicate_group.clientOrderKey, 50), ':dup:', duplicate_group.id)
      WHERE duplicate_group.clientOrderKey IS NOT NULL
        AND duplicate_group.clientOrderKey <> ''
    `);
    await queryRunner.query("CREATE UNIQUE INDEX IDX_mall_checkout_groups_client_key ON mall_checkout_groups (tenantId, userId, clientOrderKey)");
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("mall_checkout_groups"))) return;
    const indexes = await queryRunner.query("SHOW INDEX FROM mall_checkout_groups WHERE Key_name = ?", ["IDX_mall_checkout_groups_client_key"]);
    if (indexes?.length) await queryRunner.query("DROP INDEX IDX_mall_checkout_groups_client_key ON mall_checkout_groups");
  }
}
