<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { ChatLineSquare, Clock, Download, EditPen, Money, RefreshLeft, Search } from "@element-plus/icons-vue";
import { OrderStatus, orderStatusText } from "@activity/shared";
import { api, downloadFile } from "../api";
import { isPlatformAdmin } from "../permissions";

type PageResult<T> = { items: T[]; total: number; page: number; pageSize: number };

const route = useRoute();
const router = useRouter();
const rows = ref<any[]>([]);
const agents = ref<any[]>([]);
const tenants = ref<any[]>([]);
const loading = ref(false);
const refundDialog = ref(false);
const refunding = ref(false);
const closingExpired = ref(false);
const refundTarget = ref<any | null>(null);
const remarkDialog = ref(false);
const remarkSaving = ref(false);
const remarkOrder = ref<any | null>(null);
const remarkText = ref("");
const refundForm = reactive({ amount: 0, reason: "", refundNo: "" });
function routeOrderStatus() {
  const status = typeof route.query.status === "string" ? route.query.status : "";
  return Object.values(OrderStatus).includes(status as OrderStatus) ? status : "";
}

function routeActivityId() {
  const activityId = typeof route.query.activityId === "string" ? Number(route.query.activityId) : undefined;
  return activityId && Number.isFinite(activityId) ? activityId : undefined;
}

function routeTenantId() {
  const tenantId = typeof route.query.tenantId === "string" ? Number(route.query.tenantId) : undefined;
  return isPlatformAdmin() && tenantId && Number.isFinite(tenantId) ? tenantId : undefined;
}

const filters = reactive({ status: routeOrderStatus(), keyword: "", activityId: routeActivityId() as number | undefined, agentId: undefined as number | undefined, tenantId: routeTenantId() as number | undefined, page: 1, pageSize: 20 });
const total = ref(0);

const maxRefundAmount = computed(() => Number(refundTarget.value?.amount || 0));
const focusedActivityName = computed(() => {
  if (!filters.activityId) return "";
  return rows.value.find((row) => row.registration?.activity?.id === filters.activityId)?.registration?.activity?.title || `活动 ID ${filters.activityId}`;
});

function queryParams() {
  return {
    status: filters.status || undefined,
    keyword: filters.keyword.trim() || undefined,
    activityId: filters.activityId || undefined,
    agentId: filters.agentId || undefined,
    tenantId: isPlatformAdmin() ? filters.tenantId || undefined : undefined,
    page: filters.page,
    pageSize: filters.pageSize
  };
}

async function load() {
  loading.value = true;
  try {
    const result = await api.get<any, PageResult<any>>("/admin/orders", { params: queryParams() });
    rows.value = result.items || [];
    total.value = result.total || 0;
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

function search() {
  filters.page = 1;
  load();
}

function clearActivityFilter() {
  filters.activityId = undefined;
  filters.page = 1;
  router.replace({
    path: "/orders",
    query: {
      tenantId: isPlatformAdmin() && filters.tenantId ? filters.tenantId : undefined,
      status: filters.status || undefined
    }
  });
  load();
}

function changeTenant() {
  filters.agentId = undefined;
  search();
  loadAgents();
}

async function confirm(row: any) {
  const { value } = await ElMessageBox.prompt(`确认订单 ${row.orderNo} 已完成线下收款？确认后报名状态会继续流转，用户端也会看到付款成功。`, "确认线下收款", { inputValue: "线下已收款", confirmButtonText: "确认收款", cancelButtonText: "再核对一下", type: "warning" });
  await api.post(`/admin/orders/${row.id}/confirm-offline-payment`, { remark: value });
  ElMessage.success("已确认收款");
  load();
}

function canRefund(row: any) {
  return [OrderStatus.Paid, OrderStatus.PartiallyRefunded].includes(row.status);
}

function canConfirm(row: any) {
  return row.paymentMethod === "offline" && row.status === OrderStatus.PendingPayment && !isExpired(row);
}

function isExpired(row: any) {
  return row.expiresAt && new Date(row.expiresAt).getTime() <= Date.now();
}

function openRefund(row: any) {
  refundTarget.value = row;
  Object.assign(refundForm, { amount: Number(row.amount), reason: "运营后台退款", refundNo: "" });
  refundDialog.value = true;
}

function openRemark(row: any) {
  remarkOrder.value = row;
  remarkText.value = row.remark || "";
  remarkDialog.value = true;
}

async function saveRemark() {
  if (!remarkOrder.value) return;
  remarkSaving.value = true;
  try {
    await api.patch(`/admin/orders/${remarkOrder.value.id}/remark`, { remark: remarkText.value.trim() });
    ElMessage.success("备注已保存");
    remarkDialog.value = false;
    load();
  } catch (err: any) {
    ElMessage.error(err.message);
  } finally {
    remarkSaving.value = false;
  }
}

async function refund() {
  if (!refundTarget.value) return;
  if (refundForm.amount <= 0) {
    ElMessage.warning("退款金额必须大于 0");
    return;
  }
  if (refundForm.amount > maxRefundAmount.value) {
    ElMessage.warning("退款金额不能超过订单实付金额");
    return;
  }
  refunding.value = true;
  try {
    await api.post(`/admin/orders/${refundTarget.value.id}/refund`, { amount: refundForm.amount, reason: refundForm.reason, refundNo: refundForm.refundNo || undefined });
    ElMessage.success("退款申请已提交，等待财务审核");
    refundDialog.value = false;
    load();
  } catch (error: any) {
    ElMessage.error(error.message);
  } finally {
    refunding.value = false;
  }
}

async function exportOrders() {
  try {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
    if (filters.activityId) params.set("activityId", String(filters.activityId));
    if (filters.agentId) params.set("agentId", String(filters.agentId));
    if (isPlatformAdmin() && filters.tenantId) params.set("tenantId", String(filters.tenantId));
    const query = params.toString();
    await downloadFile(`/admin/orders/export${query ? `?${query}` : ""}`, "订单记录.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出失败");
  }
}

async function closeExpiredOrders() {
  await ElMessageBox.confirm("系统会关闭所有已超过付款截止时间的待付款订单，并取消对应报名、释放名额。这个动作适合在核对完线下收款后执行。", "关闭过期订单", { type: "warning", confirmButtonText: "确认关闭", cancelButtonText: "暂不处理" });
  closingExpired.value = true;
  try {
    const result = await api.post<any, { closedCount: number }>("/admin/orders/close-expired", {});
    ElMessage.success(`已关闭 ${result.closedCount} 个过期待付款订单`);
    load();
  } catch (error: any) {
    ElMessage.error(error.message || "关闭失败");
  } finally {
    closingExpired.value = false;
  }
}

function formatTime(value?: string) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
}

function money(value: string | number | undefined) {
  return Number(value || 0).toFixed(2);
}

function paymentMethodLabel(value?: string) {
  const labels: Record<string, string> = {
    free: "免费报名",
    wechat: "微信支付",
    alipay: "支付宝",
    balance: "余额支付",
    offline: "线下收款 / 人工确认"
  };
  return value ? labels[value] || value : "-";
}

function tenantDisplayName(row: any) {
  return row.tenant?.name || row.tenant?.code || row.registration?.activity?.tenant?.name || row.registration?.activity?.tenant?.code || "平台";
}

onMounted(() => {
  load();
  loadAgents();
  loadTenants();
});

watch(
  () => [route.query.status, route.query.activityId, route.query.tenantId],
  () => {
    const nextStatus = routeOrderStatus();
    const nextActivityId = routeActivityId();
    const nextTenantId = routeTenantId();
    if (filters.status !== nextStatus || filters.activityId !== nextActivityId || filters.tenantId !== nextTenantId) {
      filters.status = nextStatus;
      filters.activityId = nextActivityId;
      filters.tenantId = nextTenantId;
      filters.page = 1;
      loadAgents();
      load();
    }
  }
);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>{{ isPlatformAdmin() ? "全局订单" : "订单管理" }}</h2>
      <div class="toolbar-actions">
        <el-button :icon="Clock" :loading="closingExpired" @click="closeExpiredOrders">关闭过期订单</el-button>
        <el-button :icon="Download" @click="exportOrders">导出 Excel</el-button>
      </div>
    </div>

    <el-alert
      class="page-hint"
      type="info"
      :closable="false"
      show-icon
      :title="isPlatformAdmin() ? '平台财务监管' : '运营提示'"
      :description="isPlatformAdmin() ? '可按商家查看订单、支付状态和退款状态；执行收款或退款前请确认该商家的支付记录。' : '确认收款仅用于历史线下订单；退款申请提交后会进入财务审核，不会立即改为已退款。'"
    />

    <div class="table-card">
      <el-alert
        v-if="filters.activityId"
        class="activity-alert"
        type="success"
        show-icon
        :closable="false"
        title="已按复盘活动筛选订单"
        :description="`当前仅查看「${focusedActivityName}」的订单，可用于跟进待付款、确认历史线下收款和核对退款。`"
      />
      <el-form class="filters" inline>
        <el-form-item label="状态">
          <el-select v-model="filters.status" clearable style="width: 160px" @change="search">
            <el-option v-for="(text, key) in orderStatusText" :key="key" :label="text" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isPlatformAdmin()" label="商家">
          <el-select v-model="filters.tenantId" clearable filterable placeholder="全部商家" style="width: 180px" @change="changeTenant">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenant.name" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="代理">
          <el-select v-model="filters.agentId" clearable filterable placeholder="全部代理" style="width: 180px" @change="search">
            <el-option v-for="agent in agents" :key="agent.id" :label="agent.name" :value="agent.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="filters.keyword" clearable placeholder="搜索订单号、活动、手机号" style="width: 260px" @keyup.enter="search" @clear="search" />
        </el-form-item>
        <el-button type="primary" :icon="Search" @click="search">筛选</el-button>
        <el-button v-if="filters.activityId" @click="clearActivityFilter">查看全部活动订单</el-button>
      </el-form>

      <el-empty v-if="!loading && !rows.length" description="暂无匹配订单">
        <el-button type="primary" @click="search">重新筛选</el-button>
      </el-empty>
      <el-table v-else v-loading="loading" :data="rows" stripe>
        <el-table-column prop="orderNo" label="订单号" width="190" />
        <el-table-column label="活动" min-width="220"><template #default="{ row }">{{ row.registration?.activity?.title || "-" }}</template></el-table-column>
        <el-table-column v-if="isPlatformAdmin()" label="所属商家" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ tenantDisplayName(row) }}</template>
        </el-table-column>
        <el-table-column label="代理" min-width="150" show-overflow-tooltip><template #default="{ row }">{{ row.agent?.name || "平台自营" }}</template></el-table-column>
        <el-table-column label="用户" min-width="150">
          <template #default="{ row }">
            <div>{{ row.registration?.user?.phone || "-" }}</div>
            <small>{{ row.registration?.user?.nickname || "本地 H5 用户" }}</small>
          </template>
        </el-table-column>
        <el-table-column label="票种/优惠" min-width="180">
          <template #default="{ row }">
            <div>{{ row.ticketType?.name || "标准报名" }}</div>
            <small v-if="row.memberLevel">会员：{{ row.memberLevel.name }}</small>
            <small v-if="row.coupon">优惠码：{{ row.coupon.code }}</small>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="170">
          <template #default="{ row }">
            <div>实付 ¥{{ money(row.amount) }}</div>
            <small>原价 ¥{{ money(row.originalAmount || row.amount) }} / 优惠 ¥{{ money(row.discountAmount) }}</small>
          </template>
        </el-table-column>
        <el-table-column label="支付方式" width="150"><template #default="{ row }">{{ paymentMethodLabel(row.paymentMethod) }}</template></el-table-column>
        <el-table-column label="状态" width="120"><template #default="{ row }"><el-tag>{{ orderStatusText[row.status as OrderStatus] }}</el-tag></template></el-table-column>
        <el-table-column label="付款截止" width="170">
          <template #default="{ row }">
            <div>{{ formatTime(row.expiresAt) }}</div>
            <small v-if="row.status === OrderStatus.PendingPayment && isExpired(row)" class="danger">已超时</small>
          </template>
        </el-table-column>
        <el-table-column prop="paidByAdmin" label="确认人" width="120" />
        <el-table-column label="备注" min-width="180">
          <template #default="{ row }">
            <div class="remark-cell" @click="openRemark(row)">
              <div v-if="row.remark" class="remark-text">{{ row.remark }}</div>
              <div v-else class="remark-placeholder">点击添加内部备注</div>
            </div>
            <small v-if="row.paidRemark">收款：{{ row.paidRemark }}</small>
            <small v-if="row.closeReason">关闭：{{ row.closeReason }}</small>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :icon="ChatLineSquare" @click="openRemark(row)">备注</el-button>
            <el-button size="small" type="success" :icon="Money" :disabled="!canConfirm(row)" @click="confirm(row)">收款</el-button>
            <el-button size="small" type="warning" :icon="RefreshLeft" :disabled="!canRefund(row)" @click="openRefund(row)">申请退款</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="filters.page"
          v-model:page-size="filters.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="search"
          @current-change="load"
        />
      </div>
    </div>

    <el-dialog v-model="refundDialog" width="520px" title="申请订单退款">
      <el-form label-position="top">
        <el-form-item label="订单号"><el-input :model-value="refundTarget?.orderNo" disabled /></el-form-item>
        <el-form-item label="实付金额"><el-input :model-value="`¥${money(refundTarget?.amount)}`" disabled /></el-form-item>
        <el-form-item label="退款金额"><el-input-number v-model="refundForm.amount" :min="0.01" :max="maxRefundAmount" :precision="2" style="width: 180px" /></el-form-item>
        <el-form-item label="申请原因"><el-input v-model="refundForm.reason" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="退款号"><el-input v-model="refundForm.refundNo" placeholder="不填则系统自动生成" /></el-form-item>
        <el-alert type="warning" :closable="false" show-icon title="退款会先进入财务审核" description="审核通过后才会更新订单、报名和积分状态。请确认退款金额、原因和线下沟通记录。" />
      </el-form>
      <template #footer><el-button @click="refundDialog=false">取消</el-button><el-button type="primary" :loading="refunding" @click="refund">提交申请</el-button></template>
    </el-dialog>


    <el-dialog v-model="remarkDialog" width="520px" title="编辑备注">
      <el-form label-position="top">
        <el-form-item label="订单号"><el-input :model-value="remarkOrder?.orderNo" disabled /></el-form-item>
        <el-form-item label="备注内容"><el-input v-model="remarkText" type="textarea" :rows="4" placeholder="添加内部备注，仅后台可见" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="remarkDialog=false">取消</el-button><el-button type="primary" :loading="remarkSaving" @click="saveRemark">保存备注</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
small { color: #667085; display: block; line-height: 1.5; }
.remark-cell { cursor: pointer; min-height: 22px; }
.remark-cell:hover { color: #0f766e; }
.remark-text { color: #334155; font-size: 13px; line-height: 1.5; white-space: pre-wrap; }
.remark-placeholder { color: #98a2b3; font-size: 12px; }
.danger { color: #dc2626; }
.toolbar-actions { display: flex; gap: 10px; }
.page-hint { margin-bottom: 14px; }
.activity-alert { margin-bottom: 14px; }
.filters { margin-bottom: 12px; }
.pagination { display: flex; justify-content: flex-end; padding-top: 16px; }
</style>
