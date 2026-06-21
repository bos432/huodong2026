<template>
  <view class="container user-subpage has-custom-nav">
    <view class="custom-nav">
      <view class="nav-back" @click="goBack">‹ 返回</view>
      <text class="nav-title">我的收藏</text>
      <view class="nav-placeholder"></view>
    </view>
    <view class="page-hero">
      <view class="hero-kicker">收藏夹</view>
      <view class="hero-title">留住想学的内容</view>
      <view class="hero-desc">把感兴趣的课程先收藏，方便稍后继续了解。</view>
    </view>
    <view class="course-grid">
      <view v-for="c in favorites" :key="c.id" class="course-card" @click="goDetail(c)">
        <view class="course-cover" :style="{background:c.color}"><text class="course-icon">{{ c.icon }}</text></view>
        <view class="course-info">
          <text class="course-title">{{ c.title }}</text>
          <text class="course-teacher">by {{ c.teacher }}</text>
          <text class="course-price">{{ priceText(c.price) }}</text>
        </view>
      </view>
    </view>
    <view v-if="!favorites.length" class="empty-card">
      <view class="empty-icon">藏</view>
      <view class="empty-title">暂无收藏</view>
      <view class="empty-desc">遇到喜欢的课程时，点收藏后会出现在这里。</view>
    </view>
    <TabBar current="user" />
  </view>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ensureUser, request, withTenantCode } from "../../api";
import { normalizeCourse, priceText, type CourseCard } from "../../course-data";
import TabBar from "../../components/TabBar.vue";

const favorites = ref<CourseCard[]>([]);

async function loadFavorites() {
  try {
    await ensureUser();
    const rows = await request<any[]>("/public/me/favorite-courses");
    favorites.value = (Array.isArray(rows) ? rows : []).map(normalizeCourse);
  } catch {
    favorites.value = [];
  }
}

function goBack() { uni.navigateBack(); }
function goDetail(c:any) { uni.navigateTo({ url: withTenantCode("/pages/course/detail?id="+c.id) }); }

onMounted(loadFavorites);
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

.empty-card {
  margin-top: 22rpx;
  padding: 48rpx 28rpx;
  border: 1rpx solid rgba(199, 181, 157, 0.58);
  border-radius: 24rpx;
  background: rgba(255, 252, 246, 0.96);
  box-shadow: 0 12rpx 34rpx rgba(72, 55, 38, 0.08);
  text-align: center;
}

.empty-icon {
  width: 84rpx;
  height: 84rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  border-radius: 50%;
  background: #f1e3d0;
  color: #8b4a3e;
  font-size: 34rpx;
  font-weight: 800;
}

.empty-title {
  margin-top: 18rpx;
  color: #263d3c;
  font-size: 30rpx;
  font-weight: 800;
}

.empty-desc {
  margin-top: 8rpx;
  color: #8f8172;
  font-size: 24rpx;
  line-height: 1.6;
}
</style>
