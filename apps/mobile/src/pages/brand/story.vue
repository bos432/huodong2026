<template>
  <view class="story-page">
    <view class="hero">
      <text class="eyebrow">{{ config.eyebrow }}</text>
      <text class="title">{{ config.title }}</text>
      <text class="copy">{{ config.copy }}</text>
      <view class="actions">
        <button class="primary" @click="goDean">{{ config.primaryActionText }}</button>
        <button class="ghost" @click="goAid">{{ config.secondaryActionText }}</button>
      </view>
    </view>

    <PageDecorationBlocks :sections="decorationSections" />

    <view class="section">
      <text class="section-title">{{ config.sectionTitle }}</text>
      <view v-for="item in parsedBeliefs" :key="item.title" class="belief-card">
        <text class="belief-title">{{ item.title }}</text>
        <text class="belief-copy">{{ item.copy }}</text>
      </view>
    </view>

    <view class="section warm">
      <text class="section-title">{{ config.flowTitle }}</text>
      <view class="flow">
        <view v-for="item in config.flowItems" :key="item" class="flow-item">{{ item }}</view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">{{ config.joinTitle }}</text>
      <view class="join-grid">
        <view class="join-card" @click="goDean">院长招募</view>
        <view class="join-card" @click="goAmbassador">大使申请</view>
        <view class="join-card" @click="goAid">帮扶申请</view>
      </view>
    </view>

    <AppBottomNav v-if="showBottomNav" :section="bottomNavSection" current-path="/pages/brand/story" />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { getCurrentTenantCode, withTenantCode } from "../../api";
import { useEntryPageConfig } from "../../entry-pages";
import { usePageDecoration } from "../../decoration";
import { loadPageTheme } from "../../theme";
import AppBottomNav from "../../components/AppBottomNav.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";

const { config, load } = useEntryPageConfig("brandStory");
const { bottomNavSection, contentSections, showBottomNav, loadDecoration } = usePageDecoration("brand_story", "/pages/brand/story");
const mounted = ref(false);
const lastLoadedTenantCode = ref("");
const decorationSections = computed(() => contentSections.value.filter((section) => {
  if (section.type === "hero" && section.title === "品牌故事") return false;
  if (section.type === "rich_text" && section.title === "页面说明") return false;
  return true;
}));

const parsedBeliefs = computed(() => config.items.map((item) => {
  const [title, ...copy] = String(item).split(/[：:]/);
  return { title: title || item, copy: copy.join("：") || item };
}));

function goDean() { uni.navigateTo({ url: withTenantCode("/pages/recruit/dean") }); }
function goAmbassador() { uni.navigateTo({ url: withTenantCode("/pages/apply/ambassador") }); }
function goAid() { uni.navigateTo({ url: withTenantCode("/pages/apply/aid") }); }

async function refreshTenantScopedPage() {
  lastLoadedTenantCode.value = getCurrentTenantCode();
  await Promise.all([load(), loadDecoration()]);
}

onLoad(() => {
  refreshTenantScopedPage();
});

onMounted(() => {
  mounted.value = true;
  refreshTenantScopedPage();
});

onShow(() => {
  if (!mounted.value) return;
  if (getCurrentTenantCode() === lastLoadedTenantCode.value) return;
  loadPageTheme();
  refreshTenantScopedPage();
});
</script>

<style scoped>
.story-page { min-height: 100vh; padding: 28rpx 24rpx 150rpx; background: #f7f0e5; color: #2d241c; }
.hero { padding: 44rpx 34rpx; border-radius: 28rpx; background: radial-gradient(circle at 80% 12%, rgba(216,162,74,0.34), transparent 34%), linear-gradient(135deg, #4b2d22, #8b5a2b); color: #fff8e8; box-shadow: 0 24rpx 60rpx rgba(91,47,36,0.22); }
.eyebrow { font-size: 24rpx; color: #f7d58f; font-weight: 900; }
.title { display: block; margin-top: 18rpx; font-size: 46rpx; line-height: 1.22; font-weight: 950; }
.copy { display: block; margin-top: 18rpx; color: rgba(255,248,232,0.86); font-size: 28rpx; line-height: 1.6; }
.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; margin-top: 30rpx; }
.primary, .ghost { height: 78rpx; border-radius: 999px; font-size: 26rpx; font-weight: 900; }
.primary { background: #fff8e8; color: #5b2f24; }
.ghost { background: rgba(255,255,255,0.14); color: #fff8e8; border: 1px solid rgba(255,255,255,0.24); }
.section { margin-top: 26rpx; padding: 28rpx; border-radius: 24rpx; background: #fff; box-shadow: 0 14rpx 36rpx rgba(91,47,36,0.07); }
.section.warm { background: #fff8ed; }
.section-title { display: block; margin-bottom: 18rpx; color: #5b2f24; font-size: 32rpx; font-weight: 950; }
.belief-card { padding: 22rpx 0; border-top: 1px solid #f0e2d0; }
.belief-card:first-of-type { border-top: 0; }
.belief-title { display: block; color: #2d241c; font-size: 29rpx; font-weight: 900; }
.belief-copy { display: block; margin-top: 8rpx; color: #75685d; font-size: 25rpx; line-height: 1.58; }
.flow { display: flex; flex-wrap: wrap; gap: 14rpx; }
.flow-item { padding: 14rpx 20rpx; border-radius: 999px; background: #fff; color: #8b5a2b; font-size: 25rpx; font-weight: 900; border: 1px solid #efd9bd; }
.join-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14rpx; }
.join-card { min-height: 112rpx; display: flex; align-items: center; justify-content: center; border-radius: 18rpx; background: #fff7ec; color: #8b5a2b; font-size: 26rpx; font-weight: 900; }
</style>
