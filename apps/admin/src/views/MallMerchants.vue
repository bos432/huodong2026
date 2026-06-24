<template>
  <div class="mall-merchant-page">
    <div class="page-header">
      <div>
        <h2>商城店铺</h2>
        <p>把商家和代理授权为独立店铺。商品、订单、营销、物流和支付配置都会按店铺隔离。</p>
      </div>
      <div class="header-actions">
        <el-select v-model="filters.tenantId" clearable filterable placeholder="全部商家" style="width:220px" @change="reload">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-select v-model="filters.status" clearable placeholder="全部状态" style="width:140px" @change="loadMerchants">
          <el-option label="启用中" value="active" />
          <el-option label="已停用" value="disabled" />
        </el-select>
        <el-select v-model="filters.launchStatus" clearable placeholder="全部上线状态" style="width:160px">
          <el-option label="可上线运营" value="ready" />
          <el-option label="待配置" value="pending" />
          <el-option label="支付待联调" value="payment" />
          <el-option label="有售后待处理" value="after_sale" />
          <el-option label="售后异常" value="risk" />
        </el-select>
        <el-input v-model="filters.keyword" clearable placeholder="店铺/编码/地区/代理" style="width:240px" @keyup.enter="loadMerchants" @clear="loadMerchants" />
        <el-button @click="reload">刷新</el-button>
        <el-button :loading="readinessLoading" @click="loadPaymentReadiness">刷新支付状态</el-button>
        <el-button type="warning" plain @click="exportLaunchChecklist">导出上线清单</el-button>
        <el-button type="primary" @click="openCreate">新增店铺</el-button>
      </div>
    </div>

    <el-alert
      type="info"
      show-icon
      :closable="false"
      class="scope-hint"
      title="多商户商城以“店铺”为经营主体：商家默认店铺承接历史商城数据，代理店铺用于代理自营商品、独立履约和后续结算。"
    />

    <div class="launch-summary">
      <button v-for="item in launchSummaryCards" :key="item.value || 'all'" type="button" :class="{ active: filters.launchStatus === item.value }" @click="filters.launchStatus = item.value">
        <small>{{ item.label }}</small>
        <strong>{{ item.count }}</strong>
      </button>
    </div>

    <el-table v-loading="loading" :data="visibleRows" stripe>
      <el-table-column label="店铺" min-width="260">
        <template #default="{ row }">
          <div class="merchant-cell">
            <img v-if="row.logoUrl" :src="row.logoUrl" alt="" />
            <div v-else class="logo-placeholder">店</div>
            <div>
              <strong>{{ row.name }}</strong>
              <small>{{ row.code }} · {{ ownerText(row.ownerType) }} · {{ row.region || "未设地区" }}</small>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="所属商家" min-width="180"><template #default="{ row }">{{ row.tenant?.name || row.tenant?.code || "-" }}</template></el-table-column>
      <el-table-column label="代理" min-width="160"><template #default="{ row }">{{ row.agent?.name || "商家默认店铺" }}</template></el-table-column>
      <el-table-column label="商城" width="100"><template #default="{ row }"><el-tag :type="row.mallEnabled ? 'success' : 'warning'">{{ row.mallEnabled ? "已开通" : "未开通" }}</el-tag></template></el-table-column>
      <el-table-column label="商品审核" width="110"><template #default="{ row }">{{ row.productAuditRequired ? "需要审核" : "免审核" }}</template></el-table-column>
      <el-table-column label="收款模式" width="130"><template #default="{ row }">{{ paymentModeText(row.paymentMode) }}</template></el-table-column>
      <el-table-column label="上线状态" min-width="230">
        <template #default="{ row }">
          <el-tooltip placement="top" :content="operationReadinessTip(row)" :disabled="!operationReadinessTip(row)">
            <div class="operation-cell">
              <el-tag :type="operationReadiness(row).type" effect="plain">{{ operationReadiness(row).label }}</el-tag>
              <small>{{ operationReadiness(row).nextAction }}</small>
              <el-button size="small" text type="primary" class="operation-action" @click="handleReadinessAction(row)">{{ operationActionText(row) }}</el-button>
            </div>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column label="运营数据" min-width="190">
        <template #default="{ row }">
          <div class="metric-cell">
            <span>商品 {{ row.operationSummary?.publishedProductCount || 0 }}/{{ row.operationSummary?.productCount || 0 }}</span>
            <span>授权 {{ row.operationSummary?.enabledAccessCount || 0 }} 人</span>
            <span>30天 {{ row.operationSummary?.order30dCount || 0 }} 单 / ¥{{ money(row.operationSummary?.received30dAmount) }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="H5 店铺入口" min-width="170">
        <template #default="{ row }">
          <div class="h5-entry-cell">
            <el-button size="small" type="primary" plain @click="openMerchantH5(row)">打开店铺</el-button>
            <el-button size="small" text @click="copyMerchantH5(row)">复制链接</el-button>
            <el-button size="small" text type="warning" @click="copyMerchantWorkbench(row)">复制后台工作台</el-button>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="支付就绪" min-width="210">
        <template #default="{ row }">
          <el-tooltip placement="top" :content="paymentReadinessTip(row)" :disabled="!paymentReadinessTip(row)">
            <div class="payment-cell">
              <el-tag :type="paymentReadinessType(row)" effect="plain">{{ paymentReadinessLabel(row) }}</el-tag>
              <small>{{ paymentReadinessMode(row) }}</small>
            </div>
          </el-tooltip>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.status === 'active' ? 'success' : 'info'">{{ row.status === "active" ? "启用" : "停用" }}</el-tag></template></el-table-column>
      <el-table-column label="联系人" min-width="160"><template #default="{ row }">{{ row.contactName || "-" }} {{ row.contactPhone || "" }}</template></el-table-column>
      <el-table-column label="操作" width="310" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button size="small" type="primary" plain @click="goProducts(row)">商品</el-button>
          <el-button size="small" type="warning" plain @click="openPayment(row)">收款</el-button>
          <el-button size="small" type="success" plain @click="openAccess(row)">授权</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="form.id ? '编辑店铺' : '新增店铺'" width="680px" destroy-on-close>
      <el-alert
        class="merchant-open-risk-alert"
        type="info"
        show-icon
        :closable="false"
        title="建议先配置再开放"
        description="新店铺默认停用且未开通商城。完成店铺授权、商品上架和支付联调后，再保存为“启用 + 开通商城”，避免前台提前出现未准备好的店铺。"
      />
      <el-alert
        v-if="merchantOpenRiskIssues().length"
        class="merchant-open-risk-alert"
        type="warning"
        show-icon
        :closable="false"
        title="当前开放条件仍有风险"
        :description="merchantOpenRiskIssues().join('；')"
      />
      <el-form label-width="110px">
        <el-form-item label="所属商家" required>
          <el-select v-model="form.tenantId" filterable placeholder="请选择商家" @change="loadAgents">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="店铺类型" required>
          <el-radio-group v-model="form.ownerType">
            <el-radio-button label="tenant">商家店铺</el-radio-button>
            <el-radio-button label="agent">代理店铺</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.ownerType === 'agent'" label="代理" required>
          <el-select v-model="form.agentId" filterable placeholder="请选择代理">
            <el-option v-for="agent in agents" :key="agent.id" :label="agentLabel(agent)" :value="agent.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="店铺名称" required><el-input v-model="form.name" maxlength="120" /></el-form-item>
        <el-form-item label="店铺编码"><el-input v-model="form.code" maxlength="80" placeholder="留空自动生成，如 tenant_3 / agent_8" /></el-form-item>
        <el-form-item label="地区"><el-input v-model="form.region" maxlength="80" /></el-form-item>
        <el-form-item label="联系人"><el-input v-model="form.contactName" maxlength="100" /></el-form-item>
        <el-form-item label="联系电话"><el-input v-model="form.contactPhone" maxlength="40" /></el-form-item>
        <el-form-item label="Logo URL"><el-input v-model="form.logoUrl" maxlength="500" /></el-form-item>
        <el-form-item label="店铺公告"><el-input v-model="form.notice" maxlength="255" /></el-form-item>
        <el-form-item label="经营开关">
          <el-checkbox v-model="form.mallEnabled">开通商城</el-checkbox>
          <el-checkbox v-model="form.productAuditRequired">商品发布需要平台审核</el-checkbox>
        </el-form-item>
        <el-form-item label="收款模式">
          <el-radio-group v-model="form.paymentMode">
            <el-radio-button label="platform_collect">平台代收</el-radio-button>
            <el-radio-button label="merchant_direct">商户直收</el-radio-button>
          </el-radio-group>
          <span class="form-hint">商户直收需先完成店铺支付配置和上线验收。</span>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio-button label="active">启用</el-radio-button>
            <el-radio-button label="disabled">停用</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="3" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveMerchant">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="accessDialogVisible" :title="`店铺授权：${accessMerchant?.name || ''}`" width="820px" destroy-on-close>
      <el-alert
        type="info"
        show-icon
        :closable="false"
        class="scope-hint"
        title="授权后，该后台账号可以在商城商品、订单、售后、物流、营销、财务页面管理此店铺；是否能看到菜单还取决于账号本身的细粒度权限。"
      />
      <div class="access-form">
        <el-select v-model="accessForm.adminId" filterable placeholder="选择后台账号">
          <el-option v-for="admin in adminRows" :key="admin.id" :label="adminLabel(admin)" :value="admin.id" />
        </el-select>
        <el-select v-model="accessForm.accessRole" placeholder="授权角色">
          <el-option label="店长" value="manager" />
          <el-option label="运营" value="operator" />
          <el-option label="财务" value="finance" />
          <el-option label="物流" value="logistics" />
        </el-select>
        <el-switch v-model="accessForm.enabled" active-text="启用" inactive-text="停用" />
        <el-button type="primary" :loading="accessSaving" @click="saveAccess">{{ accessForm.id ? "保存授权" : "新增授权" }}</el-button>
        <el-button v-if="accessForm.id" @click="resetAccessForm">取消编辑</el-button>
      </div>
      <el-table v-loading="accessLoading" :data="accessRows" stripe>
        <el-table-column label="后台账号" min-width="220">
          <template #default="{ row }">
            <strong>{{ row.admin?.username }}</strong>
            <small>{{ row.admin?.tenant?.name || accessMerchant?.tenant?.name || "平台账号" }}</small>
          </template>
        </el-table-column>
        <el-table-column label="授权角色" width="120"><template #default="{ row }">{{ accessRoleText(row.accessRole) }}</template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "启用" : "停用" }}</el-tag></template></el-table-column>
        <el-table-column label="授权时间" width="180"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editAccess(row)">编辑</el-button>
            <el-button size="small" :type="row.enabled ? 'warning' : 'success'" plain @click="toggleAccess(row)">{{ row.enabled ? "停用" : "启用" }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="paymentDialogVisible" :title="`店铺收款账户：${paymentMerchant?.name || ''}`" width="900px" destroy-on-close>
      <el-alert
        type="warning"
        show-icon
        :closable="false"
        class="scope-hint"
        title="商户直收会优先使用这里的店铺收款账户；真实支付开启前，请用小额订单完成下单、回调、退款和对账留档。"
      />
      <div class="payment-layout">
        <el-table v-loading="paymentLoading" :data="paymentRows" stripe empty-text="暂无店铺收款账户">
          <el-table-column label="渠道" width="110"><template #default="{ row }">{{ providerLabel(row.provider) }}</template></el-table-column>
          <el-table-column label="商户" min-width="220">
            <template #default="{ row }">
              <strong>{{ row.merchantName || "-" }}</strong>
              <small>{{ row.merchantNo || "未填商户号" }}</small>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "启用" : "停用" }}</el-tag></template></el-table-column>
          <el-table-column label="资料" min-width="150">
            <template #default="{ row }">
              <el-tag :type="accountReadiness(row).type">{{ accountReadiness(row).label }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90"><template #default="{ row }"><el-button size="small" @click="editPaymentAccount(row)">编辑</el-button></template></el-table-column>
        </el-table>
        <el-form label-width="100px" class="payment-form">
          <el-form-item label="支付渠道">
            <el-select v-model="paymentForm.provider" @change="resetPaymentTemplate">
              <el-option label="微信支付" value="wechat" />
              <el-option label="支付宝" value="alipay" />
            </el-select>
          </el-form-item>
          <el-form-item label="商户名称"><el-input v-model="paymentForm.merchantName" maxlength="120" placeholder="如：慢π自营店" /></el-form-item>
          <el-form-item label="商户号"><el-input v-model="paymentForm.merchantNo" maxlength="128" placeholder="微信商户号 / 支付宝商户标识" /></el-form-item>
          <el-form-item label="启用"><el-switch v-model="paymentForm.enabled" /></el-form-item>
          <el-alert class="payment-readiness-alert" :type="paymentFormReadiness.type" show-icon :closable="false" :title="paymentFormReadiness.label" :description="paymentFormReadiness.desc" />
          <el-form-item label="配置 JSON">
            <el-input v-model="paymentForm.configText" type="textarea" :rows="10" spellcheck="false" />
          </el-form-item>
          <div class="payment-actions">
            <el-button @click="resetPaymentTemplate">套用模板</el-button>
            <el-button v-if="paymentForm.id" @click="resetPaymentForm">取消编辑</el-button>
            <el-button type="primary" :loading="paymentSaving" @click="savePaymentAccount">{{ paymentForm.id ? "保存账户" : "新增账户" }}</el-button>
          </div>
        </el-form>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";
import { copyToClipboard, h5RoutePreviewUrl } from "../h5-preview";

type Tenant = { id: number; name?: string; code?: string; enabled?: boolean };
type Agent = { id: number; name?: string; region?: string; enabled?: boolean; tenant?: Tenant | null };
type Merchant = {
  id: number;
  code: string;
  name: string;
  ownerType: "tenant" | "agent";
  tenant?: Tenant | null;
  agent?: Agent | null;
  status: "active" | "disabled";
  mallEnabled: boolean;
  productAuditRequired: boolean;
  paymentMode: "platform_collect" | "merchant_direct";
  region?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  logoUrl?: string | null;
  notice?: string | null;
  remark?: string | null;
  operationSummary?: {
    productCount?: number;
    publishedProductCount?: number;
    pendingReviewProductCount?: number;
    enabledAccessCount?: number;
    enabledPaymentAccountCount?: number;
    order30dCount?: number;
    received30dAmount?: string;
    pendingRefundCount?: number;
    failedRefundCount?: number;
  };
};
type PaymentReadiness = {
  status: string;
  statusText?: string;
  collectionMode?: "platform_collect" | "merchant_direct";
  issues?: string[];
  nextAction?: string;
  real?: { notifyUrl?: string; refundNotifyUrl?: string };
  direct?: { notifyUrl?: string; refundNotifyUrl?: string; account?: { merchantName?: string; merchantNo?: string } | null } | null;
};
type MerchantPaymentAccount = {
  id: number;
  provider: "wechat" | "alipay";
  merchantName?: string | null;
  merchantNo?: string | null;
  enabled: boolean;
  config?: Record<string, unknown> | null;
};

const router = useRouter();
const loading = ref(false);
const saving = ref(false);
const accessLoading = ref(false);
const accessSaving = ref(false);
const readinessLoading = ref(false);
const paymentLoading = ref(false);
const paymentSaving = ref(false);
const dialogVisible = ref(false);
const accessDialogVisible = ref(false);
const paymentDialogVisible = ref(false);
const rows = ref<Merchant[]>([]);
const paymentReadiness = ref<Record<number, PaymentReadiness>>({});
const paymentRows = ref<MerchantPaymentAccount[]>([]);
const tenants = ref<Tenant[]>([]);
const agents = ref<Agent[]>([]);
const adminRows = ref<any[]>([]);
const accessRows = ref<any[]>([]);
const accessMerchant = ref<Merchant | null>(null);
const paymentMerchant = ref<Merchant | null>(null);
const filters = reactive({ tenantId: Number(localStorage.getItem("admin_selected_tenant_id") || 0) || undefined as number | undefined, status: "", launchStatus: "", keyword: "" });
const form = reactive({
  id: 0,
  tenantId: undefined as number | undefined,
  agentId: undefined as number | undefined,
  ownerType: "tenant" as "tenant" | "agent",
  code: "",
  name: "",
  status: "active" as "active" | "disabled",
  mallEnabled: true,
  productAuditRequired: true,
  paymentMode: "platform_collect" as "platform_collect" | "merchant_direct",
  region: "",
  contactName: "",
  contactPhone: "",
  logoUrl: "",
  notice: "",
  remark: ""
});
const accessForm = reactive({ id: 0, adminId: undefined as number | undefined, accessRole: "manager", enabled: true });
const paymentForm = reactive({ id: 0, provider: "wechat" as "wechat" | "alipay", merchantName: "", merchantNo: "", enabled: true, configText: "" });

const paymentRequirements: Record<MerchantPaymentAccount["provider"], string[]> = {
  wechat: ["WECHAT_PAY_APP_ID", "WECHAT_PAY_MCH_ID", "WECHAT_PAY_API_V3_KEY", "WECHAT_PAY_PRIVATE_KEY_PATH", "WECHAT_PAY_CERT_SERIAL_NO", "WECHAT_PAY_PLATFORM_CERT_PATH"],
  alipay: ["ALIPAY_APP_ID", "ALIPAY_PRIVATE_KEY_PATH", "ALIPAY_PUBLIC_CERT_PATH", "ALIPAY_ROOT_CERT_PATH"]
};
const visibleRows = computed(() => {
  if (!filters.launchStatus) return rows.value;
  return rows.value.filter((row) => merchantLaunchStatus(row) === filters.launchStatus);
});
const launchSummaryCards = computed(() => {
  const counts = { ready: 0, pending: 0, payment: 0, after_sale: 0, risk: 0 } as Record<string, number>;
  for (const row of rows.value) counts[merchantLaunchStatus(row)] = (counts[merchantLaunchStatus(row)] || 0) + 1;
  return [
    { label: "全部店铺", value: "", count: rows.value.length },
    { label: "可上线", value: "ready", count: counts.ready },
    { label: "待配置", value: "pending", count: counts.pending },
    { label: "支付待联调", value: "payment", count: counts.payment },
    { label: "有售后", value: "after_sale", count: counts.after_sale },
    { label: "售后异常", value: "risk", count: counts.risk }
  ];
});

function tenantLabel(tenant: Tenant) {
  return `${tenant.name || tenant.code || "未命名商家"}${tenant.code ? `（${tenant.code}）` : ""}`;
}

function agentLabel(agent: Agent) {
  return `${agent.name || `代理 #${agent.id}`}${agent.region ? ` · ${agent.region}` : ""}${agent.enabled === false ? " · 已停用" : ""}`;
}

function ownerText(value: string) {
  return value === "agent" ? "代理店铺" : "商家店铺";
}

function paymentModeText(value: string) {
  return value === "merchant_direct" ? "商户直收" : "平台代收";
}

function launchStatusText(value: string) {
  return (
    {
      ready: "可上线运营",
      pending: "待配置",
      payment: "支付待联调",
      after_sale: "有售后待处理",
      risk: "售后异常"
    } as Record<string, string>
  )[value] || value || "未判断";
}

function providerLabel(value: string) {
  return value === "alipay" ? "支付宝" : "微信支付";
}

function money(value: any) {
  return Number(value || 0).toFixed(2);
}

function paymentConfigTemplate(provider: "wechat" | "alipay") {
  const template =
    provider === "wechat"
      ? {
          WECHAT_PAY_APP_ID: "",
          WECHAT_PAY_MCH_ID: "",
          WECHAT_PAY_API_V3_KEY: "",
          WECHAT_PAY_PRIVATE_KEY_PATH: "",
          WECHAT_PAY_CERT_SERIAL_NO: "",
          WECHAT_PAY_PLATFORM_CERT_PATH: ""
        }
      : {
          ALIPAY_APP_ID: "",
          ALIPAY_PRIVATE_KEY_PATH: "",
          ALIPAY_PUBLIC_CERT_PATH: "",
          ALIPAY_ROOT_CERT_PATH: ""
        };
  return JSON.stringify(template, null, 2);
}

function parsePaymentConfig(text = paymentForm.configText) {
  try {
    const value = JSON.parse(text || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("配置必须是 JSON 对象");
    return { ok: true, value: value as Record<string, unknown>, error: "" };
  } catch (error: any) {
    return { ok: false, value: null, error: error.message || "JSON 格式不正确" };
  }
}

function accountReadiness(row: Pick<MerchantPaymentAccount, "provider" | "config">) {
  const config = row.config || {};
  const missing = paymentRequirements[row.provider].filter((key) => !String(config[key] || "").trim());
  if (!row.config) return { type: "danger" as const, label: "未配置", desc: "请先填写支付机构商户参数。" };
  if (missing.length) return { type: "warning" as const, label: `缺 ${missing.length} 项`, desc: `缺少：${missing.join("、")}` };
  return { type: "success" as const, label: "资料完整", desc: "可进入小额真实支付联调；回调地址由商城按店铺自动生成。" };
}

const paymentFormReadiness = computed(() => {
  const parsed = parsePaymentConfig();
  if (!parsed.ok) return { type: "danger" as const, label: "配置 JSON 有误", desc: parsed.error };
  return accountReadiness({ provider: paymentForm.provider, config: parsed.value });
});

function paymentReadinessOf(row: Merchant) {
  return paymentReadiness.value[row.id];
}

function paymentReadinessLabel(row: Merchant) {
  const readiness = paymentReadinessOf(row);
  if (!readiness) return readinessLoading.value ? "检测中" : "未检测";
  if (readiness.collectionMode === "merchant_direct") return readiness.status === "real_ready" ? "直收就绪" : "直收未就绪";
  return readiness.statusText || ({ real_ready: "真实就绪", sandbox_ready: "沙箱可验收", disabled: "未开启", not_ready: "未就绪" } as Record<string, string>)[readiness.status] || readiness.status;
}

function paymentReadinessMode(row: Merchant) {
  const readiness = paymentReadinessOf(row);
  if (!readiness) return paymentModeText(row.paymentMode);
  return readiness.collectionMode === "merchant_direct" ? "店铺独立收款" : "平台统一代收";
}

function paymentReadinessType(row: Merchant) {
  const status = paymentReadinessOf(row)?.status;
  if (status === "real_ready") return "success";
  if (status === "sandbox_ready") return "warning";
  if (status === "disabled") return "info";
  return "danger";
}

function paymentReadinessTip(row: Merchant) {
  const readiness = paymentReadinessOf(row);
  if (!readiness) return readinessLoading.value ? "正在读取该店铺支付配置状态" : "尚未读取支付配置状态，点击“刷新支付状态”重试";
  const issues = readiness.issues?.filter(Boolean) || [];
  if (issues.length) return issues.slice(0, 5).join("；");
  if (readiness.direct?.account) {
    return `商户直收账户：${readiness.direct.account.merchantName || readiness.direct.account.merchantNo || "已配置"}；退款回调：${readiness.direct.refundNotifyUrl || "未返回"}`;
  }
  return readiness.nextAction || `支付回调：${readiness.real?.notifyUrl || "未返回"}；退款回调：${readiness.real?.refundNotifyUrl || "未返回"}`;
}

function operationReadinessIssues(row: Merchant) {
  const summary = row.operationSummary || {};
  const issues: string[] = [];
  const readiness = paymentReadinessOf(row);
  if (row.status !== "active") issues.push("店铺已停用");
  if (!row.mallEnabled) issues.push("商城未开通");
  if (!Number(summary.enabledAccessCount || 0)) issues.push("未授权后台账号");
  if (!Number(summary.publishedProductCount || 0)) {
    issues.push(Number(summary.pendingReviewProductCount || 0) ? "商品待平台审核" : "暂无已上架商品");
  }
  if (!readiness) issues.push(readinessLoading.value ? "支付状态检测中" : "支付状态未检测");
  else if (readiness.status !== "real_ready") {
    const issue = readiness.issues?.find(Boolean) || readiness.nextAction || "真实支付未完成上线联调";
    issues.push(issue);
  }
  if (row.paymentMode === "merchant_direct" && !Number(summary.enabledPaymentAccountCount || 0)) issues.push("商户直收未绑定启用收款账户");
  if (Number(summary.failedRefundCount || 0)) issues.push("存在退款异常待财务处理");
  return issues;
}

function operationReadiness(row: Merchant) {
  const summary = row.operationSummary || {};
  const issues = operationReadinessIssues(row);
  if (!issues.length && Number(summary.pendingRefundCount || 0)) {
    return { type: "warning" as const, label: "可运营，有售后", nextAction: "先处理待售后，再继续推广" };
  }
  if (!issues.length) return { type: "success" as const, label: "可上线运营", nextAction: "商品、授权、支付均已就绪" };
  const first = issues[0];
  const warningIssues = ["支付状态检测中", "商品待平台审核", "支付状态未检测"];
  return {
    type: warningIssues.some((item) => first.includes(item)) ? "warning" as const : "danger" as const,
    label: first.length > 10 ? "待处理" : first,
    nextAction: operationNextAction(first)
  };
}

function merchantLaunchStatus(row: Merchant) {
  const summary = row.operationSummary || {};
  if (Number(summary.failedRefundCount || 0)) return "risk";
  const issues = operationReadinessIssues(row);
  if (issues.some((issue) => issue.includes("支付") || issue.includes("收款账户") || issue.includes("联调"))) return "payment";
  if (issues.length) return "pending";
  if (Number(summary.pendingRefundCount || 0)) return "after_sale";
  return "ready";
}

function operationReadinessTip(row: Merchant) {
  const issues = operationReadinessIssues(row);
  if (!issues.length) return "店铺已满足上线运营基础条件：启用、开通商城、有授权账号、有已上架商品、支付就绪。";
  return issues.slice(0, 6).join("；");
}

function operationNextAction(issue: string) {
  if (issue.includes("停用")) return "编辑店铺并启用";
  if (issue.includes("商城未开通")) return "编辑店铺并打开商城";
  if (issue.includes("授权")) return "点击“授权”绑定店长/运营";
  if (issue.includes("商品待平台审核")) return "到商品审核通过待审商品";
  if (issue.includes("商品")) return "点击“商品”发布并上架";
  if (issue.includes("收款账户")) return "点击“收款”配置店铺账户";
  if (issue.includes("退款")) return "到售后/财务处理异常退款";
  if (issue.includes("支付状态")) return "点击“刷新支付状态”确认";
  return "按提示完成配置后再开放售卖";
}

function operationActionText(row: Merchant) {
  const issues = operationReadinessIssues(row);
  if (issues.length) return "去处理";
  if (Number(row.operationSummary?.pendingRefundCount || 0)) return "处理售后";
  return "查看店铺";
}

function launchNextAction(row: Merchant) {
  const issues = operationReadinessIssues(row);
  if (issues.length) return operationNextAction(issues[0]);
  if (Number(row.operationSummary?.pendingRefundCount || 0)) return "处理待售后后再继续推广";
  return "可开放售卖，继续关注订单、退款和支付日志";
}

function launchIssuesText(row: Merchant) {
  const issues = operationReadinessIssues(row);
  if (issues.length) return issues.join("；");
  if (Number(row.operationSummary?.pendingRefundCount || 0)) return "有待处理售后，但不阻塞基础运营";
  return "无";
}

function csvCell(value: unknown) {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function dateStamp() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function exportLaunchChecklist() {
  const targetRows = visibleRows.value;
  if (!targetRows.length) {
    ElMessage.warning("当前筛选没有可导出的店铺");
    return;
  }
  const headers = [
    "上线状态",
    "店铺名称",
    "店铺编码",
    "所属商家",
    "店铺类型",
    "代理",
    "地区",
    "收款模式",
    "支付状态",
    "支付说明",
    "商品上架数",
    "商品总数",
    "待审核商品",
    "授权账号数",
    "30天订单数",
    "30天实收",
    "待处理售后",
    "异常退款",
    "当前问题",
    "下一步动作",
    "H5店铺入口",
    "后台店铺工作台",
    "后台商品管理",
    "后台订单管理",
    "后台售后处理",
    "后台营销工具",
    "后台经营统计",
    "联系人",
    "联系电话"
  ];
  const lines = targetRows.map((row) => {
    const summary = row.operationSummary || {};
    return [
      launchStatusText(merchantLaunchStatus(row)),
      row.name,
      row.code,
      row.tenant?.name || row.tenant?.code || "",
      ownerText(row.ownerType),
      row.agent?.name || "",
      row.region || "",
      paymentModeText(row.paymentMode),
      paymentReadinessLabel(row),
      paymentReadinessTip(row),
      summary.publishedProductCount || 0,
      summary.productCount || 0,
      summary.pendingReviewProductCount || 0,
      summary.enabledAccessCount || 0,
      summary.order30dCount || 0,
      money(summary.received30dAmount),
      summary.pendingRefundCount || 0,
      summary.failedRefundCount || 0,
      launchIssuesText(row),
      launchNextAction(row),
      merchantH5Url(row),
      merchantAdminUrl(row, "/mall-payments"),
      merchantAdminUrl(row, "/mall-products"),
      merchantAdminUrl(row, "/mall-orders"),
      merchantAdminUrl(row, "/mall-refunds"),
      merchantAdminUrl(row, "/mall-marketing"),
      merchantAdminUrl(row, "/mall-statistics"),
      row.contactName || "",
      row.contactPhone || ""
    ];
  });
  const csv = [headers, ...lines].map((line) => line.map(csvCell).join(",")).join("\r\n");
  downloadTextFile(`mall-merchant-launch-checklist-${dateStamp()}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
  ElMessage.success(`已导出 ${targetRows.length} 个店铺的上线清单`);
}

async function handleReadinessAction(row: Merchant) {
  const issues = operationReadinessIssues(row);
  const first = issues[0] || "";
  if (!first && Number(row.operationSummary?.pendingRefundCount || 0)) {
    router.push({ path: "/mall-refunds", query: { tenantId: row.tenant?.id, merchantId: row.id } });
    return;
  }
  if (!first) {
    openMerchantH5(row);
    return;
  }
  if (first.includes("停用") || first.includes("商城未开通")) {
    await openEdit(row);
    return;
  }
  if (first.includes("授权")) {
    await openAccess(row);
    return;
  }
  if (first.includes("商品待平台审核")) {
    router.push({ path: "/mall-product-audits", query: { tenantId: row.tenant?.id, merchantId: row.id } });
    return;
  }
  if (first.includes("商品")) {
    goProducts(row);
    return;
  }
  if (first.includes("支付状态")) {
    await loadPaymentReadiness();
    ElMessage.success("支付状态已刷新，请查看最新上线状态");
    return;
  }
  if (first.includes("支付") || first.includes("收款账户") || first.includes("联调")) {
    await openPayment(row);
    return;
  }
  if (first.includes("退款") || first.includes("售后")) {
    router.push({ path: "/mall-refunds", query: { tenantId: row.tenant?.id, merchantId: row.id } });
    return;
  }
  ElMessage.info(launchNextAction(row));
}

function adminLabel(admin: any) {
  const tenantName = admin.tenant?.name || accessMerchant.value?.tenant?.name || "平台账号";
  return `${admin.username} · ${tenantName}`;
}

function accessRoleText(value: string) {
  return ({ manager: "店长", operator: "运营", finance: "财务", logistics: "物流" } as any)[value] || value || "店长";
}

function formatTime(value: any) {
  return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "-";
}

async function loadTenants() {
  tenants.value = await api.get<any, Tenant[]>("/admin/tenants");
}

async function loadAgents() {
  agents.value = await api.get<any, Agent[]>("/admin/agents", { params: { includeDisabled: true, tenantId: form.tenantId || filters.tenantId || undefined } });
}

async function loadMerchants() {
  loading.value = true;
  try {
    rows.value = await api.get<any, Merchant[]>("/admin/mall/merchants", { params: { tenantId: filters.tenantId || undefined, status: filters.status || undefined, keyword: filters.keyword.trim() || undefined } });
    await loadPaymentReadiness();
  } catch (error: any) {
    ElMessage.error(error.message || "加载商城店铺失败");
  } finally {
    loading.value = false;
  }
}

async function loadPaymentReadiness() {
  if (!rows.value.length) {
    paymentReadiness.value = {};
    return;
  }
  readinessLoading.value = true;
  const next: Record<number, PaymentReadiness> = {};
  try {
    await mapWithConcurrency(rows.value, 8, async (row) => {
      try {
        next[row.id] = await api.get<any, PaymentReadiness>("/admin/mall/payment-readiness", { params: { merchantId: row.id } });
      } catch (error: any) {
        next[row.id] = { status: "not_ready", statusText: "读取失败", collectionMode: row.paymentMode, issues: [error.message || "支付状态读取失败，请确认当前账号有商城财务/支付配置权限"] };
      }
    });
    paymentReadiness.value = next;
  } finally {
    readinessLoading.value = false;
  }
}

async function mapWithConcurrency<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item) await worker(item);
    }
  });
  await Promise.all(runners);
}

async function reload() {
  await Promise.all([loadAgents(), loadMerchants()]);
}

async function loadAdminsForMerchant(row: Merchant) {
  const result = await api.get<any, any>("/admin/admins", { params: { tenantId: row.tenant?.id, includeSmoke: "false", page: 1, pageSize: 200 } });
  adminRows.value = result.items || [];
}

async function loadAccessRows() {
  if (!accessMerchant.value) return;
  accessLoading.value = true;
  try {
    accessRows.value = await api.get<any, any[]>("/admin/mall/merchant-access", { params: { merchantId: accessMerchant.value.id } });
  } catch (error: any) {
    ElMessage.error(error.message || "加载店铺授权失败");
  } finally {
    accessLoading.value = false;
  }
}

function resetForm() {
  Object.assign(form, {
    id: 0,
    tenantId: filters.tenantId,
    agentId: undefined,
    ownerType: "tenant",
    code: "",
    name: "",
    status: "disabled",
    mallEnabled: false,
    productAuditRequired: true,
    paymentMode: "platform_collect",
    region: "",
    contactName: "",
    contactPhone: "",
    logoUrl: "",
    notice: "",
    remark: ""
  });
}

function formExistingMerchant() {
  return form.id ? rows.value.find((row) => row.id === form.id) : null;
}

function merchantOpenRiskIssues() {
  if (form.status !== "active" || !form.mallEnabled) return [];
  const existing = formExistingMerchant();
  const summary = existing?.operationSummary || {};
  const readiness = existing ? paymentReadinessOf(existing) : null;
  const issues: string[] = [];
  if (!Number(summary.enabledAccessCount || 0)) issues.push("未授权后台账号，商家/代理还不能自主管理商品和订单");
  if (!Number(summary.publishedProductCount || 0)) issues.push(Number(summary.pendingReviewProductCount || 0) ? "存在待审核商品，前台暂不会公开展示" : "暂无已上架商品，前台店铺会显得空");
  if (!readiness) issues.push("支付状态未检测，不能确认真实收款是否可用");
  else if (readiness.status !== "real_ready") issues.push(readiness.issues?.find(Boolean) || readiness.nextAction || "真实支付未完成上线联调");
  if (form.paymentMode === "merchant_direct" && existing?.paymentMode !== "merchant_direct") issues.push("刚切换商户直收，需先保存收款模式并完成直收支付联调");
  if (form.paymentMode === "merchant_direct" && !Number(summary.enabledPaymentAccountCount || 0)) issues.push("商户直收未绑定启用收款账户");
  return issues;
}

async function confirmMerchantOpenRisk() {
  const issues = merchantOpenRiskIssues();
  if (!issues.length) return true;
  if (form.paymentMode === "merchant_direct" && issues.some((issue) => issue.includes("商户直收未绑定启用收款账户") || issue.includes("刚切换商户直收"))) {
    ElMessage.error("商户直收店铺必须先保存收款模式、配置并启用收款账户、刷新直收支付联调状态后，再开通商城。");
    return false;
  }
  await ElMessageBox.confirm(
    `当前店铺还存在：${issues.join("；")}。如果现在保存为开放状态，前台可能出现空店铺、无法支付或运营账号无法处理订单。确认仍然保存吗？`,
    "确认开放未完全就绪的店铺",
    { type: "warning", confirmButtonText: "仍然保存", cancelButtonText: "返回检查" }
  );
  return true;
}

function resetAccessForm() {
  Object.assign(accessForm, { id: 0, adminId: undefined, accessRole: "manager", enabled: true });
}

function resetPaymentForm() {
  Object.assign(paymentForm, { id: 0, provider: "wechat", merchantName: "", merchantNo: "", enabled: true, configText: paymentConfigTemplate("wechat") });
}

function resetPaymentTemplate() {
  paymentForm.configText = paymentConfigTemplate(paymentForm.provider);
}

async function openCreate() {
  resetForm();
  await loadAgents();
  dialogVisible.value = true;
}

async function openEdit(row: Merchant) {
  Object.assign(form, {
    id: row.id,
    tenantId: row.tenant?.id,
    agentId: row.agent?.id,
    ownerType: row.ownerType,
    code: row.code || "",
    name: row.name || "",
    status: row.status || "active",
    mallEnabled: row.mallEnabled !== false,
    productAuditRequired: row.productAuditRequired !== false,
    paymentMode: row.paymentMode || "platform_collect",
    region: row.region || "",
    contactName: row.contactName || "",
    contactPhone: row.contactPhone || "",
    logoUrl: row.logoUrl || "",
    notice: row.notice || "",
    remark: row.remark || ""
  });
  await loadAgents();
  dialogVisible.value = true;
}

async function openAccess(row: Merchant) {
  accessMerchant.value = row;
  resetAccessForm();
  accessDialogVisible.value = true;
  await Promise.all([loadAdminsForMerchant(row), loadAccessRows()]);
}

async function openPayment(row: Merchant) {
  paymentMerchant.value = row;
  resetPaymentForm();
  paymentDialogVisible.value = true;
  await loadPaymentAccounts();
}

async function saveMerchant() {
  if (!form.tenantId) return ElMessage.warning("请选择所属商家");
  if (form.ownerType === "agent" && !form.agentId) return ElMessage.warning("请选择代理");
  if (!form.name.trim()) return ElMessage.warning("请填写店铺名称");
  try {
    const riskConfirmed = await confirmMerchantOpenRisk();
    if (!riskConfirmed) return;
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(error.message || "开放风险确认失败，请稍后重试。");
    return;
  }
  saving.value = true;
  try {
    const payload = { ...form, code: form.code.trim() || undefined, agentId: form.ownerType === "agent" ? form.agentId : null };
    if (form.id) await api.patch(`/admin/mall/merchants/${form.id}`, payload);
    else await api.post("/admin/mall/merchants", payload);
    ElMessage.success("商城店铺已保存");
    dialogVisible.value = false;
    await loadMerchants();
  } catch (error: any) {
    ElMessage.error(error.message || "保存商城店铺失败");
  } finally {
    saving.value = false;
  }
}

function editAccess(row: any) {
  Object.assign(accessForm, {
    id: row.id,
    adminId: row.admin?.id,
    accessRole: row.accessRole || "manager",
    enabled: row.enabled !== false
  });
}

async function saveAccess() {
  if (!accessMerchant.value) return;
  if (!accessForm.adminId) return ElMessage.warning("请选择要授权的后台账号");
  accessSaving.value = true;
  try {
    const payload = { adminId: accessForm.adminId, merchantId: accessMerchant.value.id, accessRole: accessForm.accessRole, enabled: accessForm.enabled };
    if (accessForm.id) await api.patch(`/admin/mall/merchant-access/${accessForm.id}`, payload);
    else await api.post("/admin/mall/merchant-access", payload);
    ElMessage.success("店铺授权已保存");
    resetAccessForm();
    await loadAccessRows();
  } catch (error: any) {
    ElMessage.error(error.message || "保存店铺授权失败");
  } finally {
    accessSaving.value = false;
  }
}

async function toggleAccess(row: any) {
  try {
    await api.patch(`/admin/mall/merchant-access/${row.id}`, { adminId: row.admin?.id, merchantId: row.merchant?.id || accessMerchant.value?.id, accessRole: row.accessRole || "manager", enabled: !row.enabled });
    ElMessage.success(row.enabled ? "店铺授权已停用" : "店铺授权已启用");
    await loadAccessRows();
  } catch (error: any) {
    ElMessage.error(error.message || "操作店铺授权失败");
  }
}

async function loadPaymentAccounts() {
  if (!paymentMerchant.value) return;
  paymentLoading.value = true;
  try {
    paymentRows.value = await api.get<any, MerchantPaymentAccount[]>("/admin/mall/merchant-payment-accounts", { params: { merchantId: paymentMerchant.value.id } });
  } catch (error: any) {
    ElMessage.error(error.message || "加载店铺收款账户失败");
  } finally {
    paymentLoading.value = false;
  }
}

function editPaymentAccount(row: MerchantPaymentAccount) {
  Object.assign(paymentForm, {
    id: row.id,
    provider: row.provider,
    merchantName: row.merchantName || "",
    merchantNo: row.merchantNo || "",
    enabled: row.enabled !== false,
    configText: JSON.stringify(row.config && Object.keys(row.config).length ? row.config : JSON.parse(paymentConfigTemplate(row.provider)), null, 2)
  });
}

async function savePaymentAccount() {
  if (!paymentMerchant.value) return;
  const parsed = parsePaymentConfig();
  if (!parsed.ok) return ElMessage.warning(parsed.error);
  paymentSaving.value = true;
  try {
    const payload = {
      merchantId: paymentMerchant.value.id,
      provider: paymentForm.provider,
      merchantName: paymentForm.merchantName.trim() || undefined,
      merchantNo: paymentForm.merchantNo.trim() || undefined,
      enabled: paymentForm.enabled,
      config: parsed.value
    };
    if (paymentForm.id) await api.patch(`/admin/mall/merchant-payment-accounts/${paymentForm.id}`, payload);
    else await api.post("/admin/mall/merchant-payment-accounts", payload);
    ElMessage.success("店铺收款账户已保存");
    resetPaymentForm();
    await Promise.all([loadPaymentAccounts(), loadPaymentReadiness()]);
  } catch (error: any) {
    ElMessage.error(error.message || "保存店铺收款账户失败");
  } finally {
    paymentSaving.value = false;
  }
}

function goProducts(row: Merchant) {
  router.push({ path: "/mall-products", query: { tenantId: row.tenant?.id, merchantId: row.id } });
}

function merchantAdminUrl(row: Merchant, path: string) {
  const query = new URLSearchParams();
  if (row.tenant?.id) query.set("tenantId", String(row.tenant.id));
  query.set("merchantId", String(row.id));
  return `${window.location.origin}/admin${path}?${query.toString()}`;
}

function merchantH5Url(row: Merchant) {
  return h5RoutePreviewUrl(row.tenant?.code || "", `/pages/mall/merchant?id=${row.id}`);
}

function openMerchantH5(row: Merchant) {
  window.open(merchantH5Url(row), "_blank", "noopener,noreferrer");
}

async function copyMerchantH5(row: Merchant) {
  await copyToClipboard(merchantH5Url(row));
  ElMessage.success("店铺 H5 链接已复制，可发给用户或商家运营。");
}

async function copyMerchantWorkbench(row: Merchant) {
  await copyToClipboard(merchantAdminUrl(row, "/mall-payments"));
  ElMessage.success("店铺后台工作台链接已复制，请确认对方账号已完成店铺授权。");
}

onMounted(async () => {
  await loadTenants();
  await reload();
});
</script>

<style scoped>
.mall-merchant-page { display: grid; gap: 18px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.page-header h2 { margin: 0 0 8px; }
.page-header p { margin: 0; color: #64748b; }
.header-actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 10px; }
.scope-hint { margin-top: -4px; }
.merchant-open-risk-alert { margin-bottom: 14px; }
.launch-summary { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; }
.launch-summary button { text-align: left; border: 1px solid #e5e7eb; background: #fff; border-radius: 14px; padding: 12px 14px; cursor: pointer; transition: .18s ease; }
.launch-summary button.active { border-color: #c2410c; background: #fff7ed; box-shadow: 0 8px 22px rgba(194, 65, 12, .12); }
.launch-summary small { display: block; color: #64748b; }
.launch-summary strong { display: block; margin-top: 4px; color: #0f172a; font-size: 22px; }
.merchant-cell { display: flex; align-items: center; gap: 12px; }
.merchant-cell img, .logo-placeholder { width: 44px; height: 44px; border-radius: 12px; object-fit: cover; flex: 0 0 auto; }
.logo-placeholder { display: grid; place-items: center; background: #fff7ed; color: #c2410c; font-weight: 800; }
.merchant-cell strong { display: block; }
.merchant-cell small { display: block; margin-top: 4px; color: #64748b; }
.payment-cell { display: grid; gap: 4px; align-items: start; }
.payment-cell small { color: #64748b; font-size: 12px; line-height: 1.35; }
.operation-cell { display: grid; gap: 4px; align-items: start; }
.operation-cell small { color: #475569; font-size: 12px; line-height: 1.35; }
.operation-action { justify-self: start; padding-left: 0; }
.metric-cell { display: grid; gap: 3px; color: #64748b; font-size: 12px; line-height: 1.35; }
.h5-entry-cell { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.payment-layout { display: grid; grid-template-columns: minmax(360px, 1fr) 360px; gap: 18px; align-items: start; margin-top: 14px; }
.payment-form { padding: 14px; border: 1px solid #e5e7eb; border-radius: 12px; background: #f8fafc; }
.payment-form :deep(.el-form-item:last-child) { margin-bottom: 0; }
.payment-readiness-alert { margin-bottom: 16px; }
.payment-actions { display: flex; justify-content: flex-end; gap: 10px; }
.form-hint { margin-left: 10px; color: #64748b; font-size: 12px; }
.access-form { display: grid; grid-template-columns: minmax(220px, 1fr) 140px 120px auto auto; gap: 10px; align-items: center; margin: 14px 0; }
@media (max-width: 900px) { .access-form, .payment-layout, .launch-summary { grid-template-columns: 1fr; } }
</style>
