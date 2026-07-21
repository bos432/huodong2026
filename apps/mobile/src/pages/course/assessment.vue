<template>
  <view class="container assessment-page">
    <view class="custom-nav">
      <view class="nav-back" @click="goBack">返回</view>
      <text class="nav-title">{{ assessment?.title || "课程考核" }}</text>
      <view class="nav-placeholder" />
    </view>

    <view v-if="loading" class="card state">考核加载中...</view>
    <view v-else-if="error" class="card state error-state">
      <text>{{ error }}</text>
      <view class="button block" @click="load">重试</view>
    </view>

    <template v-else-if="assessment && attempt">
      <view class="summary-card">
        <text class="summary-type">{{ assessment.type === "assignment" ? "课程作业" : "课程测验" }}</text>
        <text class="summary-title">{{ assessment.title }}</text>
        <text class="summary-meta">第 {{ attempt.attemptNo }} 次 · 通过线 {{ assessment.passScore }}%<template v-if="assessment.dueAt"> · 截止 {{ formatTime(assessment.dueAt) }}</template></text>
      </view>

      <view v-for="(question, index) in questions" :key="question.id" class="question-card">
        <view class="question-head"><text>{{ index + 1 }}. {{ question.stem }}</text><text>{{ question.score }}分</text></view>
        <radio-group v-if="question.type === 'single' || question.type === 'boolean'" @change="setSingle(question.id, $event)">
          <label v-for="option in question.options || booleanOptions" :key="option.key" class="option"><radio :value="option.key" :checked="answers[question.id]?.answer?.includes(option.key)" />{{ option.text }}</label>
        </radio-group>
        <checkbox-group v-else-if="question.type === 'multiple'" @change="setMultiple(question.id, $event)">
          <label v-for="option in question.options || []" :key="option.key" class="option"><checkbox :value="option.key" :checked="answers[question.id]?.answer?.includes(option.key)" />{{ option.text }}</label>
        </checkbox-group>
        <textarea v-else v-model="answers[question.id].essayAnswer" class="essay" maxlength="20000" placeholder="请输入你的回答" />
      </view>
      <view class="button block submit" :class="{ disabled: submitting || confirming }" @click="confirmSubmit">{{ submitting ? "提交中..." : confirming ? "确认中..." : "提交考核" }}</view>
    </template>

    <template v-else-if="result">
      <view class="result-card">
        <text class="result-icon">{{ result.status === "passed" ? "通过" : result.status === "pending_review" ? "待批" : result.status === "returned" ? "补交" : "未过" }}</text>
        <text class="result-title">{{ statusText(result.status) }}</text>
        <text class="result-score">当前得分 {{ Number(result.totalScore || 0).toFixed(1) }}</text>
        <text v-if="result.reviewRemark" class="review-remark">老师总评：{{ result.reviewRemark }}</text>
        <view v-if="resultLoadError" class="result-warning">
          <text>{{ resultLoadError }}</text>
          <text class="retry-text" @click="loadResult">重新加载结果详情</text>
        </view>
        <view class="button block" :class="{ disabled: resultDetailLoading }" @click="handleResultAction">{{ resultDetailLoading ? "同步中..." : resultActionText }}</view>
      </view>

      <view v-for="(item, index) in resultQuestions" :key="item.id" class="question-card result-question">
        <view class="question-head"><text>{{ index + 1 }}. {{ item.stem }}</text><text>{{ Number(item.answer?.score || 0).toFixed(1) }}/{{ item.score }}分</text></view>
        <text class="answer-line">我的答案：{{ answerText(item) }}</text>
        <text v-if="item.correctAnswer" class="answer-line standard">标准答案：{{ item.correctAnswer.join("、") }}</text>
        <text v-if="item.answer?.feedback" class="answer-line feedback">老师反馈：{{ item.answer.feedback }}</text>
        <text v-if="item.explanation" class="answer-line">解析：{{ item.explanation }}</text>
      </view>
    </template>

    <view v-else class="card state error-state" role="alert" aria-live="assertive">
      <text>当前考核内容不可用，请返回课程后重试。</text>
      <view class="button block" role="button" tabindex="0" aria-label="重新加载课程考核" @click="load">重新加载</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, request } from "../../api";
import { reviewSafeText } from "../../review-safe-text";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { guardCurrentPageFeature, loadFeatureGates } from "../../feature-gates";

const loading = ref(true);
const submitting = ref(false);
const confirming = ref(false);
const error = ref("");
const assessment = ref<any>();
const attempt = ref<any>();
const questions = ref<any[]>([]);
const result = ref<any>();
const resultQuestions = ref<any[]>([]);
const submittedAttemptId = ref(0);
const resultLoadError = ref("");
const resultDetailLoading = ref(false);
const answers = reactive<Record<number, { answer: string[]; essayAnswer: string }>>({});
const booleanOptions = [{ key: "true", text: "正确" }, { key: "false", text: "错误" }];
const assessmentLoadGuard = createTenantLoadGuard();
const resultLoadGuard = createTenantLoadGuard();
const resultActionText = computed(() => ["failed", "returned"].includes(result.value?.status) ? "再次作答" : "返回课程");

function assessmentId() {
  const pages = getCurrentPages();
  return Number((pages[pages.length - 1] as any)?.options?.id || 0);
}

async function load() {
  const token = assessmentLoadGuard.begin();
  loading.value = true;
  error.value = "";
  assessment.value = null;
  attempt.value = null;
  questions.value = [];
  result.value = null;
  resultQuestions.value = [];
  resultLoadError.value = "";
  submittedAttemptId.value = 0;
  try {
    await ensureUser();
    const data = await request<any>(`/public/course-assessments/${assessmentId()}/start`, { method: "POST", data: {} });
    if (!assessmentLoadGuard.isCurrent(token)) return;
    assessment.value = data.assessment;
    attempt.value = data.attempt;
    questions.value = data.questions || [];
    for (const key of Object.keys(answers)) delete answers[Number(key)];
    for (const question of questions.value) answers[question.id] = { answer: [], essayAnswer: "" };
  } catch (error: any) {
    if (assessmentLoadGuard.isCurrent(token)) error.value = reviewSafeText(error?.message || "无法开始考核");
  } finally {
    if (assessmentLoadGuard.isCurrent(token)) loading.value = false;
  }
}

function setSingle(id: number, event: any) {
  answers[id].answer = [String(event.detail.value)];
}

function setMultiple(id: number, event: any) {
  answers[id].answer = (event.detail.value || []).map(String);
}

function isAnswered(question: any) {
  const row = answers[question.id];
  return question.type === "essay" ? Boolean(row?.essayAnswer?.trim()) : Boolean(row?.answer?.length);
}

function confirmSubmit() {
  if (submitting.value || confirming.value || !attempt.value) return;
  const unanswered = questions.value.filter(question => !isAnswered(question)).length;
  confirming.value = true;
  uni.showModal({
    title: "确认提交考核",
    content: unanswered ? `还有 ${unanswered} 题未作答，提交后本次作答将结束。` : "全部题目已作答，确认提交本次考核？",
    confirmText: "确认提交",
    success: (response) => {
      if (response.confirm) void submit();
      else confirming.value = false;
    },
    fail: () => { confirming.value = false; }
  });
}

async function submit() {
  if (submitting.value || !attempt.value) return;
  submitting.value = true;
  confirming.value = false;
  const attemptId = attempt.value.id;
  try {
    const data = await request<any>(`/public/course-assessment-attempts/${attemptId}/submit`, {
      method: "POST",
      data: { answers: questions.value.map(question => ({ questionId: question.id, answer: answers[question.id].answer, essayAnswer: answers[question.id].essayAnswer })) }
    });
    result.value = data.attempt;
    submittedAttemptId.value = data.attempt.id;
    attempt.value = null;
    uni.showToast({ title: "提交成功", icon: "success" });
    await loadResult();
  } catch (error: any) {
    uni.showToast({ title: reviewSafeText(error?.message || "提交失败"), icon: "none" });
  } finally {
    submitting.value = false;
  }
}

async function loadResult() {
  if (!submittedAttemptId.value || resultDetailLoading.value) return;
  const token = resultLoadGuard.begin();
  const attemptId = submittedAttemptId.value;
  resultDetailLoading.value = true;
  resultLoadError.value = "";
  try {
    const detail = await request<any>(`/public/course-assessment-attempts/${attemptId}`);
    if (!resultLoadGuard.isCurrent(token) || submittedAttemptId.value !== attemptId) return;
    result.value = detail.attempt;
    resultQuestions.value = detail.questions || [];
  } catch (error: any) {
    if (resultLoadGuard.isCurrent(token) && submittedAttemptId.value === attemptId) resultLoadError.value = reviewSafeText(error?.message || "考核已提交，但结果详情同步失败。请重新加载详情，不要重复提交。");
  } finally {
    if (resultLoadGuard.isCurrent(token)) resultDetailLoading.value = false;
  }
}

function handleResultAction() {
  if (resultDetailLoading.value) return;
  if (["failed", "returned"].includes(result.value?.status)) void load();
  else goBack();
}

function answerText(item: any) {
  const value = item.answer?.essayAnswer || item.answer?.answer;
  if (Array.isArray(value)) return value.join("、") || "未作答";
  return String(value || "未作答");
}

function statusText(value: string) {
  if (value === "passed") return "恭喜通过";
  if (value === "pending_review") return "已提交，等待老师批改";
  if (value === "returned") return "老师已退回，请补交";
  return "本次未通过";
}

function formatTime(value: string) {
  return String(value || "").replace("T", " ").slice(0, 16);
}

function goBack() {
  uni.navigateBack();
}

onShow(async () => {
  await loadFeatureGates(true);
  if (!guardCurrentPageFeature()) {
    loading.value = false;
    error.value = "当前机构暂未开放课程学习。";
    return;
  }
  if (submittedAttemptId.value) await loadResult();
  else if (!attempt.value && !result.value) await load();
});
</script>

<style scoped>
.assessment-page { min-height:100vh; padding-bottom:100rpx; background:#f7f3ec; }
.custom-nav { display:flex; align-items:center; padding:18rpx 0; }
.nav-back, .nav-placeholder { width:120rpx; color:#4a6b8a; font-size:28rpx; }
.nav-title { flex:1; text-align:center; font-size:30rpx; font-weight:800; color:#263d3c; }
.summary-card, .question-card, .result-card, .card { margin-top:20rpx; padding:28rpx; border:1rpx solid #dfd2c1; border-radius:8px; background:#fff; }
.summary-type { color:#b84435; font-size:23rpx; }
.summary-title { display:block; margin-top:10rpx; font-size:36rpx; font-weight:800; }
.summary-meta { display:block; margin-top:12rpx; color:#7f7467; font-size:24rpx; }
.question-head { display:flex; justify-content:space-between; gap:16rpx; font-size:28rpx; font-weight:700; line-height:1.6; }
.option { display:flex; align-items:center; gap:12rpx; margin-top:18rpx; padding:18rpx; border-radius:8px; background:#f8f4ed; font-size:27rpx; }
.essay { width:100%; min-height:220rpx; box-sizing:border-box; margin-top:18rpx; padding:18rpx; border:1rpx solid #ddd0bf; border-radius:8px; background:#fbfaf7; }
.submit { margin-top:28rpx; }
.state, .result-card { text-align:center; }
.state .button, .result-card .button { margin-top:24rpx; }
.error-state { border-color:#fecaca; background:#fff7f7; color:#b91c1c; }
.result-icon { display:inline-flex; width:100rpx; height:100rpx; align-items:center; justify-content:center; border-radius:50%; background:#214b4e; color:#fff; font-weight:800; }
.result-title, .result-score { display:block; margin-top:20rpx; }
.result-title { font-size:34rpx; font-weight:800; }
.result-score { color:#7f7467; }
.review-remark, .answer-line { display:block; margin-top:16rpx; line-height:1.65; color:#655c52; }
.result-question { text-align:left; }
.standard { color:#214b4e; }
.feedback { color:#b84435; }
.result-warning { display:grid; gap:8rpx; margin-top:18rpx; padding:16rpx; border-radius:8px; border:1rpx solid #fed7aa; background:#fffaf0; color:#9a3412; font-size:24rpx; line-height:1.55; text-align:left; }
.retry-text { color:#C43D3D; font-weight:900; }
.disabled { opacity:.6; pointer-events:none; }
</style>
