import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const service = readFileSync(join(process.cwd(), "src/modules/admin/admin.service.ts"), "utf8");
const controller = readFileSync(join(process.cwd(), "src/modules/admin/admin.controller.ts"), "utf8");
const page = readFileSync(join(process.cwd(), "../admin/src/views/UnifiedOrders.vue"), "utf8");

describe("unified order governance contract", () => {
  it("returns whitelist order and user projections instead of raw entities", () => {
    const row = service.slice(service.indexOf("private unifiedOrderRow("), service.indexOf("private unifiedPaymentRow("));
    expect(row).toContain("phone: maskPhone(user.phone)");
    expect(row).toContain("tenant ? { id: tenant.id, code: tenant.code, name: tenant.name }");
    expect(row).not.toContain("snapshot:");
    expect(row).not.toContain("passwordHash");
    expect(row).not.toContain("openid");
    const snapshot = service.slice(service.indexOf("private sanitizeUnifiedOrderSnapshot("), service.indexOf("private async applyUnifiedMallOrderScope("));
    expect(snapshot).toContain("/address|receiver|contact/i.test(childKey)");
  });

  it("enforces activity data scope and mall merchant authorization", () => {
    const list = service.slice(service.indexOf("async unifiedOrders("), service.indexOf("async unifiedOrderDetail("));
    const detail = service.slice(service.indexOf("async unifiedOrderDetail("), service.indexOf("async exportUnifiedOrders("));
    expect(list).toContain('applyAdminActivityDataScope(builder, "activity", admin?.dataScope)');
    expect(detail).toContain('applyAdminActivityDataScope(builder, "activity", admin?.dataScope)');
    expect(list).toContain('await this.applyUnifiedMallOrderScope(builder, "merchant", admin)');
    expect(detail).toContain('await this.applyUnifiedMallOrderScope(builder, "merchant", admin)');
  });

  it("separates business visibility and export permission", () => {
    const permission = service.slice(service.indexOf("private unifiedOrderBusinessTypes("), service.indexOf("private unifiedOrderRow("));
    expect(permission).toContain('permissions.includes("order.view")');
    expect(permission).toContain('permissions.includes("course_order.view")');
    expect(permission).toContain('permissions.includes("mall.order.view")');
    expect(controller).toContain('@Get("unified-orders/export")');
    expect(controller).toContain('@Get("unified-orders/:businessType/:id")');
  });

  it("caps exports and exposes detail and export controls on PC", () => {
    const exportMethod = service.slice(service.indexOf("async exportUnifiedOrders("), service.indexOf("private unifiedOrderBusinessTypes("));
    expect(exportMethod).toContain("first.total > 10000");
    expect(exportMethod).toContain('this.logExport(admin, "unified_orders"');
    expect(page).toContain("canExportOrders");
    expect(page).toContain("/admin/unified-orders/export");
    expect(page).toContain("/admin/unified-orders/${encodeURIComponent(row.businessType)}/${row.id}");
  });
});
