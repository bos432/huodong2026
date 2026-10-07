<script setup lang="ts">
import { onLoad } from "@dcloudio/uni-app";

onLoad((query) => {
  const id = query?.id ? `?id=${encodeURIComponent(String(query.id))}` : "";
  uni.redirectTo({ url: `/pages/activity/detail${id}` });
});
</script>

<template>
  <view class="legacy-route">正在进入慢π活动详情…</view>
</template>

<style scoped>
.legacy-route { min-height: 100vh; display: grid; place-items: center; color: #45505d; background: #f7f5f0; font-size: 30rpx; }
</style>
