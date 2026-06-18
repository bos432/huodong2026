<template>
  <view class="apply-page">
    <view class="hero dean">
      <text class="eyebrow">院长招募</text>
      <text class="title">招募一批真正愿意把书院开在本地的人。</text>
      <text class="copy">院长不是普通代理，而是本地学习空间的负责人：组织活动、服务学员、链接老师和公益资源。</text>
    </view>

    <view class="section">
      <text class="section-title">适合谁</text>
      <view v-for="item in fit" :key="item" class="pill">{{ item }}</view>
    </view>

    <view class="section form-section">
      <text class="section-title">提交院长申请</text>
      <input v-model="form.name" class="input" placeholder="姓名" />
      <input v-model="form.phone" class="input" placeholder="手机号" type="number" maxlength="11" />
      <input v-model="form.city" class="input" placeholder="计划运营城市/区域" />
      <input v-model="form.wechat" class="input" placeholder="微信号" />
      <input v-model="form.expertise" class="input" placeholder="你的资源优势，例如场地/老师/社群/运营" />
      <textarea v-model="form.experience" class="textarea" placeholder="请介绍你的本地资源、过往运营经验、想开书院的原因" />
      <button class="submit" :loading="submitting" :disabled="submitting || submitted" @click="submit">{{ submitted ? "已提交，等待联系" : "提交院长申请" }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { request } from "../../api";

const submitting = ref(false);
const submitted = ref(false);
const fit = ["有本地文化空间或稳定社群", "愿意长期做课程与活动交付", "能服务学员并维护当地口碑", "认同七维书院品牌与公益理念"];
const form = reactive({ name: "", phone: "", city: "", wechat: "", expertise: "", experience: "" });

function validate() {
  if (!form.name.trim()) return "请填写姓名";
  if (!/^1\d{10}$/.test(form.phone.trim())) return "请填写正确手机号";
  if (!form.city.trim()) return "请填写城市/区域";
  if (!form.wechat.trim()) return "请填写微信号";
  if (!form.expertise.trim()) return "请填写资源优势";
  if (!form.experience.trim()) return "请填写申请说明";
  return "";
}

async function submit() {
  const message = validate();
  if (message) return uni.showToast({ title: message, icon: "none" });
  submitting.value = true;
  try {
    await request("/public/ambassador/applications", { method: "POST", data: { ...form, source: "dean_recruit" } });
    submitted.value = true;
    uni.showModal({ title: "已提交", content: "院长招募申请已进入后台，我们会尽快联系你。", showCancel: false });
  } catch (error: any) {
    uni.showToast({ title: error.message || "提交失败", icon: "none" });
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.apply-page { min-height: 100vh; padding: 28rpx 24rpx 150rpx; background: #f6efe5; color: #2d241c; }
.hero, .section { border-radius: 26rpx; box-shadow: 0 16rpx 42rpx rgba(91,47,36,0.08); }
.hero { padding: 42rpx 32rpx; background: linear-gradient(135deg, #3e2a20, #8b5a2b); color: #fff8e8; }
.eyebrow { color: #f6d58f; font-size: 24rpx; font-weight: 900; }
.title { display: block; margin-top: 16rpx; font-size: 44rpx; line-height: 1.22; font-weight: 950; }
.copy { display: block; margin-top: 16rpx; color: rgba(255,248,232,0.86); font-size: 27rpx; line-height: 1.58; }
.section { margin-top: 24rpx; padding: 28rpx; background: #fff; }
.section-title { display: block; margin-bottom: 18rpx; color: #5b2f24; font-size: 32rpx; font-weight: 950; }
.pill { margin: 12rpx 0; padding: 18rpx 22rpx; border-radius: 16rpx; background: #fff7ec; color: #7a4b24; font-size: 26rpx; font-weight: 800; }
.input, .textarea { width: 100%; box-sizing: border-box; margin-top: 16rpx; padding: 22rpx; border-radius: 16rpx; background: #f9f3eb; color: #2d241c; font-size: 26rpx; }
.textarea { min-height: 170rpx; }
.submit { margin-top: 22rpx; height: 86rpx; border-radius: 999px; background: #8b5a2b; color: #fff; font-size: 28rpx; font-weight: 950; }
</style>
