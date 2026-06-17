<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { CopyDocument, Grid, Key, SwitchButton, View } from "@element-plus/icons-vue";
import { api } from "../api";
import H5QrDialog from "../components/H5QrDialog.vue";
import { AdminRole, canAccess, canAccessScope, clearStoredAdminSession, currentRole, currentTenantCode, currentTenantName, isPlatformAdmin, permissions, roleOptions, setStoredAdminSession } from "../permissions";
import { copyToClipboard, h5PreviewUrl, openH5Preview } from "../h5-preview";

const route = useRoute();
const router = useRouter();
const passwordDialogVisible = ref(false);
const h5QrDialogVisible = ref(false);
const changingPassword = ref(false);
const passwordForm = reactive({ oldPassword: "", newPassword: "", confirmPassword: "" });
const roleLabel = computed(() => roleOptions.find((item) => item.value === currentRole())?.label || "管理员");
const shellTitle = computed(() => (isPlatformAdmin() ? "平台超级管理后台" : `${currentTenantName() || "商家"}管理后台`));
const roleCapabilityText = computed(() => {
  const role = currentRole();
  if (isPlatformAdmin()) return "平台超管：可管理全平台商家、活动、订单、公益池、系统安全，并拥有会员余额调整权限。";
  if (role === AdminRole.Operator) return "运营账号：可管理活动、报名、会员和装修营销；不处理余额调整等平台资产操作。";
  if (role === AdminRole.Finance) return "财务账号：可查看订单财务、确认线下收款、处理退款和对账；不编辑活动内容。";
  if (role === AdminRole.CheckInStaff) return "签到账号：用于现场查询报名和签到核销；不显示审核、收款和活动编辑操作。";
  return "商家管理员：只管理本商家数据，可配置活动、报名、员工账号和经营设置。";
});
const currentH5PreviewUrl = computed(() => h5PreviewUrl(isPlatformAdmin() ? "" : currentTenantCode()));
const currentH5PreviewLabel = computed(() => (isPlatformAdmin() ? "平台H5" : "商家H5"));
const menuGroups = [
  {
    index: "platform-overview",
    icon: "DataAnalysis",
    label: "平台端 · 总览",
    scope: "platform",
    items: [
      { index: "/dashboard", icon: "DataAnalysis", label: "全局数据看板", roles: permissions.overview, scope: "platform" },
      { index: "/analytics", icon: "TrendCharts", label: "数据中心", roles: permissions.analytics, scope: "platform" }
    ]
  },
  {
    index: "platform-merchant",
    icon: "OfficeBuilding",
    label: "平台端 · 商家",
    scope: "platform",
    items: [
      { index: "/tenants", icon: "OfficeBuilding", label: "商家/代理列表", roles: ["tenant.manage"], scope: "platform" },
      { index: "/admins", icon: "UserFilled", label: "商家账号", roles: ["admin.manage"], scope: "platform" },
      { index: "/tenants?mode=permissions", icon: "Setting", label: "权限配置", roles: ["tenant.manage"], scope: "platform" }
    ]
  },
  {
    index: "platform-activity",
    icon: "Calendar",
    label: "平台端 · 活动监管",
    scope: "platform",
    items: [
      { index: "/activities?status=pending_approval", icon: "Calendar", label: "活动审核", roles: ["activity.approve"], scope: "platform" },
      { index: "/activities", icon: "Calendar", label: "全部活动", roles: permissions.activityView, scope: "platform" },
      { index: "/registrations", icon: "Tickets", label: "全局报名", roles: permissions.registrationView, scope: "platform" },
      { index: "/announcements", icon: "Bell", label: "公告监管", roles: ["announcement.manage"], scope: "platform" },
      { index: "/homepage-builder", icon: "Grid", label: "H5全局装修", roles: ["homepage.manage"], scope: "platform" },
      { index: "/categories", icon: "CollectionTag", label: "全局分类", roles: ["category.manage"], scope: "platform" }
    ]
  },
  {
    index: "platform-finance",
    icon: "Wallet",
    label: "平台端 · 订单财务",
    scope: "platform",
    items: [
      { index: "/orders", icon: "Wallet", label: "全局订单", roles: ["order.view"], scope: "platform" },
      { index: "/finance", icon: "CreditCard", label: "全局对账", roles: ["finance.view"], scope: "platform" },
      { index: "/agents", icon: "Shop", label: "商家收款账户", roles: ["payment_account.view"], scope: "platform" }
    ]
  },
  {
    index: "platform-member",
    icon: "User",
    label: "平台端 · 会员资产",
    scope: "platform",
    items: [
      { index: "/members", icon: "User", label: "会员资料管理", roles: ["member.view"], scope: "platform" }
    ]
  },
  {
    index: "platform-charity",
    icon: "Coin",
    label: "平台端 · 公益与招募",
    scope: "platform",
    items: [
      { index: "/charity", icon: "Coin", label: "公益池", roles: ["charity.view"], scope: "platform" },
      { index: "/ambassador", icon: "Flag", label: "文化大使招募", roles: ["ambassador.manage"], scope: "platform" }
    ]
  },
  {
    index: "platform-academy",
    icon: "Reading",
    label: "平台端 · 书院运营",
    scope: "platform",
    items: [
      { index: "/courses", icon: "Reading", label: "课程管理", roles: ["course.manage"], scope: "platform" },
      { index: "/community", icon: "ChatLineSquare", label: "共修管理", roles: ["community.manage"], scope: "platform" }
    ]
  },
  {
    index: "platform-security",
    icon: "Tools",
    label: "平台端 · 系统安全",
    scope: "platform",
    items: [
      { index: "/system-settings", icon: "Tools", label: "系统设置", roles: ["system.manage"], scope: "platform" },
      { index: "/config-check", icon: "Monitor", label: "上线体检", roles: ["system.manage"], scope: "platform" },
      { index: "/ops-routine", icon: "List", label: "运营巡检", roles: ["system.manage"], scope: "platform" },
      { index: "/operation-logs", icon: "Document", label: "操作日志", roles: ["logs.view"], scope: "platform" },
      { index: "/admin-login-logs", icon: "Key", label: "登录日志", roles: ["logs.view"], scope: "platform" },
      { index: "/h5-code-logs", icon: "Lock", label: "验证码日志", roles: ["logs.view"], scope: "platform" }
    ]
  },
  {
    index: "tenant-workbench",
    icon: "DataAnalysis",
    label: "商家端 · 工作台",
    scope: "tenant",
    items: [
      { index: "/dashboard", icon: "DataAnalysis", label: "工作台", roles: permissions.overview, scope: "tenant" },
      { index: "/analytics", icon: "TrendCharts", label: "数据中心", roles: permissions.analytics, scope: "tenant" }
    ]
  },
  {
    index: "tenant-activity",
    icon: "Calendar",
    label: "商家端 · 活动",
    scope: "tenant",
    items: [
      { index: "/activities", icon: "Calendar", label: "活动管理", roles: permissions.activityView, scope: "tenant" },
      { index: "/categories", icon: "CollectionTag", label: "分类管理", roles: ["category.manage"], scope: "tenant" },
      { index: "/ticket-types", icon: "Sell", label: "票种管理", roles: ["ticket.manage"], scope: "tenant" },
      { index: "/coupons", icon: "Discount", label: "优惠码", roles: ["coupon.manage"], scope: "tenant" }
    ]
  },
  {
    index: "tenant-registration",
    icon: "Tickets",
    label: "商家端 · 报名签到",
    scope: "tenant",
    items: [
      { index: "/registrations", icon: "Tickets", label: "报名管理", roles: permissions.registrationView, scope: "tenant" },
      { index: "/waitlists", icon: "List", label: "候补管理", roles: ["waitlist.manage"], scope: "tenant" },
      { index: "/check-in", icon: "Finished", label: "签到核销", roles: permissions.checkIn, scope: "tenant" }
    ]
  },
  {
    index: "tenant-finance",
    icon: "Wallet",
    label: "商家端 · 订单财务",
    scope: "tenant",
    items: [
      { index: "/orders", icon: "Wallet", label: "订单管理", roles: ["order.view"], scope: "tenant" },
      { index: "/finance", icon: "CreditCard", label: "财务对账", roles: ["finance.view"], scope: "tenant" },
      { index: "/agents", icon: "Shop", label: "收款方式", roles: permissions.paymentAccountView, scope: "tenant" },
      { index: "/agent-settlements", icon: "Money", label: "代理结算", roles: ["agent_settlement.view"], scope: "tenant" }
    ]
  },
  {
    index: "tenant-member",
    icon: "User",
    label: "商家端 · 会员运营",
    scope: "tenant",
    items: [
      { index: "/members", icon: "User", label: "会员资料管理", roles: ["member.view"], scope: "tenant" },
      { index: "/tags", icon: "PriceTag", label: "用户标签", roles: ["tag.manage"], scope: "tenant" },
      { index: "/notifications", icon: "Message", label: "通知中心", roles: ["notification.manage"], scope: "tenant" },
      { index: "/reviews", icon: "ChatDotRound", label: "评价管理", roles: ["review.manage"], scope: "tenant" }
    ]
  },
  {
    index: "tenant-marketing",
    icon: "Grid",
    label: "商家端 · 装修营销",
    scope: "tenant",
    items: [
      { index: "/homepage-builder", icon: "Grid", label: "首页装修", roles: ["homepage.manage"], scope: "tenant" },
      { index: "/announcements", icon: "Bell", label: "公告管理", roles: ["announcement.manage"], scope: "tenant" },
      { index: "/funnels", icon: "TrendCharts", label: "活动漏斗", roles: ["activity.view"], scope: "tenant" },
      { index: "/recaps", icon: "PieChart", label: "活动复盘", roles: ["activity.view"], scope: "tenant" }
    ]
  },
  {
    index: "tenant-charity",
    icon: "Coin",
    label: "商家端 · 公益池",
    scope: "tenant",
    items: [
      { index: "/charity", icon: "Coin", label: "公益池", roles: ["charity.view"], scope: "tenant" }
    ]
  },
  {
    index: "tenant-system",
    icon: "Tools",
    label: "商家端 · 系统设置",
    scope: "tenant",
    items: [
      { index: "/system-settings", icon: "Tools", label: "运营设置", roles: ["operation_settings.manage"], scope: "tenant" },
      { index: "/tenant-profile", icon: "Shop", label: "商家资料", roles: ["tenant_profile.manage"], scope: "tenant" },
      { index: "/admins", icon: "UserFilled", label: "员工账号", roles: ["admin.manage"], scope: "tenant" },
      { index: "/operation-logs", icon: "Document", label: "操作日志", roles: ["logs.view"], scope: "tenant" }
    ]
  }
];
const visibleMenuGroups = computed(() =>
  menuGroups
    .filter((group) => canAccessScope(group.scope as any))
    .map((group) => ({ ...group, items: group.items.filter((item) => canAccess(item.roles) && canAccessScope((item as any).scope)) }))
    .filter((group) => group.items.length)
);
const defaultOpeneds = computed(() => visibleMenuGroups.value.map((group) => group.index));

async function refreshCurrentAdminContext() {
  try {
    const admin = await api.get<any, any>("/admin/auth/me");
    if (!admin) return;
    setStoredAdminSession(admin);
    if ((route.meta.roles && !canAccess(route.meta.roles as string[])) || !canAccessScope(route.meta.scope as any)) {
      router.replace(visibleMenuGroups.value[0]?.items[0]?.index || "/login");
    }
  } catch {
    // Keep the current session usable; individual pages will surface request errors.
  }
}

function menuItemLabel(item: { index: string; label: string }) {
  const role = currentRole();
  if (role === AdminRole.Finance && item.index === "/dashboard") return "财务概览";
  if (role === AdminRole.CheckInStaff && item.index === "/activities") return "活动列表";
  if (role === AdminRole.CheckInStaff && item.index === "/registrations") return "报名查询";
  return item.label;
}

function validatePassword(password: string) {
  if (password.length < 8) return "新密码至少需要 8 位";
  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) return "新密码需要包含大小写字母和数字";
  return "";
}

function openPasswordDialog() {
  Object.assign(passwordForm, { oldPassword: "", newPassword: "", confirmPassword: "" });
  passwordDialogVisible.value = true;
}

function openCurrentH5Preview() {
  openH5Preview(isPlatformAdmin() ? "" : currentTenantCode());
}

async function copyCurrentH5PreviewUrl() {
  await copyToClipboard(currentH5PreviewUrl.value);
  ElMessage.success(`${currentH5PreviewLabel.value}链接已复制`);
}

function openCurrentH5QrDialog() {
  h5QrDialogVisible.value = true;
}

async function changePassword() {
  if (!passwordForm.oldPassword) return ElMessage.error("请输入当前密码");
  const passwordError = validatePassword(passwordForm.newPassword);
  if (passwordError) return ElMessage.error(passwordError);
  if (passwordForm.newPassword !== passwordForm.confirmPassword) return ElMessage.error("两次输入的新密码不一致");
  changingPassword.value = true;
  try {
    await api.post("/admin/auth/change-password", {
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword
    });
    ElMessage.success("密码已修改，请重新登录");
    passwordDialogVisible.value = false;
    logout();
  } catch (error: any) {
    ElMessage.error(error.message || "修改密码失败");
  } finally {
    changingPassword.value = false;
  }
}

function logout() {
  clearStoredAdminSession();
  router.push("/login");
}

onMounted(refreshCurrentAdminContext);
</script>

<template>
  <el-container class="shell">
    <el-aside width="248px" class="aside">
      <div class="brand">{{ shellTitle }}</div>
      <el-menu router :default-active="route.fullPath" :default-openeds="defaultOpeneds" background-color="#162033" text-color="#d8dee9" active-text-color="#ffffff" unique-opened>
        <el-sub-menu v-for="group in visibleMenuGroups" :key="group.index" :index="group.index">
          <template #title>
            <el-icon><component :is="group.icon" /></el-icon>
            <span>{{ group.label }}</span>
          </template>
          <el-menu-item v-for="item in group.items" :key="item.index" :index="item.index">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ menuItemLabel(item) }}</span>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="header">
        <div class="header-title">
          <span>{{ shellTitle }} · {{ roleLabel }}</span>
          <small>{{ roleCapabilityText }}</small>
        </div>
        <div class="header-actions">
          <el-button :icon="View" @click="openCurrentH5Preview">打开{{ currentH5PreviewLabel }}</el-button>
          <el-button :icon="CopyDocument" @click="copyCurrentH5PreviewUrl">复制{{ currentH5PreviewLabel }}</el-button>
          <el-button :icon="Grid" @click="openCurrentH5QrDialog">{{ currentH5PreviewLabel }}二维码</el-button>
          <el-button :icon="Key" @click="openPasswordDialog">修改密码</el-button>
          <el-button :icon="SwitchButton" @click="logout">退出</el-button>
        </div>
      </el-header>
      <el-main><router-view /></el-main>
    </el-container>
  </el-container>

  <H5QrDialog
    v-model="h5QrDialogVisible"
    :title="`${currentH5PreviewLabel}二维码`"
    :scope-name="shellTitle"
    :url="currentH5PreviewUrl"
  />

  <el-dialog v-model="passwordDialogVisible" title="修改密码" width="420px" destroy-on-close>
    <el-form label-position="top" @keyup.enter="changePassword">
      <el-form-item label="当前密码" required>
        <el-input v-model="passwordForm.oldPassword" type="password" show-password autocomplete="current-password" />
      </el-form-item>
      <el-form-item label="新密码" required>
        <el-input v-model="passwordForm.newPassword" type="password" show-password autocomplete="new-password" maxlength="80" />
      </el-form-item>
      <el-form-item label="确认新密码" required>
        <el-input v-model="passwordForm.confirmPassword" type="password" show-password autocomplete="new-password" maxlength="80" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="passwordDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="changingPassword" @click="changePassword">保存并重新登录</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.shell { min-height: 100vh; }
.aside { background: #162033; overflow-x: hidden; }
.brand { height: 60px; display: flex; align-items: center; padding: 0 20px; color: #fff; font-size: 20px; font-weight: 700; }
.header { background: #fff; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.header-title { min-width: 0; display: grid; gap: 3px; }
.header-title span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.header-title small { color: #64748b; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.header-actions { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 10px; }
.el-menu { border-right: 0; }
:deep(.el-sub-menu__title) { height: 46px; color: #b7c2d6; font-weight: 700; }
:deep(.el-sub-menu__title:hover), :deep(.el-menu-item:hover) { background-color: #1e2b43; }
:deep(.el-menu-item) { height: 42px; padding-left: 44px !important; }
:deep(.el-menu-item.is-active) { background: #243653; font-weight: 700; }
</style>

