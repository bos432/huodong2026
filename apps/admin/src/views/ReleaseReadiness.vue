<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";
import { canAccess } from "../permissions";

type ReadinessItem = {
  id: number; key: string; category: string; label: string; status: string; owner?: string | null; reviewer?: string | null;
  blockingReason?: string | null; evidence?: Record<string, unknown> | null; lastCheckedAt?: string | null; updatedAt?: string | null;
};
type Summary = { total: number; unconfigured: number; configured: number; externalPending: number; accepted: number; blocked: number; expired: number; ready?: boolean; blockers?: string[] };

const loading = ref(false);
const savingKey = ref("");
const error = ref("");
const items = ref<ReadinessItem[]>([]);
const summary = ref<Summary>({ total: 0, unconfigured: 0, configured: 0, externalPending: 0, accepted: 0, blocked: 0, expired: 0 });
const fixtures = ref<any[]>([]);
const events = ref<any[]>([]);
const fixtureDialog = ref(false);
const fixtureSaving = ref(false);
const fixtureForm = reactive({ kind: "test_account", label: "", maskedIdentifier: "", status: "planned", notes: "" });
const form = reactive<Record<string, { owner: string; reviewer: string; blockingReason: string }>>({});
const canManage = computed(() => canAccess(["release_readiness.manage"]));
const statusMap: Record<string, { label: string; type: "info" | "warning" | "success" | "danger" }> = {
  unconfigured: { label: "未配置", type: "info" }, configured: { label: "已配置", type: "warning" }, external_pending: { label: "外部验收中", type: "warning" }, accepted: { label: "已验收", type: "success" }, blocked: { label: "已阻塞", type: "danger" }, expired: { label: "已过期", type: "danger" }
};

function statusOf(status: string) { return statusMap[status] || { label: status || "未知", type: "info" as const }; }
function statusLabel(status: string) { return statusOf(status).label; }
function formatTime(value?: string | null) { return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "—"; }
function ensureForm(row: ReadinessItem) { if (!form[row.key]) form[row.key] = { owner: row.owner || "", reviewer: row.reviewer || "", blockingReason: row.blockingReason || "" }; return form[row.key]; }

async function load() {
  loading.value = true; error.value = "";
  try {
    const [data, fixtureRows, eventRows] = await Promise.all([
      api.get<any, { items: ReadinessItem[]; summary: Summary }>("/admin/release-readiness"),
      api.get<any, any[]>("/admin/release-readiness/fixtures"),
      api.get<any, any[]>("/admin/release-readiness/events")
    ]);
    items.value = data?.items || []; summary.value = data?.summary || summary.value; fixtures.value = fixtureRows || []; events.value = eventRows || [];
    items.value.forEach(ensureForm);
  } catch (e: any) { error.value = e.message || "加载上线验收中心失败"; }
  finally { loading.value = false; }
}

async function save(row: ReadinessItem) {
  if (!canManage.value) return;
  const value = ensureForm(row); savingKey.value = row.key;
  try { await api.put(`/admin/release-readiness/items/${encodeURIComponent(row.key)}`, value); ElMessage.success(`${row.label}配置说明已保存`); await load(); }
  catch (e: any) { ElMessage.error(e.message || "保存失败"); }
  finally { savingKey.value = ""; }
}

async function check(row: ReadinessItem) {
  savingKey.value = row.key;
  try { await api.post(`/admin/release-readiness/items/${encodeURIComponent(row.key)}/check`); ElMessage.success("只读检查完成，等待外部验收证据"); await load(); }
  catch (e: any) { ElMessage.error(e.message || "检查失败"); }
  finally { savingKey.value = ""; }
}

async function verify(row: ReadinessItem) {
  if (!canManage.value) return;
  const evidenceText = await ElMessageBox.prompt("只填写脱敏证据摘要，例如服务商回执号尾号、真机日期、体验版版本；不要填写密钥或验证码。", "确认外部验收", { inputPlaceholder: "外部证据摘要", inputValidator: (value) => value.trim() ? true : "证据摘要不能为空" }).then((result) => result.value).catch(() => "");
  if (!evidenceText) return;
  savingKey.value = row.key;
  try { await api.post(`/admin/release-readiness/items/${encodeURIComponent(row.key)}/verify`, { confirmation: "EXTERNAL_ACCEPTANCE_CONFIRMED", reviewer: row.reviewer || "", evidence: { summary: evidenceText } }); ElMessage.success(`${row.label}已记录为外部验收完成`); await load(); }
  catch (e: any) { ElMessage.error(e.message || "验收确认失败"); }
  finally { savingKey.value = ""; }
}

async function block(row: ReadinessItem) {
  const reason = await ElMessageBox.prompt("填写阻塞原因，便于后续负责人处理。", "标记阻塞", { inputPlaceholder: "阻塞原因", inputValidator: (value) => value.trim() ? true : "阻塞原因不能为空" }).then((result) => result.value).catch(() => "");
  if (!reason) return;
  savingKey.value = row.key;
  try { await api.post(`/admin/release-readiness/items/${encodeURIComponent(row.key)}/block`, { reason }); ElMessage.warning("已记录阻塞原因"); await load(); }
  catch (e: any) { ElMessage.error(e.message || "标记失败"); }
  finally { savingKey.value = ""; }
}

function openFixtureDialog() {
  Object.assign(fixtureForm, { kind: "test_account", label: "", maskedIdentifier: "", status: "planned", notes: "" });
  fixtureDialog.value = true;
}

async function createFixture() {
  if (!canManage.value) return;
  const kind = fixtureForm.kind.trim();
  const label = fixtureForm.label.trim();
  const maskedIdentifier = fixtureForm.maskedIdentifier.trim();
  if (!kind || !label || !maskedIdentifier) { ElMessage.warning("请填写类型、名称和脱敏标识"); return; }
  if (!maskedIdentifier.includes("*") || /^\d+$/.test(maskedIdentifier)) { ElMessage.warning("只能登记脱敏标识，例如 wx***1234"); return; }
  fixtureSaving.value = true;
  try {
    await api.post("/admin/release-readiness/fixtures", { ...fixtureForm, kind, label, maskedIdentifier, notes: fixtureForm.notes.trim() });
    ElMessage.success("测试夹具已登记");
    fixtureDialog.value = false;
    await load();
  } catch (e: any) { ElMessage.error(e.message || "登记失败"); }
  finally { fixtureSaving.value = false; }
}

onMounted(load);
</script>

<template>
  <section class="readiness-page" data-admin-page>
    <header class="page-header">
      <div><p class="eyebrow">RELEASE CONTROL</p><h1>上线验收中心</h1><p class="subtle">把配置、外部动作和验收证据放在同一条可审计链路里。</p></div>
      <el-button :loading="loading" @click="load">刷新状态</el-button>
    </header>
    <el-alert type="warning" :closable="false" show-icon title="配置完成 ≠ 真实验收完成">
      支付、短信、微信订阅消息、真机和体验版发布必须完成外部动作，并由授权负责人确认脱敏证据后，才能标记“已验收”。
    </el-alert>
    <el-alert v-if="error" type="error" show-icon :closable="false" class="state-alert">{{ error }} <el-button link @click="load">重试</el-button></el-alert>
    <div class="summary-grid">
      <div class="summary-card primary"><span>总体状态</span><strong>{{ summary.ready ? "已满足验收" : "受控运营" }}</strong><small>{{ summary.accepted }}/{{ summary.total }} 项已验收</small></div>
      <div class="summary-card"><span>已配置</span><strong>{{ summary.configured }}</strong><small>等待外部动作</small></div>
      <div class="summary-card"><span>外部验收中</span><strong>{{ summary.externalPending }}</strong><small>需要证据</small></div>
      <div class="summary-card danger"><span>阻塞</span><strong>{{ summary.blocked + summary.expired }}</strong><small>请先处理原因</small></div>
    </div>
    <el-alert v-if="!summary.ready" type="warning" :closable="false" show-icon class="launch-gate-alert" title="正式运营闸门未打开">
      <ul class="blocker-list"><li v-for="blocker in (summary.blockers || [])" :key="blocker">{{ blocker }}</li></ul>
    </el-alert>
    <div class="policy-note"><strong>安全边界</strong><span>验收中心不保存支付密钥、短信密钥、验证码或私钥；只引用现有加密配置，并保存脱敏证据摘要。</span></div>
    <div v-if="loading && !items.length" class="empty-state">正在加载验收项…</div>
    <div v-else-if="!items.length" class="empty-state">暂无验收项 <el-button link @click="load">重试</el-button></div>
    <div v-else class="item-list">
      <article v-for="row in items" :key="row.key" class="item-card">
        <div class="item-head"><div><span class="category">{{ row.category }}</span><h2>{{ row.label }}</h2></div><el-tag :type="statusOf(row.status).type">{{ statusLabel(row.status) }}</el-tag></div>
        <div class="form-grid">
          <el-input v-model="ensureForm(row).owner" :disabled="!canManage" placeholder="负责人" aria-label="负责人"><template #prepend>负责人</template></el-input>
          <el-input v-model="ensureForm(row).reviewer" :disabled="!canManage" placeholder="复核人" aria-label="复核人"><template #prepend>复核人</template></el-input>
        </div>
        <p v-if="row.blockingReason" class="blocking">阻塞/待办：{{ row.blockingReason }}</p>
        <p v-if="row.evidence?.summary" class="evidence">证据摘要：{{ row.evidence.summary }} · 最近检查 {{ formatTime(row.lastCheckedAt) }}</p>
        <div class="item-actions"><el-button size="small" :loading="savingKey === row.key" :disabled="!canManage" @click="save(row)">保存配置说明</el-button><el-button size="small" :loading="savingKey === row.key" @click="check(row)">只读检查</el-button><el-button size="small" type="success" :disabled="!canManage || row.status !== 'external_pending'" @click="verify(row)">确认外部验收</el-button><el-button size="small" type="danger" plain :disabled="!canManage" @click="block(row)">标记阻塞</el-button></div>
      </article>
    </div>
    <div class="lower-grid">
      <section class="sub-panel"><div class="panel-title"><div><h2>测试账号与测试订单</h2><span>仅保存脱敏标识</span></div><el-button v-if="canManage" size="small" @click="openFixtureDialog">登记夹具</el-button></div><div v-if="!fixtures.length" class="muted">还没有登记测试夹具。</div><div v-for="fixture in fixtures" :key="fixture.id" class="fixture-row"><div><strong>{{ fixture.label }}</strong><small>{{ fixture.kind }} · {{ fixture.maskedIdentifier }}</small><small v-if="fixture.notes">{{ fixture.notes }}</small></div><el-tag>{{ fixture.status }}</el-tag></div></section>
      <section class="sub-panel"><div class="panel-title"><h2>验收记录</h2><span>最近 100 条</span></div><div v-if="!events.length" class="muted">暂无状态变更记录。</div><div v-for="event in events.slice(0, 8)" :key="event.id" class="event-row"><div><strong>{{ event.itemKey }} · {{ event.action }}</strong><small>{{ event.fromStatus }} → {{ event.toStatus }} · {{ event.actorUsername || "系统" }}</small></div><time>{{ formatTime(event.createdAt) }}</time></div></section>
    </div>
    <el-dialog v-model="fixtureDialog" title="登记测试夹具" width="520px">
      <el-alert type="info" :closable="false" show-icon>只登记脱敏标识。不要填写密码、验证码、私钥或完整手机号。</el-alert>
      <div class="fixture-form">
        <el-select v-model="fixtureForm.kind" placeholder="夹具类型" aria-label="夹具类型"><el-option label="测试账号" value="test_account" /><el-option label="测试订单" value="test_order" /><el-option label="测试设备" value="test_device" /></el-select>
        <el-input v-model="fixtureForm.label" placeholder="名称，例如：真机验收账号" aria-label="夹具名称" />
        <el-input v-model="fixtureForm.maskedIdentifier" placeholder="脱敏标识，例如：wx***1234" aria-label="脱敏标识" />
        <el-select v-model="fixtureForm.status" placeholder="状态" aria-label="夹具状态"><el-option label="计划中" value="planned" /><el-option label="已准备" value="ready" /><el-option label="已通过" value="passed" /><el-option label="未通过" value="failed" /></el-select>
        <el-input v-model="fixtureForm.notes" type="textarea" :rows="3" placeholder="备注（可选，不要填写敏感信息）" aria-label="夹具备注" />
      </div>
      <template #footer><el-button @click="fixtureDialog = false">取消</el-button><el-button type="primary" :loading="fixtureSaving" @click="createFixture">保存登记</el-button></template>
    </el-dialog>
  </section>
</template>

<style scoped>
.readiness-page { padding: 24px; max-width: 1440px; margin: 0 auto; color: #172033; }
.page-header, .item-head, .panel-title, .item-actions { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.eyebrow, .category { margin: 0; color: #6b7280; font-size: 11px; letter-spacing: .08em; font-weight: 700; }
h1 { margin: 5px 0 6px; font-size: 28px; line-height: 1.2; } h2 { margin: 5px 0 0; font-size: 16px; } .subtle, .muted, small { color: #6b7280; font-size: 12px; line-height: 1.5; }
.summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 18px 0; }.summary-card, .item-card, .sub-panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; }.summary-card { padding: 16px; display: grid; gap: 6px; }.summary-card strong { font-size: 25px; }.summary-card.primary strong { color: #0f766e; }.summary-card.danger strong { color: #b42318; }.summary-card small { margin: 0; }.policy-note { padding: 12px 14px; background: #f0fdfa; border: 1px solid #99f6e4; border-radius: 8px; display: flex; gap: 10px; margin-bottom: 16px; font-size: 13px; }.state-alert { margin-top: 12px; }.item-list { display: grid; gap: 12px; }.item-card { padding: 16px; }.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 14px 0 10px; }.blocking { color: #b42318; font-size: 12px; margin: 8px 0; }.evidence { color: #166534; font-size: 12px; margin: 8px 0; }.item-actions { justify-content: flex-start; flex-wrap: wrap; }.lower-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }.sub-panel { padding: 16px; }.panel-title { margin-bottom: 10px; }.panel-title h2 { margin: 0; }.fixture-row, .event-row { display: flex; justify-content: space-between; gap: 12px; align-items: center; padding: 10px 0; border-top: 1px solid #f0f2f5; }.fixture-row div, .event-row div { display: grid; gap: 3px; }.fixture-row small, .event-row small { color: #6b7280; }.event-row time { white-space: nowrap; font-size: 11px; color: #6b7280; }.empty-state { padding: 42px; text-align: center; color: #6b7280; background: #fff; border: 1px dashed #d1d5db; border-radius: 8px; margin-top: 16px; }
.launch-gate-alert { margin-bottom: 16px; }.blocker-list { margin: 0; padding-left: 18px; line-height: 1.7; }
 .fixture-form { display: grid; gap: 12px; margin-top: 16px; }.fixture-form :deep(.el-textarea) { grid-column: 1 / -1; }
@media (max-width: 900px) { .summary-grid { grid-template-columns: repeat(2, 1fr); }.lower-grid { grid-template-columns: 1fr; } }
@media (max-width: 600px) { .readiness-page { padding: 16px; }.page-header { align-items: flex-start; }.page-header, .item-head { flex-direction: column; align-items: flex-start; }.form-grid { grid-template-columns: 1fr; }.summary-grid { grid-template-columns: 1fr 1fr; }.item-actions .el-button { margin-left: 0; } }
</style>
