<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { adminActivityPreviewUrl, mobileAdminRequest, requireMobileAdmin } from "../../../mobile-admin";

const id = ref(0);
const tenantCode = ref("");
const activity = ref<any>(null);
const loading = ref(true);
const loadError = ref("");
const previewUrl = computed(() => adminActivityPreviewUrl(id.value, tenantCode.value || activity.value?.tenant?.code));
let loadSerial = 0;

async function load() {
  const serial = ++loadSerial;
  loading.value = true;
  loadError.value = "";
  try {
    requireMobileAdmin();
    const pages = getCurrentPages();
    const options = (pages[pages.length - 1] as any).options || {};
    id.value = Number(options.id || 0);
    tenantCode.value = options.tenantCode || "";
    if (!id.value) throw new Error("缺少活动编号，无法生成预览");
    const nextActivity = await mobileAdminRequest<any>(`/admin/activities/${id.value}`);
    if (serial !== loadSerial) return;
    activity.value = nextActivity;
  } catch (error: any) {
    if (serial !== loadSerial) return;
    activity.value = null;
    loadError.value = error?.message || "活动预览加载失败";
  } finally {
    if (serial === loadSerial) loading.value = false;
  }
}

function openPublic() {
  if (!activity.value || loadError.value) return;
  uni.navigateTo({ url: previewUrl.value });
}

function copyLink() {
  if (!activity.value || loadError.value) return;
  uni.setClipboardData({ data: previewUrl.value, success: () => uni.showToast({ title: "已复制", icon: "success" }) });
}

onShow(load);
</script>

<template>
  <view class="preview-page">
    <view v-if="loading" class="panel state">活动预览加载中...</view>
    <view v-else-if="loadError" class="panel state error-state" role="alert" aria-live="assertive"><text>{{ loadError }}</text><view class="retry" role="button" tabindex="0" aria-label="重新加载活动预览" @click="load" @keyup.enter="load" @keyup.space.prevent="load">重新加载</view></view>
    <view v-else class="panel">
      <view class="title">{{ activity?.title || "活动预览" }}</view>
      <view class="sub">公开 H5 链接</view>
      <view class="link" role="button" tabindex="0" aria-label="复制活动公开链接" @click="copyLink" @keyup.enter="copyLink" @keyup.space.prevent="copyLink">{{ previewUrl }}</view>
      <view class="actions">
        <view class="button" role="button" tabindex="0" aria-label="打开活动公开预览" @click="openPublic" @keyup.enter="openPublic" @keyup.space.prevent="openPublic">打开预览</view>
        <view class="button secondary" role="button" tabindex="0" aria-label="复制活动公开链接" @click="copyLink" @keyup.enter="copyLink" @keyup.space.prevent="copyLink">复制链接</view>
      </view>
    </view>
    <view v-if="!loading && !loadError" class="panel hint">预览使用真实 H5 活动详情页。若活动仍是草稿或待审核，普通用户端可能不会展示在公开列表中。</view>
  </view>
</template>

<style scoped>
.preview-page { min-height: 100vh; width:100%; max-width:760px; margin:0 auto; box-sizing:border-box; padding: calc(24rpx + env(safe-area-inset-top)) calc(24rpx + env(safe-area-inset-right)) calc(24rpx + env(safe-area-inset-bottom)) calc(24rpx + env(safe-area-inset-left)); overflow-wrap:anywhere; background: radial-gradient(circle at 18% 0%, rgba(255, 232, 198, 0.9), transparent 34%), linear-gradient(180deg, #fff8ef 0%, #f5f0e8 44%, #f7f3ed 100%); color: #2f211c; }
.panel { margin-bottom: 18rpx; padding: 28rpx; border-radius: 26rpx; background: rgba(255,255,255,.9); border: 1rpx solid rgba(91, 47, 36, 0.06); box-shadow: 0 14rpx 34rpx rgba(91,47,36,.08); }
.title { color: #2f211c; font-size: 36rpx; font-weight: 950; line-height: 1.4; }
.sub { margin-top: 14rpx; color: #7a5b52; font-size: 24rpx; font-weight: 800; }
.link { margin-top: 12rpx; padding: 18rpx; border-radius: 18rpx; background: #f8fbf8; border: 1rpx solid rgba(15, 118, 110, 0.12); color: #0f766e; font-size: 24rpx; word-break: break-all; overflow-wrap:anywhere; }
.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; margin-top: 22rpx; }
.button { height: 80rpx; display: flex; align-items: center; justify-content: center; border-radius: 20rpx; background: linear-gradient(135deg, #0f766e, #15907f); color: #fff; font-weight: 950; box-shadow: 0 12rpx 24rpx rgba(15,118,110,.2); }
.button.secondary { background: #e6f2ef; color: #0f766e; }
.hint { color: #7a5b52; font-size: 25rpx; line-height: 1.6; }
.state { display:grid; gap:16rpx; color:#7a5b52; font-size:25rpx; }.error-state { border:1rpx solid #fecaca; background:#fff7f7; color:#b91c1c; }.retry { width:max-content; padding:12rpx 18rpx; border-radius:16rpx; background:#b42318; color:#fff; font-weight:900; }
@media (min-width: 900px) { .preview-page { max-width:760px; margin:0 auto; } }
</style>
