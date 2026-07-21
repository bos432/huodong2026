<template>
  <view class="coupon-page">
    <view class="hero">
      <text class="eyebrow">Mall Coupon Wallet</text>
      <text class="title">先领券，再下单，让商城活动有转化抓手</text>
      <text class="sub">领取、可用、已用、过期都能追踪；结算页会自动识别券码。</text>
    </view>

    <view class="tabs" role="tablist" aria-label="优惠券状态">
      <view v-for="item in tabs" :key="item.value" class="tab" :class="{ active: status === item.value }" role="tab" tabindex="0" :aria-selected="status === item.value" :aria-label="`查看${item.label}优惠券`" @click="selectStatus(item.value)" @keyup.enter="selectStatus(item.value)" @keyup.space="selectStatus(item.value)">{{ item.label }}</view>
    </view>

    <view v-if="loading" class="state-card" aria-live="polite">优惠券加载中...</view>
    <view v-else-if="loadError" class="state-card error-state" role="alert">
      <text>{{ loadError }}</text>
      <view class="state-retry" role="button" tabindex="0" aria-label="重新加载优惠券" @click="load" @keyup.enter="load" @keyup.space="load">重新加载</view>
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
          <button size="mini" :aria-label="`${item.name}：${item.claimed ? '已领取' : item.claimStatus === 'claimed_out' ? '已领完' : '立即领取'}`" :disabled="item.claimed || item.claimStatus === 'claimed_out' || claimPendingId === item.id" @click="claimCoupon(item)">{{ claimPendingId === item.id ? "领取中" : item.claimed ? "已领取" : item.claimStatus === "claimed_out" ? "已领完" : "立即领取" }}</button>
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
          <button v-if="item.status === 'available'" size="mini" :aria-label="`使用${item.coupon?.name || '优惠券'}`" @click="goMall">去使用</button>
        </view>
      </view>
    </view>

    <EmptyState v-if="!loading && !loadError && !currentRows.length" icon="券" text="暂无优惠券" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { ensureUser, getCurrentTenantCode, request, withTenantCode } from "../../api";
import EmptyState from "../../components/EmptyState.vue";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { guardCurrentPageFeature, loadFeatureGates } from "../../feature-gates";

const status = ref<"claimable" | "available" | "used" | "unavailable">("claimable");
const loading = ref(false);
const loadError = ref("");
const claimPendingId = ref(0);
const claimTenantCode = ref("");
const merchantId = ref(0);
const claimableCoupons = ref<any[]>([]);
const myClaims = ref<any[]>([]);
const loadGuard = createTenantLoadGuard();
const tabs = [
  { label: "领券中心", value: "claimable" as const },
  { label: "可用", value: "available" as const },
  { label: "已用", value: "used" as const },
  { label: "不可用", value: "unavailable" as const }
];
const currentRows = computed(() => status.value === "claimable" ? claimableCoupons.value : myClaims.value);
const merchantQuery = computed(() => merchantId.value ? `merchantId=${merchantId.value}` : "");

function money(value: any) { return Number(value || 0).toFixed(2); }
function dateText(value: any) { return value ? String(value).slice(0, 10) : "长期有效"; }
function couponScopeText(item: any) {
  if (item.scope === "category") return "指定分类";
  if (item.scope === "product") return "指定商品";
  return "全场通用";
}
function couponLimitText(item: any) {
  const total = item.remainingClaimCount === null || item.remainingClaimCount === undefined ? "不限量" : `剩 ${item.remainingClaimCount} 张`;
  const perUser = Number(item.perUserLimit || 0) > 0 ? `每人限 ${item.perUserLimit} 次` : "每人不限";
  return `${total} · ${perUser}`;
}
function couponStatusText(value: string) {
  return ({ available: "可使用", used: "已使用", expired: "已过期", disabled: "已停用", not_started: "未开始", claimed_out: "已领完" } as Record<string, string>)[value] || value;
}
function selectStatus(value: typeof status.value) {
  if (status.value === value && loading.value) return;
  status.value = value;
  void load();
}
async function load() {
  const token = loadGuard.begin();
  const requestedStatus = status.value;
  const requestedMerchantId = merchantId.value;
  loading.value = true;
  loadError.value = "";
  if (requestedStatus === "claimable") claimableCoupons.value = [];
  else myClaims.value = [];
  try {
    await ensureUser();
    const merchant = requestedMerchantId ? `merchantId=${requestedMerchantId}` : "";
    const suffix = merchant ? `?${merchant}` : "";
    if (requestedStatus === "claimable") {
      const rows = await request<any[]>(`/public/me/mall/coupons${suffix}`);
      if (loadGuard.isCurrent(token) && status.value === requestedStatus && merchantId.value === requestedMerchantId) claimableCoupons.value = rows;
    }
    else {
      const joiner = merchant ? `&${merchant}` : "";
      const rows = await request<any[]>(`/public/me/mall/coupon-claims?status=${requestedStatus}${joiner}`);
      if (loadGuard.isCurrent(token) && status.value === requestedStatus && merchantId.value === requestedMerchantId) myClaims.value = rows;
    }
  } catch (error: any) {
    if (loadGuard.isCurrent(token) && !String(error?.message || "").includes("请先完成")) loadError.value = error?.message || "优惠券加载失败，请稍后重试。";
  } finally {
    if (loadGuard.isCurrent(token)) loading.value = false;
  }
}
async function claimCoupon(item: any) {
  if (!item?.id || claimPendingId.value) return;
  const tenantCode = getCurrentTenantCode();
  claimPendingId.value = item.id;
  claimTenantCode.value = tenantCode;
  try {
    await ensureUser();
    const suffix = merchantQuery.value ? `?${merchantQuery.value}` : "";
    await request(`/public/me/mall/coupons/${item.id}/claim${suffix}`, { method: "POST" });
    if (getCurrentTenantCode() !== tenantCode) return;
    uni.showToast({ title: "领取成功", icon: "none" });
    await load();
  } catch (error: any) {
    if (getCurrentTenantCode() === tenantCode) uni.showToast({ title: error.message || "领取失败", icon: "none" });
  } finally {
    if (claimTenantCode.value === tenantCode) {
      claimPendingId.value = 0;
      claimTenantCode.value = "";
    }
  }
}
function goMall() {
  const target = merchantId.value ? `/pages/mall/merchant?id=${merchantId.value}` : "/pages/mall/index";
  uni.navigateTo({ url: withTenantCode(target) });
}
onLoad((query: any) => {
  merchantId.value = Number(query?.merchantId || 0);
});
onShow(async () => {
  await loadFeatureGates(true);
  if (!guardCurrentPageFeature()) return;
  if (claimTenantCode.value && claimTenantCode.value !== getCurrentTenantCode()) {
    claimPendingId.value = 0;
    claimTenantCode.value = "";
  }
  await load();
});
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
.state-card { display:grid; gap:10rpx; margin-bottom:18rpx; padding:20rpx 22rpx; border-radius:8px; background:#fff; color:#64748b; font-size:24rpx; line-height:1.55; }
.state-card.error-state { border:1rpx solid #fecaca; background:#fff7f7; color:#b91c1c; }
.state-retry { width:max-content; color:#c2410c; font-weight:900; }
</style>
