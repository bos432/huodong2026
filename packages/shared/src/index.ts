export enum ActivityStatus {
  Draft = "draft",
  PendingApproval = "pending_approval",
  Rejected = "rejected",
  Open = "open",
  Closed = "closed",
  Cancelled = "cancelled",
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
  Remark = "remark",
  Email = "email",
  Number = "number",
  Date = "date",
  DateTime = "date_time",
  Region = "region",
  Address = "address",
  Attachment = "attachment"
}

export const activityStatusText: Record<ActivityStatus, string> = {
  [ActivityStatus.Draft]: "草稿",
  [ActivityStatus.PendingApproval]: "待平台审核",
  [ActivityStatus.Rejected]: "已驳回",
  [ActivityStatus.Open]: "报名中",
  [ActivityStatus.Closed]: "已下架",
  [ActivityStatus.Cancelled]: "已取消",
  [ActivityStatus.Ended]: "已结束"
};

export const registrationStatusText: Record<RegistrationStatus, string> = {
  [RegistrationStatus.PendingPayment]: "待付款",
  [RegistrationStatus.PendingReview]: "待审核",
  [RegistrationStatus.Approved]: "报名成功",
  [RegistrationStatus.Rejected]: "已拒绝",
  [RegistrationStatus.Cancelled]: "已取消",
  [RegistrationStatus.CheckedIn]: "已签到"
};

export const orderStatusText: Record<OrderStatus, string> = {
  [OrderStatus.PendingPayment]: "待付款",
  [OrderStatus.Paid]: "已付款",
  [OrderStatus.Refunded]: "已退款",
  [OrderStatus.PartiallyRefunded]: "部分退款",
  [OrderStatus.Cancelled]: "已取消",
  [OrderStatus.Closed]: "已关闭"
};

export interface ActivityFieldOption {
  label: string;
  value: string;
}

export interface ActivityFieldDefinition {
  id?: number;
  label: string;
  type: FieldType;
  required: boolean;
  options?: ActivityFieldOption[];
  sortOrder: number;
}

export interface RegistrationAnswer {
  fieldId: number;
  label: string;
  type: FieldType;
  value: string | string[];
}

export interface ApiResult<T> {
  code: number;
  message: string;
  data: T;
}

export type HomepageSectionType =
  | "search_bar"
  | "hero"
  | "announcement_bar"
  | "quick_nav"
  | "category_grid"
  | "featured_activities"
  | "activity_tabs"
  | "activity_feed"
  | "testimonial_feed"
  | "featured_testimonials"
  | "activity_testimonials"
  | "charity_summary"
  | "course_recommendations"
  | "mall_showcase"
  | "brand_story_entry"
  | "image_banner"
  | "rich_text"
  | "bottom_nav"
  | "my_page"
  | "inner_pages";

export interface HomepageSectionView {
  id: number;
  pageKey: string;
  type: HomepageSectionType | string;
  title: string | null;
  subtitle: string | null;
  enabled: boolean;
  sortOrder: number;
  config: Record<string, unknown>;
  layout: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export interface HomepageTenantView {
  id: number;
  code: string;
  name: string;
  region: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
}

export type PublicTenantView = HomepageTenantView;

export interface HomepagePayload {
  sections: HomepageSectionView[];
  fallback: boolean;
  pageKey?: string;
  tenant?: HomepageTenantView | null;
}

export function escapeRichTextHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeRichTextUrl(value: unknown) {
  const url = String(value ?? "").trim().replace(/&amp;/g, "&");
  if (!url) return "";
  if (/^(https?:)?\/\//i.test(url)) return url;
  if (/^\/(uploads|assets|admin|pages)\//i.test(url)) return url;
  if (/^mailto:/i.test(url)) return url;
  return "";
}

const SAFE_RICH_TEXT_HTML_TAGS = new Set([
  "a", "article", "b", "blockquote", "br", "caption", "code", "div", "em", "figcaption", "figure", "h1", "h2", "h3", "h4", "hr", "i", "img", "li", "ol", "p", "pre", "s", "small", "span", "strong", "sub", "sup", "table", "tbody", "td", "th", "thead", "tr", "u", "ul"
]);
const SAFE_RICH_TEXT_VOID_HTML_TAGS = new Set(["br", "hr", "img"]);
const SAFE_RICH_TEXT_STYLE_PROPERTIES = new Set([
  "background", "background-color", "border", "border-bottom", "border-color", "border-left", "border-radius", "border-right", "border-style", "border-top", "border-width", "color", "display", "font-size", "font-style", "font-weight", "height", "line-height", "margin", "margin-bottom", "margin-left", "margin-right", "margin-top", "max-width", "min-height", "padding", "padding-bottom", "padding-left", "padding-right", "padding-top", "text-align", "text-decoration", "vertical-align", "white-space", "width", "word-break"
]);

function safeRichTextStyle(value: string) {
  return value.split(";").map((declaration) => {
    const separator = declaration.indexOf(":");
    if (separator < 1) return "";
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const styleValue = declaration.slice(separator + 1).trim();
    if (!SAFE_RICH_TEXT_STYLE_PROPERTIES.has(property) || !styleValue) return "";
    if (/[<>]|expression\s*\(|url\s*\(|@import|behavior\s*:|-moz-binding/i.test(styleValue)) return "";
    return `${property}:${styleValue}`;
  }).filter(Boolean).join(";");
}

/** Sanitizes the limited HTML layout blocks inserted by the admin editor. */
export function sanitizeRichTextHtml(value: unknown) {
  const source = String(value ?? "")
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/<(script|style|iframe|object|embed|svg|math)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  return source.replace(/<\/?([a-z][a-z0-9]*)\b([^>]*)>/gi, (match, rawTag: string, rawAttributes: string) => {
    const tag = rawTag.toLowerCase();
    if (!SAFE_RICH_TEXT_HTML_TAGS.has(tag)) return "";
    if (match.startsWith("</")) return SAFE_RICH_TEXT_VOID_HTML_TAGS.has(tag) ? "" : `</${tag}>`;

    const attributes: string[] = [];
    const sourceAttributes = String(rawAttributes || "");
    const readAttribute = (name: string) => {
      const result = new RegExp("\\b" + name + "\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s\"'=<>`]+))", "i").exec(sourceAttributes);
      return result ? result[1] ?? result[2] ?? result[3] ?? "" : "";
    };
    const style = safeRichTextStyle(readAttribute("style"));
    if (style) attributes.push(`style=\"${escapeRichTextHtml(style)}\"`);
    const title = readAttribute("title");
    if (title) attributes.push(`title=\"${escapeRichTextHtml(title)}\"`);
    if (tag === "a") {
      const href = safeRichTextUrl(readAttribute("href"));
      if (href) attributes.push(`href=\"${escapeRichTextHtml(href)}\"`);
    }
    if (tag === "img") {
      const src = safeRichTextUrl(readAttribute("src"));
      if (!src) return "";
      attributes.push(`src=\"${escapeRichTextHtml(src)}\"`);
      const alt = readAttribute("alt");
      if (alt) attributes.push(`alt=\"${escapeRichTextHtml(alt)}\"`);
    }
    if (["table", "td", "th"].includes(tag)) {
      for (const name of ["colspan", "rowspan", "width", "height", "align"]) {
        const attribute = readAttribute(name);
        if (attribute && /^[a-z0-9.% -]+$/i.test(attribute)) attributes.push(`${name}=\"${escapeRichTextHtml(attribute)}\"`);
      }
    }
    return `<${tag}${attributes.length ? ` ${attributes.join(" ")}` : ""}>`;
  });
}

function inlineMarkdownToHtml(value: string) {
  let html = escapeRichTextHtml(value);
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, url) => {
    const safeUrl = safeRichTextUrl(url);
    if (!safeUrl) return escapeRichTextHtml(alt);
    return `<img src="${escapeRichTextHtml(safeUrl)}" alt="${escapeRichTextHtml(alt)}" style="max-width:100%;border-radius:8px;margin:8px 0;display:block;" />`;
  });
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
    const safeUrl = safeRichTextUrl(url);
    if (!safeUrl) return escapeRichTextHtml(label);
    return `<a href="${escapeRichTextHtml(safeUrl)}" style="color:#0f766e;text-decoration:underline;">${label}</a>`;
  });
  html = html.replace(/`([^`]+)`/g, "<code style=\"padding:2px 5px;border-radius:4px;background:#f2f4f7;color:#b42318;font-family:monospace;\">$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return html;
}

export function markdownToRichTextHtml(markdown: unknown) {
  const lines = String(markdown ?? "").replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let codeLines: string[] = [];
  let inCode = false;
  let rawHtmlCode = false;
  let listTag: "ul" | "ol" | null = null;

  const closeList = () => {
    if (!listTag) return;
    html.push("</" + listTag + ">");
    listTag = null;
  };
  const openList = (tag: "ul" | "ol") => {
    if (listTag === tag) return;
    closeList();
    html.push("<" + tag + ' style="margin:10px 0 12px;padding-left:22px;color:#344054;font-size:15px;line-height:1.8;">');
    listTag = tag;
  };

  const paragraphStyle = "margin:0 0 13px;color:#344054;font-size:15px;line-height:1.85;white-space:normal;word-break:break-word;";

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.trim().startsWith("```")) {
      if (inCode) {
        if (rawHtmlCode) html.push(sanitizeRichTextHtml(codeLines.join("\n")));
        else html.push(`<pre style="margin:10px 0;padding:10px;border-radius:8px;background:#111827;color:#f9fafb;overflow:auto;white-space:pre-wrap;font-size:13px;line-height:1.55;"><code>${escapeRichTextHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = [];
        inCode = false;
        rawHtmlCode = false;
      } else {
        closeList();
        inCode = true;
        rawHtmlCode = /^```html\s*$/i.test(line.trim());
      }
      continue;
    }
    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }
    if (!line.trim()) {
      closeList();
      continue;
    }
    if (/^([-*_])\1\1+$/.test(line.trim())) {
      closeList();
      html.push('<hr style="border:0;border-top:1px solid #d0d5dd;margin:18px 0;" />');
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (heading) {
      closeList();
      const size = heading[1].length === 1 ? 22 : heading[1].length === 2 ? 19 : 17;
      html.push(`<h${heading[1].length} style="margin:20px 0 10px;color:#172b4d;font-size:${size}px;line-height:1.35;font-weight:800;">${inlineMarkdownToHtml(heading[2])}</h${heading[1].length}>`);
      continue;
    }
    const quote = /^>\s?(.+)$/.exec(line.trim());
    if (quote) {
      closeList();
      html.push(`<blockquote style="margin:10px 0;padding:8px 10px;border-left:3px solid #0f766e;background:#ecfdf5;color:#344054;border-radius:6px;">${inlineMarkdownToHtml(quote[1])}</blockquote>`);
      continue;
    }
    const unorderedList = /^[-*]\s+(.+)$/.exec(line.trim());
    const orderedList = /^\d+\.\s+(.+)$/.exec(line.trim());
    if (unorderedList || orderedList) {
      openList(unorderedList ? "ul" : "ol");
      html.push('<li style="margin:4px 0;">' + inlineMarkdownToHtml((unorderedList || orderedList)![1]) + "</li>");
      continue;
    }
    closeList();
    html.push(`<p style="${paragraphStyle}">${inlineMarkdownToHtml(line.trim())}</p>`);
  }
  if (inCode) {
    if (rawHtmlCode) html.push(sanitizeRichTextHtml(codeLines.join("\n")));
    else html.push(`<pre style="margin:10px 0;padding:10px;border-radius:8px;background:#111827;color:#f9fafb;overflow:auto;white-space:pre-wrap;font-size:13px;line-height:1.55;"><code>${escapeRichTextHtml(codeLines.join("\n"))}</code></pre>`);
  }
  closeList();
  return html.join("");
}

export function markdownToPlainText(markdown: unknown, maxLength = 120) {
  let text = String(markdown ?? "")
    .replace(/```[\s\S]*?```/g, " 代码片段 ")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1 图片 ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[#>*_`~-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (maxLength > 0 && text.length > maxLength) text = `${text.slice(0, maxLength - 1)}…`;
  return text;
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
          ? `「${field}」含有高风险表述「${keyword}」，请改为东方哲学、传统文化、民俗文化或文化活动类表达。`
          : `「${field}」含有需人工确认的表述「${keyword}」，建议弱化为文化解读、体验参与或生活方式表达。`,
      suggestion: "建议使用：易经文化、民俗文化、节气文化、传统哲学、国学经典解读、书法美育、亲子沟通等合规表述。"
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
