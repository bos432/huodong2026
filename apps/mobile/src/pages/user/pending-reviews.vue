<script setup lang="ts">
import { computed, ref } from "vue";
import { onHide, onShow, onUnload } from "@dcloudio/uni-app";
import type { PublicMemberRegistrationRecord } from "@activity/shared";
import { getCurrentTenantCode, getUserToken, request, withTenantCode } from "../../api";
import { createTenantLoadGuard, formatShanghaiDateTime } from "../../tenant-load-guard";
import { pendingReviewState } from "./pending-review-state";
import IconGlyph from "../../components/ui/IconGlyph.vue";
import AppBottomNav from "../../components/AppBottomNav.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";
import { filterIntrinsicHeaderDecorationSections, usePageDecoration } from "../../decoration";
import { mobileTabRoute } from "../../mobile-tab-routes";

const registrations = ref<PublicMemberRegistrationRecord[]>([]);
const loading = ref(false);
const error = ref("");
const guest = ref(!getUserToken());
const guard = createTenantLoadGuard();
const queue = computed(() => pendingReviewState(registrations.value));
const { tenant, bottomNavSection, contentSections, showBottomNav, loadDecoration } = usePageDecoration("review_page", "/pages/user/pending-reviews");
const bodySections = computed(() => filterIntrinsicHeaderDecorationSections(contentSections.value));
let sequence = 0;
function returnToProfile() { uni.reLaunch({ url: withTenantCode(mobileTabRoute("me")) }); }
function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) uni.navigateBack();
  else returnToProfile();
}

function openRegistration(id: number) {
  uni.navigateTo({ url: withTenantCode(`/pages/user/registration?id=${encodeURIComponent(String(id))}`) });
}
function openLogin() {
  uni.navigateTo({ url: withTenantCode(`/pages/user/login?redirect=${encodeURIComponent("/pages/user/pending-reviews")}`) });
}
async function load() {
  const current = ++sequence;
  const token = guard.begin();
  const userToken = getUserToken();
  const tenantCode = getCurrentTenantCode();
  const isCurrent = () => guard.isCurrent(token) && current === sequence && userToken === getUserToken() && tenantCode === getCurrentTenantCode();
  guest.value = !userToken;
  error.value = "";
  registrations.value = [];
  if (!userToken) { loading.value = false; return; }
  loading.value = true;
  try {
    const rows = await request<PublicMemberRegistrationRecord[]>("/public/me/registrations", { userToken, tenantCode });
    if (!isCurrent()) return;
    if (!Array.isArray(rows)) throw new Error("活动评价资格数据格式异常");
    registrations.value = rows;
  } catch (cause) {
    if (isCurrent()) error.value = cause instanceof Error ? cause.message : "待评价活动暂时无法加载";
  } finally {
    if (isCurrent()) loading.value = false;
  }
}
onShow(() => { void load(); void loadDecoration(); });
function invalidate() { sequence += 1; guard.invalidate(); loading.value = false; }
onHide(invalidate);
onUnload(invalidate);
</script>

<template>
  <view class="pending-review-shell">
    <view class="reviews-page">
      <view class="back-action" role="button" tabindex="0" aria-label="返回上一页" @click="goBack" @keyup.enter="goBack" @keyup.space.prevent="goBack"><IconGlyph name="chevron" :size="17" label="返回"/>返回</view>
      <text class="eyebrow">SLOWPI / YOUR FEEDBACK</text>
      <text class="title">待评价</text>
      <text class="intro">只列出已签到、已结束且尚未评价的真实活动。</text>
      <view v-if="tenant?.name" class="tenant-name">{{ tenant.name }} · 评价归属</view>
      <PageDecorationBlocks :sections="bodySections" />
      <view v-if="guest" class="state"><IconGlyph name="user" :size="24" label="登录"/><text>登录后查看你的待评价活动</text><button @click="openLogin">登录 / 注册</button></view>
      <view v-else-if="loading" class="state" role="status">正在同步评价资格…</view>
      <view v-else-if="error" class="state error" role="alert"><text>{{ error }}</text><button @click="load">重新加载</button></view>
      <template v-else>
        <view v-for="row in queue.rows" :key="row.id" class="review-row" role="button" tabindex="0" :aria-label="`评价活动：${row.activity?.title || '活动'}`" @click="openRegistration(row.id)" @keyup.enter="openRegistration(row.id)" @keyup.space.prevent="openRegistration(row.id)">
          <image v-if="row.activity?.coverUrl" :src="row.activity.coverUrl" mode="aspectFill"/><view v-else class="cover-fallback"><IconGlyph name="calendar" :size="22" label="活动"/></view>
          <view class="row-copy"><text class="activity-title">{{ row.activity?.title || "活动信息完善中" }}</text><text>{{ formatShanghaiDateTime(row.activity?.startTime, "活动时间待补充") }}</text><text class="action">查看报名并评价 ›</text></view>
        </view>
        <view v-if="queue.unknown" class="notice">部分历史记录缺少评价资格信息，已暂时隐藏。刷新后仍存在时请联系慢π支持。</view>
        <view v-if="!queue.rows.length" class="state"><IconGlyph name="checkin" :size="24" label="评价"/><text>{{ queue.unknown ? "暂时无法确认待评价活动" : "目前没有待评价活动" }}</text><text>{{ queue.unknown ? "为了避免误导，资格未知的记录不会显示为已完成评价或可评价。" : "活动签到并结束后，可以在报名详情留下真实感受。" }}</text><button @click="returnToProfile">返回我的</button></view>
      </template>
    </view>
  <AppBottomNav v-if="showBottomNav" :section="bottomNavSection" current-path="/pages/user/pending-reviews" />
  </view>
</template>

<style scoped>
@import "../../styles/tokens.css";
.pending-review-shell{min-height:100vh;background:var(--mp-bg-page);padding-bottom:calc(100px + env(safe-area-inset-bottom));font-family:var(--mp-font-family)}
.reviews-page{display:grid;gap:14px;padding:24px 18px 32px;color:var(--mp-text-primary)}.back-action{display:flex;align-items:center;gap:3px;width:max-content;min-height:36px;color:var(--mp-text-secondary);font-size:12px}.eyebrow{font-size:10px;letter-spacing:0;color:var(--mp-text-muted)}.title{font-size:25px;font-weight:760}.intro{font-size:13px;line-height:1.55;color:var(--mp-text-secondary)}.review-row{display:flex;gap:12px;padding:12px;border:1px solid var(--mp-border);border-radius:12px;background:var(--mp-bg-surface);box-shadow:var(--mp-shadow-card)}.review-row image,.cover-fallback{width:84px;height:84px;flex:0 0 84px;border-radius:9px;object-fit:cover;background:var(--mp-bg-soft)}.cover-fallback{display:grid;place-items:center}.row-copy{display:grid;align-content:center;gap:7px;min-width:0;font-size:11px;color:var(--mp-text-muted)}.activity-title{font-size:14px;font-weight:700;color:var(--mp-text-primary)}.action{color:var(--mp-brand-primary-dark);font-weight:650}.state{display:grid;justify-items:center;gap:12px;padding:38px 18px;text-align:center;border:1px solid var(--mp-border);border-radius:12px;background:var(--mp-bg-surface);color:var(--mp-text-secondary)}.state.error{color:var(--mp-danger)}.notice{padding:10px;border-radius:8px;background:var(--mp-bg-soft);font-size:12px;line-height:1.5;color:var(--mp-text-muted)}button{margin:0;padding:0 18px;border:0;border-radius:8px;background:var(--mp-brand-primary);color:#fff;font-size:13px;line-height:40px}button::after{border:0}
.back-action{min-height:44px}.back-action :deep(.icon-glyph){transform:rotate(180deg)}
</style>
