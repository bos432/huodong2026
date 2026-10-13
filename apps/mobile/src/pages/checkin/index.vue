<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import type { PublicMemberRegistrationRecord } from "@activity/shared";
import MobileShell from "../../components/layout/MobileShell.vue";
import IconGlyph from "../../components/ui/IconGlyph.vue";
import { getCurrentTenantCode, getUserToken, request, withTenantCode } from "../../api";
import { mobileTabRoute } from "../../mobile-tab-routes";
import { formatShanghaiDateTime } from "../../tenant-load-guard";
import { mockChallenges } from "../../mock/challenge";
import { getJourneyGroup, getJourneyStatus, sortJourneyRegistrations } from "./journey-state";
import type { JourneyGroup } from "./journey-state";
import "../../styles/tokens.css";

type JourneyFilter = "upcoming" | "completed" | "all";

const activeFilter = ref<JourneyFilter>("upcoming");
const registrations = ref<PublicMemberRegistrationRecord[]>([]);
const loading = ref(true);
const loadError = ref("");
const isGuest = ref(!getUserToken());
const currentTime = ref(Date.now());
let loadSequence = 0;

const journeyRows = computed(() => sortJourneyRegistrations(registrations.value));
const groupedRows = computed(() => journeyRows.value.map((registration) => ({
  registration,
  group: getJourneyGroup(registration, currentTime.value),
  status: getJourneyStatus(registration, currentTime.value)
})));
const pendingRows = computed(() => groupedRows.value.filter((row) => row.group === "pending"));
const upcomingRows = computed(() => groupedRows.value.filter((row) => row.group === "upcoming"));
const completedRows = computed(() => [...groupedRows.value].filter((row) => row.group === "completed").reverse());
const allRows = computed(() => [...groupedRows.value].reverse());
const visibleRows = computed(() => {
  if (activeFilter.value === "completed") return completedRows.value;
  if (activeFilter.value === "all") return allRows.value;
  return [...pendingRows.value, ...upcomingRows.value];
});
const challenge = mockChallenges[0];

function selectTab(tab: "home" | "checkin" | "messages" | "me" | "publish") {
  if (tab === "publish") return;
  uni.reLaunch({ url: withTenantCode(mobileTabRoute(tab)) });
}

function openLogin() {
  const redirect = encodeURIComponent(mobileTabRoute("checkin"));
  uni.navigateTo({ url: withTenantCode(`/pages/user/login?redirect=${redirect}`) });
}

function openHome() {
  uni.reLaunch({ url: withTenantCode(mobileTabRoute("home")) });
}

function openRegistration(id: number) {
  uni.navigateTo({ url: withTenantCode(`/pages/user/registration?id=${encodeURIComponent(String(id))}`) });
}

function openChallenge() {
  uni.navigateTo({ url: withTenantCode(`/pages/checkin/detail?id=${encodeURIComponent(String(challenge.id))}`) });
}
function openJournals() { uni.navigateTo({ url: withTenantCode("/pages/journal/index") }); }

function activityTime(registration: PublicMemberRegistrationRecord) {
  const start = formatShanghaiDateTime(registration.activity?.startTime, "时间待确认");
  const end = formatShanghaiDateTime(registration.activity?.endTime, "");
  if (!end || start === "时间待确认") return start;
  const [startDate, startClock] = start.split(" ");
  const [endDate, endClock] = end.split(" ");
  return startDate === endDate ? `${startDate} ${startClock}–${endClock || ""}` : `${start} 至 ${end}`;
}

function actionLabel(group: JourneyGroup, status: string) {
  if (status === "待付款") return "处理报名";
  if (status === "报名审核中") return "查看报名";
  if (group === "upcoming") return "查看签到信息";
  if (group === "completed") return "查看活动记录";
  if (status.includes("退款")) return "查看退款进度";
  return "查看报名详情";
}

async function loadJourneys() {
  const sequence = ++loadSequence;
  const requestedToken = getUserToken();
  const requestedTenant = getCurrentTenantCode();
  currentTime.value = Date.now();
  loadError.value = "";
  isGuest.value = !requestedToken;
  if (!requestedToken) {
    registrations.value = [];
    loading.value = false;
    return;
  }

  loading.value = true;
  try {
    const result = await request<unknown>("/public/me/registrations");
    if (sequence !== loadSequence || requestedToken !== getUserToken() || requestedTenant !== getCurrentTenantCode()) return;
    if (!Array.isArray(result)) throw new Error("活动行程数据格式异常，请稍后重试");
    registrations.value = result as PublicMemberRegistrationRecord[];
  } catch (error) {
    if (sequence !== loadSequence || requestedToken !== getUserToken() || requestedTenant !== getCurrentTenantCode()) return;
    registrations.value = [];
    loadError.value = error instanceof Error ? error.message : "活动行程暂时无法加载";
  } finally {
    if (sequence === loadSequence) loading.value = false;
  }
}

onShow(loadJourneys);
</script>

<template>
  <MobileShell active-tab="checkin" @tab="selectTab">
    <view class="journey-page">
      <view class="journey-heading">
        <text class="heading-eyebrow">SLOWPI / MY JOURNEYS</text>
        <text class="heading-title">我的行程</text>
        <text class="heading-note">从报名、到场，到一段真实的活动记录。</text>
      </view>

      <view class="journey-tabs" role="tablist" aria-label="活动行程分类">
        <view v-for="tab in [
          { key: 'upcoming', label: '待参加', count: pendingRows.length + upcomingRows.length },
          { key: 'completed', label: '已完成', count: completedRows.length },
          { key: 'all', label: '全部', count: registrations.length }
        ]" :key="tab.key" class="journey-tab" :class="{ active: activeFilter === tab.key }" role="tab" tabindex="0" :aria-selected="activeFilter === tab.key" @click="activeFilter = tab.key as JourneyFilter" @keyup.enter="activeFilter = tab.key as JourneyFilter">
          <text>{{ tab.label }}</text><text v-if="!loading && !isGuest && !loadError" class="tab-count">{{ tab.count }}</text>
        </view>
      </view>

      <view v-if="isGuest" class="journey-state guest-state">
        <view class="state-icon"><IconGlyph name="calendar" :size="25" label="行程" /></view>
        <text class="state-title">登录后查看你的活动行程</text>
        <text class="state-copy">报名状态、签到信息和活动记录会按真实账号同步。</text>
        <view class="state-button primary-button" role="button" tabindex="0" aria-label="登录查看行程" @click="openLogin" @keyup.enter="openLogin">登录 / 注册</view>
      </view>

      <view v-else-if="loading" class="journey-state" role="status" aria-live="polite">
        <view class="state-icon"><IconGlyph name="calendar" :size="25" label="加载中" /></view>
        <text class="state-title">正在同步活动行程</text>
        <text class="state-copy">只展示当前账号的真实报名状态。</text>
      </view>

      <view v-else-if="loadError" class="journey-state error-state" role="alert" aria-live="assertive">
        <view class="state-icon"><IconGlyph name="help" :size="25" label="加载失败" /></view>
        <text class="state-title">行程暂时没有同步成功</text>
        <text class="state-copy">{{ loadError }}</text>
        <view class="state-button" role="button" tabindex="0" aria-label="重新加载活动行程" @click="loadJourneys" @keyup.enter="loadJourneys">重新加载</view>
      </view>

      <template v-else>
        <view v-if="visibleRows.length" class="journey-list">
          <view v-if="activeFilter !== 'completed' && pendingRows.length" class="list-section-heading">
            <text>需要留意</text><small>报名、付款或退款状态有更新时会显示在这里</small>
          </view>
          <view v-if="activeFilter !== 'completed' && pendingRows.length" class="journey-group-list">
            <view v-for="row in pendingRows" :key="row.registration.id" class="journey-card" role="button" tabindex="0" :aria-label="`${row.status.label}：${row.registration.activity?.title || '活动'}`" @click="openRegistration(row.registration.id)" @keyup.enter="openRegistration(row.registration.id)" @keyup.space.prevent="openRegistration(row.registration.id)">
              <image v-if="row.registration.activity?.coverUrl" class="activity-cover" :src="row.registration.activity.coverUrl" mode="aspectFill" />
              <view v-else class="activity-cover cover-fallback"><IconGlyph name="calendar" :size="24" label="活动" /></view>
              <view class="activity-content">
                <view class="activity-status" :class="`tone-${row.status.tone}`">{{ row.status.label }}</view>
                <text class="activity-title">{{ row.registration.activity?.title || "活动信息完善中" }}</text>
                <view class="activity-meta"><IconGlyph name="calendar" :size="14" label="时间" /><text>{{ activityTime(row.registration) }}</text></view>
                <view class="activity-meta"><IconGlyph name="pin" :size="14" label="地点" /><text>{{ row.registration.activity?.location || "集合地点请查看报名详情" }}</text></view>
                <view class="activity-action">{{ actionLabel(row.group, row.status.label) }} <IconGlyph name="chevron" :size="13" label="查看" /></view>
              </view>
            </view>
          </view>

          <view v-if="activeFilter !== 'completed' && upcomingRows.length" class="list-section-heading">
            <text>即将参加</text><small>现场签到开放后，可从报名详情出示签到码</small>
          </view>
          <view v-if="activeFilter !== 'completed' && upcomingRows.length" class="journey-group-list">
            <view v-for="row in upcomingRows" :key="row.registration.id" class="journey-card" role="button" tabindex="0" :aria-label="`待参加：${row.registration.activity?.title || '活动'}`" @click="openRegistration(row.registration.id)" @keyup.enter="openRegistration(row.registration.id)" @keyup.space.prevent="openRegistration(row.registration.id)">
              <image v-if="row.registration.activity?.coverUrl" class="activity-cover" :src="row.registration.activity.coverUrl" mode="aspectFill" />
              <view v-else class="activity-cover cover-fallback"><IconGlyph name="calendar" :size="24" label="活动" /></view>
              <view class="activity-content">
                <view class="activity-status" :class="`tone-${row.status.tone}`">{{ row.status.label }}</view>
                <text class="activity-title">{{ row.registration.activity?.title || "活动信息完善中" }}</text>
                <view class="activity-meta"><IconGlyph name="calendar" :size="14" label="时间" /><text>{{ activityTime(row.registration) }}</text></view>
                <view class="activity-meta"><IconGlyph name="pin" :size="14" label="地点" /><text>{{ row.registration.activity?.location || "集合地点请查看报名详情" }}</text></view>
                <view class="activity-action">{{ actionLabel(row.group, row.status.label) }} <IconGlyph name="chevron" :size="13" label="查看" /></view>
              </view>
            </view>
          </view>

          <view v-if="activeFilter !== 'upcoming' && completedRows.length" class="list-section-heading">
            <text>已完成的活动</text><small>签到经主理人核验后，活动记录才会出现在这里</small>
          </view>
          <view v-if="activeFilter !== 'upcoming' && completedRows.length" class="journey-group-list">
            <view v-for="row in completedRows" :key="row.registration.id" class="journey-card" role="button" tabindex="0" :aria-label="`已签到：${row.registration.activity?.title || '活动'}`" @click="openRegistration(row.registration.id)" @keyup.enter="openRegistration(row.registration.id)" @keyup.space.prevent="openRegistration(row.registration.id)">
              <image v-if="row.registration.activity?.coverUrl" class="activity-cover" :src="row.registration.activity.coverUrl" mode="aspectFill" />
              <view v-else class="activity-cover cover-fallback"><IconGlyph name="checkin" :size="24" label="已签到" /></view>
              <view class="activity-content">
                <view class="activity-status" :class="`tone-${row.status.tone}`">{{ row.status.label }}</view>
                <text class="activity-title">{{ row.registration.activity?.title || "活动记录" }}</text>
                <view class="activity-meta"><IconGlyph name="calendar" :size="14" label="时间" /><text>{{ activityTime(row.registration) }}</text></view>
                <view class="activity-meta"><IconGlyph name="pin" :size="14" label="地点" /><text>{{ row.registration.activity?.location || "地点信息暂不可用" }}</text></view>
                <view class="activity-action">{{ actionLabel(row.group, row.status.label) }} <IconGlyph name="chevron" :size="13" label="查看" /></view>
              </view>
            </view>
          </view>

          <view v-if="activeFilter === 'all' && allRows.some((row) => ['missed', 'inactive'].includes(row.group))" class="secondary-records">
            <view class="list-section-heading"><text>其他报名</text><small>取消、未签到或退款中的记录</small></view>
            <view v-for="row in allRows.filter((item) => ['missed', 'inactive'].includes(item.group))" :key="row.registration.id" class="secondary-row" role="button" tabindex="0" @click="openRegistration(row.registration.id)" @keyup.enter="openRegistration(row.registration.id)">
              <view class="secondary-copy"><text>{{ row.registration.activity?.title || "活动报名" }}</text><small>{{ row.status.label }} · {{ activityTime(row.registration) }}</small></view>
              <IconGlyph name="chevron" :size="14" label="查看详情" />
            </view>
          </view>
        </view>

        <view v-else class="journey-state empty-state">
          <view class="state-icon"><IconGlyph name="calendar" :size="25" label="暂无活动" /></view>
          <text class="state-title">{{ activeFilter === 'completed' ? "还没有真实活动记录" : activeFilter === 'upcoming' ? "暂时没有待参加的活动" : "还没有活动行程" }}</text>
          <text class="state-copy">{{ activeFilter === 'completed' ? "活动签到由主理人确认后，记录才会沉淀在这里。" : "报名成功的活动会出现在这里，方便查看安排与签到信息。" }}</text>
          <view class="state-button primary-button" role="button" tabindex="0" aria-label="去首页发现活动" @click="openHome" @keyup.enter="openHome">去发现活动</view>
        </view>
      </template>

      <view class="slow-experience">
        <view class="slow-experience-heading"><view><text class="section-kicker">SLOW / JOURNAL</text><text class="slow-experience-title">慢体验</text><text class="slow-experience-copy">给日常留一点观察和记录，不等同于活动签到。</text></view><view class="demo-badge" role="button" tabindex="0" aria-label="浏览公开城市手记" @click="openJournals" @keyup.enter="openJournals">城市手记</view></view>
        <view class="slow-experience-card" role="button" tabindex="0" :aria-label="`开始城市观察：${challenge.title}`" @click="openChallenge" @keyup.enter="openChallenge" @keyup.space.prevent="openChallenge">
          <view class="experience-icon"><IconGlyph name="book" :size="20" label="慢体验" /></view>
          <view class="experience-copy"><text>{{ challenge.title }}</text><small>登录后将文字和照片收进自己的账号；不会生成真实活动记录。</small></view>
          <IconGlyph name="chevron" :size="16" label="开始记录" />
        </view>
      </view>
    </view>
  </MobileShell>
</template>

<style scoped>
@import "../../styles/tokens.css";
.journey-page{min-height:100vh;padding:22px 15px 28px;background:var(--mp-bg-page);font-family:var(--mp-font-family);color:var(--mp-text-primary)}
.journey-heading{display:grid;gap:5px;padding:0 3px 18px}.heading-eyebrow,.section-kicker{color:var(--mp-brand-primary-dark);font-size:9px;font-weight:800;letter-spacing:.08em}.heading-title{font-size:27px;font-weight:800;line-height:1.12}.heading-note{color:var(--mp-text-muted);font-size:12px;line-height:1.5}
.journey-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;margin-bottom:15px;padding:4px;border:1px solid var(--mp-border);border-radius:12px;background:#fff}.journey-tab{display:flex;align-items:center;justify-content:center;gap:6px;min-height:40px;border-radius:9px;color:var(--mp-text-muted);font-size:12px}.journey-tab.active{background:var(--mp-brand-soft);color:var(--mp-brand-primary-dark);font-weight:700}.tab-count{font-variant-numeric:tabular-nums;font-size:10px;opacity:.76}
.journey-list{display:grid;gap:13px}.list-section-heading{display:grid;gap:3px;margin:6px 2px 0}.list-section-heading>text{font-size:15px;font-weight:800}.list-section-heading small{color:var(--mp-text-muted);font-size:10px;line-height:1.4}.journey-group-list{display:grid;gap:10px}.journey-card{display:flex;gap:12px;min-width:0;padding:10px;border:1px solid var(--mp-border);border-radius:13px;background:var(--mp-bg-surface);box-shadow:var(--mp-shadow-card)}.activity-cover{display:block;width:92px;height:112px;flex:0 0 92px;border-radius:9px;background:#e9e5dc;object-fit:cover}.cover-fallback{display:grid;place-items:center;color:var(--mp-brand-primary);background:var(--mp-brand-soft)}.activity-content{display:flex;min-width:0;flex:1;flex-direction:column;align-items:flex-start;gap:6px;padding:1px 0}.activity-status{display:inline-flex;align-items:center;min-height:20px;padding:0 7px;border-radius:5px;font-size:10px;font-weight:700}.tone-warning{background:#f8eddc;color:#8d672b}.tone-brand{background:var(--mp-brand-soft);color:var(--mp-brand-primary-dark)}.tone-success{background:#e3efe8;color:#3e7658}.tone-muted{background:#f0efec;color:#797c7c}.activity-title{display:-webkit-box;overflow:hidden;width:100%;color:var(--mp-text-primary);font-size:13px;font-weight:750;line-height:1.35;-webkit-box-orient:vertical;-webkit-line-clamp:2}.activity-meta{display:flex;align-items:flex-start;gap:5px;width:100%;color:var(--mp-text-muted);font-size:10px;line-height:1.4}.activity-meta :deep(.icon-glyph){flex:0 0 14px;margin-top:0;color:var(--mp-brand-primary-dark)}.activity-meta text{overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}.activity-action{display:flex;align-items:center;gap:2px;margin-top:auto;color:var(--mp-brand-primary-dark);font-size:10px;font-weight:700}
.secondary-records{display:grid;gap:7px}.secondary-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 3px;border-bottom:1px solid var(--mp-border)}.secondary-copy{display:grid;min-width:0;gap:4px}.secondary-copy>text{overflow:hidden;color:var(--mp-text-primary);font-size:12px;text-overflow:ellipsis;white-space:nowrap}.secondary-copy small{color:var(--mp-text-muted);font-size:10px}
.journey-state{display:grid;justify-items:center;gap:9px;margin:0 0 15px;padding:30px 20px;border:1px solid var(--mp-border);border-radius:14px;background:var(--mp-bg-surface);text-align:center}.state-icon{display:grid;width:48px;height:48px;place-items:center;border-radius:50%;background:var(--mp-brand-soft);color:var(--mp-brand-primary)}.state-title{color:var(--mp-text-primary);font-size:14px;font-weight:800}.state-copy{max-width:280px;color:var(--mp-text-muted);font-size:11px;line-height:1.55}.error-state .state-icon{background:#fae8e5;color:var(--mp-danger)}.state-button{display:grid;min-width:112px;min-height:38px;place-items:center;margin-top:5px;padding:0 14px;border:1px solid var(--mp-border);border-radius:9px;color:var(--mp-text-primary);font-size:11px;font-weight:700}.primary-button{border-color:var(--mp-brand-primary);background:var(--mp-brand-primary);color:#fff}
.slow-experience{display:grid;gap:10px;margin-top:22px;padding-top:18px;border-top:1px solid var(--mp-border)}.slow-experience-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.slow-experience-heading>view:first-child{display:grid;gap:3px}.slow-experience-title{font-size:16px;font-weight:800}.slow-experience-copy{color:var(--mp-text-muted);font-size:10px;line-height:1.45}.demo-badge{flex:0 0 auto;padding:5px 7px;border-radius:5px;background:#f5e7df;color:#8a5946;font-size:9px}.slow-experience-card{display:flex;align-items:center;gap:10px;padding:12px;border:1px solid var(--mp-border);border-radius:12px;background:var(--mp-bg-surface)}.experience-icon{display:grid;width:36px;height:36px;flex:0 0 36px;place-items:center;border-radius:10px;background:var(--mp-brand-soft);color:var(--mp-brand-primary)}.experience-copy{display:grid;min-width:0;flex:1;gap:4px}.experience-copy>text{color:var(--mp-text-primary);font-size:12px;font-weight:700}.experience-copy small{color:var(--mp-text-muted);font-size:10px;line-height:1.4}
</style>
