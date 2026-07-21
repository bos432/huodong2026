import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../../../..");
const page = readFileSync(join(root, "apps/admin/src/views/Agents.vue"), "utf8");

describe("payment account state contract", () => {
  it("keeps options, agents, and accounts as independently recoverable sections", () => {
    expect(page).toContain('const optionsError = ref("")');
    expect(page).toContain('const agentsError = ref("")');
    expect(page).toContain('const accountsError = ref("")');
    expect(page).toContain("重试商家选项");
    expect(page).toContain("重试代理列表");
    expect(page).toContain("重试支付账户");
    expect(page).toContain("tenants.value = []");
    expect(page).toContain("agents.value = []");
    expect(page).toContain("accounts.value = []");
  });

  it("rejects stale reads with request generations and scope snapshots", () => {
    expect(page).toContain("const optionsRequestId = ref(0)");
    expect(page).toContain("const agentsRequestId = ref(0)");
    expect(page).toContain("const accountsRequestId = ref(0)");
    expect(page).toContain("requestId !== agentsRequestId.value || snapshot !== scopeSnapshot()");
    expect(page).toContain("requestId !== accountsRequestId.value || snapshot !== scopeSnapshot()");
    expect(page).toContain("requestId !== optionsRequestId.value || tenantId !== filters.tenantId");
  });

  it("binds agent and account writes to the original record and list generation", () => {
    expect(page).toContain("const agentTarget = ref<");
    expect(page).toContain("const accountTarget = ref<");
    expect(page).toContain("target.generation !== agentsRequestId.value");
    expect(page).toContain("target.generation !== accountsRequestId.value");
    expect(page).toContain("代理目标或筛选范围已变化");
    expect(page).toContain("支付账户目标或筛选范围已变化");
  });

  it("prevents existing accounts from changing agent or provider", () => {
    expect(page).toContain("既有支付账户不能变更代理或渠道");
    expect(page).toContain(':disabled="Boolean(editingAccountId) || savingAccount"');
  });

  it("locks the page scope while dialogs or writes are active", () => {
    expect(page).toContain("const operationLocked = computed(() => agentDialog.value || accountDialog.value || savingAgent.value || savingAccount.value)");
    expect(page).toContain(':disabled="scopeLocked" placeholder="全部商家"');
    expect(page).toContain(':disabled="scopeLocked" maxlength="120"');
    expect(page).toContain(':disabled="scopeLocked" placeholder="全部渠道"');
    expect(page).toContain(':disabled="scopeLocked">包含停用</el-checkbox>');
  });
});
