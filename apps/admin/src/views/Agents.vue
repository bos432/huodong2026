<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { ElMessage } from "element-plus";
import { Edit, Plus, Refresh } from "@element-plus/icons-vue";
import { useRoute } from "vue-router";
import { api } from "../api";
import { canAccess, currentTenantSettings, isPlatformAdmin } from "../permissions";
import { maskPhone } from "../privacy";

type Agent = {
  id: number;
  name: string;
  tenant?: any;
  parentAgent?: Agent | null;
  region?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  enabled: boolean;
  sensitiveMasked?: boolean;
};

type AgentPaymentAccount = {
  id: number;
  agent: Agent;
  provider: "wechat" | "alipay";
  merchantName?: string | null;
  merchantNo?: string | null;
  enabled: boolean;
  config?: Record<string, unknown> | null;
  configKeys?: string[];
  configuredKeyCount?: number;
  sensitiveMasked?: boolean;
};

type PageResult<T> = { items: T[]; total: number; page: number; pageSize: number; summary?: { enabled?: number } };

type AccountReadiness = {
  paymentMissing: string[];
  transferMissing: string[];
  maskedKeys: string[];
  status: "ready" | "partial" | "missing";
  label: string;
  nextAction: string;
};

const providerOptions = [
  { label: "微信支付", value: "wechat" },
  { label: "支付宝", value: "alipay" }
] as const;

const accountRequirements: Record<AgentPaymentAccount["provider"], { payment: string[]; transfer: string[] }> = {
  wechat: {
    payment: ["WECHAT_PAY_APP_ID", "WECHAT_PAY_MCH_ID", "WECHAT_PAY_API_V3_KEY", "WECHAT_PAY_PRIVATE_KEY_PATH", "WECHAT_PAY_CERT_SERIAL_NO", "WECHAT_PAY_PLATFORM_CERT_PATH", "WECHAT_PAY_NOTIFY_URL"],
    transfer: ["WECHAT_TRANSFER_OPENID", "WECHAT_TRANSFER_REAL_NAME"]
  },
  alipay: {
    payment: ["ALIPAY_APP_ID", "ALIPAY_PRIVATE_KEY_PATH", "ALIPAY_PUBLIC_CERT_PATH", "ALIPAY_ROOT_CERT_PATH", "ALIPAY_NOTIFY_URL"],
    transfer: ["ALIPAY_PAYEE_ACCOUNT", "ALIPAY_PAYEE_REAL_NAME"]
  }
};

const agents = ref<Agent[]>([]);
const accounts = ref<AgentPaymentAccount[]>([]);
const tenants = ref<any[]>([]);
const selectedAgentId = ref<number | null>(null);
const optionsLoading = ref(false);
const agentsLoading = ref(false);
const accountsLoading = ref(false);
const optionsError = ref("");
const agentsError = ref("");
const accountsError = ref("");
const optionsRequestId = ref(0);
const agentsRequestId = ref(0);
const accountsRequestId = ref(0);
const agentDialog = ref(false);
const accountDialog = ref(false);
const savingAgent = ref(false);
const savingAccount = ref(false);
const editingAgentId = ref<number | null>(null);
const editingAccountId = ref<number | null>(null);
const route = useRoute();
const agentPage = ref(1);
const agentPageSize = ref(20);
const agentTotal = ref(0);
const enabledAgentTotal = ref(0);
const accountPage = ref(1);
const accountPageSize = ref(20);
const accountTotal = ref(0);
const enabledAccountTotal = ref(0);
const agentTarget = ref<{ id: number | null; tenantId?: number; scope: string; generation: number } | null>(null);
const accountTarget = ref<{ id: number | null; agentId: number; provider: AgentPaymentAccount["provider"]; tenantId?: number; scope: string; generation: number } | null>(null);

const agentForm = reactive({
  name: "",
  parentAgentId: undefined as number | undefined,
  region: "",
  contactName: "",
  contactPhone: "",
  enabled: true
});

const accountForm = reactive({
  agentId: undefined as number | undefined,
  provider: "wechat" as "wechat" | "alipay",
  merchantName: "",
  merchantNo: "",
  enabled: true,
  configText: ""
});
const filters = reactive({
  tenantId: undefined as number | undefined,
  keyword: "",
  provider: "" as "" | "wechat" | "alipay",
  includeDisabled: true
});

const selectedAgent = computed(() => agents.value.find((item) => item.id === selectedAgentId.value) || null);
const selectedAccounts = computed(() => accounts.value);
const readyAccountCount = computed(() => accounts.value.filter((item) => accountReadiness(item).status === "ready").length);
const paymentAccountEditable = computed(() => currentTenantSettings().paymentAccountEditable);
const canManagePaymentAccounts = computed(() => canAccess(["payment_account.manage"]));
const canViewSensitive = computed(() => canAccess(["payment_account.sensitive"]));
const loading = computed(() => optionsLoading.value || agentsLoading.value || accountsLoading.value);
const operationLocked = computed(() => agentDialog.value || accountDialog.value || savingAgent.value || savingAccount.value);
const scopeLocked = computed(() => operationLocked.value || loading.value);

function displayPhone(value?: unknown) {
  return canViewSensitive.value ? String(value || "-") : maskPhone(value);
}
const canEditPaymentAccounts = computed(() => canManagePaymentAccounts.value && paymentAccountEditable.value && (!isPlatformAdmin() || Boolean(filters.tenantId)));
const paymentAccountReadonlyReason = computed(() => {
  if (!canAccess(["payment_account.manage"])) return "当前账号只能查看收款方式，如需新增或修改，请联系商家管理员。";
  if (!paymentAccountEditable.value) return "平台超级管理员已关闭本商家的收款配置权限，当前仅可查看收款方式。";
  if (isPlatformAdmin() && !filters.tenantId) return "平台超级管理员请先选择商家，再新增或编辑该商家的收款账户。";
  return "";
});
const accountFormReadiness = computed(() => {
  const parsed = parseConfig();
  return buildReadiness(accountForm.provider, parsed.value || {});
});

function providerLabel(provider: string) {
  return providerOptions.find((item) => item.value === provider)?.label || provider;
}

function configTemplate(provider: "wechat" | "alipay") {
  const template =
    provider === "wechat"
      ? {
          WECHAT_PAY_APP_ID: "",
          WECHAT_PAY_MCH_ID: "",
          WECHAT_PAY_API_V3_KEY: "",
          WECHAT_PAY_PRIVATE_KEY_PATH: "",
          WECHAT_PAY_CERT_SERIAL_NO: "",
          WECHAT_PAY_PLATFORM_CERT_PATH: "",
          WECHAT_PAY_NOTIFY_URL: "",
          WECHAT_TRANSFER_OPENID: "",
          WECHAT_TRANSFER_REAL_NAME: ""
        }
      : {
          ALIPAY_APP_ID: "",
          ALIPAY_PRIVATE_KEY_PATH: "",
          ALIPAY_PUBLIC_CERT_PATH: "",
          ALIPAY_ROOT_CERT_PATH: "",
          ALIPAY_NOTIFY_URL: "",
          ALIPAY_PAYEE_ACCOUNT: "",
          ALIPAY_PAYEE_REAL_NAME: ""
        };
  return JSON.stringify(template, null, 2);
}

function formatConfig(config?: Record<string, unknown> | null, provider: "wechat" | "alipay" = "wechat") {
  return JSON.stringify(config && Object.keys(config).length ? config : JSON.parse(configTemplate(provider)), null, 2);
}

function tenantDisplayName(row: { tenant?: any; agent?: { tenant?: any } }) {
  return row.tenant?.name || row.tenant?.code || row.agent?.tenant?.name || row.agent?.tenant?.code || "平台";
}

function accountQueryParams(agentId?: number) {
  return {
    agentId: agentId || selectedAgentId.value || undefined,
    tenantId: isPlatformAdmin() ? filters.tenantId || undefined : undefined,
    keyword: filters.keyword.trim() || undefined,
    provider: filters.provider || undefined,
    includeDisabled: String(filters.includeDisabled),
    page: accountPage.value,
    pageSize: accountPageSize.value
  };
}

function scopeSnapshot() {
  return JSON.stringify({
    tenantId: isPlatformAdmin() ? filters.tenantId || null : null,
    keyword: filters.keyword.trim(),
    provider: filters.provider,
    includeDisabled: filters.includeDisabled,
    agentPage: agentPage.value,
    accountPage: accountPage.value,
    selectedAgentId: selectedAgentId.value
  });
}

function validPageResult<T>(value: PageResult<T>) {
  return value && Array.isArray(value.items) && Number.isFinite(Number(value.total));
}

async function loadAgents() {
  const requestId = ++agentsRequestId.value;
  const snapshot = scopeSnapshot();
  agentsLoading.value = true;
  agentsError.value = "";
  agents.value = [];
  agentTotal.value = 0;
  enabledAgentTotal.value = 0;
  try {
    const result = await api.get<any, PageResult<Agent>>("/admin/agents", { params: {
      includeDisabled: String(filters.includeDisabled),
      tenantId: isPlatformAdmin() ? filters.tenantId || undefined : undefined,
      keyword: filters.keyword.trim() || undefined,
      page: agentPage.value,
      pageSize: agentPageSize.value
    } });
    if (requestId !== agentsRequestId.value || snapshot !== scopeSnapshot()) return;
    if (!validPageResult(result)) throw new Error("代理列表响应格式无效");
    agents.value = result.items;
    agentTotal.value = Number(result.total || 0);
    enabledAgentTotal.value = Number(result.summary?.enabled || 0);
    if (!selectedAgentId.value && agents.value.length) selectedAgentId.value = agents.value[0].id;
    if (selectedAgentId.value && !agents.value.some((item) => item.id === selectedAgentId.value)) selectedAgentId.value = agents.value[0]?.id || null;
  } catch (error: any) {
    if (requestId !== agentsRequestId.value || snapshot !== scopeSnapshot()) return;
    agents.value = [];
    selectedAgentId.value = null;
    agentTotal.value = 0;
    enabledAgentTotal.value = 0;
    agentsError.value = error.message || "加载代理列表失败";
  } finally {
    if (requestId === agentsRequestId.value) agentsLoading.value = false;
  }
}

async function loadAccounts() {
  const requestId = ++accountsRequestId.value;
  const snapshot = scopeSnapshot();
  accountsLoading.value = true;
  accountsError.value = "";
  accounts.value = [];
  accountTotal.value = 0;
  enabledAccountTotal.value = 0;
  if (!selectedAgentId.value) {
    accountsLoading.value = false;
    return;
  }
  try {
    const result = await api.get<any, PageResult<AgentPaymentAccount>>("/admin/agent-payment-accounts", { params: accountQueryParams() });
    if (requestId !== accountsRequestId.value || snapshot !== scopeSnapshot()) return;
    if (!validPageResult(result)) throw new Error("支付账户响应格式无效");
    accounts.value = result.items;
    accountTotal.value = Number(result.total || 0);
    enabledAccountTotal.value = Number(result.summary?.enabled || 0);
  } catch (error: any) {
    if (requestId !== accountsRequestId.value || snapshot !== scopeSnapshot()) return;
    accounts.value = [];
    accountTotal.value = 0;
    enabledAccountTotal.value = 0;
    accountsError.value = error.message || "加载支付账户失败";
  } finally {
    if (requestId === accountsRequestId.value) accountsLoading.value = false;
  }
}

async function loadOptions() {
  const requestId = ++optionsRequestId.value;
  const tenantId = filters.tenantId;
  optionsLoading.value = true;
  optionsError.value = "";
  tenants.value = [];
  try {
    const result = await api.get<any, { tenants?: any[] }>("/admin/payment-accounts/options");
    if (requestId !== optionsRequestId.value || tenantId !== filters.tenantId) return;
    if (!result || !Array.isArray(result.tenants)) throw new Error("商家选项响应格式无效");
    tenants.value = result.tenants;
  } catch (error: any) {
    if (requestId !== optionsRequestId.value || tenantId !== filters.tenantId) return;
    tenants.value = [];
    optionsError.value = error.message || "加载商家选项失败";
  } finally {
    if (requestId === optionsRequestId.value) optionsLoading.value = false;
  }
}

async function load() {
  await Promise.allSettled([loadOptions(), loadAgents()]);
  await loadAccounts();
}

async function changeTenant() {
  selectedAgentId.value = null;
  agentPage.value = 1;
  accountPage.value = 1;
  await load();
}

async function applyFilters() {
  selectedAgentId.value = null;
  agentPage.value = 1;
  accountPage.value = 1;
  await load();
}

async function selectAgent(row: Agent | null) {
  if (!row || row.id === selectedAgentId.value) return;
  selectedAgentId.value = row.id;
  accountPage.value = 1;
  await loadAccounts();
}

async function changeAgentPage(page: number) {
  agentPage.value = page;
  selectedAgentId.value = null;
  accountPage.value = 1;
  await loadAgents();
  await loadAccounts();
}

async function changeAccountPage(page: number) {
  accountPage.value = page;
  await loadAccounts();
}

function applyTenantFromRoute() {
  if (!isPlatformAdmin()) return;
  const tenantId = Number(route.query.tenantId || 0);
  filters.tenantId = Number.isFinite(tenantId) && tenantId > 0 ? tenantId : undefined;
}

function openCreateAgent() {
  if (!canEditPaymentAccounts.value) return ElMessage.warning("当前账号只能查看收款方式");
  editingAgentId.value = null;
  agentTarget.value = { id: null, tenantId: filters.tenantId, scope: scopeSnapshot(), generation: agentsRequestId.value };
  Object.assign(agentForm, { name: "", parentAgentId: undefined, region: "", contactName: "", contactPhone: "", enabled: true });
  agentDialog.value = true;
}

function openEditAgent(row: Agent) {
  if (!canEditPaymentAccounts.value) return ElMessage.warning("当前账号只能查看收款方式");
  editingAgentId.value = row.id;
  agentTarget.value = { id: row.id, tenantId: row.tenant?.id || filters.tenantId, scope: scopeSnapshot(), generation: agentsRequestId.value };
  Object.assign(agentForm, {
    name: row.name,
    parentAgentId: row.parentAgent?.id,
    region: row.region || "",
    contactName: row.contactName || "",
    contactPhone: row.contactPhone || "",
    enabled: row.enabled
  });
  agentDialog.value = true;
}

async function submitAgent() {
  if (!canEditPaymentAccounts.value) return ElMessage.warning("当前账号只能查看收款方式");
  if (!agentForm.name.trim()) return ElMessage.warning("请填写代理名称");
  const target = agentTarget.value;
  if (!target || target.id !== editingAgentId.value || target.scope !== scopeSnapshot() || target.generation !== agentsRequestId.value) return ElMessage.error("代理目标或筛选范围已变化，请刷新后重新操作");
  if (target.id && !agents.value.some((row) => row.id === target.id && (row.tenant?.id || filters.tenantId) === target.tenantId)) return ElMessage.error("代理目标已变化，请刷新后重新操作");
  savingAgent.value = true;
  try {
    const payload = {
      name: agentForm.name.trim(),
      tenantId: isPlatformAdmin() ? filters.tenantId : undefined,
      parentAgentId: agentForm.parentAgentId || null,
      region: agentForm.region.trim() || undefined,
      contactName: agentForm.contactName.trim() || undefined,
      contactPhone: canViewSensitive.value ? agentForm.contactPhone.trim() || undefined : undefined,
      enabled: agentForm.enabled
    };
    if (target.scope !== scopeSnapshot() || target.generation !== agentsRequestId.value || target.id !== editingAgentId.value) throw new Error("代理目标或筛选范围已变化，请重新操作");
    const saved = target.id ? await api.patch<any, Agent>(`/admin/agents/${target.id}`, payload) : await api.post<any, Agent>("/admin/agents", payload);
    selectedAgentId.value = saved.id;
    agentDialog.value = false;
    ElMessage.success("代理已保存");
    await loadAgents();
  } catch (error: any) {
    ElMessage.error(error.message || "保存代理失败");
  } finally {
    savingAgent.value = false;
  }
}

function openCreateAccount(agent?: Agent | null) {
  if (!canEditPaymentAccounts.value) return ElMessage.warning("当前账号只能查看收款方式");
  editingAccountId.value = null;
  const provider = "wechat";
  const agentId = agent?.id || selectedAgentId.value || agents.value[0]?.id;
  if (!agentId) return ElMessage.warning("请先选择代理");
  accountTarget.value = { id: null, agentId, provider, tenantId: agent?.tenant?.id || filters.tenantId, scope: scopeSnapshot(), generation: accountsRequestId.value };
  Object.assign(accountForm, {
    agentId,
    provider,
    merchantName: "",
    merchantNo: "",
    enabled: true,
    configText: configTemplate(provider)
  });
  accountDialog.value = true;
}

function openEditAccount(row: AgentPaymentAccount) {
  if (!canEditPaymentAccounts.value) return ElMessage.warning("当前账号只能查看收款方式");
  editingAccountId.value = row.id;
  accountTarget.value = { id: row.id, agentId: row.agent?.id, provider: row.provider, tenantId: row.agent?.tenant?.id || filters.tenantId, scope: scopeSnapshot(), generation: accountsRequestId.value };
  Object.assign(accountForm, {
    agentId: row.agent?.id,
    provider: row.provider,
    merchantName: row.merchantName || "",
    merchantNo: row.merchantNo || "",
    enabled: row.enabled,
    configText: formatConfig(row.config, row.provider)
  });
  accountDialog.value = true;
}

function resetConfigTemplate() {
  accountForm.configText = configTemplate(accountForm.provider);
}

function parseConfig(): { value?: Record<string, unknown>; error?: string } {
  try {
    const parsed = JSON.parse(accountForm.configText || "{}");
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return { error: "支付配置必须是 JSON 对象" };
    return { value: parsed as Record<string, unknown> };
  } catch {
    return { error: "支付配置不是合法 JSON" };
  }
}

function hasConfigValue(config: Record<string, unknown>, key: string) {
  const value = config[key];
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function isMaskedValue(config: Record<string, unknown>, key: string) {
  return String(config[key] ?? "").trim() === "***";
}

function buildReadiness(provider: AgentPaymentAccount["provider"], config?: Record<string, unknown> | null): AccountReadiness {
  const values = config || {};
  const requirements = accountRequirements[provider];
  const paymentMissing = requirements.payment.filter((key) => !hasConfigValue(values, key));
  const transferMissing = requirements.transfer.filter((key) => !hasConfigValue(values, key));
  const maskedKeys = [...requirements.payment, ...requirements.transfer].filter((key) => isMaskedValue(values, key));
  if (!paymentMissing.length && !transferMissing.length && !maskedKeys.length) {
    return { paymentMissing, transferMissing, maskedKeys, status: "ready", label: "资料完整", nextAction: "可进入代理真实收款/打款预发验证。" };
  }
  if (!paymentMissing.length && !transferMissing.length && maskedKeys.length) {
    return { paymentMissing, transferMissing, maskedKeys, status: "partial", label: "脱敏待确认", nextAction: "敏感字段已脱敏展示，编辑保存前确认星号字段未覆盖真实值。" };
  }
  if (!paymentMissing.length && transferMissing.length) {
    return { paymentMissing, transferMissing, maskedKeys, status: "partial", label: "可收款待打款", nextAction: "补齐代理收款人字段后再进入自动打款验证。" };
  }
  return { paymentMissing, transferMissing, maskedKeys, status: "missing", label: "资料缺失", nextAction: "先补齐收款商户字段，避免代理订单无法进入对应账户。" };
}

function accountReadiness(row: AgentPaymentAccount) {
  if (!row.config) {
    const count = Number(row.configuredKeyCount || row.configKeys?.length || 0);
    return count
      ? { paymentMissing: [], transferMissing: [], maskedKeys: row.configKeys || [], status: "partial" as const, label: `已配置 ${count} 项`, nextAction: "当前权限仅显示配置摘要。" }
      : { paymentMissing: [], transferMissing: [], maskedKeys: [], status: "missing" as const, label: "未配置", nextAction: "当前账户尚未保存支付配置。" };
  }
  return buildReadiness(row.provider, row.config || {});
}

function readinessType(status: AccountReadiness["status"]) {
  return status === "ready" ? "success" : status === "partial" ? "warning" : "danger";
}

function readinessDetails(readiness: AccountReadiness) {
  const parts = [];
  if (readiness.paymentMissing.length) parts.push(`收款缺：${readiness.paymentMissing.join("、")}`);
  if (readiness.transferMissing.length) parts.push(`打款缺：${readiness.transferMissing.join("、")}`);
  if (readiness.maskedKeys.length) parts.push(`脱敏：${readiness.maskedKeys.join("、")}`);
  return parts.join("；") || readiness.nextAction;
}

async function submitAccount() {
  if (!canEditPaymentAccounts.value) return ElMessage.warning("当前账号只能查看收款方式");
  if (!accountForm.agentId) return ElMessage.warning("请选择代理");
  const target = accountTarget.value;
  if (!target || target.id !== editingAccountId.value || target.scope !== scopeSnapshot() || target.generation !== accountsRequestId.value) return ElMessage.error("支付账户目标或筛选范围已变化，请刷新后重新操作");
  if (target.id && !accounts.value.some((row) => row.id === target.id && row.agent?.id === target.agentId && row.provider === target.provider)) return ElMessage.error("支付账户目标已变化，请刷新后重新操作");
  if (target.id && (accountForm.agentId !== target.agentId || accountForm.provider !== target.provider)) return ElMessage.error("既有支付账户不能变更代理或渠道");
  const parsed = parseConfig();
  if (parsed.error) return ElMessage.warning(parsed.error);
  savingAccount.value = true;
  try {
    const payload = {
      agentId: accountForm.agentId,
      provider: accountForm.provider,
      merchantName: accountForm.merchantName.trim() || undefined,
      merchantNo: canViewSensitive.value ? accountForm.merchantNo.trim() || undefined : undefined,
      enabled: accountForm.enabled,
      config: parsed.value
    };
    if (target.scope !== scopeSnapshot() || target.generation !== accountsRequestId.value || target.id !== editingAccountId.value) throw new Error("支付账户目标或筛选范围已变化，请重新操作");
    if (target.id) await api.patch(`/admin/agent-payment-accounts/${target.id}`, payload);
    else await api.post("/admin/agent-payment-accounts", payload);
    accountDialog.value = false;
    ElMessage.success("支付账户已保存");
    await loadAccounts();
  } catch (error: any) {
    ElMessage.error(error.message || "保存支付账户失败");
  } finally {
    savingAccount.value = false;
  }
}

watch(() => route.query.tenantId, async () => {
  applyTenantFromRoute();
  selectedAgentId.value = null;
  await load();
});

onMounted(() => {
  applyTenantFromRoute();
  void load();
});
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div>
        <h2>代理收款</h2>
        <p class="page-subtitle">按地区或代理商维护收款账户，代理订单会支付到订单锁定代理的账户。</p>
      </div>
      <div class="toolbar-actions">
        <el-button :icon="Refresh" :loading="loading" :disabled="scopeLocked" @click="load">刷新</el-button>
        <el-button v-if="canEditPaymentAccounts" :icon="Plus" type="primary" :disabled="scopeLocked" @click="openCreateAgent">新建代理</el-button>
        <el-button v-if="canEditPaymentAccounts" :icon="Plus" type="success" :disabled="scopeLocked || !agents.length" @click="openCreateAccount(selectedAgent)">新增支付账户</el-button>
      </div>
    </div>

    <el-alert v-if="paymentAccountReadonlyReason" class="permission-alert" type="warning" show-icon :closable="false" :title="paymentAccountReadonlyReason" />
    <el-alert v-if="!canViewSensitive" class="permission-alert" type="info" show-icon :closable="false" title="联系人电话、商户号和收款人身份字段已脱敏；敏感配置返回时会被脱敏，支付密钥不会通过列表接口返回明文。" />
    <el-alert v-if="optionsError" class="permission-alert" type="error" show-icon :closable="false" title="商家选项加载失败">
      <template #default><p>{{ optionsError }}</p><el-button :loading="optionsLoading" :disabled="operationLocked" @click="loadOptions">重试商家选项</el-button></template>
    </el-alert>
    <el-alert v-if="agentsError" class="permission-alert" type="error" show-icon :closable="false" title="代理列表加载失败">
      <template #default><p>{{ agentsError }}</p><el-button :loading="agentsLoading" :disabled="operationLocked" @click="loadAgents">重试代理列表</el-button></template>
    </el-alert>
    <el-alert v-if="accountsError" class="permission-alert" type="error" show-icon :closable="false" title="支付账户加载失败">
      <template #default><p>{{ accountsError }}</p><el-button :loading="accountsLoading" :disabled="operationLocked" @click="loadAccounts">重试支付账户</el-button></template>
    </el-alert>

    <div class="table-card filter-card">
      <el-form inline @submit.prevent="applyFilters">
        <el-form-item v-if="isPlatformAdmin()" label="商家">
          <el-select v-model="filters.tenantId" clearable filterable :disabled="scopeLocked" placeholder="全部商家" style="width: 220px" @change="changeTenant">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenant.name" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词"><el-input v-model="filters.keyword" clearable :disabled="scopeLocked" maxlength="120" placeholder="代理/地区/联系人/商户号" @keyup.enter="applyFilters" /></el-form-item>
        <el-form-item label="渠道">
          <el-select v-model="filters.provider" clearable :disabled="scopeLocked" placeholder="全部渠道" style="width: 150px">
            <el-option v-for="item in providerOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item><el-checkbox v-model="filters.includeDisabled" :disabled="scopeLocked">包含停用</el-checkbox></el-form-item>
        <el-form-item><el-button type="primary" :loading="loading" :disabled="scopeLocked" @click="applyFilters">查询</el-button></el-form-item>
      </el-form>
    </div>

    <div class="summary-grid">
      <div class="summary-item"><span>代理总数</span><strong>{{ agentTotal }}</strong></div>
      <div class="summary-item"><span>启用代理</span><strong>{{ enabledAgentTotal }}</strong></div>
      <div class="summary-item"><span>当前代理账户</span><strong>{{ accountTotal }}</strong></div>
      <div class="summary-item"><span>启用账户</span><strong>{{ enabledAccountTotal }}</strong></div>
      <div class="summary-item"><span>当前页资料完整账户</span><strong>{{ readyAccountCount }}</strong></div>
    </div>

    <div class="agent-layout">
      <div class="table-card agent-panel">
        <div class="panel-title">代理列表</div>
        <el-table v-loading="agentsLoading" :data="agents" highlight-current-row stripe empty-text="暂无代理" @current-change="selectAgent">
          <el-table-column label="代理" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">
              <button class="link-button" :class="{ active: row.id === selectedAgentId }" :disabled="scopeLocked" @click.stop="selectAgent(row)">{{ row.name }}</button>
            </template>
          </el-table-column>
          <el-table-column v-if="isPlatformAdmin()" label="所属商家" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">{{ tenantDisplayName(row) }}</template>
          </el-table-column>
          <el-table-column prop="region" label="地区" min-width="120" show-overflow-tooltip />
          <el-table-column label="联系人" min-width="170" show-overflow-tooltip><template #default="{ row }">{{ row.contactName || "-" }} {{ displayPhone(row.contactPhone) }}</template></el-table-column>
          <el-table-column label="上级代理" min-width="140" show-overflow-tooltip><template #default="{ row }">{{ row.parentAgent?.name || "-" }}</template></el-table-column>
          <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "启用" : "停用" }}</el-tag></template></el-table-column>
          <el-table-column v-if="canEditPaymentAccounts" label="操作" width="100" fixed="right"><template #default="{ row }"><el-button size="small" :icon="Edit" :disabled="scopeLocked" @click="openEditAgent(row)">编辑</el-button></template></el-table-column>
        </el-table>
        <el-pagination v-if="agentTotal > agentPageSize" class="pagination" background layout="prev, pager, next" :disabled="scopeLocked" :current-page="agentPage" :page-size="agentPageSize" :total="agentTotal" @current-change="changeAgentPage" />
      </div>

      <div class="table-card account-panel">
        <div class="panel-header">
          <div>
            <div class="panel-title">{{ selectedAgent?.name || "全部代理" }}的支付账户</div>
            <small>{{ selectedAgent?.region || "未限定地区" }}</small>
          </div>
          <el-button v-if="canEditPaymentAccounts" :icon="Plus" type="primary" :disabled="scopeLocked || !selectedAgent" @click="openCreateAccount(selectedAgent)">新增账户</el-button>
        </div>
        <el-table v-loading="accountsLoading" :data="selectedAccounts" stripe empty-text="暂无支付账户">
          <el-table-column label="渠道" width="110"><template #default="{ row }">{{ providerLabel(row.provider) }}</template></el-table-column>
          <el-table-column label="代理" min-width="160" show-overflow-tooltip><template #default="{ row }">{{ row.agent?.name || "-" }}</template></el-table-column>
          <el-table-column v-if="isPlatformAdmin()" label="所属商家" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">{{ tenantDisplayName(row) }}</template>
          </el-table-column>
          <el-table-column prop="merchantName" label="商户名称" min-width="180" show-overflow-tooltip />
          <el-table-column prop="merchantNo" label="商户号" min-width="150" show-overflow-tooltip />
          <el-table-column label="就绪度" min-width="180">
            <template #default="{ row }">
              <el-tooltip :content="readinessDetails(accountReadiness(row))" placement="top">
                <el-tag :type="readinessType(accountReadiness(row).status)">{{ accountReadiness(row).label }}</el-tag>
              </el-tooltip>
            </template>
          </el-table-column>
          <el-table-column label="配置字段" min-width="220" show-overflow-tooltip><template #default="{ row }">{{ (row.configKeys || Object.keys(row.config || {})).join("、") || "-" }}</template></el-table-column>
          <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "启用" : "停用" }}</el-tag></template></el-table-column>
          <el-table-column v-if="canEditPaymentAccounts" label="操作" width="100" fixed="right"><template #default="{ row }"><el-button size="small" :icon="Edit" :disabled="scopeLocked" @click="openEditAccount(row)">编辑</el-button></template></el-table-column>
        </el-table>
        <el-pagination v-if="accountTotal > accountPageSize" class="pagination" background layout="prev, pager, next" :disabled="scopeLocked" :current-page="accountPage" :page-size="accountPageSize" :total="accountTotal" @current-change="changeAccountPage" />
      </div>
    </div>

    <el-dialog v-model="agentDialog" width="min(560px, 100vw)" :title="editingAgentId ? '编辑代理' : '新建代理'" :close-on-click-modal="false" :close-on-press-escape="!savingAgent" :show-close="!savingAgent" destroy-on-close>
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="代理名称" required><el-input v-model="agentForm.name" maxlength="120" /></el-form-item>
          <el-form-item label="上级代理">
            <el-select v-model="agentForm.parentAgentId" clearable filterable style="width: 100%" placeholder="无上级">
              <el-option v-for="item in agents.filter((agent) => agent.id !== editingAgentId)" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="地区"><el-input v-model="agentForm.region" maxlength="80" placeholder="例如：华东一区" /></el-form-item>
          <el-form-item label="联系人"><el-input v-model="agentForm.contactName" maxlength="100" /></el-form-item>
          <el-form-item v-if="canViewSensitive" label="联系电话"><el-input v-model="agentForm.contactPhone" maxlength="40" /></el-form-item>
          <el-form-item><el-checkbox v-model="agentForm.enabled">启用代理</el-checkbox></el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button :disabled="savingAgent" @click="agentDialog = false">取消</el-button>
        <el-button v-if="canEditPaymentAccounts" type="primary" :loading="savingAgent" @click="submitAgent">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="accountDialog" width="min(760px, 100vw)" :title="editingAccountId ? '编辑支付账户' : '新增支付账户'" :close-on-click-modal="false" :close-on-press-escape="!savingAccount" :show-close="!savingAccount" destroy-on-close>
      <el-alert v-if="editingAccountId" class="account-alert" type="info" show-icon :closable="false" title="星号字段保存时会自动保留原值；仅需填写本次要新增或替换的配置。" />
      <el-alert class="account-alert" :type="readinessType(accountFormReadiness.status)" show-icon :closable="false" :title="accountFormReadiness.label" :description="readinessDetails(accountFormReadiness)" />
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="代理" required>
            <el-select v-model="accountForm.agentId" filterable :disabled="Boolean(editingAccountId) || savingAccount" style="width: 100%">
              <el-option v-for="item in agents" :key="item.id" :label="item.name" :value="item.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="支付渠道" required>
            <el-select v-model="accountForm.provider" :disabled="Boolean(editingAccountId) || savingAccount" style="width: 100%" @change="resetConfigTemplate">
              <el-option v-for="item in providerOptions" :key="item.value" :label="item.label" :value="item.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="商户名称"><el-input v-model="accountForm.merchantName" maxlength="120" /></el-form-item>
          <el-form-item v-if="canViewSensitive" label="商户号"><el-input v-model="accountForm.merchantNo" maxlength="128" /></el-form-item>
          <el-form-item class="full" label="支付配置 JSON" required>
            <el-input v-model="accountForm.configText" type="textarea" :rows="12" spellcheck="false" />
          </el-form-item>
          <el-form-item><el-checkbox v-model="accountForm.enabled">启用支付账户</el-checkbox></el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button :disabled="savingAccount" @click="accountDialog = false">取消</el-button>
        <el-button v-if="canEditPaymentAccounts" :disabled="savingAccount" @click="resetConfigTemplate">套用字段模板</el-button>
        <el-button v-if="canEditPaymentAccounts" type="primary" :loading="savingAccount" @click="submitAccount">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; }
.page-subtitle { margin: 6px 0 0; color: #6b7280; }
.permission-alert { margin-bottom: 16px; }
.filter-card { margin-bottom: 16px; padding-bottom: 0; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.summary-item { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; }
.summary-item span { color: #6b7280; }
.summary-item strong { font-size: 24px; }
.agent-layout { display: grid; grid-template-columns: minmax(360px, 0.9fr) minmax(520px, 1.4fr); gap: 16px; align-items: start; }
.panel-title { font-size: 16px; font-weight: 700; }
.panel-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.panel-header small { color: #6b7280; }
.agent-panel .panel-title { margin-bottom: 12px; }
.agent-panel, .account-panel { min-width: 0; }
.pagination { margin-top: 14px; justify-content: flex-end; }
.link-button { appearance: none; border: 0; background: transparent; padding: 0; color: #2563eb; font: inherit; cursor: pointer; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.link-button.active { color: #111827; font-weight: 700; }
.account-alert { margin-bottom: 14px; }
@media (max-width: 1100px) {
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .agent-layout { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  .summary-grid { grid-template-columns: 1fr; }
  .toolbar { align-items: flex-start; flex-direction: column; }
  .toolbar-actions { justify-content: flex-start; }
  .filter-card :deep(.el-form) { display: grid; grid-template-columns: 1fr; }
  .filter-card :deep(.el-form-item), .filter-card :deep(.el-select), .filter-card :deep(.el-input) { width: 100% !important; margin-right: 0; }
  .pagination { justify-content: center; overflow-x: auto; }
}
</style>
