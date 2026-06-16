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
    <PageDecorationBlocks :sections="contentSections" />

    <view class="head" :style="{ background: String(innerPageLayout.headerBackgroundColor || 'transparent') }">
      <view class="title" :style="{ color: String(innerPageLayout.headerTextColor || '#111827') }">{{ innerPageConfig.title || "服务中心" }}</view>
      <view class="subtle" :style="{ color: String(innerPageLayout.headerSubtitleColor || '#667085') }">{{ innerPageConfig.subtitle || "付款、退款、发票和客服信息，都可以在这里快速找到。" }}</view>
    </view>

    <view v-if="loading" class="card subtle">加载中...</view>
    <template v-else-if="setting">
      <view class="card">
        <view class="card-title">联系主办方</view>
        <view v-if="setting.customerServiceName" class="line"><text>客服</text><text>{{ setting.customerServiceName }}</text></view>
        <view v-if="setting.customerServicePhone" class="line" @click="copy(setting.customerServicePhone)"><text>电话</text><text>{{ setting.customerServicePhone }}</text></view>
        <view v-if="setting.customerServiceWechat" class="line" @click="copy(setting.customerServiceWechat)"><text>微信</text><text>{{ setting.customerServiceWechat }}</text></view>
      </view>

      <view class="card">
        <view class="card-title">城市合伙人</view>
        <view class="content">面向文化空间、培训机构、书院、书法教室、读书会主理人开放合作。你可以拥有自己的活动后台、收款方式、会员和报名数据。</view>
        <view class="partner-entry" @click="goPartner">
          <text>查看合作方案</text>
          <text>进入</text>
        </view>
      </view>

      <view class="card">
        <view class="card-title">支付说明</view>
        <view class="content">{{ paymentInstructions() }}</view>
      </view>

      <view class="card">
        <view class="card-title">退款说明</view>
        <view class="content">{{ setting.refundInstructions || "暂无退款说明" }}</view>
      </view>

      <view class="card">
        <view class="card-title">发票说明</view>
        <view class="content">{{ setting.invoiceInstructions || "暂无发票说明" }}</view>
      </view>
    </template>

    <AppBottomNav v-if="showBottomNav" :section="bottomNavSection" current-path="/pages/service/index" />
  </view>
</template>

<style scoped>
.service-page { min-height: 100vh; padding: 24rpx; background: var(--page-bg-layer, #f4f6f8); background-size: var(--page-bg-size, cover); background-position: var(--page-bg-position, center top); background-attachment: fixed; color: var(--text-color, #111827); }
.service-page.has-custom-nav { padding-bottom: 160rpx; }
.head { margin-bottom: 18rpx; padding: 30rpx 24rpx; border-radius: var(--card-radius, 8px); }
.title { font-size: 44rpx; font-weight: 900; }
.subtle { color: var(--muted-color, #667085); font-size: 26rpx; line-height: 1.5; }
.head .subtle { margin-top: 12rpx; }
.card { margin-bottom: 20rpx; padding: 26rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.06); }
.card-title { color: var(--text-color, #111827); font-size: 32rpx; font-weight: 900; margin-bottom: 14rpx; }
.line { display: grid; grid-template-columns: 110rpx 1fr; gap: 16rpx; padding: 14rpx 0; border-bottom: 1px solid #edf0f5; }
.line:last-child { border-bottom: 0; }
.line text:first-child { color: var(--muted-color, #667085); }
.line text:last-child { color: var(--text-color, #111827); font-weight: 700; overflow-wrap: anywhere; }
.content { color: #344054; font-size: 27rpx; line-height: 1.7; white-space: pre-wrap; }
.partner-entry { margin-top: 22rpx; height: 76rpx; padding: 0 22rpx; border-radius: 6px; background: #f0f7f4; color: #0f766e; display: flex; align-items: center; justify-content: space-between; font-size: 27rpx; font-weight: 800; }
</style>
