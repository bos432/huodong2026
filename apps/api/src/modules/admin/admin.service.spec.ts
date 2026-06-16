import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { OrderStatus, PaymentMethod, RegistrationStatus } from "../../shared/domain";
import { buildAgentSettlementTransferCapability } from "./agent-transfer-capability";
import { AdminRole } from "./admin-roles";
import { paymentStatementOrderWhere } from "./payment-statement-import";

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
