import { AgentPaymentAccount } from "../../entities/agent-payment-account.entity";
import { AgentSettlement } from "../../entities/agent-settlement.entity";
import { Agent } from "../../entities/agent.entity";
import { AGENT_TRANSFER_REQUIREMENTS, TRANSFER_PROVIDERS, assessAgentTransferAccount, createAgentTransferAdapter, providerForPaymentMethod } from "../public/agent-transfer-adapters";

type ConfigLike = {
  get<T = string>(key: string, fallback?: T): T;
};

export function buildAgentSettlementTransferCapability(config: ConfigLike, agents: Agent[], accounts: AgentPaymentAccount[]) {
  const realPaymentEnabled = config.get<string>("REAL_PAYMENT_ENABLED", "false") === "true";
  const providers = TRANSFER_PROVIDERS.map((provider) => {
    const requirements = AGENT_TRANSFER_REQUIREMENTS[provider];
    return {
      provider,
      label: requirements.label,
      enabled: config.get<string>(requirements.enabledKey, "false") === "true",
      enabledKey: requirements.enabledKey,
      runtimeKeys: requirements.runtimeKeys,
      accountKeys: requirements.accountKeys
    };
  });
  const accountAssessments = accounts
    .map((account) => {
      const assessment = assessAgentTransferAccount(config as any, account);
      if (!assessment) return null;
      const adapter = createAgentTransferAdapter(assessment.provider, config as any, account);
      return {
        accountId: account.id,
        agent: account.agent ? { id: account.agent.id, name: account.agent.name, region: account.agent.region, enabled: account.agent.enabled } : null,
        provider: assessment.provider,
        providerLabel: assessment.providerLabel,
        merchantName: account.merchantName,
        merchantNo: account.merchantNo,
        enabled: account.enabled,
        status: assessment.status,
        missingRuntimeKeys: assessment.missingRuntimeKeys,
        missingAccountKeys: assessment.missingAccountKeys,
        message: assessment.message,
        nextAction: assessment.nextAction,
        transferDraftSupported: true,
        realTransferImplemented: assessment.realTransferImplemented,
        requestTransferImplemented: assessment.requestTransferImplemented,
        queryTransferImplemented: assessment.queryTransferImplemented,
        draftRemarkPreview: adapter.createTransferDraft({
          settlementNo: "AS_PREVIEW",
          payableAmount: "0.00"
        } as AgentSettlement).remark
      };
    })
    .filter(Boolean);
  const realTransferImplemented = accountAssessments.some((item: any) => item.realTransferImplemented);
  const enabledAgents = agents.filter((agent) => agent.enabled);
  const missingAgents = enabledAgents
    .filter((agent) => !accounts.some((account) => account.agent?.id === agent.id && account.enabled && providerForPaymentMethod(account.provider)))
    .map((agent) => ({ id: agent.id, name: agent.name, region: agent.region }));
  const counts = {
    manualOnly: accountAssessments.filter((item: any) => item.status === "manual_only").length,
    notReady: accountAssessments.filter((item: any) => item.status === "not_ready").length,
    sandboxReady: accountAssessments.filter((item: any) => item.status === "sandbox_ready").length,
    realReady: accountAssessments.filter((item: any) => item.status === "real_ready").length
  };
  const overallStatus = !realPaymentEnabled ? "manual_only" : counts.notReady || missingAgents.length ? "not_ready" : counts.realReady ? "real_ready" : counts.sandboxReady ? "sandbox_ready" : "manual_only";
  const nextActions = [
    !realPaymentEnabled ? "先保持线下打款登记；如要自动打款，需要先完成真实支付和转账产品开通" : "",
    missingAgents.length ? "为启用中的代理补齐微信或支付宝支付账户，并填写收款人转账资料" : "",
    counts.notReady ? "补齐缺失的商户证书、转账产品参数和代理收款人字段" : "",
    counts.sandboxReady ? "选择一个已就绪代理，在支付机构沙箱验证小额转账、失败回滚和回执对账" : "",
    counts.realReady ? "真实自动打款实现标记已开启，生产放行前必须保留预发小额转账、失败回滚和回执查询记录" : ""
  ].filter(Boolean);
  return {
    status: overallStatus,
    generatedAt: new Date().toISOString(),
    realPaymentEnabled,
    providers,
    summary: {
      enabledAgentCount: enabledAgents.length,
      paymentAccountCount: accounts.length,
      assessedAccountCount: accountAssessments.length,
      missingAgentCount: missingAgents.length,
      ...counts
    },
    accounts: accountAssessments,
    missingAgents,
    nextActions,
    realTransferImplemented
  };
}
