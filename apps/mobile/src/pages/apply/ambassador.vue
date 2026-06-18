<template>
  <view class="apply-page">
    <view class="hero">
      <text class="eyebrow">{{ config.eyebrow }}</text>
      <text class="title">{{ config.title }}</text>
      <text class="copy">{{ config.copy }}</text>
    </view>

    <view class="section">
      <text class="section-title">{{ config.sectionTitle }}</text>
      <view class="grid">
        <view v-for="item in config.items" :key="item" class="card">{{ item }}</view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">{{ config.formTitle }}</text>
      <input v-model="form.name" class="input" placeholder="姓名" />
      <input v-model="form.phone" class="input" placeholder="手机号" type="number" maxlength="11" />
      <input v-model="form.city" class="input" placeholder="所在城市" />
      <input v-model="form.wechat" class="input" placeholder="微信号" />
      <input v-model="form.expertise" class="input" placeholder="擅长领域，例如书法/教育/国学/健康" />
      <textarea v-model="form.experience" class="textarea" placeholder="请介绍你的经验、课程方向或可提供的服务" />
      <button class="submit" :loading="submitting" :disabled="submitting || submitted" @click="submit">{{ submitted ? "已提交，等待联系" : config.submitText }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { request } from "../../api";
import { useEntryPageConfig } from "../../entry-pages";

const submitting = ref(false);
const submitted = ref(false);
const form = reactive({ name: "", phone: "", city: "", wechat: "", expertise: "", experience: "" });
const { config, load } = useEntryPageConfig("ambassadorApply");

function validate() {
  if (!form.name.trim()) return "请填写姓名";
  if (!/^1\d{10}$/.test(form.phone.trim())) return "请填写正确手机号";
  if (!form.city.trim()) return "请填写城市";
  if (!form.wechat.trim()) return "请填写微信号";
  if (!form.expertise.trim()) return "请填写擅长领域";
  if (!form.experience.trim()) return "请填写经验介绍";
  return "";
}

async function submit() {
  const message = validate();
  if (message) return uni.showToast({ title: message, icon: "none" });
  submitting.value = true;
  try {
    await request("/public/ambassador/applications", { method: "POST", data: { ...form, source: "ambassador_apply" } });
    submitted.value = true;
    uni.showModal({ title: "已提交", content: config.successMessage || "大使申请已进入后台，我们会尽快联系你。", showCancel: false });
  } catch (error: any) {
    uni.showToast({ title: error.message || "提交失败", icon: "none" });
  } finally {
    submitting.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.apply-page { min-height: 100vh; padding: 28rpx 24rpx 150rpx; background: #f7f0e5; color: #2d241c; }
.hero, .section { border-radius: 26rpx; box-shadow: 0 16rpx 42rpx rgba(91,47,36,0.08); }
.hero { padding: 42rpx 32rpx; background: linear-gradient(135deg, #6f241f, #c43d3d); color: #fff8e8; }
.eyebrow { color: #ffe4b5; font-size: 24rpx; font-weight: 900; }
.title { display: block; margin-top: 16rpx; font-size: 44rpx; line-height: 1.22; font-weight: 950; }
.copy { display: block; margin-top: 16rpx; color: rgba(255,248,232,0.86); font-size: 27rpx; line-height: 1.58; }
.section { margin-top: 24rpx; padding: 28rpx; background: #fff; }
.section-title { display: block; margin-bottom: 18rpx; color: #5b2f24; font-size: 32rpx; font-weight: 950; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14rpx; }
.card { min-height: 98rpx; display: flex; align-items: center; justify-content: center; border-radius: 16rpx; background: #fff3ed; color: #a83c31; font-size: 25rpx; font-weight: 900; }
.input, .textarea { width: 100%; box-sizing: border-box; margin-top: 16rpx; padding: 22rpx; border-radius: 16rpx; background: #f9f3eb; color: #2d241c; font-size: 26rpx; }
.textarea { min-height: 170rpx; }
.submit { margin-top: 22rpx; height: 86rpx; border-radius: 999px; background: #c43d3d; color: #fff; font-size: 28rpx; font-weight: 950; }
</style>
