<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow, onHide, onUnload } from "@dcloudio/uni-app";
import MobileShell from "../../components/layout/MobileShell.vue";
import IconGlyph from "../../components/ui/IconGlyph.vue";
import { mockChallenges } from "../../mock/challenge";
import { getChallengeProgress } from "../../mock/challenge-flow";
import { mobileTabRoute } from "../../mobile-tab-routes";
import { withTenantCode } from "../../api";
import type { Challenge } from "../../types/challenge";
import { experienceDraftError, type ExperienceVisibility } from "./experience-records";
import { captureExperienceAccount, createCloudExperience, updateCloudExperience, loadOwnedExperience, experienceAccountIsCurrent } from "../../slow-experience-client";
import "../../styles/tokens.css";

const challengeId = ref(0);
const challenge = computed<Challenge | null>(() => mockChallenges.find((item) => item.id === challengeId.value) || null);
const loadError = ref("");
const discovery = ref("");
const lightNote = ref("");
const feeling = ref("");
const photoPath = ref("");
const visibility = ref<ExperienceVisibility>("private");
const formError = ref("");
const submitting = ref(false);
const experienceSaved = ref(false);
const editRecordId = ref(0);
const editRevision = ref(0);
const loadingEdit = ref(false);
const editError = ref("");
const editLoginRequired = ref(false);
const serverPhotoUrl = ref("");
let editSequence = 0;
let active = true;
let accountIdentity = "";
let businessKey = "";
let saveSequence = 0;
const summary = computed(() => {
  const count = [discovery.value.trim().length >= 5, Boolean(photoPath.value) || lightNote.value.trim().length >= 5, feeling.value.trim().length >= 5].filter(Boolean).length;
  return getChallengeProgress({ completedTaskIds: Array.from({ length: count }, (_, index) => String(index)) }, 3);
});

function loadProgress() {
  const account = captureExperienceAccount();
  const identity = account ? `${account.userToken}:${account.tenantCode}` : "guest";
  if (accountIdentity && identity !== accountIdentity) {
    discovery.value = ""; lightNote.value = ""; feeling.value = ""; photoPath.value = "";
    visibility.value = "private"; formError.value = ""; experienceSaved.value = false;
    businessKey = ""; submitting.value = false; saveSequence += 1;
    editRevision.value = 0; serverPhotoUrl.value = ""; editError.value = ""; loadingEdit.value = false; editSequence += 1;
  }
  accountIdentity = identity;
  loadError.value = "";
  if (!challenge.value) {
    loadError.value = "这个演示挑战不存在或已下线";
    return;
  }
}
async function loadForEdit() {
  if (!editRecordId.value || loadingEdit.value) return;
  const account = captureExperienceAccount();
  editLoginRequired.value = !account;
  if (!account) { editError.value = "登录后才能编辑自己的手记"; return; }
  const current = ++editSequence;
  const isCurrent = () => current === editSequence && experienceAccountIsCurrent(account);
  loadingEdit.value = true; editError.value = "";
  try {
    const record = await loadOwnedExperience(account, editRecordId.value);
    if (!isCurrent()) return;
    discovery.value = record.discovery; lightNote.value = record.lightNote; feeling.value = record.feeling;
    photoPath.value = record.photoUrl || ""; serverPhotoUrl.value = record.photoUrl || "";
    visibility.value = record.visibility; editRevision.value = record.revision;
    experienceSaved.value = false; formError.value = "";
  } catch (failure) { if (isCurrent()) editError.value = failure instanceof Error ? failure.message : "手记暂时无法加载，请重试"; }
  finally { if (isCurrent()) loadingEdit.value = false; }
}
function updateDraft() {
  if (submitting.value) return;
  formError.value = "";
  experienceSaved.value = false;
  businessKey = "";
}
function choosePhoto() {
  if (submitting.value) return;
  const identity = accountIdentity;
  uni.chooseImage({ count: 1, sizeType: ["compressed"], sourceType: ["album", "camera"], success: (result) => {
    if (identity !== accountIdentity || !active) return;
    const path = result.tempFilePaths?.[0];
    if (path) { photoPath.value = path; updateDraft(); }
  }, fail: () => undefined });
}
function clearPhoto() { if (!submitting.value) { photoPath.value = ""; updateDraft(); } }
function selectVisibility(value: ExperienceVisibility) { if (!submitting.value) { visibility.value = value; updateDraft(); } }
function goToMyExperienceRecords() {
  uni.reLaunch({ url: withTenantCode(mobileTabRoute("me")) });
}
async function saveExperience() {
  if (submitting.value || experienceSaved.value || loadingEdit.value || (editRecordId.value && !editRevision.value)) return;
  const account = captureExperienceAccount();
  if (!account) {
    const target = `/pages/checkin/detail?id=${challengeId.value}${editRecordId.value ? `&recordId=${editRecordId.value}` : ""}`;
    uni.navigateTo({ url: withTenantCode(`/pages/user/login?redirect=${encodeURIComponent(target)}`) });
    return;
  }
  const draft = { discovery: discovery.value, lightNote: lightNote.value, feeling: feeling.value, photoPath: photoPath.value, visibility: visibility.value };
  formError.value = experienceDraftError(draft);
  if (formError.value || submitting.value) return;
  const sequence = ++saveSequence;
  const isCurrent = () => sequence === saveSequence && experienceAccountIsCurrent(account);
  businessKey ||= `slow-note:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  submitting.value = true;
  try {
    const saved = editRecordId.value
      ? await updateCloudExperience(account, editRecordId.value, draft, editRevision.value, draft.photoPath !== serverPhotoUrl.value ? draft.photoPath : "", Boolean(serverPhotoUrl.value && !draft.photoPath))
      : await createCloudExperience(account, draft, businessKey, draft.photoPath);
    if (!isCurrent()) return;
    businessKey = "";
    discovery.value = saved.discovery; lightNote.value = saved.lightNote; feeling.value = saved.feeling;
    if (editRecordId.value) { editRevision.value = saved.revision; serverPhotoUrl.value = saved.photoUrl || ""; photoPath.value = saved.photoUrl || ""; }
    experienceSaved.value = true;
    formError.value = "";
    if (active) uni.showToast({ title: draft.visibility === "public_review" ? "已保存，等待公开审核" : "这页慢体验已保存", icon: "success" });
  } catch (error) {
    if (isCurrent()) formError.value = error instanceof Error ? error.message : "保存失败，请稍后重试。";
  } finally { if (isCurrent()) submitting.value = false; }
}
function loginForEdit() {
  const target = `/pages/checkin/detail?id=${challengeId.value}&recordId=${editRecordId.value}`;
  uni.navigateTo({ url: withTenantCode(`/pages/user/login?redirect=${encodeURIComponent(target)}`) });
}
function goBack() { if (getCurrentPages().length > 1) uni.navigateBack(); else uni.reLaunch({ url: withTenantCode(mobileTabRoute("checkin")) }); }
function selectTab(tab: "home" | "checkin" | "messages" | "me" | "publish") {
  if (tab === "home") uni.reLaunch({ url: withTenantCode(mobileTabRoute("home")) });
  if (tab === "checkin") uni.reLaunch({ url: withTenantCode(mobileTabRoute("checkin")) });
  if (tab === "messages") uni.reLaunch({ url: withTenantCode(mobileTabRoute("messages")) });
  if (tab === "me") uni.reLaunch({ url: withTenantCode(mobileTabRoute("me")) });
}
onLoad((query) => { challengeId.value = Number(query?.id || 1); editRecordId.value = Number(query?.recordId) > 0 ? Number(query?.recordId) : 0; loadProgress(); });
onShow(() => { active = true; loadProgress(); if (editRecordId.value && !editRevision.value) void loadForEdit(); });
onHide(() => { active = false; editSequence += 1; loadingEdit.value = false; });
onUnload(() => { active = false; saveSequence += 1; editSequence += 1; });
</script>

<template>
  <MobileShell active-tab="checkin" @tab="selectTab">
    <view class="challenge-detail-page">
      <view class="challenge-nav"><view class="nav-action" role="button" tabindex="0" aria-label="返回慢体验" @click="goBack" @keyup.enter="goBack">‹</view><text>城市手记</text><view class="nav-action-placeholder" /></view>
      <view v-if="loadError" class="state-card error"><IconGlyph name="help" :size="30" label="错误" /><text class="state-title">演示挑战不可用</text><text class="state-copy">{{ loadError }}</text><view class="state-button" role="button" tabindex="0" @click="goBack">返回挑战列表</view></view>
      <view v-else-if="loadingEdit" class="state-card" role="status"><text>正在加载这页手记…</text></view>
      <view v-else-if="editError" class="state-card error" role="alert"><text class="state-title">手记暂时无法编辑</text><text class="state-copy">{{ editError }}</text><view class="state-button" role="button" tabindex="0" @click="editLoginRequired ? loginForEdit() : loadForEdit()" @keyup.enter="editLoginRequired ? loginForEdit() : loadForEdit()">{{ editLoginRequired ? '登录后继续' : '重新加载' }}</view></view>
      <template v-else-if="challenge">
        <view class="hero"><image :src="challenge.cover" mode="aspectFill" /><view class="hero-shade"><text class="demo-badge">城市观察练习</text><text class="hero-title">{{ challenge.title }}</text><text class="hero-copy">留下自己的文字和照片，不计入活动签到或参与记录。</text></view></view>
        <view class="progress-card"><view><text class="eyebrow">这页手记的完成度</text><view class="progress-value"><text>{{ summary.completed }}</text><text class="progress-total"> / {{ summary.total }} 项记录</text></view><text class="progress-hint">把观察写下来，比点一下完成更重要。</text></view><view class="progress-ring" :style="{ '--progress': `${summary.percent}%` }"><text>{{ summary.percent }}%</text></view></view>
        <view class="section experience-form"><view class="section-title"><text>{{ editRecordId ? '编辑这页城市手记' : '留下一页城市手记' }}</text><text class="section-note">{{ editRecordId && visibility === 'public_review' ? '公开内容修改后将重新审核' : '保存到你的账号 · 不等同于活动签到' }}</text></view>
<view class="experience-field"><text class="field-title">留意一处平常没注意到的细节</text><text class="field-hint">刚才有什么让你停下脚步？写一句就好。</text><textarea v-model="discovery" :disabled="submitting" maxlength="2000" aria-label="留意到的细节" placeholder="例如：老墙缝里长出了一片很小的绿叶" @input="updateDraft" /></view>
          <view class="experience-field"><text class="field-title">留住今天的一束光</text><text class="field-hint">拍一张照片，或用文字描述；不需要露脸。支持 JPG、PNG、WebP，最多 5 MB。</text><view v-if="photoPath" class="photo-preview"><image :src="photoPath" mode="aspectFill" /><view><text>照片已选择</text><text>保存时与手记一起上传</text><view class="remove-photo" role="button" tabindex="0" :aria-disabled="submitting" @click="clearPhoto" @keyup.enter="clearPhoto">移除照片</view></view></view><view v-else class="photo-picker" role="button" tabindex="0" :aria-disabled="submitting" aria-label="拍摄或选择一张照片" @click="choosePhoto" @keyup.enter="choosePhoto"><IconGlyph name="camera" :size="19" label="相机" /><text>拍摄或选择一张照片</text></view><textarea v-model="lightNote" :disabled="submitting" maxlength="2000" aria-label="今天的光线" placeholder="也可以写：今天的光落在……" @input="updateDraft" /></view>
          <view class="experience-field"><text class="field-title">写下一点此刻的感受</text><text class="field-hint">不必完整，也不用写得漂亮，留给以后看。</text><textarea v-model="feeling" :disabled="submitting" maxlength="2000" aria-label="此刻的感受" placeholder="此刻的我，想记住……" @input="updateDraft" /></view>
          <view class="visibility-picker"><text class="field-title">这页手记的可见范围</text><view class="visibility-option" :class="{ selected: visibility === 'private' }" role="radio" tabindex="0" :aria-checked="visibility === 'private'" :aria-disabled="submitting" @click="selectVisibility('private')" @keyup.enter="selectVisibility('private')"><view class="radio-dot" /><view><text>仅自己可见</text><small>保存在你的账号中，不对其他用户展示。</small></view></view><view class="visibility-option" :class="{ selected: visibility === 'public_review' }" role="radio" tabindex="0" :aria-checked="visibility === 'public_review'" :aria-disabled="submitting" @click="selectVisibility('public_review')" @keyup.enter="selectVisibility('public_review')"><view class="radio-dot" /><view><text>申请公开</text><small>审核通过后公开；可随时转回私密。</small></view></view></view>
          <text v-if="visibility === 'public_review'" class="field-hint">公开申请会按平台内容规则检查和脱敏，保存后可回看最终文字；审核通过前仅自己可见。</text>
<text v-if="formError" class="form-error" role="alert">{{ formError }}</text><view v-if="formError && editRecordId" class="state-button" role="button" tabindex="0" @click="loadForEdit" @keyup.enter="loadForEdit">重新加载最新手记</view><view class="save-experience" role="button" tabindex="0" :aria-disabled="submitting || experienceSaved" :aria-label="submitting ? '正在保存慢体验' : editRecordId ? '保存手记修改' : '保存这次慢体验'" @click="saveExperience" @keyup.enter="saveExperience">{{ submitting ? "正在保存…" : experienceSaved ? "已保存" : editRecordId ? "保存手记修改" : "保存这次慢体验" }}</view>
          <view v-if="experienceSaved" class="saved-recap" role="status"><IconGlyph name="checkin" :size="20" label="已保存" /><view><text>{{ visibility === 'public_review' ? "已保存 · 等待公开审核" : "今天，留住了一段慢时间。" }}</text><small>{{ visibility === 'public_review' ? "审核结果可在「我的」查看，通过前只有自己能回看。" : "这不是打卡成绩，是你为自己留下的一页城市手记。" }}</small><view class="saved-recap-link" role="button" tabindex="0" aria-label="查看我的慢体验记录" @click="goToMyExperienceRecords" @keyup.enter="goToMyExperienceRecords">查看我的慢体验记录</view></view></view>
        </view>
        <view class="complete-card"><IconGlyph name="book" :size="24" label="城市手记" /><view><text>保存后去「我的」回看</text><small>文字与照片保存在你的账号，不会生成真实活动记录。</small></view></view>
      </template>
    </view>
  </MobileShell>
</template>

<style scoped>
@import "../../styles/tokens.css";
.challenge-detail-page{min-height:100vh;padding-bottom:24px;background:var(--mp-bg-page);font-family:var(--mp-font-family)}.challenge-nav{display:flex;align-items:center;justify-content:space-between;height:54px;padding:0 16px;color:var(--mp-text-primary);font-size:16px;font-weight:800}.nav-action{width:32px;font-size:32px;line-height:1;text-align:left}.nav-action-placeholder{width:32px}.hero{position:relative;height:220px;overflow:hidden;margin:0 14px;border-radius:18px;background:#e8ddd0}.hero image{width:100%;height:100%;display:block}.hero-shade{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:20px;background:linear-gradient(transparent 20%,rgba(29,36,48,.78))}.demo-badge{align-self:flex-start;padding:4px 8px;border-radius:6px;background:#f5e4d5;color:#8a5946;font-size:11px}.hero-title{margin-top:8px;color:#fff;font-size:22px;font-weight:800}.hero-copy{margin-top:5px;color:rgba(255,255,255,.82);font-size:11px}.progress-card{display:flex;align-items:center;justify-content:space-between;margin:12px 14px;padding:18px;border-radius:16px;background:#fff;box-shadow:var(--mp-shadow-card)}.eyebrow{display:block;color:var(--mp-text-muted);font-size:11px}.progress-value{display:block;margin-top:7px;color:var(--mp-brand-primary);font-size:30px;font-weight:800}.progress-total{color:var(--mp-text-muted);font-size:13px;font-weight:500}.progress-ring{display:grid;place-items:center;width:62px;height:62px;border-radius:50%;background:conic-gradient(var(--mp-brand-primary) var(--progress),#eee8df 0);color:var(--mp-brand-primary);font-size:13px;font-weight:800}.progress-ring::before{position:absolute;width:48px;height:48px;border-radius:50%;background:#fff;content:""}.progress-ring text{position:relative}.section{margin:0 14px;padding:18px;border-radius:16px;background:#fff}.section-title{display:flex;align-items:baseline;justify-content:space-between;gap:10px}.section-title>text:first-child{font-size:16px;font-weight:800}.section-note{color:var(--mp-text-muted);font-size:10px}.task-row{display:flex;align-items:flex-start;gap:11px;padding:17px 0;border-bottom:1px solid var(--mp-border)}.task-row:last-child{border-bottom:0;padding-bottom:2px}.task-index{display:grid;place-items:center;flex:0 0 auto;width:28px;height:28px;border-radius:50%;background:var(--mp-brand-soft);color:var(--mp-brand-primary);font-size:13px;font-weight:800}.task-row.completed .task-index{background:var(--mp-brand-primary);color:#fff}.task-copy{min-width:0;flex:1}.task-title{display:block;color:var(--mp-text-primary);font-size:14px;font-weight:800}.task-description,.task-reward{display:block;margin-top:5px;color:var(--mp-text-muted);font-size:11px;line-height:1.5}.task-reward{color:#9b7458}.task-button{flex:0 0 auto;min-width:50px;padding:9px 8px;border-radius:9px;background:var(--mp-brand-primary);color:#fff;font-size:11px;text-align:center}.task-button.done{background:#e8eee9;color:#568069}.complete-card{display:flex;align-items:center;gap:10px;margin:12px 14px 0;padding:15px;border-radius:14px;background:#f3ede3;color:var(--mp-brand-primary)}.complete-card text,.complete-card small{display:block}.complete-card text{font-size:14px;font-weight:800}.complete-card small{margin-top:4px;color:var(--mp-text-muted);font-size:11px;line-height:1.4}.state-card{display:grid;justify-items:center;gap:9px;margin:40px 14px;padding:32px 20px;border-radius:16px;background:#fff;text-align:center}.state-card.error{color:var(--mp-brand-primary)}.state-title{color:var(--mp-text-primary);font-size:16px;font-weight:800}.state-copy{color:var(--mp-text-muted);font-size:12px}.state-button{margin-top:6px;padding:10px 16px;border-radius:9px;background:var(--mp-brand-primary);color:#fff;font-size:12px}
</style>
<style scoped>
.reset-demo{display:inline-flex;align-items:center;min-height:30px;margin-top:4px;color:var(--mp-brand-primary-dark);font-size:10px;text-decoration:underline;text-underline-offset:3px}
.progress-hint{display:block;margin-top:6px;color:var(--mp-text-muted);font-size:10px}.experience-form{display:grid;gap:18px;margin:0 14px;padding:18px;border:1px solid var(--mp-border);border-radius:16px;background:var(--mp-bg-surface)}.experience-form .section-title{display:grid;gap:4px}.experience-field{display:grid;gap:7px}.field-title{color:var(--mp-text-primary);font-size:13px;font-weight:800}.field-hint{color:var(--mp-text-muted);font-size:10px;line-height:1.4}.experience-field textarea{box-sizing:border-box;width:100%;min-height:76px;padding:11px;border:1px solid var(--mp-border);border-radius:10px;background:#fcfbf8;color:var(--mp-text-primary);font-size:12px;line-height:1.5}.photo-picker{display:flex;align-items:center;gap:8px;min-height:44px;padding:0 12px;border:1px dashed var(--mp-border);border-radius:10px;color:var(--mp-brand-primary-dark);font-size:11px}.photo-preview{display:flex;align-items:center;gap:10px}.photo-preview image{width:70px;height:70px;border-radius:9px;background:var(--mp-brand-soft)}.photo-preview>view{display:grid;gap:4px}.photo-preview text{color:var(--mp-text-primary);font-size:11px}.photo-preview text+text{color:var(--mp-text-muted);font-size:10px}.remove-photo{color:var(--mp-danger);font-size:10px}.visibility-picker{display:grid;gap:8px;padding:0;border:0}.visibility-picker>.field-title{margin-bottom:2px}.visibility-option{display:flex;align-items:center;gap:10px;min-height:54px;padding:9px 11px;border:1px solid var(--mp-border);border-radius:10px}.visibility-option.selected{border-color:var(--mp-brand-primary);background:var(--mp-brand-soft)}.radio-dot{width:16px;height:16px;flex:0 0 16px;border:1px solid var(--mp-border);border-radius:50%}.visibility-option.selected .radio-dot{border:5px solid var(--mp-brand-primary)}.visibility-option>view:last-child{display:grid;gap:3px}.visibility-option text{color:var(--mp-text-primary);font-size:11px;font-weight:700}.visibility-option small{color:var(--mp-text-muted);font-size:9px}.form-error{color:var(--mp-danger);font-size:11px;line-height:1.4}.save-experience{display:grid;min-height:44px;place-items:center;border-radius:10px;background:var(--mp-brand-primary);color:#fff;font-size:12px;font-weight:800}.saved-recap{display:flex;align-items:flex-start;gap:9px;padding:11px;border-radius:10px;background:var(--mp-brand-soft);color:var(--mp-brand-primary-dark)}.saved-recap>view{display:grid;gap:4px}.saved-recap text{font-size:11px;font-weight:800}.saved-recap small{color:var(--mp-text-muted);font-size:10px;line-height:1.4}.saved-recap-link{display:inline-flex;align-items:center;min-height:32px;margin-top:3px;color:var(--mp-brand-primary-dark);font-size:10px;font-weight:800;text-decoration:underline;text-underline-offset:3px}
</style>
