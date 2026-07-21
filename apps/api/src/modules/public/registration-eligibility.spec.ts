import { describe, expect, it } from "vitest";
import { FieldType } from "../../shared/domain";
import { validateRegistrationEligibility } from "./registration-eligibility";

const answers: any[] = [{ fieldId: 1, label: "年龄", type: FieldType.Text, value: "25" }, { fieldId: 2, label: "所在城市", type: FieldType.Text, value: "上海市" }];

describe("registration eligibility", () => {
  it("validates privacy, age and region", () => {
    expect(validateRegistrationEligibility({ rules: { requirePrivacyConsent: true }, answers })).toContain("隐私");
    expect(validateRegistrationEligibility({ rules: { minAge: 30 }, answers, privacyAccepted: true })).toContain("30");
    expect(validateRegistrationEligibility({ rules: { allowedRegions: ["北京"] }, answers, privacyAccepted: true })).toContain("地区");
    expect(validateRegistrationEligibility({ rules: { minAge: 18, allowedRegions: ["上海"] }, answers, privacyAccepted: true })).toBeNull();
  });
  it("validates blacklist and companions", () => {
    expect(validateRegistrationEligibility({ rules: { blacklistPhones: ["13800000000"] }, answers, phone: "13800000000" })).toContain("不可报名");
    expect(validateRegistrationEligibility({ rules: { allowCompanions: true, maxCompanions: 1 }, answers, companions: [{ name: "甲" }, { name: "乙" }] })).toContain("最多");
  });
});
