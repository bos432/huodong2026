<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { CircleCheck, Download, UploadFilled, View } from "@element-plus/icons-vue";
import { api, downloadFile } from "../api";
import { h5RoutePreviewUrl } from "../h5-preview";

const loading = ref(false);
const errorMessage = ref("");
const exportingProfiles = ref(false);
const exportingRecords = ref(false);
const activeTab = ref("profiles");
const profiles = ref<any[]>([]);
const records = ref<any[]>([]);
const taskApplications = ref<any[]>([]);
const profilePagination = reactive({ page: 1, pageSize: 10 });
const recordPagination = reactive({ page: 1, pageSize: 10 });
const applicationPagination = reactive({ page: 1, pageSize: 10 });
const overview = ref<any>({ kpis: {}, todos: [], alerts: [] });
const serviceDialogVisible = ref(false);
const serviceTarget = ref<any | null>(null);
const certificateDialogVisible = ref(false);
const certificateTarget = ref<any | null>(null);
const profileCertificates = ref<any[]>([]);
const certificateLoading = ref(false);
const certificateError = ref("");
const certificateActionId = ref<number | null>(null);
const selectedCertificateId = ref<number | null>(null);
const certificatePreviewUrl = ref("");
const certificatePreviewLoading = ref(false);
const certificatePreviewError = ref("");
let certificatePreviewSerial = 0;
const profileActionKey = ref("");
const applicationActionId = ref<number | null>(null);
const serviceActionKey = ref("");
const proofActionId = ref<number | null>(null);
const serviceSaving = ref(false);
const profileFilter = reactive({ keyword: "", status: "", level: "", city: "" });
const recordFilter = reactive({ keyword: "", city: "", startDate: "", endDate: "" });
const applicationFilter = reactive({ status: "" });
const serviceForm = reactive({ applicationId: 0, hours: 2, title: "", proofUrl: "", feedback: "任务已完成" });

const profileStatusText: Record<string, string> = { pending: "待审核", approved: "已通过", rejected: "已拒绝", inactive: "已停用" };
const levelText: Record<string, string> = { participant: "公益参与者", volunteer: "公益志愿者", ambassador: "公益大使", city_builder: "城市共建者" };
const applicationStatusText: Record<string, string> = { pending: "待审核", admitted: "已录取", approved: "已录取", waitlisted: "候补中", rejected: "已拒绝", replaced: "已替补", checked_in: "已签到", completed: "已完成", cancelled: "已取消" };
const taskTypeText: Record<string, string> = { activity_support: "活动协助", checkin: "签到接待", course_assistant: "课程助教", charity_execution: "公益执行", content_spread: "内容传播", aid_followup: "帮扶回访" };

const overviewAlerts = computed(() => Array.isArray(overview.value?.alerts) ? overview.value.alerts : []);
const profileStats = computed(() => {
  const kpis = overview.value?.kpis || {};
  const totalHours = kpis.totalServiceHours ?? profiles.value.reduce((sum, row) => sum + Number(row.serviceHours || 0), 0);
  return [
    { label: "志愿者档案", value: kpis.totalProfiles ?? profiles.value.length },
    { label: "已通过", value: kpis.approvedProfiles ?? profiles.value.filter((row) => row.status === "approved").length },
    { label: "待审核", value: kpis.pendingProfiles ?? profiles.value.filter((row) => row.status === "pending").length },
    { label: "服务时长", value: Number(totalHours || 0).toFixed(1) },
    { label: "已发证书", value: kpis.issuedCertificates || 0 },
    { label: "待发证书", value: kpis.pendingCertificates || 0 }
  ];
});
const pagedProfiles = computed(() => profiles.value.slice((profilePagination.page - 1) * profilePagination.pageSize, profilePagination.page * profilePagination.pageSize));
const pagedRecords = computed(() => records.value.slice((recordPagination.page - 1) * recordPagination.pageSize, recordPagination.page * recordPagination.pageSize));
const pagedTaskApplications = computed(() => taskApplications.value.slice((applicationPagination.page - 1) * applicationPagination.pageSize, applicationPagination.page * applicationPagination.pageSize));

watch(profileFilter, () => { profilePagination.page = 1; }, { deep: true });
watch(recordFilter, () => { recordPagination.page = 1; }, { deep: true });
watch(applicationFilter, () => { applicationPagination.page = 1; }, { deep: true });

async function loadAll() {
  loading.value = true;
  errorMessage.value = "";
  try {
    await Promise.all([loadOverview(), loadProfiles(), loadRecords(), loadTaskApplications()]);
  } catch (error: any) {
    errorMessage.value = error.message || "加载志愿者数据失败";
    ElMessage.error(errorMessage.value);
  } finally {
    loading.value = false;
  }
}

async function loadOverview() {
  overview.value = await api.get<any, any>("/admin/volunteer/overview");
}

function buildQuery(filters: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    const text = String(value || "").trim();
    if (text) params.set(key, text);
  });
  return params.toString();
}

async function loadProfiles() {
  const query = buildQuery(profileFilter);
  profiles.value = await api.get<any, any[]>(`/admin/volunteer/profiles${query ? `?${query}` : ""}`);
}

async function loadRecords() {
  const query = buildQuery(recordFilter);
  records.value = await api.get<any, any[]>(`/admin/volunteer/service-records${query ? `?${query}` : ""}`);
}

async function loadTaskApplications() {
  const query = applicationFilter.status ? `?status=${encodeURIComponent(applicationFilter.status)}` : "";
  taskApplications.value = await api.get<any, any[]>(`/admin/volunteer/task-applications${query}`);
}

async function updateProfile(row: any) {
  const key = `profile:${row.id}`;
  if (profileActionKey.value) return;
  profileActionKey.value = key;
  try {
    const saved = await api.patch(`/admin/volunteer/profiles/${row.id}`, { status: row.status, level: row.level, remark: row.remark || "" });
    Object.assign(row, saved);
    ElMessage.success("志愿者档案已更新");
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
    try { await loadProfiles(); } catch { /* 保留原错误提示 */ }
  } finally {
    profileActionKey.value = "";
  }
}

async function issueCertificate(row: any) {
  if (!row.user?.id) return ElMessage.warning("该志愿者档案尚未绑定用户账号，需用户登录后申请或报名志愿任务");
  const key = `certificate:${row.id}`;
  if (profileActionKey.value) return;
  profileActionKey.value = key;
  try {
    await api.post(`/admin/volunteer/profiles/${row.id}/certificates`, {});
    await Promise.all([loadOverview(), loadProfiles()]);
    ElMessage.success("志愿服务证书已发放");
  } catch (error: any) {
    ElMessage.error(error.message || "发证失败");
  } finally {
    profileActionKey.value = "";
  }
}

async function addTrainingRecord(row: any) {
  const key = `training:${row.id}`;
  if (profileActionKey.value) return;
  profileActionKey.value = key;
  try {
    const titleResult = await ElMessageBox.prompt("培训名称", "登记培训资格", { inputValue: "志愿者基础培训", confirmButtonText: "下一步", cancelButtonText: "取消" });
    const hoursResult = await ElMessageBox.prompt("培训时长（小时）", "登记培训资格", { inputValue: "2", confirmButtonText: "提交", cancelButtonText: "取消" });
    const record = await api.post<any, any>(`/admin/volunteer/profiles/${row.id}/training-records`, { businessKey: `volunteer:training:${row.id}:${Date.now()}`, title: String(titleResult.value || "").trim(), trainingHours: Number(hoursResult.value || 0), completedAt: new Date().toISOString() });
    await api.patch(`/admin/volunteer/training-records/${record.id}`, { status: "approved", businessKey: `volunteer:training-review:${record.id}:${Date.now()}`, remark: "后台培训审核通过" });
    await loadProfiles();
    ElMessage.success("培训资格已登记并通过审核");
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "培训登记失败");
  } finally {
    profileActionKey.value = "";
  }
}

async function openCredentials(row: any) {
  try {
    const [badges, proofs] = await Promise.all([
      api.get<any, any[]>(`/admin/volunteer/profiles/${row.id}/badges`),
      api.get<any, any[]>(`/admin/volunteer/profiles/${row.id}/proofs`)
    ]);
    const content = `勋章：${(badges || []).filter((item) => item.status === "active").map((item) => item.definition?.name || item.definition?.code).join("、") || "暂无"}\n证明：${(proofs || []).map((item) => `${item.proofNo}（${item.status === "active" ? "有效" : "已撤销"}）`).join("、") || "暂无"}`;
    await ElMessageBox.alert(content, `凭证：${row.name}`, { confirmButtonText: "关闭" });
  } catch (error: any) { ElMessage.error(error.message || "加载凭证失败"); }
}

async function openCertificates(row: any) {
  certificateTarget.value = row;
  certificateDialogVisible.value = true;
  certificateLoading.value = true;
  certificateError.value = "";
  profileCertificates.value = [];
  try {
    profileCertificates.value = await api.get<any, any[]>(`/admin/volunteer/profiles/${row.id}/certificates`);
    const firstCertificate = profileCertificates.value[0];
    if (firstCertificate) await previewCertificate(firstCertificate);
    else clearCertificatePreview();
  } catch (error: any) {
    certificateError.value = error.message || "志愿者证书加载失败";
    ElMessage.error(certificateError.value);
  } finally {
    certificateLoading.value = false;
  }
}

function clearCertificatePreview() {
  certificatePreviewSerial += 1;
  selectedCertificateId.value = null;
  certificatePreviewLoading.value = false;
  certificatePreviewError.value = "";
  if (certificatePreviewUrl.value) URL.revokeObjectURL(certificatePreviewUrl.value);
  certificatePreviewUrl.value = "";
}

async function previewCertificate(row: any) {
  if (!row?.id) return;
  const serial = ++certificatePreviewSerial;
  selectedCertificateId.value = Number(row.id);
  certificatePreviewLoading.value = true;
  certificatePreviewError.value = "";
  if (certificatePreviewUrl.value) URL.revokeObjectURL(certificatePreviewUrl.value);
  certificatePreviewUrl.value = "";
  try {
    const token = localStorage.getItem("admin_token");
    const response = await fetch(`/api/admin/volunteer/certificates/${row.id}/download`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!response.ok) throw new Error("证书成品加载失败");
    const blob = await response.blob();
    if (serial !== certificatePreviewSerial || selectedCertificateId.value !== Number(row.id)) return;
    certificatePreviewUrl.value = URL.createObjectURL(blob);
  } catch (error: any) {
    if (serial === certificatePreviewSerial) certificatePreviewError.value = error.message || "证书成品加载失败";
  } finally {
    if (serial === certificatePreviewSerial) certificatePreviewLoading.value = false;
  }
}

async function downloadCertificate(row: any) {
  try {
    await downloadFile(`/admin/volunteer/certificates/${row.id}/download`, `${row.name || "证书"}.svg`);
  } catch (error: any) {
    ElMessage.error(error.message || "证书下载失败");
  }
}

function verifyCertificate(row: any) {
  if (!row?.certificateNo) return ElMessage.warning("该证书暂无证书编号，无法公开验真");
  window.open(h5RoutePreviewUrl(null, `/pages/credential/verify?type=certificate&code=${encodeURIComponent(row.certificateNo)}`), "_blank", "noopener,noreferrer");
}

async function revokeCertificate(row: any) {
  if (certificateActionId.value !== null) return;
  certificateActionId.value = Number(row.id);
  try {
    const result = await ElMessageBox.prompt("请输入撤销原因", "撤销证书", {
      inputType: "textarea",
      confirmButtonText: "确认撤销",
      cancelButtonText: "取消"
    });
    await api.patch(`/admin/volunteer/certificates/${row.id}/revoke`, { reason: String(result.value || "").trim() });
    if (certificateTarget.value) await openCertificates(certificateTarget.value);
    await Promise.all([loadOverview(), loadProfiles()]);
    ElMessage.success("证书已撤销");
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "撤销证书失败");
  } finally {
    certificateActionId.value = null;
  }
}

async function updateTaskApplication(row: any) {
  if (applicationActionId.value !== null) return;
  applicationActionId.value = Number(row.id);
  try {
    const saved = await api.patch(`/admin/volunteer/task-applications/${row.id}`, { status: row.status, remark: row.remark || "", businessKey: `volunteer:admin-application:${row.id}:${row.status}:${Date.now()}` });
    Object.assign(row, saved);
    ElMessage.success("报名状态已更新");
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
    try { await loadTaskApplications(); } catch { /* 保留原错误提示 */ }
  } finally {
    applicationActionId.value = null;
  }
}

async function actionServiceRecord(row: any, action: "confirm" | "reject" | "reverse") {
  const key = `${action}:${row.id}`;
  if (serviceActionKey.value) return;
  serviceActionKey.value = key;
  try {
    if (action === "confirm") await api.patch(`/admin/volunteer/service-records/${row.id}/action`, { action, businessKey: `volunteer:service-action:${row.id}:confirm:${Date.now()}` });
    else {
      const result = await ElMessageBox.prompt(action === "reject" ? "请输入驳回原因" : "请输入冲销原因", action === "reject" ? "驳回工时" : "冲销工时", { inputType: "textarea", confirmButtonText: "确认", cancelButtonText: "取消" });
      await api.patch(`/admin/volunteer/service-records/${row.id}/action`, { action, reason: String(result.value || "").trim(), businessKey: `volunteer:service-action:${row.id}:${action}:${Date.now()}` });
    }
    await Promise.all([loadOverview(), loadProfiles(), loadRecords(), loadTaskApplications()]);
    ElMessage.success("工时处理完成");
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "工时处理失败");
  } finally {
    serviceActionKey.value = "";
  }
}

async function issueProof(row: any) {
  if (proofActionId.value !== null) return;
  proofActionId.value = Number(row.id);
  try {
    await api.post(`/admin/volunteer/profiles/${row.profile?.id}/proofs`, { businessKey: `volunteer:proof:${row.id}:${Date.now()}`, serviceRecordId: row.id, title: row.title });
    ElMessage.success("服务证明已生成");
  } catch (error: any) {
    ElMessage.error(error.message || "生成证明失败");
  } finally {
    proofActionId.value = null;
  }
}

function openServiceRecord(row: any) {
  serviceTarget.value = row;
  Object.assign(serviceForm, {
    applicationId: row.id,
    hours: 2,
    title: row.task?.title || "志愿服务",
    proofUrl: "",
    feedback: "任务已完成"
  });
  serviceDialogVisible.value = true;
}

async function saveServiceRecord() {
  if (!serviceTarget.value || serviceSaving.value) return;
  if (!Number.isFinite(Number(serviceForm.hours)) || Number(serviceForm.hours) <= 0) return ElMessage.error("请填写有效服务时长");
  serviceSaving.value = true;
  try {
    await api.post("/admin/volunteer/service-records", { ...serviceForm, hours: Number(serviceForm.hours) });
    ElMessage.success("服务记录已登记");
    serviceDialogVisible.value = false;
    await Promise.all([loadOverview(), loadProfiles(), loadRecords(), loadTaskApplications()]);
  } catch (error: any) {
    ElMessage.error(error.message || "登记失败");
  } finally {
    serviceSaving.value = false;
  }
}

async function exportProfiles() {
  if (exportingProfiles.value) return;
  const query = buildQuery(profileFilter);
  exportingProfiles.value = true;
  try {
    await downloadFile(`/admin/volunteer/profiles/export${query ? `?${query}` : ""}`, "志愿者档案.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "志愿者档案导出失败");
  } finally {
    exportingProfiles.value = false;
  }
}

async function exportRecords() {
  if (exportingRecords.value) return;
  const query = buildQuery(recordFilter);
  exportingRecords.value = true;
  try {
    await downloadFile(`/admin/volunteer/service-records/export${query ? `?${query}` : ""}`, "志愿服务记录.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "志愿服务记录导出失败");
  } finally {
    exportingRecords.value = false;
  }
}

function formatTime(value?: string) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

function maskPhone(value: unknown) {
  const phone = String(value || "");
  return /^1\d{10}$/.test(phone) ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone || "-";
}

function openProof(value?: string | null) {
  if (!value) return;
  try {
    const url = new URL(value, window.location.origin);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error("unsupported protocol");
    window.open(url.href, "_blank", "noopener,noreferrer");
  } catch {
    ElMessage.error("证明材料地址无效，无法打开");
  }
}

function uploadHeaders() {
  const token = localStorage.getItem("admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function beforeProofUpload(file: File) {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
  if (!allowed.includes(file.type)) {
    ElMessage.error("请上传 JPG、PNG、WebP、GIF 或 PDF 证明材料");
    return false;
  }
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error("证明材料不能超过 10MB");
    return false;
  }
  return true;
}

function handleProofUploadSuccess(response: any) {
  const data = response?.data || response;
  const url = String(data?.url || "").trim();
  if (!url) return ElMessage.error("上传成功但未返回证明地址");
  serviceForm.proofUrl = url;
  ElMessage.success("证明材料已上传");
}

function handleProofUploadError(error: any) {
  ElMessage.error(error?.message || "证明材料上传失败");
}

onMounted(loadAll);
onBeforeUnmount(clearCertificatePreview);
</script>

<template>
  <div class="page" v-loading="loading">
    <div class="toolbar">
      <div>
        <h2>志愿者档案</h2>
        <p>集中查看志愿者审核状态、成长等级、任务报名和服务记录。</p>
      </div>
      <el-button @click="loadAll">刷新</el-button>
    </div>
    <el-alert v-if="errorMessage" type="error" show-icon :closable="false" :title="errorMessage">
      <template #default><el-button size="small" @click="loadAll">重试</el-button></template>
    </el-alert>

    <div class="stats-grid">
      <div v-for="item in profileStats" :key="item.label" class="stat-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>
    <div v-if="overviewAlerts.length" class="alert-stack">
      <el-alert v-for="item in overviewAlerts" :key="item.message" :type="item.level || 'info'" :title="item.message" show-icon :closable="false" />
    </div>

    <el-tabs v-model="activeTab" class="tabs">
      <el-tab-pane label="志愿者档案" name="profiles">
        <div class="table-card">
          <div class="table-head">
            <h3>档案列表</h3>
            <div class="filters">
              <el-input v-model="profileFilter.keyword" clearable placeholder="姓名/手机/方向" @keyup.enter="loadProfiles" />
              <el-input v-model="profileFilter.city" clearable placeholder="城市" @keyup.enter="loadProfiles" />
              <el-select v-model="profileFilter.status" clearable placeholder="审核状态">
                <el-option v-for="(label, value) in profileStatusText" :key="value" :label="label" :value="value" />
              </el-select>
              <el-select v-model="profileFilter.level" clearable placeholder="成长等级">
                <el-option v-for="(label, value) in levelText" :key="value" :label="label" :value="value" />
              </el-select>
              <el-button @click="loadProfiles">筛选</el-button>
              <el-button :loading="exportingProfiles" @click="exportProfiles">导出</el-button>
            </div>
          </div>
          <el-table :data="pagedProfiles" stripe empty-text="暂无志愿者档案">
            <el-table-column prop="name" label="姓名" width="100" fixed="left" />
            <el-table-column label="手机号" width="130"><template #default="{ row }">{{ row.phoneMasked || maskPhone(row.phone) }}</template></el-table-column>
            <el-table-column prop="city" label="城市" width="110" />
            <el-table-column label="用户" width="90">
              <template #default="{ row }">
                <el-tag v-if="row.user?.id" type="success">已绑定</el-tag>
                <el-tag v-else type="info">未绑定</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="expertise" label="擅长领域" min-width="160" show-overflow-tooltip />
            <el-table-column prop="availableTime" label="可服务时间" min-width="150" show-overflow-tooltip />
            <el-table-column prop="serviceIntent" label="服务意向" min-width="170" show-overflow-tooltip />
            <el-table-column label="状态" width="130">
              <template #default="{ row }">
                <el-select v-model="row.status" size="small" :disabled="Boolean(profileActionKey)" @change="updateProfile(row)">
                  <el-option v-for="(label, value) in profileStatusText" :key="value" :label="label" :value="value" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="等级" width="150">
              <template #default="{ row }">
                <el-select v-model="row.level" size="small" :disabled="Boolean(profileActionKey)" @change="updateProfile(row)">
                  <el-option v-for="(label, value) in levelText" :key="value" :label="label" :value="value" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="时长" width="90"><template #default="{ row }">{{ Number(row.serviceHours || 0).toFixed(1) }}h</template></el-table-column>
            <el-table-column label="证书" width="120">
              <template #default="{ row }">
                <el-tooltip v-if="row.latestCertificate?.name" :content="row.latestCertificate.name" placement="top">
                  <el-tag :type="row.latestCertificate.status === 'revoked' ? 'info' : 'warning'">{{ row.certificateCount || 0 }} 张</el-tag>
                </el-tooltip>
                <el-tag v-else type="info">0 张</el-tag>
                <div v-if="row.latestCertificate?.certificateNo" class="mini-code">{{ row.latestCertificate.certificateNo }}</div>
              </template>
            </el-table-column>
            <el-table-column label="来源" width="120"><template #default="{ row }">{{ row.application?.source || "-" }}</template></el-table-column>
            <el-table-column label="备注" min-width="220">
              <template #default="{ row }"><el-input v-model="row.remark" size="small" placeholder="内部备注" :disabled="Boolean(profileActionKey)" @change="updateProfile(row)" /></template>
            </el-table-column>
            <el-table-column label="更新时间" width="170"><template #default="{ row }">{{ formatTime(row.updatedAt) }}</template></el-table-column>
            <el-table-column label="操作" width="190" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" :loading="profileActionKey === `certificate:${row.id}`" :disabled="!row.user?.id || Boolean(profileActionKey)" @click="issueCertificate(row)">发证</el-button>
                <el-button size="small" :loading="profileActionKey === `training:${row.id}`" :disabled="Boolean(profileActionKey)" @click="addTrainingRecord(row)">培训</el-button>
                <el-button size="small" @click="openCredentials(row)">凭证</el-button>
                <el-button size="small" :disabled="certificateLoading" @click="openCertificates(row)">证书</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination v-model:current-page="profilePagination.page" v-model:page-size="profilePagination.pageSize" class="table-pagination" :page-sizes="[10, 20, 50]" :total="profiles.length" layout="total, sizes, prev, pager, next, jumper" />
        </div>
      </el-tab-pane>

      <el-tab-pane label="服务记录" name="records">
        <div class="table-card">
          <div class="table-head">
            <h3>服务记录</h3>
            <div class="filters">
              <el-input v-model="recordFilter.keyword" clearable placeholder="姓名/手机/任务" @keyup.enter="loadRecords" />
              <el-input v-model="recordFilter.city" clearable placeholder="城市" @keyup.enter="loadRecords" />
              <el-date-picker v-model="recordFilter.startDate" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="开始时间" />
              <el-date-picker v-model="recordFilter.endDate" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="结束时间" />
              <el-button @click="loadRecords">筛选</el-button>
              <el-button :loading="exportingRecords" @click="exportRecords">导出</el-button>
            </div>
          </div>
          <el-table :data="pagedRecords" stripe empty-text="暂无服务记录">
            <el-table-column label="志愿者" width="120" fixed="left"><template #default="{ row }">{{ row.profile?.name || "-" }}</template></el-table-column>
            <el-table-column label="手机号" width="130"><template #default="{ row }">{{ row.profile?.phoneMasked || maskPhone(row.profile?.phone) }}</template></el-table-column>
            <el-table-column label="城市" width="110"><template #default="{ row }">{{ row.profile?.city || "-" }}</template></el-table-column>
            <el-table-column prop="title" label="服务标题" min-width="170" show-overflow-tooltip />
            <el-table-column label="关联任务" min-width="170" show-overflow-tooltip><template #default="{ row }">{{ row.task?.title || "-" }}</template></el-table-column>
            <el-table-column label="时长" width="90"><template #default="{ row }">{{ Number(row.hours || 0).toFixed(1) }}h</template></el-table-column>
            <el-table-column prop="feedback" label="说明/评价" min-width="220" show-overflow-tooltip />
            <el-table-column label="审核状态" width="130"><template #default="{ row }"><el-tag :type="row.status === 'confirmed' ? 'success' : row.status === 'rejected' || row.status === 'reversed' ? 'info' : 'warning'">{{ row.status === 'confirmed' ? '已确认' : row.status === 'pending_volunteer' ? '待志愿者确认' : row.status === 'pending_supervisor' ? '待运营复核' : row.status === 'rejected' ? '已驳回' : row.status === 'reversed' ? '已冲销' : row.status }}</el-tag></template></el-table-column>
            <el-table-column label="证明" width="90">
              <template #default="{ row }">
                <el-button v-if="row.proofUrl" size="small" link type="primary" @click="openProof(row.proofUrl)">查看</el-button>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="登记时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
            <el-table-column label="操作" width="240" fixed="right"><template #default="{ row }"><el-button v-if="row.status === 'pending_supervisor'" size="small" type="primary" :loading="serviceActionKey === `confirm:${row.id}`" :disabled="Boolean(serviceActionKey)" @click="actionServiceRecord(row, 'confirm')">确认</el-button><el-button v-if="row.status === 'confirmed'" size="small" :loading="proofActionId === row.id" :disabled="proofActionId !== null" @click="issueProof(row)">证明</el-button><el-button v-if="row.status === 'confirmed'" size="small" type="warning" :loading="serviceActionKey === `reverse:${row.id}`" :disabled="Boolean(serviceActionKey)" @click="actionServiceRecord(row, 'reverse')">冲销</el-button><el-button v-if="['pending_volunteer', 'pending_supervisor'].includes(row.status)" size="small" :loading="serviceActionKey === `reject:${row.id}`" :disabled="Boolean(serviceActionKey)" @click="actionServiceRecord(row, 'reject')">驳回</el-button></template></el-table-column>
          </el-table>
          <el-pagination v-model:current-page="recordPagination.page" v-model:page-size="recordPagination.pageSize" class="table-pagination" :page-sizes="[10, 20, 50]" :total="records.length" layout="total, sizes, prev, pager, next, jumper" />
        </div>
      </el-tab-pane>

      <el-tab-pane label="任务报名" name="applications">
        <div class="table-card">
          <div class="table-head">
            <h3>任务报名</h3>
            <div class="filters">
              <el-select v-model="applicationFilter.status" clearable placeholder="报名状态">
                <el-option v-for="(label, value) in applicationStatusText" :key="value" :label="label" :value="value" />
              </el-select>
              <el-button @click="loadTaskApplications">筛选</el-button>
            </div>
          </div>
          <el-table :data="pagedTaskApplications" stripe empty-text="暂无任务报名">
            <el-table-column label="任务" min-width="180" show-overflow-tooltip><template #default="{ row }">{{ row.task?.title || "-" }}</template></el-table-column>
            <el-table-column label="类型" width="120"><template #default="{ row }">{{ taskTypeText[row.task?.type] || row.task?.type || "-" }}</template></el-table-column>
            <el-table-column prop="name" label="姓名" width="100" />
            <el-table-column label="手机号" width="130"><template #default="{ row }">{{ row.phoneMasked || maskPhone(row.phone) }}</template></el-table-column>
            <el-table-column prop="city" label="城市" width="110" />
            <el-table-column prop="message" label="说明" min-width="220" show-overflow-tooltip />
            <el-table-column label="状态" width="130">
              <template #default="{ row }">
                <el-select v-model="row.status" size="small" :disabled="applicationActionId !== null" @change="updateTaskApplication(row)">
                  <el-option v-for="(label, value) in applicationStatusText" :key="value" :label="label" :value="value" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="180"><template #default="{ row }"><el-input v-model="row.remark" size="small" :disabled="applicationActionId !== null" @change="updateTaskApplication(row)" /></template></el-table-column>
            <el-table-column label="报名时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
            <el-table-column label="操作" width="130" fixed="right"><template #default="{ row }"><el-button size="small" type="primary" @click="openServiceRecord(row)">登记服务</el-button></template></el-table-column>
          </el-table>
          <el-pagination v-model:current-page="applicationPagination.page" v-model:page-size="applicationPagination.pageSize" class="table-pagination" :page-sizes="[10, 20, 50]" :total="taskApplications.length" layout="total, sizes, prev, pager, next, jumper" />
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="serviceDialogVisible" :title="serviceTarget ? `登记服务：${serviceTarget.name}` : '登记服务'" width="560px" destroy-on-close>
      <el-form :model="serviceForm" label-width="96px">
        <el-form-item label="服务标题"><el-input v-model="serviceForm.title" maxlength="160" /></el-form-item>
        <el-form-item label="服务时长"><el-input-number v-model="serviceForm.hours" :min="0.1" :precision="1" :step="0.5" /></el-form-item>
        <el-form-item label="证明材料">
          <div class="upload-line">
            <el-input v-model="serviceForm.proofUrl" maxlength="500" placeholder="可填写照片、文件或网盘链接" />
            <el-upload
              action="/api/admin/uploads/settlement-proofs"
              name="file"
              :headers="uploadHeaders()"
              :show-file-list="false"
              :before-upload="beforeProofUpload"
              :on-success="handleProofUploadSuccess"
              :on-error="handleProofUploadError"
            >
              <el-button :icon="UploadFilled">上传</el-button>
            </el-upload>
            <el-button v-if="serviceForm.proofUrl" @click="openProof(serviceForm.proofUrl)">查看</el-button>
          </div>
        </el-form-item>
        <el-form-item label="完成说明"><el-input v-model="serviceForm.feedback" type="textarea" :rows="4" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="serviceDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="serviceSaving" :disabled="serviceSaving" @click="saveServiceRecord">登记完成</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="certificateDialogVisible" :title="certificateTarget ? `证书：${certificateTarget.name}` : '证书'" width="min(980px, calc(100vw - 32px))" destroy-on-close @closed="clearCertificatePreview">
      <div v-loading="certificateLoading" class="certificate-body">
        <el-alert v-if="certificateError" type="error" show-icon :closable="false" :title="certificateError"><template #default><el-button size="small" :loading="certificateLoading" @click="openCertificates(certificateTarget)">重试</el-button></template></el-alert>
        <el-empty v-else-if="!certificateLoading && !profileCertificates.length" description="暂无证书" :image-size="80" />
        <div v-else class="certificate-workspace">
          <div class="certificate-list" aria-label="证书列表">
            <article v-for="row in profileCertificates" :key="row.id" class="certificate-item" :class="{ selected: selectedCertificateId === row.id }">
              <button class="certificate-select" type="button" @click="previewCertificate(row)">
                <strong>{{ row.name }}</strong>
                <span>{{ row.certificateNo || "暂无编号" }}</span>
                <span>{{ levelText[row.level] || row.level || "未分级" }} · {{ Number(row.serviceHours || 0).toFixed(1) }}h</span>
                <span>{{ formatTime(row.issuedAt) }}</span>
              </button>
              <div class="certificate-item-actions">
                <el-tag :type="row.status === 'revoked' ? 'info' : 'success'">{{ row.status === 'revoked' ? '已撤销' : '有效' }}</el-tag>
                <el-button link type="primary" :icon="View" @click="previewCertificate(row)">预览</el-button>
                <el-button link type="primary" :icon="Download" @click="downloadCertificate(row)">下载</el-button>
                <el-button link type="primary" :icon="CircleCheck" :disabled="!row.certificateNo" @click="verifyCertificate(row)">验真</el-button>
                <el-button link type="danger" :loading="certificateActionId === row.id" :disabled="row.status === 'revoked' || certificateActionId !== null" @click="revokeCertificate(row)">撤销</el-button>
              </div>
              <p v-if="row.status === 'revoked' && row.revokeReason" class="revoke-reason">撤销原因：{{ row.revokeReason }}</p>
            </article>
          </div>
          <section class="certificate-preview" aria-label="证书成品预览">
            <div v-loading="certificatePreviewLoading" class="certificate-canvas">
              <img v-if="certificatePreviewUrl" :src="certificatePreviewUrl" alt="证书成品预览" />
              <el-result v-else-if="certificatePreviewError" icon="error" title="预览加载失败" :sub-title="certificatePreviewError"><template #extra><el-button v-if="selectedCertificateId" @click="previewCertificate(profileCertificates.find((item) => item.id === selectedCertificateId))">重新加载</el-button></template></el-result>
              <el-empty v-else description="选择证书查看成品" :image-size="72" />
            </div>
          </section>
        </div>
      </div>
      <template #footer>
        <el-button @click="certificateDialogVisible = false">关闭</el-button>
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
.table-head,
.filters {
  display: flex;
  align-items: center;
  gap: 12px;
}
.toolbar,
.table-head {
  justify-content: space-between;
}
.toolbar h2,
.table-head h3 {
  margin: 0;
}
.toolbar p {
  margin: 6px 0 0;
  color: #667085;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 12px;
}

.stat-card,
.table-card {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fff;
}
.stat-card {
  padding: 14px 16px;
}
.stat-card span,
.stat-card strong {
  display: block;
}
.stat-card span {
  color: #667085;
  font-size: 13px;
}
.stat-card strong {
  margin-top: 8px;
  color: #101828;
  font-size: 24px;
}
.alert-stack {
  display: grid;
  gap: 8px;
}
.mini-code {
  margin-top: 4px;
  color: #667085;
  font-size: 12px;
  line-height: 1.4;
}
.certificate-body {
  min-height: 360px;
}
.certificate-workspace {
  display: grid;
  grid-template-columns: minmax(280px, 0.8fr) minmax(0, 1.4fr);
  gap: 16px;
}
.certificate-list {
  display: grid;
  align-content: start;
  gap: 10px;
  max-height: 560px;
  overflow: auto;
}
.certificate-item {
  min-width: 0;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
}
.certificate-item.selected {
  border-color: #337ecc;
  box-shadow: inset 3px 0 #337ecc;
}
.certificate-select {
  display: grid;
  gap: 4px;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: #667085;
  font: inherit;
  line-height: 1.45;
  text-align: left;
  cursor: pointer;
}
.certificate-select strong {
  color: #101828;
  font-size: 15px;
  overflow-wrap: anywhere;
}
.certificate-select span {
  font-size: 12px;
  overflow-wrap: anywhere;
}
.certificate-item-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-top: 10px;
}
.revoke-reason {
  margin: 8px 0 0;
  color: #b42318;
  font-size: 12px;
  line-height: 1.5;
}
.certificate-preview {
  min-width: 0;
}
.certificate-canvas {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 10 / 7;
  overflow: hidden;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  background: #f2f4f7;
}
.certificate-canvas img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.table-card {
  padding: 16px;
}
.filters {
  flex-wrap: wrap;
  justify-content: flex-end;
}
.upload-line {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 10px;
  width: 100%;
}
.filters :deep(.el-input),
.filters :deep(.el-select) {
  width: 160px;
}
.tabs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.table-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  overflow-x: auto;
}
@media (max-width: 900px) {
  .toolbar,
  .table-head,
  .filters {
    align-items: stretch;
    flex-direction: column;
  }
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .filters :deep(.el-input),
  .filters :deep(.el-select) {
    width: 100%;
  }
  .upload-line {
    grid-template-columns: 1fr;
  }
  .certificate-workspace {
    grid-template-columns: 1fr;
  }
  .certificate-list {
    max-height: 280px;
  }
}
</style>
