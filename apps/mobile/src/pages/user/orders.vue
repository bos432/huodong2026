<template>
  <view class="container orders-page has-custom-nav">
    <view class="orders-toolbar">
      <text class="orders-toolbar-label">订单状态</text>
      <view class="refresh-action" :class="{ disabled: loading }" role="button" tabindex="0" aria-label="刷新我的订单" :aria-busy="loading" :aria-disabled="loading" @click="refreshOrders" @keyup.enter="refreshOrders" @keyup.space.prevent="refreshOrders">{{ loading ? "同步中" : "刷新" }}</view>
    </view>

    <view class="order-tabs" role="tablist" aria-label="订单状态筛选">
      <view v-for="tab in tabs" :key="tab.key" class="order-tab" :class="{ active: activeTab === tab.key }" role="tab" tabindex="0" :aria-selected="activeTab === tab.key" @click="selectTab(tab.key)" @keyup.enter="selectTab(tab.key)" @keyup.space.prevent="selectTab(tab.key)">{{ tab.label }}</view>
    </view>

    <view v-if="loading" class="card subtle" role="status" aria-live="polite">订单加载中...</view>
    <view v-else-if="loadError" class="card error-card" role="alert" aria-live="assertive">
      <view class="title small">订单加载失败</view>
      <view class="subtle">{{ loadError }}</view>
      <view class="button secondary retry" role="button" tabindex="0" aria-label="重新加载我的订单" @click="loadOrders" @keyup.enter="loadOrders" @keyup.space.prevent="loadOrders">重新加载</view>
    </view>

    <template v-else>
      <view v-if="loadWarning" class="card warning-card" role="status" aria-live="polite">{{ loadWarning }}</view>
      <view v-if="actionError" class="card error-card action-error" role="alert" aria-live="assertive">
        <text>{{ actionError }}</text>
        <view class="error-close" role="button" tabindex="0" aria-label="关闭订单操作错误" @click="actionError = ''" @keyup.enter="actionError = ''" @keyup.space.prevent="actionError = ''">知道了</view>
      </view>
      <view v-for="item in visibleOrders" :key="item.key" class="card order-card" role="button" tabindex="0" :aria-label="`查看订单：${item.title}`" @click="openOrder(item)" @keyup.enter="openOrder(item)" @keyup.space.prevent="openOrder(item)">
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
        <view v-if="item.type === 'course' && item.canRefund" class="button secondary course-refund-action" :class="{ disabled: refundingOrderId !== 0 }" role="button" tabindex="0" :aria-label="`申请${item.title}退款${fenMoneyText(item.refundableAmountFen)}`" :aria-busy="refundingOrderId === item.orderId" @click.stop="requestCourseRefund(item)" @keyup.enter.stop="requestCourseRefund(item)" @keyup.space.stop.prevent="requestCourseRefund(item)">{{ refundingOrderId === item.orderId ? "提交中..." : `申请退款 ${fenMoneyText(item.refundableAmountFen)}` }}</view>
        <view class="order-action">{{ item.actionText }} ›</view>
      </view>
      <empty-state v-if="!visibleOrders.length" icon="📋" text="暂无对应订单" />
    </template>
    <TabBar current="user" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, getCurrentTenantCode, getUserId, getUserToken, request, withTenantCode } from "../../api";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import EmptyState from "../../components/EmptyState.vue";
import TabBar from "../../components/TabBar.vue";
import { reviewSafeText } from "../../review-safe-text";

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
  orderId?: number;
  owned?: boolean;
  progress?: number;
  latestRefund?: any;
  refundableAmountFen?: number;
  canRefund?: boolean;
  tip?: string;
  actionText: string;
};

const tabs = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待处理" },
  { key: "learning", label: "待观看" },
  { key: "completed", label: "已完成" }
] as const;
const activeTab = ref<OrderTab>("all");
const loading = ref(false);
const loadError = ref("");
const loadWarning = ref("");
const actionError = ref("");
const registrations = ref<any[]>([]);
const courses = ref<any[]>([]);
const courseOrders = ref<any[]>([]);
const refundingOrderId = ref(0);
const loadedContextKey = ref("");
const loadGuard = createTenantLoadGuard();
let orderLoadSerial = 0;

type MemberSession = { tenantCode: string; userId: number; userToken: string };

function memberSession(): MemberSession {
  return { tenantCode: getCurrentTenantCode(), userId: getUserId(), userToken: getUserToken() };
}

function isCurrentSession(session: MemberSession) {
  return getCurrentTenantCode() === session.tenantCode && getUserId() === session.userId && getUserToken() === session.userToken;
}

function clearOrderState() {
  registrations.value = [];
  courses.value = [];
  courseOrders.value = [];
  refundingOrderId.value = 0;
}

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
  if (activeTab.value === "learning") return item.type === "course" && item.statusClass === "learning" && item.owned && Number(item.progress || 0) < 100;
  if (activeTab.value === "completed") return item.statusClass === "done" || item.status.endsWith("refund_completed") || Number(item.progress || 0) >= 100;
  return true;
}));

function readRouteStatus() {
  const pages = getCurrentPages();
  const options = (pages[pages.length - 1] as any)?.options || {};
  const status = String(options.status || "all");
  if (["all", "pending", "learning", "completed"].includes(status)) activeTab.value = status as OrderTab;
}

async function loadOrders() {
  const serial = ++orderLoadSerial;
  const loadToken = loadGuard.begin();
  let requestedSession = memberSession();
  const isActiveLoad = () => serial === orderLoadSerial;
  const isCurrentLoad = () => isActiveLoad() && loadGuard.isCurrent(loadToken) && isCurrentSession(requestedSession);
  const initialContextKey = `${loadToken.tenantCode}:${requestedSession.userId || "guest"}`;
  if (loadedContextKey.value && loadedContextKey.value !== initialContextKey) clearOrderState();
  loading.value = true;
  loadError.value = "";
  loadWarning.value = "";
  actionError.value = "";
  try {
    await ensureUser();
    if (!loadGuard.isCurrent(loadToken)) {
      if (isActiveLoad()) void loadOrders();
      return;
    }
    requestedSession = memberSession();
    const contextKey = `${loadToken.tenantCode}:${requestedSession.userId}`;
    if (loadedContextKey.value && loadedContextKey.value !== contextKey) clearOrderState();
    const results = await Promise.allSettled([
      request<any[]>("/public/me/registrations"),
      request<any[]>("/public/me/courses"),
      request<any[]>("/public/me/course-orders")
    ]);
    if (!isCurrentLoad()) {
      if (isActiveLoad()) void loadOrders();
      return;
    }
    const failures: string[] = [];
    const readRows = (index: number, label: string) => {
      const result = results[index];
      if (result.status === "fulfilled" && Array.isArray(result.value)) return result.value;
      failures.push(label);
      return [];
    };
    const registrationRows = readRows(0, "活动报名");
    const courseRows = readRows(1, "学习记录");
    const courseOrderRows = readRows(2, "课程订单");
    if (failures.length === results.length) {
      const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult | undefined;
      throw rejected?.reason || new Error("订单数据格式异常，请重新加载");
    }
    registrations.value = registrationRows;
    courses.value = courseRows;
    courseOrders.value = courseOrderRows;
    loadWarning.value = failures.length ? `部分订单同步失败：${failures.join("、")}。当前仅展示已成功同步的数据。` : "";
    loadedContextKey.value = contextKey;
  } catch (error: any) {
    if (!isActiveLoad()) return;
    clearOrderState();
    loadError.value = reviewSafeText(error?.message || "订单加载失败");
  } finally {
    if (isActiveLoad()) loading.value = false;
  }
}

function refreshOrders() {
  if (loading.value) return;
  void loadOrders();
}

function toActivityOrder(row: any): UiOrder {
  const order = row.order || {};
  const status = row.status || order.status || "";
  const refund = row.latestRefund || null;
  return {
    key: `activity-${row.id}`,
    type: "activity",
    typeLabel: "活动报名",
    title: row.activity?.title || "未命名活动",
    orderNo: order.orderNo,
    amount: order.amount,
    paymentMethod: order.paymentMethod,
    status: refund?.status ? `refund_${refund.status}` : status,
    statusText: activityStatusText(status, order, refund),
    statusClass: activityStatusClass(status, order, refund),
    createdAt: row.createdAt || order.createdAt,
    targetId: row.id,
    tip: activityTip(status, order, refund),
    actionText: "查看报名详情"
  };
}

function toCourseOrder(order: any): UiOrder {
  const owned = order.owned === undefined ? order.status === "paid" : Boolean(order.owned);
  const refund = order.latestRefund || null;
  const refundableAmountFen = Math.max(Number(order.refundableAmountFen || 0), 0);
  const refundedAmountFen = Math.max(Number(order.refundedAmountFen ?? refund?.amountFen ?? 0), 0);
  const activeRefund = ["pending", "approved", "processing", "failed"].includes(String(refund?.status || ""));
  const learnedCourse = courses.value.find((course) => course.id === order.course?.id);
  const progress = Number(learnedCourse?.learning?.progress || 0);
  const completed = owned && progress >= 100;
  return {
    key: `course-order-${order.id}`,
    type: "course",
    typeLabel: "内容订单",
    title: reviewSafeText(order.course?.title || "未命名内容"),
    orderNo: order.orderNo,
    amount: order.amount,
    paymentMethod: order.paymentMethod,
    status: refund?.status ? `course_refund_${refund.status}` : order.status,
    statusText: courseOrderStatusText(order.status, owned, completed, refund),
    statusClass: courseOrderStatusClass(order.status, owned, completed, refund),
    createdAt: order.createdAt,
    courseId: order.course?.id,
    orderId: order.id,
    owned,
    progress,
    latestRefund: refund,
    refundableAmountFen,
    canRefund: ["paid", "partially_refunded"].includes(order.status) && refundableAmountFen > 0 && !activeRefund,
    tip: courseOrderTip(order.status, owned, progress, refund, refundedAmountFen),
    actionText: owned ? "去观看" : "查看内容"
  };
}

function toLearningOrder(course: any): UiOrder {
  const progress = Number(course.learning?.progress || 0);
  return {
    key: `course-learning-${course.id}`,
    type: "course",
    typeLabel: "已加入内容",
    title: reviewSafeText(course.title || "未命名内容"),
    amount: course.price,
    paymentMethod: Number(course.price || 0) > 0 ? "offline" : "free",
    status: progress >= 100 ? "completed" : "learning",
    statusText: progress >= 100 ? "已完成" : "观看中",
    statusClass: progress >= 100 ? "done" : "learning",
    createdAt: course.learning?.updatedAt,
    courseId: course.id,
    owned: true,
    progress,
    tip: `观看进度 ${progress}%`,
    actionText: "继续观看"
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

function activityStatusText(status: string, order: any, refund: any) {
  if (["pending", "processing"].includes(String(refund?.status || ""))) return "退款处理中";
  if (refund?.status === "completed") return order?.status === "partially_refunded" ? "部分退款" : "已退款";
  if (refund?.status === "rejected") return "退款未通过";
  return registrationStatusText(status);
}

function activityStatusClass(status: string, order: any, refund: any) {
  if (["pending", "processing"].includes(String(refund?.status || ""))) return "pending";
  if (refund?.status === "completed") return order?.status === "partially_refunded" ? statusClass(status) : "muted";
  if (refund?.status === "rejected") return "muted";
  return statusClass(status);
}

function courseOrderStatusText(status: string, owned: boolean, completed = false, refund?: any) {
  if (refund?.status === "pending") return "退款待审核";
  if (["approved", "processing"].includes(String(refund?.status || ""))) return "退款处理中";
  if (refund?.status === "failed") return "退款异常";
  if (refund?.status === "rejected") return "退款未通过";
  if (refund?.status === "completed") return status === "refunded" ? "已退款" : "部分退款";
  if (completed) return "已完成";
  if (owned) return "待观看";
  if (status === "pending_payment") return "待确认收款";
  if (status === "closed") return "已关闭";
  return "内容订单";
}

function courseOrderStatusClass(status: string, owned: boolean, completed: boolean, refund?: any) {
  if (["pending", "approved", "processing", "failed"].includes(String(refund?.status || ""))) return "pending";
  if (["rejected", "completed"].includes(String(refund?.status || ""))) return status === "partially_refunded" && owned ? "learning" : "muted";
  return status === "pending_payment" ? "pending" : completed ? "done" : owned ? "learning" : "muted";
}

function courseOrderTip(status: string, owned: boolean, progress: number, refund?: any, refundedAmountFen = 0) {
  const amount = fenMoneyText(refund?.amountFen);
  const totalRefunded = fenMoneyText(refundedAmountFen || refund?.amountFen);
  if (refund?.status === "pending") return `退款申请 ${amount} 待后台审核，审核完成前课程权益保持有效。`;
  if (["approved", "processing"].includes(String(refund?.status || ""))) return `退款 ${amount} 正在处理，通道确认完成后将同步课程权益。`;
  if (refund?.status === "failed") return `退款 ${amount} 处理异常：${reviewSafeText(refund.failureReason || "请联系运营人员处理")}`;
  if (refund?.status === "rejected") return refund.reviewRemark ? `退款未通过：${reviewSafeText(refund.reviewRemark)}` : "退款申请未通过，可重新申请或联系运营人员。";
  if (refund?.status === "completed") return status === "refunded" ? `已累计退款 ${totalRefunded}，本订单课程权益和有效证书已撤销。` : `已累计退款 ${totalRefunded}，剩余课程权益保持有效。`;
  if (status === "pending_payment") return "线下付款订单已提交，后台确认收款后才会开通参与权益。";
  return owned ? `观看进度 ${progress}%` : "";
}

function activityTip(status: string, order: any, refund: any) {
  if (["pending", "processing"].includes(String(refund?.status || ""))) return `退款申请处理中，申请金额 ${moneyText(refund.amount)}。`;
  if (refund?.status === "completed") return order?.status === "partially_refunded"
    ? `最近一笔退款已完成，金额 ${moneyText(refund.amount)}，订单为部分退款。`
    : `退款已完成，退款金额 ${moneyText(refund.amount)}。`;
  if (refund?.status === "rejected") return refund.reviewRemark ? `退款未通过：${reviewSafeText(refund.reviewRemark)}` : "退款申请未通过，可进入详情联系主办方。";
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

function fenMoneyText(value?: string | number) {
  return `¥${(Math.max(Number(value || 0), 0) / 100).toFixed(2)}`;
}

function requestCourseRefund(item: UiOrder) {
  if (!item.orderId || !item.canRefund || refundingOrderId.value) return;
  const context = { ...memberSession(), orderId: item.orderId, amountFen: Number(item.refundableAmountFen || 0) };
  const assertContext = () => {
    if (!isCurrentSession(context)) throw new Error("当前城市或账号已变化，请重新操作");
    const currentOrder = courseOrders.value.find((order) => Number(order.id) === context.orderId);
    const currentView = currentOrder ? toCourseOrder(currentOrder) : null;
    if (!currentView?.canRefund || Number(currentView.refundableAmountFen || 0) !== context.amountFen) throw new Error("订单退款状态或金额已变化，请刷新后重试");
  };
  refundingOrderId.value = item.orderId;
  actionError.value = "";
  uni.showModal({
    title: "申请课程退款",
    content: `本次最多可退 ${fenMoneyText(item.refundableAmountFen)}。全额退款完成后将收回课程学习权限并撤销有效证书。`,
    editable: true,
    placeholderText: "请填写退款原因",
    confirmText: "提交申请",
    success: async (result) => {
      if (!result.confirm) {
        refundingOrderId.value = 0;
        return;
      }
      const reason = String(result.content || "").trim();
      if (reason.length < 2) {
        refundingOrderId.value = 0;
        uni.showToast({ title: "请填写至少 2 个字的退款原因", icon: "none" });
        return;
      }
      try {
        assertContext();
        await request(`/public/course-orders/${context.orderId}/refunds`, { method: "POST", data: { amountFen: context.amountFen, reason } });
        if (!isCurrentSession(context)) return;
        uni.showToast({ title: "退款申请已提交", icon: "none" });
        refundingOrderId.value = 0;
        await loadOrders();
      } catch (error: any) {
        if (isCurrentSession(context)) actionError.value = reviewSafeText(error?.message || "退款申请失败");
      } finally {
        if (refundingOrderId.value === context.orderId) refundingOrderId.value = 0;
      }
    },
    fail: () => { refundingOrderId.value = 0; }
  });
}

function formatTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace("T", " ").slice(0, 16);
  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(date).replaceAll("/", "-");
}

function selectTab(tab: OrderTab) { activeTab.value = tab; }

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

onShow(() => {
  readRouteStatus();
  void loadOrders();
});
</script>

<style scoped>
.orders-page { padding-bottom: 160rpx; }
.orders-toolbar { display:flex; align-items:center; justify-content:space-between; min-height:64rpx; margin-bottom:12rpx; }
.orders-toolbar-label { color:#222; font-size:30rpx; font-weight:900; }
.refresh-action { min-width:88rpx; padding:10rpx 18rpx; border:1rpx solid #d9d3ca; border-radius:10rpx; background:#fff; color:#4A6B8A; text-align:center; font-size:24rpx; font-weight:700; }
.refresh-action.disabled { color:#9ca3af; background:#f5f5f4; }
.order-tabs { display:grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap:4rpx; margin-bottom:18rpx; padding:6rpx; border:1rpx solid #e8e0d6; border-radius:14rpx; background:#f3ece2; }
.order-tab { min-width:0; padding:14rpx 4rpx; border-radius:10rpx; color:#6f6255; text-align:center; font-size:25rpx; font-weight:800; white-space:nowrap; }
.order-tab.active { background:#C43D3D; color:#fff; box-shadow:0 4rpx 12rpx rgba(196, 61, 61, 0.18); }
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
.course-refund-action { margin-top: 16rpx; }
.warning-card { margin-bottom:16rpx; border-color:#fde68a; background:#fffbeb; color:#92400e; font-size:24rpx; line-height:1.5; }
.action-error { display:flex; align-items:center; justify-content:space-between; gap:16rpx; margin-bottom:16rpx; }
.error-close { flex:0 0 auto; color:#C43D3D; font-weight:900; }
.order-action { margin-top: 18rpx; color: #C43D3D; font-size: 26rpx; font-weight: 900; text-align: right; }
.small { font-size: 30rpx; }
.retry { display:inline-flex; margin-top:16rpx; }
</style>
