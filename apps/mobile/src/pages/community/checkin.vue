<script setup lang="ts">
import { onLoad } from "@dcloudio/uni-app";
import { withTenantCode } from "../../api";

// Keep old deep links usable while ensuring every entry uses the same demo challenge flow.
onLoad(() => {
  uni.redirectTo({ url: withTenantCode("/pages/checkin/index") });
});
</script>

<template>
  <view class="legacy-checkin-redirect" aria-live="polite">正在进入慢π打卡挑战…</view>
</template>

<style scoped>
.legacy-checkin-redirect { min-height: 100vh; display: grid; place-items: center; color: #78828c; background: #f7f5f0; font-size: 14px; }
</style>
