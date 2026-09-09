<template>
  <view class="income-page">
    <view class="ink-hero">
      <text class="hero-kicker">商城会员 · 单层推广</text>
      <text class="hero-title">我的推广收益</text>
      <text class="hero-copy">只统计本人直接分享产生的真实支付订单，不计算自购、上级或团队奖励。</text>
    </view>

    <view v-if="summary" class="summary-grid">
      <view class="summary-card primary"><text class="summary-label">待结算</text><text class="summary-value">¥{{ money(summary.pendingAmount) }}</text></view>
      <view class="summary-card"><text class="summary-label">已结算</text><text class="summary-value">¥{{ money(summary.settledAmount) }}</text></view>
      <view class="summary-card"><text class="summary-label">风险复核</text><text class="summary-value">¥{{ money(summary.riskReviewAmount) }}</text></view>
      <view class="summary-card"><text class="summary-label">待扣回</text><text class="summary-value">¥{{ money(summary.pendingClawbackAmount) }}</text></view>
    </view>

    <view class="notice-card"><text>{{ notice || "佣金由平台审核后结算，退款订单将按规则扣回。" }}</text></view>

    <scroll-view scroll-x class="status-tabs" role="tablist" aria-label="推广收益状态筛选">
      <view class="tabs-inner">
        <view v-for="tab in tabs" :key="tab.value" class="status-tab" :class="{ active: status === tab.value }" role="tab" tabindex="0" :aria-selected="status === tab.value" @click="changeStatus(tab.value)" @keyup.enter="changeStatus(tab.value)" @keyup.space.prevent="changeStatus(tab.value)">{{ tab.label }}</view>
      </view>
    </scroll-view>

    <view v-if="loading" class="state-card" role="status" aria-live="polite">推广收益加载中...</view>
    <view v-else-if="loadError" class="state-card error-state" role="alert" aria-live="assertive"><text>{{ loadError }}</text><view class="state-retry" role="button" tabindex="0" @click="load" @keyup.enter="load" @keyup.space.prevent="load">重新加载</view></view>
    <view v-else-if="!items.length" class="empty-card"><text class="empty-mark">益</text><text class="empty-title">暂无推广收益</text><text class="empty-copy">生成推广码并由其他用户完成真实支付后，收益记录会显示在这里。</text></view>

    <view v-for="item in items" :key="item.id" class="income-card">
      <view class="income-head"><view><text class="merchant-name">{{ item.merchant?.name || "商城店铺" }}</text><text class="order-no">{{ item.orderNo || "订单处理中" }}</text></view><text class="status-pill" :class="item.status">{{ item.statusText }}</text></view>
      <text class="product-title">{{ item.productTitle }}</text>
      <view class="amount-row"><text>计佣订单 ¥{{ money(item.orderAmount) }}</text><text class="commission">佣金 ¥{{ money(item.commissionAmount) }}</text></view>
      <view v-if="Number(item.clawbackAmount || 0) > 0" class="clawback-row">退款待扣回 ¥{{ money(item.clawbackAmount) }}</view>
      <view class="income-foot"><text>推广码 {{ item.promotionCode }}</text><text>{{ dateText(item.settledAt || item.createdAt) }}</text></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { ensureUser, getCurrentTenantCode, request } from "../../api";
import { createTenantLoadGuard, formatShanghaiDateTime } from "../../tenant-load-guard";

const merchantId = ref(0);
const status = ref("");
const items = ref<any[]>([]);
const summary = ref<any>(null);
const notice = ref("");
const loading = ref(true);
const loadError = ref("");
const loadedTenantCode = ref("");
const loadGuard = createTenantLoadGuard();
const tabs = [
  { label: "全部", value: "" },
  { label: "待结算", value: "pending" },
  { label: "已结算", value: "settled" },
  { label: "复核中", value: "risk_review" },
  { label: "已作废", value: "void" }
];

function money(value: any) { return Number(value || 0).toFixed(2); }
function dateText(value: any) { return formatShanghaiDateTime(value, "-"); }
function changeStatus(value: string) { if (status.value !== value) { status.value = value; load(); } }
async function load() {
  const token = loadGuard.begin();
  if (loadedTenantCode.value && loadedTenantCode.value !== token.tenantCode) { items.value = []; summary.value = null; }
  loading.value = true;
  loadError.value = "";
  try {
    await ensureUser();
    const query = [`merchantId=${merchantId.value}`, status.value ? `status=${status.value}` : ""].filter(Boolean).join("&");
    const result = await request<any>(`/public/me/mall/referral-commissions${query ? `?${query}` : ""}`);
    if (!loadGuard.isCurrent(token)) return;
    items.value = Array.isArray(result?.items) ? result.items : [];
    summary.value = result?.summary || null;
    notice.value = String(result?.notice || "");
    loadedTenantCode.value = token.tenantCode;
  } catch (error: any) {
    if (!loadGuard.isCurrent(token)) return;
    if (!loadedTenantCode.value || loadedTenantCode.value !== token.tenantCode) { items.value = []; summary.value = null; }
    loadError.value = error?.message || "推广收益加载失败，请稍后重试。";
  } finally {
    if (loadGuard.isCurrent(token)) loading.value = false;
  }
}

onLoad((query) => { merchantId.value = Math.max(Number(query?.merchantId || 0), 0); });
onShow(() => { if (!loadedTenantCode.value || loadedTenantCode.value !== getCurrentTenantCode()) { items.value = []; summary.value = null; } load(); });
</script>

<style scoped>
.income-page { min-height: 100vh; padding: 24rpx; background: var(--app-page-bg, #f6f7f3); color: #25332d; }
.ink-hero { position: relative; overflow: hidden; display: grid; gap: 10rpx; padding: 36rpx 32rpx; border-radius: 18rpx; color: #f8f3e8; background: linear-gradient(145deg, #183f34, #2f6152); }
.ink-hero::after { content: ""; position: absolute; right: -60rpx; bottom: -100rpx; width: 280rpx; height: 280rpx; border: 2rpx solid rgba(244, 228, 190, .18); border-radius: 50%; }
.hero-kicker { color: #d9c89d; font-size: 23rpx; }
.hero-title { font-family: "STSong", "SimSun", serif; font-size: 42rpx; font-weight: 700; }
.hero-copy { max-width: 580rpx; color: rgba(255,255,255,.78); font-size: 24rpx; line-height: 1.65; }
.summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14rpx; margin-top: 18rpx; }
.summary-card { display: grid; gap: 8rpx; padding: 22rpx; border: 1rpx solid #dfe7df; border-radius: 14rpx; background: #fff; }
.summary-card.primary { border-color: #c9ded5; background: #edf7f2; }
.summary-label { color: #728078; font-size: 23rpx; }
.summary-value { color: #244d41; font-size: 34rpx; font-weight: 900; }
.notice-card { margin: 18rpx 0; padding: 18rpx 20rpx; border-left: 6rpx solid #a33d36; background: #fff9f1; color: #725749; font-size: 23rpx; line-height: 1.6; }
.status-tabs { margin-bottom: 18rpx; white-space: nowrap; }
.tabs-inner { display: inline-flex; gap: 12rpx; }
.status-tab { padding: 13rpx 24rpx; border: 1rpx solid #d8e1db; border-radius: 999rpx; background: #fff; color: #65736a; font-size: 24rpx; }
.status-tab.active { border-color: #386151; background: #386151; color: #fff; }
.income-card { display: grid; gap: 16rpx; margin-bottom: 16rpx; padding: 24rpx; border: 1rpx solid #e0e6e1; border-radius: 16rpx; background: #fff; }
.income-head, .amount-row, .income-foot { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; }
.merchant-name, .order-no { display: block; }
.merchant-name { font-size: 27rpx; font-weight: 850; }
.order-no, .income-foot { margin-top: 5rpx; color: #8a968e; font-size: 22rpx; }
.product-title { font-family: "STSong", "SimSun", serif; font-size: 29rpx; line-height: 1.45; }
.amount-row { padding-top: 14rpx; border-top: 1rpx dashed #dfe5e0; color: #69756e; font-size: 23rpx; }
.commission { color: #a33d36; font-size: 29rpx; font-weight: 900; }
.status-pill { padding: 7rpx 13rpx; border-radius: 999rpx; background: #eef2ef; color: #647067; font-size: 21rpx; }
.status-pill.pending { background: #fff3dc; color: #965b00; }
.status-pill.settled { background: #e7f6ee; color: #19734d; }
.status-pill.risk_review { background: #fff0ee; color: #a33d36; }
.clawback-row { color: #a33d36; font-size: 23rpx; }
.state-card, .empty-card { display: grid; gap: 12rpx; padding: 28rpx; border: 1rpx solid #e0e6e1; border-radius: 16rpx; background: #fff; color: #66736b; font-size: 24rpx; }
.error-state { border-color: #efc9c5; color: #a33d36; }
.state-retry { width: max-content; font-weight: 900; }
.empty-card { justify-items: center; padding: 60rpx 28rpx; text-align: center; }
.empty-mark { display: grid; place-items: center; width: 76rpx; height: 76rpx; border: 1rpx solid #b8cec4; border-radius: 50%; color: #386151; font-family: "STSong", "SimSun", serif; font-size: 34rpx; }
.empty-title { color: #35443c; font-size: 28rpx; font-weight: 850; }
.empty-copy { color: #8a968e; font-size: 23rpx; line-height: 1.6; }
</style>
