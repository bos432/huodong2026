<script setup lang="ts">
import { ref, watch } from "vue";
import BaseBottomSheet from "../sheets/BaseBottomSheet.vue";
import { getUserToken, request, withTenantCode } from "../../api";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();
const role = ref<"user" | "reviewing" | "host">("user");
const loading = ref(false);
const error = ref("");

async function loadRole() {
  loading.value = true;
  error.value = "";
  try {
    if (!getUserToken()) {
      role.value = "user";
      return;
    }
    if (String(uni.getStorageSync("organizer_application_status") || "") === "pending") {
      role.value = "reviewing";
      return;
    }
    const access = await request<any>("/public/me/admin-access");
    role.value = access?.canAccess ? "host" : "user";
  } catch {
    error.value = "暂时无法确认当前账号的主理人权限，请稍后重试。";
  } finally {
    loading.value = false;
  }
}

watch(() => props.open, (open) => {
  if (open) void loadRole();
});

function applyAsOrganizer() {
  const redirect = encodeURIComponent("/pages/home/index?openPublish=1");
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
      <text v-else-if="error" class="state-label error">{{ error }}</text>
      <text v-else class="state-label">{{ role === "host" ? "已读取主理人工作台权限" : role === "reviewing" ? "已记录主理人申请，等待后台审核" : getUserToken() ? "当前账号尚未开通主理人权限" : "当前未登录，先登录再提交申请" }}</text>
      <template v-if="role === 'user'">
        <view class="publish-action app-press" role="button" tabindex="0" aria-label="申请成为主理人" @click="applyAsOrganizer"><b>申请成为主理人</b><small>填写资料并提交到后台审核</small></view>
        <view class="publish-action app-press" role="button" tabindex="0" aria-label="了解发布流程" @click="openPublishFlow"><b>了解发布流程</b><small>查看申请、审核和活动发布规则</small></view>
        <view class="publish-action app-press" role="button" tabindex="0" aria-label="记录已完成活动的体验" @click="openExperiencePublish"><b>记录体验</b><small>完成活动并签到后发布真实心得</small></view>
      </template>
      <template v-else-if="role === 'reviewing'">
        <view class="role-panel"><b>资料审核中</b><small>申请已经进入后台，审核通过前暂不能创建活动。</small></view>
        <view class="publish-action app-press" role="button" tabindex="0" aria-label="查看申请进度" @click="applyAsOrganizer"><b>查看或补充申请资料</b><small>打开主理人申请页</small></view>
      </template>
      <template v-else>
        <view class="publish-action app-press" role="button" tabindex="0" aria-label="进入主理人工作台" @click="openOrganizerWorkspace"><b>进入主理人工作台</b><small>创建活动、提交审核、管理报名</small></view>
        <view class="publish-action app-press" role="button" tabindex="0" aria-label="了解发布流程" @click="openPublishFlow"><b>查看发布规则</b><small>发布前请完成活动信息和履约准备</small></view>
      </template>
      <button class="close-publish" @click="emit('close')">关闭</button>
    </view>
  </BaseBottomSheet>
</template>

<style scoped>
@import "../../styles/tokens.css";
.publish-entry{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:8px 18px 18px}.publish-entry small{margin-top:4px;color:var(--mp-text-muted);font-size:10px}.publish-action{min-height:74px;display:flex;align-items:center;justify-content:center;flex-direction:column;padding:15px 5px;border-radius:9px;background:#fafcfb;text-align:center;cursor:pointer}.publish-action b{color:var(--mp-text-primary);font-size:12px}.role-panel{grid-column:1/-1;display:grid;gap:6px;align-items:start}.role-panel small,.state-label{color:var(--mp-text-muted);font-size:11px;line-height:1.5}.demo-label,.state-label,.close-publish{grid-column:1/-1}.state-label{text-align:center}.state-label.error{color:#b42318}.close-publish{height:42px;margin-top:2px;border:1px solid var(--mp-border);border-radius:21px;background:#fff;color:var(--mp-text-secondary);font-size:13px}
</style>
