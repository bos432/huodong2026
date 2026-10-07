<template>
  <view class="apply-page">
    <view class="hero">
      <text class="eyebrow">{{ organizerMode ? "慢π主理人招募" : config.eyebrow }}</text>
      <text class="title">{{ organizerMode ? "申请成为主理人" : config.title }}</text>
      <text class="copy">{{ pageCopy.copy }}</text>
    </view>

    <view class="section">
      <text class="section-title">{{ pageCopy.sectionTitle }}</text>
      <view class="grid">
        <view v-for="item in pageCopy.items" :key="item" class="card">{{ item }}</view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">{{ organizerMode ? "提交主理人资料" : config.formTitle }}</text>
      <input v-model="form.name" class="input" placeholder="姓名" />
      <input v-model="form.phone" class="input" placeholder="手机号" type="number" maxlength="11" />
      <input v-model="form.city" class="input" placeholder="所在城市" />
      <input v-model="form.wechat" class="input" placeholder="微信号" />
      <input v-model="form.expertise" class="input" placeholder="擅长领域，例如书法/亲子沟通/国学/健康" />
      <textarea v-model="form.experience" class="textarea" placeholder="请介绍你的经验、活动方向或可提供的服务" />
      <view v-if="submitError" class="submit-error">{{ submitError }}</view>
      <button class="submit" :loading="submitting" :disabled="submitting || submitted" @click="submit">{{ submitted ? "已提交，等待审核" : (organizerMode ? "提交主理人申请" : config.submitText) }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { request } from "../../api";
import { useEntryPageConfig } from "../../entry-pages";
import { guardCurrentPageFeature, loadFeatureGates } from "../../feature-gates";

const submitting = ref(false);
const submitted = ref(false);
const submitError = ref("");
const submitBusinessKey = ref("");
const organizerMode = ref(false);
const form = reactive({ name: "", phone: "", city: "", wechat: "", expertise: "", experience: "" });
const { config, load } = useEntryPageConfig("ambassadorApply");
const organizerCopy = {
  copy: "如果你愿意把一件事认真做好，慢π为你提供活动创建、报名管理和参与者服务的工作台。",
  sectionTitle: "主理人可以做什么",
  items: ["发起真实活动", "管理报名与签到", "沉淀参与者反馈", "持续经营活动方向", "查看履约记录", "获得运营支持"],
  successMessage: "主理人申请已提交，审核通过后即可进入主理人工作台。"
};
const pageCopy = computed(() => organizerMode.value ? organizerCopy : config);

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
  if (submitting.value || submitted.value) return;
  const message = validate();
  if (message) return uni.showToast({ title: message, icon: "none" });
  submitting.value = true;
  submitError.value = "";
  try {
    if (!submitBusinessKey.value) submitBusinessKey.value = `ecosystem:${organizerMode.value ? "host" : "ambassador"}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
    await request("/public/ambassador/applications", { method: "POST", data: { ...form, kind: organizerMode.value ? "partner" : "ambassador", source: organizerMode.value ? "host_apply" : "ambassador_apply", businessKey: submitBusinessKey.value } });
    if (organizerMode.value) uni.setStorageSync("organizer_application_status", "pending");
    submitted.value = true;
    uni.showModal({ title: "已提交", content: pageCopy.value.successMessage || "申请已进入后台，请等待审核。", showCancel: false });
  } catch (error: any) {
    submitError.value = error.message || "提交失败";
    uni.showToast({ title: submitError.value, icon: "none" });
  } finally {
    submitting.value = false;
  }
}

onShow(async () => {
  await loadFeatureGates(true);
  if (!guardCurrentPageFeature()) return;
  await load();
});

onLoad((options: any) => {
  organizerMode.value = String(options?.source || "") === "host_apply";
});
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
.submit-error { margin-top:18rpx; padding:16rpx; border-radius:8px; background:#fff1f0; color:#b42318; font-size:24rpx; line-height:1.5; }
.submit { margin-top: 22rpx; height: 86rpx; border-radius: 999px; background: #c43d3d; color: #fff; font-size: 28rpx; font-weight: 950; }
</style>
