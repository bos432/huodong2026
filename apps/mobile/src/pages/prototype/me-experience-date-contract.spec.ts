import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./me.vue", import.meta.url), "utf8");

describe("slow experience date display", () => {
  it("passes an explicit Uni storage method so H5 compiles the API reference", () => {
    expect(source).toContain("getStorageSync: (key) => uni.getStorageSync(key)");
    expect(source).not.toContain("readExperienceRecords(uni)");
  });
  it("uses the shared H5 and mini-program compatible Shanghai formatter", () => {
    expect(source).toContain('import { formatShanghaiDateTime } from "../../tenant-load-guard"');
    expect(source).toContain('return formatShanghaiDateTime(value, "记录时间未知")');
    expect(source).not.toContain(["In", "tl.DateTimeFormat"].join(""));
  });
});
