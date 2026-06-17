<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
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
const bodyDecorationSections = computed(() => contentSections.value.filter((section) => {
  if (section.type === "hero") return false;
  if (section.type === "rich_text" && section.title === "页面说明") return false;
  return true;
}));

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
  <view class="container detail-page has-custom-nav">
    <view v-if="loading" class="card subtle">加载中...</view>
    <view v-else-if="error" class="card">
      <view class="subtle">{{ error }}</view>
      <view class="button secondary retry" @click="load">重试</view>
    </view>

    <template v-else-if="activity">
      <TenantContextBadge :tenant="tenant" label="当前城市" hint="活动归属" />

      <view class="detail-hero">
        <image v-if="activity.coverUrl" class="hero-image" :src="activity.coverUrl" mode="aspectFill" />
        <view v-else class="hero-image hero-fallback">雅集</view>
        <view class="hero-mask"></view>
        <view class="hero-head">
          <text class="hero-kicker">七维书院 · 活动详情</text>
          <text class="hero-status">{{ statusText(activity.displayStatus) }}</text>
        </view>
        <view class="hero-bottom">
          <view class="detail-head" :style="{ background: String(innerPageLayout.headerBackgroundColor || 'transparent') }">
            <view class="detail-head-title" :style="{ color: String(innerPageLayout.headerTextColor || '#fff8f0') }">{{ activity.title }}</view>
            <view class="detail-head-copy" :style="{ color: String(innerPageLayout.headerSubtitleColor || 'rgba(255,248,240,0.82)') }">{{ innerPageConfig.subtitle || "查看活动介绍、报名规则、服务说明和现场信息。" }}</view>
          </view>
        </view>
      </view>

      <PageDecorationBlocks :sections="bodyDecorationSections" />

      <view class="card head">
        <view class="row"><text class="tag tag-secondary">{{ activity.category?.name || "活动" }}</text><text class="tag tag-primary">{{ activity.requireReview ? "需审核" : "即时确认" }}</text></view>
        <view class="subtle desc">{{ activity.description || "主办方正在完善活动介绍，欢迎先查看活动信息和报名规则。" }}</view>
        <view class="decision-box">
          <view>
            <view class="decision-title">{{ registerButtonText() }}</view>
            <view class="body-text decision-copy">{{ actionHint() }}</view>
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
          <view v-else class="map-link" @click="openLocation">
            <view class="map-pin">地</view>
            <view>
              <view class="name">查看地图</view>
              <view class="subtle">{{ activity.location }}</view>
            </view>
          </view>
          <view class="map-action" @click="openLocation">{{ mapActionText() }}</view>
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
        <view class="section-title">快捷操作</view>
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
        <view class="body-text invite-copy">生成专属邀请码，用于追踪分享访问和后续邀请报名。</view>
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
        <view class="button action-button" :class="{ secondary: !canRegister() }" @click="register">{{ registerButtonText() }}</view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.detail-page { padding-bottom: 168rpx; }
.detail-hero {
  position: relative;
  overflow: hidden;
  min-height: 420rpx;
  margin-bottom: 24rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #8e2d28, #c43d3d);
  box-shadow: 0 18rpx 40rpx rgba(122, 36, 32, 0.18);
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
  background: linear-gradient(180deg, rgba(26, 20, 16, 0.18), rgba(26, 20, 16, 0.72));
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
  padding: 24rpx 24rpx 0;
}
.hero-kicker {
  color: rgba(255, 248, 240, 0.78);
  font-size: 23rpx;
  font-weight: 700;
  letter-spacing: 2rpx;
}
.hero-status {
  min-height: 50rpx;
  padding: 0 16rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 248, 240, 0.16);
  color: #fff8f0;
  font-size: 22rpx;
  font-weight: 700;
}
.hero-bottom {
  min-height: 420rpx;
  display: flex;
  align-items: flex-end;
  padding: 24rpx;
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
  color: #fff8f0;
  font-size: 48rpx;
  line-height: 1.24;
  font-weight: 700;
  font-family: "STKaiti", "KaiTi", serif;
}
.detail-head-copy {
  margin-top: 12rpx;
  font-size: 25rpx;
  line-height: 1.65;
}
.head { display: grid; gap: 16rpx; }
.title { font-family: "STKaiti", "KaiTi", serif; }
.desc { line-height: 1.7; }
.decision-box {
  display: flex;
  justify-content: space-between;
  gap: 18rpx;
  padding: 22rpx;
  border-radius: 20rpx;
  background: #f9f4ee;
}
.decision-title { color: #333333; font-size: 32rpx; font-weight: 700; margin-bottom: 10rpx; font-family: "STKaiti", "KaiTi", serif; }
.decision-copy { max-width: 420rpx; }
.decision-price { flex: 0 0 auto; color: #c43d3d; font-size: 40rpx; font-weight: 700; }
.small { font-size: 30rpx; margin-bottom: 16rpx; font-family: "STKaiti", "KaiTi", serif; }
.section-title {
  margin-bottom: 16rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #333333;
  font-family: "STKaiti", "KaiTi", serif;
}
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10rpx; }
.stats view { display: grid; gap: 6rpx; padding: 16rpx 10rpx; border-radius: 18rpx; background: #fbf5ef; text-align: center; }
.stats text:first-child { color: #c43d3d; font-weight: 700; font-size: 30rpx; }
.stats text:last-child { color: #999999; font-size: 22rpx; }
.info-summary { display: grid; gap: 10rpx; margin-bottom: 18rpx; }
.info-summary view { display: grid; grid-template-columns: 92rpx 1fr; gap: 14rpx; padding: 16rpx 18rpx; border-radius: 18rpx; background: #f9f4ee; }
.info-summary text:first-child { color: #999999; font-size: 24rpx; }
.info-summary text:last-child { color: #333333; font-size: 25rpx; font-weight: 600; }
.line { display: grid; grid-template-columns: 90rpx 1fr; gap: 16rpx; margin-top: 14rpx; color: #666666; }
.line text:first-child { color: #999999; }
.location-map { margin-top: 18rpx; overflow: hidden; border-radius: 20rpx; border: 1px solid #e8e0d8; background: #fbf5ef; }
.map-view { width: 100%; height: 300rpx; display: block; }
.map-link { min-height: 160rpx; display: flex; align-items: center; gap: 18rpx; padding: 24rpx; }
.map-pin { width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #c43d3d; color: #fff; font-size: 26rpx; font-weight: 700; flex: 0 0 auto; }
.map-action { display: flex; align-items: center; justify-content: center; min-height: 72rpx; border-top: 1px solid #e8e0d8; color: #c43d3d; font-size: 26rpx; font-weight: 600; background: var(--card-bg, #fff); }
.member-access { margin-top: 18rpx; padding: 18rpx; border-radius: 18rpx; background: rgba(74, 107, 138, 0.08); border: 1px solid rgba(74, 107, 138, 0.12); }
.member-access.blocked { background: rgba(255, 159, 0, 0.08); border-color: rgba(255, 159, 0, 0.18); }
.operation-notice { margin-top: 18rpx; padding: 18rpx; border-radius: 6px; background: #fff7ed; border: 1px solid #fed7aa; }
.action-card { display: grid; gap: 18rpx; }
.action-card .section-title { margin-bottom: 0; }
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
.service-note { margin-top: 14rpx; padding: 16rpx; border-radius: 18rpx; background: #f9f4ee; color: #666666; font-size: 25rpx; line-height: 1.6; }
.host, .review { padding: 16rpx 0; border-bottom: 1px solid #e8e0d8; }
.host { display: flex; gap: 18rpx; }
.host image { width: 88rpx; height: 88rpx; border-radius: 44rpx; background: #dde5ed; flex: 0 0 auto; }
.host:last-child, .review:last-child { border-bottom: 0; }
.name { font-weight: 650; margin-bottom: 8rpx; color: #333333; }
.section-image { display: block; width: 100%; border-radius: 20rpx; margin-bottom: 18rpx; background: #dde5ed; }
.section-content { line-height: 1.7; color: #666666; }
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
  border-top: 1rpx solid #e8e0d8;
  box-shadow: 0 -10rpx 30rpx rgba(51, 51, 51, 0.08);
}
.bottom-info { display: grid; gap: 4rpx; min-width: 0; }
.bottom-info text:first-child { color: #c43d3d; font-size: 36rpx; font-weight: 700; }
.bottom-info text:last-child { color: #999999; font-size: 22rpx; }
.action-button { height: 92rpx; font-size: 32rpx; }
</style>
