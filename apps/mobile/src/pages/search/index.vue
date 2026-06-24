<template>
  <view class="container search-page">
    <view class="search-bar">
      <view class="search-input-wrap">
        <text class="search-icon">搜</text>
        <input class="search-input" v-model="keyword" placeholder="搜索课程、讲师..." confirm-type="search" @confirm="doSearch" />
      </view>
      <text class="search-cancel" @click="goBack">取消</text>
    </view>

    <view v-if="!keyword">
      <view class="search-hero">
        <view class="hero-kicker">慢π搜索</view>
        <view class="hero-title">找到想学的课程</view>
        <view class="hero-desc">可以按课程名称、讲师或分类快速筛选。</view>
      </view>

      <view class="section-title"><text class="title-md">热门搜索</text></view>
      <view class="tags-cloud">
        <text v-for="tag in hotTags" :key="tag" class="tag tag-secondary search-tag" @click="keyword=tag">{{ tag }}</text>
      </view>
      <view class="section-title history-title"><text class="title-md">搜索历史</text></view>
      <view class="tags-cloud">
        <text v-for="(h, i) in history" :key="i" class="tag history-tag" @click="keyword=h">{{ h }}</text>
      </view>
      <text v-if="history.length" class="clear-history" @click="history=[]">清空搜索历史</text>
    </view>

    <view v-else>
      <text class="result-summary">搜索 "{{ keyword }}" 共 {{ results.length }} 个结果</text>
      <view v-for="(r, i) in results" :key="i" class="search-result-item" @click="goCourse(r)">
        <view class="result-row">
          <view class="result-cover" :style="{ background: r.color }">
            <text class="result-icon">{{ r.icon }}</text>
          </view>
          <view class="result-info">
            <text class="result-title">{{ r.title }}</text>
            <text class="result-teacher">by {{ r.teacher }}</text>
            <text class="result-price">{{ priceText(r.price) }}</text>
          </view>
        </view>
      </view>
      <view v-if="!results.length" class="empty-search">没有找到匹配课程，换个关键词试试。</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { withTenantCode } from "../../api";
import { fetchPublishedCourses, priceText, type CourseCard } from "../../course-data";

const keyword = ref("");
const history = ref(["国学","书法","论语"]);
const allCourses = ref<CourseCard[]>([]);
const hotTags = computed(() => {
  const tags = allCourses.value.flatMap((course) => [course.title, course.teacher, course.category]).filter(Boolean);
  return Array.from(new Set(tags)).slice(0, 8);
});
const results = computed(() => {
  const word = keyword.value.trim().toLowerCase();
  if (!word) return [];
  return allCourses.value.filter((course) =>
    course.title.toLowerCase().includes(word) ||
    course.teacher.toLowerCase().includes(word) ||
    course.category.toLowerCase().includes(word)
  );
});

async function loadCourses() {
  try {
    allCourses.value = await fetchPublishedCourses();
  } catch {
    allCourses.value = [];
  }
}

function doSearch() { if (keyword.value && !history.value.includes(keyword.value)) history.value.unshift(keyword.value); }
function goBack() { uni.navigateBack(); }
function goCourse(r:any) { uni.navigateTo({ url: withTenantCode("/pages/course/detail?id="+r.id) }); }

onMounted(loadCourses);
</script>
<style scoped>
.search-page {
  min-height: 100vh;
  background:
    linear-gradient(180deg, #f7efe3 0%, #fbf7ef 40%, #f4eadc 100%);
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 18rpx 0 22rpx;
}

.search-input-wrap {
  flex: 1;
  height: 82rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  border: 1rpx solid rgba(199, 181, 157, 0.58);
  border-radius: 999rpx;
  background: rgba(255, 252, 246, 0.96);
  box-shadow: 0 10rpx 26rpx rgba(72, 55, 38, 0.06);
}

.search-icon {
  width: 42rpx;
  height: 42rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12rpx;
  border-radius: 50%;
  background: #f1e3d0;
  color: #8b4a3e;
  font-size: 20rpx;
  font-weight: 800;
}

.search-input {
  flex: 1;
  height: 80rpx;
  color: #263d3c;
  font-size: 28rpx;
}

.search-cancel {
  color: #4a6b8a;
  font-size: 28rpx;
}

.search-hero {
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

.section-title {
  margin: 28rpx 0 16rpx;
  color: #263d3c;
}

.history-title {
  margin-top: 34rpx;
}

.tags-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.search-tag,
.history-tag {
  margin: 0;
  padding: 13rpx 20rpx;
  border-radius: 999rpx;
  font-size: 24rpx;
}

.history-tag {
  background: #f1e3d0;
  color: #6e6258;
}

.clear-history {
  display: block;
  margin-top: 26rpx;
  color: #8f8172;
  font-size: 24rpx;
  text-align: center;
}

.result-summary {
  display: block;
  margin: 8rpx 0 18rpx;
  color: #7f7467;
  font-size: 25rpx;
}

.search-result-item {
  margin-bottom: 16rpx;
  padding: 22rpx;
  border: 1rpx solid rgba(199, 181, 157, 0.58);
  border-radius: 24rpx;
  background: rgba(255, 252, 246, 0.96);
  box-shadow: 0 12rpx 34rpx rgba(72, 55, 38, 0.08);
}

.result-row {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.result-cover {
  width: 164rpx;
  height: 106rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 18rpx;
}

.result-icon {
  font-size: 40rpx;
}

.result-info {
  min-width: 0;
  flex: 1;
}

.result-title {
  display: block;
  color: #263d3c;
  font-size: 29rpx;
  font-weight: 800;
  line-height: 1.45;
}

.result-teacher {
  display: block;
  margin-top: 8rpx;
  color: #8f8172;
  font-size: 24rpx;
}

.result-price {
  display: block;
  margin-top: 12rpx;
  color: #b84435;
  font-size: 28rpx;
  font-weight: 800;
}

.empty-search {
  margin-top: 20rpx;
  padding: 46rpx 24rpx;
  border: 1rpx solid rgba(199, 181, 157, 0.48);
  border-radius: 24rpx;
  background: rgba(255, 252, 246, 0.9);
  color: #8f8172;
  font-size: 25rpx;
  text-align: center;
}
</style>
