<template>
  <slot />
  <MarketingPopup :show-key="popupShowKey" />
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onLaunch, onShow } from "@dcloudio/uni-app";
import MarketingPopup from "./components/MarketingPopup.vue";
import { loadPageTheme } from "./theme";

const popupShowKey = ref(0);

onLaunch(() => {
  loadPageTheme();
});

onShow(() => {
  popupShowKey.value += 1;
});
</script>

<style>
page {
  background: var(--page-bg, #F5F0E8);
  color: var(--text-color, #333333);
}
</style>
