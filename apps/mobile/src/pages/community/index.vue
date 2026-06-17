<template>
  <view class="container has-custom-nav">
    <view class="page-header">
      <text class="title-lg">共修</text>
    </view>

    <!-- 文化大使入口 -->
    <view class="ambassador-card" @click="goAmbassador">
      <text style="font-size:30rpx; color:#fff; font-weight:600;">🏮 加入文化大使计划</text>
      <text style="font-size:24rpx; color:rgba(255,255,255,0.8); margin-top:6rpx;">让热爱发光 &gt;</text>
    </view>

    <!-- 近期活动 -->
    <view class="section-title"><text class="title-md">📅 近期活动</text></view>
    <view v-for="(act, idx) in activities" :key="idx" class="activity-card" @click="goActivity(act)">
      <view class="activity-date-block">
        <text class="date-month">{{ act.month }}</text>
        <text class="date-day">{{ act.day }}</text>
      </view>
      <view class="activity-info">
        <text class="activity-name">{{ act.title }}</text>
        <text class="activity-meta">🕐 {{ act.time }}</text>
        <text class="activity-meta">📍 {{ act.location }}</text>
        <view class="row" style="justify-content:flex-start; margin-top:8rpx;">
          <text class="subtle">已报名 {{ act.registered }} 人</text>
          <view class="button sm secondary" style="margin-left:auto;">了解详情</view>
        </view>
      </view>
    </view>
    <EmptyState v-if="!activities.length" icon="📅" text="暂无近期活动" />

    <!-- 今日打卡 -->
    <view class="card checkin-card">
      <text class="title-md">📝 今日打卡</text>
      <text class="body-text" style="margin-top:12rpx;">{{ checkinTask ? `今日任务：${checkinTask.title}` : "暂无今日打卡任务" }}</text>
      <text v-if="!checkinTask" class="subtle" style="margin-top:8rpx;">请在后台新增今天日期的打卡任务，发布后这里会自动显示。</text>
      <text v-if="checkinTask?.description" class="subtle" style="margin-top:8rpx;">{{ checkinTask.description }}</text>
      <view v-if="checkinTask" class="progress-bar" style="margin-top:12rpx;">
        <view class="progress-fill" :style="{ width: checkinProgress + '%' }"></view>
      </view>
      <text v-if="checkinTask" class="subtle" style="margin-top:8rpx;">今日已有 {{ checkinTask.completedCount || 0 }} 人完成打卡</text>
      <view v-if="checkinTask" class="button block" :class="{ disabled: checkinTask.checkedToday }" style="margin-top:16rpx;" @click="goCheckin">{{ checkinActionText }}</view>
    </view>

    <!-- 动态广场 -->
    <view class="section-title" style="margin-top:8rpx;"><text class="title-md">📖 学员动态</text></view>
    <view v-for="(post, idx) in posts" :key="idx" class="card post-card">
      <view class="row" style="justify-content:flex-start; gap:12rpx;">
        <image class="avatar-sm" :src="post.avatar" mode="aspectFill" />
        <view style="flex:1;">
          <text class="body-text" style="font-weight:600;">{{ post.nickname }}</text>
          <text class="subtle" style="display:block;">{{ post.time }}</text>
        </view>
      </view>
      <text class="body-text" style="margin-top:12rpx; display:block;">{{ post.content }}</text>
      <view class="row" style="margin-top:12rpx; justify-content:flex-start; gap:32rpx;">
        <view class="interact-btn" @click.stop="toggleLike(post)">
          <text>{{ post.liked ? '❤️' : '🤍' }}</text>
          <text class="subtle">{{ post.likes }}</text>
        </view>
        <view class="interact-btn" @click.stop="commentPost(post)">
          <text>💬</text>
          <text class="subtle">{{ post.comments }}</text>
        </view>
      </view>
    </view>
    <EmptyState v-if="!posts.length" icon="📝" text="暂无学员动态" />

    <view style="height:120rpx;"></view>
    <TabBar current="community" />
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { loadPageTheme } from "../../theme";
import TabBar from "../../components/TabBar.vue";
import EmptyState from "../../components/EmptyState.vue";
import { ensureUser, request, withTenantCode } from "../../api";
import { normalizeCommunityPosts, type CommunityPost } from "../../community-posts";

onShow(() => {
  loadPageTheme();
  loadCheckinTask();
});

const activities = reactive<any[]>([]);

const posts = reactive<CommunityPost[]>([]);
const checkinTask = ref<any>(null);
const checkinActionText = computed(() => checkinTask.value?.checkedToday ? "今日已完成" : "去打卡");
const checkinProgress = computed(() => checkinTask.value?.checkedToday ? 100 : Math.min(Number(checkinTask.value?.completedCount || 0) > 0 ? 67 : 0, 100));

function formatActivityDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { month: "近期", day: "•", time: value || "时间待定" };
  const month = `${date.getMonth() + 1}月`;
  const day = String(date.getDate());
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return { month, day, time: `${date.getFullYear()}-${month}${day} ${hour}:${minute}` };
}

async function loadActivities() {
  try {
    const result = await request<any>("/public/community/activities");
    const items = Array.isArray(result) ? result : result.items || [];
    activities.splice(0, activities.length, ...items.map((item: any) => {
      const date = formatActivityDate(item.startTime);
      return {
        id: item.id,
        month: date.month,
        day: date.day,
        title: item.title,
        time: date.time,
        location: item.location || "地点待定",
        registered: item.registeredCount || 0,
        description: item.description || ""
      };
    }));
  } catch {
    activities.splice(0, activities.length);
  }
}

async function loadPosts() {
  try {
    const result = await request<any>("/public/community/posts");
    posts.splice(0, posts.length, ...normalizeCommunityPosts(result));
  } catch {
    posts.splice(0, posts.length);
  }
}

async function loadCheckinTask() {
  try {
    checkinTask.value = await request<any>("/public/checkin/today");
  } catch {
    checkinTask.value = null;
  }
}

onMounted(() => {
  loadActivities();
  loadPosts();
});

async function toggleLike(post: any) {
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
function goActivity(act: any) {
  uni.showModal({
    title: act.title || "共修活动",
    content: [`时间：${act.time || "待定"}`, `地点：${act.location || "待定"}`, act.description || "共修活动报名流程暂未接入前台，请联系书院确认参与方式。"].join("\n"),
    confirmText: "知道了",
    showCancel: false
  });
}
function goCheckin() {
  if (checkinTask.value?.checkedToday) {
    uni.showToast({ title: "今日已完成打卡", icon: "none" });
    return;
  }
  uni.navigateTo({ url:"/pages/community/checkin" });
}
function goAmbassador() { uni.navigateTo({ url:"/pages/ambassador/index" }); }
</script>

<style scoped>
.page-header { padding: 20rpx 0 16rpx; }
.ambassador-card {
  background: linear-gradient(135deg, #C43D3D, #A52A2A);
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}
.section-title { margin-bottom: 16rpx; }
.activity-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  display: flex;
  gap: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04);
}
.activity-date-block {
  width: 100rpx;
  height: 100rpx;
  background: #C43D3D;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.date-month { font-size: 24rpx; color: #fff; }
.date-day { font-size: 44rpx; font-weight: 700; color: #fff; line-height: 1; }
.activity-info { flex: 1; min-width: 0; }
.activity-name { font-size: 30rpx; font-weight: 600; color: #333; display: block; }
.activity-meta { font-size: 24rpx; color: #999; display: block; margin-top: 4rpx; }
.checkin-card { margin-bottom: 24rpx; }
.post-card { margin-bottom: 16rpx; }
.interact-btn { display: flex; align-items: center; gap: 8rpx; }
</style>
