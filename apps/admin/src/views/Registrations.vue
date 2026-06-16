<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Check, CircleClose, Close, Download, Search } from "@element-plus/icons-vue";
import { OrderStatus, RegistrationStatus, orderStatusText, registrationStatusText } from "@activity/shared";
import { api, downloadExport } from "../api";
import { canAccess, isPlatformAdmin, permissions } from "../permissions";

type PageResult<T> = { items: T[]; total: number; page: number; pageSize: number };

const route = useRoute();
const router = useRouter();
const rows = ref<any[]>([]);
const activities = ref<any[]>([]);
const tenants = ref<any[]>([]);
const loading = ref(false);
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
const query = reactive({
  activityId: routeActivityId() as number | undefined,
  tenantId: routeTenantId() as number | undefined,
  status: routeRegistrationStatus(),
  keyword: "",
  page: 1,
  pageSize: 20
});
const total = ref(0);
const canOperateRegistrations = canAccess(permissions.operation);
const canViewRegistrationOrders = canAccess(permissions.finance);
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

function queryParams() {
  return {
    activityId: query.activityId || undefined,
    tenantId: isPlatformAdmin() ? query.tenantId || undefined : undefined,
    status: query.status || undefined,
    keyword: query.keyword.trim() || undefined,
    page: query.page,
    pageSize: query.pageSize
  };
}

async function load() {
  loading.value = true;
  try {
    const result = await api.get<any, PageResult<any>>("/admin/registrations", { params: queryParams() });
    rows.value = result.items || [];
    total.value = result.total || 0;
  } finally {
    loading.value = false;
  }
}

async function loadActivities() {
  const result = await api.get<any, any>("/admin/activities", { params: { page: 1, pageSize: 100, tenantId: isPlatformAdmin() ? query.tenantId || undefined : undefined } });
  activities.value = Array.isArray(result) ? result : result.items || [];
}

async function loadTenants() {
  tenants.value = isPlatformAdmin() ? await api.get<any, any[]>("/admin/tenants") : [];
}

function search() {
  query.page = 1;
  load();
}

function clearActivityFilter() {
  query.activityId = undefined;
  query.page = 1;
  router.replace({
    path: "/registrations",
    query: {
      tenantId: isPlatformAdmin() && query.tenantId ? query.tenantId : undefined,
      status: query.status || undefined
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

async function approve(row: any) {
  if (!canOperateRegistrations) return ElMessage.warning("当前账号只能只读查看报名");
  try {
    await ElMessageBox.confirm(`确认通过 ${userText(row)} 的报名？通过后用户端会看到报名成功，并可获取后续签到信息。`, "审核通过", { type: "success", confirmButtonText: "确认通过", cancelButtonText: "再核对一下" });
    await api.post(`/admin/registrations/${row.id}/approve`, {});
    ElMessage.success("已审核通过");
    load();
  } catch (error: any) {
    ElMessage.error(error.message);
  }
}

async function reject(row: any) {
  if (!canOperateRegistrations) return ElMessage.warning("当前账号只能只读查看报名");
  const { value } = await ElMessageBox.prompt(`拒绝 ${userText(row)} 的报名后，用户端会看到未通过状态。请填写清晰原因，便于客服解释。`, "审核拒绝", { inputValue: "不符合报名条件", confirmButtonText: "确认拒绝", cancelButtonText: "返回" });
  await api.post(`/admin/registrations/${row.id}/reject`, { remark: value });
  ElMessage.success("已拒绝报名");
  load();
}

async function cancel(row: any) {
  if (!canOperateRegistrations) return ElMessage.warning("当前账号只能只读查看报名");
  const { value } = await ElMessageBox.prompt(`确认取消 ${userText(row)} 的报名？如有关联订单或退款，请先与财务和用户确认。`, "取消报名", { inputValue: "后台取消", confirmButtonText: "确认取消", cancelButtonText: "返回", type: "warning" });
  await api.post(`/admin/registrations/${row.id}/cancel`, { reason: value });
  ElMessage.success("已取消报名");
  load();
}

function userText(row: any) {
  return row.user?.phone || row.user?.nickname || `用户 ID ${row.user?.id || "-"}`;
}

function answerText(row: any) {
  return (row.answers || []).map((answer: any) => `${answer.label}: ${Array.isArray(answer.value) ? answer.value.join(", ") : answer.value || "-"}`).join("\n");
}

function formatTime(value?: string) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
}

function tenantDisplayName(row: any) {
  return row.tenant?.name || row.tenant?.code || row.activity?.tenant?.name || row.activity?.tenant?.code || "平台";
}

async function exportRows() {
  if (!canOperateRegistrations) return ElMessage.warning("当前账号只能只读查看报名");
  try {
    await downloadExport({
      activityId: query.activityId,
      tenantId: isPlatformAdmin() ? query.tenantId : undefined,
      status: query.status,
      keyword: query.keyword.trim()
    });
  } catch (error: any) {
    ElMessage.error(error.message);
  }
}

onMounted(() => {
  loadTenants();
  loadActivities();
  load();
});

watch(
  () => [route.query.tenantId, route.query.status, route.query.activityId],
  () => {
    const nextTenantId = routeTenantId();
    const nextStatus = routeRegistrationStatus();
    const nextActivityId = routeActivityId();
    if (query.tenantId !== nextTenantId || query.status !== nextStatus || query.activityId !== nextActivityId) {
      query.tenantId = nextTenantId;
      query.status = nextStatus;
      query.activityId = nextActivityId;
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
      <el-button v-if="canOperateRegistrations" :icon="Download" @click="exportRows">导出 Excel</el-button>
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
          <el-select v-model="query.tenantId" clearable filterable placeholder="全部商家" style="width: 180px" @change="changeTenant">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenant.name" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="活动">
          <el-select v-model="query.activityId" clearable filterable style="width: 260px" @change="search">
            <el-option v-for="activity in activities" :key="activity.id" :label="activity.title" :value="activity.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable style="width: 150px" @change="search">
            <el-option v-for="(text, key) in registrationStatusText" :key="key" :label="text" :value="key" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" clearable placeholder="搜索活动、手机号、报名内容" style="width: 260px" @keyup.enter="search" @clear="search" />
        </el-form-item>
        <el-button type="primary" :icon="Search" @click="search">筛选</el-button>
        <el-button v-if="query.activityId" @click="clearActivityFilter">查看全部活动报名</el-button>
      </el-form>

      <el-empty v-if="!loading && !rows.length" description="暂无匹配报名记录">
        <el-button type="primary" @click="search">重新筛选</el-button>
      </el-empty>
      <el-table v-else v-loading="loading" :data="rows" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="活动" min-width="220" show-overflow-tooltip><template #default="{ row }">{{ row.activity?.title || "-" }}</template></el-table-column>
        <el-table-column v-if="isPlatformAdmin()" label="所属商家" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ tenantDisplayName(row) }}</template>
        </el-table-column>
        <el-table-column label="用户" width="180">
          <template #default="{ row }">
            <div>{{ row.user?.phone || row.user?.nickname || "-" }}</div>
            <small>ID {{ row.user?.id || "-" }}</small>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120"><template #default="{ row }"><el-tag>{{ registrationStatusText[row.status as RegistrationStatus] }}</el-tag></template></el-table-column>
        <el-table-column v-if="canViewRegistrationOrders" label="关联订单" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            <div>{{ row.order?.orderNo || "-" }}</div>
            <small v-if="row.order">¥{{ Number(row.order.amount || 0).toFixed(2) }} / {{ orderStatusText[row.order.status as OrderStatus] || row.order.status }}</small>
          </template>
        </el-table-column>
        <el-table-column label="报名内容" min-width="280"><template #default="{ row }"><pre>{{ answerText(row) }}</pre></template></el-table-column>
        <el-table-column label="报名时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        <el-table-column v-if="canOperateRegistrations" label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="success" :icon="Check" :disabled="!canApprove(row)" @click="approve(row)">通过</el-button>
            <el-button size="small" type="danger" :icon="Close" :disabled="!canReject(row)" @click="reject(row)">拒绝</el-button>
            <el-button size="small" :icon="CircleClose" :disabled="!canCancel(row)" @click="cancel(row)">取消</el-button>
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
          @size-change="search"
          @current-change="load"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-hint { margin-bottom: 14px; }
.activity-alert { margin-bottom: 14px; }
.filters { margin-bottom: 12px; }
pre { margin: 0; white-space: pre-wrap; font-family: inherit; line-height: 1.5; }
small { color: #667085; display: block; line-height: 1.5; }
.pagination { display: flex; justify-content: flex-end; padding-top: 16px; }
</style>
