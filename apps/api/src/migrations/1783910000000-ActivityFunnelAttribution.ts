import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

export class ActivityFunnelAttribution1783910000000 implements MigrationInterface {
  name = "ActivityFunnelAttribution1783910000000";

  async up(queryRunner: QueryRunner) {
    await this.addColumn(queryRunner, "activities", new TableColumn({ name: "locationProvince", type: "varchar", length: "80", isNullable: true }));
    await this.addColumn(queryRunner, "activities", new TableColumn({ name: "locationCity", type: "varchar", length: "80", isNullable: true }));
    await this.addColumn(queryRunner, "activities", new TableColumn({ name: "locationDistrict", type: "varchar", length: "80", isNullable: true }));

    for (const column of [
      new TableColumn({ name: "attributionSource", type: "varchar", length: "80", isNullable: true }),
      new TableColumn({ name: "attributionChannelCode", type: "varchar", length: "48", isNullable: true }),
      new TableColumn({ name: "attributionChannelName", type: "varchar", length: "80", isNullable: true }),
      new TableColumn({ name: "attributionProvince", type: "varchar", length: "80", isNullable: true }),
      new TableColumn({ name: "attributionCity", type: "varchar", length: "80", isNullable: true }),
      new TableColumn({ name: "attributionDistrict", type: "varchar", length: "80", isNullable: true }),
      new TableColumn({ name: "attributionCapturedAt", type: "datetime", isNullable: true })
    ]) await this.addColumn(queryRunner, "registrations", column);

    for (const column of [
      new TableColumn({ name: "ticketTypeIdSnapshot", type: "int", isNullable: true }),
      new TableColumn({ name: "ticketTypeNameSnapshot", type: "varchar", length: "100", isNullable: true }),
      new TableColumn({ name: "channelCodeSnapshot", type: "varchar", length: "48", isNullable: true }),
      new TableColumn({ name: "channelNameSnapshot", type: "varchar", length: "80", isNullable: true }),
      new TableColumn({ name: "provinceSnapshot", type: "varchar", length: "80", isNullable: true }),
      new TableColumn({ name: "citySnapshot", type: "varchar", length: "80", isNullable: true }),
      new TableColumn({ name: "districtSnapshot", type: "varchar", length: "80", isNullable: true })
    ]) await this.addColumn(queryRunner, "conversion_events", column);

    await this.addIndex(queryRunner, "conversion_events", new TableIndex({ name: "IDX_conversion_events_registration_type", columnNames: ["registrationId", "type"] }));

    await queryRunner.query(`
      UPDATE activities activity
      INNER JOIN (
        SELECT candidate.activityId, MIN(candidate.province) province, MIN(candidate.city) city, MIN(candidate.district) district
        FROM (
          SELECT activity_match.id activityId, region.province, region.city, region.district
          FROM activities activity_match
          INNER JOIN tenant_regions region ON region.tenantId = activity_match.tenantId
          WHERE region.enabled = 1
            AND region.authorizationStatus = 'approved'
            AND region.city IS NOT NULL
            AND region.city <> ''
            AND activity_match.location LIKE CONCAT('%', region.city, '%')
        ) candidate
        GROUP BY candidate.activityId
        HAVING COUNT(DISTINCT CONCAT(COALESCE(candidate.province, ''), '|', COALESCE(candidate.city, ''), '|', COALESCE(candidate.district, ''))) = 1
      ) inferred ON inferred.activityId = activity.id
      SET activity.locationProvince = inferred.province,
          activity.locationCity = inferred.city,
          activity.locationDistrict = inferred.district
      WHERE activity.locationCity IS NULL
    `);

    await queryRunner.query(`
      UPDATE registrations registration
      INNER JOIN activities activity ON activity.id = registration.activityId
      LEFT JOIN activity_channels channel ON channel.id = registration.channelId
      LEFT JOIN conversion_events register_event ON register_event.registrationId = registration.id AND register_event.type = 'register'
      SET registration.attributionSource = COALESCE(NULLIF(register_event.source, ''), NULLIF(channel.source, ''), 'direct'),
          registration.attributionChannelCode = channel.code,
          registration.attributionChannelName = channel.name,
          registration.attributionProvince = activity.locationProvince,
          registration.attributionCity = activity.locationCity,
          registration.attributionDistrict = activity.locationDistrict,
          registration.attributionCapturedAt = registration.createdAt
      WHERE registration.attributionCapturedAt IS NULL
    `);

    await queryRunner.query(`
      UPDATE conversion_events event
      LEFT JOIN registrations registration ON registration.id = event.registrationId
      LEFT JOIN orders direct_order ON direct_order.id = event.orderId
      LEFT JOIN orders registration_order ON registration_order.registrationId = registration.id
      LEFT JOIN ticket_types ticket ON ticket.id = COALESCE(direct_order.ticketTypeId, registration_order.ticketTypeId)
      LEFT JOIN activity_channels channel ON channel.id = event.channelId
      LEFT JOIN activities activity ON activity.id = event.activityId
      SET event.ticketTypeIdSnapshot = ticket.id,
          event.ticketTypeNameSnapshot = ticket.name,
          event.channelCodeSnapshot = COALESCE(registration.attributionChannelCode, channel.code),
          event.channelNameSnapshot = COALESCE(registration.attributionChannelName, channel.name),
          event.provinceSnapshot = COALESCE(registration.attributionProvince, activity.locationProvince),
          event.citySnapshot = COALESCE(registration.attributionCity, activity.locationCity),
          event.districtSnapshot = COALESCE(registration.attributionDistrict, activity.locationDistrict),
          event.source = CASE
            WHEN event.type IN ('register', 'pay', 'check_in', 'review', 'cancel', 'refund') THEN COALESCE(NULLIF(registration.attributionSource, ''), NULLIF(event.source, ''), 'direct')
            ELSE COALESCE(NULLIF(event.source, ''), 'direct')
          END
    `);

    await this.addIndex(queryRunner, "conversion_events", new TableIndex({ name: "IDX_conversion_events_activity_type_ticket", columnNames: ["activityId", "type", "ticketTypeIdSnapshot"] }));
    await this.addIndex(queryRunner, "conversion_events", new TableIndex({ name: "IDX_conversion_events_activity_type_channel", columnNames: ["activityId", "type", "channelCodeSnapshot"] }));
    await this.addIndex(queryRunner, "conversion_events", new TableIndex({ name: "IDX_conversion_events_activity_type_city", columnNames: ["activityId", "type", "citySnapshot"] }));
  }

  async down(queryRunner: QueryRunner) {
    for (const indexName of ["IDX_conversion_events_activity_type_city", "IDX_conversion_events_activity_type_channel", "IDX_conversion_events_activity_type_ticket", "IDX_conversion_events_registration_type"]) {
      const table = await queryRunner.getTable("conversion_events");
      if (table?.indices.some((index) => index.name === indexName)) await queryRunner.dropIndex("conversion_events", indexName);
    }
    for (const column of ["districtSnapshot", "citySnapshot", "provinceSnapshot", "channelNameSnapshot", "channelCodeSnapshot", "ticketTypeNameSnapshot", "ticketTypeIdSnapshot"]) await this.dropColumn(queryRunner, "conversion_events", column);
    for (const column of ["attributionCapturedAt", "attributionDistrict", "attributionCity", "attributionProvince", "attributionChannelName", "attributionChannelCode", "attributionSource"]) await this.dropColumn(queryRunner, "registrations", column);
    for (const column of ["locationDistrict", "locationCity", "locationProvince"]) await this.dropColumn(queryRunner, "activities", column);
  }

  private async addColumn(queryRunner: QueryRunner, tableName: string, column: TableColumn) {
    if (!(await queryRunner.hasColumn(tableName, column.name))) await queryRunner.addColumn(tableName, column);
  }

  private async dropColumn(queryRunner: QueryRunner, tableName: string, columnName: string) {
    if (await queryRunner.hasColumn(tableName, columnName)) await queryRunner.dropColumn(tableName, columnName);
  }

  private async addIndex(queryRunner: QueryRunner, tableName: string, index: TableIndex) {
    const table = await queryRunner.getTable(tableName);
    if (!table?.indices.some((item) => item.name === index.name)) await queryRunner.createIndex(tableName, index);
  }
}
