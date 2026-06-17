<template>
  <view class="container orders-page has-custom-nav">
    <view class="custom-nav">
      <view class="nav-back" @click="goBack">‹ 返回</view>
      <text class="title-md" style="flex:1; text-align:center;">我的订单</text>
      <view class="nav-refresh" @click="loadOrders">刷新</view>
    </view>

    <view class="order-tabs">
      <view v-for="tab in tabs" :key="tab.key" class="order-tab" :class="{ active: activeTab === tab.key }" @click="activeTab = tab.key">{{ tab.label }}</view>
    </view>

    <view v-if="loading" class="card subtle">订单加载中...</view>
    <view v-else-if="loadError" class="card error-card">
      <view class="title small">订单加载失败</view>
      <view class="subtle">{{ loadError }}</view>
      <view class="button secondary retry" @click="loadOrders">重新加载</view>
    </view>

    <template v-else>
      <view v-for="item in visibleOrders" :key="item.key" class="card order-card" @click="openOrder(item)">
        <view class="row order-head">
          <view>
            <view class="order-type">{{ item.typeLabel }}</view>
            <view class="order-title">{{ item.title }}</view>
          </view>
          <view class="status-pill" :class="item.statusClass">{{ item.statusText }}</view>
        </view>
        <view class="order-meta">
          <view><text>订单号</text><text>{{ item.orderNo || "-" }}</text></view>
          <view><text>金额</text><text>{{ moneyText(item.amount) }}</text></view>
          <view><text>方式</text><text>{{ paymentText(item.paymentMethod) }}</text></view>
          <view><text>时间</text><text>{{ formatTime(item.createdAt) }}</text></view>
        </view>
        <view v-if="item.tip" class="notice" :class="{ muted: item.statusClass !== 'pending' }">{{ item.tip }}</view>
        <view class="order-action">{{ item.actionText }} ›</view>
      </view>
      <empty-state v-if="!visibleOrders.length" icon="📋" text="暂无对应订单" />
    </template>
    <TabBar current="user" />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ensureUser, request, withTenantCode } from "../../api";
import EmptyState from "../../components/EmptyState.vue";
import TabBar from "../../components/TabBar.vue";

type OrderTab = "all" | "pending" | "learning" | "completed";
type UiOrder = {
  key: string;
  type: "activity" | "course";
  typeLabel: string;
  title: string;
  orderNo?: string;
  amount?: string | number;
  paymentMethod?: string;
  status: string;
  statusText: string;
  statusClass: string;
  createdAt?: string;
  targetId?: number;
  courseId?: number;
  owned?: boolean;
  progress?: number;
  tip?: string;
  actionText: string;
};

const tabs = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待付款/确认" },
  { key: "learning", label: "待学习" },
  { key: "completed", label: "已完成" }
] as const;
const activeTab = ref<OrderTab>("all");
const loading = ref(false);
const loadError = ref("");
const registrations = ref<any[]>([]);
const courses = ref<any[]>([]);
const courseOrders = ref<any[]>([]);

const allOrders = computed<UiOrder[]>(() => {
  const activityRows = registrations.value.map(toActivityOrder);
  const courseOrderRows = courseOrders.value.map(toCourseOrder);
  const learningRows = courses.value
    .filter((course) => !courseOrders.value.some((order) => order.course?.id === course.id))
    .map(toLearningOrder);
  return [...activityRows, ...courseOrderRows, ...learningRows].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
});
const visibleOrders = computed(() => allOrders.value.filter((item) => {
  if (activeTab.value === "pending") return item.statusClass === "pending";
  if (activeTab.value === "learning") return item.type === "course" && item.owned && Number(item.progress || 0) < 100;
  if (activeTab.value === "completed") return item.statusClass === "done" || Number(item.progress || 0) >= 100;
  return true;
}));

function readRouteStatus() {
  const pages = getCurrentPages();
  const options = (pages[pages.length - 1] as any)?.options || {};
  const status = String(options.status || "all");
  if (["all", "pending", "learning", "completed"].includes(status)) activeTab.value = status as OrderTab;
}

async function loadOrders() {
  loading.value = true;
  loadError.value = "";
  try {
    await ensureUser();
    const [registrationRows, courseRows, courseOrderRows] = await Promise.all([
      request<any[]>("/public/me/registrations").catch(() => []),
      request<any[]>("/public/me/courses").catch(() => []),
      request<any[]>("/public/me/course-orders").catch(() => [])
    ]);
    registrations.value = Array.isArray(registrationRows) ? registrationRows : [];
    courses.value = Array.isArray(courseRows) ? courseRows : [];
    courseOrders.value = Array.isArray(courseOrderRows) ? courseOrderRows : [];
  } catch (error: any) {
    loadError.value = error?.message || "订单加载失败";
  } finally {
    loading.value = false;
  }
}

function toActivityOrder(row: any): UiOrder {
  const order = row.order || {};
  const status = row.status || order.status || "";
  return {
    key: `activity-${row.id}`,
    type: "activity",
    typeLabel: "活动报名",
    title: row.activity?.title || "未命名活动",
    orderNo: order.orderNo,
    amount: order.amount,
    paymentMethod: order.paymentMethod,
    status,
    statusText: registrationStatusText(status),
    statusClass: statusClass(status),
    createdAt: row.createdAt || order.createdAt,
    targetId: row.id,
    tip: activityTip(status, order),
    actionText: "查看报名详情"
  };
}

function toCourseOrder(order: any): UiOrder {
  const owned = Boolean(order.owned || order.status === "paid");
  const learnedCourse = courses.value.find((course) => course.id === order.course?.id);
  const progress = Number(learnedCourse?.learning?.progress || 0);
  const completed = owned && progress >= 100;
  return {
    key: `course-order-${order.id}`,
    type: "course",
    typeLabel: "课程订单",
    title: order.course?.title || "未命名课程",
    orderNo: order.orderNo,
    amount: order.amount,
    paymentMethod: order.paymentMethod,
    status: order.status,
    statusText: courseOrderStatusText(order.status, owned, completed),
    statusClass: order.status === "pending_payment" ? "pending" : completed ? "done" : owned ? "learning" : "muted",
    createdAt: order.createdAt,
    courseId: order.course?.id,
    owned,
    progress,
    tip: order.status === "pending_payment" ? "线下付款订单已提交，后台确认收款后才会开通学习权限。" : owned ? `学习进度 ${progress}%` : "",
    actionText: owned ? "去学习" : "查看课程"
  };
}

function toLearningOrder(course: any): UiOrder {
  const progress = Number(course.learning?.progress || 0);
  return {
    key: `course-learning-${course.id}`,
    type: "course",
    typeLabel: "已购课程",
    title: course.title || "未命名课程",
    amount: course.price,
    paymentMethod: Number(course.price || 0) > 0 ? "offline" : "free",
    status: progress >= 100 ? "completed" : "learning",
    statusText: progress >= 100 ? "已完成" : "学习中",
    statusClass: progress >= 100 ? "done" : "learning",
    createdAt: course.learning?.updatedAt,
    courseId: course.id,
    owned: true,
    progress,
    tip: `学习进度 ${progress}%`,
    actionText: "继续学习"
  };
}

function statusClass(status: string) {
  if (status === "pending_payment") return "pending";
  if (["approved", "checked_in", "paid", "completed"].includes(status)) return "done";
  if (["pending_review", "learning"].includes(status)) return "learning";
  return "muted";
}

function registrationStatusText(status: string) {
  const map: Record<string, string> = {
    pending_payment: "待付款/确认",
    pending_review: "待审核",
    approved: "报名成功",
    checked_in: "已签到",
    rejected: "已拒绝",
    cancelled: "已取消"
  };
  return map[status] || "报名记录";
}

function courseOrderStatusText(status: string, owned: boolean, completed = false) {
  if (completed) return "已完成";
  if (owned) return "待学习";
  if (status === "pending_payment") return "待确认收款";
  if (status === "closed") return "已关闭";
  return "课程订单";
}

function activityTip(status: string, order: any) {
  if (status === "pending_payment" && order?.paymentMethod === "offline") return "请按报名详情里的线下收款说明付款，后台确认后状态会更新。";
  if (status === "pending_payment") return "请进入报名详情完成支付。";
  if (status === "pending_review") return "报名已提交，等待主办方审核。";
  return "";
}

function paymentText(method?: string) {
  const map: Record<string, string> = { free: "免费", offline: "线下收款", wechat: "微信", alipay: "支付宝", balance: "余额" };
  return map[String(method || "")] || "-";
}

function moneyText(value?: string | number) {
  const amount = Number(value || 0);
  return amount > 0 ? `¥${amount.toFixed(2)}` : "免费";
}

function formatTime(value?: string) {
  if (!value) return "-";
  return String(value).replace("T", " ").slice(0, 16);
}

function openOrder(item: UiOrder) {
  if (item.type === "activity" && item.targetId) {
    uni.navigateTo({ url: withTenantCode(`/pages/user/registration?id=${item.targetId}`) });
    return;
  }
  if (item.type === "course" && item.courseId) {
    const url = item.owned ? `/pages/course/player?id=${item.courseId}` : `/pages/course/detail?id=${item.courseId}`;
    uni.navigateTo({ url: withTenantCode(url) });
  }
}

function goBack() { uni.navigateBack(); }

onMounted(() => {
  readRouteStatus();
  loadOrders();
});
</script>

<style scoped>
.orders-page { padding-bottom: 160rpx; }
.custom-nav { display:flex; align-items:center; padding:16rpx 0; }
.nav-back, .nav-refresh { font-size:28rpx; color:#4A6B8A; }
.order-tabs { display:grid; grid-template-columns: repeat(4, 1fr); gap: 8rpx; margin-bottom: 18rpx; }
.order-tab { padding: 14rpx 8rpx; border-radius: 999px; background: #F3ECE2; color: #7C6A58; text-align: center; font-size: 23rpx; font-weight: 800; }
.order-tab.active { background: #C43D3D; color: #fff; }
.order-card { margin-bottom: 16rpx; }
.order-head { align-items: flex-start; gap: 16rpx; }
.order-type { color: #C43D3D; font-size: 22rpx; font-weight: 900; }
.order-title { margin-top: 6rpx; color: #222; font-size: 30rpx; font-weight: 900; line-height: 1.35; }
.status-pill { flex: 0 0 auto; padding: 8rpx 16rpx; border-radius: 999px; font-size: 22rpx; font-weight: 900; background: #edf0f5; color: #667085; }
.status-pill.pending { background: #fff7ed; color: #9a3412; }
.status-pill.learning { background: #eef2ff; color: #3730a3; }
.status-pill.done { background: #ecfdf3; color: #166534; }
.order-meta { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12rpx 18rpx; margin-top: 18rpx; }
.order-meta view { display:grid; gap: 4rpx; }
.order-meta text:first-child { color: #999; font-size: 22rpx; }
.order-meta text:last-child { color: #333; font-size: 25rpx; font-weight: 700; word-break: break-all; }
.notice { margin-top: 16rpx; padding: 16rpx; border-radius: 12rpx; background: #fff7ed; color: #9a3412; font-size: 24rpx; line-height: 1.5; }
.notice.muted { background: #f3f4f6; color: #4b5563; }
.order-action { margin-top: 18rpx; color: #C43D3D; font-size: 26rpx; font-weight: 900; text-align: right; }
.small { font-size: 30rpx; }
.retry { display:inline-flex; margin-top:16rpx; }
</style>
