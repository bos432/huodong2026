<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { request, withTenantCode, getCurrentTenantCode } from "../api";
import { goDecoratedLink } from "../decoration";

type PopupButton = { text: string; link?: string; style?: "primary" | "secondary" };
type MarketingPopupView = {
  id: number;
  title: string;
  subtitle?: string | null;
  content?: string | null;
  emphasis?: string | null;
  imageUrl?: string | null;
  type?: string;
  buttons?: PopupButton[];
  frequency?: string;
  dismissible?: boolean;
  updatedAt?: string;
};

const props = defineProps<{ showKey: number }>();
const visible = ref(false);
const popup = ref<MarketingPopupView | null>(null);
const loading = ref(false);
let platform = "h5";
// #ifdef MP-WEIXIN
platform = "mp-weixin";
// #endif

const activeButtons = computed(() => (popup.value?.buttons || []).filter((item) => String(item.text || "").trim()).slice(0, 2));
const cardClass = computed(() => `marketing-popup-card ${popup.value?.type === "wuxing_gold" ? "wuxing" : popup.value?.type || "notice"}`);

function currentRoute() {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  return page?.route ? `/${page.route}` : "/pages/index/index";
}

function currentPageKey(route = currentRoute()) {
  if (route === "/pages/index/index") return "home";
  if (route === "/pages/mall/index") return "mall_home";
  if (route === "/pages/mall/detail") return "mall_product_detail";
  if (route === "/pages/activity/list") return "activity_list";
  if (route === "/pages/activity/detail") return "activity_detail";
  if (route === "/pages/courses/index") return "course_home";
  if (route === "/pages/course/detail") return "course_detail";
  if (route === "/pages/community/index") return "community_home";
  if (route === "/pages/user/my") return "user_my";
  return route.includes("/mall/") ? "mall_home" : "all";
}

function storageKey(row: MarketingPopupView) {
  const tenant = getCurrentTenantCode() || "platform";
  const frequency = row.frequency || "once_per_day";
  const date = new Date().toISOString().slice(0, 10);
  const suffix = frequency === "once_per_day" ? date : "campaign";
  return `marketing_popup:${tenant}:${row.id}:${suffix}`;
}

function canShow(row: MarketingPopupView) {
  if ((row.frequency || "once_per_day") === "every_visit") return true;
  return !uni.getStorageSync(storageKey(row));
}

function remember(row: MarketingPopupView) {
  if ((row.frequency || "once_per_day") === "every_visit") return;
  uni.setStorageSync(storageKey(row), { id: row.id, closedAt: Date.now(), updatedAt: row.updatedAt || "" });
}

async function loadPopup() {
  if (loading.value) return;
  loading.value = true;
  try {
    const pageKey = currentPageKey();
    const row = await request<MarketingPopupView | null>(`/public/marketing-popups?pageKey=${encodeURIComponent(pageKey)}&platform=${encodeURIComponent(platform)}`);
    if (row && canShow(row)) {
      popup.value = row;
      visible.value = true;
      void reportEvent("impression");
    } else {
      visible.value = false;
      popup.value = null;
    }
  } catch {
    visible.value = false;
    popup.value = null;
  } finally {
    loading.value = false;
  }
}

async function reportEvent(event: "impression" | "click" | "close") {
  if (!popup.value?.id) return;
  try {
    await request(`/public/marketing-popups/${popup.value.id}/events`, { method: "POST", data: { event } });
  } catch {
    // 统计失败不影响用户浏览。
  }
}

function closePopup() {
  if (!popup.value) return;
  remember(popup.value);
  void reportEvent("close");
  visible.value = false;
}

function handleButton(button: PopupButton) {
  if (!popup.value) return;
  remember(popup.value);
  void reportEvent("click");
  visible.value = false;
  const link = String(button.link || "").trim();
  if (!link) return;
  if (/^https?:\/\//i.test(link)) {
    // #ifdef H5
    window.location.href = link;
    // #endif
    // #ifndef H5
    uni.showToast({ title: "小程序暂不支持直接打开外部链接", icon: "none" });
    // #endif
    return;
  }
  if (link.startsWith("/pages/")) goDecoratedLink(withTenantCode(link));
}

watch(() => props.showKey, loadPopup, { immediate: true });
</script>

<template>
  <view v-if="visible && popup" class="marketing-popup-mask">
    <view :class="cardClass">
      <view v-if="popup.dismissible !== false" class="marketing-popup-close" @click="closePopup">×</view>
      <image v-if="popup.imageUrl" class="marketing-popup-image" :src="popup.imageUrl" mode="aspectFill" />
      <view v-else class="marketing-popup-image fallback">{{ popup.type === "wuxing_gold" ? "清冠优选" : "通知" }}</view>
      <view class="marketing-popup-body">
        <view class="marketing-popup-title">{{ popup.title }}</view>
        <view v-if="popup.subtitle" class="marketing-popup-subtitle">{{ popup.subtitle }}</view>
        <view v-if="popup.emphasis" class="marketing-popup-emphasis">{{ popup.emphasis }}</view>
        <view v-if="popup.content" class="marketing-popup-copy">{{ popup.content }}</view>
        <view v-if="activeButtons.length" class="marketing-popup-actions">
          <button v-for="button in activeButtons" :key="button.text" :class="button.style === 'secondary' ? 'secondary' : 'primary'" @click="handleButton(button)">
            {{ button.text }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.marketing-popup-mask { position: fixed; z-index: 9999; inset: 0; display: flex; align-items: center; justify-content: center; padding: 32rpx; background: rgba(15, 23, 42, 0.52); }
.marketing-popup-card { position: relative; width: 100%; max-width: 690rpx; overflow: hidden; border-radius: 28rpx; background: #fff; box-shadow: 0 34rpx 90rpx rgba(15, 23, 42, 0.28); }
.marketing-popup-card.wuxing { background: #fffdf5; border: 1rpx solid #f1c76a; box-shadow: 0 34rpx 90rpx rgba(154, 106, 36, 0.28); }
.marketing-popup-close { position: absolute; z-index: 1; top: 16rpx; right: 16rpx; width: 54rpx; height: 54rpx; display: flex; align-items: center; justify-content: center; border-radius: 999rpx; background: rgba(15, 23, 42, 0.42); color: #fff; font-size: 40rpx; line-height: 1; }
.marketing-popup-image { width: 100%; height: 280rpx; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #ffd45a 0%, #fff2b8 100%); color: #9e1b12; font-size: 38rpx; font-weight: 900; }
.marketing-popup-body { padding: 28rpx; }
.marketing-popup-title { color: #1f2937; font-size: 34rpx; font-weight: 900; line-height: 1.3; }
.marketing-popup-subtitle { margin-top: 10rpx; color: #667085; font-size: 25rpx; line-height: 1.5; }
.marketing-popup-emphasis { margin-top: 18rpx; color: #e8412f; font-size: 44rpx; line-height: 1.25; font-weight: 900; }
.marketing-popup-copy { margin-top: 18rpx; color: #344054; font-size: 27rpx; line-height: 1.72; font-weight: 700; white-space: pre-line; }
.marketing-popup-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18rpx; margin-top: 30rpx; }
.marketing-popup-actions button { min-height: 82rpx; padding: 0 18rpx; border: 0; border-radius: 999rpx; font-size: 28rpx; font-weight: 900; line-height: 82rpx; }
.marketing-popup-actions .primary { background: linear-gradient(135deg, #2e5d7f 0%, #d77a4d 100%); color: #fff; }
.marketing-popup-actions .secondary { background: #eef3f6; color: #344054; }
.marketing-popup-card.payment .marketing-popup-emphasis { color: #e8412f; }
.marketing-popup-card.ad .marketing-popup-image.fallback { background: linear-gradient(135deg, #c43d3d 0%, #ffd45a 100%); color: #fff; }
</style>
