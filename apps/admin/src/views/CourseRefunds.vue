<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { Refresh, Search } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";

const loading = ref(false);
const errorMessage = ref("");
const rows = ref<any[]>([]);
const actionKey = ref("");
const requestId = ref(0);
const filters = reactive({ status: "", courseId: "" });
const statusOptions = [
  { value: "pending", label: "待审核" }, { value: "approved", label: "已审核" },
  { value: "processing", label: "通道处理中" }, { value: "completed", label: "已完成" },
  { value: "rejected", label: "已拒绝" }, { value: "failed", label: "处理失败" }
];
const statusLabels = Object.fromEntries(statusOptions.map((item) => [item.value, item.label]));
const scopeLocked = computed(() => loading.value || Boolean(actionKey.value));
const summary = computed(() => ({ total: rows.value.length, pending: rows.value.filter((row) => row.status === "pending").length, processing: rows.value.filter((row) => ["approved", "processing"].includes(row.status)).length, failed: rows.value.filter((row) => row.status === "failed").length }));

function money(value: unknown) { return `¥${(Number(value || 0) / 100).toFixed(2)}`; }
function formatTime(value?: string | null) { return value ? value.replace("T", " ").slice(0, 19) : "-"; }
function maskPhone(value: unknown) { const phone = String(value || ""); return /^1\d{10}$/.test(phone) ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone || "-"; }
function providerStatusText(value: unknown) {
  return ({ accepted: "渠道已受理", processing: "渠道处理中", success: "渠道成功", failed: "渠道失败", submission_unknown: "提交结果待核对", wallet_success: "余额已退回", manual_success: "线下退款已确认", sandbox_success: "沙箱退款成功", not_required: "无需渠道退款" } as Record<string, string>)[String(value || "")] || String(value || "-");
}

function scopeSnapshot() { return JSON.stringify({ status: filters.status, courseId: filters.courseId.trim() }); }
function currentRow(id: number, allowedStatuses: string[]) { return rows.value.find((row) => row.id === id && allowedStatuses.includes(row.status)) || null; }
function courseIdParam() {
  const value = filters.courseId.trim();
  if (!value) return undefined;
  if (!/^\d+$/.test(value) || Number(value) <= 0) throw new Error("课程编号必须是正整数");
  return Number(value);
}

async function load() {
  if (loading.value) return;
  let courseId: number | undefined;
  try { courseId = courseIdParam(); } catch (error: any) { errorMessage.value = error.message; return; }
  const currentRequestId = ++requestId.value;
  const snapshot = scopeSnapshot();
  loading.value = true; errorMessage.value = ""; rows.value = [];
  try {
    const result = await api.get<any, any[]>("/admin/course-refunds", { params: { status: filters.status || undefined, courseId } });
    if (currentRequestId !== requestId.value || snapshot !== scopeSnapshot()) return;
    if (!Array.isArray(result)) throw new Error("课程退款响应格式无效");
    rows.value = result;
  } catch (error: any) {
    if (currentRequestId !== requestId.value || snapshot !== scopeSnapshot()) return;
    rows.value = []; errorMessage.value = error.message || "课程退款加载失败";
  } finally { if (currentRequestId === requestId.value) loading.value = false; }
}

async function review(row: any, action: "approve" | "reject") {
  const key = `review:${row.id}`; if (actionKey.value) return;
  const snapshot = scopeSnapshot(); const generation = requestId.value;
  const target = currentRow(row.id, ["pending"]); if (!target) return ElMessage.error("退款单状态已变化，请刷新后重新操作");
  actionKey.value = key;
  try {
    let reviewRemark = "";
    if (action === "reject") {
      const input = await ElMessageBox.prompt("请输入拒绝退款原因", "拒绝课程退款", { inputType: "textarea", inputValidator: (value) => Boolean(String(value || "").trim()) || "请填写拒绝原因" });
      reviewRemark = String(input.value || "").trim();
    } else await ElMessageBox.confirm(`确认通过退款单 ${target.refundNo || target.id}？`, "通过课程退款", { type: "warning" });
    if (snapshot !== scopeSnapshot() || generation !== requestId.value || !currentRow(target.id, ["pending"])) throw new Error("退款单或筛选范围已变化，请重新操作");
    const saved: any = await api.post(`/admin/course-refunds/${target.id}/review`, { action, reviewRemark });
    ElMessage.success(action === "reject" ? "退款已拒绝" : saved.status === "processing" ? "审核通过，等待退款通道结果" : "退款已完成");
    await load();
  } catch (error: any) { if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "课程退款审核失败"); }
  finally { actionKey.value = ""; }
}

async function confirmResult(row: any, success: boolean) {
  const key = `confirm:${row.id}`; if (actionKey.value) return;
  const allowedStatuses = success ? ["approved", "processing", "failed"] : ["approved", "processing"];
  const snapshot = scopeSnapshot(); const generation = requestId.value;
  const target = currentRow(row.id, allowedStatuses); if (!target) return ElMessage.error("退款单状态已变化，请刷新后重新操作");
  actionKey.value = key;
  try {
    let payload: Record<string, unknown>;
    if (success) {
      const input = await ElMessageBox.prompt("可填写支付渠道退款单号，留空也可确认", "确认退款成功", { inputValue: target.providerRefundNo || "" });
      payload = { success: true, providerRefundNo: String(input.value || "").trim() || undefined };
    } else {
      const input = await ElMessageBox.prompt("请输入退款失败原因", "登记退款失败", { inputType: "textarea", inputValidator: (value) => Boolean(String(value || "").trim()) || "请填写失败原因" });
      payload = { success: false, failureReason: String(input.value || "").trim() };
    }
    if (snapshot !== scopeSnapshot() || generation !== requestId.value || !currentRow(target.id, allowedStatuses)) throw new Error("退款单或筛选范围已变化，请重新操作");
    await api.post(`/admin/course-refunds/${target.id}/confirm`, payload);
    ElMessage.success(success ? "退款结果已确认，学习权限与证书规则已同步" : "退款失败已登记");
    await load();
  } catch (error: any) { if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "退款结果确认失败"); }
  finally { actionKey.value = ""; }
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="toolbar"><h2>课程退款</h2><el-button :icon="Refresh" :loading="loading" :disabled="scopeLocked" @click="load">刷新</el-button></div>
    <el-alert v-if="errorMessage" class="page-error" type="error" show-icon :closable="false" :title="errorMessage"><template #default><el-button size="small" :disabled="Boolean(actionKey)" @click="load">重试课程退款</el-button></template></el-alert>
    <div class="summary-grid">
      <div class="summary-item"><span>退款单</span><strong>{{ summary.total }}</strong></div>
      <div class="summary-item"><span>待审核</span><strong>{{ summary.pending }}</strong></div>
      <div class="summary-item"><span>通道处理中</span><strong>{{ summary.processing }}</strong></div>
      <div class="summary-item"><span>处理失败</span><strong>{{ summary.failed }}</strong></div>
    </div>
    <div class="table-card">
      <el-form inline>
        <el-form-item label="状态"><el-select v-model="filters.status" clearable :disabled="scopeLocked" placeholder="全部状态" style="width:160px" @change="load"><el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" /></el-select></el-form-item>
        <el-form-item label="课程 ID"><el-input v-model="filters.courseId" clearable :disabled="scopeLocked" maxlength="12" placeholder="课程编号" style="width:150px" @keyup.enter="load" /></el-form-item>
        <el-button type="primary" :icon="Search" :disabled="scopeLocked" @click="load">查询</el-button>
      </el-form>
      <el-table v-loading="loading" :data="rows" stripe empty-text="暂无课程退款">
        <el-table-column prop="refundNo" label="退款单号" min-width="190" show-overflow-tooltip /><el-table-column prop="order.orderNo" label="课程订单号" min-width="190" show-overflow-tooltip /><el-table-column prop="order.course.title" label="课程" min-width="180" show-overflow-tooltip />
        <el-table-column label="会员" min-width="140"><template #default="{row}">{{ row.order?.user?.nickname || maskPhone(row.order?.user?.phone) }}</template></el-table-column>
        <el-table-column label="金额" width="110"><template #default="{row}"><strong>{{ money(row.amountFen) }}</strong><small>{{ row.amountFen }} 分</small></template></el-table-column><el-table-column prop="reason" label="申请原因" min-width="180" show-overflow-tooltip />
        <el-table-column label="状态" width="120"><template #default="{row}">{{ statusLabels[row.status] || row.status }}</template></el-table-column>
        <el-table-column label="渠道结果" min-width="210"><template #default="{row}"><span>{{ providerStatusText(row.providerRefundStatus) }}</span><small v-if="row.providerRefundNo">{{ row.providerRefundNo }}</small><small v-if="row.failureReason">{{ row.failureReason }}</small><small v-if="row.providerRefundNextQueryAt">下次查询：{{ formatTime(row.providerRefundNextQueryAt) }} · 已查 {{ row.providerRefundRetryCount || 0 }} 次</small></template></el-table-column>
        <el-table-column label="申请时间" width="170"><template #default="{row}">{{ formatTime(row.createdAt) }}</template></el-table-column>
        <el-table-column label="操作" width="230"><template #default="{row}">
          <el-button v-if="row.status==='pending'" link type="success" :loading="actionKey===`review:${row.id}`" :disabled="Boolean(actionKey)" @click="review(row,'approve')">通过</el-button><el-button v-if="row.status==='pending'" link type="danger" :loading="actionKey===`review:${row.id}`" :disabled="Boolean(actionKey)" @click="review(row,'reject')">拒绝</el-button>
          <el-button v-if="['approved','processing','failed'].includes(row.status)" link type="success" :loading="actionKey===`confirm:${row.id}`" :disabled="Boolean(actionKey)" @click="confirmResult(row,true)">确认成功</el-button><el-button v-if="['approved','processing'].includes(row.status)" link type="danger" :disabled="Boolean(actionKey)" @click="confirmResult(row,false)">登记失败</el-button>
        </template></el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.page-error{margin-bottom:14px}
.summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}
.summary-item{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;display:flex;align-items:center;justify-content:space-between}
.summary-item span{color:#667085}.summary-item strong{font-size:22px}small{display:block;margin-top:3px;color:#667085}
@media(max-width:760px){.summary-grid{grid-template-columns:1fr}.table-card :deep(.el-form){display:grid;grid-template-columns:1fr}.table-card :deep(.el-form-item),.table-card :deep(.el-select),.table-card :deep(.el-input){width:100%!important;margin-right:0}}
</style>
