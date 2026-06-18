<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { api, downloadFile } from "../api";

const loading = ref(false);
const savingSetting = ref(false);
const savingCase = ref(false);
const activeTab = ref("settings");
const settingId = ref<number | null>(null);
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
    faqs: [] as Array<{ question: string; answer: string }>
  }
});
const cases = ref<any[]>([]);
const applications = ref<any[]>([]);
const applicationFilter = reactive({ keyword: "", status: "", priority: "", source: "" });
const caseDialogVisible = ref(false);
const editingCaseId = ref<number | null>(null);
const caseForm = reactive({ name: "", field: "", avatarUrl: "", metrics: "", quote: "", sortOrder: 0, enabled: true });

const statusText: Record<string, string> = {
  pending: "待跟进",
  contacted: "已联系",
  approved: "通过",
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
  { value: "brand_story_contact", label: "品牌咨询", type: "info" },
  { value: "", label: "文化大使旧入口", type: "info" }
];

const landingUrl = computed(() => `${window.location.origin}/#/pages/ambassador/index`);

async function load() {
  loading.value = true;
  try {
    const [setting, caseRows, applicationRows] = await Promise.all([api.get<any, any>("/admin/ambassador/settings"), api.get<any, any[]>("/admin/ambassador/cases"), api.get<any, any[]>("/admin/ambassador/applications")]);
    applySetting(setting);
    cases.value = caseRows || [];
    applications.value = applicationRows || [];
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
    faqs: normalizeFaqs(config.faqs)
  });
}

function normalizeList(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item || "")).filter(Boolean) : [];
}

function normalizeFaqs(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item: any) => ({ question: item?.question || "", answer: item?.answer || "" })).filter((item) => item.question || item.answer);
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
    const saved = await api.patch(`/admin/ambassador/applications/${row.id}`, { status: row.status, remark: row.remark || "", assignee: row.assignee || "", priority: row.priority || "normal", nextFollowAt: row.nextFollowAt || "" });
    Object.assign(row, saved);
    ElMessage.success("跟进状态已保存");
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  }
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
            <el-table-column label="操作" width="140" fixed="right">
              <template #default="{ row }"><el-button size="small" @click="copyWechatScript(row)">复制话术</el-button></template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

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
  .repeat-row,
  .faq-row {
    grid-template-columns: 1fr;
  }
}
</style>
