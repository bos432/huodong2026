<template>
  <slot />
</template>

<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";
import { loadPageTheme } from "./theme";

onLaunch(() => {
  loadPageTheme();
});
</script>

<style>
page {
  background: var(--page-bg, #f5f7fb);
  color: var(--text-color, #172033);
}
</style>
