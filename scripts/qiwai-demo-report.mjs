import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const apiRequire = createRequire(path.join(root, "apps/api/package.json"));
const mysql = apiRequire("mysql2/promise");
const outputFile = process.env.QIWAI_REPORT_FILE || "docs/qiwai-demo-sample-report.md";

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

function money(value) {
  return Number(value || 0).toFixed(2);
}

function pct(numerator, denominator) {
  if (!denominator) return "0.0%";
  return `${((Number(numerator || 0) / Number(denominator || 0)) * 100).toFixed(1)}%`;
}

function statusText(row) {
  const issues = [];
  if (Number(row.activityCount || 0) < 2) issues.push("活动不足 2 场");
  if (Number(row.registrationCount || 0) === 0) issues.push("暂无报名");
  if (Number(row.paidOrderCount || 0) === 0) issues.push("暂无已收款订单");
  if (Number(row.checkInCount || 0) === 0) issues.push("暂无签到");
  if (Number(row.refundRateValue || 0) > 0.05) issues.push("退款率偏高");
  return issues.length ? issues.join("、") : "样板健康";
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
    timezone: "+08:00"
  });

  try {
    const [tenants] = await connection.execute(
      `
        SELECT id, code, name, region, contactName, contactPhone
        FROM tenants
        WHERE code LIKE 'qiwai-%'
        ORDER BY code
      `
    );
    if (!tenants.length) throw new Error("未找到 qiwai-* 演示租户，请先执行 npm run seed:qiwai-demo。");

    const rows = [];
    for (const tenant of tenants) {
      const [activityRows] = await connection.execute("SELECT COUNT(*) count FROM activities WHERE tenantId = ?", [tenant.id]);
      const [registrationRows] = await connection.execute(
        `
          SELECT
            COUNT(*) registrationCount,
            SUM(status = 'pending_payment') pendingPaymentCount,
            SUM(status = 'pending_review') pendingReviewCount,
            SUM(status = 'approved') approvedCount,
            SUM(status = 'checked_in') checkedInRegistrationCount,
            SUM(status = 'cancelled') cancelledCount
          FROM registrations
          WHERE tenantId = ?
        `,
        [tenant.id]
      );
      const [orderRows] = await connection.execute(
        `
          SELECT
            COUNT(*) orderCount,
            SUM(status = 'paid' OR status = 'partially_refunded' OR status = 'refunded') paidOrderCount,
            SUM(CASE WHEN status = 'paid' OR status = 'partially_refunded' OR status = 'refunded' THEN amount ELSE 0 END) gmv,
            SUM(status = 'pending_payment') pendingOrderCount
          FROM orders
          WHERE tenantId = ?
        `,
        [tenant.id]
      );
      const [checkInRows] = await connection.execute(
        `
          SELECT COUNT(*) checkInCount
          FROM check_ins ci
          JOIN registrations r ON r.id = ci.registrationId
          WHERE r.tenantId = ?
        `,
        [tenant.id]
      );
      const [refundRows] = await connection.execute(
        `
          SELECT
            COUNT(*) refundCount,
            SUM(CASE WHEN r.status = 'completed' THEN r.amount ELSE 0 END) refundAmount
          FROM refunds r
          JOIN orders o ON o.id = r.orderId
          WHERE COALESCE(r.tenantId, o.tenantId) = ?
        `,
        [tenant.id]
      );
      const [settlementRows] = await connection.execute(
        `
          SELECT
            COUNT(*) settlementCount,
            SUM(status = 'pending_review') pendingSettlementCount,
            SUM(status = 'approved') approvedSettlementCount,
            SUM(status = 'paid') paidSettlementCount,
            SUM(CASE WHEN status IN ('approved', 'paid') THEN payableAmount ELSE 0 END) payableAmount,
            SUM(CASE WHEN status = 'paid' THEN payableAmount ELSE 0 END) paidSettlementAmount
          FROM agent_settlements
          WHERE tenantId = ?
        `,
        [tenant.id]
      );
      const metrics = {
        ...tenant,
        activityCount: Number(activityRows[0]?.count || 0),
        registrationCount: Number(registrationRows[0]?.registrationCount || 0),
        pendingPaymentCount: Number(registrationRows[0]?.pendingPaymentCount || 0),
        pendingReviewCount: Number(registrationRows[0]?.pendingReviewCount || 0),
        approvedCount: Number(registrationRows[0]?.approvedCount || 0),
        checkedInRegistrationCount: Number(registrationRows[0]?.checkedInRegistrationCount || 0),
        cancelledCount: Number(registrationRows[0]?.cancelledCount || 0),
        orderCount: Number(orderRows[0]?.orderCount || 0),
        paidOrderCount: Number(orderRows[0]?.paidOrderCount || 0),
        gmv: Number(orderRows[0]?.gmv || 0),
        pendingOrderCount: Number(orderRows[0]?.pendingOrderCount || 0),
        checkInCount: Number(checkInRows[0]?.checkInCount || 0),
        refundCount: Number(refundRows[0]?.refundCount || 0),
        refundAmount: Number(refundRows[0]?.refundAmount || 0),
        settlementCount: Number(settlementRows[0]?.settlementCount || 0),
        pendingSettlementCount: Number(settlementRows[0]?.pendingSettlementCount || 0),
        approvedSettlementCount: Number(settlementRows[0]?.approvedSettlementCount || 0),
        paidSettlementCount: Number(settlementRows[0]?.paidSettlementCount || 0),
        payableAmount: Number(settlementRows[0]?.payableAmount || 0),
        paidSettlementAmount: Number(settlementRows[0]?.paidSettlementAmount || 0)
      };
      metrics.netRevenue = metrics.gmv - metrics.refundAmount;
      metrics.checkInRate = pct(metrics.checkInCount, metrics.approvedCount + metrics.checkedInRegistrationCount);
      metrics.refundRate = pct(metrics.refundAmount, metrics.gmv);
      metrics.refundRateValue = metrics.gmv ? metrics.refundAmount / metrics.gmv : 0;
      metrics.averagePaidOrderAmount = metrics.paidOrderCount ? metrics.gmv / metrics.paidOrderCount : 0;
      metrics.status = statusText(metrics);
      rows.push(metrics);
    }

    const total = rows.reduce(
      (sum, row) => ({
        activityCount: sum.activityCount + row.activityCount,
        registrationCount: sum.registrationCount + row.registrationCount,
        paidOrderCount: sum.paidOrderCount + row.paidOrderCount,
        gmv: sum.gmv + row.gmv,
        refundAmount: sum.refundAmount + row.refundAmount,
        netRevenue: sum.netRevenue + row.netRevenue,
        checkInCount: sum.checkInCount + row.checkInCount,
        settlementCount: sum.settlementCount + row.settlementCount,
        paidSettlementCount: sum.paidSettlementCount + row.paidSettlementCount,
        payableAmount: sum.payableAmount + row.payableAmount,
        paidSettlementAmount: sum.paidSettlementAmount + row.paidSettlementAmount,
        approvedBase: sum.approvedBase + row.approvedCount + row.checkedInRegistrationCount
      }),
      { activityCount: 0, registrationCount: 0, paidOrderCount: 0, gmv: 0, refundAmount: 0, netRevenue: 0, checkInCount: 0, settlementCount: 0, paidSettlementCount: 0, payableAmount: 0, paidSettlementAmount: 0, approvedBase: 0 }
    );

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");
    const lines = [
      "# 慢π三城样板经营报告",
      "",
      `生成时间：${now}`,
      "",
      "## 总览",
      "",
      "| 指标 | 数值 |",
      "| --- | ---: |",
      `| 城市合伙人 | ${rows.length} |`,
      `| 样板活动 | ${total.activityCount} |`,
      `| 报名数 | ${total.registrationCount} |`,
      `| 已收款订单 | ${total.paidOrderCount} |`,
      `| GMV | ${money(total.gmv)} |`,
      `| 退款金额 | ${money(total.refundAmount)} |`,
      `| 净收入 | ${money(total.netRevenue)} |`,
      `| 签到数 | ${total.checkInCount} |`,
      `| 签到率 | ${pct(total.checkInCount, total.approvedBase)} |`,
      `| 结算单 | ${total.settlementCount} |`,
      `| 已打款结算单 | ${total.paidSettlementCount} |`,
      `| 应结算金额 | ${money(total.payableAmount)} |`,
      `| 已打款金额 | ${money(total.paidSettlementAmount)} |`,
      "",
      "## 城市明细",
      "",
      "| 城市 | 商家 | 活动 | 报名 | 已收款订单 | GMV | 退款 | 净收入 | 签到率 | 状态 |",
      "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
      ...rows.map((row) => `| ${row.region || "-"} | ${row.name} | ${row.activityCount} | ${row.registrationCount} | ${row.paidOrderCount} | ${money(row.gmv)} | ${money(row.refundAmount)} | ${money(row.netRevenue)} | ${row.checkInRate} | ${row.status} |`),
      "",
      "## 结算明细",
      "",
      "| 城市 | 商家 | 结算单 | 待审核 | 已审核待打款 | 已打款 | 应结算 | 已打款金额 |",
      "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |",
      ...rows.map((row) => `| ${row.region || "-"} | ${row.name} | ${row.settlementCount} | ${row.pendingSettlementCount} | ${row.approvedSettlementCount} | ${row.paidSettlementCount} | ${money(row.payableAmount)} | ${money(row.paidSettlementAmount)} |`),
      "",
      "## 运营判断",
      "",
      "- 第一阶段达标线：每个城市至少 2 场样板活动，至少跑通 1 笔报名、收款、签到、财务闭环。",
      "- 重点观察 GMV、签到率、退款率、活动复购线索和单城是否能每月稳定举办 2 场活动。",
      "- 结算维度重点观察已审核待打款金额、已打款金额和跨城市结算隔离，避免城市合伙人对账不清。",
      "- 当前报告来自本地演示库，适合演示和验收；正式运营时应按自然月和城市合伙人维度导出。",
      "",
      "## 下一步动作",
      "",
      "- 对暂无报名或暂无收款的城市，优先组织 1 场低价体验课验证报名转化。",
      "- 对已跑通闭环的城市，补充活动复盘、用户标签和会员转化动作。",
      "- 对退款率偏高的城市，复查活动详情页宣传、报名须知和客服售前话术。",
      ""
    ];

    const file = path.isAbsolute(outputFile) ? outputFile : path.join(root, outputFile);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${lines.join("\n")}\n`, "utf8");
    console.log(`慢π样板经营报告已生成：${path.relative(root, file) || file}`);
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error(`慢π样板经营报告生成失败：${error.message}`);
  process.exitCode = 1;
});
