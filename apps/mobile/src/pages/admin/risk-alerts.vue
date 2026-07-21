<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { getMobileAdminSession, mobileAdminRequest, requireMobileAdmin, type MobileAdminSession } from "../../mobile-admin";
import AdminBottomNav from "../../components/AdminBottomNav.vue";

type RiskAlert = {
  id: number;
  type: string;
  severity: string;
  status: string;
  title: string;
  message: string;
  businessNo?: string | null;
  occurrenceCount?: number;
  lastDetectedAt?: string;
  handledBy?: string | null;
  handlingRemark?: string | null;
};

const bootstrap = ref<any>(null);
const rows = ref<RiskAlert[]>([]);
const loading = ref(true);
const scanning = ref(false);
const actionId = ref<number | null>(null);
const pageError = ref("");
const actionError = ref("");
const status = ref("open");
const type = ref("");
const loadedContextKey = ref("");
const bootstrapContextKey = ref("");
let loadSerial = 0;
let scanSerial = 0;
let actionSerial = 0;

const canView = computed(() => Boolean(bootstrap.value?.permissions?.canViewFinanceRisks));
const canManage = computed(() => Boolean(bootstrap.value?.permissions?.canManageFinanceRisks));
const statusTabs = [{ label: "待处理", value: "open" }, { label: "跟进中", value: "acknowledged" }, { label: "已解决", value: "resolved" }, { label: "全部", value: "" }];
const typeTabs = [{ label: "全部类型", value: "" }, { label: "支付", value: "duplicate_payment" }, { label: "回调", value: "callback_failed" }, { label: "账实", value: "payment_mismatch" }, { label: "账单", value: "statement_mismatch" }, { label: "退款", value: "refund_failed" }, { label: "钱包", value: "negative_wallet" }];

function sessionKey(session: MobileAdminSession) {
  return `${session.token}:${session.tenantId || "platform"}:${session.role}`;
}

function isCurrentSession(session: MobileAdminSession) {
  const current = getMobileAdminSession();
  return Boolean(current && sessionKey(current) === sessionKey(session));
}

function contextKey(session: MobileAdminSession, requestedStatus: string, requestedType: string) {
  return `${sessionKey(session)}:${requestedStatus || "all"}:${requestedType || "all"}`;
}

function isRiskAlert(value: unknown): value is RiskAlert {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return Number.isInteger(Number(row.id)) && Number(row.id) > 0 && typeof row.title === "string" && typeof row.message === "string" && typeof row.status === "string" && typeof row.type === "string" && typeof row.severity === "string";
}

function clearRows() {
  rows.value = [];
}

function cancelStaleActions() {
  scanSerial += 1;
  actionSerial += 1;
  scanning.value = false;
  actionId.value = null;
  actionError.value = "";
}

function buildUrl(requestedStatus: string, requestedType: string) {
  const params = [];
  if (requestedStatus) params.push(`status=${encodeURIComponent(requestedStatus)}`);
  if (requestedType) params.push(`type=${encodeURIComponent(requestedType)}`);
  return `/admin/finance/risk-alerts${params.length ? `?${params.join("&")}` : ""}`;
}

async function load(refreshBootstrap = false) {
  const serial = ++loadSerial;
  let session: MobileAdminSession;
  try {
    session = requireMobileAdmin();
  } catch {
    loading.value = false;
    return;
  }
  const requestedStatus = status.value;
  const requestedType = type.value;
  const requestedSessionKey = sessionKey(session);
  const requestedContextKey = contextKey(session, requestedStatus, requestedType);
  if (bootstrapContextKey.value && bootstrapContextKey.value !== requestedSessionKey) {
    bootstrap.value = null;
    bootstrapContextKey.value = "";
    cancelStaleActions();
  }
  if (loadedContextKey.value !== requestedContextKey) clearRows();
  loading.value = true;
  pageError.value = "";
  try {
    const boot = !refreshBootstrap && bootstrap.value && bootstrapContextKey.value === requestedSessionKey ? bootstrap.value : await mobileAdminRequest<any>("/admin/mobile/bootstrap");
    if (serial !== loadSerial || !isCurrentSession(session)) return;
    if (!boot || typeof boot !== "object" || !boot.permissions || typeof boot.permissions !== "object") throw new Error("管理权限数据格式异常，请重新加载");
    bootstrap.value = boot;
    bootstrapContextKey.value = requestedSessionKey;
    if (!boot.permissions.canViewFinanceRisks) {
      clearRows();
      loadedContextKey.value = requestedContextKey;
      return;
    }
    const result = await mobileAdminRequest<unknown>(buildUrl(requestedStatus, requestedType));
    if (serial !== loadSerial || !isCurrentSession(session) || status.value !== requestedStatus || type.value !== requestedType) return;
    if (!Array.isArray(result) || !result.every(isRiskAlert)) throw new Error("资金异常数据格式异常，请重新加载");
    rows.value = result;
    loadedContextKey.value = requestedContextKey;
  } catch (error: any) {
    if (serial !== loadSerial) return;
    const current = getMobileAdminSession();
    if (!current) {
      bootstrap.value = null;
      bootstrapContextKey.value = "";
      clearRows();
      try { requireMobileAdmin(); } catch {}
      return;
    }
    if (!isCurrentSession(session)) return;
    clearRows();
    pageError.value = error.message || "资金异常加载失败";
  } finally {
    if (serial === loadSerial && (isCurrentSession(session) || !getMobileAdminSession())) loading.value = false;
  }
}

function reload() {
  void load(true);
}

function setStatus(value: string) {
  if (loading.value || scanning.value || actionId.value !== null || value === status.value) return;
  status.value = value;
  void load();
}

function setType(value: string) {
  if (loading.value || scanning.value || actionId.value !== null || value === type.value) return;
  type.value = value;
  void load();
}

function statusText(value: string) {
  return ({ open: "待处理", acknowledged: "跟进中", resolved: "已解决" } as Record<string, string>)[value] || value;
}

function typeText(value: string) {
  return ({ duplicate_payment: "重复支付", callback_failed: "支付回调失败", payment_mismatch: "支付账实差异", statement_mismatch: "渠道账单差异", refund_failed: "退款失败", negative_wallet: "钱包负余额" } as Record<string, string>)[value] || value;
}

function severityText(value: string) {
  return ({ critical: "紧急", high: "高风险", medium: "中风险", low: "低风险" } as Record<string, string>)[value] || value;
}

function formatTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date).replace(/\//g, "-");
}

async function scan() {
  if (!canManage.value || loading.value || scanning.value || actionId.value !== null) return;
  const session = requireMobileAdmin();
  const serial = ++scanSerial;
  scanning.value = true;
  actionError.value = "";
  try {
    const result = await mobileAdminRequest<unknown>("/admin/finance/risk-alerts/scan", { method: "POST", data: {} });
    if (serial !== scanSerial || !isCurrentSession(session)) return;
    if (!result || typeof result !== "object" || !Number.isFinite(Number((result as any).detectedCount)) || !Number.isFinite(Number((result as any).openCount))) throw new Error("异常扫描结果格式异常，请重新扫描");
    const scanResult = result as { detectedCount?: number; openCount?: number };
    uni.showToast({ title: `发现 ${Number(scanResult.detectedCount || 0)} 项，待办 ${Number(scanResult.openCount || 0)} 项`, icon: "none" });
    await load(true);
  } catch (error: any) {
    if (serial === scanSerial && isCurrentSession(session)) actionError.value = error.message || "异常扫描失败";
  } finally {
    if (serial === scanSerial) scanning.value = false;
  }
}

function handle(row: RiskAlert, action: "acknowledged" | "resolved" | "open") {
  if (!canManage.value || loading.value || actionId.value !== null || scanning.value) return;
  const session = requireMobileAdmin();
  const serial = ++actionSerial;
  const rowSnapshot = { id: row.id, status: row.status, title: row.title, businessNo: row.businessNo || "" };
  actionId.value = row.id;
  actionError.value = "";
  const requiresRemark = action === "resolved";
  const labels = { acknowledged: "确认跟进", resolved: "解决告警", open: "重新打开" };
  const release = () => { if (serial === actionSerial) actionId.value = null; };
  uni.showModal({
    title: labels[action],
    content: `${rowSnapshot.title}\n${rowSnapshot.businessNo ? `业务编号：${rowSnapshot.businessNo}` : ""}`,
    editable: true,
    placeholderText: requiresRemark ? "填写处理依据（必填）" : "填写处理备注（可选）",
    success: async (result: any) => {
      if (!result.confirm) { release(); return; }
      const remark = String(result.content || "").trim();
      if (requiresRemark && !remark) { uni.showToast({ title: "请填写处理依据", icon: "none" }); release(); return; }
      try {
        const current = getMobileAdminSession();
        const currentRow = rows.value.find((item) => item.id === rowSnapshot.id);
        if (!current || !isCurrentSession(session) || !canManage.value || !currentRow || currentRow.status !== rowSnapshot.status) throw new Error("管理账号、商家或告警状态已变化，请刷新后重试");
        const handled = await mobileAdminRequest<unknown>(`/admin/finance/risk-alerts/${rowSnapshot.id}/handle`, { method: "POST", data: { action, remark } });
        if (serial !== actionSerial || !isCurrentSession(session)) return;
        if (!handled || typeof handled !== "object" || Number((handled as any).id) !== rowSnapshot.id) throw new Error("告警处置结果格式异常，请重新加载");
        uni.showToast({ title: labels[action], icon: "success" });
        await load(true);
      } catch (error: any) {
        if (serial === actionSerial && isCurrentSession(session)) actionError.value = error.message || "告警处置失败";
      } finally {
        release();
      }
    },
    fail: release
  });
}

onShow(() => { void load(true); });
</script>

<template>
  <view class="admin-page">
    <view class="head"><view><view class="title">资金异常</view><view class="sub">支付、退款、对账与钱包风险</view></view><view class="head-actions"><view v-if="canManage" class="scan" role="button" tabindex="0" aria-label="扫描资金异常" :aria-busy="scanning" :aria-disabled="loading || scanning || actionId !== null" :class="{ disabled: loading || scanning || actionId !== null }" @click="scan" @keyup.enter="scan" @keyup.space.prevent="scan">{{ scanning ? "扫描中" : "扫描" }}</view><view class="refresh" role="button" tabindex="0" aria-label="刷新资金异常" :aria-busy="loading" :aria-disabled="loading || scanning || actionId !== null" :class="{ disabled: loading || scanning || actionId !== null }" @click="reload" @keyup.enter="reload" @keyup.space.prevent="reload">{{ loading ? "刷新中" : "刷新" }}</view></view></view>
    <view v-if="pageError" class="error-panel" role="alert" aria-live="assertive"><text>{{ pageError }}</text><view class="retry" role="button" tabindex="0" aria-label="重新加载资金异常" @click="reload" @keyup.enter="reload" @keyup.space.prevent="reload">重试</view></view>
    <view v-if="actionError" class="action-error" role="alert" aria-live="assertive"><text>{{ actionError }}</text><view role="button" tabindex="0" aria-label="关闭处置错误" @click="actionError = ''" @keyup.enter="actionError = ''" @keyup.space.prevent="actionError = ''">关闭</view></view>
    <scroll-view scroll-x class="tabs" :show-scrollbar="false"><view class="track" role="tablist" aria-label="告警状态筛选"><view v-for="item in statusTabs" :key="item.value" role="tab" tabindex="0" :aria-selected="status === item.value" :aria-disabled="loading || scanning || actionId !== null" :class="{ active: status === item.value, disabled: loading || scanning || actionId !== null }" @click="setStatus(item.value)" @keyup.enter="setStatus(item.value)" @keyup.space.prevent="setStatus(item.value)">{{ item.label }}</view></view></scroll-view>
    <scroll-view scroll-x class="types" :show-scrollbar="false"><view class="track" role="tablist" aria-label="告警类型筛选"><view v-for="item in typeTabs" :key="item.value" role="tab" tabindex="0" :aria-selected="type === item.value" :aria-disabled="loading || scanning || actionId !== null" :class="{ active: type === item.value, disabled: loading || scanning || actionId !== null }" @click="setType(item.value)" @keyup.enter="setType(item.value)" @keyup.space.prevent="setType(item.value)">{{ item.label }}</view></view></scroll-view>
    <view v-if="!pageError && !canView && !loading" class="panel" role="status">当前账号没有资金异常查看权限</view>
    <view v-else-if="loading && !rows.length" class="panel" role="status" aria-live="polite">资金异常加载中...</view>
    <template v-else-if="!pageError && canView">
      <view v-if="!rows.length" class="panel" role="status">当前筛选范围暂无资金异常</view>
      <view v-for="item in rows" v-else :key="item.id" class="card">
        <view class="row"><view class="severity" :class="item.severity">{{ severityText(item.severity) }}</view><view class="status">{{ statusText(item.status) }}</view></view>
        <view class="alert-title">{{ item.title }}</view><view class="message">{{ item.message }}</view>
        <view class="meta">{{ typeText(item.type) }}<text v-if="item.businessNo"> · {{ item.businessNo }}</text></view>
        <view class="meta">发现 {{ item.occurrenceCount || 1 }} 次 · 最近 {{ formatTime(item.lastDetectedAt) }}</view>
        <view v-if="item.handledBy" class="handled">{{ item.handledBy }}：{{ item.handlingRemark || "已处理" }}</view>
        <view v-if="canManage" class="ops"><view v-if="item.status === 'open'" role="button" tabindex="0" :aria-label="`确认跟进：${item.title}`" :aria-disabled="loading || actionId !== null || scanning" class="follow" :class="{ disabled: loading || actionId !== null || scanning }" @click="handle(item, 'acknowledged')" @keyup.enter="handle(item, 'acknowledged')" @keyup.space.prevent="handle(item, 'acknowledged')">确认跟进</view><view v-if="item.status !== 'resolved'" role="button" tabindex="0" :aria-label="`填写依据并解决：${item.title}`" :aria-disabled="loading || actionId !== null || scanning" class="resolve" :class="{ disabled: loading || actionId !== null || scanning }" @click="handle(item, 'resolved')" @keyup.enter="handle(item, 'resolved')" @keyup.space.prevent="handle(item, 'resolved')">填写依据并解决</view><view v-else role="button" tabindex="0" :aria-label="`重新打开：${item.title}`" :aria-disabled="loading || actionId !== null || scanning" class="reopen" :class="{ disabled: loading || actionId !== null || scanning }" @click="handle(item, 'open')" @keyup.enter="handle(item, 'open')" @keyup.space.prevent="handle(item, 'open')">重新打开</view></view>
      </view>
    </template>
    <AdminBottomNav current="analytics" :permissions="bootstrap?.permissions" />
  </view>
</template>

<style scoped>
.admin-page{min-height:100vh;width:100%;max-width:760px;margin:0 auto;box-sizing:border-box;padding:calc(24rpx + env(safe-area-inset-top)) 24rpx calc(154rpx + env(safe-area-inset-bottom));overflow-wrap:anywhere;background:linear-gradient(180deg,#fff8ef,#f5f2ed);color:#2f211c}.head{display:flex;align-items:center;justify-content:space-between;gap:16rpx;padding:28rpx 24rpx;border-radius:30rpx;background:linear-gradient(135deg,#642d29,#a44338 58%,#d29a5a);color:#fff}.title{font-size:40rpx;font-weight:950}.sub{margin-top:6rpx;color:rgba(255,255,255,.75);font-size:23rpx}.head-actions{display:flex;gap:9rpx}.scan,.refresh{padding:13rpx 18rpx;border-radius:999px;background:rgba(255,255,255,.16);font-size:23rpx;font-weight:900}.scan{background:#0f766e}.tabs,.types{height:74rpx;margin-top:16rpx;white-space:nowrap}.types{margin-top:8rpx}.track{display:inline-flex;gap:10rpx}.track>view{padding:15rpx 21rpx;border-radius:999px;background:#fff;color:#7a5b52;font-size:22rpx;font-weight:900}.track>.active{background:#0f766e;color:#fff}.panel,.card,.error-panel{margin-top:16rpx;border-radius:24rpx;background:#fff;box-shadow:0 12rpx 28rpx rgba(91,47,36,.08)}.panel{padding:30rpx;text-align:center;color:#7a5b52}.error-panel{display:flex;align-items:center;justify-content:space-between;gap:14rpx;padding:20rpx;color:#b42318;background:#fff1f3}.retry{padding:10rpx 17rpx;border-radius:15rpx;background:#b42318;color:#fff;font-weight:900}.action-error{display:flex;align-items:center;justify-content:space-between;gap:14rpx;margin-top:14rpx;padding:18rpx;border-radius:18rpx;background:#fff5e8;color:#b54708}.action-error>view{flex:0 0 auto;padding:9rpx 16rpx;border-radius:14rpx;background:#b54708;color:#fff;font-weight:900}.card{padding:22rpx}.row{display:flex;align-items:center;justify-content:space-between;gap:12rpx}.severity,.status{padding:7rpx 13rpx;border-radius:999px;font-size:20rpx;font-weight:900}.severity{background:#fff1f3;color:#b42318}.severity.high{background:#fff5e8;color:#b54708}.severity.medium{background:#fffbea;color:#8a6100}.severity.low{background:#eef8f3;color:#067647}.status{background:#eef4f1;color:#0f766e}.alert-title{margin-top:15rpx;font-size:29rpx;font-weight:950}.message{margin-top:9rpx;color:#5f504b;font-size:24rpx;line-height:1.55}.meta{margin-top:9rpx;color:#7a5b52;font-size:21rpx}.handled{margin-top:14rpx;padding:14rpx;border-radius:16rpx;background:#f5f7f5;color:#5f6d66;font-size:21rpx;line-height:1.5}.ops{display:grid;grid-template-columns:1fr 1fr;gap:10rpx;margin-top:17rpx}.ops>view{display:flex;align-items:center;justify-content:center;min-height:72rpx;padding:0 10rpx;border-radius:18rpx;font-size:23rpx;font-weight:900;text-align:center}.follow{background:#edf5f3;color:#0f766e}.resolve{background:#0f766e;color:#fff}.reopen{grid-column:1/3;background:#fff5e8;color:#b54708}.disabled{opacity:.5;pointer-events:none}[role="button"]:focus-visible,[role="tab"]:focus-visible{outline:3px solid #f59e0b;outline-offset:2px}@media(min-width:900px){.admin-page{max-width:760px}}
</style>
