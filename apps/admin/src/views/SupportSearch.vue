<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Search } from "@element-plus/icons-vue";
import { api } from "../api";
import { isPlatformAdmin } from "../permissions";

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const tenants = ref<any[]>([]);
const result = ref<any>(null);
const filters = reactive({
  keyword: "",
  tenantId: undefined as number | undefined
});

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
  tenants.value = isPlatformAdmin() ? await api.get<any, any[]>("/admin/tenants") : [];
}

async function search() {
  if (filters.keyword.trim().length < 2) {
    ElMessage.warning("请输入至少 2 个字符");
    return;
  }
  loading.value = true;
  try {
    result.value = await api.get<any, any>("/admin/support/search", { params: queryParams() });
    await router.replace({ path: route.path, query: routeQueryFromParams(queryParams()) });
  } finally {
    loading.value = false;
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
          <el-table-column prop="phone" label="手机号" width="140" />
          <el-table-column prop="nickname" label="昵称" min-width="140" show-overflow-tooltip />
          <el-table-column label="最近登录" width="170"><template #default="{ row }">{{ formatTime(row.lastLoginAt) }}</template></el-table-column>
          <el-table-column label="操作" width="180">
            <template #default="{ row }">
              <el-button size="small" link type="primary" @click="go('/members', { keyword: row.phone || row.nickname })">会员</el-button>
              <el-button size="small" link type="primary" @click="go('/registrations', { keyword: row.phone || row.nickname })">报名</el-button>
              <el-button size="small" link type="primary" @click="go('/orders', { keyword: row.phone || row.nickname })">订单</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="table-card">
        <h3>验证码日志</h3>
        <el-table :data="result?.h5AuthCodeLogs || []" stripe empty-text="暂无验证码记录">
          <el-table-column label="时间" width="160"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
          <el-table-column prop="phone" label="手机号" width="130" />
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
        <el-table-column prop="user.phone" label="手机号" width="130" />
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
        <el-table-column prop="user.phone" label="手机号" width="130" />
        <el-table-column prop="activity.title" label="活动" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" width="120"><template #default="{ row }"><el-button size="small" link type="primary" @click="go('/orders', { keyword: row.orderNo })">打开</el-button></template></el-table-column>
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
  </div>
</template>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
.toolbar h2 { margin: 0 0 6px; }
.toolbar p { margin: 0; color: #7a7f8a; }
.toolbar-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.advice-list { display: flex; flex-direction: column; gap: 4px; }
</style>
