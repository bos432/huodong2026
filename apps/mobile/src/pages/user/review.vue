<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ensureUser, request } from "../../api";
import { usePageDecoration } from "../../decoration";
import TenantContextBadge from "../../components/TenantContextBadge.vue";
import AppBottomNav from "../../components/AppBottomNav.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";

const registrationId = ref(0);
const userId = ref(0);
const rating = ref(5);
const content = ref("");
const submitting = ref(false);
const { tenant, bottomNavSection, contentSections, innerPageConfig, innerPageLayout, showBottomNav, loadDecoration } = usePageDecoration("review_page", "/pages/user/review");
function handleRatingChange(event: any) {
  rating.value = Number(event.detail?.value || 1);
}
async function submit() {
  if (!content.value.trim()) { uni.showToast({ title: "请填写评价内容", icon: "none" }); return; }
  submitting.value = true;
  try {
    await request(`/public/registrations/${registrationId.value}/review`, { method: "POST", data: { rating: rating.value, content: content.value } });
    uni.showToast({ title: "评价已提交", icon: "success" });
    setTimeout(() => uni.navigateBack(), 800);
  } catch (error: any) {
    uni.showToast({ title: error.message, icon: "none" });
  } finally { submitting.value = false; }
}
onMounted(async () => {
  userId.value = await ensureUser();
  const pages = getCurrentPages();
  registrationId.value = Number((pages[pages.length - 1] as any).options.id);
  loadDecoration();
});
</script>

<template>
  <view class="container review-page" :class="{ 'has-custom-nav': showBottomNav }">
    <TenantContextBadge :tenant="tenant" label="当前城市" hint="评价归属" />

    <view class="review-hero" :style="{ background: String(innerPageLayout.headerBackgroundColor || '#4a6b8a') }">
      <view class="hero-mark">评</view>
      <view class="hero-copy">
        <view class="title" :style="{ color: String(innerPageLayout.headerTextColor || '#fff8f0') }">{{ innerPageConfig.title || "评价活动" }}</view>
        <view class="subtle" :style="{ color: String(innerPageLayout.headerSubtitleColor || 'rgba(255,248,240,0.82)') }">{{ innerPageConfig.subtitle || "你的反馈会帮助主办方持续改进活动体验。" }}</view>
      </view>
    </view>

    <PageDecorationBlocks :sections="contentSections" />

    <view class="card review-card">
      <view class="card-kicker">活动反馈</view>
      <view class="label">评分</view>
      <slider :value="rating" :min="1" :max="5" :step="1" show-value @change="handleRatingChange" />
      <view class="stars">{{ '★'.repeat(rating) }}{{ '☆'.repeat(5 - rating) }}</view>
      <view class="label">评价内容</view>
      <textarea v-model="content" class="textarea" placeholder="说说这场活动给你的感受" />
    </view>
    <view class="button submit-button" @click="!submitting && submit()">{{ submitting ? '提交中...' : '提交评价' }}</view>

    <AppBottomNav v-if="showBottomNav" :section="bottomNavSection" current-path="/pages/user/review" />
  </view>
</template>

<style scoped>
.review-page.has-custom-nav { padding-bottom: 160rpx; }
.review-hero {
  position: relative;
  overflow: hidden;
  min-height: 300rpx;
  display: flex;
  align-items: flex-end;
  gap: 22rpx;
  margin-bottom: 20rpx;
  padding: 34rpx 28rpx;
  border-radius: 24rpx;
  box-shadow: 0 18rpx 44rpx rgba(91, 47, 36, 0.16);
}
.review-hero::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(34, 24, 19, 0.04), rgba(34, 24, 19, 0.24));
  pointer-events: none;
}
.hero-mark,
.hero-copy {
  position: relative;
  z-index: 1;
}
.hero-mark {
  flex: 0 0 auto;
  width: 96rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 28rpx;
  background: rgba(255, 248, 240, 0.16);
  color: #fff8f0;
  font-size: 38rpx;
  font-weight: 700;
  font-family: "STKaiti", "KaiTi", serif;
}
.hero-copy { min-width: 0; }
.title {
  font-size: 48rpx;
  line-height: 1.22;
  font-weight: 700;
  font-family: "STKaiti", "KaiTi", serif;
}
.subtle { margin-top: 12rpx; font-size: 25rpx; line-height: 1.6; }
.review-card { border-radius: 24rpx; box-shadow: 0 12rpx 34rpx rgba(91, 47, 36, 0.07); }
.card-kicker { color: #4a6b8a; font-size: 24rpx; font-weight: 800; margin-bottom: 8rpx; }
.label { margin: 20rpx 0 12rpx; font-size: 28rpx; font-weight: 650; color: #333333; }
.stars { color: #c43d3d; font-size: 38rpx; margin: 8rpx 0 22rpx; letter-spacing: 0; }
.textarea { min-height: 220rpx; }
.submit-button { margin-top: 20rpx; }
</style>
