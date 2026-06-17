<script setup lang="ts">
const props = defineProps<{ current: "home" | "activities" | "registrations" | "orders" | "checkin"; permissions?: Record<string, any> | null }>();

const items = [
  { key: "home", label: "工作台", icon: "台", url: "/pages/admin/home", permission: "" },
  { key: "activities", label: "活动", icon: "活", url: "/pages/admin/activity/list", permission: "" },
  { key: "registrations", label: "报名", icon: "报", url: "/pages/admin/registrations", permission: "canViewRegistrations" },
  { key: "orders", label: "订单", icon: "单", url: "/pages/admin/orders", permission: "canViewOrders" },
  { key: "checkin", label: "签到", icon: "签", url: "/pages/admin/check-in", permission: "canCheckIn" }
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
  <view class="admin-nav-wrap">
    <view class="admin-bottom-nav">
      <view v-for="item in items.filter(visible)" :key="item.key" class="nav-item" :class="{ active: item.key === current }" @click="go(item)">
        <text class="nav-dot">{{ item.icon }}</text>
        <text class="nav-label">{{ item.label }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.admin-nav-wrap { position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; padding: 0 22rpx calc(18rpx + env(safe-area-inset-bottom)); pointer-events: none; }
.admin-bottom-nav { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8rpx; padding: 12rpx; border: 1rpx solid rgba(196, 61, 61, 0.12); border-radius: 34rpx; background: rgba(255, 252, 247, 0.96); box-shadow: 0 -12rpx 34rpx rgba(91, 47, 36, 0.14); backdrop-filter: blur(16px); pointer-events: auto; }
.nav-item { min-width: 0; height: 82rpx; display: grid; gap: 4rpx; justify-items: center; align-content: center; color: #7a5b52; font-size: 21rpx; font-weight: 900; border-radius: 24rpx; }
.nav-dot { width: 38rpx; height: 38rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: rgba(91, 47, 36, 0.08); color: #7a5b52; font-size: 20rpx; }
.nav-label { white-space: nowrap; }
.nav-item.active { color: #0f766e; background: linear-gradient(180deg, rgba(15,118,110,0.12), rgba(15,118,110,0.05)); }
.nav-item.active .nav-dot { background: #0f766e; color: #fff; box-shadow: 0 8rpx 18rpx rgba(15, 118, 110, 0.22); }
</style>
