import { BadRequestException, Injectable, NotImplementedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { createHmac } from "crypto";
import { Repository } from "typeorm";
import { AgentPaymentAccount } from "../../entities/agent-payment-account.entity";
import { OperationSetting } from "../../entities/operation-setting.entity";
import { Order } from "../../entities/order.entity";
import { PaymentMethod } from "../../shared/domain";
import { launchConfigToEnv } from "../../shared/launch-config";
import { ProviderPayDto, ProviderPaymentCallbackDto } from "./dto";
import { createRealPaymentAdapter } from "./real-payment-adapters";

export type SupportedPaymentProvider = "wechat" | "alipay";
export type PaymentMode = "sandbox" | "real";

export type NormalizedPaymentCallback = {
  orderNo: string;
  transactionNo: string;
  amount: string;
  signatureValid: boolean;
  raw?: Record<string, unknown>;
};

export type RealPaymentCallbackContext = {
  body: Record<string, unknown>;
  headers?: Record<string, string | string[] | undefined>;
  rawBody?: string | Buffer;
};

export type ProviderPaymentResult = {
  provider: SupportedPaymentProvider;
  mode: PaymentMode;
  orderNo: string;
  amount: string;
  transactionNo: string | null;
  timestamp?: string;
  sign?: string;
  callbackPath: string;
  payParams: Record<string, string | number | boolean | null>;
};

export type ProviderPaymentCreateOptions = {
  notifyUrl?: string | null;
  callbackPath?: string | null;
  runtimeConfig?: PaymentProviderRuntimeConfig | null;
};

export type ProviderRefundRequest = {
  provider: SupportedPaymentProvider;
  order: Order;
  refundNo: string;
  amount: string | number;
  reason?: string | null;
  operator?: string | null;
  notifyUrl?: string | null;
  runtimeConfig?: PaymentProviderRuntimeConfig | null;
};

export type ProviderRefundResult = {
  provider: SupportedPaymentProvider;
  mode: "real";
  orderNo: string;
  refundNo: string;
  amount: string;
  providerRefundNo: string | null;
  status: "accepted" | "processing" | "success" | "failed";
  raw?: Record<string, unknown>;
};

export type ProviderRefundQueryRequest = {
  provider: SupportedPaymentProvider;
  order: Order;
  refundNo: string;
  providerRefundNo?: string | null;
  runtimeConfig?: PaymentProviderRuntimeConfig | null;
};

export type ProviderRefundQueryResult = {
  provider: SupportedPaymentProvider;
  mode: "real";
  orderNo: string;
  refundNo: string;
  providerRefundNo: string | null;
  status: "processing" | "success" | "failed";
  raw?: Record<string, unknown>;
  failureReason?: string | null;
};

export type ProviderRefundNotificationResult = ProviderRefundQueryResult;

export type ProviderStatementFetchRequest = {
  provider: SupportedPaymentProvider;
  statementDate: string;
  agentId?: number | null;
  tenantId?: number | null;
};

export type ProviderStatementItem = {
  transactionNo: string;
  orderNo: string | null;
  amount: string;
  tradeType?: string | null;
  providerStatus?: string | null;
  tradedAt?: string | null;
  raw?: Record<string, unknown>;
};

export type ProviderStatementFetchResult = {
  provider: SupportedPaymentProvider;
  mode: "real";
  statementDate: string;
  batchNo: string;
  items: ProviderStatementItem[];
  raw?: Record<string, unknown>;
};

export type PaymentProviderAdapter = {
  createPayment(order: Order, dto: ProviderPayDto, options?: ProviderPaymentCreateOptions): Promise<ProviderPaymentResult> | ProviderPaymentResult;
  parseCallback(context: RealPaymentCallbackContext): Promise<NormalizedPaymentCallback> | NormalizedPaymentCallback;
  requestRefund(request: ProviderRefundRequest): Promise<ProviderRefundResult> | ProviderRefundResult;
  queryRefund(request: ProviderRefundQueryRequest): Promise<ProviderRefundQueryResult> | ProviderRefundQueryResult;
  parseRefundNotification(context: RealPaymentCallbackContext): Promise<ProviderRefundNotificationResult> | ProviderRefundNotificationResult;
  fetchStatement(request: ProviderStatementFetchRequest): Promise<ProviderStatementFetchResult> | ProviderStatementFetchResult;
};

export type PaymentProviderRuntimeConfig = {
  scope: "platform" | "agent" | "merchant";
  agentId: number | null;
  merchantId?: number | null;
  values: Record<string, string>;
};

@Injectable()
export class PaymentProviderService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(AgentPaymentAccount) private readonly agentPaymentAccounts: Repository<AgentPaymentAccount>,
    @InjectRepository(OperationSetting) private readonly operationSettings: Repository<OperationSetting>
  ) {}

  assertSandboxAllowed(label: string) {
    if (this.config.get("PAYMENT_SANDBOX_ENABLED", "false") === "true") return;
    throw new BadRequestException(`${label} requires PAYMENT_SANDBOX_ENABLED=true`);
  }

  async createPayment(provider: SupportedPaymentProvider, order: Order, dto: ProviderPayDto, options?: ProviderPaymentCreateOptions): Promise<ProviderPaymentResult> {
    if (await this.isRealProviderEnabled(provider)) return this.createRealPayment(provider, order, dto, options);
    return this.createSandboxPayment(provider, order, dto, options);
  }

  parsePaymentCallback(provider: SupportedPaymentProvider, dto: ProviderPaymentCallbackDto): NormalizedPaymentCallback {
    if (this.config.get("REAL_PAYMENT_ENABLED", "false") === "true" && this.config.get(this.providerEnabledKey(provider), "false") === "true") return this.parseRealCallback(provider, dto);
    return this.parseSandboxCallback(provider, dto);
  }

  async parseRealPaymentCallback(provider: SupportedPaymentProvider, context: RealPaymentCallbackContext): Promise<NormalizedPaymentCallback> {
    await this.assertRealProviderReady(provider, `${provider} real payment callback`);
    const adapter = this.realAdapter(provider);
    return adapter.parseCallback(context);
  }

  async extractRealCallbackOrderNo(provider: SupportedPaymentProvider, context: RealPaymentCallbackContext) {
    await this.assertRealProviderReady(provider, `${provider} real payment callback`);
    const orderNo = provider === "alipay" ? this.callbackString(context.body, "out_trade_no", "orderNo", "outTradeNo") : this.callbackString(context.body, "orderNo", "out_trade_no", "outTradeNo");
    if (orderNo) return orderNo;
    throw new BadRequestException(`${provider} real payment callback order number cannot be resolved before provider payload decrypt`);
  }

  async parseRealPaymentCallbackForOrder(provider: SupportedPaymentProvider, order: Order, context: RealPaymentCallbackContext, runtimeConfig?: PaymentProviderRuntimeConfig | null): Promise<NormalizedPaymentCallback> {
    await this.assertRealProviderReady(provider, `${provider} real payment callback`);
    const resolvedRuntimeConfig = runtimeConfig || await this.runtimeConfigForOrder(provider, order);
    const adapter = this.realAdapter(provider, resolvedRuntimeConfig);
    return adapter.parseCallback(context);
  }

  async requestRefund(request: ProviderRefundRequest): Promise<ProviderRefundResult> {
    await this.assertRealProviderReady(request.provider, `${request.provider} real refund`);
    const runtimeConfig = request.runtimeConfig || await this.runtimeConfigForOrder(request.provider, request.order);
    const adapter = this.realAdapter(request.provider, runtimeConfig);
    return adapter.requestRefund(request);
  }

  async queryRefund(request: ProviderRefundQueryRequest): Promise<ProviderRefundQueryResult> {
    await this.assertRealProviderReady(request.provider, `${request.provider} real refund query`);
    const runtimeConfig = request.runtimeConfig || await this.runtimeConfigForOrder(request.provider, request.order);
    const adapter = this.realAdapter(request.provider, runtimeConfig);
    return adapter.queryRefund(request);
  }

  async extractRealRefundNotificationOrderNo(provider: SupportedPaymentProvider, context: RealPaymentCallbackContext) {
    await this.assertRealProviderReady(provider, `${provider} real refund notification`);
    const orderNo = provider === "alipay" ? this.callbackString(context.body, "out_trade_no", "orderNo", "outTradeNo") : this.callbackString(context.body, "orderNo", "out_trade_no", "outTradeNo");
    if (orderNo) return orderNo;
    throw new BadRequestException(`${provider} real refund notification order number cannot be resolved before provider payload decrypt`);
  }

  async parseRealRefundNotificationForOrder(provider: SupportedPaymentProvider, order: Order, context: RealPaymentCallbackContext, runtimeConfig?: PaymentProviderRuntimeConfig | null): Promise<ProviderRefundNotificationResult> {
    await this.assertRealProviderReady(provider, `${provider} real refund notification`);
    const resolvedRuntimeConfig = runtimeConfig || await this.runtimeConfigForOrder(provider, order);
    const adapter = this.realAdapter(provider, resolvedRuntimeConfig);
    return adapter.parseRefundNotification(context);
  }

  async parseRealRefundNotification(provider: SupportedPaymentProvider, context: RealPaymentCallbackContext): Promise<ProviderRefundNotificationResult> {
    await this.assertRealProviderReady(provider, `${provider} real refund notification`);
    const adapter = this.realAdapter(provider);
    return adapter.parseRefundNotification(context);
  }

  async fetchStatement(request: ProviderStatementFetchRequest): Promise<ProviderStatementFetchResult> {
    await this.assertRealProviderReady(request.provider, `${request.provider} real payment statement`);
    const runtimeConfig = await this.runtimeConfigForProvider(request.provider, request.agentId || null, request.tenantId || null);
    const adapter = this.realAdapter(request.provider, runtimeConfig);
    return adapter.fetchStatement(request);
  }

  async usesRealProvider(provider: SupportedPaymentProvider) {
    return this.isRealProviderEnabled(provider);
  }

  async canCreatePayment(provider: SupportedPaymentProvider) {
    return await this.isRealProviderEnabled(provider) || this.config.get("PAYMENT_SANDBOX_ENABLED", "false") === "true";
  }

  createSandboxPayment(provider: SupportedPaymentProvider, order: Order, dto: ProviderPayDto, options?: ProviderPaymentCreateOptions): ProviderPaymentResult {
    this.assertSandboxAllowed(`${provider} sandbox payment`);
    const transactionNo = dto.transactionNo?.trim() || `${provider.toUpperCase()}${Date.now()}${order.id}`;
    const timestamp = String(Date.now());
    const amount = Number(order.amount).toFixed(2);
    const sign = this.signSandboxPayload(provider, order.orderNo, transactionNo, amount, timestamp);
    return {
      provider,
      mode: "sandbox",
      orderNo: order.orderNo,
      amount,
      transactionNo,
      timestamp,
      sign,
      callbackPath: options?.callbackPath?.trim() || `/payment/${provider}/callback`,
      payParams: { orderNo: order.orderNo, amount, transactionNo, timestamp, sign }
    };
  }

  parseSandboxCallback(provider: SupportedPaymentProvider, dto: ProviderPaymentCallbackDto): NormalizedPaymentCallback {
    this.assertSandboxAllowed(`${provider} sandbox payment callback`);
    const amount = Number(dto.amount).toFixed(2);
    const expectedSign = this.signSandboxPayload(provider, dto.orderNo, dto.transactionNo, amount, dto.timestamp);
    return { orderNo: dto.orderNo, transactionNo: dto.transactionNo, amount, signatureValid: dto.sign === expectedSign };
  }

  private async createRealPayment(provider: SupportedPaymentProvider, order: Order, dto: ProviderPayDto, options?: ProviderPaymentCreateOptions): Promise<ProviderPaymentResult> {
    void order;
    void dto;
    await this.assertRealProviderReady(provider, `${provider} real payment`);
    const runtimeConfig = options?.runtimeConfig || await this.runtimeConfigForOrder(provider, order);
    const adapter = this.realAdapter(provider, runtimeConfig);
    const result = await adapter.createPayment(order, dto, options);
    const callbackPath = options?.callbackPath?.trim();
    if (!callbackPath) return result;
    return {
      ...result,
      callbackPath,
      payParams: {
        ...result.payParams,
        callbackPath
      }
    };
  }

  private parseRealCallback(provider: SupportedPaymentProvider, dto: ProviderPaymentCallbackDto): NormalizedPaymentCallback {
    void provider;
    void dto;
    throw new NotImplementedException(`${provider} real payment callback requires raw provider payload`);
  }

  private realAdapter(provider: SupportedPaymentProvider, runtimeConfig?: PaymentProviderRuntimeConfig): PaymentProviderAdapter {
    return createRealPaymentAdapter(provider, this.config, runtimeConfig);
  }

  private async runtimeConfigForOrder(provider: SupportedPaymentProvider, order: Order): Promise<PaymentProviderRuntimeConfig> {
    const agentId = order.agent?.id || null;
    return this.runtimeConfigForProvider(provider, agentId, order.tenant?.id || null);
  }

  private async runtimeConfigForProvider(provider: SupportedPaymentProvider, agentId: number | null, tenantId?: number | null): Promise<PaymentProviderRuntimeConfig> {
    if (!agentId) return { scope: "platform", agentId: null, values: await this.platformRuntimeValues() };
    const account = await this.agentPaymentAccounts.findOne({ where: { agent: { id: agentId }, provider: this.paymentMethodForProvider(provider), enabled: true } });
    if (!account) throw new BadRequestException(`${provider} payment account is not configured for agent ${agentId}`);
    if (tenantId && account.tenant?.id && account.tenant.id !== tenantId) {
      throw new BadRequestException(`${provider} payment account tenant does not match order tenant`);
    }
    return {
      scope: "agent",
      agentId,
      values: this.normalizeConfig(account.config)
    };
  }

  private normalizeConfig(config: Record<string, unknown> | null) {
    const values: Record<string, string> = {};
    for (const [key, value] of Object.entries(config || {})) {
      if (value !== undefined && value !== null) values[key] = String(value);
    }
    return values;
  }

  private paymentMethodForProvider(provider: SupportedPaymentProvider) {
    return provider === "wechat" ? PaymentMethod.Wechat : PaymentMethod.Alipay;
  }

  private callbackString(payload: Record<string, unknown>, ...keys: string[]) {
    for (const key of keys) {
      const value = payload[key];
      if (typeof value === "string" && value.trim()) return value.trim();
      if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return null;
  }

  private async assertRealProviderReady(provider: SupportedPaymentProvider, label: string) {
    if (!(await this.realPaymentFlagEnabled("REAL_PAYMENT_ENABLED"))) {
      throw new BadRequestException(`${label} requires REAL_PAYMENT_ENABLED=true`);
    }
    if (!(await this.realPaymentFlagEnabled(this.providerEnabledKey(provider)))) {
      throw new BadRequestException(`${label} requires ${this.providerEnabledKey(provider)}=true`);
    }
  }

  private async isRealProviderEnabled(provider: SupportedPaymentProvider) {
    return await this.realPaymentFlagEnabled("REAL_PAYMENT_ENABLED") && await this.realPaymentFlagEnabled(this.providerEnabledKey(provider));
  }

  private async realPaymentFlagEnabled(key: string) {
    const runtimeValues = await this.platformRuntimeValues();
    return (runtimeValues[key] || this.config.get(key, "false")) === "true";
  }

  private async platformRuntimeValues() {
    const setting = await this.operationSettings.findOne({ where: { id: 1 } });
    return launchConfigToEnv(setting?.launchConfig);
  }

  private providerEnabledKey(provider: SupportedPaymentProvider) {
    return provider === "wechat" ? "WECHAT_PAY_ENABLED" : "ALIPAY_ENABLED";
  }

  private signSandboxPayload(provider: SupportedPaymentProvider, orderNo: string, transactionNo: string, amount: string, timestamp: string) {
    const secret = this.config.get(`${provider.toUpperCase()}_PAY_SANDBOX_SECRET`) || this.config.get("PAYMENT_SANDBOX_SECRET", "dev-payment-secret");
    return createHmac("sha256", secret).update([provider, orderNo, transactionNo, amount, timestamp].join("|")).digest("hex");
  }
}
