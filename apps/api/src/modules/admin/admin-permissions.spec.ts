import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { RequestMethod } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { AdminController } from "./admin.controller";
import { resolveAdminRoutePermission } from "./admin-permissions";
import { ROLE_METADATA_KEY } from "./admin-roles";
import { CoursesController } from "../courses/courses.controller";
import { MallAdminController } from "../mall/mall-admin.controller";
import { AdminV1Controller } from "../v1/v1-admin.controller";

const requestMethodNames: Partial<Record<RequestMethod, string>> = {
  [RequestMethod.GET]: "GET",
  [RequestMethod.POST]: "POST",
  [RequestMethod.PUT]: "PUT",
  [RequestMethod.PATCH]: "PATCH",
  [RequestMethod.DELETE]: "DELETE"
};

function controllerRoutes(controller: any, prefix = "") {
  return Object.getOwnPropertyNames(controller.prototype)
    .filter((name) => name !== "constructor")
    .flatMap((name) => {
      const handler = controller.prototype[name];
      const roles = Reflect.getMetadata(ROLE_METADATA_KEY, handler);
      if (!Array.isArray(roles) || !roles.length) return [];
      const routePath = Reflect.getMetadata(PATH_METADATA, handler);
      const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
      const method = requestMethod === undefined ? undefined : requestMethodNames[requestMethod];
      const paths = Array.isArray(routePath) ? routePath : routePath === undefined ? [] : [routePath];
      return method ? paths.map((path) => ({ handler: name, method, path: `${prefix}${String(path)}` })) : [];
    });
}

function adminControllerRoutes() {
  return [
    ...controllerRoutes(AdminController),
    ...controllerRoutes(CoursesController),
    ...controllerRoutes(MallAdminController, "mall/"),
    ...controllerRoutes(AdminV1Controller)
  ];
}

describe("admin route permissions", () => {
  it("maps every admin controller route to an explicit permission", () => {
    const missing = adminControllerRoutes().filter((route) => !resolveAdminRoutePermission(route.method, route.path));
    expect(missing, missing.map((route) => `${route.method} ${route.path} (${route.handler})`).join("\n")).toEqual([]);
  });

  it("maps refund review routes to refund permission before generic approve routes", () => {
    expect(resolveAdminRoutePermission("POST", "refunds/:id/approve")).toBe("order.refund");
    expect(resolveAdminRoutePermission("POST", "refunds/:id/reject")).toBe("order.refund");
  });

  it("maps registration review routes to registration management", () => {
    expect(resolveAdminRoutePermission("POST", "registrations/:id/approve")).toBe("registration.manage");
    expect(resolveAdminRoutePermission("POST", "registrations/:id/reject")).toBe("registration.manage");
  });

  it("maps registration manual check-in to check-in permission", () => {
    expect(resolveAdminRoutePermission("POST", "registrations/:id/check-in")).toBe("checkin.manage");
  });

  it("allows member viewers to read levels without granting level writes", () => {
    expect(resolveAdminRoutePermission("GET", "member-levels")).toBe("member.view");
    expect(resolveAdminRoutePermission("POST", "member-levels")).toBe("member_level.manage");
    expect(resolveAdminRoutePermission("PATCH", "member-levels/:id")).toBe("member_level.manage");
    expect(resolveAdminRoutePermission("POST", "members/:userId/level")).toBe("member.lifecycle.manage");
  });

  it("separates announcement viewing from maintenance", () => {
    expect(resolveAdminRoutePermission("GET", "announcements")).toBe("announcement.view");
    expect(resolveAdminRoutePermission("GET", "announcements/options")).toBe("announcement.view");
    expect(resolveAdminRoutePermission("POST", "announcements")).toBe("announcement.manage");
    expect(resolveAdminRoutePermission("PATCH", "announcements/:id")).toBe("announcement.manage");
    expect(resolveAdminRoutePermission("DELETE", "announcements/:id")).toBe("announcement.manage");
  });

  it("separates marketing popup viewing from maintenance", () => {
    expect(resolveAdminRoutePermission("GET", "marketing-popups")).toBe("marketing_popup.view");
    expect(resolveAdminRoutePermission("GET", "marketing-popups/options")).toBe("marketing_popup.view");
    expect(resolveAdminRoutePermission("GET", "marketing-popups/effective-check")).toBe("marketing_popup.view");
    expect(resolveAdminRoutePermission("POST", "marketing-popups")).toBe("marketing_popup.manage");
    expect(resolveAdminRoutePermission("PATCH", "marketing-popups/:id")).toBe("marketing_popup.manage");
    expect(resolveAdminRoutePermission("DELETE", "marketing-popups/:id")).toBe("marketing_popup.manage");
  });

  it("separates ad center viewing, maintenance, finance, and export", () => {
    expect(resolveAdminRoutePermission("GET", "ad-center/options")).toBe("ad_center.view");
    expect(resolveAdminRoutePermission("GET", "ad-advertisers")).toBe("ad_center.view");
    expect(resolveAdminRoutePermission("POST", "ad-advertisers")).toBe("ad_center.manage");
    expect(resolveAdminRoutePermission("PATCH", "ad-contracts/:id")).toBe("ad_center.manage");
    expect(resolveAdminRoutePermission("DELETE", "ad-campaigns/:id")).toBe("ad_center.manage");
    expect(resolveAdminRoutePermission("GET", "ad-settlements")).toBe("ad_center.view");
    expect(resolveAdminRoutePermission("POST", "ad-settlements/generate")).toBe("ad_center.finance");
    expect(resolveAdminRoutePermission("PATCH", "ad-settlements/:id/confirm")).toBe("ad_center.finance");
    expect(resolveAdminRoutePermission("POST", "ad-official-revenue-imports")).toBe("ad_center.finance");
    expect(resolveAdminRoutePermission("GET", "ad-campaigns/export")).toBe("ad_center.export");
    expect(resolveAdminRoutePermission("GET", "ad-settlements/export")).toBe("ad_center.export");
  });

  it("separates payment account viewing from maintenance and dedicated options", () => {
    expect(resolveAdminRoutePermission("GET", "payment-accounts/options")).toBe("payment_account.view");
    expect(resolveAdminRoutePermission("GET", "agents")).toBe("payment_account.view");
    expect(resolveAdminRoutePermission("POST", "agents")).toBe("payment_account.manage");
    expect(resolveAdminRoutePermission("PATCH", "agents/:id")).toBe("payment_account.manage");
    expect(resolveAdminRoutePermission("GET", "agent-payment-accounts")).toBe("payment_account.view");
    expect(resolveAdminRoutePermission("POST", "agent-payment-accounts")).toBe("payment_account.manage");
    expect(resolveAdminRoutePermission("PATCH", "agent-payment-accounts/:id")).toBe("payment_account.manage");
  });

  it("keeps activity review routes mapped to activity approval", () => {
    expect(resolveAdminRoutePermission("POST", "activities/:id/approve")).toBe("activity.approve");
    expect(resolveAdminRoutePermission("POST", "activities/:id/reject")).toBe("activity.approve");
  });

  it("maps agent settlement review routes before generic approve routes", () => {
    expect(resolveAdminRoutePermission("GET", "agent-settlements/options")).toBe("agent_settlement.view");
    expect(resolveAdminRoutePermission("GET", "agent-settlements/:id/details")).toBe("agent_settlement.view");
    expect(resolveAdminRoutePermission("POST", "agent-settlements/:id/approve")).toBe("agent_settlement.manage");
    expect(resolveAdminRoutePermission("POST", "/api/admin/agent-settlements/:id/reject")).toBe("agent_settlement.manage");
    expect(resolveAdminRoutePermission("POST", "/api/admin/agent-settlements/:id/mark-paid")).toBe("agent_settlement.pay");
    expect(resolveAdminRoutePermission("POST", "/api/admin/agent-settlements/:id/sandbox-transfer")).toBe("agent_settlement.transfer");
    expect(resolveAdminRoutePermission("GET", "/api/admin/agent-settlements/export")).toBe("agent_settlement.export");
  });

  it("separates member identity, points, lifecycle, password, and export routes", () => {
    expect(resolveAdminRoutePermission("GET", "members/options")).toBe("member.view");
    expect(resolveAdminRoutePermission("GET", "members")).toBe("member.view");
    expect(resolveAdminRoutePermission("GET", "members/:userId")).toBe("member.view");
    expect(resolveAdminRoutePermission("POST", "members")).toBe("member.manage");
    expect(resolveAdminRoutePermission("PATCH", "members/:userId")).toBe("member.manage");
    expect(resolveAdminRoutePermission("POST", "members/:userId/password")).toBe("member.password");
    expect(resolveAdminRoutePermission("POST", "members/:userId/points/adjust")).toBe("member.points.manage");
    expect(resolveAdminRoutePermission("POST", "members/lifecycle-scan")).toBe("member.lifecycle.manage");
    expect(resolveAdminRoutePermission("GET", "members/export")).toBe("member.export");
  });

  it("maps course order collection and offline confirmation to order permissions", () => {
    expect(resolveAdminRoutePermission("GET", "course-member-level-options")).toBe("course.manage");
    expect(resolveAdminRoutePermission("GET", "courses/:id/insights")).toBe("course.manage");
    expect(resolveAdminRoutePermission("GET", "courses/:id/learners")).toBe("course.manage");
    expect(resolveAdminRoutePermission("GET", "courses/:id/insights/export")).toBe("course.export");
    expect(resolveAdminRoutePermission("GET", "course-assessment-attempts-export")).toBe("course.export");
    expect(resolveAdminRoutePermission("GET", "course-orders")).toBe("course_order.view");
    expect(resolveAdminRoutePermission("POST", "course-orders/:id/confirm-offline-payment")).toBe("course_order.manage");
    expect(resolveAdminRoutePermission("GET", "course-refunds")).toBe("order.refund");
    expect(resolveAdminRoutePermission("POST", "course-refunds/:id/review")).toBe("order.refund");
    expect(resolveAdminRoutePermission("POST", "course-refunds/:id/confirm")).toBe("order.refund");
  });

  it("separates support viewing, work-order handling, and sensitive disclosure", () => {
    expect(resolveAdminRoutePermission("GET", "support/search")).toBe("support.view");
    expect(resolveAdminRoutePermission("GET", "support/work-orders")).toBe("support.view");
    expect(resolveAdminRoutePermission("GET", "support/work-orders/:id")).toBe("support.view");
    expect(resolveAdminRoutePermission("GET", "support/assignees")).toBe("support.manage");
    expect(resolveAdminRoutePermission("POST", "support/work-orders")).toBe("support.manage");
    expect(resolveAdminRoutePermission("PATCH", "support/work-orders/:id")).toBe("support.manage");
    expect(resolveAdminRoutePermission("POST", "support/users/:id/reveal-phone")).toBe("support.sensitive");
  });

  it("separates activity category and ticket viewing from maintenance", () => {
    expect(resolveAdminRoutePermission("GET", "categories")).toBe("category.view");
    expect(resolveAdminRoutePermission("POST", "categories")).toBe("category.manage");
    expect(resolveAdminRoutePermission("PATCH", "categories/:id")).toBe("category.manage");
    expect(resolveAdminRoutePermission("GET", "ticket-types")).toBe("ticket.view");
    expect(resolveAdminRoutePermission("GET", "ticket-types/options")).toBe("ticket.view");
    expect(resolveAdminRoutePermission("POST", "ticket-types")).toBe("ticket.manage");
    expect(resolveAdminRoutePermission("PATCH", "ticket-types/:id")).toBe("ticket.manage");
    expect(resolveAdminRoutePermission("GET", "activities/options")).toBe("activity.manage");
  });

  it("separates activity coupons and redemption codes into view, maintenance, records, and exports", () => {
    expect(resolveAdminRoutePermission("GET", "coupons")).toBe("coupon.view");
    expect(resolveAdminRoutePermission("GET", "coupons/options")).toBe("coupon.view");
    expect(resolveAdminRoutePermission("GET", "coupon-claims")).toBe("coupon.view");
    expect(resolveAdminRoutePermission("GET", "coupon-usages")).toBe("coupon.view");
    expect(resolveAdminRoutePermission("POST", "coupons")).toBe("coupon.manage");
    expect(resolveAdminRoutePermission("PATCH", "coupons/:id")).toBe("coupon.manage");
    expect(resolveAdminRoutePermission("GET", "coupons/export")).toBe("coupon.export");
    expect(resolveAdminRoutePermission("GET", "redemption-codes")).toBe("redemption_code.view");
    expect(resolveAdminRoutePermission("GET", "redemption-codes/options")).toBe("redemption_code.view");
    expect(resolveAdminRoutePermission("GET", "redemption-code-usages")).toBe("redemption_code.view");
    expect(resolveAdminRoutePermission("POST", "redemption-codes")).toBe("redemption_code.manage");
    expect(resolveAdminRoutePermission("PATCH", "redemption-codes/:id")).toBe("redemption_code.manage");
    expect(resolveAdminRoutePermission("GET", "redemption-codes/export")).toBe("redemption_code.export");
  });

  it("separates analytics viewing, exports, recomputation, and activity drilldown", () => {
    expect(resolveAdminRoutePermission("GET", "analytics/overview")).toBe("analytics.view");
    expect(resolveAdminRoutePermission("GET", "analytics/business-export")).toBe("analytics.export");
    expect(resolveAdminRoutePermission("GET", "analytics/growth-export")).toBe("analytics.export");
    expect(resolveAdminRoutePermission("GET", "analytics/metrics-export")).toBe("analytics.export");
    expect(resolveAdminRoutePermission("POST", "analytics/recompute")).toBe("analytics.manage");
    expect(resolveAdminRoutePermission("GET", "activities/:id/funnel")).toBe("analytics.view");
    expect(resolveAdminRoutePermission("GET", "activities/:id/recap")).toBe("analytics.view");
    expect(resolveAdminRoutePermission("GET", "activities/:id/recap/versions")).toBe("analytics.view");
    expect(resolveAdminRoutePermission("POST", "activities/:id/recap/versions")).toBe("analytics.manage");
    expect(resolveAdminRoutePermission("GET", "activities/:id/recap/export")).toBe("analytics.export");
  });

  it("separates business job viewing from replay, cancellation, and scans", () => {
    expect(resolveAdminRoutePermission("GET", "business-jobs")).toBe("business_job.view");
    expect(resolveAdminRoutePermission("POST", "business-jobs/:id/replay")).toBe("business_job.manage");
    expect(resolveAdminRoutePermission("POST", "business-jobs/:id/cancel")).toBe("business_job.manage");
    expect(resolveAdminRoutePermission("POST", "business-jobs/run-due")).toBe("business_job.manage");
  });

  it("separates platform and tenant configuration viewing from writes and checks", () => {
    expect(resolveAdminRoutePermission("GET", "settings/operation", { tenantId: null })).toBe("system.view");
    expect(resolveAdminRoutePermission("POST", "settings/operation", { tenantId: null })).toBe("system.manage");
    expect(resolveAdminRoutePermission("GET", "system/config-check", { tenantId: null })).toBe("system.view");
    expect(resolveAdminRoutePermission("POST", "settings/sms/test", { tenantId: null })).toBe("system.manage");
    expect(resolveAdminRoutePermission("POST", "settings/connectivity-check", { tenantId: null })).toBe("system.manage");
    expect(resolveAdminRoutePermission("GET", "settings/operation", { tenantId: 23 })).toBe("operation_settings.view");
    expect(resolveAdminRoutePermission("POST", "settings/operation", { tenantId: 23 })).toBe("operation_settings.manage");
    expect(resolveAdminRoutePermission("POST", "settings/sms/test", { tenantId: 23 })).toBe("operation_settings.manage");
    expect(resolveAdminRoutePermission("POST", "settings/connectivity-check", { tenantId: 23 })).toBe("operation_settings.manage");
  });

  it("separates mini program release viewing from mutations", () => {
    expect(resolveAdminRoutePermission("GET", "miniprogram-release/setting")).toBe("miniprogram_release.view");
    expect(resolveAdminRoutePermission("GET", "miniprogram-release/logs")).toBe("miniprogram_release.view");
    expect(resolveAdminRoutePermission("POST", "miniprogram-release/setting")).toBe("miniprogram_release.manage");
    expect(resolveAdminRoutePermission("POST", "miniprogram-release/upload")).toBe("miniprogram_release.manage");
    expect(resolveAdminRoutePermission("POST", "miniprogram-release/submit-audit")).toBe("miniprogram_release.manage");
    expect(resolveAdminRoutePermission("POST", "miniprogram-release/release")).toBe("miniprogram_release.manage");
  });

  it("maps mall merchant payment accounts to mall payment permission", () => {
    expect(resolveAdminRoutePermission("GET", "mall/accessible-merchants")).toBe("mall.merchant.view");
    expect(resolveAdminRoutePermission("GET", "mall/payment-merchants")).toBe("mall.payment.manage");
    expect(resolveAdminRoutePermission("GET", "mall/merchant-payment-accounts")).toBe("mall.payment.manage");
    expect(resolveAdminRoutePermission("POST", "mall/merchant-payment-accounts")).toBe("mall.payment.manage");
    expect(resolveAdminRoutePermission("PATCH", "mall/merchant-payment-accounts/:id")).toBe("mall.payment.manage");
  });

  it("maps mall product audit routes to mall product audit permission", () => {
    expect(resolveAdminRoutePermission("GET", "mall/product-audits")).toBe("mall.product.audit");
    expect(resolveAdminRoutePermission("POST", "mall/products/:id/approve")).toBe("mall.product.audit");
    expect(resolveAdminRoutePermission("POST", "mall/products/:id/reject")).toBe("mall.product.audit");
  });

  it("maps mall finance, settlement, and marketing routes to operator-friendly permissions", () => {
    expect(resolveAdminRoutePermission("GET", "mall/settlements")).toBe("mall.finance.view");
    expect(resolveAdminRoutePermission("GET", "mall/settlements/export")).toBe("mall.finance.view");
    expect(resolveAdminRoutePermission("POST", "mall/settlements/generate")).toBe("mall.settlement.manage");
    expect(resolveAdminRoutePermission("GET", "mall/payment-transactions")).toBe("mall.finance.view");
    expect(resolveAdminRoutePermission("GET", "mall/payment-callback-logs")).toBe("mall.finance.view");
    expect(resolveAdminRoutePermission("GET", "mall/refund-logs")).toBe("mall.finance.view");
    expect(resolveAdminRoutePermission("GET", "mall/commissions")).toBe("mall.finance.view");
    expect(resolveAdminRoutePermission("POST", "mall/commissions/batch-settle")).toBe("mall.settlement.manage");
    expect(resolveAdminRoutePermission("GET", "mall/promotion-codes")).toBe("mall.product.manage");
    expect(resolveAdminRoutePermission("GET", "mall/group-buy-records")).toBe("mall.product.manage");
    expect(resolveAdminRoutePermission("GET", "mall/reviews")).toBe("mall.review.manage");
    expect(resolveAdminRoutePermission("PATCH", "mall/reviews/:id")).toBe("mall.review.manage");
    expect(resolveAdminRoutePermission("PATCH", "review-reports/:id")).toBe("review.manage");
    expect(resolveAdminRoutePermission("GET", "reviews")).toBe("review.view");
    expect(resolveAdminRoutePermission("GET", "reviews/options")).toBe("review.view");
    expect(resolveAdminRoutePermission("GET", "review-reports")).toBe("review.view");
  });

  it("separates user tag and member segment viewing from writes", () => {
    expect(resolveAdminRoutePermission("GET", "tags")).toBe("tag.view");
    expect(resolveAdminRoutePermission("GET", "tags/options")).toBe("tag.view");
    expect(resolveAdminRoutePermission("GET", "tags/behavior-runs")).toBe("tag.view");
    expect(resolveAdminRoutePermission("POST", "tags")).toBe("tag.manage");
    expect(resolveAdminRoutePermission("GET", "member-segments")).toBe("tag.view");
    expect(resolveAdminRoutePermission("POST", "member-segments/preview")).toBe("tag.view");
    expect(resolveAdminRoutePermission("POST", "member-segments")).toBe("tag.manage");
    expect(resolveAdminRoutePermission("GET", "member-segments/:id/snapshots")).toBe("tag.view");
    expect(resolveAdminRoutePermission("POST", "member-segments/:id/snapshots")).toBe("tag.manage");
    expect(resolveAdminRoutePermission("GET", "member-segment-snapshots/:id/members")).toBe("tag.view");
  });

  it("separates notification viewing, templates, sending, preferences, and sensitive disclosure", () => {
    expect(resolveAdminRoutePermission("GET", "notifications/options")).toBe("notification.view");
    expect(resolveAdminRoutePermission("GET", "notification-templates")).toBe("notification.view");
    expect(resolveAdminRoutePermission("POST", "notification-templates")).toBe("notification.template.manage");
    expect(resolveAdminRoutePermission("PATCH", "notification-templates/:id")).toBe("notification.template.manage");
    expect(resolveAdminRoutePermission("GET", "notifications")).toBe("notification.view");
    expect(resolveAdminRoutePermission("GET", "notification-providers")).toBe("notification.view");
    expect(resolveAdminRoutePermission("POST", "notifications/preview")).toBe("notification.view");
    expect(resolveAdminRoutePermission("GET", "notification-preferences")).toBe("notification.view");
    expect(resolveAdminRoutePermission("PATCH", "notification-preferences/:userId")).toBe("notification.preference.manage");
    expect(resolveAdminRoutePermission("GET", "notification-schedules")).toBe("notification.view");
    expect(resolveAdminRoutePermission("POST", "notification-schedules")).toBe("notification.template.manage");
    expect(resolveAdminRoutePermission("PATCH", "notification-schedules/:id")).toBe("notification.template.manage");
    expect(resolveAdminRoutePermission("POST", "notification-schedules/run-due")).toBe("notification.send");
    expect(resolveAdminRoutePermission("POST", "notifications/send")).toBe("notification.send");
    expect(resolveAdminRoutePermission("POST", "notifications/send-by-tag")).toBe("notification.send");
    expect(resolveAdminRoutePermission("POST", "notifications/:id/retry")).toBe("notification.send");
    expect(resolveAdminRoutePermission("POST", "activities/:id/reminders/send")).toBe("notification.send");
  });

  it("separates unified order viewing from unified fund permissions", () => {
    expect(resolveAdminRoutePermission("GET", "unified-orders")).toBe("order.view");
    expect(resolveAdminRoutePermission("GET", "unified-orders/activity/1")).toBe("order.view");
    expect(resolveAdminRoutePermission("GET", "unified-orders/export")).toBe("order.export");
    expect(resolveAdminRoutePermission("GET", "unified-funds")).toBe("finance.view");
    expect(resolveAdminRoutePermission("GET", "unified-funds/consistency")).toBe("finance.view");
    expect(resolveAdminRoutePermission("GET", "unified-funds/export")).toBe("finance.export");
  });

  it("separates admin account viewing, management, invitations, and security operations", () => {
    expect(resolveAdminRoutePermission("GET", "admins")).toBe("admin.view");
    expect(resolveAdminRoutePermission("GET", "admins/options")).toBe("admin.view");
    expect(resolveAdminRoutePermission("POST", "admins")).toBe("admin.manage");
    expect(resolveAdminRoutePermission("PATCH", "admins/:id")).toBe("admin.manage");
    expect(resolveAdminRoutePermission("POST", "admins/:id/copy-role")).toBe("admin.manage");
    expect(resolveAdminRoutePermission("POST", "admins/:id/password")).toBe("admin.security.manage");
    expect(resolveAdminRoutePermission("POST", "admins/:id/status")).toBe("admin.security.manage");
    expect(resolveAdminRoutePermission("POST", "admins/:id/force-logout")).toBe("admin.security.manage");
    expect(resolveAdminRoutePermission("GET", "admin-invitations")).toBe("admin.view");
    expect(resolveAdminRoutePermission("POST", "admin-invitations")).toBe("admin.manage");
    expect(resolveAdminRoutePermission("POST", "admin-invitations/:id/revoke")).toBe("admin.manage");
    expect(resolveAdminRoutePermission("GET", "/api/admin/admins")).toBe("admin.view");
  });

  it("separates operation logs from platform security logs and exports", () => {
    expect(resolveAdminRoutePermission("GET", "operation-logs")).toBe("logs.view");
    expect(resolveAdminRoutePermission("GET", "operation-logs/options")).toBe("logs.view");
    expect(resolveAdminRoutePermission("GET", "operation-logs/export")).toBe("logs.export");
    expect(resolveAdminRoutePermission("GET", "auth/log-options")).toBe("security_log.view");
    expect(resolveAdminRoutePermission("GET", "auth/login-logs")).toBe("security_log.view");
    expect(resolveAdminRoutePermission("GET", "auth/h5-code-logs")).toBe("security_log.view");
    expect(resolveAdminRoutePermission("GET", "auth/login-logs/export")).toBe("security_log.export");
    expect(resolveAdminRoutePermission("GET", "auth/h5-code-logs/export")).toBe("security_log.export");
  });

  it("separates masked aid access, workflow actions and sensitive disclosure", () => {
    expect(resolveAdminRoutePermission("GET", "aid-applications")).toBe("aid.view");
    expect(resolveAdminRoutePermission("POST", "aid-applications/:id/actions")).toBe("aid.manage");
    expect(resolveAdminRoutePermission("POST", "aid-applications/:id/reveal")).toBe("aid.sensitive");
    expect(resolveAdminRoutePermission("GET", "aid-application-materials/:id/download")).toBe("aid.sensitive");
    expect(resolveAdminRoutePermission("GET", "registration-attachments/:token/download")).toBe("registration.view");
    expect(resolveAdminRoutePermission("POST", "uploads/private-settlement-proofs")).toBe("upload.settlement_proof");
    expect(resolveAdminRoutePermission("GET", "private-settlement-proofs/:token/download")).toBe("upload.settlement_proof");
    expect(resolveAdminRoutePermission("POST", "partner/applications/:id/convert")).toBe("partner.manage");
  });

  it("separates ambassador viewing, management, sensitive disclosure and exports", () => {
    expect(resolveAdminRoutePermission("GET", "ambassador/overview")).toBe("ambassador.view");
    expect(resolveAdminRoutePermission("GET", "ambassador/applications")).toBe("ambassador.view");
    expect(resolveAdminRoutePermission("PATCH", "ambassador/applications/:id")).toBe("ambassador.manage");
    expect(resolveAdminRoutePermission("POST", "ambassador/applications/:id/followups")).toBe("ambassador.manage");
    expect(resolveAdminRoutePermission("POST", "ambassador/applications/:id/reveal")).toBe("ambassador.sensitive");
    expect(resolveAdminRoutePermission("GET", "ambassador/applications/export")).toBe("ambassador.export");
    expect(resolveAdminRoutePermission("GET", "volunteer/tasks")).toBe("ambassador.view");
    expect(resolveAdminRoutePermission("POST", "volunteer/tasks")).toBe("ambassador.manage");
    expect(resolveAdminRoutePermission("GET", "volunteer/profiles/export")).toBe("ambassador.export");
    expect(resolveAdminRoutePermission("GET", "volunteer/certificates/:id/download")).toBe("ambassador.view");
  });

  it("separates partner viewing, management, sensitive disclosure and exports", () => {
    expect(resolveAdminRoutePermission("GET", "partner/applications")).toBe("partner.view");
    expect(resolveAdminRoutePermission("GET", "partner/applications/:id/followups")).toBe("partner.view");
    expect(resolveAdminRoutePermission("GET", "partner/contracts")).toBe("partner.view");
    expect(resolveAdminRoutePermission("PATCH", "partner/applications/:id")).toBe("partner.manage");
    expect(resolveAdminRoutePermission("POST", "partner/applications/:id/followups")).toBe("partner.manage");
    expect(resolveAdminRoutePermission("POST", "partner/contracts")).toBe("partner.manage");
    expect(resolveAdminRoutePermission("POST", "partner/applications/:id/reveal")).toBe("partner.sensitive");
    expect(resolveAdminRoutePermission("POST", "partner/contracts/:id/reveal")).toBe("partner.sensitive");
    expect(resolveAdminRoutePermission("GET", "partner/export")).toBe("partner.export");
  });
});
