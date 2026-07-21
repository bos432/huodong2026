import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(process.cwd());
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("agent settlement permission and privacy contract", () => {
  const permissions = read("src/modules/admin/admin-permissions.ts");
  const controller = read("src/modules/admin/admin.controller.ts");
  const service = read("src/modules/admin/admin.service.ts");
  const dto = read("src/modules/admin/dto.ts");
  const adminView = read("../admin/src/views/AgentSettlements.vue");
  const adminRouter = read("../admin/src/router.ts");

  it("defines six read-first permissions and dedicated routes", () => {
    for (const permission of ["agent_settlement.view", "agent_settlement.manage", "agent_settlement.pay", "agent_settlement.transfer", "agent_settlement.sensitive", "agent_settlement.export"]) {
      expect(permissions).toContain(`{ key: "${permission}"`);
    }
    expect(permissions).toContain('"agent_settlement.sensitive": ["agent_settlement.view"]');
    expect(controller).toContain('@Get("agent-settlements/options")');
    expect(controller).toContain('@Get("agent-settlements/:id/details")');
    expect(controller).toContain('@Get("agent-settlements/export")');
  });

  it("uses bounded paging, strict filters, and independent export selection", () => {
    expect(dto).toContain('status?: "draft" | "pending_review" | "approved" | "paid" | "rejected" | "cancelled"');
    expect(dto).toContain('@Max(100) pageSize?: number');
    expect(service).toContain("async listAgentSettlements");
    expect(service).toContain("pageSize = Math.min");
    expect(service).toContain("agentSettlementQuery(query, admin).take(10000)");
    expect(service).not.toContain("return builder.take(300).getMany()");
  });

  it("projects settlement details instead of returning eager finance entities", () => {
    expect(service).toContain("publicAgentSettlementTransaction");
    expect(service).toContain("publicAgentSettlementRefund");
    expect(service).toContain("publicAgentSettlementTransfer");
    expect(service).toContain("sensitiveMasked: !includeSensitive");
    expect(service).not.toContain("transactions: recalculated.transactionRows,");
    expect(service).not.toContain("refunds: recalculated.refundRows,");
    expect(service).not.toContain("transfers,\n      auditLogs,");
  });

  it("serializes generation and money state transitions", () => {
    expect(service).toContain("withAgentSettlementNamedLock");
    expect(service).toContain('SELECT GET_LOCK(?, 10) AS acquired');
    expect(service).toContain('setLock("pessimistic_write")');
    expect(service).toContain("updateAgentSettlementWithLock");
    expect(service).toContain('withAgentSettlementNamedLock("agent-settlement:transfer-scan"');
  });

  it("gates PC actions and uses settlement-specific options", () => {
    expect(adminView).toContain('canAccess(["agent_settlement.manage"])');
    expect(adminView).toContain('canAccess(["agent_settlement.pay"])');
    expect(adminView).toContain('canAccess(["agent_settlement.transfer"])');
    expect(adminView).toContain('canAccess(["agent_settlement.sensitive"])');
    expect(adminView).toContain('canAccess(["agent_settlement.export"])');
    expect(adminView).toContain('"/admin/agent-settlements/options"');
    expect(adminView).toContain("<el-pagination");
    expect(adminView).not.toContain('"/admin/agents"');
    expect(adminRouter).toContain('{ path: "/agent-settlements", roles: ["agent_settlement.view"], scope: "tenant" }');
  });
});
