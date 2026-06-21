<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { getCurrentRouteWithQuery, getUserToken, request } from "../../api";
import AppBottomNav from "../../components/AppBottomNav.vue";

const loading = ref(true);
const submitting = ref(false);
const tasks = ref<any[]>([]);
const mine = ref<any>({ profile: null, applications: [], records: [] });
const form = reactive({ name: "", phone: "", city: "", expertise: "", availableTime: "", serviceIntent: "", message: "" });

async function load() {
  loading.value = true;
  try {
    tasks.value = await request<any[]>("/public/volunteer/tasks");
    if (getUserToken()) mine.value = await request<any>("/public/me/volunteer").catch(() => ({ profile: null, applications: [], records: [] }));
    const phone = String(uni.getStorageSync("user_phone") || "");
    if (phone && !form.phone) form.phone = phone;
    const nickname = String(uni.getStorageSync("user_nickname") || "");
    if (nickname && !form.name) form.name = nickname;
  } finally {
    loading.value = false;
  }
}

function validateBase() {
  if (!form.name.trim()) return "请填写姓名";
  if (!/^1\d{10}$/.test(form.phone.trim())) return "请填写正确手机号";
  if (!form.city.trim()) return "请填写城市";
  return "";
}

async function submitProfile() {
  const message = validateBase();
  if (message) return uni.showToast({ title: message, icon: "none" });
  submitting.value = true;
  try {
    await request("/public/volunteer/apply", { method: "POST", data: form });
    uni.showToast({ title: "已提交", icon: "success" });
    await load();
  } catch (error: any) {
    uni.showToast({ title: error.message || "提交失败", icon: "none" });
  } finally {
    submitting.value = false;
  }
}

async function applyTask(task: any) {
  const message = validateBase();
  if (message) return uni.showToast({ title: message, icon: "none" });
  submitting.value = true;
  try {
    await request(`/public/volunteer/tasks/${task.id}/apply`, { method: "POST", data: { name: form.name, phone: form.phone, city: form.city, message: form.message || form.serviceIntent } });
    uni.showToast({ title: "报名成功", icon: "success" });
    await load();
  } catch (error: any) {
    uni.showToast({ title: error.message || "报名失败", icon: "none" });
  } finally {
    submitting.value = false;
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

onMounted(load);
</script>

<template>
  <view class="page">
    <view v-if="loading" class="empty">加载中...</view>
    <template v-else>
      <view class="hero">
        <text class="eyebrow">公益志愿服务</text>
        <text class="title">把一次参与，沉淀成可追踪的长期服务。</text>
        <text class="copy">志愿者可报名活动协助、公益执行、内容传播和帮扶回访任务；完成后形成服务时长、记录和成长等级。</text>
      </view>

      <view class="card">
        <view class="section-title">我的志愿档案</view>
        <view v-if="mine.profile" class="profile">
          <text>{{ mine.profile.name }} · {{ mine.profile.city }}</text>
          <strong>{{ levelText(mine.profile.level) }}</strong>
          <text>累计服务 {{ Number(mine.profile.serviceHours || 0).toFixed(1) }} 小时</text>
        </view>
        <view v-else class="empty">提交申请后，后台审核通过即可形成志愿者档案。</view>
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
        <button class="submit" :loading="submitting" :disabled="submitting" @click="submitProfile">提交志愿者申请</button>
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
          <button class="task-button" :disabled="submitting" @click="applyTask(task)">报名任务</button>
        </view>
      </view>

      <view v-if="mine.applications?.length" class="card">
        <view class="section-title">我的任务报名</view>
        <view v-for="item in mine.applications" :key="item.id" class="record">
          <text>{{ item.task?.title || "志愿任务" }}</text>
          <strong>{{ item.status }}</strong>
        </view>
      </view>

      <view v-if="mine.records?.length" class="card">
        <view class="section-title">服务记录</view>
        <view v-for="item in mine.records" :key="item.id" class="record">
          <text>{{ item.title }}</text>
          <strong>{{ Number(item.hours || 0).toFixed(1) }} 小时</strong>
        </view>
      </view>
    </template>
    <AppBottomNav current-path="/pages/user/my" />
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
</style>
