<template>
  <view class="aid-page">
    <view class="hero"><text class="eyebrow">{{ config.eyebrow }}</text><text class="title">{{ config.title }}</text><text class="copy">{{ config.copy }}</text></view>
    <view class="tabs"><view class="tab" :class="{ active: active === 'personal' }" @click="active = 'personal'">个人帮扶</view><view class="tab" :class="{ active: active === 'project' }" @click="active = 'project'">项目方申请</view></view>

    <view class="section">
      <text class="section-title">{{ active === 'personal' ? config.formTitle : '公益项目方申请' }}</text>
      <input v-model="form.applicantName" class="input" :placeholder="active === 'personal' ? '申请人姓名' : '项目联系人'" />
      <input v-model="form.phone" class="input" placeholder="登录手机号" type="number" maxlength="11" />
      <input v-model="form.city" class="input" placeholder="所在城市/服务区域" />
      <input v-model="form.wechat" class="input" placeholder="微信号" />
      <input v-if="active === 'project'" v-model="form.organizationName" class="input" placeholder="机构/项目名称" />
      <input v-model="form.identityNo" class="input" placeholder="证件号码（选填，加密保存）" />
      <input v-model="form.address" class="input" placeholder="联系地址（选填，加密保存）" />
      <input v-model="form.emergencyContact" class="input" placeholder="紧急联系人（选填，加密保存）" />
      <input v-model="form.supportCategory" class="input" placeholder="帮扶方向，例如活动名额/生活支持/项目资源" />
      <textarea v-model="form.requestedSupport" class="textarea short" placeholder="请说明希望获得的具体支持" />
      <textarea v-model="form.situation" class="textarea" placeholder="请说明当前情况、服务对象、已有资源和需要核实的信息" />
      <view class="material-head"><text>申请材料</text><button class="small-button" :disabled="choosingFiles || submitting" @click="chooseMaterials">{{ choosingFiles ? "选择中..." : "选择文件" }}</button></view>
      <view v-for="(item, index) in files" :key="`${item.path}-${index}`" class="file-row"><text>{{ item.name }}</text><text class="remove" @click="files.splice(index, 1)">移除</text></view>
      <label class="consent"><checkbox :checked="form.consentAccepted" @click="form.consentAccepted = !form.consentAccepted" /><text>同意对本次申请所需的敏感信息和材料进行加密存储、授权审核与审计留痕。</text></label>
      <view v-if="submitError" class="inline-error">{{ submitError }}</view>
      <button class="submit" :loading="submitting" :disabled="submitting || choosingFiles || (!!applicationsError && !pendingApplication)" @click="submit">{{ pendingApplication ? "继续上传剩余材料" : config.submitText }}</button>
    </view>

    <view v-if="applicationsLoading" class="section state-section">申请记录加载中...</view>
    <view v-else-if="applicationsError" class="section state-section error-state"><text>{{ applicationsError }}</text><button class="small-button" @click="loadApplications">重新加载</button></view>
    <view v-else-if="applications.length" class="section">
      <text class="section-title">我的申请</text>
      <view v-for="item in applications" :key="item.id" class="application-row">
        <view><text class="application-no">{{ item.applicationNo }}</text><text class="meta">{{ statusText[item.status] || item.status }} · {{ item.supportCategory }} · 材料 {{ item.materialCount }} 份</text></view>
        <template v-if="item.status === 'supplement_required'">
          <text class="request">补件要求：{{ item.supplementRequest }}</text>
          <textarea v-model="supplements[item.id]" class="textarea short" placeholder="填写补件说明，材料可在重新提交前上传" />
          <view class="row-actions"><button class="small-button" :disabled="supplementUploading !== null || supplementSubmitting !== null" @click="chooseSupplementMaterial(item)">{{ supplementUploading === item.id ? "上传中..." : "上传补件" }}</button><button class="small-button primary" :disabled="supplementSubmitting !== null || supplementUploading !== null" @click="submitSupplement(item)">{{ supplementSubmitting === item.id ? "提交中..." : "提交补件" }}</button></view>
        </template>
        <text v-if="item.reviewRemark" class="request">审核意见：{{ item.reviewRemark }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { getCurrentRouteWithQuery, getUserToken, request, uploadAidApplicationMaterial } from "../../api";
import { useEntryPageConfig } from "../../entry-pages";
import { createTenantLoadGuard } from "../../tenant-load-guard";
import { guardCurrentPageFeature, loadFeatureGates } from "../../feature-gates";

const active = ref<"personal" | "project">("personal");
const submitting = ref(false);
const choosingFiles = ref(false);
const submitError = ref("");
const pendingApplication = ref<any>(null);
const files = ref<Array<{ path: string; name: string }>>([]);
const applications = ref<any[]>([]);
const applicationsLoading = ref(false);
const applicationsError = ref("");
const supplements = reactive<Record<number, string>>({});
const supplementUploading = ref<number | null>(null);
const supplementSubmitting = ref<number | null>(null);
const businessKeys = new Map<string, string>();
const form = reactive({ applicantName: "", phone: "", city: "", wechat: "", organizationName: "", identityNo: "", address: "", emergencyContact: "", supportCategory: "", requestedSupport: "", situation: "", consentAccepted: false });
const { config, load } = useEntryPageConfig("aidApply");
const applicationsLoadGuard = createTenantLoadGuard();
const statusText: Record<string, string> = { submitted: "已提交", supplement_required: "待补件", pending_review: "待审核", approved: "已批准", rejected: "已拒绝", closed: "已关闭" };

watch(active, () => { form.organizationName = ""; });
function businessKey(action: string) {
  const existing = businessKeys.get(action);
  if (existing) return existing;
  const created = `aid:${action}:${Date.now()}:${Math.random().toString(16).slice(2)}`;
  businessKeys.set(action, created);
  return created;
}
function validate() {
  if (!getUserToken()) return "请先登录后提交援助申请";
  if (!form.applicantName.trim()) return "请填写申请人姓名";
  if (!/^1\d{10}$/.test(form.phone.trim())) return "请填写正确手机号";
  if (!form.city.trim() || !form.wechat.trim() || !form.supportCategory.trim()) return "请填写城市、微信和帮扶方向";
  if (!form.requestedSupport.trim() || !form.situation.trim()) return "请填写申请需求和情况说明";
  if (!form.consentAccepted) return "请同意敏感信息处理授权";
  return "";
}

function goLogin() { uni.navigateTo({ url: `/pages/user/login?redirect=${encodeURIComponent(getCurrentRouteWithQuery())}` }); }
function chooseFiles(): Promise<Array<{ path: string; name: string }>> {
  return new Promise((resolve, reject) => uni.chooseMessageFile({ count: 5, type: "file", extension: ["jpg", "jpeg", "png", "webp", "pdf"], success: (result: any) => resolve((result.tempFiles || []).map((item: any) => ({ path: item.path, name: item.name || "申请材料" }))), fail: reject }));
}
async function chooseMaterials() {
  if (choosingFiles.value || submitting.value) return;
  choosingFiles.value = true;
  try {
    const rows = await chooseFiles();
    files.value = [...files.value, ...rows].slice(0, 10);
  } catch (error: any) {
    if (!String(error?.errMsg || "").includes("cancel")) uni.showToast({ title: error?.message || "选择材料失败", icon: "none" });
  } finally {
    choosingFiles.value = false;
  }
}
async function chooseSupplementMaterial(item: any) {
  if (supplementUploading.value !== null || supplementSubmitting.value !== null) return;
  supplementUploading.value = item.id;
  try {
    const rows = await chooseFiles();
    for (const file of rows) await uploadAidApplicationMaterial(item.id, file.path, "supplement");
    await loadApplications();
    uni.showToast({ title: "补件材料已加密上传", icon: "none" });
  } catch (error: any) {
    if (!String(error?.errMsg || "").includes("cancel")) uni.showToast({ title: error.message || "补件材料上传失败", icon: "none" });
  } finally {
    supplementUploading.value = null;
  }
}

async function submit() {
  if (submitting.value || choosingFiles.value) return;
  const message = validate();
  if (message) { if (!getUserToken()) goLogin(); else uni.showToast({ title: message, icon: "none" }); return; }
  if (applicationsError.value && !pendingApplication.value) return uni.showToast({ title: "请先重新加载申请记录", icon: "none" });
  submitting.value = true;
  submitError.value = "";
  try {
    const application = pendingApplication.value || await request<any>("/public/aid/applications", { method: "POST", data: { ...form, type: active.value, consentVersion: "aid-privacy-v1", businessKey: businessKey("submit") } });
    pendingApplication.value = application;
    while (files.value.length) {
      await uploadAidApplicationMaterial(application.id, files.value[0].path);
      files.value.splice(0, 1);
    }
    uni.showModal({ title: "已提交", content: `申请编号：${application.applicationNo}。资料已加密保存，可在本页查看进度。`, showCancel: false });
    await loadApplications();
    businessKeys.delete("submit");
    pendingApplication.value = null;
  } catch (error: any) {
    const created = Boolean(pendingApplication.value);
    submitError.value = created ? `申请已创建，仍有 ${files.value.length} 份材料待上传。请点击继续上传。` : (error.message || "提交失败");
    uni.showToast({ title: created ? "部分材料待重传" : submitError.value, icon: "none" });
  }
  finally { submitting.value = false; }
}

async function submitSupplement(item: any) {
  if (supplementSubmitting.value) return;
  const content = String(supplements[item.id] || "").trim();
  if (!content) return uni.showToast({ title: "请填写补件说明", icon: "none" });
  supplementSubmitting.value = item.id;
  try {
    await request(`/public/me/aid-applications/${item.id}/supplement`, { method: "POST", data: { content, businessKey: businessKey(`supplement:${item.id}`) } });
    supplements[item.id] = "";
    await loadApplications();
    businessKeys.delete(`supplement:${item.id}`);
    uni.showToast({ title: "补件已提交", icon: "success" });
  } catch (error: any) {
    uni.showToast({ title: error.message || "补件提交失败", icon: "none" });
  } finally {
    supplementSubmitting.value = null;
  }
}

async function loadApplications() {
  const token = applicationsLoadGuard.begin();
  applicationsLoading.value = true;
  applicationsError.value = "";
  if (!getUserToken()) {
    applications.value = [];
    applicationsLoading.value = false;
    return;
  }
  try {
    const rows = await request<any[]>("/public/me/aid-applications");
    if (applicationsLoadGuard.isCurrent(token)) applications.value = rows;
  } catch (error: any) {
    if (!applicationsLoadGuard.isCurrent(token)) return;
    applications.value = [];
    applicationsError.value = error?.message || "申请记录加载失败，请稍后重试";
  } finally {
    if (applicationsLoadGuard.isCurrent(token)) applicationsLoading.value = false;
  }
}
onShow(async () => {
  await loadFeatureGates(true);
  if (!guardCurrentPageFeature()) return;
  void load();
  form.phone ||= String(uni.getStorageSync("user_phone") || "");
  await loadApplications();
});
</script>

<style scoped>
.aid-page { min-height: 100vh; padding: 28rpx 24rpx 150rpx; background: #eff7f1; color: #17261d; }
.hero, .section { border-radius: 20rpx; box-shadow: 0 16rpx 42rpx rgba(35,91,55,0.08); }
.hero { padding: 42rpx 32rpx; background: #24513a; color: #f5fff4; }
.eyebrow { color: #d8f3c8; font-size: 24rpx; font-weight: 900; }.title { display: block; margin-top: 16rpx; font-size: 42rpx; line-height: 1.24; font-weight: 950; }.copy { display: block; margin-top: 16rpx; color: rgba(245,255,244,0.88); font-size: 27rpx; line-height: 1.58; }
.tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; margin-top: 24rpx; }.tab { height: 76rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #fff; color: #5b8c5a; font-size: 26rpx; font-weight: 900; }.tab.active { background: #5b8c5a; color: #fff; }
.section { margin-top: 24rpx; padding: 28rpx; background: #fff; }.section-title { display: block; margin-bottom: 18rpx; color: #24513a; font-size: 32rpx; font-weight: 950; }
.input, .textarea { width: 100%; box-sizing: border-box; margin-top: 16rpx; padding: 22rpx; border-radius: 12rpx; background: #f2f8f2; color: #17261d; font-size: 26rpx; }.textarea { min-height: 190rpx; }.textarea.short { min-height: 120rpx; }
.material-head, .file-row, .row-actions { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; margin-top: 18rpx; }.file-row { padding: 14rpx 0; border-bottom: 1rpx solid #e4eee6; }.remove { color: #b42318; }
.small-button { width: auto; min-width: 150rpx; height: 64rpx; margin: 0; padding: 0 20rpx; border-radius: 999px; background: #e8f4ea; color: #24513a; font-size: 24rpx; }.small-button.primary { background: #24513a; color: #fff; }
.state-section { display:flex; align-items:center; justify-content:space-between; gap:16rpx; color:#617369; font-size:25rpx; }.error-state, .inline-error { color:#b42318; }.inline-error { margin-top:18rpx; padding:16rpx; border-radius:8px; background:#fff1f0; font-size:24rpx; line-height:1.5; }
.consent { display: flex; align-items: flex-start; gap: 12rpx; margin-top: 22rpx; color: #50665a; font-size: 24rpx; line-height: 1.55; }.submit { margin-top: 22rpx; height: 86rpx; border-radius: 999px; background: #5b8c5a; color: #fff; font-size: 28rpx; font-weight: 950; }
.application-row { padding: 22rpx 0; border-top: 1rpx solid #e4eee6; }.application-row:first-of-type { border-top: 0; }.application-no, .meta, .request { display: block; }.application-no { font-size: 27rpx; font-weight: 900; }.meta, .request { margin-top: 8rpx; color: #617369; font-size: 24rpx; line-height: 1.5; }
</style>
