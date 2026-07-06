<template>
  <view class="container has-custom-nav">
    <TenantSwitcher :tenant="tenant" title="当前城市" @changed="handleTenantChanged" />

    <PageDecorationBlocks :sections="contentSections" />

    <view style="height:120rpx;"></view>
    <TabBar current="index" />
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { getCurrentTenantCode } from "../../api";
import { loadPageTheme } from "../../theme";
import { resolveTenantByCurrentLocation } from "../../tenant-location";
import TabBar from "../../components/TabBar.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";
import TenantSwitcher from "../../components/TenantSwitcher.vue";
import { usePageDecoration } from "../../decoration";

const { tenant, contentSections, loadDecoration } = usePageDecoration("home", "/pages/index/index");
const lastLoadedTenantCode = ref("");

onShow(async () => {
  loadPageTheme();
  const beforeTenantCode = getCurrentTenantCode();
  await resolveTenantByCurrentLocation({ silent: true });
  const changedByLocation = getCurrentTenantCode() !== beforeTenantCode || getCurrentTenantCode() !== lastLoadedTenantCode.value;
  await loadDecoration();
  lastLoadedTenantCode.value = getCurrentTenantCode();
  if (changedByLocation && beforeTenantCode) uni.showToast({ title: "已按当前位置切换慢π城市", icon: "none" });
});

async function handleTenantChanged() {
  loadPageTheme();
  await loadDecoration();
  lastLoadedTenantCode.value = getCurrentTenantCode();
}
</script>
