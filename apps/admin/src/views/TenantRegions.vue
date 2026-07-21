<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";
import { canAccess } from "../permissions";

type Tenant = { id: number; code: string; name: string; region?: string | null; enabled?: boolean };
type BoundaryPoint = { lat: number; lng: number };
type TenantRegion = {
  id: number;
  tenant: Tenant;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  boundaryPoints?: BoundaryPoint[] | null;
  exclusive: boolean;
  priority: number;
  authorizationStatus: "pending" | "approved" | "rejected";
  validFrom?: string | null;
  validUntil?: string | null;
  approvalRemark?: string | null;
  authorizationActive?: boolean;
  authorizationReminder?: { level: "warning" | "danger"; code: string; message: string } | null;
  enabled: boolean;
  remark?: string | null;
};

const tenants = ref<Tenant[]>([]);
const rows = ref<TenantRegion[]>([]);
const optionsLoading = ref(false);
const regionsLoading = ref(false);
const optionsError = ref("");
const regionsError = ref("");
const optionsGeneration = ref(0);
const regionsGeneration = ref(0);
const saving = ref(false);
const importing = ref(false);
const actionKey = ref("");
const dialogVisible = ref(false);
const importDialogVisible = ref(false);
const importText = ref("");
const importFileInput = ref<HTMLInputElement | null>(null);
const importResult = ref<{ total: number; succeeded: number; failed: number; items: Array<{ index: number; success: boolean; message?: string; region?: TenantRegion }> } | null>(null);
const coordinateText = ref("");
const boundaryPointRows = ref<BoundaryPoint[]>([]);
const editingId = ref<number | null>(null);
const filters = reactive({ tenantId: 0 });
const form = reactive({
  tenantId: 0,
  province: "",
  city: "",
  district: "",
  name: "",
  latitude: 0,
  longitude: 0,
  radiusMeters: 5000,
  boundaryPointsText: "",
  exclusive: true,
  priority: 0,
  validFrom: "",
  validUntil: "",
  enabled: true,
  remark: ""
});

const selectedTenant = computed(() => tenants.value.find((item) => item.id === form.tenantId));
const currentMapUrl = computed(() => `https://uri.amap.com/marker?position=${Number(form.longitude) || 0},${Number(form.latitude) || 0}&name=${encodeURIComponent(form.name || "区域中心点")}`);
const canManage = computed(() => canAccess(["tenant_region.manage"]));
const canApprove = computed(() => canAccess(["tenant_region.approve"]));
const reading = computed(() => optionsLoading.value || regionsLoading.value);
const writing = computed(() => saving.value || importing.value || Boolean(actionKey.value));
const scopeLocked = computed(() => reading.value || writing.value || dialogVisible.value || importDialogVisible.value);

function operationKey(action: string, id?: number) {
  return `${action}:${id || 0}`;
}

function operationBusy(action: string, id?: number) {
  return actionKey.value === operationKey(action, id);
}

function tenantLabel(tenant?: Tenant | null) {
  if (!tenant) return "未选择商家";
  const region = tenant.region ? `${tenant.region} · ` : "";
  return `${region}${tenant.name}（${tenant.code}）`;
}

function resetForm(row?: TenantRegion) {
  const boundaryPoints = normalizeBoundaryPointRows(row?.boundaryPoints);
  editingId.value = row?.id || null;
  Object.assign(form, {
    tenantId: row?.tenant?.id || filters.tenantId || tenants.value[0]?.id || 0,
    province: row?.province || "",
    city: row?.city || "",
    district: row?.district || "",
    name: row?.name || "",
    latitude: row?.latitude || 0,
    longitude: row?.longitude || 0,
    radiusMeters: row?.radiusMeters || 5000,
    boundaryPointsText: formatBoundaryPoints(boundaryPoints),
    exclusive: row?.exclusive ?? true,
    priority: row?.priority || 0,
    validFrom: row?.validFrom || "",
    validUntil: row?.validUntil || "",
    enabled: row?.enabled ?? true,
    remark: row?.remark || ""
  });
  coordinateText.value = "";
  boundaryPointRows.value = boundaryPoints;
}

function currentFilterSnapshot() {
  return { tenantId: Number(filters.tenantId) || 0 };
}

function sameFilterSnapshot(snapshot: ReturnType<typeof currentFilterSnapshot>) {
  return snapshot.tenantId === (Number(filters.tenantId) || 0);
}

function validTenantOptions(value: unknown): value is Tenant[] {
  return Array.isArray(value) && value.every((item) => Number.isInteger(item?.id) && typeof item?.code === "string" && typeof item?.name === "string");
}

function validTenantRegions(value: unknown): value is TenantRegion[] {
  return Array.isArray(value) && value.every((item) => Number.isInteger(item?.id) && typeof item?.name === "string" && Number.isInteger(item?.tenant?.id));
}

async function loadOptions() {
  const generation = ++optionsGeneration.value;
  optionsLoading.value = true;
  optionsError.value = "";
  tenants.value = [];
  try {
    const result = await api.get<any, Tenant[]>("/admin/tenant-regions/options");
    if (generation !== optionsGeneration.value) return;
    if (!validTenantOptions(result)) throw new Error("商家选项响应格式无效");
    tenants.value = result;
  } catch (error: any) {
    if (generation !== optionsGeneration.value) return;
    tenants.value = [];
    optionsError.value = error.message || "加载商家选项失败";
  } finally {
    if (generation === optionsGeneration.value) optionsLoading.value = false;
  }
}

async function loadRegions() {
  const generation = ++regionsGeneration.value;
  const snapshot = currentFilterSnapshot();
  regionsLoading.value = true;
  regionsError.value = "";
  rows.value = [];
  try {
    const params = snapshot.tenantId ? { tenantId: snapshot.tenantId } : {};
    const result = await api.get<any, TenantRegion[]>("/admin/tenant-regions", { params });
    if (generation !== regionsGeneration.value || !sameFilterSnapshot(snapshot)) return;
    if (!validTenantRegions(result)) throw new Error("区域列表响应格式无效");
    rows.value = result;
  } catch (error: any) {
    if (generation !== regionsGeneration.value || !sameFilterSnapshot(snapshot)) return;
    rows.value = [];
    regionsError.value = error.message || "加载区域保护失败";
  } finally {
    if (generation === regionsGeneration.value) regionsLoading.value = false;
  }
}

async function refreshAll() {
  await Promise.allSettled([loadOptions(), loadRegions()]);
}

function openCreate() {
  if (!canManage.value) return ElMessage.error("当前账号没有维护区域保护的权限");
  resetForm();
  dialogVisible.value = true;
}

function openEdit(row: TenantRegion) {
  if (!canManage.value) return ElMessage.error("当前账号没有维护区域保护的权限");
  if (scopeLocked.value || !rows.value.some((item) => item.id === row.id)) return;
  resetForm(row);
  dialogVisible.value = true;
}

function validateForm() {
  if (!form.tenantId) return "请选择商家/代理";
  if (!form.name.trim()) return "请填写区域名称";
  if (!Number.isFinite(Number(form.latitude)) || Number(form.latitude) < -90 || Number(form.latitude) > 90) return "纬度范围应为 -90 到 90";
  if (!Number.isFinite(Number(form.longitude)) || Number(form.longitude) < -180 || Number(form.longitude) > 180) return "经度范围应为 -180 到 180";
  if (!Number.isFinite(Number(form.radiusMeters)) || Number(form.radiusMeters) < 100 || Number(form.radiusMeters) > 200000) return "保护半径应为 100 米到 200 公里";
  if (form.validFrom && form.validUntil && form.validFrom > form.validUntil) return "授权开始日期不能晚于结束日期";
  try {
    parseBoundaryPoints(form.boundaryPointsText);
  } catch (err: any) {
    return err.message || "多边形边界格式无效";
  }
  return "";
}

async function approve(row: TenantRegion, status: "approved" | "rejected") {
  if (!canApprove.value) return ElMessage.error("当前账号没有审批区域冲突的权限");
  if (scopeLocked.value) return;
  const filterSnapshot = currentFilterSnapshot();
  const generation = regionsGeneration.value;
  const target = rows.value.find((item) => item.id === row.id);
  if (!target || target.authorizationStatus !== "pending") return ElMessage.error("区域状态已变化，请刷新后重试");
  const key = operationKey(`approve-${status}`, row.id);
  actionKey.value = key;
  try {
    const action = status === "approved" ? "批准" : "驳回";
    const result = await ElMessageBox.prompt(`请输入${action}备注（可选）`, `${action}区域授权`, { inputValue: row.approvalRemark || "", inputPlaceholder: "审批依据或处理说明", confirmButtonText: action });
    const current = rows.value.find((item) => item.id === row.id);
    if (!current || current.authorizationStatus !== "pending" || generation !== regionsGeneration.value || !sameFilterSnapshot(filterSnapshot)) throw new Error("区域状态或筛选已变化，请刷新后重试");
    await api.post(`/admin/tenant-regions/${current.id}/approval`, { status, remark: result.value?.trim() || "" });
    ElMessage.success(`已${action}`);
    await loadRegions();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "审批失败");
  } finally {
    if (actionKey.value === key) actionKey.value = "";
  }
}

async function save() {
  if (!canManage.value) return ElMessage.error("当前账号没有维护区域保护的权限");
  if (saving.value) return;
  const error = validateForm();
  if (error) return ElMessage.error(error);
  const targetId = editingId.value;
  const target = targetId ? rows.value.find((item) => item.id === targetId) : null;
  if (targetId && !target) return ElMessage.error("编辑目标已变化，请关闭后刷新重试");
  if (target && target.tenant.id !== form.tenantId) return ElMessage.error("既有区域不能变更所属商家");
  const filterSnapshot = currentFilterSnapshot();
  const generation = regionsGeneration.value;
  saving.value = true;
  try {
    const { boundaryPointsText, ...base } = form;
    const boundaryPoints = parseBoundaryPoints(boundaryPointsText);
    const payload = { ...base, boundaryPoints, name: form.name.trim(), province: form.province.trim(), city: form.city.trim(), district: form.district.trim(), remark: form.remark.trim() };
    if (generation !== regionsGeneration.value || !sameFilterSnapshot(filterSnapshot) || (targetId && !rows.value.some((item) => item.id === targetId))) throw new Error("区域目标或筛选已变化，请关闭后刷新重试");
    if (targetId) await api.patch(`/admin/tenant-regions/${targetId}`, payload);
    else await api.post("/admin/tenant-regions", payload);
    ElMessage.success("区域保护已保存");
    dialogVisible.value = false;
    await loadRegions();
  } catch (err: any) {
    ElMessage.error(err.message || "保存失败");
  } finally {
    saving.value = false;
  }
}

async function remove(row: TenantRegion) {
  if (!canManage.value) return ElMessage.error("当前账号没有维护区域保护的权限");
  if (scopeLocked.value) return;
  const filterSnapshot = currentFilterSnapshot();
  const generation = regionsGeneration.value;
  const target = rows.value.find((item) => item.id === row.id);
  if (!target) return ElMessage.error("删除目标已变化，请刷新后重试");
  const key = operationKey("delete", row.id);
  actionKey.value = key;
  try {
    await ElMessageBox.confirm(`确认删除「${row.name}」？删除后该区域不再参与定位分发。`, "删除区域保护", { type: "warning" });
    if (!rows.value.some((item) => item.id === row.id) || generation !== regionsGeneration.value || !sameFilterSnapshot(filterSnapshot)) throw new Error("区域目标或筛选已变化，请刷新后重试");
    await api.delete(`/admin/tenant-regions/${target.id}`);
    ElMessage.success("已删除");
    await loadRegions();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "删除失败");
  } finally {
    if (actionKey.value === key) actionKey.value = "";
  }
}

function mapUrl(row: TenantRegion) {
  return `https://uri.amap.com/marker?position=${row.longitude},${row.latitude}&name=${encodeURIComponent(row.name)}`;
}

function formatBoundaryPoints(points?: BoundaryPoint[] | null) {
  return Array.isArray(points) && points.length ? JSON.stringify(points, null, 2) : "";
}

function normalizeBoundaryPointRows(points?: BoundaryPoint[] | null) {
  if (!Array.isArray(points)) return [];
  return points
    .map((item) => ({ lat: Number(item.lat), lng: Number(item.lng) }))
    .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
}

function parseBoundaryPoints(text: string) {
  const value = text.trim();
  if (!value) return null;
  const points = JSON.parse(value);
  if (!Array.isArray(points)) throw new Error("多边形边界必须是 JSON 数组");
  if (!points.length) return null;
  if (points.length < 3) throw new Error("多边形边界至少需要 3 个点");
  if (points.length > 200) throw new Error("多边形边界最多支持 200 个点");
  return points.map((item, index) => {
    const lat = Number(item?.lat ?? item?.latitude);
    const lng = Number(item?.lng ?? item?.longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error(`第 ${index + 1} 个边界点纬度无效`);
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw new Error(`第 ${index + 1} 个边界点经度无效`);
    return { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
  });
}

function isValidLat(value: number) {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

function isValidLng(value: number) {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function parseCoordinateInput(text: string) {
  const numbers = text.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (numbers.length < 2) throw new Error("请粘贴经纬度坐标");
  const [first, second] = numbers;
  if (isValidLat(first) && isValidLng(second) && Math.abs(second) > 90) return { lat: Number(first.toFixed(6)), lng: Number(second.toFixed(6)) };
  if (isValidLng(first) && isValidLat(second)) return { lat: Number(second.toFixed(6)), lng: Number(first.toFixed(6)) };
  if (isValidLat(first) && isValidLng(second)) return { lat: Number(first.toFixed(6)), lng: Number(second.toFixed(6)) };
  throw new Error("坐标经纬度范围无效");
}

function applyCoordinateAsCenter() {
  try {
    const point = parseCoordinateInput(coordinateText.value);
    form.latitude = point.lat;
    form.longitude = point.lng;
    ElMessage.success("已应用为中心点");
  } catch (err: any) {
    ElMessage.error(err.message || "坐标格式无效");
  }
}

function syncBoundaryTextFromRows() {
  const points = normalizeBoundaryPointRows(boundaryPointRows.value);
  boundaryPointRows.value = points;
  form.boundaryPointsText = formatBoundaryPoints(points);
}

function addBoundaryPoint(point: BoundaryPoint) {
  boundaryPointRows.value.push({ lat: Number(point.lat.toFixed(6)), lng: Number(point.lng.toFixed(6)) });
  syncBoundaryTextFromRows();
}

function addCurrentCenterBoundaryPoint() {
  const lat = Number(form.latitude);
  const lng = Number(form.longitude);
  if (!isValidLat(lat) || !isValidLng(lng)) return ElMessage.error("中心点经纬度无效");
  addBoundaryPoint({ lat, lng });
}

function addCoordinateAsBoundaryPoint() {
  try {
    addBoundaryPoint(parseCoordinateInput(coordinateText.value));
    ElMessage.success("已加入边界点");
  } catch (err: any) {
    ElMessage.error(err.message || "坐标格式无效");
  }
}

function removeBoundaryPoint(index: number) {
  boundaryPointRows.value.splice(index, 1);
  syncBoundaryTextFromRows();
}

function clearBoundaryPoints() {
  boundaryPointRows.value = [];
  form.boundaryPointsText = "";
}

function applyBoundaryTextToRows() {
  try {
    boundaryPointRows.value = parseBoundaryPoints(form.boundaryPointsText) || [];
    form.boundaryPointsText = formatBoundaryPoints(boundaryPointRows.value);
    ElMessage.success("边界点已同步");
  } catch (err: any) {
    ElMessage.error(err.message || "多边形边界格式无效");
  }
}

function openBulkImport() {
  if (!canManage.value) return ElMessage.error("当前账号没有批量导入区域保护的权限");
  importResult.value = null;
  importText.value = "";
  importDialogVisible.value = true;
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadImportTemplate() {
  if (!canManage.value) return ElMessage.error("当前账号没有批量导入区域保护的权限");
  const headers = ["tenantId", "name", "latitude", "longitude", "radiusMeters", "province", "city", "district", "exclusive", "priority", "enabled", "boundaryPoints", "remark"];
  const sample = [1, "铜梁核心服务区", 29.84, 106.05, 5000, "重庆市", "重庆市", "铜梁区", "true", 10, "true", JSON.stringify([{ lat: 29.84, lng: 106.05 }, { lat: 29.85, lng: 106.06 }, { lat: 29.83, lng: 106.07 }]), "示例区域"];
  const csv = [headers, sample].map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "tenant-regions-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

async function loadImportFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const items = parseRegionImportText(text);
    importText.value = JSON.stringify(items, null, 2);
    importResult.value = null;
    ElMessage.success(`已解析 ${items.length} 条区域保护数据`);
  } catch (err: any) {
    ElMessage.error(err.message || "文件解析失败");
  } finally {
    input.value = "";
  }
}

function parseRegionImportText(text: string) {
  const source = text.trim();
  if (!source) throw new Error("导入文件内容为空");
  if (source.startsWith("[")) return JSON.parse(source);
  return parseRegionCsv(source);
}

function parseRegionCsv(text: string) {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ""));
  if (rows.length < 2) throw new Error("CSV 至少需要表头和一条数据");
  const headers = rows[0].map((item) => item.trim());
  return rows.slice(1).map((row, index) => {
    const record = Object.fromEntries(headers.map((header, headerIndex) => [header, row[headerIndex]?.trim() || ""]));
    const item = {
      tenantId: Number(csvValue(record, "tenantId", "tenant_id", "商家ID", "商家id")),
      name: csvValue(record, "name", "区域名称", "区域"),
      latitude: Number(csvValue(record, "latitude", "lat", "纬度")),
      longitude: Number(csvValue(record, "longitude", "lng", "经度")),
      radiusMeters: Number(csvValue(record, "radiusMeters", "radius", "保护半径", "半径")),
      province: csvValue(record, "province", "省"),
      city: csvValue(record, "city", "市"),
      district: csvValue(record, "district", "区县", "区"),
      exclusive: csvBoolean(csvValue(record, "exclusive", "排他保护"), true),
      priority: Number(csvValue(record, "priority", "优先级") || 0),
      enabled: csvBoolean(csvValue(record, "enabled", "启用状态", "状态"), true),
      boundaryPoints: parseCsvBoundaryPoints(csvValue(record, "boundaryPoints", "边界点", "多边形边界点")),
      remark: csvValue(record, "remark", "备注")
    };
    if (!item.tenantId || !item.name || !Number.isFinite(item.latitude) || !Number.isFinite(item.longitude) || !Number.isFinite(item.radiusMeters)) {
      throw new Error(`第 ${index + 2} 行缺少 tenantId、name、latitude、longitude 或 radiusMeters`);
    }
    return item;
  });
}

function parseCsvRows(text: string) {
  const delimiter = text.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (inQuotes && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (!inQuotes && char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (!inQuotes && (char === "\n" || char === "\r")) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      if (char === "\r" && text[index + 1] === "\n") index += 1;
    } else {
      cell += char;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows.filter((item) => item.some((cellText) => cellText.trim()));
}

function csvValue(record: Record<string, string>, ...keys: string[]) {
  for (const key of keys) {
    if (record[key]) return record[key];
  }
  return "";
}

function csvBoolean(value: string, fallback: boolean) {
  const text = value.trim().toLowerCase();
  if (!text) return fallback;
  if (["1", "true", "yes", "y", "是", "启用", "开启"].includes(text)) return true;
  if (["0", "false", "no", "n", "否", "停用", "关闭"].includes(text)) return false;
  return fallback;
}

function parseCsvBoundaryPoints(value: string) {
  const text = value.trim();
  if (!text) return undefined;
  if (text.startsWith("[")) return parseBoundaryPoints(text);
  const points = text.split(/[;|]/).map((item) => parseCoordinateInput(item));
  return points.length ? points : undefined;
}

function normalizeImportBoundaryPoints(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (Array.isArray(value)) return parseBoundaryPoints(JSON.stringify(value));
  if (typeof value === "string") return parseBoundaryPoints(value);
  throw new Error("多边形边界格式无效");
}

async function bulkImport() {
  if (!canManage.value) return ElMessage.error("当前账号没有批量导入区域保护的权限");
  if (importing.value) return;
  let items: any[] = [];
  try {
    const parsed = JSON.parse(importText.value.trim());
    if (!Array.isArray(parsed)) throw new Error("批量导入内容必须是 JSON 数组");
    items = parsed.map((item) => ({ ...item, boundaryPoints: normalizeImportBoundaryPoints(item.boundaryPoints) }));
  } catch (err: any) {
    return ElMessage.error(err.message || "批量导入 JSON 格式无效");
  }
  const filterSnapshot = currentFilterSnapshot();
  const generation = regionsGeneration.value;
  importing.value = true;
  try {
    if (generation !== regionsGeneration.value || !sameFilterSnapshot(filterSnapshot)) throw new Error("区域筛选已变化，请关闭后刷新重试");
    importResult.value = await api.post<any, NonNullable<typeof importResult.value>>("/admin/tenant-regions/bulk-import", { items });
    ElMessage.success(`导入完成：成功 ${importResult.value.succeeded} 条，失败 ${importResult.value.failed} 条`);
    await loadRegions();
  } catch (err: any) {
    ElMessage.error(err.message || "批量导入失败");
  } finally {
    importing.value = false;
  }
}

onMounted(refreshAll);
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h2>区域保护</h2>
        <p>用于“用户打开 H5/小程序后，根据定位自动匹配当前区域商家/代理”。排他区域会阻止不同商家的服务圈重叠，避免招商和订单归属冲突。</p>
      </div>
      <div v-if="canManage" class="header-actions">
        <el-button :disabled="scopeLocked" @click="openBulkImport">批量导入</el-button>
        <el-button type="primary" :disabled="scopeLocked" @click="openCreate">新增区域</el-button>
      </div>
    </div>

    <el-alert
      v-if="!canManage || !canApprove"
      type="info"
      show-icon
      :closable="false"
      :title="!canManage && !canApprove ? '当前账号为只读模式' : canManage ? '当前账号可维护区域，但不能审批冲突' : '当前账号仅可审批冲突，不能修改区域配置'"
    />

    <el-alert
      type="info"
      show-icon
      :closable="false"
      title="配置提示"
      description="经纬度可在高德/腾讯地图搜索门店或城市中心后复制。系统同时支持中心点加半径匹配和多边形围栏，半径可作为多边形边界的兜底范围。"
    />

    <el-alert v-if="optionsError" type="error" show-icon :closable="false" :title="optionsError">
      <template #default><el-button size="small" :loading="optionsLoading" :disabled="regionsLoading || writing" @click="loadOptions">重试商家选项</el-button></template>
    </el-alert>

    <el-alert v-if="regionsError" type="error" show-icon :closable="false" :title="regionsError">
      <template #default><el-button size="small" :loading="regionsLoading" :disabled="optionsLoading || writing" @click="loadRegions">重试区域列表</el-button></template>
    </el-alert>

    <el-card shadow="never">
      <div class="toolbar">
        <el-select v-model="filters.tenantId" clearable filterable placeholder="全部商家/代理" :disabled="scopeLocked" @change="loadRegions">
          <el-option :value="0" label="全部商家/代理" />
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-button :loading="reading" :disabled="writing || dialogVisible || importDialogVisible" @click="refreshAll">刷新</el-button>
      </div>

      <el-table v-loading="regionsLoading" :data="rows" row-key="id">
        <el-table-column label="区域" min-width="210">
          <template #default="{ row }">
            <strong>{{ row.name }}</strong>
            <small>{{ [row.province, row.city, row.district].filter(Boolean).join(" / ") || "未填行政区" }}</small>
          </template>
        </el-table-column>
        <el-table-column label="商家/代理" min-width="230">
          <template #default="{ row }">{{ tenantLabel(row.tenant) }}</template>
        </el-table-column>
        <el-table-column label="定位范围" min-width="180">
          <template #default="{ row }">
            <div>{{ row.latitude }}, {{ row.longitude }}</div>
            <small v-if="row.boundaryPoints?.length">多边形 {{ row.boundaryPoints.length }} 点 · 半径兜底 {{ row.radiusMeters }} 米</small>
            <small v-else>半径 {{ row.radiusMeters }} 米</small>
          </template>
        </el-table-column>
        <el-table-column label="规则" width="180">
          <template #default="{ row }">
            <el-tag :type="row.exclusive ? 'danger' : 'info'">{{ row.exclusive ? "排他保护" : "允许重叠" }}</el-tag>
            <el-tag class="ml" type="success">优先级 {{ row.priority }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="授权" min-width="190">
          <template #default="{ row }">
            <el-tag :type="row.authorizationStatus === 'approved' ? (row.authorizationActive ? 'success' : 'warning') : row.authorizationStatus === 'pending' ? 'warning' : 'danger'">
              {{ row.authorizationStatus === "pending" ? "待审批" : row.authorizationStatus === "rejected" ? "已驳回" : row.authorizationActive ? "授权有效" : "未到期/已过期" }}
            </el-tag>
            <div class="muted">{{ row.validFrom || "长期" }} 至 {{ row.validUntil || "长期" }}</div>
            <div v-if="row.authorizationReminder" :class="['authorization-reminder', row.authorizationReminder.level]">{{ row.authorizationReminder.message }}</div>
          </template>
        </el-table-column>
        <el-table-column label="操作" :width="canManage && canApprove ? 300 : canManage || canApprove ? 220 : 100" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canApprove && row.authorizationStatus === 'pending'" link type="success" :loading="operationBusy('approve-approved', row.id)" :disabled="scopeLocked && !operationBusy('approve-approved', row.id)" @click="approve(row, 'approved')">批准</el-button>
            <el-button v-if="canApprove && row.authorizationStatus === 'pending'" link type="danger" :loading="operationBusy('approve-rejected', row.id)" :disabled="scopeLocked && !operationBusy('approve-rejected', row.id)" @click="approve(row, 'rejected')">驳回</el-button>
            <el-button v-if="canManage" link type="primary" :disabled="scopeLocked" @click="openEdit(row)">编辑</el-button>
            <el-button link type="primary" tag="a" :href="mapUrl(row)" target="_blank">看地图</el-button>
            <el-button v-if="canManage" link type="danger" :loading="operationBusy('delete', row.id)" :disabled="scopeLocked && !operationBusy('delete', row.id)" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-if="canManage" v-model="dialogVisible" :title="editingId ? '编辑区域保护' : '新增区域保护'" width="680px" destroy-on-close :close-on-click-modal="!saving" :close-on-press-escape="!saving" :show-close="!saving">
      <el-form label-position="top" :disabled="saving">
        <el-form-item label="商家/代理" required>
          <el-select v-model="form.tenantId" filterable placeholder="请选择商家" :disabled="Boolean(editingId)">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
          </el-select>
          <small v-if="selectedTenant">当前将把定位命中的用户分发给：{{ tenantLabel(selectedTenant) }}</small>
        </el-form-item>
        <div class="grid">
          <el-form-item label="省"><el-input v-model="form.province" placeholder="例如：重庆市" /></el-form-item>
          <el-form-item label="市"><el-input v-model="form.city" placeholder="例如：重庆市" /></el-form-item>
          <el-form-item label="区县"><el-input v-model="form.district" placeholder="例如：铜梁区" /></el-form-item>
        </div>
        <el-form-item label="区域名称" required><el-input v-model="form.name" placeholder="例如：铜梁核心服务区" /></el-form-item>
        <div class="grid">
          <el-form-item label="纬度 latitude" required><el-input-number v-model="form.latitude" :precision="6" :step="0.000001" :min="-90" :max="90" /></el-form-item>
          <el-form-item label="经度 longitude" required><el-input-number v-model="form.longitude" :precision="6" :step="0.000001" :min="-180" :max="180" /></el-form-item>
          <el-form-item label="保护半径（米）" required><el-input-number v-model="form.radiusMeters" :step="500" :min="100" :max="200000" /></el-form-item>
        </div>
        <el-form-item label="地图坐标粘贴">
          <div class="coordinate-actions">
            <el-input v-model="coordinateText" placeholder="可粘贴 106.05,29.84 或地图链接" clearable />
            <el-button @click="applyCoordinateAsCenter">设为中心</el-button>
            <el-button @click="addCoordinateAsBoundaryPoint">加入边界</el-button>
            <el-button tag="a" :href="currentMapUrl" target="_blank">打开地图</el-button>
          </div>
        </el-form-item>
        <el-form-item label="多边形边界点">
          <div class="boundary-editor">
            <el-table :data="boundaryPointRows" size="small" border class="boundary-table">
              <el-table-column label="#" width="58">
                <template #default="{ $index }">{{ $index + 1 }}</template>
              </el-table-column>
              <el-table-column label="纬度">
                <template #default="{ row }"><el-input-number v-model="row.lat" :precision="6" :step="0.000001" :min="-90" :max="90" @change="syncBoundaryTextFromRows" /></template>
              </el-table-column>
              <el-table-column label="经度">
                <template #default="{ row }"><el-input-number v-model="row.lng" :precision="6" :step="0.000001" :min="-180" :max="180" @change="syncBoundaryTextFromRows" /></template>
              </el-table-column>
              <el-table-column label="操作" width="88">
                <template #default="{ $index }"><el-button link type="danger" @click="removeBoundaryPoint($index)">移除</el-button></template>
              </el-table-column>
            </el-table>
            <div class="boundary-actions">
              <el-button @click="addCurrentCenterBoundaryPoint">添加中心点</el-button>
              <el-button @click="applyBoundaryTextToRows">应用 JSON</el-button>
              <el-button @click="clearBoundaryPoints">清空边界</el-button>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="多边形边界点 JSON">
          <el-input v-model="form.boundaryPointsText" type="textarea" :rows="5" placeholder='例如：[{"lat":29.84,"lng":106.05},{"lat":29.85,"lng":106.06},{"lat":29.83,"lng":106.07}]' />
        </el-form-item>
        <div class="grid">
          <el-form-item label="排他保护"><el-switch v-model="form.exclusive" active-text="开启" inactive-text="关闭" /></el-form-item>
          <el-form-item label="优先级"><el-input-number v-model="form.priority" :min="-999" :max="999" /></el-form-item>
          <el-form-item label="授权期限">
            <el-date-picker v-model="form.validFrom" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" />
            <span class="date-separator">至</span>
            <el-date-picker v-model="form.validUntil" type="date" value-format="YYYY-MM-DD" placeholder="结束日期" />
          </el-form-item>
          <el-form-item label="启用状态"><el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
        </div>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="3" placeholder="合同区域、运营说明、边界备注等" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="saving" @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-if="canManage" v-model="importDialogVisible" title="批量导入区域保护" width="760px" destroy-on-close :close-on-click-modal="!importing" :close-on-press-escape="!importing" :show-close="!importing">
      <input ref="importFileInput" class="hidden-file-input" type="file" accept=".csv,.tsv,.txt,.json" @change="loadImportFile" />
      <div class="import-actions">
        <el-button @click="importFileInput?.click()">选择 CSV/TSV 文件</el-button>
        <el-button @click="downloadImportTemplate">下载 CSV 模板</el-button>
      </div>
      <el-input v-model="importText" type="textarea" :rows="12" placeholder='请输入区域 JSON 数组，每项字段同新增区域：tenantId、name、latitude、longitude、radiusMeters，可选 boundaryPoints。' />
      <el-table v-if="importResult" :data="importResult.items" size="small" class="import-result">
        <el-table-column label="#" width="70">
          <template #default="{ row }">{{ row.index + 1 }}</template>
        </el-table-column>
        <el-table-column label="结果" width="90">
          <template #default="{ row }"><el-tag :type="row.success ? 'success' : 'danger'">{{ row.success ? "成功" : "失败" }}</el-tag></template>
        </el-table-column>
        <el-table-column label="区域/错误">
          <template #default="{ row }">{{ row.success ? row.region?.name : row.message }}</template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button :disabled="importing" @click="importDialogVisible = false">关闭</el-button>
        <el-button type="primary" :loading="importing" @click="bulkImport">导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page { display: grid; gap: 16px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; padding: 4px 0 2px; }
.page-header h2 { margin: 0 0 8px; font-size: 24px; color: #172033; }
.page-header p { margin: 0; max-width: 780px; color: #5f6b7a; line-height: 1.7; }
.header-actions { display: flex; gap: 10px; flex-shrink: 0; }
.toolbar { display: flex; gap: 10px; margin-bottom: 14px; }
.toolbar .el-select { width: 320px; }
.coordinate-actions { display: flex; align-items: center; gap: 8px; width: 100%; }
.coordinate-actions .el-input { flex: 1; min-width: 220px; }
.boundary-editor { width: 100%; }
.boundary-table { width: 100%; }
.boundary-actions { display: flex; gap: 8px; margin-top: 8px; }
.import-actions { display: flex; gap: 8px; margin-bottom: 10px; }
.hidden-file-input { display: none; }
strong { display: block; color: #0f172a; }
small { display: block; margin-top: 4px; color: #64748b; line-height: 1.5; }
.ml { margin-left: 6px; }
.muted { margin-top: 5px; color: #64748b; font-size: 12px; }
.authorization-reminder { margin-top: 4px; font-size: 12px; font-weight: 700; }
.authorization-reminder.warning { color: #b45309; }
.authorization-reminder.danger { color: #b42318; }
.date-separator { margin: 0 8px; color: #64748b; }
.grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.import-result { margin-top: 14px; }
:deep(.el-input-number) { width: 100%; }
@media (max-width: 900px) {
  .page { min-width: 0; }
  .page-header, .toolbar { align-items: stretch; flex-direction: column; }
  .header-actions { flex-direction: column; }
  .coordinate-actions, .boundary-actions, .import-actions { align-items: stretch; flex-direction: column; }
  .coordinate-actions .el-input { min-width: 0; }
  .toolbar .el-select { width: 100%; }
  .grid { grid-template-columns: 1fr; }
  :deep(.el-card__body) { min-width: 0; }
}
</style>
