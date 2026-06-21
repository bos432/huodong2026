<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { UploadFilled } from "@element-plus/icons-vue";
import { api, downloadFile } from "../api";

const loading = ref(false);
const activeTab = ref("profiles");
const profiles = ref<any[]>([]);
const records = ref<any[]>([]);
const taskApplications = ref<any[]>([]);
const serviceDialogVisible = ref(false);
const serviceTarget = ref<any | null>(null);
const profileFilter = reactive({ keyword: "", status: "", level: "", city: "" });
const recordFilter = reactive({ keyword: "", city: "", startDate: "", endDate: "" });
const applicationFilter = reactive({ status: "" });
const serviceForm = reactive({ applicationId: 0, hours: 2, title: "", proofUrl: "", feedback: "任务已完成" });

const profileStatusText: Record<string, string> = { pending: "待审核", approved: "已通过", rejected: "已拒绝", inactive: "已停用" };
const levelText: Record<string, string> = { participant: "公益参与者", volunteer: "公益志愿者", ambassador: "公益大使", city_builder: "城市共建者" };
const applicationStatusText: Record<string, string> = { pending: "待审核", approved: "已通过", rejected: "已拒绝", completed: "已完成", cancelled: "已取消" };
const taskTypeText: Record<string, string> = { activity_support: "活动协助", checkin: "签到接待", course_assistant: "课程助教", charity_execution: "公益执行", content_spread: "内容传播", aid_followup: "帮扶回访" };

const profileStats = computed(() => {
  const totalHours = profiles.value.reduce((sum, row) => sum + Number(row.serviceHours || 0), 0);
  return [
    { label: "志愿者档案", value: profiles.value.length },
    { label: "已通过", value: profiles.value.filter((row) => row.status === "approved").length },
    { label: "待审核", value: profiles.value.filter((row) => row.status === "pending").length },
    { label: "服务时长", value: totalHours.toFixed(1) }
  ];
});

async function loadAll() {
  loading.value = true;
  try {
    await Promise.all([loadProfiles(), loadRecords(), loadTaskApplications()]);
  } catch (error: any) {
    ElMessage.error(error.message || "加载志愿者数据失败");
  } finally {
    loading.value = false;
  }
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
  try {
    const saved = await api.patch(`/admin/volunteer/profiles/${row.id}`, { status: row.status, level: row.level, remark: row.remark || "" });
    Object.assign(row, saved);
    ElMessage.success("志愿者档案已更新");
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  }
}

async function issueCertificate(row: any) {
  if (!row.user?.id) return ElMessage.warning("该志愿者档案尚未绑定用户账号，需用户登录后申请或报名志愿任务");
  try {
    await api.post(`/admin/volunteer/profiles/${row.id}/certificates`, {});
    await loadProfiles();
    ElMessage.success("志愿服务证书已发放");
  } catch (error: any) {
    ElMessage.error(error.message || "发证失败");
  }
}

async function updateTaskApplication(row: any) {
  try {
    const saved = await api.patch(`/admin/volunteer/task-applications/${row.id}`, { status: row.status, remark: row.remark || "" });
    Object.assign(row, saved);
    ElMessage.success("报名状态已更新");
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
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
  if (!serviceTarget.value) return;
  if (!Number.isFinite(Number(serviceForm.hours)) || Number(serviceForm.hours) <= 0) return ElMessage.error("请填写有效服务时长");
  try {
    await api.post("/admin/volunteer/service-records", { ...serviceForm, hours: Number(serviceForm.hours) });
    ElMessage.success("服务记录已登记");
    serviceDialogVisible.value = false;
    await Promise.all([loadProfiles(), loadRecords(), loadTaskApplications()]);
  } catch (error: any) {
    ElMessage.error(error.message || "登记失败");
  }
}

async function exportProfiles() {
  const query = buildQuery(profileFilter);
  await downloadFile(`/admin/volunteer/profiles/export${query ? `?${query}` : ""}`, "志愿者档案.xlsx");
}

async function exportRecords() {
  const query = buildQuery(recordFilter);
  await downloadFile(`/admin/volunteer/service-records/export${query ? `?${query}` : ""}`, "志愿服务记录.xlsx");
}

function formatTime(value?: string) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
}

function openProof(url?: string | null) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
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

    <div class="stats-grid">
      <div v-for="item in profileStats" :key="item.label" class="stat-card">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
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
              <el-button @click="exportProfiles">导出</el-button>
            </div>
          </div>
          <el-table :data="profiles" stripe empty-text="暂无志愿者档案">
            <el-table-column prop="name" label="姓名" width="100" fixed="left" />
            <el-table-column prop="phone" label="手机号" width="130" />
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
                <el-select v-model="row.status" size="small" @change="updateProfile(row)">
                  <el-option v-for="(label, value) in profileStatusText" :key="value" :label="label" :value="value" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="等级" width="150">
              <template #default="{ row }">
                <el-select v-model="row.level" size="small" @change="updateProfile(row)">
                  <el-option v-for="(label, value) in levelText" :key="value" :label="label" :value="value" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="时长" width="90"><template #default="{ row }">{{ Number(row.serviceHours || 0).toFixed(1) }}h</template></el-table-column>
            <el-table-column label="证书" width="120">
              <template #default="{ row }">
                <el-tooltip v-if="row.latestCertificate?.name" :content="row.latestCertificate.name" placement="top">
                  <el-tag type="warning">{{ row.certificateCount || 0 }} 张</el-tag>
                </el-tooltip>
                <el-tag v-else type="info">0 张</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="来源" width="120"><template #default="{ row }">{{ row.application?.source || "-" }}</template></el-table-column>
            <el-table-column label="备注" min-width="220">
              <template #default="{ row }"><el-input v-model="row.remark" size="small" placeholder="内部备注" @change="updateProfile(row)" /></template>
            </el-table-column>
            <el-table-column label="更新时间" width="170"><template #default="{ row }">{{ formatTime(row.updatedAt) }}</template></el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" :disabled="!row.user?.id" @click="issueCertificate(row)">发证</el-button>
              </template>
            </el-table-column>
          </el-table>
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
              <el-button @click="exportRecords">导出</el-button>
            </div>
          </div>
          <el-table :data="records" stripe empty-text="暂无服务记录">
            <el-table-column label="志愿者" width="120" fixed="left"><template #default="{ row }">{{ row.profile?.name || "-" }}</template></el-table-column>
            <el-table-column label="手机号" width="130"><template #default="{ row }">{{ row.profile?.phone || "-" }}</template></el-table-column>
            <el-table-column label="城市" width="110"><template #default="{ row }">{{ row.profile?.city || "-" }}</template></el-table-column>
            <el-table-column prop="title" label="服务标题" min-width="170" show-overflow-tooltip />
            <el-table-column label="关联任务" min-width="170" show-overflow-tooltip><template #default="{ row }">{{ row.task?.title || "-" }}</template></el-table-column>
            <el-table-column label="时长" width="90"><template #default="{ row }">{{ Number(row.hours || 0).toFixed(1) }}h</template></el-table-column>
            <el-table-column prop="feedback" label="说明/评价" min-width="220" show-overflow-tooltip />
            <el-table-column label="证明" width="90">
              <template #default="{ row }">
                <el-button v-if="row.proofUrl" size="small" link type="primary" @click="openProof(row.proofUrl)">查看</el-button>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column label="登记时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
          </el-table>
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
          <el-table :data="taskApplications" stripe empty-text="暂无任务报名">
            <el-table-column label="任务" min-width="180" show-overflow-tooltip><template #default="{ row }">{{ row.task?.title || "-" }}</template></el-table-column>
            <el-table-column label="类型" width="120"><template #default="{ row }">{{ taskTypeText[row.task?.type] || row.task?.type || "-" }}</template></el-table-column>
            <el-table-column prop="name" label="姓名" width="100" />
            <el-table-column prop="phone" label="手机号" width="130" />
            <el-table-column prop="city" label="城市" width="110" />
            <el-table-column prop="message" label="说明" min-width="220" show-overflow-tooltip />
            <el-table-column label="状态" width="130">
              <template #default="{ row }">
                <el-select v-model="row.status" size="small" @change="updateTaskApplication(row)">
                  <el-option v-for="(label, value) in applicationStatusText" :key="value" :label="label" :value="value" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="备注" min-width="180"><template #default="{ row }"><el-input v-model="row.remark" size="small" @change="updateTaskApplication(row)" /></template></el-table-column>
            <el-table-column label="报名时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
            <el-table-column label="操作" width="130" fixed="right"><template #default="{ row }"><el-button size="small" type="primary" @click="openServiceRecord(row)">登记服务</el-button></template></el-table-column>
          </el-table>
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
        <el-button type="primary" @click="saveServiceRecord">登记完成</el-button>
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
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
}
</style>
