import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../../../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("payment account permission, privacy, and concurrency contract", () => {
  const permissions = read("apps/api/src/modules/admin/admin-permissions.ts");
  const controller = read("apps/api/src/modules/admin/admin.controller.ts");
  const service = read("apps/api/src/modules/admin/admin.service.ts");
  const page = read("apps/admin/src/views/Agents.vue");
  const migration = read("apps/api/src/migrations/1783860000000-AgentPaymentAccountGovernance.ts");

  it("separates viewing, maintenance, and sensitive access", () => {
    for (const permission of ["payment_account.view", "payment_account.manage", "payment_account.sensitive"]) expect(permissions).toContain(`{ key: "${permission}"`);
    expect(controller).toContain('@Get("payment-accounts/options")');
    expect(controller).toContain('@Query() query: PaymentAccountQueryDto');
    expect(page).toContain('canAccess(["payment_account.manage"])');
    expect(page).toContain('canAccess(["payment_account.sensitive"])');
    expect(page).not.toContain('api.get<any, any[]>("/admin/tenants")');
  });

  it("returns explicit projections and recursively masks payment configuration", () => {
    expect(service).toContain("publicPaymentAccountTenant");
    expect(service).toContain("publicPaymentAccountAgent");
    expect(service).toContain("contactPhone: includeSensitive ? row.contactPhone : maskPhone(row.contactPhone)");
    expect(service).toContain("merchantNo: includeSensitive ? row.merchantNo : this.maskPaymentIdentifier(row.merchantNo)");
    expect(service).toContain("Object.fromEntries(Object.entries(value as Record<string, unknown>)");
    expect(service).toContain('if (next === "***") return previous ?? ""');
    expect(service).toContain("configKeys: Object.keys(config || {}).sort()");
  });

  it("serializes updates and enforces one active provider account per agent", () => {
    expect(service).toContain('.setLock("pessimistic_write")');
    expect(service).toContain("SELECT GET_LOCK(?, 5) AS acquired");
    expect(service).toContain("已存在的支付账户不能迁移到其他代理");
    expect(service).toContain("该代理已存在启用中的同渠道收款账户");
    expect(migration).toContain("IDX_agent_payment_accounts_agent_provider");
  });

  it("keeps PC loading errors, pagination, masked placeholders, and mobile dialogs governed", () => {
    expect(page).toContain('agentsError.value = error.message || "加载代理列表失败"');
    expect(page).toContain('accountsError.value = error.message || "加载支付账户失败"');
    expect(page).toContain('width="min(560px, 100vw)"');
    expect(page).toContain('width="min(760px, 100vw)"');
    expect(page).toContain(':total="agentTotal"');
    expect(page).toContain(':total="accountTotal"');
    expect(page).toContain("星号字段保存时会自动保留原值");
  });
});
