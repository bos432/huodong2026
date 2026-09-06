<template>
  <view class="card-page">
    <view class="card-nav"><button class="nav-back" aria-label="返回上一页" @click="goBack">返回</button><text class="nav-title">{{ sharedUserId ? '同行名片' : '我的同行名片' }}</text><text class="nav-placeholder" /></view>
    <view v-if="loading" class="state" role="status" aria-live="polite">名片加载中…</view>
    <view v-else-if="error" class="state error" role="alert"><text>{{ error }}</text><button class="retry" @click="load">重新加载</button></view>
    <view v-else-if="!canPreview" class="state"><text class="state-title">资料审核通过后生成名片</text><button v-if="!sharedUserId" class="primary" @click="editProfile">去完善资料</button></view>
    <view v-else class="content">
      <view class="profile-poster app-enter">
        <view class="poster-brand"><text>慢π</text><text>同城同行档案</text></view>
        <view class="identity-row"><image v-if="profile.avatarUrl" class="avatar" :src="profile.avatarUrl" mode="aspectFill" /><view v-else class="avatar avatar-fallback">{{ firstLetter }}</view><view class="identity"><text class="name">{{ profile.displayName }}</text><text class="role">{{ [profile.roleTitle, profile.industry].filter(Boolean).join(" · ") || "慢π活动伙伴" }}</text></view></view>
        <view v-if="profile.city" class="city-line">所在城市 · {{ profile.city }}</view>
        <text class="introduction">{{ profile.introduction }}</text>
        <view class="resource-section"><text class="section-label">我能提供</text><view class="tags"><text v-for="item in profile.offers || []" :key="`offer-${item}`" class="tag offer">{{ item }}</text></view></view>
        <view class="resource-section"><text class="section-label">希望拓展</text><view class="tags"><text v-for="item in profile.needs || []" :key="`need-${item}`" class="tag need">{{ item }}</text></view></view>
        <view class="privacy-note">联系方式不公开 · 通过平台建立连接</view>
      </view>
      <view class="actions">
        <!-- #ifdef MP-WEIXIN -->
        <button v-if="canShare" class="primary app-press" open-type="share">分享名片</button>
        <!-- #endif -->
        <!-- #ifdef H5 -->
        <button v-if="canShare" class="primary app-press" @click="shareCard">复制名片链接</button>
        <!-- #endif -->
        <button v-if="profile?.mine" class="secondary app-press" @click="editProfile">编辑资料</button>
      </view>
      <text class="footnote">{{ canShare ? "名片只展示审核通过且已设置为公开的资料。" : "当前名片未公开，仅你自己可以预览。" }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onHide, onShareAppMessage, onShareTimeline, onShow } from "@dcloudio/uni-app";
import { ensureUser, request, withTenantCode } from "../../api";
import { defaultMiniProgramShare, defaultMiniProgramTimelineShare, showMiniProgramShareMenu } from "../../share";
import { guardCurrentPageFeature, loadFeatureGates } from "../../feature-gates";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { socialCardState } from "../../social-card-state";

const profile = ref<any>(null); const loading = ref(true); const error = ref(""); const sharedUserId = ref(0);
const loadGuard = createTenantLoadGuard();
const firstLetter = computed(() => String(profile.value?.displayName || "慢").slice(0, 1));
const cardState = computed(() => socialCardState(profile.value, sharedUserId.value));
const canPreview = computed(() => cardState.value.canPreview);
const canShare = computed(() => cardState.value.canShare && !loading.value && !error.value);
const shareOptions = { title: () => `${profile.value?.displayName || "慢π同行伙伴"}的同行名片`, path: () => `/pages/community/card?userId=${Number(profile.value?.userId || sharedUserId.value || 0)}` };
onShareAppMessage(() => defaultMiniProgramShare(canShare.value ? shareOptions : { path: '/pages/index/index' }));
onShareTimeline(() => defaultMiniProgramTimelineShare(canShare.value ? shareOptions : { path: '/pages/index/index' }));
onLoad((query) => { const id = Number(query?.userId || 0); sharedUserId.value = Number.isSafeInteger(id) && id > 0 ? id : query?.userId ? -1 : 0; });
onShow(load);
onHide(() => { loadGuard.invalidate(); profile.value = null; hideSharing(); });
function hideSharing() {
  // #ifdef MP-WEIXIN
  uni.hideShareMenu();
  // #endif
}
async function load() {
  const token = loadGuard.begin();
  loading.value = true; error.value = ''; profile.value = null; hideSharing();
  try {
    await loadFeatureGates(true);
    if (!loadGuard.isCurrent(token) || !guardCurrentPageFeature()) return;
    if (sharedUserId.value < 0) throw new Error('名片链接无效');
    if (!sharedUserId.value) await ensureUser();
    if (!loadGuard.isCurrent(token)) return;
    const result = await request(sharedUserId.value ? `/public/social/profiles/${sharedUserId.value}` : '/public/me/social-profile');
    if (loadGuard.isCurrent(token)) profile.value = result;
  } catch (e: any) { if (loadGuard.isCurrent(token)) error.value = e?.message || '名片加载失败'; }
  finally { if (loadGuard.isCurrent(token)) { loading.value = false; if (canShare.value) showMiniProgramShareMenu(); } }
}
function editProfile() { uni.navigateTo({ url: withTenantCode("/pages/community/social-profile") }); }
function shareCard() {
  if (!canShare.value) return;
  // #ifdef H5
  const url = new URL(window.location.href); url.hash = withTenantCode(shareOptions.path());
  uni.setClipboardData({ data: url.toString(), fail: () => uni.showToast({ title: '复制失败，请重试', icon: 'none' }) });
  // #endif
}
function goBack() { uni.navigateBack({ fail: () => uni.reLaunch({ url: withTenantCode('/pages/index/index') }) }); }
</script>

<style scoped>
.card-page{min-height:100vh;background:#edf7f1;color:#16252d;padding-bottom:48rpx;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}.card-nav{height:92rpx;display:grid;grid-template-columns:100rpx 1fr 100rpx;align-items:center;padding:0 28rpx;background:#fff}.nav-back{width:auto;min-height:64rpx;margin:0;padding:0;border:0;background:transparent;color:#08753f;font-size:26rpx;line-height:64rpx;text-align:left}.nav-back::after{border:0}.nav-title{text-align:center;font-size:30rpx;font-weight:900}.content{padding:28rpx}.profile-poster{padding:30rpx;border-radius:18rpx;background:#fff;box-shadow:0 14rpx 40rpx rgba(22,65,43,.09)}.poster-brand{display:flex;align-items:baseline;gap:12rpx;color:#08753f}.poster-brand text:first-child{font-size:42rpx;font-weight:950}.poster-brand text:last-child{color:#73907e;font-size:22rpx}.identity-row{display:flex;align-items:center;gap:18rpx;margin-top:32rpx}.avatar{width:106rpx;height:106rpx;border-radius:50%;background:#dff4e5}.avatar-fallback{display:grid;place-items:center;color:#08753f;font-size:40rpx;font-weight:900}.identity{min-width:0}.name,.role{display:block}.name{font-size:38rpx;font-weight:950}.role{margin-top:8rpx;color:#687b70;font-size:24rpx}.city-line{margin-top:24rpx;color:#08753f;font-size:24rpx;font-weight:800}.introduction{display:block;margin-top:24rpx;color:#34483d;font-size:27rpx;line-height:1.65}.resource-section{display:grid;grid-template-columns:130rpx 1fr;gap:12rpx;margin-top:24rpx}.section-label{padding-top:7rpx;color:#708178;font-size:23rpx}.tags{display:flex;flex-wrap:wrap;gap:10rpx}.tag{padding:8rpx 12rpx;border-radius:6rpx;font-size:22rpx}.tag.offer{background:#e7f8ed;color:#08753f}.tag.need{background:#fff1df;color:#9a5b05}.privacy-note{margin-top:30rpx;padding-top:20rpx;border-top:1rpx solid #e7eee9;color:#94a39a;font-size:21rpx;text-align:center}.actions{display:grid;gap:14rpx;margin-top:20rpx}.primary,.secondary{width:100%;min-height:82rpx;margin:0;border:0;border-radius:12rpx;font-size:27rpx;font-weight:900}.primary{background:#163d2a;color:#fff}.secondary{border:1rpx solid #b9d8c3;background:#fff;color:#08753f}.primary::after,.secondary::after,.retry::after{border:0}.footnote{display:block;margin-top:18rpx;color:#799087;font-size:21rpx;text-align:center}.state{display:grid;gap:14rpx;margin:28rpx;padding:34rpx;border-radius:12rpx;background:#fff;color:#718078;font-size:25rpx;text-align:center}.state.error{color:#b42318}.state-title{color:#26382e;font-size:29rpx;font-weight:900}.retry{width:auto;min-height:56rpx;margin:0;border:0;background:transparent;color:#08753f;font-size:25rpx;font-weight:900}.state .primary{width:240rpx;margin:8rpx auto 0;padding:0 20rpx}@media(min-width:900px){.card-page{max-width:760px;margin:0 auto}}
</style>
