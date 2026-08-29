import { describe, expect, it } from "vitest";
import { isWechatTemplateFieldKey } from "./wechat-template-field";

describe("wechat template field keys", () => {
  it("accepts standard fields, including underscored types", () => {
    expect(["thing1", "time11", "date3", "phrase2", "amount40", "character_string6"].every(isWechatTemplateFieldKey)).toBe(true);
  });

  it("rejects values that are not provider field keys", () => {
    expect(["", "character_string", "{{thing1}}", "thing-1", "thing 1", "1thing"].some((value) => isWechatTemplateFieldKey(value))).toBe(false);
  });
});
