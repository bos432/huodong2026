<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { api } from "../api";

type CodeLog = {
  id: number;
  phone: string;
  clientIp?: string | null;
  mode: string;
  status: "sent" | "failed" | "rate_limited";
  provider?: string | null;
  providerMessageId?: string | null;
  message?: string | null;
  expiresAt?: string | null;
  createdAt: string;
};

type CodeLogResult = {
  items: CodeLog[];
  total: number;
  summary: Record<string, number>;
};

const rows = ref<CodeLog[]>([]);
const summary = ref<Record<string, number>>({});
const total = ref(0);
const loading = ref(false);
const query = reactive({ phone: "", status: "", mode: "" });

const summaryCards = computed(() => [
  { label: "发送成功", value: summary.value.sent || 0, type: "success" },
  { label: "发送失败", value: summary.value.failed || 0, type: "danger" },
  { label: "触发限流", value: summary.value.rate_limited || 0, type: "warning" }
]);

async function load() {
  loading.value = true;
  try {
    const data = await api.get<any, CodeLogResult>("/admin/auth/h5-code-logs", { params: { ...query } });
    rows.value = data.items;
    summary.value = data.summary || {};
    total.value = data.total || 0;
  } finally {
    loading.value = false;
  }
}

function reset() {
  query.phone = "";
  query.status = "";
  query.mode = "";
  load();
}

function formatTime(value?: string | null) {
  if (!value) return "-";
  return value.replace("T", " ").slice(0, 16);
}

function statusText(status: CodeLog["status"]) {
  return status === "sent" ? "发送成功" : status === "failed" ? "发送失败" : "触发限流";
}

function statusType(status: CodeLog["status"]) {
  return status === "sent" ? "success" : status === "failed" ? "danger" : "warning";
}

onMounted(load);
</script>

<template>
  <div class="page">
    <div class="toolbar">
      <h2>H5 验证码日志</h2>
      <el-button @click="load">刷新</el-button>
    </div>

    <div class="metric-row">
      <div v-for="item in summaryCards" :key="item.label" class="metric">
        <span>{{ item.label }}</span>
        <strong :class="item.type">{{ item.value }}</strong>
      </div>
      <div class="metric">
        <span>当前筛选</span>
        <strong>{{ total }}</strong>
      </div>
    </div>

    <div class="table-card">
      <el-form :inline="true" :model="query" class="filters">
        <el-form-item label="手机号">
          <el-input v-model="query.phone" clearable placeholder="手机号关键词" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable placeholder="全部状态" style="width: 140px">
            <el-option label="发送成功" value="sent" />
            <el-option label="发送失败" value="failed" />
            <el-option label="触发限流" value="rate_limited" />
          </el-select>
        </el-form-item>
        <el-form-item label="模式">
          <el-select v-model="query.mode" clearable placeholder="全部模式" style="width: 120px">
            <el-option label="开发" value="dev" />
            <el-option label="短信" value="sms" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="load">查询</el-button>
          <el-button @click="reset">重置</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="rows" stripe v-loading="loading" empty-text="暂无验证码日志">
        <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="clientIp" label="IP" width="150" />
        <el-table-column label="状态" width="120"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template></el-table-column>
        <el-table-column prop="mode" label="模式" width="90" />
        <el-table-column prop="provider" label="服务商" width="130" />
        <el-table-column prop="providerMessageId" label="服务商消息号" min-width="160" show-overflow-tooltip />
        <el-table-column prop="message" label="备注" min-width="220" show-overflow-tooltip />
        <el-table-column label="过期时间" width="170"><template #default="{ row }">{{ formatTime(row.expiresAt) }}</template></el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.metric-row { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.metric { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 16px; }
.metric span { display: block; color: #64748b; font-size: 13px; margin-bottom: 6px; }
.metric strong { font-size: 24px; color: #111827; }
.metric strong.success { color: #16a34a; }
.metric strong.warning { color: #d97706; }
.metric strong.danger { color: #dc2626; }
.filters { margin-bottom: 8px; }
</style>
