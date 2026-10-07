<template>
  <view class="container user-subpage has-custom-nav">
    <view class="custom-nav">
      <view class="nav-back" role="button" tabindex="0" aria-label="返回" @click="goBack" @keyup.enter="goBack" @keyup.space.prevent="goBack">返回</view>
      <text class="nav-title">我的收藏</text>
      <view class="nav-placeholder"></view>
    </view>
    <view class="page-hero">
      <view class="hero-kicker">收藏夹</view>
      <view class="hero-title">留住想看的内容</view>
      <view class="hero-desc">把感兴趣的内容先收藏，方便稍后继续了解。</view>
    </view>
    <LoadingState v-if="loading" title="正在加载收藏" description="请稍候，正在同步你收藏的内容。" />
    <EmptyState v-else-if="loadError" variant="error" :description="loadError" action-text="重新加载" @action="loadFavorites" />
    <view v-else-if="favorites.length" class="course-grid">
      <view v-for="c in favorites" :key="c.id" class="course-card" role="button" tabindex="0" :aria-label="`查看收藏内容${c.title}`" @click="goDetail(c)" @keyup.enter="goDetail(c)" @keyup.space.prevent="goDetail(c)">
        <view class="course-cover" :style="{background:c.color}"><text class="course-icon">{{ c.icon }}</text></view>
        <view class="course-info">
          <text class="course-title">{{ c.title }}</text>
          <text class="course-teacher">by {{ c.teacher }}</text>
          <text class="course-price">{{ priceText(c.price) }}</text>
        </view>
      </view>
    </view>
    <EmptyState v-else variant="default" title="暂无收藏" description="遇到喜欢的内容时，点收藏后会出现在这里。" action-text="去发现内容" @action="goDiscover" />
    <TabBar current="user" />
  </view>
</template>
<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, request, withTenantCode } from "../../api";
import { normalizeCourse, priceText, type CourseCard } from "../../course-data";
import { guardCurrentPageFeature, loadFeatureGates } from "../../feature-gates";
import { reviewSafeText } from "../../review-safe-text";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import TabBar from "../../components/TabBar.vue";
import EmptyState from "../../components/EmptyState.vue";
import LoadingState from "../../components/LoadingState.vue";
import type { PublicCourseSummary } from "@activity/shared";

const favorites = ref<CourseCard[]>([]);
const loading = ref(false);
const loadError = ref("");
const loadGuard = createTenantLoadGuard();

async function loadFavorites() {
  const token = loadGuard.begin();
  loading.value = true;
  loadError.value = "";
  favorites.value = [];
  try {
    await ensureUser();
    const rows = await request<PublicCourseSummary[]>("/public/me/favorite-courses");
    if (loadGuard.isCurrent(token)) favorites.value = (Array.isArray(rows) ? rows : []).map(normalizeCourse);
  } catch (error: any) {
    if (loadGuard.isCurrent(token)) loadError.value = reviewSafeText(error?.message || "收藏内容加载失败");
  } finally {
    if (loadGuard.isCurrent(token)) loading.value = false;
  }
}

function goBack() { uni.navigateBack(); }
function goDetail(c:any) { uni.navigateTo({ url: withTenantCode("/pages/course/detail?id="+c.id) }); }
function goDiscover() { uni.navigateTo({ url: withTenantCode("/pages/courses/index") }); }

onShow(async () => {
  await loadFeatureGates(true);
  if (!guardCurrentPageFeature()) return;
  await loadFavorites();
});
</script>
<style scoped>
.user-subpage {
  min-height: 100vh;
  box-sizing:border-box;
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
  background:
    linear-gradient(180deg, #f7efe3 0%, #fbf7ef 40%, #f4eadc 100%);
}
.state-card { margin-top:22rpx; padding:34rpx; border:1rpx solid rgba(199,181,157,.58); border-radius:16rpx; background:#fff; text-align:center; line-height:1.6; }
.state-card .button { margin:20rpx auto 0; }
.error-state { color:#b42318; border-color:#f0b8b0; background:#fff4f2; }

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

.course-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18rpx;
  margin-top: 22rpx;
}

.course-card {
  overflow: hidden;
  border: 1rpx solid rgba(199, 181, 157, 0.58);
  border-radius: 22rpx;
  background: rgba(255, 252, 246, 0.96);
  box-shadow: 0 12rpx 34rpx rgba(72, 55, 38, 0.08);
}

.course-cover {
  height: 178rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.course-icon {
  font-size: 48rpx;
}

.course-info {
  padding: 18rpx;
}

.course-title {
  display: block;
  overflow: hidden;
  color: #263d3c;
  font-size: 26rpx;
  font-weight: 800;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course-teacher {
  display: block;
  margin-top: 8rpx;
  color: #8f8172;
  font-size: 22rpx;
}

.course-price {
  display: block;
  margin-top: 12rpx;
  color: #b84435;
  font-size: 28rpx;
  font-weight: 800;
}

@media (min-width: 900px) {
  .user-subpage { max-width:760px; margin:0 auto; }
}
</style>
