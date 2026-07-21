import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../../../..");
const page = readFileSync(join(root, "apps/admin/src/views/CourseRefunds.vue"), "utf8");

describe("course refund state contract", () => {
  it("clears stale rows and rejects stale responses", () => {
    expect(page).toContain("const requestId = ref(0)");
    expect(page).toContain("loading.value = true; errorMessage.value = \"\"; rows.value = []");
    expect(page).toContain("currentRequestId !== requestId.value || snapshot !== scopeSnapshot()");
    expect(page).toContain("课程退款响应格式无效");
  });

  it("validates the course id before sending a request", () => {
    expect(page).toContain('if (!/^\\d+$/.test(value) || Number(value) <= 0) throw new Error("课程编号必须是正整数")');
    expect(page).toContain("courseId = courseIdParam()");
  });

  it("binds review and confirmation to current status and filters", () => {
    expect(page).toContain('currentRow(row.id, ["pending"])');
    expect(page).toContain("const allowedStatuses = success ?");
    expect(page).toContain("generation !== requestId.value");
    expect(page).toContain("退款单或筛选范围已变化");
  });

  it("shows current-list summaries that reset with failed data", () => {
    expect(page).toContain("const summary = computed");
    for (const label of ["退款单", "待审核", "通道处理中", "处理失败"]) expect(page).toContain(`<span>${label}</span>`);
  });

  it("locks filters and all row actions from confirmation start", () => {
    expect(page).toContain("const scopeLocked = computed(() => loading.value || Boolean(actionKey.value))");
    expect(page).toContain(':disabled="scopeLocked" placeholder="全部状态"');
    expect(page).toContain(':disabled="scopeLocked" maxlength="12"');
    expect(page).toContain(':disabled="Boolean(actionKey)" @click="review(row,\'reject\')"');
  });
});
