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
.preview-page { min-height: 100vh; padding: 24rpx; background: radial-gradient(circle at 18% 0%, rgba(255, 232, 198, 0.9), transparent 34%), linear-gradient(180deg, #fff8ef 0%, #f5f0e8 44%, #f7f3ed 100%); color: #2f211c; }
.panel { margin-bottom: 18rpx; padding: 28rpx; border-radius: 26rpx; background: rgba(255,255,255,.9); border: 1rpx solid rgba(91, 47, 36, 0.06); box-shadow: 0 14rpx 34rpx rgba(91,47,36,.08); }
.title { color: #2f211c; font-size: 36rpx; font-weight: 950; line-height: 1.4; }
.sub { margin-top: 14rpx; color: #7a5b52; font-size: 24rpx; font-weight: 800; }
.link { margin-top: 12rpx; padding: 18rpx; border-radius: 18rpx; background: #f8fbf8; border: 1rpx solid rgba(15, 118, 110, 0.12); color: #0f766e; font-size: 24rpx; word-break: break-all; }
.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; margin-top: 22rpx; }
.button { height: 80rpx; display: flex; align-items: center; justify-content: center; border-radius: 20rpx; background: linear-gradient(135deg, #0f766e, #15907f); color: #fff; font-weight: 950; box-shadow: 0 12rpx 24rpx rgba(15,118,110,.2); }
.button.secondary { background: #e6f2ef; color: #0f766e; }
.hint { color: #7a5b52; font-size: 25rpx; line-height: 1.6; }
</style>
