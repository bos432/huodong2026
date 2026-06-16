import { NotImplementedException } from "@nestjs/common";
import { generateKeyPairSync, createSign } from "crypto";
import { describe, expect, it } from "vitest";
import { AgentPaymentAccount } from "../../entities/agent-payment-account.entity";
import { AgentSettlement } from "../../entities/agent-settlement.entity";
import { PaymentMethod } from "../../shared/domain";
import { assessAgentTransferAccount, buildWechatTransferQueryRequestDraft, buildWechatTransferRequestDraft, executeWechatTransferQuery, executeWechatTransferRequest, createAgentTransferAdapter, providerForPaymentMethod } from "./agent-transfer-adapters";

function config(values: Record<string, string>) {
  return {
    get(key: string, fallback?: string) {
      return values[key] ?? fallback;
    }
  } as any;
}

function account(provider: PaymentMethod, values: Record<string, unknown>, enabled = true) {
  return {
    id: 7,
    provider,
    enabled,
    merchantName: "Test merchant",
    merchantNo: "MCH7",
    agent: { id: 3, name: "East Agent", enabled: true },
    config: values
  } as AgentPaymentAccount;
}

function settlement(values: Partial<AgentSettlement> = {}) {
  return {
    id: 11,
    settlementNo: "AS20260610001",
    payableAmount: "123.45",
    ...values
  } as AgentSettlement;
}

function keyPair() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKey: publicKey.export({ type: "spki", format: "pem" }).toString()
  };
}

function signedWechatResponse(body: string, privateKey: string) {
  const timestamp = "1780600000";
  const nonce = "nonce-transfer";
  const signer = createSign("RSA-SHA256");
  signer.update(`${timestamp}\n${nonce}\n${body}\n`);
  signer.end();
  const signature = signer.sign(privateKey, "base64");
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    headers: {
      get(name: string) {
        const values: Record<string, string> = {
          "wechatpay-timestamp": timestamp,
          "wechatpay-nonce": nonce,
          "wechatpay-signature": signature
        };
        return values[name.toLowerCase()] || null;
      }
    },
    async text() {
      return body;
    }
  };
}

describe("agent transfer adapters", () => {
  it("maps payment methods to transfer providers", () => {
    expect(providerForPaymentMethod(PaymentMethod.Wechat)).toBe("wechat");
    expect(providerForPaymentMethod(PaymentMethod.Alipay)).toBe("alipay");
    expect(providerForPaymentMethod(PaymentMethod.Offline)).toBeNull();
    expect(providerForPaymentMethod(PaymentMethod.Free)).toBeNull();
  });

  it("keeps accounts manual-only until real payment and provider flags are enabled", () => {
    const assessment = assessAgentTransferAccount(config({ REAL_PAYMENT_ENABLED: "false", WECHAT_PAY_ENABLED: "true" }), account(PaymentMethod.Wechat, {}));

    expect(assessment).toMatchObject({
      provider: "wechat",
      status: "manual_only"
    });
    expect(assessment?.missingRuntimeKeys).toContain("WECHAT_PAY_MCH_ID");
    expect(assessment?.missingAccountKeys).toContain("WECHAT_TRANSFER_OPENID");
  });

  it("reports missing transfer fields before sandbox validation", () => {
    const assessment = assessAgentTransferAccount(
      config({
        REAL_PAYMENT_ENABLED: "true",
        ALIPAY_ENABLED: "true",
        ALIPAY_APP_ID: "app-7"
      }),
      account(PaymentMethod.Alipay, { ALIPAY_PAYEE_ACCOUNT: "***" })
    );

    expect(assessment).toMatchObject({
      provider: "alipay",
      status: "not_ready"
    });
    expect(assessment?.missingRuntimeKeys).toEqual(expect.arrayContaining(["ALIPAY_PRIVATE_KEY_PATH", "ALIPAY_PUBLIC_CERT_PATH", "ALIPAY_TRANSFER_PRODUCT_CODE"]));
    expect(assessment?.missingAccountKeys).toEqual(expect.arrayContaining(["ALIPAY_PAYEE_ACCOUNT", "ALIPAY_PAYEE_REAL_NAME"]));
  });

  it("marks complete transfer configuration as sandbox-ready, not real-ready", () => {
    const assessment = assessAgentTransferAccount(
      config({
        REAL_PAYMENT_ENABLED: "true",
        WECHAT_PAY_ENABLED: "true",
        WECHAT_PAY_MCH_ID: "mch-7",
        WECHAT_PAY_PRIVATE_KEY_PATH: "/certs/wechat.pem",
        WECHAT_PAY_CERT_SERIAL_NO: "serial-7",
        WECHAT_PAY_API_V3_KEY: "12345678901234567890123456789012",
        WECHAT_TRANSFER_APP_ID: "wx-app",
        WECHAT_TRANSFER_SCENE_ID: "1001"
      }),
      account(PaymentMethod.Wechat, {
        WECHAT_TRANSFER_OPENID: "openid-7",
        WECHAT_TRANSFER_REAL_NAME: "Agent Owner"
      })
    );

    expect(assessment).toMatchObject({
      provider: "wechat",
      providerLabel: "微信商家转账",
      status: "sandbox_ready",
      missingRuntimeKeys: [],
      missingAccountKeys: []
    });
  });

  it("keeps complete transfer configuration sandbox-ready when only the rollout flag is enabled", () => {
    const assessment = assessAgentTransferAccount(
      config({
        REAL_PAYMENT_ENABLED: "true",
        AGENT_REAL_TRANSFER_IMPLEMENTED: "true",
        ALIPAY_ENABLED: "true",
        ALIPAY_APP_ID: "app-7",
        ALIPAY_PRIVATE_KEY_PATH: "/certs/alipay-private.pem",
        ALIPAY_PUBLIC_CERT_PATH: "/certs/alipay-public.pem",
        ALIPAY_TRANSFER_PRODUCT_CODE: "TRANS_ACCOUNT_NO_PWD"
      }),
      account(PaymentMethod.Alipay, {
        ALIPAY_PAYEE_ACCOUNT: "agent@example.com",
        ALIPAY_PAYEE_REAL_NAME: "Agent Owner"
      })
    );

    expect(assessment).toMatchObject({
      provider: "alipay",
      providerLabel: "支付宝单笔转账",
      status: "sandbox_ready",
      missingRuntimeKeys: [],
      missingAccountKeys: [],
      realTransferImplemented: false,
      requestTransferImplemented: false,
      queryTransferImplemented: false
    });
    expect(assessment?.nextAction).toContain("先实现并验证");
  });

  it("marks complete WeChat transfer configuration real-ready when implementation and rollout are enabled", () => {
    const assessment = assessAgentTransferAccount(
      config({
        REAL_PAYMENT_ENABLED: "true",
        AGENT_REAL_TRANSFER_IMPLEMENTED: "true",
        WECHAT_PAY_ENABLED: "true",
        WECHAT_PAY_MCH_ID: "mch-7",
        WECHAT_PAY_PRIVATE_KEY_PATH: "/certs/wechat.pem",
        WECHAT_PAY_CERT_SERIAL_NO: "serial-7",
        WECHAT_PAY_API_V3_KEY: "12345678901234567890123456789012",
        WECHAT_PAY_PLATFORM_CERT_PATH: "/certs/platform.pem",
        WECHAT_TRANSFER_APP_ID: "wx-app",
        WECHAT_TRANSFER_SCENE_ID: "1001"
      }),
      account(PaymentMethod.Wechat, {
        WECHAT_TRANSFER_OPENID: "openid-7",
        WECHAT_TRANSFER_REAL_NAME: "Agent Owner"
      })
    );

    expect(assessment).toMatchObject({
      provider: "wechat",
      status: "real_ready",
      missingRuntimeKeys: [],
      missingAccountKeys: [],
      realTransferImplemented: true,
      requestTransferImplemented: true,
      queryTransferImplemented: true
    });
  });

  it("builds transfer drafts and sandbox results without touching real SDKs", () => {
    const adapter = createAgentTransferAdapter(
      "wechat",
      config({ WECHAT_TRANSFER_REMARK: "Agent settlement payout" }),
      account(PaymentMethod.Wechat, {
        WECHAT_TRANSFER_OPENID: "openid-7",
        WECHAT_TRANSFER_REAL_NAME: "Agent Owner"
      })
    );

    expect(adapter.createTransferDraft(settlement())).toMatchObject({
      provider: "wechat",
      settlementNo: "AS20260610001",
      amount: "123.45",
      amountCents: 12345,
      payeeAccount: "openid-7",
      payeeName: "Agent Owner",
      remark: "Agent settlement payout"
    });
    expect(adapter.requestSandboxTransfer(settlement(), { operator: "finance", transferNo: "AST-7" })).toMatchObject({
      mode: "sandbox",
      status: "success",
      transferNo: "AST-7",
      providerTransferNo: "WECHAT_SANDBOX_AST-7",
      failureReason: null,
      raw: { provider: "wechat", mode: "sandbox", settlementId: 11, settlementNo: "AS20260610001", operator: "finance" }
    });
    expect(adapter.requestSandboxTransfer(settlement(), { status: "failed", failureReason: "insufficient balance", transferNo: "AST-8" })).toMatchObject({
      mode: "sandbox",
      status: "failed",
      transferNo: "AST-8",
      providerTransferNo: null,
      failureReason: "insufficient balance"
    });
  });

  it("keeps real transfer request and query behind explicit SDK implementation", () => {
    const adapter = createAgentTransferAdapter("alipay", config({}), account(PaymentMethod.Alipay, {}));

    expect(() => adapter.requestRealTransfer(settlement(), { transferNo: "ART-1" })).toThrow(NotImplementedException);
    expect(() => adapter.queryTransfer()).toThrow(NotImplementedException);
  });

  it("builds signed WeChat merchant transfer request and query drafts", () => {
    const keys = keyPair();
    const draft = createAgentTransferAdapter(
      "wechat",
      config({}),
      account(PaymentMethod.Wechat, {
        WECHAT_TRANSFER_OPENID: "openid-7",
        WECHAT_TRANSFER_REAL_NAME: "Agent Owner"
      })
    ).createTransferDraft(settlement());
    const request = buildWechatTransferRequestDraft(settlement(), draft, {
      appId: "wx-app",
      mchId: "mch-7",
      certSerialNo: "serial-7",
      privateKey: keys.privateKey,
      platformCert: keys.publicKey,
      sceneId: "1001",
      transferNo: "ART-7",
      timestamp: "1780600000",
      nonce: "nonce-7"
    });
    const body = JSON.parse(request.body || "{}");

    expect(request).toMatchObject({
      provider: "wechat",
      method: "POST",
      path: "/v3/fund-app/mch-transfer/transfer-bills"
    });
    expect(request.headers.Authorization).toContain("WECHATPAY2-SHA256-RSA2048 ");
    expect(body).toMatchObject({
      appid: "wx-app",
      out_bill_no: "ART-7",
      transfer_scene_id: "1001",
      openid: "openid-7",
      transfer_amount: 12345
    });
    expect(body.user_name).toBeTruthy();

    expect(
      buildWechatTransferQueryRequestDraft({
        mchId: "mch-7",
        certSerialNo: "serial-7",
        privateKey: keys.privateKey,
        transferNo: "ART-7",
        timestamp: "1780600000",
        nonce: "nonce-7"
      })
    ).toMatchObject({
      method: "GET",
      path: "/v3/fund-app/mch-transfer/transfer-bills/out-bill-no/ART-7",
      body: null
    });
  });

  it("executes WeChat transfer request and query with response signature verification", async () => {
    const keys = keyPair();
    const draft = createAgentTransferAdapter(
      "wechat",
      config({}),
      account(PaymentMethod.Wechat, {
        WECHAT_TRANSFER_OPENID: "openid-7",
        WECHAT_TRANSFER_REAL_NAME: "Agent Owner"
      })
    ).createTransferDraft(settlement());
    const fetchImpl = async () => signedWechatResponse(JSON.stringify({ state: "SUCCESS", transfer_bill_no: "WXBILL7" }), keys.privateKey) as any;

    await expect(
      executeWechatTransferRequest(
        settlement(),
        draft,
        {
          appId: "wx-app",
          mchId: "mch-7",
          certSerialNo: "serial-7",
          privateKey: keys.privateKey,
          platformCert: keys.publicKey,
          sceneId: "1001",
          transferNo: "ART-7"
        },
        fetchImpl
      )
    ).resolves.toMatchObject({
      mode: "real",
      status: "success",
      transferNo: "ART-7",
      providerTransferNo: "WXBILL7"
    });

    await expect(
      executeWechatTransferQuery(
        {
          mchId: "mch-7",
          certSerialNo: "serial-7",
          privateKey: keys.privateKey,
          platformCert: keys.publicKey,
          transferNo: "ART-7"
        },
        async () => signedWechatResponse(JSON.stringify({ state: "FAIL", fail_reason: "ACCOUNT_FROZEN" }), keys.privateKey) as any
      )
    ).resolves.toMatchObject({
      mode: "real",
      status: "failed",
      failureReason: "ACCOUNT_FROZEN"
    });
  });
});
