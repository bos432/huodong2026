import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entitiesDir = path.join(repoRoot, "apps", "api", "src", "entities");
const outputFile = path.join(repoRoot, "apps", "admin", "src", "generated", "database-table-catalog.ts");

const tokenLabels = {
  access: "访问权限", account: "账户", activity: "活动", ad: "广告", admin: "管理员", adjustment: "调整", advertiser: "广告主",
  aid: "援助", alert: "告警", ambassador: "文化大使", analytics: "分析", announcement: "公告",
  application: "申请", approval: "审批", appeal: "申诉", assessment: "测验", attendance: "出勤", address: "地址",
  agent: "代理", anomaly: "异常", answer: "答案", attempt: "作答", audit: "审核", award: "授予", badge: "勋章",
  behavior: "行为", brand: "品牌", browse: "浏览", business: "业务", buy: "购买", calculation: "计算", callback: "回调",
  campaign: "投放", cart: "购物车", case: "案例", category: "分类", certificate: "证书", credential: "凭证", channel: "渠道", chapter: "章节", charity: "公益",
  change: "变更", check: "检查", checkout: "结算确认", claim: "领取", code: "码", commission: "佣金", community: "社区",
  comment: "评论", company: "公司", content: "内容", contract: "合同", contribution: "贡献", conversion: "转化",
  coupon: "优惠券", course: "课程", daily: "每日", decoration: "装修", definition: "定义", disbursement: "拨付",
  event: "事件", favorite: "收藏", field: "字段", flash: "秒杀", follow: "关注", follower: "关注关系", followup: "跟进", forum: "论坛",
  fund: "资金", grant: "授权", group: "分组", history: "历史", hit: "命中", homepage: "首页", host: "主办方",
  hour: "工时", inventory: "库存", invite: "邀请", item: "明细", job: "任务", keyword: "关键词", landing: "落地页",
  learning: "学习", lesson: "课时", level: "等级", like: "点赞", limit: "限制", line: "行项目", log: "日志", login: "登录", logistics: "物流",
  import: "导入", mall: "商城", marketing: "营销", material: "材料", member: "会员", merchant: "商户", message: "消息",
  metric: "指标", miniprogram: "小程序", moderator: "版主", notification: "通知", official: "官方", operation: "操作", order: "订单", partner: "合作伙伴",
  payment: "支付", point: "积分", popup: "弹窗", preference: "偏好", product: "商品", profile: "档案", publication: "发布",
  post: "帖子", project: "项目", promotion: "推广", proof: "证明", qualification: "资质", qa: "答疑", question: "题目",
  rate: "频控", record: "记录", redemption: "兑换", refund: "退款", region: "区域", registration: "报名", release: "发布", social: "社交",
  reply: "回复", report: "举报", revenue: "收入", run: "任务",
  resource: "资源", review: "评价", risk: "风险", rule: "规则", sanction: "处罚", schedule: "计划",
  section: "模块", segment: "分群", service: "服务", setting: "设置", settlement: "结算", share: "分享", space: "空间",
  sale: "销售", shipment: "发货", sku: "SKU", snapshot: "快照", stat: "统计", statement: "账单", subscription: "订阅", support: "客服", tag: "标签",
  task: "任务", teacher: "讲师", template: "模板", tenant: "商家", ticket: "票种", tracking: "轨迹", training: "培训",
  topic: "主题", transaction: "流水", transfer: "转账", type: "类型", update: "进展", usage: "使用", user: "用户", version: "版本", view: "访问", visit: "访问",
  volunteer: "志愿者", wallet: "钱包", waitlist: "候补", wechat: "微信", work: "工作", workflow: "流程"
};

const tableLabelOverrides = {
  activity_recap_versions: "活动复盘版本",
  ad_advertisers: "广告主",
  check_ins: "核销记录",
  check_in_points: "核销点",
  checkin_tasks: "打卡任务",
  community_checkins: "社区打卡",
  frequent_registrants: "常用报名人",
  h5_auth_code_logs: "H5认证码日志",
  mall_flash_sales: "商城秒杀活动",
  mall_group_buys: "商城拼团活动",
  mall_group_buy_records: "商城拼团记录",
  miniprogram_release_logs: "小程序发布日志",
  miniprogram_release_settings: "小程序发布设置",
  support_work_orders: "客服工单",
  support_work_order_logs: "客服工单日志"
};

function groupFor(name) {
  if (name.startsWith("mall_")) return "多商户商城";
  if (/^(charity_|aid_|ambassador_|partner_|volunteer_)/.test(name)) return "公益与合作生态";
  if (/^(course_|courses$|community_|forum_|content_|social_)/.test(name) || name === "checkin_tasks") return "课程共修与内容治理";
  if (/^(activity_|activities$|registration|ticket_|coupon_|waitlist|check_in|checkin_|conversion_|share_)/.test(name)) return "活动报名与核销";
  if (/^(order|refund|payment_|agent_|wallet_|user_wallet|fund_risk)/.test(name)) return "订单支付与财务";
  if (/^(user|member_|certificate|invite_|frequent_registrant)/.test(name)) return "用户会员与资产";
  if (/^(homepage_|announcement|notification_|marketing_|ad_|miniprogram_)/.test(name)) return "装修营销与通知";
  return "平台治理与基础设施";
}

function labelFor(name) {
  if (tableLabelOverrides[name]) return tableLabelOverrides[name];
  const tokens = name.split("_");
  const labels = tokens.map((token) => {
    const candidates = [
      token,
      token.replace(/ies$/, "y"),
      token.replace(/es$/, ""),
      token.replace(/s$/, "")
    ];
    const normalized = candidates.find((candidate) => tokenLabels[candidate]);
    return normalized ? tokenLabels[normalized] : token.toUpperCase();
  });
  return labels.join("");
}

function cautionFor(name) {
  if (/(wallet|payment|refund|settlement|commission|fund|disbursement|order)/.test(name)) return "涉及金额、权益或对账，禁止直接改删，必须通过业务接口或可回滚迁移并保留审计。";
  if (/(admin|permission|tenant|region|contract|qualification)/.test(name)) return "涉及权限、租户或主体归属，修改前确认数据范围并保留操作记录。";
  if (/(material|profile|application|user|member|volunteer|aid)/.test(name)) return "可能包含个人或敏感信息，查询、导出和清理必须遵循最小权限与隐私要求。";
  if (/(log|event|history|tracking|snapshot|version)/.test(name)) return "属于追踪或审计依据，优先归档，不要直接清空近期数据。";
  return "优先通过后台和业务接口维护；批量修复前先备份并校验关联数据。";
}

const rows = fs.readdirSync(entitiesDir)
  .filter((file) => file.endsWith(".entity.ts"))
  .flatMap((file) => {
    const source = fs.readFileSync(path.join(entitiesDir, file), "utf8");
    const match = source.match(/@Entity\(["']([^"']+)["']\)/);
    if (!match) return [];
    const name = match[1];
    const label = labelFor(name);
    const group = groupFor(name);
    return [{
      group,
      name,
      meaning: `${label}相关业务数据。`,
      business: `${group}模块中的${label}查询、状态流转和关联记录。`,
      caution: cautionFor(name)
    }];
  })
  .sort((a, b) => a.group.localeCompare(b.group, "zh-CN") || a.name.localeCompare(b.name));

const content = `// Generated by scripts/generate-operation-guide-catalog.mjs. Do not edit manually.\n` +
  `export type GeneratedDatabaseTable = { group: string; name: string; meaning: string; business: string; caution: string };\n\n` +
  `export const generatedDatabaseTables: GeneratedDatabaseTable[] = ${JSON.stringify(rows, null, 2)};\n`;

fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(outputFile, content, "utf8");
console.log(`Generated operation guide database catalog: ${rows.length} tables -> ${outputFile}`);
