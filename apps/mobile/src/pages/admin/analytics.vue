<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { getMobileAdminSession, mobileAdminRequest, requireMobileAdmin, type MobileAdminSession } from "../../mobile-admin";
import AdminBottomNav from "../../components/AdminBottomNav.vue";

const bootstrap = ref<any>(null);
const overview = ref<any>(null);
const trends = ref<any[]>([]);
const channels = ref<any[]>([]);
const loading = ref(true);
const pageError = ref("");
const trendError = ref("");
const channelError = ref("");
const rangeDays = ref(30);
const loadedContextKey = ref("");
let loadSerial = 0;

const canViewAnalytics = computed(() => Boolean(bootstrap.value?.permissions?.canViewAnalytics));
const totals = computed(() => overview.value?.totals || {});
const rates = computed(() => overview.value?.rates || {});
const risks = computed(() => overview.value?.risk || {});
const advice = computed(() => Array.isArray(overview.value?.operationAdvice) ? overview.value.operationAdvice : []);
const maxTrend = computed(() => Math.max(1, ...trends.value.map((item) => Number(item.view || 0))));
const ranges = [{ label: "7天", value: 7 }, { label: "30天", value: 30 }, { label: "90天", value: 90 }];

function sessionKey(session: MobileAdminSession) {
  return `${session.token}:${session.tenantId || "platform"}:${session.role}`;
}

function isCurrentSession(session: MobileAdminSession) {
  const current = getMobileAdminSession();
  return Boolean(current && sessionKey(current) === sessionKey(session));
}

function shanghaiDateRange(days: number) {
  const endText = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const [year, month, day] = endText.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, day - days + 1));
  return { startDate: start.toISOString().slice(0, 10), endDate: endText };
}

function queryString(days: number) {
  const range = shanghaiDateRange(days);
  return `startDate=${range.startDate}&endDate=${range.endDate}`;
}

function clearAnalytics() {
  overview.value = null;
  trends.value = [];
  channels.value = [];
}

function money(value: unknown) {
  return Number(value || 0).toFixed(2);
}

function percent(value: unknown) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function trendWidth(value: unknown) {
  return `${Math.max(4, Math.round(Number(value || 0) / maxTrend.value * 100))}%`;
}

async function load(refreshBootstrap = false) {
  const serial = ++loadSerial;
  let session: MobileAdminSession;
  try {
    session = requireMobileAdmin();
  } catch {
    loading.value = false;
    return;
  }
  const requestedRangeDays = rangeDays.value;
  const contextKey = `${sessionKey(session)}:${requestedRangeDays}`;
  if (loadedContextKey.value !== contextKey) clearAnalytics();
  loading.value = true;
  pageError.value = "";
  trendError.value = "";
  channelError.value = "";
  try {
    const boot = !refreshBootstrap && bootstrap.value ? bootstrap.value : await mobileAdminRequest<any>("/admin/mobile/bootstrap");
    if (serial !== loadSerial || !isCurrentSession(session)) return;
    if (!boot || typeof boot !== "object" || !boot.permissions || typeof boot.permissions !== "object") throw new Error("管理权限数据格式异常，请重新加载");
    bootstrap.value = boot;
    if (!boot?.permissions?.canViewAnalytics) {
      clearAnalytics();
      loadedContextKey.value = contextKey;
      return;
    }
    const query = queryString(requestedRangeDays);
    const [overviewResult, trendResult, channelResult] = await Promise.allSettled([
      mobileAdminRequest<any>(`/admin/analytics/overview?${query}`),
      mobileAdminRequest<any[]>(`/admin/analytics/trends?${query}`),
      mobileAdminRequest<any[]>(`/admin/analytics/channels?${query}`)
    ]);
    if (serial !== loadSerial || !isCurrentSession(session) || rangeDays.value !== requestedRangeDays) return;
    if (overviewResult.status === "fulfilled" && overviewResult.value && typeof overviewResult.value === "object" && !Array.isArray(overviewResult.value)) overview.value = overviewResult.value;
    else { overview.value = null; pageError.value = overviewResult.status === "rejected" ? overviewResult.reason?.message || "经营统计加载失败" : "经营统计数据格式异常"; }
    if (trendResult.status === "fulfilled" && Array.isArray(trendResult.value)) trends.value = trendResult.value;
    else { trends.value = []; trendError.value = trendResult.status === "rejected" ? trendResult.reason?.message || "趋势数据加载失败" : "趋势数据格式异常"; }
    if (channelResult.status === "fulfilled" && Array.isArray(channelResult.value)) channels.value = channelResult.value;
    else { channels.value = []; channelError.value = channelResult.status === "rejected" ? channelResult.reason?.message || "渠道数据加载失败" : "渠道数据格式异常"; }
    loadedContextKey.value = contextKey;
  } catch (error: any) {
    if (serial !== loadSerial) return;
    const current = getMobileAdminSession();
    if (!current) {
      bootstrap.value = null;
      clearAnalytics();
      try { requireMobileAdmin(); } catch {}
      return;
    }
    if (!isCurrentSession(session)) return;
    clearAnalytics();
    pageError.value = error.message || "经营统计加载失败";
  } finally {
    if (serial === loadSerial && (isCurrentSession(session) || !getMobileAdminSession())) loading.value = false;
  }
}

function setRange(days: number) {
  if (loading.value || days === rangeDays.value) return;
  rangeDays.value = days;
  void load();
}

function go(path: string) {
  uni.navigateTo({ url: path });
}

onShow(() => { void load(true); });
</script>

<template>
  <view class="admin-page">
    <view class="head"><view><view class="title">经营统计</view><view class="sub">统一口径 · 最近 {{ rangeDays }} 天</view></view><view class="refresh" role="button" tabindex="0" aria-label="刷新经营统计" :aria-busy="loading" :class="{ disabled: loading }" @click="load" @keyup.enter="load" @keyup.space.prevent="load">{{ loading ? "刷新中" : "刷新" }}</view></view>
    <view class="ranges" role="tablist" aria-label="统计时间范围"><view v-for="item in ranges" :key="item.value" role="tab" tabindex="0" :aria-selected="rangeDays === item.value" :aria-disabled="loading" :class="{ active: rangeDays === item.value, disabled: loading }" @click="setRange(item.value)" @keyup.enter="setRange(item.value)" @keyup.space.prevent="setRange(item.value)">{{ item.label }}</view></view>
    <view v-if="pageError" class="error-panel" role="alert" aria-live="assertive"><text>{{ pageError }}</text><view class="retry" role="button" tabindex="0" aria-label="重新加载经营统计" @click="load(true)" @keyup.enter="load(true)" @keyup.space.prevent="load(true)">重试</view></view>
    <view v-if="!pageError && !canViewAnalytics && !loading" class="panel" role="status">当前账号没有经营统计查看权限</view>
    <view v-else-if="loading && !overview" class="panel" role="status" aria-live="polite">统计数据加载中...</view>
    <template v-else-if="overview">
      <view class="metric-grid">
        <view><text>{{ totals.viewCount || 0 }}</text><text>浏览</text><small>报名率 {{ percent(rates.signupRate) }}</small></view>
        <view><text>{{ totals.registrationCount || 0 }}</text><text>报名</text><small>支付率 {{ percent(rates.paymentRate) }}</small></view>
        <view><text>{{ totals.paidCount || 0 }}</text><text>支付</text><small>签到率 {{ percent(rates.checkInRate) }}</small></view>
        <view><text>￥{{ money(totals.netAmount) }}</text><text>净收入</text><small>退款 ￥{{ money(totals.refundAmount) }}</small></view>
      </view>

      <view class="section"><view class="section-title">经营漏斗</view><view class="funnel"><view><span>浏览</span><strong>{{ totals.viewCount || 0 }}</strong></view><view><span>报名</span><strong>{{ totals.registrationCount || 0 }}</strong></view><view><span>支付</span><strong>{{ totals.paidCount || 0 }}</strong></view><view><span>签到</span><strong>{{ totals.checkInCount || 0 }}</strong></view><view><span>评价</span><strong>{{ totals.reviewCount || 0 }}</strong></view></view></view>

      <view class="section risk"><view class="section-head"><view class="section-title">风险待办</view><view v-if="bootstrap?.permissions?.canViewFinanceRisks" class="link" role="button" tabindex="0" aria-label="打开资金异常处置" @click="go('/pages/admin/risk-alerts')" @keyup.enter="go('/pages/admin/risk-alerts')" @keyup.space.prevent="go('/pages/admin/risk-alerts')">异常处置 ›</view></view><view class="risk-grid"><view><strong>{{ risks.pendingRefundCount || 0 }}</strong><span>待处理退款</span></view><view><strong>{{ risks.callbackRiskCount || 0 }}</strong><span>异常回调</span></view><view><strong>{{ risks.pendingReconciliationCount || 0 }}</strong><span>待处理对账</span></view></view></view>

      <view class="section"><view class="section-title">每日趋势</view><view v-if="trendError" class="inline-error" role="alert"><text>{{ trendError }}</text><view class="inline-retry" role="button" tabindex="0" aria-label="重新加载趋势数据" @click="load" @keyup.enter="load" @keyup.space.prevent="load">重试</view></view><view v-else-if="!trends.length" class="empty" role="status">暂无趋势数据</view><view v-for="item in trends.slice(-14)" v-else :key="item.date" class="trend"><view class="trend-date">{{ item.date }}</view><view class="bar"><view :style="{ width: trendWidth(item.view) }"></view></view><view class="trend-values">浏览 {{ item.view || 0 }} · 报名 {{ item.register || 0 }} · 支付 {{ item.pay || 0 }} · ￥{{ money(item.paidAmount) }}</view></view></view>

      <view class="section"><view class="section-title">渠道转化</view><view v-if="channelError" class="inline-error" role="alert"><text>{{ channelError }}</text><view class="inline-retry" role="button" tabindex="0" aria-label="重新加载渠道数据" @click="load" @keyup.enter="load" @keyup.space.prevent="load">重试</view></view><view v-else-if="!channels.length" class="empty" role="status">暂无渠道数据</view><view v-for="item in channels.slice(0, 10)" v-else :key="`${item.code}-${item.activityId || item.activityTitle}`" class="channel"><view><strong>{{ item.name || item.code || "自然访问" }}</strong><text>{{ item.activityTitle || "全部活动" }}</text></view><view class="channel-data"><span>浏览 {{ item.viewCount || 0 }}</span><span>报名 {{ item.registrationCount || 0 }}</span><span>支付 {{ item.paidCount || 0 }}</span><span>{{ percent(item.paymentRate) }}</span></view></view></view>

      <view v-if="advice.length" class="section"><view class="section-title">运营建议</view><view v-for="item in advice" :key="`${item.title}-${item.message}`" class="advice"><strong>{{ item.title }}</strong><text>{{ item.message }}</text></view></view>
    </template>
    <AdminBottomNav current="analytics" :permissions="bootstrap?.permissions" />
  </view>
</template>

<style scoped>
.admin-page{min-height:100vh;width:100%;max-width:760px;margin:0 auto;box-sizing:border-box;padding:calc(24rpx + env(safe-area-inset-top)) 24rpx calc(154rpx + env(safe-area-inset-bottom));overflow-wrap:anywhere;background:linear-gradient(180deg,#fff8ef 0%,#f3f6f3 100%);color:#2f211c}.head{display:flex;align-items:center;justify-content:space-between;gap:18rpx;padding:28rpx 24rpx;border-radius:30rpx;background:linear-gradient(135deg,#264d46,#0f766e 58%,#d29a5a);color:#fff}.title{font-size:40rpx;font-weight:900}.sub{margin-top:7rpx;color:rgba(255,255,255,.76);font-size:23rpx}.refresh{padding:14rpx 22rpx;border-radius:999px;background:rgba(255,255,255,.17);font-weight:900}.ranges{display:grid;grid-template-columns:repeat(3,1fr);gap:12rpx;margin:18rpx 0}.ranges view{display:flex;align-items:center;justify-content:center;height:68rpx;border-radius:20rpx;background:#fff;color:#7a5b52;font-size:24rpx;font-weight:900}.ranges .active{background:#0f766e;color:#fff}.panel,.section,.error-panel{margin-top:18rpx;border-radius:24rpx;background:rgba(255,255,255,.94);box-shadow:0 12rpx 30rpx rgba(42,66,58,.08)}.panel{padding:30rpx;text-align:center;color:#6f7772}.error-panel{display:flex;align-items:center;justify-content:space-between;gap:16rpx;padding:20rpx;color:#b42318;background:#fff1f3}.retry{padding:10rpx 18rpx;border-radius:16rpx;background:#b42318;color:#fff;font-weight:800}.metric-grid{display:grid;grid-template-columns:1fr 1fr;gap:12rpx}.metric-grid view{display:grid;gap:6rpx;min-width:0;padding:22rpx;border-radius:24rpx;background:#fff}.metric-grid text:first-child{color:#0f766e;font-size:32rpx;font-weight:950}.metric-grid text:nth-child(2){font-size:24rpx;font-weight:900}.metric-grid small{color:#7a5b52;font-size:21rpx}.section{padding:22rpx}.section-title{font-size:29rpx;font-weight:950}.section-head{display:flex;align-items:center;justify-content:space-between;gap:14rpx}.link{color:#0f766e;font-size:23rpx;font-weight:900}.funnel{display:grid;grid-template-columns:repeat(5,1fr);gap:8rpx;margin-top:18rpx}.funnel view{display:grid;gap:6rpx;text-align:center}.funnel span{color:#7a5b52;font-size:20rpx}.funnel strong{font-size:26rpx}.risk-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10rpx;margin-top:18rpx}.risk-grid view{display:grid;gap:5rpx;padding:18rpx 8rpx;border-radius:18rpx;background:#fff6f3;text-align:center}.risk-grid strong{color:#b42318;font-size:30rpx}.risk-grid span{color:#7a5b52;font-size:20rpx}.trend{display:grid;grid-template-columns:128rpx 1fr;gap:8rpx 12rpx;align-items:center;margin-top:16rpx}.trend-date{color:#6f7772;font-size:21rpx}.bar{height:14rpx;border-radius:999px;background:#e8efeb;overflow:hidden}.bar view{height:100%;border-radius:999px;background:#0f766e}.trend-values{grid-column:1/3;color:#7a5b52;font-size:21rpx}.channel{display:flex;align-items:flex-start;justify-content:space-between;gap:14rpx;padding:18rpx 0;border-bottom:1rpx solid #edf0ed}.channel:last-child{border-bottom:0}.channel>view:first-child{display:grid;gap:5rpx;min-width:0}.channel strong{font-size:24rpx}.channel text{color:#7a5b52;font-size:20rpx}.channel-data{display:grid;grid-template-columns:1fr 1fr;gap:5rpx 12rpx;flex:0 0 auto;color:#0f766e;font-size:20rpx;text-align:right}.advice{display:grid;gap:7rpx;margin-top:14rpx;padding:17rpx;border-radius:18rpx;background:#f4f8f5}.advice strong{font-size:24rpx}.advice text,.empty,.inline-error{color:#7a5b52;font-size:22rpx;line-height:1.55}.empty,.inline-error{padding:24rpx 0;text-align:center}.inline-error{color:#b42318}.disabled{opacity:.5;pointer-events:none}@media(max-width:360px){.funnel{grid-template-columns:repeat(3,1fr)}.channel{display:grid}.channel-data{text-align:left}}@media(min-width:900px){.admin-page{max-width:760px}}
.inline-error{display:grid;justify-items:center;gap:12rpx}.inline-retry{padding:9rpx 17rpx;border-radius:14rpx;background:#b42318;color:#fff;font-weight:900}
</style>
