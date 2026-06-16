<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { api } from "../api";
import { isPlatformAdmin } from "../permissions";

const rows = ref<any[]>([]);
const tenants = ref<any[]>([]);
const loading = ref(false);
const route = useRoute();
const filters = reactive({
  tenantId: undefined as number | undefined
});
const tenantMap = computed(() => new Map(tenants.value.map((tenant) => [tenant.id, tenant])));

const actionText: Record<string, string> = {
  "activity.create": "创建活动",
  "activity.update": "编辑活动",
  "activity.close": "下架活动",
  "registration.approve": "审核通过",
  "registration.reject": "审核拒绝",
  "registration.cancel": "取消报名",
  "order.confirm_offline_payment": "确认收款",
  "order.close_expired": "关闭过期订单",
  "refund.request": "发起退款",
  "refund.approve": "通过退款",
  "refund.reject": "拒绝退款",
  "check_in.verify": "签到核销",
  "waitlist.promote": "候补补位",
  "waitlist.cancel": "取消候补",
  "wallet.recharge": "余额充值",
  "wallet.deduct": "余额扣减",
  "wallet.adjust": "余额调整",
  "settings.operation.update": "运营设置",
  "tenant.profile.update": "商家资料"
};

async function load() {
  loading.value = true;
  try {
    const params: Record<string, unknown> = {};
    if (isPlatformAdmin() && filters.tenantId) params.tenantId = filters.tenantId;
    rows.value = await api.get<any, any[]>("/admin/operation-logs", { params });
  } finally {
    loading.value = false;
  }
}

async function loadTenants() {
  tenants.value = isPlatformAdmin() ? await api.get<any, any[]>("/admin/tenants") : [];
}

function formatTime(value?: string) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
}

function renderAction(action: string) {
  return actionText[action] || action;
}

function detailText(detail?: Record<string, unknown> | null) {
  if (!detail) return "-";
  return Object.entries(detail).map(([key, value]) => `${key}: ${value}`).join("；");
}

function tenantDisplayName(row: any) {
  if (!row.tenantId) return "平台/未归属";
  const tenant = tenantMap.value.get(row.tenantId);
  return tenant ? `${tenant.name || tenant.code}（${tenant.code}）` : `商家 #${row.tenantId}`;
}

function search() {
  load();
}

function resetFilters() {
  filters.tenantId = undefined;
  load();
}

function applyTenantFromRoute() {
  if (!isPlatformAdmin()) return;
  const tenantId = Number(route.query.tenantId || 0);
  filters.tenantId = Number.isFinite(tenantId) && tenantId > 0 ? tenantId : undefined;
}

watch(
  () => route.query.tenantId,
  () => {
    applyTenantFromRoute();
    load();
  }
);

onMounted(async () => {
  applyTenantFromRoute();
  await loadTenants();
  await load();
});
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>操作日志</h2>
      <div class="toolbar-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家" style="width: 220px" @change="search">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="`${tenant.name || tenant.code}（${tenant.code}）`" :value="tenant.id" />
        </el-select>
        <el-button v-if="isPlatformAdmin()" @click="resetFilters">重置</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <div class="table-card">
      <el-table :data="rows" stripe v-loading="loading" empty-text="暂无操作日志">
        <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        <el-table-column v-if="isPlatformAdmin()" label="所属商家" width="190" show-overflow-tooltip><template #default="{ row }">{{ tenantDisplayName(row) }}</template></el-table-column>
        <el-table-column prop="adminUsername" label="管理员" width="130" />
        <el-table-column label="动作" width="150"><template #default="{ row }"><el-tag>{{ renderAction(row.action) }}</el-tag></template></el-table-column>
        <el-table-column prop="targetType" label="对象" width="120" />
        <el-table-column prop="targetId" label="对象ID" width="100" />
        <el-table-column prop="summary" label="摘要" min-width="240" show-overflow-tooltip />
        <el-table-column label="详情" min-width="260" show-overflow-tooltip><template #default="{ row }">{{ detailText(row.detail) }}</template></el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.toolbar-actions { display: flex; align-items: center; gap: 10px; }
</style>
