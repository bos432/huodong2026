<template>
  <view class="coupon-page">
    <view class="hero">
      <text class="eyebrow">Mall Coupon Wallet</text>
      <text class="title">先领券，再下单，让商城活动有转化抓手</text>
      <text class="sub">领取、可用、已用、过期都能追踪；结算页会自动识别券码。</text>
    </view>

    <view class="tabs">
      <view v-for="item in tabs" :key="item.value" class="tab" :class="{ active: status === item.value }" @click="selectStatus(item.value)">{{ item.label }}</view>
    </view>

    <view v-if="status === 'claimable'" class="coupon-list">
      <view v-for="item in claimableCoupons" :key="item.id" class="coupon-card" :class="{ claimed: item.claimed }">
        <view>
          <text class="coupon-name">{{ item.name }}</text>
          <text class="coupon-rule">满 ¥{{ money(item.minAmount) }} 减 ¥{{ money(item.discountAmount) }}</text>
          <text class="coupon-meta">{{ couponScopeText(item) }} · {{ couponLimitText(item) }}</text>
          <text class="coupon-date">{{ dateText(item.startsAt) }} 至 {{ dateText(item.endsAt) }}</text>
        </view>
        <view class="coupon-side">
          <text class="coupon-code">{{ item.code }}</text>
          <button size="mini" :disabled="item.claimed" @click="claimCoupon(item)">{{ item.claimed ? "已领取" : "立即领取" }}</button>
        </view>
      </view>
    </view>

    <view v-else class="coupon-list">
      <view v-for="item in myClaims" :key="item.id" class="coupon-card" :class="item.status">
        <view>
          <text class="coupon-name">{{ item.coupon?.name || item.coupon?.code }}</text>
          <text class="coupon-rule">满 ¥{{ money(item.coupon?.minAmount) }} 减 ¥{{ money(item.coupon?.discountAmount) }}</text>
          <text class="coupon-meta">{{ couponStatusText(item.status) }} · 已用 {{ item.usedCount || 0 }}/{{ item.claimedCount || 1 }}</text>
          <text class="coupon-date">{{ dateText(item.coupon?.startsAt) }} 至 {{ dateText(item.coupon?.endsAt) }}</text>
        </view>
        <view class="coupon-side">
          <text class="coupon-code">{{ item.coupon?.code }}</text>
          <button v-if="item.status === 'available'" size="mini" @click="goMall">去使用</button>
        </view>
      </view>
    </view>

    <EmptyState v-if="!loading && !currentRows.length" icon="券" text="暂无优惠券" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, request, withTenantCode } from "../../api";
import EmptyState from "../../components/EmptyState.vue";

const status = ref<"claimable" | "available" | "used" | "expired">("claimable");
const loading = ref(false);
const claimableCoupons = ref<any[]>([]);
const myClaims = ref<any[]>([]);
const tabs = [
  { label: "领券中心", value: "claimable" as const },
  { label: "可用", value: "available" as const },
  { label: "已用", value: "used" as const },
  { label: "过期/停用", value: "expired" as const }
];
const currentRows = computed(() => status.value === "claimable" ? claimableCoupons.value : myClaims.value);

function money(value: any) { return Number(value || 0).toFixed(2); }
function dateText(value: any) { return value ? String(value).slice(0, 10) : "长期有效"; }
function couponScopeText(item: any) {
  if (item.scope === "category") return "指定分类";
  if (item.scope === "product") return "指定商品";
  return "全场通用";
}
function couponLimitText(item: any) {
  const total = item.remainingCount === null || item.remainingCount === undefined ? "不限量" : `剩 ${item.remainingCount} 张`;
  const perUser = Number(item.perUserLimit || 0) > 0 ? `每人限 ${item.perUserLimit} 次` : "每人不限";
  return `${total} · ${perUser}`;
}
function couponStatusText(value: string) {
  return ({ available: "可使用", used: "已使用", expired: "已过期", disabled: "已停用", not_started: "未开始" } as Record<string, string>)[value] || value;
}
function selectStatus(value: typeof status.value) {
  status.value = value;
  load();
}
async function load() {
  loading.value = true;
  try {
    await ensureUser();
    if (status.value === "claimable") claimableCoupons.value = await request<any[]>("/public/me/mall/coupons").catch(() => []);
    else myClaims.value = await request<any[]>(`/public/me/mall/coupon-claims?status=${status.value}`).catch(() => []);
  } catch (error: any) {
    uni.showToast({ title: error.message || "加载优惠券失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}
async function claimCoupon(item: any) {
  try {
    await ensureUser();
    await request(`/public/me/mall/coupons/${item.id}/claim`, { method: "POST" });
    uni.showToast({ title: "领取成功", icon: "none" });
    await load();
  } catch (error: any) {
    uni.showToast({ title: error.message || "领取失败", icon: "none" });
  }
}
function goMall() {
  uni.navigateTo({ url: withTenantCode("/pages/mall/index") });
}
onShow(load);
</script>

<style scoped>
.coupon-page { min-height:100vh; padding:24rpx; background:linear-gradient(180deg,#fff7ed 0%,#f8fafc 42%,#fff 100%); }
.hero { padding:34rpx 30rpx; border-radius:32rpx; background:linear-gradient(135deg,#7c2d12,#ea580c); color:#fff; display:grid; gap:10rpx; box-shadow:0 18rpx 42rpx rgba(154,52,18,.18); }
.eyebrow { font-size:22rpx; opacity:.8; letter-spacing:.08em; }
.title { font-size:38rpx; line-height:1.25; font-weight:900; }
.sub { font-size:25rpx; line-height:1.5; opacity:.86; }
.tabs { display:flex; gap:12rpx; overflow-x:auto; padding:24rpx 0 18rpx; }
.tab { white-space:nowrap; padding:14rpx 24rpx; border-radius:999rpx; background:#fff; color:#9a3412; border:1rpx solid rgba(154,52,18,.12); font-size:25rpx; font-weight:900; }
.tab.active { background:#9a3412; color:#fff; }
.coupon-list { display:grid; gap:16rpx; }
.coupon-card { position:relative; display:flex; justify-content:space-between; gap:20rpx; padding:24rpx; border-radius:28rpx; background:#fff; box-shadow:0 12rpx 32rpx rgba(124,45,18,.08); overflow:hidden; }
.coupon-card::before { content:""; position:absolute; left:0; top:0; bottom:0; width:10rpx; background:#ea580c; }
.coupon-card.claimed::before, .coupon-card.used::before, .coupon-card.expired::before, .coupon-card.disabled::before { background:#94a3b8; }
.coupon-name { display:block; color:#1f2937; font-size:30rpx; font-weight:900; line-height:1.35; }
.coupon-rule { display:block; margin-top:8rpx; color:#c2410c; font-size:34rpx; font-weight:900; }
.coupon-meta, .coupon-date { display:block; margin-top:8rpx; color:#64748b; font-size:24rpx; line-height:1.4; }
.coupon-side { display:grid; align-content:center; justify-items:end; gap:14rpx; min-width:160rpx; }
.coupon-code { color:#9a3412; font-size:24rpx; font-weight:900; }
button { border-radius:999rpx; background:#9a3412; color:#fff; font-size:24rpx; font-weight:900; }
button[disabled] { background:#e2e8f0; color:#64748b; }
</style>
