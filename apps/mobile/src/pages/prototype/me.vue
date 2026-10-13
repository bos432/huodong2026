<script setup lang="ts">
import MobileShell from "../../components/layout/MobileShell.vue";
import IconGlyph from "../../components/ui/IconGlyph.vue";
import CloudExperienceGallery from "../../components/profile/CloudExperienceGallery.vue";
import { onShow, onHide, onUnload } from "@dcloudio/uni-app";
import { computed, ref } from "vue";
import type { PublicMemberProfile, PublicMemberRegistrationRecord } from "@activity/shared";
import { mobileTabRoute } from "../../mobile-tab-routes";
import { withTenantCode, getUserToken, getUserId, getCurrentTenantCode, clearUser, request } from "../../api";
import { formatShanghaiDateTime } from "../../tenant-load-guard";
import { EXPERIENCE_RECORDS_STORAGE_KEY, normalizeExperienceRecords, readExperienceRecords, type ExperienceRecord } from "../checkin/experience-records";
import { summarizeProfileRegistrations } from "./profile-state";

const settings = [
  { icon: "bell", label: "消息与提醒", hint: "查看报名和活动通知", path: "/pages/user/notifications" },
  { icon: "shield", label: "隐私与安全", hint: "查看隐私政策和账号设置", path: "/pages/user/settings" },
  { icon: "help", label: "客服与帮助", hint: "需要帮助时联系我们" },
  { icon: "star", label: "关于慢π", hint: "了解产品和活动原则" }
];
const experienceRecords = ref<ExperienceRecord[]>([]);
const profile = ref<PublicMemberProfile | null>(null);
const registrations = ref<PublicMemberRegistrationRecord[]>([]);
const isGuest = ref(!getUserToken());
const loading = ref(false);
const registrationsReady = ref(false);
const profileError = ref("");
const registrationError = ref("");
const currentTime = ref(Date.now());
const logoutConfirming = ref(false);
let profileLoadSequence = 0;
const mobileShell = ref<InstanceType<typeof MobileShell> | null>(null);
const cloudGallery = ref<InstanceType<typeof CloudExperienceGallery> | null>(null);
const summary = computed(() => summarizeProfileRegistrations(registrations.value, currentTime.value));
const nextRegistration = computed(() => summary.value.upcoming[0] || null);
const displayName = computed(() => profile.value?.nickname || (isGuest.value ? "欢迎来到慢π" : loading.value ? "资料同步中" : "慢π用户"));
const countText = (value: number) => registrationsReady.value ? String(value) : "—";
const activityCounts = computed(() => [
  { label: "参加活动", value: countText(summary.value.attendedCount), note: "以真实签到为准" },
  { label: "活动记录", value: countText(summary.value.records.length), note: "真实参与记录" },
  { label: "关注", value: "—", note: "暂未开放" },
  { label: "粉丝", value: "—", note: "暂未开放" },
  { label: "组织活动", value: "—", note: "在主理人工作台查看" }
]);
const todos = computed(() => [
  { icon: "calendar", title: "待参加", description: "已确认报名的活动安排", count: countText(summary.value.upcoming.length), path: "/pages/user/orders?status=upcoming" },
  { icon: "star", title: "待评价", description: "签到后留下真实感受", count: summary.value.reviewEligibilityKnown ? countText(summary.value.reviewable.length) : "—", path: "/pages/user/pending-reviews" },
  { icon: "ticket", title: "票夹", description: "查看报名凭证和活动安排", count: countText(summary.value.ticketCount), path: "/pages/user/orders?status=all" },
  { icon: "book", title: "活动记录", description: "只记录真实参与过的活动", count: countText(summary.value.records.length), path: "/pages/user/orders?status=completed" }
]);

function loadLocalExperiences() {
  experienceRecords.value = readExperienceRecords({
    getStorageSync: (key) => uni.getStorageSync(key)
  });
}
async function loadProfile() {
  const sequence = ++profileLoadSequence;
  const token = getUserToken();
  const userId = getUserId();
  const tenantCode = getCurrentTenantCode();
  const isCurrent = () => sequence === profileLoadSequence && token === getUserToken() && userId === getUserId() && tenantCode === getCurrentTenantCode();
  profile.value = null;
  registrations.value = [];
  registrationsReady.value = false;
  profileError.value = "";
  registrationError.value = "";
  isGuest.value = !token;
  currentTime.value = Date.now();
  if (!token) { loading.value = false; return; }
  loading.value = true;
  const options = { userToken: token, tenantCode };
  const [identity, bookings] = await Promise.allSettled([
    request<PublicMemberProfile>("/public/me/profile", options),
    request<PublicMemberRegistrationRecord[]>("/public/me/registrations", options)
  ]);
  if (!isCurrent()) {
    if (sequence === profileLoadSequence) void loadProfile();
    return;
  }
  loading.value = false;
  if (identity.status === "fulfilled" && identity.value?.id === userId) profile.value = identity.value;
  else profileError.value = "个人资料暂时无法同步，请重试。";
  if (bookings.status === "fulfilled" && Array.isArray(bookings.value)) {
    registrations.value = bookings.value;
    registrationsReady.value = true;
  } else registrationError.value = "活动记录暂时无法同步，请重试。";
}
function openSlowExperience() {
  uni.navigateTo({ url: withTenantCode("/pages/checkin/detail?id=1") });
}
function removeExperience(record: ExperienceRecord) {
  uni.showModal({
    title: "删除这页手记？",
    content: "仅此设备保存的文字与照片将被移除，无法撤销。",
    confirmText: "删除",
    confirmColor: "#B9533F",
    success: ({ confirm }) => {
      if (!confirm) return;
      const next = experienceRecords.value.filter((item) => item.id !== record.id);
      uni.setStorageSync(EXPERIENCE_RECORDS_STORAGE_KEY, normalizeExperienceRecords(next));
      experienceRecords.value = next;
      toast("已删除这页本地手记");
    }
  });
}
function experienceVisibilityText(record: ExperienceRecord) {
  return record.visibility === "public_review" ? "提交公开审核（演示）" : "仅自己可见";
}
function formatExperienceDate(value: string) {
  return formatShanghaiDateTime(value, "记录时间未知");
}
onShow(() => { loadLocalExperiences(); void loadProfile(); void cloudGallery.value?.load(); });
function invalidateProfileLoad() { profileLoadSequence += 1; loading.value = false; cloudGallery.value?.invalidate(); }
onHide(invalidateProfileLoad);
onUnload(invalidateProfileLoad);

function toast(title: string) { uni.showToast({ title, icon: "none" }); }
function discover() { uni.reLaunch({ url: withTenantCode(mobileTabRoute("home")) }); }
function navigateMember(path: string) {
  const url = getUserToken() ? path : `/pages/user/login?redirect=${encodeURIComponent(path)}`;
  uni.navigateTo({ url: withTenantCode(url) });
}
function login() { navigateMember("/pages/prototype/me"); }
function openRegistration(id: number) { navigateMember(`/pages/user/registration?id=${id}`); }
function openTodo(item: { title: string; path: string }) {
  navigateMember(item.path);
}
async function openSetting(item: { label: string; path?: string }) {
  if (item.path) {
    if (item.label === "隐私与安全") uni.navigateTo({ url: withTenantCode(isGuest.value ? "/pages/legal/privacy-policy" : item.path) });
    else navigateMember(item.path);
    return;
  }
  if (item.label === "关于慢π") {
    uni.showModal({ title: "关于慢π", content: "慢π，让真实活动成为生活的一部分。发现活动、认真参与、留下自己的体验与记录。", showCancel: false });
    return;
  }
  try {
    const support = await request<{ customerServiceName?: string; customerServicePhone?: string }>("/public/settings/operation");
    uni.showModal({ title: support.customerServiceName || "客服与帮助", content: support.customerServicePhone ? `客服电话：${support.customerServicePhone}` : "当前城市暂未配置客服电话，请联系活动主理人。", showCancel: false });
  } catch { toast("客服信息暂时无法加载，请稍后重试"); }
}
function logout() {
  if (logoutConfirming.value) return;
  logoutConfirming.value = true;
  uni.showModal({ title: "确认退出", content: "退出后需重新登录才能查看个人报名和活动记录。", confirmText: "退出登录", success: ({ confirm }) => {
    if (!confirm) return;
    invalidateProfileLoad();
    clearUser();
    void loadProfile();
    void cloudGallery.value?.load();
    toast("已退出登录");
  }, complete: () => { logoutConfirming.value = false; } });
}
function openPublishEntry() {
  mobileShell.value?.openPublish();
}
function selectTab(tab: "home" | "checkin" | "messages" | "me" | "publish") {
  if (tab === "home") uni.reLaunch({ url: withTenantCode(mobileTabRoute("home")) });
  else if (tab === "checkin") uni.reLaunch({ url: withTenantCode(mobileTabRoute("checkin")) });
  else if (tab === "messages") uni.reLaunch({ url: withTenantCode(mobileTabRoute("messages")) });
  else if (tab === "publish") openPublishEntry();
}
</script>

<template>
  <MobileShell ref="mobileShell" active-tab="me" @tab="selectTab">
    <view class="me-page">
      <view class="page-heading"><view><text class="heading-eyebrow">SLOWPI / PROFILE</text><text class="heading-title">我的</text><text class="heading-note">把认真参与过的活动，留在自己的记录里。</text></view><IconGlyph name="user" :size="22" label="个人中心" /></view>
      <view class="identity">
        <view class="identity-head"><view class="identity-main"><image v-if="profile?.avatarUrl" class="avatar" :src="profile.avatarUrl" mode="aspectFill" aria-label="用户头像" /><view v-else class="avatar avatar-fallback"><IconGlyph name="user" :size="30" label="默认头像" /></view><view class="identity-copy"><text class="eyebrow">{{ isGuest ? "未登录" : "个人活动记录中心" }}</text><text class="name">{{ displayName }}</text><text class="intro">{{ isGuest ? "登录后查看报名、票夹和自己的活动记录。" : "记录每一次认真参与，也认识愿意同行的人。" }}</text></view></view><button class="edit-button" @click="isGuest ? login() : navigateMember('/pages/user/profile')">{{ isGuest ? "登录 / 注册" : "编辑资料" }}</button></view>
      </view>
      <view v-if="loading" class="profile-state" role="status" aria-live="polite">正在同步个人资料和活动记录…</view>
      <view v-else-if="profileError || registrationError" class="profile-state error" role="alert"><text>{{ profileError || registrationError }}</text><button @click="loadProfile">重新加载</button></view>

      <view class="section stats-section"><view class="section-head"><view><text class="section-title">我的活动数据</text><text class="section-note">{{ isGuest ? "登录后同步真实参与记录" : "以当前账号报名和签到记录为准" }}</text></view></view><view class="stats"><view v-for="item in activityCounts" :key="item.label" class="stat"><b>{{ item.value }}</b><text>{{ item.label }}</text><small>{{ item.note }}</small></view></view></view>

      <view class="section upcoming-section"><view class="section-head"><view><text class="section-title">即将参加</text><text class="section-note">仅显示当前账号真实报名成功的活动</text></view></view><view v-if="nextRegistration" class="upcoming-card" role="button" tabindex="0" @click="openRegistration(nextRegistration.id)" @keyup.enter="openRegistration(nextRegistration.id)" @keyup.space.prevent="openRegistration(nextRegistration.id)"><image v-if="nextRegistration.activity?.coverUrl" :src="nextRegistration.activity.coverUrl" mode="aspectFill" /><view><b>{{ nextRegistration.activity?.title || "活动信息完善中" }}</b><small>{{ formatShanghaiDateTime(nextRegistration.activity?.startTime, "时间以报名详情为准") }}</small><small>{{ nextRegistration.activity?.location || "集合地点以报名详情为准" }}</small></view><IconGlyph name="chevron" :size="15" label="查看报名" /></view><view v-else class="upcoming-empty"><IconGlyph name="calendar" :size="18" label="暂无即将参加" /><text>{{ loading ? "正在同步活动安排…" : registrationError || (isGuest ? "登录后查看即将参加的活动" : "暂无真实报名成功的活动") }}</text></view></view>

      <view class="section"><view class="section-head"><view><text class="section-title">当前待办</text><text class="section-note">先把一次真实参与照顾好</text></view></view><view class="todo-grid"><view v-for="item in todos" :key="item.title" class="todo" role="button" tabindex="0" :aria-label="item.title" @click="openTodo(item)" @keyup.enter="openTodo(item)" @keyup.space.prevent="openTodo(item)"><view class="todo-icon"><IconGlyph :name="item.icon" :size="20" :label="item.title" /></view><view class="todo-copy"><b>{{ item.title }}</b><small>{{ item.description }}</small></view><em>{{ item.count }}</em></view></view></view>


      <view class="section"><view class="section-head"><view><text class="section-title">活动记录</text><text class="section-note">只展示真实签到和完成记录</text></view><button @click="discover">去发现</button></view><view v-if="summary.records.length" class="slow-record-list"><view v-for="record in summary.records.slice(0, 3)" :key="record.id" class="upcoming-card" role="button" tabindex="0" :aria-label="`查看活动记录：${record.activity?.title || '活动'}`" @click="openRegistration(record.id)" @keyup.enter="openRegistration(record.id)" @keyup.space.prevent="openRegistration(record.id)"><image v-if="record.activity?.coverUrl" :src="record.activity.coverUrl" mode="aspectFill" /><view><b>{{ record.activity?.title || "活动信息完善中" }}</b><small>{{ formatShanghaiDateTime(record.activity?.startTime) }}</small><small>{{ record.canReview ? "可以评价 · 留下真实感受" : "已签到 · 查看活动记录" }}</small></view><IconGlyph name="chevron" :size="15" label="查看记录" /></view><button class="primary-button" @click="navigateMember('/pages/user/orders?status=completed')">查看全部记录</button></view><view v-else class="record-empty"><view class="empty-icon"><IconGlyph name="calendar" :size="28" label="暂无活动记录" /></view><b>{{ loading ? "正在同步活动记录" : registrationError ? "活动记录同步失败" : "暂无真实活动记录" }}</b><text>{{ registrationError || (isGuest ? "登录后查看自己的参与记录；尚未参加时也可以先发现活动。" : "完成报名并真实签到后，你的活动会收在这里。") }}</text><button class="primary-button" @click="registrationError ? loadProfile() : discover()">{{ registrationError ? "重新加载" : "去首页发现活动" }}</button></view></view>

      <CloudExperienceGallery ref="cloudGallery" />
      <view v-if="isGuest && experienceRecords.length" class="section slow-record-section"><view class="section-head"><view><text class="section-title">本机演示记录</text><text class="section-note">旧演示数据 · 未绑定账号，不会自动上传</text></view></view><view class="slow-record-list"><view v-for="record in experienceRecords" :key="record.id" class="slow-record"><image v-if="record.photoPath" :src="record.photoPath" mode="aspectFill" /><view class="slow-record-copy"><view class="slow-record-meta"><text>{{ formatExperienceDate(record.createdAt) }}</text><text>本机演示</text></view><text class="record-discovery">{{ record.discovery }}</text><text v-if="record.lightNote">{{ record.lightNote }}</text><text>{{ record.feeling }}</text><small>未绑定账号 · 不会公开展示</small></view><button class="record-delete" :aria-label="`删除${record.discovery}这页本机演示手记`" @click="removeExperience(record)">删除</button></view></view></view>

      <view class="section growth"><view class="section-head"><view><text class="section-title">我的成长</text><text class="section-note">每一次认真参与，都值得留下记录</text></view></view><view class="growth-grid"><view><IconGlyph name="checkin" :size="22" label="参与次数" /><b>参与次数</b><small>{{ countText(summary.attendedCount) }} 次真实签到</small></view><view role="button" tabindex="0" aria-label="查看活动回顾" @click="navigateMember('/pages/user/orders?status=completed')" @keyup.enter="navigateMember('/pages/user/orders?status=completed')" @keyup.space.prevent="navigateMember('/pages/user/orders?status=completed')"><IconGlyph name="book" :size="22" label="回顾" /><b>活动回顾</b><small>查看自己的参与记录</small></view><view><IconGlyph name="award" :size="22" label="纪念章" /><b>纪念章</b><small>暂未开放</small></view></view></view>

      <view class="section host-entry"><view class="host-copy"><text class="eyebrow">主理人入口</text><text class="section-title">申请成为主理人</text><text class="section-note">提交资料后由慢π审核，审核通过才能发起活动。</text></view><button aria-label="申请或查看主理人进度" @click="openPublishEntry">申请或查看进度</button></view>

      <view class="section settings-section"><view class="section-head"><view><text class="section-title">设置</text><text class="section-note">管理你的慢π体验</text></view></view><view class="setting-list"><view v-for="item in settings" :key="item.label" class="setting" role="button" tabindex="0" :aria-label="item.label" @click="openSetting(item)" @keyup.enter="openSetting(item)" @keyup.space.prevent="openSetting(item)"><IconGlyph :name="item.icon" :size="18" :label="item.label" /><view><b>{{ item.label }}</b><small>{{ item.hint }}</small></view><IconGlyph name="chevron" :size="15" label="打开" /></view><view v-if="!isGuest" class="setting" role="button" tabindex="0" aria-label="退出登录" @click="logout" @keyup.enter="logout" @keyup.space.prevent="logout"><IconGlyph name="user" :size="18" label="退出登录" /><view><b>退出登录</b><small>退出后不展示当前账号的活动记录</small></view><IconGlyph name="chevron" :size="15" label="打开" /></view></view></view>
    </view>
  </MobileShell>
</template>

<style scoped>
@import "../../styles/tokens.css";
.me-page{min-height:100vh;box-sizing:border-box;padding:0 14px calc(28px + env(safe-area-inset-bottom));background:var(--mp-bg-page);font-family:var(--mp-font-family)}
.page-heading{display:flex;align-items:flex-start;justify-content:space-between;padding:22px 4px 16px;color:var(--mp-text-primary)}.page-heading view{display:grid;gap:3px}.heading-eyebrow{color:var(--mp-brand-primary-dark);font-size:9px;font-weight:800;letter-spacing:.08em}.heading-title{font-size:26px;font-weight:800;line-height:1.05}.heading-note{color:var(--mp-text-muted);font-size:11px;line-height:1.45}.page-heading>.icon-user{margin-top:5px;color:var(--mp-brand-primary)}
.identity{border:1px solid var(--mp-border)}.section{margin-top:20px}.todo,.setting-list{border:1px solid var(--mp-border);box-shadow:var(--mp-shadow-card)}.growth{border:1px solid var(--mp-border)}
.profile-state{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:12px;padding:12px;border:1px solid var(--mp-border);border-radius:var(--mp-radius-md);background:var(--mp-bg-surface);color:var(--mp-text-secondary);font-size:12px;line-height:1.5}.profile-state.error{color:var(--mp-danger)}.profile-state button{flex:0 0 auto;min-height:36px;margin:0;padding:0 10px;border:1px solid var(--mp-border);border-radius:6px;background:var(--mp-bg-surface);color:var(--mp-brand-primary-dark);font-size:12px;line-height:36px}.profile-state button::after{border:0}
</style>
<style scoped>
/* Keep the profile page on the same surface and spacing system as the other slowpi tabs. */
.identity,
.stat,
.todo,
.setting-list { background: var(--mp-bg-surface); }
.stats { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; overflow: visible; border: 0; background: transparent; }
.stat { padding: 12px 8px; border: 1px solid var(--mp-border); border-radius: 12px; text-align: left; }
.stat text { white-space: normal; }
.identity{padding:16px;border-radius:var(--mp-radius-lg);box-shadow:var(--mp-shadow-card)}
.identity-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.identity-main{display:flex;align-items:flex-start;gap:12px;min-width:0;flex:1}
.avatar{width:54px;height:54px;flex:0 0 54px;border-radius:50%;background:var(--mp-brand-soft)}
.avatar-fallback{display:grid;place-items:center;color:var(--mp-brand-primary-dark)}
.identity-copy{display:grid;min-width:0;gap:3px}
.identity-copy .eyebrow{color:var(--mp-brand-primary-dark);font-size:10px;font-weight:700}
.identity-copy .name{color:var(--mp-text-primary);font-size:18px;font-weight:800;line-height:1.15}
.city{display:flex;align-items:center;gap:4px;color:var(--mp-text-muted);font-size:11px}
.identity-copy .intro{margin:2px 0 0;color:var(--mp-text-secondary);font-size:11px;line-height:1.45}
.edit-button,.section-head button,.host-entry button{min-height:32px;margin:0;padding:0 10px;border:1px solid var(--mp-border);border-radius:var(--mp-radius-pill);background:var(--mp-bg-soft);color:var(--mp-text-secondary);font-size:11px;line-height:30px}
.edit-button::after,.section-head button::after,.host-entry button::after,.primary-button::after{border:0}
.tag-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:14px;padding-top:12px;border-top:1px solid var(--mp-border)}
.tag-row text{padding:5px 8px;border-radius:var(--mp-radius-pill);background:var(--mp-brand-soft);color:var(--mp-brand-primary-dark);font-size:10px}
.section{padding:0 1px}.section-head{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-bottom:10px}.section-head>view{display:grid;gap:3px;min-width:0}.section-title{display:block;color:var(--mp-text-primary);font-size:15px;font-weight:800}.section-note{display:block;color:var(--mp-text-muted);font-size:10px;line-height:1.4}
.stats{display:grid}.stat{display:grid;gap:3px;min-width:0}.stat b{color:var(--mp-text-primary);font-size:18px;line-height:1.1}.stat text{color:var(--mp-text-secondary);font-size:11px}.stat small{color:var(--mp-text-muted);font-size:9px;line-height:1.3}
.todo-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.todo{display:flex;align-items:center;gap:8px;min-height:68px;padding:10px;border-radius:var(--mp-radius-md)}.todo-icon{display:grid;width:32px;height:32px;flex:0 0 32px;place-items:center;border-radius:10px;background:var(--mp-brand-soft);color:var(--mp-brand-primary-dark)}.todo-copy{display:grid;min-width:0;flex:1;gap:3px}.todo-copy b{overflow:hidden;color:var(--mp-text-primary);font-size:12px;text-overflow:ellipsis;white-space:nowrap}.todo-copy small{color:var(--mp-text-muted);font-size:9px;line-height:1.3}.todo em{align-self:flex-start;color:var(--mp-brand-primary);font-size:12px;font-style:normal;font-weight:800}
.record-empty{display:grid;justify-items:center;gap:8px;padding:26px 16px;border:1px solid var(--mp-border);border-radius:var(--mp-radius-lg);background:var(--mp-bg-surface);box-shadow:var(--mp-shadow-card);text-align:center}.empty-icon{display:grid;width:44px;height:44px;place-items:center;border-radius:14px;background:var(--mp-bg-soft);color:var(--mp-brand-primary)}.record-empty b{color:var(--mp-text-primary);font-size:13px}.record-empty>text{max-width:250px;color:var(--mp-text-muted);font-size:10px;line-height:1.5}.primary-button{min-height:36px;margin:4px 0 0;padding:0 14px;border:0;border-radius:var(--mp-radius-pill);background:var(--mp-brand-primary);color:var(--mp-text-inverse);font-size:11px;line-height:36px}
.growth{padding:14px;border-radius:var(--mp-radius-lg);background:var(--mp-bg-surface)}.growth-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.growth-grid>view{display:grid;justify-items:start;gap:4px;padding:10px;border-radius:var(--mp-radius-md);background:var(--mp-bg-soft);color:var(--mp-brand-primary-dark)}.growth-grid b{color:var(--mp-text-primary);font-size:11px}.growth-grid small{color:var(--mp-text-muted);font-size:9px;line-height:1.3}
.host-entry{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px;border:1px solid var(--mp-border);border-radius:var(--mp-radius-lg);background:var(--mp-bg-surface);box-shadow:none}.host-copy{display:grid;gap:3px;min-width:0}.host-copy .section-title{font-size:14px}.host-entry strong{display:block;color:var(--mp-brand-primary-dark)}.host-entry button{flex:0 0 auto;border:1px solid var(--mp-border);background:var(--mp-bg-surface);color:var(--mp-text-secondary)}
.setting-list{overflow:hidden;border-radius:var(--mp-radius-lg)}.setting{display:flex;align-items:center;gap:10px;min-height:56px;padding:8px 12px;border-bottom:1px solid var(--mp-border);color:var(--mp-brand-primary-dark)}.setting:last-child{border-bottom:0}.setting>view:not(.icon-glyph){display:grid;min-width:0;flex:1;gap:2px}.setting b{color:var(--mp-text-primary);font-size:12px}.setting small{color:var(--mp-text-muted);font-size:10px}
.upcoming-section,.slow-record-section{display:grid;gap:10px}.upcoming-card{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--mp-border);border-radius:12px;background:var(--mp-bg-surface);box-shadow:var(--mp-shadow-card)}.upcoming-card image{width:64px;height:64px;flex:0 0 64px;border-radius:8px;background:var(--mp-bg-soft)}.upcoming-card>view:not(.icon-glyph){display:grid;min-width:0;flex:1;gap:4px}.upcoming-card b{overflow:hidden;color:var(--mp-text-primary);font-size:12px;text-overflow:ellipsis;white-space:nowrap}.upcoming-card small{overflow:hidden;color:var(--mp-text-muted);font-size:9px;text-overflow:ellipsis;white-space:nowrap}.upcoming-empty{display:flex;align-items:center;gap:8px;padding:13px;border:1px solid var(--mp-border);border-radius:10px;background:var(--mp-bg-surface);color:var(--mp-text-muted);font-size:10px}.slow-record-list{display:grid;gap:9px}.slow-record{display:flex;align-items:flex-start;gap:10px;padding:11px;border:1px solid var(--mp-border);border-radius:12px;background:var(--mp-bg-surface);box-shadow:var(--mp-shadow-card)}.slow-record>image{width:68px;height:68px;flex:0 0 68px;border-radius:8px;background:var(--mp-bg-soft)}.slow-record-copy{display:grid;min-width:0;flex:1;gap:5px}.slow-record-copy>text{color:var(--mp-text-secondary);font-size:10px;line-height:1.45;word-break:break-word}.slow-record-copy .record-discovery{color:var(--mp-text-primary);font-size:12px;font-weight:750}.slow-record-meta{display:flex;flex-wrap:wrap;gap:6px}.slow-record-meta text,.slow-record-copy small{color:var(--mp-text-muted);font-size:9px;line-height:1.4}.slow-record-meta text+text{color:var(--mp-brand-primary-dark)}.record-delete{flex:0 0 auto;min-height:28px;padding:0 7px;border:1px solid var(--mp-border);border-radius:7px;background:transparent;color:var(--mp-text-muted);font-size:9px}.record-delete::after{border:0}
@media (max-width:360px){.identity-head{gap:8px}.identity-main{gap:8px}.todo{padding:8px}.todo-copy small{font-size:8px}.host-entry{align-items:flex-start;flex-direction:column}.host-entry button{align-self:flex-start}}
</style>
