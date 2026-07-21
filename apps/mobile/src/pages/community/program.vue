<template>
  <view class="container program-page">
    <view class="custom-nav">
      <view class="nav-back" role="button" aria-label="返回" @click="goBack">返回</view>
      <text class="nav-title">共学计划</text>
      <view class="nav-action" role="button" aria-label="刷新共学计划" @click="load">刷新</view>
    </view>

    <view v-if="loading" class="card state-card" aria-live="polite">共学计划加载中...</view>
    <view v-else-if="loadError" class="card state-card error-state" aria-live="assertive">
      <text>{{ loadError }}</text>
      <view class="button secondary block" role="button" aria-label="重新加载共学计划" @click="load">重新加载</view>
    </view>

    <template v-else-if="program">
      <view class="hero">
        <text class="kicker">{{ program.activity.status === "published" ? "进行中" : "共学计划" }}</text>
        <text class="title">{{ program.activity.title }}</text>
        <text class="meta">{{ formatTime(program.activity.startTime) }} 至 {{ formatTime(program.activity.endTime) }}</text>
        <text v-if="program.activity.location" class="meta">{{ program.activity.location }}</text>
        <text v-if="program.activity.description" class="desc">{{ program.activity.description }}</text>
      </view>

      <view v-if="actionError" class="card action-error" aria-live="assertive">
        <text>{{ actionError }}</text>
      </view>

      <view v-if="canApply" class="card join-card">
        <text class="section-title">加入共学</text>
        <text class="subtle">{{ joinHint }}</text>
        <text v-if="program.membership?.status === 'rejected' && program.membership.reviewRemark" class="review-remark">
          上次申请未通过：{{ program.membership.reviewRemark }}
        </text>
        <input
          v-if="program.activity.joinMode === 'invite'"
          v-model="joinForm.inviteCode"
          class="input"
          maxlength="64"
          confirm-type="done"
          aria-label="共学邀请码"
          placeholder="请输入邀请码"
        />
        <textarea
          v-if="program.activity.joinMode === 'approval'"
          v-model="joinForm.applyRemark"
          class="textarea"
          maxlength="500"
          aria-label="共学申请说明"
          placeholder="填写申请说明"
        />
        <view
          class="button block"
          :class="{ disabled: operationBusy }"
          role="button"
          :aria-label="activeAction === 'join' ? '正在提交共学申请' : '申请加入共学'"
          @click="joinProgram"
        >{{ activeAction === "join" ? "提交中..." : "申请加入" }}</view>
      </view>

      <view v-else-if="program.membership?.status === 'pending'" class="card state-card">
        <text class="section-title">加入申请等待审核</text>
        <text class="subtle">审核结果会在本页更新。</text>
      </view>

      <template v-else-if="program.membership?.status === 'joined'">
        <view class="stats" aria-label="共学打卡统计">
          <view><strong>{{ program.streak.current }}</strong><text>当前连续</text></view>
          <view><strong>{{ program.streak.longest }}</strong><text>最长连续</text></view>
          <view><strong>{{ program.streak.total }}</strong><text>累计打卡</text></view>
        </view>

        <view v-if="!program.tasks.length" class="card state-card">
          <text class="section-title">暂无打卡任务</text>
          <text class="subtle">任务发布后会显示在这里。</text>
        </view>

        <view v-for="task in program.tasks" :key="task.id" class="card task-card">
          <view class="task-head">
            <view class="task-heading">
              <text class="section-title">{{ task.title }}</text>
              <text class="subtle">{{ task.date }} · {{ typeText(task.checkinType) }}</text>
            </view>
            <text class="status" :class="statusClass(task)">{{ taskStatus(task) }}</text>
          </view>
          <text v-if="task.description" class="task-desc">{{ task.description }}</text>
          <text v-if="existing(task.id)?.status === 'rejected' && existing(task.id)?.reviewRemark" class="review-remark">
            驳回原因：{{ existing(task.id)?.reviewRemark }}
          </text>

          <textarea
            v-if="['text', 'question'].includes(task.checkinType) && canEditTask(task)"
            v-model="answers[task.id].content"
            class="textarea"
            maxlength="5000"
            :aria-label="`${task.title}打卡内容`"
            placeholder="填写打卡内容"
          />

          <view v-if="task.checkinType === 'image' && canEditTask(task)" class="task-action-group">
            <image
              v-if="answers[task.id].images.length"
              class="checkin-image"
              :src="answers[task.id].images[0]"
              mode="aspectFill"
              :aria-label="`${task.title}已选图片`"
              @click="previewTaskImage(task.id)"
            />
            <view
              class="button secondary block"
              :class="{ disabled: operationBusy }"
              role="button"
              :aria-label="`${answers[task.id].images.length ? '更换' : '选择'}${task.title}打卡图片`"
              @click="chooseImage(task.id)"
            >{{ activeAction === `image:${task.id}` ? "上传中..." : answers[task.id].images.length ? "更换图片" : "选择图片" }}</view>
          </view>

          <view
            v-if="task.checkinType === 'location' && canEditTask(task)"
            class="button secondary block"
            :class="{ disabled: operationBusy }"
            role="button"
            :aria-label="`${task.title}${answers[task.id].locationName ? '重新选择位置' : '获取位置'}`"
            @click="chooseLocation(task.id)"
          >{{ activeAction === `location:${task.id}` ? "定位中..." : answers[task.id].locationName || "获取位置" }}</view>

          <view
            v-if="canEditTask(task)"
            class="button block"
            :class="{ disabled: operationBusy || !taskCanSubmit(task) }"
            role="button"
            :aria-label="`${task.title}${existing(task.id)?.status === 'rejected' ? '重新提交' : task.date < today ? '补卡' : '提交打卡'}`"
            @click="submitCheckin(task)"
          >{{ activeAction === `checkin:${task.id}` ? "提交中..." : existing(task.id)?.status === "rejected" ? "重新提交" : task.date < today ? "提交补卡" : "提交打卡" }}</view>
        </view>
      </template>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, getCurrentTenantCode, request, uploadCommunityPostImage } from "../../api";
import { guardCurrentPageFeature, loadFeatureGates } from "../../feature-gates";
import { reviewSafeText } from "../../review-safe-text";
import { createTenantLoadGuard } from "../../tenant-load-guard";

type TaskAnswer = { content: string; images: string[]; locationName: string; latitude: number | null; longitude: number | null };

const loading = ref(false);
const loadError = ref("");
const actionError = ref("");
const activeAction = ref("");
const program = ref<any>();
const activityId = ref(0);
const loadedContextKey = ref("");
const joinForm = reactive({ inviteCode: "", applyRemark: "" });
const answers = reactive<Record<number, TaskAnswer>>({});
const loadGuard = createTenantLoadGuard();
const today = computed(() => localDateString());
const operationBusy = computed(() => Boolean(activeAction.value));
const canApply = computed(() => !program.value?.membership || ["rejected", "withdrawn", "removed"].includes(program.value.membership.status));
const joinHint = computed(() => {
  if (program.value?.activity.joinMode === "approval") return "提交后由运营审核";
  if (program.value?.activity.joinMode === "invite") return "使用主办方提供的邀请码加入";
  return "可直接加入共学";
});

function localDateString() {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" });
  return formatter.format(new Date());
}

function routeActivityId() {
  const pages = getCurrentPages();
  return Number((pages[pages.length - 1] as any)?.options?.id || 0);
}

function contextKey(id = activityId.value) {
  return `${getCurrentTenantCode()}:${id}`;
}

function resetDrafts() {
  joinForm.inviteCode = "";
  joinForm.applyRemark = "";
  for (const key of Object.keys(answers)) delete answers[Number(key)];
}

function ensureTaskAnswer(taskId: number, existingCheckin?: any) {
  if (!answers[taskId]) {
    answers[taskId] = {
      content: existingCheckin?.status === "rejected" ? String(existingCheckin.content || "") : "",
      images: existingCheckin?.status === "rejected" && Array.isArray(existingCheckin.images) ? [...existingCheckin.images] : [],
      locationName: existingCheckin?.status === "rejected" ? String(existingCheckin.locationName || "") : "",
      latitude: existingCheckin?.status === "rejected" && Number.isFinite(Number(existingCheckin.latitude)) ? Number(existingCheckin.latitude) : null,
      longitude: existingCheckin?.status === "rejected" && Number.isFinite(Number(existingCheckin.longitude)) ? Number(existingCheckin.longitude) : null
    };
  }
}

async function load() {
  const nextActivityId = routeActivityId();
  const token = loadGuard.begin();
  const nextContextKey = `${token.tenantCode}:${nextActivityId}`;
  if (loadedContextKey.value && loadedContextKey.value !== nextContextKey) resetDrafts();
  activityId.value = nextActivityId;
  loadedContextKey.value = nextContextKey;
  loading.value = true;
  loadError.value = "";
  actionError.value = "";
  program.value = undefined;
  if (!nextActivityId) {
    loadError.value = "共学活动参数无效";
    loading.value = false;
    return;
  }
  try {
    await ensureUser();
    const result = await request<any>(`/public/community/activities/${nextActivityId}/program`);
    if (!loadGuard.isCurrent(token) || activityId.value !== nextActivityId) return;
    result.tasks = Array.isArray(result?.tasks) ? result.tasks : [];
    result.checkins = Array.isArray(result?.checkins) ? result.checkins : [];
    result.streak = result?.streak || { current: 0, longest: 0, total: 0 };
    program.value = result;
    for (const task of result.tasks) ensureTaskAnswer(task.id, result.checkins.find((item: any) => item.taskId === task.id));
  } catch (error: any) {
    if (loadGuard.isCurrent(token)) loadError.value = reviewSafeText(error?.message || "共学计划加载失败");
  } finally {
    if (loadGuard.isCurrent(token)) loading.value = false;
  }
}

async function joinProgram() {
  if (operationBusy.value || !program.value || loadError.value) return;
  if (program.value.activity.joinMode === "invite" && !joinForm.inviteCode.trim()) {
    actionError.value = "请输入共学邀请码";
    return;
  }
  const requestedContext = contextKey();
  activeAction.value = "join";
  actionError.value = "";
  try {
    await request(`/public/community/activities/${activityId.value}/join`, { method: "POST", data: { ...joinForm } });
    if (contextKey() !== requestedContext) return;
    await load();
    if (contextKey() === requestedContext) uni.showToast({ title: "申请已提交", icon: "none" });
  } catch (error: any) {
    if (contextKey() === requestedContext) actionError.value = reviewSafeText(error?.message || "加入失败");
  } finally {
    if (contextKey() === requestedContext) activeAction.value = "";
  }
}

function existing(taskId: number) {
  return (program.value?.checkins || []).find((item: any) => item.taskId === taskId);
}

function canEditTask(task: any) {
  const row = existing(task.id);
  return !row || row.status === "rejected";
}

function taskCanSubmit(task: any) {
  if (operationBusy.value) return false;
  if (existing(task.id)?.status === "rejected") return true;
  if (task.date > today.value) return false;
  if (task.date < today.value && !task.allowMakeup) return false;
  return true;
}

function taskStatus(task: any) {
  const row = existing(task.id);
  if (row?.status === "pending") return "待审核";
  if (row?.status === "approved") return "已完成";
  if (row?.status === "rejected") return "需修改";
  if (task.date > today.value) return "未开始";
  if (task.date < today.value) return task.allowMakeup ? "可补卡" : "已过期";
  return "待打卡";
}

function statusClass(task: any) {
  const status = existing(task.id)?.status;
  return { success: status === "approved", warning: status === "pending", danger: status === "rejected" };
}

function validateAnswer(task: any) {
  const answer = answers[task.id];
  if (["text", "question"].includes(task.checkinType) && answer.content.trim().length < 2) return "请填写至少 2 个字的打卡内容";
  if (task.checkinType === "image" && !answer.images.length) return "请先选择打卡图片";
  if (task.checkinType === "location" && (!Number.isFinite(answer.latitude) || !Number.isFinite(answer.longitude))) return "请先获取打卡位置";
  return "";
}

async function submitCheckin(task: any) {
  if (!taskCanSubmit(task) || operationBusy.value) return;
  const validationError = validateAnswer(task);
  if (validationError) {
    actionError.value = validationError;
    return;
  }
  const requestedContext = contextKey();
  activeAction.value = `checkin:${task.id}`;
  actionError.value = "";
  try {
    await request(`/public/community/activities/${activityId.value}/checkins`, {
      method: "POST",
      data: { taskId: task.id, date: task.date, ...answers[task.id] }
    });
    if (contextKey() !== requestedContext) return;
    await load();
    if (contextKey() === requestedContext) uni.showToast({ title: "打卡已提交", icon: "success" });
  } catch (error: any) {
    if (contextKey() === requestedContext) actionError.value = reviewSafeText(error?.message || "打卡失败");
  } finally {
    if (contextKey() === requestedContext) activeAction.value = "";
  }
}

async function chooseImage(taskId: number) {
  if (operationBusy.value) return;
  const requestedContext = contextKey();
  activeAction.value = `image:${taskId}`;
  actionError.value = "";
  try {
    const result = await new Promise<UniApp.ChooseImageSuccessCallbackResult>((resolve, reject) => {
      uni.chooseImage({ count: 1, sizeType: ["compressed"], sourceType: ["album", "camera"], success: resolve, fail: reject });
    });
    const uploaded = await uploadCommunityPostImage(result.tempFilePaths[0]);
    if (contextKey() === requestedContext && answers[taskId] && uploaded.url) answers[taskId].images = [uploaded.url];
  } catch (error: any) {
    const message = String(error?.errMsg || error?.message || "");
    if (contextKey() === requestedContext && !message.includes("cancel")) actionError.value = reviewSafeText(error?.message || "图片上传失败");
  } finally {
    if (contextKey() === requestedContext) activeAction.value = "";
  }
}

async function chooseLocation(taskId: number) {
  if (operationBusy.value) return;
  const requestedContext = contextKey();
  activeAction.value = `location:${taskId}`;
  actionError.value = "";
  try {
    const result = await new Promise<UniApp.ChooseLocationSuccessCallbackResult>((resolve, reject) => {
      uni.chooseLocation({ success: resolve, fail: reject });
    });
    if (contextKey() === requestedContext && answers[taskId]) {
      Object.assign(answers[taskId], { locationName: result.name || result.address, latitude: result.latitude, longitude: result.longitude });
    }
  } catch (error: any) {
    const message = String(error?.errMsg || error?.message || "");
    if (contextKey() === requestedContext && !message.includes("cancel")) actionError.value = reviewSafeText(error?.message || "位置获取失败");
  } finally {
    if (contextKey() === requestedContext) activeAction.value = "";
  }
}

function previewTaskImage(taskId: number) {
  const urls = answers[taskId]?.images || [];
  if (urls.length) uni.previewImage({ urls, current: urls[0] });
}

function typeText(value: string) {
  return ({ text: "文字打卡", image: "图片打卡", question: "问答打卡", location: "位置打卡" } as Record<string, string>)[value] || "打卡";
}

function formatTime(value: string) {
  if (!value) return "未设置";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace("T", " ").slice(0, 16);
  const parts = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || "";
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}`;
}

function goBack() {
  uni.navigateBack();
}

onShow(async () => {
  await loadFeatureGates(true);
  if (!guardCurrentPageFeature()) return;
  await load();
});
</script>

<style scoped>
.program-page { min-height:100vh; box-sizing:border-box; padding-bottom:calc(48rpx + env(safe-area-inset-bottom)); background:#f7f3ec; }
.custom-nav { display:flex; align-items:center; padding:18rpx 0; }
.nav-back,.nav-action { width:120rpx; min-height:58rpx; display:flex; align-items:center; color:#4a6b8a; font-weight:800; }
.nav-action { justify-content:flex-end; }
.nav-title { flex:1; text-align:center; font-weight:800; }
.hero,.card { margin-top:18rpx; padding:28rpx; border:1rpx solid #dfd2c1; border-radius:16rpx; background:#fff; overflow-wrap:anywhere; }
.hero { background:#214b4e; color:#fff; }
.kicker,.title,.meta,.desc,.section-title,.subtle,.status,.task-desc,.review-remark { display:block; }
.title { margin-top:12rpx; font-size:38rpx; font-weight:800; line-height:1.35; }
.meta,.desc,.subtle,.task-desc { margin-top:10rpx; line-height:1.6; color:#817568; }
.hero .meta,.hero .desc { color:#e7ddd0; }
.section-title { font-size:29rpx; font-weight:800; }
.input,.textarea { width:100%; box-sizing:border-box; margin-top:18rpx; padding:18rpx; border:1rpx solid #d8c9b7; border-radius:12rpx; background:#fff; }
.textarea { min-height:160rpx; }
.button { margin-top:18rpx; }
.stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12rpx; margin-top:18rpx; }
.stats view { min-width:0; padding:20rpx 8rpx; text-align:center; background:#fff; border:1rpx solid #e4d9cc; border-radius:14rpx; }
.stats strong,.stats text { display:block; overflow-wrap:anywhere; }
.stats strong { font-size:38rpx; color:#8b4a3e; }
.stats text { font-size:22rpx; color:#817568; }
.task-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16rpx; }
.task-heading { min-width:0; flex:1; }
.status { flex:0 0 auto; color:#5f6f7d; font-size:24rpx; }
.status.success { color:#2f7d45; }
.status.warning { color:#9b650f; }
.status.danger { color:#b42318; }
.state-card { text-align:center; line-height:1.6; }
.error-state,.action-error { color:#b42318; background:#fff4f2; border-color:#f0b8b0; }
.review-remark { margin-top:14rpx; padding:14rpx; border-radius:10rpx; color:#8f2d22; background:#fff4f2; line-height:1.5; }
.task-action-group { margin-top:18rpx; }
.checkin-image { width:100%; height:300rpx; display:block; border-radius:12rpx; background:#f1ece6; }
@media (min-width: 900px) {
  .program-page { max-width:760px; margin:0 auto; }
}
</style>
