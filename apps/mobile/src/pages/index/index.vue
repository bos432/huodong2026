<template>
  <view class="container has-custom-nav">
    <TenantSwitcher :tenant="tenant" title="当前城市" @changed="handleTenantChanged" />

    <!-- 顶部导航 -->
    <view class="header-row">
      <view class="brand-title">
        <image v-if="pageBrand.logoUrl" class="brand-logo" :src="pageBrand.logoUrl" mode="aspectFit" />
        <text class="title-xxl" style="font-family: 'STKaiti', 'KaiTi', serif;">{{ pageBrand.name }}</text>
      </view>
      <view class="search-btn" @click="goSearch">
        <text style="font-size:44rpx;">🔍</text>
      </view>
    </view>

    <PageDecorationBlocks :sections="contentSections" />
    <AdSlotRenderer slot-key="home_top_banner" page-key="home" />

    <!-- 限时体验 -->
    <view class="section-with-title">
      <view class="row">
        <text class="title-md">🔥 限时体验</text>
        <text class="subtle" style="color:#C43D3D;" @click="goAllCourses">查看全部 &gt;</text>
      </view>
      <scroll-view class="scroll-x" scroll-x :show-scrollbar="false" style="margin-top:16rpx;">
        <view v-for="(course, idx) in trialCourses" :key="idx" class="course-card-h" @click="goCourse(course)">
          <view class="course-cover" :style="{ background: course.color }">
            <image v-if="course.coverUrl" class="course-cover-img" :src="course.coverUrl" mode="aspectFill" />
            <text v-else style="font-size:48rpx;">{{ course.icon }}</text>
          </view>
          <text class="course-title">{{ course.title }}</text>
          <text class="course-teacher">by {{ course.teacher }}</text>
          <view class="row" style="justify-content:flex-start;">
            <text class="price" style="font-size:28rpx;">{{ priceText(course.price) }}</text>
            <text class="price-original" style="margin-left:8rpx;" v-if="Number(course.originalPrice) > 0">{{ priceText(course.originalPrice) }}</text>
          </view>
        </view>
      </scroll-view>
      <EmptyState v-if="!trialCourses.length" icon="📚" text="暂无体验内容，请先在后台发布内容" />
    </view>

    <!-- 热门内容 -->
    <view class="section-with-title" style="margin-top:24rpx;">
      <view class="row">
        <text class="title-md">📚 热门内容</text>
        <text class="subtle" style="color:#C43D3D;" @click="goAllCourses">查看全部 &gt;</text>
      </view>
      <scroll-view class="scroll-x" scroll-x :show-scrollbar="false" style="margin-top:16rpx;">
        <view v-for="(course, idx) in hotCourses" :key="idx" class="course-card-h" @click="goCourse(course)">
          <view class="course-cover" :style="{ background: course.color }">
            <image v-if="course.coverUrl" class="course-cover-img" :src="course.coverUrl" mode="aspectFill" />
            <text v-else style="font-size:48rpx;">{{ course.icon }}</text>
          </view>
          <text class="course-title">{{ course.title }}</text>
          <text class="course-teacher">by {{ course.teacher }}</text>
          <text class="price" style="font-size:28rpx;">{{ priceText(course.price) }}</text>
        </view>
      </scroll-view>
      <EmptyState v-if="!hotCourses.length" icon="📖" text="暂无热门内容，请先在后台发布内容" />
    </view>

    <AdSlotRenderer slot-key="home_feed_inline" page-key="home" compact />

    <!-- 共修动态 -->
    <view class="section-with-title" style="margin-top:24rpx;">
      <text class="title-md">📖 共修动态</text>
    </view>
    <view v-for="(post, idx) in posts" :key="idx" class="card post-card" @click="goPost(post)">
      <view class="row" style="justify-content:flex-start; gap:16rpx;">
        <image class="avatar-sm" :src="post.avatar" mode="aspectFill" />
        <view>
          <text class="body-text" style="font-weight:600;">{{ post.nickname }}</text>
          <text class="subtle" style="display:block;">{{ post.time }}</text>
        </view>
      </view>
      <text class="body-text" style="margin-top:12rpx; white-space:pre-line; display:block;">{{ post.content }}</text>
      <view v-if="post.images" class="post-images">
        <image v-for="(img, i) in post.images" :key="i" class="post-image" :src="img" mode="aspectFill" />
      </view>
      <view class="row" style="margin-top:12rpx; justify-content:flex-start; gap:24rpx;">
        <view class="interact-btn" @click.stop="toggleLike(post)">
          <text>{{ post.liked ? "❤️" : "🤍" }}</text>
          <text class="subtle">{{ post.likes }}</text>
        </view>
        <view class="interact-btn" @click.stop="commentPost(post)">
          <text>💬</text>
          <text class="subtle">{{ post.comments }}</text>
        </view>
      </view>
    </view>
    <EmptyState v-if="!posts.length" icon="📝" text="暂无共修动态" />

    <!-- 底部安全区 -->
    <view style="height:120rpx;"></view>
    <TabBar current="index" />
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, getCurrentTenantCode, request, withTenantCode } from "../../api";
import { fetchPublishedCourses, priceText, type CourseCard } from "../../course-data";
import { loadPageTheme, pageBrand } from "../../theme";
import { resolveTenantByCurrentLocation } from "../../tenant-location";
import TabBar from "../../components/TabBar.vue";
import EmptyState from "../../components/EmptyState.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";
import TenantSwitcher from "../../components/TenantSwitcher.vue";
import AdSlotRenderer from "../../components/AdSlotRenderer.vue";
import { usePageDecoration } from "../../decoration";
import { normalizeCommunityPosts, type CommunityPost } from "../../community-posts";

const { tenant, contentSections, loadDecoration } = usePageDecoration("home", "/pages/index/index");
const lastLoadedTenantCode = ref("");

onShow(async () => {
  loadPageTheme();
  const beforeTenantCode = getCurrentTenantCode();
  await resolveTenantByCurrentLocation({ silent: true });
  const changedByLocation = getCurrentTenantCode() !== beforeTenantCode || getCurrentTenantCode() !== lastLoadedTenantCode.value;
  loadDecoration();
  loadCourses();
  loadPosts();
  lastLoadedTenantCode.value = getCurrentTenantCode();
  if (changedByLocation && beforeTenantCode) uni.showToast({ title: "已按当前位置切换慢π城市", icon: "none" });
});

const courses = ref<CourseCard[]>([]);
const trialCourses = computed(() => {
  const freeCourses = courses.value.filter((course) => Number(course.price) === 0);
  return (freeCourses.length ? freeCourses : courses.value).slice(0, 4);
});
const hotCourses = computed(() => [...courses.value].sort((a, b) => b.hot - a.hot).slice(0, 4));
const posts = reactive<CommunityPost[]>([]);

async function handleTenantChanged() {
  loadPageTheme();
  await Promise.all([loadDecoration(), loadCourses(), loadPosts()]);
  lastLoadedTenantCode.value = getCurrentTenantCode();
}

async function loadCourses() {
  try {
    courses.value = await fetchPublishedCourses();
  } catch {
    courses.value = [];
  }
}

async function loadPosts() {
  try {
    const result = await request<any>("/public/community/posts");
    posts.splice(0, posts.length, ...normalizeCommunityPosts(result).slice(0, 2));
  } catch {
    posts.splice(0, posts.length);
  }
}

function goSearch() { uni.navigateTo({ url:"/pages/search/index" }); }
function goCourse(c: any) { uni.navigateTo({ url: withTenantCode(`/pages/course/detail?id=${c.id}`) }); }
function goAllCourses() { uni.reLaunch({ url:"/pages/courses/index" }); }
function goPost(p: any) { uni.navigateTo({ url:`/pages/community/detail?id=${p.id || 1}` }); }
async function toggleLike(post: CommunityPost) {
  try {
    await ensureUser();
    const result = await request<any>(`/public/community/posts/${post.id}/like`, { method: "POST" });
    post.liked = Boolean(result?.liked);
    post.likes = Number(result?.likes || 0);
    uni.showToast({ title: post.liked ? "已点赞" : "已取消点赞", icon: "none" });
  } catch (error: any) {
    uni.showToast({ title: error.message || "操作失败", icon: "none" });
  }
}
function commentPost(post: CommunityPost) {
  uni.showModal({
    title: "评论动态",
    editable: true,
    placeholderText: "写下你的想法",
    confirmText: "发布",
    success: (res: any) => {
      if (!res.confirm) return;
      const content = String(res.content || "").trim();
      if (!content) {
        uni.showToast({ title: "请输入评论内容", icon: "none" });
        return;
      }
      submitComment(post, content);
    }
  });
}
async function submitComment(post: CommunityPost, content: string) {
  try {
    await ensureUser();
    const result = await request<any>(`/public/community/posts/${post.id}/comments`, { method: "POST", data: { content } });
    uni.showToast({ title: result?.message || "评论已提交审核", icon: "none" });
  } catch (error: any) {
    uni.showToast({ title: error.message || "评论失败", icon: "none" });
  }
}
</script>

<style scoped>
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0 16rpx;
}
.brand-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.brand-logo {
  width: 58rpx;
  height: 58rpx;
  border-radius: 16rpx;
  background: rgba(255,255,255,0.68);
}
.search-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(74,107,138,0.08);
  border-radius: 20rpx;
}
.section-with-title { margin-top: 8rpx; }
.course-card-h {
  display: inline-block;
  width: 300rpx;
  margin-right: 20rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 16rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04);
}
.course-cover {
  width: 100%;
  height: 170rpx;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12rpx;
  overflow: hidden;
}
.course-cover-img { width: 100%; height: 100%; display: block; }
.course-title { font-size: 28rpx; font-weight: 600; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
.course-teacher { font-size: 24rpx; color: #999; margin-top: 4rpx; display: block; }
.post-card { margin-top: 8rpx; }
.interact-btn { display: flex; align-items: center; gap: 8rpx; }
.post-images { display: flex; gap: 8rpx; margin-top: 12rpx; flex-wrap: wrap; }
.post-image { width: 200rpx; height: 200rpx; border-radius: 12rpx; background: #E8E0D8; }
</style>
