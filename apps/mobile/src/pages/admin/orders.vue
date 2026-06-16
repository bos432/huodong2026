<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { OrderStatus, orderStatusText } from "@activity/shared";
import { mobileAdminRequest, requireMobileAdmin } from "../../mobile-admin";

const rows = ref<any[]>([]);
const bootstrap = ref<any>(null);
const loading = ref(true);
const keyword = ref("");
const status = ref<"all" | OrderStatus>("all");
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const canViewOrders = computed(() => Boolean(bootstrap.value?.permissions?.canViewOrders));

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
  loading.value = true;
  try {
    const [boot, data] = await Promise.all([
      bootstrap.value ? Promise.resolve(bootstrap.value) : mobileAdminRequest<any>("/admin/mobile/bootstrap"),
      mobileAdminRequest<any>(buildUrl())
    ]);
    bootstrap.value = boot;
    rows.value = data.items || [];
    total.value = data.total || 0;
  } catch (err: any) {
    uni.showToast({ title: err.message || "加载失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

function setStatus(value: "all" | OrderStatus) {
  status.value = value;
  page.value = 1;
  load();
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
  return canViewOrders.value && item.paymentMethod === "offline" && item.status === OrderStatus.PendingPayment && !isExpired(item);
}

function confirmOfflinePayment(item: any) {
  uni.showModal({
    title: "确认线下收款",
    content: `确认订单 ${item.orderNo} 已收款？确认后报名状态会继续流转。`,
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await mobileAdminRequest(`/admin/orders/${item.id}/confirm-offline-payment`, { method: "POST", data: { remark: "手机端确认线下收款" } });
        uni.showToast({ title: "已确认收款", icon: "success" });
        load();
      } catch (err: any) {
        uni.showToast({ title: err.message || "操作失败", icon: "none" });
      }
    }
  });
}

function formatTime(value?: string) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

onMounted(load);
</script>

<template>
  <view class="admin-page">
    <view class="head">
      <view>
        <view class="title">订单查看</view>
        <view class="sub">共 {{ total }} 笔订单</view>
      </view>
      <view class="refresh" @click="load">刷新</view>
    </view>

    <view class="search">
      <input v-model="keyword" placeholder="搜索订单、手机号、活动" confirm-type="search" @confirm="load" />
      <view class="search-btn" @click="load">搜索</view>
    </view>

    <scroll-view scroll-x class="tabs" :show-scrollbar="false">
      <view class="track">
        <view v-for="tab in tabs" :key="tab.value" class="tab" :class="{ active: status === tab.value }" @click="setStatus(tab.value)">{{ tab.label }}</view>
      </view>
    </scroll-view>

    <view v-if="loading" class="panel">加载中...</view>
    <view v-else-if="!rows.length" class="panel">暂无订单</view>
    <view v-for="item in rows" v-else :key="item.id" class="card">
      <view class="row">
        <view>
          <view class="order-no">{{ item.orderNo }}</view>
          <view class="name">{{ item.registration?.activity?.title || "-" }}</view>
        </view>
        <view class="amount">￥{{ Number(item.amount || 0).toFixed(2) }}</view>
      </view>
      <view class="meta">{{ item.registration?.user?.nickname || "用户" }} · {{ item.registration?.user?.phone || "-" }}</view>
      <view class="meta">状态：{{ statusLabel(item.status) }} · {{ paymentMethodLabel(item.paymentMethod) }}</view>
      <view class="meta">创建：{{ formatTime(item.createdAt) }}<text v-if="item.paidAt"> · 支付：{{ formatTime(item.paidAt) }}</text></view>
      <view v-if="canConfirm(item)" class="ops">
        <view class="ok" @click="confirmOfflinePayment(item)">确认线下收款</view>
      </view>
      <view v-else-if="item.paymentMethod === 'offline' && item.status === OrderStatus.PendingPayment" class="notice">线下收款订单等待确认<text v-if="isExpired(item)">，当前订单已超时</text></view>
    </view>
  </view>
</template>

<style scoped>
.admin-page { min-height: 100vh; padding: 24rpx; background: #f4f6f8; color: #111827; }
.head { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 24rpx; border-radius: 8px; background: #111827; color: #fff; }
.title { font-size: 40rpx; font-weight: 900; }
.sub { margin-top: 6rpx; color: rgba(255,255,255,.7); font-size: 24rpx; }
.refresh { padding: 14rpx 24rpx; border-radius: 999px; background: #0f766e; font-weight: 900; }
.search { display: grid; grid-template-columns: 1fr 118rpx; gap: 12rpx; margin: 20rpx 0; }
.search input { height: 78rpx; padding: 0 20rpx; border-radius: 999px; background: #fff; font-size: 26rpx; }
.search-btn { display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #0f766e; color: #fff; font-size: 25rpx; font-weight: 900; }
.tabs { height: 76rpx; white-space: nowrap; }
.track { display: inline-flex; gap: 12rpx; }
.tab { padding: 16rpx 24rpx; border-radius: 999px; background: #fff; color: #667085; font-size: 24rpx; font-weight: 800; }
.tab.active { background: #e6f2ef; color: #0f766e; }
.panel, .card { margin-top: 18rpx; border-radius: 8px; background: #fff; box-shadow: 0 12rpx 34rpx rgba(15,23,42,.06); }
.panel { padding: 30rpx; color: #667085; text-align: center; }
.card { padding: 22rpx; }
.row { display: flex; align-items: flex-start; justify-content: space-between; gap: 18rpx; }
.order-no { color: #667085; font-size: 23rpx; font-weight: 800; }
.name { margin-top: 8rpx; font-size: 29rpx; font-weight: 900; line-height: 1.4; }
.amount { flex: 0 0 auto; color: #0f766e; font-size: 32rpx; font-weight: 900; }
.meta { margin-top: 10rpx; color: #667085; font-size: 24rpx; line-height: 1.45; }
.ops { margin-top: 18rpx; }
.ops view { height: 76rpx; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-size: 26rpx; font-weight: 900; }
.ok { background: #0f766e; color: #fff; }
.notice { margin-top: 16rpx; padding: 16rpx; border-radius: 6px; background: #f8fafc; color: #667085; font-size: 24rpx; line-height: 1.5; }
</style>
