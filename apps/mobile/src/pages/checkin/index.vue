<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import MobileShell from "../../components/layout/MobileShell.vue";
import ChallengeCard from "../../components/checkin/ChallengeCard.vue";
import IconGlyph from "../../components/ui/IconGlyph.vue";
import { mockChallenges } from "../../mock/challenge";
import { mobileTabRoute } from "../../mobile-tab-routes";
import { withTenantCode } from "../../api";
import { getChallengeProgress } from "../../mock/challenge-flow";
import type { Challenge } from "../../types/challenge";
import "../../styles/tokens.css";

const mode = ref<"challenges" | "records">("challenges");
const challengeCards = ref<Challenge[]>([]);
const challengeStorageKey = (id: number) => `manpi-demo-challenge-${id}`;
function readChallengeProgress(id: number, total: number) {
  const raw = uni.getStorageSync(challengeStorageKey(id));
  const progress = raw && Array.isArray(raw.completedTaskIds) ? raw : { completedTaskIds: [] };
  return getChallengeProgress(progress, total);
}
function refreshChallengeCards() {
  challengeCards.value = mockChallenges.map((challenge) => {
    const progress = readChallengeProgress(challenge.id, challenge.tasks?.length || challenge.checkpointCount);
    return { ...challenge, progress: progress.completed, status: progress.status, checkpointCount: progress.total };
  });
}
function openChallenge(id: number) { uni.navigateTo({ url: `/pages/checkin/detail?id=${id}` }); }
function selectTab(tab: "home" | "checkin" | "messages" | "me" | "publish") {
  if (tab === "home") uni.reLaunch({ url: withTenantCode(mobileTabRoute("home")) });
  if (tab === "messages") uni.reLaunch({ url: withTenantCode(mobileTabRoute("messages")) });
  if (tab === "me") uni.reLaunch({ url: withTenantCode(mobileTabRoute("me")) });
  if (tab === "publish") return;
}
onShow(refreshChallengeCards);
</script>

<template>
  <MobileShell active-tab="checkin" @tab="selectTab">
    <view class="checkin-page">
      <view class="topline">
        <view><b>打卡挑战</b><small>把一次出发，变成自己的记录</small></view>
        <view class="record-toggle" :class="{ active: mode === 'records' }" @click="mode = mode === 'challenges' ? 'records' : 'challenges'"><text>{{ mode === 'challenges' ? '我的记录' : '挑战列表' }}</text><IconGlyph name="calendar" :size="14" /></view>
      </view>
      <view class="demo-note"><IconGlyph name="calendar" :size="15" label="演示任务" /><text>当前为本地演示任务，完成进度会保存在当前设备</text></view>
      <view v-if="mode === 'records'" class="records">
        <view class="record-empty"><IconGlyph name="calendar" :size="30" label="暂无记录" /><b>暂无真实打卡记录</b><small>完成报名、签到后，活动记录会出现在这里。</small></view>
      </view>
      <template v-else>
        <view class="challenge-cover"><image :src="challengeCards[0]?.cover || mockChallenges[0].cover" mode="aspectFill" /><view><small>慢π · 一起去挑战</small><b>把每一次出发，走成自己的路线</b></view></view>
        <ChallengeCard v-for="challenge in challengeCards" :key="challenge.id" :challenge="challenge" @open="openChallenge" />
      </template>
    </view>
  </MobileShell>
</template>

<style scoped>
@import "../../styles/tokens.css";
.checkin-page{min-height:100vh;background:var(--mp-bg-page);font-family:var(--mp-font-family)}.topline{display:flex;align-items:center;justify-content:space-between;padding:22px 18px 14px;background:#effcf7}.topline b,.topline small{display:block}.topline b{font-size:22px}.topline small{margin-top:4px;color:var(--mp-text-muted);font-size:11px}.record-toggle{display:flex;align-items:center;gap:5px;min-height:44px;color:#2c7a5d;font-size:12px}.record-toggle.active{font-weight:700}.challenge-cover{position:relative;height:170px;margin:0 14px 12px;overflow:hidden;border-radius:16px;background:#c7faed}.challenge-cover image{display:block;width:100%;height:100%;object-fit:cover}.challenge-cover view{position:absolute;right:18px;bottom:18px;left:18px;color:#fff;text-shadow:0 2px 8px #0005}.challenge-cover small,.challenge-cover b{display:block}.challenge-cover b{max-width:230px;margin-top:4px;font-size:20px}.records{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:0 14px;padding:14px;border-radius:16px;background:#fff}.score{padding:10px 12px;border-radius:12px;background:#f3fbf7}.score b,.score small{display:block}.score b{font-size:24px;color:#16a86c}.score small{margin-top:3px;color:#83928a;font-size:11px}.progress{grid-column:1/-1;padding-top:7px}.progress>view{display:flex;justify-content:space-between;font-size:12px}.progress b{color:#13a86a}.progress>i{display:block;height:8px;margin:10px 0 7px;border-radius:8px;background:#e7f0eb}.progress em{display:block;width:0;height:100%;border-radius:inherit;background:#18e789}.progress>small{color:#9ba8a0;font-size:11px}
.demo-note{display:flex;align-items:center;gap:6px;margin:10px 14px;padding:9px 11px;border-radius:10px;background:#f3eee5;color:#8a6847;font-size:11px}.record-empty{display:grid;grid-column:1/-1;justify-items:center;gap:8px;padding:48px 18px;color:var(--mp-brand-primary);text-align:center}.record-empty b{color:var(--mp-text-primary);font-size:14px}.record-empty small{color:var(--mp-text-muted);font-size:11px}
</style>
