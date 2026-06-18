<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ActivityStatus, OrderStatus, RegistrationStatus } from "@activity/shared";
import { api } from "../api";
import { AdminRole, currentRole, currentTenantName, currentTenantSettings, isPlatformAdmin } from "../permissions";

const router = useRouter();
const data = ref<any>();
const loading = ref(false);
const pageTitle = computed(() => (isPlatformAdmin() ? "全局数据看板" : `${currentTenantName() || "商家"}数据看板`));
const metricCards = computed(() => {
  const totals = data.value?.totals || {};
  const base = [
    { label: "活动数", value: totals.activityCount || 0 },
    { label: "报名数", value: totals.registrationCount || 0 },
    { label: "订单数", value: totals.orderCount || 0 },
    { label: "签到数", value: totals.checkInCount || 0 },
    { label: "评价数", value: totals.reviewCount || 0 },
    { label: "浏览量", value: totals.viewCount || 0 },
    { label: "通知数", value: totals.notificationCount || 0 },
    { label: "实收金额", value: `¥${totals.paidAmount || "0.00"}` }
  ];
  return isPlatformAdmin() ? [{ label: "商家数", value: totals.tenantCount || 0 }, { label: "停用商家", value: totals.disabledTenantCount || 0 }, ...base.slice(0, 6)] : base;
});
const operationCards = computed(() => {
  const operations = data.value?.operations || {};
  return [
    { label: "净收入", value: `¥${operations.netAmount || "0.00"}`, sub: `退款 ¥${operations.refundAmount || "0.00"}` },
    { label: "本月净收入", value: `¥${operations.monthNetAmount || "0.00"}`, sub: `本月报名 ${operations.monthRegistrationCount || 0}` },
    { label: "签到率", value: `${operations.checkInRate || 0}%`, sub: "签到 / 报名" },
    { label: "浏览转报名", value: `${operations.registrationConversionRate || 0}%`, sub: `客单价 ¥${operations.avgOrderAmount || "0.00"}` }
  ];
});
const healthCards = computed(() => {
  const todos = data.value?.todos || {};
  const operations = data.value?.operations || {};
  return [
    {
      label: "履约健康",
      value: `${operations.checkInRate || 0}%`,
      desc: "签到率越高，活动交付越稳定",
      tone: Number(operations.checkInRate || 0) >= 60 ? "success" : "warning"
    },
    {
      label: "销售转化",
      value: `${operations.registrationConversionRate || 0}%`,
      desc: "浏览转报名可用于判断活动页面吸引力",
      tone: Number(operations.registrationConversionRate || 0) >= 8 ? "success" : "muted"
    },
    {
      label: "待办风险",
      value: (todos.pendingActivityCount || 0) + (todos.pendingRegistrationCount || 0) + (todos.pendingRefundCount || 0),
      desc: "待审核活动、报名和退款需要及时处理",
      tone: (todos.pendingRefundCount || 0) > 0 ? "danger" : "muted"
    }
  ];
});
const todoCards = computed(() => {
  const todos = data.value?.todos || {};
  return isPlatformAdmin()
    ? [
        { label: "待审核活动", value: todos.pendingActivityCount || 0, tone: "warning", path: `/activities?status=${ActivityStatus.PendingApproval}` },
        { label: "待处理退款", value: todos.pendingRefundCount || 0, tone: "danger", path: "/finance" },
        { label: "异常回调", value: todos.callbackRiskCount || 0, tone: "danger", path: "/finance" },
        { label: "待付款订单", value: todos.pendingOrderCount || 0, tone: "muted", path: `/orders?status=${OrderStatus.PendingPayment}` }
      ]
    : [
        { label: "待平台审核活动", value: todos.pendingActivityCount || 0, tone: "warning", path: `/activities?status=${ActivityStatus.PendingApproval}` },
        { label: "待审核报名", value: todos.pendingRegistrationCount || 0, tone: "warning", path: `/registrations?status=${RegistrationStatus.PendingReview}` },
        { label: "待付款订单", value: todos.pendingOrderCount || 0, tone: "muted", path: `/orders?status=${OrderStatus.PendingPayment}` },
        { label: "待处理退款", value: todos.pendingRefundCount || 0, tone: "danger", path: "/finance" }
      ];
});
const permissionCards = computed(() => {
  if (isPlatformAdmin()) return [];
  const settings = currentTenantSettings();
  return [
    {
      label: "活动发布审核",
      value: settings.activityPublishReviewRequired ? "需要平台审核" : "可直接发布",
      tone: settings.activityPublishReviewRequired ? "warning" : "success"
    },
    {
      label: "报名审核权限",
      value: settings.registrationReviewEnabled ? "可开启" : "未开通",
      tone: settings.registrationReviewEnabled ? "success" : "muted"
    },
    {
      label: "收款配置权限",
      value: settings.paymentAccountEditable ? "可配置" : "只读",
      tone: settings.paymentAccountEditable ? "success" : "warning"
    },
    {
      label: "商城授权",
      value: settings.mallEnabled ? "已开通" : "未开通",
      tone: settings.mallEnabled ? "success" : "warning"
    }
  ];
});
const quickActions = computed(() =>
  [
    ...(isPlatformAdmin() ? [{ label: "商家管理", desc: "开通城市合伙人和配置权限", path: "/tenants", roles: [AdminRole.SuperAdmin] }] : []),
    { label: isPlatformAdmin() ? "活动审核" : "发布活动", desc: isPlatformAdmin() ? "处理待平台审核活动" : "创建或提交活动审核", path: "/activities", roles: [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance] },
    { label: "报名管理", desc: "处理报名、审核和导出", path: "/registrations", roles: [AdminRole.SuperAdmin, AdminRole.Operator, AdminRole.Finance] },
    { label: isPlatformAdmin() ? "全局订单" : "订单管理", desc: isPlatformAdmin() ? "监管全平台订单和支付状态" : "确认线下收款、备注、退款", path: "/orders", roles: [AdminRole.SuperAdmin, AdminRole.Finance] },
    { label: isPlatformAdmin() ? "全局对账" : "财务对账", desc: "查看流水、退款和异常回调", path: "/finance", roles: [AdminRole.SuperAdmin, AdminRole.Finance] }
  ].filter((item) => item.roles.includes(currentRole() as AdminRole))
);

async function load() {
  loading.value = true;
  try {
    data.value = await api.get("/admin/dashboard");
  } finally {
    loading.value = false;
  }
}

function openTodo(path: string) {
  router.push(path);
}

function openActivityRegistrations(row: any) {
  router.push({ path: "/registrations", query: activityRouteQuery(row) });
}

function openActivityOrders(row: any) {
  router.push({ path: "/orders", query: activityRouteQuery(row) });
}

function openActivityRecap(row: any) {
  router.push({ path: "/recaps", query: { activityId: row.id } });
}

function activityRouteQuery(row: any) {
  return {
    activityId: row.id,
    ...(isPlatformAdmin() && row.tenant?.id ? { tenantId: row.tenant.id } : {})
  };
}

function adviceTagType(level?: string) {
  if (level === "success") return "success";
  if (level === "warning") return "warning";
  if (level === "danger") return "danger";
  return "info";
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>{{ pageTitle }}</h2>
      <el-button @click="load">刷新</el-button>
    </div>

    <div v-if="data" class="operation-grid" v-loading="loading">
      <div v-for="item in operationCards" :key="item.label" class="operation-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small>{{ item.sub }}</small>
      </div>
    </div>

    <div v-if="data" class="metric-grid">
      <div v-for="item in metricCards" :key="item.label" class="metric"><span>{{ item.label }}</span><strong>{{ item.value }}</strong></div>
    </div>

    <div v-if="data" class="todo-grid">
      <div v-for="item in todoCards" :key="item.label" class="todo" :class="[item.tone, { clickable: item.path }]" @click="item.path && openTodo(item.path)">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>

    <div v-if="permissionCards.length" class="permission-grid">
      <div v-for="item in permissionCards" :key="item.label" class="permission" :class="item.tone">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>

    <div v-if="data" class="dashboard-columns">
      <div class="table-card">
        <h3>经营健康</h3>
        <div class="health-list">
          <div v-for="item in healthCards" :key="item.label" class="health-item" :class="item.tone">
            <div>
              <span>{{ item.label }}</span>
              <p>{{ item.desc }}</p>
            </div>
            <strong>{{ item.value }}</strong>
          </div>
        </div>
      </div>

      <div class="table-card">
        <h3>快捷处理</h3>
        <div class="action-list">
          <button v-for="item in quickActions" :key="item.path" type="button" @click="router.push(item.path)">
            <span>{{ item.label }}</span>
            <small>{{ item.desc }}</small>
          </button>
        </div>
      </div>
    </div>

    <div class="table-card" v-if="data">
      <h3>近期活动经营表现</h3>
      <el-table :data="data.recentActivities" stripe empty-text="暂无活动">
        <el-table-column prop="title" label="活动" min-width="220" show-overflow-tooltip />
        <el-table-column v-if="isPlatformAdmin()" label="所属商家" min-width="170" show-overflow-tooltip>
          <template #default="{ row }">{{ row.tenant?.name || row.tenant?.code || "平台/未归属" }}</template>
        </el-table-column>
        <el-table-column prop="registeredCount" label="报名" width="90" />
        <el-table-column prop="checkInCount" label="签到" width="90" />
        <el-table-column label="签到率" width="90"><template #default="{ row }">{{ row.checkInRate || 0 }}%</template></el-table-column>
        <el-table-column label="转化率" width="90"><template #default="{ row }">{{ row.registrationConversionRate || 0 }}%</template></el-table-column>
        <el-table-column label="净收入" width="110"><template #default="{ row }">¥{{ row.netAmount || "0.00" }}</template></el-table-column>
        <el-table-column label="实收/退款" width="140"><template #default="{ row }">¥{{ row.paidAmount || "0.00" }} / ¥{{ row.refundAmount || "0.00" }}</template></el-table-column>
        <el-table-column label="客单价" width="100"><template #default="{ row }">¥{{ row.avgOrderAmount || "0.00" }}</template></el-table-column>
        <el-table-column label="经营建议" min-width="190" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tag :type="adviceTagType(row.operationAdvice?.level)" effect="light">{{ row.operationAdvice?.label || "观察中" }}</el-tag>
            <small class="advice-text">{{ row.operationAdvice?.message || "-" }}</small>
          </template>
        </el-table-column>
        <el-table-column prop="remainingSeats" label="余量" width="90" />
        <el-table-column label="追踪" width="210" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openActivityRegistrations(row)">报名</el-button>
            <el-button size="small" @click="openActivityOrders(row)">订单</el-button>
            <el-button v-if="!isPlatformAdmin()" size="small" @click="openActivityRecap(row)">复盘</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.operation-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
.operation-card { background: #fff; border: 1px solid #dbeafe; border-radius: 8px; padding: 18px; display: grid; gap: 8px; min-height: 118px; }
.operation-card span { color: #475467; font-size: 13px; }
.operation-card strong { color: #0f172a; font-size: 28px; }
.operation-card small { color: #667085; }
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
.metric { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px; display: grid; gap: 8px; }
.metric span { color: #667085; font-size: 13px; }
.metric strong { font-size: 28px; }
.todo-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
.todo { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; }
.todo.clickable { cursor: pointer; }
.todo.clickable:hover { border-color: #0f766e; background: #f0fdfa; }
.todo span { color: #475467; font-size: 13px; }
.todo strong { font-size: 22px; color: #111827; }
.todo.warning strong { color: #d97706; }
.todo.danger strong { color: #dc2626; }
.todo.muted strong { color: #475467; }
.permission-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
.permission { background: #fff; border: 1px solid #e5e7eb; border-left-width: 4px; border-radius: 8px; padding: 14px 16px; display: grid; gap: 8px; min-height: 82px; }
.permission span { color: #475467; font-size: 13px; }
.permission strong { font-size: 18px; color: #111827; }
.permission.success { border-left-color: #16a34a; }
.permission.warning { border-left-color: #d97706; }
.permission.muted { border-left-color: #94a3b8; }
.dashboard-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 18px; }
.health-list, .action-list { display: grid; gap: 10px; }
.health-item { border: 1px solid #e5e7eb; border-left-width: 4px; border-radius: 8px; padding: 12px 14px; display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 74px; }
.health-item span { color: #111827; font-weight: 600; }
.health-item p { margin: 6px 0 0; color: #667085; font-size: 13px; line-height: 1.45; }
.health-item strong { font-size: 22px; white-space: nowrap; }
.health-item.success { border-left-color: #16a34a; }
.health-item.warning { border-left-color: #d97706; }
.health-item.danger { border-left-color: #dc2626; }
.health-item.muted { border-left-color: #94a3b8; }
.action-list button { width: 100%; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; padding: 12px 14px; text-align: left; cursor: pointer; display: grid; gap: 6px; }
.action-list button:hover { border-color: #0f766e; background: #f0fdfa; }
.action-list span { color: #111827; font-weight: 600; }
.action-list small { color: #667085; line-height: 1.45; }
.advice-text { display: block; margin-top: 6px; color: #667085; line-height: 1.45; }
h3 { margin: 0 0 16px; }
@media (max-width: 900px) { .operation-grid, .metric-grid, .todo-grid, .permission-grid, .dashboard-columns { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .operation-grid, .metric-grid, .todo-grid, .permission-grid, .dashboard-columns { grid-template-columns: 1fr; } }
</style>
