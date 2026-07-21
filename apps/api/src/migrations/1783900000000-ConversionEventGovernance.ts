import { MigrationInterface, QueryRunner } from "typeorm";

export class ConversionEventGovernance1783900000000 implements MigrationInterface {
  name = "ConversionEventGovernance1783900000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE duplicate_event
      FROM conversion_events duplicate_event
      INNER JOIN conversion_events retained_event
        ON retained_event.idempotencyKey = duplicate_event.idempotencyKey
       AND retained_event.id < duplicate_event.id
      WHERE duplicate_event.idempotencyKey IS NOT NULL
    `);
    await queryRunner.query("ALTER TABLE conversion_events ADD UNIQUE INDEX UQ_conversion_events_idempotency_key (idempotencyKey)");
    await queryRunner.query(`
      DELETE conversion_event
      FROM conversion_events conversion_event
      INNER JOIN check_ins check_in
        ON conversion_event.idempotencyKey = CONCAT('check_in:', check_in.id)
      WHERE check_in.revokedAt IS NOT NULL
    `);

    await queryRunner.query(`
      INSERT IGNORE INTO conversion_events
        (type, source, idempotencyKey, amount, clientIp, userAgent, payload, createdAt, tenantId, activityId, channelId, userId, registrationId, orderId)
      SELECT
        'register', COALESCE(NULLIF(channel.source, ''), 'direct'), CONCAT('register:', registration.id),
        COALESCE(activity_order.amount, 0), NULL, NULL, JSON_OBJECT('backfilled', TRUE), registration.createdAt,
        COALESCE(registration.tenantId, activity.tenantId), registration.activityId, registration.channelId,
        registration.userId, registration.id, activity_order.id
      FROM registrations registration
      LEFT JOIN activities activity ON activity.id = registration.activityId
      LEFT JOIN activity_channels channel ON channel.id = registration.channelId
      LEFT JOIN orders activity_order ON activity_order.registrationId = registration.id
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO conversion_events
        (type, source, idempotencyKey, amount, clientIp, userAgent, payload, createdAt, tenantId, activityId, channelId, userId, registrationId, orderId)
      SELECT
        'pay', activity_order.paymentMethod, CONCAT('pay:', activity_order.id), activity_order.amount,
        NULL, NULL, JSON_OBJECT('backfilled', TRUE), COALESCE(activity_order.paidAt, activity_order.createdAt),
        COALESCE(activity_order.tenantId, registration.tenantId, activity.tenantId), registration.activityId,
        registration.channelId, registration.userId, registration.id, activity_order.id
      FROM orders activity_order
      INNER JOIN registrations registration ON registration.id = activity_order.registrationId
      LEFT JOIN activities activity ON activity.id = registration.activityId
      WHERE activity_order.status IN ('paid', 'partially_refunded', 'refunded')
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO conversion_events
        (type, source, idempotencyKey, amount, clientIp, userAgent, payload, createdAt, tenantId, activityId, channelId, userId, registrationId, orderId)
      SELECT
        'check_in', 'admin', CONCAT('check_in:', check_in.id), 0,
        NULL, NULL, JSON_OBJECT('backfilled', TRUE), check_in.createdAt,
        COALESCE(registration.tenantId, activity.tenantId), registration.activityId, registration.channelId,
        registration.userId, registration.id, activity_order.id
      FROM check_ins check_in
      INNER JOIN registrations registration ON registration.id = check_in.registrationId
      LEFT JOIN activities activity ON activity.id = registration.activityId
      LEFT JOIN orders activity_order ON activity_order.registrationId = registration.id
      WHERE check_in.revokedAt IS NULL
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO conversion_events
        (type, source, idempotencyKey, amount, clientIp, userAgent, payload, createdAt, tenantId, activityId, channelId, userId, registrationId, orderId)
      SELECT
        'review', 'member', CONCAT('review:', review.id), 0,
        NULL, NULL, JSON_OBJECT('backfilled', TRUE, 'rating', review.rating), review.createdAt,
        COALESCE(registration.tenantId, activity.tenantId), review.activityId, registration.channelId,
        review.userId, review.registrationId, activity_order.id
      FROM activity_reviews review
      LEFT JOIN registrations registration ON registration.id = review.registrationId
      LEFT JOIN activities activity ON activity.id = review.activityId
      LEFT JOIN orders activity_order ON activity_order.registrationId = review.registrationId
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO conversion_events
        (type, source, idempotencyKey, amount, clientIp, userAgent, payload, createdAt, tenantId, activityId, channelId, userId, registrationId, orderId)
      SELECT
        'share_visit', COALESCE(NULLIF(share_visit.source, ''), 'share'), CONCAT('share_visit:', share_visit.id), 0,
        NULL, NULL, JSON_OBJECT('backfilled', TRUE, 'scene', share_visit.scene), share_visit.createdAt,
        activity.tenantId, share_visit.activityId, NULL, share_visit.visitorId, NULL, NULL
      FROM share_visits share_visit
      LEFT JOIN activities activity ON activity.id = share_visit.activityId
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO conversion_events
        (type, source, idempotencyKey, amount, clientIp, userAgent, payload, createdAt, tenantId, activityId, channelId, userId, registrationId, orderId)
      SELECT
        'cancel', 'status_backfill', CONCAT('cancel:', registration.id), 0,
        NULL, NULL, JSON_OBJECT('backfilled', TRUE, 'reason', registration.cancelReason), registration.updatedAt,
        COALESCE(registration.tenantId, activity.tenantId), registration.activityId, registration.channelId,
        registration.userId, registration.id, activity_order.id
      FROM registrations registration
      LEFT JOIN activities activity ON activity.id = registration.activityId
      LEFT JOIN orders activity_order ON activity_order.registrationId = registration.id
      WHERE registration.status = 'cancelled'
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO conversion_events
        (type, source, idempotencyKey, amount, clientIp, userAgent, payload, createdAt, tenantId, activityId, channelId, userId, registrationId, orderId)
      SELECT
        'refund', 'refund', CONCAT('refund:', refund.id), refund.amount,
        NULL, NULL, JSON_OBJECT('backfilled', TRUE, 'refundNo', refund.refundNo), COALESCE(refund.completedAt, refund.createdAt),
        COALESCE(refund.tenantId, activity_order.tenantId, registration.tenantId, activity.tenantId), registration.activityId,
        registration.channelId, registration.userId, registration.id, refund.orderId
      FROM refunds refund
      INNER JOIN orders activity_order ON activity_order.id = refund.orderId
      INNER JOIN registrations registration ON registration.id = activity_order.registrationId
      LEFT JOIN activities activity ON activity.id = registration.activityId
      WHERE refund.status = 'completed'
    `);
    await queryRunner.query(`
      INSERT IGNORE INTO conversion_events
        (type, source, idempotencyKey, amount, clientIp, userAgent, payload, createdAt, tenantId, activityId, channelId, userId, registrationId, orderId)
      SELECT
        'view', COALESCE(NULLIF(view_log.source, ''), 'direct'), CONCAT('view_log:', view_log.id), 0,
        NULL, NULL, JSON_OBJECT('backfilled', TRUE), view_log.createdAt,
        activity.tenantId, view_log.activityId, view_log.channelId, view_log.userId, NULL, NULL
      FROM activity_view_logs view_log
      LEFT JOIN activities activity ON activity.id = view_log.activityId
      WHERE NOT EXISTS (
        SELECT 1 FROM conversion_events existing_event
        WHERE existing_event.type = 'view'
          AND existing_event.activityId = view_log.activityId
          AND existing_event.userId <=> view_log.userId
          AND existing_event.channelId <=> view_log.channelId
          AND ABS(TIMESTAMPDIFF(SECOND, existing_event.createdAt, view_log.createdAt)) <= 1
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE conversion_events DROP INDEX UQ_conversion_events_idempotency_key");
  }
}
