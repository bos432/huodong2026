<script setup lang="ts">
import { onMounted, ref } from "vue";
import { ensureUser, request, withTenantCode } from "../../api";
import { usePageDecoration } from "../../decoration";
import TenantContextBadge from "../../components/TenantContextBadge.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";

const activity = ref<any>();
const invite = ref<any>();
const operationSetting = ref<any>();
const loading = ref(true);
const error = ref("");
const inviteCode = ref("");
const channelCode = ref("");
const source = ref("h5");
const { tenant, contentSections, innerPageConfig, innerPageLayout, loadDecoration } = usePageDecoration("activity_detail", "/pages/activity/detail");

function registrationPaused() {
  const value = operationSetting.value?.registrationEnabled;
  return value === false || value === 0 || value === "0";
}

function registrationPausedMessage() {
  return operationSetting.value?.registrationDisabledMessage || "报名通道暂时关闭，请稍后再试或联系主办方。";
}

function canRegister() {
  const status = activity.value?.displayStatus;
  return !registrationPaused() && (status === "open" || status === "full") && (activity.value?.memberAccess?.eligible ?? true);
}

function registerButtonText() {
  if (registrationPaused()) return "报名暂停";
  if (activity.value?.memberAccess && !activity.value.memberAccess.eligible) return "会员等级不足";
  if (activity.value?.displayStatus === "full") return "加入候补";
  if (activity.value?.displayStatus === "ended") return "报名已结束";
  if (activity.value?.displayStatus !== "open") return "暂不可报名";
  return "立即报名";
}

function actionHint() {
  if (registrationPaused()) return registrationPausedMessage();
  if (activity.value?.memberAccess && !activity.value.memberAccess.eligible) return activity.value.memberAccess.message || "当前账号暂不满足报名条件。";
  if (activity.value?.displayStatus === "full") return "当前名额已满，你仍可先加入候补名单。";
  if (activity.value?.displayStatus === "ended") return "报名已结束，可以查看活动信息或联系主办方。";
  return "名额仍可报名，提交后请留意付款、审核或活动通知。";
}

function register() {
  if (!canRegister()) {
    uni.showToast({ title: registrationPaused() ? registrationPausedMessage() : activity.value?.memberAccess?.message || "暂不可报名", icon: "none" });
    return;
  }
  const query = [
    `id=${activity.value.id}`,
    inviteCode.value ? `inviteCode=${encodeURIComponent(inviteCode.value)}` : "",
    channelCode.value ? `channelCode=${encodeURIComponent(channelCode.value)}` : "",
    source.value ? `source=${encodeURIComponent(source.value)}` : ""
  ].filter(Boolean).join("&");
  uni.navigateTo({ url: withTenantCode(`/pages/activity/register?${query}`) });
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
  return value.replace("T", " ").slice(0, 16);
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

function showMemberAccess() {
  return Boolean(activity.value?.minMemberLevel || activity.value?.memberAccess?.priorityMemberLevel || activity.value?.memberAccess?.requiredLevel);
}

async function makeInvite() {
  try {
    await ensureUser();
    invite.value = await request(`/public/activities/${activity.value.id}/share-poster`, { method: "POST", data: {} });
    uni.showToast({ title: "邀请链接已生成", icon: "success" });
  } catch (err: any) {
    uni.showToast({ title: err.message || "生成失败", icon: "none" });
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

function openLocation() {
  const latitude = locationLatitude();
  const longitude = locationLongitude();
  if (latitude !== undefined && longitude !== undefined) {
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
}

function subscribeNotice() {
  uni.showToast({ title: "提醒已记录，请关注后续通知", icon: "none" });
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    const pages = getCurrentPages();
    const options = (pages[pages.length - 1] as any).options || {};
    const id = Number(options.id);
    inviteCode.value = options.inviteCode || "";
    channelCode.value = options.channelCode || "";
    source.value = options.source || "h5";
    const query = [
      inviteCode.value ? `inviteCode=${encodeURIComponent(inviteCode.value)}` : "",
      channelCode.value ? `channelCode=${encodeURIComponent(channelCode.value)}` : "",
      `source=${encodeURIComponent(source.value)}`
    ].filter(Boolean).join("&");
    const [detail, setting] = await Promise.all([
      request(`/public/activities/${id}/enhanced?${query}`),
      request("/public/settings/operation")
    ]);
    activity.value = detail;
    operationSetting.value = setting;
  } catch (err: any) {
    error.value = err.message || "加载失败";
  } finally {
    loading.value = false;
  }
}

onMounted(load);
onMounted(loadDecoration);
</script>

<template>
  <view class="container detail">
    <view v-if="loading" class="card subtle">加载中...</view>
    <view v-else-if="error" class="card">
      <view class="subtle">{{ error }}</view>
      <view class="button secondary retry" @click="load">重试</view>
    </view>

    <template v-else-if="activity">
      <TenantContextBadge :tenant="tenant" label="当前城市" hint="活动归属" />
      <PageDecorationBlocks :sections="contentSections" />

      <view class="detail-head" :style="{ background: String(innerPageLayout.headerBackgroundColor || '#ffffff') }">
        <view class="detail-head-title" :style="{ color: String(innerPageLayout.headerTextColor || '#111827') }">{{ innerPageConfig.title || "活动详情" }}</view>
        <view class="detail-head-copy" :style="{ color: String(innerPageLayout.headerSubtitleColor || '#667085') }">{{ innerPageConfig.subtitle || "查看活动介绍、报名规则、服务说明和现场信息。" }}</view>
      </view>
      <image v-if="activity.coverUrl" class="cover" :src="activity.coverUrl" mode="aspectFill" />
      <view class="card head">
        <view class="row"><text class="tag">{{ activity.category?.name || "活动" }}</text><text class="tag">{{ statusText(activity.displayStatus) }}</text></view>
        <view class="title">{{ activity.title }}</view>
        <view class="subtle desc">{{ activity.description }}</view>
        <view class="decision-box">
          <view>
            <view class="decision-title">{{ registerButtonText() }}</view>
            <view class="subtle">{{ actionHint() }}</view>
          </view>
          <view class="decision-price">{{ priceText(activity.price) }}</view>
        </view>
        <view class="stats">
          <view><text>{{ activity.registeredCount }}</text><text>已报名</text></view>
          <view><text>{{ activity.remainingSeats }}</text><text>剩余名额</text></view>
          <view><text>{{ activity.viewCount }}</text><text>浏览</text></view>
          <view><text>{{ activity.shareVisitCount }}</text><text>分享访问</text></view>
        </view>
      </view>

      <view class="card info">
        <view class="info-summary">
          <view><text>状态</text><text>{{ statusText(activity.displayStatus) }}</text></view>
          <view><text>名额</text><text>{{ seatsText() }}</text></view>
          <view><text>截止</text><text>{{ deadlineText() }}</text></view>
        </view>
        <view class="line"><text>时间</text><text>{{ formatTime(activity.startTime) }} - {{ formatTime(activity.endTime) }}</text></view>
        <view class="line"><text>地点</text><text>{{ activity.location }}</text></view>
        <view v-if="hasMapInfo()" class="location-map">
          <map
            v-if="hasMapPoint()"
            class="map-view"
            :latitude="locationLatitude()"
            :longitude="locationLongitude()"
            :markers="[{ id: 1, latitude: locationLatitude(), longitude: locationLongitude(), title: activity.location }]"
            :scale="16"
            @click="openLocation"
          />
          <view v-else class="map-link" @click="openLocation">
            <view class="map-pin">地</view>
            <view>
              <view class="name">查看地图</view>
              <view class="subtle">{{ activity.location }}</view>
            </view>
          </view>
          <view class="map-action" @click="openLocation">查看地图 / 导航</view>
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
      </view>

      <view class="card action-card">
        <view class="action-item" @click="makeInvite">
          <text>邀</text>
          <view>邀请好友</view>
        </view>
        <view class="action-item" @click="subscribeNotice">
          <text>醒</text>
          <view>活动提醒</view>
        </view>
        <view class="action-item" @click="goService">
          <text>服</text>
          <view>客服说明</view>
        </view>
        <view class="action-item" @click="goMy">
          <text>票</text>
          <view>我的报名</view>
        </view>
      </view>

      <view class="card invite-card">
        <view class="row"><view class="title small">邀请好友</view><view class="mini-button" @click="makeInvite">生成</view></view>
        <view class="subtle">生成专属邀请码，用于追踪分享访问和后续邀请报名。</view>
        <view v-if="invite" class="invite-box">
          <view class="name">邀请码：{{ invite.code }}</view>
          <view class="subtle">{{ invite.inviteText }}</view>
          <view class="share-url" @click="copyText(invite.shareUrl)">{{ invite.shareUrl }}</view>
          <view class="copy-hint">点击链接可复制</view>
        </view>
      </view>

      <view class="card service-card" v-if="operationSetting">
        <view class="title small">主办方服务</view>
        <view v-if="operationSetting.customerServiceName" class="service-line"><text>客服</text><text>{{ operationSetting.customerServiceName }}</text></view>
        <view v-if="operationSetting.customerServicePhone" class="service-line" @click="copyText(operationSetting.customerServicePhone)"><text>电话</text><text>{{ operationSetting.customerServicePhone }}</text></view>
        <view v-if="operationSetting.customerServiceWechat" class="service-line" @click="copyText(operationSetting.customerServiceWechat)"><text>微信</text><text>{{ operationSetting.customerServiceWechat }}</text></view>
        <view v-if="operationSetting.refundInstructions" class="service-note">{{ operationSetting.refundInstructions }}</view>
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
        <text class="section-content">{{ section.content }}</text>
      </view>
      <view class="card" v-if="activity.notice"><view class="title small">报名须知</view><text class="section-content">{{ activity.notice }}</text></view>
      <view class="card" v-if="activity.reviews?.length">
        <view class="title small">活动评价</view>
        <view v-for="review in activity.reviews" :key="review.id" class="review"><view class="name">{{ "★".repeat(review.rating) }}</view><view>{{ review.content }}</view><view v-if="review.adminReply" class="subtle reply">主办方回复：{{ review.adminReply }}</view></view>
      </view>

      <view class="bottom-bar" :style="{ background: String(innerPageLayout.actionBarBackgroundColor || '#ffffff') }">
        <view class="bottom-info"><text>{{ priceText(activity.price) }}</text><text>{{ activity.displayStatus === "full" ? "候补开放" : statusText(activity.displayStatus) }}</text></view>
        <view class="button" :class="{ secondary: !canRegister() }" @click="register">{{ registerButtonText() }}</view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.detail { padding-bottom: 132rpx; }
.detail-head { margin-bottom: 20rpx; padding: 28rpx 24rpx; border-radius: var(--card-radius, 8px); box-shadow: 0 12rpx 34rpx rgba(15, 23, 42, 0.06); }
.detail-head-title { font-size: 40rpx; font-weight: 900; line-height: 1.25; }
.detail-head-copy { margin-top: 10rpx; font-size: 25rpx; line-height: 1.5; }
.cover { width: 100%; height: 380rpx; border-radius: 8px; background: #dde5ed; margin-bottom: 20rpx; }
.head { display: grid; gap: 16rpx; }
.desc { line-height: 1.6; }
.decision-box { display: flex; justify-content: space-between; gap: 18rpx; padding: 18rpx; border-radius: 8px; background: #f8fafc; border: 1px solid #edf0f5; }
.decision-title { color: #172033; font-size: 30rpx; font-weight: 900; margin-bottom: 8rpx; }
.decision-price { flex: 0 0 auto; color: var(--primary-color, #0f766e); font-size: 34rpx; font-weight: 900; }
.small { font-size: 30rpx; margin-bottom: 16rpx; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10rpx; }
.stats view { display: grid; gap: 6rpx; padding: 14rpx 8rpx; border-radius: 6px; background: var(--primary-soft, #f3faf8); text-align: center; }
.stats text:first-child { color: var(--primary-color, #0f766e); font-weight: 800; }
.stats text:last-child { color: var(--muted-color, #667085); font-size: 22rpx; }
.info-summary { display: grid; gap: 10rpx; margin-bottom: 18rpx; }
.info-summary view { display: grid; grid-template-columns: 92rpx 1fr; gap: 14rpx; padding: 14rpx 16rpx; border-radius: 6px; background: #f8fafc; }
.info-summary text:first-child { color: var(--muted-color, #667085); font-size: 24rpx; }
.info-summary text:last-child { color: #172033; font-size: 25rpx; font-weight: 700; }
.line { display: grid; grid-template-columns: 90rpx 1fr; gap: 16rpx; margin-top: 14rpx; color: #344054; }
.line text:first-child { color: var(--muted-color, #667085); }
.location-map { margin-top: 18rpx; overflow: hidden; border-radius: var(--card-radius, 8px); border: 1px solid #dbe7e5; background: var(--primary-soft, #f3faf8); }
.map-view { width: 100%; height: 300rpx; display: block; }
.map-link { min-height: 160rpx; display: flex; align-items: center; gap: 18rpx; padding: 24rpx; }
.map-pin { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: var(--primary-color, #0f766e); color: #fff; font-size: 26rpx; font-weight: 900; flex: 0 0 auto; }
.map-action { display: flex; align-items: center; justify-content: center; min-height: 72rpx; border-top: 1px solid #dbe7e5; color: var(--primary-color, #0f766e); font-size: 26rpx; font-weight: 800; background: var(--card-bg, #fff); }
.member-access { margin-top: 18rpx; padding: 18rpx; border-radius: 6px; background: var(--primary-soft, #f3faf8); border: 1px solid #cde8e3; }
.member-access.blocked { background: #fff7ed; border-color: #fed7aa; }
.operation-notice { margin-top: 18rpx; padding: 18rpx; border-radius: 6px; background: #fff7ed; border: 1px solid #fed7aa; }
.action-card { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; }
.action-item { display: grid; gap: 10rpx; justify-items: center; color: #344054; font-size: 24rpx; font-weight: 800; }
.action-item text { width: 52rpx; height: 52rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: var(--primary-soft, #e6f2ef); color: var(--primary-color, #0f766e); font-size: 25rpx; font-weight: 900; }
.mini-button { padding: 8rpx 18rpx; border-radius: 6px; color: var(--primary-color, #0f766e); background: var(--primary-soft, #e6f2ef); font-size: 24rpx; }
.invite-card .subtle { line-height: 1.5; }
.invite-box { margin-top: 18rpx; padding: 18rpx; border-radius: 6px; background: #f8fafc; }
.share-url { margin-top: 10rpx; color: var(--primary-color, #0f766e); font-size: 24rpx; word-break: break-all; }
.copy-hint { margin-top: 8rpx; color: #98a2b3; font-size: 22rpx; }
.service-line { display: grid; grid-template-columns: 90rpx 1fr; gap: 16rpx; padding: 12rpx 0; border-bottom: 1px solid #edf0f5; }
.service-line text:first-child { color: var(--muted-color, #667085); }
.service-line text:last-child { color: var(--text-color, #111827); font-weight: 700; overflow-wrap: anywhere; }
.service-note { margin-top: 14rpx; padding: 16rpx; border-radius: 6px; background: #f3f4f6; color: #4b5563; font-size: 25rpx; line-height: 1.6; }
.host, .review { padding: 16rpx 0; border-bottom: 1px solid #edf0f5; }
.host { display: flex; gap: 18rpx; }
.host image { width: 88rpx; height: 88rpx; border-radius: 44rpx; background: #dde5ed; flex: 0 0 auto; }
.host:last-child, .review:last-child { border-bottom: 0; }
.name { font-weight: 650; margin-bottom: 8rpx; }
.section-image { display: block; width: 100%; border-radius: 8px; margin-bottom: 18rpx; background: #dde5ed; }
.section-content { line-height: 1.7; color: #344054; }
.reply { margin-top: 8rpx; }
.retry { margin-top: 18rpx; }
.bottom-bar { position: fixed; left: 0; right: 0; bottom: 0; display: grid; grid-template-columns: 190rpx 1fr; gap: 18rpx; align-items: center; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); background: var(--card-bg, #fff); border-top: 1px solid #e5e7eb; box-shadow: 0 -10rpx 30rpx rgba(15, 23, 42, 0.08); }
.bottom-info { display: grid; gap: 4rpx; min-width: 0; }
.bottom-info text:first-child { color: var(--primary-color, #0f766e); font-size: 34rpx; font-weight: 900; }
.bottom-info text:last-child { color: var(--muted-color, #667085); font-size: 22rpx; }
</style>
