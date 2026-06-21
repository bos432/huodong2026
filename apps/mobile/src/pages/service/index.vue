<script setup lang="ts">
import { onMounted, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { getCurrentTenantCode, request, withTenantCode } from "../../api";
import { usePageDecoration } from "../../decoration";
import { loadPageTheme } from "../../theme";
import TenantSwitcher from "../../components/TenantSwitcher.vue";
import AppBottomNav from "../../components/AppBottomNav.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";

const setting = ref<any>();
const loading = ref(true);
const mounted = ref(false);
const lastLoadedTenantCode = ref("");
const paymentInstructionsField = "offlinePaymentInstructions";
const { tenant, bottomNavSection, contentSections, innerPageConfig, innerPageLayout, showBottomNav, loadDecoration } = usePageDecoration("service_center", "/pages/service/index");

async function load() {
  loading.value = true;
  try {
    setting.value = await request("/public/settings/operation");
  } finally {
    loading.value = false;
  }
}

function copy(text?: string) {
  if (!text) return;
  uni.setClipboardData({ data: text, success: () => uni.showToast({ title: "已复制", icon: "success" }) });
}

function goPartner() {
  uni.navigateTo({ url: withTenantCode("/pages/partner/index") });
}

function paymentInstructions() {
  void setting.value?.[paymentInstructionsField];
  return "本次上线支持微信支付和后台充值余额支付；如余额不足，请联系工作人员充值后再支付。";
}

async function refreshTenantScopedPage() {
  lastLoadedTenantCode.value = getCurrentTenantCode();
  await Promise.all([load(), loadDecoration()]);
}

async function handleTenantChanged() {
  await loadPageTheme();
  await refreshTenantScopedPage();
}

onMounted(() => {
  mounted.value = true;
  refreshTenantScopedPage();
});

onShow(() => {
  if (!mounted.value) return;
  if (getCurrentTenantCode() === lastLoadedTenantCode.value) return;
  loadPageTheme();
  refreshTenantScopedPage();
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

    <view v-if="loading" class="card subtle">加载中...</view>
    <template v-else-if="setting">
      <view class="card">
        <view class="card-kicker">客服支持</view>
        <view class="card-title">联系主办方</view>
        <view v-if="setting.customerServiceName" class="line"><text>客服</text><text>{{ setting.customerServiceName }}</text></view>
        <view v-if="setting.customerServicePhone" class="line" @click="copy(setting.customerServicePhone)"><text>电话</text><text>{{ setting.customerServicePhone }}</text></view>
        <view v-if="setting.customerServiceWechat" class="line" @click="copy(setting.customerServiceWechat)"><text>微信</text><text>{{ setting.customerServiceWechat }}</text></view>
      </view>

      <view class="card">
        <view class="card-kicker">合作入口</view>
        <view class="card-title">城市合伙人</view>
        <view class="content">面向文化空间、培训机构、书院、书法教室、读书会主理人开放合作。你可以拥有自己的活动后台、收款方式、会员和报名数据。</view>
        <view class="partner-entry" @click="goPartner">
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
.service-page { min-height: 100vh; padding: 24rpx; background: var(--page-bg-layer, #f5f0e8); background-size: var(--page-bg-size, cover); background-position: var(--page-bg-position, center top); background-attachment: fixed; color: var(--text-color, #333333); }
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
</style>
