import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");
const page = fs.readFileSync(path.join(repoRoot, "apps/admin/src/views/Waitlists.vue"), "utf8");

describe("waitlist state contract", () => {
  it("protects option and list reads with generations and validation", () => {
    expect(page).toContain("const listGeneration = ref(0)");
    expect(page).toContain("const activitiesGeneration = ref(0)");
    expect(page).toContain("const snapshot = querySnapshot()");
    expect(page).toContain("generation !== listGeneration.value || !sameQuery(snapshot)");
    expect(page).toContain("候补列表响应格式无效");
    expect(page).toContain("活动选项响应格式无效");
    expect(page).toContain("Promise.allSettled([loadActivities(), load()])");
  });

  it("clears stale rows, totals and options before reads", () => {
    expect(page).toContain("rows.value = []");
    expect(page).toContain("total.value = 0");
    expect(page).toContain("activities.value = []");
    expect(page).toContain("重试候补列表");
  });

  it("locks and revalidates promote and cancel targets", () => {
    expect(page).toContain("const scopeLocked = computed(");
    expect(page).toContain('target.status !== "waiting"');
    expect(page).toContain('current.status !== "waiting"');
    expect(page).toContain("generation !== listGeneration.value || !sameQuery(snapshot)");
    expect(page).toContain(':disabled="scopeLocked" :total="total"');
  });
});
