export type MemberSegmentRules = {
  levelIds?: number[];
  minPoints?: number;
  maxPoints?: number;
  minGrowth?: number;
  maxGrowth?: number;
  minSpent?: number;
  maxSpent?: number;
  minRegistrations?: number;
  minCheckIns?: number;
  activeWithinDays?: number;
  inactiveForDays?: number;
  sourceChannels?: string[];
  anyTags?: string[];
  allTags?: string[];
};

export const MEMBER_SEGMENT_RULE_KEYS = ["levelIds", "minPoints", "maxPoints", "minGrowth", "maxGrowth", "minSpent", "maxSpent", "minRegistrations", "minCheckIns", "activeWithinDays", "inactiveForDays", "sourceChannels", "anyTags", "allTags"] as const;

const numbers = (value: unknown) => Array.from(new Set((Array.isArray(value) ? value : []).map(Number).filter(item => Number.isInteger(item) && item > 0))).slice(0, 100);
const texts = (value: unknown) => Array.from(new Set((Array.isArray(value) ? value : []).map(item => String(item || "").trim()).filter(Boolean))).slice(0, 100);
const optionalNumber = (value: unknown, integer = false) => { if (value === "" || value === null || value === undefined) return undefined; const number = Number(value); return Number.isFinite(number) && number >= 0 ? (integer ? Math.trunc(number) : number) : undefined; };

export function normalizeMemberSegmentRules(value: unknown): MemberSegmentRules {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const rules: MemberSegmentRules = {
    levelIds: numbers(input.levelIds), minPoints: optionalNumber(input.minPoints, true), maxPoints: optionalNumber(input.maxPoints, true), minGrowth: optionalNumber(input.minGrowth, true), maxGrowth: optionalNumber(input.maxGrowth, true),
    minSpent: optionalNumber(input.minSpent), maxSpent: optionalNumber(input.maxSpent), minRegistrations: optionalNumber(input.minRegistrations, true), minCheckIns: optionalNumber(input.minCheckIns, true),
    activeWithinDays: optionalNumber(input.activeWithinDays, true), inactiveForDays: optionalNumber(input.inactiveForDays, true), sourceChannels: texts(input.sourceChannels), anyTags: texts(input.anyTags), allTags: texts(input.allTags)
  };
  return Object.fromEntries(Object.entries(rules).filter(([, item]) => item !== undefined && (!Array.isArray(item) || item.length))) as MemberSegmentRules;
}

export function validateMemberSegmentRulesInput(value: unknown) {
  const errors: string[] = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return { rules: {} as MemberSegmentRules, errors: ["分群规则必须为对象"] };
  const input = value as Record<string, unknown>;
  const allowed = new Set<string>(MEMBER_SEGMENT_RULE_KEYS);
  const unknown = Object.keys(input).filter((key) => !allowed.has(key));
  if (unknown.length) errors.push(`不支持的分群规则字段：${unknown.join("、")}`);

  const integerFields = ["minPoints", "maxPoints", "minGrowth", "maxGrowth", "minRegistrations", "minCheckIns", "activeWithinDays", "inactiveForDays"];
  for (const key of integerFields) {
    const raw = input[key];
    if (raw === undefined || raw === null || raw === "") continue;
    const number = Number(raw);
    if (!Number.isInteger(number) || number < 0) errors.push(`${key} 必须为非负整数`);
  }
  for (const key of ["minSpent", "maxSpent"]) {
    const raw = input[key];
    if (raw === undefined || raw === null || raw === "") continue;
    const number = Number(raw);
    if (!Number.isFinite(number) || number < 0) errors.push(`${key} 必须为非负数`);
  }
  if (input.levelIds !== undefined && (!Array.isArray(input.levelIds) || input.levelIds.some((item) => !Number.isInteger(Number(item)) || Number(item) <= 0))) errors.push("levelIds 必须为正整数数组");
  if (Array.isArray(input.levelIds) && input.levelIds.length > 100) errors.push("levelIds 最多 100 项");
  for (const key of ["sourceChannels", "anyTags", "allTags"]) {
    const raw = input[key];
    if (raw !== undefined && (!Array.isArray(raw) || raw.some((item) => typeof item !== "string" || !item.trim()))) errors.push(`${key} 必须为非空字符串数组`);
    if (Array.isArray(raw) && raw.length > 100) errors.push(`${key} 最多 100 项`);
  }
  for (const key of ["anyTags", "allTags"]) if (Array.isArray(input[key]) && input[key].some((item) => String(item).trim().length > 40)) errors.push(`${key} 单项不能超过 40 个字符`);
  if (Array.isArray(input.sourceChannels) && input.sourceChannels.some((item) => !["h5", "mp_weixin", "admin"].includes(String(item)))) errors.push("sourceChannels 包含不支持的来源渠道");

  const rules = normalizeMemberSegmentRules(input);
  for (const [minKey, maxKey] of [["minPoints", "maxPoints"], ["minGrowth", "maxGrowth"], ["minSpent", "maxSpent"]] as const) {
    if (rules[minKey] !== undefined && rules[maxKey] !== undefined && Number(rules[minKey]) > Number(rules[maxKey])) errors.push(`${minKey} 不能大于 ${maxKey}`);
  }
  if (rules.activeWithinDays !== undefined && rules.inactiveForDays !== undefined && rules.activeWithinDays < rules.inactiveForDays) errors.push("近几日活跃与沉睡天数范围互相冲突");
  return { rules, errors: Array.from(new Set(errors)) };
}
