<template>
  <view class="container publish-page">
    <view class="custom-nav">
      <view class="nav-back" role="button" tabindex="0" aria-label="返回上一页" @click="goBack" @keyup.enter="goBack" @keyup.space.prevent="goBack">返回</view>
      <view class="nav-title">发布心得</view>
      <view class="nav-action" role="button" tabindex="0" aria-label="刷新可发布活动" @click="loadActivities" @keyup.enter="loadActivities" @keyup.space.prevent="loadActivities">刷新</view>
    </view>

    <view class="card intro-card">
      <text class="title-md">分享一次真实参与</text>
      <text class="subtle intro-copy">选择参加过的活动，上传现场照片和心得。提交后由后台审核，通过后会展示在共修动态中。</text>
    </view>

    <view v-if="loading" class="state-card">可发布活动和心得记录加载中...</view>
    <view v-else-if="loadError" class="state-card error-state" role="alert" aria-live="assertive">
      <text>{{ loadError }}</text>
      <view class="state-retry" role="button" tabindex="0" aria-label="重新加载可发布活动" @click="loadActivities" @keyup.enter="loadActivities" @keyup.space.prevent="loadActivities">重新加载</view>
    </view>
    <view v-if="loadWarning" class="state-card warning-state">
      <text>{{ loadWarning }}</text>
      <view class="state-retry" role="button" tabindex="0" aria-label="重新同步发布数据" @click="loadActivities" @keyup.enter="loadActivities" @keyup.space.prevent="loadActivities">重新同步</view>
    </view>

    <view class="card form-card">
      <view class="field">
        <text class="label">关联活动</text>
        <picker :disabled="loading || !!loadError" :range="activityOptions" range-key="title" @change="selectActivity">
          <view class="picker-field">{{ selectedActivity?.title || "请选择已参加活动" }}</view>
        </picker>
        <view v-if="!loading && !loadError && !activities.length" class="eligibility-empty">
          <text class="empty-title">暂时不能发布心得</text>
          <text class="hint">已签到，或活动结束且报名成功/已付款后可发布。你可以先查看活动详情或浏览已公开的共修动态。</text>
          <view class="empty-actions">
            <view v-if="routeActivityId" class="button secondary sm" role="button" tabindex="0" aria-label="查看活动" @click="goActivityDetail" @keyup.enter="goActivityDetail" @keyup.space.prevent="goActivityDetail">查看活动</view>
            <view class="button secondary sm" role="button" tabindex="0" aria-label="查看动态" @click="goCommunity" @keyup.enter="goCommunity" @keyup.space.prevent="goCommunity">查看动态</view>
          </view>
        </view>
      </view>

      <view class="field">
        <text class="label">心得内容</text>
        <textarea v-model="content" class="textarea" maxlength="2000" cursor-spacing="24" aria-label="心得内容" placeholder="写下你的收获、现场感受、推荐理由，至少 10 个字。" />
        <text class="counter">{{ content.length }}/2000</text>
      </view>

      <view class="field">
        <view class="row field-head">
          <text class="label">活动照片</text>
          <text class="hint">{{ images.length }}/9</text>
        </view>
        <view class="image-grid">
          <view v-for="(image, index) in images" :key="image" class="image-tile">
            <image :src="image" mode="aspectFill" @click="previewImage(image)" />
            <text class="remove" @click.stop="removeImage(index)">×</text>
          </view>
          <view v-if="images.length < 9" class="add-image" role="button" tabindex="0" aria-label="添加活动照片" @click="chooseImages" @keyup.enter="chooseImages" @keyup.space.prevent="chooseImages">{{ uploading ? "上传中..." : "+ 添加照片" }}</view>
        </view>
      </view>

      <view class="field">
        <text class="label">城市/标签</text>
        <input v-model="city" class="input" maxlength="80" cursor-spacing="24" aria-label="城市" placeholder="城市，可选" />
        <input v-model="tagsText" class="input" maxlength="200" cursor-spacing="24" aria-label="活动标签" placeholder="标签，用逗号分隔，例如 共修,读书会" />
      </view>

      <view class="button block button-lg" role="button" tabindex="0" :aria-disabled="!canSubmit" :aria-busy="submitting" :class="{ disabled: !canSubmit }" @click="submit" @keyup.enter="submit" @keyup.space.prevent="submit">
        {{ submitting ? "提交中..." : "提交审核" }}
      </view>
    </view>

    <view class="card my-posts">
      <view class="row field-head">
        <text class="title-md">我的心得</text>
        <text class="hint">{{ myPosts.length }} 条</text>
      </view>
      <view v-for="post in myPosts" :key="post.id" class="my-post" role="button" tabindex="0" :aria-label="`查看${post.activity?.title || '活动心得'}`" @click="openMyPost(post)" @keyup.enter="openMyPost(post)" @keyup.space.prevent="openMyPost(post)">
        <text class="status" :class="post.status">{{ statusText(post.status) }}</text>
        <text class="my-post-title">{{ post.activity?.title || "活动心得" }}</text>
        <text class="subtle">{{ post.content }}</text>
        <text class="my-post-action">{{ myPostActionText(post.status) }}</text>
      </view>
      <text v-if="!loading && !loadWarning && !myPosts.length" class="subtle">还没有提交过心得。提交后可在这里查看审核状态。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, request, uploadCommunityPostImage, withTenantCode } from "../../api";
import { queryParam } from "../../query";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { guardCurrentPageFeature, loadFeatureGates } from "../../feature-gates";

const loading = ref(false);
const uploading = ref(false);
const submitting = ref(false);
const loadError = ref("");
const loadWarning = ref("");
const activities = ref<any[]>([]);
const selectedActivityId = ref(0);
const content = ref("");
const images = ref<string[]>([]);
const city = ref("");
const tagsText = ref("");
const myPosts = ref<any[]>([]);
const routeActivityId = ref(0);
const loadGuard = createTenantLoadGuard();

const selectedActivity = computed(() => activities.value.find((item) => item.id === selectedActivityId.value));
const canSubmit = computed(() => !loading.value && !loadError.value && !uploading.value && !submitting.value && !!selectedActivityId.value);
const activityOptions = computed(() => activities.value.map((item) => ({
  ...item,
  title: `${item.title}${item.endTime ? ` · ${String(item.endTime).slice(0, 10)}` : ""}`
})));

function goBack() {
  uni.navigateBack();
}

async function loadActivities() {
  const token = loadGuard.begin();
  loading.value = true;
  loadError.value = "";
  loadWarning.value = "";
  activities.value = [];
  myPosts.value = [];
  selectedActivityId.value = 0;
  try {
    await ensureUser();
    const [rowsResult, postsResult] = await Promise.allSettled([
      request<any[]>("/public/me/community/postable-activities"),
      request<any[]>("/public/me/community/posts")
    ]);
    if (!loadGuard.isCurrent(token)) return;
    if (rowsResult.status === "fulfilled") {
      activities.value = Array.isArray(rowsResult.value) ? rowsResult.value : [];
    } else {
      loadError.value = (rowsResult.reason as any)?.message || "可发布活动加载失败，请重新加载后再提交心得。";
    }
    if (postsResult.status === "fulfilled") {
      myPosts.value = Array.isArray(postsResult.value) ? postsResult.value : [];
    } else {
      loadWarning.value = (postsResult.reason as any)?.message || "我的心得记录同步失败，不影响继续填写。";
    }
    if (routeActivityId.value && activities.value.some((item) => Number(item.id) === routeActivityId.value)) {
      selectedActivityId.value = routeActivityId.value;
    }
    if (!selectedActivityId.value && activities.value.length) selectedActivityId.value = activities.value[0].id;
  } catch (error: any) {
    if (loadGuard.isCurrent(token)) loadError.value = error?.message || "可发布活动加载失败，请重新加载后再提交心得。";
  } finally {
    if (loadGuard.isCurrent(token)) loading.value = false;
  }
}

function loadRouteOptions() {
  const pages = getCurrentPages();
  const options = (pages[pages.length - 1] as any)?.options || {};
  const pageActivityId = Number(options.activityId || 0);
  if (pageActivityId) {
    routeActivityId.value = pageActivityId;
    return;
  }
  // #ifdef H5
  if (typeof window !== "undefined") {
    const hash = window.location.hash || "";
    const queryText = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : window.location.search.slice(1);
    routeActivityId.value = Number(queryParam(queryText, "activityId") || 0);
  }
  // #endif
}

function selectActivity(event: any) {
  const index = Number(event.detail?.value || 0);
  selectedActivityId.value = activityOptions.value[index]?.id || 0;
}

function tags() {
  return tagsText.value.split(/[,，、\s]+/).map((item) => item.trim()).filter(Boolean).slice(0, 6);
}

async function chooseImages() {
  if (uploading.value || submitting.value) return;
  const count = Math.max(9 - images.value.length, 0);
  if (!count) return;
  uploading.value = true;
  try {
    const res = await new Promise<UniApp.ChooseImageSuccessCallbackResult>((resolve, reject) => uni.chooseImage({ count, sizeType: ["compressed"], sourceType: ["album", "camera"], success: resolve, fail: reject }));
    const files = (res.tempFilePaths || []).slice(0, count);
    for (const filePath of files) {
      const uploaded = await uploadCommunityPostImage(filePath);
      if (uploaded.url) images.value.push(uploaded.url);
    }
  } catch (error: any) {
    const message = String(error?.errMsg || "");
    if (!message.includes("cancel")) uni.showToast({ title: error.message || "图片上传失败", icon: "none" });
  } finally {
    uploading.value = false;
  }
}

function removeImage(index: number) {
  images.value.splice(index, 1);
}

function previewImage(current: string) {
  uni.previewImage({ urls: images.value, current });
}

async function submit() {
  if (!canSubmit.value) return;
  if (!selectedActivityId.value) return uni.showToast({ title: "请选择参加过的活动", icon: "none" });
  if (content.value.trim().length < 10) return uni.showToast({ title: "心得至少 10 个字", icon: "none" });
  if (!images.value.length) return uni.showToast({ title: "请至少上传 1 张活动照片", icon: "none" });
  submitting.value = true;
  try {
    await ensureUser();
    const result = await request<any>("/public/community/posts", {
      method: "POST",
      data: {
        activityId: selectedActivityId.value,
        content: content.value.trim(),
        images: images.value,
        city: city.value.trim(),
        tags: tags(),
        posterConfig: { theme: "classic" }
      }
    });
    uni.showToast({ title: result?.message || "已提交审核", icon: "none" });
    content.value = "";
    images.value = [];
    tagsText.value = "";
    await loadActivities();
  } catch (error: any) {
    uni.showToast({ title: error.message || "提交失败", icon: "none" });
  } finally {
    submitting.value = false;
  }
}

function statusText(status: string) {
  if (status === "approved") return "已通过";
  if (status === "rejected") return "已拒绝";
  return "待审核";
}

function myPostActionText(status: string) {
  if (status === "approved") return "查看详情并分享 ›";
  if (status === "rejected") return "可修改后重新提交";
  return "后台审核中";
}

function openMyPost(post: any) {
  if (post?.status !== "approved") return;
  uni.navigateTo({ url: withTenantCode(`/pages/community/detail?id=${post.id}`) });
}

function goActivityDetail() {
  if (!routeActivityId.value) return;
  uni.navigateTo({ url: withTenantCode(`/pages/activity/detail?id=${routeActivityId.value}`) });
}

function goCommunity() {
  uni.navigateTo({ url: withTenantCode("/pages/community/index") });
}

onShow(async () => {
  await loadFeatureGates(true);
  if (!guardCurrentPageFeature()) return;
  loadRouteOptions();
  await loadActivities();
});
</script>

<style scoped>
.publish-page { padding-bottom: 48rpx; }
.custom-nav { display:flex; align-items:center; justify-content:space-between; padding:16rpx 0; }
.nav-back, .nav-action { min-width:104rpx; min-height:58rpx; display:flex; align-items:center; color:#4a6b8a; font-size:27rpx; font-weight:800; }
.nav-action { justify-content:flex-end; }
.nav-title { color:#333; font-size:32rpx; font-weight:900; font-family:"STKaiti","KaiTi",serif; }
.intro-card, .form-card, .my-posts { border-radius:24rpx; box-shadow:0 12rpx 34rpx rgba(91,47,36,0.07); margin-bottom:20rpx; }
.intro-copy { display:block; margin-top:10rpx; line-height:1.6; }
.field { margin-bottom:24rpx; }
.field-head { justify-content:space-between; }
.label { display:block; color:#333; font-size:27rpx; font-weight:900; margin-bottom:12rpx; }
.picker-field, .input, .textarea { box-sizing:border-box; width:100%; border:1rpx solid #e8e0d8; border-radius:18rpx; background:#fffaf3; color:#333; font-size:27rpx; }
.picker-field, .input { min-height:78rpx; padding:0 22rpx; display:flex; align-items:center; }
.textarea { min-height:220rpx; padding:20rpx 22rpx; line-height:1.6; }
.counter, .hint { display:block; margin-top:8rpx; color:#8a94a6; font-size:23rpx; }
.eligibility-empty { display:grid; gap:10rpx; margin-top:14rpx; padding:18rpx; border-radius:18rpx; background:#f8fafc; border:1rpx solid #e5e7eb; }
.empty-title { color:#333; font-size:26rpx; font-weight:900; }
.empty-actions { display:flex; gap:12rpx; flex-wrap:wrap; margin-top:4rpx; }
.empty-actions .button { margin-top:0; }
.image-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:12rpx; }
.image-tile, .add-image { position:relative; height:180rpx; border-radius:18rpx; overflow:hidden; background:#fffaf3; border:1rpx dashed #d6c7b4; }
.image-tile image { width:100%; height:100%; }
.add-image { display:flex; align-items:center; justify-content:center; color:#8b5a2b; font-size:25rpx; font-weight:900; }
.remove { position:absolute; right:8rpx; top:8rpx; width:42rpx; height:42rpx; border-radius:999px; background:rgba(0,0,0,0.55); color:#fff; display:flex; align-items:center; justify-content:center; font-size:32rpx; }
.my-post { padding:18rpx 0; border-bottom:1rpx solid #e8e0d8; display:grid; gap:8rpx; }
.my-post:last-child { border-bottom:0; }
.my-post-title { color:#333; font-size:26rpx; font-weight:900; }
.my-post-action { color:#c43d3d; font-size:23rpx; font-weight:900; }
.status { width:fit-content; padding:5rpx 12rpx; border-radius:999px; background:#fff7ed; color:#c2410c; font-size:22rpx; font-weight:900; }
.status.approved { background:#ecfdf5; color:#047857; }
.status.rejected { background:#fef2f2; color:#b42318; }
.state-card { display:grid; gap:10rpx; margin-bottom:20rpx; padding:22rpx 24rpx; border-radius:8px; background:#fff; color:#667085; font-size:25rpx; line-height:1.55; }
.state-card.error-state { border:1rpx solid #fecaca; background:#fff7f7; color:#b91c1c; }
.state-card.warning-state { border:1rpx solid #fed7aa; background:#fffaf0; color:#9a3412; }
.state-retry { width:max-content; color:#C43D3D; font-weight:900; }
.button.disabled { opacity:.6; pointer-events:none; }
</style>
