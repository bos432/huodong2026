<template>
  <view class="container has-custom-nav">
    <TenantSwitcher :tenant="tenant" title="当前城市" @changed="handleTenantChanged" />

    <view class="header-row">
      <view class="brand-title">
        <image v-if="pageBrand.logoUrl" class="brand-logo" :src="pageBrand.logoUrl" mode="aspectFit" />
        <text class="title-xxl brand-name">{{ pageBrand.name }}</text>
      </view>
      <view class="search-btn" @click="goSearch">
        <text class="search-icon">搜</text>
      </view>
    </view>

    <PageDecorationBlocks :sections="contentSections" />

    <view style="height:120rpx;"></view>
    <TabBar current="index" />
  </view>
</template>

<script setup lang="ts">
import { onShareAppMessage, onShareTimeline, onShow } from "@dcloudio/uni-app";
import { applyTenantBootstrapDefault, getCurrentTenantCode, withTenantCode } from "../../api";
import { loadPageTheme, pageBrand } from "../../theme";
import { defaultMiniProgramShare, defaultMiniProgramTimelineShare, showMiniProgramShareMenu } from "../../share";
import { resolveTenantByCurrentLocation } from "../../tenant-location";
import TabBar from "../../components/TabBar.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";
import TenantSwitcher from "../../components/TenantSwitcher.vue";
import { usePageDecoration } from "../../decoration";

const { tenant, contentSections, loadDecoration } = usePageDecoration("home", "/pages/index/index");

const shareOptions = {
  title: () => `${pageBrand.name || "慢π"}活动报名`,
  path: "/pages/index/index"
};
onShareAppMessage(() => defaultMiniProgramShare(shareOptions));
onShareTimeline(() => defaultMiniProgramTimelineShare(shareOptions));
onShow(showMiniProgramShareMenu);

onShow(async () => {
  await applyTenantBootstrapDefault();
  await Promise.allSettled([loadPageTheme(), loadDecoration()]);
  const beforeTenantCode = getCurrentTenantCode();
  void resolveTenantByCurrentLocation({ silent: true }).then(async () => {
    if (getCurrentTenantCode() === beforeTenantCode) return;
    await Promise.allSettled([loadPageTheme(), loadDecoration()]);
    if (beforeTenantCode) uni.showToast({ title: "已按当前位置切换慢π城市", icon: "none" });
  });
});

async function handleTenantChanged() {
  await loadPageTheme();
  await loadDecoration();
}

function goSearch() {
  uni.navigateTo({ url: withTenantCode("/pages/search/index") });
}

</script>

<style scoped>
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0 16rpx;
}

.brand-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.brand-logo {
  width: 58rpx;
  height: 58rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.68);
}

.brand-name {
  font-family: "STKaiti", "KaiTi", serif;
}

.search-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(74, 107, 138, 0.08);
  border-radius: 20rpx;
}

.search-icon {
  color: #4A6B8A;
  font-size: 26rpx;
  font-weight: 700;
}

</style>
