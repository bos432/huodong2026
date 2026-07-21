import { describe, expect, it } from "vitest";
import { maskContactHandle, maskPhone } from "./data-masking";
describe("support data masking", () => {
  it("masks mainland mobile numbers", () => expect(maskPhone("13812345678")).toBe("138****5678"));
  it("does not expose short identifiers", () => expect(maskPhone("123456")).toBe("12***56"));
  it("keeps empty values empty", () => expect(maskPhone(null)).toBe(""));
  it("masks common social contact handles", () => expect(maskContactHandle("wechat_2026")).toBe("we****26"));
  it("does not expose short contact handles", () => expect(maskContactHandle("abc")).toBe("a***c"));
  it("keeps empty contact handles empty", () => expect(maskContactHandle(null)).toBe(""));
});
