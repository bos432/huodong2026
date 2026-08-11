<script setup lang="ts">
import QRCode from "qrcode";
import { computed, nextTick, ref } from "vue";
import { onShareAppMessage, onShareTimeline, onShow } from "@dcloudio/uni-app";
import { ensureUser, fetchWechatSubscriptionTemplates, getUserToken, request, requestWechatSubscriptions, withTenantCode } from "../../api";
import { filterIntrinsicHeaderDecorationSections, usePageDecoration } from "../../decoration";
import { reviewSafeData, reviewSafeText } from "../../review-safe-text";
import { markdownToRichTextHtml } from "@activity/shared";
import TenantContextBadge from "../../components/TenantContextBadge.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";
import AdSlotRenderer from "../../components/AdSlotRenderer.vue";
import { addActivityToCalendar } from "../../activity-calendar";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { showMiniProgramShareMenu } from "../../share";
import { isLinkAllowedByFeature } from "../../feature-gates";

const activity = ref<any>();
const invite = ref<any>();
const operationSetting = ref<any>();
const loading = ref(true);
const error = ref("");
const inviteCode = ref("");
const channelCode = ref("");
const source = ref("h5");
const activeAction = ref("");
const moreActionsVisible = ref(false);
const posterUrl = ref("");
const loadGuard = createTenantLoadGuard();
const { tenant, contentSections, innerPageConfig, innerPageLayout, loadDecoration } = usePageDecoration("activity_detail", "/pages/activity/detail");
const bodyDecorationSections = computed(() => filterIntrinsicHeaderDecorationSections(contentSections.value));
const customerServiceSession = computed(() => JSON.stringify({ source: "activity_detail", activityId: activity.value?.id || null, tenantCode: tenant.value?.code || "" }));

function richActivityContent(content: unknown) {
  return markdownToRichTextHtml(content);
}

async function reportReview(review: any) {
  const actionKey = `report:${review?.id || 0}`;
  if (activeAction.value) return;
  try { await ensureUser(); } catch { return; }
  activeAction.value = actionKey;
  const reasons = ["广告或垃圾信息", "辱骂或不友善内容", "虚假或误导信息", "泄露个人隐私", "其他违规内容"];
  uni.showActionSheet({ itemList: reasons, success: async ({ tapIndex }) => {
    try {
      const result = await request<any>(`/public/reviews/${review.id}/report`, { method: "POST", data: { reason: reasons[tapIndex] } });
      uni.showToast({ title: result.idempotent ? "你已举报过" : "举报已提交", icon: "none" });
    } catch (error: any) { uni.showToast({ title: reviewSafeText(error.message || "举报失败"), icon: "none" }); }
    finally { if (activeAction.value === actionKey) activeAction.value = ""; }
  }, fail: () => { if (activeAction.value === actionKey) activeAction.value = ""; } });
}

function activitySharePath() {
  const query = [
    `id=${activity.value?.id || ""}`,
    inviteCode.value ? `inviteCode=${encodeURIComponent(inviteCode.value)}` : "",
    channelCode.value ? `channelCode=${encodeURIComponent(channelCode.value)}` : "",
    "source=wechat_share"
  ].filter(Boolean).join("&");
  return withTenantCode(`/pages/activity/detail?${query}`);
}

function defaultSource() {
  // #ifdef MP-WEIXIN
  return "wechat_mini_program";
  // #endif
  // #ifdef H5
  return "h5";
  // #endif
  return "mobile";
}

onShareAppMessage(() => ({
  title: activity.value?.shareTitle || activity.value?.title || "活动详情",
  path: activitySharePath(),
  imageUrl: activity.value?.shareImageUrl || activity.value?.coverUrl || undefined
}));

onShareTimeline(() => ({
  title: activity.value?.shareTitle || activity.value?.title || "活动详情",
  query: activitySharePath().split("?")[1] || "",
  imageUrl: activity.value?.shareImageUrl || activity.value?.coverUrl || undefined
}));

function registrationPaused() {
  const value = operationSetting.value?.registrationEnabled;
  return value === false || value === 0 || value === "0";
}

function registrationPausedMessage() {
  return operationSetting.value?.registrationDisabledMessage || "报名通道暂时关闭，请稍后再试或联系主办方。";
}

function memberLoginRequired() {
  const access = activity.value?.memberAccess;
  return Boolean(access?.loginRequired || (access && !access.eligible && !getUserToken()));
}

function canRegister() {
  const status = activity.value?.displayStatus;
  const access = activity.value?.memberAccess;
  return !registrationPaused() && (status === "open" || status === "full") && (!access || access.eligible || memberLoginRequired());
}

function registerButtonText() {
  if (registrationPaused()) return "报名暂停";
  if (activity.value?.displayStatus === "ended") return "报名已结束";
  if (activity.value?.displayStatus !== "open" && activity.value?.displayStatus !== "full") return "暂不可报名";
  if (memberLoginRequired()) return "登录后报名";
  if (activity.value?.memberAccess && !activity.value.memberAccess.eligible) return "会员等级不足";
  if (activity.value?.displayStatus === "full") return "加入候补";
  return Number(activity.value?.price || 0) > 0 ? `报名并支付 ${priceText(activity.value.price)}` : "立即报名";
}

function actionHint() {
  if (registrationPaused()) return registrationPausedMessage();
  if (activity.value?.displayStatus === "ended") return "报名已结束，可以查看活动信息或联系主办方。";
  if (memberLoginRequired()) return activity.value?.memberAccess?.message || "登录后可查看会员等级和报名资格。";
  if (activity.value?.memberAccess && !activity.value.memberAccess.eligible) return activity.value.memberAccess.message || "当前账号暂不满足报名条件。";
  if (activity.value?.displayStatus === "full") return "当前名额已满，你仍可先加入候补名单。";
  return "名额仍可报名，提交后请留意付款、审核或活动通知。";
}

function register() {
  if (!canRegister()) {
    uni.showToast({ title: reviewSafeText(registrationPaused() ? registrationPausedMessage() : activity.value?.memberAccess?.message || "暂不可报名"), icon: "none" });
    return;
  }
  const query = [
    `id=${activity.value.id}`,
    inviteCode.value ? `inviteCode=${encodeURIComponent(inviteCode.value)}` : "",
    channelCode.value ? `channelCode=${encodeURIComponent(channelCode.value)}` : "",
    source.value ? `source=${encodeURIComponent(source.value)}` : ""
  ].filter(Boolean).join("&");
  const target = withTenantCode(`/pages/activity/register?${query}`);
  if (memberLoginRequired() || !getUserToken()) {
    uni.navigateTo({ url: withTenantCode(`/pages/user/login?redirect=${encodeURIComponent(target)}`) });
    return;
  }
  uni.navigateTo({ url: target });
}

function statusText(status: string) {
  if (status === "full") return "已满员";
  if (status === "ended") return "已结束";
  return "报名中";
}

function deadlineText() {
  return `报名截止 ${formatTime(activity.value?.registrationDeadline)}`;
}

function seatsText() {
  if (!activity.value) return "";
  if (activity.value.remainingSeats <= 0) return `已报 ${activity.value.registeredCount} 人，候补 ${activity.value.waitingCount || 0} 人`;
  return `剩余 ${activity.value.remainingSeats} / ${activity.value.capacity} 个名额`;
}

function priceText(price: string | number) {
  return Number(price) > 0 ? `￥${Number(price).toFixed(2)}` : "免费";
}

function formatTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace("T", " ").slice(0, 16);
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function locationLatitude() {
  const value = Number(activity.value?.locationLatitude);
  return Number.isFinite(value) ? value : undefined;
}

function locationLongitude() {
  const value = Number(activity.value?.locationLongitude);
  return Number.isFinite(value) ? value : undefined;
}

function hasMapPoint() {
  return locationLatitude() !== undefined && locationLongitude() !== undefined;
}

function hasMapInfo() {
  return hasMapPoint() || Boolean(activity.value?.locationMapUrl);
}

function canUseNativeMap() {
  // #ifdef H5
  return false;
  // #endif
  return hasMapPoint();
}

function mapActionText() {
  return canUseNativeMap() || activity.value?.locationMapUrl ? "查看地图 / 导航" : "复制地点";
}

function showMemberAccess() {
  return Boolean(activity.value?.minMemberLevel || activity.value?.memberAccess?.priorityMemberLevel || activity.value?.memberAccess?.requiredLevel);
}

const hasGroupQrCode = computed(() => Boolean(activity.value?.hasGroupQrCode));

async function makeInvite() {
  if (activeAction.value || !activity.value?.id) return;
  activeAction.value = "invite";
  try {
    await ensureUser();
    invite.value = await request(`/public/activities/${activity.value.id}/share-poster`, { method: "POST", data: {} });
    inviteCode.value = String(invite.value?.code || "");
    showMiniProgramShareMenu();
    uni.showToast({ title: "专属邀请已生成", icon: "success" });
  } catch (err: any) {
    uni.showToast({ title: reviewSafeText(err.message || "生成失败"), icon: "none" });
  } finally {
    if (activeAction.value === "invite") activeAction.value = "";
  }
}

function copyText(text?: string) {
  if (!text) return;
  uni.setClipboardData({ data: text, success: () => uni.showToast({ title: "已复制", icon: "success" }) });
}

function goMy() {
  uni.reLaunch({ url: withTenantCode("/pages/user/my") });
}

function goService() {
  uni.navigateTo({ url: withTenantCode("/pages/service/index") });
}

function goCommunity() {
  uni.navigateTo({ url: withTenantCode(`/pages/community/index?activityId=${activity.value?.id || ""}`) });
}

function goPublish() {
  uni.navigateTo({ url: withTenantCode(`/pages/community/publish?activityId=${activity.value?.id || ""}`) });
}

function h5Origin() {
  const direct = String(import.meta.env.VITE_H5_ORIGIN || import.meta.env.VITE_PUBLIC_H5_ORIGIN || "").trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(direct)) return direct;
  const apiBase = String(import.meta.env.VITE_API_BASE || "").trim();
  try {
    if (/^https?:\/\//i.test(apiBase)) return new URL(apiBase).origin;
  } catch {
    // Build-time configuration can be absent in local preview.
  }
  // #ifdef H5
  if (typeof window !== "undefined" && /^https?:\/\//i.test(window.location.origin)) return window.location.origin;
  // #endif
  return "https://rd.chaimen666.com";
}

function activityPosterLink() {
  const path = activitySharePath();
  return `${h5Origin()}/#${path}`;
}

function posterCoverUrl() {
  const value = String(activity.value?.shareImageUrl || activity.value?.coverUrl || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  return value.startsWith("/") ? `${h5Origin()}${value}` : value;
}

function drawPosterText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines: number) {
  const chars = String(text || "").split("");
  let line = "";
  let lineCount = 0;
  for (const char of chars) {
    const next = line + char;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y + lineCount * lineHeight);
      line = char;
      lineCount += 1;
      if (lineCount >= maxLines - 1) break;
    } else line = next;
  }
  if (line && lineCount < maxLines) {
    const consumed = lineCount * Math.max(1, Math.floor(maxWidth / Math.max(1, ctx.measureText("慢").width)));
    ctx.fillText(consumed < chars.length ? `${line.slice(0, Math.max(0, line.length - 1))}...` : line, x, y + lineCount * lineHeight);
  }
}

async function drawPosterImage(ctx: CanvasRenderingContext2D, src: string, x: number, y: number, width: number, height: number) {
  if (!src || typeof Image === "undefined") return false;
  return new Promise<boolean>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try { ctx.drawImage(image, x, y, width, height); resolve(true); } catch { resolve(false); }
    };
    image.onerror = () => resolve(false);
    image.src = src;
  });
}

async function qrDataUrl() {
  try { return await QRCode.toDataURL(activityPosterLink(), { errorCorrectionLevel: "M", width: 180, margin: 1, color: { dark: "#13241a", light: "#ffffff" } }); } catch { return ""; }
}

async function generateH5Poster() {
  const canvas = document.createElement("canvas");
  canvas.width = 750;
  canvas.height = 1120;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  ctx.fillStyle = "#f6f8f7";
  ctx.fillRect(0, 0, 750, 1120);
  ctx.fillStyle = "#13241a";
  ctx.font = "bold 40px PingFang SC, sans-serif";
  ctx.fillText("慢π · 城市活动", 50, 82);
  const imageDrawn = await drawPosterImage(ctx, posterCoverUrl(), 50, 118, 650, 380);
  if (!imageDrawn) {
    ctx.fillStyle = "#ddf6e6";
    ctx.fillRect(50, 118, 650, 380);
    ctx.fillStyle = "#08753f";
    ctx.font = "bold 64px PingFang SC, sans-serif";
    ctx.fillText("活动报名", 230, 330);
  }
  ctx.fillStyle = "#13241a";
  ctx.font = "bold 40px PingFang SC, sans-serif";
  drawPosterText(ctx, activity.value?.title || "慢π活动", 50, 565, 650, 52, 2);
  ctx.fillStyle = "#52645b";
  ctx.font = "28px PingFang SC, sans-serif";
  drawPosterText(ctx, `${formatTime(activity.value?.startTime)} 至 ${formatTime(activity.value?.endTime)}`, 50, 690, 430, 42, 2);
  drawPosterText(ctx, activity.value?.location || "地点待确认", 50, 780, 430, 42, 2);
  ctx.fillStyle = "#dc6900";
  ctx.font = "bold 36px PingFang SC, sans-serif";
  ctx.fillText(priceText(activity.value?.price), 50, 890);
  ctx.fillStyle = "#718078";
  ctx.font = "24px PingFang SC, sans-serif";
  ctx.fillText(`${seatsText()} · ${invite.value?.inviteText || "邀请你一起参加"}`, 50, 932);
  const qr = await qrDataUrl();
  const qrDrawn = await drawPosterImage(ctx, qr, 512, 832, 160, 160);
  ctx.fillStyle = "#52645b";
  ctx.font = "22px PingFang SC, sans-serif";
  ctx.fillText(qrDrawn ? "微信扫码查看活动" : "复制链接查看活动", 50, 1032);
  try { posterUrl.value = canvas.toDataURL("image/png"); return true; } catch { return false; }
}

function drawMiniProgramText(ctx: any, text: string, x: number, y: number, maxChars: number, lineHeight: number, maxLines: number) {
  const value = String(text || "");
  for (let index = 0; index < maxLines; index += 1) {
    const start = index * maxChars;
    if (start >= value.length) return;
    const part = value.slice(start, start + maxChars);
    ctx.fillText(index === maxLines - 1 && value.length > start + maxChars ? `${part.slice(0, Math.max(0, maxChars - 1))}...` : part, x, y + index * lineHeight);
  }
}

function drawMiniProgramQr(ctx: any, text: string, x: number, y: number, size: number) {
  try {
    const modules = (QRCode as any).create(text, { errorCorrectionLevel: "M" })?.modules;
    const moduleCount = Number(modules?.size || 0);
    if (!moduleCount || typeof modules.get !== "function") return false;
    const quiet = 4;
    const cell = Math.max(2, Math.floor(size / (moduleCount + quiet * 2)));
    const offset = Math.floor((size - cell * (moduleCount + quiet * 2)) / 2);
    ctx.setFillStyle("#ffffff"); ctx.fillRect(x, y, size, size);
    ctx.setFillStyle("#13241a");
    for (let row = 0; row < moduleCount; row += 1) for (let col = 0; col < moduleCount; col += 1) if (modules.get(row, col)) ctx.fillRect(x + offset + (quiet + col) * cell, y + offset + (quiet + row) * cell, cell, cell);
    return true;
  } catch { return false; }
}

async function generateMiniProgramPoster() {
  await nextTick();
  try {
    const ctx = uni.createCanvasContext("activityPosterCanvas");
    ctx.setFillStyle("#f6f8f7"); ctx.fillRect(0, 0, 750, 1120);
    ctx.setFillStyle("#13241a"); ctx.setFontSize(40); ctx.fillText("慢π · 城市活动", 50, 82);
    const cover = posterCoverUrl();
    const imageInfo = cover ? await new Promise<any>((resolve) => uni.getImageInfo({ src: cover, success: resolve, fail: () => resolve(null) })) : null;
    if (imageInfo?.path) ctx.drawImage(imageInfo.path, 50, 118, 650, 380);
    else { ctx.setFillStyle("#ddf6e6"); ctx.fillRect(50, 118, 650, 380); ctx.setFillStyle("#08753f"); ctx.setFontSize(64); ctx.fillText("活动报名", 230, 330); }
    ctx.setFillStyle("#13241a"); ctx.setFontSize(40); drawMiniProgramText(ctx, activity.value?.title || "慢π活动", 50, 565, 15, 52, 2);
    ctx.setFillStyle("#52645b"); ctx.setFontSize(28); drawMiniProgramText(ctx, `${formatTime(activity.value?.startTime)} 至 ${formatTime(activity.value?.endTime)}`, 50, 690, 18, 42, 2); drawMiniProgramText(ctx, activity.value?.location || "地点待确认", 50, 780, 18, 42, 2);
    ctx.setFillStyle("#dc6900"); ctx.setFontSize(36); ctx.fillText(priceText(activity.value?.price), 50, 890);
    ctx.setFillStyle("#718078"); ctx.setFontSize(24); ctx.fillText(seatsText(), 50, 932);
    const qrDrawn = drawMiniProgramQr(ctx, activityPosterLink(), 512, 832, 160);
    ctx.setFillStyle("#52645b"); ctx.setFontSize(22); ctx.fillText(qrDrawn ? "微信扫码查看活动" : "复制链接查看活动", 50, 1032);
    return await new Promise<boolean>((resolve) => ctx.draw(false, () => uni.canvasToTempFilePath({ canvasId: "activityPosterCanvas", width: 750, height: 1120, destWidth: 750, destHeight: 1120, success: (result) => { posterUrl.value = result.tempFilePath; resolve(true); }, fail: () => resolve(false) })));
  } catch { return false; }
}

async function generatePoster() {
  if (activeAction.value || !activity.value?.id) return;
  if (!invite.value?.code) await makeInvite();
  if (!invite.value?.code) return;
  activeAction.value = "poster";
  try {
    // #ifdef H5
    if (typeof document !== "undefined" && await generateH5Poster()) return;
    // #endif
    // #ifdef MP-WEIXIN
    if (await generateMiniProgramPoster()) return;
    // #endif
    copyText(activityPosterLink());
    uni.showToast({ title: "海报生成失败，已复制邀请链接", icon: "none" });
  } finally {
    if (activeAction.value === "poster") activeAction.value = "";
  }
}

function goActivitySpace() {
  if (!activity.value?.space?.canAccess) {
    uni.showToast({ title: "报名审核通过后可进入活动空间", icon: "none" });
    return;
  }
  uni.navigateTo({ url: withTenantCode(`/pages/activity/space?id=${activity.value.id}`) });
}

function openMoreActions() {
  moreActionsVisible.value = true;
}

function closeMoreActions() {
  moreActionsVisible.value = false;
}

function openLocation() {
  const latitude = locationLatitude();
  const longitude = locationLongitude();
  if (canUseNativeMap() && latitude !== undefined && longitude !== undefined) {
    uni.openLocation({
      latitude,
      longitude,
      name: activity.value?.title || "活动地点",
      address: activity.value?.location || ""
    });
    return;
  }
  if (activity.value?.locationMapUrl) {
    // H5 可直接打开第三方地图分享链接；小程序端会降级为复制链接。
    // @ts-ignore
    if (typeof window !== "undefined") window.open(activity.value.locationMapUrl, "_blank");
    else copyText(activity.value.locationMapUrl);
  }
  else copyText(activity.value?.location);
}

async function subscribeNotice() {
  if (activeAction.value || !activity.value) return;
  activeAction.value = "reminder";
  try {
    // #ifdef MP-WEIXIN
    await ensureUser();
    const templates = await fetchWechatSubscriptionTemplates(["activityReminder", "activityChanged", "activityCancelled"]);
    const result = await requestWechatSubscriptions(templates);
    if (result.accepted > 0) uni.showToast({ title: `已订阅 ${result.accepted} 项通知`, icon: "success" });
    else if (result.banned > 0) uni.showToast({ title: "请在小程序设置中开启订阅消息", icon: "none" });
    else uni.showToast({ title: "未授权订阅消息", icon: "none" });
    return;
    // #endif
    // #ifndef MP-WEIXIN
    await addActivityToCalendar({
      title: activity.value?.title || "慢π活动",
      startTime: activity.value?.startTime,
      endTime: activity.value?.endTime,
      location: activity.value?.location,
      description: activity.value?.description || "慢π活动提醒"
    });
    uni.showToast({ title: "已添加活动提醒", icon: "success" });
    // #endif
  } catch (error: any) {
    uni.showToast({ title: reviewSafeText(error?.message || "订阅提醒失败"), icon: "none" });
  } finally {
    if (activeAction.value === "reminder") activeAction.value = "";
  }
}

async function load() {
  const token = loadGuard.begin();
  loading.value = true;
  error.value = "";
  try {
    const pages = getCurrentPages();
    const options = (pages[pages.length - 1] as any).options || {};
    const id = Number(options.id);
    inviteCode.value = options.inviteCode || "";
    channelCode.value = options.channelCode || "";
    source.value = options.source || defaultSource();
    const query = [
      inviteCode.value ? `inviteCode=${encodeURIComponent(inviteCode.value)}` : "",
      channelCode.value ? `channelCode=${encodeURIComponent(channelCode.value)}` : "",
      `source=${encodeURIComponent(source.value)}`
    ].filter(Boolean).join("&");
    const [detail, setting] = await Promise.all([
      request(`/public/activities/${id}/enhanced?${query}`),
      request("/public/settings/operation")
    ]);
    if (!loadGuard.isCurrent(token)) return;
    activity.value = reviewSafeData(detail);
    operationSetting.value = reviewSafeData(setting);
  } catch (err: any) {
    if (loadGuard.isCurrent(token)) error.value = reviewSafeText(err.message || "加载失败");
  } finally {
    if (loadGuard.isCurrent(token)) loading.value = false;
  }
}

onShow(() => {
  // Sharing without an invite code cannot be attributed to a real inviter.
  // #ifdef MP-WEIXIN
  uni.hideShareMenu();
  // #endif
  void Promise.allSettled([load(), loadDecoration()]);
});
</script>

<template>
  <view class="container detail-page has-custom-nav">
    <view v-if="loading" class="card subtle">加载中...</view>
    <view v-else-if="error" class="card">
      <view class="subtle">{{ error }}</view>
      <view class="button secondary retry" role="button" tabindex="0" aria-label="重新加载活动详情" @click="load" @keyup.enter="load" @keyup.space.prevent="load">重试</view>
    </view>

    <template v-else-if="activity">
      <TenantContextBadge :tenant="tenant" label="当前城市" hint="活动归属" />

      <view class="detail-hero app-enter">
        <image v-if="activity.coverUrl" class="hero-image app-media-motion" :src="activity.coverUrl" mode="aspectFill" />
        <view v-else class="hero-image hero-fallback">雅集</view>
        <view class="hero-mask"></view>
        <view class="hero-head">
          <text class="hero-kicker">{{ activity.category?.name || "城市文化活动" }}</text>
          <text class="hero-status">{{ statusText(activity.displayStatus) }}</text>
        </view>
        <view class="hero-bottom">
          <view class="detail-head">
            <view class="detail-head-title">{{ activity.title }}</view>
            <view class="detail-head-copy">{{ innerPageConfig.subtitle || "查看活动介绍、报名规则、服务说明和现场信息。" }}</view>
          </view>
        </view>
      </view>

      <view class="detail-decision-panel app-enter" style="animation-delay: 92ms">
        <view class="decision-time"><text class="decision-label">活动时间</text><text class="decision-value">{{ formatTime(activity.startTime) }}</text><text class="decision-helper">{{ formatTime(activity.endTime) }}</text></view>
        <view class="decision-place"><text class="decision-label">集合地点</text><text class="decision-value">{{ activity.location || "地点待确认" }}</text><text class="decision-helper">{{ activity.registeredCount || 0 }} 人已报名 · 余 {{ activity.remainingSeats }} 个名额</text></view>
        <view class="decision-price-panel"><text class="decision-price-value">{{ priceText(activity.price) }}</text><text class="decision-helper">{{ activity.requireReview ? "报名后审核" : "报名即确认" }}</text></view>
      </view>

      <PageDecorationBlocks :sections="bodyDecorationSections" />

      <view class="card head app-enter" style="animation-delay: 132ms">
        <view class="decision-box">
          <view>
            <view class="decision-title">{{ registerButtonText() }}</view>
            <view class="body-text decision-copy">{{ actionHint() }}</view>
          </view>
          <view class="decision-status">{{ statusText(activity.displayStatus) }}</view>
        </view>
        <view class="content-heading">
          <view><text class="content-kicker">活动内容</text><view class="section-title">活动亮点</view></view>
          <text class="content-status">{{ activity.requireReview ? "需审核" : "即时确认" }}</text>
        </view>
        <view class="row"><text class="tag tag-secondary">{{ activity.category?.name || "活动" }}</text><text class="tag tag-primary">{{ priceText(activity.price) }}</text></view>
        <rich-text class="activity-description activity-rich" :nodes="richActivityContent(activity.description || '主办方正在完善活动介绍，欢迎先查看活动信息和报名规则。')" />
        <view class="stats">
          <view><text>{{ activity.registeredCount }}</text><text>已报名</text></view>
          <view><text>{{ activity.remainingSeats }}</text><text>剩余名额</text></view>
          <view><text>{{ activity.viewCount }}</text><text>浏览</text></view>
          <view><text>{{ activity.shareVisitCount }}</text><text>分享访问</text></view>
        </view>
      </view>

      <AdSlotRenderer slot-key="activity_detail_middle" page-key="activity_detail" />

      <view class="card info app-enter" style="animation-delay: 164ms">
        <view class="section-title">活动信息</view>
        <view class="info-summary">
          <view><text>状态</text><text>{{ statusText(activity.displayStatus) }}</text></view>
          <view><text>名额</text><text>{{ seatsText() }}</text></view>
          <view><text>截止</text><text>{{ deadlineText() }}</text></view>
        </view>
        <view class="line"><text>时间</text><text>{{ formatTime(activity.startTime) }} - {{ formatTime(activity.endTime) }}</text></view>
        <view class="line"><text>地点</text><text>{{ activity.location }}</text></view>
        <view v-if="hasMapInfo()" class="location-map">
          <map
            v-if="canUseNativeMap()"
            class="map-view"
            :latitude="locationLatitude()"
            :longitude="locationLongitude()"
            :markers="[{ id: 1, latitude: locationLatitude(), longitude: locationLongitude(), title: activity.location }]"
            :scale="16"
            @click="openLocation"
          />
          <view v-else class="map-link" role="button" tabindex="0" aria-label="打开活动地点" @click="openLocation" @keyup.enter="openLocation" @keyup.space.prevent="openLocation">
            <view class="map-pin">地</view>
            <view>
              <view class="name">查看地图</view>
              <view class="subtle">{{ activity.location }}</view>
            </view>
          </view>
        <view class="map-action" role="button" tabindex="0" aria-label="打开地图导航" @click="openLocation" @keyup.enter="openLocation" @keyup.space.prevent="openLocation">{{ mapActionText() }}</view>
        </view>
        <view class="line"><text>费用</text><text>{{ priceText(activity.price) }}</text></view>
        <view v-if="activity.minMemberLevel" class="line"><text>门槛</text><text>{{ activity.minMemberLevel.name }}及以上会员</text></view>
        <view v-if="activity.memberAccess?.priorityMemberLevel" class="line"><text>优先</text><text>{{ activity.memberAccess.priorityMemberLevel.name }}优先报名至 {{ formatTime(activity.memberAccess.priorityRegistrationEndsAt) }}</text></view>
        <view class="line"><text>截止</text><text>{{ formatTime(activity.registrationDeadline) }}</text></view>
        <view v-if="showMemberAccess()" class="member-access" :class="{ blocked: !activity.memberAccess?.eligible }">
          <view class="name">{{ activity.memberAccess?.priorityActive ? "会员优先报名中" : "会员报名规则" }}</view>
          <view class="subtle">{{ activity.memberAccess?.message }}</view>
          <view v-if="activity.memberAccess?.currentLevel" class="subtle">当前等级：{{ activity.memberAccess.currentLevel.name }}</view>
        </view>
        <view v-if="registrationPaused()" class="operation-notice">
          <view class="name">报名通道暂停</view>
          <view class="subtle">{{ registrationPausedMessage() }}</view>
        </view>
        <view v-if="hasGroupQrCode" class="group-flow">
          <view class="name">报名成功后可加入活动群</view>
          <view class="subtle">群二维码不会在公开活动页展示；报名提交并进入报名详情后，可查看入群入口和后续通知。</view>
        </view>
      </view>

      <view class="card action-card app-enter" style="animation-delay: 196ms">
        <view class="section-title">快捷操作</view>
        <view class="action-item app-press" role="button" tabindex="0" :aria-disabled="Boolean(activeAction)" :aria-busy="activeAction === 'invite'" aria-label="邀请好友" :class="{ disabled: Boolean(activeAction) }" @click="makeInvite" @keyup.enter="makeInvite" @keyup.space.prevent="makeInvite">
          <text>邀</text>
          <view>邀请好友</view>
        </view>
        <view class="action-item app-press" role="button" tabindex="0" :aria-disabled="Boolean(activeAction)" :aria-busy="activeAction === 'reminder'" aria-label="订阅活动通知" :class="{ disabled: Boolean(activeAction) }" @click="subscribeNotice" @keyup.enter="subscribeNotice" @keyup.space.prevent="subscribeNotice">
          <text>醒</text>
          <!-- #ifdef MP-WEIXIN -->
          <view>订阅提醒</view>
          <!-- #endif -->
          <!-- #ifndef MP-WEIXIN -->
          <view>添加到日历</view>
          <!-- #endif -->
        </view>
        <view class="action-item app-press" role="button" tabindex="0" aria-label="联系客服" @click="goService" @keyup.enter="goService" @keyup.space.prevent="goService">
          <text>服</text>
          <view>客服说明</view>
        </view>
        <view class="action-item app-press" role="button" tabindex="0" aria-label="更多活动操作" @click="openMoreActions" @keyup.enter="openMoreActions" @keyup.space.prevent="openMoreActions">
          <text>···</text>
          <view>更多操作</view>
        </view>
        <!-- #ifdef MP-WEIXIN -->
        <button v-if="invite?.code" class="action-item action-share app-press" open-type="share" aria-label="分享活动给微信好友"><text>享</text><view>微信分享</view></button>
        <!-- #endif -->
        <!-- #ifdef H5 -->
        <view v-if="invite?.code" class="action-item app-press" role="button" tabindex="0" aria-label="复制活动邀请链接" @click="copyText(activityPosterLink())" @keyup.enter="copyText(activityPosterLink())" @keyup.space.prevent="copyText(activityPosterLink())"><text>链</text><view>复制邀请链接</view></view>
        <!-- #endif -->
      </view>

      <view v-if="moreActionsVisible" class="more-actions-mask" role="presentation" @click.self="closeMoreActions">
        <view class="more-actions-sheet app-sheet-enter" role="dialog" aria-label="更多活动操作">
          <view class="more-actions-head"><text class="section-title">更多操作</text><text class="more-actions-close app-press" role="button" tabindex="0" aria-label="关闭更多操作" @click="closeMoreActions" @keyup.enter="closeMoreActions">关闭</text></view>
          <view class="more-actions-list">
            <view class="more-action-row app-press" role="button" tabindex="0" @click="closeMoreActions(); goMy()"><text class="more-action-icon">票</text><view><text>我的报名</text><text>查看当前活动的报名状态</text></view><text class="more-action-arrow">›</text></view>
            <view class="more-action-row app-press" role="button" tabindex="0" @click="closeMoreActions(); goActivitySpace()"><text class="more-action-icon">圈</text><view><text>活动空间</text><text>{{ activity.space?.canAccess ? "公告、成员、问答和签到" : "报名审核通过后开放" }}</text></view><text class="more-action-arrow">›</text></view>
            <view v-if="isLinkAllowedByFeature('/pages/community/publish')" class="more-action-row app-press" role="button" tabindex="0" @click="closeMoreActions(); goPublish()"><text class="more-action-icon">记</text><view><text>分享心得</text><text>记录你的活动体验</text></view><text class="more-action-arrow">›</text></view>
            <view v-if="isLinkAllowedByFeature('/pages/community/index')" class="more-action-row app-press" role="button" tabindex="0" @click="closeMoreActions(); goCommunity()"><text class="more-action-icon">看</text><view><text>活动口碑</text><text>查看评价与公开讨论</text></view><text class="more-action-arrow">›</text></view>
          </view>
        </view>
      </view>

      <view class="card invite-card">
        <view class="row"><view class="title small">邀请好友</view><view class="mini-button" role="button" tabindex="0" :aria-disabled="Boolean(activeAction)" :class="{ disabled: Boolean(activeAction) }" @click="makeInvite" @keyup.enter="makeInvite" @keyup.space.prevent="makeInvite">{{ activeAction === "invite" ? "生成中" : "生成" }}</view></view>
        <view class="body-text invite-copy">生成专属邀请码，用于追踪分享访问和后续邀请报名。</view>
        <view v-if="invite" class="invite-box">
          <view class="name">邀请码：{{ invite.code }}</view>
          <view class="subtle">{{ invite.inviteText }}</view>
          <view class="share-url" role="button" tabindex="0" aria-label="复制邀请链接" @click="copyText(activityPosterLink())" @keyup.enter="copyText(activityPosterLink())" @keyup.space.prevent="copyText(activityPosterLink())">{{ activityPosterLink() }}</view>
          <view class="copy-hint">点击链接可复制</view>
          <view class="invite-actions">
            <view class="mini-button" role="button" tabindex="0" :aria-busy="activeAction === 'poster'" @click="generatePoster" @keyup.enter="generatePoster" @keyup.space.prevent="generatePoster">{{ activeAction === "poster" ? "制作中" : "生成活动海报" }}</view>
            <!-- #ifdef MP-WEIXIN -->
            <button class="mini-button native-share-button" open-type="share">发给微信好友</button>
            <!-- #endif -->
          </view>
        </view>
      </view>

      <view v-if="posterUrl" class="poster-mask" @click="posterUrl = ''">
        <view class="poster-panel" @click.stop>
          <image :src="posterUrl" mode="widthFix" />
          <view class="subtle poster-hint">长按海报保存，海报内容包含本活动真实信息和专属邀请链接。</view>
          <view class="button secondary" role="button" tabindex="0" aria-label="关闭活动海报" @click="posterUrl = ''" @keyup.enter="posterUrl = ''">关闭</view>
        </view>
      </view>
      <!-- #ifdef MP-WEIXIN -->
      <canvas canvas-id="activityPosterCanvas" id="activityPosterCanvas" class="poster-canvas"></canvas>
      <!-- #endif -->

      <view class="card service-card" v-if="operationSetting">
        <view class="title small">主办方服务</view>
        <view v-if="operationSetting.customerServiceName" class="service-line"><text>客服</text><text>{{ operationSetting.customerServiceName }}</text></view>
        <view v-if="operationSetting.customerServicePhone" class="service-line" @click="copyText(operationSetting.customerServicePhone)"><text>电话</text><text>{{ operationSetting.customerServicePhone }}</text></view>
        <view v-if="operationSetting.customerServiceWechat" class="service-line" @click="copyText(operationSetting.customerServiceWechat)"><text>微信</text><text>{{ operationSetting.customerServiceWechat }}</text></view>
        <!-- #ifdef MP-WEIXIN -->
        <button class="service-contact-button" open-type="contact" :session-from="customerServiceSession">咨询微信客服</button>
        <!-- #endif -->
        <view v-if="operationSetting.refundInstructions" class="service-note">{{ operationSetting.refundInstructions }}</view>
      </view>

      <view class="card organizer-card" v-if="activity.tenant?.organizerProfile?.logoUrl || activity.tenant?.organizerProfile?.intro || activity.tenant?.organizerProfile?.servicePromise">
        <view class="title small">主办方</view>
        <view class="organizer-head">
          <image v-if="activity.tenant?.organizerProfile?.logoUrl" :src="activity.tenant.organizerProfile.logoUrl" mode="aspectFill" />
          <view v-else class="organizer-logo-fallback">{{ (activity.tenant?.name || "主办方").slice(0, 1) }}</view>
          <view><view class="name">{{ activity.tenant?.name || "主办方" }}</view><view v-if="activity.tenant?.region" class="subtle">{{ activity.tenant.region }}</view></view>
        </view>
        <view v-if="activity.tenant?.organizerProfile?.intro" class="organizer-intro">{{ activity.tenant.organizerProfile.intro }}</view>
        <view v-if="activity.tenant?.organizerProfile?.servicePromise" class="organizer-promise"><text>服务承诺</text><text>{{ activity.tenant.organizerProfile.servicePromise }}</text></view>
      </view>

      <view class="card" v-if="activity.hosts?.length">
        <view class="title small">讲师 / 主理人</view>
        <view v-for="host in activity.hosts" :key="host.id" class="host">
          <image v-if="host.avatarUrl" :src="host.avatarUrl" mode="aspectFill" />
          <view><view class="name">{{ host.name }}<text v-if="host.title"> · {{ host.title }}</text></view><view class="subtle">{{ host.bio }}</view></view>
        </view>
      </view>

      <view class="card" v-for="section in activity.sections" :key="section.id">
        <view class="title small">{{ section.title }}</view>
        <image v-if="section.imageUrl" class="section-image" :src="section.imageUrl" mode="widthFix" />
        <rich-text class="section-content activity-rich" :nodes="richActivityContent(section.content)" />
      </view>
      <view class="card" v-if="activity.notice"><view class="title small">报名须知</view><rich-text class="section-content activity-rich" :nodes="richActivityContent(activity.notice)" /></view>
      <view class="card" v-if="activity.reviews?.length">
        <view class="title small">活动评价</view>
        <view v-for="review in activity.reviews" :key="review.id" class="review"><view class="review-head"><view class="name">{{ "★".repeat(review.rating) }}<text v-if="review.featured" class="featured-review">精选</text></view><view class="report-link" role="button" tabindex="0" :aria-disabled="Boolean(activeAction)" :class="{ disabled: Boolean(activeAction) }" @click="reportReview(review)" @keyup.enter="reportReview(review)" @keyup.space.prevent="reportReview(review)">{{ activeAction === `report:${review.id}` ? "提交中" : "举报" }}</view></view><view>{{ review.content }}</view><view v-if="review.adminReply" class="subtle reply">主办方回复：{{ review.adminReply }}</view></view>
      </view>

      <view class="bottom-bar app-enter" style="animation-delay: 180ms" :style="{ background: String(innerPageLayout.actionBarBackgroundColor || '#ffffff') }">
        <view class="bottom-info"><text>{{ priceText(activity.price) }}</text><text>{{ activity.displayStatus === "full" ? "候补开放" : statusText(activity.displayStatus) }}</text></view>
        <view class="button action-button app-press" role="button" tabindex="0" :aria-disabled="!canRegister()" :aria-label="registerButtonText()" :class="{ secondary: !canRegister() }" @click="register" @keyup.enter="register" @keyup.space.prevent="register">{{ registerButtonText() }}</view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.detail-page { width:100%; max-width:760px; min-height:100vh; margin:0 auto; box-sizing:border-box; padding:calc(16rpx + env(safe-area-inset-top)) 0 calc(168rpx + env(safe-area-inset-bottom)); overflow-wrap:anywhere; background:#f6f8f7; }
.more-actions-mask{position:fixed;inset:0;z-index:30;display:flex;align-items:flex-end;background:rgba(15,23,42,.46)}
.more-actions-sheet{width:100%;box-sizing:border-box;padding:28rpx 24rpx calc(28rpx + env(safe-area-inset-bottom));border-radius:18rpx 18rpx 0 0;background:#fff}
.more-actions-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12rpx}.more-actions-head .section-title{margin:0}.more-actions-close{color:#6b7c85;font-size:23rpx}
.more-actions-list{display:grid;gap:4rpx}.more-action-row{display:flex;align-items:center;gap:16rpx;min-height:92rpx;padding:12rpx 4rpx;border-bottom:1rpx solid #eef2f0}.more-action-row:last-child{border-bottom:0}.more-action-row>view{display:grid;gap:5rpx;min-width:0;flex:1}.more-action-row>view text:first-child{color:#172b4d;font-size:26rpx;font-weight:800}.more-action-row>view text:last-child{color:#7a8881;font-size:21rpx}.more-action-icon{width:58rpx;height:58rpx;display:grid;place-items:center;border-radius:50%;background:#e9f8ef;color:#08753f;font-size:23rpx;font-weight:900}.more-action-arrow{color:#9aa7a0;font-size:34rpx}
.detail-page .card { margin-left: 24rpx; margin-right: 24rpx; }
.detail-page :deep(.tenant-context-badge) { margin-left: 24rpx; margin-right: 24rpx; }
.detail-hero {
  position: relative;
  overflow: hidden;
  min-height: 500rpx;
  margin: 0 24rpx;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #164e63, #0f766e);
  box-shadow: 0 16rpx 34rpx rgba(23, 63, 58, 0.16);
}
.hero-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
}
.hero-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 248, 240, 0.92);
  font-size: 74rpx;
  font-weight: 700;
  font-family: "STKaiti", "KaiTi", serif;
}
.hero-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(11, 43, 57, 0.08), rgba(11, 43, 57, 0.84));
}
.hero-head,
.hero-bottom {
  position: relative;
  z-index: 1;
}
.hero-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
  padding: 28rpx 28rpx 0;
}
.hero-kicker {
  color: rgba(255, 255, 255, 0.82);
  font-size: 23rpx;
  font-weight: 800;
}
.hero-status {
  min-height: 50rpx;
  padding: 0 16rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  font-size: 22rpx;
  font-weight: 700;
}
.hero-bottom {
  min-height: 500rpx;
  display: flex;
  align-items: flex-end;
  padding: 28rpx;
}
.detail-head {
  width: 100%;
  margin-bottom: 0;
  padding: 0;
  border-radius: 0;
  box-shadow: none;
  background: transparent !important;
}
.detail-head-title {
  color: #fff;
  font-size: 44rpx;
  line-height: 1.3;
  font-weight: 800;
}
.detail-head-copy {
  margin-top: 12rpx;
  color: rgba(255,255,255,.82);
  font-size: 24rpx;
  line-height: 1.6;
}
.detail-decision-panel { display: grid; grid-template-columns: 1.05fr 1.45fr .9fr; gap: 12rpx; margin: -30rpx 40rpx 28rpx; padding: 22rpx; border: 1rpx solid rgba(22,78,99,.12); border-radius: 16rpx; background: #fff; box-shadow: 0 14rpx 30rpx rgba(23,63,58,.11); position:relative; z-index:2; }
.decision-label,.decision-helper { display: block; color: #6b7c85; font-size: 20rpx; line-height: 1.45; }
.decision-value { display: block; margin: 7rpx 0; overflow: hidden; color: #172b4d; font-size: 26rpx; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.decision-time,.decision-place { min-width: 0; }
.decision-place { padding-left: 16rpx; border-left: 1rpx solid #dbe3e6; }
.decision-price-panel { display: grid; align-content: center; justify-items: end; text-align: right; }
.decision-price-value { color: #b45309; font-size: 31rpx; font-weight: 800; }
.detail-page .head { display: grid; gap: 20rpx; margin: 0 24rpx 24rpx; padding: 28rpx; border-radius: 16rpx; }
.detail-page :deep(.page-decoration-blocks) { margin-left: 24rpx; margin-right: 24rpx; }
.title { font-family: inherit; }
.desc { line-height: 1.7; }
.decision-box {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
  padding: 22rpx;
  border-radius: 12rpx;
  background: #edf5f4;
  border: 1rpx solid #d9e9e5;
}
.decision-title { color: #172b4d; font-size: 30rpx; font-weight: 800; margin-bottom: 10rpx; }
.decision-copy { max-width: 420rpx; }
.decision-status { align-self: center; flex: 0 0 auto; padding: 10rpx 14rpx; border-radius: 8rpx; background: #0f766e; color: #fff; font-size: 23rpx; font-weight: 700; }
.content-heading { display:flex; align-items:center; justify-content:space-between; gap:18rpx; }
.content-kicker { display:block; margin-bottom:6rpx; color:#0f766e; font-size:21rpx; font-weight:700; }
.content-status { flex:0 0 auto; padding:8rpx 12rpx; border-radius:999px; color:#8a4b0f; background:#fff4e5; font-size:21rpx; font-weight:700; }
.small { font-size: 30rpx; margin-bottom: 16rpx; font-weight:800; }
.section-title {
  margin-bottom: 16rpx;
  font-size: 30rpx;
  font-weight: 800;
  color: #172b4d;
}
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10rpx; }
.stats view { display: grid; gap: 6rpx; padding: 16rpx 10rpx; border-radius: 10rpx; background: #f0f5f4; text-align: center; }
.stats text:first-child { color: #0f766e; font-weight: 800; font-size: 30rpx; }
.stats text:last-child { color: #6b7c85; font-size: 22rpx; }
.info-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10rpx; margin-bottom: 18rpx; }
.info-summary view { display: grid; gap: 8rpx; min-height: 82rpx; padding: 16rpx; border-radius: 10rpx; background: #f0f5f4; }
.info-summary text:first-child { color: #6b7c85; font-size: 22rpx; }
.info-summary text:last-child { color: #172b4d; font-size: 24rpx; font-weight: 700; overflow-wrap:anywhere; }
.line { display: grid; grid-template-columns: 90rpx 1fr; gap: 16rpx; margin-top: 16rpx; color: #475569; font-size:26rpx; line-height:1.55; }
.line text:first-child { color: #6b7c85; font-size:24rpx; }
.location-map { margin-top: 18rpx; overflow: hidden; border-radius: 12rpx; border: 1px solid #d8e9e5; background: #f4f8f7; }
.map-view { width: 100%; height: 300rpx; display: block; }
.map-link { min-height: 160rpx; display: flex; align-items: center; gap: 18rpx; padding: 24rpx; }
.map-pin { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #0f766e; color: #fff; font-size: 26rpx; font-weight: 700; flex: 0 0 auto; }
.map-action { display: flex; align-items: center; justify-content: center; min-height: 72rpx; border-top: 1px solid #d8e9e5; color: #0f766e; font-size: 26rpx; font-weight: 700; background: var(--card-bg, #fff); }
.member-access { margin-top: 18rpx; padding: 18rpx; border-radius: 18rpx; background: rgba(74, 107, 138, 0.08); border: 1px solid rgba(74, 107, 138, 0.12); }
.member-access.blocked { background: rgba(255, 159, 0, 0.08); border-color: rgba(255, 159, 0, 0.18); }
.operation-notice { margin-top: 18rpx; padding: 18rpx; border-radius: 6px; background: #fff7ed; border: 1px solid #fed7aa; }
.group-flow { margin-top: 18rpx; padding: 18rpx; border-radius: 18rpx; background: #eef8f5; border: 1px solid rgba(15, 118, 110, 0.16); }
.group-flow .name { color: #0f766e; font-weight: 800; margin-bottom: 8rpx; }
.action-card { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18rpx; }
.action-card .section-title { grid-column: 1 / -1; margin-bottom: 0; }
.action-item { display: grid; gap: 10rpx; justify-items: center; color: #666666; font-size: 24rpx; font-weight: 600; }
.action-item text { width: 58rpx; height: 58rpx; display: flex; align-items: center; justify-content: center; border-radius: 20rpx; background: rgba(74, 107, 138, 0.12); color: #4a6b8a; font-size: 25rpx; font-weight: 700; }
.mini-button { padding: 10rpx 18rpx; border-radius: 12rpx; color: #c43d3d; background: rgba(196, 61, 61, 0.12); font-size: 24rpx; }
.invite-copy { margin-top: 0; }
.invite-box { margin-top: 18rpx; padding: 18rpx; border-radius: 18rpx; background: #f9f4ee; }
.share-url { margin-top: 10rpx; color: #4a6b8a; font-size: 24rpx; word-break: break-all; }
.copy-hint { margin-top: 8rpx; color: #98a2b3; font-size: 22rpx; }
.service-line { display: grid; grid-template-columns: 90rpx 1fr; gap: 16rpx; padding: 12rpx 0; border-bottom: 1px solid #e8e0d8; }
.service-line text:first-child { color: #999999; }
.service-line text:last-child { color: #333333; font-weight: 600; overflow-wrap: anywhere; }
.service-contact-button { width: 100%; min-height: 76rpx; margin-top: 18rpx; border: 0; border-radius: 8rpx; background: #edf7f5; color: #0f766e; font-size: 25rpx; font-weight: 700; line-height: 76rpx; }
.service-contact-button::after { border: 0; }
.service-note { margin-top: 14rpx; padding: 16rpx; border-radius: 18rpx; background: #f9f4ee; color: #666666; font-size: 25rpx; line-height: 1.6; }
.organizer-card { display: grid; gap: 16rpx; }
.organizer-head { display: flex; align-items: center; gap: 16rpx; }
.organizer-head image, .organizer-logo-fallback { width: 76rpx; height: 76rpx; border-radius: 8rpx; background: #e9f8ef; flex: 0 0 auto; }
.organizer-logo-fallback { display: grid; place-items: center; color: #08753f; font-size: 29rpx; font-weight: 900; }
.organizer-head .name { color: #193827; font-size: 27rpx; font-weight: 850; }
.organizer-intro { color: #52645b; font-size: 23rpx; line-height: 1.65; }
.organizer-promise { display: grid; gap: 6rpx; padding: 14rpx; border-radius: 6rpx; background: #edf9f1; color: #355044; font-size: 22rpx; line-height: 1.55; }
.organizer-promise text:first-child { color: #08753f; font-size: 20rpx; font-weight: 800; }
.host, .review { padding: 16rpx 0; border-bottom: 1px solid #e8e0d8; }
.host { display: flex; gap: 18rpx; }
.host image { width: 88rpx; height: 88rpx; border-radius: 44rpx; background: #dde5ed; flex: 0 0 auto; }
.host:last-child, .review:last-child { border-bottom: 0; }
.name { font-weight: 650; margin-bottom: 8rpx; color: #333333; }
.section-image { display: block; width: 100%; border-radius: 20rpx; margin-bottom: 18rpx; background: #dde5ed; }
.activity-description { display: block; margin-top: 16rpx; }
.section-content { display: block; line-height: 1.85; color: #344054; }
.activity-rich { overflow-wrap: anywhere; }
.reply { margin-top: 8rpx; }
.retry { margin-top: 18rpx; }
.bottom-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: grid;
  grid-template-columns: 200rpx 1fr;
  gap: 18rpx;
  align-items: center;
  padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.98);
  border-top: 1rpx solid #d8e9e5;
  box-shadow: 0 -10rpx 30rpx rgba(20, 72, 64, 0.08);
}
.bottom-info { display: grid; gap: 4rpx; min-width: 0; }
.bottom-info text:first-child { color: #c35240; font-size: 36rpx; font-weight: 900; }
.bottom-info text:last-child { color: #999999; font-size: 22rpx; }
.action-button { height: 92rpx; font-size: 32rpx; }
.action-share { border:0; padding:0; font-family:inherit; line-height:normal; }
.native-share-button { margin:0; border:0; }
.invite-actions { display:flex; flex-wrap:wrap; gap:12rpx; margin-top:16rpx; }
.poster-mask { position:fixed; inset:0; z-index:40; display:flex; align-items:center; justify-content:center; padding:30rpx; box-sizing:border-box; background:rgba(15,23,42,.62); }
.poster-panel { width:min(680rpx,100%); max-height:90vh; overflow:auto; padding:22rpx; box-sizing:border-box; border-radius:8rpx; background:#fff; text-align:center; }
.poster-panel image { display:block; width:100%; max-height:74vh; }
.poster-hint { margin:14rpx 0; line-height:1.5; }
.poster-canvas { position:fixed; left:-9999px; top:-9999px; width:750px; height:1120px; opacity:0; pointer-events:none; }

/* Keep the decision flow dense: image, key facts, then the single registration action. */
.detail-page { background:#f7f9f8; }
.detail-page .detail-hero { margin:0 24rpx; border-radius:8rpx; overflow:hidden; }.detail-page .hero-image { border-radius:0; }
.detail-page .detail-decision-panel { margin:0 24rpx 18rpx; padding:20rpx; border:1rpx solid #e2eae6; border-radius:8rpx; background:#fff; box-shadow:0 8rpx 20rpx rgba(23,48,36,.035); }
.detail-page .head,.detail-page .card { border-color:#e2eae6; border-radius:8rpx; box-shadow:0 8rpx 20rpx rgba(23,48,36,.035); }.detail-page .decision-box { border-color:#d8eee1; border-radius:8rpx; background:#effbf4; }.detail-page .decision-status { border-radius:6rpx; background:#20b967; }.detail-page .content-kicker { color:#078347; }.detail-page .stats view,.detail-page .info-summary view { border-radius:8rpx; background:#f4f8f6; }.detail-page .stats text:first-child { color:#078347; }.detail-page .location-map { border-radius:8rpx; border-color:#dce8e2; background:#f7f9f8; }.detail-page .map-pin { border-radius:8rpx; background:#20b967; }.detail-page .map-action { border-color:#dce8e2; color:#08753f; }.detail-page .group-flow { border-radius:8rpx; background:#effbf4; border-color:#d8eee1; }.detail-page .action-item text { border-radius:8rpx; background:#eafbf1; color:#08753f; }.detail-page .section-image { border-radius:8rpx; }.detail-page .bottom-bar { border-color:#dce8e2; }.detail-page .bottom-info text:first-child { color:#dc6900; }.detail-page .action-button { border-radius:8rpx; background:#20d477; color:#072d19; }
@media (min-width:900px){.detail-page .bottom-bar{left:50%;right:auto;width:760px;max-width:100%;transform:translateX(-50%);box-sizing:border-box;border-left:1rpx solid #dce8e2;border-right:1rpx solid #dce8e2}}
</style>
