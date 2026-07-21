<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Bell, Check, CircleClose, Close, Download, Finished, PriceTag, Printer, Search } from "@element-plus/icons-vue";
import { OrderStatus, RegistrationStatus, orderStatusText, registrationStatusText } from "@activity/shared";
import { api, downloadExport } from "../api";
import { canAccess, isPlatformAdmin } from "../permissions";

type PageResult<T> = { items: T[]; total: number; page: number; pageSize: number };

const route = useRoute();
const router = useRouter();
const rows = ref<any[]>([]);
const activities = ref<any[]>([]);
const tenants = ref<any[]>([]);
const loading = ref(false);
const errorMessage = ref("");
const tenantErrorMessage = ref("");
const activityErrorMessage = ref("");
const exporting = ref(false);
const bulkApproving = ref(false);
const bulkRejecting = ref(false);
const actionKey = ref("");
const selectedRows = ref<any[]>([]);
function routeTenantId() {
  const tenantId = typeof route.query.tenantId === "string" ? Number(route.query.tenantId) : undefined;
  return isPlatformAdmin() && tenantId && Number.isFinite(tenantId) ? tenantId : undefined;
}
function routeRegistrationStatus() {
  const status = typeof route.query.status === "string" ? route.query.status : "";
  return Object.values(RegistrationStatus).includes(status as RegistrationStatus) ? status : "";
}
function routeActivityId() {
  const activityId = typeof route.query.activityId === "string" ? Number(route.query.activityId) : undefined;
  return activityId && Number.isFinite(activityId) ? activityId : undefined;
}
function routeUserId() {
  const userId = typeof route.query.userId === "string" ? Number(route.query.userId) : undefined;
  return userId && Number.isInteger(userId) && userId > 0 ? userId : undefined;
}
const query = reactive({
  activityId: routeActivityId() as number | undefined,
  userId: routeUserId() as number | undefined,
  tenantId: routeTenantId() as number | undefined,
  status: routeRegistrationStatus(),
  keyword: "",
  page: 1,
  pageSize: 20
});
const total = ref(0);
const writeLocked = computed(() => Boolean(actionKey.value) || exporting.value);
const canOperateRegistrations = canAccess(["registration.manage"]);
const canCheckInRegistrations = canAccess(["checkin.manage"]);
const canViewRegistrationOrders = canAccess(["order.view", "finance.view", "finance.manage"]);
const pageTitle = computed(() => (isPlatformAdmin() ? "全局报名" : "报名管理"));
const operateHintTitle = computed(() => (isPlatformAdmin() ? "平台报名监管" : "审核提示"));
const operateHintDescription = computed(() =>
  isPlatformAdmin()
    ? "可跨商家查看报名、审核状态和关联订单；处理异常报名时请先确认所属商家和活动名额。"
    : "审核、拒绝和取消都会同步影响用户端状态。处理前建议先核对报名内容、付款状态和活动名额。"
);
const readonlyDescription = canViewRegistrationOrders
  ? "当前财务账号可查看报名、关联订单、金额和支付状态，用于对账核对；审核、拒绝、取消和导出仍由商家管理员或运营人员处理。"
  : "当前签到账号可只读查询报名状态和报名内容，用于现场核对；审核、拒绝、取消和导出仍由商家管理员或运营人员处理。";
const focusedActivityName = computed(() => {
  if (!query.activityId) return "";
  return activities.value.find((activity) => activity.id === query.activityId)?.title || rows.value.find((row) => row.activity?.id === query.activityId)?.activity?.title || `活动 ID ${query.activityId}`;
});
const exportScopeText = computed(() => {
  const parts = [];
  if (isPlatformAdmin() && query.tenantId) parts.push(`商家：${tenants.value.find((tenant) => tenant.id === query.tenantId)?.name || query.tenantId}`);
  if (query.activityId) parts.push(`活动：${focusedActivityName.value}`);
  if (query.userId) parts.push(`用户 ID：${query.userId}`);
  if (query.status) parts.push(`状态：${registrationStatusText[query.status as RegistrationStatus] || query.status}`);
  if (query.keyword.trim()) parts.push(`关键词：${query.keyword.trim()}`);
  return parts.length ? parts.join(" / ") : "全部可见报名";
});

function queryParams() {
  return {
    activityId: query.activityId || undefined,
    userId: query.userId || undefined,
    tenantId: isPlatformAdmin() ? query.tenantId || undefined : undefined,
    status: query.status || undefined,
    keyword: query.keyword.trim() || undefined,
    page: query.page,
    pageSize: query.pageSize
  };
}

async function load() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const result = await api.get<any, PageResult<any>>("/admin/registrations", { params: queryParams() });
    rows.value = result.items || [];
    total.value = result.total || 0;
    selectedRows.value = [];
  } catch (error: any) {
    errorMessage.value = error.message || "加载报名失败";
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

async function loadActivities() {
  activityErrorMessage.value = "";
  try {
    const result = await api.get<any, any>("/admin/activities", { params: { page: 1, pageSize: 100, tenantId: isPlatformAdmin() ? query.tenantId || undefined : undefined } });
    activities.value = Array.isArray(result) ? result : result.items || [];
  } catch (error: any) {
    activities.value = [];
    activityErrorMessage.value = error.message || "活动筛选项加载失败";
  }
}

async function loadTenants() {
  tenantErrorMessage.value = "";
  try {
    tenants.value = isPlatformAdmin() ? await api.get<any, any[]>("/admin/tenants") : [];
  } catch (error: any) {
    tenants.value = [];
    tenantErrorMessage.value = error.message || "商家筛选项加载失败";
  }
}

async function retryScopeFilters() {
  await loadTenants();
  await loadActivities();
}

function search() {
  if (query.keyword.trim() && query.userId) {
    query.userId = undefined;
    void router.replace({ path: "/registrations", query: { tenantId: isPlatformAdmin() && query.tenantId ? query.tenantId : undefined, status: query.status || undefined, activityId: query.activityId || undefined } });
  }
  query.page = 1;
  load();
}

function clearUserFilter() {
  query.userId = undefined;
  query.page = 1;
  router.replace({
    path: "/registrations",
    query: {
      tenantId: isPlatformAdmin() && query.tenantId ? query.tenantId : undefined,
      status: query.status || undefined,
      activityId: query.activityId || undefined
    }
  });
  load();
}

function clearActivityFilter() {
  query.activityId = undefined;
  query.page = 1;
  router.replace({
    path: "/registrations",
    query: {
      tenantId: isPlatformAdmin() && query.tenantId ? query.tenantId : undefined,
      status: query.status || undefined,
      userId: query.userId || undefined
    }
  });
  load();
}

function changeTenant() {
  query.activityId = undefined;
  search();
  loadActivities();
}

function canApprove(row: any) {
  return canOperateRegistrations && row.status === RegistrationStatus.PendingReview;
}

function canReject(row: any) {
  return canOperateRegistrations && [RegistrationStatus.PendingReview, RegistrationStatus.PendingPayment].includes(row.status);
}

function canCancel(row: any) {
  return canOperateRegistrations && ![RegistrationStatus.Cancelled, RegistrationStatus.CheckedIn].includes(row.status);
}

const selectedPendingRows = computed(() => selectedRows.value.filter((row) => row.status === RegistrationStatus.PendingReview));

function handleSelectionChange(selection: any[]) {
  if (writeLocked.value) return;
  selectedRows.value = selection;
}

function bulkResultMessage(result: any) {
  if (!result.failed) return `已处理 ${result.succeeded || 0} 条报名`;
  const firstFailure = (result.results || []).find((item: any) => !item.success)?.message;
  return `成功 ${result.succeeded || 0} 条，失败 ${result.failed || 0} 条${firstFailure ? `：${firstFailure}` : ""}`;
}

async function bulkApprove() {
  if (writeLocked.value) return;
  const ids = selectedPendingRows.value.map((row) => row.id);
  if (!ids.length) return ElMessage.warning("请勾选待审核报名");
  actionKey.value = "bulk-approve";
  bulkApproving.value = true;
  try {
    await ElMessageBox.confirm(`确认批量通过选中的 ${ids.length} 条待审核报名？系统仍会逐条检查付款、状态和权限。`, "批量审核通过", { type: "success", confirmButtonText: "确认批量通过", cancelButtonText: "再核对一下" });
    const result = await api.post<any, any>("/admin/registrations/bulk-approve", { ids, remark: "后台批量审核通过" });
    result.failed ? ElMessage.warning(bulkResultMessage(result)) : ElMessage.success(bulkResultMessage(result));
    await load();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(error.message || "批量审核失败");
  } finally {
    bulkApproving.value = false;
    actionKey.value = "";
  }
}

async function bulkReject() {
  if (writeLocked.value) return;
  const ids = selectedPendingRows.value.map((row) => row.id);
  if (!ids.length) return ElMessage.warning("请勾选待审核报名");
  actionKey.value = "bulk-reject";
  bulkRejecting.value = true;
  try {
    const { value } = await ElMessageBox.prompt(`将批量拒绝选中的 ${ids.length} 条待审核报名，请填写统一原因。`, "批量拒绝报名", { inputValue: "不符合报名条件", confirmButtonText: "确认批量拒绝", cancelButtonText: "返回", type: "warning" });
    const result = await api.post<any, any>("/admin/registrations/bulk-reject", { ids, remark: value });
    result.failed ? ElMessage.warning(bulkResultMessage(result)) : ElMessage.success(bulkResultMessage(result));
    await load();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(error.message || "批量拒绝失败");
  } finally {
    bulkRejecting.value = false;
    actionKey.value = "";
  }
}

async function bulkNotify() {
  if (writeLocked.value) return;
  if (!selectedRows.value.length) return ElMessage.warning("请勾选需要通知的报名");
  actionKey.value = "bulk-notify";
  try {
    const titleResult = await ElMessageBox.prompt("通知会发送到用户站内消息。标题支持简洁说明处理事项。", "批量发送通知", { inputValue: focusedActivityName.value ? `${focusedActivityName.value}活动通知` : "活动报名通知", inputPlaceholder: "通知标题", confirmButtonText: "下一步", cancelButtonText: "取消" });
    const contentResult = await ElMessageBox.prompt("填写通知正文，可使用 {user} 和 {activity} 变量。", "通知内容", { inputValue: "{user}，你报名的「{activity}」有新的安排，请及时查看活动详情。", inputType: "textarea", confirmButtonText: "确认发送", cancelButtonText: "取消" });
    const result = await api.post<any, any>("/admin/registrations/bulk-notify", { ids: selectedRows.value.map((row) => row.id), title: titleResult.value, content: contentResult.value });
    result.failed ? ElMessage.warning(bulkResultMessage(result)) : ElMessage.success(`已发送 ${result.succeeded} 条通知`);
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(error.message || "批量通知失败");
  } finally {
    actionKey.value = "";
  }
}

async function bulkTag() {
  if (writeLocked.value) return;
  if (!selectedRows.value.length) return ElMessage.warning("请勾选需要标记的报名");
  actionKey.value = "bulk-tag";
  try {
    const { value } = await ElMessageBox.prompt("标签会写入会员档案，可用于后续分群、通知和复盘。", "批量添加会员标签", { inputValue: focusedActivityName.value ? `${focusedActivityName.value}-报名用户` : "活动报名用户", inputPlaceholder: "标签名称", confirmButtonText: "确认添加", cancelButtonText: "取消" });
    const result = await api.post<any, any>("/admin/registrations/bulk-tag", { ids: selectedRows.value.map((row) => row.id), name: value });
    result.failed ? ElMessage.warning(bulkResultMessage(result)) : ElMessage.success(`已为 ${result.succeeded} 条报名添加标签`);
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(error.message || "批量标签失败");
  } finally {
    actionKey.value = "";
  }
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function printRoster() {
  if (writeLocked.value) return;
  const printRows = selectedRows.value.length ? selectedRows.value : rows.value;
  if (!printRows.length) return ElMessage.warning("当前没有可打印的报名记录");
  const popup = window.open("", "_blank");
  if (!popup) return ElMessage.error("浏览器阻止了打印窗口，请允许本站打开新窗口");
  const body = printRows.map((row, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(row.activity?.title || "-")}</td><td>${escapeHtml(row.user?.nickname || "-")}</td><td>${escapeHtml(row.user?.phone || "-")}</td><td>${escapeHtml(registrationStatusText[row.status as RegistrationStatus] || row.status)}</td><td>${escapeHtml(answerText(row)).replace(/\n/g, "<br>")}</td><td></td></tr>`).join("");
  popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>活动报名名单</title><style>body{font-family:Arial,"Microsoft YaHei",sans-serif;color:#111;margin:24px}h1{font-size:20px;margin:0 0 6px}.meta{font-size:12px;color:#555;margin-bottom:16px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #777;padding:7px;text-align:left;vertical-align:top}th{background:#eee}.sign{width:70px}@media print{body{margin:0}}</style></head><body><h1>${escapeHtml(focusedActivityName.value || "活动报名名单")}</h1><div class="meta">打印时间：${escapeHtml(new Date().toLocaleString())}　记录数：${printRows.length}</div><table><thead><tr><th>序号</th><th>活动</th><th>姓名/昵称</th><th>手机号</th><th>状态</th><th>报名信息</th><th class="sign">签到</th></tr></thead><tbody>${body}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);
  popup.document.close();
}

function canManualCheckIn(row: any) {
  return canCheckInRegistrations && row.status === RegistrationStatus.Approved && !row.checkIn;
}

async function approve(row: any) {
  if (!canOperateRegistrations) return ElMessage.warning("当前账号只能只读查看报名");
  if (writeLocked.value) return;
  actionKey.value = `approve:${row.id}`;
  try {
    await ElMessageBox.confirm(`确认通过 ${userText(row)} 的报名？通过后用户端会看到报名成功，并可获取后续签到信息。`, "审核通过", { type: "success", confirmButtonText: "确认通过", cancelButtonText: "再核对一下" });
    await api.post(`/admin/registrations/${row.id}/approve`, {});
    ElMessage.success("已审核通过");
    load();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "审核报名失败");
  } finally {
    actionKey.value = "";
  }
}

async function reject(row: any) {
  if (!canOperateRegistrations) return ElMessage.warning("当前账号只能只读查看报名");
  if (writeLocked.value) return;
  actionKey.value = `reject:${row.id}`;
  try {
    const { value } = await ElMessageBox.prompt(`拒绝 ${userText(row)} 的报名后，用户端会看到未通过状态。请填写清晰原因，便于客服解释。`, "审核拒绝", { inputValue: "不符合报名条件", confirmButtonText: "确认拒绝", cancelButtonText: "返回" });
    await api.post(`/admin/registrations/${row.id}/reject`, { remark: value });
    ElMessage.success("已拒绝报名");
    await load();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "拒绝报名失败");
  } finally {
    actionKey.value = "";
  }
}

async function cancel(row: any) {
  if (!canOperateRegistrations) return ElMessage.warning("当前账号只能只读查看报名");
  if (writeLocked.value) return;
  actionKey.value = `cancel:${row.id}`;
  try {
    const { value } = await ElMessageBox.prompt(`确认取消 ${userText(row)} 的报名？如有关联订单或退款，请先与财务和用户确认。`, "取消报名", { inputValue: "后台取消", confirmButtonText: "确认取消", cancelButtonText: "返回", type: "warning" });
    await api.post(`/admin/registrations/${row.id}/cancel`, { reason: value });
    ElMessage.success("已取消报名");
    await load();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "取消报名失败");
  } finally {
    actionKey.value = "";
  }
}

async function manualCheckIn(row: any) {
  if (!canManualCheckIn(row)) return ElMessage.warning("只有报名成功且未签到的记录可以手动核销");
  if (writeLocked.value) return;
  actionKey.value = `check-in:${row.id}`;
  try {
    const { value } = await ElMessageBox.prompt(`确认手动核销 ${userText(row)} 的报名？该操作会把报名状态改为已签到，并记录当前后台账号为核销员。`, "手动核销", {
      inputValue: "后台报名列表手动核销",
      confirmButtonText: "确认核销",
      cancelButtonText: "再核对一下",
      type: "warning"
    });
    await api.post(`/admin/registrations/${row.id}/check-in`, { remark: value || "后台报名列表手动核销" });
    ElMessage.success("已手动核销");
    load();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(error.message || "手动核销失败");
  } finally {
    actionKey.value = "";
  }
}

function userText(row: any) {
  return row.user?.phone ? maskPhone(row.user.phone) : row.user?.nickname || `用户 ID ${row.user?.id || "-"}`;
}

function maskPhone(value: unknown) {
  const phone = String(value || "");
  return /^1\d{10}$/.test(phone) ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone || "-";
}

function answerText(row: any) {
  return (row.answers || [])
    .map((answer: any, index: number) => {
      const label = String(answer.label || answer.name || "").trim() || `报名信息 ${index + 1}`;
      const rawValue = Array.isArray(answer.value) ? answer.value.join(", ") : answer.value;
      const value = /手机|电话|mobile|phone/i.test(label) ? maskPhone(rawValue) : rawValue;
      return `${label}: ${value || "-"}`;
    })
    .join("\n");
}

function formatTime(value?: string) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
}

function activityTime(row: any) {
  const start = formatTime(row.activity?.startTime);
  const end = formatTime(row.activity?.endTime);
  if (start === "-" && end === "-") return "-";
  return end === "-" ? start : `${start} 至 ${end}`;
}

function tenantDisplayName(row: any) {
  return row.tenant?.name || row.tenant?.code || row.activity?.tenant?.name || row.activity?.tenant?.code || "平台";
}

function checkInOperator(row: any) {
  return row.checkIn?.operator?.name || row.checkIn?.operator?.username || "-";
}

async function exportRows() {
  if (!canOperateRegistrations) return ElMessage.warning("当前账号只能只读查看报名");
  if (writeLocked.value) return;
  exporting.value = true;
  try {
    await downloadExport({
      activityId: query.activityId,
      tenantId: isPlatformAdmin() ? query.tenantId : undefined,
      status: query.status,
      keyword: query.keyword.trim(),
      userId: query.userId
    });
    ElMessage.success("已按当前筛选导出报名数据");
  } catch (error: any) {
    ElMessage.error(error.message);
  } finally {
    exporting.value = false;
  }
}

onMounted(() => {
  loadTenants();
  loadActivities();
  load();
});

watch(
  () => [route.query.tenantId, route.query.status, route.query.activityId, route.query.userId],
  () => {
    const nextTenantId = routeTenantId();
    const nextStatus = routeRegistrationStatus();
    const nextActivityId = routeActivityId();
    const nextUserId = routeUserId();
    if (query.tenantId !== nextTenantId || query.status !== nextStatus || query.activityId !== nextActivityId || query.userId !== nextUserId) {
      query.tenantId = nextTenantId;
      query.status = nextStatus;
      query.activityId = nextActivityId;
      query.userId = nextUserId;
      query.page = 1;
      loadActivities();
      load();
    }
  }
);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>{{ pageTitle }}</h2>
      <el-button v-if="canOperateRegistrations" type="primary" plain :icon="Download" :loading="exporting" :disabled="writeLocked" @click="exportRows">按当前筛选导出 Excel</el-button>
    </div>

    <el-alert
      v-if="canOperateRegistrations"
      class="page-hint"
      type="info"
      :closable="false"
      show-icon
      :title="operateHintTitle"
      :description="operateHintDescription"
    />
    <el-alert
      v-else
      class="page-hint"
      type="warning"
      :closable="false"
      show-icon
      title="只读模式"
      :description="readonlyDescription"
    />
    <el-alert v-if="errorMessage" class="page-error" type="error" show-icon :closable="false" :title="errorMessage">
      <template #default><el-button size="small" :disabled="writeLocked" @click="load">重试</el-button></template>
    </el-alert>
    <el-alert v-if="tenantErrorMessage" class="page-error" type="error" show-icon :closable="false" :title="tenantErrorMessage"><template #default><el-button size="small" :disabled="writeLocked" @click="retryScopeFilters">重试筛选范围</el-button></template></el-alert>
    <el-alert v-if="activityErrorMessage" class="page-error" type="error" show-icon :closable="false" :title="activityErrorMessage"><template #default><el-button size="small" :disabled="writeLocked" @click="retryScopeFilters">重试筛选范围</el-button></template></el-alert>

    <el-alert v-if="query.userId" class="page-hint" type="info" show-icon :closable="false" :title="`已按客服用户 ID ${query.userId} 精确筛选报名`"><template #default><el-button size="small" @click="clearUserFilter">清除用户筛选</el-button></template></el-alert>
    <div class="table-card">
      <el-alert
        v-if="query.activityId"
        class="activity-alert"
        type="success"
        show-icon
        :closable="false"
        title="已按复盘活动筛选报名"
        :description="`当前仅查看「${focusedActivityName}」的报名，可用于核对报名状态、审核结果和现场名单。`"
      />
      <el-form class="filters" inline>
        <el-form-item v-if="isPlatformAdmin()" label="商家">
          <el-select v-model="query.tenantId" clearable filterable placeholder="全部商家" style="width: 180px" :disabled="writeLocked" @change="changeTenant">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenant.name" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="活动">
          <el-select v-model="query.activityId" clearable filterable style="width: 260px" :disabled="writeLocked" @change="search">
            <el-option v-for="activity in activities" :key="activity.id" :label="activity.title" :value="activity.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable style="width: 150px" :disabled="writeLocked" @change="search">
            <el-option v-for="(text, key) in registrationStatusText" :key="key" :label="text" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" clearable placeholder="搜索活动、手机号、报名内容" style="width: 260px" :disabled="writeLocked" @keyup.enter="search" @clear="search" />
        </el-form-item>
        <el-button type="primary" :icon="Search" :disabled="writeLocked" @click="search">筛选</el-button>
        <el-button v-if="query.activityId" :disabled="writeLocked" @click="clearActivityFilter">查看全部活动报名</el-button>
      </el-form>
      <div v-if="canOperateRegistrations" class="export-summary">
        <span>导出范围：{{ exportScopeText }}</span>
        <div class="bulk-actions">
          <span>已选 {{ selectedRows.length }} 条，其中待审核 {{ selectedPendingRows.length }} 条</span>
          <el-button size="small" type="success" :disabled="writeLocked || !selectedPendingRows.length" :loading="bulkApproving" @click="bulkApprove">批量通过</el-button>
          <el-button size="small" type="danger" plain :disabled="writeLocked || !selectedPendingRows.length" :loading="bulkRejecting" @click="bulkReject">批量拒绝</el-button>
          <el-button size="small" :icon="Bell" :loading="actionKey === 'bulk-notify'" :disabled="writeLocked || !selectedRows.length" @click="bulkNotify">批量通知</el-button>
          <el-button size="small" :icon="PriceTag" :loading="actionKey === 'bulk-tag'" :disabled="writeLocked || !selectedRows.length" @click="bulkTag">添加标签</el-button>
          <el-button size="small" :icon="Printer" :disabled="writeLocked" @click="printRoster">打印名单</el-button>
          <strong>当前筛选 {{ total }} 条</strong>
        </div>
      </div>

      <el-empty v-if="!loading && !errorMessage && !rows.length" description="暂无匹配报名记录">
        <el-button type="primary" @click="search">重新筛选</el-button>
      </el-empty>
      <el-table v-else v-loading="loading" class="registration-table" :data="rows" stripe row-key="id" @selection-change="handleSelectionChange">
        <el-table-column v-if="canOperateRegistrations" type="selection" width="48" :selectable="() => !writeLocked" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="活动" min-width="220" show-overflow-tooltip><template #default="{ row }">{{ row.activity?.title || "-" }}</template></el-table-column>
        <el-table-column label="活动安排" min-width="210" show-overflow-tooltip>
          <template #default="{ row }">
            <div>{{ activityTime(row) }}</div>
            <small>{{ row.activity?.location || "-" }}</small>
          </template>
        </el-table-column>
        <el-table-column v-if="isPlatformAdmin()" label="所属商家" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ tenantDisplayName(row) }}</template>
        </el-table-column>
        <el-table-column label="用户" width="180">
          <template #default="{ row }">
            <div>{{ row.user?.phone ? maskPhone(row.user.phone) : row.user?.nickname || "-" }}</div>
            <small>ID {{ row.user?.id || "-" }}</small>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120"><template #default="{ row }"><el-tag>{{ registrationStatusText[row.status as RegistrationStatus] }}</el-tag></template></el-table-column>
        <el-table-column label="签到信息" min-width="210">
          <template #default="{ row }">
            <template v-if="row.checkIn">
              <el-tag type="success" size="small">已核销</el-tag>
              <div class="checkin-time">{{ formatTime(row.checkIn.createdAt) }}</div>
              <small>核销员：{{ checkInOperator(row) }}</small>
              <small v-if="row.checkIn.remark">备注：{{ row.checkIn.remark }}</small>
            </template>
            <template v-else-if="row.status === RegistrationStatus.CheckedIn">
              <el-tag type="warning" size="small">已签到</el-tag>
              <small>缺少核销记录，请复核数据</small>
            </template>
            <template v-else>
              <el-tag type="info" size="small">未签到</el-tag>
            </template>
          </template>
        </el-table-column>
        <el-table-column v-if="canViewRegistrationOrders" label="关联订单" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <div>{{ row.order?.orderNo || "-" }}</div>
            <small v-if="row.order">¥{{ Number(row.order.amount || 0).toFixed(2) }} / {{ orderStatusText[row.order.status as OrderStatus] || row.order.status }}</small>
          </template>
        </el-table-column>
        <el-table-column label="报名内容" min-width="280"><template #default="{ row }"><pre>{{ answerText(row) }}</pre></template></el-table-column>
        <el-table-column label="报名时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        <el-table-column v-if="canOperateRegistrations || canCheckInRegistrations" label="操作" width="260">
          <template #default="{ row }">
            <div class="row-actions">
              <el-button v-if="canCheckInRegistrations" size="small" type="primary" :icon="Finished" :loading="actionKey === `check-in:${row.id}`" :disabled="writeLocked || !canManualCheckIn(row)" @click="manualCheckIn(row)">核销</el-button>
              <el-button v-if="canOperateRegistrations" size="small" type="success" :icon="Check" :loading="actionKey === `approve:${row.id}`" :disabled="writeLocked || !canApprove(row)" @click="approve(row)">通过</el-button>
              <el-button v-if="canOperateRegistrations" size="small" type="danger" :icon="Close" :loading="actionKey === `reject:${row.id}`" :disabled="writeLocked || !canReject(row)" @click="reject(row)">拒绝</el-button>
              <el-button v-if="canOperateRegistrations" size="small" :icon="CircleClose" :loading="actionKey === `cancel:${row.id}`" :disabled="writeLocked || !canCancel(row)" @click="cancel(row)">取消</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :disabled="writeLocked"
          @size-change="search"
          @current-change="load"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-hint { margin-bottom: 14px; }
.page-error { margin: 14px 0; }
.activity-alert { margin-bottom: 14px; }
.filters { margin-bottom: 12px; }
.export-summary { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; padding: 10px 12px; border: 1px solid #dbeafe; border-radius: 8px; background: #eff6ff; color: #475569; font-size: 13px; }
.export-summary strong { color: #0f172a; white-space: nowrap; }
.bulk-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.bulk-actions > span { color: #64748b; }
pre { margin: 0; white-space: pre-wrap; font-family: inherit; line-height: 1.5; }
small { color: #667085; display: block; line-height: 1.5; }
.checkin-time { margin-top: 4px; line-height: 1.5; }
.registration-table { width: 100%; }
.row-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.row-actions .el-button { margin-left: 0; }
.pagination { display: flex; justify-content: flex-end; padding-top: 16px; }
@media (max-width: 640px) {
  .export-summary { align-items: flex-start; flex-direction: column; }
  .bulk-actions { justify-content: flex-start; }
}
</style>
