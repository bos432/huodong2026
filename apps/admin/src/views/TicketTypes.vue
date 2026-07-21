<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { Edit, Plus, Refresh } from "@element-plus/icons-vue";
import { api } from "../api";
import { hasPermission } from "../permissions";

const rows = ref<any[]>([]);
const activities = ref<any[]>([]);
const ticketLoading = ref(false);
const activityLoading = ref(false);
const dialog = ref(false);
const saving = ref(false);
const activityErrorMessage = ref("");
const ticketErrorMessage = ref("");
const ticketGeneration = ref(0);
const activityGeneration = ref(0);
const editingId = ref<number | null>(null);
const editingActivityId = ref<number | null>(null);
const dialogTicketGeneration = ref(0);
const dialogFilterActivityId = ref<number | undefined>();
const selectedActivityId = ref<number | undefined>();
const canManage = computed(() => hasPermission("ticket.manage"));
const loading = computed(() => ticketLoading.value || activityLoading.value);
const scopeLocked = computed(() => loading.value || saving.value || dialog.value);

const form = reactive({
  activityId: undefined as number | undefined,
  name: "",
  price: 0,
  capacity: undefined as number | undefined,
  perUserLimit: 1,
  saleStartsAt: "",
  saleEndsAt: "",
  earlyBirdPrice: undefined as number | undefined,
  earlyBirdEndsAt: "",
  memberPrice: undefined as number | undefined,
  tierPrices: [] as Array<{ minSold: number; price: number }>,
  enabled: true
});

const activityMap = computed(() => new Map(activities.value.map((item) => [item.id, item.title])));

async function loadActivities() {
  const generation = ++activityGeneration.value;
  activityLoading.value = true;
  activityErrorMessage.value = "";
  activities.value = [];
  try {
    const result = await api.get<any, { activities: any[] }>("/admin/ticket-types/options");
    if (generation !== activityGeneration.value) return;
    if (!result || !Array.isArray(result.activities)) throw new Error("活动选项响应格式无效");
    activities.value = result.activities;
  } catch (error: any) {
    if (generation !== activityGeneration.value) return;
    activities.value = [];
    activityErrorMessage.value = error.message || "活动列表加载失败";
  } finally {
    if (generation === activityGeneration.value) activityLoading.value = false;
  }
}

async function loadTickets() {
  const generation = ++ticketGeneration.value;
  const filterActivityId = selectedActivityId.value;
  ticketLoading.value = true;
  ticketErrorMessage.value = "";
  rows.value = [];
  try {
    const result = await api.get<any, any[]>("/admin/ticket-types", { params: { activityId: filterActivityId } });
    if (generation !== ticketGeneration.value || filterActivityId !== selectedActivityId.value) return;
    if (!Array.isArray(result)) throw new Error("票种列表响应格式无效");
    rows.value = result;
  } catch (error: any) {
    if (generation !== ticketGeneration.value || filterActivityId !== selectedActivityId.value) return;
    rows.value = [];
    ticketErrorMessage.value = error.message || "票种列表加载失败";
  } finally {
    if (generation === ticketGeneration.value) ticketLoading.value = false;
  }
}

async function load() {
  await Promise.allSettled([loadActivities(), loadTickets()]);
}

async function reloadTickets() {
  await loadTickets();
}

function openCreate() {
  if (!canManage.value) return ElMessage.warning("当前账号只能查看票种");
  if (scopeLocked.value) return;
  editingId.value = null;
  editingActivityId.value = null;
  dialogTicketGeneration.value = ticketGeneration.value;
  dialogFilterActivityId.value = selectedActivityId.value;
  Object.assign(form, { activityId: selectedActivityId.value || activities.value[0]?.id, name: "", price: 0, capacity: undefined, perUserLimit: 1, saleStartsAt: "", saleEndsAt: "", earlyBirdPrice: undefined, earlyBirdEndsAt: "", memberPrice: undefined, tierPrices: [], enabled: true });
  dialog.value = true;
}

function openEdit(row: any) {
  if (!canManage.value) return ElMessage.warning("当前账号只能查看票种");
  if (scopeLocked.value) return;
  const target = rows.value.find(item => item.id === row.id);
  if (!target) return ElMessage.error("票种已变化，请刷新后重试");
  editingId.value = target.id;
  editingActivityId.value = target.activity?.id || null;
  dialogTicketGeneration.value = ticketGeneration.value;
  dialogFilterActivityId.value = selectedActivityId.value;
  Object.assign(form, { activityId: target.activity?.id, name: target.name, price: Number(target.price), capacity: target.capacity || undefined, perUserLimit: target.perUserLimit || 1, saleStartsAt: target.saleStartsAt?.slice(0, 19).replace("T", " ") || "", saleEndsAt: target.saleEndsAt?.slice(0, 19).replace("T", " ") || "", earlyBirdPrice: target.earlyBirdPrice === null ? undefined : Number(target.earlyBirdPrice), earlyBirdEndsAt: target.earlyBirdEndsAt?.slice(0, 19).replace("T", " ") || "", memberPrice: target.memberPrice === null ? undefined : Number(target.memberPrice), tierPrices: (target.tierPrices || []).map((item: any) => ({ ...item })), enabled: target.enabled });
  dialog.value = true;
}

function clearDialogContext() {
  editingId.value = null;
  editingActivityId.value = null;
}

function validate() {
  if (!form.activityId) return "请选择活动";
  if (!form.name.trim()) return "请填写票种名称";
  if (Number(form.price) < 0) return "票价不能小于 0";
  if (form.capacity !== undefined && (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 1)) return "容量必须是大于 0 的整数";
  if (!Number.isInteger(Number(form.perUserLimit)) || Number(form.perUserLimit) < 1) return "每人限购必须是大于 0 的整数";
  if (form.saleStartsAt && form.saleEndsAt && form.saleStartsAt >= form.saleEndsAt) return "停售时间必须晚于开售时间";
  if (form.earlyBirdPrice !== undefined && Number(form.earlyBirdPrice) < 0) return "早鸟价不能小于 0";
  if (form.earlyBirdPrice !== undefined && !form.earlyBirdEndsAt) return "设置早鸟价后必须填写早鸟截止时间";
  if (form.earlyBirdEndsAt && form.saleEndsAt && form.earlyBirdEndsAt > form.saleEndsAt) return "早鸟截止时间不能晚于停售时间";
  if (form.memberPrice !== undefined && Number(form.memberPrice) < 0) return "会员价不能小于 0";
  const tierThresholds = new Set<number>();
  for (const tier of form.tierPrices) {
    const minSold = Number(tier.minSold);
    if (!Number.isInteger(minSold) || minSold < 1) return "阶梯价起售数量必须是大于 0 的整数";
    if (Number(tier.price) < 0) return "阶梯价格不能小于 0";
    if (tierThresholds.has(minSold)) return "阶梯价起售数量不能重复";
    tierThresholds.add(minSold);
  }
  return "";
}

async function submit() {
  if (!canManage.value) return ElMessage.warning("当前账号只能查看票种");
  if (saving.value) return;
  const error = validate();
  if (error) {
    ElMessage.warning(error);
    return;
  }
  const targetId = editingId.value;
  if (dialogTicketGeneration.value !== ticketGeneration.value || dialogFilterActivityId.value !== selectedActivityId.value) return ElMessage.error("票种筛选已变化，请关闭后刷新重试");
  if (targetId) {
    const current = rows.value.find(item => item.id === targetId);
    if (!current || current.activity?.id !== editingActivityId.value) return ElMessage.error("票种目标已变化，请关闭后刷新重试");
    if (form.activityId !== editingActivityId.value) return ElMessage.error("既有票种不能变更所属活动");
  } else if (!activities.value.some(item => item.id === form.activityId)) {
    return ElMessage.error("所属活动已变化，请关闭后刷新重试");
  }
  saving.value = true;
  try {
    const payload = {
      activityId: form.activityId,
      name: form.name.trim(),
      price: Number(form.price),
      capacity: form.capacity || undefined,
      perUserLimit: form.perUserLimit,
      saleStartsAt: form.saleStartsAt || undefined,
      saleEndsAt: form.saleEndsAt || undefined,
      earlyBirdPrice: form.earlyBirdPrice,
      earlyBirdEndsAt: form.earlyBirdEndsAt || undefined,
      memberPrice: form.memberPrice,
      tierPrices: form.tierPrices,
      enabled: form.enabled
    };
    if (targetId) await api.patch(`/admin/ticket-types/${targetId}`, payload);
    else await api.post("/admin/ticket-types", payload);
    ElMessage.success("票种已保存");
    dialog.value = false;
    await loadTickets();
  } catch (error: any) {
    ElMessage.error(error.message || "保存票种失败");
  } finally {
    saving.value = false;
  }
}

function addTier() {
  if (!canManage.value) return;
  const lastThreshold = form.tierPrices.reduce((max, item) => Math.max(max, Number(item.minSold) || 0), 0);
  form.tierPrices.push({ minSold: lastThreshold + 1, price: Number(form.price) });
}
function removeTier(index: number) { if (canManage.value) form.tierPrices.splice(index, 1); }

function money(value: string | number | undefined) {
  return Number(value || 0).toFixed(2);
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>票种管理</h2>
      <el-button v-if="canManage" type="primary" :icon="Plus" :disabled="scopeLocked || !activities.length" @click="openCreate">新建票种</el-button>
    </div>

    <el-alert v-if="!canManage" class="load-alert" type="info" show-icon :closable="false" title="当前账号仅可查看票种，新增和编辑操作已隐藏。" />

    <el-alert v-if="activityErrorMessage" class="load-alert" type="error" show-icon :closable="false" :title="activityErrorMessage">
      <template #default><el-button size="small" :loading="activityLoading" :disabled="scopeLocked" @click="loadActivities">重试活动列表</el-button></template>
    </el-alert>
    <el-alert v-if="ticketErrorMessage" class="load-alert" type="error" show-icon :closable="false" :title="ticketErrorMessage">
      <template #default><el-button size="small" :loading="ticketLoading" :disabled="scopeLocked" @click="reloadTickets">重试票种列表</el-button></template>
    </el-alert>

    <div class="table-card">
      <el-form inline>
        <el-form-item label="活动">
          <el-select v-model="selectedActivityId" clearable filterable style="width: 340px" :disabled="scopeLocked" @change="reloadTickets">
            <el-option v-for="item in activities" :key="item.id" :label="item.title" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-button :icon="Refresh" :loading="loading" :disabled="scopeLocked" @click="load">刷新</el-button>
      </el-form>

      <el-table v-loading="ticketLoading" :data="rows" stripe :empty-text="ticketErrorMessage ? '票种加载失败' : '暂无票种'">
        <el-table-column label="活动" min-width="260" show-overflow-tooltip>
          <template #default="{ row }">{{ row.activity?.title || activityMap.get(row.activity?.id) || "-" }}</template>
        </el-table-column>
        <el-table-column prop="name" label="票种" min-width="160" />
        <el-table-column label="价格" width="120"><template #default="{ row }">¥{{ money(row.price) }}</template></el-table-column>
        <el-table-column label="容量" width="110"><template #default="{ row }">{{ row.capacity || "不限" }}</template></el-table-column>
        <el-table-column label="限购" width="90"><template #default="{ row }">{{ row.perUserLimit || 1 }}</template></el-table-column>
        <el-table-column label="活动价" min-width="180"><template #default="{ row }"><span v-if="row.earlyBirdPrice !== null">早鸟 ¥{{ money(row.earlyBirdPrice) }}</span><span v-if="row.memberPrice !== null"> / 会员 ¥{{ money(row.memberPrice) }}</span><span v-if="!row.tierPrices?.length && row.earlyBirdPrice === null && row.memberPrice === null">未配置</span></template></el-table-column>
        <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "启用" : "停用" }}</el-tag></template></el-table-column>
        <el-table-column v-if="canManage" label="操作" width="120" fixed="right"><template #default="{ row }"><el-button size="small" :icon="Edit" :disabled="scopeLocked" @click="openEdit(row)">编辑</el-button></template></el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="dialog" width="min(520px, calc(100vw - 32px))" :title="editingId ? '编辑票种' : '新建票种'" :close-on-click-modal="!saving" :close-on-press-escape="!saving" :show-close="!saving" @closed="clearDialogContext">
      <el-form label-position="top" :disabled="saving">
        <el-form-item label="活动" required><el-select v-model="form.activityId" filterable style="width: 100%" :disabled="editingId !== null || saving"><el-option v-for="item in activities" :key="item.id" :label="item.title" :value="item.id" /></el-select></el-form-item>
        <el-form-item label="票种名称" required><el-input v-model="form.name" placeholder="如：早鸟票、会员票、现场票" /></el-form-item>
        <el-form-item label="价格"><el-input-number v-model="form.price" :min="0" :precision="2" style="width: 180px" /></el-form-item>
        <el-form-item label="容量"><el-input-number v-model="form.capacity" :min="1" placeholder="不填表示不限" style="width: 180px" /></el-form-item>
        <el-form-item label="每人限购"><el-input-number v-model="form.perUserLimit" :min="1" :precision="0" /></el-form-item>
        <el-form-item label="销售时间"><div class="date-row"><el-date-picker v-model="form.saleStartsAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="开售时间" /><el-date-picker v-model="form.saleEndsAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="停售时间" /></div></el-form-item>
        <el-form-item label="早鸟价"><div class="date-row"><el-input-number v-model="form.earlyBirdPrice" :min="0" :precision="2" placeholder="早鸟价" /><el-date-picker v-model="form.earlyBirdEndsAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="早鸟截止" /></div></el-form-item>
        <el-form-item label="会员专享价"><el-input-number v-model="form.memberPrice" :min="0" :precision="2" placeholder="不填则使用会员等级折扣" /></el-form-item>
        <el-form-item label="阶梯价">
          <div class="tier-list"><div v-for="(tier, index) in form.tierPrices" :key="index" class="tier-row"><span>售出满</span><el-input-number v-model="tier.minSold" :min="0" :precision="0" /><span>张后</span><el-input-number v-model="tier.price" :min="0" :precision="2" /><el-button type="danger" text @click="removeTier(index)">删除</el-button></div><el-button @click="addTier">新增阶梯</el-button></div>
        </el-form-item>
        <el-form-item><el-checkbox v-model="form.enabled">启用票种</el-checkbox></el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="saving" @click="dialog=false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.date-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }
.load-alert { margin-bottom: 12px; }
.tier-list { display: grid; gap: 10px; width: 100%; }
.tier-row { display: grid; grid-template-columns: auto 120px auto 140px auto; gap: 8px; align-items: center; }
@media (max-width: 720px) {
  .page, .toolbar, .table-card { min-width: 0; }
  .toolbar { align-items: flex-start; flex-direction: column; gap: 10px; }
  .table-card { overflow: hidden; }
  .table-card :deep(.el-form--inline) { display: flex; width: 100%; min-width: 0; flex-wrap: wrap; }
  .table-card :deep(.el-form-item) { width: 100%; margin-right: 0; }
  .table-card :deep(.el-form-item__content), .table-card :deep(.el-select) { min-width: 0; width: 100% !important; }
  .date-row, .tier-row { grid-template-columns: 1fr; }
}
</style>
