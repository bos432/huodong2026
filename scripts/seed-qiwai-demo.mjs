import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const apiRequire = createRequire(path.join(root, "apps/api/package.json"));
const bcrypt = apiRequire("bcryptjs");
const mysql = apiRequire("mysql2/promise");

const password = process.env.QIWAI_DEMO_PASSWORD || "Qiwai123456";

const tenants = [
  {
    code: "qiwai-hangzhou",
    name: "慢π杭州城市合伙人",
    region: "杭州",
    contactName: "杭州主理人",
    contactPhone: "13800001001",
    admin: "qiwai_hz_admin",
    ops: "qiwai_hz_ops",
    finance: "qiwai_hz_finance",
    checkin: "qiwai_hz_checkin",
    agentName: "杭州西湖文化空间",
    activities: [
      {
        title: "东方哲学与节气文化体验沙龙",
        price: 99,
        location: "杭州西湖文化空间",
        description: "以节气、人文地理和经典文本为线索，做一场适合城市用户参与的东方哲学体验活动。",
        host: "慢π讲师团",
        section: "节气文化导入、经典片段共读、城市生活应用讨论、会员活动介绍。"
      },
      {
        title: "硬笔书法 30 天入门公开课",
        price: 49,
        location: "杭州西湖文化空间",
        description: "面向零基础成人和亲子家庭的书法体验课，用一场活动验证书法美育方向的报名转化。",
        host: "杭州书法主理人",
        section: "握笔与坐姿、基础笔画、常用字练习、训练营报名说明。"
      }
    ]
  },
  {
    code: "qiwai-suzhou",
    name: "慢π苏州城市合伙人",
    region: "苏州",
    contactName: "苏州主理人",
    contactPhone: "13800001002",
    admin: "qiwai_sz_admin",
    ops: "qiwai_sz_ops",
    finance: "qiwai_sz_finance",
    checkin: "qiwai_sz_checkin",
    agentName: "苏州书院活动中心",
    activities: [
      {
        title: "国学经典导读体验课",
        price: 69,
        location: "苏州书院活动中心",
        description: "用轻量导读方式带用户进入国学经典，重点验证读书会和训练营转化。",
        host: "苏州书院讲师",
        section: "经典导读、互动讨论、学习路径说明、会员权益介绍。"
      },
      {
        title: "亲子沟通与家庭教育沙龙",
        price: 129,
        location: "苏州书院活动中心",
        description: "面向家长的线下沟通沙龙，沉淀家庭教育方向的高复购用户。",
        host: "家庭教育顾问",
        section: "亲子冲突场景拆解、沟通练习、问答交流、后续训练营介绍。"
      }
    ]
  },
  {
    code: "qiwai-chengdu",
    name: "慢π成都城市合伙人",
    region: "成都",
    contactName: "成都主理人",
    contactPhone: "13800001003",
    admin: "qiwai_cd_admin",
    ops: "qiwai_cd_ops",
    finance: "qiwai_cd_finance",
    checkin: "qiwai_cd_checkin",
    agentName: "成都身心成长空间",
    activities: [
      {
        title: "节气养生与身心减压体验课",
        price: 79,
        location: "成都身心成长空间",
        description: "围绕节气养生、正念减压和生活方式管理做线下体验，验证健康养生方向。",
        host: "健康养生讲师",
        section: "节气养生知识、减压练习、生活习惯评估、会员活动介绍。"
      },
      {
        title: "私域运营与副业启动工作坊",
        price: 199,
        location: "成都身心成长空间",
        description: "面向本地创业者和个体从业者的实战工作坊，用活动带动高客单服务咨询。",
        host: "创业技能导师",
        section: "定位梳理、私域触点设计、首个产品设计、行动计划输出。"
      }
    ]
  }
];

function readEnv(file) {
  if (!fs.existsSync(file)) return {};
  const env = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return env;
}

function futureDate(days, hour = 10) {
  const date = new Date(Date.now() + days * 86400000);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString().slice(0, 19).replace("T", " ");
}

async function main() {
  const envFile = process.env.ENV_FILE || (fs.existsSync(path.join(root, "apps/api/.env")) ? "apps/api/.env" : "deploy/.env.production");
  const env = { ...readEnv(path.join(root, envFile)), ...process.env };
  const connection = await mysql.createConnection({
    host: env.DB_HOST || "127.0.0.1",
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USERNAME || "activity",
    password: env.DB_PASSWORD || "activitypass",
    database: env.DB_DATABASE || "activity_registration",
    timezone: "+08:00",
    multipleStatements: false
  });

  try {
    await ensureSchema(connection);
    for (const tenant of tenants) {
      const tenantId = await upsertTenant(connection, tenant);
      await upsertAdmins(connection, tenant, tenantId);
      const agentId = await upsertAgent(connection, tenant, tenantId);
      await upsertOperationSettings(connection, tenant, tenantId);
      for (const [index, activity] of tenant.activities.entries()) {
        await upsertActivity(connection, tenantId, agentId, activity, index);
      }
    }
    console.log("慢π演示数据已准备完成。");
    console.log(`默认密码：${password}`);
    for (const tenant of tenants) {
      console.log(`${tenant.name}: ${tenant.admin} / ${tenant.ops} / ${tenant.finance} / ${tenant.checkin}`);
    }
  } finally {
    await connection.end();
  }
}

async function ensureSchema(connection) {
  for (const table of ["tenants", "admin_users", "activities", "activity_fields", "activity_hosts", "activity_sections", "agents", "agent_payment_accounts", "operation_settings"]) {
    const [rows] = await connection.query("SHOW TABLES LIKE ?", [table]);
    if (!rows.length) throw new Error(`缺少数据表：${table}，请先执行 API migration。`);
  }
}

async function upsertTenant(connection, tenant) {
  const settings = JSON.stringify({
    activityPublishReviewRequired: true,
    registrationReviewEnabled: true,
    paymentAccountEditable: true,
    mallEnabled: true,
    demoScenario: "qiwai-cultural-saas"
  });
  await connection.execute(
    `
      INSERT INTO tenants (code, name, region, contactName, contactPhone, enabled, settings, remark, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, true, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        region = VALUES(region),
        contactName = VALUES(contactName),
        contactPhone = VALUES(contactPhone),
        enabled = true,
        settings = VALUES(settings),
        remark = VALUES(remark),
        updatedAt = NOW()
    `,
    [tenant.code, tenant.name, tenant.region, tenant.contactName, tenant.contactPhone, settings, "慢π城市合伙人演示租户"]
  );
  const [rows] = await connection.execute("SELECT id FROM tenants WHERE code = ? LIMIT 1", [tenant.code]);
  return rows[0].id;
}

async function upsertAdmins(connection, tenant, tenantId) {
  const users = [
    [tenant.admin, "super_admin"],
    [tenant.ops, "operator"],
    [tenant.finance, "finance"],
    [tenant.checkin, "checkin_staff"]
  ];
  const passwordHash = await bcrypt.hash(password, 10);
  for (const [username, role] of users) {
    await connection.execute(
      `
        INSERT INTO admin_users (username, passwordHash, role, tenantId, permissions, enabled, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, NULL, true, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          passwordHash = VALUES(passwordHash),
          role = VALUES(role),
          tenantId = VALUES(tenantId),
          permissions = NULL,
          enabled = true,
          updatedAt = NOW()
      `,
      [username, passwordHash, role, tenantId]
    );
  }
}

async function upsertAgent(connection, tenant, tenantId) {
  const settlementConfig = JSON.stringify({ commissionRate: 0, demoScenario: "qiwai-cultural-saas" });
  const [agentRows] = await connection.execute("SELECT id FROM agents WHERE tenantId = ? AND name = ? LIMIT 1", [tenantId, tenant.agentName]);
  let agentId = agentRows[0]?.id;
  if (agentId) {
    await connection.execute(
      `
        UPDATE agents
        SET region = ?, contactName = ?, contactPhone = ?, enabled = true, settlementConfig = ?, updatedAt = NOW()
        WHERE id = ?
      `,
      [tenant.region, tenant.contactName, tenant.contactPhone, settlementConfig, agentId]
    );
  } else {
    const [result] = await connection.execute(
      `
        INSERT INTO agents (name, tenantId, region, contactName, contactPhone, enabled, settlementConfig, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, true, ?, NOW(), NOW())
      `,
      [tenant.agentName, tenantId, tenant.region, tenant.contactName, tenant.contactPhone, settlementConfig]
    );
    agentId = result.insertId;
  }

  const accountConfig = JSON.stringify({
    WECHAT_MCH_ID: `QIWAI_${tenant.code}`,
    WECHAT_APPID: `wx_demo_${tenant.code}`,
    WECHAT_NOTIFY_URL: "https://example.com/payment/wechat/callback",
    demoOnly: true
  });
  const [accountRows] = await connection.execute("SELECT id FROM agent_payment_accounts WHERE agentId = ? AND provider = 'wechat' LIMIT 1", [agentId]);
  if (accountRows[0]?.id) {
    await connection.execute(
      `
        UPDATE agent_payment_accounts
        SET tenantId = ?, merchantName = ?, merchantNo = ?, enabled = true, config = ?, updatedAt = NOW()
        WHERE id = ?
      `,
      [tenantId, `${tenant.name}微信演示账户`, `QIWAI_${tenant.code}`, accountConfig, accountRows[0].id]
    );
  } else {
    await connection.execute(
      `
        INSERT INTO agent_payment_accounts (agentId, tenantId, provider, merchantName, merchantNo, enabled, config, createdAt, updatedAt)
        VALUES (?, ?, 'wechat', ?, ?, true, ?, NOW(), NOW())
      `,
      [agentId, tenantId, `${tenant.name}微信演示账户`, `QIWAI_${tenant.code}`, accountConfig]
    );
  }
  return agentId;
}

async function upsertOperationSettings(connection, tenant, tenantId) {
  const pageTheme = JSON.stringify({ primaryColor: "#0f766e", cardRadius: 8 });
  const [rows] = await connection.execute("SELECT id FROM operation_settings WHERE id = ? LIMIT 1", [tenantId]);
  const updateValues = [
    true,
    "",
    `线下活动支持到场后核销，付费活动请以活动页订单状态为准。${tenant.name} 将按活动说明提供服务。`,
    tenant.contactName,
    tenant.contactPhone,
    `${tenant.code}_service`,
    "",
    pageTheme,
    "活动开始前 24 小时以上可申请退款，特殊活动以活动详情说明为准。",
    "如需发票请联系城市合伙人客服登记开票信息。",
    tenantId
  ];
  if (rows[0]?.id) {
    await connection.execute(
      `
        UPDATE operation_settings
        SET registrationEnabled = ?, registrationDisabledMessage = ?, offlinePaymentInstructions = ?, customerServiceName = ?,
            customerServicePhone = ?, customerServiceWechat = ?, defaultGroupQrCodeUrl = ?, pageTheme = ?,
            refundInstructions = ?, invoiceInstructions = ?, updatedAt = NOW()
        WHERE id = ?
      `,
      updateValues
    );
  } else {
    await connection.execute(
      `
        INSERT INTO operation_settings (
          registrationEnabled, registrationDisabledMessage, offlinePaymentInstructions, customerServiceName,
          customerServicePhone, customerServiceWechat, defaultGroupQrCodeUrl, pageTheme,
          id, refundInstructions, invoiceInstructions, tenantId, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        true,
        "",
        `线下活动支持到场后核销，付费活动请以活动页订单状态为准。${tenant.name} 将按活动说明提供服务。`,
        tenant.contactName,
        tenant.contactPhone,
        `${tenant.code}_service`,
        "",
        pageTheme,
        tenantId,
        "活动开始前 24 小时以上可申请退款，特殊活动以活动详情说明为准。",
        "如需发票请联系城市合伙人客服登记开票信息。",
        tenantId
      ]
    );
  }
}

async function upsertActivity(connection, tenantId, agentId, activity, index) {
  const startTime = futureDate(7 + index * 3, index === 0 ? 14 : 19);
  const endTime = futureDate(7 + index * 3, index === 0 ? 16 : 21);
  const deadline = futureDate(6 + index * 3, 22);
  const [rows] = await connection.execute("SELECT id FROM activities WHERE tenantId = ? AND title = ? LIMIT 1", [tenantId, activity.title]);
  let activityId = rows[0]?.id;
  const params = [
    "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80",
    activity.description,
    "请提前 10 分钟到场签到。本活动不涉及算命、改运、预测等内容。",
    activity.location,
    startTime,
    endTime,
    deadline,
    30,
    activity.price,
    "open",
    index === 0,
    false,
    true,
    agentId
  ];
  if (activityId) {
    await connection.execute(
      `
        UPDATE activities
        SET coverUrl = ?, description = ?, notice = ?, location = ?, startTime = ?, endTime = ?, registrationDeadline = ?,
            capacity = ?, price = ?, status = ?, featured = ?, requireReview = ?, allowCancel = ?, agentId = ?, updatedAt = NOW()
        WHERE id = ?
      `,
      [...params, activityId]
    );
    await clearActivityChildren(connection, activityId);
  } else {
    const [result] = await connection.execute(
      `
        INSERT INTO activities (
          title, tenantId, coverUrl, description, notice, location, startTime, endTime, registrationDeadline,
          capacity, price, status, featured, requireReview, allowCancel, agentId, createdAt, updatedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `,
      [activity.title, tenantId, ...params]
    );
    activityId = result.insertId;
  }

  await connection.execute(
    `
      INSERT INTO activity_fields (activityId, label, type, required, options, sortOrder)
      VALUES
        (?, '姓名', 'text', true, JSON_ARRAY(), 1),
        (?, '手机号', 'phone', true, JSON_ARRAY(), 2),
        (?, '备注', 'remark', false, JSON_ARRAY(), 3)
    `,
    [activityId, activityId, activityId]
  );
  await connection.execute(
    `
      INSERT INTO activity_hosts (activityId, name, title, avatarUrl, bio, sortOrder)
      VALUES (?, ?, '城市活动主理人', '', '负责本地活动组织、用户服务和活动复盘。', 1)
    `,
    [activityId, activity.host]
  );
  await connection.execute(
    `
      INSERT INTO activity_sections (activityId, type, title, content, imageUrl, sortOrder)
      VALUES
        (?, 'highlights', '活动亮点', ?, 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80', 1),
        (?, 'agenda', '活动流程', ?, NULL, 2),
        (?, 'notice', '合规说明', '本活动聚焦文化、教育、美育和生活方式学习，不提供算命、改运、破灾、预测财富婚姻疾病等服务。', NULL, 3)
    `,
    [activityId, activity.description, activityId, activity.section, activityId]
  );
}

async function clearActivityChildren(connection, activityId) {
  await connection.execute("DELETE FROM activity_fields WHERE activityId = ?", [activityId]);
  await connection.execute("DELETE FROM activity_hosts WHERE activityId = ?", [activityId]);
  await connection.execute("DELETE FROM activity_sections WHERE activityId = ?", [activityId]);
}

main().catch((error) => {
  console.error(`慢π演示数据准备失败：${error.message}`);
  process.exitCode = 1;
});
