import { BadRequestException, NotImplementedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createDecipheriv, createSign, createVerify, randomBytes } from "crypto";
import type { KeyObject } from "crypto";
import { readFileSync } from "fs";
import { gunzipSync, inflateRawSync } from "zlib";
import { Order } from "../../entities/order.entity";
import { ProviderPayDto } from "./dto";
import type { NormalizedPaymentCallback, PaymentProviderAdapter, PaymentProviderRuntimeConfig, ProviderPaymentCreateOptions, ProviderPaymentResult, ProviderRefundNotificationResult, ProviderRefundQueryRequest, ProviderRefundQueryResult, ProviderRefundRequest, ProviderRefundResult, ProviderStatementFetchRequest, ProviderStatementFetchResult, ProviderStatementItem, RealPaymentCallbackContext, SupportedPaymentProvider } from "./payment-provider.service";

type PaymentDraft = {
  provider: SupportedPaymentProvider;
  orderNo: string;
  amount: string;
  amountCents: number;
  subject: string;
  notifyUrl: string;
};

type RefundDraft = {
  provider: SupportedPaymentProvider;
  orderNo: string;
  refundNo: string;
  amount: string;
  amountCents: number;
  reason: string | null;
};

export type RealPaymentHttpRequestDraft = {
  provider: SupportedPaymentProvider;
  method: "GET" | "POST";
  url: string;
  path: string;
  headers: Record<string, string>;
  body: string | null;
};

type RealPaymentFetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  headers?: {
    get(name: string): string | null;
  };
  arrayBuffer?(): Promise<ArrayBuffer>;
  text(): Promise<string>;
};

export type RealPaymentFetch = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<RealPaymentFetchResponse>;

export type RealPaymentHttpVerification = {
  publicKey: string | Buffer | KeyObject;
};

export type NormalizedRefundNotification = {
  provider: SupportedPaymentProvider;
  mode: "real";
  orderNo: string;
  refundNo: string;
  providerRefundNo: string | null;
  status: "processing" | "success" | "failed";
  raw?: Record<string, unknown>;
  failureReason?: string | null;
};

export type WechatPaymentDraftOptions = {
  appId: string;
  mchId: string;
  certSerialNo: string;
  privateKey: string | Buffer | KeyObject;
  notifyUrl: string;
  baseUrl?: string;
  timestamp?: string;
  nonce?: string;
};

export type AlipayPaymentDraftOptions = {
  appId: string;
  privateKey: string | Buffer | KeyObject;
  notifyUrl: string;
  gatewayUrl?: string;
  timestamp?: string;
};

export type WechatRefundQueryDraftOptions = Omit<WechatPaymentDraftOptions, "appId" | "notifyUrl">;

export type AlipayRefundQueryDraftOptions = Omit<AlipayPaymentDraftOptions, "notifyUrl">;

export type WechatRefundRequestDraftOptions = WechatRefundQueryDraftOptions;

export type AlipayRefundRequestDraftOptions = AlipayRefundQueryDraftOptions;

export type WechatStatementDownloadDraftOptions = WechatRefundQueryDraftOptions;

export type AlipayStatementDownloadDraftOptions = AlipayRefundQueryDraftOptions;

type WechatCallbackSignature = {
  timestamp: string;
  nonce: string;
  signature: string;
  serialNo: string;
  message: string;
};

type AlipayCallbackSignature = {
  appId: string;
  charset: string;
  sign: string;
  signType: string;
  tradeNo: string;
  outTradeNo: string;
};

type WechatPaymentScene = "native" | "h5" | "jsapi";
type AlipayPaymentScene = "precreate" | "wap" | "page";

abstract class BaseRealPaymentAdapter implements PaymentProviderAdapter {
  private readonly fileCache = new Map<string, string>();

  constructor(
    protected readonly provider: SupportedPaymentProvider,
    protected readonly config: ConfigService,
    protected readonly runtimeConfig?: PaymentProviderRuntimeConfig
  ) {}

  createPayment(order: Order, dto: ProviderPayDto, options?: ProviderPaymentCreateOptions): Promise<ProviderPaymentResult> | ProviderPaymentResult {
    void dto;
    const draft = this.paymentDraft(order, options?.notifyUrl?.trim() || this.notifyUrl());
    void draft;
    throw new NotImplementedException(`${this.provider} real payment SDK create call is not implemented yet`);
  }

  parseCallback(context: RealPaymentCallbackContext): NormalizedPaymentCallback {
    this.assertRawCallbackPayload(context);
    throw new NotImplementedException(`${this.provider} real payment callback verification is not implemented yet`);
  }

  requestRefund(request: ProviderRefundRequest): Promise<ProviderRefundResult> | ProviderRefundResult {
    const draft = this.refundDraft(request);
    void draft;
    throw new NotImplementedException(`${this.provider} real refund SDK request is not implemented yet`);
  }

  queryRefund(request: ProviderRefundQueryRequest): Promise<ProviderRefundQueryResult> | ProviderRefundQueryResult {
    const draft = {
      provider: this.provider,
      orderNo: request.order.orderNo,
      refundNo: request.refundNo,
      providerRefundNo: request.providerRefundNo || null
    };
    void draft;
    throw new NotImplementedException(`${this.provider} real refund query SDK request is not implemented yet`);
  }

  parseRefundNotification(context: RealPaymentCallbackContext): ProviderRefundNotificationResult {
    void context;
    throw new NotImplementedException(`${this.provider} real refund notification is not implemented yet`);
  }

  fetchStatement(request: ProviderStatementFetchRequest): Promise<ProviderStatementFetchResult> | ProviderStatementFetchResult {
    const draft = {
      provider: this.provider,
      statementDate: request.statementDate,
      agentId: request.agentId || null
    };
    void draft;
    throw new NotImplementedException(`${this.provider} real payment statement SDK fetch is not implemented yet`);
  }

  protected required(key: string) {
    const value = this.runtimeConfig?.values[key] || this.config.get<string>(key);
    if (!value) throw new NotImplementedException(`${this.provider} real payment requires ${key}`);
    return value;
  }

  protected optional(key: string) {
    return this.runtimeConfig?.values[key] || this.config.get<string>(key) || "";
  }

  protected flagEnabled(key: string) {
    return (this.runtimeConfig?.values[key] || this.config.get<string>(key, "false")) === "true";
  }

  protected paymentDraft(order: Order, notifyUrl: string): PaymentDraft {
    const amount = Number(order.amount).toFixed(2);
    return {
      provider: this.provider,
      orderNo: order.orderNo,
      amount,
      amountCents: this.amountToCents(amount),
      subject: this.subjectFor(order),
      notifyUrl
    };
  }

  protected refundDraft(request: ProviderRefundRequest): RefundDraft {
    const amount = Number(request.amount).toFixed(2);
    return {
      provider: this.provider,
      orderNo: request.order.orderNo,
      refundNo: request.refundNo,
      amount,
      amountCents: this.amountToCents(amount),
      reason: request.reason?.trim() || null
    };
  }

  protected assertRawCallbackPayload(context: RealPaymentCallbackContext) {
    if (!context.rawBody) {
      throw new BadRequestException(`${this.provider} real payment callback requires rawBody for signature verification`);
    }
  }

  protected header(context: RealPaymentCallbackContext, key: string) {
    const value = context.headers?.[key] ?? context.headers?.[key.toLowerCase()];
    if (Array.isArray(value)) return value[0] || "";
    return value || "";
  }

  protected bodyString(context: RealPaymentCallbackContext, key: string) {
    const value = context.body[key];
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return "";
  }

  protected requireValue(value: string, label: string) {
    if (!value) throw new BadRequestException(`${this.provider} real payment callback missing ${label}`);
    return value;
  }

  protected rawBodyString(context: RealPaymentCallbackContext) {
    if (!context.rawBody) return "";
    return Buffer.isBuffer(context.rawBody) ? context.rawBody.toString("utf8") : context.rawBody;
  }

  protected readConfiguredFile(path: string, label: string) {
    try {
      const cached = this.fileCache.get(path);
      if (cached) return cached;
      const content = readFileSync(path, "utf8");
      this.fileCache.set(path, content);
      return content;
    } catch {
      throw new BadRequestException(`${this.provider} real payment cannot read ${label}`);
    }
  }

  protected verifyRsaSha256(message: string, signature: string, publicKey: string) {
    try {
      const verifier = createVerify("RSA-SHA256");
      verifier.update(message);
      verifier.end();
      return verifier.verify(publicKey, signature, "base64");
    } catch {
      return false;
    }
  }

  protected amountToCents(amount: string | number) {
    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) throw new BadRequestException(`${this.provider} payment amount must be greater than 0`);
    return cents;
  }

  protected subjectFor(order: Order) {
    return order.registration?.activity?.title || `Order ${order.orderNo}`;
  }

  protected abstract notifyUrl(): string;
}

export class WechatPayAdapter extends BaseRealPaymentAdapter {
  constructor(config: ConfigService, runtimeConfig?: PaymentProviderRuntimeConfig) {
    super("wechat", config, runtimeConfig);
  }

  async createPayment(order: Order, dto: ProviderPayDto, options?: ProviderPaymentCreateOptions): Promise<ProviderPaymentResult> {
    const config = this.wechatConfig({ notifyUrl: options?.notifyUrl });
    if (!this.flagEnabled("REAL_PAYMENT_SDK_IMPLEMENTED")) return super.createPayment(order, dto, options);
    const notifyUrl = config.notifyUrl;
    const draft = buildWechatPaymentRequestDraft(order, dto, {
      appId: config.appId,
      mchId: config.mchId,
      certSerialNo: config.certSerialNo,
      privateKey: this.readConfiguredFile(config.privateKeyPath, "WECHAT_PAY_PRIVATE_KEY_PATH"),
      notifyUrl
    });
    const payload = await executeRealPaymentHttpRequestDraft(draft, undefined, { publicKey: this.readConfiguredFile(config.platformCertPath, "WECHAT_PAY_PLATFORM_CERT_PATH") });
    return normalizeWechatPaymentCreatePayload(order, payload, dto, {
      appId: config.appId,
      privateKey: this.readConfiguredFile(config.privateKeyPath, "WECHAT_PAY_PRIVATE_KEY_PATH")
    });
  }

  parseCallback(context: RealPaymentCallbackContext): NormalizedPaymentCallback {
    const config = this.wechatConfig({ requireNotifyUrl: false });
    const signature = this.wechatSignature(context);
    const platformCert = this.readConfiguredFile(config.platformCertPath, "WECHAT_PAY_PLATFORM_CERT_PATH");
    if (!this.verifyRsaSha256(signature.message, signature.signature, platformCert)) {
      throw new BadRequestException("wechat real payment callback signature verification failed");
    }
    const payload = decryptWechatResourcePayload(context.body?.resource, config.apiV3Key, "payment callback");
    const tradeState = this.requiredPayloadString(payload, "trade_state");
    if (tradeState !== "SUCCESS") throw new BadRequestException(`wechat real payment callback trade_state is not successful: ${tradeState}`);
    const orderNo = this.requiredPayloadString(payload, "out_trade_no");
    const transactionNo = this.requiredPayloadString(payload, "transaction_id");
    const amount = this.wechatAmount(payload);
    return { orderNo, transactionNo, amount, signatureValid: true, raw: payload };
  }

  async requestRefund(request: ProviderRefundRequest): Promise<ProviderRefundResult> {
    const config = this.wechatConfig({ requireNotifyUrl: false });
    if (!this.flagEnabled("REAL_REFUND_QUERY_IMPLEMENTED")) return super.requestRefund(request);
    const draft = buildWechatRefundRequestDraft(request, {
      mchId: config.mchId,
      certSerialNo: config.certSerialNo,
      privateKey: this.readConfiguredFile(config.privateKeyPath, "WECHAT_PAY_PRIVATE_KEY_PATH")
    });
    const payload = await executeRealPaymentHttpRequestDraft(draft, undefined, { publicKey: this.readConfiguredFile(config.platformCertPath, "WECHAT_PAY_PLATFORM_CERT_PATH") });
    return normalizeWechatRefundRequestPayload(request, payload);
  }

  async queryRefund(request: ProviderRefundQueryRequest): Promise<ProviderRefundQueryResult> {
    const config = this.wechatConfig({ requireNotifyUrl: false });
    if (!this.flagEnabled("REAL_REFUND_QUERY_IMPLEMENTED")) return super.queryRefund(request);
    const draft = buildWechatRefundQueryRequestDraft(request, {
      mchId: config.mchId,
      certSerialNo: config.certSerialNo,
      privateKey: this.readConfiguredFile(config.privateKeyPath, "WECHAT_PAY_PRIVATE_KEY_PATH")
    });
    const payload = await executeRealPaymentHttpRequestDraft(draft, undefined, { publicKey: this.readConfiguredFile(config.platformCertPath, "WECHAT_PAY_PLATFORM_CERT_PATH") });
    return normalizeWechatRefundQueryPayload(request, payload);
  }

  parseRefundNotification(context: RealPaymentCallbackContext): ProviderRefundNotificationResult {
    const config = this.wechatConfig({ requireNotifyUrl: false });
    if (!this.flagEnabled("REAL_REFUND_QUERY_IMPLEMENTED")) return super.parseRefundNotification(context);
    const signature = this.wechatSignature(context);
    const platformCert = this.readConfiguredFile(config.platformCertPath, "WECHAT_PAY_PLATFORM_CERT_PATH");
    if (!this.verifyRsaSha256(signature.message, signature.signature, platformCert)) {
      throw new BadRequestException("wechat real refund notification signature verification failed");
    }
    return parseWechatRefundNotification(context, config.apiV3Key);
  }

  async fetchStatement(request: ProviderStatementFetchRequest): Promise<ProviderStatementFetchResult> {
    const config = this.wechatConfig({ requireNotifyUrl: false });
    if (!this.flagEnabled("REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED")) return super.fetchStatement(request);
    const draft = buildWechatStatementDownloadUrlRequestDraft(request, {
      mchId: config.mchId,
      certSerialNo: config.certSerialNo,
      privateKey: this.readConfiguredFile(config.privateKeyPath, "WECHAT_PAY_PRIVATE_KEY_PATH")
    });
    const payload = await executeRealPaymentHttpRequestDraft(draft, undefined, { publicKey: this.readConfiguredFile(config.platformCertPath, "WECHAT_PAY_PLATFORM_CERT_PATH") });
    const text = await downloadProviderStatementText("wechat", statementDownloadUrl("wechat", payload));
    return normalizeWechatStatementText(request, text);
  }

  protected notifyUrl() {
    return this.required("WECHAT_PAY_NOTIFY_URL");
  }

  private wechatConfig(options: { notifyUrl?: string | null; requireNotifyUrl?: boolean } = {}) {
    const notifyUrl = options.notifyUrl?.trim() || (options.requireNotifyUrl === false ? this.optional("WECHAT_PAY_NOTIFY_URL") : this.required("WECHAT_PAY_NOTIFY_URL"));
    return {
      appId: this.required("WECHAT_PAY_APP_ID"),
      mchId: this.required("WECHAT_PAY_MCH_ID"),
      apiV3Key: this.required("WECHAT_PAY_API_V3_KEY"),
      privateKeyPath: this.required("WECHAT_PAY_PRIVATE_KEY_PATH"),
      certSerialNo: this.required("WECHAT_PAY_CERT_SERIAL_NO"),
      platformCertPath: this.required("WECHAT_PAY_PLATFORM_CERT_PATH"),
      notifyUrl
    };
  }

  private wechatSignature(context: RealPaymentCallbackContext): WechatCallbackSignature {
    this.assertRawCallbackPayload(context);
    const timestamp = this.requireValue(this.header(context, "wechatpay-timestamp"), "wechatpay-timestamp");
    const nonce = this.requireValue(this.header(context, "wechatpay-nonce"), "wechatpay-nonce");
    const signature = this.requireValue(this.header(context, "wechatpay-signature"), "wechatpay-signature");
    const serialNo = this.requireValue(this.header(context, "wechatpay-serial"), "wechatpay-serial");
    const body = this.rawBodyString(context);
    return { timestamp, nonce, signature, serialNo, message: `${timestamp}\n${nonce}\n${body}\n` };
  }

  private wechatAmount(payload: Record<string, unknown>) {
    const amount = payload.amount && typeof payload.amount === "object" ? payload.amount as Record<string, unknown> : {};
    const cents = Number(amount.payer_total ?? amount.total);
    if (!Number.isFinite(cents) || cents <= 0) throw new BadRequestException("wechat real payment callback amount is invalid");
    return (cents / 100).toFixed(2);
  }

  private requiredPayloadString(payload: Record<string, unknown>, key: string) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    throw new BadRequestException(`wechat real payment callback missing ${key}`);
  }
}

export class AlipayAdapter extends BaseRealPaymentAdapter {
  constructor(config: ConfigService, runtimeConfig?: PaymentProviderRuntimeConfig) {
    super("alipay", config, runtimeConfig);
  }

  async createPayment(order: Order, dto: ProviderPayDto, options?: ProviderPaymentCreateOptions): Promise<ProviderPaymentResult> {
    const config = this.alipayConfig();
    const notifyUrl = options?.notifyUrl?.trim() || config.notifyUrl;
    if (!this.flagEnabled("REAL_PAYMENT_SDK_IMPLEMENTED")) return super.createPayment(order, dto, options);
    if (["wap", "page"].includes(alipayPaymentScene(dto))) {
      return buildAlipaySignedPaymentResult(order, dto, {
        appId: config.appId,
        privateKey: this.readConfiguredFile(config.privateKeyPath, "ALIPAY_PRIVATE_KEY_PATH"),
        notifyUrl
      });
    }
    const draft = buildAlipayPaymentRequestDraft(order, dto, {
      appId: config.appId,
      privateKey: this.readConfiguredFile(config.privateKeyPath, "ALIPAY_PRIVATE_KEY_PATH"),
      notifyUrl
    });
    const payload = await executeRealPaymentHttpRequestDraft(draft, undefined, { publicKey: this.readConfiguredFile(config.publicCertPath, "ALIPAY_PUBLIC_CERT_PATH") });
    return normalizeAlipayPaymentCreatePayload(order, unwrapAlipayPaymentCreatePayload(payload));
  }

  parseCallback(context: RealPaymentCallbackContext): NormalizedPaymentCallback {
    const config = this.alipayConfig();
    const signature = this.alipaySignature(context);
    const publicCert = this.readConfiguredFile(config.publicCertPath, "ALIPAY_PUBLIC_CERT_PATH");
    if (!this.verifyRsaSha256(this.alipaySignContent(context.body), signature.sign, publicCert)) {
      throw new BadRequestException("alipay real payment callback signature verification failed");
    }
    const tradeStatus = this.alipayTradeStatus(context.body);
    if (!["TRADE_SUCCESS", "TRADE_FINISHED"].includes(tradeStatus)) throw new BadRequestException(`alipay real payment callback trade_status is not successful: ${tradeStatus}`);
    const amount = this.alipayAmount(context.body);
    return { orderNo: signature.outTradeNo, transactionNo: signature.tradeNo, amount, signatureValid: true, raw: context.body };
  }

  async requestRefund(request: ProviderRefundRequest): Promise<ProviderRefundResult> {
    const config = this.alipayConfig();
    if (!this.flagEnabled("REAL_REFUND_QUERY_IMPLEMENTED")) return super.requestRefund(request);
    const draft = buildAlipayRefundRequestDraft(request, {
      appId: config.appId,
      privateKey: this.readConfiguredFile(config.privateKeyPath, "ALIPAY_PRIVATE_KEY_PATH")
    });
    const payload = await executeRealPaymentHttpRequestDraft(draft, undefined, { publicKey: this.readConfiguredFile(config.publicCertPath, "ALIPAY_PUBLIC_CERT_PATH") });
    return normalizeAlipayRefundRequestPayload(request, unwrapAlipayRefundRequestPayload(payload));
  }

  async queryRefund(request: ProviderRefundQueryRequest): Promise<ProviderRefundQueryResult> {
    const config = this.alipayConfig();
    if (!this.flagEnabled("REAL_REFUND_QUERY_IMPLEMENTED")) return super.queryRefund(request);
    const draft = buildAlipayRefundQueryRequestDraft(request, {
      appId: config.appId,
      privateKey: this.readConfiguredFile(config.privateKeyPath, "ALIPAY_PRIVATE_KEY_PATH")
    });
    const payload = await executeRealPaymentHttpRequestDraft(draft, undefined, { publicKey: this.readConfiguredFile(config.publicCertPath, "ALIPAY_PUBLIC_CERT_PATH") });
    return normalizeAlipayRefundQueryPayload(request, unwrapAlipayRefundQueryPayload(payload));
  }

  parseRefundNotification(context: RealPaymentCallbackContext): ProviderRefundNotificationResult {
    const config = this.alipayConfig();
    if (!this.flagEnabled("REAL_REFUND_QUERY_IMPLEMENTED")) return super.parseRefundNotification(context);
    const signature = this.alipaySignature(context);
    const publicCert = this.readConfiguredFile(config.publicCertPath, "ALIPAY_PUBLIC_CERT_PATH");
    if (!this.verifyRsaSha256(this.alipaySignContent(context.body), signature.sign, publicCert)) {
      throw new BadRequestException("alipay real refund notification signature verification failed");
    }
    return parseAlipayRefundNotification(context.body);
  }

  async fetchStatement(request: ProviderStatementFetchRequest): Promise<ProviderStatementFetchResult> {
    const config = this.alipayConfig();
    if (!this.flagEnabled("REAL_PAYMENT_STATEMENT_FETCH_IMPLEMENTED")) return super.fetchStatement(request);
    const draft = buildAlipayStatementDownloadUrlRequestDraft(request, {
      appId: config.appId,
      privateKey: this.readConfiguredFile(config.privateKeyPath, "ALIPAY_PRIVATE_KEY_PATH")
    });
    const payload = await executeRealPaymentHttpRequestDraft(draft, undefined, { publicKey: this.readConfiguredFile(config.publicCertPath, "ALIPAY_PUBLIC_CERT_PATH") });
    const text = await downloadProviderStatementText("alipay", statementDownloadUrl("alipay", unwrapAlipayStatementDownloadUrlPayload(payload)));
    return normalizeAlipayStatementText(request, text);
  }

  protected notifyUrl() {
    return this.required("ALIPAY_NOTIFY_URL");
  }

  private alipayConfig() {
    return {
      appId: this.required("ALIPAY_APP_ID"),
      privateKeyPath: this.required("ALIPAY_PRIVATE_KEY_PATH"),
      publicCertPath: this.required("ALIPAY_PUBLIC_CERT_PATH"),
      rootCertPath: this.required("ALIPAY_ROOT_CERT_PATH"),
      notifyUrl: this.notifyUrl()
    };
  }

  private alipaySignature(context: RealPaymentCallbackContext): AlipayCallbackSignature {
    const appId = this.requireValue(this.bodyString(context, "app_id"), "app_id");
    const charset = this.requireValue(this.bodyString(context, "charset"), "charset");
    const sign = this.requireValue(this.bodyString(context, "sign"), "sign");
    const signType = this.requireValue(this.bodyString(context, "sign_type"), "sign_type");
    const tradeNo = this.requireValue(this.bodyString(context, "trade_no"), "trade_no");
    const outTradeNo = this.requireValue(this.bodyString(context, "out_trade_no"), "out_trade_no");
    return { appId, charset, sign, signType, tradeNo, outTradeNo };
  }

  private alipaySignContent(body: Record<string, unknown>) {
    return Object.keys(body)
      .filter((key) => key !== "sign" && key !== "sign_type" && body[key] !== undefined && body[key] !== null && String(body[key]) !== "")
      .sort()
      .map((key) => `${key}=${String(body[key])}`)
      .join("&");
  }

  private alipayAmount(body: Record<string, unknown>) {
    const raw = body.total_amount ?? body.receipt_amount ?? body.buyer_pay_amount;
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException("alipay real payment callback amount is invalid");
    return amount.toFixed(2);
  }

  private alipayTradeStatus(body: Record<string, unknown>) {
    const value = body.trade_status;
    if (typeof value === "string" && value.trim()) return value.trim();
    throw new BadRequestException("alipay real payment callback missing trade_status");
  }
}

export function createRealPaymentAdapter(provider: SupportedPaymentProvider, config: ConfigService, runtimeConfig?: PaymentProviderRuntimeConfig): PaymentProviderAdapter {
  return provider === "wechat" ? new WechatPayAdapter(config, runtimeConfig) : new AlipayAdapter(config, runtimeConfig);
}

export function buildWechatPaymentRequestDraft(order: Order, dto: ProviderPayDto, options: WechatPaymentDraftOptions): RealPaymentHttpRequestDraft {
  const method = "POST";
  const scene = wechatPaymentScene(dto);
  const path = `/v3/pay/transactions/${scene}`;
  const amount = Number(order.amount).toFixed(2);
  const payload: Record<string, unknown> = {
    appid: options.appId,
    mchid: options.mchId,
    description: subjectForOrder(order),
    out_trade_no: order.orderNo,
    notify_url: options.notifyUrl,
    amount: {
      total: amountToCents(amount, "wechat real payment amount"),
      currency: "CNY"
    }
  };
  if (scene === "h5") {
    payload.scene_info = {
      payer_client_ip: dto.clientIp?.trim() || "127.0.0.1",
      h5_info: { type: "Wap" }
    };
  }
  if (scene === "jsapi") {
    const openid = dto.openId?.trim();
    if (!openid) throw new BadRequestException("wechat JSAPI real payment requires openId");
    payload.payer = { openid };
  }
  const body = JSON.stringify(payload);
  const timestamp = options.timestamp || Math.floor(Date.now() / 1000).toString();
  const nonce = options.nonce || randomBytes(16).toString("hex");
  const message = `${method}\n${path}\n${timestamp}\n${nonce}\n${body}\n`;
  const signature = signRsaSha256(message, options.privateKey);
  const authorization = `WECHATPAY2-SHA256-RSA2048 ${[
    `mchid="${options.mchId}"`,
    `nonce_str="${nonce}"`,
    `signature="${signature}"`,
    `timestamp="${timestamp}"`,
    `serial_no="${options.certSerialNo}"`
  ].join(",")}`;
  return {
    provider: "wechat",
    method,
    url: `${options.baseUrl || "https://api.mch.weixin.qq.com"}${path}`,
    path,
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: authorization },
    body
  };
}

export function buildAlipayPaymentRequestDraft(order: Order, dto: ProviderPayDto, options: AlipayPaymentDraftOptions): RealPaymentHttpRequestDraft {
  const method = "POST";
  const path = "/gateway.do";
  const timestamp = options.timestamp || alipayTimestamp(new Date());
  const params: Record<string, string> = {
    app_id: options.appId,
    method: "alipay.trade.precreate",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp,
    version: "1.0",
    notify_url: options.notifyUrl,
    biz_content: JSON.stringify({
      out_trade_no: order.orderNo,
      total_amount: Number(order.amount).toFixed(2),
      subject: subjectForOrder(order),
      product_code: "FACE_TO_FACE_PAYMENT"
    })
  };
  const signContent = alipaySignContent(params);
  params.sign = signRsaSha256(signContent, options.privateKey);
  return {
    provider: "alipay",
    method,
    url: options.gatewayUrl || "https://openapi.alipay.com/gateway.do",
    path,
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams(params).toString()
  };
}

export function buildAlipaySignedPaymentResult(order: Order, dto: ProviderPayDto, options: AlipayPaymentDraftOptions): ProviderPaymentResult {
  const scene = alipayPaymentScene(dto);
  const method = scene === "page" ? "alipay.trade.page.pay" : "alipay.trade.wap.pay";
  const timestamp = options.timestamp || alipayTimestamp(new Date());
  const amount = Number(order.amount).toFixed(2);
  const bizContent: Record<string, string> = {
    out_trade_no: order.orderNo,
    total_amount: amount,
    subject: subjectForOrder(order),
    product_code: scene === "page" ? "FAST_INSTANT_TRADE_PAY" : "QUICK_WAP_WAY"
  };
  const params: Record<string, string> = {
    app_id: options.appId,
    method,
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp,
    version: "1.0",
    notify_url: options.notifyUrl,
    biz_content: JSON.stringify(bizContent)
  };
  const returnUrl = dto.returnUrl?.trim();
  if (returnUrl) params.return_url = returnUrl;
  params.sign = signRsaSha256(alipaySignContent(params), options.privateKey);
  return {
    provider: "alipay",
    mode: "real",
    orderNo: order.orderNo,
    amount,
    transactionNo: null,
    callbackPath: "/payment/alipay/callback",
    payParams: {
      tradeType: scene.toUpperCase(),
      gatewayUrl: options.gatewayUrl || "https://openapi.alipay.com/gateway.do",
      method,
      formBody: new URLSearchParams(params).toString(),
      orderNo: order.orderNo,
      amount
    }
  };
}

export function buildWechatStatementDownloadUrlRequestDraft(request: ProviderStatementFetchRequest, options: WechatStatementDownloadDraftOptions): RealPaymentHttpRequestDraft {
  const method = "GET";
  const path = `/v3/bill/tradebill?bill_date=${encodeURIComponent(request.statementDate)}&bill_type=ALL`;
  const body = "";
  const timestamp = options.timestamp || Math.floor(Date.now() / 1000).toString();
  const nonce = options.nonce || randomBytes(16).toString("hex");
  const message = `${method}\n${path}\n${timestamp}\n${nonce}\n${body}\n`;
  const signature = signRsaSha256(message, options.privateKey);
  const authorization = `WECHATPAY2-SHA256-RSA2048 ${[
    `mchid="${options.mchId}"`,
    `nonce_str="${nonce}"`,
    `signature="${signature}"`,
    `timestamp="${timestamp}"`,
    `serial_no="${options.certSerialNo}"`
  ].join(",")}`;
  return {
    provider: "wechat",
    method,
    url: `${options.baseUrl || "https://api.mch.weixin.qq.com"}${path}`,
    path,
    headers: { Accept: "application/json", Authorization: authorization },
    body: null
  };
}

export function buildAlipayStatementDownloadUrlRequestDraft(request: ProviderStatementFetchRequest, options: AlipayStatementDownloadDraftOptions): RealPaymentHttpRequestDraft {
  const method = "POST";
  const path = "/gateway.do";
  const timestamp = options.timestamp || alipayTimestamp(new Date());
  const params: Record<string, string> = {
    app_id: options.appId,
    method: "alipay.data.dataservice.bill.downloadurl.query",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp,
    version: "1.0",
    biz_content: JSON.stringify({
      bill_type: "trade",
      bill_date: request.statementDate
    })
  };
  const signContent = alipaySignContent(params);
  params.sign = signRsaSha256(signContent, options.privateKey);
  return {
    provider: "alipay",
    method,
    url: options.gatewayUrl || "https://openapi.alipay.com/gateway.do",
    path,
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams(params).toString()
  };
}

export function buildWechatRefundQueryRequestDraft(request: ProviderRefundQueryRequest, options: WechatRefundQueryDraftOptions): RealPaymentHttpRequestDraft {
  const method = "GET";
  const path = `/v3/refund/domestic/refunds/${encodeURIComponent(request.refundNo)}`;
  const body = "";
  const timestamp = options.timestamp || Math.floor(Date.now() / 1000).toString();
  const nonce = options.nonce || randomBytes(16).toString("hex");
  const message = `${method}\n${path}\n${timestamp}\n${nonce}\n${body}\n`;
  const signature = signRsaSha256(message, options.privateKey);
  const authorization = `WECHATPAY2-SHA256-RSA2048 ${[
    `mchid="${options.mchId}"`,
    `nonce_str="${nonce}"`,
    `signature="${signature}"`,
    `timestamp="${timestamp}"`,
    `serial_no="${options.certSerialNo}"`
  ].join(",")}`;
  return {
    provider: "wechat",
    method,
    url: `${options.baseUrl || "https://api.mch.weixin.qq.com"}${path}`,
    path,
    headers: { Accept: "application/json", Authorization: authorization },
    body: null
  };
}

export function buildWechatRefundRequestDraft(request: ProviderRefundRequest, options: WechatRefundRequestDraftOptions): RealPaymentHttpRequestDraft {
  const method = "POST";
  const path = "/v3/refund/domestic/refunds";
  const amount = Number(request.amount).toFixed(2);
  const body = JSON.stringify({
    out_trade_no: request.order.orderNo,
    out_refund_no: request.refundNo,
    reason: request.reason?.trim() || undefined,
    notify_url: request.notifyUrl?.trim() || undefined,
    amount: {
      refund: amountToCents(amount, "wechat real refund amount"),
      total: amountToCents(request.order.amount, "wechat real refund order amount"),
      currency: "CNY"
    }
  });
  const timestamp = options.timestamp || Math.floor(Date.now() / 1000).toString();
  const nonce = options.nonce || randomBytes(16).toString("hex");
  const message = `${method}\n${path}\n${timestamp}\n${nonce}\n${body}\n`;
  const signature = signRsaSha256(message, options.privateKey);
  const authorization = `WECHATPAY2-SHA256-RSA2048 ${[
    `mchid="${options.mchId}"`,
    `nonce_str="${nonce}"`,
    `signature="${signature}"`,
    `timestamp="${timestamp}"`,
    `serial_no="${options.certSerialNo}"`
  ].join(",")}`;
  return {
    provider: "wechat",
    method,
    url: `${options.baseUrl || "https://api.mch.weixin.qq.com"}${path}`,
    path,
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: authorization },
    body
  };
}

export function buildAlipayRefundQueryRequestDraft(request: ProviderRefundQueryRequest, options: AlipayRefundQueryDraftOptions): RealPaymentHttpRequestDraft {
  const method = "POST";
  const path = "/gateway.do";
  const timestamp = options.timestamp || alipayTimestamp(new Date());
  const params: Record<string, string> = {
    app_id: options.appId,
    method: "alipay.trade.fastpay.refund.query",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp,
    version: "1.0",
    biz_content: JSON.stringify({
      out_trade_no: request.order.orderNo,
      out_request_no: request.refundNo
    })
  };
  const signContent = alipaySignContent(params);
  params.sign = signRsaSha256(signContent, options.privateKey);
  return {
    provider: "alipay",
    method,
    url: options.gatewayUrl || "https://openapi.alipay.com/gateway.do",
    path,
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams(params).toString()
  };
}

export function buildAlipayRefundRequestDraft(request: ProviderRefundRequest, options: AlipayRefundRequestDraftOptions): RealPaymentHttpRequestDraft {
  const method = "POST";
  const path = "/gateway.do";
  const timestamp = options.timestamp || alipayTimestamp(new Date());
  const bizContent: Record<string, string> = {
    out_trade_no: request.order.orderNo,
    refund_amount: Number(request.amount).toFixed(2),
    out_request_no: request.refundNo
  };
  const reason = request.reason?.trim();
  if (reason) bizContent.refund_reason = reason;
  const params: Record<string, string> = {
    app_id: options.appId,
    method: "alipay.trade.refund",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp,
    version: "1.0",
    biz_content: JSON.stringify(bizContent)
  };
  const signContent = alipaySignContent(params);
  params.sign = signRsaSha256(signContent, options.privateKey);
  return {
    provider: "alipay",
    method,
    url: options.gatewayUrl || "https://openapi.alipay.com/gateway.do",
    path,
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams(params).toString()
  };
}

export async function executeRealPaymentHttpRequestDraft(draft: RealPaymentHttpRequestDraft, fetchImpl: RealPaymentFetch = globalThis.fetch as RealPaymentFetch, verification?: RealPaymentHttpVerification) {
  if (!fetchImpl) throw new NotImplementedException(`${draft.provider} real payment HTTP runtime is not available`);
  let response: RealPaymentFetchResponse;
  try {
    response = await fetchImpl(draft.url, {
      method: draft.method,
      headers: draft.headers,
      ...(draft.body ? { body: draft.body } : {})
    });
  } catch {
    throw new BadRequestException(`${draft.provider} real payment HTTP request failed`);
  }

  const text = await response.text();
  if (verification) verifyProviderHttpResponse(draft.provider, text, response, verification.publicKey);
  const payload = parseProviderJson(draft.provider, text);
  if (!response.ok) {
    throw new BadRequestException(`${draft.provider} real payment HTTP request failed: ${response.status} ${providerErrorMessage(draft.provider, payload) || response.statusText}`);
  }
  assertProviderBusinessSuccess(draft.provider, payload);
  return payload;
}

export function verifyProviderHttpResponse(provider: SupportedPaymentProvider, body: string, response: Pick<RealPaymentFetchResponse, "headers">, publicKey: string | Buffer | KeyObject) {
  if (provider === "wechat") return verifyWechatHttpResponse(body, response, publicKey);
  const payload = parseProviderJson(provider, body);
  return verifyAlipayHttpResponse(payload, publicKey);
}

export function normalizeWechatPaymentCreatePayload(order: Order, payload: Record<string, unknown>, dto: ProviderPayDto = {}, options?: Pick<WechatPaymentDraftOptions, "appId" | "privateKey"> & { timestamp?: string; nonce?: string }): ProviderPaymentResult {
  const scene = wechatPaymentScene(dto);
  const amount = Number(order.amount).toFixed(2);
  const payParams: Record<string, string | number | boolean | null> = {
    tradeType: scene.toUpperCase(),
    orderNo: order.orderNo,
    amount
  };
  if (scene === "native") {
    const codeUrl = refundPayloadString(payload, "code_url", "codeUrl");
    if (!codeUrl) throw new BadRequestException("wechat real payment create response missing code_url");
    payParams.codeUrl = codeUrl;
  }
  if (scene === "h5") {
    const h5Url = refundPayloadString(payload, "h5_url", "h5Url");
    if (!h5Url) throw new BadRequestException("wechat H5 real payment create response missing h5_url");
    payParams.h5Url = h5Url;
  }
  if (scene === "jsapi") {
    const prepayId = refundPayloadString(payload, "prepay_id", "prepayId");
    if (!prepayId) throw new BadRequestException("wechat JSAPI real payment create response missing prepay_id");
    if (!options) throw new BadRequestException("wechat JSAPI real payment requires signing options");
    const timestamp = options.timestamp || Math.floor(Date.now() / 1000).toString();
    const nonce = options.nonce || randomBytes(16).toString("hex");
    const packageValue = `prepay_id=${prepayId}`;
    payParams.appId = options.appId;
    payParams.timeStamp = timestamp;
    payParams.nonceStr = nonce;
    payParams.package = packageValue;
    payParams.signType = "RSA";
    payParams.paySign = signRsaSha256(`${options.appId}\n${timestamp}\n${nonce}\n${packageValue}\n`, options.privateKey);
  }
  return {
    provider: "wechat",
    mode: "real",
    orderNo: order.orderNo,
    amount,
    transactionNo: null,
    callbackPath: "/payment/wechat/callback",
    payParams
  };
}

export function normalizeAlipayPaymentCreatePayload(order: Order, payload: Record<string, unknown>): ProviderPaymentResult {
  const qrCode = refundPayloadString(payload, "qr_code", "qrCode");
  if (!qrCode) throw new BadRequestException("alipay real payment create response missing qr_code");
  const amount = Number(order.amount).toFixed(2);
  return {
    provider: "alipay",
    mode: "real",
    orderNo: order.orderNo,
    amount,
    transactionNo: null,
    callbackPath: "/payment/alipay/callback",
    payParams: {
      tradeType: "PRECREATE",
      qrCode,
      orderNo: order.orderNo,
      amount
    }
  };
}

export async function downloadProviderStatementText(provider: SupportedPaymentProvider, url: string, fetchImpl: RealPaymentFetch = globalThis.fetch as RealPaymentFetch) {
  if (!fetchImpl) throw new NotImplementedException(`${provider} real payment statement download runtime is not available`);
  try {
    const response = await fetchImpl(url, { method: "GET", headers: { Accept: "text/plain,text/csv,application/gzip,application/zip,*/*" } });
    if (!response.ok) throw new BadRequestException(`${provider} real payment statement download failed: ${response.status} ${response.statusText}`);
    const text = await readProviderStatementResponseText(provider, url, response);
    if (!text.trim()) throw new BadRequestException(`${provider} real payment statement download is empty`);
    return text;
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException(`${provider} real payment statement download failed`);
  }
}

export function statementDownloadUrl(provider: SupportedPaymentProvider, payload: Record<string, unknown>) {
  const url = refundPayloadString(payload, "download_url", "bill_download_url", "billDownloadUrl");
  if (!url) throw new BadRequestException(`${provider} real payment statement response missing download_url`);
  return url;
}

export function normalizeWechatStatementText(request: ProviderStatementFetchRequest, text: string): ProviderStatementFetchResult {
  const rows = parseStatementRows(text);
  return {
    provider: "wechat",
    mode: "real",
    statementDate: request.statementDate,
    batchNo: `wechat-${request.statementDate}`,
    items: rows.map(normalizeWechatStatementRow).filter((item): item is ProviderStatementItem => Boolean(item)),
    raw: { rowCount: rows.length }
  };
}

export function normalizeAlipayStatementText(request: ProviderStatementFetchRequest, text: string): ProviderStatementFetchResult {
  const rows = parseStatementRows(text);
  return {
    provider: "alipay",
    mode: "real",
    statementDate: request.statementDate,
    batchNo: `alipay-${request.statementDate}`,
    items: rows.map(normalizeAlipayStatementRow).filter((item): item is ProviderStatementItem => Boolean(item)),
    raw: { rowCount: rows.length }
  };
}

export function normalizeWechatRefundQueryPayload(request: ProviderRefundQueryRequest, payload: Record<string, unknown>): ProviderRefundQueryResult {
  const providerStatus = refundPayloadString(payload, "status", "refund_status");
  if (!providerStatus) throw new BadRequestException("wechat real refund query missing status");
  const normalizedStatus = normalizeWechatRefundStatus(providerStatus);
  return {
    provider: "wechat",
    mode: "real",
    orderNo: request.order.orderNo,
    refundNo: request.refundNo,
    providerRefundNo: refundPayloadString(payload, "refund_id", "provider_refund_no", "providerRefundNo") || request.providerRefundNo || null,
    status: normalizedStatus,
    raw: payload,
    failureReason: refundPayloadString(payload, "abnormal_reason", "failure_reason", "status_description", "message")
  };
}

export function normalizeWechatRefundRequestPayload(request: ProviderRefundRequest, payload: Record<string, unknown>): ProviderRefundResult {
  const providerStatus = refundPayloadString(payload, "status", "refund_status") || "PROCESSING";
  const normalizedStatus = normalizeWechatRefundStatus(providerStatus);
  return {
    provider: "wechat",
    mode: "real",
    orderNo: request.order.orderNo,
    refundNo: request.refundNo,
    amount: Number(request.amount).toFixed(2),
    providerRefundNo: refundPayloadString(payload, "refund_id", "provider_refund_no", "providerRefundNo"),
    status: normalizedStatus,
    raw: payload
  };
}

export function normalizeWechatRefundNotificationPayload(payload: Record<string, unknown>): NormalizedRefundNotification {
  const status = refundPayloadString(payload, "status", "refund_status");
  if (!status) throw new BadRequestException("wechat real refund notification missing status");
  return {
    provider: "wechat",
    mode: "real",
    orderNo: requiredRefundPayloadString("wechat", payload, "out_trade_no", "orderNo", "outTradeNo"),
    refundNo: requiredRefundPayloadString("wechat", payload, "out_refund_no", "refundNo", "outRefundNo"),
    providerRefundNo: refundPayloadString(payload, "refund_id", "provider_refund_no", "providerRefundNo"),
    status: normalizeWechatRefundStatus(status),
    raw: payload,
    failureReason: refundPayloadString(payload, "abnormal_reason", "failure_reason", "status_description", "message")
  };
}

export function normalizeAlipayRefundQueryPayload(request: ProviderRefundQueryRequest, payload: Record<string, unknown>): ProviderRefundQueryResult {
  const providerStatus = refundPayloadString(payload, "refund_status", "status");
  if (!providerStatus) throw new BadRequestException("alipay real refund query missing status");
  const normalizedStatus = normalizeAlipayRefundStatus(providerStatus);
  return {
    provider: "alipay",
    mode: "real",
    orderNo: request.order.orderNo,
    refundNo: request.refundNo,
    providerRefundNo: refundPayloadString(payload, "trade_no", "refund_id", "provider_refund_no", "providerRefundNo") || request.providerRefundNo || null,
    status: normalizedStatus,
    raw: payload,
    failureReason: refundPayloadString(payload, "refund_error_code", "failure_reason", "sub_msg", "msg")
  };
}

export function normalizeAlipayRefundRequestPayload(request: ProviderRefundRequest, payload: Record<string, unknown>): ProviderRefundResult {
  const providerStatus = refundPayloadString(payload, "refund_status", "status") || "SUCCESS";
  const normalizedStatus = normalizeAlipayRefundStatus(providerStatus);
  return {
    provider: "alipay",
    mode: "real",
    orderNo: request.order.orderNo,
    refundNo: request.refundNo,
    amount: Number(request.amount).toFixed(2),
    providerRefundNo: refundPayloadString(payload, "trade_no", "refund_id", "provider_refund_no", "providerRefundNo"),
    status: normalizedStatus,
    raw: payload
  };
}

export function normalizeAlipayRefundNotificationPayload(payload: Record<string, unknown>): NormalizedRefundNotification {
  const status = refundPayloadString(payload, "refund_status", "status");
  if (!status) throw new BadRequestException("alipay real refund notification missing refund_status");
  return {
    provider: "alipay",
    mode: "real",
    orderNo: requiredRefundPayloadString("alipay", payload, "out_trade_no", "orderNo", "outTradeNo"),
    refundNo: requiredRefundPayloadString("alipay", payload, "out_request_no", "out_biz_no", "refundNo", "outRequestNo"),
    providerRefundNo: refundPayloadString(payload, "trade_no", "refund_id", "provider_refund_no", "providerRefundNo"),
    status: normalizeAlipayRefundStatus(status),
    raw: payload,
    failureReason: refundPayloadString(payload, "refund_error_code", "failure_reason", "sub_msg", "msg")
  };
}

export function parseWechatRefundNotification(context: RealPaymentCallbackContext, apiV3Key: string): NormalizedRefundNotification {
  const payload = decryptWechatResourcePayload(context.body?.resource, apiV3Key, "refund notification");
  return normalizeWechatRefundNotificationPayload(payload);
}

export function parseAlipayRefundNotification(body: Record<string, unknown>): NormalizedRefundNotification {
  return normalizeAlipayRefundNotificationPayload(body);
}

export function unwrapAlipayRefundQueryPayload(payload: Record<string, unknown>) {
  const response = payload.alipay_trade_fastpay_refund_query_response;
  if (response && typeof response === "object") return response as Record<string, unknown>;
  return payload;
}

export function unwrapAlipayRefundRequestPayload(payload: Record<string, unknown>) {
  const response = payload.alipay_trade_refund_response;
  if (response && typeof response === "object") return response as Record<string, unknown>;
  return payload;
}

export function unwrapAlipayPaymentCreatePayload(payload: Record<string, unknown>) {
  const response = payload.alipay_trade_precreate_response;
  if (response && typeof response === "object") return response as Record<string, unknown>;
  return payload;
}

export function unwrapAlipayStatementDownloadUrlPayload(payload: Record<string, unknown>) {
  const response = payload.alipay_data_dataservice_bill_downloadurl_query_response;
  if (response && typeof response === "object") return response as Record<string, unknown>;
  return payload;
}

export function verifyWechatHttpResponse(body: string, response: Pick<RealPaymentFetchResponse, "headers">, publicKey: string | Buffer | KeyObject) {
  const headers = response.headers;
  const timestamp = headers?.get("wechatpay-timestamp") || headers?.get("Wechatpay-Timestamp") || "";
  const nonce = headers?.get("wechatpay-nonce") || headers?.get("Wechatpay-Nonce") || "";
  const signature = headers?.get("wechatpay-signature") || headers?.get("Wechatpay-Signature") || "";
  if (!timestamp || !nonce || !signature) throw new BadRequestException("wechat real payment HTTP response missing signature headers");
  const message = `${timestamp}\n${nonce}\n${body}\n`;
  if (!verifyRsaSha256(message, signature, publicKey)) throw new BadRequestException("wechat real payment HTTP response signature verification failed");
  return true;
}

export function verifyAlipayHttpResponse(payload: Record<string, unknown>, publicKey: string | Buffer | KeyObject) {
  const sign = refundPayloadString(payload, "sign");
  if (!sign) throw new BadRequestException("alipay real payment HTTP response missing sign");
  const signContent = alipayResponseSignContent(payload);
  if (!verifyRsaSha256(signContent, sign, publicKey)) throw new BadRequestException("alipay real payment HTTP response signature verification failed");
  return true;
}

function normalizeWechatRefundStatus(status: string): ProviderRefundQueryResult["status"] {
  switch (status.trim().toUpperCase()) {
    case "SUCCESS":
      return "success";
    case "PROCESSING":
    case "ABNORMAL":
      return "processing";
    case "CLOSED":
    case "REFUNDCLOSE":
      return "failed";
    default:
      throw new BadRequestException(`wechat real refund query status is unsupported: ${status}`);
  }
}

function signRsaSha256(message: string, privateKey: string | Buffer | KeyObject) {
  const signer = createSign("RSA-SHA256");
  signer.update(message);
  signer.end();
  return signer.sign(privateKey, "base64");
}

function verifyRsaSha256(message: string, signature: string, publicKey: string | Buffer | KeyObject) {
  try {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(message);
    verifier.end();
    return verifier.verify(publicKey, signature, "base64");
  } catch {
    return false;
  }
}

function decryptWechatResourcePayload(resource: unknown, apiV3Key: string, label: string) {
  if (!resource || typeof resource !== "object") throw new BadRequestException(`wechat real ${label} missing resource`);
  const payload = resource as Record<string, unknown>;
  const nonce = refundPayloadString(payload, "nonce");
  const ciphertext = refundPayloadString(payload, "ciphertext");
  if (!nonce) throw new BadRequestException(`wechat real ${label} missing resource.nonce`);
  if (!ciphertext) throw new BadRequestException(`wechat real ${label} missing resource.ciphertext`);
  const associatedData = refundPayloadString(payload, "associated_data") || "";
  try {
    const key = Buffer.from(apiV3Key, "utf8");
    if (key.length !== 32) throw new Error("invalid api v3 key length");
    const encrypted = Buffer.from(ciphertext, "base64");
    if (encrypted.length <= 16) throw new Error("invalid ciphertext length");
    const authTag = encrypted.subarray(encrypted.length - 16);
    const cipherBody = encrypted.subarray(0, encrypted.length - 16);
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(nonce, "utf8"));
    if (associatedData) decipher.setAAD(Buffer.from(associatedData, "utf8"));
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(cipherBody), decipher.final()]).toString("utf8");
    return JSON.parse(decrypted) as Record<string, unknown>;
  } catch {
    throw new BadRequestException(`wechat real ${label} resource decrypt failed`);
  }
}

function parseProviderJson(provider: SupportedPaymentProvider, text: string) {
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new BadRequestException(`${provider} real payment response is not valid JSON`);
  }
}

function assertProviderBusinessSuccess(provider: SupportedPaymentProvider, payload: Record<string, unknown>) {
  if (provider === "wechat") {
    if (payload.code && typeof payload.code === "string") throw new BadRequestException(`wechat real payment request failed: ${providerErrorMessage(provider, payload) || payload.code}`);
    return;
  }
  const response = unwrapAlipayResponsePayload(payload);
  const code = refundPayloadString(response, "code");
  if (code && code !== "10000") throw new BadRequestException(`alipay real payment request failed: ${providerErrorMessage(provider, payload) || code}`);
}

function providerErrorMessage(provider: SupportedPaymentProvider, payload: Record<string, unknown>) {
  if (provider === "wechat") return refundPayloadString(payload, "message", "code");
  const response = unwrapAlipayResponsePayload(payload);
  return refundPayloadString(response, "sub_msg", "msg", "sub_code", "code");
}

function unwrapAlipayResponsePayload(payload: Record<string, unknown>) {
  for (const key of ["alipay_trade_precreate_response", "alipay_trade_refund_response", "alipay_trade_fastpay_refund_query_response", "alipay_data_dataservice_bill_downloadurl_query_response"]) {
    const response = payload[key];
    if (response && typeof response === "object") return response as Record<string, unknown>;
  }
  return payload;
}

function alipaySignContent(params: Record<string, string>) {
  return Object.keys(params)
    .filter((key) => key !== "sign" && params[key] !== undefined && params[key] !== null && params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
}

function alipayResponseSignContent(payload: Record<string, unknown>) {
  return Object.keys(payload)
    .filter((key) => key !== "sign" && key !== "sign_type" && payload[key] !== undefined && payload[key] !== null && String(payload[key]) !== "")
    .sort()
    .map((key) => `${key}=${typeof payload[key] === "string" ? payload[key] : JSON.stringify(payload[key])}`)
    .join("&");
}

function alipayTimestamp(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function normalizeAlipayRefundStatus(status: string): ProviderRefundQueryResult["status"] {
  switch (status.trim().toUpperCase()) {
    case "REFUND_SUCCESS":
    case "SUCCESS":
      return "success";
    case "PROCESSING":
      return "processing";
    case "REFUND_FAIL":
    case "FAIL":
      return "failed";
    default:
      throw new BadRequestException(`alipay real refund query status is unsupported: ${status}`);
  }
}

function refundPayloadString(payload: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function requiredRefundPayloadString(provider: SupportedPaymentProvider, payload: Record<string, unknown>, ...keys: string[]) {
  const value = refundPayloadString(payload, ...keys);
  if (value) return value;
  throw new BadRequestException(`${provider} real refund notification missing ${keys[0]}`);
}

function amountToCents(amount: string | number, label: string) {
  const cents = Math.round(Number(amount) * 100);
  if (!Number.isFinite(cents) || cents <= 0) throw new BadRequestException(`${label} must be greater than 0`);
  return cents;
}

function subjectForOrder(order: Order) {
  return order.registration?.activity?.title || `Order ${order.orderNo}`;
}

function wechatPaymentScene(dto: ProviderPayDto): WechatPaymentScene {
  const scene = dto.paymentScene?.trim().toLowerCase();
  if (!scene || scene === "native") return "native";
  if (scene === "h5") return "h5";
  if (scene === "jsapi") return "jsapi";
  throw new BadRequestException(`wechat real payment scene is unsupported: ${dto.paymentScene}`);
}

function alipayPaymentScene(dto: ProviderPayDto): AlipayPaymentScene {
  const scene = dto.paymentScene?.trim().toLowerCase();
  if (!scene || scene === "precreate") return "precreate";
  if (scene === "wap") return "wap";
  if (scene === "page") return "page";
  throw new BadRequestException(`alipay real payment scene is unsupported: ${dto.paymentScene}`);
}

function parseStatementRows(text: string) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("`总") && !line.includes("总交易单数"));
  const headerIndex = lines.findIndex((line) => {
    const normalized = normalizeStatementKey(line);
    return normalized.includes("商户订单号") || normalized.includes("商家订单号") || normalized.includes("商户单号") || normalized.includes("outtradeno") || normalized.includes("merchantorderno");
  });
  if (headerIndex < 0) return [];
  const headers = splitStatementCsvLine(lines[headerIndex]).map(normalizeStatementKey);
  return lines.slice(headerIndex + 1).map((line) => {
    const values = splitStatementCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) row[header] = cleanStatementCell(values[index] || "");
    });
    return row;
  });
}

async function readProviderStatementResponseText(provider: SupportedPaymentProvider, url: string, response: RealPaymentFetchResponse) {
  if (!response.arrayBuffer) return response.text();
  const buffer = Buffer.from(await response.arrayBuffer());
  return decodeProviderStatementPayload(provider, url, buffer, {
    contentEncoding: response.headers?.get("content-encoding") || response.headers?.get("Content-Encoding") || "",
    contentType: response.headers?.get("content-type") || response.headers?.get("Content-Type") || ""
  });
}

function decodeProviderStatementPayload(provider: SupportedPaymentProvider, url: string, buffer: Buffer, headers: { contentEncoding: string; contentType: string }) {
  const encoding = headers.contentEncoding.toLowerCase();
  const contentType = headers.contentType.toLowerCase();
  const lowerUrl = url.toLowerCase();
  try {
    if (encoding.includes("gzip") || contentType.includes("gzip") || lowerUrl.endsWith(".gz") || isGzipBuffer(buffer)) return gunzipSync(buffer).toString("utf8");
    if (contentType.includes("zip") || lowerUrl.endsWith(".zip") || isZipBuffer(buffer)) return extractStatementTextFromZip(provider, buffer);
    return buffer.toString("utf8");
  } catch (error) {
    if (error instanceof BadRequestException) throw error;
    throw new BadRequestException(`${provider} real payment statement archive cannot be decompressed`);
  }
}

function isGzipBuffer(buffer: Buffer) {
  return buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
}

function isZipBuffer(buffer: Buffer) {
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
}

function extractStatementTextFromZip(provider: SupportedPaymentProvider, buffer: Buffer) {
  for (const entry of readZipEntries(buffer)) {
    if (!entry.name || entry.name.endsWith("/") || !/\.(csv|txt)$/i.test(entry.name)) continue;
    if (entry.compressionMethod === 0) return entry.data.toString("utf8");
    if (entry.compressionMethod === 8) return inflateRawSync(entry.data).toString("utf8");
    throw new BadRequestException(`${provider} real payment statement zip entry uses unsupported compression method: ${entry.compressionMethod}`);
  }
  throw new BadRequestException(`${provider} real payment statement zip does not contain a CSV/TXT file`);
}

function readZipEntries(buffer: Buffer) {
  const entries: Array<{ name: string; compressionMethod: number; data: Buffer }> = [];
  let offset = 0;
  while (offset + 30 <= buffer.length) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) break;
    const flags = buffer.readUInt16LE(offset + 6);
    const compressionMethod = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const dataStart = nameStart + fileNameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    if ((flags & 0x08) !== 0) throw new BadRequestException("real payment statement zip with data descriptor is unsupported");
    if (dataEnd > buffer.length) break;
    entries.push({
      name: buffer.subarray(nameStart, nameStart + fileNameLength).toString("utf8"),
      compressionMethod,
      data: buffer.subarray(dataStart, dataEnd)
    });
    offset = dataEnd;
  }
  return entries;
}

function splitStatementCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if ((char === "," || char === "\t") && !quoted) {
      values.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current);
  return values;
}

function normalizeWechatStatementRow(row: Record<string, string>): ProviderStatementItem | null {
  const transactionNo = statementRowString(row, "微信支付订单号", "微信支付单号", "微信订单号", "平台订单号", "transactionid", "transactionno", "transaction_id");
  if (!transactionNo) return null;
  const amount = statementRowAmount(row, "订单金额元", "订单金额", "交易金额元", "交易金额", "应结订单金额元", "应结订单金额", "总金额", "totalfee", "total_fee", "amount");
  if (amount === null || amount < 0) return null;
  const raw = statementRawRow(row);
  return {
    transactionNo,
    orderNo: statementRowString(row, "商户订单号", "商家订单号", "商户单号", "订单号", "outtradeno", "out_trade_no", "merchantorderno", "merchant_order_no") || null,
    amount: amount.toFixed(2),
    tradeType: statementRowString(row, "交易类型", "业务类型", "交易场景", "tradetype", "trade_type") || null,
    providerStatus: statementRowString(row, "交易状态", "支付状态", "账单状态", "tradestate", "trade_state", "status") || null,
    tradedAt: statementRowDate(row, "交易时间", "支付完成时间", "付款时间", "完成时间", "success_time", "tradetime", "trade_time"),
    raw
  };
}

function normalizeAlipayStatementRow(row: Record<string, string>): ProviderStatementItem | null {
  const transactionNo = statementRowString(row, "支付宝交易号", "支付宝订单号", "平台交易号", "trade_no", "tradeno", "transactionno", "transaction_id");
  if (!transactionNo) return null;
  const amount = statementRowAmount(row, "订单金额元", "订单金额", "交易金额元", "交易金额", "实收金额元", "实收金额", "收入金额元", "收入金额", "totalamount", "total_amount", "amount");
  if (amount === null || amount < 0) return null;
  const raw = statementRawRow(row);
  return {
    transactionNo,
    orderNo: statementRowString(row, "商户订单号", "商家订单号", "商户单号", "订单号", "out_trade_no", "outtradeno", "merchantorderno", "merchant_order_no") || null,
    amount: amount.toFixed(2),
    tradeType: statementRowString(row, "业务类型", "商品名称", "交易类型", "tradetype", "trade_type") || null,
    providerStatus: statementRowString(row, "交易状态", "支付状态", "账单状态", "status", "tradestatus", "trade_status") || null,
    tradedAt: statementRowDate(row, "交易创建时间", "交易付款时间", "付款时间", "完成时间", "trade_time", "tradetime"),
    raw
  };
}

function statementRawRow(row: Record<string, string>) {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== ""));
}

function statementRowString(row: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[normalizeStatementKey(key)];
    if (value) return value;
  }
  return "";
}

function statementRowAmount(row: Record<string, string>, ...keys: string[]) {
  const raw = statementRowString(row, ...keys);
  if (!raw) return null;
  const value = Number(raw.replace(/[,\s￥¥元`]/g, ""));
  return Number.isFinite(value) ? value : null;
}

function statementRowDate(row: Record<string, string>, ...keys: string[]) {
  const raw = statementRowString(row, ...keys);
  if (!raw) return null;
  const date = new Date(raw.replace(/\//g, "-"));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeStatementKey(value: string) {
  return cleanStatementCell(value)
    .toLowerCase()
    .replace(/[（(].*?[）)]/g, "")
    .replace(/[`_\s:：,，/\\-]/g, "");
}

function cleanStatementCell(value: string) {
  return String(value || "").trim().replace(/^`+/, "").replace(/^"+|"+$/g, "");
}
