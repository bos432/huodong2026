import { RegistrationAnswer } from "../../shared/domain";

export type RegistrationEligibilityRules = { minAge?: number; maxAge?: number; allowedRegions?: string[]; requirePrivacyConsent?: boolean; allowCompanions?: boolean; maxCompanions?: number; blacklistPhones?: string[] };

function answerText(answers: RegistrationAnswer[], labels: string[]) {
  const row = answers.find((answer) => labels.some((label) => String(answer.label || "").includes(label)));
  return row ? String(Array.isArray(row.value) ? row.value[0] || "" : row.value || "").trim() : "";
}

export function validateRegistrationEligibility(input: { rules?: RegistrationEligibilityRules | null; answers: RegistrationAnswer[]; phone?: string | null; privacyAccepted?: boolean; companions?: Array<{ name: string }> }) {
  const rules = input.rules || {};
  const phone = String(input.phone || "").replace(/\s+/g, "");
  if (phone && (rules.blacklistPhones || []).map((item) => String(item).replace(/\s+/g, "")).includes(phone)) return "当前账号不可报名该活动";
  if (rules.requirePrivacyConsent && !input.privacyAccepted) return "请阅读并同意隐私授权后报名";
  const companions = input.companions || [];
  if (companions.length && !rules.allowCompanions) return "该活动不允许添加同行人";
  if (companions.length > Number(rules.maxCompanions || 0)) return `同行人最多 ${rules.maxCompanions || 0} 人`;
  if (companions.some((item) => !String(item.name || "").trim())) return "请填写同行人姓名";
  const ageText = answerText(input.answers, ["年龄"]);
  const age = ageText ? Number(ageText) : NaN;
  if ((rules.minAge !== undefined || rules.maxAge !== undefined) && !Number.isFinite(age)) return "请填写有效年龄";
  if (rules.minAge !== undefined && age < rules.minAge) return `报名年龄不能低于 ${rules.minAge} 岁`;
  if (rules.maxAge !== undefined && age > rules.maxAge) return `报名年龄不能高于 ${rules.maxAge} 岁`;
  const region = answerText(input.answers, ["地区", "城市", "所在地"]);
  if (rules.allowedRegions?.length && !rules.allowedRegions.some((item) => region.includes(item))) return "当前地区不在活动报名范围内";
  return null;
}
