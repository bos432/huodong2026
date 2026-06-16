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
    <PageDecorationBlocks :sections="contentSections" />

    <view class="card page-head" :style="{ background: String(innerPageLayout.headerBackgroundColor || 'var(--card-bg, #fff)') }">
      <view class="title" :style="{ color: String(innerPageLayout.headerTextColor || '#111827') }">{{ innerPageConfig.title || "评价活动" }}</view>
      <view class="subtle" :style="{ color: String(innerPageLayout.headerSubtitleColor || '#667085') }">{{ innerPageConfig.subtitle || "你的反馈会帮助主办方持续改进活动体验。" }}</view>
    </view>
    <view class="card">
      <view class="label">评分</view>
      <slider :value="rating" :min="1" :max="5" :step="1" show-value @change="handleRatingChange" />
      <view class="stars">{{ '★'.repeat(rating) }}{{ '☆'.repeat(5 - rating) }}</view>
      <view class="label">评价内容</view>
      <textarea v-model="content" class="textarea" placeholder="说说这场活动给你的感受" />
    </view>
    <view class="button" @click="!submitting && submit()">{{ submitting ? '提交中...' : '提交评价' }}</view>

    <AppBottomNav v-if="showBottomNav" :section="bottomNavSection" current-path="/pages/user/review" />
  </view>
</template>

<style scoped>
.review-page.has-custom-nav { padding-bottom: 160rpx; }
.page-head .title { margin-bottom: 12rpx; }
.label { margin: 20rpx 0 12rpx; font-size: 28rpx; font-weight: 650; }
.stars { color: #f59e0b; font-size: 36rpx; margin: 8rpx 0 22rpx; }
</style>
