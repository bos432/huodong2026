<template>
  <view class="form-page has-custom-nav">
    <view class="form-nav"><button class="nav-back" aria-label="返回上一页" @click="goBack">返回</button><text class="nav-title">拓展资料</text><text class="nav-placeholder" /></view>
    <view class="form-head"><text class="head-title">让别人快速理解你</text><text class="head-copy">只填写愿意公开的信息。手机号、微信号等联系方式不会在广场展示。</text></view>
    <view v-if="loading" class="state" role="status" aria-live="polite">资料加载中…</view>
    <view v-else class="form-body">
      <label class="field"><text>展示名称 *</text><input v-model="form.displayName" name="displayName" aria-label="展示名称" autocomplete="off" maxlength="30" placeholder="真实姓名、昵称或职业称呼" /></label>
      <view class="field-row"><label class="field"><text>所在城市</text><input v-model="form.city" name="city" aria-label="所在城市" autocomplete="off" maxlength="80" placeholder="例如 重庆" /></label><label class="field"><text>所在行业</text><input v-model="form.industry" name="industry" aria-label="所在行业" autocomplete="off" maxlength="80" placeholder="例如 文化教育" /></label></view>
      <label class="field"><text>身份/职业</text><input v-model="form.roleTitle" name="roleTitle" aria-label="身份或职业" autocomplete="off" maxlength="100" placeholder="例如 读书会主理人" /></label>
      <label class="field"><text>自我介绍 *</text><textarea v-model="form.introduction" name="introduction" aria-label="自我介绍" maxlength="500" auto-height placeholder="介绍你的经历、擅长领域和希望建立的真实连接（10-500字）" /><text class="count">{{ form.introduction.length }}/500</text></label>
      <label class="field"><text>我能提供 *</text><textarea v-model="form.offersText" name="offers" aria-label="我能提供的资源" maxlength="300" auto-height placeholder="例如：活动场地、摄影服务、品牌策划（用逗号分隔）" /></label>
      <label class="field"><text>希望拓展 *</text><textarea v-model="form.needsText" name="needs" aria-label="希望拓展的资源" maxlength="300" auto-height placeholder="例如：读书伙伴、讲师合作、企业团建资源（用逗号分隔）" /></label>
      <view class="visibility"><view><text class="visibility-title">审核通过后公开展示</text><text class="visibility-copy">关闭后保存资料，但不会出现在拓展广场。</text></view><switch :checked="form.visible" aria-label="审核通过后公开展示" color="#08753f" @change="form.visible = $event.detail.value" /></view>
      <view v-if="existing?.reviewRemark" class="review-note">审核说明：{{ existing.reviewRemark }}</view>
      <button class="submit app-press" :disabled="submitting" :aria-busy="submitting" @click="submit">{{ submitting ? "提交中…" : "提交审核" }}</button>
      <text class="agreement">提交即表示你确认资料真实，并同意平台按社区规范进行审核。</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { ensureUser, request } from "../../api";
import { guardCurrentPageFeature, loadFeatureGates } from "../../feature-gates";

const loading = ref(true); const submitting = ref(false); const existing = ref<any>(null);
const form = reactive({ displayName: "", city: "", industry: "", roleTitle: "", introduction: "", offersText: "", needsText: "", visible: true });
onShow(async () => { await loadFeatureGates(true); if (!guardCurrentPageFeature()) return; loading.value = true; try { await ensureUser(); existing.value = await request("/public/me/social-profile"); if (existing.value) Object.assign(form, { displayName: existing.value.displayName || "", city: existing.value.city || "", industry: existing.value.industry || "", roleTitle: existing.value.roleTitle || "", introduction: existing.value.introduction || "", offersText: (existing.value.offers || []).join("、"), needsText: (existing.value.needs || []).join("、"), visible: existing.value.visible !== false }); } finally { loading.value = false; } });
function tags(text: string) { return Array.from(new Set(text.split(/[，,、\n]/).map((item) => item.trim()).filter(Boolean))).slice(0, 6); }
async function submit() { if (submitting.value) return; if (form.displayName.trim().length < 2) return uni.showToast({ title: "请填写展示名称", icon: "none" }); if (form.introduction.trim().length < 10) return uni.showToast({ title: "自我介绍至少10个字", icon: "none" }); if (!tags(form.offersText).length || !tags(form.needsText).length) return uni.showToast({ title: "请填写提供资源和拓展方向", icon: "none" }); submitting.value = true; try { const result = await request<any>("/public/me/social-profile", { method: "POST", data: { displayName: form.displayName.trim(), city: form.city.trim(), industry: form.industry.trim(), roleTitle: form.roleTitle.trim(), introduction: form.introduction.trim(), offers: tags(form.offersText), needs: tags(form.needsText), visible: form.visible } }); uni.showModal({ title: "提交成功", content: result.message || "资料已进入审核", showCancel: false, success: () => uni.navigateBack() }); } catch (e: any) { uni.showToast({ title: e?.message || "提交失败", icon: "none" }); } finally { submitting.value = false; } }
function goBack() { uni.navigateBack(); }
</script>

<style scoped>
.form-page{min-height:100vh;background:#f5f7f6;color:#17271d;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif}.form-nav{height:92rpx;display:grid;grid-template-columns:100rpx 1fr 100rpx;align-items:center;padding:0 28rpx;background:#fff}.nav-back{width:auto;min-height:64rpx;margin:0;padding:0;border:0;background:transparent;color:#08753f;font-size:26rpx;line-height:64rpx;text-align:left}.nav-back::after{border:0}.nav-title{text-align:center;font-size:30rpx;font-weight:900}.form-head{padding:34rpx 28rpx 28rpx;background:#153d2a;color:#fff}.head-title,.head-copy{display:block}.head-title{font-size:38rpx;font-weight:950}.head-copy{margin-top:12rpx;color:rgba(255,255,255,.76);font-size:24rpx;line-height:1.6}.form-body{display:grid;gap:24rpx;padding:28rpx}.field{position:relative;display:grid;gap:11rpx;min-width:0}.field>text:first-child{font-size:25rpx;font-weight:850}.field input,.field textarea{width:100%;box-sizing:border-box;border:1rpx solid #dbe4df;border-radius:8rpx;background:#fff;color:#27382e;font-size:25rpx}.field input{height:82rpx;padding:0 20rpx}.field textarea{min-height:138rpx;padding:18rpx 20rpx;line-height:1.55}.field-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18rpx}.count{position:absolute;right:14rpx;bottom:12rpx;color:#96a19b;font-size:20rpx}.visibility{display:flex;align-items:center;justify-content:space-between;gap:18rpx;padding:22rpx;border:1rpx solid #dfe7e2;border-radius:8rpx;background:#fff}.visibility-title,.visibility-copy{display:block}.visibility-title{font-size:25rpx;font-weight:850}.visibility-copy{margin-top:6rpx;color:#7a867f;font-size:21rpx;line-height:1.45}.review-note{padding:18rpx;border-radius:8rpx;background:#fff4e5;color:#8d5800;font-size:23rpx;line-height:1.55}.submit{width:100%;min-height:86rpx;margin:4rpx 0 0;border:0;border-radius:8rpx;background:#153d2a;color:#fff;font-size:28rpx;font-weight:900}.submit::after{border:0}.submit[disabled]{opacity:.6}.agreement{padding-bottom:36rpx;text-align:center;color:#8b9790;font-size:21rpx;line-height:1.5}.state{margin:28rpx;padding:28rpx;border-radius:8rpx;background:#fff;color:#718078}@media(min-width:900px){.form-page{max-width:760px;margin:0 auto}}
</style>
