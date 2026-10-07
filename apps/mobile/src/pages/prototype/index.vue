<script setup lang="ts">
import { onMounted } from "vue";

onMounted(() => {
  uni.reLaunch({ url: "/pages/home/index" });
});
</script>

<template>
  <view class="legacy-route">正在进入慢π首页…</view>
</template>

<style scoped>
.legacy-route { min-height: 100vh; display: grid; place-items: center; color: #45505d; background: #f7f5f0; font-size: 30rpx; }
</style>
