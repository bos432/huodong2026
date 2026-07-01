<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { getCurrentTenantCode, request, withTenantCode } from "../api";
import { goDecoratedLink } from "../decoration";

type AdCampaignView = {
  id: number;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  resolvedImageUrl?: string | null;
  source: "custom" | "wechat_official";
  format: string;
  slotKey: string;
  pageKey: string;
  platforms?: string[];
  link?: string | null;
  officialAdUnitId?: string | null;
  officialAdType?: string | null;
  frequency?: string;
  updatedAt?: string;
};

const props = withDefaults(defineProps<{ slotKey: string; pageKey?: string; compact?: boolean; showKey?: number }>(), { pageKey: "", compact: false, showKey: 0 });
const ad = ref<AdCampaignView | null>(null);
const visible = ref(false);
const countdown = ref(3);
const loading = ref(false);
let timer: ReturnType<typeof setInterval> | null = null;
let platform = "h5";
// #ifdef MP-WEIXIN
platform = "mp-weixin";
// #endif

const isSplash = computed(() => ad.value?.format === "splash" || ad.value?.slotKey === "app_splash");
const isOfficial = computed(() => ad.value?.source === "wechat_official");
const isOfficialInline = computed(() => isOfficial.value && ["official_banner", "official_video", "official_grid"].includes(ad.value?.format || ""));
const displayImageUrl = computed(() => ad.value?.resolvedImageUrl || ad.value?.imageUrl || "");
const officialAdType = computed(() => {
  if (ad.value?.format === "official_video") return "video";
  if (ad.value?.format === "official_grid") return "grid";
  return ad.value?.officialAdType || "banner";
});
const cardClass = computed(() => `ad-slot-card ${props.compact ? "compact" : ""} ${ad.value?.format || "banner"}`);

function currentRoute() {
  const pages = getCurrentPages();
  const page = pages[pages.length - 1] as any;
  return page?.route ? `/${page.route}` : "/pages/index/index";
}

function currentPageKey(route = currentRoute()) {
  if (props.pageKey) return props.pageKey;
  if (route === "/pages/index/index") return "home";
  if (route === "/pages/mall/index") return "mall_home";
  if (route === "/pages/mall/detail") return "mall_product_detail";
  if (route === "/pages/activity/list") return "activity_list";
  if (route === "/pages/activity/detail") return "activity_detail";
  if (route === "/pages/courses/index") return "course_home";
  if (route === "/pages/course/detail") return "course_detail";
  if (route === "/pages/community/index") return "community_home";
  if (route === "/pages/community/detail") return "community_detail";
  if (route === "/pages/user/my") return "user_my";
  return "all";
}

function storageKey(row: AdCampaignView) {
  const tenant = getCurrentTenantCode() || "platform";
  const frequency = row.frequency || "once_per_day";
  const date = new Date().toISOString().slice(0, 10);
  const suffix = frequency === "once_per_day" ? date : "campaign";
  return `ad_slot:${tenant}:${row.id}:${suffix}`;
}

function canShow(row: AdCampaignView) {
  if ((row.frequency || "once_per_day") === "every_visit") return true;
  return !uni.getStorageSync(storageKey(row));
}

function remember(row: AdCampaignView) {
  if ((row.frequency || "once_per_day") === "every_visit") return;
  uni.setStorageSync(storageKey(row), { id: row.id, at: Date.now(), updatedAt: row.updatedAt || "" });
}

function clearTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

function startSplashTimer() {
  clearTimer();
  countdown.value = 3;
  timer = setInterval(() => {
    countdown.value -= 1;
    if (countdown.value <= 0) closeAd("close");
  }, 1000);
}

async function loadAd() {
  if (loading.value) return;
  loading.value = true;
  try {
    const pageKey = currentPageKey();
    const row = await request<AdCampaignView | null>(`/public/ad-slots?pageKey=${encodeURIComponent(pageKey)}&slotKey=${encodeURIComponent(props.slotKey)}&platform=${encodeURIComponent(platform)}`);
    if (row && canShow(row)) {
      ad.value = row;
      visible.value = true;
      void reportEvent("impression");
      if (isSplash.value) startSplashTimer();
      if (row.format === "official_interstitial") void showInterstitial(row);
    } else {
      visible.value = false;
      ad.value = null;
    }
  } catch {
    visible.value = false;
    ad.value = null;
  } finally {
    loading.value = false;
  }
}

async function reportEvent(event: "impression" | "click" | "skip" | "close" | "load" | "error" | "reward") {
  if (!ad.value?.id) return;
  try {
    await request(`/public/ad-slots/${ad.value.id}/events`, { method: "POST", data: { event, platform } });
  } catch {
    // 广告统计失败不影响页面浏览。
  }
}

function closeAd(event: "skip" | "close" = "close") {
  if (!ad.value) return;
  remember(ad.value);
  clearTimer();
  void reportEvent(event);
  visible.value = false;
}

function openAd() {
  if (!ad.value) return;
  remember(ad.value);
  void reportEvent("click");
  const link = String(ad.value.link || "").trim();
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

async function showInterstitial(row: AdCampaignView) {
  // #ifdef MP-WEIXIN
  const wxApi = (globalThis as any).wx;
  if (!wxApi?.createInterstitialAd || !row.officialAdUnitId) return;
  try {
    const instance = wxApi.createInterstitialAd({ adUnitId: row.officialAdUnitId });
    instance.onLoad(() => reportEvent("load"));
    instance.onError(() => reportEvent("error"));
    instance.onClose(() => closeAd("close"));
    await instance.show();
  } catch {
    void reportEvent("error");
  }
  // #endif
}

async function showRewardedVideo() {
  if (!ad.value) return;
  // #ifdef MP-WEIXIN
  const wxApi = (globalThis as any).wx;
  if (!wxApi?.createRewardedVideoAd || !ad.value.officialAdUnitId) return;
  try {
    const instance = wxApi.createRewardedVideoAd({ adUnitId: ad.value.officialAdUnitId });
    instance.onLoad(() => reportEvent("load"));
    instance.onError(() => reportEvent("error"));
    instance.onClose((result: any) => {
      void reportEvent(result?.isEnded ? "reward" : "close");
    });
    await instance.show();
  } catch {
    void reportEvent("error");
  }
  // #endif
}

function handleOfficialLoad() {
  void reportEvent("load");
}

function handleOfficialError() {
  void reportEvent("error");
  visible.value = false;
}

onShow(loadAd);
watch(() => props.showKey, loadAd, { immediate: true });
onBeforeUnmount(clearTimer);
</script>

<template>
  <view v-if="visible && ad">
    <view v-if="isSplash" class="ad-splash-mask">
      <view class="ad-splash-skip" @click="closeAd('skip')">跳过 {{ countdown }}</view>
      <image v-if="displayImageUrl" class="ad-splash-image" :src="displayImageUrl" mode="aspectFill" @click="openAd" />
      <view v-else class="ad-splash-fallback" @click="openAd">
        <text>{{ ad.title }}</text>
        <text>{{ ad.subtitle || "广告推广" }}</text>
      </view>
    </view>

    <!-- #ifdef MP-WEIXIN -->
    <view v-else-if="isOfficialInline && ad.officialAdUnitId" class="official-ad-wrap">
      <ad :unit-id="ad.officialAdUnitId" :ad-type="officialAdType" @load="handleOfficialLoad" @error="handleOfficialError" @close="closeAd('close')" />
    </view>
    <view v-else-if="ad.format === 'official_rewarded_video'" class="ad-reward-card" @click="showRewardedVideo">
      <text class="ad-reward-title">{{ ad.title }}</text>
      <text class="ad-reward-copy">{{ ad.subtitle || "观看后继续领取权益" }}</text>
    </view>
    <!-- #endif -->

    <view v-else-if="!isOfficial" :class="cardClass" @click="openAd">
      <image v-if="displayImageUrl" :src="displayImageUrl" mode="aspectFill" />
      <view v-else class="ad-cover-fallback">AD</view>
      <view class="ad-slot-body">
        <view class="ad-slot-title">{{ ad.title }}</view>
        <view v-if="ad.subtitle" class="ad-slot-copy">{{ ad.subtitle }}</view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.ad-slot-card { display: grid; grid-template-columns: 180rpx 1fr; gap: 18rpx; margin: 18rpx 0; padding: 18rpx; border-radius: 18rpx; background: #fffdf5; border: 1rpx solid rgba(241, 199, 106, 0.55); box-shadow: 0 12rpx 30rpx rgba(154, 106, 36, 0.10); }
.ad-slot-card.compact { grid-template-columns: 140rpx 1fr; }
.ad-slot-card image, .ad-cover-fallback { width: 180rpx; height: 128rpx; border-radius: 14rpx; background: linear-gradient(135deg, #ffd45a 0%, #fff2b8 100%); }
.ad-slot-card.compact image, .ad-slot-card.compact .ad-cover-fallback { width: 140rpx; height: 104rpx; }
.ad-cover-fallback { display: flex; align-items: center; justify-content: center; color: #9e1b12; font-weight: 900; }
.ad-slot-body { min-width: 0; display: grid; align-content: center; gap: 8rpx; }
.ad-slot-title { color: #1f2937; font-size: 28rpx; font-weight: 900; line-height: 1.35; }
.ad-slot-copy { color: #667085; font-size: 24rpx; line-height: 1.5; }
.ad-splash-mask { position: fixed; z-index: 10000; inset: 0; background: #0f172a; }
.ad-splash-image, .ad-splash-fallback { width: 100%; height: 100%; }
.ad-splash-fallback { display: grid; place-content: center; gap: 20rpx; padding: 60rpx; background: linear-gradient(180deg, #ffd45a 0%, #e8412f 100%); color: #fff; text-align: center; font-size: 34rpx; font-weight: 900; }
.ad-splash-fallback text:last-child { font-size: 26rpx; opacity: 0.86; }
.ad-splash-skip { position: absolute; z-index: 1; top: 72rpx; right: 28rpx; padding: 12rpx 22rpx; border-radius: 999rpx; background: rgba(15, 23, 42, 0.55); color: #fff; font-size: 24rpx; font-weight: 800; }
.official-ad-wrap { margin: 18rpx 0; min-height: 80rpx; overflow: hidden; }
.ad-reward-card { margin: 18rpx 0; padding: 22rpx; border-radius: 18rpx; background: linear-gradient(135deg, #fff2b8 0%, #fffdf5 100%); border: 1rpx solid #f1c76a; }
.ad-reward-title { display: block; color: #9e1b12; font-size: 28rpx; font-weight: 900; }
.ad-reward-copy { display: block; margin-top: 8rpx; color: #9a6a24; font-size: 24rpx; }
</style>
