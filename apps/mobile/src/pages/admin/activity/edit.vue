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

const canSelectTenant = computed(() => Boolean(bootstrap.value?.permissions?.canSelectTenant));
const selectedTenant = computed(() => (bootstrap.value?.tenants || []).find((item: any) => item.id === form.value.tenantId));
const tenantPermissions = computed(() => selectedTenant.value?.settings || bootstrap.value?.admin?.tenant?.settings || {});
const canSubmitApproval = computed(() => Boolean(bootstrap.value?.admin?.tenantId));
const canDirectOpen = computed(() => bootstrap.value?.admin?.role === "super_admin" || tenantPermissions.value.activityPublishReviewRequired === false);
const compliance = computed(() => checkActivityContentCompliance({ title: form.value.title, description: form.value.description, notice: form.value.notice, sections: sections.value }));

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
  form.value[key] = value;
}

function pickTenant(e: any) {
  const tenant = (bootstrap.value?.tenants || [])[Number(e.detail.value)];
  if (!tenant) return;
  form.value.tenantId = tenant.id;
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

async function chooseImage(target: "cover" | "section", index = 0) {
  try {
    const chosen = await new Promise<UniApp.ChooseImageSuccessCallbackResult>((resolve, reject) => uni.chooseImage({ count: 1, success: resolve, fail: reject }));
    const filePath = chosen.tempFilePaths[0];
    if (!filePath) return;
    const uploaded = await uploadAdminImage(filePath);
    if (target === "cover") form.value.coverUrl = uploaded.url;
    else sections.value[index].imageUrl = uploaded.url;
  } catch (err: any) {
    uni.showToast({ title: err.message || "上传失败", icon: "none" });
  }
}

function normalizeOptions(text: string) {
  return text.split(/\n|,|，/).map((item) => item.trim()).filter(Boolean).map((label) => ({ label, value: label }));
}

function payload(status: ActivityStatus) {
  return {
    ...form.value,
    status,
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
    sections: sections.value.map((section, index) => ({ ...section, type: section.type || "rich_text", sortOrder: index + 1 }))
  };
}

function validateBeforeSave(targetStatus: ActivityStatus) {
  if (canSelectTenant.value && !form.value.tenantId) return "平台超级管理员发布活动前必须选择商家";
  if (!form.value.title.trim()) return "请填写活动标题";
  if (!form.value.description.trim()) return "请填写活动介绍";
  if (!form.value.location.trim()) return "请填写活动地点";
  if (!fields.value.length || fields.value.some((field) => !field.label.trim())) return "请完善报名字段";
  if (sections.value.some((section) => !section.title.trim() || !section.content.trim())) return "请完善详情模块标题和内容";
  if (!compliance.value.passed) return compliance.value.blockingIssues[0]?.message || "活动内容存在合规风险";
  return "";
}

async function save(targetStatus: ActivityStatus, redirectAfterSave = true) {
  const message = validateBeforeSave(targetStatus);
  if (message) {
    uni.showToast({ title: message, icon: "none" });
    return null;
  }
  saving.value = true;
  try {
    const data = payload(targetStatus);
    const saved = id.value
      ? await mobileAdminRequest<any>(`/admin/activities/${id.value}`, { method: "PATCH", data })
      : await mobileAdminRequest<any>("/admin/activities", { method: "POST", data });
    id.value = saved.id;
    uni.showToast({ title: targetStatus === ActivityStatus.Draft ? "已保存" : "已发布", icon: "success" });
    if (redirectAfterSave) setTimeout(() => uni.redirectTo({ url: `/pages/admin/activity/edit?id=${saved.id}` }), 350);
    return saved;
  } catch (err: any) {
    uni.showToast({ title: err.message || "保存失败", icon: "none" });
    return null;
  } finally {
    saving.value = false;
  }
}

async function submitApproval() {
  if (!id.value) {
    const saved = await save(ActivityStatus.Draft, false);
    if (!saved) return;
  }
  if (!compliance.value.passed) {
    uni.showToast({ title: compliance.value.blockingIssues[0]?.message || "活动内容存在合规风险", icon: "none" });
    return;
  }
  saving.value = true;
  try {
    await mobileAdminRequest(`/admin/activities/${id.value}/submit-approval`, { method: "POST" });
    uni.showToast({ title: "已提交审核", icon: "success" });
    await loadActivity();
  } catch (err: any) {
    uni.showToast({ title: err.message || "提交失败", icon: "none" });
  } finally {
    saving.value = false;
  }
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
    requireReview: Boolean(activity.requireReview),
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
        <view class="field"><view class="label">活动标题</view><input v-model="form.title" class="input" placeholder="例如：七维文化杭州城市体验课" /></view>
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
          <view :class="{ on: form.requireReview }" @click="setBoolean('requireReview', !form.requireReview)">报名审核</view>
          <view :class="{ on: form.allowCancel }" @click="setBoolean('allowCancel', !form.allowCancel)">允许取消</view>
          <view :class="{ on: form.featured }" @click="setBoolean('featured', !form.featured)">推荐展示</view>
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
        <view v-if="canSelectTenant && !form.tenantId" class="issue">平台超级管理员需要先选择商家。</view>
        <view class="link" @click="copyLink">复制公开链接</view>
      </view>
    </template>

    <view class="bottom">
      <view class="ghost" @click="step = Math.max(step - 1, 0)">上一步</view>
      <view class="ghost" @click="step = Math.min(step + 1, steps.length - 1)">下一步</view>
      <view class="save" :class="{ disabled: saving }" @click="save(ActivityStatus.Draft)">保存</view>
      <view v-if="canDirectOpen" class="publish" :class="{ disabled: saving }" @click="save(ActivityStatus.Open)">发布</view>
      <view v-else-if="canSubmitApproval" class="publish" :class="{ disabled: saving }" @click="submitApproval">提交审核</view>
    </view>
  </view>
</template>

<style scoped>
.edit-page { min-height: 100vh; padding: 24rpx 24rpx 150rpx; background: #f4f6f8; color: #111827; }
.head { display: flex; justify-content: space-between; align-items: center; gap: 18rpx; padding: 28rpx 24rpx; border-radius: 8px; background: #111827; color: #fff; }
.title { font-size: 38rpx; font-weight: 900; }
.sub { margin-top: 6rpx; color: rgba(255,255,255,.7); font-size: 24rpx; }
.preview { padding: 12rpx 22rpx; border-radius: 999px; background: rgba(255,255,255,.14); font-size: 24rpx; font-weight: 900; }
.steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10rpx; margin: 20rpx 0; }
.step { height: 64rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #fff; color: #667085; font-size: 24rpx; font-weight: 900; }
.step.active { background: #0f766e; color: #fff; }
.panel, .sub-card { border-radius: 8px; background: #fff; box-shadow: 0 12rpx 34rpx rgba(15,23,42,.06); }
.panel { padding: 24rpx; }
.sub-card { margin-top: 16rpx; padding: 18rpx; border: 1px solid #edf0f5; box-shadow: none; }
.field { margin-bottom: 18rpx; }
.label { margin-bottom: 10rpx; color: #344054; font-size: 24rpx; font-weight: 900; }
.input, .picker { min-height: 78rpx; display: flex; align-items: center; padding: 0 20rpx; border: 1px solid #d7dde8; border-radius: 6px; background: #fff; color: #111827; font-size: 26rpx; }
.textarea { width: 100%; min-height: 150rpx; box-sizing: border-box; padding: 18rpx 20rpx; border: 1px solid #d7dde8; border-radius: 6px; background: #fff; color: #111827; font-size: 26rpx; line-height: 1.6; }
.textarea.small { min-height: 110rpx; margin-top: 14rpx; }
.textarea.rich { min-height: 260rpx; margin-top: 14rpx; font-family: monospace; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; }
.upload { min-height: 260rpx; display: flex; align-items: center; justify-content: center; border: 1px dashed #98a2b3; border-radius: 8px; background: #f8fafc; color: #0f766e; font-weight: 900; overflow: hidden; }
.upload.compact { min-height: 170rpx; margin-top: 14rpx; }
.upload image { width: 100%; height: 260rpx; display: block; }
.upload.compact image { height: 170rpx; }
.toggles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12rpx; margin-bottom: 18rpx; }
.toggles view { height: 68rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; background: #f3f4f6; color: #667085; font-size: 24rpx; font-weight: 900; }
.toggles view.on { background: #e6f2ef; color: #0f766e; }
.section-head, .row, .switch-line, .review-line { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.section-head { margin: 24rpx 0 12rpx; font-size: 28rpx; font-weight: 900; }
.section-head view:last-child { color: #0f766e; font-size: 24rpx; }
.mini-title { font-size: 25rpx; font-weight: 900; }
.delete { color: #b42318; font-size: 24rpx; font-weight: 900; }
.switch-line { margin-top: 14rpx; color: #344054; font-size: 25rpx; }
.review-line { padding: 18rpx 0; border-bottom: 1px solid #edf0f5; font-size: 27rpx; font-weight: 900; }
.ok { color: #0f766e; }
.bad, .issue { color: #b42318; }
.issue { margin-top: 14rpx; padding: 16rpx; border-radius: 6px; background: #fff1f3; font-size: 24rpx; line-height: 1.5; }
.link { margin-top: 22rpx; padding: 18rpx; border-radius: 6px; background: #e6f2ef; color: #0f766e; text-align: center; font-size: 25rpx; font-weight: 900; }
.bottom { position: fixed; left: 0; right: 0; bottom: 0; display: grid; grid-template-columns: 1fr 1fr 1fr 1.25fr; gap: 10rpx; padding: 16rpx 18rpx calc(16rpx + env(safe-area-inset-bottom)); background: #fff; border-top: 1px solid #e5e7eb; box-shadow: 0 -10rpx 30rpx rgba(15,23,42,.08); }
.bottom view { min-height: 76rpx; display: flex; align-items: center; justify-content: center; border-radius: 6px; font-size: 25rpx; font-weight: 900; }
.ghost { background: #f3f4f6; color: #344054; }
.save { background: #e6f2ef; color: #0f766e; }
.publish { background: #0f766e; color: #fff; }
.disabled { opacity: .55; }
</style>
