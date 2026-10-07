<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import MobileShell from "../../components/layout/MobileShell.vue";
import IconGlyph from "../../components/ui/IconGlyph.vue";
import { mockChallenges } from "../../mock/challenge";
import { completeChallengeTask, getChallengeProgress } from "../../mock/challenge-flow";
import { mobileTabRoute } from "../../mobile-tab-routes";
import { withTenantCode } from "../../api";
import type { Challenge, ChallengeTask } from "../../types/challenge";
import "../../styles/tokens.css";

const challengeId = ref(0);
const challenge = computed<Challenge | null>(() => mockChallenges.find((item) => item.id === challengeId.value) || null);
const completedTaskIds = ref<string[]>([]);
const loadError = ref("");
const storageKey = computed(() => `manpi-demo-challenge-${challengeId.value}`);
const tasks = computed<ChallengeTask[]>(() => challenge.value?.tasks || []);
const summary = computed(() => getChallengeProgress({ completedTaskIds: completedTaskIds.value }, tasks.value.length));

function loadProgress() {
  loadError.value = "";
  if (!challenge.value) {
    loadError.value = "这个演示挑战不存在或已下线";
    return;
  }
  const stored = uni.getStorageSync(storageKey.value);
  completedTaskIds.value = stored && Array.isArray(stored.completedTaskIds) ? stored.completedTaskIds : [];
}
function isCompleted(taskId: string) { return completedTaskIds.value.includes(taskId); }
function completeTask(taskId: string) {
  const next = completeChallengeTask({ completedTaskIds: completedTaskIds.value }, taskId);
  completedTaskIds.value = next.completedTaskIds;
  uni.setStorageSync(storageKey.value, next);
  uni.showToast({ title: summary.value.status === "completed" ? "挑战完成" : "已记录", icon: "success" });
}
function resetProgress() {
  completedTaskIds.value = [];
  uni.removeStorageSync(storageKey.value);
  uni.showToast({ title: "已重置本地演示", icon: "none" });
}
function goBack() { uni.navigateBack(); }
function selectTab(tab: "home" | "checkin" | "messages" | "me" | "publish") {
  if (tab === "home") uni.reLaunch({ url: withTenantCode(mobileTabRoute("home")) });
  if (tab === "checkin") uni.reLaunch({ url: withTenantCode(mobileTabRoute("checkin")) });
  if (tab === "messages") uni.reLaunch({ url: withTenantCode(mobileTabRoute("messages")) });
  if (tab === "me") uni.reLaunch({ url: withTenantCode(mobileTabRoute("me")) });
}
onLoad((query) => { challengeId.value = Number(query?.id || 0); loadProgress(); });
onShow(loadProgress);
</script>

<template>
  <MobileShell active-tab="checkin" @tab="selectTab">
    <view class="challenge-detail-page">
      <view class="challenge-nav"><view class="nav-action" role="button" tabindex="0" aria-label="返回打卡挑战" @click="goBack" @keyup.enter="goBack">‹</view><text>挑战详情</text><view class="nav-action-placeholder" /></view>
      <view v-if="loadError" class="state-card error"><IconGlyph name="help" :size="30" label="错误" /><text class="state-title">演示挑战不可用</text><text class="state-copy">{{ loadError }}</text><view class="state-button" role="button" tabindex="0" @click="goBack">返回挑战列表</view></view>
      <template v-else-if="challenge">
        <view class="hero"><image :src="challenge.cover" mode="aspectFill" /><view class="hero-shade"><text class="demo-badge">演示挑战</text><text class="hero-title">{{ challenge.title }}</text><text class="hero-copy">当前仅用于体验打卡流程，不会产生真实参与记录。</text></view></view>
        <view class="progress-card"><view><text class="eyebrow">我的演示进度</text><view class="progress-value"><text>{{ summary.completed }}</text><text class="progress-total"> / {{ summary.total }} 个任务</text></view><view class="reset-demo" role="button" tabindex="0" aria-label="重置本地演示进度" @click="resetProgress" @keyup.enter="resetProgress">重置本地演示</view></view><view class="progress-ring" :style="{ '--progress': `${summary.percent}%` }"><text>{{ summary.percent }}%</text></view></view>
        <view class="section"><view class="section-title"><text>按顺序完成任务</text><text class="section-note">完成后会保存在当前设备</text></view><view v-for="(task, index) in tasks" :key="task.id" class="task-row" :class="{ completed: isCompleted(task.id) }"><view class="task-index">{{ isCompleted(task.id) ? "✓" : index + 1 }}</view><view class="task-copy"><text class="task-title">{{ task.title }}</text><text class="task-description">{{ task.description }}</text><text class="task-reward">完成可得：{{ task.reward }}</text></view><view class="task-button" :class="{ done: isCompleted(task.id) }" role="button" tabindex="0" :aria-label="isCompleted(task.id) ? '已完成任务' : `完成任务${index + 1}`" @click="completeTask(task.id)" @keyup.enter="completeTask(task.id)">{{ isCompleted(task.id) ? "已完成" : "完成" }}</view></view></view>
        <view v-if="summary.status === 'completed'" class="complete-card"><IconGlyph name="award" :size="24" label="完成" /><view><text>这次挑战完成了</text><small>这是本地演示记录，后续可接入真实活动签到与回顾。</small></view></view>
      </template>
    </view>
  </MobileShell>
</template>

<style scoped>
@import "../../styles/tokens.css";
.challenge-detail-page{min-height:100vh;padding-bottom:24px;background:var(--mp-bg-page);font-family:var(--mp-font-family)}.challenge-nav{display:flex;align-items:center;justify-content:space-between;height:54px;padding:0 16px;color:var(--mp-text-primary);font-size:16px;font-weight:800}.nav-action{width:32px;font-size:32px;line-height:1;text-align:left}.nav-action-placeholder{width:32px}.hero{position:relative;height:220px;overflow:hidden;margin:0 14px;border-radius:18px;background:#e8ddd0}.hero image{width:100%;height:100%;display:block}.hero-shade{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:20px;background:linear-gradient(transparent 20%,rgba(29,36,48,.78))}.demo-badge{align-self:flex-start;padding:4px 8px;border-radius:6px;background:#f5e4d5;color:#8a5946;font-size:11px}.hero-title{margin-top:8px;color:#fff;font-size:22px;font-weight:800}.hero-copy{margin-top:5px;color:rgba(255,255,255,.82);font-size:11px}.progress-card{display:flex;align-items:center;justify-content:space-between;margin:12px 14px;padding:18px;border-radius:16px;background:#fff;box-shadow:var(--mp-shadow-card)}.eyebrow{display:block;color:var(--mp-text-muted);font-size:11px}.progress-value{display:block;margin-top:7px;color:var(--mp-brand-primary);font-size:30px;font-weight:800}.progress-total{color:var(--mp-text-muted);font-size:13px;font-weight:500}.progress-ring{display:grid;place-items:center;width:62px;height:62px;border-radius:50%;background:conic-gradient(var(--mp-brand-primary) var(--progress),#eee8df 0);color:var(--mp-brand-primary);font-size:13px;font-weight:800}.progress-ring::before{position:absolute;width:48px;height:48px;border-radius:50%;background:#fff;content:""}.progress-ring text{position:relative}.section{margin:0 14px;padding:18px;border-radius:16px;background:#fff}.section-title{display:flex;align-items:baseline;justify-content:space-between;gap:10px}.section-title>text:first-child{font-size:16px;font-weight:800}.section-note{color:var(--mp-text-muted);font-size:10px}.task-row{display:flex;align-items:flex-start;gap:11px;padding:17px 0;border-bottom:1px solid var(--mp-border)}.task-row:last-child{border-bottom:0;padding-bottom:2px}.task-index{display:grid;place-items:center;flex:0 0 auto;width:28px;height:28px;border-radius:50%;background:var(--mp-brand-soft);color:var(--mp-brand-primary);font-size:13px;font-weight:800}.task-row.completed .task-index{background:var(--mp-brand-primary);color:#fff}.task-copy{min-width:0;flex:1}.task-title{display:block;color:var(--mp-text-primary);font-size:14px;font-weight:800}.task-description,.task-reward{display:block;margin-top:5px;color:var(--mp-text-muted);font-size:11px;line-height:1.5}.task-reward{color:#9b7458}.task-button{flex:0 0 auto;min-width:50px;padding:9px 8px;border-radius:9px;background:var(--mp-brand-primary);color:#fff;font-size:11px;text-align:center}.task-button.done{background:#e8eee9;color:#568069}.complete-card{display:flex;align-items:center;gap:10px;margin:12px 14px 0;padding:15px;border-radius:14px;background:#f3ede3;color:var(--mp-brand-primary)}.complete-card text,.complete-card small{display:block}.complete-card text{font-size:14px;font-weight:800}.complete-card small{margin-top:4px;color:var(--mp-text-muted);font-size:11px;line-height:1.4}.state-card{display:grid;justify-items:center;gap:9px;margin:40px 14px;padding:32px 20px;border-radius:16px;background:#fff;text-align:center}.state-card.error{color:var(--mp-brand-primary)}.state-title{color:var(--mp-text-primary);font-size:16px;font-weight:800}.state-copy{color:var(--mp-text-muted);font-size:12px}.state-button{margin-top:6px;padding:10px 16px;border-radius:9px;background:var(--mp-brand-primary);color:#fff;font-size:12px}
</style>
<style scoped>
.reset-demo{display:inline-flex;align-items:center;min-height:30px;margin-top:4px;color:var(--mp-brand-primary-dark);font-size:10px;text-decoration:underline;text-underline-offset:3px}
</style>
