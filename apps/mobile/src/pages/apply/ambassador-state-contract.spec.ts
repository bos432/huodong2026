import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./ambassador.vue", import.meta.url), "utf8");

describe("主理人申请入口", () => {
  it("主理人模式使用独立文案，不把旧大使文案带入入口", () => {
    expect(source).toContain("const pageCopy = computed(() => organizerMode.value ? organizerCopy : config)");
    expect(source).toContain("主理人可以做什么");
    expect(source).toContain("主理人申请已提交，审核通过后即可进入主理人工作台。");
    expect(source).toContain("kind: organizerMode.value ? \"partner\" : \"ambassador\"");
  });

  it("申请成功后记录待审核状态", () => {
    expect(source).toContain("uni.setStorageSync(\"organizer_application_status\", \"pending\")");
    expect(source).toContain("已提交，等待审核");
  });
});
