<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Edit, Key, Plus, Refresh, Search } from "@element-plus/icons-vue";
import { api } from "../api";
import { isPlatformAdmin } from "../permissions";

const route = useRoute();
const router = useRouter();
const rows = ref<any[]>([]);
const levels = ref<any[]>([]);
const detail = ref<any>();
const wallet = ref<any>();
const walletTransactions = ref<any[]>([]);
const loading = ref(false);
const keyword = ref(String(route.query.keyword || ""));
const activityId = ref<number | undefined>(routeActivityId());
const sourceChannel = ref(String(route.query.sourceChannel || ""));
const wechatBound = ref(String(route.query.wechatBound || ""));
const phoneBound = ref(String(route.query.phoneBound || ""));
const levelId = ref(String(route.query.levelId || ""));
const activeStart = ref(String(route.query.activeStart || ""));
const activeEnd = ref(String(route.query.activeEnd || ""));
const sortBy = ref(String(route.query.sortBy || "lastActiveAt"));
const sortOrder = ref(String(route.query.sortOrder || "DESC"));
const page = ref(Number(route.query.page || 1) || 1);
const pageSize = ref(Number(route.query.pageSize || 20) || 20);
const total = ref(0);
const summary = ref({ totalMembers: 0, phoneBound: 0, wechatBound: 0, miniProgramSource: 0, active7Days: 0 });
const detailDrawer = ref(false);
const levelDialog = ref(false);
const memberDialog = ref(false);
const editMemberDialog = ref(false);
const passwordDialog = ref(false);
const walletDialog = ref(false);
const saving = ref(false);
const memberSaving = ref(false);
const editMemberSaving = ref(false);
const passwordSaving = ref(false);
const walletSaving = ref(false);
const editingLevelId = ref<number | null>(null);

const levelForm = reactive({
  name: "",
  minPoints: 0,
  discountRate: 1,
  priorityBooking: false,
  enabled: true,
  sortOrder: 0
});

const walletForm = reactive({
  type: "recharge" as "recharge" | "deduct" | "adjust",
  amount: 0,
  remark: ""
});

const memberForm = reactive({
  phone: "",
  password: "",
  nickname: "",
  remark: ""
});

const editMemberForm = reactive({
  phone: "",
  nickname: "",
  avatarUrl: ""
});

const passwordForm = reactive({
  password: "",
  confirmPassword: ""
});

function routeActivityId() {
  const id = typeof route.query.activityId === "string" ? Number(route.query.activityId) : undefined;
  return id && Number.isFinite(id) ? id : undefined;
}

const focusedActivityName = computed(() => rows.value.find((row) => row.activity?.id === activityId.value)?.activity?.title || (activityId.value ? `活动 ID ${activityId.value}` : ""));
const memberSummary = computed(() => {
  if (!activityId.value) return "";
  const paid = rows.value.filter((row) => Number(row.totalSpent || 0) > 0).length;
  const reviewed = rows.value.filter((row) => Number(row.reviewCount || 0) > 0).length;
  return `本场活动沉淀 ${total.value || rows.value.length} 个会员线索，本页 ${paid} 人已有消费、${reviewed} 人留下评价。`;
});

async function load() {
  loading.value = true;
  try {
    const [result, levelRows] = await Promise.all([
      api.get<any, any>("/admin/members", { params: memberQueryParams() }),
      api.get<any, any[]>("/admin/member-levels")
    ]);
    if (Array.isArray(result)) {
      rows.value = result;
      total.value = result.length;
      summary.value = buildSummaryFromRows(result);
    } else {
      rows.value = result.items || [];
      total.value = Number(result.total || 0);
      page.value = Number(result.page || page.value);
      pageSize.value = Number(result.pageSize || pageSize.value);
      summary.value = result.summary || buildSummaryFromRows(rows.value);
    }
    levels.value = levelRows;
  } finally {
    loading.value = false;
  }
}

function memberQueryParams() {
  return {
    keyword: keyword.value || undefined,
    activityId: activityId.value || undefined,
    sourceChannel: sourceChannel.value || undefined,
    wechatBound: wechatBound.value || undefined,
    phoneBound: phoneBound.value || undefined,
    levelId: levelId.value || undefined,
    activeStart: activeStart.value || undefined,
    activeEnd: activeEnd.value || undefined,
    sortBy: sortBy.value || undefined,
    sortOrder: sortOrder.value || undefined,
    page: page.value,
    pageSize: pageSize.value
  };
}

function buildSummaryFromRows(items: any[]) {
  const activeLine = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return {
    totalMembers: items.length,
    phoneBound: items.filter((row) => row.user?.phone).length,
    wechatBound: items.filter((row) => row.user?.openid).length,
    miniProgramSource: items.filter((row) => row.user?.sourceChannel === "mp_weixin").length,
    active7Days: items.filter((row) => row.lastActiveAt && new Date(row.lastActiveAt).getTime() >= activeLine).length
  };
}

function syncRouteQuery() {
  router.replace({
    path: "/members",
    query: {
      keyword: keyword.value || undefined,
      activityId: activityId.value || undefined,
      sourceChannel: sourceChannel.value || undefined,
      wechatBound: wechatBound.value || undefined,
      phoneBound: phoneBound.value || undefined,
      levelId: levelId.value || undefined,
      activeStart: activeStart.value || undefined,
      activeEnd: activeEnd.value || undefined,
      sortBy: sortBy.value !== "lastActiveAt" ? sortBy.value : undefined,
      sortOrder: sortOrder.value !== "DESC" ? sortOrder.value : undefined,
      page: page.value > 1 ? page.value : undefined,
      pageSize: pageSize.value !== 20 ? pageSize.value : undefined
    }
  });
}

function applyFilter() {
  page.value = 1;
  syncRouteQuery();
  load();
}

function resetFilter() {
  keyword.value = "";
  sourceChannel.value = "";
  wechatBound.value = "";
  phoneBound.value = "";
  levelId.value = "";
  activeStart.value = "";
  activeEnd.value = "";
  sortBy.value = "lastActiveAt";
  sortOrder.value = "DESC";
  page.value = 1;
  syncRouteQuery();
  load();
}

function clearActivityFilter() {
  activityId.value = undefined;
  page.value = 1;
  syncRouteQuery();
  load();
}

function changePage(nextPage: number) {
  page.value = nextPage;
  syncRouteQuery();
  load();
}

function changePageSize(nextSize: number) {
  pageSize.value = nextSize;
  page.value = 1;
  syncRouteQuery();
  load();
}

async function openDetail(row: any) {
  const [memberDetail, walletDetail, transactions] = await Promise.all([
    api.get(`/admin/members/${row.user.id}`),
    isPlatformAdmin() ? api.get(`/admin/users/${row.user.id}/wallet`) : Promise.resolve(null),
    isPlatformAdmin() ? api.get<any, any[]>("/admin/finance/wallet-transactions", { params: { userId: row.user.id } }) : Promise.resolve([])
  ]);
  detail.value = memberDetail;
  wallet.value = walletDetail;
  walletTransactions.value = transactions;
  detailDrawer.value = true;
}

function openWalletDialog(type: "recharge" | "deduct" | "adjust") {
  walletForm.type = type;
  walletForm.amount = 0;
  walletForm.remark = "";
  walletDialog.value = true;
}

async function saveWalletAdjust() {
  if (!detail.value?.profile?.user?.id) return;
  if (!Number.isFinite(Number(walletForm.amount)) || Number(walletForm.amount) === 0) {
    ElMessage.warning("请填写调整金额");
    return;
  }
  walletSaving.value = true;
  try {
    await api.post(`/admin/users/${detail.value.profile.user.id}/wallet/adjust`, { ...walletForm, amount: Number(walletForm.amount) });
    ElMessage.success("余额已更新");
    walletDialog.value = false;
    await openDetail({ user: detail.value.profile.user });
  } catch (error: any) {
    ElMessage.error(error.message);
  } finally {
    walletSaving.value = false;
  }
}

function openCreateLevel() {
  editingLevelId.value = null;
  Object.assign(levelForm, { name: "", minPoints: 0, discountRate: 1, priorityBooking: false, enabled: true, sortOrder: levels.value.length + 1 });
  levelDialog.value = true;
}

function openCreateMember() {
  Object.assign(memberForm, { phone: "", password: "", nickname: "", remark: "" });
  memberDialog.value = true;
}

function openEditMember() {
  const user = detail.value?.profile?.user;
  if (!user) return;
  Object.assign(editMemberForm, { phone: user.phone || "", nickname: user.nickname || "", avatarUrl: user.avatarUrl || "" });
  editMemberDialog.value = true;
}

async function saveMemberEdit() {
  const user = detail.value?.profile?.user;
  if (!user?.id) return;
  if (editMemberForm.phone.trim() && !/^1\d{10}$/.test(editMemberForm.phone.trim())) {
    ElMessage.warning("请填写正确的手机号");
    return;
  }
  editMemberSaving.value = true;
  try {
    await api.patch(`/admin/members/${user.id}`, {
      phone: editMemberForm.phone.trim(),
      nickname: editMemberForm.nickname.trim(),
      avatarUrl: editMemberForm.avatarUrl.trim()
    });
    ElMessage.success("会员资料已保存");
    editMemberDialog.value = false;
    await openDetail({ user });
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  } finally {
    editMemberSaving.value = false;
  }
}

function openPasswordDialog() {
  Object.assign(passwordForm, { password: "", confirmPassword: "" });
  passwordDialog.value = true;
}

async function resetMemberPassword() {
  const user = detail.value?.profile?.user;
  if (!user?.id) return;
  if (passwordForm.password.length < 6 || passwordForm.password.length > 64) {
    ElMessage.warning("会员密码长度需为 6-64 位");
    return;
  }
  if (passwordForm.password !== passwordForm.confirmPassword) {
    ElMessage.warning("两次输入的密码不一致");
    return;
  }
  await ElMessageBox.confirm(`确认重置「${user.nickname || user.phone || `用户${user.id}`}」的 H5 登录密码？`, "重置会员密码", { type: "warning", confirmButtonText: "确认重置", cancelButtonText: "取消" });
  passwordSaving.value = true;
  try {
    await api.post(`/admin/members/${user.id}/password`, { password: passwordForm.password });
    ElMessage.success("会员密码已重置");
    passwordDialog.value = false;
  } catch (error: any) {
    ElMessage.error(error.message || "重置失败");
  } finally {
    passwordSaving.value = false;
  }
}

async function saveMember() {
  if (!memberForm.phone.trim() && !memberForm.nickname.trim()) {
    ElMessage.warning("请至少填写手机号或昵称");
    return;
  }
  if (memberForm.phone.trim() && !/^1\d{10}$/.test(memberForm.phone.trim())) {
    ElMessage.warning("请填写正确的手机号");
    return;
  }
  if (memberForm.password && (memberForm.password.length < 6 || memberForm.password.length > 64)) {
    ElMessage.warning("初始密码长度需为 6-64 位");
    return;
  }
  memberSaving.value = true;
  try {
    await api.post("/admin/members", {
      phone: memberForm.phone.trim() || undefined,
      password: memberForm.password || undefined,
      nickname: memberForm.nickname.trim() || undefined,
      remark: memberForm.remark.trim() || undefined
    });
    ElMessage.success("会员已创建");
    memberDialog.value = false;
    await load();
  } catch (error: any) {
    ElMessage.error(error.message || "创建会员失败");
  } finally {
    memberSaving.value = false;
  }
}

function openEditLevel(row: any) {
  editingLevelId.value = row.id;
  Object.assign(levelForm, { name: row.name, minPoints: row.minPoints, discountRate: Number(row.discountRate), priorityBooking: row.priorityBooking, enabled: row.enabled, sortOrder: row.sortOrder });
  levelDialog.value = true;
}

async function saveLevel() {
  if (!levelForm.name.trim()) {
    ElMessage.warning("请填写等级名称");
    return;
  }
  saving.value = true;
  try {
    const payload = { ...levelForm, discountRate: Number(levelForm.discountRate) };
    if (editingLevelId.value) await api.patch(`/admin/member-levels/${editingLevelId.value}`, payload);
    else await api.post("/admin/member-levels", payload);
    ElMessage.success("会员等级已保存");
    levelDialog.value = false;
    load();
  } catch (error: any) {
    ElMessage.error(error.message);
  } finally {
    saving.value = false;
  }
}

function money(value: string | number | undefined) {
  return Number(value || 0).toFixed(2);
}

function sourceChannelText(value?: string | null) {
  const labels: Record<string, string> = { h5: "H5", mp_weixin: "微信小程序", admin: "后台创建" };
  return value ? labels[value] || value : "未记录";
}

function loginChannelText(value?: string | null) {
  const labels: Record<string, string> = { h5: "H5", mp_weixin: "微信小程序" };
  return value ? labels[value] || value : "未记录";
}

function maskIdentity(value?: string | null) {
  if (!value) return "-";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-CN", { hour12: false });
}

onMounted(load);

watch(
  () => route.query,
  () => {
    const nextActivityId = routeActivityId();
    const next = {
      keyword: String(route.query.keyword || ""),
      activityId: nextActivityId,
      sourceChannel: String(route.query.sourceChannel || ""),
      wechatBound: String(route.query.wechatBound || ""),
      phoneBound: String(route.query.phoneBound || ""),
      levelId: String(route.query.levelId || ""),
      activeStart: String(route.query.activeStart || ""),
      activeEnd: String(route.query.activeEnd || ""),
      sortBy: String(route.query.sortBy || "lastActiveAt"),
      sortOrder: String(route.query.sortOrder || "DESC"),
      page: Number(route.query.page || 1) || 1,
      pageSize: Number(route.query.pageSize || 20) || 20
    };
    if (
      keyword.value === next.keyword &&
      activityId.value === next.activityId &&
      sourceChannel.value === next.sourceChannel &&
      wechatBound.value === next.wechatBound &&
      phoneBound.value === next.phoneBound &&
      levelId.value === next.levelId &&
      activeStart.value === next.activeStart &&
      activeEnd.value === next.activeEnd &&
      sortBy.value === next.sortBy &&
      sortOrder.value === next.sortOrder &&
      page.value === next.page &&
      pageSize.value === next.pageSize
    ) return;
    keyword.value = next.keyword;
    activityId.value = next.activityId;
    sourceChannel.value = next.sourceChannel;
    wechatBound.value = next.wechatBound;
    phoneBound.value = next.phoneBound;
    levelId.value = next.levelId;
    activeStart.value = next.activeStart;
    activeEnd.value = next.activeEnd;
    sortBy.value = next.sortBy;
    sortOrder.value = next.sortOrder;
    page.value = next.page;
    pageSize.value = next.pageSize;
    load();
  }
);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>会员管理</h2>
      <div class="toolbar-actions">
        <el-button :icon="Refresh" @click="load">刷新</el-button>
        <el-button :icon="Plus" @click="openCreateMember">新增会员</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreateLevel">新建等级</el-button>
      </div>
    </div>

    <div class="summary-grid">
      <div class="summary-card"><span>总会员</span><strong>{{ summary.totalMembers }}</strong></div>
      <div class="summary-card"><span>已绑手机号</span><strong>{{ summary.phoneBound }}</strong></div>
      <div class="summary-card"><span>微信绑定</span><strong>{{ summary.wechatBound }}</strong></div>
      <div class="summary-card"><span>小程序来源</span><strong>{{ summary.miniProgramSource }}</strong></div>
      <div class="summary-card"><span>近 7 日活跃</span><strong>{{ summary.active7Days }}</strong></div>
    </div>

    <el-alert
      v-if="isPlatformAdmin()"
      class="activity-alert"
      type="info"
      show-icon
      :closable="false"
      title="当前为平台超级管理员视角"
      description="这里展示全平台会员。余额充值、扣减和调整会记录到平台钱包；如后续开启多机构，请使用商家账号处理对应商家的会员余额。"
    />

    <el-alert
      v-if="activityId"
      class="activity-alert"
      type="success"
      show-icon
      :closable="false"
      title="已按复盘活动筛选会员"
      :description="`当前活动：${focusedActivityName}。${memberSummary}`"
    />

    <div class="table-card level-card">
      <div class="section-head"><h3>会员等级</h3></div>
      <el-table :data="levels" stripe empty-text="暂无会员等级">
        <el-table-column prop="name" label="等级" min-width="140" />
        <el-table-column prop="minPoints" label="积分门槛" width="120" />
        <el-table-column label="折扣" width="120"><template #default="{ row }">{{ Number(row.discountRate) === 1 ? "无折扣" : `${Number(row.discountRate * 10).toFixed(1)} 折` }}</template></el-table-column>
        <el-table-column label="优先报名" width="110"><template #default="{ row }"><el-tag :type="row.priorityBooking ? 'success' : 'info'">{{ row.priorityBooking ? "是" : "否" }}</el-tag></template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "启用" : "停用" }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="110"><template #default="{ row }"><el-button size="small" :icon="Edit" @click="openEditLevel(row)">编辑</el-button></template></el-table-column>
      </el-table>
    </div>

    <div class="table-card">
      <el-form class="member-filters" label-position="top">
        <el-form-item label="关键词"><el-input v-model="keyword" clearable placeholder="手机号 / 昵称 / UserID" /></el-form-item>
        <el-form-item label="来源">
          <el-select v-model="sourceChannel" clearable placeholder="全部">
            <el-option label="H5" value="h5" />
            <el-option label="微信小程序" value="mp_weixin" />
            <el-option label="后台创建" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号">
          <el-select v-model="phoneBound" clearable placeholder="全部">
            <el-option label="已绑定" value="true" />
            <el-option label="未绑定" value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="微信">
          <el-select v-model="wechatBound" clearable placeholder="全部">
            <el-option label="已绑定" value="true" />
            <el-option label="未绑定" value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="等级">
          <el-select v-model="levelId" clearable placeholder="全部">
            <el-option label="普通会员" value="none" />
            <el-option v-for="level in levels" :key="level.id" :label="level.name" :value="String(level.id)" />
          </el-select>
        </el-form-item>
        <el-form-item label="活跃开始"><el-date-picker v-model="activeStart" type="date" value-format="YYYY-MM-DD" placeholder="开始日期" /></el-form-item>
        <el-form-item label="活跃结束"><el-date-picker v-model="activeEnd" type="date" value-format="YYYY-MM-DD" placeholder="结束日期" /></el-form-item>
        <el-form-item label="排序">
          <div class="sort-row">
            <el-select v-model="sortBy">
              <el-option label="最近活跃" value="lastActiveAt" />
              <el-option label="最近登录" value="lastLoginAt" />
              <el-option label="积分" value="points" />
              <el-option label="消费" value="totalSpent" />
              <el-option label="报名数" value="registrationCount" />
              <el-option label="创建时间" value="createdAt" />
            </el-select>
            <el-select v-model="sortOrder" class="sort-order">
              <el-option label="降序" value="DESC" />
              <el-option label="升序" value="ASC" />
            </el-select>
          </div>
        </el-form-item>
        <el-form-item label="操作" class="filter-actions">
          <el-button type="primary" :icon="Search" @click="applyFilter">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
        <el-button v-if="activityId" @click="clearActivityFilter">查看全部会员</el-button>
      </el-form>
      <el-table v-loading="loading" :data="rows" stripe empty-text="暂无会员">
        <el-table-column label="会员" min-width="180"><template #default="{ row }">{{ row.user.nickname || row.user.phone || `用户${row.user.id}` }}</template></el-table-column>
        <el-table-column label="手机号" width="140"><template #default="{ row }">{{ row.user.phone || "-" }}</template></el-table-column>
        <el-table-column label="来源" width="115">
          <template #default="{ row }"><el-tag :type="row.user.sourceChannel === 'mp_weixin' ? 'success' : row.user.sourceChannel === 'h5' ? 'primary' : 'info'">{{ sourceChannelText(row.user.sourceChannel) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="微信绑定" width="110">
          <template #default="{ row }"><el-tag :type="row.user.openid ? 'success' : 'info'">{{ row.user.openid ? "已绑定" : "未绑定" }}</el-tag></template>
        </el-table-column>
        <el-table-column label="AppID" width="150" show-overflow-tooltip><template #default="{ row }">{{ row.user.wechatAppId || "-" }}</template></el-table-column>
        <el-table-column label="等级" width="140"><template #default="{ row }"><el-tag>{{ row.level?.name || "普通会员" }}</el-tag></template></el-table-column>
        <el-table-column prop="points" label="积分" width="100" />
        <el-table-column label="消费" width="120"><template #default="{ row }">¥{{ money(row.totalSpent) }}</template></el-table-column>
        <el-table-column prop="registrationCount" label="报名" width="90" />
        <el-table-column prop="checkInCount" label="签到" width="90" />
        <el-table-column prop="reviewCount" label="评价" width="90" />
        <el-table-column label="最近活跃" width="180"><template #default="{ row }">{{ formatTime(row.lastActiveAt) }}</template></el-table-column>
        <el-table-column label="最近登录" width="180"><template #default="{ row }">{{ formatTime(row.user.lastLoginAt) }}</template></el-table-column>
        <el-table-column label="操作" width="110" fixed="right"><template #default="{ row }"><el-button size="small" @click="openDetail(row)">详情</el-button></template></el-table-column>
      </el-table>
      <div class="pagination-row">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          :current-page="page"
          :page-size="pageSize"
          :page-sizes="[20, 50, 100]"
          @current-change="changePage"
          @size-change="changePageSize"
        />
      </div>
    </div>

    <el-dialog v-model="levelDialog" width="520px" title="会员等级">
      <el-form label-position="top">
        <el-form-item label="等级名称"><el-input v-model="levelForm.name" /></el-form-item>
        <el-form-item label="积分门槛"><el-input-number v-model="levelForm.minPoints" :min="0" /></el-form-item>
        <el-form-item label="折扣系数"><el-input-number v-model="levelForm.discountRate" :min="0" :max="1" :step="0.01" :precision="2" /></el-form-item>
        <el-form-item><el-checkbox v-model="levelForm.priorityBooking">优先报名</el-checkbox><el-checkbox v-model="levelForm.enabled">启用</el-checkbox></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="levelForm.sortOrder" :min="0" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="levelDialog=false">取消</el-button><el-button type="primary" :loading="saving" @click="saveLevel">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="memberDialog" width="520px" title="新增会员">
      <el-alert class="dialog-alert" type="info" show-icon :closable="false" title="H5 支持手机号密码登录" description="用于测试、线下导入和先充值余额。填写手机号和初始密码后，用户可在 H5 直接用手机号密码登录。" />
      <el-form label-position="top">
        <el-form-item label="手机号"><el-input v-model="memberForm.phone" maxlength="11" placeholder="用于 H5 手机号登录，可选" /></el-form-item>
        <el-form-item label="初始密码"><el-input v-model="memberForm.password" type="password" show-password maxlength="64" placeholder="用于 H5 手机号密码登录，至少 6 位" /></el-form-item>
        <el-form-item label="昵称"><el-input v-model="memberForm.nickname" maxlength="40" placeholder="不填则按手机号自动生成" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="memberForm.remark" type="textarea" :rows="3" placeholder="例如：测试会员、线下导入、客服登记" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="memberDialog=false">取消</el-button><el-button type="primary" :loading="memberSaving" @click="saveMember">保存</el-button></template>
    </el-dialog>

    <el-drawer v-model="detailDrawer" size="780px" title="会员详情">
      <template v-if="detail">
        <div class="profile">
          <div><span>会员</span><strong>{{ detail.profile.user.nickname || detail.profile.user.phone || `用户${detail.profile.user.id}` }}</strong></div>
          <div><span>等级</span><strong>{{ detail.profile.level?.name || "普通会员" }}</strong></div>
          <div><span>积分</span><strong>{{ detail.profile.points }}</strong></div>
          <div><span>累计消费</span><strong>¥{{ money(detail.profile.totalSpent) }}</strong></div>
        </div>
        <div class="detail-actions">
          <el-button :icon="Edit" @click="openEditMember">编辑资料</el-button>
          <el-button :icon="Key" @click="openPasswordDialog">重置密码</el-button>
        </div>
        <div class="identity-card">
          <div><span>来源端</span><strong>{{ sourceChannelText(detail.profile.user.sourceChannel) }}</strong></div>
          <div><span>微信绑定</span><strong>{{ detail.profile.user.openid ? "已绑定" : "未绑定" }}</strong><small>{{ maskIdentity(detail.profile.user.openid) }}</small></div>
          <div><span>小程序 AppID</span><strong>{{ detail.profile.user.wechatAppId || "-" }}</strong></div>
          <div><span>UnionID</span><strong>{{ maskIdentity(detail.profile.user.unionid) }}</strong></div>
          <div><span>最近登录端</span><strong>{{ loginChannelText(detail.profile.user.lastLoginChannel) }}</strong></div>
          <div><span>最近登录时间</span><strong>{{ formatTime(detail.profile.user.lastLoginAt) }}</strong></div>
        </div>
        <div v-if="isPlatformAdmin()" class="wallet-card">
          <div>
            <span>账户余额</span>
            <strong>¥{{ money(wallet?.availableBalance) }}</strong>
            <small>累计充值 ¥{{ money(wallet?.totalRecharge) }} / 累计消费 ¥{{ money(wallet?.totalSpent) }}</small>
          </div>
          <div class="wallet-actions">
            <el-button type="primary" @click="openWalletDialog('recharge')">充值</el-button>
            <el-button @click="openWalletDialog('deduct')">扣减</el-button>
            <el-button @click="openWalletDialog('adjust')">调整</el-button>
          </div>
        </div>
        <el-tabs>
          <el-tab-pane v-if="isPlatformAdmin()" label="余额流水">
            <el-table :data="walletTransactions" stripe empty-text="暂无余额流水">
              <el-table-column prop="transactionNo" label="流水号" min-width="170" />
              <el-table-column prop="type" label="类型" width="130" />
              <el-table-column prop="direction" label="方向" width="90" />
              <el-table-column label="金额" width="110"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
              <el-table-column label="余额" width="120"><template #default="{ row }">¥{{ money(row.balanceAfter) }}</template></el-table-column>
              <el-table-column prop="operator" label="操作者" width="120" />
              <el-table-column prop="remark" label="备注" min-width="160" />
              <el-table-column prop="createdAt" label="时间" width="180" />
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="积分记录">
            <el-table :data="detail.points" stripe empty-text="暂无积分记录">
              <el-table-column prop="points" label="积分" width="90" />
              <el-table-column prop="remark" label="说明" min-width="180" />
              <el-table-column prop="sourceType" label="来源" width="130" />
              <el-table-column prop="createdAt" label="时间" width="180" />
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="报名记录">
            <el-table :data="detail.registrations" stripe empty-text="暂无报名">
              <el-table-column label="活动" min-width="220"><template #default="{ row }">{{ row.activity.title }}</template></el-table-column>
              <el-table-column prop="status" label="状态" width="130" />
              <el-table-column prop="createdAt" label="时间" width="180" />
            </el-table>
          </el-tab-pane>
          <el-tab-pane label="订单">
            <el-table :data="detail.orders" stripe empty-text="暂无订单">
              <el-table-column prop="orderNo" label="订单号" min-width="180" />
              <el-table-column label="金额" width="110"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
              <el-table-column prop="status" label="状态" width="130" />
              <el-table-column prop="createdAt" label="时间" width="180" />
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </template>
    </el-drawer>

    <el-dialog v-model="editMemberDialog" width="520px" title="编辑会员资料">
      <el-form label-position="top">
        <el-form-item label="手机号"><el-input v-model="editMemberForm.phone" maxlength="11" placeholder="用于 H5 手机号登录" /></el-form-item>
        <el-form-item label="昵称"><el-input v-model="editMemberForm.nickname" maxlength="40" /></el-form-item>
        <el-form-item label="头像 URL"><el-input v-model="editMemberForm.avatarUrl" maxlength="500" placeholder="可选，留空则清除头像" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="editMemberDialog=false">取消</el-button><el-button type="primary" :loading="editMemberSaving" @click="saveMemberEdit">保存</el-button></template>
    </el-dialog>

    <el-dialog v-model="passwordDialog" width="480px" title="重置会员密码">
      <el-alert class="dialog-alert" type="warning" show-icon :closable="false" title="仅重置 H5 手机号密码登录" description="如果用户使用微信小程序授权登录，微信身份不会被修改。" />
      <el-form label-position="top">
        <el-form-item label="新密码"><el-input v-model="passwordForm.password" type="password" show-password maxlength="64" placeholder="6-64 位" /></el-form-item>
        <el-form-item label="确认新密码"><el-input v-model="passwordForm.confirmPassword" type="password" show-password maxlength="64" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="passwordDialog=false">取消</el-button><el-button type="primary" :loading="passwordSaving" @click="resetMemberPassword">确认重置</el-button></template>
    </el-dialog>

    <el-dialog v-model="walletDialog" width="480px" title="调整余额">
      <el-form label-position="top">
        <el-form-item label="类型">
          <el-select v-model="walletForm.type" style="width: 100%">
            <el-option label="充值" value="recharge" />
            <el-option label="扣减" value="deduct" />
            <el-option label="调整" value="adjust" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额">
          <el-input-number v-model="walletForm.amount" :precision="2" :step="10" style="width: 180px" />
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="walletForm.remark" type="textarea" :rows="3" placeholder="记录充值来源、扣减原因或调整说明" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="walletDialog=false">取消</el-button><el-button type="primary" :loading="walletSaving" @click="saveWalletAdjust">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped>
.toolbar-actions { display: flex; gap: 10px; align-items: center; }
.activity-alert { margin-bottom: 16px; }
.dialog-alert { margin-bottom: 16px; }
.level-card { margin-bottom: 16px; }
.summary-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.summary-card { display: grid; gap: 6px; padding: 14px 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }
.summary-card span { color: #667085; font-size: 13px; }
.summary-card strong { color: #111827; font-size: 24px; line-height: 1.1; }
.member-filters { display: grid; grid-template-columns: 220px 150px 130px 130px 150px 170px 170px 290px 170px auto; gap: 12px; align-items: end; margin-bottom: 14px; }
.member-filters :deep(.el-form-item) { margin-right: 0; margin-bottom: 0; }
.member-filters :deep(.el-select), .member-filters :deep(.el-date-editor) { width: 100%; }
.sort-row { display: grid; grid-template-columns: minmax(0, 1fr) 96px; gap: 8px; }
.filter-actions :deep(.el-form-item__content) { display: flex; gap: 8px; flex-wrap: nowrap; }
.pagination-row { display: flex; justify-content: flex-end; margin-top: 14px; }
.section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
h3 { margin: 0; }
.profile { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
.profile div { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; display: grid; gap: 6px; }
.profile span { color: #667085; font-size: 13px; }
.profile strong { font-size: 20px; }
.detail-actions { display: flex; gap: 10px; align-items: center; margin-bottom: 18px; }
.identity-card { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 18px; }
.identity-card div { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; display: grid; gap: 6px; background: #f8fafc; }
.identity-card span, .identity-card small { color: #667085; font-size: 13px; }
.identity-card strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #111827; font-size: 15px; }
.wallet-card { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; padding: 16px; border: 1px solid #d7dde8; border-radius: 8px; background: #f8fafc; }
.wallet-card div:first-child { display: grid; gap: 6px; }
.wallet-card span, .wallet-card small { color: #667085; font-size: 13px; }
.wallet-card strong { color: #0f766e; font-size: 26px; }
.wallet-actions { display: flex; gap: 8px; align-items: center; }
@media (max-width: 1480px) {
  .member-filters { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
</style>
