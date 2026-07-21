<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { request, withTenantCode } from "../../api";
import { usePageDecoration } from "../../decoration";
import { isLinkAllowedByFeature, loadFeatureGates, showFeatureDisabledToast } from "../../feature-gates";
import { reviewSafeText } from "../../review-safe-text";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { loadPageTheme } from "../../theme";
import TenantSwitcher from "../../components/TenantSwitcher.vue";
import AppBottomNav from "../../components/AppBottomNav.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";

const setting = ref<any>();
const loading = ref(true);
const loadError = ref("");
const copying = ref("");
const paymentInstructionsField = "offlinePaymentInstructions";
const loadGuard = createTenantLoadGuard();
const { tenant, bottomNavSection, contentSections, innerPageConfig, innerPageLayout, showBottomNav, loadDecoration } = usePageDecoration("service_center", "/pages/service/index");

async function load() {
  const token = loadGuard.begin();
  loading.value = true;
  loadError.value = "";
  setting.value = undefined;
  try {
    const result = await request("/public/settings/operation");
    if (loadGuard.isCurrent(token)) setting.value = result;
  } catch (error: any) {
    if (loadGuard.isCurrent(token)) loadError.value = reviewSafeText(error?.message || "服务信息加载失败");
  } finally {
    if (loadGuard.isCurrent(token)) loading.value = false;
  }
}

function copy(text?: string) {
  if (!text || copying.value) return;
  copying.value = text;
  uni.setClipboardData({
    data: text,
    success: () => uni.showToast({ title: "已复制", icon: "success" }),
    fail: () => uni.showToast({ title: "复制失败", icon: "none" }),
    complete: () => { copying.value = ""; }
  });
}

function goPartner() {
  if (!isLinkAllowedByFeature("/pages/partner/index")) return showFeatureDisabledToast("/pages/partner/index");
  uni.navigateTo({ url: withTenantCode("/pages/partner/index") });
}

function paymentInstructions() {
  return setting.value?.[paymentInstructionsField] || "支付方式与付款截止时间以订单确认页为准；如需协助，请联系工作人员。";
}

async function refreshTenantScopedPage() {
  await Promise.allSettled([load(), loadDecoration()]);
}

async function handleTenantChanged() {
  await loadPageTheme();
  await loadFeatureGates(true);
  await refreshTenantScopedPage();
}

onShow(async () => {
  await Promise.all([loadPageTheme(), loadFeatureGates(true)]);
  await refreshTenantScopedPage();
});
</script>

<template>
  <view class="service-page" :class="{ 'has-custom-nav': showBottomNav }">
    <TenantSwitcher :tenant="tenant" title="当前城市" @changed="handleTenantChanged" />

    <view class="service-hero" :style="{ background: String(innerPageLayout.headerBackgroundColor || '#4a6b8a') }">
      <view class="hero-mark">服</view>
      <view class="hero-copy">
        <view class="title" :style="{ color: String(innerPageLayout.headerTextColor || '#fff8f0') }">{{ innerPageConfig.title || "服务中心" }}</view>
        <view class="subtle" :style="{ color: String(innerPageLayout.headerSubtitleColor || 'rgba(255,248,240,0.82)') }">{{ innerPageConfig.subtitle || "付款、退款、发票和客服信息，都可以在这里快速找到。" }}</view>
      </view>
    </view>

    <PageDecorationBlocks :sections="contentSections" />

    <view v-if="loading" class="card subtle" aria-live="polite">服务信息加载中...</view>
    <view v-else-if="loadError" class="card error-card" aria-live="assertive">
      <text>{{ loadError }}</text>
      <view class="button secondary" role="button" aria-label="重新加载服务信息" @click="refreshTenantScopedPage">重新加载</view>
    </view>
    <template v-else-if="setting">
      <view class="card">
        <view class="card-kicker">客服支持</view>
        <view class="card-title">联系主办方</view>
        <view v-if="setting.customerServiceName" class="line"><text>客服</text><text>{{ setting.customerServiceName }}</text></view>
        <view v-if="setting.customerServicePhone" class="line" role="button" aria-label="复制客服电话" @click="copy(setting.customerServicePhone)"><text>电话</text><text>{{ setting.customerServicePhone }}</text></view>
        <view v-if="setting.customerServiceWechat" class="line" role="button" aria-label="复制客服微信" @click="copy(setting.customerServiceWechat)"><text>微信</text><text>{{ setting.customerServiceWechat }}</text></view>
      </view>

      <view class="card">
        <view class="card-kicker">合作入口</view>
        <view class="card-title">城市合伙人</view>
        <view class="content">面向文化空间、书院、书法教室、读书会主理人和本地社群开放合作。你可以拥有自己的活动后台、收款方式、会员和报名数据。</view>
        <view class="partner-entry" role="button" aria-label="查看城市合伙人方案" @click="goPartner">
          <text>查看合作方案</text>
          <text>进入</text>
        </view>
      </view>

      <view class="card">
        <view class="card-kicker">付款规则</view>
        <view class="card-title">支付说明</view>
        <view class="content">{{ paymentInstructions() }}</view>
      </view>

      <view class="card">
        <view class="card-kicker">售后规则</view>
        <view class="card-title">退款说明</view>
        <view class="content">{{ setting.refundInstructions || "暂无退款说明" }}</view>
      </view>

      <view class="card">
        <view class="card-kicker">开票信息</view>
        <view class="card-title">发票说明</view>
        <view class="content">{{ setting.invoiceInstructions || "暂无发票说明" }}</view>
      </view>
    </template>

    <AppBottomNav v-if="showBottomNav" :section="bottomNavSection" current-path="/pages/service/index" />
  </view>
</template>

<style scoped>
.service-page { min-height: 100vh; box-sizing:border-box; padding: 24rpx 24rpx calc(24rpx + env(safe-area-inset-bottom)); background: var(--page-bg-layer, #f5f0e8); background-size: var(--page-bg-size, cover); background-position: var(--page-bg-position, center top); background-attachment: fixed; color: var(--text-color, #333333); }
.service-page.has-custom-nav { padding-bottom: 160rpx; }
.service-hero {
  position: relative;
  overflow: hidden;
  min-height: 320rpx;
  display: flex;
  align-items: flex-end;
  gap: 22rpx;
  margin-bottom: 20rpx;
  padding: 34rpx 28rpx;
  border-radius: 24rpx;
  box-shadow: 0 18rpx 44rpx rgba(91, 47, 36, 0.16);
}
.service-hero::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(34, 24, 19, 0.04), rgba(34, 24, 19, 0.24));
  pointer-events: none;
}
.hero-mark,
.hero-copy {
  position: relative;
  z-index: 1;
}
.hero-mark {
  flex: 0 0 auto;
  width: 96rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 28rpx;
  background: rgba(255, 248, 240, 0.16);
  color: #fff8f0;
  font-size: 38rpx;
  font-weight: 700;
  font-family: "STKaiti", "KaiTi", serif;
}
.hero-copy { min-width: 0; }
.title { font-size: 48rpx; line-height: 1.22; font-weight: 700; font-family: "STKaiti", "KaiTi", serif; }
.subtle { color: var(--muted-color, #999999); font-size: 26rpx; line-height: 1.5; }
.hero-copy .subtle { margin-top: 12rpx; font-size: 25rpx; line-height: 1.6; }
.card { margin-bottom: 20rpx; padding: 26rpx; border-radius: 24rpx; background: var(--card-bg, #fff); box-shadow: 0 12rpx 34rpx rgba(91, 47, 36, 0.07); }
.card-kicker { color: #4a6b8a; font-size: 23rpx; font-weight: 800; margin-bottom: 8rpx; }
.card-title { color: var(--text-color, #333333); font-size: 32rpx; font-weight: 900; margin-bottom: 14rpx; font-family: "STKaiti", "KaiTi", serif; }
.line { display: grid; grid-template-columns: 110rpx 1fr; gap: 16rpx; padding: 16rpx 0; border-bottom: 1px solid #e8e0d8; }
.line:last-child { border-bottom: 0; }
.line text:first-child { color: var(--muted-color, #999999); }
.line text:last-child { color: var(--text-color, #333333); font-weight: 700; overflow-wrap: anywhere; }
.content { color: #666666; font-size: 27rpx; line-height: 1.7; white-space: pre-wrap; }
.partner-entry { margin-top: 22rpx; min-height: 80rpx; padding: 0 22rpx; border-radius: 18rpx; background: rgba(196, 61, 61, 0.1); color: #c43d3d; display: flex; align-items: center; justify-content: space-between; gap: 16rpx; font-size: 27rpx; font-weight: 800; }
.error-card { color:#b42318; border:1rpx solid #f0b8b0; background:#fff4f2; line-height:1.6; }
.error-card .button { margin-top:18rpx; }
@media (min-width: 900px) {
  .service-page { max-width:760px; margin:0 auto; }
}
</style>
