export enum ActivityStatus {
  Draft = "draft",
  PendingApproval = "pending_approval",
  Rejected = "rejected",
  Open = "open",
  Closed = "closed",
  Ended = "ended"
}

export enum RegistrationStatus {
  PendingPayment = "pending_payment",
  PendingReview = "pending_review",
  Approved = "approved",
  Rejected = "rejected",
  Cancelled = "cancelled",
  CheckedIn = "checked_in"
}

export enum OrderStatus {
  PendingPayment = "pending_payment",
  Paid = "paid",
  Refunded = "refunded",
  PartiallyRefunded = "partially_refunded",
  Cancelled = "cancelled",
  Closed = "closed"
}

export enum PaymentMethod {
  Free = "free",
  Offline = "offline",
  Wechat = "wechat",
  Alipay = "alipay",
  Balance = "balance"
}

export enum FieldType {
  Text = "text",
  SingleChoice = "single_choice",
  MultipleChoice = "multiple_choice",
  Phone = "phone",
  IdCard = "id_card",
  Remark = "remark"
}

export interface ActivityFieldOption {
  label: string;
  value: string;
}

export interface RegistrationAnswer {
  fieldId: number;
  label: string;
  type: FieldType;
  value: string | string[];
}

export type ActivityComplianceSeverity = "blocking" | "warning";

export interface ActivityComplianceIssue {
  severity: ActivityComplianceSeverity;
  field: string;
  keyword: string;
  message: string;
  suggestion: string;
}

export interface ActivityComplianceInput {
  title?: string | null;
  description?: string | null;
  notice?: string | null;
  sections?: Array<{ title?: string | null; content?: string | null }>;
}

const ACTIVITY_BLOCKING_COMPLIANCE_KEYWORDS = [
  "算命",
  "改运",
  "改命",
  "破灾",
  "消灾",
  "做法事",
  "法事",
  "预测财富",
  "预测婚姻",
  "预测疾病",
  "保证结果",
  "保证有效",
  "百分百有效",
  "100%有效",
  "100％有效",
  "包治",
  "治愈",
  "根治"
];

const ACTIVITY_WARNING_COMPLIANCE_KEYWORDS = [
  "预测",
  "转运",
  "开运",
  "招财",
  "旺财",
  "催财",
  "命理",
  "八字",
  "占卜",
  "塔罗",
  "风水",
  "疗愈",
  "治病",
  "排毒",
  "保证提升",
  "保证通过",
  "包过",
  "稳赚",
  "保本",
  "无风险"
];

const ACTIVITY_COMPLIANCE_NEGATION_PATTERN = /(不涉及|不提供|不做|不含|禁止|不得|严禁|避免|不承诺|非)/;

function splitComplianceSentences(text: string) {
  return text
    .split(/[。！？!?；;\n\r]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function sentenceShouldSkipCompliance(sentence: string) {
  return ACTIVITY_COMPLIANCE_NEGATION_PATTERN.test(sentence);
}

function collectActivityComplianceText(input: ActivityComplianceInput) {
  const rows: Array<{ field: string; text: string }> = [
    { field: "活动标题", text: input.title || "" },
    { field: "活动介绍", text: input.description || "" },
    { field: "报名须知", text: input.notice || "" }
  ];
  for (const section of input.sections || []) {
    rows.push({ field: `详情模块：${section.title || "未命名"}`, text: section.content || "" });
  }
  return rows;
}

export function checkActivityContentCompliance(input: ActivityComplianceInput) {
  const issues: ActivityComplianceIssue[] = [];
  const seen = new Set<string>();

  const addIssue = (severity: ActivityComplianceSeverity, field: string, keyword: string) => {
    const key = `${severity}:${field}:${keyword}`;
    if (seen.has(key)) return;
    seen.add(key);
    issues.push({
      severity,
      field,
      keyword,
      message:
        severity === "blocking"
          ? `「${field}」含有高风险表述「${keyword}」，请改为东方哲学、传统文化、民俗文化或课程学习类表达。`
          : `「${field}」含有需人工确认的表述「${keyword}」，建议弱化为文化解读、体验学习或生活方式表达。`,
      suggestion: "建议使用：易经文化、民俗文化、节气文化、传统哲学、国学经典解读、书法美育、家庭教育等合规表述。"
    });
  };

  for (const row of collectActivityComplianceText(input)) {
    for (const sentence of splitComplianceSentences(row.text)) {
      if (sentenceShouldSkipCompliance(sentence)) continue;
      for (const keyword of ACTIVITY_BLOCKING_COMPLIANCE_KEYWORDS) {
        if (sentence.includes(keyword)) addIssue("blocking", row.field, keyword);
      }
      for (const keyword of ACTIVITY_WARNING_COMPLIANCE_KEYWORDS) {
        if (sentence.includes(keyword)) addIssue("warning", row.field, keyword);
      }
    }
  }

  return {
    passed: !issues.some((issue) => issue.severity === "blocking"),
    issues,
    blockingIssues: issues.filter((issue) => issue.severity === "blocking"),
    warningIssues: issues.filter((issue) => issue.severity === "warning")
  };
}
