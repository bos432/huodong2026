<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { Download, Edit, Plus, Refresh } from "@element-plus/icons-vue";
import { api, downloadFile } from "../api";
import { hasPermission } from "../permissions";
import { maskPhone } from "../privacy";

const canViewCoupons = computed(() => hasPermission("coupon.view"));
const canManageCoupons = computed(() => hasPermission("coupon.manage"));
const canExportCoupons = computed(() => hasPermission("coupon.export"));
const canViewRedemptions = computed(() => hasPermission("redemption_code.view"));
const canManageRedemptions = computed(() => hasPermission("redemption_code.manage"));
const canExportRedemptions = computed(() => hasPermission("redemption_code.export"));
const activeTab = ref(canViewCoupons.value ? "coupons" : "redemptions");

const couponRows = ref<any[]>([]);
const activities = ref<any[]>([]);
const couponClaims = ref<any[]>([]);
const couponUsages = ref<any[]>([]);
const couponLoading = ref(false);
const couponError = ref("");
const couponRecordError = ref("");
const couponDialog = ref(false);
const couponSaving = ref(false);
const couponExporting = ref(false);
const couponEditingId = ref<number | null>(null);
const couponRecordFilterId = ref<number | undefined>();
const claimPage = ref(1);
const usagePage = ref(1);
const claimTotal = ref(0);
const usageTotal = ref(0);

const redemptionRows = ref<any[]>([]);
const redemptionUsages = ref<any[]>([]);
const activityCouponOptions = ref<any[]>([]);
const mallCouponOptions = ref<any[]>([]);
const courseOptions = ref<any[]>([]);
const redemptionLoading = ref(false);
const redemptionError = ref("");
const redemptionUsageError = ref("");
const redemptionDialog = ref(false);
const redemptionSaving = ref(false);
const redemptionExporting = ref(false);
const redemptionEditingId = ref<number | null>(null);
const redemptionUsageFilterId = ref<number | undefined>();
const redemptionUsagePage = ref(1);
const redemptionUsageTotal = ref(0);

const couponForm = reactive({
  activityId: undefined as number | undefined,
  code: "",
  name: "",
  discountType: "fixed" as "fixed" | "percent",
  discountValue: 0,
  minAmount: 0,
  usageLimit: undefined as number | undefined,
  claimMode: "code" as "code" | "claim",
  perUserLimit: 1,
  enabled: true,
  startsAt: "",
  endsAt: ""
});

const redemptionForm = reactive({
  code: "",
  name: "",
  targetType: "activity_coupon" as "activity_coupon" | "mall_coupon" | "course_access" | "points",
  targetId: undefined as number | undefined,
  points: 0,
  usageLimit: 0,
  perUserLimit: 1,
  enabled: true,
  startsAt: "",
  endsAt: ""
});

const activityMap = computed(() => new Map(activities.value.map((item) => [item.id, item.title])));
const redemptionTargetOptions = computed(() => {
  if (redemptionForm.targetType === "activity_coupon") return activityCouponOptions.value.map((item) => ({ ...item, label: `${item.code} / ${item.name}${item.activity?.title ? ` / ${item.activity.title}` : ""}` }));
  if (redemptionForm.targetType === "mall_coupon") return mallCouponOptions.value.map((item) => ({ ...item, label: `${item.code} / ${item.name}${item.merchant?.name ? ` / ${item.merchant.name}` : ""}` }));
  if (redemptionForm.targetType === "course_access") return courseOptions.value.map((item) => ({ ...item, label: `${item.title} / ${item.status}` }));
  return [];
});
const redemptionTargetMap = computed(() => {
  const entries = [
    ...activityCouponOptions.value.map((item) => [`activity_coupon:${item.id}`, `${item.code} / ${item.name}`]),
    ...mallCouponOptions.value.map((item) => [`mall_coupon:${item.id}`, `${item.code} / ${item.name}`]),
    ...courseOptions.value.map((item) => [`course_access:${item.id}`, item.title])
  ];
  return new Map(entries as Array<[string, string]>);
});

const couponPermissionHint = computed(() => {
  const actions = [canManageCoupons.value ? "可维护" : "不可维护", canExportCoupons.value ? "可导出" : "不可导出"];
  return `当前账号可查看活动优惠券，${actions.join("、")}；领取记录中的手机号固定脱敏。`;
});
const redemptionPermissionHint = computed(() => {
  const actions = [canManageRedemptions.value ? "可维护" : "不可维护", canExportRedemptions.value ? "可导出" : "不可导出"];
  return `当前账号可查看统一兑换码，${actions.join("、")}；兑换目标由当前商家真实业务选项生成。`;
});

function dateText(value?: string | null) {
  return value ? value.slice(0, 19).replace("T", " ") : "";
}

function timeRange(row: any) {
  const start = dateText(row.startsAt);
  const end = dateText(row.endsAt);
  if (!start && !end) return "长期有效";
  return `${start || "不限"} 至 ${end || "不限"}`;
}

function money(value: string | number | undefined) {
  return Number(value || 0).toFixed(2);
}

function discountText(row: any) {
  return row.discountType === "percent" ? `减 ${Number(row.discountValue).toFixed(0)}%` : `减 ¥${money(row.discountValue)}`;
}

function redemptionTargetText(row: any) {
  if (row.targetType === "points") return `${row.points} 积分`;
  return redemptionTargetMap.value.get(`${row.targetType}:${row.targetId}`) || `${targetTypeText(row.targetType)} #${row.targetId}`;
}

function targetTypeText(value: string) {
  return ({ activity_coupon: "活动优惠券", mall_coupon: "商城优惠券", course_access: "课程学习权限", points: "会员积分" } as Record<string, string>)[value] || value;
}

async function loadCouponRecords() {
  if (!canViewCoupons.value) return;
  couponRecordError.value = "";
  try {
    const [claims, usages] = await Promise.all([
      api.get<any, any>("/admin/coupon-claims", { params: { couponId: couponRecordFilterId.value, page: claimPage.value, pageSize: 20 } }),
      api.get<any, any>("/admin/coupon-usages", { params: { couponId: couponRecordFilterId.value, page: usagePage.value, pageSize: 20 } })
    ]);
    couponClaims.value = claims.items || [];
    claimTotal.value = Number(claims.total || 0);
    couponUsages.value = usages.items || [];
    usageTotal.value = Number(usages.total || 0);
  } catch (error: any) {
    couponRecordError.value = error.message || "优惠券领取和使用记录加载失败";
  }
}

async function loadCoupons() {
  if (!canViewCoupons.value || couponLoading.value) return;
  couponLoading.value = true;
  couponError.value = "";
  try {
    const [rows, options] = await Promise.all([
      api.get<any, any[]>("/admin/coupons"),
      api.get<any, { activities: any[] }>("/admin/coupons/options")
    ]);
    couponRows.value = rows || [];
    activities.value = options.activities || [];
  } catch (error: any) {
    couponRows.value = [];
    activities.value = [];
    couponError.value = error.message || "活动优惠券加载失败";
  } finally {
    couponLoading.value = false;
  }
  await loadCouponRecords();
}

async function loadRedemptionUsages() {
  if (!canViewRedemptions.value) return;
  redemptionUsageError.value = "";
  try {
    const result = await api.get<any, any>("/admin/redemption-code-usages", { params: { redemptionCodeId: redemptionUsageFilterId.value, page: redemptionUsagePage.value, pageSize: 20 } });
    redemptionUsages.value = result.items || [];
    redemptionUsageTotal.value = Number(result.total || 0);
  } catch (error: any) {
    redemptionUsageError.value = error.message || "兑换记录加载失败";
  }
}

async function loadRedemptions() {
  if (!canViewRedemptions.value || redemptionLoading.value) return;
  redemptionLoading.value = true;
  redemptionError.value = "";
  try {
    const [rows, options] = await Promise.all([
      api.get<any, any[]>("/admin/redemption-codes"),
      api.get<any, any>("/admin/redemption-codes/options")
    ]);
    redemptionRows.value = rows || [];
    activityCouponOptions.value = options.activityCoupons || [];
    mallCouponOptions.value = options.mallCoupons || [];
    courseOptions.value = options.courses || [];
  } catch (error: any) {
    redemptionRows.value = [];
    redemptionError.value = error.message || "统一兑换码加载失败";
  } finally {
    redemptionLoading.value = false;
  }
  await loadRedemptionUsages();
}

async function refreshCurrent() {
  if (activeTab.value === "coupons") await loadCoupons();
  else await loadRedemptions();
}

function openCoupon(row?: any) {
  if (!canManageCoupons.value) return ElMessage.warning("当前账号只能查看活动优惠券");
  couponEditingId.value = row?.id || null;
  Object.assign(couponForm, {
    activityId: row?.activity?.id,
    code: row?.code || "",
    name: row?.name || "",
    discountType: row?.discountType || "fixed",
    discountValue: Number(row?.discountValue || 0),
    minAmount: Number(row?.minAmount || 0),
    usageLimit: row?.usageLimit ?? undefined,
    claimMode: row?.claimMode || "code",
    perUserLimit: Number(row?.perUserLimit || 1),
    enabled: row?.enabled !== false,
    startsAt: dateText(row?.startsAt),
    endsAt: dateText(row?.endsAt)
  });
  couponDialog.value = true;
}

function validateCoupon() {
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(couponForm.code.trim())) return "优惠码需为 3-64 位字母、数字、下划线或短横线";
  if (!couponForm.name.trim()) return "请填写优惠名称";
  if (Number(couponForm.discountValue) <= 0) return "优惠值必须大于 0";
  if (couponForm.discountType === "percent" && Number(couponForm.discountValue) > 100) return "优惠比例不能超过 100%";
  if (Number(couponForm.minAmount || 0) < 0) return "使用门槛不能小于 0";
  if (couponForm.usageLimit !== undefined && (!Number.isInteger(Number(couponForm.usageLimit)) || Number(couponForm.usageLimit) < 1)) return "总次数必须是大于 0 的整数";
  if (!Number.isInteger(Number(couponForm.perUserLimit)) || Number(couponForm.perUserLimit) < 1) return "每人上限必须是大于 0 的整数";
  if (couponForm.startsAt && couponForm.endsAt && couponForm.endsAt <= couponForm.startsAt) return "结束时间必须晚于开始时间";
  return "";
}

async function saveCoupon() {
  if (!canManageCoupons.value) return ElMessage.warning("当前账号只能查看活动优惠券");
  if (couponSaving.value) return;
  const validation = validateCoupon();
  if (validation) return ElMessage.warning(validation);
  couponSaving.value = true;
  try {
    const payload = {
      ...couponForm,
      code: couponForm.code.trim().toUpperCase(),
      name: couponForm.name.trim(),
      discountValue: Number(couponForm.discountValue),
      minAmount: Number(couponForm.minAmount || 0),
      activityId: couponForm.activityId || undefined,
      usageLimit: couponForm.usageLimit || undefined,
      startsAt: couponForm.startsAt || undefined,
      endsAt: couponForm.endsAt || undefined
    };
    if (couponEditingId.value) await api.patch(`/admin/coupons/${couponEditingId.value}`, payload);
    else await api.post("/admin/coupons", payload);
    ElMessage.success("活动优惠券已保存");
    couponDialog.value = false;
    await loadCoupons();
  } catch (error: any) {
    ElMessage.error(error.message || "保存活动优惠券失败");
  } finally {
    couponSaving.value = false;
  }
}

function openRedemption(row?: any) {
  if (!canManageRedemptions.value) return ElMessage.warning("当前账号只能查看统一兑换码");
  redemptionEditingId.value = row?.id || null;
  Object.assign(redemptionForm, {
    code: row?.code || "",
    name: row?.name || "",
    targetType: row?.targetType || "activity_coupon",
    targetId: row?.targetId || undefined,
    points: Number(row?.points || 0),
    usageLimit: Number(row?.usageLimit || 0),
    perUserLimit: Number(row?.perUserLimit || 1),
    enabled: row?.enabled !== false,
    startsAt: dateText(row?.startsAt),
    endsAt: dateText(row?.endsAt)
  });
  redemptionDialog.value = true;
}

function validateRedemption() {
  if (!/^[A-Za-z0-9_-]{3,64}$/.test(redemptionForm.code.trim())) return "兑换码需为 3-64 位字母、数字、下划线或短横线";
  if (!redemptionForm.name.trim()) return "请填写兑换码名称";
  if (redemptionForm.targetType === "points" && (!Number.isInteger(Number(redemptionForm.points)) || Number(redemptionForm.points) < 1)) return "积分数量必须是大于 0 的整数";
  if (redemptionForm.targetType !== "points" && !redemptionForm.targetId) return "请选择兑换目标";
  if (!Number.isInteger(Number(redemptionForm.usageLimit)) || Number(redemptionForm.usageLimit) < 0) return "总兑换次数必须是非负整数";
  if (!Number.isInteger(Number(redemptionForm.perUserLimit)) || Number(redemptionForm.perUserLimit) < 1) return "每人上限必须是大于 0 的整数";
  if (redemptionForm.startsAt && redemptionForm.endsAt && redemptionForm.endsAt <= redemptionForm.startsAt) return "结束时间必须晚于开始时间";
  return "";
}

async function saveRedemption() {
  if (!canManageRedemptions.value) return ElMessage.warning("当前账号只能查看统一兑换码");
  if (redemptionSaving.value) return;
  const validation = validateRedemption();
  if (validation) return ElMessage.warning(validation);
  redemptionSaving.value = true;
  try {
    const payload = {
      ...redemptionForm,
      code: redemptionForm.code.trim().toUpperCase(),
      name: redemptionForm.name.trim(),
      targetId: redemptionForm.targetType === "points" ? undefined : redemptionForm.targetId,
      points: redemptionForm.targetType === "points" ? Number(redemptionForm.points) : 0,
      startsAt: redemptionForm.startsAt || undefined,
      endsAt: redemptionForm.endsAt || undefined
    };
    if (redemptionEditingId.value) await api.patch(`/admin/redemption-codes/${redemptionEditingId.value}`, payload);
    else await api.post("/admin/redemption-codes", payload);
    ElMessage.success("统一兑换码已保存");
    redemptionDialog.value = false;
    await loadRedemptions();
  } catch (error: any) {
    ElMessage.error(error.message || "保存统一兑换码失败");
  } finally {
    redemptionSaving.value = false;
  }
}

async function exportCoupons() {
  if (!canExportCoupons.value || couponExporting.value) return;
  couponExporting.value = true;
  try {
    await downloadFile("/admin/coupons/export", "activity-coupons.xlsx");
    ElMessage.success("活动优惠券台账已导出");
  } catch (error: any) {
    ElMessage.error(error.message || "活动优惠券导出失败");
  } finally {
    couponExporting.value = false;
  }
}

async function exportRedemptions() {
  if (!canExportRedemptions.value || redemptionExporting.value) return;
  redemptionExporting.value = true;
  try {
    await downloadFile("/admin/redemption-codes/export", "redemption-codes.xlsx");
    ElMessage.success("统一兑换码台账已导出");
  } catch (error: any) {
    ElMessage.error(error.message || "统一兑换码导出失败");
  } finally {
    redemptionExporting.value = false;
  }
}

function changeRedemptionTargetType() {
  redemptionForm.targetId = undefined;
  if (redemptionForm.targetType !== "points") redemptionForm.points = 0;
}

onMounted(async () => {
  await Promise.all([canViewCoupons.value ? loadCoupons() : Promise.resolve(), canViewRedemptions.value ? loadRedemptions() : Promise.resolve()]);
});
</script>

<template>
  <div class="page coupon-page">
    <div class="toolbar">
      <h2>优惠券与兑换码</h2>
      <el-button :icon="Refresh" :loading="couponLoading || redemptionLoading" @click="refreshCurrent">刷新当前页</el-button>
    </div>

    <el-tabs v-model="activeTab" class="benefit-tabs">
      <el-tab-pane v-if="canViewCoupons" label="活动优惠券" name="coupons">
        <div class="section-toolbar">
          <el-alert class="permission-hint" type="info" show-icon :closable="false" :title="couponPermissionHint" />
          <div class="section-actions">
            <el-button v-if="canExportCoupons" :icon="Download" :loading="couponExporting" @click="exportCoupons">导出台账</el-button>
            <el-button v-if="canManageCoupons" type="primary" :icon="Plus" :disabled="couponSaving" @click="openCoupon()">新建活动优惠券</el-button>
          </div>
        </div>
        <el-alert v-if="couponError" class="page-error" type="error" show-icon :closable="false" :title="couponError"><template #default><el-button size="small" @click="loadCoupons">重试</el-button></template></el-alert>
        <div class="table-card">
          <el-table v-loading="couponLoading" :data="couponRows" stripe empty-text="暂无活动优惠券">
            <el-table-column prop="code" label="优惠码" width="150" />
            <el-table-column prop="name" label="名称" min-width="180" />
            <el-table-column label="限定活动" min-width="220" show-overflow-tooltip><template #default="{ row }">{{ row.activity?.title || "全活动通用" }}</template></el-table-column>
            <el-table-column label="优惠" width="120"><template #default="{ row }">{{ discountText(row) }}</template></el-table-column>
            <el-table-column label="门槛" width="110"><template #default="{ row }">¥{{ money(row.minAmount) }}</template></el-table-column>
            <el-table-column label="领取/使用" width="130"><template #default="{ row }">{{ row.claimedCount || 0 }} / {{ row.usedCount || 0 }}</template></el-table-column>
            <el-table-column label="总量" width="90"><template #default="{ row }">{{ row.usageLimit || "不限" }}</template></el-table-column>
            <el-table-column label="获取方式" width="110"><template #default="{ row }">{{ row.claimMode === "claim" ? "用户领取" : "输入券码" }}</template></el-table-column>
            <el-table-column label="有效期" min-width="260"><template #default="{ row }">{{ timeRange(row) }}</template></el-table-column>
            <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "启用" : "停用" }}</el-tag></template></el-table-column>
            <el-table-column v-if="canManageCoupons" label="操作" width="110" fixed="right"><template #default="{ row }"><el-button size="small" :icon="Edit" :disabled="couponSaving" @click="openCoupon(row)">编辑</el-button></template></el-table-column>
          </el-table>
        </div>

        <div class="record-heading">
          <h3>领取与使用记录</h3>
          <el-select v-model="couponRecordFilterId" clearable filterable placeholder="全部优惠券" @change="claimPage = 1; usagePage = 1; loadCouponRecords()">
            <el-option v-for="item in couponRows" :key="item.id" :label="`${item.code} / ${item.name}`" :value="item.id" />
          </el-select>
        </div>
        <el-alert v-if="couponRecordError" class="page-error" type="error" show-icon :closable="false" :title="couponRecordError"><template #default><el-button size="small" @click="loadCouponRecords">重试记录</el-button></template></el-alert>
        <div class="record-grid">
          <section class="record-section">
            <h4>领取记录</h4>
            <div class="table-card">
              <el-table :data="couponClaims" stripe empty-text="暂无领取记录">
                <el-table-column label="优惠券" min-width="190"><template #default="{ row }">{{ row.coupon.code }} / {{ row.coupon.name }}</template></el-table-column>
                <el-table-column label="会员" min-width="150"><template #default="{ row }">{{ row.user.nickname || `会员 #${row.user.id}` }}</template></el-table-column>
                <el-table-column label="手机号" width="140"><template #default="{ row }">{{ maskPhone(row.user.phone) }}</template></el-table-column>
                <el-table-column prop="claimedCount" label="领取" width="80" />
                <el-table-column prop="usedCount" label="使用" width="80" />
                <el-table-column label="时间" width="170"><template #default="{ row }">{{ dateText(row.createdAt) }}</template></el-table-column>
              </el-table>
              <el-pagination v-model:current-page="claimPage" :total="claimTotal" :page-size="20" layout="total, prev, pager, next" @change="loadCouponRecords" />
            </div>
          </section>
          <section class="record-section">
            <h4>使用记录</h4>
            <div class="table-card">
              <el-table :data="couponUsages" stripe empty-text="暂无使用记录">
                <el-table-column label="优惠券" min-width="190"><template #default="{ row }">{{ row.coupon.code }} / {{ row.coupon.name }}</template></el-table-column>
                <el-table-column label="订单" min-width="180"><template #default="{ row }">{{ row.order?.orderNo || "-" }}</template></el-table-column>
                <el-table-column label="会员" min-width="140"><template #default="{ row }">{{ row.user.nickname || `会员 #${row.user.id}` }}</template></el-table-column>
                <el-table-column label="优惠" width="100"><template #default="{ row }">¥{{ money(row.discountAmount) }}</template></el-table-column>
                <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.status === 'used' ? 'success' : 'info'">{{ row.status === "used" ? "已使用" : "已释放" }}</el-tag></template></el-table-column>
                <el-table-column label="时间" width="170"><template #default="{ row }">{{ dateText(row.createdAt) }}</template></el-table-column>
              </el-table>
              <el-pagination v-model:current-page="usagePage" :total="usageTotal" :page-size="20" layout="total, prev, pager, next" @change="loadCouponRecords" />
            </div>
          </section>
        </div>
      </el-tab-pane>

      <el-tab-pane v-if="canViewRedemptions" label="统一兑换码" name="redemptions">
        <div class="section-toolbar">
          <el-alert class="permission-hint" type="info" show-icon :closable="false" :title="redemptionPermissionHint" />
          <div class="section-actions">
            <el-button v-if="canExportRedemptions" :icon="Download" :loading="redemptionExporting" @click="exportRedemptions">导出台账</el-button>
            <el-button v-if="canManageRedemptions" type="primary" :icon="Plus" :disabled="redemptionSaving" @click="openRedemption()">新建兑换码</el-button>
          </div>
        </div>
        <el-alert v-if="redemptionError" class="page-error" type="error" show-icon :closable="false" :title="redemptionError"><template #default><el-button size="small" @click="loadRedemptions">重试</el-button></template></el-alert>
        <div class="table-card">
          <el-table v-loading="redemptionLoading" :data="redemptionRows" stripe empty-text="暂无统一兑换码">
            <el-table-column prop="code" label="兑换码" width="160" />
            <el-table-column prop="name" label="名称" min-width="180" />
            <el-table-column label="兑换权益" min-width="240" show-overflow-tooltip><template #default="{ row }">{{ redemptionTargetText(row) }}</template></el-table-column>
            <el-table-column label="已兑/总量" width="120"><template #default="{ row }">{{ row.usedCount }} / {{ row.usageLimit || "不限" }}</template></el-table-column>
            <el-table-column prop="perUserLimit" label="每人上限" width="100" />
            <el-table-column label="有效期" min-width="260"><template #default="{ row }">{{ timeRange(row) }}</template></el-table-column>
            <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "启用" : "停用" }}</el-tag></template></el-table-column>
            <el-table-column v-if="canManageRedemptions" label="操作" width="110" fixed="right"><template #default="{ row }"><el-button size="small" :icon="Edit" :disabled="redemptionSaving" @click="openRedemption(row)">编辑</el-button></template></el-table-column>
          </el-table>
        </div>

        <div class="record-heading">
          <h3>兑换记录</h3>
          <el-select v-model="redemptionUsageFilterId" clearable filterable placeholder="全部兑换码" @change="redemptionUsagePage = 1; loadRedemptionUsages()">
            <el-option v-for="item in redemptionRows" :key="item.id" :label="`${item.code} / ${item.name}`" :value="item.id" />
          </el-select>
        </div>
        <el-alert v-if="redemptionUsageError" class="page-error" type="error" show-icon :closable="false" :title="redemptionUsageError"><template #default><el-button size="small" @click="loadRedemptionUsages">重试记录</el-button></template></el-alert>
        <div class="table-card">
          <el-table :data="redemptionUsages" stripe empty-text="暂无兑换记录">
            <el-table-column label="兑换码" min-width="210"><template #default="{ row }">{{ row.redemptionCode.code }} / {{ row.redemptionCode.name }}</template></el-table-column>
            <el-table-column label="会员" min-width="160"><template #default="{ row }">{{ row.user.nickname || `会员 #${row.user.id}` }}</template></el-table-column>
            <el-table-column label="手机号" width="140"><template #default="{ row }">{{ maskPhone(row.user.phone) }}</template></el-table-column>
            <el-table-column prop="usedCount" label="兑换次数" width="110" />
            <el-table-column label="首次兑换" width="170"><template #default="{ row }">{{ dateText(row.createdAt) }}</template></el-table-column>
            <el-table-column label="最近兑换" width="170"><template #default="{ row }">{{ dateText(row.updatedAt) }}</template></el-table-column>
          </el-table>
          <el-pagination v-model:current-page="redemptionUsagePage" :total="redemptionUsageTotal" :page-size="20" layout="total, prev, pager, next" @change="loadRedemptionUsages" />
        </div>
      </el-tab-pane>
    </el-tabs>

    <el-dialog v-model="couponDialog" class="benefit-dialog" width="720px" :title="couponEditingId ? '编辑活动优惠券' : '新建活动优惠券'" destroy-on-close>
      <el-form label-position="top"><div class="form-grid">
        <el-form-item label="优惠码" required><el-input v-model="couponForm.code" maxlength="64" placeholder="如：EARLYBIRD" /></el-form-item>
        <el-form-item label="名称" required><el-input v-model="couponForm.name" maxlength="120" placeholder="如：早鸟优惠" /></el-form-item>
        <el-form-item label="优惠类型"><el-select v-model="couponForm.discountType"><el-option label="固定金额" value="fixed" /><el-option label="按比例减免" value="percent" /></el-select></el-form-item>
        <el-form-item label="优惠值" required><el-input-number v-model="couponForm.discountValue" :min="0" :precision="couponForm.discountType === 'fixed' ? 2 : 0" /></el-form-item>
        <el-form-item label="使用门槛"><el-input-number v-model="couponForm.minAmount" :min="0" :precision="2" /></el-form-item>
        <el-form-item label="总领取/使用次数"><el-input-number v-model="couponForm.usageLimit" :min="1" placeholder="不填不限" /></el-form-item>
        <el-form-item label="获取方式"><el-select v-model="couponForm.claimMode"><el-option label="输入券码使用" value="code" /><el-option label="用户先领取" value="claim" /></el-select></el-form-item>
        <el-form-item label="每人上限"><el-input-number v-model="couponForm.perUserLimit" :min="1" :max="100" /></el-form-item>
        <el-form-item class="full" label="限定活动"><el-select v-model="couponForm.activityId" clearable filterable placeholder="不选表示全活动通用"><el-option v-for="item in activities" :key="item.id" :label="item.title" :value="item.id" /></el-select></el-form-item>
        <el-form-item label="开始时间"><el-date-picker v-model="couponForm.startsAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item>
        <el-form-item label="结束时间"><el-date-picker v-model="couponForm.endsAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item>
        <el-form-item><el-checkbox v-model="couponForm.enabled">启用活动优惠券</el-checkbox></el-form-item>
      </div></el-form>
      <template #footer><el-button :disabled="couponSaving" @click="couponDialog = false">取消</el-button><el-button type="primary" :loading="couponSaving" @click="saveCoupon">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="redemptionDialog" class="benefit-dialog" width="720px" :title="redemptionEditingId ? '编辑统一兑换码' : '新建统一兑换码'" destroy-on-close>
      <el-form label-position="top"><div class="form-grid">
        <el-form-item label="兑换码" required><el-input v-model="redemptionForm.code" maxlength="64" /></el-form-item>
        <el-form-item label="名称" required><el-input v-model="redemptionForm.name" maxlength="100" /></el-form-item>
        <el-form-item label="权益类型"><el-select v-model="redemptionForm.targetType" @change="changeRedemptionTargetType"><el-option label="活动优惠券" value="activity_coupon" /><el-option label="商城优惠券" value="mall_coupon" /><el-option label="课程学习权限" value="course_access" /><el-option label="会员积分" value="points" /></el-select></el-form-item>
        <el-form-item v-if="redemptionForm.targetType !== 'points'" label="兑换目标" required><el-select v-model="redemptionForm.targetId" filterable placeholder="请选择真实业务目标"><el-option v-for="item in redemptionTargetOptions" :key="item.id" :label="item.label" :value="item.id" :disabled="item.enabled === false" /></el-select></el-form-item>
        <el-form-item v-else label="积分数量" required><el-input-number v-model="redemptionForm.points" :min="1" /></el-form-item>
        <el-form-item label="总兑换次数"><el-input-number v-model="redemptionForm.usageLimit" :min="0" /><small>0 表示不限</small></el-form-item>
        <el-form-item label="每人上限"><el-input-number v-model="redemptionForm.perUserLimit" :min="1" /></el-form-item>
        <el-form-item label="开始时间"><el-date-picker v-model="redemptionForm.startsAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item>
        <el-form-item label="结束时间"><el-date-picker v-model="redemptionForm.endsAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" /></el-form-item>
        <el-form-item><el-checkbox v-model="redemptionForm.enabled">启用统一兑换码</el-checkbox></el-form-item>
      </div></el-form>
      <template #footer><el-button :disabled="redemptionSaving" @click="redemptionDialog = false">取消</el-button><el-button type="primary" :loading="redemptionSaving" @click="saveRedemption">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
.coupon-page, .benefit-tabs, .section-toolbar, .record-grid, .record-section, .table-card { min-width: 0; }
.toolbar, .section-toolbar, .record-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.toolbar { margin-bottom: 12px; }
.section-toolbar { margin-bottom: 14px; align-items: flex-start; }
.permission-hint { flex: 1; min-width: 0; }
.section-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.page-error { margin-bottom: 12px; }
.record-heading { margin: 20px 0 12px; }
.record-heading h3, .record-section h4 { margin: 0; }
.record-heading :deep(.el-select) { width: 280px; max-width: 100%; }
.record-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; }
.record-section { overflow: hidden; }
.record-section h4 { margin-bottom: 10px; font-size: 15px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 16px; }
.form-grid .full { grid-column: 1 / -1; }
.form-grid :deep(.el-select), .form-grid :deep(.el-date-editor) { width: 100%; }
:deep(.el-pagination) { margin-top: 12px; justify-content: flex-end; }
@media (max-width: 720px) {
  .toolbar, .section-toolbar, .record-heading { align-items: flex-start; flex-direction: column; }
  .section-actions, .section-actions .el-button { width: 100%; }
  .section-actions .el-button { margin-left: 0; }
  .record-heading :deep(.el-select) { width: 100%; }
  .table-card { overflow: hidden; }
  .form-grid { grid-template-columns: minmax(0, 1fr); }
  .form-grid .full { grid-column: auto; }
  :deep(.el-pagination) { justify-content: flex-start; overflow-x: auto; }
  :deep(.benefit-dialog) { max-width: calc(100vw - 24px); margin-top: 5vh; }
}
</style>
