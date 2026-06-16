import { BadRequestException, NotImplementedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createSign, publicEncrypt, randomBytes, constants } from "crypto";
import type { KeyObject } from "crypto";
import { readFileSync } from "fs";
import { AgentPaymentAccount } from "../../entities/agent-payment-account.entity";
import { AgentSettlement } from "../../entities/agent-settlement.entity";
import { PaymentMethod } from "../../shared/domain";
import type { SupportedPaymentProvider } from "./payment-provider.service";
import { executeRealPaymentHttpRequestDraft, type RealPaymentFetch, type RealPaymentHttpRequestDraft } from "./real-payment-adapters";

export type AgentTransferCapabilityStatus = "manual_only" | "not_ready" | "sandbox_ready" | "real_ready";
export type AgentTransferProvider = SupportedPaymentProvider;

export type AgentTransferAssessment = {
  provider: AgentTransferProvider;
  providerLabel: string;
  status: AgentTransferCapabilityStatus;
  missingRuntimeKeys: string[];
  missingAccountKeys: string[];
  realTransferImplemented: boolean;
  requestTransferImplemented: boolean;
  queryTransferImplemented: boolean;
  message: string;
  nextAction: string;
};

export type AgentTransferDraft = {
  provider: AgentTransferProvider;
  settlementNo: string;
  amount: string;
  amountCents: number;
  payeeAccount: string | null;
  payeeName: string | null;
  remark: string;
};

export type AgentSandboxTransferResult = AgentTransferDraft & {
  mode: "sandbox";
  status: "success" | "failed";
  transferNo: string;
  providerTransferNo: string | null;
  failureReason: string | null;
  raw: Record<string, unknown>;
};

export type AgentRealTransferResult = AgentTransferDraft & {
  mode: "real";
  status: "accepted" | "processing" | "success" | "failed";
  transferNo: string;
  providerTransferNo: string | null;
  failureReason: string | null;
  raw: Record<string, unknown>;
};

export type AgentTransferQueryResult = {
  mode: "sandbox" | "real";
  status: "processing" | "success" | "failed";
  providerTransferNo: string | null;
  failureReason: string | null;
  raw: Record<string, unknown>;
};

type AgentTransferAdapter = {
  readonly realTransferImplemented: boolean;
  readonly requestTransferImplemented: boolean;
  readonly queryTransferImplemented: boolean;
  createTransferDraft(settlement: AgentSettlement): AgentTransferDraft;
  requestSandboxTransfer(settlement: AgentSettlement, options?: { status?: "success" | "failed"; failureReason?: string | null; operator?: string | null; transferNo?: string }): AgentSandboxTransferResult;
  requestRealTransfer(settlement: AgentSettlement, options?: { operator?: string | null; transferNo?: string }): Promise<AgentRealTransferResult> | AgentRealTransferResult;
  queryTransfer(transferNo?: string): Promise<AgentTransferQueryResult> | AgentTransferQueryResult;
};

type WechatTransferDraftOptions = {
  appId: string;
  mchId: string;
  certSerialNo: string;
  privateKey: string | Buffer | KeyObject;
  platformCert: string | Buffer | KeyObject;
  sceneId: string;
  transferNo: string;
  baseUrl?: string;
  timestamp?: string;
  nonce?: string;
};

type WechatTransferQueryOptions = Pick<WechatTransferDraftOptions, "mchId" | "certSerialNo" | "privateKey" | "baseUrl" | "timestamp" | "nonce"> & {
  transferNo: string;
};

type TransferRequirements = {
  label: string;
  method: PaymentMethod.Wechat | PaymentMethod.Alipay;
  enabledKey: string;
  runtimeKeys: string[];
  accountKeys: string[];
  payeeAccountKey: string;
  payeeNameKey: string;
};

export const TRANSFER_PROVIDERS: AgentTransferProvider[] = ["wechat", "alipay"];

export const AGENT_TRANSFER_REQUIREMENTS: Record<AgentTransferProvider, TransferRequirements> = {
  wechat: {
    label: "微信商家转账",
    method: PaymentMethod.Wechat,
    enabledKey: "WECHAT_PAY_ENABLED",
    runtimeKeys: ["WECHAT_PAY_MCH_ID", "WECHAT_PAY_PRIVATE_KEY_PATH", "WECHAT_PAY_CERT_SERIAL_NO", "WECHAT_PAY_API_V3_KEY", "WECHAT_TRANSFER_APP_ID", "WECHAT_TRANSFER_SCENE_ID"],
    accountKeys: ["WECHAT_TRANSFER_OPENID", "WECHAT_TRANSFER_REAL_NAME"],
    payeeAccountKey: "WECHAT_TRANSFER_OPENID",
    payeeNameKey: "WECHAT_TRANSFER_REAL_NAME"
  },
  alipay: {
    label: "支付宝单笔转账",
    method: PaymentMethod.Alipay,
    enabledKey: "ALIPAY_ENABLED",
    runtimeKeys: ["ALIPAY_APP_ID", "ALIPAY_PRIVATE_KEY_PATH", "ALIPAY_PUBLIC_CERT_PATH", "ALIPAY_TRANSFER_PRODUCT_CODE"],
    accountKeys: ["ALIPAY_PAYEE_ACCOUNT", "ALIPAY_PAYEE_REAL_NAME"],
    payeeAccountKey: "ALIPAY_PAYEE_ACCOUNT",
    payeeNameKey: "ALIPAY_PAYEE_REAL_NAME"
  }
};

export function providerForPaymentMethod(method: PaymentMethod): AgentTransferProvider | null {
  if (method === PaymentMethod.Wechat) return "wechat";
  if (method === PaymentMethod.Alipay) return "alipay";
  return null;
}

export function assessAgentTransferAccount(config: ConfigService, account: AgentPaymentAccount): AgentTransferAssessment | null {
  const provider = providerForPaymentMethod(account.provider);
  if (!provider) return null;
  const requirements = AGENT_TRANSFER_REQUIREMENTS[provider];
  const adapter = createAgentTransferAdapter(provider, config, account);
  const values = normalizeConfig(account.config);
  const realPaymentEnabled = config.get<string>("REAL_PAYMENT_ENABLED", "false") === "true";
  const providerEnabled = config.get<string>(requirements.enabledKey, "false") === "true";
  const realTransferImplemented = config.get<string>("AGENT_REAL_TRANSFER_IMPLEMENTED", "false") === "true" && adapter.realTransferImplemented;
  const missingRuntimeKeys = requirements.runtimeKeys.filter((key) => !hasRuntimeValue(config, values, key));
  const missingAccountKeys = requirements.accountKeys.filter((key) => !hasConfigValue(values, key));
  const implementation = {
    realTransferImplemented,
    requestTransferImplemented: realTransferImplemented && adapter.requestTransferImplemented,
    queryTransferImplemented: realTransferImplemented && adapter.queryTransferImplemented
  };

  if (!account.enabled) {
    return {
      provider,
      providerLabel: requirements.label,
      status: "not_ready",
      missingRuntimeKeys,
      missingAccountKeys,
      ...implementation,
      message: "代理支付账户未启用，不能进入自动打款联调。",
      nextAction: "启用代理支付账户，并确认该代理的收款/转账资料。"
    };
  }
  if (!realPaymentEnabled || !providerEnabled) {
    return {
      provider,
      providerLabel: requirements.label,
      status: "manual_only",
      missingRuntimeKeys,
      missingAccountKeys,
      ...implementation,
      message: "真实支付或该支付渠道未启用，当前只能保留线下打款登记。",
      nextAction: `确认支付机构产品已开通后，再开启 REAL_PAYMENT_ENABLED 和 ${requirements.enabledKey}。`
    };
  }
  if (missingRuntimeKeys.length || missingAccountKeys.length) {
    return {
      provider,
      providerLabel: requirements.label,
      status: "not_ready",
      missingRuntimeKeys,
      missingAccountKeys,
      ...implementation,
      message: "自动打款资料不完整，不能进入沙箱转账验证。",
      nextAction: "补齐缺失的商户证书、转账产品参数和代理收款人资料。"
    };
  }
  if (config.get<string>("AGENT_REAL_TRANSFER_IMPLEMENTED", "false") === "true" && !adapter.realTransferImplemented) {
    return {
      provider,
      providerLabel: requirements.label,
      status: "sandbox_ready",
      missingRuntimeKeys,
      missingAccountKeys,
      ...implementation,
      message: "配置字段已满足沙箱验证前置条件，但当前 adapter 仍未实现真实转账请求和查询。",
      nextAction: "先实现并验证支付机构转账 adapter，再将该代理能力提升为真实打款就绪。"
    };
  }
  return {
    provider,
    providerLabel: requirements.label,
    status: realTransferImplemented ? "real_ready" : "sandbox_ready",
    missingRuntimeKeys,
    missingAccountKeys,
    ...implementation,
    message: realTransferImplemented ? "配置字段已满足真实自动打款前置条件，仍需预发小额转账和回执对账留档。" : "配置字段已满足沙箱验证前置条件，但真实转账 SDK 尚未接入。",
    nextAction: realTransferImplemented ? "在预发环境完成小额真实转账、失败回滚、回执查询和人工回滚记录后，再开放生产使用。" : "下一步接入支付机构转账 SDK，在沙箱完成小额转账、失败回滚和回执对账验证。"
  };
}

export function createAgentTransferAdapter(provider: AgentTransferProvider, config: ConfigService, account?: AgentPaymentAccount): AgentTransferAdapter {
  if (provider === "wechat") return new WechatAgentTransferAdapter(config, account);
  return new DraftOnlyAgentTransferAdapter(provider, config, account);
}

class DraftOnlyAgentTransferAdapter {
  readonly realTransferImplemented: boolean = false;
  readonly requestTransferImplemented: boolean = false;
  readonly queryTransferImplemented: boolean = false;

  constructor(
    protected readonly provider: AgentTransferProvider,
    protected readonly config: ConfigService,
    protected readonly account?: AgentPaymentAccount
  ) {}

  createTransferDraft(settlement: AgentSettlement): AgentTransferDraft {
    const requirements = AGENT_TRANSFER_REQUIREMENTS[this.provider];
    const values = normalizeConfig(this.account?.config || null);
    const amount = Number(settlement.payableAmount || 0).toFixed(2);
    return {
      provider: this.provider,
      settlementNo: settlement.settlementNo,
      amount,
      amountCents: Math.round(Number(amount) * 100),
      payeeAccount: values[requirements.payeeAccountKey] || null,
      payeeName: values[requirements.payeeNameKey] || null,
      remark: this.config.get<string>(`${this.provider.toUpperCase()}_TRANSFER_REMARK`, `代理结算 ${settlement.settlementNo}`)
    };
  }

  requestSandboxTransfer(settlement: AgentSettlement, options: { status?: "success" | "failed"; failureReason?: string | null; operator?: string | null; transferNo?: string } = {}): AgentSandboxTransferResult {
    const draft = this.createTransferDraft(settlement);
    const status = options.status === "failed" ? "failed" : "success";
    const transferNo = options.transferNo || `AST${Date.now()}${settlement.id}`;
    return {
      ...draft,
      mode: "sandbox",
      status,
      transferNo,
      providerTransferNo: status === "success" ? `${this.provider.toUpperCase()}_SANDBOX_${transferNo}` : null,
      failureReason: status === "failed" ? options.failureReason || "sandbox transfer simulated failure" : null,
      raw: {
        provider: this.provider,
        mode: "sandbox",
        settlementId: settlement.id,
        settlementNo: settlement.settlementNo,
        operator: options.operator || null,
        generatedAt: new Date().toISOString()
      }
    };
  }

  requestRealTransfer(settlement: AgentSettlement, options: { operator?: string | null; transferNo?: string } = {}): Promise<AgentRealTransferResult> | AgentRealTransferResult {
    const draft = this.createTransferDraft(settlement);
    void options;
    void draft;
    throw new NotImplementedException(`${this.provider} agent transfer SDK request is not implemented yet`);
  }

  queryTransfer(_transferNo?: string): Promise<AgentTransferQueryResult> | AgentTransferQueryResult {
    throw new NotImplementedException(`${this.provider} agent transfer SDK query is not implemented yet`);
  }
}

class WechatAgentTransferAdapter extends DraftOnlyAgentTransferAdapter {
  readonly realTransferImplemented = true;
  readonly requestTransferImplemented = true;
  readonly queryTransferImplemented = true;

  constructor(config: ConfigService, account?: AgentPaymentAccount) {
    super("wechat", config, account);
  }

  async requestRealTransfer(settlement: AgentSettlement, options: { operator?: string | null; transferNo?: string } = {}): Promise<AgentRealTransferResult> {
    const draft = this.createTransferDraft(settlement);
    const config = this.wechatTransferConfig();
    const transferNo = options.transferNo || `ART${Date.now()}${settlement.id}`;
    const request = buildWechatTransferRequestDraft(settlement, draft, {
      ...config,
      transferNo
    });
    const payload = await executeRealPaymentHttpRequestDraft(request, undefined, { publicKey: config.platformCert });
    return normalizeWechatTransferRequestPayload(draft, transferNo, payload);
  }

  async queryTransfer(transferNo?: string): Promise<AgentTransferQueryResult> {
    if (!transferNo) throw new BadRequestException("wechat real transfer query requires transferNo");
    const config = this.wechatTransferConfig();
    const request = buildWechatTransferQueryRequestDraft({
      ...config,
      transferNo
    });
    const payload = await executeRealPaymentHttpRequestDraft(request, undefined, { publicKey: config.platformCert });
    return normalizeWechatTransferQueryPayload(payload);
  }

  private wechatTransferConfig() {
    return {
      appId: this.required("WECHAT_TRANSFER_APP_ID", this.required("WECHAT_PAY_APP_ID")),
      mchId: this.required("WECHAT_PAY_MCH_ID"),
      certSerialNo: this.required("WECHAT_PAY_CERT_SERIAL_NO"),
      privateKey: this.readConfiguredFile(this.required("WECHAT_PAY_PRIVATE_KEY_PATH"), "WECHAT_PAY_PRIVATE_KEY_PATH"),
      platformCert: this.readConfiguredFile(this.required("WECHAT_PAY_PLATFORM_CERT_PATH"), "WECHAT_PAY_PLATFORM_CERT_PATH"),
      sceneId: this.required("WECHAT_TRANSFER_SCENE_ID"),
      baseUrl: this.configValue("WECHAT_PAY_API_BASE_URL") || undefined
    };
  }

  private required(key: string, fallback?: string) {
    const value = this.configValue(key) || fallback || "";
    if (!value.trim()) throw new NotImplementedException(`wechat agent transfer requires ${key}`);
    return value.trim();
  }

  private configValue(key: string) {
    const accountValue = normalizeConfig(this.accountConfig())[key];
    return accountValue || this.config.get<string>(key, "");
  }

  private accountConfig() {
    return (this as any).account?.config || null;
  }

  private readConfiguredFile(path: string, label: string) {
    try {
      return readFileSync(path, "utf8");
    } catch {
      throw new BadRequestException(`wechat agent transfer cannot read ${label}`);
    }
  }
}

export function buildWechatTransferRequestDraft(settlement: AgentSettlement, draft: AgentTransferDraft, options: WechatTransferDraftOptions): RealPaymentHttpRequestDraft {
  const method = "POST";
  const path = "/v3/fund-app/mch-transfer/transfer-bills";
  const payeeOpenId = requiredTransferValue(draft.payeeAccount, "WECHAT_TRANSFER_OPENID");
  const payeeName = requiredTransferValue(draft.payeeName, "WECHAT_TRANSFER_REAL_NAME");
  const body = JSON.stringify({
    appid: options.appId,
    out_bill_no: options.transferNo,
    transfer_scene_id: options.sceneId,
    openid: payeeOpenId,
    user_name: encryptWechatTransferUserName(payeeName, options.platformCert),
    transfer_amount: draft.amountCents,
    transfer_remark: trimWechatTransferRemark(draft.remark || `Agent settlement ${settlement.settlementNo}`),
    user_recv_perception: "agent settlement"
  });
  return buildWechatSignedRequest("wechat", method, path, body, options);
}

export async function executeWechatTransferRequest(settlement: AgentSettlement, draft: AgentTransferDraft, options: WechatTransferDraftOptions, fetchImpl?: RealPaymentFetch): Promise<AgentRealTransferResult> {
  const request = buildWechatTransferRequestDraft(settlement, draft, options);
  const payload = await executeRealPaymentHttpRequestDraft(request, fetchImpl, { publicKey: options.platformCert });
  return normalizeWechatTransferRequestPayload(draft, options.transferNo, payload);
}

export async function executeWechatTransferQuery(options: WechatTransferQueryOptions & { platformCert: string | Buffer | KeyObject }, fetchImpl?: RealPaymentFetch): Promise<AgentTransferQueryResult> {
  const request = buildWechatTransferQueryRequestDraft(options);
  const payload = await executeRealPaymentHttpRequestDraft(request, fetchImpl, { publicKey: options.platformCert });
  return normalizeWechatTransferQueryPayload(payload);
}

export function buildWechatTransferQueryRequestDraft(options: WechatTransferQueryOptions): RealPaymentHttpRequestDraft {
  const method = "GET";
  const path = `/v3/fund-app/mch-transfer/transfer-bills/out-bill-no/${encodeURIComponent(options.transferNo)}`;
  return buildWechatSignedRequest("wechat", method, path, "", options);
}

function buildWechatSignedRequest(provider: AgentTransferProvider, method: "GET" | "POST", path: string, body: string, options: Pick<WechatTransferDraftOptions, "mchId" | "certSerialNo" | "privateKey" | "baseUrl" | "timestamp" | "nonce">): RealPaymentHttpRequestDraft {
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
    provider,
    method,
    url: `${options.baseUrl || "https://api.mch.weixin.qq.com"}${path}`,
    path,
    headers: { Accept: "application/json", "Content-Type": "application/json", Authorization: authorization },
    body: method === "GET" ? null : body
  };
}

function normalizeWechatTransferRequestPayload(draft: AgentTransferDraft, transferNo: string, payload: Record<string, unknown>): AgentRealTransferResult {
  const query = normalizeWechatTransferQueryPayload(payload);
  return {
    ...draft,
    mode: "real",
    status: query.status === "success" ? "success" : query.status === "failed" ? "failed" : "accepted",
    transferNo,
    providerTransferNo: query.providerTransferNo,
    failureReason: query.failureReason,
    raw: payload
  };
}

function normalizeWechatTransferQueryPayload(payload: Record<string, unknown>): AgentTransferQueryResult {
  const state = transferPayloadString(payload, "state", "status") || "PROCESSING";
  return {
    mode: "real",
    status: normalizeWechatTransferStatus(state),
    providerTransferNo: transferPayloadString(payload, "transfer_bill_no", "bill_id", "providerTransferNo"),
    failureReason: transferPayloadString(payload, "fail_reason", "fail_message", "state_remark", "message"),
    raw: payload
  };
}

function normalizeWechatTransferStatus(status: string): AgentTransferQueryResult["status"] {
  switch (status.trim().toUpperCase()) {
    case "SUCCESS":
      return "success";
    case "FAIL":
    case "FAILED":
    case "CANCELLED":
      return "failed";
    case "ACCEPTED":
    case "PROCESSING":
    case "TRANSFERING":
    case "WAIT_USER_CONFIRM":
    case "CANCELING":
      return "processing";
    default:
      throw new BadRequestException(`wechat agent transfer status is unsupported: ${status}`);
  }
}

function requiredTransferValue(value: string | null, label: string) {
  if (value && value.trim()) return value.trim();
  throw new BadRequestException(`wechat agent transfer requires ${label}`);
}

function trimWechatTransferRemark(remark: string) {
  const value = remark.trim();
  if (!value) return "Agent settlement";
  return value.length > 32 ? value.slice(0, 32) : value;
}

function transferPayloadString(payload: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function encryptWechatTransferUserName(value: string, platformCert: string | Buffer | KeyObject) {
  return publicEncrypt(
    {
      key: platformCert,
      padding: constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha1"
    },
    Buffer.from(value, "utf8")
  ).toString("base64");
}

function signRsaSha256(message: string, privateKey: string | Buffer | KeyObject) {
  const signer = createSign("RSA-SHA256");
  signer.update(message);
  signer.end();
  return signer.sign(privateKey, "base64");
}

function normalizeConfig(config: Record<string, unknown> | null) {
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(config || {})) {
    if (value !== undefined && value !== null) values[key] = String(value).trim();
  }
  return values;
}

function hasRuntimeValue(config: ConfigService, accountValues: Record<string, string>, key: string) {
  return hasConfigValue(accountValues, key) || Boolean(config.get<string>(key, "").trim());
}

function hasConfigValue(values: Record<string, string>, key: string) {
  return Boolean(values[key] && values[key] !== "***");
}
