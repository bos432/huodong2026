<template>
  <view class="merchant-apply-page">
    <view class="intro-band">
      <text class="intro-title">商户入驻</text>
      <text class="intro-copy">提交经营主体、联系人和资质材料。审核通过后，平台将为你创建待开通店铺。</text>
    </view>

    <view v-if="pageLoading" class="page-state">申请记录加载中...</view>
    <view v-else-if="loadError" class="page-state error-state">
      <text>{{ loadError }}</text>
      <button class="retry-button" @click="loadPage">重新加载</button>
    </view>

    <template v-else>
    <view v-if="profileWarning" class="inline-warning">{{ profileWarning }}</view>
    <view v-if="applications.length" class="section">
      <view class="section-heading">
        <text class="section-title">申请记录</text>
        <text class="section-meta">{{ applications.length }} 条</text>
      </view>
      <view v-for="item in applications" :key="item.id" class="application-row">
        <view class="application-main">
          <text class="application-name">{{ item.desiredName }}</text>
          <text class="application-time">提交于 {{ formatTime(item.submittedAt || item.createdAt) }}</text>
          <text v-if="item.reviewRemark" class="review-remark">审核意见：{{ item.reviewRemark }}</text>
        </view>
        <text class="status" :class="`status-${item.status}`">{{ statusText(item.status) }}</text>
      </view>
    </view>

    <view v-if="!hasPendingApplication" class="section form-section">
      <text class="section-title">主体信息</text>
      <view class="field"><text class="label">店铺名称</text><input v-model="form.desiredName" class="input" maxlength="120" placeholder="计划使用的店铺名称" /></view>
      <view class="field"><text class="label">企业或主体名称</text><input v-model="form.legalName" class="input" maxlength="180" placeholder="与营业执照一致" /></view>
      <view class="field"><text class="label">统一社会信用代码</text><input v-model="form.unifiedSocialCreditCode" class="input" maxlength="20" placeholder="15 至 20 位代码" @input="normalizeCreditCode" /></view>
      <view class="field"><text class="label">法定代表人</text><input v-model="form.legalRepresentative" class="input" maxlength="80" placeholder="与营业执照一致" /></view>
      <view class="field"><text class="label">经营区域</text><input v-model="form.region" class="input" maxlength="120" placeholder="省 / 市 / 区" /></view>

      <text class="section-title subsection-title">联系信息</text>
      <view class="field"><text class="label">联系人</text><input v-model="form.contactName" class="input" maxlength="100" placeholder="负责入驻沟通的人员" /></view>
      <view class="field"><text class="label">联系电话</text><input v-model="form.contactPhone" class="input" type="number" maxlength="11" placeholder="手机号" /></view>

      <text class="section-title subsection-title">资质材料</text>
      <view class="upload-row" @click="chooseBusinessLicense">
        <view class="upload-copy">
          <text class="upload-title">营业执照</text>
          <text class="upload-hint">支持 JPG、PNG、WebP，单个文件不超过 10MB</text>
        </view>
        <text class="upload-action">{{ form.businessLicenseUrl ? "重新上传" : "选择文件" }}</text>
      </view>
      <image v-if="form.businessLicenseUrl" class="license-preview" :src="form.businessLicenseUrl" mode="aspectFill" />

      <view v-for="(file, index) in form.qualificationFiles" :key="`${file.url}-${index}`" class="qualification-row">
        <view><text class="qualification-name">{{ file.name }}</text><text class="qualification-type">{{ qualificationTypeText(file.type) }}</text></view>
        <text class="remove-action" @click="removeQualification(index)">移除</text>
      </view>
      <button class="secondary-button" :disabled="uploading" @click="chooseQualification">添加补充资质</button>

      <view class="field"><text class="label">申请说明</text><textarea v-model="form.applyRemark" class="textarea" maxlength="1000" placeholder="可填写经营范围、品牌情况或其他需要说明的信息" /></view>
      <button class="submit-button" :loading="submitting" :disabled="submitting || uploading" @click="submit">提交入驻申请</button>
    </view>

    <view v-else class="pending-panel">
      <text class="pending-title">申请正在审核</text>
      <text class="pending-copy">当前不能重复提交。审核结果会在本页更新，请留意平台通知。</text>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { fetchMyProfile, getUserToken, request, uploadMallMerchantApplicationFile, withTenantCode } from "../../api";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { guardCurrentPageFeature, loadFeatureGates } from "../../feature-gates";
import { formatShanghaiDateTime } from "../../shanghai-date";

type QualificationFile = { type: string; name: string; url: string; number?: string; validUntil?: string };

const applications = ref<any[]>([]);
const submitting = ref(false);
const uploading = ref(false);
const pageLoading = ref(true);
const loadError = ref("");
const profileWarning = ref("");
const loadGuard = createTenantLoadGuard();
const form = reactive({
  desiredName: "",
  legalName: "",
  unifiedSocialCreditCode: "",
  legalRepresentative: "",
  contactName: "",
  contactPhone: "",
  region: "",
  businessLicenseUrl: "",
  qualificationFiles: [] as QualificationFile[],
  applyRemark: ""
});
const hasPendingApplication = computed(() => applications.value.some((item) => item.status === "pending"));

function statusText(status: string) {
  return ({ pending: "审核中", approved: "已通过", rejected: "已驳回", withdrawn: "已撤回", draft: "草稿" } as Record<string, string>)[status] || status;
}

function qualificationTypeText(type: string) {
  return ({ food_license: "食品经营许可", brand_authorization: "品牌授权", industry_license: "行业许可", other: "其他资质" } as Record<string, string>)[type] || "补充资质";
}

function formatTime(value: unknown) {
  return formatShanghaiDateTime(value);
}

function normalizeCreditCode(event: any) {
  form.unifiedSocialCreditCode = String(event?.detail?.value || "").toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 20);
}

function chooseImage(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      success: (result) => resolve(result.tempFilePaths?.[0] || ""),
      fail: reject
    });
  });
}

async function uploadSelectedImage() {
  const path = await chooseImage();
  if (!path) return null;
  return uploadMallMerchantApplicationFile(path);
}

async function chooseBusinessLicense() {
  if (uploading.value) return;
  uploading.value = true;
  try {
    const uploaded = await uploadSelectedImage();
    if (uploaded?.url) form.businessLicenseUrl = uploaded.url;
  } catch (error: any) {
    if (!String(error?.errMsg || "").includes("cancel")) uni.showToast({ title: error?.message || "营业执照上传失败", icon: "none" });
  } finally {
    uploading.value = false;
  }
}

async function chooseQualification() {
  if (uploading.value || form.qualificationFiles.length >= 20) return;
  uploading.value = true;
  try {
    const selected = await new Promise<{ type: string; label: string } | null>((resolve) => {
      const options = [
        { type: "food_license", label: "食品经营许可" },
        { type: "brand_authorization", label: "品牌授权" },
        { type: "industry_license", label: "行业许可" },
        { type: "other", label: "其他资质" }
      ];
      uni.showActionSheet({ itemList: options.map((item) => item.label), success: (result) => resolve(options[result.tapIndex] || null), fail: () => resolve(null) });
    });
    if (!selected) return;
    const uploaded = await uploadSelectedImage();
    if (uploaded?.url) form.qualificationFiles.push({ type: selected.type, name: uploaded.originalName || selected.label, url: uploaded.url });
  } catch (error: any) {
    if (!String(error?.errMsg || "").includes("cancel")) uni.showToast({ title: error?.message || "资质上传失败", icon: "none" });
  } finally {
    uploading.value = false;
  }
}

function removeQualification(index: number) {
  form.qualificationFiles.splice(index, 1);
}

function validate() {
  if (!form.desiredName.trim()) return "请填写店铺名称";
  if (!form.legalName.trim()) return "请填写主体名称";
  if (!/^[0-9A-Z]{15,20}$/.test(form.unifiedSocialCreditCode)) return "统一社会信用代码格式不正确";
  if (!form.legalRepresentative.trim()) return "请填写法定代表人";
  if (!form.contactName.trim()) return "请填写联系人";
  if (!/^1\d{10}$/.test(form.contactPhone.trim())) return "请填写正确手机号";
  if (!form.businessLicenseUrl) return "请上传营业执照";
  return "";
}

async function submit() {
  if (submitting.value || uploading.value || pageLoading.value || loadError.value || hasPendingApplication.value) return;
  const message = validate();
  if (message) return uni.showToast({ title: message, icon: "none" });
  submitting.value = true;
  try {
    await request("/public/me/mall/merchant-applications", { method: "POST", data: { ...form, qualificationFiles: [...form.qualificationFiles] } });
    await loadPage();
    uni.showModal({ title: "提交成功", content: "入驻申请已进入审核，请留意本页状态和平台通知。", showCancel: false });
  } catch (error: any) {
    uni.showToast({ title: error?.message || "提交失败", icon: "none" });
  } finally {
    submitting.value = false;
  }
}

async function loadPage() {
  if (!getUserToken()) {
    uni.redirectTo({ url: withTenantCode(`/pages/user/login?redirect=${encodeURIComponent("/pages/mall/merchant-apply")}`) });
    return;
  }
  const token = loadGuard.begin();
  pageLoading.value = true;
  loadError.value = "";
  profileWarning.value = "";
  applications.value = [];
  try {
    const [applicationsResult, profileResult] = await Promise.allSettled([request<any[]>("/public/me/mall/merchant-applications"), fetchMyProfile()]);
    if (!loadGuard.isCurrent(token)) return;
    if (applicationsResult.status === "rejected") throw applicationsResult.reason;
    applications.value = applicationsResult.value;
    if (profileResult.status === "fulfilled") {
      form.contactName ||= String(profileResult.value?.nickname || "");
      form.contactPhone ||= String(profileResult.value?.phone || "");
    } else {
      profileWarning.value = profileResult.reason?.message || "会员资料加载失败，请手动填写联系人信息";
    }
  } catch (error: any) {
    if (!loadGuard.isCurrent(token)) return;
    applications.value = [];
    loadError.value = error?.message || "申请记录加载失败，请稍后重试";
  } finally {
    if (loadGuard.isCurrent(token)) pageLoading.value = false;
  }
}

onShow(async () => {
  await loadFeatureGates(true);
  if (!guardCurrentPageFeature()) return;
  await loadPage();
});
</script>

<style scoped>
.merchant-apply-page { min-height: 100vh; box-sizing: border-box; padding: 24rpx 24rpx 140rpx; background: #f4f6f8; color: #20252b; }
.intro-band { padding: 32rpx 28rpx; border-left: 8rpx solid #b83a32; background: #fff; }
.intro-title { display: block; font-size: 40rpx; font-weight: 800; }
.intro-copy { display: block; margin-top: 12rpx; color: #626b75; font-size: 26rpx; line-height: 1.65; }
.section, .pending-panel { margin-top: 20rpx; padding: 28rpx; border-radius: 16rpx; background: #fff; }
.page-state, .inline-warning { margin-top:20rpx; padding:24rpx; border-radius:8px; background:#fff; color:#626b75; font-size:25rpx; line-height:1.6; }.error-state { color:#b42318; }.inline-warning { background:#fff7ed; color:#9a3412; }.retry-button { width:auto; min-width:180rpx; margin:18rpx 0 0; border-radius:8px; background:#b83a32; color:#fff; font-size:24rpx; }
.section-heading { display: flex; align-items: center; justify-content: space-between; }
.section-title { display: block; font-size: 31rpx; font-weight: 800; }
.section-meta, .application-time, .qualification-type { color: #89919a; font-size: 23rpx; }
.application-row { display: flex; gap: 18rpx; align-items: flex-start; justify-content: space-between; padding: 22rpx 0; border-bottom: 1rpx solid #edf0f2; }
.application-row:last-child { border-bottom: 0; }
.application-main { min-width: 0; flex: 1; }
.application-name, .application-time, .review-remark, .qualification-name, .qualification-type { display: block; }
.application-name { font-size: 28rpx; font-weight: 700; }
.application-time { margin-top: 6rpx; }
.review-remark { margin-top: 8rpx; color: #59616a; font-size: 24rpx; line-height: 1.5; }
.status { flex: 0 0 auto; padding: 6rpx 12rpx; border-radius: 8rpx; background: #eef1f3; color: #59616a; font-size: 22rpx; }
.status-pending { background: #fff3d8; color: #8b6200; }
.status-approved { background: #e7f5ec; color: #267043; }
.status-rejected { background: #fdebea; color: #a32f2a; }
.subsection-title { margin-top: 32rpx; }
.field { margin-top: 20rpx; }
.label { display: block; margin-bottom: 10rpx; color: #434a52; font-size: 25rpx; font-weight: 700; }
.input, .textarea { width: 100%; box-sizing: border-box; border: 1rpx solid #dfe3e7; border-radius: 12rpx; background: #fbfcfd; color: #20252b; font-size: 26rpx; }
.input { height: 82rpx; padding: 0 20rpx; }
.textarea { min-height: 180rpx; padding: 20rpx; }
.upload-row, .qualification-row { display: flex; align-items: center; justify-content: space-between; gap: 18rpx; margin-top: 18rpx; padding: 20rpx; border: 1rpx solid #dfe3e7; border-radius: 12rpx; }
.upload-copy { min-width: 0; flex: 1; }
.upload-title, .upload-hint { display: block; }
.upload-title, .qualification-name { color: #30363d; font-size: 26rpx; font-weight: 700; }
.upload-hint { margin-top: 6rpx; color: #89919a; font-size: 22rpx; line-height: 1.45; }
.upload-action, .remove-action { flex: 0 0 auto; color: #b83a32; font-size: 24rpx; font-weight: 700; }
.license-preview { width: 100%; height: 320rpx; margin-top: 14rpx; border-radius: 12rpx; background: #eef1f3; }
.secondary-button, .submit-button { margin-top: 20rpx; border-radius: 12rpx; font-size: 27rpx; font-weight: 700; }
.secondary-button { border: 1rpx solid #b83a32; background: #fff; color: #b83a32; }
.submit-button { height: 88rpx; background: #b83a32; color: #fff; }
.pending-title { display: block; font-size: 30rpx; font-weight: 800; }
.pending-copy { display: block; margin-top: 10rpx; color: #626b75; font-size: 25rpx; line-height: 1.6; }
</style>
