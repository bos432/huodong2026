<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { UploadFilled } from "@element-plus/icons-vue";
import { api } from "../api";
import { canAccess } from "../permissions";

const loading = ref(false);
const savingSetting = ref(false);
const savingProject = ref(false);
const summary = ref<any>(null);
const setting = ref<any>(null);
const transactions = ref<any[]>([]);
const projects = ref<any[]>([]);
const projectDialogVisible = ref(false);
const updateDialogVisible = ref(false);
const disbursementDialogVisible = ref(false);
const editingProjectId = ref<number | null>(null);
const activeProject = ref<any | null>(null);
const activeDisbursementProject = ref<any | null>(null);
const projectUpdates = ref<any[]>([]);
const projectDisbursements = ref<any[]>([]);
const txFilter = reactive({ keyword: "", type: "", sourceType: "" });
const settingForm = reactive({ enabled: true, ratePercent: 5, accrualBasis: "paid_amount", manualBasisAmount: undefined as number | undefined, userDisplayName: "我的公益贡献", publicNote: "公益金来自平台订单收入计提，用户无需额外支付。", retainOnActivityRefund: true, ambassadorThreshold: 100, ambassadorTitle: "公益大使" });
const projectForm = reactive({ title: "", targetAmount: 500, status: "fundraising", coverUrl: "", description: "", executedAt: "", publicVisible: true });
const updateForm = reactive({ title: "", content: "", proofUrl: "", publicVisible: true, publishedAt: "" });
const disbursementForm = reactive({ amount: 100, remark: "公益项目执行拨付", proofUrl: "", publicVisible: true });

const canOperate = computed(() => canAccess(["charity.manage"]));
const canFinance = computed(() => canAccess(["charity.finance"]));

const statusText: Record<string, string> = {
  fundraising: "筹集中",
  pending_execution: "待执行",
  executing: "执行中",
  pending_acceptance: "待验收",
  completed: "已完成",
  archived: "已归档"
};

const typeText: Record<string, string> = {
  charity_accrual: "订单计提",
  charity_reversal: "退款冲回",
  project_disbursement: "项目拨付",
  manual_adjust: "人工调整"
};

const basisText: Record<string, string> = {
  paid_amount: "实付金额",
  original_amount: "订单原价",
  manual: "手动指定金额"
};

const sourceText: Record<string, string> = {
  activity_order: "活动订单",
  mall_order: "商城订单",
  manual: "人工登记"
};

const filteredTransactions = computed(() => {
  const keyword = txFilter.keyword.trim().toLowerCase();
  return transactions.value.filter((row) => {
    if (txFilter.type && row.type !== txFilter.type) return false;
    if (txFilter.sourceType && row.sourceType !== txFilter.sourceType) return false;
    if (!keyword) return true;
    const text = [row.order?.orderNo, row.sourceTitle, row.user?.phone, row.user?.nickname, row.remark].filter(Boolean).join(" ").toLowerCase();
    return text.includes(keyword);
  });
});

async function load() {
  loading.value = true;
  try {
    const [summaryData, settingData, projectRows] = await Promise.all([
      api.get<any, any>("/admin/charity/summary"),
      canOperate.value ? api.get<any, any>("/admin/settings/charity") : Promise.resolve(null),
      canOperate.value || canFinance.value ? api.get<any, any[]>("/admin/charity/projects") : Promise.resolve([])
    ]);
    summary.value = summaryData;
    projects.value = projectRows || [];
    if (settingData) {
      setting.value = settingData;
      Object.assign(settingForm, {
        enabled: Boolean(settingData.enabled),
        ratePercent: Number(settingData.ratePercent || 5),
        accrualBasis: settingData.accrualBasis || "paid_amount",
        manualBasisAmount: settingData.manualBasisAmount ? Number(settingData.manualBasisAmount) : undefined,
        userDisplayName: settingData.userDisplayName || "我的公益贡献",
        publicNote: settingData.publicNote || "公益金来自平台订单收入计提，用户无需额外支付。",
        retainOnActivityRefund: settingData.retainOnActivityRefund !== false,
        ambassadorThreshold: Number(settingData.ambassadorThreshold || 100),
        ambassadorTitle: settingData.ambassadorTitle || "公益大使"
      });
    }
    if (canFinance.value) transactions.value = await api.get<any, any[]>("/admin/charity/transactions");
  } catch (error: any) {
    ElMessage.error(error.message || "加载公益池失败");
  } finally {
    loading.value = false;
  }
}

async function saveSetting() {
  savingSetting.value = true;
  try {
    setting.value = await api.post("/admin/settings/charity", settingForm);
    ElMessage.success("公益配置已保存");
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  } finally {
    savingSetting.value = false;
  }
}

function openCreateProject() {
  editingProjectId.value = null;
  Object.assign(projectForm, { title: "", targetAmount: 500, status: "fundraising", coverUrl: "", description: "", executedAt: "", publicVisible: true });
  projectDialogVisible.value = true;
}

function openEditProject(row: any) {
  editingProjectId.value = row.id;
  Object.assign(projectForm, {
    title: row.title,
    targetAmount: Number(row.targetAmount || 0),
    status: row.status,
    coverUrl: row.coverUrl || "",
    description: row.description || "",
    executedAt: row.executedAt ? row.executedAt.slice(0, 10) : "",
    publicVisible: Boolean(row.publicVisible)
  });
  projectDialogVisible.value = true;
}

async function saveProject() {
  savingProject.value = true;
  try {
    const payload = { ...projectForm, coverUrl: projectForm.coverUrl || undefined, description: projectForm.description || undefined, executedAt: projectForm.executedAt || undefined };
    if (editingProjectId.value) await api.patch(`/admin/charity/projects/${editingProjectId.value}`, payload);
    else await api.post("/admin/charity/projects", payload);
    ElMessage.success("公益项目已保存");
    projectDialogVisible.value = false;
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  } finally {
    savingProject.value = false;
  }
}

async function addDisbursement(row: any) {
  activeDisbursementProject.value = row;
  Object.assign(disbursementForm, { amount: 100, remark: "公益项目执行拨付", proofUrl: "", publicVisible: true });
  disbursementDialogVisible.value = true;
}

async function saveDisbursement() {
  if (!activeDisbursementProject.value) return;
  const amount = Number(disbursementForm.amount);
  if (!Number.isFinite(amount) || amount <= 0) return ElMessage.error("拨付金额必须大于 0");
  try {
    await api.post(`/admin/charity/projects/${activeDisbursementProject.value.id}/disbursements`, { ...disbursementForm, amount, proofUrl: disbursementForm.proofUrl || undefined });
    ElMessage.success("拨付已登记");
    disbursementDialogVisible.value = false;
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "登记失败");
  }
}

async function openProjectUpdates(row: any) {
  activeProject.value = row;
  Object.assign(updateForm, { title: "", content: "", proofUrl: "", publicVisible: true, publishedAt: "" });
  const data = await api.get<any, any>(`/admin/charity/projects/${row.id}/updates`);
  projectUpdates.value = data.updates || [];
  projectDisbursements.value = data.disbursements || [];
  updateDialogVisible.value = true;
}

async function saveProjectUpdate() {
  if (!activeProject.value) return;
  if (!updateForm.title.trim()) return ElMessage.error("请输入动态标题");
  if (!updateForm.content.trim()) return ElMessage.error("请输入动态内容");
  try {
    await api.post(`/admin/charity/projects/${activeProject.value.id}/updates`, { ...updateForm, proofUrl: updateForm.proofUrl || undefined, publishedAt: updateForm.publishedAt || undefined });
    ElMessage.success("执行动态已发布");
    await openProjectUpdates(activeProject.value);
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  }
}

function money(value?: string | number) {
  return Number(value || 0).toFixed(2);
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

function beforeImageUpload(file: File) {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    ElMessage.error("请上传 JPG、PNG、WebP 或 GIF 图片");
    return false;
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error("图片不能超过 5MB");
    return false;
  }
  return true;
}

function beforeProofUpload(file: File) {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
  if (!allowed.includes(file.type)) {
    ElMessage.error("请上传 JPG、PNG、WebP、GIF 或 PDF 凭证");
    return false;
  }
  if (file.size > 10 * 1024 * 1024) {
    ElMessage.error("凭证不能超过 10MB");
    return false;
  }
  return true;
}

function handleUpdateProofUploadSuccess(response: any) {
  const data = response?.data || response;
  const url = String(data?.url || "").trim();
  if (!url) return ElMessage.error("上传成功但未返回凭证地址");
  updateForm.proofUrl = url;
  ElMessage.success("执行凭证已上传");
}

function handleDisbursementProofUploadSuccess(response: any) {
  const data = response?.data || response;
  const url = String(data?.url || "").trim();
  if (!url) return ElMessage.error("上传成功但未返回凭证地址");
  disbursementForm.proofUrl = url;
  ElMessage.success("拨付凭证已上传");
}

function handleProofUploadError(error: any) {
  ElMessage.error(error?.message || "凭证上传失败");
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>公益池</h2>
      <div class="toolbar-actions">
        <el-button @click="load">刷新</el-button>
        <el-button v-if="canOperate" type="primary" @click="openCreateProject">新增公益项目</el-button>
      </div>
    </div>

    <el-alert class="page-hint" type="info" :closable="false" show-icon title="公益金说明" description="公益金由平台从订单收入中按配置比例计提，用户无需额外支付。前台统一展示为「公益金 / 公益池 / 我的公益贡献」。" />

    <div class="metric-grid" v-loading="loading">
      <div class="metric"><span>累计公益金</span><strong>¥{{ money(summary?.totalAccrued) }}</strong></div>
      <div class="metric"><span>当前可用</span><strong>¥{{ money(summary?.availableAmount) }}</strong></div>
      <div class="metric"><span>已拨付</span><strong>¥{{ money(summary?.totalDisbursed) }}</strong></div>
      <div class="metric"><span>退款冲回</span><strong>¥{{ money(summary?.totalReversed) }}</strong></div>
      <div class="metric"><span>参与用户</span><strong>{{ summary?.participantCount || 0 }}</strong></div>
    </div>

    <div v-if="canOperate" class="table-card setting-card">
      <h3>公益配置</h3>
      <el-form :model="settingForm" label-width="120px">
        <el-form-item label="启用公益金"><el-switch v-model="settingForm.enabled" /></el-form-item>
        <el-form-item label="计提比例"><el-input-number v-model="settingForm.ratePercent" :min="0" :max="100" :precision="2" /> <span class="unit">%</span></el-form-item>
        <el-form-item label="计提口径">
          <el-select v-model="settingForm.accrualBasis" style="width: 220px">
            <el-option label="实付金额" value="paid_amount" />
            <el-option label="订单原价" value="original_amount" />
            <el-option label="手动指定金额" value="manual" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="settingForm.accrualBasis === 'manual'" label="手动基准金额"><el-input-number v-model="settingForm.manualBasisAmount" :min="0" :precision="2" /></el-form-item>
        <el-form-item label="退款保留公益金"><el-switch v-model="settingForm.retainOnActivityRefund" /><span class="form-tip">用户申请活动退款时，默认退回实付减公益金，公益贡献保留。</span></el-form-item>
        <el-form-item label="公益大使门槛"><el-input-number v-model="settingForm.ambassadorThreshold" :min="0" :precision="2" /> <span class="unit">元</span></el-form-item>
        <el-form-item label="勋章名称"><el-input v-model="settingForm.ambassadorTitle" maxlength="80" /></el-form-item>
        <el-form-item label="用户端名称"><el-input v-model="settingForm.userDisplayName" maxlength="80" /></el-form-item>
        <el-form-item label="公开说明"><el-input v-model="settingForm.publicNote" maxlength="120" /></el-form-item>
        <el-form-item><el-button type="primary" :loading="savingSetting" @click="saveSetting">保存配置</el-button></el-form-item>
      </el-form>
    </div>

    <div class="table-card">
      <h3>公益项目</h3>
      <el-table :data="projects" stripe empty-text="暂无公益项目">
        <el-table-column prop="title" label="项目" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="110"><template #default="{ row }">{{ statusText[row.status] || row.status }}</template></el-table-column>
        <el-table-column label="目标金额" width="120"><template #default="{ row }">¥{{ money(row.targetAmount) }}</template></el-table-column>
        <el-table-column label="已拨付" width="120"><template #default="{ row }">¥{{ money(row.disbursedAmount) }}</template></el-table-column>
        <el-table-column label="进度" width="180"><template #default="{ row }"><el-progress :percentage="row.progressPercent || 0" /></template></el-table-column>
        <el-table-column label="公开" width="90"><template #default="{ row }"><el-tag :type="row.publicVisible ? 'success' : 'info'">{{ row.publicVisible ? "展示" : "隐藏" }}</el-tag></template></el-table-column>
        <el-table-column label="更新时间" width="170"><template #default="{ row }">{{ formatTime(row.updatedAt) }}</template></el-table-column>
        <el-table-column v-if="canOperate || canFinance" label="操作" width="240" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canOperate" size="small" @click="openEditProject(row)">编辑</el-button>
            <el-button size="small" @click="openProjectUpdates(row)">动态</el-button>
            <el-button v-if="canFinance" size="small" type="primary" @click="addDisbursement(row)">拨付</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-if="canFinance" class="table-card">
      <div class="table-head">
        <h3>公益流水</h3>
        <div class="filters">
          <el-input v-model="txFilter.keyword" clearable placeholder="搜索用户/订单/说明" />
          <el-select v-model="txFilter.type" clearable placeholder="流水类型">
            <el-option v-for="(label, value) in typeText" :key="value" :label="label" :value="value" />
          </el-select>
          <el-select v-model="txFilter.sourceType" clearable placeholder="来源">
            <el-option v-for="(label, value) in sourceText" :key="value" :label="label" :value="value" />
          </el-select>
        </div>
      </div>
      <el-table :data="filteredTransactions" stripe empty-text="暂无公益流水">
        <el-table-column label="类型" width="110"><template #default="{ row }">{{ typeText[row.type] || row.type }}</template></el-table-column>
        <el-table-column label="来源" width="110"><template #default="{ row }">{{ sourceText[row.sourceType] || row.sourceType || "-" }}</template></el-table-column>
        <el-table-column label="方向" width="90"><template #default="{ row }"><el-tag :type="row.direction === 'credit' ? 'success' : 'warning'">{{ row.direction === "credit" ? "入池" : "出池" }}</el-tag></template></el-table-column>
        <el-table-column label="金额" width="120"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
        <el-table-column label="计提基准" width="120"><template #default="{ row }">¥{{ money(row.basisAmount) }}</template></el-table-column>
        <el-table-column label="比例" width="90"><template #default="{ row }">{{ row.ratePercent }}%</template></el-table-column>
        <el-table-column label="订单/项目" min-width="180" show-overflow-tooltip><template #default="{ row }">{{ row.order?.orderNo || row.sourceTitle || "-" }}</template></el-table-column>
        <el-table-column label="用户" min-width="140" show-overflow-tooltip><template #default="{ row }">{{ row.user?.phone || row.user?.nickname || "-" }}</template></el-table-column>
        <el-table-column label="退款保留" width="100"><template #default="{ row }"><el-tag :type="row.retainedOnRefund ? 'success' : 'info'">{{ row.retainedOnRefund ? "是" : "否" }}</el-tag></template></el-table-column>
        <el-table-column prop="remark" label="说明" min-width="220" show-overflow-tooltip />
        <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="projectDialogVisible" :title="editingProjectId ? '编辑公益项目' : '新增公益项目'" width="560px" destroy-on-close>
      <el-form :model="projectForm" label-width="100px">
        <el-form-item label="项目标题" required><el-input v-model="projectForm.title" maxlength="120" /></el-form-item>
        <el-form-item label="目标金额" required><el-input-number v-model="projectForm.targetAmount" :min="0.01" :precision="2" /></el-form-item>
        <el-form-item label="项目状态">
          <el-select v-model="projectForm.status" style="width: 220px">
            <el-option v-for="(label, value) in statusText" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="封面地址"><el-input v-model="projectForm.coverUrl" maxlength="500" /></el-form-item>
        <el-form-item label="执行日期"><el-date-picker v-model="projectForm.executedAt" value-format="YYYY-MM-DD" type="date" placeholder="可选" /></el-form-item>
        <el-form-item label="公开展示"><el-switch v-model="projectForm.publicVisible" /></el-form-item>
        <el-form-item label="项目说明"><el-input v-model="projectForm.description" type="textarea" :rows="4" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="projectDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingProject" @click="saveProject">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="updateDialogVisible" :title="activeProject ? `执行动态：${activeProject.title}` : '执行动态'" width="760px" destroy-on-close>
      <div class="update-layout">
        <div class="update-form">
          <h3>发布执行动态</h3>
          <el-form :model="updateForm" label-width="96px">
            <el-form-item label="标题" required><el-input v-model="updateForm.title" maxlength="120" /></el-form-item>
            <el-form-item label="内容" required><el-input v-model="updateForm.content" type="textarea" :rows="4" /></el-form-item>
            <el-form-item label="执行凭证">
              <div class="upload-line">
                <el-input v-model="updateForm.proofUrl" maxlength="500" placeholder="上传图片后自动填入，也可填写外部凭证 URL" />
                <el-upload
                  action="/api/admin/uploads/images"
                  name="file"
                  :headers="uploadHeaders()"
                  :show-file-list="false"
                  :before-upload="beforeImageUpload"
                  :on-success="handleUpdateProofUploadSuccess"
                  :on-error="handleProofUploadError"
                >
                  <el-button :icon="UploadFilled">上传</el-button>
                </el-upload>
                <el-button v-if="updateForm.proofUrl" @click="openProof(updateForm.proofUrl)">查看</el-button>
              </div>
            </el-form-item>
            <el-form-item label="发布时间"><el-date-picker v-model="updateForm.publishedAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="默认当前时间" /></el-form-item>
            <el-form-item label="公开展示"><el-switch v-model="updateForm.publicVisible" /></el-form-item>
          </el-form>
          <el-button type="primary" @click="saveProjectUpdate">发布动态</el-button>
        </div>
        <div class="update-list">
          <h3>已发布动态</h3>
          <el-empty v-if="!projectUpdates.length" description="暂无动态" />
          <div v-for="item in projectUpdates" :key="item.id" class="timeline-item">
            <strong>{{ item.title }}</strong>
            <span>{{ formatTime(item.publishedAt || item.createdAt) }} · {{ item.publicVisible ? "公开" : "隐藏" }}</span>
            <p>{{ item.content }}</p>
            <a v-if="item.proofUrl" :href="item.proofUrl" target="_blank">查看凭证</a>
          </div>
          <h3>拨付凭证</h3>
          <el-empty v-if="!projectDisbursements.length" description="暂无拨付记录" />
          <div v-for="item in projectDisbursements" :key="item.id" class="timeline-item">
            <strong>¥{{ money(item.amount) }}</strong>
            <span>{{ formatTime(item.createdAt) }} · {{ item.operator?.username || "系统" }}</span>
            <p>{{ item.remark || "公益项目拨付" }}</p>
            <a v-if="item.proofUrl" :href="item.proofUrl" target="_blank">查看凭证</a>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog v-model="disbursementDialogVisible" :title="activeDisbursementProject ? `公益拨付：${activeDisbursementProject.title}` : '公益拨付'" width="560px" destroy-on-close>
      <el-alert class="page-hint" type="info" :closable="false" :title="`当前公益池可用 ¥${money(summary?.availableAmount)}`" />
      <el-form :model="disbursementForm" label-width="96px">
        <el-form-item label="拨付金额" required><el-input-number v-model="disbursementForm.amount" :min="0.01" :precision="2" /></el-form-item>
        <el-form-item label="拨付说明"><el-input v-model="disbursementForm.remark" type="textarea" :rows="3" maxlength="500" /></el-form-item>
        <el-form-item label="拨付凭证">
          <div class="upload-line">
            <el-input v-model="disbursementForm.proofUrl" maxlength="500" placeholder="上传图片/PDF 后自动填入，也可填写外部凭证 URL" />
            <el-upload
              action="/api/admin/uploads/settlement-proofs"
              name="file"
              :headers="uploadHeaders()"
              :show-file-list="false"
              :before-upload="beforeProofUpload"
              :on-success="handleDisbursementProofUploadSuccess"
              :on-error="handleProofUploadError"
            >
              <el-button :icon="UploadFilled">上传</el-button>
            </el-upload>
            <el-button v-if="disbursementForm.proofUrl" @click="openProof(disbursementForm.proofUrl)">查看</el-button>
          </div>
        </el-form-item>
        <el-form-item label="公开展示"><el-switch v-model="disbursementForm.publicVisible" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="disbursementDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveDisbursement">登记拨付</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar-actions { display: flex; align-items: center; gap: 10px; }
.page-hint { margin-bottom: 16px; }
.metric-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; margin-bottom: 18px; }
.metric { min-height: 104px; display: grid; gap: 8px; padding: 18px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.metric span { color: #667085; font-size: 13px; }
.metric strong { color: #111827; font-size: 26px; }
.setting-card { margin-bottom: 18px; }
.unit { margin-left: 8px; color: #667085; }
.form-tip { margin-left: 10px; color: #667085; font-size: 13px; }
.table-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.table-head h3 { margin: 0; }
.filters { display: grid; grid-template-columns: 220px 150px 150px; gap: 10px; }
h3 { margin: 0 0 16px; }
.update-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start; }
.update-form, .update-list { min-width: 0; }
.timeline-item { padding: 12px 0; border-bottom: 1px solid #eef2f7; }
.timeline-item strong { display: block; color: #111827; }
.timeline-item span { display: block; margin-top: 4px; color: #667085; font-size: 12px; }
.timeline-item p { margin: 8px 0 0; color: #344054; line-height: 1.55; white-space: pre-wrap; }
.timeline-item a { display: inline-block; margin-top: 8px; color: #2563eb; }
.upload-line { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 10px; width: 100%; }
@media (max-width: 1100px) { .metric-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 760px) { .table-head { display: grid; } .filters { grid-template-columns: 1fr; } }
@media (max-width: 760px) { .update-layout { grid-template-columns: 1fr; } }
@media (max-width: 640px) { .metric-grid, .upload-line { grid-template-columns: 1fr; } }
</style>
