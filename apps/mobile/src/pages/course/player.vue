<template>
  <view class="container course-player-page">
    <view class="custom-nav">
      <view class="nav-back" role="button" tabindex="0" aria-label="返回上一页" @click="goBack" @keyup.enter="goBack" @keyup.space.prevent="goBack">‹ 返回</view>
      <text class="nav-title">{{ courseTitle }}</text>
      <view class="nav-more" role="button" tabindex="0" aria-label="打开课程更多操作" @click="showMore" @keyup.enter="showMore" @keyup.space.prevent="showMore">⋯</view>
    </view>

    <view v-if="loading" class="card subtle">加载中...</view>
    <view v-else-if="error" class="card state-card" role="alert" aria-live="assertive">
      <view>{{ error }}</view>
      <view class="state-actions">
        <view class="button block state-button" role="button" tabindex="0" aria-label="重新加载课程播放器" @click="loadCourse" @keyup.enter="loadCourse" @keyup.space.prevent="loadCourse">重新加载</view>
        <view class="button secondary block state-button" role="button" tabindex="0" aria-label="返回课程详情" @click="goDetail" @keyup.enter="goDetail" @keyup.space.prevent="goDetail">返回内容详情</view>
      </view>
    </view>

    <template v-else>
    <view v-if="interactionWarning" class="card interaction-warning">
      <view>{{ interactionWarning }}</view>
      <view class="warning-retry" role="button" tabindex="0" aria-label="重新同步课程内容" @click="loadCourse" @keyup.enter="loadCourse" @keyup.space.prevent="loadCourse">重新同步</view>
    </view>
    <view v-if="interactionActionError" class="card interaction-error" role="alert" aria-live="assertive">{{ interactionActionError }}</view>
    <view class="player-hero">
      <view class="player-kicker">内容播放</view>
      <video v-if="currentLesson?.contentType === 'video' && currentLesson?.videoUrl" class="lesson-video" :src="safeResourceUrl(currentLesson.videoUrl)" controls @timeupdate="handleMediaProgress" @ended="markProgress(100)" />
      <video v-else-if="currentLesson?.contentType === 'audio' && currentLesson?.audioUrl" class="lesson-audio" :src="safeResourceUrl(currentLesson.audioUrl)" controls @timeupdate="handleMediaProgress" @ended="markProgress(100)" />
      <view v-else class="player-scroll-icon">{{ currentLesson?.contentType === 'article' ? '文' : currentLesson?.contentType === 'attachment' ? '件' : '播' }}</view>
      <view v-if="currentLesson?.contentType === 'video' && !currentLesson?.videoUrl" class="resource-empty">视频资源尚未配置</view>
      <view v-if="currentLesson?.contentType === 'audio' && !currentLesson?.audioUrl" class="resource-empty">音频资源尚未配置</view>
      <view class="player-progress">
        <view class="player-progress-track">
          <view class="player-progress-fill" :style="{ width: currentProgress + '%' }"></view>
        </view>
        <view class="progress-meta">
          <text>已学 {{ currentProgress }}%</text>
          <text>{{ currentLesson?.duration || "-" }}</text>
        </view>
      </view>
    </view>
    <view class="player-controls player-controls-outside">
      <view class="player-btn" tabindex="0" :class="{ disabled: currentLessonIndex <= 0 }" role="button" aria-label="上一节" @click="goAdjacentLesson(-1)" @keyup.enter="goAdjacentLesson(-1)" @keyup.space.prevent="goAdjacentLesson(-1)">上一节</view>
      <view class="player-btn player-btn-play" tabindex="0" role="button" :aria-label="isMediaLesson ? '打开目录' : '播放图文内容'" @click="runCenterPlayerAction" @keyup.enter="runCenterPlayerAction" @keyup.space.prevent="runCenterPlayerAction">{{ isMediaLesson ? "目录" : "播放" }}</view>
      <view class="player-btn" tabindex="0" :class="{ disabled: currentLessonIndex < 0 || currentLessonIndex >= playableLessons.length - 1 }" role="button" aria-label="下一节" @click="goAdjacentLesson(1)" @keyup.enter="goAdjacentLesson(1)" @keyup.space.prevent="goAdjacentLesson(1)">下一节</view>
    </view>

    <view v-if="currentLesson?.contentType === 'article'" class="lesson-content-card"><text>{{ currentLesson?.content || '本课时暂无图文正文' }}</text></view>
    <view v-if="currentLesson?.contentType === 'attachment'" class="lesson-content-card"><text>{{ currentLesson?.attachmentName || '课程附件' }}</text><view class="button block attachment-button" :class="{ disabled: !currentLesson?.attachmentUrl || attachmentOpening }" role="button" tabindex="0" :aria-label="attachmentOpening ? '附件打开中' : `打开附件 ${currentLesson?.attachmentName || '课程附件'}`" @click="openAttachment" @keyup.enter="openAttachment">{{ attachmentOpening ? "打开中..." : "打开附件" }}</view></view>

    <view class="lesson-card">
      <text class="chapter-title">{{ currentChapterTitle }}</text>
      <text class="lesson-title">{{ currentLessonTitle }}</text>
      <view class="button block complete-button" role="button" tabindex="0" :aria-disabled="savingProgress" :aria-busy="savingProgress" :class="{ disabled: savingProgress }" @click="markProgress(100)" @keyup.enter="markProgress(100)" @keyup.space.prevent="markProgress(100)">{{ savingProgress ? "保存中..." : "标记本小节完成" }}</view>
    </view>

    <view class="button secondary block catalog-toggle" role="button" tabindex="0" :aria-expanded="showCatalog" aria-label="切换课程目录" @click="showCatalog = !showCatalog" @keyup.enter="showCatalog = !showCatalog" @keyup.space.prevent="showCatalog = !showCatalog">
      {{ showCatalog ? '收起目录' : '查看目录' }}
    </view>

    <view v-if="assessments.length" class="catalog-card"><text class="catalog-chapter-title">课程考核</text><view v-for="item in assessments" :key="item.id" class="assessment-row" role="button" tabindex="0" :aria-label="`打开考核${item.title}`" @click="openAssessment(item)" @keyup.enter="openAssessment(item)" @keyup.space.prevent="openAssessment(item)"><view><text class="catalog-lesson-title">{{ item.title }}</text><text class="assessment-meta">{{ item.type === 'assignment' ? '作业' : '测验' }} · 通过线 {{ item.passScore }}% · 最多 {{ item.maxAttempts }} 次</text></view><text class="assessment-status">{{ assessmentStatus(item) }}</text></view></view>

    <view v-if="announcements.length" class="catalog-card"><text class="catalog-chapter-title">课程公告</text><view v-for="item in announcements" :key="item.id" class="interaction-item"><text class="catalog-lesson-title">{{ item.title }}</text><text class="interaction-content">{{ item.content }}</text><text class="assessment-meta">{{ formatTime(item.publishAt || item.createdAt) }}</text></view></view>
    <view class="catalog-card"><view class="interaction-actions"><view class="button secondary" role="button" tabindex="0" :aria-disabled="interactionSubmitting" @click="submitReview" @keyup.enter="submitReview" @keyup.space.prevent="submitReview">{{ interactionSubmitting ? "提交中..." : "评价课程" }}</view><view class="button secondary" role="button" tabindex="0" :aria-disabled="interactionSubmitting" @click="submitQuestion" @keyup.enter="submitQuestion" @keyup.space.prevent="submitQuestion">{{ interactionSubmitting ? "提交中..." : "向老师提问" }}</view></view><view v-for="item in qa" :key="item.id" class="interaction-item"><text class="catalog-lesson-title">{{ item.title }}</text><text class="interaction-content">{{ item.content }}</text><text v-if="item.answer" class="teacher-answer">老师答复：{{ item.answer }}</text><text v-else class="assessment-meta">等待老师答复</text></view></view>

    <view v-if="showCatalog" class="catalog-card">
      <view v-for="(chapter, ci) in chapters" :key="ci" class="chapter-block">
        <text class="catalog-chapter-title">{{ chapter.title }}</text>
        <view v-for="(lesson, li) in chapter.lessons" :key="li" class="catalog-lesson" role="button" tabindex="0" :aria-label="`打开${lesson.title}`" :class="{ active: lesson.id === currentLesson?.id, locked: lesson.locked }" @click="selectLesson(lesson)" @keyup.enter="selectLesson(lesson)" @keyup.space.prevent="selectLesson(lesson)">
          <text class="lesson-status">{{ lesson.locked ? '锁' : '播' }}</text>
          <text class="catalog-lesson-title">{{ lesson.title }}</text>
          <text class="catalog-lesson-meta">{{ lesson.progress ? `${lesson.progress}%` : lesson.duration }}</text>
        </view>
      </view>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { API_BASE } from "../../api-base";
import { ensureUser, getCurrentTenantCode, request, withTenantCode } from "../../api";
import { reviewSafeText } from "../../review-safe-text";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { formatShanghaiDateTime } from "../../tenant-load-guard";

const showCatalog = ref(false);
const loading = ref(true);
const savingProgress = ref(false);
const attachmentOpening = ref(false);
const interactionSubmitting = ref(false);
const error = ref("");
const interactionWarning = ref("");
const interactionActionError = ref("");
const rawCourse = ref<any>();
const selectedLessonId = ref(0);
const lastAutoSavedBucket = ref<Record<number, number>>({});
const assessments = ref<any[]>([]);
const announcements=ref<any[]>([]),qa=ref<any[]>([]);
const loadedContextKey = ref("");
const loadGuard = createTenantLoadGuard();
const chapters = computed(() => (rawCourse.value?.chapters || []).map((chapter: any) => ({
  ...chapter,
  title: reviewSafeText(chapter.title || ""),
  lessons: (chapter.lessons || []).map((lesson: any) => ({ ...lesson, title: reviewSafeText(lesson.title || "") }))
})));
const courseTitle = computed(() => reviewSafeText(rawCourse.value?.title || "内容播放"));
const playableLessons = computed(() => chapters.value.flatMap((chapter: any) => chapter.lessons || []).filter((lesson: any) => !lesson.locked));
const currentLesson = computed(() => playableLessons.value.find((lesson: any) => lesson.id === selectedLessonId.value) || playableLessons.value[0]);
const currentLessonIndex = computed(() => playableLessons.value.findIndex((lesson: any) => lesson.id === currentLesson.value?.id));
const isMediaLesson = computed(() => ["video", "audio"].includes(String(currentLesson.value?.contentType || "")));
const currentChapterTitle = computed(() => chapters.value.find((chapter: any) => (chapter.lessons || []).some((lesson: any) => lesson.id === currentLesson.value?.id))?.title || "内容目录");
const currentLessonTitle = computed(() => currentLesson.value?.title || "暂无可播放小节，请先在后台维护内容目录");
const currentProgress = computed(() => Math.max(0, Math.min(Number(currentLesson.value?.progress || 0), 100)));

function currentCourseId() {
  const pages = getCurrentPages();
  const options = (pages[pages.length - 1] as any)?.options || {};
  return Number(options.id || 0);
}

async function loadCourse() {
  const loadToken = loadGuard.begin();
  const id = currentCourseId();
  const contextKey = `${loadToken.tenantCode}:${id}`;
  const sameContext = loadedContextKey.value === contextKey;
  if (loadedContextKey.value && !sameContext) {
    rawCourse.value = null;
    assessments.value = [];
    announcements.value = [];
    qa.value = [];
  }
  loading.value = true;
  error.value = "";
  interactionWarning.value = "";
  interactionActionError.value = "";
  if (!id) {
    error.value = "缺少内容ID";
    loading.value = false;
    return;
  }
  try {
    await ensureUser();
    const courseData = await request<any>(`/public/courses/${id}/player`);
    if (!loadGuard.isCurrent(loadToken)) return;
    rawCourse.value = courseData;
    const interactionResults = await Promise.allSettled([
      request<any[]>(`/public/courses/${id}/assessments`),
      request<any[]>(`/public/courses/${id}/announcements`),
      request<any[]>(`/public/courses/${id}/qa`)
    ]);
    if (!loadGuard.isCurrent(loadToken)) return;
    if (interactionResults[0].status === "fulfilled") assessments.value = interactionResults[0].value;
    if (interactionResults[1].status === "fulfilled") announcements.value = interactionResults[1].value;
    if (interactionResults[2].status === "fulfilled") qa.value = interactionResults[2].value;
    const failedNames = ["考核", "公告", "答疑"].filter((_, index) => interactionResults[index].status === "rejected");
    if (failedNames.length) interactionWarning.value = `课程已加载，但${failedNames.join("、")}暂未同步，已保留当前可用内容。`;
    if (!rawCourse.value) error.value = "内容不存在或未发布";
    const playableLessons = chapters.value.flatMap((chapter: any) => chapter.lessons || []).filter((lesson: any) => !lesson.locked);
    const pages = getCurrentPages();
    const routeLessonId = Number((pages[pages.length - 1] as any)?.options?.lessonId || 0);
    const preferredLessonId = routeLessonId || Number(rawCourse.value?.recentLessonId || 0);
    selectedLessonId.value = playableLessons.find((lesson: any) => lesson.id === preferredLessonId)?.id || playableLessons[0]?.id || 0;
    lastAutoSavedBucket.value = {};
    loadedContextKey.value = contextKey;
  } catch (err: any) {
    if (!loadGuard.isCurrent(loadToken)) return;
    rawCourse.value = null;
    error.value = reviewSafeText(err.message || "暂时无法进入内容");
  } finally {
    if (loadGuard.isCurrent(loadToken)) loading.value = false;
  }
}

function goBack() { uni.navigateBack(); }
function goDetail() { uni.navigateTo({ url: withTenantCode(`/pages/course/detail?id=${currentCourseId() || 1}`) }); }
function selectLesson(lesson: any) {
  if (lesson.locked) {
    uni.showToast({ title: "该小节需加入后观看", icon: "none" });
    return;
  }
  selectedLessonId.value = lesson.id;
  void markProgress(Number(lesson.progress || 0), { silent: true });
}
function goAdjacentLesson(offset: -1 | 1) {
  const target = playableLessons.value[currentLessonIndex.value + offset];
  if (!target) return;
  selectLesson(target);
}
function runCenterPlayerAction() {
  if (isMediaLesson.value) showCatalog.value = true;
  else void markProgress(60);
}
async function markProgress(progress: number, options: { silent?: boolean } = {}) {
  if (!currentLesson.value || savingProgress.value) return false;
  const tenantCode = getCurrentTenantCode();
  const lessonId = currentLesson.value.id;
  savingProgress.value = true;
  try {
    const result = await request<any>(`/public/courses/${currentCourseId()}/progress`, {
      method: "POST",
      data: { lessonId, progress }
    });
    if (getCurrentTenantCode() !== tenantCode || currentLesson.value?.id !== lessonId) return false;
    currentLesson.value.progress = Math.max(Number(currentLesson.value.progress || 0), Number(result?.lessonLearning?.progress || progress));
    if (!options.silent) uni.showToast({ title: progress >= 100 ? "已完成本小节" : "观看进度已保存", icon: "none" });
    return true;
  } catch (error: any) {
    if (!options.silent) uni.showToast({ title: reviewSafeText(error.message || "保存进度失败"), icon: "none" });
    return false;
  } finally {
    savingProgress.value = false;
  }
}
function handleMediaProgress(event: any) {
  const current = Number(event?.detail?.currentTime || 0);
  const duration = Number(event?.detail?.duration || 0);
  const lessonId = Number(currentLesson.value?.id || 0);
  const bucket = Math.floor(current / 30);
  if (duration <= 0 || !lessonId || bucket <= 0 || Number(lastAutoSavedBucket.value[lessonId] || 0) >= bucket) return;
  lastAutoSavedBucket.value[lessonId] = bucket;
  void markProgress(Math.min(current * 100 / duration, 99), { silent: true }).then((saved) => {
    if (!saved && lastAutoSavedBucket.value[lessonId] === bucket) delete lastAutoSavedBucket.value[lessonId];
  });
}
function safeResourceUrl(value: unknown) {
  const raw = String(value || "").trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  if (!raw.startsWith("/")) return "";
  // #ifdef H5
  if (typeof window !== "undefined") return new URL(raw, window.location.origin).toString();
  // #endif
  const apiOrigin = String(API_BASE).match(/^https?:\/\/[^/]+/i)?.[0] || "";
  if (apiOrigin) return `${apiOrigin}${raw}`;
  return "";
}
function openAttachment() {
  if (attachmentOpening.value) return;
  const url = safeResourceUrl(currentLesson.value?.attachmentUrl);
  if (!url) return uni.showToast({ title:currentLesson.value?.attachmentUrl ? "附件地址无效" : "附件资源尚未配置", icon:"none" });
  attachmentOpening.value = true;
  // #ifdef H5
  if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
  attachmentOpening.value = false;
  // #endif
  // #ifndef H5
  uni.downloadFile({ url, success(result) { if (result.statusCode === 200) uni.openDocument({ filePath: result.tempFilePath, showMenu:true, complete:() => { attachmentOpening.value=false; } }); else { attachmentOpening.value=false; uni.showToast({ title:"附件下载失败", icon:"none" }); } }, fail:() => { attachmentOpening.value=false; uni.showToast({ title:"附件下载失败", icon:"none" }); } });
  // #endif
}
function showMore() {
  uni.showActionSheet({
    itemList: ["查看内容详情", "反馈问题"],
    success(result) {
      if (result.tapIndex === 0) goDetail();
      if (result.tapIndex === 1) uni.navigateTo({ url:"/pages/service/index" });
    }
  });
}
function assessmentStatus(item:any){const latest=(item.attempts||[])[0];if(!latest)return "开始";const labels:any={in_progress:"继续",pending_review:"待批改",passed:"已通过",failed:"再试一次",returned:"待补交"};return labels[latest.status]||latest.status;}
function openAssessment(item:any){uni.navigateTo({url:withTenantCode(`/pages/course/assessment?id=${item.id}&courseId=${currentCourseId()}`)});}
function promptInput(title:string,placeholder:string){return new Promise<string>((resolve,reject)=>uni.showModal({title,editable:true,placeholderText:placeholder,success:r=>r.confirm?resolve(String(r.content||"")):reject(new Error("cancel")),fail:reject}));}
async function submitReview() {
  if (interactionSubmitting.value) return;
  interactionSubmitting.value = true;
  interactionActionError.value = "";
  const tenantCode = getCurrentTenantCode();
  try {
    const score = Number((await promptInput("课程评分", "请输入 1-5")).trim());
    if (!Number.isInteger(score) || score < 1 || score > 5) throw new Error("评分必须是 1-5 的整数");
    const content = (await promptInput("课程评价", "请填写至少 5 个字")).trim();
    if (content.length < 5) throw new Error("课程评价至少填写 5 个字");
    if (getCurrentTenantCode() !== tenantCode) throw new Error("当前城市已切换，请重新提交");
    await request(`/public/courses/${currentCourseId()}/reviews`, { method:"POST", data:{ rating:score, content } });
    uni.showToast({ title:"评价已提交审核", icon:"none" });
  } catch (error: any) {
    if (error?.message !== "cancel") interactionActionError.value = reviewSafeText(error?.message || "评价提交失败");
  } finally { interactionSubmitting.value = false; }
}

async function submitQuestion() {
  if (interactionSubmitting.value) return;
  interactionSubmitting.value = true;
  interactionActionError.value = "";
  const tenantCode = getCurrentTenantCode();
  try {
    const title = (await promptInput("问题标题", "简要描述问题")).trim();
    if (title.length < 2) throw new Error("问题标题至少填写 2 个字");
    const content = (await promptInput("问题描述", "请填写至少 5 个字")).trim();
    if (content.length < 5) throw new Error("问题描述至少填写 5 个字");
    if (getCurrentTenantCode() !== tenantCode) throw new Error("当前城市已切换，请重新提交");
    await request(`/public/courses/${currentCourseId()}/qa`, { method:"POST", data:{ title, content, lessonId:currentLesson.value?.id } });
    const nextQa = await request<any[]>(`/public/courses/${currentCourseId()}/qa`);
    if (getCurrentTenantCode() === tenantCode) qa.value = nextQa;
    uni.showToast({ title:"问题已提交", icon:"none" });
  } catch (error: any) {
    if (error?.message !== "cancel") interactionActionError.value = reviewSafeText(error?.message || "问题提交失败");
  } finally { interactionSubmitting.value = false; }
}
function formatTime(value:string){return formatShanghaiDateTime(value, "");}

onShow(loadCourse);
</script>

<style scoped>
.course-player-page {
  min-height: 100vh;
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  box-sizing: border-box;
  padding: calc(24rpx + env(safe-area-inset-top)) 24rpx calc(32rpx + env(safe-area-inset-bottom));
  overflow-wrap: anywhere;
  background:
    linear-gradient(180deg, #f7efe3 0%, #fbf7ef 38%, #f4eadc 100%);
}

.custom-nav {
  display: flex;
  align-items: center;
  padding: 18rpx 0 20rpx;
}

.nav-back,
.nav-more {
  width: 118rpx;
  color: #4a6b8a;
  font-size: 28rpx;
}

.nav-more {
  text-align: right;
  font-size: 36rpx;
}

.nav-title {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: #263d3c;
  font-size: 29rpx;
  font-weight: 700;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-hero {
  position: relative;
  min-height: 430rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 30rpx;
  background:
    linear-gradient(135deg, rgba(33, 75, 78, 0.96), rgba(129, 55, 48, 0.9)),
    #214b4e;
  color: #fffaf2;
  box-shadow: 0 18rpx 46rpx rgba(36, 60, 60, 0.18);
}

.player-kicker {
  position: absolute;
  top: 26rpx;
  left: 28rpx;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 250, 242, 0.14);
  color: rgba(255, 250, 242, 0.84);
  font-size: 22rpx;
}

.player-scroll-icon {
  width: 126rpx;
  height: 126rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(255, 250, 242, 0.34);
  border-radius: 50%;
  background: rgba(255, 250, 242, 0.12);
  color: #fff7e8;
  font-size: 54rpx;
  font-weight: 800;
}
.interaction-error { border:1rpx solid #fecaca; background:#fff7f7; color:#b91c1c; overflow-wrap:anywhere; }
@media (min-width: 900px) { .course-player-page { max-width:760px; margin:0 auto; } }
.lesson-video { width:100%; height:430rpx; }
.lesson-audio { width:86%; }
.resource-empty { margin-top:18rpx; color:rgba(255,250,242,.72); font-size:24rpx; }
.lesson-content-card { margin-top:24rpx; padding:28rpx; border:1rpx solid rgba(199,181,157,.58); border-radius:24rpx; background:#fff; color:#344947; font-size:28rpx; line-height:1.8; white-space:pre-wrap; overflow-wrap:anywhere; }
.attachment-button { margin-top:22rpx; }

.player-controls {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 30rpx;
}

.player-btn {
  min-width: 112rpx;
  height: 54rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1rpx solid rgba(255, 250, 242, 0.24);
  border-radius: 999rpx;
  color: rgba(255, 250, 242, 0.78);
  font-size: 23rpx;
}

.player-btn-play {
  width: 104rpx;
  height: 104rpx;
  border-color: rgba(255, 250, 242, 0.48);
  background: rgba(255, 250, 242, 0.18);
  color: #fffaf2;
  font-size: 26rpx;
  font-weight: 800;
}

.player-progress {
  position: absolute;
  right: 30rpx;
  bottom: 26rpx;
  left: 30rpx;
}

.player-progress-track {
  height: 8rpx;
  overflow: hidden;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.2);
}

.player-progress-fill {
  height: 100%;
  border-radius: 999rpx;
  background: #e7b867;
}

.progress-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10rpx;
  color: rgba(255, 250, 242, 0.72);
  font-size: 23rpx;
}

.lesson-card,
.catalog-card {
  margin-top: 24rpx;
  padding: 26rpx;
  border: 1rpx solid rgba(199, 181, 157, 0.58);
  border-radius: 24rpx;
  background: rgba(255, 252, 246, 0.96);
  box-shadow: 0 12rpx 34rpx rgba(72, 55, 38, 0.08);
}

.chapter-title {
  display: block;
  color: #8b4a3e;
  font-size: 25rpx;
  font-weight: 700;
}

.lesson-title {
  display: block;
  margin-top: 8rpx;
  color: #263d3c;
  font-size: 34rpx;
  font-weight: 800;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.complete-button {
  margin-top: 24rpx;
}

.catalog-toggle {
  margin-top: 24rpx;
}

.chapter-block + .chapter-block {
  margin-top: 24rpx;
}

.catalog-chapter-title {
  display: block;
  margin-bottom: 10rpx;
  color: #263d3c;
  font-size: 28rpx;
  font-weight: 800;
}

.catalog-lesson {
  display: flex;
  align-items: center;
  gap: 14rpx;
  min-height: 78rpx;
  padding: 14rpx 0;
  border-bottom: 1rpx solid rgba(218, 204, 184, 0.72);
}

.catalog-lesson:last-child {
  border-bottom: 0;
}

.catalog-lesson.active {
  margin: 8rpx -10rpx;
  padding: 16rpx 10rpx;
  border-bottom-color: transparent;
  border-radius: 16rpx;
  background: rgba(184, 68, 53, 0.08);
}

.catalog-lesson.locked {
  opacity: 0.58;
}

.lesson-status {
  width: 42rpx;
  height: 42rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #f1e3d0;
  color: #8b4a3e;
  font-size: 21rpx;
  font-weight: 800;
}

.catalog-lesson.active .lesson-status {
  background: #b84435;
  color: #fffaf2;
}

.catalog-lesson-title {
  min-width: 0;
  flex: 1;
  color: #344947;
  font-size: 26rpx;
  line-height: 1.4;
}

.catalog-lesson-meta {
  flex-shrink: 0;
  color: #8f8172;
  font-size: 23rpx;
}
.player-controls-outside { margin-top: 12rpx; padding: 14rpx 20rpx; border-radius: 20rpx; background: #214b4e; }
.player-btn.disabled { opacity: .45; pointer-events: none; }
.assessment-row { display:flex; align-items:center; justify-content:space-between; gap:18rpx; padding:18rpx 0; border-bottom:1rpx solid rgba(218,204,184,.72); }
.assessment-row:last-child { border-bottom:0; }
.assessment-row > view { min-width:0; flex:1; }
.assessment-meta { display:block; margin-top:6rpx; color:#8f8172; font-size:23rpx; }
.assessment-status { flex-shrink:0; color:#b84435; font-size:25rpx; font-weight:800; }

.state-card {
  margin-top: 24rpx;
  text-align: center;
}
.state-actions { display:grid; gap:12rpx; margin-top:18rpx; }
.interaction-warning { display:flex; align-items:center; justify-content:space-between; gap:16rpx; margin-bottom:18rpx; border-color:#fed7aa; background:#fffaf0; color:#9a3412; }.interaction-warning > view:first-child { min-width:0; overflow-wrap:anywhere; }
.warning-retry { flex:0 0 auto; padding:10rpx 16rpx; border-radius:8px; background:#9a3412; color:#fff; font-size:23rpx; font-weight:900; }

.state-button {
  margin-top: 24rpx;
}
.interaction-actions{display:grid;grid-template-columns:1fr 1fr;gap:16rpx}.interaction-actions .button{margin:0}.interaction-item{padding:20rpx 0;border-bottom:1rpx solid #eadfce}.interaction-item:last-child{border-bottom:0}.interaction-content,.teacher-answer{display:block;margin-top:10rpx;color:#6d6256;font-size:25rpx;line-height:1.65;overflow-wrap:anywhere}.teacher-answer{padding:14rpx;border-radius:12rpx;background:#eef5f2;color:#214b4e}
</style>
