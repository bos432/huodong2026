<template>
  <view class="container has-custom-nav">
    <view class="page-header">
      <text class="title-lg">共修</text>
    </view>

    <PageDecorationBlocks :sections="decorationSections" />
    <AdSlotRenderer slot-key="community_feed_inline" page-key="community_home" compact />

    <!-- 文化大使入口 -->
    <view class="ambassador-card" @click="goAmbassador">
      <text style="font-size:30rpx; color:#fff; font-weight:600;">🏮 加入文化大使计划</text>
      <text style="font-size:24rpx; color:rgba(255,255,255,0.8); margin-top:6rpx;">让热爱发光 &gt;</text>
    </view>
    <view class="publish-card" @click="goPublish">
      <view>
        <text class="publish-title">分享活动心得</text>
        <text class="publish-copy">上传照片和感悟，审核后展示给新同学</text>
      </view>
      <view class="button sm">去发布</view>
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
      <view v-if="checkinTask" class="checkin-status" :class="{ done: checkinTask.checkedToday }">
        <text class="checkin-status-badge">{{ checkinTask.checkedToday ? "已" : "待" }}</text>
        <view class="checkin-status-copy">
          <text class="checkin-status-title">{{ checkinStatusTitle }}</text>
          <text class="checkin-status-sub">{{ checkinStatusSubtitle }}</text>
        </view>
      </view>
      <view v-if="checkinTask" class="progress-bar" style="margin-top:12rpx;">
        <view class="progress-fill" :style="{ width: checkinProgress + '%' }"></view>
      </view>
      <view v-if="checkinTask" class="checkin-progress-meta">
        <text>我的今日进度</text>
        <text>{{ checkinProgress }}%</text>
      </view>
      <text v-if="checkinTask" class="subtle" style="margin-top:8rpx;">今日已有 {{ checkinCompletedCount }} 位同学完成打卡</text>
      <view v-if="checkinTask" class="button block" :class="{ secondary: checkinTask.checkedToday }" style="margin-top:16rpx;" @click="goCheckin">{{ checkinActionText }}</view>
    </view>

    <!-- 动态广场 -->
    <view class="section-title post-section-title" style="margin-top:8rpx;">
      <text class="title-md">{{ activityFilterId ? "📖 活动口碑" : "📖 学员动态" }}</text>
      <text v-if="activityFilterId" class="subtle">仅展示当前活动关联心得</text>
    </view>
    <view v-for="(post, idx) in posts" :key="idx" class="card post-card" @click="goPost(post)">
      <view class="row" style="justify-content:flex-start; gap:12rpx;">
        <image class="avatar-sm" :src="post.avatar" mode="aspectFill" />
        <view style="flex:1;">
          <text class="body-text" style="font-weight:600;">{{ post.nickname }}</text>
          <text class="subtle" style="display:block;">{{ post.time }}<template v-if="post.activity?.title"> · {{ post.activity.title }}</template></text>
        </view>
      </view>
      <text class="body-text" style="margin-top:12rpx; display:block;">{{ post.content }}</text>
      <view v-if="post.images?.length" class="post-images">
        <image v-for="image in post.images.slice(0, 3)" :key="image" class="post-image" :src="image" mode="aspectFill" />
      </view>
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
    <view v-if="!posts.length" class="empty-post-card">
      <text class="empty-title">{{ activityFilterId ? "还没有活动心得" : "暂无学员动态" }}</text>
      <text class="empty-copy">{{ activityFilterId ? "完成签到，或活动结束且报名成功/已付款后，可以发布这场活动的心得。" : "参与活动后发布照片和感悟，审核通过后会展示在这里。" }}</text>
      <view class="button secondary sm" @click="goPublish">{{ activityFilterId ? "发布这场心得" : "去发布心得" }}</view>
    </view>

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
import { usePageDecoration } from "../../decoration";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";
import { queryParam } from "../../query";
import AdSlotRenderer from "../../components/AdSlotRenderer.vue";

onShow(() => {
  loadPageTheme();
  loadCheckinTask();
  loadDecoration();
});

const activities = reactive<any[]>([]);

const posts = reactive<CommunityPost[]>([]);
const checkinTask = ref<any>(null);
const activityFilterId = ref(0);
const checkinActionText = computed(() => checkinTask.value?.checkedToday ? "查看打卡记录" : "去打卡");
const checkinCompletedCount = computed(() => Math.max(0, Number(checkinTask.value?.completedCount || 0)));
const checkinProgress = computed(() => checkinTask.value?.checkedToday ? 100 : 0);
const checkinStatusTitle = computed(() => checkinTask.value?.checkedToday ? "你今天已完成打卡" : "你今天还未打卡");
const checkinStatusSubtitle = computed(() => checkinTask.value?.checkedToday ? "今天已经点亮，明天继续保持。" : "进入后完成今日阅读、书写或共修记录。");
const { contentSections, loadDecoration } = usePageDecoration("community_home", "/pages/community/index");
const decorationSections = computed(() => contentSections.value.filter((section) => {
  if (section.type === "hero" && section.title === "共修首页") return false;
  if (section.type === "rich_text" && section.title === "页面说明") return false;
  return true;
}));

function loadRouteOptions() {
  const pages = getCurrentPages();
  const options = (pages[pages.length - 1] as any)?.options || {};
  const pageActivityId = Number(options.activityId || 0);
  if (pageActivityId) {
    activityFilterId.value = pageActivityId;
    return;
  }
  // #ifdef H5
  if (typeof window !== "undefined") {
    const hash = window.location.hash || "";
    const queryText = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : window.location.search.slice(1);
    activityFilterId.value = Number(queryParam(queryText, "activityId") || 0);
  }
  // #endif
}

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
    const query = activityFilterId.value ? `?activityId=${activityFilterId.value}` : "";
    const result = await request<any>(`/public/community/posts${query}`);
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
  loadRouteOptions();
  loadActivities();
  loadPosts();
  loadDecoration();
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
    void loadPosts();
  } catch (error: any) {
    uni.showToast({ title: error.message || "评论失败", icon: "none" });
  }
}
function goActivity(act: any) {
  if (act?.id) uni.navigateTo({ url: withTenantCode(`/pages/activity/detail?id=${act.id}`) });
}
function goCheckin() {
  uni.navigateTo({ url:"/pages/community/checkin" });
}
function goAmbassador() { uni.navigateTo({ url:"/pages/ambassador/index" }); }
function goPublish() {
  const query = activityFilterId.value ? `?activityId=${activityFilterId.value}` : "";
  uni.navigateTo({ url: withTenantCode(`/pages/community/publish${query}`) });
}
function goPost(post: CommunityPost) { uni.navigateTo({ url: withTenantCode(`/pages/community/detail?id=${post.id}`) }); }
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
.post-section-title { display:grid; gap:4rpx; }
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
.checkin-status { display:flex; align-items:center; gap:16rpx; margin-top:16rpx; padding:18rpx; border-radius:18rpx; background:#fff7ec; border:1rpx solid #eadac6; }
.checkin-status.done { background:#f2f8ef; border-color:#c8dfbf; }
.checkin-status-badge { width:56rpx; height:56rpx; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; background:#c43d3d; font-size:24rpx; font-weight:900; flex-shrink:0; }
.checkin-status.done .checkin-status-badge { background:#5b8c5a; }
.checkin-status-copy { flex:1; min-width:0; display:grid; gap:4rpx; }
.checkin-status-title { color:#5b2f24; font-size:28rpx; font-weight:900; }
.checkin-status-sub { color:#8a6b58; font-size:24rpx; line-height:1.5; }
.checkin-progress-meta { display:flex; align-items:center; justify-content:space-between; margin-top:8rpx; color:#8a6b58; font-size:23rpx; }
.post-card { margin-bottom: 16rpx; }
.interact-btn { display: flex; align-items: center; gap: 8rpx; }
.publish-card { display:flex; align-items:center; justify-content:space-between; gap:18rpx; margin-bottom:24rpx; padding:24rpx; border-radius:20rpx; background:#fff7ec; box-shadow:0 4rpx 20rpx rgba(0,0,0,0.04); }
.publish-title { display:block; color:#5b2f24; font-size:30rpx; font-weight:900; }
.publish-copy { display:block; margin-top:6rpx; color:#8a6b58; font-size:24rpx; }
.post-images { display:flex; gap:10rpx; margin-top:12rpx; }
.post-image { width:31%; height:150rpx; border-radius:14rpx; background:#f3e7d6; }
.empty-post-card { display:grid; gap:12rpx; margin-bottom:16rpx; padding:24rpx; border-radius:20rpx; background:#fff7ec; border:1rpx solid #eadac6; }
.empty-title { color:#5b2f24; font-size:30rpx; font-weight:900; }
.empty-copy { color:#8a6b58; font-size:25rpx; line-height:1.6; }
.empty-post-card .button { width:fit-content; margin-top:2rpx; }
</style>
