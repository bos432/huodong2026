<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";
import { canAccess, permissions } from "../permissions";

const loading = ref(false);
const savingSetting = ref(false);
const savingProject = ref(false);
const summary = ref<any>(null);
const setting = ref<any>(null);
const transactions = ref<any[]>([]);
const projects = ref<any[]>([]);
const projectDialogVisible = ref(false);
const editingProjectId = ref<number | null>(null);
const settingForm = reactive({ enabled: true, ratePercent: 5, accrualBasis: "paid_amount", manualBasisAmount: undefined as number | undefined, userDisplayName: "我的公益贡献", publicNote: "公益金来自平台订单收入计提，用户无需额外支付。" });
const projectForm = reactive({ title: "", targetAmount: 500, status: "fundraising", coverUrl: "", description: "", executedAt: "", publicVisible: true });

const canOperate = computed(() => canAccess(permissions.operation));
const canFinance = computed(() => canAccess(permissions.finance));

const statusText: Record<string, string> = {
  fundraising: "筹集中",
  pending_execution: "待执行",
  executing: "执行中",
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
        publicNote: settingData.publicNote || "公益金来自平台订单收入计提，用户无需额外支付。"
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
  const { value: amountText } = await ElMessageBox.prompt(`当前公益池可用 ¥${money(summary.value?.availableAmount)}，请输入「${row.title}」本次拨付金额。`, "登记公益拨付", { inputValue: "100", confirmButtonText: "下一步", cancelButtonText: "取消" });
  const amount = Number(amountText);
  if (!Number.isFinite(amount) || amount <= 0) return ElMessage.error("拨付金额必须大于 0");
  const { value: remark } = await ElMessageBox.prompt("填写拨付说明或凭证摘要。", "拨付说明", { inputType: "textarea", inputValue: "公益项目执行拨付", confirmButtonText: "登记", cancelButtonText: "取消" });
  try {
    await api.post(`/admin/charity/projects/${row.id}/disbursements`, { amount, remark });
    ElMessage.success("拨付已登记");
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "登记失败");
  }
}

function money(value?: string | number) {
  return Number(value || 0).toFixed(2);
}

function formatTime(value?: string) {
  return value ? value.replace("T", " ").slice(0, 16) : "-";
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
        <el-table-column v-if="canOperate || canFinance" label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canOperate" size="small" @click="openEditProject(row)">编辑</el-button>
            <el-button v-if="canFinance" size="small" type="primary" @click="addDisbursement(row)">拨付</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <div v-if="canFinance" class="table-card">
      <h3>公益流水</h3>
      <el-table :data="transactions" stripe empty-text="暂无公益流水">
        <el-table-column label="类型" width="110"><template #default="{ row }">{{ typeText[row.type] || row.type }}</template></el-table-column>
        <el-table-column label="方向" width="90"><template #default="{ row }"><el-tag :type="row.direction === 'credit' ? 'success' : 'warning'">{{ row.direction === "credit" ? "入池" : "出池" }}</el-tag></template></el-table-column>
        <el-table-column label="金额" width="120"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
        <el-table-column label="计提基准" width="120"><template #default="{ row }">¥{{ money(row.basisAmount) }}</template></el-table-column>
        <el-table-column label="比例" width="90"><template #default="{ row }">{{ row.ratePercent }}%</template></el-table-column>
        <el-table-column label="订单" min-width="160" show-overflow-tooltip><template #default="{ row }">{{ row.order?.orderNo || "-" }}</template></el-table-column>
        <el-table-column label="用户" min-width="140" show-overflow-tooltip><template #default="{ row }">{{ row.user?.phone || row.user?.nickname || "-" }}</template></el-table-column>
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
h3 { margin: 0 0 16px; }
@media (max-width: 1100px) { .metric-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 640px) { .metric-grid { grid-template-columns: 1fr; } }
</style>
