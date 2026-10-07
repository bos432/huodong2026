<template>
  <view class="history-page has-custom-nav">
    <view class="custom-nav">
      <view class="nav-back app-press" role="button" tabindex="0" aria-label="返回上一页" @click="goBack" @keyup.enter="goBack" @keyup.space.prevent="goBack">‹ 返回</view>
      <text class="nav-title">浏览足迹</text>
      <view class="nav-placeholder" />
    </view>

    <view class="history-head app-enter">
      <text class="history-kicker">最近浏览</text>
      <text class="history-title">找回刚才感兴趣的内容</text>
      <text class="history-copy">活动足迹按当前城市商家独立保存。</text>
    </view>

    <view class="history-tabs" role="tablist" aria-label="浏览足迹类型">
      <view class="history-tab app-press" :class="{ active: activeTab === 'activities' }" role="tab" tabindex="0" :aria-selected="activeTab === 'activities'" @click="activeTab = 'activities'" @keyup.enter="activeTab = 'activities'" @keyup.space.prevent="activeTab = 'activities'">活动足迹</view>
      <view class="history-tab app-press" :class="{ active: activeTab === 'content' }" role="tab" tabindex="0" :aria-selected="activeTab === 'content'" @click="activeTab = 'content'" @keyup.enter="activeTab = 'content'" @keyup.space.prevent="activeTab = 'content'">内容进度</view>
    </view>

    <LoadingState v-if="loading" title="正在加载浏览足迹" description="请稍候，正在同步当前城市的活动和内容记录。" />
    <EmptyState v-else-if="loadError" variant="error" title="浏览足迹加载失败" :description="loadError" action-text="重新加载" @action="loadRecords" />

    <template v-else-if="activeTab === 'activities'">
      <view class="history-list">
        <view v-for="(record, index) in activityRecords" :key="record.id" class="history-card app-stagger app-press" :style="{ '--motion-delay': `${index * 42}ms` }" role="button" tabindex="0" :aria-label="`查看活动：${record.title}`" @click="openActivity(record)" @keyup.enter="openActivity(record)" @keyup.space.prevent="openActivity(record)">
          <image v-if="record.coverUrl" class="record-cover app-media-motion" :src="record.coverUrl" mode="aspectFill" />
          <view v-else class="record-cover record-fallback">活</view>
          <view class="record-main">
            <view class="record-tags"><text>{{ record.categoryName }}</text><text :class="{ ended: record.status === 'ended' }">{{ record.status === "ended" ? "已结束" : "可查看" }}</text></view>
            <text class="record-title">{{ record.title }}</text>
            <text class="record-meta">{{ record.activityTime }} · {{ record.location }}</text>
            <text class="record-viewed">{{ record.viewedAt }}浏览</text>
          </view>
          <text class="record-arrow">›</text>
        </view>
      </view>
      <EmptyState v-if="!activityRecords.length" variant="activity" title="暂无活动足迹" description="打开一个活动详情后，会自动保存在这里。" action-text="发现活动" @action="goActivities" />
    </template>

    <template v-else>
      <view class="history-list">
        <view v-for="(record, index) in contentRecords" :key="record.id" class="history-card content-card app-stagger app-press" :style="{ '--motion-delay': `${index * 42}ms` }" role="button" tabindex="0" :aria-label="`继续查看：${record.title}`" @click="openContent(record)" @keyup.enter="openContent(record)" @keyup.space.prevent="openContent(record)">
          <image v-if="record.coverUrl" class="record-cover app-media-motion" :src="record.coverUrl" mode="aspectFill" />
          <view v-else class="record-cover record-fallback content">内</view>
          <view class="record-main">
            <text class="record-title">{{ record.title }}</text>
            <text class="record-viewed">最后浏览 {{ record.viewedAt }}</text>
            <view class="progress-track"><view class="progress-fill" :style="{ width: `${record.progress}%` }" /></view>
            <text class="record-progress">已完成 {{ record.progress }}%</text>
          </view>
          <text class="record-arrow">›</text>
        </view>
      </view>
      <EmptyState v-if="!contentRecords.length" variant="default" title="暂无内容进度" description="查看专题内容后，进度会在这里持续更新。" />
    </template>

    <view class="page-space" />
    <TabBar current="user" />
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, request, withTenantCode } from "../../api";
import { createTenantLoadGuard, formatShanghaiDateTime } from "../../tenant-load-guard";
import { reviewSafeText } from "../../review-safe-text";
import EmptyState from "../../components/EmptyState.vue";
import LoadingState from "../../components/LoadingState.vue";
import TabBar from "../../components/TabBar.vue";

type ActivityRecord = { id: number; activityId: number; title: string; coverUrl: string; categoryName: string; activityTime: string; location: string; viewedAt: string; status: string };
type ContentRecord = { id: number; courseId: number; title: string; coverUrl: string; viewedAt: string; progress: number };

const activeTab = ref<"activities" | "content">("activities");
const activityRecords = ref<ActivityRecord[]>([]);
const contentRecords = ref<ContentRecord[]>([]);
const loading = ref(true);
const loadError = ref("");
const loadedTenantCode = ref("");
const loadGuard = createTenantLoadGuard();

function formatTime(value?: string, fallback = "时间待确认") { return formatShanghaiDateTime(value, fallback); }

async function requestActivityHistory() {
  try {
    return await request<any[]>("/public/me/activity-history");
  } catch (error: any) {
    const message = String(error?.message || "");
    if (error?.statusCode === 404 || message.includes("Cannot GET /api/public/me/activity-history")) return [];
    throw error;
  }
}

async function loadRecords() {
  const token = loadGuard.begin();
  if (loadedTenantCode.value && loadedTenantCode.value !== token.tenantCode) { activityRecords.value = []; contentRecords.value = []; }
  loading.value = true;
  loadError.value = "";
  try {
    await ensureUser();
    const [activityRows, courseRows] = await Promise.all([
      requestActivityHistory(),
      request<any[]>("/public/me/courses")
    ]);
    if (!loadGuard.isCurrent(token)) return;
    activityRecords.value = (Array.isArray(activityRows) ? activityRows : []).map((row) => ({
      id: Number(row.id), activityId: Number(row.activity?.id), title: reviewSafeText(row.activity?.title || "未命名活动"),
      coverUrl: String(row.activity?.coverUrl || ""), categoryName: String(row.activity?.category?.name || "活动"),
      activityTime: formatTime(row.activity?.startTime), location: String(row.activity?.location || "地点待确认"),
      viewedAt: formatTime(row.lastViewedAt, "最近"), status: String(row.activity?.status || "open")
    }));
    contentRecords.value = (Array.isArray(courseRows) ? courseRows : []).map((course) => ({
      id: Number(course.learning?.id || course.id), courseId: Number(course.id), title: reviewSafeText(course.title || "未命名内容"),
      coverUrl: String(course.coverUrl || ""), viewedAt: formatTime(course.learning?.updatedAt, "暂无浏览时间"),
      progress: Math.min(100, Math.max(0, Math.round(Number(course.learning?.progress || 0))))
    }));
    loadedTenantCode.value = token.tenantCode;
  } catch (error: any) {
    if (!loadGuard.isCurrent(token)) return;
    if (!String(error?.message || "").includes("请先完成")) loadError.value = reviewSafeText(error?.message || "浏览足迹加载失败，请稍后重试。");
  } finally { if (loadGuard.isCurrent(token)) loading.value = false; }
}

function openActivity(record: ActivityRecord) { if (record.activityId) uni.navigateTo({ url: withTenantCode(`/pages/activity/detail?id=${record.activityId}`) }); }
function openContent(record: ContentRecord) { if (record.courseId) uni.navigateTo({ url: withTenantCode(`/pages/course/detail?id=${record.courseId}`) }); }
function goActivities() { uni.navigateTo({ url: withTenantCode("/pages/activity/list") }); }
function goBack() { uni.navigateBack(); }
onShow(loadRecords);
</script>

<style scoped>
.history-page{min-height:100vh;padding:0 28rpx 160rpx;background:var(--app-page-bg);color:var(--app-text)}
.custom-nav{display:flex;align-items:center;min-height:88rpx}.nav-back,.nav-placeholder{width:130rpx;color:var(--app-primary);font-size:26rpx}.nav-title{flex:1;text-align:center;font-size:30rpx;font-weight:850}
.history-head{padding:28rpx 0 22rpx}.history-kicker,.history-title,.history-copy{display:block}.history-kicker{color:var(--app-primary);font-size:22rpx;font-weight:850}.history-title{margin-top:8rpx;font-size:38rpx;line-height:1.3;font-weight:900}.history-copy{margin-top:10rpx;color:var(--app-muted);font-size:24rpx;line-height:1.55}
.history-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6rpx;padding:6rpx;border:1rpx solid var(--app-border);border-radius:16rpx;background:#fff}.history-tab{min-height:66rpx;display:flex;align-items:center;justify-content:center;border-radius:12rpx;color:var(--app-muted);font-size:25rpx;font-weight:800}.history-tab.active{background:#16252d;color:#fff}
.history-list{display:grid;gap:14rpx;margin-top:18rpx}.history-card{display:flex;align-items:center;gap:18rpx;min-width:0;padding:18rpx;border:1rpx solid var(--app-border);border-radius:16rpx;background:#fff}.record-cover{width:142rpx;height:112rpx;flex:none;border-radius:12rpx;background:#e9f3ed}.record-fallback{display:flex;align-items:center;justify-content:center;color:#08753f;font-size:34rpx;font-weight:900}.record-fallback.content{background:#fff3e5;color:#a45d00}.record-main{min-width:0;flex:1}.record-tags{display:flex;align-items:center;gap:10rpx}.record-tags text{padding:5rpx 9rpx;border-radius:6rpx;background:#eaf7f1;color:#08753f;font-size:20rpx;font-weight:800}.record-tags text.ended{background:#f2f4f7;color:#667085}.record-title{display:-webkit-box;margin-top:8rpx;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2;color:#16252d;font-size:27rpx;line-height:1.4;font-weight:850}.record-meta,.record-viewed,.record-progress{display:block;margin-top:7rpx;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--app-muted);font-size:22rpx}.record-arrow{flex:none;color:#98a2b3;font-size:38rpx}.content-card .record-title{margin-top:0}.progress-track{height:8rpx;margin-top:12rpx;overflow:hidden;border-radius:4rpx;background:#edf1ef}.progress-fill{height:100%;border-radius:4rpx;background:var(--app-primary)}
.page-space{height:20rpx}
@media(min-width:900px){.history-page{max-width:760px;margin:0 auto}}
</style>
