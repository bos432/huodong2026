<template>
  <view class="container user-subpage has-custom-nav">
    <view class="custom-nav">
      <view class="nav-back" @click="goBack">‹ 返回</view>
      <text class="nav-title">学习记录</text>
      <view class="nav-placeholder"></view>
    </view>
    <view class="page-hero">
      <view class="hero-kicker">学习足迹</view>
      <view class="hero-title">每一次进步都算数</view>
      <view class="hero-desc">查看最近课程进度和最后学习时间。</view>
    </view>
    <view v-for="r in records" :key="r.id" class="record-card">
      <view class="record-row">
        <view class="record-icon"><text>{{ r.icon }}</text></view>
        <view class="record-info">
          <text class="record-title">{{ r.title }}</text>
          <text class="record-time">{{ r.time }}</text>
          <view class="progress-bar"><view class="progress-fill" :style="{width:r.progress+'%'}"></view></view>
          <text class="record-progress">进度 {{ r.progress }}%</text>
        </view>
      </view>
    </view>
    <view v-if="!loading && !records.length" class="empty-card">
      <view class="empty-icon">时</view>
      <view class="empty-title">暂无学习记录</view>
      <view class="empty-desc">完成一次课程学习后，进度会在这里展示。</view>
    </view>
    <TabBar current="courses" />
  </view>
</template>
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ensureUser, request } from "../../api";
import TabBar from "../../components/TabBar.vue";

const loading = ref(true);
const records = ref<any[]>([]);

function formatTime(value?: string) {
  if (!value) return "暂无学习时间";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

async function loadRecords() {
  loading.value = true;
  try {
    await ensureUser();
    const rows = await request<any[]>("/public/me/courses");
    records.value = (Array.isArray(rows) ? rows : []).map((course) => ({
      id: course.learning?.id || course.id,
      title: course.title || "未命名课程",
      icon: "📚",
      time: formatTime(course.learning?.updatedAt),
      progress: Number(course.learning?.progress || 0)
    }));
  } catch {
    records.value = [];
  } finally {
    loading.value = false;
  }
}

function goBack() { uni.navigateBack(); }
onMounted(loadRecords);
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

.record-card {
  margin-top: 18rpx;
  padding: 22rpx;
  border: 1rpx solid rgba(199, 181, 157, 0.58);
  border-radius: 24rpx;
  background: rgba(255, 252, 246, 0.96);
  box-shadow: 0 12rpx 34rpx rgba(72, 55, 38, 0.08);
}

.record-row {
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.record-icon {
  width: 112rpx;
  height: 88rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 18rpx;
  background: #f1e3d0;
}

.record-icon text {
  font-size: 36rpx;
}

.record-info {
  min-width: 0;
  flex: 1;
}

.record-title {
  display: block;
  color: #263d3c;
  font-size: 29rpx;
  font-weight: 800;
  line-height: 1.45;
}

.record-time,
.record-progress {
  display: block;
  margin-top: 6rpx;
  color: #8f8172;
  font-size: 24rpx;
}

.progress-bar {
  height: 10rpx;
  margin-top: 12rpx;
  overflow: hidden;
  border-radius: 999rpx;
  background: #e8dccb;
}

.progress-fill {
  height: 100%;
  border-radius: 999rpx;
  background: #b84435;
}

.empty-card {
  margin-top: 18rpx;
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
