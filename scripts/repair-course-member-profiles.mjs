import { createRequire } from "node:module";
import path from "node:path";

const mysql = createRequire(path.resolve("apps/api/package.json"))("mysql2/promise");
const db = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 13306),
  user: process.env.DB_USERNAME || "activity",
  password: process.env.DB_PASSWORD || "activitypass",
  database: process.env.DB_DATABASE || "activity_registration",
  timezone: "+08:00"
});

try {
  const [missingBeforeRows] = await db.query(`
    SELECT COUNT(*) AS count
    FROM (
      SELECT DISTINCT learning.userId, course.tenantId
      FROM user_learning learning
      INNER JOIN courses course ON course.id = learning.courseId
      LEFT JOIN member_profiles profile
        ON profile.userId = learning.userId
       AND profile.tenantScopeKey = CONCAT('tenant:', course.tenantId)
      WHERE course.tenantId IS NOT NULL AND profile.id IS NULL
    ) missing
  `);
  const [result] = await db.query(`
    INSERT IGNORE INTO member_profiles (userId, tenantId, tenantScopeKey, points, growthValue, totalSpent, registrationCount, checkInCount, reviewCount, levelSource, lastActiveAt)
    SELECT DISTINCT learning.userId, course.tenantId, CONCAT('tenant:', course.tenantId), 0, 0, '0.00', 0, 0, 0, 'growth', learning.updatedAt
    FROM user_learning learning
    INNER JOIN courses course ON course.id = learning.courseId
    LEFT JOIN member_profiles profile
      ON profile.userId = learning.userId
     AND profile.tenantScopeKey = CONCAT('tenant:', course.tenantId)
    WHERE course.tenantId IS NOT NULL AND profile.id IS NULL
  `);
  const [missingAfterRows] = await db.query(`
    SELECT COUNT(*) AS count
    FROM (
      SELECT DISTINCT learning.userId, course.tenantId
      FROM user_learning learning
      INNER JOIN courses course ON course.id = learning.courseId
      LEFT JOIN member_profiles profile
        ON profile.userId = learning.userId
       AND profile.tenantScopeKey = CONCAT('tenant:', course.tenantId)
      WHERE course.tenantId IS NOT NULL AND profile.id IS NULL
    ) missing
  `);
  console.log(JSON.stringify({
    ok: Number(missingAfterRows[0].count) === 0,
    missingBefore: Number(missingBeforeRows[0].count),
    inserted: Number(result.affectedRows || 0),
    missingAfter: Number(missingAfterRows[0].count)
  }, null, 2));
  if (Number(missingAfterRows[0].count) !== 0) process.exitCode = 1;
} finally {
  await db.end();
}
