<template>
  <view class="container user-subpage has-custom-nav">
    <view class="custom-nav">
      <view class="nav-back" @click="goBack">‹ 返回</view>
      <text class="nav-title">我的证书</text>
      <view class="nav-placeholder"></view>
    </view>
    <view class="page-hero">
      <view class="hero-kicker">成长凭证</view>
      <view class="hero-title">记录完成与认可</view>
      <view class="hero-desc">课程或活动达成后，证书会集中展示在这里。</view>
    </view>
    <view v-for="c in certificates" :key="c.id" class="certificate-card">
      <image v-if="c.imageUrl" class="cert-image" :src="c.imageUrl" mode="aspectFill" />
      <view v-else class="cert-badge">证</view>
      <text class="cert-name">{{ c.name }}</text>
      <text class="cert-time">{{ formatTime(c.issuedAt) }}</text>
      <button class="download-btn" @click="downloadCertificate(c)">下载证书</button>
    </view>
    <view v-if="!loading && !certificates.length" class="empty-card">
      <view class="empty-icon">证</view>
      <view class="empty-title">暂无证书</view>
      <view class="empty-desc">完成可发证的课程或活动后，证书会自动出现在这里。</view>
    </view>
    <TabBar current="user" />
  </view>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ensureUser, getUserToken, request } from "../../api";
import TabBar from "../../components/TabBar.vue";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";
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

async function downloadCertificate(certificate: any) {
  if (!certificate?.id) return;
  // #ifdef H5
  try {
    const token = getUserToken();
    const response = await fetch(`${API_BASE}/public/me/certificates/${certificate.id}/download`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) throw new Error("下载失败");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${certificate.name || "certificate"}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error: any) {
    uni.showToast({ title: error?.message || "下载失败", icon: "none" });
  }
  // #endif
  // #ifndef H5
  uni.showModal({ title: "下载证书", content: "请在 H5 页面打开后下载证书文件。", showCancel: false });
  // #endif
}

onMounted(loadCertificates);
</script>
<style scoped>
.user-subpage {
  min-height: 100vh;
  padding-bottom: 160rpx;
  background:
    linear-gradient(180deg, #f7efe3 0%, #fbf7ef 40%, #f4eadc 100%);
}

.custom-nav {
  display: flex;
  align-items: center;
  padding: 18rpx 0 20rpx;
}

.nav-back,
.nav-placeholder {
  width: 130rpx;
  color: #4a6b8a;
  font-size: 28rpx;
}

.nav-title {
  flex: 1;
  color: #263d3c;
  font-size: 32rpx;
  font-weight: 800;
  text-align: center;
}

.page-hero {
  padding: 34rpx 30rpx;
  border-radius: 30rpx;
  background:
    linear-gradient(135deg, rgba(33, 75, 78, 0.96), rgba(129, 55, 48, 0.9)),
    #214b4e;
  color: #fffaf2;
  box-shadow: 0 18rpx 46rpx rgba(36, 60, 60, 0.18);
}

.hero-kicker {
  display: inline-flex;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 250, 242, 0.14);
  color: rgba(255, 250, 242, 0.84);
  font-size: 22rpx;
}

.hero-title {
  margin-top: 22rpx;
  font-size: 42rpx;
  font-weight: 800;
  line-height: 1.25;
}

.hero-desc {
  margin-top: 14rpx;
  color: rgba(255, 250, 242, 0.76);
  font-size: 25rpx;
  line-height: 1.65;
}

.certificate-card,
.empty-card {
  margin-top: 18rpx;
  padding: 36rpx 28rpx;
  border: 1rpx solid rgba(199, 181, 157, 0.58);
  border-radius: 24rpx;
  background: rgba(255, 252, 246, 0.96);
  box-shadow: 0 12rpx 34rpx rgba(72, 55, 38, 0.08);
  text-align: center;
}

.cert-badge,
.empty-icon {
  width: 92rpx;
  height: 92rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 18rpx;
  border-radius: 50%;
  background: #f1e3d0;
  color: #8b4a3e;
  font-size: 36rpx;
  font-weight: 800;
}

.cert-image {
  width: 100%;
  height: 260rpx;
  display: block;
  margin-bottom: 18rpx;
  border-radius: 18rpx;
  background: #f1e3d0;
}

.cert-name,
.empty-title {
  display: block;
  color: #8b4a3e;
  font-size: 32rpx;
  font-weight: 800;
  line-height: 1.4;
}

.cert-time,
.empty-desc {
  display: block;
  margin-top: 10rpx;
  color: #8f8172;
  font-size: 24rpx;
  line-height: 1.6;
}

.download-btn {
  width: 220rpx;
  height: 64rpx;
  margin: 22rpx auto 0;
  border: 0;
  border-radius: 999rpx;
  background: #214b4e;
  color: #fffaf2;
  font-size: 25rpx;
  line-height: 64rpx;
}
</style>
