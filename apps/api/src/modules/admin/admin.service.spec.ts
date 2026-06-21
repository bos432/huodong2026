import { BadRequestException } from "@nestjs/common";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { OrderStatus, PaymentMethod, RegistrationStatus } from "../../shared/domain";
import { buildAgentSettlementTransferCapability } from "./agent-transfer-capability";
import { AdminRole } from "./admin-roles";
import { financeDailyReport, financeRiskAlerts } from "./finance-operations";
import { paymentStatementOrderWhere } from "./payment-statement-import";
import { tenantOperationHealth } from "./tenant-health";
import { tenantRegionShapesConflict } from "./tenant-region-geometry";
import { tenantPackagePermissionTemplate, tenantRenewalReminder, tenantSubscriptionStatus, tenantSubscriptionWriteRestriction } from "./tenant-subscription";

function config(values: Record<string, string>) {
  return {
    get(key: string, fallback?: string) {
      return values[key] ?? fallback;
    }
  } as any;
}

describe("activity registration business rules", () => {
  it("free reviewed activity enters pending review", () => {
    const price = 0;
    const requireReview = true;
    const next = price > 0 ? RegistrationStatus.PendingPayment : requireReview ? RegistrationStatus.PendingReview : RegistrationStatus.Approved;
    expect(next).toBe(RegistrationStatus.PendingReview);
  });

  it("paid activity enters pending payment", () => {
    const price = 99;
    const requireReview = false;
    const next = price > 0 ? RegistrationStatus.PendingPayment : requireReview ? RegistrationStatus.PendingReview : RegistrationStatus.Approved;
    expect(next).toBe(RegistrationStatus.PendingPayment);
  });

  it("offline payment confirmation moves registration according to review rule", () => {
    const requireReview = true;
    const next = requireReview ? RegistrationStatus.PendingReview : RegistrationStatus.Approved;
    expect(OrderStatus.Paid).toBe("paid");
    expect(next).toBe(RegistrationStatus.PendingReview);
  });

  it("review approval makes registration check-in ready", () => {
    const current = RegistrationStatus.PendingReview;
    const next = current === RegistrationStatus.PendingReview ? RegistrationStatus.Approved : current;
    expect(next).toBe(RegistrationStatus.Approved);
  });

  it("rejects duplicated check-in", () => {
    const current = RegistrationStatus.CheckedIn;
    expect(() => {
      if (current === RegistrationStatus.CheckedIn) throw new BadRequestException("该报名已签到，请勿重复核销");
    }).toThrow("该报名已签到");
  });
});

describe("payment statement imports", () => {
  it("limits tenant finance order matching to the current tenant", () => {
    expect(
      paymentStatementOrderWhere("ORD-1001", {
        role: AdminRole.Finance,
        tenantId: 12
      })
    ).toEqual({ orderNo: "ORD-1001", tenant: { id: 12 } });
  });

  it("keeps platform admin order matching unrestricted", () => {
    expect(
      paymentStatementOrderWhere("ORD-1001", {
        role: AdminRole.SuperAdmin,
        tenantId: null
      })
    ).toEqual({ orderNo: "ORD-1001" });
  });

  it("scopes tenant-bound legacy super admin role order matching", () => {
    expect(
      paymentStatementOrderWhere("ORD-1001", {
        role: "admin",
        tenantId: 12
      })
    ).toEqual({ orderNo: "ORD-1001", tenant: { id: 12 } });
  });
});

describe("agent settlement transfer capability", () => {
  const agent = { id: 3, name: "East Agent", region: "East", enabled: true } as any;

  it("reports sandbox-ready without real transfer implementation when account fields are complete", () => {
    const capability = buildAgentSettlementTransferCapability(
      config({
        REAL_PAYMENT_ENABLED: "true",
        AGENT_REAL_TRANSFER_IMPLEMENTED: "true",
        ALIPAY_ENABLED: "true",
        ALIPAY_APP_ID: "app-7",
        ALIPAY_PRIVATE_KEY_PATH: "/certs/alipay-private.pem",
        ALIPAY_PUBLIC_CERT_PATH: "/certs/alipay-public.pem",
        ALIPAY_TRANSFER_PRODUCT_CODE: "TRANS_ACCOUNT_NO_PWD"
      }),
      [agent],
      [
        {
          id: 8,
          agent,
          provider: PaymentMethod.Alipay,
          merchantName: "East Merchant",
          merchantNo: "MCH7",
          enabled: true,
          config: {
            ALIPAY_PAYEE_ACCOUNT: "agent@example.com",
            ALIPAY_PAYEE_REAL_NAME: "Agent Owner"
          }
        } as any
      ]
    );

    expect(capability).toMatchObject({
      status: "sandbox_ready",
      realPaymentEnabled: true,
      realTransferImplemented: false,
      summary: {
        enabledAgentCount: 1,
        paymentAccountCount: 1,
        assessedAccountCount: 1,
        missingAgentCount: 0,
        sandboxReady: 1,
        realReady: 0
      }
    });
    expect(capability.accounts[0]).toMatchObject({
      accountId: 8,
      provider: "alipay",
      status: "sandbox_ready",
      transferDraftSupported: true,
      realTransferImplemented: false,
      requestTransferImplemented: false,
      queryTransferImplemented: false,
      draftRemarkPreview: "代理结算 AS_PREVIEW"
    });
    expect(capability.nextActions).toEqual(expect.arrayContaining(["选择一个已就绪代理，在支付机构沙箱验证小额转账、失败回滚和回执对账"]));
  });

  it("reports enabled agents missing usable payment accounts", () => {
    const capability = buildAgentSettlementTransferCapability(config({ REAL_PAYMENT_ENABLED: "true" }), [agent], []);

    expect(capability).toMatchObject({
      status: "not_ready",
      realTransferImplemented: false,
      summary: {
        enabledAgentCount: 1,
        paymentAccountCount: 0,
        assessedAccountCount: 0,
        missingAgentCount: 1
      },
      missingAgents: [{ id: 3, name: "East Agent", region: "East" }]
    });
    expect(capability.nextActions).toEqual(expect.arrayContaining(["为启用中的代理补齐微信或支付宝支付账户，并填写收款人转账资料"]));
  });
});

describe("finance operations dashboard", () => {
  it("builds daily report amounts and refund rate", () => {
    const report = financeDailyReport(
      {
        paidOrderCount: 8,
        pendingOrderCount: 2,
        refundCount: 1,
        pendingRefundCount: 0,
        paidAmount: 1000,
        refundAmount: 125
      },
      new Date("2026-06-19T10:30:00.000Z")
    );

    expect(report).toMatchObject({
      generatedAt: "2026-06-19T10:30:00.000Z",
      paidAmount: "1000.00",
      refundAmount: "125.00",
      netAmount: "875.00",
      refundRate: "0.1250",
      refundRatePercent: "12.50",
      status: "ok"
    });
  });

  it("raises blocking finance alerts before daily operation can be trusted", () => {
    const alerts = financeRiskAlerts({
      paidOrderCount: 20,
      pendingOrderCount: 3,
      refundCount: 4,
      pendingRefundCount: 2,
      paidAmount: 1000,
      refundAmount: 260,
      pendingReconciliationCount: 1,
      pendingStatementCount: 0,
      failedCallbackCount: 1
    });

    expect(alerts.map((item) => item.key)).toEqual(expect.arrayContaining(["pending_refunds", "pending_reconciliation", "failed_callbacks", "high_refund_rate"]));
    expect(alerts.filter((item) => item.level === "danger").map((item) => item.key)).toEqual(expect.arrayContaining(["pending_reconciliation", "failed_callbacks"]));
  });
});

describe("tenant subscription status", () => {
  it("marks packages expiring within 30 days as renewal required", () => {
    const status = tenantSubscriptionStatus({ packagePlan: "city_partner", packageExpiresAt: "2026-07-10" }, new Date("2026-06-20T08:00:00.000Z"));

    expect(status).toMatchObject({
      plan: "city_partner",
      planLabel: "城市合伙人",
      expiresAt: "2026-07-10",
      status: "expiring_soon",
      label: "即将到期",
      daysRemaining: 20,
      renewalRequired: true
    });
  });

  it("keeps legacy tenants without expiry active", () => {
    const status = tenantSubscriptionStatus({ packagePlan: "unknown" }, new Date("2026-06-20T08:00:00.000Z"));

    expect(status).toMatchObject({
      plan: "standard",
      expiresAt: null,
      status: "no_expiry",
      label: "长期有效",
      renewalRequired: false
    });
  });

  it("blocks merchant operation writes after package expiry", () => {
    const restriction = tenantSubscriptionWriteRestriction({ packagePlan: "standard", packageExpiresAt: "2026-06-01" }, new Date("2026-06-20T08:00:00.000Z"));

    expect(restriction).toMatchObject({
      status: { status: "expired", label: "已到期" },
      message: "商家套餐已到期，续费或延长到期日后才能继续运营写入"
    });
  });

  it("allows merchant operation writes while package is only expiring soon", () => {
    const restriction = tenantSubscriptionWriteRestriction({ packagePlan: "standard", packageExpiresAt: "2026-07-01" }, new Date("2026-06-20T08:00:00.000Z"));

    expect(restriction).toBeNull();
  });

  it("provides conservative permissions for trial package", () => {
    expect(tenantPackagePermissionTemplate("trial")).toMatchObject({
      plan: "trial",
      planLabel: "试运营",
      permissions: {
        activityPublishReviewRequired: true,
        registrationReviewEnabled: false,
        paymentAccountEditable: false,
        mallEnabled: false
      }
    });
  });

  it("provides growth permissions for core partner package", () => {
    expect(tenantPackagePermissionTemplate("core_partner")).toMatchObject({
      plan: "core_partner",
      planLabel: "核心合伙人",
      permissions: {
        activityPublishReviewRequired: false,
        registrationReviewEnabled: true,
        paymentAccountEditable: true,
        mallEnabled: true
      }
    });
  });

  it("builds urgent renewal reminder for expired packages", () => {
    expect(tenantRenewalReminder({ packagePlan: "standard", packageExpiresAt: "2026-06-01" }, new Date("2026-06-20T08:00:00.000Z"))).toMatchObject({
      level: "urgent",
      label: "已到期",
      actionRequired: true,
      dueDate: "2026-06-01"
    });
  });

  it("builds watch renewal reminder for packages expiring soon", () => {
    expect(tenantRenewalReminder({ packagePlan: "standard", packageExpiresAt: "2026-07-01" }, new Date("2026-06-20T08:00:00.000Z"))).toMatchObject({
      level: "watch",
      label: "续费提醒",
      actionRequired: true,
      daysRemaining: 11
    });
  });

  it("keeps no-expiry packages out of renewal action queue", () => {
    expect(tenantRenewalReminder({ packagePlan: "standard" }, new Date("2026-06-20T08:00:00.000Z"))).toMatchObject({
      level: "none",
      label: "长期有效",
      actionRequired: false
    });
  });
});

describe("tenant operation health", () => {
  it("raises merchant operation risks from launch-critical and finance signals", () => {
    const health = tenantOperationHealth({
      enabled: true,
      subscriptionStatus: { status: "active" },
      enabledAdminCount: 0,
      enabledPaymentAccountCount: 0,
      totalActivityCount: 0,
      totalCourseCount: 0,
      publishedCourseCount: 0,
      homepageSectionCount: 0,
      pendingActivityCount: 1,
      pendingRegistrationCount: 2,
      pendingRefundCount: 1,
      callbackRiskCount: 1,
      pendingReconciliationCount: 1
    });

    expect(health).toMatchObject({ status: "risk", label: "风险" });
    expect(health.risks).toEqual(expect.arrayContaining(["缺少可登录商家管理员", "缺少启用的收款账户", "尚未创建活动", "存在 1 条异常支付回调", "存在 1 笔待处理对账差异"]));
    expect(health.warnings).toEqual(expect.arrayContaining(["尚未配置课程内容", "首页装修未启用模块", "有 1 个待处理退款"]));
    expect(health.score).toBeLessThan(50);
  });

  it("marks fully prepared merchants as healthy", () => {
    const health = tenantOperationHealth({
      enabled: true,
      subscriptionStatus: { status: "active" },
      enabledAdminCount: 1,
      enabledPaymentAccountCount: 1,
      totalActivityCount: 3,
      totalCourseCount: 2,
      publishedCourseCount: 1,
      homepageSectionCount: 4,
      pendingActivityCount: 0,
      pendingRegistrationCount: 0,
      pendingRefundCount: 0,
      callbackRiskCount: 0,
      pendingReconciliationCount: 0
    });

    expect(health).toMatchObject({ score: 100, status: "healthy", label: "健康", risks: [], warnings: [] });
  });
});

describe("tenant region polygon conflict guard", () => {
  const square = [
    { lat: 29.84, lng: 106.04 },
    { lat: 29.84, lng: 106.06 },
    { lat: 29.86, lng: 106.06 },
    { lat: 29.86, lng: 106.04 }
  ];

  it("detects overlapping exclusive polygons", () => {
    const overlap = [
      { lat: 29.85, lng: 106.05 },
      { lat: 29.85, lng: 106.07 },
      { lat: 29.87, lng: 106.07 },
      { lat: 29.87, lng: 106.05 }
    ];
    const farAway = [
      { lat: 30.1, lng: 106.4 },
      { lat: 30.1, lng: 106.42 },
      { lat: 30.12, lng: 106.42 },
      { lat: 30.12, lng: 106.4 }
    ];

    expect(tenantRegionShapesConflict({ latitude: 29.85, longitude: 106.05, radiusMeters: 100, boundaryPoints: square }, { latitude: 29.86, longitude: 106.06, radiusMeters: 100, boundaryPoints: overlap })).toBe(true);
    expect(tenantRegionShapesConflict({ latitude: 29.85, longitude: 106.05, radiusMeters: 100, boundaryPoints: square }, { latitude: 30.11, longitude: 106.41, radiusMeters: 100, boundaryPoints: farAway })).toBe(false);
  });

  it("detects polygon and radius overlap", () => {
    expect(tenantRegionShapesConflict({ latitude: 29.85, longitude: 106.05, radiusMeters: 100, boundaryPoints: square }, { latitude: 29.85, longitude: 106.05, radiusMeters: 100, boundaryPoints: null })).toBe(true);
    expect(tenantRegionShapesConflict({ latitude: 29.85, longitude: 106.05, radiusMeters: 100, boundaryPoints: square }, { latitude: 30.2, longitude: 106.5, radiusMeters: 100, boundaryPoints: null })).toBe(false);
  });

  it("excludes the current region from conflict candidates", () => {
    const source = readFileSync("src/modules/admin/admin.service.ts", "utf8");
    expect(source).toContain('if (input.id) candidates.andWhere("region.id <> :id", { id: input.id });');
  });
});

describe("tenant region hit log summary guard", () => {
  it("keeps listing and summary on the same filtered query", () => {
    const serviceSource = readFileSync("src/modules/admin/admin.service.ts", "utf8");
    const controllerSource = readFileSync("src/modules/admin/admin.controller.ts", "utf8");
    const dtoSource = readFileSync("src/modules/admin/dto.ts", "utf8");

    expect(controllerSource).toContain('@Get("tenant-region-hit-logs/summary")');
    expect(serviceSource).toContain("tenantRegionHitLogSummary(query: TenantRegionHitLogQueryDto");
    expect(serviceSource).toContain("tenantRegionHitLogQuery(query");
    expect(serviceSource).toContain("applyTenantRegionHitLogFilters");
    expect(serviceSource).toContain("COALESCE(log.source, 'public_tenant_resolve')");
    expect(serviceSource).toContain("COALESCE(tenant.id, regionTenant.id)");
    expect(dtoSource).toContain("startDate?: string");
    expect(dtoSource).toContain("endDate?: string");
  });
});
