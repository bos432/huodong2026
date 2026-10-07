<template>
  <view class="container has-custom-nav">
    <view class="page-header">
      <text class="title-lg">社区</text>
      <text class="page-subtitle">记录真实参与，认识一起做事的人</text>
    </view>

    <PageDecorationBlocks :sections="decorationSections" />
    <AdSlotRenderer slot-key="community_feed_inline" page-key="community_home" compact />

    <!-- 文化大使入口 -->
    <view v-if="featureGates.ambassador" class="ambassador-card" role="button" tabindex="0" aria-label="加入文化大使计划" @click="goAmbassador" @keyup.enter="goAmbassador" @keyup.space.prevent="goAmbassador">
      <text class="support-title">加入文化大使计划</text>
      <text class="support-copy">参与城市文化共建 ›</text>
    </view>
    <view v-if="showPublishEntry" class="publish-card" role="button" tabindex="0" aria-label="分享活动心得" @click="goPublish" @keyup.enter="goPublish" @keyup.space.prevent="goPublish">
      <view>
        <text class="publish-title">分享活动心得</text>
        <text class="publish-copy">上传照片和感悟，审核后展示给新同学</text>
      </view>
      <view class="button sm">去发布</view>
    </view>
    <view class="social-entry" role="button" tabindex="0" aria-label="进入社交拓展" @click="goSocial" @keyup.enter="goSocial" @keyup.space.prevent="goSocial">
      <view><text class="social-eyebrow">同城连接</text><text class="publish-title">社交拓展</text><text class="publish-copy">展示你能提供的资源，找到同行与合作伙伴</text></view>
      <view class="social-action">立即拓展</view>
    </view>
    <view v-if="featureGates.forum" class="forum-entry-card" role="button" tabindex="0" aria-label="进入共修论坛" @click="goForum" @keyup.enter="goForum" @keyup.space.prevent="goForum">
      <view>
        <text class="publish-title">共修论坛</text>
        <text class="publish-copy">发起话题、回复同学、收藏精华内容</text>
      </view>
      <view class="button sm secondary">进入</view>
    </view>

    <!-- 近期活动 -->
    <view class="section-title"><text class="title-md">近期共修</text></view>
    <LoadingState v-if="activitiesLoading" compact title="正在加载近期活动" description="正在同步当前商家的活动安排。" />
    <EmptyState v-else-if="activitiesError" compact variant="error" :description="activitiesError" action-text="重新加载" @action="loadActivities" />
    <view v-for="(act, idx) in activities" :key="idx" class="activity-card" role="button" tabindex="0" :aria-label="`查看活动：${act.title}`" @click="goActivity(act)" @keyup.enter="goActivity(act)" @keyup.space.prevent="goActivity(act)">
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
    <EmptyState v-if="!activitiesLoading && !activitiesError && !activities.length" compact variant="activity" title="暂无近期活动" description="主办方发布新活动后，会第一时间显示在这里。" />

    <!-- 今日打卡 -->
    <view class="card checkin-card">
      <text class="title-md">今日共修</text>
      <LoadingState v-if="checkinLoading" compact title="正在加载今日打卡" description="正在同步今天的共修任务。" />
      <EmptyState v-else-if="checkinError" compact variant="error" :description="checkinError" action-text="重新加载" @action="loadCheckinTask" />
      <template v-else>
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
      </template>
    </view>

    <!-- 动态广场 -->
    <view class="section-title post-section-title" style="margin-top:8rpx;">
      <text class="title-md">{{ activityFilterId ? "活动口碑" : "参与者动态" }}</text>
      <text v-if="activityFilterId" class="subtle">仅展示当前活动关联心得</text>
    </view>
    <LoadingState v-if="postsLoading" compact title="正在加载参与者动态" description="正在同步已审核的活动心得。" />
    <EmptyState v-else-if="postsError" compact variant="error" :description="postsError" action-text="重新加载" @action="loadPosts" />
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
        <view class="interact-btn" :class="{ disabled: likePending[post.id] }" @click.stop="toggleLike(post)">
          <text>{{ likePending[post.id] ? '处理中' : (post.liked ? '❤️' : '🤍') }}</text>
          <text class="subtle">{{ post.likes }}</text>
        </view>
        <view class="interact-btn" :class="{ disabled: commentPendingId === post.id }" @click.stop="commentPost(post)">
          <text>💬</text>
          <text class="subtle">{{ post.comments }}</text>
        </view>
      </view>
    </view>
    <EmptyState
      v-if="!postsLoading && !postsError && !posts.length"
      compact
      variant="social"
      :title="activityFilterId ? '还没有活动心得' : '暂无参与者动态'"
      :description="activityFilterId ? '活动结束且完成签到后，可以发布这场活动的心得。' : '活动结束并完成签到后发布照片和感悟，审核通过后会展示在这里。'"
      :action-text="canPublish ? (activityFilterId ? '发布这场心得' : '去发布心得') : ''"
      @action="goPublish"
    />

    <view style="height:120rpx;"></view>
    <TabBar current="community" />
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { onHide, onShareAppMessage, onShareTimeline, onShow } from "@dcloudio/uni-app";
import { loadPageTheme } from "../../theme";
import TabBar from "../../components/TabBar.vue";
import EmptyState from "../../components/EmptyState.vue";
import LoadingState from "../../components/LoadingState.vue";
import { ensureUser, getUserToken, request, withTenantCode } from "../../api";
import { normalizeCommunityPosts, type CommunityPost } from "../../community-posts";
import { usePageDecoration } from "../../decoration";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";
import { queryParam } from "../../query";
import AdSlotRenderer from "../../components/AdSlotRenderer.vue";
import { featureGatesState, guardCurrentPageFeature, loadFeatureGates, showFeatureDisabledToast } from "../../feature-gates";
import { createTenantLoadGuard, formatShanghaiDateTime } from "../../tenant-load-guard";
import { defaultMiniProgramShare, defaultMiniProgramTimelineShare, showMiniProgramShareMenu } from "../../share";

onShow(async () => {
  loadRouteOptions();
  await loadFeatureGates(true);
  if (!guardCurrentPageFeature()) return;
  loadPageTheme();
  void loadActivities();
  void loadPublishActivities();
  void loadPosts();
  void loadCheckinTask();
  void loadDecoration();
});

const activities = reactive<any[]>([]);

const posts = reactive<CommunityPost[]>([]);
const checkinTask = ref<any>(null);
const activitiesLoading = ref(false);
const activitiesError = ref("");
const postsLoading = ref(false);
const postsError = ref("");
const checkinLoading = ref(false);
const checkinError = ref("");
const likePending = reactive<Record<number, boolean>>({});
const commentPendingId = ref(0);
const activityFilterId = ref(0);
const activitiesLoadGuard = createTenantLoadGuard();
const postsLoadGuard = createTenantLoadGuard();
const checkinLoadGuard = createTenantLoadGuard();
const publishActivitiesLoadGuard = createTenantLoadGuard();
const interactionGuard = createTenantLoadGuard();
const publishActivities = ref<any[]>([]);
const publishActivitiesLoaded = ref(false);
const checkinActionText = computed(() => checkinTask.value?.checkedToday ? "查看打卡记录" : "去打卡");
const checkinCompletedCount = computed(() => Math.max(0, Number(checkinTask.value?.completedCount || 0)));
const checkinProgress = computed(() => checkinTask.value?.checkedToday ? 100 : 0);
const checkinStatusTitle = computed(() => checkinTask.value?.checkedToday ? "你今天已完成打卡" : "你今天还未打卡");
const checkinStatusSubtitle = computed(() => checkinTask.value?.checkedToday ? "今天已经点亮，明天继续保持。" : "进入后完成今日阅读、书写或共修记录。");
const featureGates = featureGatesState;
const canPublish = computed(() => featureGates.value.community !== false && featureGates.value.communityPublish !== false);
const showPublishEntry = computed(() => canPublish.value && publishActivitiesLoaded.value && publishActivities.value.length > 0);
const { contentSections, loadDecoration } = usePageDecoration("community_home", "/pages/community/index");
const shareOptions = { title: "慢π共修动态", path: () => activityFilterId.value ? `/pages/community/index?activityId=${activityFilterId.value}` : "/pages/community/index" };
onShareAppMessage(() => defaultMiniProgramShare(shareOptions));
onShareTimeline(() => defaultMiniProgramTimelineShare(shareOptions));
onShow(showMiniProgramShareMenu);
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
  const formatted = formatShanghaiDateTime(value, "");
  if (!formatted) return { month: "近期", day: "•", time: value || "时间待定" };
  const [date, time] = formatted.split(" ");
  const [year, monthNumber, dayNumber] = date.split("-");
  return { month: `${Number(monthNumber)}月`, day: String(Number(dayNumber)), time: `${year}-${Number(monthNumber)}月${Number(dayNumber)}日 ${time}` };
}

async function loadActivities() {
  const token = activitiesLoadGuard.begin();
  activitiesLoading.value = true;
  activitiesError.value = "";
  try {
    const result = await request<any>("/public/community/activities");
    const items = Array.isArray(result) ? result : result.items || [];
    if (!activitiesLoadGuard.isCurrent(token)) return;
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
  } catch (error: any) {
    if (activitiesLoadGuard.isCurrent(token)) activitiesError.value = error?.message || "近期活动加载失败，请稍后重试。";
  } finally {
    if (activitiesLoadGuard.isCurrent(token)) activitiesLoading.value = false;
  }
}

async function loadPublishActivities() {
  const token = publishActivitiesLoadGuard.begin();
  publishActivitiesLoaded.value = false;
  publishActivities.value = [];
  if (!canPublish.value || !getUserToken()) {
    publishActivitiesLoaded.value = true;
    return;
  }
  try {
    const result = await request<any[]>("/public/me/community/postable-activities");
    if (!publishActivitiesLoadGuard.isCurrent(token)) return;
    publishActivities.value = Array.isArray(result) ? result : [];
  } catch {
    if (!publishActivitiesLoadGuard.isCurrent(token)) return;
    publishActivities.value = [];
  } finally {
    if (publishActivitiesLoadGuard.isCurrent(token)) publishActivitiesLoaded.value = true;
  }
}

async function loadPosts() {
  const token = postsLoadGuard.begin();
  postsLoading.value = true;
  postsError.value = "";
  try {
    const query = activityFilterId.value ? `?activityId=${activityFilterId.value}` : "";
    const result = await request<any>(`/public/community/posts${query}`);
    if (postsLoadGuard.isCurrent(token)) posts.splice(0, posts.length, ...normalizeCommunityPosts(result));
  } catch (error: any) {
    if (postsLoadGuard.isCurrent(token)) postsError.value = error?.message || "参与者动态加载失败，请稍后重试。";
  } finally {
    if (postsLoadGuard.isCurrent(token)) postsLoading.value = false;
  }
}

async function loadCheckinTask() {
  const token = checkinLoadGuard.begin();
  checkinLoading.value = true;
  checkinError.value = "";
  try {
    const result = await request<any>("/public/checkin/today");
    if (checkinLoadGuard.isCurrent(token)) checkinTask.value = result;
  } catch (error: any) {
    if (checkinLoadGuard.isCurrent(token)) checkinError.value = error?.message || "今日打卡任务加载失败，请稍后重试。";
  } finally {
    if (checkinLoadGuard.isCurrent(token)) checkinLoading.value = false;
  }
}

async function toggleLike(post: any) {
  if (!post?.id || likePending[post.id]) return;
  const requestedPostId = post.id;
  const interactionToken = interactionGuard.begin();
  likePending[requestedPostId] = true;
  try {
    await ensureUser();
    if (!interactionGuard.isCurrent(interactionToken)) return;
    const result = await request<any>(`/public/community/posts/${requestedPostId}/like`, { method: "POST" });
    const currentPost = posts.find((item) => item.id === requestedPostId);
    if (!interactionGuard.isCurrent(interactionToken) || !currentPost) return;
    currentPost.liked = Boolean(result?.liked);
    currentPost.likes = Number(result?.likes || 0);
    uni.showToast({ title: currentPost.liked ? "已点赞" : "已取消点赞", icon: "none" });
  } catch (error: any) {
    if (interactionGuard.isCurrent(interactionToken)) uni.showToast({ title: error.message || "操作失败", icon: "none" });
  } finally {
    if (interactionGuard.isCurrent(interactionToken)) likePending[requestedPostId] = false;
  }
}
function commentPost(post: CommunityPost) {
  if (!post?.id || commentPendingId.value) return;
  const requestedPostId = post.id;
  const interactionToken = interactionGuard.begin();
  commentPendingId.value = requestedPostId;
  uni.showModal({
    title: "评论动态",
    editable: true,
    placeholderText: "写下你的想法",
    confirmText: "发布",
    success: (res: any) => {
      if (!res.confirm) {
        if (interactionGuard.isCurrent(interactionToken)) commentPendingId.value = 0;
        return;
      }
      const content = String(res.content || "").trim();
      if (!content) {
        if (interactionGuard.isCurrent(interactionToken)) {
          commentPendingId.value = 0;
          uni.showToast({ title: "请输入评论内容", icon: "none" });
        }
        return;
      }
      if (interactionGuard.isCurrent(interactionToken)) void submitComment(requestedPostId, content, interactionToken);
    },
    fail: () => {
      if (interactionGuard.isCurrent(interactionToken)) commentPendingId.value = 0;
    }
  });
}
async function submitComment(requestedPostId: number, content: string, interactionToken: ReturnType<typeof interactionGuard.begin>) {
  try {
    await ensureUser();
    if (!interactionGuard.isCurrent(interactionToken)) return;
    const result = await request<any>(`/public/community/posts/${requestedPostId}/comments`, { method: "POST", data: { content } });
    if (!interactionGuard.isCurrent(interactionToken)) return;
    uni.showToast({ title: result?.message || "评论已提交审核", icon: "none" });
    void loadPosts();
  } catch (error: any) {
    if (interactionGuard.isCurrent(interactionToken)) uni.showToast({ title: error.message || "评论失败", icon: "none" });
  } finally {
    if (interactionGuard.isCurrent(interactionToken)) commentPendingId.value = 0;
  }
}
function goActivity(act: any) {
  if (act?.id) uni.navigateTo({ url: withTenantCode(`/pages/community/program?id=${act.id}`) });
}
function goCheckin() {
  uni.navigateTo({ url:"/pages/community/checkin" });
}
function goAmbassador() { uni.navigateTo({ url:"/pages/ambassador/index" }); }
function goPublish() {
  if (!canPublish.value) {
    showFeatureDisabledToast("/pages/community/publish");
    return;
  }
  const query = activityFilterId.value ? `?activityId=${activityFilterId.value}` : "";
  uni.navigateTo({ url: withTenantCode(`/pages/community/publish${query}`) });
}
function goForum() {
  if (featureGates.value.forum === false) {
    showFeatureDisabledToast("/pages/forum/index");
    return;
  }
  uni.navigateTo({ url: withTenantCode("/pages/forum/index") });
}
function goSocial() { uni.navigateTo({ url: withTenantCode("/pages/community/social") }); }
function goPost(post: CommunityPost) { uni.navigateTo({ url: withTenantCode(`/pages/community/detail?id=${post.id}`) }); }

onHide(() => {
  activitiesLoadGuard.invalidate();
  postsLoadGuard.invalidate();
  checkinLoadGuard.invalidate();
  publishActivitiesLoadGuard.invalidate();
  interactionGuard.invalidate();
  commentPendingId.value = 0;
  for (const key of Object.keys(likePending)) delete likePending[Number(key)];
});
</script>

<style scoped>
.container{padding:24rpx 28rpx;background:var(--app-page-bg)}
.page-header { padding: 20rpx 0 24rpx; }
.ambassador-card {
  display:grid;
  gap:6rpx;
  background: #fff;
  border:1rpx solid var(--app-border);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}
.support-title{color:var(--app-text);font-size:28rpx;font-weight:800}.support-copy{color:var(--app-text-muted);font-size:24rpx}
.publish-card,.forum-entry-card{border:1rpx solid var(--app-border)!important;border-radius:16rpx!important;background:#fff!important;box-shadow:none!important}
.social-entry{display:flex;align-items:center;justify-content:space-between;gap:20rpx;margin-bottom:24rpx;padding:28rpx;border:1rpx solid #cfe5d8;border-radius:16rpx;background:#eaf7f1}.social-entry>view:first-child{display:grid;gap:6rpx}.social-eyebrow{color:#0f766e;font-size:21rpx;font-weight:850}.social-action{flex:none;padding:15rpx 20rpx;border-radius:12rpx;background:#16252d;color:#fff;font-size:23rpx;font-weight:850}
.page-subtitle{display:block;margin-top:6rpx;color:#667085;font-size:24rpx;line-height:1.5}
.activity-card,.checkin-card,.post-card{border-color:var(--app-border)!important;border-radius:16rpx!important;box-shadow:none!important}
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
.interact-btn.disabled { opacity:.6; pointer-events:none; }
.publish-card { display:flex; align-items:center; justify-content:space-between; gap:18rpx; margin-bottom:24rpx; padding:24rpx; border-radius:20rpx; background:#fff7ec; box-shadow:0 4rpx 20rpx rgba(0,0,0,0.04); }
.forum-entry-card { display:flex; align-items:center; justify-content:space-between; gap:18rpx; margin-bottom:24rpx; padding:24rpx; border-radius:20rpx; background:#eef8f6; box-shadow:0 4rpx 20rpx rgba(0,0,0,0.04); }
.publish-title { display:block; color:#5b2f24; font-size:30rpx; font-weight:900; }
.publish-copy { display:block; margin-top:6rpx; color:#8a6b58; font-size:24rpx; }
.post-images { display:flex; gap:10rpx; margin-top:12rpx; }
.post-image { width:31%; height:150rpx; border-radius:14rpx; background:#f3e7d6; }
</style>
