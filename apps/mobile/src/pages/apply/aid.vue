<template>
  <view class="aid-page">
    <view class="hero">
      <text class="eyebrow">帮扶申请</text>
      <text class="title">让需要帮助的人和愿意做事的项目，被看见、被连接、被持续服务。</text>
      <text class="copy">个人可申请学习帮扶/公益名额，项目方可提交公益项目合作需求。</text>
    </view>

    <view class="tabs">
      <view class="tab" :class="{ active: active === 'personal' }" @click="active = 'personal'">个人帮扶</view>
      <view class="tab" :class="{ active: active === 'project' }" @click="active = 'project'">项目方申请</view>
    </view>

    <view class="section">
      <text class="section-title">{{ active === 'personal' ? '个人帮扶申请' : '公益项目方申请' }}</text>
      <input v-model="form.name" class="input" :placeholder="active === 'personal' ? '姓名' : '项目联系人'" />
      <input v-model="form.phone" class="input" placeholder="手机号" type="number" maxlength="11" />
      <input v-model="form.city" class="input" placeholder="所在城市/服务区域" />
      <input v-model="form.wechat" class="input" placeholder="微信号" />
      <input v-model="form.expertise" class="input" :placeholder="active === 'personal' ? '希望获得的帮扶，例如课程名额/活动名额' : '项目名称/帮扶方向'" />
      <textarea v-model="form.experience" class="textarea" :placeholder="active === 'personal' ? '请说明你的情况、需要的帮助和可参与时间' : '请说明项目背景、服务对象、资金/资源需求和联系方式'" />
      <button class="submit" :loading="submitting" :disabled="submitting || submitted" @click="submit">{{ submitted ? "已提交，等待联系" : "提交帮扶申请" }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { request } from "../../api";

const active = ref<"personal" | "project">("personal");
const submitting = ref(false);
const submitted = ref(false);
const form = reactive({ name: "", phone: "", city: "", wechat: "", expertise: "", experience: "" });

watch(active, () => {
  submitted.value = false;
});

function validate() {
  if (!form.name.trim()) return "请填写名称";
  if (!/^1\d{10}$/.test(form.phone.trim())) return "请填写正确手机号";
  if (!form.city.trim()) return "请填写城市/区域";
  if (!form.wechat.trim()) return "请填写微信号";
  if (!form.expertise.trim()) return "请填写帮扶方向";
  if (!form.experience.trim()) return "请填写申请说明";
  return "";
}

async function submit() {
  const message = validate();
  if (message) return uni.showToast({ title: message, icon: "none" });
  submitting.value = true;
  try {
    await request("/public/ambassador/applications", { method: "POST", data: { ...form, source: active.value === "personal" ? "aid_personal" : "aid_project" } });
    submitted.value = true;
    uni.showModal({ title: "已提交", content: "帮扶申请已进入后台，我们会尽快联系你核实信息。", showCancel: false });
  } catch (error: any) {
    uni.showToast({ title: error.message || "提交失败", icon: "none" });
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.aid-page { min-height: 100vh; padding: 28rpx 24rpx 150rpx; background: #eff7f1; color: #17261d; }
.hero, .section { border-radius: 26rpx; box-shadow: 0 16rpx 42rpx rgba(35,91,55,0.08); }
.hero { padding: 42rpx 32rpx; background: linear-gradient(135deg, #24513a, #5b8c5a); color: #f5fff4; }
.eyebrow { color: #d8f3c8; font-size: 24rpx; font-weight: 900; }
.title { display: block; margin-top: 16rpx; font-size: 42rpx; line-height: 1.24; font-weight: 950; }
.copy { display: block; margin-top: 16rpx; color: rgba(245,255,244,0.88); font-size: 27rpx; line-height: 1.58; }
.tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; margin-top: 24rpx; }
.tab { height: 76rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #fff; color: #5b8c5a; font-size: 26rpx; font-weight: 900; }
.tab.active { background: #5b8c5a; color: #fff; }
.section { margin-top: 24rpx; padding: 28rpx; background: #fff; }
.section-title { display: block; margin-bottom: 18rpx; color: #24513a; font-size: 32rpx; font-weight: 950; }
.input, .textarea { width: 100%; box-sizing: border-box; margin-top: 16rpx; padding: 22rpx; border-radius: 16rpx; background: #f2f8f2; color: #17261d; font-size: 26rpx; }
.textarea { min-height: 190rpx; }
.submit { margin-top: 22rpx; height: 86rpx; border-radius: 999px; background: #5b8c5a; color: #fff; font-size: 28rpx; font-weight: 950; }
</style>
