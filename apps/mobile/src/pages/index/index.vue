<template>
  <view class="container has-custom-nav">
    <!-- 顶部导航 -->
    <view class="header-row">
      <text class="title-xxl" style="font-family: 'STKaiti', 'KaiTi', serif;">七维书院</text>
      <view class="search-btn" @click="goSearch">
        <text style="font-size:44rpx;">🔍</text>
      </view>
    </view>

    <!-- 金刚区 2x4 -->
    <view class="card" style="padding:16rpx 8rpx;">
      <view class="grid-2x4">
        <view v-for="item in jingang" :key="item.label" class="grid-item" @click="goCategory(item)">
          <view class="grid-icon">{{ item.icon }}</view>
          <text class="grid-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- Banner 轮播 -->
    <scroll-view class="banner-wrap" scroll-x :show-scrollbar="false">
      <view v-for="(banner, idx) in banners" :key="idx" class="banner-item" @click="goBanner(banner)">
        <view class="banner-inner" :style="{ background: banner.bg }">
          <text class="banner-title">{{ banner.title }}</text>
          <text class="banner-sub">{{ banner.sub }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 限时体验课 -->
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
    </view>

    <!-- 热门好课 -->
    <view class="section-with-title" style="margin-top:24rpx;">
      <view class="row">
        <text class="title-md">📚 热门好课</text>
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
    </view>

    <!-- 文化大使入口 -->
    <view class="ambassador-card" @click="goAmbassador">
      <view class="ambassador-content">
        <text style="font-size:32rpx; color:#fff; font-weight:600;">🏮 加入文化大使</text>
        <text style="font-size:24rpx; color:rgba(255,255,255,0.8); margin-top:8rpx;">和七维书院一起，让热爱发光</text>
      </view>
      <view class="ambassador-arrow">
        <text style="color:#fff; font-size:28rpx;">立即申请 &gt;</text>
      </view>
    </view>

    <!-- 书院动态 -->
    <view class="section-with-title" style="margin-top:24rpx;">
      <text class="title-md">📖 书院动态</text>
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

    <!-- 底部安全区 -->
    <view style="height:120rpx;"></view>
    <TabBar current="index" />
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { withTenantCode } from "../../api";
import { fetchPublishedCourses, priceText, type CourseCard } from "../../course-data";
import { loadPageTheme } from "../../theme";
import TabBar from "../../components/TabBar.vue";
import { addCommunityComment, defaultCommunityPosts, toggleCommunityLike, type CommunityPost } from "../../community-posts";

onShow(() => {
  loadPageTheme();
  loadCourses();
});

const jingang = [
  { icon: "🖌", label: "国学", category: "国学" },
  { icon: "☯", label: "玄学", category: "玄学" },
  { icon: "📜", label: "书法", category: "书法" },
  { icon: "📚", label: "教育", category: "教育" },
  { icon: "🌿", label: "健康", category: "健康" },
  { icon: "⛰", label: "创业", category: "创业" },
  { icon: "⚙", label: "技能", category: "技能" },
  { icon: "⋯", label: "更多", category: "" }
];

const banners = [
  { title: "寻找100位七维文化大使", sub: "一起用7把钥匙，打开中国人的精神家园", bg: "#C43D3D", link: "ambassador" },
  { title: "精选课程：七维书院好课", sub: "从基础到进阶，跟随老师系统学习", bg: "#4A6B8A", link: "course" },
  { title: "线上共修会报名中", sub: "与百位同修一起精进", bg: "#5B8C5A", link: "community" }
];

const courses = ref<CourseCard[]>([]);
const trialCourses = computed(() => {
  const freeCourses = courses.value.filter((course) => Number(course.price) === 0);
  return (freeCourses.length ? freeCourses : courses.value).slice(0, 4);
});
const hotCourses = computed(() => [...courses.value].sort((a, b) => b.hot - a.hot).slice(0, 4));
const posts = reactive<CommunityPost[]>(defaultCommunityPosts().slice(0, 2));

async function loadCourses() {
  try {
    courses.value = await fetchPublishedCourses();
  } catch {
    courses.value = [];
  }
}

function goSearch() { uni.navigateTo({ url:"/pages/search/index" }); }
function goCategory(item: any) { uni.navigateTo({ url:`/pages/courses/index?category=${item.category}` }); }
function goBanner(b: any) {
  if (b.link === "ambassador") uni.navigateTo({ url:"/pages/ambassador/index" });
  else if (b.link === "course") uni.navigateTo({ url: withTenantCode("/pages/course/detail?id=1") });
  else if (b.link === "community") uni.navigateTo({ url:"/pages/community/index" });
}
function goCourse(c: any) { uni.navigateTo({ url: withTenantCode(`/pages/course/detail?id=${c.id}`) }); }
function goAllCourses() { uni.reLaunch({ url:"/pages/courses/index" }); }
function goAmbassador() { uni.navigateTo({ url:"/pages/ambassador/index" }); }
function goPost(p: any) { uni.navigateTo({ url:`/pages/community/detail?id=${p.id || 1}` }); }
function toggleLike(post: CommunityPost) {
  toggleCommunityLike(post);
  uni.showToast({ title: post.liked ? "已收藏动态" : "已取消收藏", icon: "none" });
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
      addCommunityComment(post);
      uni.showToast({ title: "评论已发布", icon: "success" });
    }
  });
}
</script>

<style scoped>
.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0 16rpx;
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
.banner-wrap {
  margin: 16rpx 0;
  white-space: nowrap;
  overflow-x: auto;
}
.banner-wrap::-webkit-scrollbar { display:none; }
.banner-item {
  display: inline-block;
  width: calc(100vw - 64rpx);
  margin-right: 24rpx;
  border-radius: 20rpx;
  overflow: hidden;
}
.banner-inner {
  height: 360rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 40rpx;
  border-radius: 20rpx;
}
.banner-title {
  font-size: 40rpx; font-weight: 700;
  color: #fff; text-align: center;
  font-family: 'STKaiti','KaiTi',serif;
}
.banner-sub {
  font-size: 26rpx; color: rgba(255,255,255,0.85);
  margin-top: 16rpx; text-align: center;
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
.ambassador-card {
  margin-top: 24rpx;
  background: linear-gradient(135deg, #C43D3D, #A52A2A);
  border-radius: 20rpx;
  padding: 32rpx 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ambassador-content { flex:1; }
.ambassador-arrow { margin-left: 16rpx; }
.post-card { margin-top: 8rpx; }
.interact-btn { display: flex; align-items: center; gap: 8rpx; }
.post-images { display: flex; gap: 8rpx; margin-top: 12rpx; flex-wrap: wrap; }
.post-image { width: 200rpx; height: 200rpx; border-radius: 12rpx; background: #E8E0D8; }
</style>
