<script setup lang="ts">
import GuofengPageHeading from '../../components/GuofengPageHeading.vue';
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { request, withTenantCode } from "../../api";
import { filterIntrinsicHeaderDecorationSections, usePageDecoration } from "../../decoration";
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
const bodyDecorationSections = computed(() => filterIntrinsicHeaderDecorationSections(contentSections.value));
const customerServiceSession = computed(() => JSON.stringify({ source: "service_center", tenantCode: tenant.value?.code || "" }));

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

    <GuofengPageHeading stamp="服" :title="innerPageConfig.title || '服务中心'" :subtitle="innerPageConfig.subtitle" :background="innerPageLayout.headerBackgroundColor" :text-color="innerPageLayout.headerTextColor" :muted-color="innerPageLayout.headerSubtitleColor" />

    <PageDecorationBlocks :sections="bodyDecorationSections" />

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
        <!-- #ifdef MP-WEIXIN -->
        <button class="customer-service-button" open-type="contact" :session-from="customerServiceSession">打开微信客服</button>
        <!-- #endif -->
        <!-- #ifndef MP-WEIXIN -->
        <view v-if="setting.customerServiceWechat || setting.customerServicePhone" class="service-copy">点击上方联系方式即可复制，微信内可直接添加客服。</view>
        <!-- #endif -->
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
.service-page { min-height: 100vh; max-width: 760px; margin: 0 auto; padding: 24rpx 28rpx; background: #fff; color: #28332d; overflow-wrap: anywhere; }
.service-page .card { padding: 26rpx 0; margin-bottom: 0; border: 0; border-bottom: 1rpx solid #e1e6de; border-radius: 0; background: #fff; box-shadow: none; }
.card-kicker { color: #65736a; font-size: 22rpx; margin-bottom: 8rpx; }
.card-title { color: #28332d; font: 34rpx "STSong", "SimSun", "Noto Serif CJK SC", serif; line-height: 1.5; margin-bottom: 18rpx; }
.line { display: grid; grid-template-columns: 100rpx minmax(0,1fr); gap: 16rpx; padding: 16rpx 0; font-size: 26rpx; line-height: 1.5; border-bottom: 1rpx solid #edf0eb; }
.line text:first-child { color: #65736a; }
.line text:last-child { color: #386151; overflow-wrap: anywhere; }
.content { color: #65736a; font-size: 27rpx; line-height: 1.8; }
.service-copy { margin-top: 18rpx; font-size: 23rpx; color: #65736a; line-height: 1.6; }
.partner-entry { display: flex; justify-content: space-between; align-items: center; margin-top: 18rpx; min-height: 72rpx; color: #386151; font-size: 26rpx; border-top: 1rpx solid #e1e6de; }
.customer-service-button { margin: 20rpx 0 0; min-height: 76rpx; border: 1rpx solid #386151; border-radius: 6rpx; background: #386151; color: #fff; font-size: 26rpx; }
.customer-service-button::after { border: 0; }
.error-card { color: #a33d36; }
</style>
