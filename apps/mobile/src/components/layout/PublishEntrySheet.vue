<script setup lang="ts">
import { ref, watch } from "vue";
import type { PublicMemberHostApplicationResponse } from "@activity/shared";
import BaseBottomSheet from "../sheets/BaseBottomSheet.vue";
import { getCurrentTenantCode, getUserToken, request, withTenantCode } from "../../api";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();
const role = ref<"user" | "reviewing" | "host">("user");
const loading = ref(false);
const error = ref("");
const applicationStatus = ref("");
let roleSequence = 0;

async function loadRole() {
  const sequence = ++roleSequence;
  const token = getUserToken();
  const tenantCode = getCurrentTenantCode();
  const current = () => sequence === roleSequence && props.open && token === getUserToken() && tenantCode === getCurrentTenantCode();
  loading.value = true;
  error.value = "";
  role.value = "user";
  applicationStatus.value = "";
  try {
    if (!getUserToken()) {
      role.value = "user";
      return;
    }
    const state = await request<PublicMemberHostApplicationResponse>("/public/me/host-application");
    if (!current()) return;
    applicationStatus.value = state.application?.status || "";
    role.value = state.canAccessWorkspace ? "host" : applicationStatus.value && applicationStatus.value !== "rejected" ? "reviewing" : "user";
  } catch {
    if (current()) error.value = "暂时无法确认当前账号的主理人权限，请稍后重试。";
  } finally {
    if (current()) loading.value = false;
  }
}

watch(() => props.open, (open) => {
  if (open) void loadRole();
  else { ++roleSequence; loading.value = false; }
});

function applyAsOrganizer() {
  const redirect = encodeURIComponent("/pages/apply/ambassador?source=host_apply");
  if (!getUserToken()) {
    uni.navigateTo({ url: withTenantCode(`/pages/user/login?redirect=${redirect}`) });
    return;
  }
  uni.navigateTo({ url: withTenantCode("/pages/apply/ambassador?source=host_apply") });
}

function openOrganizerWorkspace() { uni.navigateTo({ url: withTenantCode("/pages/admin/home") }); }

function openExperiencePublish() {
  if (!getUserToken()) {
    const redirect = encodeURIComponent("/pages/community/publish");
    uni.navigateTo({ url: withTenantCode(`/pages/user/login?redirect=${redirect}`) });
    return;
  }
  uni.navigateTo({ url: withTenantCode("/pages/community/publish") });
}

function openPublishFlow() {
  uni.showModal({ title: "慢π发布流程", content: "申请主理人 → 平台审核 → 获得权限 → 创建活动并提交审核。当前活动创建仍需主理人工作台权限。", showCancel: false });
}
</script>

<template>
  <BaseBottomSheet :open="props.open" title="发布入口" @close="emit('close')">
    <view class="publish-entry">
      <text v-if="loading" class="demo-label">正在读取当前账号权限…</text>
      <view v-else-if="error" class="state-label error"><text>{{ error }}</text><button @click="loadRole">重新读取</button></view>
      <text v-else class="state-label">{{ role === "host" ? "已读取主理人工作台权限" : role === "reviewing" ? "已读取后台主理人申请状态" : getUserToken() ? "当前账号尚未开通主理人权限" : "当前未登录，先登录再提交申请" }}</text>
      <template v-if="!loading && !error && role === 'user'">
        <view class="publish-action app-press" role="button" tabindex="0" aria-label="申请成为主理人" @click="applyAsOrganizer"><b>申请成为主理人</b><small>填写资料并提交到后台审核</small></view>
        <view class="publish-action app-press" role="button" tabindex="0" aria-label="了解发布流程" @click="openPublishFlow"><b>了解发布流程</b><small>查看申请、审核和活动发布规则</small></view>
        <view class="publish-action app-press" role="button" tabindex="0" aria-label="记录已完成活动的体验" @click="openExperiencePublish"><b>记录体验</b><small>完成活动并签到后发布真实心得</small></view>
      </template>
      <template v-else-if="!loading && !error && role === 'reviewing'">
        <view class="role-panel"><b>{{ ['approved', 'activated'].includes(applicationStatus) ? '审核通过，工作台权限待开通' : '资料审核中' }}</b><small>申请状态来自后台。工作台权限开通前暂不能创建活动。</small></view>
        <view class="publish-action app-press" role="button" tabindex="0" aria-label="查看申请进度" @click="applyAsOrganizer"><b>查看已提交资料</b><small>查看后台审核进度</small></view>
      </template>
      <template v-else-if="!loading && !error && role === 'host'">
        <view class="publish-action app-press" role="button" tabindex="0" aria-label="进入主理人工作台" @click="openOrganizerWorkspace"><b>进入主理人工作台</b><small>创建活动、提交审核、管理报名</small></view>
        <view class="publish-action app-press" role="button" tabindex="0" aria-label="了解发布流程" @click="openPublishFlow"><b>查看发布规则</b><small>发布前请完成活动信息和履约准备</small></view>
      </template>
      <button class="close-publish" @click="emit('close')">关闭</button>
    </view>
  </BaseBottomSheet>
</template>

<style scoped>
@import "../../styles/tokens.css";
.publish-entry{display:grid;grid-template-columns:1fr;gap:8px;padding:8px 18px 18px}.publish-entry small{margin-top:4px;color:var(--mp-text-muted);font-size:11px;line-height:1.45}.publish-action{min-height:64px;display:flex;align-items:flex-start;justify-content:center;flex-direction:column;padding:12px 14px;border:1px solid var(--mp-border);border-radius:9px;background:#fff;text-align:left;cursor:pointer}.publish-action b{color:var(--mp-text-primary);font-size:13px}.role-panel{display:grid;gap:6px;align-items:start;padding:12px 14px;border:1px solid var(--mp-border);border-radius:9px;background:var(--mp-bg-soft)}.role-panel small,.state-label{color:var(--mp-text-muted);font-size:11px;line-height:1.5}.demo-label,.state-label,.close-publish{grid-column:1/-1}.state-label{text-align:center}.state-label.error{color:#b42318}.close-publish{height:42px;margin-top:2px;border:1px solid var(--mp-border);border-radius:9px;background:#fff;color:var(--mp-text-secondary);font-size:13px}
</style>
