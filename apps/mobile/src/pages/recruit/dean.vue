<template>
  <view class="apply-page">
    <view v-if="loading" class="state-card" aria-live="polite">页面加载中...</view>
    <view v-else-if="loadError" class="state-card error-state" role="alert" aria-live="assertive">
      <text>{{ loadError }}</text>
      <button class="state-retry" :disabled="loading" @click="refreshPage">重新加载</button>
    </view>
    <template v-else>
      <view class="hero dean">
      <text class="eyebrow">{{ config.eyebrow }}</text>
      <text class="title">{{ config.title }}</text>
      <text class="copy">{{ config.copy }}</text>
    </view>

    <view class="section">
      <text class="section-title">{{ config.sectionTitle }}</text>
      <view v-for="item in config.items" :key="item" class="pill">{{ item }}</view>
    </view>

      <view class="section form-section">
      <text class="section-title">{{ config.formTitle }}</text>
      <input v-model="form.name" class="input" placeholder="姓名" :disabled="submitted" />
      <input v-model="form.phone" class="input" placeholder="手机号" type="number" maxlength="11" :disabled="submitted" />
      <input v-model="form.city" class="input" placeholder="计划运营城市/区域" :disabled="submitted" />
      <input v-model="form.wechat" class="input" placeholder="微信号" :disabled="submitted" />
      <input v-model="form.expertise" class="input" placeholder="你的资源优势，例如场地/老师/社群/运营" :disabled="submitted" />
      <textarea v-model="form.experience" class="textarea" placeholder="请介绍你的本地资源、过往运营经验、想开书院的原因" :disabled="submitted" />
      <view v-if="submitError" class="submit-error" role="alert" aria-live="assertive">{{ submitError }}</view>
      <button class="submit" :loading="submitting" :disabled="submitting || submitted" @click="submit">{{ submitted ? "已提交，等待联系" : config.submitText }}</button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { request } from "../../api";
import { useEntryPageConfig } from "../../entry-pages";
import { guardCurrentPageFeature, loadFeatureGates } from "../../feature-gates";
import { reviewSafeText } from "../../review-safe-text";

const submitting = ref(false);
const submitted = ref(false);
const submitError = ref("");
const submitBusinessKey = ref("");
const form = reactive({ name: "", phone: "", city: "", wechat: "", expertise: "", experience: "" });
const { config, loading, error: loadError, load } = useEntryPageConfig("deanRecruit");

async function refreshPage() {
  await loadFeatureGates(true);
  if (!guardCurrentPageFeature()) return;
  await load();
}

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
  if (submitting.value || submitted.value) return;
  const message = validate();
  if (message) return uni.showToast({ title: message, icon: "none" });
  submitting.value = true;
  submitError.value = "";
  try {
    if (!submitBusinessKey.value) submitBusinessKey.value = `ecosystem:partner:${Date.now()}:${Math.random().toString(16).slice(2)}`;
    await request("/public/ambassador/applications", { method: "POST", data: { ...form, kind: "partner", source: "dean_recruit", cooperationIntent: "城市伙伴/书院运营", businessKey: submitBusinessKey.value } });
    submitted.value = true;
    uni.showModal({ title: "已提交", content: config.successMessage || "院长招募申请已进入后台，我们会尽快联系你。", showCancel: false });
  } catch (error: any) {
    submitError.value = reviewSafeText(error?.message || "提交失败");
    uni.showToast({ title: submitError.value, icon: "none" });
  } finally {
    submitting.value = false;
  }
}

onShow(refreshPage);
</script>

<style scoped>
.apply-page { min-height: 100vh; padding: 28rpx 24rpx 150rpx; background: #f6efe5; color: #2d241c; }
.state-card { padding: 32rpx; border-radius: 8rpx; background: #fff; color: #5f5549; font-size: 28rpx; line-height: 1.6; }
.error-state { display: grid; gap: 20rpx; color: #b42318; background: #fff1f0; }
.state-retry { width: 100%; height: 78rpx; border-radius: 6rpx; background: #8b5a2b; color: #fff; font-size: 27rpx; }
.submit-error { margin-top: 18rpx; padding: 16rpx; border-radius: 8rpx; background: #fff1f0; color: #b42318; font-size: 24rpx; line-height: 1.5; }
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
