<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { Check, Close, Download, Plus, Refresh, Search, UploadFilled, Wallet } from "@element-plus/icons-vue";
import { api, downloadFile } from "../api";
import { canAccess, isPlatformAdmin } from "../permissions";

type TenantOption = { id: number; code: string; name: string; enabled: boolean };
type Agent = { id: number; name: string; region?: string | null; enabled?: boolean; tenant?: TenantOption | null };
type AgentSettlement = {
  id: number;
  settlementNo: string;
  agent?: Agent;
  periodStart: string;
  periodEnd: string;
  transactionCount: number;
  refundCount: number;
  grossAmount: string;
  refundAmount: string;
  netAmount: string;
  commissionRate: string;
  commissionAmount: string;
  payableAmount: string;
  status: string;
  reviewRemark?: string | null;
  paidReference?: string | null;
  paidProofUrl?: string | null;
  paidRemark?: string | null;
  sensitiveMasked?: boolean;
  createdAt: string;
};

type PageResult<T> = { items: T[]; total: number; page: number; pageSize: number; summary?: { total: number; pending: number; paid: number; payableAmount: string } };
type SettlementOptions = { tenants: TenantOption[]; agents: Agent[]; statuses: Array<{ value: string; label: string }> };

type SettlementDetails = {
  settlement: AgentSettlement;
  snapshot: Record<string, any>;
  current: Record<string, any>;
  differences: Array<{ field: string; label: string; snapshot: any; current: any; blocking: boolean }>;
  risks: Array<{ type: string; level: "info" | "warning" | "danger"; message: string; blocking: boolean }>;
  transactions: any[];
  refunds: any[];
  transfers: any[];
  auditLogs: any[];
  snapshotTransactionIds: number[];
  snapshotRefundIds: number[];
  canMarkPaid: boolean;
};

type TransferCapability = {
  status: "manual_only" | "not_ready" | "sandbox_ready" | "real_ready";
  generatedAt: string;
  realPaymentEnabled: boolean;
  summary: {
    enabledAgentCount: number;
    paymentAccountCount: number;
    assessedAccountCount: number;
    missingAgentCount: number;
    manualOnly: number;
    notReady: number;
    sandboxReady: number;
    realReady: number;
  };
  accounts: Array<{
    accountId: number;
    agent: { id: number; name: string; region?: string | null; enabled: boolean } | null;
    provider: string;
    providerLabel: string;
    merchantName?: string | null;
    merchantNo?: string | null;
    enabled: boolean;
    status: TransferCapability["status"];
    missingRuntimeKeys: string[];
    missingAccountKeys: string[];
    message: string;
    nextAction: string;
    transferDraftSupported: boolean;
    realTransferImplemented: boolean;
    requestTransferImplemented: boolean;
    queryTransferImplemented: boolean;
  }>;
  missingAgents: Array<{ id: number; name: string; region?: string | null }>;
  nextActions: string[];
  realTransferImplemented: boolean;
};

type SandboxTransferResult = {
  markedPaid: boolean;
  transfer: {
    provider: string;
    status: "success" | "failed";
    transferNo: string;
    providerTransferNo?: string | null;
    failureReason?: string | null;
    amount: string;
  };
};

const statusOptions = [
  { label: "全部状态", value: "" },
  { label: "草稿", value: "draft" },
  { label: "待审核", value: "pending_review" },
  { label: "已通过", value: "approved" },
  { label: "已打款", value: "paid" },
  { label: "已拒绝", value: "rejected" }
];
const statusText: Record<string, string> = { draft: "草稿", pending_review: "待审核", approved: "已通过", paid: "已打款", rejected: "已拒绝", cancelled: "已取消" };
const statusType: Record<string, string> = { draft: "info", pending_review: "warning", approved: "success", paid: "success", rejected: "danger", cancelled: "info" };

const rows = ref<AgentSettlement[]>([]);
const agents = ref<Agent[]>([]);
const tenants = ref<TenantOption[]>([]);
const loading = ref(false);
const errorMessage = ref("");
const agentsErrorMessage = ref("");
const exporting = ref(false);
const generating = ref(false);
const actionId = ref<number | null>(null);
const dialogVisible = ref(false);
const detailVisible = ref(false);
const detailLoading = ref(false);
const detailError = ref("");
const detailTargetId = ref<number | null>(null);
const details = ref<SettlementDetails | null>(null);
const transferCapability = ref<TransferCapability | null>(null);
const transferLoading = ref(false);
const transferErrorMessage = ref("");
const paidDialogVisible = ref(false);
const paidTarget = ref<AgentSettlement | null>(null);
const filters = reactive({ tenantId: undefined as number | undefined, agentId: undefined as number | undefined, keyword: "", status: "" });
const form = reactive({ agentId: undefined as number | undefined, periodStart: "", periodEnd: "", commissionRate: undefined as number | undefined, remark: "" });
const paidForm = reactive({ paidReference: "", paidProofUrl: "", remark: "" });
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const serverSummary = ref({ total: 0, pending: 0, paid: 0, payableAmount: "0.00" });
const optionsRequestId = ref(0);
const listRequestId = ref(0);
const capabilityRequestId = ref(0);
const detailRequestId = ref(0);
const generateTarget = ref<{ agentId: number; scope: string; generation: number } | null>(null);
const paidTargetContext = ref<{ id: number; status: string; scope: string; generation: number } | null>(null);

const canManage = computed(() => canAccess(["agent_settlement.manage"]));
const canPay = computed(() => canAccess(["agent_settlement.pay"]));
const canTransfer = computed(() => canAccess(["agent_settlement.transfer"]));
const canViewSensitive = computed(() => canAccess(["agent_settlement.sensitive"]));
const canExport = computed(() => canAccess(["agent_settlement.export"]));
const canUploadProof = computed(() => canPay.value && canAccess(["upload.settlement_proof"]));
const hasWriteActions = computed(() => canManage.value || canPay.value || canTransfer.value);
const operationLocked = computed(() => dialogVisible.value || paidDialogVisible.value || detailVisible.value || generating.value || actionId.value !== null || exporting.value || transferLoading.value);
const scopeLocked = computed(() => operationLocked.value || loading.value);

const totals = computed(() => ({ payable: Number(serverSummary.value.payableAmount || 0), pending: serverSummary.value.pending, paid: serverSummary.value.paid }));

function scopeSnapshot() {
  return JSON.stringify({ tenantId: filters.tenantId || null, agentId: filters.agentId || null, keyword: filters.keyword.trim(), status: filters.status, page: page.value, pageSize: pageSize.value });
}

function currentRow(id: number, status?: string) {
  return rows.value.find((row) => row.id === id && (!status || row.status === status)) || null;
}

async function loadOptions() {
  const requestId = ++optionsRequestId.value;
  const tenantId = filters.tenantId;
  agentsErrorMessage.value = "";
  agents.value = [];
  tenants.value = [];
  try {
    const result = await api.get<any, SettlementOptions>("/admin/agent-settlements/options");
    if (requestId !== optionsRequestId.value || tenantId !== filters.tenantId) return;
    if (!result || !Array.isArray(result.agents) || !Array.isArray(result.tenants)) throw new Error("结算选项响应格式无效");
    agents.value = result.agents;
    tenants.value = result.tenants;
  } catch (error: any) {
    if (requestId !== optionsRequestId.value || tenantId !== filters.tenantId) return;
    agents.value = [];
    tenants.value = [];
    agentsErrorMessage.value = error.message || "结算选项加载失败";
    ElMessage.error(agentsErrorMessage.value);
  }
}

async function load() {
  const requestId = ++listRequestId.value;
  const snapshot = scopeSnapshot();
  loading.value = true;
  errorMessage.value = "";
  rows.value = [];
  total.value = 0;
  serverSummary.value = { total: 0, pending: 0, paid: 0, payableAmount: "0.00" };
  try {
    const result = await api.get<any, PageResult<AgentSettlement>>("/admin/agent-settlements", { params: { tenantId: filters.tenantId || undefined, agentId: filters.agentId || undefined, keyword: filters.keyword.trim() || undefined, status: filters.status || undefined, page: page.value, pageSize: pageSize.value } });
    if (requestId !== listRequestId.value || snapshot !== scopeSnapshot()) return;
    if (!result || !Array.isArray(result.items) || !Number.isFinite(Number(result.total))) throw new Error("代理结算列表响应格式无效");
    rows.value = result.items;
    total.value = Number(result.total || 0);
    serverSummary.value = result.summary || { total: total.value, pending: 0, paid: 0, payableAmount: "0.00" };
  } catch (error: any) {
    if (requestId !== listRequestId.value || snapshot !== scopeSnapshot()) return;
    rows.value = [];
    total.value = 0;
    serverSummary.value = { total: 0, pending: 0, paid: 0, payableAmount: "0.00" };
    errorMessage.value = error.message || "加载代理结算失败";
    ElMessage.error(errorMessage.value);
  } finally {
    if (requestId === listRequestId.value) loading.value = false;
  }
}

async function loadTransferCapability() {
  if (transferLoading.value) return;
  const requestId = ++capabilityRequestId.value;
  transferLoading.value = true;
  transferErrorMessage.value = "";
  transferCapability.value = null;
  try {
    const result = await api.get<any, TransferCapability>("/admin/agent-settlements/transfer-capability");
    if (requestId !== capabilityRequestId.value) return;
    if (!result || !result.summary || !Array.isArray(result.accounts)) throw new Error("自动打款能力响应格式无效");
    transferCapability.value = result;
  } catch (error: any) {
    if (requestId !== capabilityRequestId.value) return;
    transferCapability.value = null;
    transferErrorMessage.value = error.message || "加载自动打款能力评估失败";
    ElMessage.error(transferErrorMessage.value);
  } finally {
    if (requestId === capabilityRequestId.value) transferLoading.value = false;
  }
}

async function scanTransfers() {
  if (!canTransfer.value) return ElMessage.warning("当前账号无回执扫描权限");
  if (transferLoading.value) return;
  const scope = scopeSnapshot();
  const generation = listRequestId.value;
  transferLoading.value = true;
  try {
    if (scope !== scopeSnapshot() || generation !== listRequestId.value) throw new Error("结算筛选范围已变化，请重新操作");
    const result = await api.post<any, { checkedCount: number }>("/admin/agent-settlement-transfers/scan", {});
    ElMessage.success(`已扫描 ${result.checkedCount || 0} 条打款回执`);
    await load();
    if (details.value) {
      const id = details.value.settlement.id;
      details.value = await api.get<any, SettlementDetails>(`/admin/agent-settlements/${id}/details`);
    }
  } catch (error: any) {
    ElMessage.error(error.message || "扫描打款回执失败");
  } finally {
    transferLoading.value = false;
  }
}


function openGenerate() {
  if (!canManage.value) return ElMessage.warning("当前账号无生成结算权限");
  const now = new Date();
  Object.assign(form, {
    agentId: filters.agentId || agents.value[0]?.id,
    periodStart: toInputDateTime(new Date(now.getFullYear(), now.getMonth(), 1)),
    periodEnd: toInputDateTime(new Date(now.getFullYear(), now.getMonth() + 1, 1)),
    commissionRate: undefined,
    remark: ""
  });
  if (!form.agentId) return ElMessage.warning("当前范围暂无可结算代理");
  generateTarget.value = { agentId: form.agentId, scope: scopeSnapshot(), generation: listRequestId.value };
  dialogVisible.value = true;
}

async function generateSettlement() {
  if (!canManage.value) return ElMessage.warning("当前账号无生成结算权限");
  if (generating.value) return;
  if (!form.agentId) return ElMessage.warning("请选择代理");
  if (!form.periodStart || !form.periodEnd) return ElMessage.warning("请选择结算周期");
  const target = generateTarget.value;
  if (!target || target.scope !== scopeSnapshot() || target.generation !== listRequestId.value || target.agentId !== form.agentId || !filteredAgents.value.some((agent) => agent.id === target.agentId)) return ElMessage.error("代理或筛选范围已变化，请刷新后重新操作");
  generating.value = true;
  try {
    if (target.scope !== scopeSnapshot() || target.generation !== listRequestId.value || target.agentId !== form.agentId) throw new Error("代理或筛选范围已变化，请重新操作");
    await api.post("/admin/agent-settlements/generate", { agentId: form.agentId, periodStart: form.periodStart, periodEnd: form.periodEnd, commissionRate: form.commissionRate, remark: form.remark.trim() || undefined });
    dialogVisible.value = false;
    ElMessage.success("结算草稿已生成");
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "生成结算失败");
  } finally {
    generating.value = false;
  }
}

async function submitSettlement(row: AgentSettlement) {
  if (!canManage.value) return ElMessage.warning("当前账号无结算审核权限");
  await runAction(row, "draft", async (target) => {
    await ElMessageBox.confirm(`提交结算单 ${target.settlementNo} 审核？`, "提交审核", { type: "info", confirmButtonText: "提交", cancelButtonText: "取消" });
    await api.post(`/admin/agent-settlements/${target.id}/submit`, {});
  }, "已提交审核");
}

function applyFilters() {
  page.value = 1;
  void load();
}

function changePage(value: number) {
  page.value = value;
  void load();
}

function changeTenant() {
  filters.agentId = undefined;
  applyFilters();
}

const filteredAgents = computed(() => filters.tenantId ? agents.value.filter((agent) => agent.tenant?.id === filters.tenantId) : agents.value);

async function approveSettlement(row: AgentSettlement) {
  if (!canManage.value) return ElMessage.warning("当前账号无结算审核权限");
  await runAction(row, "pending_review", async (target) => {
    const { value } = await ElMessageBox.prompt(`通过结算单 ${target.settlementNo}？应打款 ￥${money(target.payableAmount)}`, "审核通过", { inputValue: "结算金额已核对", confirmButtonText: "通过", cancelButtonText: "取消", type: "warning", inputValidator: (text) => Boolean(String(text || "").trim()) || "请填写审核意见" });
    await api.post(`/admin/agent-settlements/${target.id}/approve`, { remark: String(value || "").trim() });
  }, "结算单已通过");
}

async function rejectSettlement(row: AgentSettlement) {
  if (!canManage.value) return ElMessage.warning("当前账号无结算审核权限");
  await runAction(row, "pending_review", async (target) => {
    const { value } = await ElMessageBox.prompt(`拒绝结算单 ${target.settlementNo}？`, "拒绝结算", { inputValue: "结算数据需重新核对", confirmButtonText: "拒绝", cancelButtonText: "取消", inputValidator: (text) => Boolean(String(text || "").trim()) || "请填写拒绝原因" });
    await api.post(`/admin/agent-settlements/${target.id}/reject`, { remark: String(value || "").trim() });
  }, "结算单已拒绝");
}

async function markPaid(row: AgentSettlement) {
  if (!canPay.value) return ElMessage.warning("当前账号无打款登记权限");
  paidTarget.value = row;
  paidTargetContext.value = { id: row.id, status: row.status, scope: scopeSnapshot(), generation: listRequestId.value };
  Object.assign(paidForm, { paidReference: row.paidReference || "", paidProofUrl: row.paidProofUrl || "", remark: row.paidRemark || "线下打款已完成" });
  paidDialogVisible.value = true;
}

async function submitPaid() {
  if (!canPay.value) return ElMessage.warning("当前账号无打款登记权限");
  if (!paidTarget.value) return;
  if (!paidForm.paidReference.trim() && !paidForm.paidProofUrl.trim()) return ElMessage.warning("请填写转账流水号或上传打款凭证");
  const row = paidTarget.value;
  const target = paidTargetContext.value;
  if (!target || target.id !== row.id || target.status !== "approved" || target.scope !== scopeSnapshot() || target.generation !== listRequestId.value || !currentRow(target.id, target.status)) return ElMessage.error("结算单或筛选范围已变化，请刷新后重新操作");
  const succeeded = await runAction(
    row,
    "approved",
    (current) => api.post(`/admin/agent-settlements/${current.id}/mark-paid`, { paidReference: paidForm.paidReference.trim() || undefined, paidProofUrl: paidForm.paidProofUrl.trim() || undefined, remark: paidForm.remark.trim() || undefined }),
    "已标记打款"
  );
  if (succeeded) {
    paidDialogVisible.value = false;
    paidTarget.value = null;
  }
}

async function sandboxTransfer(row: AgentSettlement, simulateStatus: "success" | "failed" = "success") {
  if (!canTransfer.value) return ElMessage.warning("当前账号无自动转账权限");
  const title = simulateStatus === "failed" ? "模拟沙箱打款失败" : "沙箱自动打款";
  const message = simulateStatus === "failed" ? `模拟结算单 ${row.settlementNo} 打款失败？结算单会保持已审核状态。` : `对结算单 ${row.settlementNo} 发起沙箱自动打款？成功后会标记为已打款。`;
  const succeeded = await runAction(
    row,
    "approved",
    async (target) => {
      await ElMessageBox.confirm(message, title, { type: simulateStatus === "failed" ? "warning" : "info", confirmButtonText: "确认", cancelButtonText: "取消" });
      await api.post<any, SandboxTransferResult>(`/admin/agent-settlements/${row.id}/sandbox-transfer`, { simulateStatus, failureReason: simulateStatus === "failed" ? "财务沙箱演练：模拟余额不足或收款账户异常" : undefined });
    },
    simulateStatus === "failed" ? "沙箱失败回执已记录" : "沙箱打款成功，已标记打款"
  );
  if (succeeded) await loadTransferCapability();
}

async function openDetails(row: AgentSettlement) {
  const requestId = ++detailRequestId.value;
  const scope = scopeSnapshot();
  detailTargetId.value = row.id;
  detailVisible.value = true;
  detailLoading.value = true;
  detailError.value = "";
  details.value = null;
  try {
    const result = await api.get<any, SettlementDetails>(`/admin/agent-settlements/${row.id}/details`);
    if (requestId !== detailRequestId.value || detailTargetId.value !== row.id || scope !== scopeSnapshot()) return;
    details.value = result;
  } catch (error: any) {
    if (requestId !== detailRequestId.value || detailTargetId.value !== row.id || scope !== scopeSnapshot()) return;
    detailError.value = error.message || "加载结算核对失败";
    ElMessage.error(detailError.value);
  } finally {
    if (requestId === detailRequestId.value) detailLoading.value = false;
  }
}

async function runAction(row: AgentSettlement, expectedStatus: string, action: (target: AgentSettlement) => Promise<unknown>, message: string) {
  if (actionId.value !== null) return false;
  const scope = scopeSnapshot();
  const generation = listRequestId.value;
  const target = currentRow(row.id, expectedStatus);
  if (!target) return ElMessage.error("结算单状态已变化，请刷新后重新操作"), false;
  actionId.value = row.id;
  try {
    await action(target);
    if (scope !== scopeSnapshot() || generation !== listRequestId.value || !currentRow(row.id, expectedStatus)) throw new Error("结算单或筛选范围已变化，请重新操作");
    ElMessage.success(message);
    await load();
    return true;
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "操作失败");
    return false;
  } finally {
    actionId.value = null;
  }
}

async function exportRows() {
  if (!canExport.value) return ElMessage.warning("当前账号无结算导出权限");
  if (exporting.value) return;
  const scope = scopeSnapshot();
  const params = new URLSearchParams();
  if (filters.tenantId) params.set("tenantId", String(filters.tenantId));
  if (filters.agentId) params.set("agentId", String(filters.agentId));
  if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
  if (filters.status) params.set("status", filters.status);
  const query = params.toString();
  exporting.value = true;
  try {
    if (scope !== scopeSnapshot()) throw new Error("结算筛选范围已变化，请重新导出");
    await downloadFile(`/admin/agent-settlements/export${query ? `?${query}` : ""}`, "代理结算.xlsx");
    ElMessage.success("代理结算已导出");
  } catch (error: any) {
    ElMessage.error(error.message || "代理结算导出失败");
  } finally {
    exporting.value = false;
  }
}

function uploadHeaders() {
  const token = localStorage.getItem("admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function beforeProofUpload(file: File) {
  if (!canUploadProof.value) {
    ElMessage.error("当前账号无结算凭证上传权限");
    return false;
  }
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
  if (!allowed.includes(file.type)) {
    ElMessage.error("仅支持图片或 PDF 凭证");
    return false;
  }
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error("凭证文件不能超过 10MB");
    return false;
  }
  return true;
}

function handleProofSuccess(response: any) {
  paidForm.paidProofUrl = response?.data?.url || response?.url || "";
  if (!paidForm.paidReference && response?.data?.originalName) paidForm.paidReference = response.data.originalName;
  ElMessage.success("凭证已上传");
}

function handleProofError(error: any) {
  ElMessage.error(error?.message || "凭证上传失败");
}

async function openProof(value?: string | null) {
  if (!value) return;
  if (!canViewSensitive.value) return ElMessage.warning("当前账号无结算敏感资料权限");
  const privateMatch = value.match(/^\/api\/admin\/private-settlement-proofs\/([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\/download$/);
  if (privateMatch) {
    try {
      await downloadFile(`/admin/private-settlement-proofs/${privateMatch[1]}/download`, paidForm.paidReference.trim() || "打款凭证");
    } catch (error: any) {
      ElMessage.error(error?.message || "打款凭证下载失败");
    }
    return;
  }
  try {
    const url = new URL(value, window.location.origin);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("unsupported protocol");
    window.open(url.href, "_blank", "noopener,noreferrer");
  } catch {
    ElMessage.error("打款凭证地址无效，无法打开");
  }
}

async function retryDetails() {
  if (detailTargetId.value === null) return;
  await openDetails({ id: detailTargetId.value } as AgentSettlement);
}

function toInputDateTime(value: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())} ${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function formatTime(value?: string) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

function money(value?: string | number) {
  return Number(value || 0).toFixed(2);
}

function detailTagType(value: boolean) {
  return value ? "danger" : "warning";
}

function capabilityText(status?: string) {
  return ({ manual_only: "手动登记", not_ready: "未就绪", sandbox_ready: "可沙箱验证", real_ready: "可真实打款" } as Record<string, string>)[status || ""] || "-";
}

function capabilityType(status?: string) {
  return ({ manual_only: "info", not_ready: "danger", sandbox_ready: "warning", real_ready: "success" } as Record<string, string>)[status || ""] || "info";
}

function transferStatusText(status?: string) {
  return ({ pending: "待处理", processing: "处理中", success: "成功", failed: "失败" } as Record<string, string>)[status || ""] || status || "-";
}

function transferStatusType(status?: string) {
  return ({ pending: "info", processing: "warning", success: "success", failed: "danger" } as Record<string, string>)[status || ""] || "info";
}

function capabilityFlagText(value?: boolean) {
  return value ? "已实现" : "未接入";
}

function capabilityFlagType(value?: boolean) {
  return value ? "success" : "info";
}

function isSnapshotTransaction(id: number) {
  return Boolean(details.value?.snapshotTransactionIds?.includes(id));
}

function isSnapshotRefund(id: number) {
  return Boolean(details.value?.snapshotRefundIds?.includes(id));
}

onMounted(async () => {
  await Promise.all([loadOptions(), loadTransferCapability()]);
  await load();
});
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div>
        <h2>代理结算</h2>
        <p class="page-subtitle">按代理和周期生成结算单，审核通过后再进行线下打款登记。</p>
      </div>
      <div class="toolbar-actions">
        <el-button :icon="Refresh" :loading="loading" :disabled="scopeLocked" @click="load">刷新</el-button>
        <el-button :icon="Wallet" :loading="transferLoading" :disabled="operationLocked" @click="loadTransferCapability">评估自动打款</el-button>
        <el-button v-if="canTransfer" :icon="Search" :loading="transferLoading" :disabled="operationLocked" @click="scanTransfers">扫描回执</el-button>
        <el-button v-if="canExport" :icon="Download" :loading="exporting" :disabled="operationLocked" @click="exportRows">导出 Excel</el-button>
        <el-button v-if="canManage" type="primary" :icon="Plus" :disabled="scopeLocked || !agents.length" @click="openGenerate">生成结算</el-button>
      </div>
    </div>

    <el-alert v-if="!canViewSensitive" class="permission-alert" type="info" show-icon :closable="false" title="打款流水号、凭证附件、失败原因和收款标识已脱敏；需要结算敏感权限才可查看完整资料。" />
    <el-alert v-if="agentsErrorMessage" type="error" show-icon :closable="false" :title="agentsErrorMessage"><template #default><el-button size="small" :disabled="operationLocked" @click="loadOptions">重试结算选项</el-button></template></el-alert>
    <el-alert v-if="errorMessage" type="error" show-icon :closable="false" :title="errorMessage"><template #default><el-button size="small" :loading="loading" :disabled="operationLocked" @click="load">重试结算列表</el-button></template></el-alert>

    <div class="summary-grid">
      <div class="summary-item"><span>结算单</span><strong>{{ serverSummary.total }}</strong></div>
      <div class="summary-item"><span>待审核</span><strong>{{ totals.pending }}</strong></div>
      <div class="summary-item"><span>已打款</span><strong>{{ totals.paid }}</strong></div>
      <div class="summary-item"><span>应打款</span><strong>￥{{ money(totals.payable) }}</strong></div>
    </div>

    <div class="table-card capability-card" v-loading="transferLoading">
      <div class="capability-head">
        <div>
          <h3>自动打款能力评估</h3>
          <p>当前真实转账尚未开启执行，仅用于核对支付机构产品、商户参数和代理收款资料。</p>
        </div>
        <el-tag v-if="transferCapability" size="large" :type="capabilityType(transferCapability.status)">
          {{ capabilityText(transferCapability.status) }}
        </el-tag>
      </div>
      <el-alert v-if="transferErrorMessage" type="error" show-icon :closable="false" :title="transferErrorMessage"><template #default><el-button size="small" :disabled="operationLocked" @click="loadTransferCapability">重试评估</el-button></template></el-alert>
      <template v-if="transferCapability">
        <div class="capability-metrics">
          <div><span>启用代理</span><strong>{{ transferCapability.summary.enabledAgentCount }}</strong></div>
          <div><span>支付账户</span><strong>{{ transferCapability.summary.paymentAccountCount }}</strong></div>
          <div><span>可沙箱验证</span><strong>{{ transferCapability.summary.sandboxReady }}</strong></div>
          <div><span>真实就绪</span><strong>{{ transferCapability.summary.realReady }}</strong></div>
          <div><span>缺账户代理</span><strong>{{ transferCapability.summary.missingAgentCount }}</strong></div>
        </div>
        <div class="capability-notes">
          <el-alert v-for="item in transferCapability.nextActions" :key="item" type="warning" :closable="false" show-icon :title="item" />
          <el-alert v-if="!transferCapability.realTransferImplemented" type="info" :closable="false" show-icon title="真实自动打款 SDK 未接入，当前仍以审核后的线下打款登记为准。" />
        </div>
        <el-table class="capability-table" :data="transferCapability.accounts" size="small" stripe empty-text="暂无可评估的代理支付账户">
          <el-table-column label="代理" min-width="150"><template #default="{ row }">{{ row.agent?.name || "-" }}</template></el-table-column>
          <el-table-column prop="providerLabel" label="渠道" width="130" />
          <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="capabilityType(row.status)">{{ capabilityText(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="草稿" width="90"><template #default="{ row }"><el-tag :type="capabilityFlagType(row.transferDraftSupported)">{{ capabilityFlagText(row.transferDraftSupported) }}</el-tag></template></el-table-column>
          <el-table-column label="真实请求" width="100"><template #default="{ row }"><el-tag :type="capabilityFlagType(row.requestTransferImplemented)">{{ capabilityFlagText(row.requestTransferImplemented) }}</el-tag></template></el-table-column>
          <el-table-column label="回执查询" width="100"><template #default="{ row }"><el-tag :type="capabilityFlagType(row.queryTransferImplemented)">{{ capabilityFlagText(row.queryTransferImplemented) }}</el-tag></template></el-table-column>
          <el-table-column label="缺系统参数" min-width="190" show-overflow-tooltip><template #default="{ row }">{{ row.missingRuntimeKeys.join(", ") || "-" }}</template></el-table-column>
          <el-table-column label="缺代理资料" min-width="170" show-overflow-tooltip><template #default="{ row }">{{ row.missingAccountKeys.join(", ") || "-" }}</template></el-table-column>
          <el-table-column prop="nextAction" label="下一步" min-width="260" show-overflow-tooltip />
        </el-table>
        <div v-if="transferCapability.missingAgents.length" class="missing-agents">
          缺少可用支付账户的代理：{{ transferCapability.missingAgents.map((item) => item.name).join("、") }}
        </div>
      </template>
      <el-empty v-else description="暂无评估结果" />
    </div>

    <div class="table-card filter-card">
      <el-form inline @submit.prevent="applyFilters">
        <el-form-item v-if="isPlatformAdmin()" label="商家">
          <el-select v-model="filters.tenantId" clearable filterable :disabled="scopeLocked" placeholder="全部商家" style="width: 220px" @change="changeTenant">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenant.name" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="代理">
          <el-select v-model="filters.agentId" clearable filterable :disabled="scopeLocked" placeholder="全部代理" style="width: 220px" @change="applyFilters">
            <el-option v-for="agent in filteredAgents" :key="agent.id" :label="agent.name" :value="agent.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词"><el-input v-model="filters.keyword" clearable :disabled="scopeLocked" maxlength="120" placeholder="结算单号/代理/地区/凭证号" @keyup.enter="applyFilters" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" :disabled="scopeLocked" style="width: 150px" @change="applyFilters">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item><el-button type="primary" :loading="loading" :disabled="scopeLocked" @click="applyFilters">查询</el-button></el-form-item>
      </el-form>
    </div>

    <div class="table-card">
      <el-table v-loading="loading" :data="rows" stripe empty-text="暂无结算单">
        <el-table-column prop="settlementNo" label="结算单号" min-width="190" show-overflow-tooltip />
        <el-table-column label="代理" min-width="160" show-overflow-tooltip><template #default="{ row }">{{ row.agent?.name || "-" }}</template></el-table-column>
        <el-table-column label="周期" min-width="260"><template #default="{ row }">{{ formatTime(row.periodStart) }} - {{ formatTime(row.periodEnd) }}</template></el-table-column>
        <el-table-column prop="transactionCount" label="流水" width="80" />
        <el-table-column prop="refundCount" label="退款" width="80" />
        <el-table-column label="实收" width="110"><template #default="{ row }">￥{{ money(row.grossAmount) }}</template></el-table-column>
        <el-table-column label="退款" width="110"><template #default="{ row }">￥{{ money(row.refundAmount) }}</template></el-table-column>
        <el-table-column label="净收入" width="110"><template #default="{ row }">￥{{ money(row.netAmount) }}</template></el-table-column>
        <el-table-column label="佣金" width="120"><template #default="{ row }">￥{{ money(row.commissionAmount) }}</template></el-table-column>
        <el-table-column label="应打款" width="120"><template #default="{ row }"><strong>￥{{ money(row.payableAmount) }}</strong></template></el-table-column>
        <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="statusType[row.status] || 'info'">{{ statusText[row.status] || row.status }}</el-tag></template></el-table-column>
        <el-table-column prop="reviewRemark" label="审核备注" min-width="150" show-overflow-tooltip />
        <el-table-column v-if="canViewSensitive" prop="paidReference" label="打款凭证" min-width="150" show-overflow-tooltip />
        <el-table-column v-if="canViewSensitive" label="附件" width="90"><template #default="{ row }"><el-button v-if="row.paidProofUrl" link type="primary" @click="openProof(row.paidProofUrl)">查看</el-button><span v-else>-</span></template></el-table-column>
        <el-table-column label="创建时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        <el-table-column label="操作" :width="hasWriteActions ? 400 : 100" fixed="right">
          <template #default="{ row }">
            <div class="table-actions">
              <el-button size="small" :icon="Search" :loading="detailLoading && detailTargetId === row.id" :disabled="operationLocked" @click="openDetails(row)">核对</el-button>
              <el-button v-if="canManage" size="small" :icon="UploadFilled" :disabled="row.status !== 'draft' || actionId !== null" :loading="actionId === row.id" @click="submitSettlement(row)">提交</el-button>
              <el-button v-if="canManage" size="small" type="success" :icon="Check" :disabled="row.status !== 'pending_review' || actionId !== null" :loading="actionId === row.id" @click="approveSettlement(row)">通过</el-button>
              <el-button v-if="canManage" size="small" type="danger" :icon="Close" :disabled="row.status !== 'pending_review' || actionId !== null" :loading="actionId === row.id" @click="rejectSettlement(row)">拒绝</el-button>
              <el-button v-if="canTransfer" size="small" type="warning" :icon="Wallet" :disabled="row.status !== 'approved' || actionId !== null" :loading="actionId === row.id" @click="sandboxTransfer(row)">沙箱打款</el-button>
              <el-button v-if="canTransfer" size="small" :disabled="row.status !== 'approved' || actionId !== null" :loading="actionId === row.id" @click="sandboxTransfer(row, 'failed')">模拟失败</el-button>
              <el-button v-if="canPay" size="small" type="primary" :icon="Wallet" :disabled="row.status !== 'approved' || actionId !== null" :loading="actionId === row.id" @click="markPaid(row)">打款</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
        <el-pagination v-if="total > pageSize" class="pagination" background layout="prev, pager, next" :disabled="scopeLocked" :current-page="page" :page-size="pageSize" :total="total" @current-change="changePage" />
    </div>

    <el-dialog v-model="dialogVisible" width="min(620px, 100vw)" title="生成代理结算" :close-on-click-modal="false" :close-on-press-escape="!generating" :show-close="!generating" destroy-on-close>
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="代理" required>
            <el-select v-model="form.agentId" filterable style="width: 100%">
              <el-option v-for="agent in filteredAgents" :key="agent.id" :label="agent.name" :value="agent.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="佣金率（%）">
            <el-input-number v-model="form.commissionRate" :min="0" :max="100" :precision="2" style="width: 100%" placeholder="为空则读取代理配置" />
          </el-form-item>
          <el-form-item label="周期开始" required><el-input v-model="form.periodStart" placeholder="2026-06-01 00:00" /></el-form-item>
          <el-form-item label="周期结束" required><el-input v-model="form.periodEnd" placeholder="2026-07-01 00:00" /></el-form-item>
          <el-form-item class="full" label="备注"><el-input v-model="form.remark" type="textarea" :rows="3" maxlength="255" /></el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button :disabled="generating" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="generating" @click="generateSettlement">生成草稿</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="paidDialogVisible" width="min(620px, 100vw)" title="登记打款凭证" :close-on-click-modal="false" :close-on-press-escape="actionId === null" :show-close="actionId === null" destroy-on-close>
      <el-form label-position="top">
        <el-form-item label="结算单">
          <el-input :model-value="paidTarget?.settlementNo || '-'" disabled />
        </el-form-item>
        <el-form-item label="转账流水号 / 凭证号">
          <el-input v-model="paidForm.paidReference" maxlength="128" placeholder="填写银行转账流水号、回单号或内部凭证号" />
        </el-form-item>
        <el-form-item label="凭证附件">
          <div class="proof-upload">
            <el-upload v-if="canUploadProof" action="/api/admin/uploads/private-settlement-proofs" name="file" :headers="uploadHeaders()" :show-file-list="false" :before-upload="beforeProofUpload" :on-success="handleProofSuccess" :on-error="handleProofError">
              <el-button :icon="UploadFilled">上传图片 / PDF</el-button>
            </el-upload>
            <el-button v-if="paidForm.paidProofUrl" link type="primary" @click="openProof(paidForm.paidProofUrl)">查看已上传凭证</el-button>
          </div>
        </el-form-item>
        <el-form-item label="打款备注">
          <el-input v-model="paidForm.remark" type="textarea" :rows="3" maxlength="255" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="actionId !== null" @click="paidDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="actionId === paidTarget?.id" :disabled="actionId !== null" @click="submitPaid">确认已打款</el-button>
      </template>
    </el-dialog>

    <el-drawer v-model="detailVisible" size="min(960px, 100vw)" title="结算核对" destroy-on-close>
      <div v-loading="detailLoading">
        <el-alert v-if="detailError" type="error" show-icon :closable="false" :title="detailError"><template #default><el-button size="small" :loading="detailLoading" @click="retryDetails">重试</el-button></template></el-alert>
        <template v-if="details">
          <div class="detail-summary">
            <div><span>结算单</span><strong>{{ details.settlement.settlementNo }}</strong></div>
            <div><span>快照应打款</span><strong>￥{{ money(details.snapshot.payableAmount) }}</strong></div>
            <div><span>当前应打款</span><strong>￥{{ money(details.current.payableAmount) }}</strong></div>
            <div><span>打款状态</span><strong>{{ details.canMarkPaid ? "可打款" : "需核对" }}</strong></div>
          </div>

          <div class="detail-section">
            <h3>风险提示</h3>
            <el-empty v-if="!details.risks.length" description="暂无风险" />
            <div v-else class="risk-list">
              <el-alert v-for="risk in details.risks" :key="risk.type" :type="risk.level" :closable="false" show-icon>
                <template #title>
                  {{ risk.message }}
                  <el-tag size="small" :type="detailTagType(risk.blocking)">{{ risk.blocking ? "阻断打款" : "提醒" }}</el-tag>
                </template>
              </el-alert>
            </div>
          </div>

          <div class="detail-section">
            <h3>打款凭证</h3>
            <div v-if="canViewSensitive" class="proof-info">
              <span>凭证号：{{ details.settlement.paidReference || "-" }}</span>
              <span>备注：{{ details.settlement.paidRemark || "-" }}</span>
              <el-button v-if="details.settlement.paidProofUrl" link type="primary" @click="openProof(details.settlement.paidProofUrl)">查看附件</el-button>
              <span v-else>附件：-</span>
            </div>
            <el-alert v-else type="info" show-icon :closable="false" title="打款凭证和备注已隐藏，需要结算敏感权限查看。" />
          </div>

          <div class="detail-section">
            <h3>打款回执</h3>
            <el-table :data="details.transfers" stripe empty-text="暂无打款回执">
              <el-table-column prop="transferNo" label="转账单号" min-width="180" show-overflow-tooltip />
              <el-table-column prop="provider" label="渠道" width="90" />
              <el-table-column prop="mode" label="模式" width="90" />
              <el-table-column label="金额" width="110"><template #default="{ row }">￥{{ money(row.amount) }}</template></el-table-column>
              <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="transferStatusType(row.status)">{{ transferStatusText(row.status) }}</el-tag></template></el-table-column>
              <el-table-column v-if="canViewSensitive" prop="providerTransferNo" label="服务商回执" min-width="180" show-overflow-tooltip />
              <el-table-column v-if="canViewSensitive" prop="failureReason" label="失败原因" min-width="220" show-overflow-tooltip />
              <el-table-column label="同步时间" width="170"><template #default="{ row }">{{ formatTime(row.syncedAt || row.updatedAt) }}</template></el-table-column>
            </el-table>
          </div>

          <div class="detail-section">
            <h3>重算差异</h3>
            <el-empty v-if="!details.differences.length" description="快照与当前重算一致" />
            <el-table v-else :data="details.differences" stripe>
              <el-table-column prop="label" label="项目" width="150" />
              <el-table-column label="生成时快照" min-width="180"><template #default="{ row }">{{ row.snapshot }}</template></el-table-column>
              <el-table-column label="当前重算" min-width="180"><template #default="{ row }">{{ row.current }}</template></el-table-column>
              <el-table-column label="影响" width="120"><template #default="{ row }"><el-tag :type="detailTagType(row.blocking)">{{ row.blocking ? "阻断" : "提醒" }}</el-tag></template></el-table-column>
            </el-table>
          </div>

          <div class="detail-section">
            <h3>支付流水明细</h3>
            <el-table :data="details.transactions" stripe empty-text="暂无支付流水">
              <el-table-column prop="transactionNo" label="流水号" min-width="180" show-overflow-tooltip />
              <el-table-column label="订单" min-width="160"><template #default="{ row }">{{ row.order?.orderNo || "-" }}</template></el-table-column>
              <el-table-column prop="provider" label="渠道" width="90" />
              <el-table-column label="金额" width="110"><template #default="{ row }">￥{{ money(row.amount) }}</template></el-table-column>
              <el-table-column label="对账" width="110"><template #default="{ row }"><el-tag :type="row.reconciliationStatus === 'pending' ? 'danger' : 'success'">{{ row.reconciliationStatus }}</el-tag></template></el-table-column>
              <el-table-column label="快照内" width="90"><template #default="{ row }">{{ isSnapshotTransaction(row.id) ? "是" : "否" }}</template></el-table-column>
              <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
            </el-table>
          </div>

          <div class="detail-section">
            <h3>退款明细</h3>
            <el-table :data="details.refunds" stripe empty-text="暂无退款">
              <el-table-column prop="refundNo" label="退款号" min-width="180" show-overflow-tooltip />
              <el-table-column label="订单" min-width="160"><template #default="{ row }">{{ row.order?.orderNo || "-" }}</template></el-table-column>
              <el-table-column label="金额" width="110"><template #default="{ row }">￥{{ money(row.amount) }}</template></el-table-column>
              <el-table-column prop="status" label="状态" width="100" />
              <el-table-column label="快照内" width="90"><template #default="{ row }">{{ isSnapshotRefund(row.id) ? "是" : "否" }}</template></el-table-column>
              <el-table-column label="完成时间" width="170"><template #default="{ row }">{{ formatTime(row.completedAt || row.createdAt) }}</template></el-table-column>
            </el-table>
          </div>

          <div class="detail-section">
            <h3>操作审计</h3>
            <el-empty v-if="!details.auditLogs.length" description="暂无结算操作日志" />
            <el-timeline v-else>
              <el-timeline-item v-for="log in details.auditLogs" :key="log.id" :timestamp="formatTime(log.createdAt)">
                <strong>{{ log.summary || log.action }}</strong>
                <div class="audit-meta">{{ log.adminUsername || "-" }} · {{ log.action }}</div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.toolbar-actions { display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; }
.page-subtitle { margin: 6px 0 0; color: #6b7280; }
.permission-alert { margin-bottom: 12px; }
.pagination { margin-top: 16px; justify-content: flex-end; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.summary-item { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; }
.summary-item span { color: #6b7280; }
.summary-item strong { font-size: 22px; }
.capability-card { margin-bottom: 16px; }
.capability-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 14px; }
.capability-head h3 { margin: 0; font-size: 17px; }
.capability-head p { margin: 6px 0 0; color: #6b7280; }
.capability-metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 12px; }
.capability-metrics div { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; }
.capability-metrics span { color: #6b7280; }
.capability-metrics strong { font-size: 18px; }
.capability-notes { display: grid; gap: 8px; margin-bottom: 12px; }
.capability-table { margin-top: 8px; }
.missing-agents { margin-top: 10px; color: #6b7280; font-size: 13px; }
.filter-card { margin-bottom: 16px; padding-bottom: 0; }
.table-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.detail-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
.detail-summary div { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; display: grid; gap: 6px; }
.detail-summary span { color: #6b7280; font-size: 13px; }
.detail-summary strong { font-size: 18px; }
.detail-section { margin-top: 18px; }
.detail-section h3 { margin: 0 0 12px; font-size: 16px; }
.risk-list { display: grid; gap: 10px; }
.proof-upload, .proof-info { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.proof-info { color: #4b5563; }
.audit-meta { margin-top: 4px; color: #6b7280; font-size: 13px; }
@media (max-width: 1100px) {
  .summary-grid, .capability-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .summary-grid, .capability-metrics { grid-template-columns: 1fr; }
  .detail-summary { grid-template-columns: 1fr; }
  .capability-head { flex-direction: column; }
  .toolbar { align-items: flex-start; flex-direction: column; }
  .toolbar-actions { justify-content: flex-start; }
  .pagination { justify-content: center; overflow-x: auto; }
}
</style>
