<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api, downloadFile } from "../api";

const loading = ref(false);
const savingSetting = ref(false);
const savingCase = ref(false);
const activeTab = ref("settings");
const settingId = ref<number | null>(null);
const cases = ref<any[]>([]);
const applications = ref<any[]>([]);
const volunteerTasks = ref<any[]>([]);
const volunteerApplications = ref<any[]>([]);
const followups = ref<any[]>([]);
const applicationFilter = reactive({ keyword: "", status: "", priority: "", source: "" });
const caseDialogVisible = ref(false);
const taskDialogVisible = ref(false);
const followupDialogVisible = ref(false);
const editingCaseId = ref<number | null>(null);
const editingTaskId = ref<number | null>(null);
const activeApplication = ref<any | null>(null);
const caseForm = reactive({ name: "", field: "", avatarUrl: "", metrics: "", quote: "", sortOrder: 0, enabled: true });
const taskForm = reactive({ title: "", type: "activity_support", city: "", address: "", startAt: "", endAt: "", quota: 1, status: "open", requirement: "", description: "" });
const followupForm = reactive({ method: "wechat", result: "contacted", content: "", nextFollowAt: "" });
const serviceForm = reactive({ applicationId: 0, hours: 2, title: "", proofUrl: "", feedback: "" });

const statusText: Record<string, string> = {
  pending: "待跟进",
  contacted: "已联系",
  screened: "已初筛",
  interview: "待面谈",
  approved: "通过",
  activated: "已激活",
  rejected: "拒绝"
};
const priorityText: Record<string, string> = {
  low: "低",
  normal: "普通",
  high: "高"
};
const sourceOptions = [
  { value: "dean_recruit", label: "院长招募", type: "warning" },
  { value: "ambassador_apply", label: "大使申请", type: "danger" },
  { value: "aid_personal", label: "个人帮扶", type: "success" },
  { value: "aid_project", label: "项目帮扶", type: "success" },
  { value: "volunteer_apply", label: "志愿者", type: "success" },
  { value: "brand_story_contact", label: "品牌咨询", type: "info" },
  { value: "", label: "文化大使旧入口", type: "info" }
];
const taskStatusText: Record<string, string> = { draft: "草稿", open: "招募中", closed: "已关闭", completed: "已完成", archived: "已归档" };
const taskTypeText: Record<string, string> = { activity_support: "活动协助", checkin: "签到接待", course_assistant: "课程助教", charity_execution: "公益执行", content_spread: "内容传播", aid_followup: "帮扶回访" };
const volunteerStatusText: Record<string, string> = { pending: "待审核", approved: "已通过", rejected: "已拒绝", completed: "已完成", cancelled: "已取消" };
const defaultEntryPages = {
  brandStory: {
    eyebrow: "七维书院 · 品牌故事",
    title: "把传统文化，做成可学习、可体验、可持续运营的现代书院。",
    copy: "七维书院连接课程、活动、共修、公益与本地服务，让每一座城市都能拥有自己的学习空间。",
    primaryActionText: "申请成为院长",
    secondaryActionText: "了解帮扶计划",
    sectionTitle: "我们相信",
    items: ["文化要落到日常：不是只停留在口号里，而是变成一次晨读、一节课、一次共修和一段长期陪伴。", "书院要能运营：活动获客、课程交付、报名收款、退款审核、学员服务都应该有清晰后台承接。", "善意要可追踪：公益帮扶、学员成长和本地资源连接，都需要被记录、被服务、被持续改进。"],
    flowTitle: "一套完整的书院闭环",
    flowItems: ["品牌认知", "活动体验", "课程学习", "共修打卡", "公益帮扶", "本地书院"],
    joinTitle: "你可以如何参与"
  },
  deanRecruit: {
    eyebrow: "院长招募",
    title: "招募一批真正愿意把书院开在本地的人。",
    copy: "院长不是普通代理，而是本地学习空间的负责人：组织活动、服务学员、链接老师和公益资源。",
    sectionTitle: "适合谁",
    items: ["有本地文化空间或稳定社群", "愿意长期做课程与活动交付", "能服务学员并维护当地口碑", "认同七维书院品牌与公益理念"],
    formTitle: "提交院长申请",
    submitText: "提交院长申请",
    successMessage: "院长招募申请已进入后台，我们会尽快联系你。"
  },
  ambassadorApply: {
    eyebrow: "大使申请",
    title: "把你的热爱，变成能被更多人看见的文化服务。",
    copy: "适合讲师、主理人、内容创作者、社群组织者申请成为七维文化大使。",
    sectionTitle: "你将参与",
    items: ["课程共创", "活动共办", "品牌露出", "学员服务", "公益参与", "长期成长"],
    formTitle: "提交大使申请",
    submitText: "提交大使申请",
    successMessage: "大使申请已进入后台，我们会尽快联系你。"
  },
  aidApply: {
    eyebrow: "帮扶申请",
    title: "让需要帮助的人和愿意做事的项目，被看见、被连接、被持续服务。",
    copy: "个人可申请学习帮扶/公益名额，项目方可提交公益项目合作需求。",
    sectionTitle: "申请类型",
    items: ["个人学习帮扶", "公益项目合作", "课程/活动名额支持", "本地资源连接"],
    formTitle: "提交帮扶申请",
    submitText: "提交帮扶申请",
    successMessage: "帮扶申请已进入后台，我们会尽快联系你核实信息。"
  }
};
const entryPageSections = [
  { key: "brandStory", title: "品牌故事页", publicPath: "/#/pages/brand/story", itemLabel: "信念/说明", flow: true, actions: true },
  { key: "deanRecruit", title: "院长招募页", publicPath: "/#/pages/recruit/dean", itemLabel: "适合人群", flow: false, actions: false },
  { key: "ambassadorApply", title: "大使申请页", publicPath: "/#/pages/apply/ambassador", itemLabel: "参与权益", flow: false, actions: false },
  { key: "aidApply", title: "帮扶申请页", publicPath: "/#/pages/apply/aid", itemLabel: "帮扶方向", flow: false, actions: false }
] as const;
const settingForm = reactive<any>({
  enabled: true,
  config: {
    heroTitle: "",
    heroSubtitle: "",
    heroCopy: "",
    ctaText: "",
    originalPrice: "",
    earlyBirdPrice: "",
    quotaText: "",
    refundText: "",
    customerWechat: "",
    customerPhone: "",
    backgroundImageUrl: "",
    painPoints: [] as string[],
    solutionItems: [] as string[],
    benefits: [] as string[],
    requirements: [] as string[],
    faqs: [] as Array<{ question: string; answer: string }>,
    entryPages: normalizeEntryPages({})
  }
});

const landingUrl = computed(() => `${window.location.origin}/#/pages/ambassador/index`);
const applicationStats = computed(() => {
  const rows = applications.value || [];
  const toFollow = rows.filter((row) => ["pending", "contacted", "screened", "interview"].includes(String(row.status || ""))).length;
  const activated = rows.filter((row) => row.status === "activated").length;
  const highPriority = rows.filter((row) => row.priority === "high").length;
  const avgScore = rows.length ? rows.reduce((sum, row) => sum + scoreTotal(row), 0) / rows.length : 0;
  return [
    { label: "线索总数", value: rows.length, tip: "当前筛选条件下的全部招募与帮扶线索" },
    { label: "待跟进", value: toFollow, tip: "待跟进、已联系、已初筛、待面谈" },
    { label: "高意向", value: highPriority, tip: "线索等级为高" },
    { label: "已激活", value: activated, tip: "已经通过并进入实际运营或服务" },
    { label: "平均评分", value: avgScore.toFixed(1), tip: "五项能力评分平均值" }
  ];
});
const statusStats = computed(() => Object.entries(statusText).map(([value, label]) => ({ value, label, count: applications.value.filter((row) => row.status === value).length })));
const sourceStats = computed(() => sourceOptions.filter((item) => item.value).map((item) => ({ ...item, count: applications.value.filter((row) => row.source === item.value).length })));

async function load() {
  loading.value = true;
  try {
    const [setting, caseRows, applicationRows, tasks, taskApplications] = await Promise.all([api.get<any, any>("/admin/ambassador/settings"), api.get<any, any[]>("/admin/ambassador/cases"), api.get<any, any[]>("/admin/ambassador/applications"), api.get<any, any[]>("/admin/volunteer/tasks"), api.get<any, any[]>("/admin/volunteer/task-applications")]);
    applySetting(setting);
    cases.value = caseRows || [];
    applications.value = applicationRows || [];
    volunteerTasks.value = tasks || [];
    volunteerApplications.value = taskApplications || [];
  } catch (error: any) {
    ElMessage.error(error.message || "加载文化大使招募失败");
  } finally {
    loading.value = false;
  }
}

function applySetting(row: any) {
  settingId.value = row?.id || null;
  settingForm.enabled = row?.enabled !== false;
  const config = row?.config || {};
  Object.assign(settingForm.config, {
    heroTitle: config.heroTitle || "",
    heroSubtitle: config.heroSubtitle || "",
    heroCopy: config.heroCopy || "",
    ctaText: config.ctaText || "",
    originalPrice: config.originalPrice || "",
    earlyBirdPrice: config.earlyBirdPrice || "",
    quotaText: config.quotaText || "",
    refundText: config.refundText || "",
    customerWechat: config.customerWechat || "",
    customerPhone: config.customerPhone || "",
    backgroundImageUrl: config.backgroundImageUrl || "",
    painPoints: normalizeList(config.painPoints),
    solutionItems: normalizeList(config.solutionItems),
    benefits: normalizeList(config.benefits),
    requirements: normalizeList(config.requirements),
    faqs: normalizeFaqs(config.faqs),
    entryPages: normalizeEntryPages(config.entryPages)
  });
}

function normalizeList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item || "")).filter(Boolean) : [];
}

function normalizeFaqs(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item: any) => ({ question: item?.question || "", answer: item?.answer || "" })).filter((item) => item.question || item.answer);
}

function normalizeEntryPages(value: any) {
  return Object.fromEntries(Object.entries(defaultEntryPages).map(([key, defaults]) => {
    const remote = value?.[key] || {};
    return [key, {
      ...defaults,
      ...remote,
      items: normalizeList(remote.items).length ? normalizeList(remote.items) : [...(defaults as any).items],
      flowItems: normalizeList(remote.flowItems).length ? normalizeList(remote.flowItems) : [...((defaults as any).flowItems || [])]
    }];
  }));
}

async function saveSetting() {
  savingSetting.value = true;
  try {
    const saved = await api.patch("/admin/ambassador/settings", { enabled: settingForm.enabled, config: settingForm.config });
    applySetting(saved);
    ElMessage.success("落地页配置已保存");
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  } finally {
    savingSetting.value = false;
  }
}

function addListItem(key: "painPoints" | "solutionItems" | "benefits" | "requirements") {
  settingForm.config[key].push("");
}

function removeListItem(key: "painPoints" | "solutionItems" | "benefits" | "requirements", index: number) {
  settingForm.config[key].splice(index, 1);
}

function addFaq() {
  settingForm.config.faqs.push({ question: "", answer: "" });
}

function removeFaq(index: number) {
  settingForm.config.faqs.splice(index, 1);
}

function addEntryItem(pageKey: string, field = "items") {
  settingForm.config.entryPages[pageKey][field].push("");
}

function removeEntryItem(pageKey: string, field: string, index: number) {
  settingForm.config.entryPages[pageKey][field].splice(index, 1);
}

function openCreateCase() {
  editingCaseId.value = null;
  Object.assign(caseForm, { name: "", field: "", avatarUrl: "", metrics: "", quote: "", sortOrder: cases.value.length * 10, enabled: true });
  caseDialogVisible.value = true;
}

function openEditCase(row: any) {
  editingCaseId.value = row.id;
  Object.assign(caseForm, {
    name: row.name || "",
    field: row.field || "",
    avatarUrl: row.avatarUrl || "",
    metrics: row.metrics || "",
    quote: row.quote || "",
    sortOrder: Number(row.sortOrder || 0),
    enabled: row.enabled !== false
  });
  caseDialogVisible.value = true;
}

async function saveCase() {
  if (!caseForm.name.trim()) return ElMessage.error("请输入案例姓名/称呼");
  savingCase.value = true;
  try {
    const payload = { ...caseForm };
    if (editingCaseId.value) await api.patch(`/admin/ambassador/cases/${editingCaseId.value}`, payload);
    else await api.post("/admin/ambassador/cases", payload);
    ElMessage.success("案例已保存");
    caseDialogVisible.value = false;
    cases.value = await api.get<any, any[]>("/admin/ambassador/cases");
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  } finally {
    savingCase.value = false;
  }
}

async function loadApplications() {
  const params = new URLSearchParams();
  if (applicationFilter.keyword.trim()) params.set("keyword", applicationFilter.keyword.trim());
  if (applicationFilter.status) params.set("status", applicationFilter.status);
  if (applicationFilter.priority) params.set("priority", applicationFilter.priority);
  if (applicationFilter.source.trim()) params.set("source", applicationFilter.source.trim());
  applications.value = await api.get<any, any[]>(`/admin/ambassador/applications${params.toString() ? `?${params}` : ""}`);
}

async function updateApplication(row: any) {
  try {
    const saved = await api.patch(`/admin/ambassador/applications/${row.id}`, { status: row.status, remark: row.remark || "", assignee: row.assignee || "", priority: row.priority || "normal", nextFollowAt: row.nextFollowAt || "", cityResourceScore: Number(row.cityResourceScore || 0), communityScore: Number(row.communityScore || 0), contentScore: Number(row.contentScore || 0), charityScore: Number(row.charityScore || 0), deliveryScore: Number(row.deliveryScore || 0) });
    Object.assign(row, saved);
    ElMessage.success("跟进状态已保存");
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  }
}

async function openFollowups(row: any) {
  activeApplication.value = row;
  Object.assign(followupForm, { method: "wechat", result: "contacted", content: "", nextFollowAt: row.nextFollowAt || "" });
  followups.value = await api.get<any, any[]>(`/admin/ambassador/applications/${row.id}/followups`);
  followupDialogVisible.value = true;
}

async function saveFollowup() {
  if (!activeApplication.value) return;
  if (!followupForm.content.trim()) return ElMessage.error("请输入跟进内容");
  try {
    await api.post(`/admin/ambassador/applications/${activeApplication.value.id}/followups`, followupForm);
    ElMessage.success("跟进记录已保存");
    await openFollowups(activeApplication.value);
    await loadApplications();
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  }
}

function openCreateTask() {
  editingTaskId.value = null;
  Object.assign(taskForm, { title: "", type: "activity_support", city: "", address: "", startAt: "", endAt: "", quota: 1, status: "open", requirement: "", description: "" });
  taskDialogVisible.value = true;
}

function openEditTask(row: any) {
  editingTaskId.value = row.id;
  Object.assign(taskForm, { title: row.title || "", type: row.type || "activity_support", city: row.city || "", address: row.address || "", startAt: row.startAt ? formatTime(row.startAt) : "", endAt: row.endAt ? formatTime(row.endAt) : "", quota: Number(row.quota || 1), status: row.status || "open", requirement: row.requirement || "", description: row.description || "" });
  taskDialogVisible.value = true;
}

async function saveTask() {
  if (!taskForm.title.trim()) return ElMessage.error("请输入任务标题");
  if (!taskForm.city.trim()) return ElMessage.error("请输入城市");
  try {
    const payload = { ...taskForm, address: taskForm.address || undefined, startAt: taskForm.startAt || undefined, endAt: taskForm.endAt || undefined };
    if (editingTaskId.value) await api.patch(`/admin/volunteer/tasks/${editingTaskId.value}`, payload);
    else await api.post("/admin/volunteer/tasks", payload);
    ElMessage.success("志愿任务已保存");
    taskDialogVisible.value = false;
    volunteerTasks.value = await api.get<any, any[]>("/admin/volunteer/tasks");
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  }
}

async function updateVolunteerApplication(row: any) {
  try {
    const saved = await api.patch(`/admin/volunteer/task-applications/${row.id}`, { status: row.status, remark: row.remark || "" });
    Object.assign(row, saved);
    ElMessage.success("志愿报名状态已保存");
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  }
}

async function createServiceRecord(row: any) {
  Object.assign(serviceForm, { applicationId: row.id, hours: 2, title: row.task?.title || "志愿服务", proofUrl: "", feedback: "" });
  const { value: hours } = await ElMessageBox.prompt("请输入本次服务时长（小时）", "登记服务记录", { inputValue: String(serviceForm.hours), confirmButtonText: "下一步", cancelButtonText: "取消" });
  serviceForm.hours = Number(hours || 0);
  if (!Number.isFinite(serviceForm.hours) || serviceForm.hours < 0) return ElMessage.error("服务时长不正确");
  const { value: feedback } = await ElMessageBox.prompt("填写服务评价或完成说明", "服务说明", { inputType: "textarea", inputValue: "任务已完成", confirmButtonText: "登记", cancelButtonText: "取消" });
  try {
    await api.post("/admin/volunteer/service-records", { ...serviceForm, feedback });
    ElMessage.success("服务记录已登记");
    volunteerApplications.value = await api.get<any, any[]>("/admin/volunteer/task-applications");
  } catch (error: any) {
    ElMessage.error(error.message || "登记失败");
  }
}

function scoreTotal(row: any) {
  return ["cityResourceScore", "communityScore", "contentScore", "charityScore", "deliveryScore"].reduce((sum, key) => sum + Number(row[key] || 0), 0);
}

async function exportApplications() {
  const params: Record<string, unknown> = {};
  if (applicationFilter.keyword.trim()) params.keyword = applicationFilter.keyword.trim();
  if (applicationFilter.status) params.status = applicationFilter.status;
  if (applicationFilter.priority) params.priority = applicationFilter.priority;
  if (applicationFilter.source.trim()) params.source = applicationFilter.source.trim();
  await downloadFile(`/admin/ambassador/applications/export?${new URLSearchParams(params as Record<string, string>).toString()}`, "招募帮扶线索.xlsx");
}

async function copyWechatScript(row: any) {
  const source = sourceMeta(row.source);
  const text = `你好${row.name || "老师"}，我是七维书院${source.label}的跟进人。看到你提交的方向是「${row.expertise || "传统文化/教育"}」，想和你约一个10分钟沟通，了解你的情况和下一步合作/帮扶方式。你今天或明天哪个时间方便？`;
  await navigator.clipboard.writeText(text);
  ElMessage.success("微信跟进话术已复制");
}

async function copyLandingUrl() {
  await navigator.clipboard.writeText(landingUrl.value);
  ElMessage.success("落地页链接已复制");
}

function formatTime(value?: string) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

function sourceMeta(value?: string | null) {
  return sourceOptions.find((item) => item.value === String(value || "")) || { value: value || "", label: value || "未标记来源", type: "info" };
}

function sourceTip(value?: string | null) {
  const source = String(value || "");
  if (source === "dean_recruit") return "本地书院院长/负责人申请";
  if (source === "ambassador_apply") return "文化大使、讲师、主理人申请";
  if (source === "aid_personal") return "个人学习帮扶、公益名额申请";
  if (source === "aid_project") return "公益项目方提交合作/帮扶项目";
  if (source === "volunteer_apply") return "公益志愿者申请";
  if (source === "brand_story_contact") return "品牌故事页咨询线索";
  return "旧版文化大使入口或未标记来源";
}

onMounted(load);
</script>

<template>
  <div class="page" v-loading="loading">
    <div class="toolbar">
      <div>
        <h2>公益与招募线索</h2>
        <p>统一管理院长招募、大使申请、个人帮扶、项目帮扶等前台提交线索。</p>
      </div>
      <div class="toolbar-actions">
        <el-button @click="load">刷新</el-button>
        <el-button type="primary" @click="copyLandingUrl">复制落地页链接</el-button>
      </div>
    </div>

    <el-alert class="page-hint" type="info" :closable="false" show-icon>
      <template #title>公开链接：{{ landingUrl }}</template>
    </el-alert>

    <el-tabs v-model="activeTab" class="tabs">
      <el-tab-pane label="落地页配置" name="settings">
        <div class="table-card">
          <el-form :model="settingForm" label-width="116px">
            <el-form-item label="启用页面"><el-switch v-model="settingForm.enabled" /></el-form-item>
            <el-form-item label="主标题"><el-input v-model="settingForm.config.heroTitle" maxlength="80" /></el-form-item>
            <el-form-item label="副标题"><el-input v-model="settingForm.config.heroSubtitle" maxlength="120" /></el-form-item>
            <el-form-item label="主文案"><el-input v-model="settingForm.config.heroCopy" type="textarea" :rows="2" maxlength="240" /></el-form-item>
            <el-form-item label="按钮文案"><el-input v-model="settingForm.config.ctaText" maxlength="40" /></el-form-item>
            <el-form-item label="价格">
              <div class="inline-fields">
                <el-input v-model="settingForm.config.originalPrice" placeholder="原价" />
                <el-input v-model="settingForm.config.earlyBirdPrice" placeholder="早鸟价" />
              </div>
            </el-form-item>
            <el-form-item label="名额文案"><el-input v-model="settingForm.config.quotaText" maxlength="120" /></el-form-item>
            <el-form-item label="退款承诺"><el-input v-model="settingForm.config.refundText" maxlength="160" /></el-form-item>
            <el-form-item label="客服信息">
              <div class="inline-fields">
                <el-input v-model="settingForm.config.customerWechat" placeholder="客服微信" />
                <el-input v-model="settingForm.config.customerPhone" placeholder="客服电话" />
              </div>
            </el-form-item>
            <el-form-item label="头图背景"><el-input v-model="settingForm.config.backgroundImageUrl" placeholder="图片 URL，可为空" maxlength="500" /></el-form-item>
          </el-form>
        </div>

        <div class="grid-two">
          <div class="table-card" v-for="block in [
            { key: 'painPoints', title: '痛点共鸣' },
            { key: 'solutionItems', title: '解决方案' },
            { key: 'benefits', title: '权益清单' },
            { key: 'requirements', title: '申请条件' }
          ]" :key="block.key">
            <div class="table-head">
              <h3>{{ block.title }}</h3>
              <el-button size="small" @click="addListItem(block.key as any)">新增</el-button>
            </div>
            <div class="repeat-row" v-for="(_item, index) in settingForm.config[block.key]" :key="index">
              <el-input v-model="settingForm.config[block.key][index]" type="textarea" :rows="2" />
              <el-button text type="danger" @click="removeListItem(block.key as any, index)">删除</el-button>
            </div>
          </div>
        </div>

        <div class="table-card">
          <div class="table-head">
            <h3>常见问题</h3>
            <el-button size="small" @click="addFaq">新增 FAQ</el-button>
          </div>
          <div class="faq-row" v-for="(_faq, index) in settingForm.config.faqs" :key="index">
            <el-input v-model="settingForm.config.faqs[index].question" placeholder="问题" />
            <el-input v-model="settingForm.config.faqs[index].answer" type="textarea" :rows="2" placeholder="回答" />
            <el-button text type="danger" @click="removeFaq(index)">删除</el-button>
          </div>
        </div>

        <div class="table-card">
          <div class="table-head">
            <div>
              <h3>四入口页面内容</h3>
              <p class="muted">修改首页“品牌故事、院长招募、大使申请、帮扶申请”进入后的 H5/小程序页面文案。</p>
            </div>
          </div>
          <el-collapse class="entry-collapse">
            <el-collapse-item v-for="page in entryPageSections" :key="page.key" :title="page.title" :name="page.key">
              <el-alert type="info" :closable="false" class="entry-link">
                <template #title>前台路径：{{ page.publicPath }}</template>
              </el-alert>
              <el-form :model="settingForm.config.entryPages[page.key]" label-width="112px">
                <el-form-item label="顶部小标题"><el-input v-model="settingForm.config.entryPages[page.key].eyebrow" maxlength="60" /></el-form-item>
                <el-form-item label="大标题"><el-input v-model="settingForm.config.entryPages[page.key].title" type="textarea" :rows="2" maxlength="160" /></el-form-item>
                <el-form-item label="说明文案"><el-input v-model="settingForm.config.entryPages[page.key].copy" type="textarea" :rows="2" maxlength="260" /></el-form-item>
                <el-form-item label="内容标题"><el-input v-model="settingForm.config.entryPages[page.key].sectionTitle" maxlength="60" /></el-form-item>
                <el-form-item v-if="page.actions" label="按钮文案">
                  <div class="inline-fields">
                    <el-input v-model="settingForm.config.entryPages[page.key].primaryActionText" placeholder="主按钮" maxlength="40" />
                    <el-input v-model="settingForm.config.entryPages[page.key].secondaryActionText" placeholder="次按钮" maxlength="40" />
                  </div>
                </el-form-item>
                <el-form-item :label="page.itemLabel">
                  <div class="entry-list">
                    <div class="repeat-row" v-for="(_item, index) in settingForm.config.entryPages[page.key].items" :key="index">
                      <el-input v-model="settingForm.config.entryPages[page.key].items[index]" type="textarea" :rows="2" />
                      <el-button text type="danger" @click="removeEntryItem(page.key, 'items', index)">删除</el-button>
                    </div>
                    <el-button size="small" @click="addEntryItem(page.key, 'items')">新增一项</el-button>
                  </div>
                </el-form-item>
                <template v-if="page.flow">
                  <el-form-item label="闭环标题"><el-input v-model="settingForm.config.entryPages[page.key].flowTitle" maxlength="60" /></el-form-item>
                  <el-form-item label="闭环步骤">
                    <div class="entry-list">
                      <div class="repeat-row" v-for="(_item, index) in settingForm.config.entryPages[page.key].flowItems" :key="index">
                        <el-input v-model="settingForm.config.entryPages[page.key].flowItems[index]" />
                        <el-button text type="danger" @click="removeEntryItem(page.key, 'flowItems', index)">删除</el-button>
                      </div>
                      <el-button size="small" @click="addEntryItem(page.key, 'flowItems')">新增步骤</el-button>
                    </div>
                  </el-form-item>
                  <el-form-item label="参与标题"><el-input v-model="settingForm.config.entryPages[page.key].joinTitle" maxlength="60" /></el-form-item>
                </template>
                <template v-else>
                  <el-form-item label="表单标题"><el-input v-model="settingForm.config.entryPages[page.key].formTitle" maxlength="60" /></el-form-item>
                  <el-form-item label="提交按钮"><el-input v-model="settingForm.config.entryPages[page.key].submitText" maxlength="40" /></el-form-item>
                  <el-form-item label="成功提示"><el-input v-model="settingForm.config.entryPages[page.key].successMessage" type="textarea" :rows="2" maxlength="160" /></el-form-item>
                </template>
              </el-form>
            </el-collapse-item>
          </el-collapse>
        </div>

        <div class="table-card">
          <div class="save-line">
            <el-button type="primary" :loading="savingSetting" @click="saveSetting">保存落地页配置</el-button>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="案例管理" name="cases">
        <div class="table-card">
          <div class="table-head">
            <h3>案例背书</h3>
            <el-button type="primary" @click="openCreateCase">新增案例</el-button>
          </div>
          <el-table :data="cases" stripe empty-text="暂无案例；未发布案例时 H5 不展示案例区">
            <el-table-column prop="name" label="姓名/称呼" width="140" />
            <el-table-column prop="field" label="领域" width="140" />
            <el-table-column prop="metrics" label="成果数据" min-width="180" show-overflow-tooltip />
            <el-table-column prop="quote" label="引用语" min-width="240" show-overflow-tooltip />
            <el-table-column prop="sortOrder" label="排序" width="90" />
            <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "展示" : "隐藏" }}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="120" fixed="right"><template #default="{ row }"><el-button size="small" @click="openEditCase(row)">编辑</el-button></template></el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="申请线索" name="applications">
        <div class="table-card">
          <div class="table-head">
            <h3>申请线索</h3>
            <div class="filters">
              <el-input v-model="applicationFilter.keyword" clearable placeholder="搜索姓名/手机/城市/微信" @keyup.enter="loadApplications" />
              <el-select v-model="applicationFilter.source" clearable placeholder="申请类型">
                <el-option v-for="item in sourceOptions.filter((source) => source.value)" :key="item.value" :label="item.label" :value="item.value" />
              </el-select>
              <el-select v-model="applicationFilter.status" clearable placeholder="状态">
                <el-option v-for="(label, value) in statusText" :key="value" :label="label" :value="value" />
              </el-select>
              <el-select v-model="applicationFilter.priority" clearable placeholder="线索等级">
                <el-option v-for="(label, value) in priorityText" :key="value" :label="label" :value="value" />
              </el-select>
              <el-button @click="loadApplications">筛选</el-button>
              <el-button @click="exportApplications">导出 Excel</el-button>
            </div>
          </div>
          <div class="funnel-dashboard">
            <div v-for="item in applicationStats" :key="item.label" class="funnel-stat">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
              <small>{{ item.tip }}</small>
            </div>
          </div>
          <div class="funnel-bars">
            <div>
              <h4>状态分布</h4>
              <div v-for="item in statusStats" :key="item.value" class="funnel-bar">
                <span>{{ item.label }}</span>
                <el-progress :percentage="applications.length ? Math.round((item.count / applications.length) * 100) : 0" :stroke-width="8" :show-text="false" />
                <strong>{{ item.count }}</strong>
              </div>
            </div>
            <div>
              <h4>来源分布</h4>
              <div v-for="item in sourceStats" :key="item.value" class="funnel-bar">
                <span>{{ item.label }}</span>
                <el-progress :percentage="applications.length ? Math.round((item.count / applications.length) * 100) : 0" :stroke-width="8" :show-text="false" />
                <strong>{{ item.count }}</strong>
              </div>
            </div>
          </div>
          <el-table :data="applications" stripe empty-text="暂无申请">
            <el-table-column label="申请类型" width="130" fixed="left">
              <template #default="{ row }">
                <el-tooltip :content="sourceTip(row.source)" placement="top">
                  <el-tag :type="sourceMeta(row.source).type as any">{{ sourceMeta(row.source).label }}</el-tag>
                </el-tooltip>
              </template>
            </el-table-column>
            <el-table-column prop="name" label="姓名" width="100" />
            <el-table-column prop="phone" label="手机号" width="130" />
            <el-table-column prop="city" label="城市" width="110" />
            <el-table-column prop="expertise" label="方向/需求" min-width="180" show-overflow-tooltip />
            <el-table-column prop="wechat" label="微信号" width="140" />
            <el-table-column prop="channelCode" label="渠道码" width="120" />
            <el-table-column prop="experience" label="申请说明" min-width="260" show-overflow-tooltip />
            <el-table-column label="等级" width="110">
              <template #default="{ row }">
                <el-select v-model="row.priority" size="small" @change="updateApplication(row)">
                  <el-option v-for="(label, value) in priorityText" :key="value" :label="label" :value="value" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="评分" width="220">
              <template #default="{ row }">
                <div class="score-row">
                  <el-input-number v-model="row.cityResourceScore" size="small" :min="0" :max="5" controls-position="right" @change="updateApplication(row)" />
                  <el-input-number v-model="row.communityScore" size="small" :min="0" :max="5" controls-position="right" @change="updateApplication(row)" />
                  <span>合计 {{ scoreTotal(row) }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="跟进人" width="140">
              <template #default="{ row }"><el-input v-model="row.assignee" size="small" placeholder="跟进人" @change="updateApplication(row)" /></template>
            </el-table-column>
            <el-table-column label="下次跟进" width="190">
              <template #default="{ row }"><el-date-picker v-model="row.nextFollowAt" size="small" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" @change="updateApplication(row)" /></template>
            </el-table-column>
            <el-table-column label="状态" width="130">
              <template #default="{ row }">
                <el-select v-model="row.status" size="small" @change="updateApplication(row)">
                  <el-option v-for="(label, value) in statusText" :key="value" :label="label" :value="value" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="220">
              <template #default="{ row }"><el-input v-model="row.remark" size="small" placeholder="跟进备注" @change="updateApplication(row)" /></template>
            </el-table-column>
            <el-table-column label="提交时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
            <el-table-column label="操作" width="190" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="openFollowups(row)">跟进</el-button>
                <el-button size="small" @click="copyWechatScript(row)">话术</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane label="志愿任务" name="volunteer">
        <div class="table-card">
          <div class="table-head">
            <h3>志愿任务</h3>
            <el-button type="primary" @click="openCreateTask">新增任务</el-button>
          </div>
          <el-table :data="volunteerTasks" stripe empty-text="暂无志愿任务">
            <el-table-column prop="title" label="任务" min-width="180" show-overflow-tooltip />
            <el-table-column label="类型" width="120"><template #default="{ row }">{{ taskTypeText[row.type] || row.type }}</template></el-table-column>
            <el-table-column prop="city" label="城市" width="110" />
            <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.startAt) }}</template></el-table-column>
            <el-table-column prop="quota" label="名额" width="80" />
            <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag>{{ taskStatusText[row.status] || row.status }}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="100" fixed="right"><template #default="{ row }"><el-button size="small" @click="openEditTask(row)">编辑</el-button></template></el-table-column>
          </el-table>
        </div>

        <div class="table-card">
          <div class="table-head">
            <h3>任务报名</h3>
          </div>
          <el-table :data="volunteerApplications" stripe empty-text="暂无任务报名">
            <el-table-column label="任务" min-width="180" show-overflow-tooltip><template #default="{ row }">{{ row.task?.title || "-" }}</template></el-table-column>
            <el-table-column prop="name" label="姓名" width="100" />
            <el-table-column prop="phone" label="手机号" width="130" />
            <el-table-column prop="city" label="城市" width="110" />
            <el-table-column prop="message" label="说明" min-width="220" show-overflow-tooltip />
            <el-table-column label="状态" width="130">
              <template #default="{ row }">
                <el-select v-model="row.status" size="small" @change="updateVolunteerApplication(row)">
                  <el-option v-for="(label, value) in volunteerStatusText" :key="value" :label="label" :value="value" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="180"><template #default="{ row }"><el-input v-model="row.remark" size="small" @change="updateVolunteerApplication(row)" /></template></el-table-column>
            <el-table-column label="操作" width="130" fixed="right"><template #default="{ row }"><el-button size="small" type="primary" @click="createServiceRecord(row)">登记完成</el-button></template></el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="followupDialogVisible" :title="activeApplication ? `跟进记录：${activeApplication.name}` : '跟进记录'" width="680px" destroy-on-close>
      <el-form :model="followupForm" label-width="96px">
        <el-form-item label="沟通方式"><el-input v-model="followupForm.method" maxlength="40" placeholder="微信/电话/面谈" /></el-form-item>
        <el-form-item label="结果">
          <el-select v-model="followupForm.result">
            <el-option label="已联系" value="contacted" />
            <el-option label="已初筛" value="screened" />
            <el-option label="待面谈" value="interview" />
            <el-option label="通过" value="approved" />
            <el-option label="已激活" value="activated" />
            <el-option label="拒绝" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item label="下次跟进"><el-date-picker v-model="followupForm.nextFollowAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item>
        <el-form-item label="跟进内容"><el-input v-model="followupForm.content" type="textarea" :rows="4" /></el-form-item>
      </el-form>
      <el-button type="primary" @click="saveFollowup">保存跟进</el-button>
      <div class="followup-list">
        <div v-for="item in followups" :key="item.id" class="followup-item">
          <strong>{{ item.result }} · {{ item.method }}</strong>
          <span>{{ formatTime(item.createdAt) }} · {{ item.operator?.username || "平台" }}</span>
          <p>{{ item.content }}</p>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="taskDialogVisible" :title="editingTaskId ? '编辑志愿任务' : '新增志愿任务'" width="620px" destroy-on-close>
      <el-form :model="taskForm" label-width="96px">
        <el-form-item label="任务标题" required><el-input v-model="taskForm.title" maxlength="120" /></el-form-item>
        <el-form-item label="任务类型">
          <el-select v-model="taskForm.type">
            <el-option v-for="(label, value) in taskTypeText" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="城市" required><el-input v-model="taskForm.city" maxlength="80" /></el-form-item>
        <el-form-item label="地点"><el-input v-model="taskForm.address" maxlength="160" /></el-form-item>
        <el-form-item label="时间">
          <div class="inline-fields">
            <el-date-picker v-model="taskForm.startAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="开始" />
            <el-date-picker v-model="taskForm.endAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="结束" />
          </div>
        </el-form-item>
        <el-form-item label="名额"><el-input-number v-model="taskForm.quota" :min="1" /></el-form-item>
        <el-form-item label="状态"><el-select v-model="taskForm.status"><el-option v-for="(label, value) in taskStatusText" :key="value" :label="label" :value="value" /></el-select></el-form-item>
        <el-form-item label="要求"><el-input v-model="taskForm.requirement" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="说明"><el-input v-model="taskForm.description" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="taskDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTask">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="caseDialogVisible" :title="editingCaseId ? '编辑案例' : '新增案例'" width="560px" destroy-on-close>
      <el-form :model="caseForm" label-width="96px">
        <el-form-item label="姓名/称呼" required><el-input v-model="caseForm.name" maxlength="80" /></el-form-item>
        <el-form-item label="领域"><el-input v-model="caseForm.field" maxlength="80" /></el-form-item>
        <el-form-item label="照片 URL"><el-input v-model="caseForm.avatarUrl" maxlength="500" /></el-form-item>
        <el-form-item label="成果数据"><el-input v-model="caseForm.metrics" maxlength="160" placeholder="例如：课程售出 300 份，线下转化 20 人" /></el-form-item>
        <el-form-item label="引用语"><el-input v-model="caseForm.quote" type="textarea" :rows="3" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="caseForm.sortOrder" :step="10" /></el-form-item>
        <el-form-item label="是否展示"><el-switch v-model="caseForm.enabled" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="caseDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingCase" @click="saveCase">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.toolbar,
.table-head {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
}
.toolbar h2,
.table-head h3,
.table-card h3 {
  margin: 0;
}
.toolbar p {
  margin: 6px 0 0;
  color: #667085;
}
.muted {
  margin: 6px 0 0;
  color: #667085;
  font-size: 13px;
}
.toolbar-actions,
.filters,
.inline-fields {
  display: flex;
  gap: 10px;
  align-items: center;
}
.page-hint {
  border-radius: 8px;
}
.table-card {
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}
.funnel-dashboard {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  margin: 14px 0;
}
.funnel-stat {
  min-height: 92px;
  padding: 12px;
  border: 1px solid #eef2f7;
  border-radius: 8px;
  background: #f8fafc;
}
.funnel-stat span,
.funnel-stat strong,
.funnel-stat small {
  display: block;
}
.funnel-stat span {
  color: #667085;
  font-size: 13px;
}
.funnel-stat strong {
  margin-top: 8px;
  color: #101828;
  font-size: 24px;
}
.funnel-stat small {
  margin-top: 6px;
  color: #98a2b3;
  line-height: 1.4;
}
.funnel-bars {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 14px;
}
.funnel-bars h4 {
  margin: 0 0 8px;
}
.funnel-bar {
  display: grid;
  grid-template-columns: 80px minmax(0, 1fr) 36px;
  align-items: center;
  gap: 8px;
  min-height: 28px;
}
.funnel-bar span,
.funnel-bar strong {
  font-size: 13px;
}
.tabs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.grid-two {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.repeat-row,
.faq-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: start;
  margin-top: 10px;
}
.faq-row {
  grid-template-columns: 240px 1fr auto;
}
.save-line {
  margin-top: 16px;
}
.entry-collapse {
  margin-top: 12px;
}
.entry-link {
  margin-bottom: 14px;
}
.entry-list {
  width: 100%;
}
.score-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.score-row :deep(.el-input-number) {
  width: 64px;
}
.score-row span {
  color: #667085;
  font-size: 12px;
}
.followup-list {
  margin-top: 18px;
  border-top: 1px solid #eef2f7;
}
.followup-item {
  padding: 12px 0;
  border-bottom: 1px solid #eef2f7;
}
.followup-item strong,
.followup-item span {
  display: block;
}
.followup-item span {
  margin-top: 4px;
  color: #667085;
  font-size: 12px;
}
.followup-item p {
  margin: 8px 0 0;
  color: #344054;
  white-space: pre-wrap;
}
@media (max-width: 900px) {
  .toolbar,
  .table-head,
  .toolbar-actions,
  .filters,
  .inline-fields {
    align-items: stretch;
    flex-direction: column;
  }
  .grid-two,
  .funnel-dashboard,
  .funnel-bars,
  .repeat-row,
  .faq-row {
    grid-template-columns: 1fr;
  }
  .funnel-bar {
    grid-template-columns: 72px minmax(0, 1fr) 32px;
  }
}
</style>
