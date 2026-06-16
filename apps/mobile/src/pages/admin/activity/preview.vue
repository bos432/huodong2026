<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { adminActivityPreviewUrl, mobileAdminRequest, requireMobileAdmin } from "../../../mobile-admin";

const id = ref(0);
const tenantCode = ref("");
const activity = ref<any>(null);
const previewUrl = computed(() => adminActivityPreviewUrl(id.value, tenantCode.value || activity.value?.tenant?.code));

async function load() {
  requireMobileAdmin();
  const pages = getCurrentPages();
  const options = (pages[pages.length - 1] as any).options || {};
  id.value = Number(options.id || 0);
  tenantCode.value = options.tenantCode || "";
  if (!id.value) return;
  activity.value = await mobileAdminRequest(`/admin/activities/${id.value}`);
}

function openPublic() {
  uni.navigateTo({ url: previewUrl.value });
}

function copyLink() {
  uni.setClipboardData({ data: previewUrl.value, success: () => uni.showToast({ title: "已复制", icon: "success" }) });
}

onMounted(load);
</script>

<template>
  <view class="preview-page">
    <view class="panel">
      <view class="title">{{ activity?.title || "活动预览" }}</view>
      <view class="sub">公开 H5 链接</view>
      <view class="link" @click="copyLink">{{ previewUrl }}</view>
      <view class="actions">
        <view class="button" @click="openPublic">打开预览</view>
        <view class="button secondary" @click="copyLink">复制链接</view>
      </view>
    </view>
    <view class="panel hint">预览使用真实 H5 活动详情页。若活动仍是草稿或待审核，普通用户端可能不会展示在公开列表中。</view>
  </view>
</template>

<style scoped>
.preview-page { min-height: 100vh; padding: 24rpx; background: #f4f6f8; color: #111827; }
.panel { margin-bottom: 18rpx; padding: 26rpx; border-radius: 8px; background: #fff; box-shadow: 0 12rpx 34rpx rgba(15,23,42,.06); }
.title { font-size: 34rpx; font-weight: 900; line-height: 1.4; }
.sub { margin-top: 14rpx; color: #667085; font-size: 24rpx; }
.link { margin-top: 12rpx; padding: 18rpx; border-radius: 6px; background: #f8fafc; color: #0f766e; font-size: 24rpx; word-break: break-all; }
.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; margin-top: 22rpx; }
.button { height: 78rpx; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: #0f766e; color: #fff; font-weight: 900; }
.button.secondary { background: #e6f2ef; color: #0f766e; }
.hint { color: #667085; font-size: 25rpx; line-height: 1.6; }
</style>
