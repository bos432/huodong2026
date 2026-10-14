<script setup lang="ts">
import { onMounted } from "vue";
import { withTenantCode } from "../../api";

onMounted(() => {
  uni.reLaunch({ url: withTenantCode("/pages/home/index") });
});
</script>

<template>
  <view class="root-route">正在进入慢π首页…</view>
</template>

<style scoped>
.root-route {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #f7f5f0;
  color: #45505d;
  font-size: 30rpx;
}
</style>
