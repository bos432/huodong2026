import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(__dirname, "../../../../..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("coupon and redemption permission contract", () => {
  const service = read("apps/api/src/modules/admin/admin.service.ts");
  const publicService = read("apps/api/src/modules/public/public.service.ts");
  const page = read("apps/admin/src/views/Coupons.vue");
  const router = read("apps/admin/src/router.ts");
  const menu = read("apps/admin/src/navigation/admin-menu.ts");

  it("keeps the PC workbench independently permission guarded", () => {
    expect(page).toContain('hasPermission("coupon.view")');
    expect(page).toContain('hasPermission("coupon.manage")');
    expect(page).toContain('hasPermission("coupon.export")');
    expect(page).toContain('hasPermission("redemption_code.view")');
    expect(page).toContain('hasPermission("redemption_code.manage")');
    expect(page).toContain('hasPermission("redemption_code.export")');
    expect(page).toContain('v-if="canManageCoupons" type="primary"');
    expect(page).toContain('v-if="canManageRedemptions" type="primary"');
    expect(page).toContain('v-if="canExportCoupons"');
    expect(page).toContain('v-if="canExportRedemptions"');
    expect(router).toContain('path: "coupons", component: Coupons, meta: { roles: ["coupon.view", "redemption_code.view"]');
    expect(menu).toContain('label: "优惠券与兑换码", roles: ["coupon.view", "redemption_code.view"]');
  });

  it("uses minimal options and masked record projections", () => {
    expect(page).toContain('api.get<any, { activities: any[] }>("/admin/coupons/options")');
    expect(page).toContain('api.get<any, any>("/admin/redemption-codes/options")');
    expect(page).not.toContain('"/admin/activities"');
    expect(page).toContain('placeholder="请选择真实业务目标"');
    expect(service).toContain('phone: maskPhone(row.user.phone)');
    expect(service).toContain('activity: row.activity ? { id: row.activity.id, title: row.activity.title, status: row.activity.status } : null');
    expect(service).toContain('order: row.order ? { id: row.order.id, orderNo: row.order.orderNo, status: row.order.status } : null');
  });

  it("enforces strict tenant ownership, target ownership, and immutable used benefits", () => {
    expect(service).toContain('if (id) this.assertStrictTenantOwnership(row, admin, "优惠码不存在或不属于当前商家")');
    expect(service).toContain('if (id) this.assertStrictTenantOwnership(row, admin, "兑换码不存在或不属于当前商家")');
    expect(service).toContain('await this.assertRedemptionTarget(targetType, targetId, tenant)');
    expect(service).toContain('id ? row.tenant || null : activity?.tenant || null');
    expect(service).toContain('限定活动与优惠码所属商家不一致');
    expect(service).toContain('已产生兑换记录的兑换码不能修改券码或兑换权益');
    expect(publicService).toContain('code.tenantId = :tenantId');
    expect(publicService).toContain('兑换目标活动券不存在或已停用');
    expect(publicService).toContain('coupon.claimedCount += 1; await manager.getRepository(MallCoupon).save(coupon)');
    expect(publicService).toContain('已拥有该课程学习权限');
  });

  it("exports coupon and redemption ledgers with operation audit", () => {
    expect(service).toContain('workbook.addWorksheet("活动优惠券")');
    expect(service).toContain('workbook.addWorksheet("领取记录")');
    expect(service).toContain('workbook.addWorksheet("使用记录")');
    expect(service).toContain('workbook.addWorksheet("统一兑换码")');
    expect(service).toContain('workbook.addWorksheet("兑换记录")');
    expect(service).toContain('this.logExport(admin, "activity_coupons"');
    expect(service).toContain('this.logExport(admin, "redemption_codes"');
  });
});
