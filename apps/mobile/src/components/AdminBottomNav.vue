<script setup lang="ts">
const props = defineProps<{ current: "home" | "activities" | "registrations" | "orders" | "checkin"; permissions?: Record<string, any> | null }>();

const items = [
  { key: "activities", label: "活动", url: "/pages/admin/activity/list", permission: "" },
  { key: "registrations", label: "报名", url: "/pages/admin/registrations", permission: "canViewRegistrations" },
  { key: "orders", label: "订单", url: "/pages/admin/orders", permission: "canViewOrders" },
  { key: "checkin", label: "签到", url: "/pages/admin/check-in", permission: "canCheckIn" },
  { key: "home", label: "我的", url: "/pages/admin/home", permission: "" }
];

function visible(item: (typeof items)[number]) {
  return !item.permission || Boolean(props.permissions?.[item.permission]);
}

function go(item: (typeof items)[number]) {
  if (item.key === props.current) return;
  uni.redirectTo({ url: item.url });
}
</script>

<template>
  <view class="admin-bottom-nav">
    <view v-for="item in items.filter(visible)" :key="item.key" class="nav-item" :class="{ active: item.key === current }" @click="go(item)">
      <text class="nav-dot">{{ item.label.slice(0, 1) }}</text>
      <text>{{ item.label }}</text>
    </view>
  </view>
</template>

<style scoped>
.admin-bottom-nav { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; display: grid; grid-template-columns: repeat(5, 1fr); gap: 4rpx; padding: 10rpx 16rpx calc(10rpx + env(safe-area-inset-bottom)); background: rgba(255,255,255,.96); border-top: 1px solid #e5e7eb; box-shadow: 0 -10rpx 30rpx rgba(15,23,42,.08); }
.nav-item { min-width: 0; height: 76rpx; display: grid; gap: 3rpx; justify-items: center; align-content: center; color: #667085; font-size: 21rpx; font-weight: 800; }
.nav-dot { width: 34rpx; height: 34rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #f2f4f7; color: #667085; font-size: 20rpx; }
.nav-item.active { color: #0f766e; }
.nav-item.active .nav-dot { background: #e6f2ef; color: #0f766e; }
</style>
