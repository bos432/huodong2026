<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { ActivityStatus, OrderStatus, RegistrationStatus } from "@activity/shared";
import { api } from "../api";
import { canAccess, currentTenantName, currentTenantSettings, isPlatformAdmin } from "../permissions";

const router = useRouter();
const data = ref<any>();
const loading = ref(false);
const mallMerchants = ref<MallMerchant[]>([]);
const mallAnalytics = ref<any>({});
const selectedMallMerchantId = ref<number>();
const canViewActivities = computed(() => canAccess(["activity.view", "activity.manage"]));
const canViewRegistrations = computed(() => canAccess(["registration.view", "registration.manage"]));
const canViewOrders = computed(() => canAccess(["order.view", "order.manage"]));
const canViewFinance = computed(() => canAccess(["finance.view", "finance.manage"]));
const hasMallAccess = computed(() => canAccess(["mall.merchant.view", "mall.product.manage", "mall.order.view", "mall.finance.view", "mall.statistics.view"]));
const mallWorkbenchMode = computed(() => !isPlatformAdmin() && hasMallAccess.value && !canViewActivities.value && !canViewRegistrations.value && !canViewOrders.value && !canViewFinance.value);
const pageTitle = computed(() => (mallWorkbenchMode.value ? "商城运营工作台" : isPlatformAdmin() ? "全局数据看板" : `${currentTenantName() || "商家"}数据看板`));
const selectedMallMerchant = computed(() => mallMerchants.value.find((merchant) => merchant.id === selectedMallMerchantId.value));
const selectedMallSummary = computed(() => selectedMallMerchant.value?.operationSummary || {});

type MallMerchant = {
  id: number;
  code?: string;
  name?: string;
  ownerType?: string;
  paymentMode?: string;
  region?: string | null;
  tenant?: { id?: number; name?: string; code?: string } | null;
  operationSummary?: Record<string, any>;
};

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
const mallOperationCards = computed(() => {
  const summary = mallAnalytics.value?.summary || {};
  const merchant = selectedMallSummary.value;
  return [
    { label: "30天净收", value: `¥${money(summary.netReceivedAmount)}`, sub: `实收 ¥${money(summary.receivedAmount)} / 已退 ¥${money(summary.approvedRefundAmount)}` },
    { label: "待发货", value: `${mallStatusCount(["paid"])} 单`, sub: "已收款，等待填写物流" },
    { label: "售后待处理", value: `${mallRefundCount(["pending", "processing", "failed"])} 单`, sub: `售后金额 ¥${money(mallRefundAmount(["pending", "processing", "failed"]))}` },
    { label: "上架商品", value: merchant.publishedProductCount || 0, sub: `全部商品 ${merchant.productCount || 0}` }
  ];
});
const mallMetricCards = computed(() => {
  const summary = mallAnalytics.value?.summary || {};
  const merchant = selectedMallSummary.value;
  return [
    { label: "30天订单", value: summary.orderCount || 0 },
    { label: "30天实收", value: `¥${money(summary.receivedAmount)}` },
    { label: "优惠让利", value: `¥${money(summary.discountAmount)}` },
    { label: "已退金额", value: `¥${money(summary.approvedRefundAmount)}` },
    { label: "待确认收款", value: mallStatusCount(["pending_confirm"]) },
    { label: "已发货", value: mallStatusCount(["shipped"]) },
    { label: "已完成", value: mallStatusCount(["completed"]) },
    { label: "收款账户", value: merchant.enabledPaymentAccountCount || 0 }
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
const mallHealthCards = computed(() => {
  const summary = selectedMallSummary.value;
  const pendingShip = mallStatusCount(["paid"]);
  const refundRisk = mallRefundCount(["pending", "processing", "failed"]);
  const productCount = Number(summary.productCount || 0);
  const publishedCount = Number(summary.publishedProductCount || 0);
  return [
    {
      label: "履约节奏",
      value: `${pendingShip} 单`,
      desc: pendingShip > 0 ? "已收款订单需要尽快发货" : "暂无待发货订单",
      tone: pendingShip > 0 ? "warning" : "success"
    },
    {
      label: "售后风险",
      value: `${refundRisk} 单`,
      desc: refundRisk > 0 ? "待处理或失败售后需要优先核对" : "暂无待处理售后",
      tone: refundRisk > 0 ? "danger" : "success"
    },
    {
      label: "商品供给",
      value: `${publishedCount}/${productCount}`,
      desc: "已上架商品 / 全部商品",
      tone: publishedCount > 0 ? "success" : "warning"
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
        ...(canViewActivities.value ? [{ label: "待平台审核活动", value: todos.pendingActivityCount || 0, tone: "warning", path: `/activities?status=${ActivityStatus.PendingApproval}` }] : []),
        ...(canViewRegistrations.value ? [{ label: "待审核报名", value: todos.pendingRegistrationCount || 0, tone: "warning", path: `/registrations?status=${RegistrationStatus.PendingReview}` }] : []),
        ...(canViewOrders.value ? [{ label: "待付款订单", value: todos.pendingOrderCount || 0, tone: "muted", path: `/orders?status=${OrderStatus.PendingPayment}` }] : []),
        ...(canViewFinance.value ? [{ label: "待处理退款", value: todos.pendingRefundCount || 0, tone: "danger", path: "/finance" }] : [])
      ];
});
const mallTodoCards = computed(() => [
  { label: "待确认收款", value: mallStatusCount(["pending_confirm"]), tone: "warning", path: "/mall-orders", query: { status: "pending_confirm" } },
  { label: "待发货订单", value: mallStatusCount(["paid"]), tone: "warning", path: "/mall-orders", query: { status: "paid" } },
  { label: "售后待处理", value: mallRefundCount(["pending", "processing"]), tone: "danger", path: "/mall-refunds", query: { status: "pending" } },
  { label: "待审核商品", value: selectedMallSummary.value.pendingReviewProductCount || 0, tone: "muted", path: "/mall-products" }
]);
const permissionCards = computed(() => {
  if (isPlatformAdmin()) return [];
  const settings = currentTenantSettings();
  return [
    ...(canViewActivities.value ? [{
      label: "活动发布审核",
      value: settings.activityPublishReviewRequired ? "需要平台审核" : "可直接发布",
      tone: settings.activityPublishReviewRequired ? "warning" : "success"
    }] : []),
    ...(canViewRegistrations.value ? [{
      label: "报名审核权限",
      value: settings.registrationReviewEnabled ? "可开启" : "未开通",
      tone: settings.registrationReviewEnabled ? "success" : "muted"
    }] : []),
    ...(canAccess(["payment_account.view", "payment_account.manage", "mall.payment.manage"]) ? [{
      label: "收款配置权限",
      value: settings.paymentAccountEditable ? "可配置" : "只读",
      tone: settings.paymentAccountEditable ? "success" : "warning"
    }] : []),
    ...(canAccess(["mall.product.manage", "mall.order.view", "mall.finance.view"]) ? [{
      label: "商城授权",
      value: settings.mallEnabled ? "已开通" : "未开通",
      tone: settings.mallEnabled ? "success" : "warning"
    }] : [])
  ];
});
const quickActions = computed(() =>
  [
    ...(isPlatformAdmin() ? [{ label: "商家管理", desc: "开通城市合伙人和配置权限", path: "/tenants", roles: ["tenant.manage"] }] : []),
    { label: isPlatformAdmin() ? "活动审核" : "发布活动", desc: isPlatformAdmin() ? "处理待平台审核活动" : "创建或提交活动审核", path: "/activities", roles: isPlatformAdmin() ? ["activity.approve", "activity.view"] : ["activity.manage"] },
    { label: "报名管理", desc: "处理报名、审核和导出", path: "/registrations", roles: ["registration.view", "registration.manage"] },
    { label: isPlatformAdmin() ? "全局订单" : "订单管理", desc: isPlatformAdmin() ? "监管全平台订单和支付状态" : "确认线下收款、备注、退款", path: "/orders", roles: ["order.view", "order.manage"] },
    { label: isPlatformAdmin() ? "全局对账" : "财务对账", desc: "查看流水、退款和异常回调", path: "/finance", roles: ["finance.view", "finance.manage"] },
    { label: "商城商品", desc: "维护商品、库存、上下架和营销", path: "/mall-products", roles: ["mall.product.manage"] },
    { label: "商城订单", desc: "查看订单、发货和售后处理", path: "/mall-orders", roles: ["mall.order.view", "mall.order.manage"] },
    { label: "商城统计", desc: "查看店铺成交、结算和经营数据", path: "/mall-statistics", roles: ["mall.statistics.view"] }
  ].filter((item) => canAccess(item.roles))
);
const mallQuickActions = computed(() =>
  [
    { label: "商品与库存", desc: "维护商品、规格、上下架和库存", path: "/mall-products", roles: ["mall.product.manage"] },
    { label: "订单发货", desc: "确认线下收款、填写物流和跟进履约", path: "/mall-orders", roles: ["mall.order.view", "mall.order.manage"] },
    { label: "售后退款", desc: "处理退款申请和售后凭证", path: "/mall-refunds", roles: ["mall.refund.manage", "mall.finance.view"] },
    { label: "营销活动", desc: "配置优惠券、秒杀、拼团和推广码", path: "/mall-marketing", roles: ["mall.product.manage"] },
    { label: "收款配置", desc: "维护微信、线下和店铺直收资料", path: "/mall-payments", roles: ["mall.payment.manage"] },
    { label: "经营统计", desc: "查看店铺成交、支付方式和热销商品", path: "/mall-statistics", roles: ["mall.statistics.view"] }
  ].filter((item) => canAccess(item.roles))
);

async function load() {
  loading.value = true;
  try {
    if (mallWorkbenchMode.value) await loadMallWorkbench();
    else data.value = await api.get("/admin/dashboard");
  } finally {
    loading.value = false;
  }
}

async function loadMallWorkbench() {
  data.value = undefined;
  mallMerchants.value = await api.get("/admin/mall/accessible-merchants", { params: { enabled: "true" } });
  if (!mallMerchants.value.some((merchant) => merchant.id === selectedMallMerchantId.value)) {
    selectedMallMerchantId.value = mallMerchants.value[0]?.id;
  }
  await loadMallAnalytics();
}

async function loadMallAnalytics() {
  mallAnalytics.value = {};
  if (!selectedMallMerchant.value) return;
  mallAnalytics.value = await api.get("/admin/mall/analytics", { params: mallRouteQuery() });
}

async function handleMallMerchantChange() {
  loading.value = true;
  try {
    await loadMallAnalytics();
  } finally {
    loading.value = false;
  }
}

function openTodo(path: string) {
  router.push(path);
}

function openMallTodo(item: { path?: string; query?: Record<string, string> }) {
  if (!item.path) return;
  goMallPage(item.path, item.query || {});
}

function goMallPage(path: string, extra: Record<string, string> = {}) {
  router.push({ path, query: mallRouteQuery(extra) });
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

function merchantLabel(merchant: MallMerchant) {
  const owner = merchant.ownerType === "agent" ? "代理店铺" : "商家店铺";
  return `${merchant.name || merchant.code || `店铺 #${merchant.id}`}（${owner}${merchant.region ? ` · ${merchant.region}` : ""}）`;
}

function paymentText(value: string) {
  return ({ wechat: "微信支付", balance: "余额支付", offline: "线下收款", alipay: "支付宝" } as Record<string, string>)[value] || value || "-";
}

function statusText(value: string) {
  return ({ pending_payment: "待付款", pending_confirm: "待确认", paid: "待发货", shipped: "已发货", completed: "已完成", refund_pending: "售后中", refunded: "已退款", closed: "已关闭" } as Record<string, string>)[value] || value || "-";
}

function refundText(value: string) {
  return ({ pending: "待处理", processing: "处理中", approved: "已通过", rejected: "已拒绝", failed: "失败" } as Record<string, string>)[value] || value || "-";
}

function statusTagType(value: string) {
  return ({ completed: "success", refunded: "info", closed: "info", refund_pending: "warning", pending_payment: "warning", pending_confirm: "warning" } as Record<string, string>)[value] || "primary";
}

function refundTagType(value: string) {
  return ({ approved: "success", rejected: "info", failed: "danger", pending: "warning", processing: "warning" } as Record<string, string>)[value] || "primary";
}

function money(value: any) {
  return Number(value || 0).toFixed(2);
}

function mallStatusCount(statuses: string[]) {
  return (mallAnalytics.value?.byStatus || []).filter((row: any) => statuses.includes(row.status)).reduce((sum: number, row: any) => sum + Number(row.orderCount || 0), 0);
}

function mallRefundCount(statuses: string[]) {
  return (mallAnalytics.value?.refunds || []).filter((row: any) => statuses.includes(row.status)).reduce((sum: number, row: any) => sum + Number(row.refundCount || 0), 0);
}

function mallRefundAmount(statuses: string[]) {
  return (mallAnalytics.value?.refunds || []).filter((row: any) => statuses.includes(row.status)).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
}

function mallRouteQuery(extra: Record<string, string> = {}) {
  const merchant = selectedMallMerchant.value;
  return {
    ...(merchant?.tenant?.id ? { tenantId: String(merchant.tenant.id) } : {}),
    ...(merchant?.id ? { merchantId: String(merchant.id) } : {}),
    ...extra
  };
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>{{ pageTitle }}</h2>
      <div class="toolbar-actions">
        <el-select v-if="mallWorkbenchMode && mallMerchants.length > 1" v-model="selectedMallMerchantId" filterable placeholder="选择店铺" style="width: 280px" @change="handleMallMerchantChange">
          <el-option v-for="merchant in mallMerchants" :key="merchant.id" :label="merchantLabel(merchant)" :value="merchant.id" />
        </el-select>
        <el-button :loading="loading" @click="load">刷新</el-button>
      </div>
    </div>

    <template v-if="mallWorkbenchMode">
      <el-alert v-if="!loading && !mallMerchants.length" type="warning" show-icon :closable="false" title="当前账号还没有可运营的商城店铺" description="请联系平台管理员在商城店铺中为此账号授权店铺后再进入工作台。" />

      <div v-if="selectedMallMerchant" class="mall-merchant-card">
        <div>
          <span>当前店铺</span>
          <strong>{{ selectedMallMerchant.name || selectedMallMerchant.code }}</strong>
          <small>{{ selectedMallMerchant.tenant?.name || currentTenantName() || "商家" }} · {{ selectedMallMerchant.region || "未设置区域" }}</small>
        </div>
        <div>
          <span>收款模式</span>
          <strong>{{ selectedMallMerchant.paymentMode === "merchant_direct" ? "商户直收" : "平台代收" }}</strong>
          <small>授权账号 {{ selectedMallSummary.enabledAccessCount || 0 }} 个 / 收款账户 {{ selectedMallSummary.enabledPaymentAccountCount || 0 }} 个</small>
        </div>
      </div>

      <div v-if="selectedMallMerchant" class="operation-grid" v-loading="loading">
        <div v-for="item in mallOperationCards" :key="item.label" class="operation-card">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
          <small>{{ item.sub }}</small>
        </div>
      </div>

      <div v-if="selectedMallMerchant" class="metric-grid">
        <div v-for="item in mallMetricCards" :key="item.label" class="metric"><span>{{ item.label }}</span><strong>{{ item.value }}</strong></div>
      </div>

      <div v-if="selectedMallMerchant" class="todo-grid">
        <div v-for="item in mallTodoCards" :key="item.label" class="todo" :class="[item.tone, { clickable: item.path }]" @click="openMallTodo(item)">
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

      <div v-if="selectedMallMerchant" class="dashboard-columns">
        <div class="table-card">
          <h3>店铺健康</h3>
          <div class="health-list">
            <div v-for="item in mallHealthCards" :key="item.label" class="health-item" :class="item.tone">
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
            <button v-for="item in mallQuickActions" :key="item.path" type="button" @click="goMallPage(item.path)">
              <span>{{ item.label }}</span>
              <small>{{ item.desc }}</small>
            </button>
          </div>
        </div>
      </div>

      <div v-if="selectedMallMerchant" class="dashboard-columns">
        <div class="table-card">
          <h3>订单状态</h3>
          <el-table :data="mallAnalytics.byStatus || []" stripe empty-text="暂无订单状态">
            <el-table-column label="状态" min-width="120">
              <template #default="{ row }"><el-tag :type="statusTagType(row.status)" effect="light">{{ statusText(row.status) }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="orderCount" label="订单" width="90" />
            <el-table-column label="金额" width="120"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          </el-table>
        </div>

        <div class="table-card">
          <h3>支付与售后</h3>
          <el-table :data="mallAnalytics.byPaymentMethod || []" stripe empty-text="暂无支付数据">
            <el-table-column label="支付方式" min-width="120"><template #default="{ row }">{{ paymentText(row.paymentMethod) }}</template></el-table-column>
            <el-table-column prop="orderCount" label="订单" width="90" />
            <el-table-column label="金额" width="120"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          </el-table>
          <el-table class="mini-table" :data="mallAnalytics.refunds || []" stripe empty-text="暂无售后数据">
            <el-table-column label="售后状态" min-width="120">
              <template #default="{ row }"><el-tag :type="refundTagType(row.status)" effect="light">{{ refundText(row.status) }}</el-tag></template>
            </el-table-column>
            <el-table-column prop="refundCount" label="数量" width="90" />
            <el-table-column label="金额" width="120"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          </el-table>
        </div>
      </div>

      <div class="table-card" v-if="selectedMallMerchant">
        <h3>近 30 天热销商品</h3>
        <el-table :data="mallAnalytics.topProducts || []" stripe empty-text="暂无热销商品">
          <el-table-column label="商品" min-width="220"><template #default="{ row }">{{ row.productTitle || `商品 #${row.productId}` }}</template></el-table-column>
          <el-table-column prop="quantity" label="销量" width="90" />
          <el-table-column label="销售额" width="130"><template #default="{ row }">¥{{ money(row.grossAmount) }}</template></el-table-column>
        </el-table>
      </div>
    </template>

    <div v-if="!mallWorkbenchMode && data" class="operation-grid" v-loading="loading">
      <div v-for="item in operationCards" :key="item.label" class="operation-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <small>{{ item.sub }}</small>
      </div>
    </div>

    <div v-if="!mallWorkbenchMode && data" class="metric-grid">
      <div v-for="item in metricCards" :key="item.label" class="metric"><span>{{ item.label }}</span><strong>{{ item.value }}</strong></div>
    </div>

    <div v-if="!mallWorkbenchMode && data" class="todo-grid">
      <div v-for="item in todoCards" :key="item.label" class="todo" :class="[item.tone, { clickable: item.path }]" @click="item.path && openTodo(item.path)">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>

    <div v-if="!mallWorkbenchMode && permissionCards.length" class="permission-grid">
      <div v-for="item in permissionCards" :key="item.label" class="permission" :class="item.tone">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>

    <div v-if="!mallWorkbenchMode && data" class="dashboard-columns">
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

    <div class="table-card" v-if="!mallWorkbenchMode && data && canViewActivities">
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
            <el-button v-if="canViewRegistrations" size="small" @click="openActivityRegistrations(row)">报名</el-button>
            <el-button v-if="canViewOrders" size="small" @click="openActivityOrders(row)">订单</el-button>
            <el-button v-if="!isPlatformAdmin()" size="small" @click="openActivityRecap(row)">复盘</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.operation-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
.toolbar-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
.mall-merchant-card { background: #fff; border: 1px solid #fed7aa; border-radius: 8px; padding: 16px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
.mall-merchant-card div { display: grid; gap: 6px; }
.mall-merchant-card span { color: #64748b; font-size: 13px; }
.mall-merchant-card strong { color: #0f172a; font-size: 20px; }
.mall-merchant-card small { color: #667085; line-height: 1.45; }
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
.mini-table { margin-top: 12px; }
h3 { margin: 0 0 16px; }
@media (max-width: 900px) { .operation-grid, .metric-grid, .todo-grid, .permission-grid, .dashboard-columns { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 640px) { .operation-grid, .metric-grid, .todo-grid, .permission-grid, .dashboard-columns, .mall-merchant-card { grid-template-columns: 1fr; } }
</style>
