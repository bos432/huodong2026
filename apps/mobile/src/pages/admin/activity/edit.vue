<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ActivityStatus, FieldType, activityStatusText, checkActivityContentCompliance } from "@activity/shared";
import { adminActivityPreviewUrl, mobileAdminRequest, requireMobileAdmin, uploadAdminImage } from "../../../mobile-admin";

type FieldDraft = { label: string; type: FieldType; required: boolean; optionsText: string; sortOrder: number };
type HostDraft = { name: string; title: string; avatarUrl: string; bio: string; sortOrder: number };
type SectionDraft = { type: string; title: string; content: string; imageUrl: string; sortOrder: number };

const id = ref(0);
const step = ref(0);
const loading = ref(true);
const saving = ref(false);
const actionNotice = ref("");
const actionNoticeTone = ref<"info" | "success" | "error">("info");
const actionBusyLabel = ref("");
const lastSavedAt = ref("");
const bootstrap = ref<any>(null);
const form = ref<any>(defaultForm());
const fields = ref<FieldDraft[]>([defaultField()]);
const hosts = ref<HostDraft[]>([]);
const sections = ref<SectionDraft[]>([defaultSection()]);
const steps = ["基础", "报名", "详情", "发布"];
const fieldTypes = [
  { label: "文本", value: FieldType.Text },
  { label: "手机", value: FieldType.Phone },
  { label: "单选", value: FieldType.SingleChoice },
  { label: "多选", value: FieldType.MultipleChoice },
  { label: "备注", value: FieldType.Remark }
];

const canWriteActivities = computed(() => Boolean(bootstrap.value?.permissions?.canWriteActivities));
const canSelectTenant = computed(() => Boolean(bootstrap.value?.permissions?.canSelectTenant));
const selectedTenant = computed(() => (bootstrap.value?.tenants || []).find((item: any) => item.id === form.value.tenantId));
const tenantPermissions = computed(() => selectedTenant.value?.settings || bootstrap.value?.admin?.tenant?.settings || {});
const canSubmitApproval = computed(() => Boolean(bootstrap.value?.admin?.tenantId));
const canDirectOpen = computed(() => bootstrap.value?.admin?.role === "super_admin" || tenantPermissions.value.activityPublishReviewRequired === false);
const registrationReviewEnabled = computed(() => tenantPermissions.value.registrationReviewEnabled !== false);
const saveTargetStatus = computed(() => {
  if (form.value.status === ActivityStatus.Open) return ActivityStatus.Open;
  if (form.value.status === ActivityStatus.PendingApproval) return ActivityStatus.PendingApproval;
  return ActivityStatus.Draft;
});
const saveActionLabel = computed(() => {
  if (form.value.status === ActivityStatus.Open) return "保存上线";
  if (form.value.status === ActivityStatus.PendingApproval) return "保存待审";
  return "保存";
});
const showPublishAction = computed(() => form.value.status !== ActivityStatus.Open && form.value.status !== ActivityStatus.PendingApproval);
const compliance = computed(() => checkActivityContentCompliance({ title: form.value.title, description: form.value.description, notice: form.value.notice, sections: sections.value }));

function showActionNotice(message: string, tone: "info" | "success" | "error" = "error", targetStep?: number) {
  actionNotice.value = message;
  actionNoticeTone.value = tone;
  if (typeof targetStep === "number") step.value = targetStep;
  uni.showToast({ title: message.length > 28 ? `${message.slice(0, 27)}...` : message, icon: tone === "success" ? "success" : "none" });
}

function currentClockText() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function defaultForm() {
  const now = new Date();
  const start = new Date(now.getTime() + 7 * 86400000);
  start.setHours(10, 0, 0, 0);
  const end = new Date(start.getTime() + 2 * 3600000);
  const deadline = new Date(start.getTime() - 86400000);
  return {
    tenantId: undefined as number | undefined,
    title: "",
    coverUrl: "",
    description: "",
    notice: "",
    location: "",
    locationLatitude: undefined,
    locationLongitude: undefined,
    locationMapUrl: "",
    groupQrCodeUrl: "",
    startTime: toInputTime(start),
    endTime: toInputTime(end),
    registrationDeadline: toInputTime(deadline),
    priorityRegistrationEndsAt: "",
    capacity: 30,
    price: 0,
    status: ActivityStatus.Draft,
    featured: false,
    requireReview: false,
    allowCancel: true,
    categoryId: undefined as number | undefined,
    agentId: undefined as number | undefined,
    minMemberLevelId: undefined as number | undefined,
    priorityMemberLevelId: undefined as number | undefined
  };
}

function defaultField(): FieldDraft {
  return { label: "姓名", type: FieldType.Text, required: true, optionsText: "", sortOrder: 1 };
}

function defaultSection(): SectionDraft {
  return { type: "rich_text", title: "活动介绍", content: "", imageUrl: "", sortOrder: 1 };
}

function toInputTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function numberOrUndefined(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) && next > 0 ? next : undefined;
}

function setBoolean(key: string, value: boolean) {
  if (key === "requireReview" && value && !registrationReviewEnabled.value) {
    uni.showToast({ title: "当前商家未开启报名审核权限", icon: "none" });
    return;
  }
  form.value[key] = value;
}

function pickTenant(e: any) {
  const tenant = (bootstrap.value?.tenants || [])[Number(e.detail.value)];
  if (!tenant) return;
  form.value.tenantId = tenant.id;
  if (tenant.settings?.registrationReviewEnabled === false) form.value.requireReview = false;
}

function pickCategory(e: any) {
  const category = (bootstrap.value?.categories || [])[Number(e.detail.value)];
  form.value.categoryId = category?.id;
}

function pickAgent(e: any) {
  const index = Number(e.detail.value);
  form.value.agentId = index <= 0 ? undefined : bootstrap.value?.agents?.[index - 1]?.id;
}

function pickMember(key: "minMemberLevelId" | "priorityMemberLevelId", e: any) {
  const index = Number(e.detail.value);
  form.value[key] = index <= 0 ? undefined : bootstrap.value?.memberLevels?.[index - 1]?.id;
}

function pickFieldType(index: number, e: any) {
  fields.value[index].type = fieldTypes[Number(e.detail.value)]?.value || FieldType.Text;
}

function addField() {
  fields.value.push({ label: "", type: FieldType.Text, required: false, optionsText: "", sortOrder: fields.value.length + 1 });
}

function removeField(index: number) {
  if (fields.value.length <= 1) {
    uni.showToast({ title: "至少保留一个报名字段", icon: "none" });
    return;
  }
  fields.value.splice(index, 1);
}

function addHost() {
  hosts.value.push({ name: "", title: "", avatarUrl: "", bio: "", sortOrder: hosts.value.length + 1 });
}

function removeHost(index: number) {
  hosts.value.splice(index, 1);
}

function addSection() {
  sections.value.push({ type: "rich_text", title: "详情模块", content: "", imageUrl: "", sortOrder: sections.value.length + 1 });
}

function removeSection(index: number) {
  if (sections.value.length <= 1) {
    uni.showToast({ title: "至少保留一个详情模块", icon: "none" });
    return;
  }
  sections.value.splice(index, 1);
}

async function chooseImage(target: "cover" | "groupQr" | "section", index = 0) {
  try {
    const chosen = await new Promise<UniApp.ChooseImageSuccessCallbackResult>((resolve, reject) => uni.chooseImage({ count: 1, success: resolve, fail: reject }));
    const filePath = chosen.tempFilePaths[0];
    if (!filePath) return;
    const uploaded = await uploadAdminImage(filePath);
    if (target === "cover") form.value.coverUrl = uploaded.url;
    else if (target === "groupQr") form.value.groupQrCodeUrl = uploaded.url;
    else sections.value[index].imageUrl = uploaded.url;
  } catch (err: any) {
    uni.showToast({ title: err.message || "上传失败", icon: "none" });
  }
}

function normalizeOptions(text: string) {
  return text.split(/\n|,|，/).map((item) => item.trim()).filter(Boolean).map((label) => ({ label, value: label }));
}

function payload(status: ActivityStatus) {
  const completeSections = sections.value.filter((section) => section.title.trim() && section.content.trim());
  return {
    ...form.value,
    status,
    requireReview: registrationReviewEnabled.value ? form.value.requireReview : false,
    tenantId: canSelectTenant.value ? numberOrUndefined(form.value.tenantId) : undefined,
    categoryId: numberOrUndefined(form.value.categoryId),
    agentId: numberOrUndefined(form.value.agentId),
    minMemberLevelId: numberOrUndefined(form.value.minMemberLevelId),
    priorityMemberLevelId: numberOrUndefined(form.value.priorityMemberLevelId),
    capacity: Number(form.value.capacity || 1),
    price: Number(form.value.price || 0),
    locationLatitude: form.value.locationLatitude === "" ? undefined : form.value.locationLatitude,
    locationLongitude: form.value.locationLongitude === "" ? undefined : form.value.locationLongitude,
    priorityRegistrationEndsAt: form.value.priorityMemberLevelId ? form.value.priorityRegistrationEndsAt : undefined,
    fields: fields.value.map((field, index) => ({ label: field.label, type: field.type, required: field.required, options: normalizeOptions(field.optionsText), sortOrder: index + 1 })),
    hosts: hosts.value.filter((host) => host.name.trim()).map((host, index) => ({ ...host, sortOrder: index + 1 })),
    sections: completeSections.map((section, index) => ({ ...section, type: section.type || "rich_text", sortOrder: index + 1 }))
  };
}

function validateBeforeSave(targetStatus: ActivityStatus) {
  if (!canWriteActivities.value) return { message: "当前账号没有活动保存权限，请换运营/超级管理员账号登录。", step: 3 };
  if (canSelectTenant.value && !form.value.tenantId) return { message: "平台超级管理员发布活动前必须选择商家。", step: 0 };
  if (!form.value.title.trim()) return { message: "请填写活动标题。", step: 0 };
  if (!form.value.description.trim()) return { message: "请填写活动介绍。", step: 0 };
  if (!form.value.location.trim()) return { message: "请填写活动地点。", step: 0 };
  if (!fields.value.length || fields.value.some((field) => !field.label.trim())) return { message: "请完善报名字段。", step: 1 };
  if (targetStatus !== ActivityStatus.Draft && sections.value.some((section) => !section.title.trim() || !section.content.trim())) return { message: "发布前请完善详情模块标题和内容。", step: 2 };
  if (!compliance.value.passed) return { message: compliance.value.blockingIssues[0]?.message || "活动内容存在合规风险。", step: 3 };
  if (targetStatus === ActivityStatus.Open && !canDirectOpen.value && form.value.status !== ActivityStatus.Open) return { message: "当前商家活动发布需要平台审核，请点击提交审核。", step: 3 };
  return null;
}

async function save(targetStatus: ActivityStatus, redirectAfterSave = true) {
  if (saving.value) return null;
  const validation = validateBeforeSave(targetStatus);
  if (validation) {
    showActionNotice(validation.message, "error", validation.step);
    return null;
  }
  saving.value = true;
  actionBusyLabel.value = targetStatus === ActivityStatus.Open ? "发布中..." : "保存中...";
  actionNotice.value = actionBusyLabel.value;
  actionNoticeTone.value = "info";
  uni.showLoading({ title: actionBusyLabel.value, mask: true });
  try {
    const isNewActivity = !id.value;
    const data = payload(targetStatus);
    const saved = id.value
      ? await mobileAdminRequest<any>(`/admin/activities/${id.value}`, { method: "PUT", data })
      : await mobileAdminRequest<any>("/admin/activities", { method: "POST", data });
    id.value = saved.id;
    const previousStatus = form.value.status;
    form.value.status = saved.status || targetStatus;
    lastSavedAt.value = currentClockText();
    showActionNotice(targetStatus === ActivityStatus.Open && previousStatus !== ActivityStatus.Open ? `已发布 ${lastSavedAt.value}` : `已保存 ${lastSavedAt.value}`, "success");
    if (redirectAfterSave && isNewActivity) {
      setTimeout(() => uni.redirectTo({ url: `/pages/admin/activity/edit?id=${saved.id}` }), 650);
    } else if (!isNewActivity) {
      await loadActivity();
    }
    return saved;
  } catch (err: any) {
    showActionNotice(err.message || "保存失败，请稍后重试。", "error");
    return null;
  } finally {
    uni.hideLoading();
    actionBusyLabel.value = "";
    saving.value = false;
  }
}

async function submitApproval() {
  if (saving.value) return;
  if (form.value.status === ActivityStatus.Open) {
    await save(ActivityStatus.Open, false);
    return;
  }
  const message = validateBeforeSave(ActivityStatus.PendingApproval);
  if (message) {
    showActionNotice(message.message, "error", message.step);
    return;
  }
  const saved = await save(ActivityStatus.Draft, false);
  if (!saved) return;
  if (saved.status === ActivityStatus.PendingApproval || saved.status === ActivityStatus.Open) return;
  saving.value = true;
  actionBusyLabel.value = "提交中...";
  actionNotice.value = "提交审核中...";
  actionNoticeTone.value = "info";
  uni.showLoading({ title: "提交中...", mask: true });
  try {
    await mobileAdminRequest(`/admin/activities/${id.value}/submit-approval`, { method: "POST" });
    showActionNotice("已提交审核", "success");
    await loadActivity();
  } catch (err: any) {
    showActionNotice(err.message || "提交失败，请稍后重试。", "error");
  } finally {
    uni.hideLoading();
    actionBusyLabel.value = "";
    saving.value = false;
  }
}

function handleSaveTap() {
  void save(saveTargetStatus.value);
}

function handlePublishTap() {
  void save(ActivityStatus.Open);
}

function handleSubmitApprovalTap() {
  void submitApproval();
}

function preview() {
  if (!id.value) {
    uni.showToast({ title: "请先保存活动", icon: "none" });
    return;
  }
  const tenantCode = selectedTenant.value?.code || bootstrap.value?.admin?.tenant?.code || "";
  uni.navigateTo({ url: `/pages/admin/activity/preview?id=${id.value}&tenantCode=${encodeURIComponent(tenantCode)}` });
}

function copyLink() {
  if (!id.value) {
    uni.showToast({ title: "请先保存活动", icon: "none" });
    return;
  }
  const tenantCode = selectedTenant.value?.code || bootstrap.value?.admin?.tenant?.code || "";
  uni.setClipboardData({ data: adminActivityPreviewUrl(id.value, tenantCode), success: () => uni.showToast({ title: "已复制", icon: "success" }) });
}

async function loadActivity() {
  if (!id.value) return;
  const activity = await mobileAdminRequest<any>(`/admin/activities/${id.value}`);
  form.value = {
    ...defaultForm(),
    tenantId: activity.tenant?.id,
    title: activity.title || "",
    coverUrl: activity.coverUrl || "",
    description: activity.description || "",
    notice: activity.notice || "",
    location: activity.location || "",
    locationLatitude: activity.locationLatitude || undefined,
    locationLongitude: activity.locationLongitude || undefined,
    locationMapUrl: activity.locationMapUrl || "",
    groupQrCodeUrl: activity.groupQrCodeUrl || "",
    startTime: toInputTime(activity.startTime),
    endTime: toInputTime(activity.endTime),
    registrationDeadline: toInputTime(activity.registrationDeadline),
    priorityRegistrationEndsAt: activity.priorityRegistrationEndsAt ? toInputTime(activity.priorityRegistrationEndsAt) : "",
    capacity: Number(activity.capacity || 1),
    price: Number(activity.price || 0),
    status: activity.status || ActivityStatus.Draft,
    featured: Boolean(activity.featured),
    requireReview: registrationReviewEnabled.value ? Boolean(activity.requireReview) : false,
    allowCancel: Boolean(activity.allowCancel),
    categoryId: activity.category?.id,
    agentId: activity.agent?.id,
    minMemberLevelId: activity.minMemberLevel?.id,
    priorityMemberLevelId: activity.priorityMemberLevel?.id
  };
  fields.value = (activity.fields || []).map((field: any, index: number) => ({ label: field.label || "", type: field.type || FieldType.Text, required: Boolean(field.required), optionsText: (field.options || []).map((item: any) => item.label || item.value).join("\n"), sortOrder: index + 1 }));
  if (!fields.value.length) fields.value = [defaultField()];
  hosts.value = (activity.hosts || []).map((host: any, index: number) => ({ name: host.name || "", title: host.title || "", avatarUrl: host.avatarUrl || "", bio: host.bio || "", sortOrder: index + 1 }));
  sections.value = (activity.sections || []).map((section: any, index: number) => ({ type: section.type || "rich_text", title: section.title || "", content: section.content || "", imageUrl: section.imageUrl || "", sortOrder: index + 1 }));
  if (!sections.value.length) sections.value = [defaultSection()];
}

async function load() {
  requireMobileAdmin();
  loading.value = true;
  try {
    bootstrap.value = await mobileAdminRequest<any>("/admin/mobile/bootstrap");
    if (!form.value.tenantId && bootstrap.value?.admin?.tenantId) form.value.tenantId = bootstrap.value.admin.tenantId;
    if (!form.value.tenantId && bootstrap.value?.tenants?.length === 1) form.value.tenantId = bootstrap.value.tenants[0].id;
    const pages = getCurrentPages();
    id.value = Number((pages[pages.length - 1] as any).options?.id || 0);
    await loadActivity();
  } catch (err: any) {
    uni.showToast({ title: err.message || "加载失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <view class="edit-page">
    <view class="head">
      <view>
        <view class="title">{{ id ? "编辑活动" : "发布活动" }}</view>
        <view class="sub">{{ activityStatusText[form.status] || "草稿" }}</view>
      </view>
      <view class="preview" @click="preview">预览</view>
    </view>

    <view class="steps">
      <view v-for="(item, index) in steps" :key="item" class="step" :class="{ active: step === index }" @click="step = index">{{ item }}</view>
    </view>

    <view v-if="loading" class="panel">加载中...</view>
    <template v-else>
      <view v-show="step === 0" class="panel">
        <view v-if="canSelectTenant" class="field">
          <view class="label">归属商家</view>
          <picker :range="bootstrap.tenants" range-key="name" @change="pickTenant">
            <view class="picker">{{ selectedTenant?.name || "请选择商家" }}</view>
          </picker>
        </view>
        <view class="field"><view class="label">活动标题</view><input v-model="form.title" class="input" placeholder="例如：慢π杭州城市体验活动" /></view>
        <view class="field"><view class="label">封面图</view><view class="upload" @click="chooseImage('cover')"><image v-if="form.coverUrl" :src="form.coverUrl" mode="aspectFill" /><text v-else>上传封面</text></view></view>
        <view class="field"><view class="label">活动介绍</view><textarea v-model="form.description" class="textarea" auto-height placeholder="一句话说明活动亮点、对象和收益" /></view>
        <view class="grid2">
          <view class="field"><view class="label">分类</view><picker :range="bootstrap.categories" range-key="name" @change="pickCategory"><view class="picker">{{ bootstrap.categories.find((c:any)=>c.id===form.categoryId)?.name || "选择分类" }}</view></picker></view>
          <view class="field"><view class="label">代理/主办</view><picker :range="['平台自营'].concat((bootstrap.agents || []).map((a:any)=>a.name))" @change="pickAgent"><view class="picker">{{ bootstrap.agents.find((a:any)=>a.id===form.agentId)?.name || "平台自营" }}</view></picker></view>
        </view>
        <view class="field"><view class="label">地点</view><input v-model="form.location" class="input" placeholder="活动地址" /></view>
        <view class="grid2">
          <view class="field"><view class="label">开始时间</view><input v-model="form.startTime" class="input" placeholder="YYYY-MM-DD HH:mm" /></view>
          <view class="field"><view class="label">结束时间</view><input v-model="form.endTime" class="input" placeholder="YYYY-MM-DD HH:mm" /></view>
        </view>
        <view class="grid2">
          <view class="field"><view class="label">报名截止</view><input v-model="form.registrationDeadline" class="input" placeholder="YYYY-MM-DD HH:mm" /></view>
          <view class="field"><view class="label">名额</view><input v-model.number="form.capacity" class="input" type="number" /></view>
        </view>
        <view class="grid2">
          <view class="field"><view class="label">价格</view><input v-model.number="form.price" class="input" type="digit" /></view>
          <view class="field"><view class="label">地图链接</view><input v-model="form.locationMapUrl" class="input" placeholder="可选" /></view>
        </view>
      </view>

      <view v-show="step === 1" class="panel">
        <view class="toggles">
          <view :class="{ on: form.requireReview, disabled: !registrationReviewEnabled }" @click="setBoolean('requireReview', !form.requireReview)">报名审核</view>
          <view :class="{ on: form.allowCancel }" @click="setBoolean('allowCancel', !form.allowCancel)">允许取消</view>
          <view :class="{ on: form.featured }" @click="setBoolean('featured', !form.featured)">推荐展示</view>
        </view>
        <view v-if="!registrationReviewEnabled" class="issue">当前商家未开通报名审核权限，活动报名将自动通过或进入付款流程。</view>
        <view class="field">
          <view class="label">报名成功入群二维码</view>
          <view class="hint-line">报名成功后在报名详情页显示，公开活动页只提示入群流程，不直接展示二维码。</view>
          <view class="upload qr-upload" @click="chooseImage('groupQr')">
            <image v-if="form.groupQrCodeUrl" :src="form.groupQrCodeUrl" mode="aspectFit" />
            <text v-else>上传入群二维码</text>
          </view>
          <input v-model="form.groupQrCodeUrl" class="input input-after-upload" placeholder="也可粘贴二维码图片链接" />
        </view>
        <view class="grid2">
          <view class="field"><view class="label">会员门槛</view><picker :range="['无门槛'].concat((bootstrap.memberLevels || []).map((m:any)=>m.name))" @change="pickMember('minMemberLevelId', $event)"><view class="picker">{{ bootstrap.memberLevels.find((m:any)=>m.id===form.minMemberLevelId)?.name || "无门槛" }}</view></picker></view>
          <view class="field"><view class="label">优先会员</view><picker :range="['无优先'].concat((bootstrap.memberLevels || []).map((m:any)=>m.name))" @change="pickMember('priorityMemberLevelId', $event)"><view class="picker">{{ bootstrap.memberLevels.find((m:any)=>m.id===form.priorityMemberLevelId)?.name || "无优先" }}</view></picker></view>
        </view>
        <view v-if="form.priorityMemberLevelId" class="field"><view class="label">优先报名截止</view><input v-model="form.priorityRegistrationEndsAt" class="input" placeholder="YYYY-MM-DD HH:mm" /></view>
        <view class="section-head"><view>报名字段</view><view @click="addField">新增字段</view></view>
        <view v-for="(field, index) in fields" :key="index" class="sub-card">
          <view class="row"><view class="mini-title">字段 {{ index + 1 }}</view><view class="delete" @click="removeField(index)">删除</view></view>
          <input v-model="field.label" class="input" placeholder="字段名称" />
          <picker :range="fieldTypes" range-key="label" @change="pickFieldType(index, $event)"><view class="picker">{{ fieldTypes.find((item)=>item.value===field.type)?.label || "文本" }}</view></picker>
          <view class="switch-line" @click="field.required = !field.required"><text>必填</text><switch :checked="field.required" /></view>
          <textarea v-if="[FieldType.SingleChoice, FieldType.MultipleChoice].includes(field.type)" v-model="field.optionsText" class="textarea small" auto-height placeholder="选项一行一个，或用逗号分隔" />
        </view>
      </view>

      <view v-show="step === 2" class="panel">
        <view class="section-head"><view>主办方/讲师</view><view @click="addHost">新增</view></view>
        <view v-for="(host, index) in hosts" :key="index" class="sub-card">
          <view class="row"><view class="mini-title">主办方 {{ index + 1 }}</view><view class="delete" @click="removeHost(index)">删除</view></view>
          <input v-model="host.name" class="input" placeholder="名称" />
          <input v-model="host.title" class="input" placeholder="头衔，可选" />
          <textarea v-model="host.bio" class="textarea small" auto-height placeholder="介绍，可选" />
        </view>
        <view class="section-head"><view>详情内容</view><view @click="addSection">新增模块</view></view>
        <view v-for="(section, index) in sections" :key="index" class="sub-card">
          <view class="row"><view class="mini-title">模块 {{ index + 1 }}</view><view class="delete" @click="removeSection(index)">删除</view></view>
          <input v-model="section.title" class="input" placeholder="模块标题" />
          <view class="upload compact" @click="chooseImage('section', index)"><image v-if="section.imageUrl" :src="section.imageUrl" mode="aspectFill" /><text v-else>上传模块图片</text></view>
          <textarea v-model="section.content" class="textarea rich" auto-height placeholder="支持 Markdown：# 标题、**加粗**、[链接](https://...)、```代码```" />
        </view>
        <view class="field"><view class="label">报名须知</view><textarea v-model="form.notice" class="textarea" auto-height placeholder="退款、签到、注意事项等" /></view>
      </view>

      <view v-show="step === 3" class="panel">
        <view class="review-line"><text>合规检查</text><text :class="compliance.passed ? 'ok' : 'bad'">{{ compliance.passed ? "通过" : "需修改" }}</text></view>
        <view v-for="issue in compliance.issues" :key="issue.field + issue.keyword" class="issue">{{ issue.message }}</view>
        <view class="review-line"><text>发布方式</text><text>{{ canDirectOpen ? "可直接发布" : "需提交平台审核" }}</text></view>
        <view class="review-line"><text>保存状态</text><text :class="lastSavedAt ? 'ok' : ''">{{ lastSavedAt ? `已保存 ${lastSavedAt}` : "本页修改后请点底部保存" }}</text></view>
        <view v-if="canSelectTenant && !form.tenantId" class="issue">平台超级管理员需要先选择商家。</view>
        <view class="link" @click="copyLink">复制公开链接</view>
      </view>
    </template>

    <view class="action-notice" v-if="actionNotice" :class="actionNoticeTone">{{ actionNotice }}</view>
    <view class="bottom" :class="{ compact: !showPublishAction }">
      <view class="ghost" @tap="step = Math.max(step - 1, 0)">上一步</view>
      <view class="ghost" @tap="step = Math.min(step + 1, steps.length - 1)">下一步</view>
      <view class="save" :class="{ disabled: saving || !canWriteActivities }" @tap="handleSaveTap">{{ actionBusyLabel || saveActionLabel }}</view>
      <view v-if="canDirectOpen && showPublishAction" class="publish" :class="{ disabled: saving || !canWriteActivities }" @tap="handlePublishTap">{{ actionBusyLabel || "发布" }}</view>
      <view v-else-if="canSubmitApproval && showPublishAction" class="publish" :class="{ disabled: saving || !canWriteActivities }" @tap="handleSubmitApprovalTap">{{ actionBusyLabel || "提交审核" }}</view>
    </view>
  </view>
</template>

<style scoped>
.edit-page { min-height: 100vh; padding: 24rpx 24rpx 176rpx; background: radial-gradient(circle at 18% 0%, rgba(255, 232, 198, 0.9), transparent 34%), linear-gradient(180deg, #fff8ef 0%, #f5f0e8 44%, #f7f3ed 100%); color: #2f211c; }
.head { position: relative; overflow: hidden; display: flex; justify-content: space-between; align-items: center; gap: 18rpx; padding: 34rpx 28rpx; border-radius: 30rpx; background: linear-gradient(135deg, #5b2f24 0%, #8f4c32 48%, #d29a5a 100%); color: #fff; box-shadow: 0 18rpx 44rpx rgba(91, 47, 36, 0.24); }
.head::after { content: ""; position: absolute; right: -80rpx; top: -90rpx; width: 240rpx; height: 240rpx; border-radius: 999px; background: rgba(255,255,255,.18); }
.title { position: relative; font-size: 40rpx; font-weight: 950; }
.sub { position: relative; margin-top: 6rpx; color: rgba(255,255,255,.76); font-size: 24rpx; }
.preview { padding: 12rpx 22rpx; border-radius: 999px; background: rgba(255,255,255,.14); font-size: 24rpx; font-weight: 900; }
.steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10rpx; margin: 20rpx 0; }
.step { height: 66rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: rgba(255,255,255,.88); color: #7a5b52; font-size: 24rpx; font-weight: 900; box-shadow: 0 8rpx 20rpx rgba(91,47,36,.05); }
.step.active { background: #0f766e; color: #fff; box-shadow: 0 10rpx 22rpx rgba(15,118,110,.2); }
.panel, .sub-card { border-radius: 24rpx; background: rgba(255,255,255,.9); border: 1rpx solid rgba(91, 47, 36, 0.06); box-shadow: 0 14rpx 34rpx rgba(91,47,36,.08); }
.panel { padding: 24rpx; }
.sub-card { margin-top: 16rpx; padding: 18rpx; box-shadow: none; }
.field { margin-bottom: 18rpx; }
.label { margin-bottom: 10rpx; color: #7a5b52; font-size: 24rpx; font-weight: 900; }
.input, .picker { min-height: 80rpx; display: flex; align-items: center; padding: 0 20rpx; border: 1rpx solid rgba(91, 47, 36, 0.1); border-radius: 18rpx; background: rgba(255,255,255,.88); color: #2f211c; font-size: 26rpx; }
.textarea { width: 100%; min-height: 150rpx; box-sizing: border-box; padding: 18rpx 20rpx; border: 1rpx solid rgba(91, 47, 36, 0.1); border-radius: 18rpx; background: rgba(255,255,255,.88); color: #2f211c; font-size: 26rpx; line-height: 1.6; }
.textarea.small { min-height: 110rpx; margin-top: 14rpx; }
.textarea.rich { min-height: 260rpx; margin-top: 14rpx; font-family: monospace; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; }
.upload { min-height: 260rpx; display: flex; align-items: center; justify-content: center; border: 1rpx dashed rgba(15, 118, 110, 0.36); border-radius: 22rpx; background: #f8fbf8; color: #0f766e; font-weight: 900; overflow: hidden; }
.upload.compact { min-height: 170rpx; margin-top: 14rpx; }
.upload.qr-upload { min-height: 220rpx; background: #fff; }
.upload image { width: 100%; height: 260rpx; display: block; }
.upload.compact image { height: 170rpx; }
.upload.qr-upload image { height: 220rpx; }
.hint-line { margin: -2rpx 0 12rpx; color: #7a5b52; font-size: 23rpx; line-height: 1.55; }
.input-after-upload { margin-top: 12rpx; }
.toggles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; margin-bottom: 18rpx; }
.toggles view { height: 68rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #fff4e6; color: #7a5b52; font-size: 24rpx; font-weight: 900; }
.toggles view.on { background: #e6f2ef; color: #0f766e; }
.toggles view.disabled { opacity: .55; }
.section-head, .row, .switch-line, .review-line { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.section-head { margin: 24rpx 0 12rpx; font-size: 28rpx; font-weight: 900; }
.section-head view:last-child { color: #0f766e; font-size: 24rpx; }
.mini-title { font-size: 25rpx; font-weight: 900; }
.delete { color: #b42318; font-size: 24rpx; font-weight: 900; }
.switch-line { margin-top: 14rpx; color: #7a5b52; font-size: 25rpx; }
.review-line { padding: 18rpx 0; border-bottom: 1rpx solid rgba(91, 47, 36, 0.08); font-size: 27rpx; font-weight: 900; }
.ok { color: #0f766e; }
.bad, .issue { color: #b42318; }
.issue { margin-top: 14rpx; padding: 16rpx; border-radius: 18rpx; background: #fff1f3; font-size: 24rpx; line-height: 1.5; }
.link { margin-top: 22rpx; padding: 18rpx; border-radius: 18rpx; background: #e6f2ef; color: #0f766e; text-align: center; font-size: 25rpx; font-weight: 900; }
.action-notice { position: fixed; left: 18rpx; right: 18rpx; bottom: calc(116rpx + env(safe-area-inset-bottom)); z-index: 9; padding: 16rpx 18rpx; border-radius: 18rpx; font-size: 24rpx; font-weight: 900; line-height: 1.45; box-shadow: 0 12rpx 28rpx rgba(91,47,36,.12); }
.action-notice.info { background: #eff6ff; color: #175cd3; }
.action-notice.success { background: #ecfdf3; color: #067647; }
.action-notice.error { background: #fff1f3; color: #b42318; }
.bottom { position: fixed; left: 0; right: 0; bottom: 0; display: grid; grid-template-columns: 1fr 1fr 1fr 1.25fr; gap: 10rpx; padding: 16rpx 18rpx calc(16rpx + env(safe-area-inset-bottom)); background: rgba(255,252,247,.96); border-top: 1rpx solid rgba(91, 47, 36, 0.08); box-shadow: 0 -12rpx 34rpx rgba(91,47,36,.12); backdrop-filter: blur(16px); }
.bottom.compact { grid-template-columns: 1fr 1fr 1.25fr; }
.bottom view { min-height: 76rpx; display: flex; align-items: center; justify-content: center; border-radius: 20rpx; font-size: 25rpx; font-weight: 900; }
.ghost { background: #fff4e6; color: #7a5b52; }
.save { background: #e6f2ef; color: #0f766e; }
.publish { background: linear-gradient(135deg, #0f766e, #15907f); color: #fff; box-shadow: 0 12rpx 24rpx rgba(15,118,110,.2); }
.disabled { opacity: .55; }
</style>
