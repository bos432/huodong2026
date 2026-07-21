<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { getCurrentRouteWithQuery, getUserToken, request } from "../../api";
import AppBottomNav from "../../components/AppBottomNav.vue";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { guardCurrentPageFeature, loadFeatureGates } from "../../feature-gates";

const loading = ref(true);
const loadError = ref("");
const mineLoadError = ref("");
const activeAction = ref("");
const submitting = computed(() => Boolean(activeAction.value));
const attendanceToken = ref("");
const attendanceAction = ref<"check_in" | "check_out">("check_in");
const tasks = ref<any[]>([]);
const mine = ref<any>({ profile: null, applications: [], records: [] });
const form = reactive({ name: "", phone: "", city: "", expertise: "", availableTime: "", serviceIntent: "", message: "" });
const businessKeys = new Map<string, string>();
const tasksLoadGuard = createTenantLoadGuard();
const mineLoadGuard = createTenantLoadGuard();

function businessKey(scope: string) {
  const existing = businessKeys.get(scope);
  if (existing) return existing;
  const created = `volunteer:${scope}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  businessKeys.set(scope, created);
  return created;
}

async function load() {
  const tasksToken = tasksLoadGuard.begin();
  const mineToken = mineLoadGuard.begin();
  loading.value = true;
  loadError.value = "";
  mineLoadError.value = "";
  try {
    const taskRows = await request<any[]>("/public/volunteer/tasks");
    if (!tasksLoadGuard.isCurrent(tasksToken)) return;
    tasks.value = taskRows;
    if (getUserToken()) {
      try {
        const result = await request<any>("/public/me/volunteer");
        if (mineLoadGuard.isCurrent(mineToken)) mine.value = result;
      } catch (error: any) {
        if (!mineLoadGuard.isCurrent(mineToken)) return;
        mine.value = { profile: null, applications: [], records: [] };
        mineLoadError.value = error?.message || "我的志愿服务记录加载失败";
      }
    } else if (mineLoadGuard.isCurrent(mineToken)) mine.value = { profile: null, applications: [], records: [] };
    const phone = String(uni.getStorageSync("user_phone") || "");
    if (phone && !form.phone) form.phone = phone;
    const nickname = String(uni.getStorageSync("user_nickname") || "");
    if (nickname && !form.name) form.name = nickname;
  } catch (error: any) {
    if (!tasksLoadGuard.isCurrent(tasksToken)) return;
    tasks.value = [];
    loadError.value = error?.message || "志愿任务加载失败";
  } finally {
    if (tasksLoadGuard.isCurrent(tasksToken)) loading.value = false;
  }
}

function validateBase() {
  if (!form.name.trim()) return "请填写姓名";
  if (!/^1\d{10}$/.test(form.phone.trim())) return "请填写正确手机号";
  if (!form.city.trim()) return "请填写城市";
  return "";
}

async function submitProfile() {
  if (activeAction.value) return;
  const message = validateBase();
  if (message) return uni.showToast({ title: message, icon: "none" });
  activeAction.value = "profile";
  try {
    await request("/public/volunteer/apply", { method: "POST", data: { ...form, businessKey: businessKey("profile") } });
    businessKeys.delete("profile");
    uni.showToast({ title: "已提交", icon: "success" });
    await load();
  } catch (error: any) {
    uni.showToast({ title: error.message || "提交失败", icon: "none" });
  } finally {
    activeAction.value = "";
  }
}

async function applyTask(task: any) {
  if (activeAction.value) return;
  const message = validateBase();
  if (message) return uni.showToast({ title: message, icon: "none" });
  const action = `task:${task.id}`;
  activeAction.value = action;
  try {
    await request(`/public/volunteer/tasks/${task.id}/apply`, { method: "POST", data: { name: form.name, phone: form.phone, city: form.city, message: form.message || form.serviceIntent, businessKey: businessKey(action) } });
    businessKeys.delete(action);
    uni.showToast({ title: "报名成功", icon: "success" });
    await load();
  } catch (error: any) {
    uni.showToast({ title: error.message || "报名失败", icon: "none" });
  } finally {
    activeAction.value = "";
  }
}

function statusText(value?: string) {
  const map: Record<string, string> = { pending: "待审核", admitted: "已录取", approved: "已录取", waitlisted: "候补中", rejected: "未通过", cancelled: "已取消", replaced: "已替补", checked_in: "已签到", completed: "已完成" };
  return map[value || ""] || value || "待处理";
}

async function cancelApplication(item: any) {
  if (!getUserToken()) return goLogin();
  if (activeAction.value) return;
  const scope = `cancel:${item.id}`;
  activeAction.value = `${scope}:prompt`;
  try {
    const confirmed = await new Promise<boolean>((resolve, reject) => uni.showModal({ title: "取消任务报名", content: "取消后如需参加，需要重新报名。", confirmText: "确认取消", success: (result) => resolve(result.confirm), fail: reject }));
    if (!confirmed) return;
    activeAction.value = scope;
    await request(`/public/me/volunteer/task-applications/${item.id}/cancel`, { method: "POST", data: { reason: "用户主动取消", businessKey: businessKey(scope) } });
    businessKeys.delete(scope);
    uni.showToast({ title: "已取消报名", icon: "success" });
    await load();
  } catch (error: any) {
    uni.showToast({ title: error.message || "取消失败", icon: "none" });
  } finally {
    activeAction.value = "";
  }
}

async function submitAttendance(item: any) {
  if (activeAction.value) return;
  if (!attendanceToken.value.trim()) return uni.showToast({ title: "请先粘贴签到凭证", icon: "none" });
  const scope = `attendance:${item.id}:${attendanceAction.value}`;
  activeAction.value = `attendance:${item.id}`;
  try {
    await request(`/public/me/volunteer/task-applications/${item.id}/attendance`, { method: "POST", data: { token: attendanceToken.value.trim(), action: attendanceAction.value, businessKey: businessKey(scope) } });
    businessKeys.delete(scope);
    attendanceToken.value = "";
    uni.showToast({ title: attendanceAction.value === "check_in" ? "签到成功" : "签退成功", icon: "success" });
    await load();
  } catch (error: any) {
    uni.showToast({ title: error.message || "签到失败", icon: "none" });
  } finally {
    activeAction.value = "";
  }
}

async function confirmService(item: any) {
  if (activeAction.value) return;
  const scope = `service-confirm:${item.id}`;
  activeAction.value = `service:${item.id}`;
  try {
    await request(`/public/me/volunteer/service-records/${item.id}/confirm`, { method: "POST", data: { businessKey: businessKey(scope) } });
    businessKeys.delete(scope);
    uni.showToast({ title: "已确认，等待运营复核", icon: "success" });
    await load();
  } catch (error: any) {
    uni.showToast({ title: error.message || "确认失败", icon: "none" });
  } finally {
    activeAction.value = "";
  }
}

function goLogin() {
  uni.navigateTo({ url: `/pages/user/login?redirect=${encodeURIComponent(getCurrentRouteWithQuery())}` });
}

function formatTime(value?: string) {
  return value ? value.replace("T", " ").slice(0, 16) : "时间待定";
}

function levelText(value?: string) {
  const map: Record<string, string> = { participant: "公益参与者", volunteer: "公益志愿者", ambassador: "公益大使", city_builder: "城市共建者" };
  return map[value || ""] || "公益参与者";
}

onShow(async () => {
  await loadFeatureGates(true);
  if (!guardCurrentPageFeature()) return;
  await load();
});
</script>

<template>
  <view class="page">
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="loadError" class="card error-card">
      <view class="section-title">志愿服务加载失败</view>
      <view class="empty error-copy">{{ loadError }}</view>
      <button class="link-button" @click="load">重新加载</button>
    </view>
    <template v-else>
      <view class="hero">
        <text class="eyebrow">公益志愿服务</text>
        <text class="title">把一次参与，沉淀成可追踪的长期服务。</text>
        <text class="copy">志愿者可报名活动协助、公益执行、内容传播和帮扶回访任务；完成后形成服务时长、记录和成长等级。</text>
      </view>

      <view class="card">
        <view class="section-title">我的志愿档案</view>
        <view v-if="mineLoadError" class="inline-warning"><text>{{ mineLoadError }}</text><text class="warning-retry" @click="load">重试</text></view>
        <view v-if="mine.profile" class="profile">
          <text>{{ mine.profile.name }} · {{ mine.profile.city }}</text>
          <strong>{{ levelText(mine.profile.level) }}</strong>
          <text>累计服务 {{ Number(mine.profile.serviceHours || 0).toFixed(1) }} 小时</text>
        </view>
        <view v-else-if="!mineLoadError" class="empty">提交申请后，后台审核通过即可形成志愿者档案。</view>
        <view v-if="!getUserToken()" class="login" @click="goLogin">登录后查看我的服务记录</view>
      </view>

      <view class="card">
        <view class="section-title">志愿者申请</view>
        <input v-model="form.name" class="input" placeholder="姓名" />
        <input v-model="form.phone" class="input" placeholder="手机号" type="number" maxlength="11" />
        <input v-model="form.city" class="input" placeholder="所在城市" />
        <input v-model="form.expertise" class="input" placeholder="擅长领域，例如接待/讲解/助教/传播" />
        <input v-model="form.availableTime" class="input" placeholder="可服务时间，例如周末/工作日晚" />
        <input v-model="form.serviceIntent" class="input" placeholder="服务意向，例如活动协助/帮扶回访" />
        <textarea v-model="form.message" class="textarea" placeholder="补充说明" />
        <button class="submit" :loading="activeAction === 'profile'" :disabled="submitting" @click="submitProfile">{{ activeAction === 'profile' ? '提交中...' : '提交志愿者申请' }}</button>
      </view>

      <view class="card">
        <view class="section-title">开放任务</view>
        <view v-if="!tasks.length" class="empty">暂无开放任务。</view>
        <view v-for="task in tasks" :key="task.id" class="task">
          <view class="task-head">
            <text>{{ task.title }}</text>
            <strong>{{ task.city }}</strong>
          </view>
          <view class="meta">{{ task.type }} · {{ formatTime(task.startAt) }} · 名额 {{ task.quota }}</view>
          <view class="desc">{{ task.description || task.requirement || "具体服务事项由后台运营跟进确认。" }}</view>
          <button class="task-button" :loading="activeAction === `task:${task.id}`" :disabled="submitting" @click="applyTask(task)">{{ activeAction === `task:${task.id}` ? '报名中...' : '报名任务' }}</button>
        </view>
      </view>

      <view v-if="mine.applications?.length" class="card">
        <view class="section-title">我的任务报名</view>
        <view v-for="item in mine.applications" :key="item.id" class="record">
          <text>{{ item.task?.title || "志愿任务" }}</text>
          <view class="record-actions">
            <strong>{{ statusText(item.status) }}</strong>
            <button v-if="['pending', 'admitted', 'waitlisted'].includes(item.status)" class="link-button" :disabled="submitting" @click="cancelApplication(item)">{{ activeAction.startsWith(`cancel:${item.id}`) ? '取消中...' : '取消' }}</button>
          </view>
          <view v-if="['admitted', 'checked_in'].includes(item.status)" class="attendance-box">
            <input v-model="attendanceToken" class="input" placeholder="粘贴现场签到凭证" />
            <picker :range="['签到', '签退']" @change="attendanceAction = $event.detail.value === 0 ? 'check_in' : 'check_out'"><view class="picker">{{ attendanceAction === 'check_in' ? '签到' : '签退' }}</view></picker>
            <button class="link-button" :disabled="submitting" @click="submitAttendance(item)">{{ activeAction === `attendance:${item.id}` ? '提交中...' : '提交' }}</button>
          </view>
        </view>
      </view>

      <view v-if="mine.records?.length" class="card">
        <view class="section-title">服务记录</view>
        <view v-for="item in mine.records" :key="item.id" class="record">
          <text>{{ item.title }}</text>
          <view class="record-actions">
            <strong>{{ Number(item.submittedHours || item.hours || 0).toFixed(1) }} 小时 · {{ statusText(item.status) }}</strong>
            <button v-if="item.status === 'pending_volunteer'" class="link-button" :disabled="submitting" @click="confirmService(item)">{{ activeAction === `service:${item.id}` ? '确认中...' : '确认工时' }}</button>
          </view>
        </view>
      </view>
    </template>
    <AppBottomNav current-path="/pages/volunteer/index" />
  </view>
</template>

<style scoped>
.page { min-height: 100vh; padding: 24rpx 24rpx 150rpx; background: #f4f8f5; color: #22332b; }
.hero, .card { border-radius: 24rpx; box-shadow: 0 14rpx 36rpx rgba(31, 69, 48, 0.08); }
.hero { padding: 38rpx 30rpx; background: linear-gradient(135deg, #214b4e, #4f7c58); color: #fffaf2; }
.eyebrow { color: rgba(255,250,242,0.76); font-size: 24rpx; font-weight: 900; }
.title { display: block; margin-top: 14rpx; font-size: 42rpx; line-height: 1.25; font-weight: 950; }
.copy { display: block; margin-top: 14rpx; color: rgba(255,250,242,0.82); font-size: 26rpx; line-height: 1.6; }
.card { margin-top: 20rpx; padding: 26rpx; background: #fff; border: 1rpx solid #dfe9df; }
.error-card { border-color:#fecaca; background:#fff7f7; }
.error-copy { padding:4rpx 0 18rpx; color:#b91c1c; text-align:left; }
.inline-warning { display:flex; align-items:center; justify-content:space-between; gap:14rpx; margin-bottom:16rpx; padding:16rpx; border-radius:8px; background:#fff7ed; color:#9a3412; font-size:23rpx; line-height:1.5; }
.warning-retry { flex:0 0 auto; font-weight:900; }
.section-title { margin-bottom: 16rpx; font-size: 31rpx; font-weight: 950; color: #214b4e; }
.input, .textarea { width: 100%; box-sizing: border-box; margin-top: 14rpx; padding: 22rpx; border-radius: 16rpx; background: #f1f6f2; font-size: 26rpx; }
.textarea { min-height: 160rpx; }
.submit, .task-button, .login { display: flex; align-items: center; justify-content: center; margin-top: 18rpx; height: 82rpx; border-radius: 999rpx; background: #214b4e; color: #fff; font-size: 27rpx; font-weight: 900; }
.task-button { height: 72rpx; background: #4f7c58; }
.profile { display: grid; gap: 8rpx; color: #617068; font-size: 25rpx; }
.profile strong { color: #8b4a3e; font-size: 32rpx; }
.task { padding: 20rpx 0; border-bottom: 1rpx solid #edf2ee; }
.task-head, .record { display: flex; justify-content: space-between; gap: 16rpx; font-size: 27rpx; font-weight: 900; }
.task-head strong, .record strong { color: #8b4a3e; }
.meta, .desc, .empty { color: #78867d; font-size: 24rpx; line-height: 1.55; }
.meta, .desc { margin-top: 8rpx; }
.record { padding: 16rpx 0; border-bottom: 1rpx solid #edf2ee; }
.record-actions { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; margin-top: 8rpx; }
.link-button { min-width: 120rpx; height: 56rpx; line-height: 56rpx; padding: 0 18rpx; border-radius: 10rpx; background: #e8f1e9; color: #214b4e; font-size: 23rpx; }
.attendance-box { display: grid; grid-template-columns: 1fr 120rpx 110rpx; gap: 10rpx; align-items: center; margin-top: 14rpx; }
.attendance-box .input { margin-top: 0; padding: 14rpx; }
.picker { padding: 14rpx 8rpx; border-radius: 10rpx; background: #f1f6f2; color: #617068; text-align: center; font-size: 23rpx; }
</style>
