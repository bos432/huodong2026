<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Check, Close, Download, Refresh } from "@element-plus/icons-vue";
import { api, downloadFile } from "../api";
import { isPlatformAdmin } from "../permissions";

const route = useRoute();
const data = ref<any>();
const agents = ref<any[]>([]);
const tenants = ref<any[]>([]);
const loading = ref(false);
const reviewingId = ref<number | null>(null);
const resolvingId = ref<number | null>(null);
const scanning = ref(false);
const refundScanning = ref(false);
const importingStatement = ref(false);
const fetchingStatement = ref(false);
function routeTenantId() {
  const tenantId = typeof route.query.tenantId === "string" ? Number(route.query.tenantId) : undefined;
  return isPlatformAdmin() && tenantId && Number.isFinite(tenantId) ? tenantId : undefined;
}

const filters = reactive({ agentId: undefined as number | undefined, tenantId: routeTenantId() as number | undefined });
const pageTitle = computed(() => (isPlatformAdmin() ? "全局对账" : "财务对账"));
const pageHintTitle = computed(() => (isPlatformAdmin() ? "平台财务监管" : "财务操作提示"));
const pageHintDescription = computed(() =>
  isPlatformAdmin()
    ? "可按商家监管订单流水、退款、回调和服务商账单；处理差异前请确认所属商家和收款账户。"
    : "退款审核、对账处理会影响订单、报名和收入统计。处理前请先核对服务商流水、线下沟通记录和订单状态。"
);

const refundStatusText: Record<string, string> = {
  pending: "待审核",
  processing: "服务商处理中",
  completed: "已完成",
  failed: "服务商失败",
  rejected: "已拒绝"
};

const refundStatusType: Record<string, string> = {
  pending: "warning",
  processing: "warning",
  completed: "success",
  failed: "danger",
  rejected: "danger"
};

const reconciliationStatusText: Record<string, string> = {
  pending: "待处理",
  resolved: "已处理",
  matched: "已匹配"
};

const discrepancyTypeText: Record<string, string> = {
  amount_mismatch: "金额不一致",
  order_status_mismatch: "订单状态异常",
  provider_callback_error: "回调异常",
  unknown_order: "未知订单"
};

const callbackStatusText: Record<string, string> = {
  received: "已接收",
  success: "处理成功",
  failed: "处理失败",
  idempotent: "幂等处理"
};

const callbackStatusType: Record<string, string> = {
  received: "info",
  success: "success",
  failed: "danger",
  idempotent: "warning"
};

async function load() {
  loading.value = true;
  try {
    data.value = await api.get("/admin/finance/dashboard", { params: queryParams() });
  } catch (error: any) {
    ElMessage.error(error.message || "加载财务数据失败");
  } finally {
    loading.value = false;
  }
}

async function loadAgents() {
  agents.value = await api.get<any, any[]>("/admin/agents", { params: { tenantId: isPlatformAdmin() ? filters.tenantId || undefined : undefined } });
}

async function loadTenants() {
  tenants.value = isPlatformAdmin() ? await api.get<any, any[]>("/admin/tenants") : [];
}

function queryParams() {
  return {
    agentId: filters.agentId || undefined,
    tenantId: isPlatformAdmin() ? filters.tenantId || undefined : undefined
  };
}

function search() {
  load();
}

function changeTenant() {
  filters.agentId = undefined;
  search();
  loadAgents();
}

async function exportFinance() {
  try {
    const params = new URLSearchParams();
    if (filters.agentId) params.set("agentId", String(filters.agentId));
    if (isPlatformAdmin() && filters.tenantId) params.set("tenantId", String(filters.tenantId));
    const query = params.toString();
    await downloadFile(`/admin/finance/export${query ? `?${query}` : ""}`, "财务对账.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出失败");
  }
}

async function approveRefund(row: any) {
  const { value } = await ElMessageBox.prompt(`确认通过退款 ${row.refundNo}？真实支付订单会先发起服务商退款，查询成功后才更新订单、报名和积分状态。金额 ¥${money(row.amount)}。`, "通过退款申请", {
    inputValue: "财务审核通过",
    confirmButtonText: "确认通过",
    cancelButtonText: "再核对一下",
    type: "warning"
  });
  reviewingId.value = row.id;
  try {
    await api.post(`/admin/refunds/${row.id}/approve`, { remark: value });
    ElMessage.success("退款审核已提交");
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "审核失败");
  } finally {
    reviewingId.value = null;
  }
}

async function rejectRefund(row: any) {
  const { value } = await ElMessageBox.prompt(`确认拒绝退款 ${row.refundNo}？请填写可对外解释的原因，便于客服沟通。`, "拒绝退款申请", {
    inputValue: "退款材料不完整",
    confirmButtonText: "拒绝",
    cancelButtonText: "取消"
  });
  reviewingId.value = row.id;
  try {
    await api.post(`/admin/refunds/${row.id}/reject`, { remark: value });
    ElMessage.success("退款申请已拒绝");
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "审核失败");
  } finally {
    reviewingId.value = null;
  }
}

async function scanReconciliation() {
  await ElMessageBox.confirm("系统会重新扫描支付流水和订单状态，生成或更新待处理对账差异。建议在导入/同步服务商流水后执行。", "扫描对账", { type: "info", confirmButtonText: "开始扫描", cancelButtonText: "取消" });
  scanning.value = true;
  try {
    const result = await api.post<any, { scannedCount: number; pendingCount: number }>("/admin/finance/reconciliation/scan", {});
    ElMessage.success(`已扫描 ${result.scannedCount} 条流水，发现 ${result.pendingCount} 条待处理差异`);
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "扫描失败");
  } finally {
    scanning.value = false;
  }
}

async function scanProviderRefunds() {
  await ElMessageBox.confirm("系统会查询服务商退款回执，只会在服务商确认退款成功后完成本地订单、报名和积分更新。", "扫描退款回执", { type: "info", confirmButtonText: "开始扫描", cancelButtonText: "取消" });
  refundScanning.value = true;
  try {
    const result = await api.post<any, { checkedCount: number }>("/admin/finance/refunds/provider-scan", {});
    ElMessage.success(`已扫描 ${result.checkedCount} 条退款回执`);
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "扫描退款回执失败");
  } finally {
    refundScanning.value = false;
  }
}

async function importStatement() {
  const { value: provider } = await ElMessageBox.prompt("请输入服务商：wechat 或 alipay。", "导入服务商账单", {
    inputValue: "wechat",
    confirmButtonText: "下一步",
    cancelButtonText: "取消"
  });
  const { value } = await ElMessageBox.prompt("粘贴 JSON 数组，每行至少包含 transactionNo、orderNo、amount。也兼容 trade_no/out_trade_no/total_amount 等字段。", "账单 JSON", {
    inputType: "textarea",
    inputPlaceholder: '[{"transactionNo":"TX1001","orderNo":"OD1001","amount":99.00}]',
    confirmButtonText: "导入",
    cancelButtonText: "取消"
  });
  let items: any[] = [];
  try {
    const parsed = JSON.parse(value);
    items = Array.isArray(parsed) ? parsed : parsed.items;
    if (!Array.isArray(items)) throw new Error("invalid");
  } catch {
    ElMessage.error("请输入合法的 JSON 数组");
    return;
  }
  importingStatement.value = true;
  try {
    const result = await api.post<any, { importedCount: number; updatedCount: number; matchedCount: number; pendingCount: number; skippedCount: number }>("/admin/finance/statements/import", { provider, items });
    ElMessage.success(`导入 ${result.importedCount} 条，更新 ${result.updatedCount} 条，匹配 ${result.matchedCount} 条，待处理 ${result.pendingCount} 条`);
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "导入账单失败");
  } finally {
    importingStatement.value = false;
  }
}

async function fetchStatement() {
  const { value: provider } = await ElMessageBox.prompt("请输入服务商：wechat 或 alipay。", "自动拉取账单", {
    inputValue: "wechat",
    confirmButtonText: "下一步",
    cancelButtonText: "取消"
  });
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { value: statementDate } = await ElMessageBox.prompt("请输入账单日期，格式 YYYY-MM-DD。", "账单日期", {
    inputValue: yesterday,
    confirmButtonText: "拉取",
    cancelButtonText: "取消"
  });
  fetchingStatement.value = true;
  try {
    const result = await api.post<any, { implemented: boolean; importedCount: number; updatedCount: number; matchedCount: number; pendingCount: number; message?: string }>("/admin/finance/statements/fetch", { provider, statementDate, agentId: filters.agentId || undefined });
    if (!result.implemented) ElMessage.warning(result.message || "服务商账单自动拉取尚未接入官方 SDK");
    else ElMessage.success(`拉取并导入 ${result.importedCount} 条，更新 ${result.updatedCount} 条，匹配 ${result.matchedCount} 条，待处理 ${result.pendingCount} 条`);
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "拉取账单失败");
  } finally {
    fetchingStatement.value = false;
  }
}

async function resolveReconciliation(row: any) {
  const { value } = await ElMessageBox.prompt(`确认将流水 ${row.transactionNo} 的对账差异标记为已处理？此操作表示你已完成线下核对和必要修正。`, "标记对账差异已处理", {
    inputValue: "已核对服务商流水并完成人工处理",
    confirmButtonText: "标记已处理",
    cancelButtonText: "取消"
  });
  resolvingId.value = row.id;
  try {
    await api.post(`/admin/finance/transactions/${row.id}/resolve`, { remark: value });
    ElMessage.success("对账差异已标记处理");
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "处理失败");
  } finally {
    resolvingId.value = null;
  }
}

function statusText(status: string) {
  return refundStatusText[status] || status;
}

function statusType(status: string) {
  return refundStatusType[status] || "info";
}

function reconciliationText(status: string) {
  return reconciliationStatusText[status] || status;
}

function discrepancyText(type?: string) {
  return type ? discrepancyTypeText[type] || type : "-";
}

function callbackText(status: string) {
  return callbackStatusText[status] || status;
}

function callbackType(status: string) {
  return callbackStatusType[status] || "info";
}

function formatTime(value?: string) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
}

function money(value?: string | number) {
  return Number(value || 0).toFixed(2);
}

onMounted(() => {
  load();
  loadAgents();
  loadTenants();
});

watch(
  () => route.query.tenantId,
  () => {
    const nextTenantId = routeTenantId();
    if (filters.tenantId !== nextTenantId) {
      filters.tenantId = nextTenantId;
      filters.agentId = undefined;
      load();
      loadAgents();
    }
  }
);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>{{ pageTitle }}</h2>
      <div class="toolbar-actions">
        <el-button :icon="Refresh" :loading="scanning" @click="scanReconciliation">扫描对账</el-button>
        <el-button :icon="Refresh" :loading="refundScanning" @click="scanProviderRefunds">扫描退款回执</el-button>
        <el-button :loading="fetchingStatement" @click="fetchStatement">拉取账单</el-button>
        <el-button :loading="importingStatement" @click="importStatement">导入账单</el-button>
        <el-button @click="load">刷新</el-button>
        <el-button type="primary" :icon="Download" @click="exportFinance">导出 Excel</el-button>
      </div>
    </div>

    <el-alert class="page-hint" type="warning" :closable="false" show-icon :title="pageHintTitle" :description="pageHintDescription" />

    <template v-if="data">
      <div class="table-card filter-card">
        <el-form inline>
          <el-form-item v-if="isPlatformAdmin()" label="商家">
            <el-select v-model="filters.tenantId" clearable filterable placeholder="全部商家" style="width: 220px" @change="changeTenant">
              <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenant.name" :value="tenant.id" />
            </el-select>
          </el-form-item>
          <el-form-item label="代理">
            <el-select v-model="filters.agentId" clearable filterable placeholder="全部代理" style="width: 220px" @change="search">
              <el-option v-for="agent in agents" :key="agent.id" :label="agent.name" :value="agent.id" />
            </el-select>
          </el-form-item>
        </el-form>
      </div>

      <div class="metric-grid" v-loading="loading">
        <div class="metric"><span>订单数</span><strong>{{ data.totals.orderCount }}</strong></div>
        <div class="metric"><span>已支付</span><strong>{{ data.totals.paidOrderCount }}</strong></div>
        <div class="metric"><span>待支付</span><strong>{{ data.totals.pendingOrderCount }}</strong></div>
        <div class="metric"><span>退款申请</span><strong>{{ data.totals.refundCount }}</strong></div>
        <div class="metric"><span>待审退款</span><strong>{{ data.totals.pendingRefundCount }}</strong></div>
        <div class="metric"><span>已退款笔数</span><strong>{{ data.totals.completedRefundCount }}</strong></div>
        <div class="metric"><span>待处理对账</span><strong>{{ data.totals.pendingReconciliationCount }}</strong></div>
        <div class="metric"><span>待处理账单</span><strong>{{ data.totals.pendingStatementCount }}</strong></div>
        <div class="metric"><span>失败回调</span><strong>{{ data.totals.failedCallbackCount }}</strong></div>
        <div class="metric"><span>实收</span><strong>¥{{ money(data.totals.paidAmount) }}</strong></div>
        <div class="metric"><span>已退款</span><strong>¥{{ money(data.totals.refundAmount) }}</strong></div>
        <div class="metric"><span>净收入</span><strong>¥{{ money(data.totals.netAmount) }}</strong></div>
      </div>

      <div class="table-card records">
        <h3>代理收款汇总</h3>
        <el-empty v-if="!data.agentSummary?.length" description="暂无代理收款数据" />
        <el-table v-else :data="data.agentSummary" stripe>
          <el-table-column prop="agentName" label="代理" min-width="180" show-overflow-tooltip />
          <el-table-column prop="transactionCount" label="流水笔数" width="110" />
          <el-table-column label="实收" width="130"><template #default="{ row }">¥{{ money(row.paidAmount) }}</template></el-table-column>
          <el-table-column label="已退款" width="130"><template #default="{ row }">¥{{ money(row.refundAmount) }}</template></el-table-column>
          <el-table-column label="净收入" width="130"><template #default="{ row }">¥{{ money(row.netAmount) }}</template></el-table-column>
          <el-table-column prop="pendingReconciliationCount" label="待处理对账" width="130" />
        </el-table>
      </div>

      <div class="table-card">
        <h3>最近支付流水</h3>
        <el-empty v-if="!data.recentTransactions?.length" description="暂无支付流水" />
        <el-table v-else :data="data.recentTransactions" stripe>
          <el-table-column prop="transactionNo" label="流水号" min-width="180" show-overflow-tooltip />
          <el-table-column label="订单号" min-width="160"><template #default="{ row }">{{ row.order?.orderNo || "-" }}</template></el-table-column>
          <el-table-column label="活动" min-width="220" show-overflow-tooltip><template #default="{ row }">{{ row.order?.registration?.activity?.title || "-" }}</template></el-table-column>
          <el-table-column label="代理" min-width="150" show-overflow-tooltip><template #default="{ row }">{{ row.order?.agent?.name || "平台自营" }}</template></el-table-column>
          <el-table-column prop="provider" label="渠道" width="110" />
          <el-table-column prop="paymentMethod" label="方式" width="110" />
          <el-table-column label="金额" width="110"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          <el-table-column prop="status" label="状态" width="100" />
          <el-table-column label="对账" width="110"><template #default="{ row }">{{ reconciliationText(row.reconciliationStatus) }}</template></el-table-column>
          <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        </el-table>
      </div>

      <div class="table-card records">
        <h3>支付对账差异</h3>
        <el-empty v-if="!data.reconciliationItems?.length" description="暂无待处理对账差异" />
        <el-table v-else :data="data.reconciliationItems" stripe>
          <el-table-column prop="transactionNo" label="流水号" min-width="180" show-overflow-tooltip />
          <el-table-column label="订单号" min-width="160"><template #default="{ row }">{{ row.order?.orderNo || "-" }}</template></el-table-column>
          <el-table-column label="活动" min-width="220" show-overflow-tooltip><template #default="{ row }">{{ row.order?.registration?.activity?.title || "-" }}</template></el-table-column>
          <el-table-column label="代理" min-width="150" show-overflow-tooltip><template #default="{ row }">{{ row.order?.agent?.name || "平台自营" }}</template></el-table-column>
          <el-table-column label="流水金额" width="110"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          <el-table-column label="订单金额" width="110"><template #default="{ row }">¥{{ money(row.order?.amount) }}</template></el-table-column>
          <el-table-column label="差异类型" width="130"><template #default="{ row }">{{ discrepancyText(row.discrepancyType) }}</template></el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }"><el-tag :type="row.reconciliationStatus === 'pending' ? 'warning' : 'success'">{{ reconciliationText(row.reconciliationStatus) }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
          <el-table-column prop="reconciledBy" label="处理人" width="120" />
          <el-table-column prop="reconciliationRemark" label="处理备注" min-width="180" show-overflow-tooltip />
          <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button size="small" type="primary" :disabled="row.reconciliationStatus !== 'pending'" :loading="resolvingId === row.id" @click="resolveReconciliation(row)">标记处理</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="table-card records">
        <h3>服务商账单记录</h3>
        <el-empty v-if="!data.statementRecords?.length" description="暂无服务商账单记录" />
        <el-table v-else :data="data.statementRecords" stripe>
          <el-table-column prop="transactionNo" label="交易号" min-width="180" show-overflow-tooltip />
          <el-table-column prop="orderNo" label="订单号" min-width="160" show-overflow-tooltip />
          <el-table-column label="活动" min-width="220" show-overflow-tooltip><template #default="{ row }">{{ row.order?.registration?.activity?.title || "-" }}</template></el-table-column>
          <el-table-column label="代理" min-width="150" show-overflow-tooltip><template #default="{ row }">{{ row.order?.agent?.name || "平台自营" }}</template></el-table-column>
          <el-table-column prop="provider" label="服务商" width="110" />
          <el-table-column label="金额" width="110"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          <el-table-column label="对账" width="110">
            <template #default="{ row }"><el-tag :type="row.reconciliationStatus === 'matched' ? 'success' : 'warning'">{{ reconciliationText(row.reconciliationStatus) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="差异类型" width="130"><template #default="{ row }">{{ discrepancyText(row.discrepancyType) }}</template></el-table-column>
          <el-table-column prop="remark" label="说明" min-width="190" show-overflow-tooltip />
          <el-table-column label="交易时间" width="170"><template #default="{ row }">{{ formatTime(row.tradedAt) }}</template></el-table-column>
          <el-table-column label="导入时间" width="170"><template #default="{ row }">{{ formatTime(row.importedAt) }}</template></el-table-column>
        </el-table>
      </div>

      <div class="table-card records">
        <h3>支付回调日志</h3>
        <el-empty v-if="!data.callbackLogs?.length" description="暂无支付回调日志" />
        <el-table v-else :data="data.callbackLogs" stripe>
          <el-table-column prop="provider" label="服务商" width="110" />
          <el-table-column prop="orderNo" label="订单号" min-width="160" show-overflow-tooltip />
          <el-table-column prop="transactionNo" label="交易号" min-width="180" show-overflow-tooltip />
          <el-table-column label="金额" width="110"><template #default="{ row }">{{ row.amount ? `¥${money(row.amount)}` : "-" }}</template></el-table-column>
          <el-table-column label="验签" width="100">
            <template #default="{ row }">
              <el-tag v-if="row.signatureValid === true" type="success">通过</el-tag>
              <el-tag v-else-if="row.signatureValid === false" type="danger">失败</el-tag>
              <el-tag v-else type="info">未验签</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="处理结果" width="120">
            <template #default="{ row }"><el-tag :type="callbackType(row.resultStatus)">{{ callbackText(row.resultStatus) }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="resultMessage" label="结果说明" min-width="190" show-overflow-tooltip />
          <el-table-column label="活动" min-width="220" show-overflow-tooltip><template #default="{ row }">{{ row.order?.registration?.activity?.title || "-" }}</template></el-table-column>
          <el-table-column label="代理" min-width="150" show-overflow-tooltip><template #default="{ row }">{{ row.order?.agent?.name || "平台自营" }}</template></el-table-column>
          <el-table-column label="收到时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
          <el-table-column label="处理时间" width="170"><template #default="{ row }">{{ formatTime(row.processedAt) }}</template></el-table-column>
        </el-table>
      </div>

      <div class="table-card records">
        <h3>退款审核</h3>
        <el-empty v-if="!data.recentRefunds?.length" description="暂无退款记录" />
        <el-table v-else :data="data.recentRefunds" stripe>
          <el-table-column prop="refundNo" label="退款号" min-width="180" show-overflow-tooltip />
          <el-table-column label="订单号" min-width="160"><template #default="{ row }">{{ row.order?.orderNo || "-" }}</template></el-table-column>
          <el-table-column label="活动" min-width="220" show-overflow-tooltip><template #default="{ row }">{{ row.order?.registration?.activity?.title || "-" }}</template></el-table-column>
          <el-table-column label="代理" min-width="150" show-overflow-tooltip><template #default="{ row }">{{ row.order?.agent?.name || "平台自营" }}</template></el-table-column>
          <el-table-column label="金额" width="110"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column prop="providerRefundNo" label="服务商退款号" min-width="180" show-overflow-tooltip />
          <el-table-column label="服务商状态" width="130">
            <template #default="{ row }">{{ row.providerRefundStatus || "-" }}</template>
          </el-table-column>
          <el-table-column prop="providerRefundFailureReason" label="失败原因" min-width="180" show-overflow-tooltip />
          <el-table-column label="下次查询" width="170"><template #default="{ row }">{{ formatTime(row.providerRefundNextQueryAt) }}</template></el-table-column>
          <el-table-column prop="operator" label="申请人" width="120" />
          <el-table-column prop="reason" label="申请原因" min-width="160" show-overflow-tooltip />
          <el-table-column prop="reviewedBy" label="审核人" width="120" />
          <el-table-column prop="reviewRemark" label="审核备注" min-width="160" show-overflow-tooltip />
          <el-table-column label="申请时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
          <el-table-column label="完成时间" width="170"><template #default="{ row }">{{ formatTime(row.completedAt) }}</template></el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button size="small" type="success" :icon="Check" :disabled="row.status !== 'pending'" :loading="reviewingId === row.id" @click="approveRefund(row)">通过</el-button>
                <el-button size="small" type="danger" :icon="Close" :disabled="row.status !== 'pending'" :loading="reviewingId === row.id" @click="rejectRefund(row)">拒绝</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>

    <el-empty v-else-if="!loading" description="暂无财务数据" />
  </div>
</template>

<style scoped>
.toolbar-actions { display: flex; align-items: center; gap: 10px; }
.page-hint { margin-bottom: 16px; }
.filter-card { margin-bottom: 16px; padding-bottom: 0; }
.metric-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
.metric { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px; display: grid; gap: 8px; min-height: 98px; }
.metric span { color: #667085; font-size: 13px; }
.metric strong { font-size: 24px; line-height: 1.2; }
.records { margin-top: 16px; }
.table-actions { display: flex; gap: 8px; }
h3 { margin: 0 0 16px; }
@media (max-width: 1200px) { .metric-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 760px) { .metric-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
