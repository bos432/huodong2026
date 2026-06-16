<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { Refresh } from "@element-plus/icons-vue";

type Cadence = "daily" | "weekly" | "monthly";
type RiskLevel = "high" | "medium" | "low";

type RoutineItem = {
  id: string;
  title: string;
  cadence: Cadence;
  owner: string;
  risk: RiskLevel;
  target: string;
  evidence: string;
  action: string;
  path: string;
};

const router = useRouter();
const activeCadence = ref<Cadence>("daily");
const todayKey = new Date().toISOString().slice(0, 10);
const storageKey = `ops-routine:${todayKey}`;

const cadenceOptions = [
  { value: "daily", label: "每日巡检" },
  { value: "weekly", label: "每周巡检" },
  { value: "monthly", label: "每月巡检" }
] as const;

const routineItems: RoutineItem[] = [
  {
    id: "config-check",
    title: "上线体检",
    cadence: "daily",
    owner: "超级管理员",
    risk: "high",
    target: "生产环境、真实域名、支付、通知、上传目录和发布标识",
    evidence: "无“需修复”项，或已记录处理人和处理时间",
    action: "查看上线体检",
    path: "/config-check"
  },
  {
    id: "finance",
    title: "财务对账",
    cadence: "daily",
    owner: "财务",
    risk: "high",
    target: "待处理对账、待处理账单、待审退款、失败回调和服务商回执",
    evidence: "高风险差异已处理，待办数量可解释",
    action: "处理财务对账",
    path: "/finance"
  },
  {
    id: "registration-channel",
    title: "报名通道",
    cadence: "daily",
    owner: "运营负责人",
    risk: "high",
    target: "全站报名开关、暂停报名文案、客服电话和活动展示配置",
    evidence: "开关状态符合当天排期，暂停文案可被用户理解",
    action: "查看系统设置",
    path: "/system-settings"
  },
  {
    id: "admin-login-logs",
    title: "登录日志",
    cadence: "daily",
    owner: "超级管理员",
    risk: "medium",
    target: "后台登录失败、触发限流、异常 IP 和异常浏览器",
    evidence: "异常登录已确认来源，必要时已禁用账号",
    action: "查看登录日志",
    path: "/admin-login-logs"
  },
  {
    id: "h5-code-logs",
    title: "验证码日志",
    cadence: "daily",
    owner: "运营负责人",
    risk: "medium",
    target: "H5 验证码发送失败、触发限流、服务商消息 ID 和异常手机号",
    evidence: "失败峰值已定位到服务商、模板或用户行为",
    action: "查看验证码日志",
    path: "/h5-code-logs"
  },
  {
    id: "operation-logs",
    title: "操作日志",
    cadence: "weekly",
    owner: "超级管理员",
    risk: "high",
    target: "确认收款、通过退款、签到核销、候补补位和运营设置变更",
    evidence: "高风险操作均能追溯到管理员、对象和原因",
    action: "查看操作日志",
    path: "/operation-logs"
  },
  {
    id: "admins",
    title: "管理员",
    cadence: "weekly",
    owner: "超级管理员",
    risk: "high",
    target: "管理员角色、禁用状态、默认账号、离职账号和弱权限边界",
    evidence: "无闲置超级管理员，离职/临时账号已禁用",
    action: "管理账号",
    path: "/admins"
  },
  {
    id: "agent-settlements",
    title: "代理结算",
    cadence: "weekly",
    owner: "财务",
    risk: "high",
    target: "地区代理结算单、打款凭证、待处理差异和真实打款回执",
    evidence: "已审核结算均有凭证，未处理差异不进入打款",
    action: "核对代理结算",
    path: "/agent-settlements"
  },
  {
    id: "agents",
    title: "代理收款",
    cadence: "weekly",
    owner: "超级管理员",
    risk: "medium",
    target: "代理启用状态、微信/支付宝收款账号和配置脱敏展示",
    evidence: "代理收款账号与地区/活动归属一致",
    action: "查看代理收款",
    path: "/agents"
  },
  {
    id: "backup-restore",
    title: "备份恢复演练",
    cadence: "monthly",
    owner: "技术负责人",
    risk: "high",
    target: "数据库备份文件、恢复脚本、保留策略和恢复耗时",
    evidence: "完成一次恢复演练，并记录恢复环境和结果",
    action: "查看上线体检",
    path: "/config-check"
  },
  {
    id: "provider-balance",
    title: "通知服务余额",
    cadence: "monthly",
    owner: "运营负责人",
    risk: "medium",
    target: "短信、邮件、微信通知服务商余额、签名和模板状态",
    evidence: "余额足够覆盖下月活动，模板未过期或被驳回",
    action: "查看系统设置",
    path: "/system-settings"
  },
  {
    id: "default-admin",
    title: "默认管理员复核",
    cadence: "monthly",
    owner: "超级管理员",
    risk: "high",
    target: "默认管理员、烟测账号、长期未登录账号和超级管理员数量",
    evidence: "默认/烟测账号已禁用或更换强密码",
    action: "复核管理员",
    path: "/admins"
  }
];

function loadCompleted() {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

const completedIds = ref<string[]>(loadCompleted());

const currentItems = computed(() => routineItems.filter((item) => item.cadence === activeCadence.value));
const currentDoneCount = computed(() => currentItems.value.filter((item) => completedIds.value.includes(item.id)).length);
const totalDoneCount = computed(() => routineItems.filter((item) => completedIds.value.includes(item.id)).length);
const summary = computed(() =>
  cadenceOptions.map((option) => {
    const items = routineItems.filter((item) => item.cadence === option.value);
    return {
      ...option,
      total: items.length,
      done: items.filter((item) => completedIds.value.includes(item.id)).length
    };
  })
);

function riskText(risk: RiskLevel) {
  return risk === "high" ? "高风险" : risk === "medium" ? "需关注" : "常规";
}

function riskType(risk: RiskLevel) {
  return risk === "high" ? "danger" : risk === "medium" ? "warning" : "info";
}

function saveCompleted(ids: string[]) {
  completedIds.value = ids;
  localStorage.setItem(storageKey, JSON.stringify(ids));
}

function toggleItem(row: RoutineItem, checked: boolean) {
  const next = new Set(completedIds.value);
  if (checked) next.add(row.id);
  else next.delete(row.id);
  saveCompleted([...next]);
}

function toggleItemFromCheckbox(row: RoutineItem, checked: string | number | boolean) {
  toggleItem(row, Boolean(checked));
}

function resetToday() {
  saveCompleted([]);
}

function go(path: string) {
  router.push(path);
}
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <div>
        <h2>运营巡检</h2>
        <p class="subtitle">按每日巡检、每周巡检和每月巡检整理上线后的关键检查项。</p>
      </div>
      <el-button :icon="Refresh" @click="resetToday">重置今日状态</el-button>
    </div>

    <div class="routine-summary">
      <div v-for="item in summary" :key="item.value" class="routine-card" :class="{ active: activeCadence === item.value }" @click="activeCadence = item.value">
        <span>{{ item.label }}</span>
        <strong>{{ item.done }}/{{ item.total }}</strong>
      </div>
      <div class="routine-card total">
        <span>今日已完成</span>
        <strong>{{ totalDoneCount }}/{{ routineItems.length }}</strong>
      </div>
    </div>

    <div class="table-card">
      <div class="routine-header">
        <el-segmented v-model="activeCadence" :options="cadenceOptions" />
        <span>当前分组 {{ currentDoneCount }}/{{ currentItems.length }} 已完成</span>
      </div>

      <el-table :data="currentItems" stripe empty-text="暂无巡检项">
        <el-table-column label="完成" width="86">
          <template #default="{ row }">
            <el-checkbox :model-value="completedIds.includes(row.id)" @change="toggleItemFromCheckbox(row, $event)" />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="巡检项" width="140" />
        <el-table-column prop="owner" label="负责人" width="120" />
        <el-table-column label="风险" width="100">
          <template #default="{ row }">
            <el-tag :type="riskType(row.risk)">{{ riskText(row.risk) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="target" label="检查目标" min-width="280" />
        <el-table-column prop="evidence" label="完成标准" min-width="260" />
        <el-table-column label="入口" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="go(row.path)">{{ row.action }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.subtitle { margin: 6px 0 0; color: #6b7280; font-size: 14px; }
.routine-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.routine-card { min-height: 82px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between; }
.routine-card span { color: #6b7280; font-size: 13px; }
.routine-card strong { color: #111827; font-size: 26px; line-height: 1; }
.routine-card.active { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.12); }
.routine-card.total { cursor: default; background: #f8fafc; }
.routine-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; color: #6b7280; }

@media (max-width: 900px) {
  .routine-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .routine-header { align-items: flex-start; flex-direction: column; }
}
</style>
