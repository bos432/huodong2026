import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../../../..");
const page = readFileSync(join(root, "apps/admin/src/views/AgentSettlements.vue"), "utf8");

describe("agent settlement state contract", () => {
  it("protects options, list, capability, and detail reads with generations", () => {
    for (const name of ["optionsRequestId", "listRequestId", "capabilityRequestId", "detailRequestId"]) expect(page).toContain(`const ${name} = ref(0)`);
    expect(page).toContain("snapshot !== scopeSnapshot()");
    expect(page).toContain("scope !== scopeSnapshot()");
  });

  it("clears stale list, summary, options, and capability data before requests", () => {
    expect(page).toContain("rows.value = []");
    expect(page).toContain("serverSummary.value = { total: 0, pending: 0, paid: 0, payableAmount: \"0.00\" }");
    expect(page).toContain("agents.value = []");
    expect(page).toContain("tenants.value = []");
    expect(page).toContain("transferCapability.value = null");
  });

  it("binds generation, payment, and state actions to the current scope", () => {
    expect(page).toContain("const generateTarget = ref<");
    expect(page).toContain("const paidTargetContext = ref<");
    expect(page).toContain("currentRow(row.id, expectedStatus)");
    expect(page).toContain("结算单或筛选范围已变化");
  });

  it("exports every active list filter", () => {
    expect(page).toContain('params.set("tenantId", String(filters.tenantId))');
    expect(page).toContain('params.set("agentId", String(filters.agentId))');
    expect(page).toContain('params.set("keyword", filters.keyword.trim())');
    expect(page).toContain('params.set("status", filters.status)');
  });

  it("locks filters and paging while dialogs or operations are active", () => {
    expect(page).toContain("const operationLocked = computed(() => dialogVisible.value || paidDialogVisible.value || detailVisible.value");
    expect(page).toContain(':disabled="scopeLocked" placeholder="全部代理"');
    expect(page).toContain(':disabled="scopeLocked" maxlength="120"');
    expect(page).toContain(':disabled="scopeLocked" :current-page="page"');
  });
});
