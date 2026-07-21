<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Plus, Refresh, Search } from "@element-plus/icons-vue";
import { api } from "../api";
import { hasPermission, isPlatformAdmin } from "../permissions";
import { maskPhone } from "../privacy";

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const errorMessage = ref("");
const tenants = ref<any[]>([]);
const tenantErrorMessage = ref("");
const result = ref<any>(null);
const workOrders = ref<any[]>([]);
const assignees = ref<any[]>([]);
const assigneeErrorMessage = ref("");
const orderLoading = ref(false);
const orderErrorMessage = ref("");
const orderDrawer = ref(false);
const selectedOrder = ref<any>(null);
const creatingOrder = ref(false);
const orderDetailLoading = ref(false);
const orderDetailError = ref("");
const orderTargetId = ref<number | null>(null);
const orderActionKey = ref("");
const revealKey = ref("");
const revealedPhones = reactive<Record<number, string>>({});
const orderFilters = reactive({ status: "", priority: "" });
const orderForm = reactive({ tenantId: undefined as number | undefined, userId: undefined as number | undefined, assigneeId: undefined as number | undefined, title: "", description: "", category: "consultation", priority: "normal", businessType: "", businessId: "" });
const filters = reactive({
  keyword: "",
  tenantId: undefined as number | undefined
});
const canManageWorkOrders = computed(() => hasPermission("support.manage"));
const canRevealPhone = computed(() => hasPermission("support.sensitive"));

const summaryCards = computed(() => {
  const summary = result.value?.summary || {};
  return [
    { label: "用户", value: summary.userCount || 0, sub: "手机号/昵称命中" },
    { label: "报名", value: summary.registrationCount || 0, sub: "报名与签到码" },
    { label: "订单", value: summary.orderCount || 0, sub: `待付款 ${summary.pendingPayments || 0}` },
    { label: "退款", value: summary.refundCount || 0, sub: `待处理 ${summary.pendingRefunds || 0}` }
  ];
});

function formatTime(value?: string) {
  if (!value) return "-";
  return String(value).replace("T", " ").slice(0, 16);
}

function money(value?: string | number) {
  return Number(value || 0).toFixed(2);
}

function applyRouteQuery() {
  filters.keyword = typeof route.query.keyword === "string" ? route.query.keyword : "";
  if (isPlatformAdmin()) {
    const tenantId = Number(route.query.tenantId || 0);
    filters.tenantId = Number.isFinite(tenantId) && tenantId > 0 ? tenantId : undefined;
  }
}

function queryParams() {
  const params: Record<string, unknown> = { keyword: filters.keyword.trim() };
  if (isPlatformAdmin() && filters.tenantId) params.tenantId = filters.tenantId;
  return params;
}

function routeQueryFromParams(params: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(params).map(([key, value]) => [key, String(value)]));
}

async function loadTenants() {
  tenantErrorMessage.value = "";
  try {
    tenants.value = isPlatformAdmin() ? await api.get<any, any[]>("/admin/tenants") : [];
  } catch (error: any) {
    tenants.value = [];
    tenantErrorMessage.value = error.message || "商家列表加载失败";
  }
}

async function search() {
  if (filters.keyword.trim().length < 2) {
    ElMessage.warning("请输入至少 2 个字符");
    return;
  }
  loading.value = true;
  errorMessage.value = "";
  try {
    result.value = await api.get<any, any>("/admin/support/search", { params: queryParams() });
    await router.replace({ path: route.path, query: routeQueryFromParams(queryParams()) });
  } catch (error: any) {
    errorMessage.value = error.message || "客服查询失败";
  } finally {
    loading.value = false;
  }
}

async function revealPhone(user: any) {
  if (!canRevealPhone.value) return ElMessage.error("当前账号无敏感手机号查看权限");
  const key = `reveal:${user.id}`;
  if (revealKey.value) return;
  revealKey.value = key;
  try {
    const { value } = await ElMessageBox.prompt("请填写本次查看完整手机号的业务理由，操作将记入审计日志。", "授权查看手机号", { inputType: "textarea", confirmButtonText: "确认查看", cancelButtonText: "取消", inputValidator: (text) => Boolean(String(text || "").trim()) || "请填写查看理由" });
    const payload = await api.post<any, any>(`/admin/support/users/${user.id}/reveal-phone`, { reason: String(value || "").trim(), tenantId: isPlatformAdmin() ? filters.tenantId : undefined });
    revealedPhones[user.id] = payload.phone;
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "授权查看手机号失败");
  } finally {
    revealKey.value = "";
  }
}

async function loadWorkOrders() {
  orderLoading.value = true;
  orderErrorMessage.value = "";
  try {
    const params: Record<string, unknown> = {};
    if (isPlatformAdmin() && filters.tenantId) params.tenantId = filters.tenantId;
    if (orderFilters.status) params.status = orderFilters.status;
    if (orderFilters.priority) params.priority = orderFilters.priority;
    workOrders.value = await api.get<any, any[]>("/admin/support/work-orders", { params });
  } catch (error: any) {
    orderErrorMessage.value = error.message || "客服工单加载失败";
  } finally { orderLoading.value = false; }
}

async function loadAssignees(tenantId?: number) {
  const params: Record<string, unknown> = {};
  if (isPlatformAdmin() && (tenantId || filters.tenantId)) params.tenantId = tenantId || filters.tenantId;
  assigneeErrorMessage.value = "";
  try {
    assignees.value = await api.get<any, any[]>("/admin/support/assignees", { params });
  } catch (error: any) {
    assignees.value = [];
    assigneeErrorMessage.value = error.message || "客服负责人列表加载失败";
  }
}

function openCreateOrder(user?: any) {
  if (!canManageWorkOrders.value) return ElMessage.error("当前账号无客服工单处理权限");
  Object.assign(orderForm, { tenantId: isPlatformAdmin() ? filters.tenantId : undefined, userId: user?.id, assigneeId: undefined, title: user ? `${user.nickname || user.phone || "用户"}咨询` : "", description: "", category: "consultation", priority: "normal", businessType: "", businessId: "" });
  void loadAssignees(orderForm.tenantId);
  selectedOrder.value = null;
  creatingOrder.value = true;
  orderDrawer.value = true;
}

async function submitOrder() {
  if (!canManageWorkOrders.value) return ElMessage.error("当前账号无客服工单处理权限");
  if (orderActionKey.value) return;
  if (!orderForm.title.trim() || !orderForm.description.trim()) return ElMessage.warning("请填写工单标题和问题描述");
  orderActionKey.value = "create";
  try {
    await api.post("/admin/support/work-orders", { ...orderForm, tenantId: isPlatformAdmin() ? orderForm.tenantId || null : undefined, userId: orderForm.userId || null, businessType: orderForm.businessType || null, businessId: orderForm.businessId || null });
    ElMessage.success("工单已创建"); orderDrawer.value = false; await loadWorkOrders();
  } catch (error: any) {
    ElMessage.error(error.message || "工单创建失败");
  } finally {
    orderActionKey.value = "";
  }
}

async function openOrder(row: any) {
  creatingOrder.value = false;
  orderTargetId.value = Number(row.id);
  orderDrawer.value = true;
  orderDetailLoading.value = true;
  orderDetailError.value = "";
  selectedOrder.value = null;
  try {
    selectedOrder.value = await api.get<any, any>(`/admin/support/work-orders/${row.id}`);
    if (canManageWorkOrders.value) await loadAssignees(selectedOrder.value?.tenant?.id);
  } catch (error: any) {
    orderDetailError.value = error.message || "工单详情加载失败";
    ElMessage.error(orderDetailError.value);
  } finally {
    orderDetailLoading.value = false;
  }
}

async function retryOrder() {
  if (orderTargetId.value === null) return;
  await openOrder({ id: orderTargetId.value });
}

async function actOnOrder(status?: string) {
  if (!canManageWorkOrders.value) return ElMessage.error("当前账号无客服工单处理权限");
  if (!selectedOrder.value || orderActionKey.value) return;
  orderActionKey.value = `status:${selectedOrder.value.id}:${status || "keep"}`;
  const needsContent = status !== "closed";
  try {
    let content = "";
    if (needsContent) {
      const result = await ElMessageBox.prompt(status === "resolved" ? "请填写处理结论" : "请填写本次处理记录", "处理工单", { inputType: "textarea", confirmButtonText: "提交", cancelButtonText: "取消", inputValidator: (text) => Boolean(String(text || "").trim()) || "请填写处理记录" });
      content = String(result.value || "").trim();
    }
    selectedOrder.value = await api.patch<any, any>(`/admin/support/work-orders/${selectedOrder.value.id}`, { status, content: content || null, resolution: status === "resolved" ? content : null });
    ElMessage.success("工单已更新"); await loadWorkOrders();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "工单更新失败");
  } finally {
    orderActionKey.value = "";
  }
}

async function assignOrder(assigneeId?: number) {
  if (!canManageWorkOrders.value) return ElMessage.error("当前账号无客服工单处理权限");
  if (!selectedOrder.value || orderActionKey.value) return;
  orderActionKey.value = `assign:${selectedOrder.value.id}`;
  try {
    selectedOrder.value = await api.patch<any, any>(`/admin/support/work-orders/${selectedOrder.value.id}`, { assigneeId: assigneeId || null, content: assigneeId ? "调整工单负责人" : "取消工单负责人" });
    ElMessage.success("负责人已更新"); await loadWorkOrders();
  } catch (error: any) {
    ElMessage.error(error.message || "负责人更新失败");
  } finally {
    orderActionKey.value = "";
  }
}

function reset() {
  filters.keyword = "";
  filters.tenantId = undefined;
  result.value = null;
  router.replace({ path: route.path });
}

function go(path: string, query: Record<string, unknown>) {
  router.push({ path, query: routeQueryFromParams(Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ""))) });
}

function statusType(status?: string) {
  if (["approved", "paid", "completed", "sent", "success"].includes(String(status))) return "success";
  if (["pending", "pending_payment", "pending_review", "processing", "rate_limited"].includes(String(status))) return "warning";
  if (["failed", "rejected", "cancelled", "closed", "error"].includes(String(status))) return "danger";
  return "info";
}

watch(
  () => route.query,
  () => applyRouteQuery()
);

onMounted(async () => {
  applyRouteQuery();
  await loadTenants();
  await loadWorkOrders();
  if (canManageWorkOrders.value) await loadAssignees();
  if (filters.keyword.trim().length >= 2) await search();
});
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div>
        <h2>客服查询台</h2>
        <p>按手机号、订单号、报名人、活动名或签到码快速定位用户问题。</p>
      </div>
      <div class="toolbar-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家" style="width: 220px">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" />
        </el-select>
        <el-input v-model="filters.keyword" clearable placeholder="手机号 / 订单号 / 活动 / 签到码" style="width: 320px" @keyup.enter="search" />
        <el-button type="primary" :icon="Search" :loading="loading" @click="search">查询</el-button>
        <el-button @click="reset">重置</el-button>
      </div>
    </div>

    <el-alert v-if="result?.advice?.length" class="page-hint" type="warning" :closable="false" show-icon>
      <template #title>排查建议</template>
      <div class="advice-list">
        <span v-for="item in result.advice" :key="item">{{ item }}</span>
      </div>
    </el-alert>
    <el-alert v-if="tenantErrorMessage" class="page-error" type="error" show-icon :closable="false" :title="tenantErrorMessage"><template #default><el-button size="small" @click="loadTenants">重试商家列表</el-button></template></el-alert>

    <div class="metric-grid" v-loading="loading">
      <div v-for="item in summaryCards" :key="item.label" class="metric">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small>{{ item.sub }}</small>
      </div>
    </div>

    <div class="dashboard-grid">
      <div class="table-card">
        <h3>用户</h3>
        <el-table :data="result?.users || []" stripe empty-text="暂无用户命中">
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column label="手机号" width="190"><template #default="{ row }"><span>{{ revealedPhones[row.id] || maskPhone(row.phone) }}</span><el-button v-if="canRevealPhone && !revealedPhones[row.id]" size="small" link type="primary" :loading="revealKey === `reveal:${row.id}`" :disabled="Boolean(revealKey)" @click="revealPhone(row)">查看</el-button></template></el-table-column>
          <el-table-column prop="nickname" label="昵称" min-width="140" show-overflow-tooltip />
          <el-table-column label="最近登录" width="170"><template #default="{ row }">{{ formatTime(row.lastLoginAt) }}</template></el-table-column>
          <el-table-column label="操作" width="180">
            <template #default="{ row }">
              <el-button v-if="hasPermission('member.view')" size="small" link type="primary" @click="go('/members', { keyword: row.id })">会员</el-button>
              <el-button v-if="hasPermission('registration.view')" size="small" link type="primary" @click="go('/registrations', { userId: row.id })">报名</el-button>
              <el-button v-if="hasPermission('order.view')" size="small" link type="primary" @click="go('/orders', { userId: row.id })">订单</el-button>
              <el-button v-if="canManageWorkOrders" size="small" link type="success" @click="openCreateOrder(row)">建工单</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="table-card">
        <h3>验证码日志</h3>
        <el-table :data="result?.h5AuthCodeLogs || []" stripe empty-text="暂无验证码记录">
          <el-table-column label="时间" width="160"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
          <el-table-column label="手机号" width="130"><template #default="{ row }">{{ maskPhone(row.phone) }}</template></el-table-column>
          <el-table-column prop="mode" label="模式" width="90" />
          <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ row.status }}</el-tag></template></el-table-column>
          <el-table-column prop="message" label="说明" min-width="180" show-overflow-tooltip />
        </el-table>
      </div>
    </div>

    <div class="table-card">
      <h3>报名</h3>
      <el-table :data="result?.registrations || []" stripe empty-text="暂无报名命中">
        <el-table-column label="时间" width="160"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        <el-table-column label="状态" width="120"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ row.status }}</el-tag></template></el-table-column>
        <el-table-column label="手机号" width="130"><template #default="{ row }">{{ maskPhone(row.user?.phone) }}</template></el-table-column>
        <el-table-column prop="activity.title" label="活动" min-width="220" show-overflow-tooltip />
        <el-table-column prop="checkInCode" label="签到码" width="120" />
        <el-table-column prop="order.orderNo" label="订单号" width="170" show-overflow-tooltip />
        <el-table-column prop="reviewRemark" label="审核备注" min-width="180" show-overflow-tooltip />
      </el-table>
    </div>

    <div class="table-card">
      <h3>订单</h3>
      <el-table :data="result?.orders || []" stripe empty-text="暂无订单命中">
        <el-table-column label="时间" width="160"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        <el-table-column prop="orderNo" label="订单号" width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="120"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ row.status }}</el-tag></template></el-table-column>
        <el-table-column label="金额" width="110"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
        <el-table-column prop="paymentMethod" label="支付方式" width="110" />
        <el-table-column label="手机号" width="130"><template #default="{ row }">{{ maskPhone(row.user?.phone) }}</template></el-table-column>
        <el-table-column prop="activity.title" label="活动" min-width="220" show-overflow-tooltip />
        <el-table-column v-if="hasPermission('order.view')" label="操作" width="120"><template #default="{ row }"><el-button size="small" link type="primary" @click="go('/orders', { keyword: row.orderNo })">打开</el-button></template></el-table-column>
      </el-table>
    </div>

    <div class="dashboard-grid">
      <div class="table-card">
        <h3>退款</h3>
        <el-table :data="result?.refunds || []" stripe empty-text="暂无退款命中">
          <el-table-column label="时间" width="150"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
          <el-table-column prop="refundNo" label="退款号" width="170" show-overflow-tooltip />
          <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ row.status }}</el-tag></template></el-table-column>
          <el-table-column label="金额" width="100"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          <el-table-column prop="providerRefundStatus" label="渠道状态" width="120" />
          <el-table-column prop="reason" label="原因" min-width="180" show-overflow-tooltip />
        </el-table>
      </div>

      <div class="table-card">
        <h3>通知</h3>
        <el-table :data="result?.notifications || []" stripe empty-text="暂无通知命中">
          <el-table-column label="时间" width="150"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
          <el-table-column prop="channel" label="渠道" width="90" />
          <el-table-column prop="title" label="标题" min-width="180" show-overflow-tooltip />
          <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ row.status }}</el-tag></template></el-table-column>
          <el-table-column prop="errorMessage" label="失败原因" min-width="180" show-overflow-tooltip />
        </el-table>
      </div>
    </div>
    <el-alert v-if="errorMessage" class="page-error" type="error" show-icon :closable="false" :title="errorMessage"><template #default><el-button size="small" @click="search">重试</el-button></template></el-alert>

    <div class="table-card work-order-card">
      <el-alert v-if="orderErrorMessage" class="page-error" type="error" show-icon :closable="false" :title="orderErrorMessage"><template #default><el-button size="small" @click="loadWorkOrders">重试</el-button></template></el-alert>
      <div class="section-toolbar"><h3>客服工单</h3><div><el-select v-model="orderFilters.status" clearable placeholder="全部状态" style="width:130px" @change="loadWorkOrders"><el-option v-for="item in ['open','assigned','processing','waiting_user','resolved','closed']" :key="item" :label="item" :value="item" /></el-select><el-select v-model="orderFilters.priority" clearable placeholder="全部优先级" style="width:130px" @change="loadWorkOrders"><el-option v-for="item in ['low','normal','high','urgent']" :key="item" :label="item" :value="item" /></el-select><el-button :icon="Refresh" :loading="orderLoading" @click="loadWorkOrders">刷新</el-button><el-button v-if="canManageWorkOrders" type="primary" :icon="Plus" :disabled="Boolean(orderActionKey)" @click="openCreateOrder()">新建工单</el-button></div></div>
      <el-table v-loading="orderLoading" :data="workOrders" stripe empty-text="暂无客服工单">
        <el-table-column prop="orderNo" label="工单号" width="190" /><el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip /><el-table-column label="用户" width="130"><template #default="{ row }">{{ maskPhone(row.user?.phone) }}</template></el-table-column><el-table-column prop="priority" label="优先级" width="100" /><el-table-column label="状态" width="120"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ row.status }}</el-tag></template></el-table-column><el-table-column prop="assignee.username" label="负责人" width="120" /><el-table-column label="SLA" width="170"><template #default="{ row }">{{ formatTime(row.dueAt) }}</template></el-table-column><el-table-column label="操作" width="100"><template #default="{ row }"><el-button size="small" link type="primary" @click="openOrder(row)">{{ canManageWorkOrders ? '处理' : '查看' }}</el-button></template></el-table-column>
      </el-table>
    </div>

    <el-drawer v-model="orderDrawer" :title="selectedOrder ? `工单 ${selectedOrder.orderNo}` : '新建客服工单'" size="720px">
      <div v-loading="orderDetailLoading">
      <el-alert v-if="orderDetailError" type="error" show-icon :closable="false" :title="orderDetailError"><template #default><el-button size="small" :loading="orderDetailLoading" @click="retryOrder">重试</el-button></template></el-alert>
      <template v-if="creatingOrder"><el-alert v-if="assigneeErrorMessage" type="error" show-icon :closable="false" :title="assigneeErrorMessage"><template #default><el-button size="small" @click="loadAssignees(orderForm.tenantId)">重试负责人列表</el-button></template></el-alert><el-form label-position="top"><el-form-item v-if="isPlatformAdmin()" label="所属商家"><el-select v-model="orderForm.tenantId" clearable filterable @change="loadAssignees(orderForm.tenantId)"><el-option v-for="tenant in tenants" :key="tenant.id" :label="tenant.name || tenant.code" :value="tenant.id" /></el-select></el-form-item><el-form-item label="标题"><el-input v-model="orderForm.title" /></el-form-item><el-form-item label="问题描述"><el-input v-model="orderForm.description" type="textarea" :rows="6" /></el-form-item><div class="form-grid"><el-form-item label="分类"><el-select v-model="orderForm.category"><el-option v-for="item in ['consultation','registration','payment','refund','check_in','course','mall','complaint','other']" :key="item" :label="item" :value="item" /></el-select></el-form-item><el-form-item label="优先级"><el-select v-model="orderForm.priority"><el-option v-for="item in ['low','normal','high','urgent']" :key="item" :label="item" :value="item" /></el-select></el-form-item><el-form-item label="负责人"><el-select v-model="orderForm.assigneeId" clearable filterable placeholder="暂不指派"><el-option v-for="item in assignees" :key="item.id" :label="item.username" :value="item.id" /></el-select></el-form-item></div></el-form></template>
      <template v-else-if="selectedOrder"><el-descriptions :column="2" border><el-descriptions-item label="标题">{{ selectedOrder.title }}</el-descriptions-item><el-descriptions-item label="状态">{{ selectedOrder.status }}</el-descriptions-item><el-descriptions-item label="优先级">{{ selectedOrder.priority }}</el-descriptions-item><el-descriptions-item label="负责人"><el-select v-if="canManageWorkOrders" :model-value="selectedOrder.assignee?.id" clearable filterable placeholder="未指派" :disabled="Boolean(orderActionKey)" @change="assignOrder"><el-option v-for="item in assignees" :key="item.id" :label="item.username" :value="item.id" /></el-select><span v-else>{{ selectedOrder.assignee?.username || '未指派' }}</span></el-descriptions-item><el-descriptions-item label="问题描述" :span="2">{{ selectedOrder.description }}</el-descriptions-item><el-descriptions-item v-if="selectedOrder.resolution" label="处理结论" :span="2">{{ selectedOrder.resolution }}</el-descriptions-item></el-descriptions><h3>处理轨迹</h3><el-timeline><el-timeline-item v-for="log in selectedOrder.logs || []" :key="log.id" :timestamp="formatTime(log.createdAt)"><strong>{{ log.operatorName }} · {{ log.action }}</strong><div>{{ log.content || `${log.fromStatus || '-'} → ${log.toStatus || '-'}` }}</div></el-timeline-item></el-timeline></template>
      </div>
      <template #footer><template v-if="creatingOrder && canManageWorkOrders"><el-button @click="orderDrawer=false">取消</el-button><el-button type="primary" :loading="orderActionKey === 'create'" :disabled="Boolean(orderActionKey)" @click="submitOrder">创建工单</el-button></template><template v-else-if="selectedOrder && canManageWorkOrders"><el-button v-if="selectedOrder.status === 'closed'" type="warning" :loading="orderActionKey.includes('status:')" :disabled="Boolean(orderActionKey)" @click="actOnOrder('processing')">重开</el-button><el-button v-if="!['resolved','closed'].includes(selectedOrder.status)" :loading="orderActionKey.includes('status:')" :disabled="Boolean(orderActionKey)" @click="actOnOrder('waiting_user')">等待用户</el-button><el-button v-if="!['resolved','closed'].includes(selectedOrder.status)" type="primary" :loading="orderActionKey.includes('status:')" :disabled="Boolean(orderActionKey)" @click="actOnOrder('processing')">回复并处理中</el-button><el-button v-if="!['resolved','closed'].includes(selectedOrder.status)" type="success" :loading="orderActionKey.includes('status:')" :disabled="Boolean(orderActionKey)" @click="actOnOrder('resolved')">解决</el-button><el-button v-if="selectedOrder.status === 'resolved'" type="danger" :loading="orderActionKey.includes('status:')" :disabled="Boolean(orderActionKey)" @click="actOnOrder('closed')">关闭</el-button></template></template>
    </el-drawer>
  </div>
</template>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
.toolbar h2 { margin: 0 0 6px; }
.toolbar p { margin: 0; color: #7a7f8a; }
.toolbar-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.advice-list { display: flex; flex-direction: column; gap: 4px; }
.section-toolbar { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:12px; }
.section-toolbar h3 { margin:0; }
.section-toolbar > div { display:flex; gap:8px; flex-wrap:wrap; }
.work-order-card { margin-top:16px; }
.form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
</style>
