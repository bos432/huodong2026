import { BadRequestException, NotImplementedException } from "@nestjs/common";
import { createCipheriv, createSign, generateKeyPairSync, randomBytes } from "crypto";
import { writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { deflateRawSync, gzipSync } from "zlib";
import { describe, expect, it } from "vitest";
import { PaymentProviderService } from "./payment-provider.service";
import { buildAlipayPaymentRequestDraft, buildAlipayRefundQueryRequestDraft, buildAlipayRefundRequestDraft, buildAlipaySignedPaymentResult, buildAlipayStatementDownloadUrlRequestDraft, buildWechatPaymentRequestDraft, buildWechatRefundQueryRequestDraft, buildWechatRefundRequestDraft, buildWechatStatementDownloadUrlRequestDraft, downloadProviderStatementText, executeRealPaymentHttpRequestDraft, normalizeAlipayPaymentCreatePayload, normalizeAlipayRefundNotificationPayload, normalizeAlipayRefundQueryPayload, normalizeAlipayRefundRequestPayload, normalizeAlipayStatementText, normalizeWechatPaymentCreatePayload, normalizeWechatRefundNotificationPayload, normalizeWechatRefundQueryPayload, normalizeWechatRefundRequestPayload, normalizeWechatStatementText, parseAlipayRefundNotification, parseWechatRefundNotification, statementDownloadUrl, unwrapAlipayPaymentCreatePayload, unwrapAlipayRefundQueryPayload, unwrapAlipayRefundRequestPayload, unwrapAlipayStatementDownloadUrlPayload, verifyAlipayHttpResponse, verifyWechatHttpResponse } from "./real-payment-adapters";

function config(values: Record<string, string>) {
  return {
    get(key: string, fallback?: string) {
      return values[key] ?? fallback;
    }
  } as any;
}

function service(values: Record<string, string>, accounts: any[] = []) {
  return new PaymentProviderService(config(values), {
    findOne({ where }: any) {
      return Promise.resolve(accounts.find((account) => account.agent.id === where.agent.id && account.provider === where.provider && account.enabled === where.enabled) || null);
    }
  } as any);
}

const keyPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicKeyPem = keyPair.publicKey.export({ type: "spki", format: "pem" }).toString();
const privateKeyPem = keyPair.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const privateKey = keyPair.privateKey;
const certPath = join(tmpdir(), "activity-payment-test-public.pem");
const privateKeyPath = join(tmpdir(), "activity-payment-test-private.pem");
writeFileSync(certPath, publicKeyPem);
writeFileSync(privateKeyPath, privateKeyPem);

function rsaSign(message: string) {
  const signer = createSign("RSA-SHA256");
  signer.update(message);
  signer.end();
  return signer.sign(privateKey, "base64");
}

function responseHeaders(values: Record<string, string>) {
  return {
    get(name: string) {
      const key = Object.keys(values).find((item) => item.toLowerCase() === name.toLowerCase());
      return key ? values[key] : null;
    }
  };
}

function toArrayBuffer(buffer: Buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

function zipEntry(name: string, text: string) {
  const fileName = Buffer.from(name, "utf8");
  const data = Buffer.from(text, "utf8");
  const compressed = deflateRawSync(data);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(8, 8);
  header.writeUInt32LE(0, 10);
  header.writeUInt32LE(0, 14);
  header.writeUInt32LE(compressed.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(fileName.length, 26);
  header.writeUInt16LE(0, 28);
  return Buffer.concat([header, fileName, compressed]);
}

function wechatEncryptResource(payload: Record<string, unknown>, apiV3Key: string, associatedData = "transaction") {
  const nonce = randomBytes(12).toString("base64url").slice(0, 12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(apiV3Key, "utf8"), Buffer.from(nonce, "utf8"));
  cipher.setAAD(Buffer.from(associatedData, "utf8"));
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    algorithm: "AEAD_AES_256_GCM",
    associated_data: associatedData,
    nonce,
    ciphertext: Buffer.concat([encrypted, authTag]).toString("base64")
  };
}

describe("payment provider service", () => {
  it("blocks sandbox payments in production unless explicitly enabled", () => {
    expect(() => service({ NODE_ENV: "production", PAYMENT_SANDBOX_ENABLED: "false" }).assertSandboxAllowed("mock 支付")).toThrow(BadRequestException);
  });

  it("blocks sandbox payments by default outside production too", () => {
    expect(() => service({ NODE_ENV: "development" }).assertSandboxAllowed("mock 支付")).toThrow(BadRequestException);
  });

  it("creates and verifies sandbox callback payloads", async () => {
    const provider = service({ NODE_ENV: "development", PAYMENT_SANDBOX_ENABLED: "true", WECHAT_PAY_SANDBOX_SECRET: "secret" });
    const pay = await provider.createPayment("wechat", { id: 12, orderNo: "OD12", amount: "9.90" } as any, {});
    const callback = provider.parseSandboxCallback("wechat", {
      orderNo: pay.orderNo,
      transactionNo: pay.transactionNo!,
      amount: Number(pay.amount),
      timestamp: pay.timestamp!,
      sign: pay.sign!
    });
    expect(callback).toMatchObject({ orderNo: "OD12", transactionNo: pay.transactionNo, amount: "9.90", signatureValid: true });
  });

  it("keeps provider payments on sandbox mode until real provider flags are enabled", async () => {
    const provider = service({ NODE_ENV: "development", PAYMENT_SANDBOX_ENABLED: "true", REAL_PAYMENT_ENABLED: "false", WECHAT_PAY_ENABLED: "true" });
    const pay = await provider.createPayment("wechat", { id: 7, orderNo: "OD7", amount: "19" } as any, {});
    expect(pay).toMatchObject({ provider: "wechat", mode: "sandbox", orderNo: "OD7", amount: "19.00" });
  });

  const realWechatConfig = {
    NODE_ENV: "production",
    REAL_PAYMENT_ENABLED: "true",
    WECHAT_PAY_ENABLED: "true",
    WECHAT_PAY_APP_ID: "wx-app",
    WECHAT_PAY_MCH_ID: "mch",
    WECHAT_PAY_API_V3_KEY: "12345678901234567890123456789012",
    WECHAT_PAY_PRIVATE_KEY_PATH: "/certs/wechat.pem",
    WECHAT_PAY_CERT_SERIAL_NO: "serial",
    WECHAT_PAY_PLATFORM_CERT_PATH: certPath,
    WECHAT_PAY_NOTIFY_URL: "https://api.example.com/payment/wechat/callback"
  };

  const realAlipayConfig = {
    NODE_ENV: "production",
    REAL_PAYMENT_ENABLED: "true",
    ALIPAY_ENABLED: "true",
    ALIPAY_APP_ID: "ali-app",
    ALIPAY_PRIVATE_KEY_PATH: "/certs/alipay-private.pem",
    ALIPAY_PUBLIC_CERT_PATH: certPath,
    ALIPAY_ROOT_CERT_PATH: "/certs/alipay-root.crt",
    ALIPAY_NOTIFY_URL: "https://api.example.com/payment/alipay/callback"
  };

  it("validates real provider config before SDK payment creation", async () => {
    const provider = service({ NODE_ENV: "production", REAL_PAYMENT_ENABLED: "true", WECHAT_PAY_ENABLED: "true" });
    await expect(provider.createPayment("wechat", { id: 7, orderNo: "OD7", amount: "19" } as any, {})).rejects.toThrow(NotImplementedException);
  });

  it("rejects real payment creation until the provider SDK is implemented", async () => {
    const provider = service(realWechatConfig);
    await expect(provider.createPayment("wechat", { id: 7, orderNo: "OD7", amount: "19", registration: { activity: { title: "Test Activity" } } } as any, {})).rejects.toThrow(NotImplementedException);
  });

  it("requires agent payment account when an agent owns the order", async () => {
    const provider = service(realWechatConfig);
    await expect(provider.createPayment("wechat", { id: 7, orderNo: "OD7", amount: "19", agent: { id: 3 } } as any, {})).rejects.toThrow(BadRequestException);
  });

  it("uses agent payment account config when an agent owns the order", async () => {
    const provider = service(
      { NODE_ENV: "production", REAL_PAYMENT_ENABLED: "true", WECHAT_PAY_ENABLED: "true" },
      [
        {
          agent: { id: 3 },
          provider: "wechat",
          enabled: true,
          config: realWechatConfig
        }
      ]
    );
    await expect(provider.createPayment("wechat", { id: 7, orderNo: "OD7", amount: "19", agent: { id: 3 } } as any, {})).rejects.toThrow(NotImplementedException);
  });

  it("requires raw callback payload before real provider verification", async () => {
    const provider = service(realAlipayConfig);
    await expect(provider.parseRealPaymentCallback("alipay", { body: { out_trade_no: "OD7" } })).rejects.toThrow(BadRequestException);
  });

  it("requires alipay callback signature fields before certificate verification", async () => {
    const provider = service(realAlipayConfig);
    await expect(provider.parseRealPaymentCallback("alipay", { body: { out_trade_no: "OD7" }, rawBody: "out_trade_no=OD7" })).rejects.toThrow(BadRequestException);
  });

  it("extracts real callback order numbers before account-specific verification", () => {
    const provider = service({ ...realAlipayConfig, WECHAT_PAY_ENABLED: "true" });
    expect(provider.extractRealCallbackOrderNo("alipay", { body: { out_trade_no: "OD7" } })).toBe("OD7");
    expect(provider.extractRealCallbackOrderNo("wechat", { body: { orderNo: "OD8" } })).toBe("OD8");
    expect(() => provider.extractRealCallbackOrderNo("wechat", { body: { resource: {} } })).toThrow(BadRequestException);
  });

  it("ignores external tenant hints when extracting real callback order numbers", () => {
    const provider = service({ ...realAlipayConfig, WECHAT_PAY_ENABLED: "true" });
    expect(provider.extractRealCallbackOrderNo("alipay", { body: { tenantId: 99, tenantCode: "other", out_trade_no: "OD7" } })).toBe("OD7");
    expect(provider.extractRealCallbackOrderNo("wechat", { body: { tenantId: 99, tenantCode: "other", orderNo: "OD8" } })).toBe("OD8");
  });

  it("normalizes alipay callbacks after certificate verification succeeds", async () => {
    const provider = service(realAlipayConfig);
    const body = { app_id: "ali-app", charset: "utf-8", sign_type: "RSA2", trade_no: "TRADE7", out_trade_no: "OD7", total_amount: "19.90", trade_status: "TRADE_SUCCESS" };
    const signContent = "app_id=ali-app&charset=utf-8&out_trade_no=OD7&total_amount=19.90&trade_no=TRADE7&trade_status=TRADE_SUCCESS";
    await expect(
      provider.parseRealPaymentCallback("alipay", {
        body: { ...body, sign: rsaSign(signContent) },
        rawBody: "app_id=ali-app&out_trade_no=OD7"
      })
    ).resolves.toMatchObject({ orderNo: "OD7", transactionNo: "TRADE7", amount: "19.90", signatureValid: true });
  });

  it("uses platform config for real callbacks when the order has no agent", async () => {
    const provider = service(realAlipayConfig);
    const body = { app_id: "ali-app", charset: "utf-8", sign_type: "RSA2", trade_no: "TRADE7", out_trade_no: "OD7", total_amount: "19.90", trade_status: "TRADE_SUCCESS" };
    const signContent = "app_id=ali-app&charset=utf-8&out_trade_no=OD7&total_amount=19.90&trade_no=TRADE7&trade_status=TRADE_SUCCESS";
    await expect(
      provider.parseRealPaymentCallbackForOrder("alipay", { id: 7, orderNo: "OD7", agent: null } as any, {
        body: { ...body, sign: rsaSign(signContent) },
        rawBody: "app_id=ali-app&out_trade_no=OD7"
      })
    ).resolves.toMatchObject({ orderNo: "OD7", transactionNo: "TRADE7", amount: "19.90", signatureValid: true });
  });

  it("requires agent payment account before real callback verification for agent orders", async () => {
    const provider = service(realAlipayConfig);
    await expect(provider.parseRealPaymentCallbackForOrder("alipay", { id: 7, orderNo: "OD7", agent: { id: 3 } } as any, { body: { out_trade_no: "OD7" }, rawBody: "out_trade_no=OD7" })).rejects.toThrow(BadRequestException);
  });

  it("uses agent payment account config for real callback verification", async () => {
    const provider = service(
      { NODE_ENV: "production", REAL_PAYMENT_ENABLED: "true", ALIPAY_ENABLED: "true" },
      [
        {
          agent: { id: 3 },
          tenant: { id: 10 },
          provider: "alipay",
          enabled: true,
          config: realAlipayConfig
        }
      ]
    );
    const body = { app_id: "ali-app", charset: "utf-8", sign_type: "RSA2", trade_no: "TRADE7", out_trade_no: "OD7", total_amount: "19.90", trade_status: "TRADE_SUCCESS" };
    const signContent = "app_id=ali-app&charset=utf-8&out_trade_no=OD7&total_amount=19.90&trade_no=TRADE7&trade_status=TRADE_SUCCESS";
    await expect(
      provider.parseRealPaymentCallbackForOrder("alipay", { id: 7, orderNo: "OD7", agent: { id: 3 }, tenant: { id: 10 } } as any, {
        body: { ...body, sign: rsaSign(signContent) },
        rawBody: "app_id=ali-app&out_trade_no=OD7"
      })
    ).resolves.toMatchObject({ orderNo: "OD7", transactionNo: "TRADE7", amount: "19.90", signatureValid: true });
  });

  it("rejects alipay callbacks that are verified but not paid successfully", async () => {
    const provider = service(realAlipayConfig);
    const body = { app_id: "ali-app", charset: "utf-8", sign_type: "RSA2", trade_no: "TRADE7", out_trade_no: "OD7", total_amount: "19.90", trade_status: "WAIT_BUYER_PAY" };
    const signContent = "app_id=ali-app&charset=utf-8&out_trade_no=OD7&total_amount=19.90&trade_no=TRADE7&trade_status=WAIT_BUYER_PAY";
    await expect(
      provider.parseRealPaymentCallback("alipay", {
        body: { ...body, sign: rsaSign(signContent) },
        rawBody: "app_id=ali-app&out_trade_no=OD7"
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects agent payment accounts from a different tenant before real callback verification", async () => {
    const provider = service(
      { NODE_ENV: "production", REAL_PAYMENT_ENABLED: "true", ALIPAY_ENABLED: "true" },
      [
        {
          agent: { id: 3 },
          tenant: { id: 20 },
          provider: "alipay",
          enabled: true,
          config: realAlipayConfig
        }
      ]
    );
    await expect(
      provider.parseRealPaymentCallbackForOrder("alipay", { id: 7, orderNo: "OD7", agent: { id: 3 }, tenant: { id: 10 } } as any, {
        body: { out_trade_no: "OD7" },
        rawBody: "out_trade_no=OD7"
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects alipay callbacks with invalid certificate signatures", async () => {
    const provider = service(realAlipayConfig);
    await expect(
      provider.parseRealPaymentCallback("alipay", {
        body: { app_id: "ali-app", charset: "utf-8", sign: "bad", sign_type: "RSA2", trade_no: "TRADE7", out_trade_no: "OD7" },
        rawBody: "app_id=ali-app&out_trade_no=OD7"
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("requires wechat callback signature headers before certificate verification", async () => {
    const provider = service(realWechatConfig);
    await expect(provider.parseRealPaymentCallback("wechat", { body: { resource: {} }, rawBody: "{}" })).rejects.toThrow(BadRequestException);
  });

  it("decrypts and normalizes wechat callbacks after signature verification succeeds", async () => {
    const provider = service(realWechatConfig);
    const timestamp = "1710000000";
    const nonce = "nonce";
    const resource = wechatEncryptResource({ out_trade_no: "OD8", transaction_id: "WXTX8", trade_state: "SUCCESS", amount: { payer_total: 1990, total: 1990 } }, realWechatConfig.WECHAT_PAY_API_V3_KEY);
    const body = { resource };
    const rawBody = JSON.stringify(body);
    const signature = rsaSign(`${timestamp}\n${nonce}\n${rawBody}\n`);
    await expect(
      provider.parseRealPaymentCallback("wechat", {
        body,
        rawBody,
        headers: {
          "wechatpay-timestamp": timestamp,
          "wechatpay-nonce": nonce,
          "wechatpay-signature": signature,
          "wechatpay-serial": "serial"
        }
      })
    ).resolves.toMatchObject({ orderNo: "OD8", transactionNo: "WXTX8", amount: "19.90", signatureValid: true });
  });

  it("rejects wechat callbacks that decrypt but are not successful", async () => {
    const provider = service(realWechatConfig);
    const timestamp = "1710000000";
    const nonce = "nonce";
    const resource = wechatEncryptResource({ out_trade_no: "OD8", transaction_id: "WXTX8", trade_state: "NOTPAY", amount: { payer_total: 1990, total: 1990 } }, realWechatConfig.WECHAT_PAY_API_V3_KEY);
    const body = { resource };
    const rawBody = JSON.stringify(body);
    const signature = rsaSign(`${timestamp}\n${nonce}\n${rawBody}\n`);
    await expect(
      provider.parseRealPaymentCallback("wechat", {
        body,
        rawBody,
        headers: {
          "wechatpay-timestamp": timestamp,
          "wechatpay-nonce": nonce,
          "wechatpay-signature": signature,
          "wechatpay-serial": "serial"
        }
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects wechat callbacks with invalid certificate signatures", async () => {
    const provider = service(realWechatConfig);
    await expect(
      provider.parseRealPaymentCallback("wechat", {
        body: { resource: {} },
        rawBody: "{}",
        headers: {
          "wechatpay-timestamp": "1710000000",
          "wechatpay-nonce": "nonce",
          "wechatpay-signature": "bad",
          "wechatpay-serial": "serial"
        }
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("keeps incomplete real provider config blocked before SDK calls", async () => {
    const provider = service({ NODE_ENV: "production", REAL_PAYMENT_ENABLED: "true", WECHAT_PAY_ENABLED: "true" });
    await expect(provider.createPayment("wechat", { id: 7, orderNo: "OD7", amount: "19" } as any, {})).rejects.toThrow(NotImplementedException);
  });

  it("keeps dto-based real callback parsing blocked because providers require raw payloads", () => {
    const provider = service(realAlipayConfig);
    expect(() =>
      provider.parsePaymentCallback("alipay", {
        orderNo: "OD7",
        transactionNo: "TX7",
        amount: 19,
        timestamp: "1",
        sign: "bad"
      })
    ).toThrow(NotImplementedException);
  });

  it("rejects real refunds when real payment is disabled or provider SDK is missing", async () => {
    const order = { id: 7, orderNo: "OD7", amount: "19" } as any;
    await expect(service({ REAL_PAYMENT_ENABLED: "false" }).requestRefund({ provider: "wechat", order, refundNo: "RF7", amount: "5.00" })).rejects.toThrow(BadRequestException);
    await expect(service(realWechatConfig).requestRefund({ provider: "wechat", order, refundNo: "RF7", amount: "5.00" })).rejects.toThrow(NotImplementedException);
  });

  it("keeps real refund query blocked until the implementation flag is enabled", async () => {
    const order = { id: 7, orderNo: "OD7", amount: "19" } as any;
    await expect(service(realWechatConfig).queryRefund({ provider: "wechat", order, refundNo: "RF7", providerRefundNo: "WXRF7" })).rejects.toThrow(NotImplementedException);
  });

  it("normalizes wechat real refund query statuses", () => {
    const request = { provider: "wechat", order: { orderNo: "OD7" }, refundNo: "RF7", providerRefundNo: "WXRF7" } as any;
    expect(normalizeWechatRefundQueryPayload(request, { status: "SUCCESS", refund_id: "WXRF8" })).toMatchObject({ provider: "wechat", orderNo: "OD7", refundNo: "RF7", providerRefundNo: "WXRF8", status: "success" });
    expect(normalizeWechatRefundQueryPayload(request, { status: "PROCESSING" })).toMatchObject({ providerRefundNo: "WXRF7", status: "processing" });
    expect(normalizeWechatRefundQueryPayload(request, { status: "ABNORMAL", abnormal_reason: "BANK_ERROR" })).toMatchObject({ status: "processing", failureReason: "BANK_ERROR" });
    expect(normalizeWechatRefundQueryPayload(request, { status: "CLOSED", status_description: "closed by provider" })).toMatchObject({ status: "failed", failureReason: "closed by provider" });
    expect(normalizeWechatRefundQueryPayload(request, { status: "REFUNDCLOSE" })).toMatchObject({ status: "failed" });
    expect(() => normalizeWechatRefundQueryPayload(request, { status: "MYSTERY" })).toThrow(BadRequestException);
  });

  it("normalizes alipay real refund query statuses", () => {
    const request = { provider: "alipay", order: { orderNo: "OD7" }, refundNo: "RF7", providerRefundNo: "ALIRF7" } as any;
    expect(normalizeAlipayRefundQueryPayload(request, { refund_status: "REFUND_SUCCESS", trade_no: "ALIRF8" })).toMatchObject({ provider: "alipay", orderNo: "OD7", refundNo: "RF7", providerRefundNo: "ALIRF8", status: "success" });
    expect(normalizeAlipayRefundQueryPayload(request, { refund_status: "PROCESSING" })).toMatchObject({ providerRefundNo: "ALIRF7", status: "processing" });
    expect(normalizeAlipayRefundQueryPayload(request, { refund_status: "REFUND_FAIL", refund_error_code: "ACQ.SYSTEM_ERROR" })).toMatchObject({ status: "failed", failureReason: "ACQ.SYSTEM_ERROR" });
    expect(normalizeAlipayRefundQueryPayload(request, { status: "SUCCESS" })).toMatchObject({ status: "success" });
    expect(() => normalizeAlipayRefundQueryPayload(request, { refund_status: "UNKNOWN" })).toThrow(BadRequestException);
  });

  it("normalizes wechat real refund notification payloads", () => {
    expect(
      normalizeWechatRefundNotificationPayload({
        out_trade_no: "OD7",
        out_refund_no: "RF7",
        refund_id: "WXRF7",
        status: "SUCCESS"
      })
    ).toMatchObject({ provider: "wechat", orderNo: "OD7", refundNo: "RF7", providerRefundNo: "WXRF7", status: "success" });
    expect(normalizeWechatRefundNotificationPayload({ out_trade_no: "OD7", out_refund_no: "RF7", status: "ABNORMAL", abnormal_reason: "BANK_ERROR" })).toMatchObject({ status: "processing", failureReason: "BANK_ERROR" });
    expect(() => normalizeWechatRefundNotificationPayload({ out_trade_no: "OD7", out_refund_no: "RF7", status: "MYSTERY" })).toThrow(BadRequestException);
    expect(() => normalizeWechatRefundNotificationPayload({ out_trade_no: "OD7", status: "SUCCESS" })).toThrow(BadRequestException);
  });

  it("decrypts and normalizes wechat real refund notifications", () => {
    const resource = wechatEncryptResource({ out_trade_no: "OD7", out_refund_no: "RF7", refund_id: "WXRF7", status: "SUCCESS" }, realWechatConfig.WECHAT_PAY_API_V3_KEY, "refund");
    expect(parseWechatRefundNotification({ body: { resource } }, realWechatConfig.WECHAT_PAY_API_V3_KEY)).toMatchObject({ provider: "wechat", orderNo: "OD7", refundNo: "RF7", providerRefundNo: "WXRF7", status: "success" });
    expect(() => parseWechatRefundNotification({ body: { resource: { ...resource, ciphertext: "bad" } } }, realWechatConfig.WECHAT_PAY_API_V3_KEY)).toThrow(BadRequestException);
  });

  it("keeps real refund notifications blocked until the implementation flag is enabled", async () => {
    const provider = service(realWechatConfig);
    await expect(provider.parseRealRefundNotificationForOrder("wechat", { orderNo: "OD7" } as any, { body: { orderNo: "OD7", resource: {} }, rawBody: "{}" })).rejects.toThrow(NotImplementedException);
  });

  it("verifies and parses wechat real refund notifications through the adapter", async () => {
    const body = { orderNo: "OD7", resource: wechatEncryptResource({ out_trade_no: "OD7", out_refund_no: "RF7", refund_id: "WXRF7", status: "SUCCESS" }, realWechatConfig.WECHAT_PAY_API_V3_KEY, "refund") };
    const rawBody = JSON.stringify(body);
    const timestamp = "1710000000";
    const nonce = "nonce";
    const signature = rsaSign(`${timestamp}\n${nonce}\n${rawBody}\n`);
    const provider = service({ ...realWechatConfig, REAL_REFUND_QUERY_IMPLEMENTED: "true" });
    await expect(
      provider.parseRealRefundNotificationForOrder("wechat", { orderNo: "OD7" } as any, {
        body,
        rawBody,
        headers: { "wechatpay-timestamp": timestamp, "wechatpay-nonce": nonce, "wechatpay-signature": signature, "wechatpay-serial": "serial" }
      })
    ).resolves.toMatchObject({ provider: "wechat", orderNo: "OD7", refundNo: "RF7", providerRefundNo: "WXRF7", status: "success" });
  });

  it("normalizes alipay real refund notification payloads", () => {
    expect(
      parseAlipayRefundNotification({
        out_trade_no: "OD7",
        out_request_no: "RF7",
        trade_no: "ALIRF7",
        refund_status: "REFUND_SUCCESS"
      })
    ).toMatchObject({ provider: "alipay", orderNo: "OD7", refundNo: "RF7", providerRefundNo: "ALIRF7", status: "success" });
    expect(normalizeAlipayRefundNotificationPayload({ out_trade_no: "OD7", out_biz_no: "RF7", refund_status: "REFUND_FAIL", refund_error_code: "ACQ.SYSTEM_ERROR" })).toMatchObject({ status: "failed", failureReason: "ACQ.SYSTEM_ERROR" });
    expect(() => normalizeAlipayRefundNotificationPayload({ out_trade_no: "OD7", out_request_no: "RF7", refund_status: "UNKNOWN" })).toThrow(BadRequestException);
    expect(() => normalizeAlipayRefundNotificationPayload({ out_trade_no: "OD7", refund_status: "REFUND_SUCCESS" })).toThrow(BadRequestException);
  });

  it("verifies and parses alipay real refund notifications through the adapter", async () => {
    const body: Record<string, unknown> = {
      app_id: "ali-app",
      charset: "utf-8",
      sign_type: "RSA2",
      trade_no: "ALIRF7",
      out_trade_no: "OD7",
      out_request_no: "RF7",
      refund_status: "REFUND_SUCCESS"
    };
    const signContent = Object.keys(body)
      .filter((key) => key !== "sign" && key !== "sign_type")
      .sort()
      .map((key) => `${key}=${String(body[key])}`)
      .join("&");
    body.sign = rsaSign(signContent);
    const provider = service({ ...realAlipayConfig, REAL_REFUND_QUERY_IMPLEMENTED: "true" });
    await expect(provider.parseRealRefundNotificationForOrder("alipay", { orderNo: "OD7" } as any, { body, rawBody: new URLSearchParams(body as Record<string, string>).toString() })).resolves.toMatchObject({ provider: "alipay", orderNo: "OD7", refundNo: "RF7", providerRefundNo: "ALIRF7", status: "success" });
  });

  it("uses agent payment account config when parsing real refund notifications", async () => {
    const agentApiKey = "abcdefghijklmnopqrstuvwxyz123456";
    const agentConfig = {
      WECHAT_PAY_APP_ID: "wx-agent",
      WECHAT_PAY_MCH_ID: "agent-mch",
      WECHAT_PAY_API_V3_KEY: agentApiKey,
      WECHAT_PAY_PRIVATE_KEY_PATH: "/certs/agent-wechat.pem",
      WECHAT_PAY_CERT_SERIAL_NO: "agent-serial",
      WECHAT_PAY_PLATFORM_CERT_PATH: certPath,
      WECHAT_PAY_NOTIFY_URL: "https://agent.example.com/payment/wechat/callback",
      REAL_REFUND_QUERY_IMPLEMENTED: "true"
    };
    const body = { orderNo: "OD7", resource: wechatEncryptResource({ out_trade_no: "OD7", out_refund_no: "RF7", refund_id: "WXRF7", status: "SUCCESS" }, agentApiKey, "refund") };
    const rawBody = JSON.stringify(body);
    const provider = service(
      { ...realWechatConfig, REAL_REFUND_QUERY_IMPLEMENTED: "true" },
      [{ agent: { id: 3 }, tenant: { id: 10 }, provider: "wechat", enabled: true, config: agentConfig }]
    );
    await expect(
      provider.parseRealRefundNotificationForOrder("wechat", { orderNo: "OD7", agent: { id: 3 }, tenant: { id: 10 } } as any, {
        body,
        rawBody,
        headers: { "wechatpay-timestamp": "1710000000", "wechatpay-nonce": "nonce", "wechatpay-signature": rsaSign(`1710000000\nnonce\n${rawBody}\n`), "wechatpay-serial": "serial" }
      })
    ).resolves.toMatchObject({ orderNo: "OD7", refundNo: "RF7", status: "success" });
  });

  it("builds signed wechat real payment request drafts without sending network calls", () => {
    const order = { orderNo: "OD7", amount: "19.00", registration: { activity: { title: "Test Activity" } } } as any;
    const draft = buildWechatPaymentRequestDraft(order, {}, {
      appId: "wx-app",
      mchId: "mch",
      certSerialNo: "serial",
      privateKey,
      notifyUrl: "https://api.example.com/payment/wechat/callback",
      baseUrl: "https://wechat.example.test",
      timestamp: "1710000000",
      nonce: "nonce"
    });
    expect(draft).toMatchObject({ provider: "wechat", method: "POST", path: "/v3/pay/transactions/native", url: "https://wechat.example.test/v3/pay/transactions/native" });
    expect(JSON.parse(draft.body || "{}")).toMatchObject({
      appid: "wx-app",
      mchid: "mch",
      description: "Test Activity",
      out_trade_no: "OD7",
      notify_url: "https://api.example.com/payment/wechat/callback",
      amount: { total: 1900, currency: "CNY" }
    });
    expect(draft.headers.Authorization).toContain('mchid="mch"');
    expect(draft.headers.Authorization).toContain('serial_no="serial"');
  });

  it("builds signed alipay real payment request drafts without sending network calls", () => {
    const order = { orderNo: "OD7", amount: "19.00", registration: { activity: { title: "Test Activity" } } } as any;
    const draft = buildAlipayPaymentRequestDraft(order, {}, {
      appId: "ali-app",
      privateKey,
      notifyUrl: "https://api.example.com/payment/alipay/callback",
      gatewayUrl: "https://alipay.example.test/gateway.do",
      timestamp: "2026-06-09 17:00:00"
    });
    const params = new URLSearchParams(draft.body || "");
    expect(draft).toMatchObject({ provider: "alipay", method: "POST", path: "/gateway.do", url: "https://alipay.example.test/gateway.do" });
    expect(params.get("app_id")).toBe("ali-app");
    expect(params.get("method")).toBe("alipay.trade.precreate");
    expect(params.get("notify_url")).toBe("https://api.example.com/payment/alipay/callback");
    expect(params.get("timestamp")).toBe("2026-06-09 17:00:00");
    expect(params.get("biz_content")).toBe(JSON.stringify({ out_trade_no: "OD7", total_amount: "19.00", subject: "Test Activity", product_code: "FACE_TO_FACE_PAYMENT" }));
    expect(params.get("sign")).toBeTruthy();
  });

  it("normalizes real payment create responses", () => {
    const order = { orderNo: "OD7", amount: "19.00" } as any;
    expect(normalizeWechatPaymentCreatePayload(order, { code_url: "weixin://wxpay/bizpayurl?pr=abc" })).toMatchObject({
      provider: "wechat",
      mode: "real",
      orderNo: "OD7",
      amount: "19.00",
      transactionNo: null,
      callbackPath: "/payment/wechat/callback",
      payParams: { tradeType: "NATIVE", codeUrl: "weixin://wxpay/bizpayurl?pr=abc" }
    });
    expect(normalizeAlipayPaymentCreatePayload(order, { qr_code: "https://qr.alipay.com/bax-test" })).toMatchObject({
      provider: "alipay",
      mode: "real",
      orderNo: "OD7",
      amount: "19.00",
      transactionNo: null,
      callbackPath: "/payment/alipay/callback",
      payParams: { tradeType: "PRECREATE", qrCode: "https://qr.alipay.com/bax-test" }
    });
    expect(unwrapAlipayPaymentCreatePayload({ alipay_trade_precreate_response: { code: "10000", qr_code: "https://qr.alipay.com/bax-test" } })).toMatchObject({ code: "10000", qr_code: "https://qr.alipay.com/bax-test" });
    expect(() => normalizeWechatPaymentCreatePayload(order, {})).toThrow(BadRequestException);
    expect(() => normalizeAlipayPaymentCreatePayload(order, {})).toThrow(BadRequestException);
  });

  it("builds wechat H5 and JSAPI real payment request drafts", () => {
    const order = { orderNo: "OD7", amount: "19.00", registration: { activity: { title: "Test Activity" } } } as any;
    const h5Draft = buildWechatPaymentRequestDraft(order, { paymentScene: "h5", clientIp: "203.0.113.9" }, {
      appId: "wx-app",
      mchId: "mch",
      certSerialNo: "serial",
      privateKey,
      notifyUrl: "https://api.example.com/payment/wechat/callback",
      baseUrl: "https://wechat.example.test",
      timestamp: "1710000000",
      nonce: "nonce"
    });
    expect(h5Draft.path).toBe("/v3/pay/transactions/h5");
    expect(JSON.parse(h5Draft.body || "{}")).toMatchObject({ out_trade_no: "OD7", scene_info: { payer_client_ip: "203.0.113.9", h5_info: { type: "Wap" } } });

    const jsapiDraft = buildWechatPaymentRequestDraft(order, { paymentScene: "jsapi", openId: "openid-7" }, {
      appId: "wx-app",
      mchId: "mch",
      certSerialNo: "serial",
      privateKey,
      notifyUrl: "https://api.example.com/payment/wechat/callback",
      baseUrl: "https://wechat.example.test",
      timestamp: "1710000000",
      nonce: "nonce"
    });
    expect(jsapiDraft.path).toBe("/v3/pay/transactions/jsapi");
    expect(JSON.parse(jsapiDraft.body || "{}")).toMatchObject({ out_trade_no: "OD7", payer: { openid: "openid-7" } });
    expect(() => buildWechatPaymentRequestDraft(order, { paymentScene: "jsapi" }, { appId: "wx-app", mchId: "mch", certSerialNo: "serial", privateKey, notifyUrl: "https://api.example.com/payment/wechat/callback" })).toThrow(BadRequestException);
  });

  it("normalizes wechat H5 and JSAPI real payment responses", () => {
    const order = { orderNo: "OD7", amount: "19.00" } as any;
    expect(normalizeWechatPaymentCreatePayload(order, { h5_url: "https://wx.tenpay.com/h5pay" }, { paymentScene: "h5" })).toMatchObject({ payParams: { tradeType: "H5", h5Url: "https://wx.tenpay.com/h5pay" } });
    const jsapi = normalizeWechatPaymentCreatePayload(order, { prepay_id: "wx-prepay-7" }, { paymentScene: "jsapi" }, { appId: "wx-app", privateKey, timestamp: "1710000000", nonce: "nonce" });
    expect(jsapi).toMatchObject({ payParams: { tradeType: "JSAPI", appId: "wx-app", timeStamp: "1710000000", nonceStr: "nonce", package: "prepay_id=wx-prepay-7", signType: "RSA" } });
    expect(jsapi.payParams.paySign).toBeTruthy();
    expect(() => normalizeWechatPaymentCreatePayload(order, {}, { paymentScene: "h5" })).toThrow(BadRequestException);
  });

  it("builds signed alipay WAP and PAGE payment results without network calls", () => {
    const order = { orderNo: "OD7", amount: "19.00", registration: { activity: { title: "Test Activity" } } } as any;
    const wap = buildAlipaySignedPaymentResult(order, { paymentScene: "wap", returnUrl: "https://h5.example.com/orders/7" }, {
      appId: "ali-app",
      privateKey,
      notifyUrl: "https://api.example.com/payment/alipay/callback",
      gatewayUrl: "https://alipay.example.test/gateway.do",
      timestamp: "2026-06-09 17:00:00"
    });
    const wapParams = new URLSearchParams(String(wap.payParams.formBody));
    expect(wap).toMatchObject({ payParams: { tradeType: "WAP", gatewayUrl: "https://alipay.example.test/gateway.do", method: "alipay.trade.wap.pay" } });
    expect(wapParams.get("return_url")).toBe("https://h5.example.com/orders/7");
    expect(wapParams.get("biz_content")).toBe(JSON.stringify({ out_trade_no: "OD7", total_amount: "19.00", subject: "Test Activity", product_code: "QUICK_WAP_WAY" }));

    const page = buildAlipaySignedPaymentResult(order, { paymentScene: "page" }, {
      appId: "ali-app",
      privateKey,
      notifyUrl: "https://api.example.com/payment/alipay/callback",
      timestamp: "2026-06-09 17:00:00"
    });
    const pageParams = new URLSearchParams(String(page.payParams.formBody));
    expect(page).toMatchObject({ payParams: { tradeType: "PAGE", method: "alipay.trade.page.pay" } });
    expect(pageParams.get("biz_content")).toBe(JSON.stringify({ out_trade_no: "OD7", total_amount: "19.00", subject: "Test Activity", product_code: "FAST_INSTANT_TRADE_PAY" }));
    expect(pageParams.get("sign")).toBeTruthy();
  });

  it("executes signed wechat real payment requests when the SDK flag is enabled", async () => {
    const originalFetch = globalThis.fetch;
    const responseBody = JSON.stringify({ code_url: "weixin://wxpay/bizpayurl?pr=abc" });
    const timestamp = "1710000000";
    const nonce = "nonce";
    const signature = rsaSign(`${timestamp}\n${nonce}\n${responseBody}\n`);
    let captured: any = null;
    globalThis.fetch = (async (url: string, init: any) => {
      captured = { url, init };
      return { ok: true, status: 200, statusText: "OK", headers: responseHeaders({ "wechatpay-timestamp": timestamp, "wechatpay-nonce": nonce, "wechatpay-signature": signature }), text: async () => responseBody };
    }) as any;
    try {
      const provider = service({ ...realWechatConfig, REAL_PAYMENT_SDK_IMPLEMENTED: "true", WECHAT_PAY_PRIVATE_KEY_PATH: privateKeyPath });
      await expect(provider.createPayment("wechat", { orderNo: "OD7", amount: "19.00", registration: { activity: { title: "Test Activity" } } } as any, {})).resolves.toMatchObject({ provider: "wechat", mode: "real", orderNo: "OD7", payParams: { tradeType: "NATIVE", codeUrl: "weixin://wxpay/bizpayurl?pr=abc" } });
      expect(captured.url).toBe("https://api.mch.weixin.qq.com/v3/pay/transactions/native");
      expect(JSON.parse(captured.init.body)).toMatchObject({ out_trade_no: "OD7", description: "Test Activity" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("executes signed alipay real payment requests when the SDK flag is enabled", async () => {
    const originalFetch = globalThis.fetch;
    const response = { alipay_trade_precreate_response: { code: "10000", qr_code: "https://qr.alipay.com/bax-test" } };
    const signContent = `alipay_trade_precreate_response=${JSON.stringify(response.alipay_trade_precreate_response)}`;
    let captured: any = null;
    globalThis.fetch = (async (url: string, init: any) => {
      captured = { url, init };
      return { ok: true, status: 200, statusText: "OK", text: async () => JSON.stringify({ ...response, sign: rsaSign(signContent), sign_type: "RSA2" }) };
    }) as any;
    try {
      const provider = service({ ...realAlipayConfig, REAL_PAYMENT_SDK_IMPLEMENTED: "true", ALIPAY_PRIVATE_KEY_PATH: privateKeyPath });
      await expect(provider.createPayment("alipay", { orderNo: "OD7", amount: "19.00", registration: { activity: { title: "Test Activity" } } } as any, {})).resolves.toMatchObject({ provider: "alipay", mode: "real", orderNo: "OD7", payParams: { tradeType: "PRECREATE", qrCode: "https://qr.alipay.com/bax-test" } });
      expect(captured.url).toBe("https://openapi.alipay.com/gateway.do");
      expect(new URLSearchParams(captured.init.body).get("method")).toBe("alipay.trade.precreate");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns signed alipay WAP payment params through the adapter without HTTP calls", async () => {
    const provider = service({ ...realAlipayConfig, REAL_PAYMENT_SDK_IMPLEMENTED: "true", ALIPAY_PRIVATE_KEY_PATH: privateKeyPath });
    await expect(provider.createPayment("alipay", { orderNo: "OD7", amount: "19.00", registration: { activity: { title: "Test Activity" } } } as any, { paymentScene: "wap", returnUrl: "https://h5.example.com/orders/7" })).resolves.toMatchObject({
      provider: "alipay",
      mode: "real",
      orderNo: "OD7",
      payParams: { tradeType: "WAP", method: "alipay.trade.wap.pay", gatewayUrl: "https://openapi.alipay.com/gateway.do" }
    });
  });

  it("builds signed wechat real refund query request drafts without sending network calls", () => {
    const request = { provider: "wechat", order: { orderNo: "OD7" }, refundNo: "RF/7" } as any;
    const draft = buildWechatRefundQueryRequestDraft(request, {
      mchId: "mch",
      certSerialNo: "serial",
      privateKey,
      baseUrl: "https://wechat.example.test",
      timestamp: "1710000000",
      nonce: "nonce"
    });
    expect(draft).toMatchObject({
      provider: "wechat",
      method: "GET",
      path: "/v3/refund/domestic/refunds/RF%2F7",
      url: "https://wechat.example.test/v3/refund/domestic/refunds/RF%2F7",
      body: null
    });
    expect(draft.headers.Authorization).toContain("WECHATPAY2-SHA256-RSA2048 ");
    expect(draft.headers.Authorization).toContain('mchid="mch"');
    expect(draft.headers.Authorization).toContain('nonce_str="nonce"');
    expect(draft.headers.Authorization).toContain('timestamp="1710000000"');
    expect(draft.headers.Authorization).toContain('serial_no="serial"');
    expect(draft.headers.Authorization).toContain('signature="');
  });

  it("builds signed wechat real refund request drafts without sending network calls", () => {
    const request = { provider: "wechat", order: { orderNo: "OD7", amount: "19.00" }, refundNo: "RF7", amount: "5.00", reason: "user request" } as any;
    const draft = buildWechatRefundRequestDraft(request, {
      mchId: "mch",
      certSerialNo: "serial",
      privateKey,
      baseUrl: "https://wechat.example.test",
      timestamp: "1710000000",
      nonce: "nonce"
    });
    expect(draft).toMatchObject({ provider: "wechat", method: "POST", path: "/v3/refund/domestic/refunds", url: "https://wechat.example.test/v3/refund/domestic/refunds" });
    expect(JSON.parse(draft.body || "{}")).toMatchObject({ out_trade_no: "OD7", out_refund_no: "RF7", reason: "user request", amount: { refund: 500, total: 1900, currency: "CNY" } });
    expect(draft.headers.Authorization).toContain('mchid="mch"');
    expect(draft.headers.Authorization).toContain('serial_no="serial"');
  });

  it("builds signed alipay real refund query request drafts without sending network calls", () => {
    const request = { provider: "alipay", order: { orderNo: "OD7" }, refundNo: "RF7" } as any;
    const draft = buildAlipayRefundQueryRequestDraft(request, {
      appId: "ali-app",
      privateKey,
      gatewayUrl: "https://alipay.example.test/gateway.do",
      timestamp: "2026-06-09 17:00:00"
    });
    const params = new URLSearchParams(draft.body || "");
    expect(draft).toMatchObject({ provider: "alipay", method: "POST", path: "/gateway.do", url: "https://alipay.example.test/gateway.do" });
    expect(params.get("app_id")).toBe("ali-app");
    expect(params.get("method")).toBe("alipay.trade.fastpay.refund.query");
    expect(params.get("timestamp")).toBe("2026-06-09 17:00:00");
    expect(params.get("biz_content")).toBe(JSON.stringify({ out_trade_no: "OD7", out_request_no: "RF7" }));
    expect(params.get("sign")).toBeTruthy();
  });

  it("builds signed alipay real refund request drafts without sending network calls", () => {
    const request = { provider: "alipay", order: { orderNo: "OD7" }, refundNo: "RF7", amount: "5.00", reason: "user request" } as any;
    const draft = buildAlipayRefundRequestDraft(request, {
      appId: "ali-app",
      privateKey,
      gatewayUrl: "https://alipay.example.test/gateway.do",
      timestamp: "2026-06-09 17:00:00"
    });
    const params = new URLSearchParams(draft.body || "");
    expect(draft).toMatchObject({ provider: "alipay", method: "POST", path: "/gateway.do", url: "https://alipay.example.test/gateway.do" });
    expect(params.get("method")).toBe("alipay.trade.refund");
    expect(params.get("biz_content")).toBe(JSON.stringify({ out_trade_no: "OD7", refund_amount: "5.00", out_request_no: "RF7", refund_reason: "user request" }));
    expect(params.get("sign")).toBeTruthy();
  });

  it("normalizes real refund request responses", () => {
    const request = { provider: "wechat", order: { orderNo: "OD7" }, refundNo: "RF7", amount: "5.00" } as any;
    expect(normalizeWechatRefundRequestPayload(request, { refund_id: "WXRF7", status: "PROCESSING" })).toMatchObject({ provider: "wechat", orderNo: "OD7", refundNo: "RF7", providerRefundNo: "WXRF7", amount: "5.00", status: "processing" });
    const alipayRequest = { provider: "alipay", order: { orderNo: "OD7" }, refundNo: "RF7", amount: "5.00" } as any;
    expect(normalizeAlipayRefundRequestPayload(alipayRequest, { trade_no: "ALIRF7", refund_status: "REFUND_SUCCESS" })).toMatchObject({ provider: "alipay", orderNo: "OD7", refundNo: "RF7", providerRefundNo: "ALIRF7", amount: "5.00", status: "success" });
    expect(unwrapAlipayRefundRequestPayload({ alipay_trade_refund_response: { code: "10000", trade_no: "ALIRF7" } })).toMatchObject({ code: "10000", trade_no: "ALIRF7" });
  });

  it("executes signed wechat real refund requests when the refund flag is enabled", async () => {
    const originalFetch = globalThis.fetch;
    const responseBody = JSON.stringify({ refund_id: "WXRF7", status: "PROCESSING" });
    const timestamp = "1710000000";
    const nonce = "nonce";
    const signature = rsaSign(`${timestamp}\n${nonce}\n${responseBody}\n`);
    let captured: any = null;
    globalThis.fetch = (async (url: string, init: any) => {
      captured = { url, init };
      return { ok: true, status: 200, statusText: "OK", headers: responseHeaders({ "wechatpay-timestamp": timestamp, "wechatpay-nonce": nonce, "wechatpay-signature": signature }), text: async () => responseBody };
    }) as any;
    try {
      const provider = service({ ...realWechatConfig, REAL_REFUND_QUERY_IMPLEMENTED: "true", WECHAT_PAY_PRIVATE_KEY_PATH: privateKeyPath });
      await expect(provider.requestRefund({ provider: "wechat", order: { orderNo: "OD7", amount: "19.00" } as any, refundNo: "RF7", amount: "5.00", reason: "user request" })).resolves.toMatchObject({ provider: "wechat", orderNo: "OD7", refundNo: "RF7", providerRefundNo: "WXRF7", status: "processing" });
      expect(captured.url).toBe("https://api.mch.weixin.qq.com/v3/refund/domestic/refunds");
      expect(JSON.parse(captured.init.body)).toMatchObject({ out_trade_no: "OD7", out_refund_no: "RF7" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("executes signed alipay real refund requests when the refund flag is enabled", async () => {
    const originalFetch = globalThis.fetch;
    const response = { alipay_trade_refund_response: { code: "10000", trade_no: "ALIRF7", refund_status: "REFUND_SUCCESS" } };
    const signContent = `alipay_trade_refund_response=${JSON.stringify(response.alipay_trade_refund_response)}`;
    let captured: any = null;
    globalThis.fetch = (async (url: string, init: any) => {
      captured = { url, init };
      return { ok: true, status: 200, statusText: "OK", text: async () => JSON.stringify({ ...response, sign: rsaSign(signContent), sign_type: "RSA2" }) };
    }) as any;
    try {
      const provider = service({ ...realAlipayConfig, REAL_REFUND_QUERY_IMPLEMENTED: "true", ALIPAY_PRIVATE_KEY_PATH: privateKeyPath });
      await expect(provider.requestRefund({ provider: "alipay", order: { orderNo: "OD7", amount: "19.00" } as any, refundNo: "RF7", amount: "5.00", reason: "user request" })).resolves.toMatchObject({ provider: "alipay", orderNo: "OD7", refundNo: "RF7", providerRefundNo: "ALIRF7", status: "success" });
      expect(captured.url).toBe("https://openapi.alipay.com/gateway.do");
      expect(new URLSearchParams(captured.init.body).get("method")).toBe("alipay.trade.refund");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("executes real refund query request drafts and parses successful provider JSON", async () => {
    const wechatDraft = { provider: "wechat", method: "GET", url: "https://wechat.example.test/refund", path: "/refund", headers: { Accept: "application/json" }, body: null } as const;
    await expect(
      executeRealPaymentHttpRequestDraft(wechatDraft, async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({ status: "SUCCESS", refund_id: "WXRF7" })
      }))
    ).resolves.toMatchObject({ status: "SUCCESS", refund_id: "WXRF7" });

    const alipayDraft = { provider: "alipay", method: "POST", url: "https://alipay.example.test/gateway.do", path: "/gateway.do", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: "x=1" } as const;
    const alipayPayload = await executeRealPaymentHttpRequestDraft(alipayDraft, async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => JSON.stringify({ alipay_trade_fastpay_refund_query_response: { code: "10000", refund_status: "REFUND_SUCCESS", trade_no: "ALIRF7" } })
    }));
    expect(unwrapAlipayRefundQueryPayload(alipayPayload)).toMatchObject({ code: "10000", refund_status: "REFUND_SUCCESS", trade_no: "ALIRF7" });
  });

  it("verifies wechat real refund query HTTP response signatures", async () => {
    const body = JSON.stringify({ status: "SUCCESS", refund_id: "WXRF7" });
    const timestamp = "1710000000";
    const nonce = "nonce";
    const signature = rsaSign(`${timestamp}\n${nonce}\n${body}\n`);
    expect(verifyWechatHttpResponse(body, { headers: responseHeaders({ "wechatpay-timestamp": timestamp, "wechatpay-nonce": nonce, "wechatpay-signature": signature }) }, publicKeyPem)).toBe(true);
    expect(() => verifyWechatHttpResponse(body, { headers: responseHeaders({ "wechatpay-timestamp": timestamp, "wechatpay-nonce": nonce, "wechatpay-signature": "bad" }) }, publicKeyPem)).toThrow(BadRequestException);
  });

  it("verifies alipay real refund query HTTP response signatures", () => {
    const response = { alipay_trade_fastpay_refund_query_response: { code: "10000", refund_status: "REFUND_SUCCESS", trade_no: "ALIRF7" } };
    const signContent = `alipay_trade_fastpay_refund_query_response=${JSON.stringify(response.alipay_trade_fastpay_refund_query_response)}`;
    const payload = { ...response, sign: rsaSign(signContent), sign_type: "RSA2" };
    expect(verifyAlipayHttpResponse(payload, publicKeyPem)).toBe(true);
    expect(() => verifyAlipayHttpResponse({ ...response, sign: "bad", sign_type: "RSA2" }, publicKeyPem)).toThrow(BadRequestException);
  });

  it("verifies provider HTTP responses before accepting successful JSON", async () => {
    const body = JSON.stringify({ status: "SUCCESS", refund_id: "WXRF7" });
    const timestamp = "1710000000";
    const nonce = "nonce";
    const signature = rsaSign(`${timestamp}\n${nonce}\n${body}\n`);
    const draft = { provider: "wechat", method: "GET", url: "https://wechat.example.test/refund", path: "/refund", headers: {}, body: null } as const;
    await expect(
      executeRealPaymentHttpRequestDraft(
        draft,
        async () => ({ ok: true, status: 200, statusText: "OK", headers: responseHeaders({ "wechatpay-timestamp": timestamp, "wechatpay-nonce": nonce, "wechatpay-signature": signature }), text: async () => body }),
        { publicKey: publicKeyPem }
      )
    ).resolves.toMatchObject({ status: "SUCCESS", refund_id: "WXRF7" });
    await expect(
      executeRealPaymentHttpRequestDraft(
        draft,
        async () => ({ ok: true, status: 200, statusText: "OK", headers: responseHeaders({ "wechatpay-timestamp": timestamp, "wechatpay-nonce": nonce, "wechatpay-signature": "bad" }), text: async () => body }),
        { publicKey: publicKeyPem }
      )
    ).rejects.toThrow(BadRequestException);
  });

  it("rejects real refund query HTTP and business errors", async () => {
    const wechatDraft = { provider: "wechat", method: "GET", url: "https://wechat.example.test/refund", path: "/refund", headers: {}, body: null } as const;
    await expect(
      executeRealPaymentHttpRequestDraft(wechatDraft, async () => ({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: async () => JSON.stringify({ code: "SIGN_ERROR", message: "signature invalid" })
      }))
    ).rejects.toThrow(BadRequestException);

    const alipayDraft = { provider: "alipay", method: "POST", url: "https://alipay.example.test/gateway.do", path: "/gateway.do", headers: {}, body: "x=1" } as const;
    await expect(
      executeRealPaymentHttpRequestDraft(alipayDraft, async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => JSON.stringify({ alipay_trade_fastpay_refund_query_response: { code: "40004", sub_msg: "Business Failed" } })
      }))
    ).rejects.toThrow(BadRequestException);

    await expect(
      executeRealPaymentHttpRequestDraft(wechatDraft, async () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        text: async () => "not-json"
      }))
    ).rejects.toThrow(BadRequestException);
  });

  it("builds signed wechat real statement download URL request drafts", () => {
    const draft = buildWechatStatementDownloadUrlRequestDraft({ provider: "wechat", statementDate: "2026-06-08" }, {
      mchId: "mch",
      certSerialNo: "serial",
      privateKey,
      baseUrl: "https://wechat.example.test",
      timestamp: "1710000000",
      nonce: "nonce"
    });
    expect(draft).toMatchObject({
      provider: "wechat",
      method: "GET",
      path: "/v3/bill/tradebill?bill_date=2026-06-08&bill_type=ALL",
      url: "https://wechat.example.test/v3/bill/tradebill?bill_date=2026-06-08&bill_type=ALL",
      body: null
    });
    expect(draft.headers.Authorization).toContain('mchid="mch"');
    expect(draft.headers.Authorization).toContain('serial_no="serial"');
  });

  it("builds signed alipay real statement download URL request drafts", () => {
    const draft = buildAlipayStatementDownloadUrlRequestDraft({ provider: "alipay", statementDate: "2026-06-08" }, {
      appId: "ali-app",
      privateKey,
      gatewayUrl: "https://alipay.example.test/gateway.do",
      timestamp: "2026-06-09 17:00:00"
    });
    const params = new URLSearchParams(draft.body || "");
    expect(draft).toMatchObject({ provider: "alipay", method: "POST", path: "/gateway.do", url: "https://alipay.example.test/gateway.do" });
    expect(params.get("method")).toBe("alipay.data.dataservice.bill.downloadurl.query");
    expect(params.get("biz_content")).toBe(JSON.stringify({ bill_type: "trade", bill_date: "2026-06-08" }));
    expect(params.get("sign")).toBeTruthy();
  });

  it("normalizes provider statement CSV text", () => {
    const wechatText = [
      "#微信支付账单",
      "`交易时间,`微信支付订单号,`商户订单号,`交易类型,`交易状态,`订单金额（元）",
      "`2026-06-08 10:00:00,`WXTX7,`OD7,`NATIVE,`SUCCESS,`19.90"
    ].join("\n");
    expect(normalizeWechatStatementText({ provider: "wechat", statementDate: "2026-06-08" }, wechatText)).toMatchObject({
      provider: "wechat",
      batchNo: "wechat-2026-06-08",
      items: [{ transactionNo: "WXTX7", orderNo: "OD7", amount: "19.90", tradeType: "NATIVE", providerStatus: "SUCCESS" }]
    });

    const alipayText = [
      "支付宝交易号,商户订单号,业务类型,交易状态,订单金额（元）,交易付款时间",
      "ALITX7,OD7,即时到账,TRADE_SUCCESS,19.90,2026-06-08 10:00:00"
    ].join("\n");
    expect(normalizeAlipayStatementText({ provider: "alipay", statementDate: "2026-06-08" }, alipayText)).toMatchObject({
      provider: "alipay",
      batchNo: "alipay-2026-06-08",
      items: [{ transactionNo: "ALITX7", orderNo: "OD7", amount: "19.90", tradeType: "即时到账", providerStatus: "TRADE_SUCCESS" }]
    });
    expect(statementDownloadUrl("wechat", { download_url: "https://download.example.test/wechat.csv" })).toBe("https://download.example.test/wechat.csv");
    expect(unwrapAlipayStatementDownloadUrlPayload({ alipay_data_dataservice_bill_downloadurl_query_response: { code: "10000", bill_download_url: "https://download.example.test/alipay.csv" } })).toMatchObject({ bill_download_url: "https://download.example.test/alipay.csv" });
  });

  it("normalizes provider statement text with variant column names", () => {
    const wechatText = [
      "付款时间,微信支付单号,商家订单号,交易场景,支付状态,交易金额（元）",
      "2026/06/08 10:00:00,WXTX8,OD8,JSAPI,SUCCESS,21.50"
    ].join("\n");
    expect(normalizeWechatStatementText({ provider: "wechat", statementDate: "2026-06-08" }, wechatText)).toMatchObject({
      items: [{ transactionNo: "WXTX8", orderNo: "OD8", amount: "21.50", tradeType: "JSAPI", providerStatus: "SUCCESS" }]
    });

    const alipayText = [
      "支付宝订单号,商家订单号,交易类型,支付状态,实收金额（元）,付款时间",
      "ALITX8,OD8,手机网站支付,TRADE_SUCCESS,21.50,2026/06/08 10:00:00"
    ].join("\n");
    expect(normalizeAlipayStatementText({ provider: "alipay", statementDate: "2026-06-08" }, alipayText)).toMatchObject({
      items: [{ transactionNo: "ALITX8", orderNo: "OD8", amount: "21.50", tradeType: "手机网站支付", providerStatus: "TRADE_SUCCESS" }]
    });
  });

  it("normalizes large provider statement text", () => {
    const rows = Array.from({ length: 1200 }, (_, index) => {
      const id = String(index + 1).padStart(4, "0");
      return `ALITX${id},OD${id},即时到账,TRADE_SUCCESS,${(10 + index / 100).toFixed(2)},2026-06-08 10:00:00`;
    });
    const result = normalizeAlipayStatementText(
      { provider: "alipay", statementDate: "2026-06-08" },
      ["支付宝交易号,商户订单号,业务类型,交易状态,订单金额（元）,交易付款时间", ...rows].join("\n")
    );
    expect(result.raw).toMatchObject({ rowCount: 1200 });
    expect(result.items).toHaveLength(1200);
    expect(result.items[0]).toMatchObject({ transactionNo: "ALITX0001", orderNo: "OD0001", amount: "10.00" });
    expect(result.items[1199]).toMatchObject({ transactionNo: "ALITX1200", orderNo: "OD1200", amount: "21.99" });
  });

  it("downloads gzip-compressed provider statement text", async () => {
    const statementText = "`交易时间,`微信支付订单号,`商户订单号,`交易类型,`交易状态,`订单金额（元）\n`2026-06-08 10:00:00,`WXTX7,`OD7,`NATIVE,`SUCCESS,`19.90";
    const payload = gzipSync(Buffer.from(statementText, "utf8"));
    const text = await downloadProviderStatementText(
      "wechat",
      "https://download.example.test/wechat.csv.gz",
      async () =>
        ({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: responseHeaders({ "content-encoding": "gzip" }),
          arrayBuffer: async () => toArrayBuffer(payload),
          text: async () => ""
        }) as any
    );
    expect(normalizeWechatStatementText({ provider: "wechat", statementDate: "2026-06-08" }, text)).toMatchObject({
      items: [{ transactionNo: "WXTX7", orderNo: "OD7", amount: "19.90" }]
    });
  });

  it("downloads zipped provider statement text", async () => {
    const statementText = "支付宝交易号,商户订单号,业务类型,交易状态,订单金额（元）,交易付款时间\nALITX7,OD7,即时到账,TRADE_SUCCESS,19.90,2026-06-08 10:00:00";
    const payload = zipEntry("alipay-statement.csv", statementText);
    const text = await downloadProviderStatementText(
      "alipay",
      "https://download.example.test/alipay.zip",
      async () =>
        ({
          ok: true,
          status: 200,
          statusText: "OK",
          headers: responseHeaders({ "content-type": "application/zip" }),
          arrayBuffer: async () => toArrayBuffer(payload),
          text: async () => ""
        }) as any
    );
    expect(normalizeAlipayStatementText({ provider: "alipay", statementDate: "2026-06-08" }, text)).toMatchObject({
      items: [{ transactionNo: "ALITX7", orderNo: "OD7", amount: "19.90" }]
    });
  });

  it("executes wechat real statement fetch when the statement flag is enabled", async () => {
    const originalFetch = globalThis.fetch;
    const responseBody = JSON.stringify({ download_url: "https://download.example.test/wechat.csv" });
    const timestamp = "1710000000";
    const nonce = "nonce";
    const signature = rsaSign(`${timestamp}\n${nonce}\n${responseBody}\n`);
    const statementText = "`交易时间,`微信支付订单号,`商户订单号,`交易类型,`交易状态,`订单金额（元）\n`2026-06-08 10:00:00,`WXTX7,`OD7,`NATIVE,`SUCCESS,`19.90";
    const calls: string[] = [];
    globalThis.fetch = (async (url: string) => {
      calls.push(url);
      if (url.includes("/v3/bill/tradebill")) {
        return { ok: true, status: 200, statusText: "OK", headers: responseHeaders({ "wechatpay-timestamp": timestamp, "wechatpay-nonce": nonce, "wechatpay-signature": signature }), text: async () => responseBody };
      }
      return { ok: true, status: 200, statusText: "OK", text: async () => statementText };
    }) as any;
    try {
      const provider = service({ ...realWechatConfig, REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED: "true", WECHAT_PAY_PRIVATE_KEY_PATH: privateKeyPath });
      await expect(provider.fetchStatement({ provider: "wechat", statementDate: "2026-06-08" })).resolves.toMatchObject({ provider: "wechat", batchNo: "wechat-2026-06-08", items: [{ transactionNo: "WXTX7", orderNo: "OD7", amount: "19.90" }] });
      expect(calls).toEqual(["https://api.mch.weixin.qq.com/v3/bill/tradebill?bill_date=2026-06-08&bill_type=ALL", "https://download.example.test/wechat.csv"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("uses agent payment account config for real statement fetches", async () => {
    const originalFetch = globalThis.fetch;
    const responseBody = JSON.stringify({ download_url: "https://download.example.test/wechat-agent.csv" });
    const timestamp = "1710000000";
    const nonce = "nonce";
    const signature = rsaSign(`${timestamp}\n${nonce}\n${responseBody}\n`);
    const statementText = "`交易时间,`微信支付订单号,`商户订单号,`交易类型,`交易状态,`订单金额（元）\n`2026-06-08 10:00:00,`WXTX9,`OD9,`NATIVE,`SUCCESS,`29.90";
    const calls: Array<{ url: string; authorization?: string }> = [];
    globalThis.fetch = (async (url: string, init?: any) => {
      calls.push({ url, authorization: init?.headers?.Authorization });
      if (url.includes("/v3/bill/tradebill")) {
        return { ok: true, status: 200, statusText: "OK", headers: responseHeaders({ "wechatpay-timestamp": timestamp, "wechatpay-nonce": nonce, "wechatpay-signature": signature }), text: async () => responseBody };
      }
      return { ok: true, status: 200, statusText: "OK", text: async () => statementText };
    }) as any;
    try {
      const provider = service(
        {
          ...realWechatConfig,
          WECHAT_PAY_MCH_ID: "platform-mch",
          REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED: "true",
          WECHAT_PAY_PRIVATE_KEY_PATH: privateKeyPath
        },
        [
          {
            agent: { id: 9 },
            tenant: { id: 10 },
            provider: "wechat",
            enabled: true,
            config: {
              ...realWechatConfig,
              WECHAT_PAY_MCH_ID: "agent-mch",
              REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED: "true",
              WECHAT_PAY_PRIVATE_KEY_PATH: privateKeyPath
            }
          }
        ]
      );
      await expect(provider.fetchStatement({ provider: "wechat", statementDate: "2026-06-08", agentId: 9, tenantId: 10 })).resolves.toMatchObject({
        provider: "wechat",
        batchNo: "wechat-2026-06-08",
        items: [{ transactionNo: "WXTX9", orderNo: "OD9", amount: "29.90" }]
      });
      expect(calls[0].authorization).toContain('mchid="agent-mch"');
      expect(calls[0].authorization).not.toContain('mchid="platform-mch"');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects cross-tenant agent payment accounts before real statement fetches", async () => {
    const provider = service(
      {
        ...realWechatConfig,
        REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED: "true",
        WECHAT_PAY_PRIVATE_KEY_PATH: privateKeyPath
      },
      [
        {
          agent: { id: 9 },
          tenant: { id: 20 },
          provider: "wechat",
          enabled: true,
          config: {
            ...realWechatConfig,
            REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED: "true",
            WECHAT_PAY_PRIVATE_KEY_PATH: privateKeyPath
          }
        }
      ]
    );
    await expect(provider.fetchStatement({ provider: "wechat", statementDate: "2026-06-08", agentId: 9, tenantId: 10 })).rejects.toThrow(BadRequestException);
  });

  it("executes alipay real statement fetch when the statement flag is enabled", async () => {
    const originalFetch = globalThis.fetch;
    const response = { alipay_data_dataservice_bill_downloadurl_query_response: { code: "10000", bill_download_url: "https://download.example.test/alipay.csv" } };
    const signContent = `alipay_data_dataservice_bill_downloadurl_query_response=${JSON.stringify(response.alipay_data_dataservice_bill_downloadurl_query_response)}`;
    const statementText = "支付宝交易号,商户订单号,业务类型,交易状态,订单金额（元）,交易付款时间\nALITX7,OD7,即时到账,TRADE_SUCCESS,19.90,2026-06-08 10:00:00";
    const calls: string[] = [];
    globalThis.fetch = (async (url: string) => {
      calls.push(url);
      if (url.includes("gateway.do")) {
        return { ok: true, status: 200, statusText: "OK", text: async () => JSON.stringify({ ...response, sign: rsaSign(signContent), sign_type: "RSA2" }) };
      }
      return { ok: true, status: 200, statusText: "OK", text: async () => statementText };
    }) as any;
    try {
      const provider = service({ ...realAlipayConfig, REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED: "true", ALIPAY_PRIVATE_KEY_PATH: privateKeyPath });
      await expect(provider.fetchStatement({ provider: "alipay", statementDate: "2026-06-08" })).resolves.toMatchObject({ provider: "alipay", batchNo: "alipay-2026-06-08", items: [{ transactionNo: "ALITX7", orderNo: "OD7", amount: "19.90" }] });
      expect(calls).toEqual(["https://openapi.alipay.com/gateway.do", "https://download.example.test/alipay.csv"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects real statement fetch until the provider SDK is implemented", async () => {
    await expect(service({ REAL_PAYMENT_ENABLED: "false" }).fetchStatement({ provider: "wechat", statementDate: "2026-06-08" })).rejects.toThrow(BadRequestException);
    await expect(service(realWechatConfig).fetchStatement({ provider: "wechat", statementDate: "2026-06-08" })).rejects.toThrow(NotImplementedException);
  });
});
