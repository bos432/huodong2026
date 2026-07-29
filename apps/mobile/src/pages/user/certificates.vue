<template>
  <view class="container user-subpage has-custom-nav">
    <view class="custom-nav">
    <view class="nav-back" role="button" tabindex="0" aria-label="返回上一页" @click="goBack" @keyup.enter="goBack" @keyup.space.prevent="goBack">‹ 返回</view>
      <text class="nav-title">我的证书</text>
      <view class="nav-placeholder"></view>
    </view>
    <view class="page-hero">
      <view class="hero-kicker">成长凭证</view>
      <view class="hero-title">记录完成与认可</view>
      <view class="hero-desc">内容或活动达成后，证书会集中展示在这里。</view>
    <view class="verify-entry" role="button" tabindex="0" aria-label="公开凭证验真" @click="openVerification()" @keyup.enter="openVerification()" @keyup.space.prevent="openVerification()">公开凭证验真</view>
    </view>
    <view v-if="loading" class="state-card">证书与凭证加载中...</view>
    <view v-else-if="loadError" class="state-card error-state" role="alert" aria-live="assertive"><text>{{ loadError }}</text><view class="state-retry" role="button" tabindex="0" aria-label="重新加载证书" @click="loadCertificates" @keyup.enter="loadCertificates" @keyup.space.prevent="loadCertificates">重新加载证书</view></view>
    <view v-if="volunteerWarning" class="state-card warning-state" role="status" aria-live="polite"><text>{{ volunteerWarning }}</text><view class="state-retry" role="button" tabindex="0" aria-label="重新同步志愿凭证" @click="loadCertificates" @keyup.enter="loadCertificates" @keyup.space.prevent="loadCertificates">重新同步志愿凭证</view></view>
    <view v-if="downloadError" class="state-card error-state" role="alert" aria-live="assertive"><text>{{ downloadError }}</text><view class="state-retry" role="button" tabindex="0" aria-label="关闭证书下载错误" @click="downloadError = ''" @keyup.enter="downloadError = ''" @keyup.space.prevent="downloadError = ''">关闭</view></view>
    <view v-for="c in certificates" :key="c.id" class="certificate-card">
      <image v-if="c.imageUrl || c.previewUrl" class="cert-image" :src="c.imageUrl || c.previewUrl" mode="aspectFit" />
      <view v-else class="cert-badge">证</view>
      <text class="cert-name">{{ c.name }}</text>
      <view class="cert-meta-grid">
        <view><text>编号</text><strong>{{ c.certificateNo || "-" }}</strong></view>
        <view><text>时长</text><strong>{{ Number(c.serviceHours || 0).toFixed(1) }}h</strong></view>
        <view><text>状态</text><strong>{{ c.status === "revoked" ? "已撤销" : "有效" }}</strong></view>
      </view>
      <text class="cert-time">发证时间：{{ formatTime(c.issuedAt) }}</text>
      <view class="certificate-actions">
        <button class="download-btn" :disabled="downloadingId === c.id" aria-label="下载证书" @click="downloadCertificate(c)">{{ downloadingId === c.id ? "下载中..." : "下载证书" }}</button>
        <button class="verify-btn" aria-label="验证证书" @click="openVerification(c.certificateNo, 'certificate')">验真</button>
      </view>
    </view>
    <view v-if="!loading && !loadError && !certificates.length" class="empty-card">
      <view class="empty-icon">证</view>
      <view class="empty-title">暂无证书</view>
      <view class="empty-desc">完成可发证的内容或活动后，证书会自动出现在这里。</view>
    </view>
    <view v-if="volunteer.badges?.length" class="credential-card">
      <view class="credential-title">志愿勋章</view>
      <view v-for="badge in volunteer.badges" :key="badge.id" class="credential-row"><text>{{ badge.name }}</text><text>{{ formatTime(badge.awardedAt) }}</text></view>
    </view>
    <view v-if="volunteer.proofs?.length" class="credential-card">
      <view class="credential-title">志愿服务证明</view>
      <view v-for="proof in volunteer.proofs" :key="proof.proofNo" class="credential-row credential-proof" role="button" tabindex="0" aria-label="验证志愿服务证明" @click="openVerification(proof.proofNo, 'proof')" @keyup.enter="openVerification(proof.proofNo, 'proof')" @keyup.space.prevent="openVerification(proof.proofNo, 'proof')"><text>{{ proof.title }} · {{ Number(proof.hours || 0).toFixed(1) }}h</text><text>{{ proof.proofNo }} · 验真</text></view>
    </view>
    <TabBar current="user" />
  </view>
</template>
<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { API_BASE } from "../../api-base";
import { ensureUser, getCurrentTenantCode, getUserToken, request } from "../../api";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import TabBar from "../../components/TabBar.vue";
import { reviewSafeText } from "../../review-safe-text";
import { formatShanghaiDate } from "../../shanghai-date";

const loading = ref(true);
const loadError = ref("");
const volunteerWarning = ref("");
const downloadingId = ref(0);
const downloadError = ref("");
const certificates = ref<any[]>([]);
const volunteer = ref<any>({ badges: [], proofs: [] });
const loadedTenantCode = ref("");
const loadGuard = createTenantLoadGuard();

function formatTime(value?: string) {
  return formatShanghaiDate(value, "");
}

async function loadCertificates() {
  const loadToken = loadGuard.begin();
  const sameTenant = loadedTenantCode.value === loadToken.tenantCode;
  if (loadedTenantCode.value && loadedTenantCode.value !== loadToken.tenantCode) {
    certificates.value = [];
    volunteer.value = { badges: [], proofs: [] };
  }
  loading.value = true;
  loadError.value = "";
  volunteerWarning.value = "";
  try {
    await ensureUser();
    const [certificateResult, volunteerResult] = await Promise.allSettled([request<any[]>("/public/me/certificates"), request<any>("/public/me/volunteer")]);
    if (!loadGuard.isCurrent(loadToken)) return;
    if (certificateResult.status === "fulfilled") certificates.value = Array.isArray(certificateResult.value) ? certificateResult.value : [];
    else loadError.value = certificateResult.reason?.message || "证书加载失败，请稍后重试。";
    if (volunteerResult.status === "fulfilled") volunteer.value = volunteerResult.value || { badges: [], proofs: [] };
    else {
      if (!sameTenant) volunteer.value = { badges: [], proofs: [] };
      const message = String(volunteerResult.reason?.message || "");
      volunteerWarning.value = message.includes("功能暂未开放") ? "" : reviewSafeText(message || "志愿勋章和服务证明同步失败。");
    }
    loadedTenantCode.value = loadToken.tenantCode;
  } catch (error: any) {
    if (!loadGuard.isCurrent(loadToken)) return;
    if (!String(error?.message || "").includes("请先完成")) loadError.value = reviewSafeText(error?.message || "证书加载失败，请稍后重试。");
  } finally {
    if (loadGuard.isCurrent(loadToken)) loading.value = false;
  }
}

function goBack() { uni.navigateBack(); }
function openVerification(code = "", type: "certificate" | "proof" = "certificate") { uni.navigateTo({ url: `/pages/credential/verify?type=${type}&code=${encodeURIComponent(code || "")}` }); }

async function downloadCertificate(certificate: any) {
  if (!certificate?.id || downloadingId.value) return;
  downloadError.value = "";
  downloadingId.value = certificate.id;
  // #ifdef H5
  try {
    const token = getUserToken();
    const tenantCode = getCurrentTenantCode();
    const certificateId = certificate.id;
    const response = await fetch(`${API_BASE}/public/me/certificates/${certificate.id}/download?tenantCode=${encodeURIComponent(tenantCode)}`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(tenantCode ? { "x-tenant-code": tenantCode } : {}) } });
    if (!response.ok) throw new Error("下载失败");
    const blob = await response.blob();
    if (getCurrentTenantCode() !== tenantCode || downloadingId.value !== certificateId) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${certificate.name || "certificate"}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error: any) {
    downloadError.value = reviewSafeText(error?.message || "证书下载失败");
  } finally {
    downloadingId.value = 0;
  }
  // #endif
  // #ifndef H5
  uni.showModal({ title: "下载证书", content: "请在 H5 页面打开后下载证书文件。", showCancel: false });
  downloadingId.value = 0;
  // #endif
}

onShow(() => { void loadCertificates(); });
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
.verify-entry { width:max-content; margin-top:20rpx; padding:12rpx 18rpx; border:1rpx solid rgba(255,250,242,.3); border-radius:8px; color:#fffaf2; font-size:24rpx; font-weight:800; }
.credential-card { margin-top: 18rpx; padding: 24rpx 28rpx; border: 1rpx solid #eadcca; border-radius: 20rpx; background: #fffdf8; }
.credential-title { color: #8b4a3e; font-size: 30rpx; font-weight: 800; }
.credential-row { display: flex; justify-content: space-between; gap: 14rpx; padding: 18rpx 0; border-bottom: 1rpx solid #f1e7d9; color: #665b50; font-size: 23rpx; }
.credential-proof { align-items:center; }
.cert-meta-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10rpx;
  margin-top: 18rpx;
}
.cert-meta-grid view {
  min-width: 0;
  padding: 14rpx 10rpx;
  border-radius: 14rpx;
  background: #f8efe2;
}
.cert-meta-grid text,
.cert-meta-grid strong {
  display: block;
}
.cert-meta-grid text {
  color: #8f8172;
  font-size: 21rpx;
}
.cert-meta-grid strong {
  margin-top: 5rpx;
  color: #5b2f24;
  font-size: 22rpx;
  overflow-wrap: anywhere;
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
.download-btn[disabled] { opacity:.6; }
.certificate-actions { display:flex; justify-content:center; gap:14rpx; margin-top:22rpx; }
.certificate-actions .download-btn { margin:0; }
.verify-btn { width:140rpx; height:64rpx; margin:0; border:1rpx solid #214b4e; border-radius:8px; background:#fffdf8; color:#214b4e; font-size:25rpx; line-height:62rpx; }
.state-card { display:grid; gap:10rpx; margin-top:18rpx; padding:20rpx 22rpx; border-radius:8px; background:#fff; color:#667085; font-size:24rpx; line-height:1.55; }
.state-card.error-state { border:1rpx solid #fecaca; background:#fff7f7; color:#b91c1c; }
.state-card.warning-state { border:1rpx solid #fed7aa; background:#fffaf0; color:#9a3412; }
.state-retry { width:max-content; color:#C43D3D; font-weight:900; }
@media (min-width: 900px) { .user-subpage { max-width:760px; margin:0 auto; } }
</style>
