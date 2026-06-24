<template>
  <view class="container user-subpage has-custom-nav">
    <view class="custom-nav">
      <view class="nav-back" @click="goBack">‹ 返回</view>
      <text class="nav-title">我的心得</text>
      <view class="nav-action" @click="loadPosts">刷新</view>
    </view>

    <view class="page-hero">
      <view class="hero-kicker">慢π · 活动分享</view>
      <view class="hero-title">记录每一次真实参与</view>
      <view class="hero-desc">查看已提交心得的审核状态，已通过内容可以继续生成海报或分享链接。</view>
    </view>

    <view class="status-tabs">
      <view v-for="item in statusTabs" :key="item.value" class="status-tab" :class="{ active: currentStatus === item.value }" @click="currentStatus = item.value">
        <text>{{ item.label }}</text>
        <text class="status-count">{{ countByStatus(item.value) }}</text>
      </view>
    </view>

    <view v-if="loading" class="empty-card">
      <view class="empty-title">正在加载</view>
      <view class="empty-desc">正在同步你的心得记录。</view>
    </view>

    <view v-for="post in filteredPosts" :key="post.id" class="post-card" @click="openPost(post)">
      <view class="post-head">
        <text class="status-pill" :class="post.status">{{ statusText(post.status) }}</text>
        <text class="post-date">{{ dateText(post.createdAt) }}</text>
      </view>
      <image v-if="post.images?.length" class="post-cover" :src="post.images[0]" mode="aspectFill" />
      <view v-else class="post-cover fallback">心得</view>
      <view class="post-title">{{ post.activity?.title || "活动心得" }}</view>
      <view class="post-content">{{ post.content }}</view>
      <view class="post-meta">
        <text v-if="post.city">{{ post.city }}</text>
        <text v-if="post.tags?.length">{{ post.tags.join(" / ") }}</text>
        <text v-if="post.status === 'approved'">分享 {{ post.shareCount || 0 }}</text>
      </view>
      <view v-if="post.status === 'rejected' && post.reviewRemark" class="review-remark">审核意见：{{ post.reviewRemark }}</view>
      <view class="post-action">{{ actionText(post) }}</view>
    </view>

    <view v-if="!loading && !filteredPosts.length" class="empty-card">
      <view class="empty-icon">心</view>
      <view class="empty-title">{{ currentStatus === "all" ? "还没有心得" : "暂无对应状态" }}</view>
      <view class="empty-desc">参加活动并完成签到后，就可以上传照片和心得，审核通过后展示在共修动态里。</view>
      <view class="primary-action" @click="goPublish">发布心得</view>
    </view>

    <view v-if="posts.length" class="primary-action fixed-action" @click="goPublish">继续发布心得</view>
    <TabBar current="user" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, request, withTenantCode } from "../../api";
import TabBar from "../../components/TabBar.vue";

const loading = ref(false);
const posts = ref<any[]>([]);
const currentStatus = ref("all");
const statusTabs = [
  { label: "全部", value: "all" },
  { label: "待审核", value: "pending" },
  { label: "已通过", value: "approved" },
  { label: "未通过", value: "rejected" }
];

const filteredPosts = computed(() => {
  if (currentStatus.value === "all") return posts.value;
  return posts.value.filter((item) => item.status === currentStatus.value);
});

async function loadPosts() {
  loading.value = true;
  try {
    await ensureUser();
    const rows = await request<any[]>("/public/me/community/posts");
    posts.value = Array.isArray(rows) ? rows : [];
  } catch (error: any) {
    posts.value = [];
    uni.showToast({ title: error.message || "加载心得失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

function countByStatus(status: string) {
  if (status === "all") return posts.value.length;
  return posts.value.filter((item) => item.status === status).length;
}

function statusText(status: string) {
  if (status === "approved") return "已通过";
  if (status === "rejected") return "未通过";
  return "待审核";
}

function actionText(post: any) {
  if (post.status === "approved") return "查看详情并分享 ›";
  if (post.status === "rejected") return "修改后可重新发布";
  return "后台审核中";
}

function dateText(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("zh-CN");
}

function openPost(post: any) {
  if (post.status !== "approved") return;
  uni.navigateTo({ url: withTenantCode(`/pages/community/detail?id=${post.id}`) });
}

function goPublish() {
  uni.navigateTo({ url: withTenantCode("/pages/community/publish") });
}

function goBack() {
  uni.navigateBack();
}

onShow(loadPosts);
</script>

<style scoped>
.user-subpage {
  min-height: 100vh;
  padding-bottom: 180rpx;
  background:
    linear-gradient(180deg, #f7efe3 0%, #fbf7ef 40%, #f4eadc 100%);
}
.custom-nav { display: flex; align-items: center; padding: 18rpx 0 20rpx; }
.nav-back, .nav-action { width: 130rpx; color: #4a6b8a; font-size: 28rpx; font-weight: 800; }
.nav-action { text-align: right; }
.nav-title { flex: 1; color: #263d3c; font-size: 32rpx; font-weight: 900; text-align: center; }
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
.hero-title { margin-top: 22rpx; font-size: 42rpx; font-weight: 900; line-height: 1.25; }
.hero-desc { margin-top: 14rpx; color: rgba(255, 250, 242, 0.76); font-size: 25rpx; line-height: 1.65; }
.status-tabs {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12rpx;
  margin-top: 22rpx;
}
.status-tab {
  min-height: 78rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  border: 1rpx solid rgba(199, 181, 157, 0.58);
  border-radius: 18rpx;
  background: rgba(255, 252, 246, 0.86);
  color: #5b2f24;
  font-size: 24rpx;
  font-weight: 900;
}
.status-tab.active { background: #214b4e; color: #fffaf2; border-color: #214b4e; }
.status-count {
  min-width: 34rpx;
  padding: 2rpx 8rpx;
  border-radius: 999rpx;
  background: rgba(196, 61, 61, 0.12);
  color: #c43d3d;
  font-size: 21rpx;
  text-align: center;
}
.status-tab.active .status-count { background: rgba(255, 250, 242, 0.18); color: #fffaf2; }
.post-card, .empty-card {
  margin-top: 18rpx;
  padding: 24rpx;
  border: 1rpx solid rgba(199, 181, 157, 0.58);
  border-radius: 24rpx;
  background: rgba(255, 252, 246, 0.96);
  box-shadow: 0 12rpx 34rpx rgba(72, 55, 38, 0.08);
}
.post-head, .post-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
  flex-wrap: wrap;
}
.status-pill {
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  background: #fff7ed;
  color: #c2410c;
  font-size: 22rpx;
  font-weight: 900;
}
.status-pill.approved { background: #ecfdf5; color: #047857; }
.status-pill.rejected { background: #fef2f2; color: #b42318; }
.post-date, .post-meta { color: #8f8172; font-size: 23rpx; }
.post-cover {
  width: 100%;
  height: 280rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 18rpx;
  border-radius: 20rpx;
  background: #efe3d2;
  color: #8b4a3e;
  font-size: 38rpx;
  font-weight: 900;
}
.post-title { margin-top: 18rpx; color: #263d3c; font-size: 30rpx; font-weight: 900; line-height: 1.45; }
.post-content {
  display: -webkit-box;
  overflow: hidden;
  margin-top: 10rpx;
  color: #5f574f;
  font-size: 25rpx;
  line-height: 1.65;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
.post-meta { justify-content: flex-start; margin-top: 14rpx; }
.review-remark {
  margin-top: 14rpx;
  padding: 14rpx 16rpx;
  border-radius: 16rpx;
  background: #fef2f2;
  color: #b42318;
  font-size: 24rpx;
  line-height: 1.55;
}
.post-action { margin-top: 16rpx; color: #c43d3d; font-size: 25rpx; font-weight: 900; }
.empty-card { padding: 48rpx 28rpx; text-align: center; }
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
  font-weight: 900;
}
.empty-title { margin-top: 18rpx; color: #263d3c; font-size: 30rpx; font-weight: 900; }
.empty-desc { margin-top: 8rpx; color: #8f8172; font-size: 24rpx; line-height: 1.6; }
.primary-action {
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 24rpx;
  border-radius: 999rpx;
  background: #c43d3d;
  color: #fffaf2;
  font-size: 27rpx;
  font-weight: 900;
}
.fixed-action {
  position: fixed;
  left: 32rpx;
  right: 32rpx;
  bottom: 108rpx;
  z-index: 20;
  box-shadow: 0 14rpx 36rpx rgba(196, 61, 61, 0.24);
}
</style>
