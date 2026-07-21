import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(__dirname, "../../../../..");
const page = fs.readFileSync(path.join(repoRoot, "apps/admin/src/views/TicketTypes.vue"), "utf8");

describe("ticket type state contract", () => {
  it("protects option and ticket reads with generations and validation", () => {
    expect(page).toContain("const ticketGeneration = ref(0)");
    expect(page).toContain("const activityGeneration = ref(0)");
    expect(page).toContain("generation !== ticketGeneration.value || filterActivityId !== selectedActivityId.value");
    expect(page).toContain("活动选项响应格式无效");
    expect(page).toContain("票种列表响应格式无效");
    expect(page).toContain("Promise.allSettled([loadActivities(), loadTickets()])");
  });

  it("clears stale options and tickets before reads", () => {
    expect(page).toContain("activities.value = []");
    expect(page).toContain("rows.value = []");
    expect(page).toContain("ticketErrorMessage ? '票种加载失败' : '暂无票种'");
    expect(page).toContain("重试活动列表");
    expect(page).toContain("重试票种列表");
  });

  it("locks the page and protects the edit target", () => {
    expect(page).toContain("const scopeLocked = computed(");
    expect(page).toContain("dialogTicketGeneration.value !== ticketGeneration.value");
    expect(page).toContain("current.activity?.id !== editingActivityId.value");
    expect(page).toContain("既有票种不能变更所属活动");
    expect(page).toContain(':disabled="editingId !== null || saving"');
    expect(page).toContain(':close-on-click-modal="!saving"');
  });
});
