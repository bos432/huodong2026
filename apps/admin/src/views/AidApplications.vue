<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { Document, EditPen, Lock, View } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api, downloadFile } from "../api";
import { canAccess } from "../permissions";

const loading = ref(false);
const errorMessage = ref("");
const rows = ref<any[]>([]);
const total = ref(0);
const detailVisible = ref(false);
const detail = ref<any>(null);
const sensitive = ref<any>(null);
const detailTargetId = ref<number | null>(null);
const detailLoading = ref(false);
const detailError = ref("");
const revealLoading = ref(false);
const actionKey = ref("");
const materialDownloadId = ref<number | null>(null);
const filters = reactive({ status: "", type: "", city: "", keyword: "", page: 1, pageSize: 30 });
const canManage = computed(() => canAccess(["aid.manage"]));
const canReveal = computed(() => canAccess(["aid.sensitive"]));
const statusText: Record<string, string> = { submitted: "已提交", supplement_required: "待补件", pending_review: "待审核", approved: "已批准", rejected: "已拒绝", closed: "已关闭" };
const typeText: Record<string, string> = { personal: "个人帮扶", project: "项目援助" };

function operationKey(action: string, id: number) {
  const uuid = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `aid:${action}:${id}:${uuid}`;
}

async function load() {
  loading.value = true;
  errorMessage.value = "";
  try {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "" && value !== null && value !== undefined));
    const result = await api.get<any, any>("/admin/aid-applications", { params });
    rows.value = result.items || [];
    total.value = Number(result.total || 0);
  } catch (error: any) {
    errorMessage.value = error.message || "援助申请加载失败";
    ElMessage.error(errorMessage.value);
  } finally { loading.value = false; }
}

async function openDetail(row: any) {
  const id = Number(row.id);
  detailTargetId.value = id;
  detailVisible.value = true;
  detailLoading.value = true;
  detailError.value = "";
  detail.value = null;
  sensitive.value = null;
  try {
    detail.value = await api.get<any, any>(`/admin/aid-applications/${id}`);
  } catch (error: any) {
    detailError.value = error.message || "援助申请详情加载失败";
    ElMessage.error(detailError.value);
  } finally {
    detailLoading.value = false;
  }
}

async function reveal() {
  if (!detail.value?.application || revealLoading.value) return;
  revealLoading.value = true;
  try {
    sensitive.value = await api.post<any, any>(`/admin/aid-applications/${detail.value.application.id}/reveal`);
    ElMessage.success("敏感信息已临时解密，本次查看已记录审计");
  } catch (error: any) {
    ElMessage.error(error.message || "敏感信息查看失败");
  } finally {
    revealLoading.value = false;
  }
}

async function action(row: any, name: "assign" | "request_supplement" | "approve" | "reject" | "close" | "followup") {
  const currentKey = `${name}:${row.id}`;
  if (actionKey.value) return;
  actionKey.value = currentKey;
  try {
    let assigneeId: number | undefined;
    let remark = "";
    if (name === "assign") {
      const result = await ElMessageBox.prompt("填写平台管理员 ID；负责人不能执行最终审核。", "分配负责人", { inputPattern: /^\d+$/, inputErrorMessage: "请输入管理员 ID" });
      assigneeId = Number(result.value);
    } else {
      const labels: Record<string, string> = { request_supplement: "发起补件", approve: "批准申请", reject: "拒绝申请", close: "关闭申请", followup: "登记跟进" };
      const result = await ElMessageBox.prompt(`填写“${labels[name]}”的说明。敏感内容会加密保存。`, labels[name], { inputType: "textarea", inputValidator: (value) => Boolean(String(value || "").trim()) || "请填写说明" });
      remark = String(result.value || "").trim();
    }
    await api.post(`/admin/aid-applications/${row.id}/actions`, { action: name, assigneeId, remark: remark || undefined, businessKey: operationKey(name, row.id) });
    ElMessage.success("操作已保存");
    await load();
    if (detailVisible.value && detailTargetId.value === Number(row.id)) await openDetail({ id: row.id });
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "援助申请操作失败");
  } finally {
    actionKey.value = "";
  }
}

function materialName(item: any) { return sensitive.value?.materials?.find((row: any) => row.id === item.id)?.originalName || item.originalName; }
async function downloadMaterial(item: any) {
  if (materialDownloadId.value !== null) return;
  materialDownloadId.value = Number(item.id);
  try {
    await downloadFile(`/admin/aid-application-materials/${item.id}/download`, materialName(item) || `aid-material-${item.id}`);
    ElMessage.success("敏感材料已完成审计下载");
  } catch (error: any) {
    ElMessage.error(error.message || "敏感材料下载失败");
  } finally {
    materialDownloadId.value = null;
  }
}
function formatTime(value?: string) { return value ? value.replace("T", " ").slice(0, 16) : "-"; }
watch(detailVisible, (visible) => { if (!visible) sensitive.value = null; });
onMounted(load);
</script>

<template>
  <div class="aid-page">
    <header class="page-head"><div><h2>援助申请</h2><p>脱敏受理、加密材料、补件、审核和跟进记录。</p></div></header>
    <section class="toolbar">
      <el-select v-model="filters.status" clearable placeholder="全部状态" @change="filters.page = 1; load()"><el-option v-for="(label, value) in statusText" :key="value" :label="label" :value="value" /></el-select>
      <el-select v-model="filters.type" clearable placeholder="全部类型" @change="filters.page = 1; load()"><el-option label="个人帮扶" value="personal" /><el-option label="项目援助" value="project" /></el-select>
      <el-input v-model="filters.city" clearable placeholder="城市" @keyup.enter="load" />
      <el-input v-model="filters.keyword" clearable placeholder="申请编号/脱敏姓名/方向" @keyup.enter="load" />
      <el-button type="primary" @click="filters.page = 1; load()">查询</el-button>
    </section>
    <el-alert v-if="errorMessage" type="error" show-icon :closable="false" :title="errorMessage"><template #default><el-button size="small" @click="load">重试</el-button></template></el-alert>
    <el-table v-loading="loading" :data="rows" stripe empty-text="暂无援助申请">
      <el-table-column prop="applicationNo" label="申请编号" min-width="190" />
      <el-table-column label="申请人" min-width="130"><template #default="{ row }"><strong>{{ row.applicantNameMasked }}</strong><small>{{ row.phoneMasked }}</small></template></el-table-column>
      <el-table-column label="类型" width="110"><template #default="{ row }">{{ typeText[row.type] || row.type }}</template></el-table-column>
      <el-table-column prop="city" label="城市" width="110" />
      <el-table-column prop="supportCategory" label="帮扶方向" min-width="180" show-overflow-tooltip />
      <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag>{{ statusText[row.status] || row.status }}</el-tag></template></el-table-column>
      <el-table-column label="材料" width="80"><template #default="{ row }">{{ row.materialCount }}</template></el-table-column>
      <el-table-column label="负责人" width="120"><template #default="{ row }">{{ row.assignee?.username || "未分配" }}</template></el-table-column>
      <el-table-column label="提交时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
      <el-table-column label="操作" width="270" fixed="right"><template #default="{ row }">
        <el-button :icon="View" size="small" :loading="detailLoading && detailTargetId === row.id" :disabled="detailLoading" @click="openDetail(row)">详情</el-button>
        <el-button v-if="canManage" :icon="EditPen" size="small" :loading="actionKey === `followup:${row.id}`" :disabled="Boolean(actionKey)" @click="action(row, 'followup')">跟进</el-button>
        <el-dropdown v-if="canManage" trigger="click" :disabled="Boolean(actionKey)"><el-button size="small" :loading="actionKey.endsWith(`:${row.id}`)">处理</el-button><template #dropdown><el-dropdown-menu>
          <el-dropdown-item @click="action(row, 'assign')">分配负责人</el-dropdown-item>
          <el-dropdown-item v-if="['submitted', 'pending_review'].includes(row.status)" @click="action(row, 'request_supplement')">要求补件</el-dropdown-item>
          <el-dropdown-item v-if="['submitted', 'pending_review'].includes(row.status)" @click="action(row, 'approve')">批准</el-dropdown-item>
          <el-dropdown-item v-if="['submitted', 'pending_review'].includes(row.status)" @click="action(row, 'reject')">拒绝</el-dropdown-item>
          <el-dropdown-item v-if="['approved', 'rejected'].includes(row.status)" @click="action(row, 'close')">关闭</el-dropdown-item>
        </el-dropdown-menu></template></el-dropdown>
      </template></el-table-column>
    </el-table>
    <el-pagination v-model:current-page="filters.page" v-model:page-size="filters.pageSize" :total="total" layout="total, prev, pager, next" @current-change="load" />

    <el-drawer v-model="detailVisible" title="援助申请详情" size="720px" destroy-on-close>
      <div v-loading="detailLoading" class="detail-body">
      <el-alert v-if="detailError" type="error" show-icon :closable="false" :title="detailError"><template #default><el-button size="small" :loading="detailLoading" @click="openDetail({ id: detailTargetId })">重试</el-button></template></el-alert>
      <template v-if="detail?.application">
        <section class="summary-grid"><div><span>申请编号</span><strong>{{ detail.application.applicationNo }}</strong></div><div><span>状态</span><strong>{{ statusText[detail.application.status] }}</strong></div><div><span>申请人</span><strong>{{ detail.application.applicantNameMasked }} / {{ detail.application.phoneMasked }}</strong></div><div><span>方向</span><strong>{{ detail.application.supportCategory }}</strong></div></section>
        <div class="section-head"><h3>敏感资料</h3><el-button v-if="canReveal" :icon="Lock" type="warning" plain :loading="revealLoading" :disabled="revealLoading" @click="reveal">授权查看</el-button></div>
        <el-alert v-if="!sensitive" title="默认仅展示脱敏信息；查看完整资料会写入不可变审计记录。" type="info" :closable="false" />
        <section v-else class="sensitive-grid"><div><span>姓名</span><strong>{{ sensitive.payload.applicantName }}</strong></div><div><span>手机号</span><strong>{{ sensitive.payload.phone }}</strong></div><div><span>微信</span><strong>{{ sensitive.payload.wechat }}</strong></div><div><span>证件号</span><strong>{{ sensitive.payload.identityNo || '-' }}</strong></div><div><span>机构</span><strong>{{ sensitive.payload.organizationName || '-' }}</strong></div><div><span>地址</span><strong>{{ sensitive.payload.address || '-' }}</strong></div><div class="wide"><span>申请需求</span><p>{{ sensitive.payload.requestedSupport }}</p></div><div class="wide"><span>情况说明</span><p>{{ sensitive.payload.situation }}</p></div><div v-for="item in sensitive.eventContents" :key="item.id" class="wide"><span>{{ item.action }} · {{ formatTime(item.createdAt) }}</span><p>{{ item.content }}</p></div></section>
        <div class="section-head"><h3>加密材料</h3></div>
        <el-empty v-if="!detail.materials?.length" description="暂无材料" /><div v-for="item in detail.materials" :key="item.id" class="material-row"><div><strong>{{ materialName(item) }}</strong><small>{{ item.category }} · {{ Math.ceil(item.size / 1024) }} KB</small></div><el-button v-if="canReveal" :icon="Document" size="small" :loading="materialDownloadId===item.id" :disabled="materialDownloadId!==null" @click="downloadMaterial(item)">审计下载</el-button></div>
        <div class="section-head"><h3>处理时间线</h3></div>
        <el-timeline><el-timeline-item v-for="item in detail.events" :key="item.id" :timestamp="formatTime(item.createdAt)"><strong>{{ item.action }}</strong><p>{{ statusText[item.fromStatus] || item.fromStatus || '新申请' }} → {{ statusText[item.toStatus] || item.toStatus }}</p><small>{{ item.operator?.username || '系统' }}<template v-if="item.content"> · {{ item.content }}</template></small></el-timeline-item></el-timeline>
      </template>
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.aid-page { display: grid; gap: 16px; }
.page-head { display: flex; align-items: flex-start; justify-content: space-between; }
h2, h3, p { margin: 0; }
.page-head p, small, span { color: #667085; }
.toolbar { display: grid; grid-template-columns: 160px 160px 160px minmax(240px, 1fr) auto; gap: 10px; }
.el-table small { display: block; margin-top: 4px; }
.summary-grid, .sensitive-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.summary-grid > div, .sensitive-grid > div { min-width: 0; padding: 12px; border: 1px solid #e4e7ec; border-radius: 6px; }
.summary-grid span, .sensitive-grid span { display: block; margin-bottom: 6px; font-size: 12px; }
.wide { grid-column: 1 / -1; }
.wide p { white-space: pre-wrap; line-height: 1.6; }
.section-head { display: flex; align-items: center; justify-content: space-between; margin: 22px 0 10px; }
.detail-body { min-height: 180px; }
.material-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 0; border-bottom: 1px solid #eaecf0; }
.material-row small { display: block; margin-top: 4px; }
@media (max-width: 900px) { .toolbar { grid-template-columns: 1fr 1fr; } .summary-grid, .sensitive-grid { grid-template-columns: 1fr; } .wide { grid-column: auto; } }
</style>
