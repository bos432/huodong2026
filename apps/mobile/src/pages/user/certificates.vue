<template>
  <view class="container">
    <view class="custom-nav"><view class="nav-back" @click="goBack">‹ 返回</view><text class="title-md" style="flex:1; text-align:center;">我的证书</text></view>
    <view v-for="c in certificates" :key="c.id" class="card certificate-card">
      <image v-if="c.imageUrl" class="cert-image" :src="c.imageUrl" mode="aspectFill" />
      <view v-else class="cert-badge">🏅</view>
      <text style="font-size:32rpx; font-weight:700; color:#C43D3D;">{{ c.name }}</text>
      <text class="subtle" style="margin-top:8rpx;">{{ formatTime(c.issuedAt) }}</text>
    </view>
    <empty-state v-if="!loading && !certificates.length" icon="🏅" text="暂无证书" />
  </view>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ensureUser, request } from "../../api";

const loading = ref(true);
const certificates = ref<any[]>([]);

function formatTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("zh-CN");
}

async function loadCertificates() {
  loading.value = true;
  try {
    await ensureUser();
    const rows = await request<any[]>("/public/me/certificates");
    certificates.value = Array.isArray(rows) ? rows : [];
  } catch {
    certificates.value = [];
  } finally {
    loading.value = false;
  }
}

function goBack() { uni.navigateBack(); }
onMounted(loadCertificates);
</script>
<style scoped>
.custom-nav { display:flex; align-items:center; padding:16rpx 0; }
.nav-back { font-size:28rpx; color:#4A6B8A; }
.certificate-card { text-align:center; padding:40rpx; }
.cert-badge { font-size:80rpx; margin-bottom:16rpx; }
.cert-image { width:100%; height:260rpx; border-radius:16rpx; margin-bottom:16rpx; }
</style>
