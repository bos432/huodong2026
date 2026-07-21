<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { Download, Search, View } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api, downloadFile } from "../api";
import { hasPermission } from "../permissions";
import { maskPhone } from "../privacy";

const canViewFunds = computed(() => hasPermission("finance.view"));
const canExportFunds = computed(() => hasPermission("finance.export"));
const canExportOrders = computed(() => hasPermission("order.export"));

const loading = ref(false);
const errorMessage = ref("");
const rows = ref<any[]>([]);
const total = ref(0);
const fundLoading = ref(false);
const fundErrorMessage = ref("");
const fundRows = ref<any[]>([]);
const fundTotal = ref(0);
const fundSummary = ref({ creditFen: 0, debitFen: 0, netFen: 0 });
const exportingFunds = ref(false);
const checkingConsistency = ref(false);
const fundQuery = reactive({ sourceType: "", direction: "", status: "", keyword: "", page: 1, pageSize: 20 });
const query = reactive({ businessType: "", status: "", keyword: "", page: 1, pageSize: 20 });
const exportingOrders = ref(false);
const detailOpen = ref(false);
const detailLoading = ref(false);
const detailError = ref("");
const detail = ref<any>(null);
const detailTarget = ref<any>(null);
const pricingLabels: Record<string, string> = {
  originalAmountFen: "原价",
  goodsAmountFen: "商品金额",
  freightAmountFen: "运费",
  discountAmountFen: "优惠金额",
  memberDiscountAmountFen: "会员优惠",
  pointsDiscountAmountFen: "积分抵扣",
  pointsUsed: "使用积分"
};

async function load() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const result = await api.get<any, any>("/admin/unified-orders", { params: { ...query, businessType: query.businessType || undefined, status: query.status || undefined, keyword: query.keyword.trim() || undefined } });
    rows.value = result.items || [];
    total.value = result.total || 0;
  } catch (error: any) {
    errorMessage.value = error.message || "统一订单加载失败";
    ElMessage.error(errorMessage.value);
  } finally { loading.value = false; }
}

function money(row: any) { return `¥${(Number(row.amountFen || 0) / 100).toFixed(2)}`; }
function time(value: string) { return value ? value.replace("T", " ").slice(0, 19) : "-"; }
function search() { query.page = 1; load(); }
async function exportOrders() {
  if (!canExportOrders.value || exportingOrders.value) return;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => { if (!["page", "pageSize"].includes(key) && value) params.set(key, String(value)); });
  exportingOrders.value = true;
  try {
    await downloadFile(`/admin/unified-orders/export${params.size ? `?${params}` : ""}`, "统一订单.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "统一订单导出失败");
  } finally {
    exportingOrders.value = false;
  }
}
async function openDetail(row: any) {
  detailTarget.value = { businessType: row.businessType, id: row.id };
  detailOpen.value = true;
  detailLoading.value = true;
  detailError.value = "";
  detail.value = null;
  try {
    detail.value = await api.get<any, any>(`/admin/unified-orders/${encodeURIComponent(row.businessType)}/${row.id}`);
  } catch (error: any) {
    detailError.value = error.message || "统一订单详情加载失败";
  } finally {
    detailLoading.value = false;
  }
}
function retryDetail() {
  if (detailTarget.value) openDetail(detailTarget.value);
}
function pricingLabel(key: string) { return pricingLabels[key] || key; }
const snapshotText = computed(() => detail.value?.snapshot ? JSON.stringify(detail.value.snapshot, null, 2) : "-");
async function loadFunds() {
  if (!canViewFunds.value) return;
  fundLoading.value = true;
  fundErrorMessage.value = "";
  try {
    const result = await api.get<any, any>("/admin/unified-funds", { params: { ...fundQuery, sourceType: fundQuery.sourceType || undefined, direction: fundQuery.direction || undefined, status: fundQuery.status || undefined, keyword: fundQuery.keyword.trim() || undefined } });
    fundRows.value = result.items || [];
    fundTotal.value = result.total || 0;
    fundSummary.value = result.summary || { creditFen: 0, debitFen: 0, netFen: 0 };
  } catch (error: any) {
    fundErrorMessage.value = error.message || "统一资金流水加载失败";
    ElMessage.error(fundErrorMessage.value);
  } finally { fundLoading.value = false; }
}
function searchFunds() { fundQuery.page = 1; loadFunds(); }
function fen(value: any) { return `¥${(Number(value || 0) / 100).toFixed(2)}`; }
async function exportFunds() {
  if (!canExportFunds.value || exportingFunds.value) return;
  const params = new URLSearchParams();
  Object.entries(fundQuery).forEach(([key, value]) => { if (!["page", "pageSize"].includes(key) && value) params.set(key, String(value)); });
  exportingFunds.value = true;
  try {
    await downloadFile(`/admin/unified-funds/export${params.size ? `?${params}` : ""}`, "统一资金流水.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "统一资金流水导出失败");
  } finally {
    exportingFunds.value = false;
  }
}
async function checkConsistency() {
  if (!canViewFunds.value || checkingConsistency.value) return;
  checkingConsistency.value = true;
  try {
    const result = await api.get<any, any>("/admin/unified-funds/consistency");
    if (result.healthy) {
      ElMessage.success(`资金一致性检查通过：活动订单 ${result.checked.activityOrders}，课程订单 ${result.checked.courseOrders}，商城订单 ${result.checked.mallOrders}，钱包流水 ${result.checked.walletTransactions}`);
      return;
    }
    const details = (result.issues || []).slice(0, 10).map((item: any) => `${item.type}：${item.orderNo || item.walletId || "-"}`).join("\n") || "未返回异常明细";
    await ElMessageBox.alert(details, `发现 ${result.issueCount} 项资金异常`, { type: "warning" });
  } catch (error: any) {
    ElMessage.error(error.message || "资金一致性检查失败");
  } finally {
    checkingConsistency.value = false;
  }
}
onMounted(() => {
  load();
  if (canViewFunds.value) loadFunds();
});
</script>

<template>
  <div class="page">
    <div class="toolbar"><h2>统一订单中心</h2><el-button v-if="canExportOrders" type="primary" :icon="Download" :loading="exportingOrders" @click="exportOrders">导出订单</el-button></div>
    <el-alert class="hint" type="info" :closable="false" show-icon title="跨业务订单统一视图" description="统一查看活动报名、课程和商城订单的金额分、支付方式、状态与业务快照；具体确认收款、发货和售后仍在各业务订单页处理。" />
    <div class="table-card">
      <el-alert v-if="errorMessage" type="error" show-icon :closable="false" :title="errorMessage"><template #default><el-button size="small" @click="load">重试</el-button></template></el-alert>
      <el-form inline>
        <el-form-item label="业务"><el-select v-model="query.businessType" clearable style="width:150px" @change="search"><el-option label="活动报名" value="activity" /><el-option label="课程" value="course" /><el-option label="商城" value="mall" /></el-select></el-form-item>
        <el-form-item label="状态"><el-input v-model="query.status" clearable placeholder="状态编码" style="width:160px" @keyup.enter="search" @clear="search" /></el-form-item>
        <el-form-item label="关键词"><el-input v-model="query.keyword" clearable placeholder="订单号/用户/业务标题" style="width:260px" @keyup.enter="search" @clear="search" /></el-form-item>
        <el-button type="primary" :icon="Search" @click="search">查询</el-button>
      </el-form>
      <el-table v-loading="loading" :data="rows" stripe empty-text="暂无订单">
        <el-table-column prop="businessLabel" label="业务" width="100" />
        <el-table-column prop="orderNo" label="订单号" min-width="190" />
        <el-table-column prop="title" label="业务对象" min-width="200" show-overflow-tooltip />
        <el-table-column label="用户" min-width="150"><template #default="{ row }">{{ row.user?.phone ? maskPhone(row.user.phone) : row.user?.nickname || "-" }}</template></el-table-column>
        <el-table-column label="金额" width="110"><template #default="{ row }"><strong>{{ money(row) }}</strong><small>{{ row.amountFen }} 分</small></template></el-table-column>
        <el-table-column prop="paymentMethod" label="支付方式" width="110" />
        <el-table-column prop="status" label="状态" width="130" />
        <el-table-column prop="transactionNo" label="支付流水号" min-width="170" show-overflow-tooltip />
        <el-table-column label="所属商家" min-width="140"><template #default="{ row }">{{ row.tenant?.name || "平台" }}</template></el-table-column>
        <el-table-column label="创建时间" width="170"><template #default="{ row }">{{ time(row.createdAt) }}</template></el-table-column>
        <el-table-column label="操作" width="90" fixed="right"><template #default="{ row }"><el-button link type="primary" :icon="View" @click="openDetail(row)">详情</el-button></template></el-table-column>
      </el-table>
      <el-pagination class="pager" v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" layout="total, sizes, prev, pager, next" @current-change="load" @size-change="search" />
    </div>
    <div v-if="canViewFunds" class="table-card funds-card">
      <el-alert v-if="fundErrorMessage" type="error" show-icon :closable="false" :title="fundErrorMessage"><template #default><el-button size="small" @click="loadFunds">重试</el-button></template></el-alert>
      <div class="fund-head"><h3>统一资金流水</h3><div><el-tag type="success">收入 {{ fen(fundSummary.creditFen) }}</el-tag><el-tag type="danger">支出 {{ fen(fundSummary.debitFen) }}</el-tag><el-tag>净额 {{ fen(fundSummary.netFen) }}</el-tag><el-button size="small" :loading="checkingConsistency" @click="checkConsistency">一致性检查</el-button><el-button v-if="canExportFunds" size="small" type="primary" :loading="exportingFunds" @click="exportFunds">导出</el-button></div></div>
      <el-form inline>
        <el-form-item label="来源"><el-select v-model="fundQuery.sourceType" clearable style="width:150px" @change="searchFunds"><el-option label="活动支付" value="activity_payment" /><el-option label="活动退款" value="activity_refund" /><el-option label="课程支付" value="course_payment" /><el-option label="课程退款" value="course_refund" /><el-option label="商城支付" value="mall_payment" /><el-option label="商城退款" value="mall_refund" /><el-option label="钱包流水" value="wallet" /><el-option label="商城佣金" value="commission" /><el-option label="商城结算" value="settlement" /></el-select></el-form-item>
        <el-form-item label="方向"><el-select v-model="fundQuery.direction" clearable style="width:110px" @change="searchFunds"><el-option label="收入" value="credit" /><el-option label="支出" value="debit" /></el-select></el-form-item>
        <el-form-item label="状态"><el-input v-model="fundQuery.status" clearable style="width:140px" @keyup.enter="searchFunds" @clear="searchFunds" /></el-form-item>
        <el-form-item label="关键词"><el-input v-model="fundQuery.keyword" clearable placeholder="流水号/订单号/商家" style="width:240px" @keyup.enter="searchFunds" @clear="searchFunds" /></el-form-item>
        <el-button type="primary" :icon="Search" @click="searchFunds">查询</el-button>
      </el-form>
      <el-table v-loading="fundLoading" :data="fundRows" stripe empty-text="暂无资金流水">
        <el-table-column prop="sourceLabel" label="来源" width="110" /><el-table-column prop="flowNo" label="资金流水号" min-width="190" show-overflow-tooltip /><el-table-column prop="businessOrderNo" label="业务编号" min-width="180" show-overflow-tooltip />
        <el-table-column label="方向" width="90"><template #default="{ row }"><el-tag :type="row.direction === 'credit' ? 'success' : 'danger'">{{ row.direction === 'credit' ? '收入' : '支出' }}</el-tag></template></el-table-column>
        <el-table-column label="金额" width="110"><template #default="{ row }"><strong>{{ fen(row.amountFen) }}</strong><small>{{ row.amountFen }} 分</small></template></el-table-column>
        <el-table-column prop="status" label="状态" width="120" /><el-table-column prop="reconciliationStatus" label="对账/关联状态" min-width="140" /><el-table-column label="所属商家" min-width="130"><template #default="{ row }">{{ row.tenant?.name || "平台" }}</template></el-table-column><el-table-column label="发生时间" width="170"><template #default="{ row }">{{ time(row.createdAt) }}</template></el-table-column>
      </el-table>
      <el-pagination class="pager" v-model:current-page="fundQuery.page" v-model:page-size="fundQuery.pageSize" :total="fundTotal" layout="total, sizes, prev, pager, next" @current-change="loadFunds" @size-change="searchFunds" />
    </div>

    <el-drawer v-model="detailOpen" class="unified-order-drawer" title="统一订单详情" size="min(760px, 96vw)" destroy-on-close>
      <div v-loading="detailLoading" class="detail-body">
        <el-alert v-if="detailError" type="error" show-icon :closable="false" :title="detailError"><template #default><el-button size="small" @click="retryDetail">重新加载</el-button></template></el-alert>
        <template v-if="detail">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="业务">{{ detail.businessLabel }}</el-descriptions-item><el-descriptions-item label="状态">{{ detail.status }}</el-descriptions-item>
            <el-descriptions-item label="订单号">{{ detail.orderNo }}</el-descriptions-item><el-descriptions-item label="支付方式">{{ detail.paymentMethod }}</el-descriptions-item>
            <el-descriptions-item label="业务对象">{{ detail.title }}</el-descriptions-item><el-descriptions-item label="所属商家">{{ detail.tenant?.name || "平台" }}</el-descriptions-item>
            <el-descriptions-item label="会员">{{ detail.user?.nickname || `用户 ${detail.user?.id || "-"}` }}</el-descriptions-item><el-descriptions-item label="手机号">{{ maskPhone(detail.user?.phone) }}</el-descriptions-item>
            <el-descriptions-item label="订单金额">{{ fen(detail.amountFen) }}（{{ detail.amountFen }} 分）</el-descriptions-item><el-descriptions-item label="支付流水">{{ detail.transactionNo || "-" }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ time(detail.createdAt) }}</el-descriptions-item><el-descriptions-item label="支付时间">{{ time(detail.timeline?.paidAt) }}</el-descriptions-item>
          </el-descriptions>

          <section><h3>金额构成</h3><el-descriptions :column="2" border><el-descriptions-item v-for="(value, key) in detail.pricing" :key="key" :label="pricingLabel(String(key))">{{ String(key).endsWith("Fen") ? fen(value) : value }}</el-descriptions-item></el-descriptions></section>

          <section v-if="detail.items?.length"><h3>商品明细</h3><el-table :data="detail.items" size="small"><el-table-column prop="productTitle" label="商品" min-width="180" /><el-table-column prop="skuName" label="规格" min-width="120" /><el-table-column prop="quantity" label="数量" width="80" /><el-table-column label="小计" width="110"><template #default="{ row }">{{ fen(row.totalAmountFen) }}</template></el-table-column></el-table></section>

          <section><h3>支付记录</h3><el-table :data="detail.payments || []" size="small" empty-text="暂无支付记录"><el-table-column prop="transactionNo" label="流水号" min-width="180" /><el-table-column prop="provider" label="渠道" width="100" /><el-table-column label="金额" width="110"><template #default="{ row }">{{ fen(row.amountFen) }}</template></el-table-column><el-table-column prop="status" label="状态" width="110" /><el-table-column label="时间" width="170"><template #default="{ row }">{{ time(row.createdAt) }}</template></el-table-column></el-table></section>

          <section><h3>退款记录</h3><el-table :data="detail.refunds || []" size="small" empty-text="暂无退款记录"><el-table-column prop="refundNo" label="退款单号" min-width="180" /><el-table-column label="金额" width="110"><template #default="{ row }">{{ fen(row.amountFen) }}</template></el-table-column><el-table-column prop="status" label="状态" width="110" /><el-table-column prop="reason" label="原因" min-width="150" show-overflow-tooltip /><el-table-column label="时间" width="170"><template #default="{ row }">{{ time(row.completedAt || row.createdAt) }}</template></el-table-column></el-table></section>

          <section><h3>业务快照</h3><pre class="snapshot">{{ snapshotText }}</pre></section>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.hint{margin-bottom:14px}.pager{margin-top:16px;justify-content:flex-end}small{display:block;color:#667085;margin-top:3px}.funds-card{margin-top:18px}.fund-head{display:flex;align-items:center;justify-content:space-between;gap:16px}.fund-head>div{display:flex;gap:8px;flex-wrap:wrap}.detail-body{min-height:240px}.detail-body section{margin-top:22px}.detail-body h3{margin:0 0 10px;font-size:16px}.snapshot{max-height:280px;margin:0;padding:14px;overflow:auto;background:#f6f8fa;border:1px solid #e5e7eb;border-radius:6px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.6}
@media(max-width:640px){.fund-head{align-items:flex-start;flex-direction:column}.fund-head>div{width:100%}.pager{overflow-x:auto;justify-content:flex-start}.detail-body :deep(.el-descriptions__body) .el-descriptions__table{table-layout:fixed}.detail-body :deep(.el-descriptions__label),.detail-body :deep(.el-descriptions__content){overflow-wrap:anywhere}.detail-body :deep(.el-descriptions__cell){display:block;width:100%}}
</style>
