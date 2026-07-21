<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { OrderStatus, orderStatusText } from "@activity/shared";
import { mobileAdminRequest, requireMobileAdmin } from "../../mobile-admin";
import AdminBottomNav from "../../components/AdminBottomNav.vue";

const rows = ref<any[]>([]);
const bootstrap = ref<any>(null);
const loading = ref(true);
const errorMessage = ref("");
const actionId = ref<number | null>(null);
const keyword = ref("");
const status = ref<"all" | OrderStatus>("all");
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const canViewOrders = computed(() => Boolean(bootstrap.value?.permissions?.canViewOrders));
const canManageOrders = computed(() => Boolean(bootstrap.value?.permissions?.canManageOrders));
const totalPages = computed(() => Math.max(Math.ceil(total.value / pageSize), 1));
let loadSerial = 0;

const tabs: Array<{ label: string; value: "all" | OrderStatus }> = [
  { label: "全部", value: "all" },
  { label: "待付款", value: OrderStatus.PendingPayment },
  { label: "已付款", value: OrderStatus.Paid },
  { label: "已退款", value: OrderStatus.Refunded },
  { label: "已关闭", value: OrderStatus.Closed }
];

function buildUrl() {
  const params = [`page=${page.value}`, `pageSize=${pageSize}`];
  if (status.value !== "all") params.push(`status=${status.value}`);
  if (keyword.value.trim()) params.push(`keyword=${encodeURIComponent(keyword.value.trim())}`);
  return `/admin/orders?${params.join("&")}`;
}

async function load() {
  requireMobileAdmin();
  const serial = ++loadSerial;
  loading.value = true;
  errorMessage.value = "";
  try {
    const boot = bootstrap.value || await mobileAdminRequest<any>("/admin/mobile/bootstrap");
    if (serial !== loadSerial) return;
    bootstrap.value = boot;
    if (!boot?.permissions?.canViewOrders) {
      rows.value = [];
      total.value = 0;
      return;
    }
    const data = await mobileAdminRequest<any>(buildUrl());
    if (serial !== loadSerial) return;
    rows.value = data.items || [];
    total.value = data.total || 0;
  } catch (err: any) {
    if (serial !== loadSerial) return;
    errorMessage.value = err.message || "订单加载失败";
    uni.showToast({ title: err.message || "加载失败", icon: "none" });
  } finally {
    if (serial === loadSerial) loading.value = false;
  }
}

function setStatus(value: "all" | OrderStatus) {
  if (loading.value || actionId.value !== null) return;
  status.value = value;
  page.value = 1;
  void load();
}

function search() {
  if (loading.value || actionId.value !== null) return;
  page.value = 1;
  void load();
}

function changePage(next: number) {
  if (loading.value || actionId.value !== null || next < 1 || next > totalPages.value || next === page.value) return;
  page.value = next;
  void load();
}

function statusLabel(value: OrderStatus) {
  return orderStatusText[value] || value;
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

function isExpired(item: any) {
  return item.expiresAt && new Date(item.expiresAt).getTime() <= Date.now();
}

function canConfirm(item: any) {
  return canManageOrders.value && actionId.value === null && item.paymentMethod === "offline" && item.status === OrderStatus.PendingPayment && !isExpired(item);
}

function maskPhone(value: unknown) {
  const phone = String(value || "");
  return /^1\d{10}$/.test(phone) ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone || "-";
}

function confirmOfflinePayment(item: any) {
  if (!canConfirm(item)) return;
  actionId.value = item.id;
  uni.showModal({
    title: "确认线下收款",
    content: `确认订单 ${item.orderNo} 已收款？确认后报名状态会继续流转。`,
    success: async (res) => {
      if (!res.confirm) {
        actionId.value = null;
        return;
      }
      try {
        await mobileAdminRequest(`/admin/orders/${item.id}/confirm-offline-payment`, { method: "POST", data: { remark: "手机端确认线下收款" } });
        uni.showToast({ title: "已确认收款", icon: "success" });
        await load();
      } catch (err: any) {
        uni.showToast({ title: err.message || "操作失败", icon: "none" });
      } finally {
        actionId.value = null;
      }
    },
    fail: () => { actionId.value = null; }
  });
}

function formatTime(value?: string) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

onShow(load);
</script>

<template>
  <view class="admin-page">
    <view class="head">
      <view>
        <view class="title">订单查看</view>
        <view class="sub">共 {{ total }} 笔订单</view>
      </view>
      <view class="refresh" role="button" tabindex="0" :aria-label="loading ? '刷新中' : '刷新订单'" :aria-busy="loading" :class="{ disabled: loading || actionId !== null }" @click="load" @keyup.enter="load" @keyup.space.prevent="load">{{ loading ? "刷新中" : "刷新" }}</view>
    </view>
    <view v-if="errorMessage" class="error-panel" role="alert" aria-live="assertive"><text>{{ errorMessage }}</text><view class="retry" role="button" tabindex="0" aria-label="重新加载订单" @click="load" @keyup.enter="load" @keyup.space.prevent="load">重试</view></view>

    <view class="search">
      <input v-model="keyword" :disabled="loading || actionId !== null" maxlength="80" cursor-spacing="24" aria-label="搜索订单、手机号或活动" placeholder="搜索订单、手机号、活动" confirm-type="search" @confirm="search" />
      <view class="search-btn" role="button" tabindex="0" aria-label="搜索订单" :class="{ disabled: loading || actionId !== null }" @click="search" @keyup.enter="search" @keyup.space.prevent="search">搜索</view>
    </view>

    <scroll-view scroll-x class="tabs" :show-scrollbar="false">
      <view class="track">
        <view v-for="tab in tabs" :key="tab.value" class="tab" role="tab" tabindex="0" :aria-selected="status === tab.value" :aria-label="`查看${tab.label}订单`" :class="{ active: status === tab.value }" @click="setStatus(tab.value)" @keyup.enter="setStatus(tab.value)" @keyup.space.prevent="setStatus(tab.value)">{{ tab.label }}</view>
      </view>
    </scroll-view>

    <view v-if="!canViewOrders && !loading" class="panel">当前账号没有订单查看权限</view>
    <view v-else-if="loading" class="panel">加载中...</view>
    <view v-else-if="!rows.length" class="panel">暂无订单</view>
    <view v-for="item in rows" v-else :key="item.id" class="card">
      <view class="row">
        <view>
          <view class="order-no">{{ item.orderNo }}</view>
          <view class="name">{{ item.registration?.activity?.title || "-" }}</view>
        </view>
        <view class="amount">￥{{ Number(item.amount || 0).toFixed(2) }}</view>
      </view>
      <view class="meta">{{ item.registration?.user?.nickname || "用户" }} · {{ maskPhone(item.registration?.user?.phone) }}</view>
      <view class="meta">状态：{{ statusLabel(item.status) }} · {{ paymentMethodLabel(item.paymentMethod) }}</view>
      <view class="meta">创建：{{ formatTime(item.createdAt) }}<text v-if="item.paidAt"> · 支付：{{ formatTime(item.paidAt) }}</text></view>
      <view v-if="canConfirm(item)" class="ops">
        <view class="ok" role="button" tabindex="0" aria-label="确认线下收款" @click="confirmOfflinePayment(item)" @keyup.enter="confirmOfflinePayment(item)" @keyup.space.prevent="confirmOfflinePayment(item)">确认线下收款</view>
      </view>
      <view v-else-if="item.paymentMethod === 'offline' && item.status === OrderStatus.PendingPayment" class="notice">线下收款订单等待确认<text v-if="isExpired(item)">，当前订单已超时</text><text v-else-if="!canManageOrders">，当前账号仅可查看</text></view>
    </view>
    <view v-if="canViewOrders && totalPages > 1" class="pager">
      <view role="button" tabindex="0" aria-label="订单上一页" :class="{ disabled: page <= 1 || loading || actionId !== null }" @click="changePage(page - 1)" @keyup.enter="changePage(page - 1)" @keyup.space.prevent="changePage(page - 1)">上一页</view>
      <text>第 {{ page }} / {{ totalPages }} 页</text>
      <view role="button" tabindex="0" aria-label="订单下一页" :class="{ disabled: page >= totalPages || loading || actionId !== null }" @click="changePage(page + 1)" @keyup.enter="changePage(page + 1)" @keyup.space.prevent="changePage(page + 1)">下一页</view>
    </view>
    <AdminBottomNav current="orders" :permissions="bootstrap?.permissions" />
  </view>
</template>

<style scoped>
.admin-page { min-height: 100vh; width:100%; max-width:760px; margin:0 auto; box-sizing:border-box; padding: calc(24rpx + env(safe-area-inset-top)) 24rpx calc(150rpx + env(safe-area-inset-bottom)); overflow-wrap:anywhere; background: radial-gradient(circle at 18% 0%, rgba(255, 232, 198, 0.9), transparent 34%), linear-gradient(180deg, #fff8ef 0%, #f5f0e8 100%); color: #2f211c; }
.head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 24rpx; border-radius: 30rpx; background: linear-gradient(135deg, #5b2f24 0%, #8f4c32 52%, #d29a5a 100%); color: #fff; box-shadow: 0 18rpx 44rpx rgba(91,47,36,.2); }
.title { font-size: 40rpx; font-weight: 900; }
.sub { margin-top: 6rpx; color: rgba(255,255,255,.7); font-size: 24rpx; }
.refresh { padding: 14rpx 24rpx; border-radius: 999px; background: #0f766e; font-weight: 900; }
.search { display: grid; grid-template-columns: 1fr 118rpx; gap: 12rpx; margin: 20rpx 0; }
.search input { height: 78rpx; padding: 0 20rpx; border-radius: 999px; background: #fff; font-size: 26rpx; }
.search-btn { display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #0f766e; color: #fff; font-size: 25rpx; font-weight: 900; }
.tabs { height: 76rpx; white-space: nowrap; }
.track { display: inline-flex; gap: 12rpx; }
.tab { padding: 16rpx 24rpx; border-radius: 999px; background: #fff; color: #7a5b52; font-size: 24rpx; font-weight: 800; }
.tab.active { background: #e6f2ef; color: #0f766e; }
.panel, .card { margin-top: 18rpx; border-radius: 24rpx; background: rgba(255,255,255,.9); box-shadow: 0 14rpx 34rpx rgba(91,47,36,.08); }
.panel { padding: 30rpx; color: #7a5b52; text-align: center; }
.card { padding: 22rpx; }
.row { display: flex; align-items: flex-start; justify-content: space-between; gap: 18rpx; }
.order-no { color: #7a5b52; font-size: 23rpx; font-weight: 800; }
.name { min-width:0; margin-top: 8rpx; font-size: 29rpx; font-weight: 900; line-height: 1.4; overflow-wrap:anywhere; }
.amount { flex: 0 0 auto; color: #0f766e; font-size: 32rpx; font-weight: 900; }
.meta { margin-top: 10rpx; color: #7a5b52; font-size: 24rpx; line-height: 1.45; overflow-wrap:anywhere; }
.ops { margin-top: 18rpx; }
.ops view { height: 76rpx; display: flex; align-items: center; justify-content: center; border-radius: 20rpx; font-size: 26rpx; font-weight: 900; }
.ok { background: #0f766e; color: #fff; }
.notice { margin-top: 16rpx; padding: 16rpx; border-radius: 18rpx; background: #fffaf4; color: #7a5b52; font-size: 24rpx; line-height: 1.5; }
.pager { display:grid; grid-template-columns:140rpx 1fr 140rpx; align-items:center; gap:12rpx; margin-top:20rpx; }.pager view { display:flex; align-items:center; justify-content:center; height:68rpx; border-radius:18rpx; background:#0f766e; color:#fff; font-size:24rpx; font-weight:900; }.pager text { color:#7a5b52; font-size:24rpx; text-align:center; }.disabled { opacity:.5; pointer-events:none; }
.error-panel { display:flex; align-items:center; justify-content:space-between; gap:16rpx; margin-top:18rpx; padding:20rpx; border-radius:24rpx; background:#fff1f3; color:#b42318; }.retry { padding:10rpx 18rpx; border-radius:16rpx; background:#b42318; color:#fff; font-weight:800; }
@media (min-width: 900px) { .admin-page { max-width:760px; margin:0 auto; } }
</style>
