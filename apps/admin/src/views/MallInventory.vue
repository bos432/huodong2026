<template>
  <div class="mall-inventory-page">
    <div class="page-header">
      <div>
        <h2>商城库存管理</h2>
        <p>集中查看低库存、SKU 总库存、锁定库存和库存流水；手动调整库存必须写明原因，避免正式运营时账实不清。</p>
      </div>
      <div class="header-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家/代理" style="width:220px" :disabled="scopedMutationPending" @change="handleTenantChange">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-select v-model="filters.merchantId" clearable filterable placeholder="全部授权店铺；可选单店" style="width:280px" :disabled="scopedMutationPending" @change="handleMerchantChange">
          <el-option v-for="merchant in merchants" :key="merchant.id" :label="merchantLabel(merchant)" :value="merchant.id" />
        </el-select>
        <el-select v-model="filters.status" clearable placeholder="商品状态" style="width:130px" :disabled="scopedMutationPending" @change="loadInventoryData">
          <el-option label="已上架" value="published" />
          <el-option label="待审核" value="pending_review" />
          <el-option label="草稿" value="draft" />
          <el-option label="已下架" value="offline" />
        </el-select>
        <el-input v-model="filters.keyword" clearable placeholder="商品/品牌/规格/订单号" style="width:260px" :disabled="scopedMutationPending" @keyup.enter="loadInventoryData" @clear="loadInventoryData" />
        <el-button type="primary" :loading="anomalyScanning" :disabled="anomalyScanning || anomalyActionId !== null || stockAdjusting" @click="scanInventoryAnomalies">一致性扫描</el-button>
        <el-button :loading="loadingAny" @click="loadInventoryData">刷新库存</el-button>
      </div>
    </div>

    <el-alert
      v-if="deepLinkWarning"
      class="scope-alert"
      type="error"
      show-icon
      :closable="false"
      title="商城库存店铺链接不可用"
      :description="deepLinkWarning"
    />
    <el-alert v-else-if="merchantError" class="scope-alert" type="error" show-icon :closable="false" title="库存管理范围加载失败" :description="merchantError">
      <template #default><el-button size="small" :loading="merchantLoading" @click="reloadScope">重新加载</el-button></template>
    </el-alert>
    <el-alert
      v-else-if="!selectedMerchant && isPlatformAdmin()"
      class="scope-alert"
      type="info"
      show-icon
      :closable="false"
      title="当前是全局库存监管模式"
      description="平台账号可以不选店铺查看全平台或所选商家下全部库存风险；执行手动调整时仍会按具体 SKU 所属店铺校验权限和店铺状态。"
    />
    <el-alert
      v-else-if="!selectedMerchant && merchants.length > 1"
      class="scope-alert"
      type="warning"
      show-icon
      :closable="false"
      title="请选择要管理库存的店铺"
      description="当前账号可管理多个商城店铺。为避免把不同店铺的库存调整混在一起，请先选择一个店铺。"
    />

    <el-card v-if="selectedMerchant && !deepLinkWarning" shadow="never" class="merchant-card">
      <div>
        <strong>当前库存店铺：{{ selectedMerchant.name || selectedMerchant.code }}</strong>
        <p>{{ selectedMerchant.tenant?.name || selectedMerchant.tenant?.code || "平台店铺" }} · {{ merchantOwnerText(selectedMerchant) }} · {{ selectedMerchant.region || "未设置区域" }}</p>
      </div>
      <div class="merchant-tags">
        <el-tag :type="selectedMerchantOpen ? 'success' : 'info'">{{ selectedMerchantOpen ? "商城已开放" : "商城未开放" }}</el-tag>
        <el-tag type="warning" effect="plain">{{ selectedMerchant.paymentMode === "merchant_direct" ? "商户直收" : "平台代收" }}</el-tag>
      </div>
      <div class="merchant-actions">
        <el-button size="small" type="primary" plain @click="goMerchantAdmin('/mall-products')">商品管理</el-button>
        <el-button v-if="canViewStatistics" size="small" type="success" plain @click="goMerchantAdmin('/mall-statistics')">经营统计</el-button>
        <el-button v-if="canViewOrders" size="small" type="warning" plain @click="goMerchantAdmin('/mall-orders')">订单管理</el-button>
        <el-button size="small" @click="openMerchantH5">打开 H5 店铺</el-button>
        <el-button size="small" @click="copyWorkbenchLink">复制库存后台链接</el-button>
      </div>
    </el-card>
    <el-alert
      v-if="selectedMerchant && !deepLinkWarning && !selectedMerchantOpen"
      class="scope-alert"
      type="warning"
      show-icon
      :closable="false"
      title="当前店铺未开放商城"
      :description="merchantDisabledReason(selectedMerchant)"
    />

    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <span>低库存阈值</span>
        <el-input-number v-model="filters.lowStockThreshold" :min="0" :precision="0" @change="loadInventoryData" />
        <el-input v-model="filters.logKeyword" clearable placeholder="库存流水关键词/订单号" style="width:260px" @keyup.enter="loadInventoryLogs" @clear="loadInventoryLogs" />
        <el-button @click="loadLowStock">刷新低库存</el-button>
        <el-button @click="loadInventoryLogs">刷新流水</el-button>
      </div>
      <el-alert
        class="inventory-tip"
        type="info"
        :closable="false"
        show-icon
        title="库存口径：总库存是后台可维护库存，锁定库存来自待支付/待确认订单，可售库存 = 总库存 - 锁定库存；目标库存不能小于当前锁定库存。"
      />
    </el-card>

    <div class="summary-grid">
      <el-card v-for="item in summaryCards" :key="item.label" shadow="never">
        <small>{{ item.label }}</small>
        <strong>{{ item.value }}</strong>
        <span>{{ item.desc }}</span>
      </el-card>
    </div>

    <el-card shadow="never" class="inventory-card">
      <template #header>
        <div class="section-header">
          <span>库存一致性异常</span>
          <small>核对 SKU、待支付订单锁定量及秒杀/拼团活动库存；修复操作保留已承诺订单并记录流水</small>
        </div>
      </template>
      <div class="filter-row anomaly-toolbar">
        <el-select v-model="anomalyStatus" style="width:130px" @change="loadInventoryAnomalies">
          <el-option label="待处理" value="open" />
          <el-option label="已修复" value="resolved" />
          <el-option label="已忽略" value="ignored" />
        </el-select>
        <el-input v-model="anomalyKeyword" clearable placeholder="异常、商品或规格" style="width:260px" @keyup.enter="loadInventoryAnomalies" @clear="loadInventoryAnomalies" />
        <el-button @click="loadInventoryAnomalies">刷新异常</el-button>
      </div>
      <el-alert v-if="anomaliesError" class="section-error" type="error" show-icon :closable="false" :title="anomaliesError"><template #default><el-button size="small" @click="loadInventoryAnomalies">重试异常列表</el-button></template></el-alert>
      <el-table v-loading="anomalyLoading" :data="inventoryAnomalies" size="small" border empty-text="当前范围暂无库存异常">
        <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.status === 'open' ? 'danger' : row.status === 'resolved' ? 'success' : 'info'">{{ anomalyStatusText(row.status) }}</el-tag></template></el-table-column>
        <el-table-column label="异常" min-width="240"><template #default="{ row }"><strong>{{ row.title }}</strong><small>{{ row.message }}</small></template></el-table-column>
        <el-table-column label="商品/规格" min-width="190"><template #default="{ row }">{{ row.sku?.product?.title || row.sourceType }}<small>{{ row.sku?.name || `#${row.sourceId}` }}</small></template></el-table-column>
        <el-table-column label="当前值" min-width="170"><template #default="{ row }"><code>{{ compactState(row.actualState) }}</code></template></el-table-column>
        <el-table-column label="建议值" min-width="170"><template #default="{ row }"><code>{{ compactState(row.expectedState) }}</code></template></el-table-column>
        <el-table-column label="最近发现" width="170"><template #default="{ row }">{{ formatTime(row.lastDetectedAt) }}<small>累计 {{ row.occurrenceCount || 1 }} 次</small></template></el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'open'" size="small" type="primary" :loading="anomalyActionId === row.id" :disabled="anomalyActionId !== null || anomalyScanning" @click="resolveInventoryAnomaly(row, 'repair')">修复</el-button>
            <el-button v-if="row.status === 'open'" size="small" :disabled="anomalyActionId !== null || anomalyScanning" @click="resolveInventoryAnomaly(row, 'ignore')">忽略</el-button>
            <span v-else>{{ row.resolutionRemark || "-" }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never" class="inventory-card">
      <template #header>
        <div class="section-header">
          <span>低库存预警</span>
          <small>只统计已上架商品的启用规格，按可售库存从低到高排列</small>
        </div>
      </template>
      <el-alert v-if="lowStockError" class="section-error" type="error" show-icon :closable="false" :title="lowStockError"><template #default><el-button size="small" @click="loadLowStock">重试低库存</el-button></template></el-alert>
      <el-table v-loading="lowStockLoading" :data="lowStockItems" size="small" border empty-text="暂无低库存规格">
        <el-table-column label="商品/规格" min-width="260">
          <template #default="{ row }">
            <strong>{{ row.product?.title || "-" }}</strong>
            <small>{{ row.name || "-" }} · {{ row.product?.category?.name || "未分类" }}</small>
          </template>
        </el-table-column>
        <el-table-column v-if="isPlatformAdmin()" label="商家/店铺" min-width="180">
          <template #default="{ row }">
            {{ row.tenant?.name || row.tenant?.code || "-" }}
            <small>{{ row.merchant?.name || row.product?.merchant?.name || "默认店铺" }}</small>
          </template>
        </el-table-column>
        <el-table-column label="总库存" width="90"><template #default="{ row }">{{ row.stock || 0 }}</template></el-table-column>
        <el-table-column label="锁定" width="90"><template #default="{ row }">{{ row.lockedStock || 0 }}</template></el-table-column>
        <el-table-column label="可售" width="90"><template #default="{ row }"><el-tag :type="Number(row.availableStock || 0) === 0 ? 'danger' : 'warning'">{{ row.availableStock || 0 }}</el-tag></template></el-table-column>
        <el-table-column label="建议" min-width="170"><template #default="{ row }">{{ Number(row.availableStock || 0) === 0 ? "立即补货或下架" : "关注销售速度，准备补货" }}</template></el-table-column>
        <el-table-column label="操作" width="120"><template #default="{ row }"><el-button size="small" type="warning" plain :disabled="!rowMerchantOperational(row) || stockAdjusting || anomalyScanning || anomalyActionId !== null" @click="openLowStockAdjust(row)">调整库存</el-button></template></el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never" class="inventory-card">
      <template #header>
        <div class="section-header">
          <span>商品 SKU 库存</span>
          <small>共 {{ products.length }} 个商品，{{ skuRows.length }} 个规格</small>
        </div>
      </template>
      <el-alert v-if="productsError" class="section-error" type="error" show-icon :closable="false" :title="productsError"><template #default><el-button size="small" @click="loadProducts">重试商品库存</el-button></template></el-alert>
      <el-table v-loading="loading" :data="products" stripe empty-text="暂无商品库存">
        <el-table-column label="商品" min-width="260">
          <template #default="{ row }">
            <div class="product-cell">
              <img v-if="row.coverUrl" :src="row.coverUrl" alt="" />
              <div v-else class="cover-placeholder">商</div>
              <div>
                <strong>{{ row.title }}</strong>
                <small>{{ row.brandName || "未设品牌" }} · {{ row.category?.name || "未分类" }} · {{ statusText(row.status) }}</small>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column v-if="isPlatformAdmin()" label="商家/店铺" min-width="170">
          <template #default="{ row }">
            {{ row.tenant?.name || row.tenant?.code || "-" }}
            <small>{{ row.merchant?.name || "默认店铺" }}</small>
          </template>
        </el-table-column>
        <el-table-column label="规格库存" min-width="340">
          <template #default="{ row }">
            <div v-if="row.skus?.length" class="sku-list">
              <div v-for="sku in row.skus" :key="sku.id" class="sku-line">
                <span>{{ sku.name || "默认规格" }}：总 {{ sku.stock || 0 }} / 锁 {{ sku.lockedStock || 0 }} / 可售 {{ availableStock(sku) }} / {{ sku.enabled ? "启用" : "停用" }}</span>
                <el-button size="small" text type="warning" :disabled="!rowMerchantOperational(row) || stockAdjusting || anomalyScanning || anomalyActionId !== null" @click.stop="openProductStockAdjust(row, sku)">调整</el-button>
              </div>
            </div>
            <span v-else class="muted-line">暂无规格</span>
          </template>
        </el-table-column>
        <el-table-column label="销售" width="120"><template #default="{ row }">{{ row.salesStats?.salesCount || 0 }} 件</template></el-table-column>
        <el-table-column label="操作" width="170">
          <template #default="{ row }">
            <el-button size="small" @click.stop="openProductInventoryLogs(row)">流水</el-button>
            <el-button size="small" type="primary" plain @click.stop="openProductManage(row)">商品</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pager-row">
        <el-pagination v-model:current-page="filters.page" :page-size="filters.pageSize" layout="prev, pager, next, total" :total="total" @current-change="loadProducts" />
      </div>
    </el-card>

    <el-card shadow="never" class="inventory-card">
      <template #header>
        <div class="section-header">
          <span>库存流水</span>
          <small>展示锁定、释放、扣减、回补和人工调整，便于运营追踪库存变化</small>
        </div>
      </template>
      <el-alert v-if="logsError" class="section-error" type="error" show-icon :closable="false" :title="logsError"><template #default><el-button size="small" @click="loadInventoryLogs">重试库存流水</el-button></template></el-alert>
      <el-table v-loading="logLoading" :data="inventoryLogs" size="small" stripe empty-text="暂无库存流水">
        <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        <el-table-column label="类型" width="90"><template #default="{ row }"><el-tag :type="inventoryTypeTag(row.type)">{{ inventoryTypeText(row.type) }}</el-tag></template></el-table-column>
        <el-table-column label="商品/规格" min-width="230"><template #default="{ row }">{{ row.sku?.product?.title || "-" }} / {{ row.sku?.name || "-" }}</template></el-table-column>
        <el-table-column label="订单号" width="180"><template #default="{ row }">{{ row.order?.orderNo || "-" }}</template></el-table-column>
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column label="库存变化" width="140"><template #default="{ row }">{{ row.stockBefore }} -> {{ row.stockAfter }}</template></el-table-column>
        <el-table-column label="锁定变化" width="140"><template #default="{ row }">{{ row.lockedBefore }} -> {{ row.lockedAfter }}</template></el-table-column>
        <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
      </el-table>
    </el-card>

    <el-dialog v-model="stockDialogVisible" title="调整 SKU 库存" width="540px" @closed="closeStockDialog">
      <el-form label-width="96px">
        <el-form-item label="商品">
          <strong>{{ stockForm.productTitle || "-" }}</strong>
        </el-form-item>
        <el-form-item label="规格" required>
          <el-select v-model="stockForm.skuId" placeholder="请选择规格" @change="handleAdjustSkuChange">
            <el-option v-for="sku in stockSkus" :key="sku.id" :label="`${sku.name || '默认规格'}（库存 ${sku.stock || 0}，锁定 ${sku.lockedStock || 0}）`" :value="sku.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="当前状态">
          <span>总库存 {{ selectedAdjustSku()?.stock || 0 }}，锁定 {{ selectedAdjustSku()?.lockedStock || 0 }}，可售 {{ availableStock(selectedAdjustSku()) }}</span>
        </el-form-item>
        <el-form-item label="目标库存" required>
          <el-input-number v-model="stockForm.stock" :min="Number(selectedAdjustSku()?.lockedStock || 0)" :precision="0" />
        </el-form-item>
        <el-form-item label="调整原因" required>
          <el-input v-model="stockForm.remark" type="textarea" :rows="3" placeholder="例如：盘点补库存、损耗扣减、录入错误修正" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="stockAdjusting" @click="stockDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="stockAdjusting" :disabled="Boolean(stockMerchant && !merchantOperational(stockMerchant)) || anomalyScanning || anomalyActionId !== null" @click="submitStockAdjust">确认调整</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { api } from "../api";
import { copyToClipboard, h5RoutePreviewUrl } from "../h5-preview";
import { hasPermission, isPlatformAdmin } from "../permissions";

type Merchant = {
  id: number;
  code?: string;
  name?: string;
  ownerType?: string;
  status?: string;
  mallEnabled?: boolean;
  paymentMode?: string;
  region?: string | null;
  tenant?: { id?: number; name?: string; code?: string } | null;
};

const route = useRoute();
const router = useRouter();
const tenants = ref<any[]>([]);
const merchants = ref<Merchant[]>([]);
const products = ref<any[]>([]);
const lowStockItems = ref<any[]>([]);
const inventoryLogs = ref<any[]>([]);
const inventoryAnomalies = ref<any[]>([]);
const anomalyOpenCount = ref(0);
const anomalyStatus = ref("open");
const anomalyKeyword = ref("");
const anomalyLoading = ref(false);
const anomalyScanning = ref(false);
const anomalyActionId = ref<number | null>(null);
const total = ref(0);
const loading = ref(false);
const lowStockLoading = ref(false);
const logLoading = ref(false);
const merchantLoading = ref(false);
const stockDialogVisible = ref(false);
const stockAdjusting = ref(false);
const stockSkus = ref<any[]>([]);
const stockMerchant = ref<Merchant | null>(null);
const stockTarget = ref<{ productId: number; tenantId: number; merchantId: number; skuIds: number[] } | null>(null);
const deepLinkWarning = ref("");
const merchantError = ref("");
const productsError = ref("");
const lowStockError = ref("");
const logsError = ref("");
const anomaliesError = ref("");
let tenantLoadSequence = 0;
let merchantLoadSequence = 0;
let productLoadSequence = 0;
let lowStockLoadSequence = 0;
let inventoryLogLoadSequence = 0;
let anomalyLoadSequence = 0;
const filters = reactive({
  tenantId: routeTenantId(),
  merchantId: routeMerchantId(),
  status: "published",
  keyword: routeKeyword(),
  logKeyword: "",
  lowStockThreshold: 10,
  page: 1,
  pageSize: 50
});
const stockForm = reactive({ productTitle: "", skuId: undefined as number | undefined, stock: 0, remark: "", businessKey: "" });

const selectedMerchant = computed(() => merchants.value.find((merchant) => merchant.id === filters.merchantId));
const canViewOrders = computed(() => hasPermission("mall.order.view"));
const canViewStatistics = computed(() => hasPermission("mall.statistics.view"));
const selectedMerchantOpen = computed(() => merchantOperational(selectedMerchant.value));
const loadingAny = computed(() => loading.value || lowStockLoading.value || logLoading.value || anomalyLoading.value || merchantLoading.value);
const scopedMutationPending = computed(() => stockAdjusting.value || anomalyScanning.value || anomalyActionId.value !== null);
const skuRows = computed(() => products.value.flatMap((product) => (product.skus || []).map((sku: any) => ({ ...sku, product, tenant: product.tenant, merchant: product.merchant }))));
const summaryCards = computed(() => {
  const totalStock = skuRows.value.reduce((sum, sku) => sum + Number(sku.stock || 0), 0);
  const lockedStock = skuRows.value.reduce((sum, sku) => sum + Number(sku.lockedStock || 0), 0);
  const zeroStock = lowStockItems.value.filter((item) => Number(item.availableStock || 0) === 0).length;
  return [
    { label: "规格数", value: skuRows.value.length, desc: "当前商品列表" },
    { label: "总库存", value: totalStock, desc: "后台维护库存" },
    { label: "锁定库存", value: lockedStock, desc: "待支付/待确认订单占用" },
    { label: "可售库存", value: Math.max(totalStock - lockedStock, 0), desc: "总库存减锁定" },
    { label: "低库存", value: lowStockItems.value.length, desc: `阈值 ${filters.lowStockThreshold}` },
    { label: "售罄规格", value: zeroStock, desc: "需要补货或下架" },
    { label: "库存异常", value: anomalyOpenCount.value, desc: "待扫描处理" },
    { label: "近期流水", value: inventoryLogs.value.length, desc: "最近最多 200 条" }
  ];
});

function routeTenantId() {
  const id = typeof route.query.tenantId === "string" ? Number(route.query.tenantId) : 0;
  return isPlatformAdmin() && id ? id : undefined;
}

function routeMerchantId() {
  const id = typeof route.query.merchantId === "string" ? Number(route.query.merchantId) : 0;
  return id || undefined;
}

function routeKeyword() {
  return typeof route.query.keyword === "string" ? route.query.keyword : "";
}

function tenantLabel(tenant: any) {
  return `${tenant.name || tenant.code}（${tenant.code}）`;
}

function merchantOwnerText(merchant?: Merchant) {
  return merchant?.ownerType === "agent" ? "代理店铺" : "商家店铺";
}

function merchantLabel(merchant: Merchant) {
  const status = merchant.mallEnabled === false || merchant.status !== "active" ? " · 未开放" : "";
  return `${merchant.name || merchant.code}（${merchantOwnerText(merchant)}${merchant.region ? ` · ${merchant.region}` : ""}${status}）`;
}

function merchantOperational(merchant?: Merchant | null) {
  return !!merchant && merchant.status === "active" && merchant.mallEnabled !== false;
}

function merchantDisabledReason(merchant?: Merchant | null) {
  if (!merchant) return "请先选择要管理库存的店铺。平台可在「商城店铺」为商家/代理开店并授权账号。";
  if (merchant.status !== "active") return "当前店铺已被平台停用，不能手动调整库存；历史库存流水仍可查看。";
  if (merchant.mallEnabled === false) return "当前店铺未开放商城，不能手动调整库存；请联系平台管理员在「商城店铺」开通商城后再操作。";
  return "";
}

function rowMerchant(row: any) {
  const scopedMerchant = row?.merchant || row?.product?.merchant;
  return scopedMerchant?.status || scopedMerchant?.mallEnabled !== undefined ? scopedMerchant : selectedMerchant.value;
}

function rowMerchantOperational(row: any) {
  return merchantOperational(rowMerchant(row));
}

function merchantLinkWarning(requestedMerchantId: number) {
  return `当前链接指定的店铺 #${requestedMerchantId} 对当前账号不可见，或已被商家筛选条件过滤。为避免误调整库存，系统不会自动切换到其它店铺；请联系平台管理员确认店铺授权，或清空筛选后重试。`;
}

function currentMallParams(extra: Record<string, any> = {}) {
  return {
    tenantId: isPlatformAdmin() ? filters.tenantId || selectedMerchant.value?.tenant?.id : undefined,
    merchantId: filters.merchantId || undefined,
    ...extra
  };
}

function requestErrorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function listResponse(value: any) {
  return Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : null;
}

function currentInventoryScopeMatches(tenantId: number, merchantId: number) {
  const currentTenantId = Number(filters.tenantId || selectedMerchant.value?.tenant?.id || 0);
  const currentMerchantId = Number(filters.merchantId || 0);
  return currentTenantId === tenantId && currentMerchantId === merchantId;
}

async function syncRouteQuery() {
  const query: Record<string, string> = {};
  if (filters.tenantId) query.tenantId = String(filters.tenantId);
  if (filters.merchantId) query.merchantId = String(filters.merchantId);
  if (filters.keyword.trim()) query.keyword = filters.keyword.trim();
  await router.replace({ path: route.path, query });
}

function clearInventoryData() {
  products.value = [];
  lowStockItems.value = [];
  inventoryLogs.value = [];
  inventoryAnomalies.value = [];
  anomalyOpenCount.value = 0;
  total.value = 0;
}

function closeStockDialog() {
  stockTarget.value = null;
  stockMerchant.value = null;
  stockSkus.value = [];
}

function invalidateInventoryScope() {
  merchantLoadSequence += 1;
  productLoadSequence += 1;
  lowStockLoadSequence += 1;
  inventoryLogLoadSequence += 1;
  anomalyLoadSequence += 1;
  stockDialogVisible.value = false;
  closeStockDialog();
  clearInventoryData();
  productsError.value = "";
  lowStockError.value = "";
  logsError.value = "";
  anomaliesError.value = "";
  loading.value = false;
  lowStockLoading.value = false;
  logLoading.value = false;
  anomalyLoading.value = false;
}

async function loadTenants() {
  if (!isPlatformAdmin()) {
    tenants.value = [];
    return true;
  }
  const sequence = ++tenantLoadSequence;
  tenants.value = [];
  merchantError.value = "";
  try {
    const result = await api.get<any, any[]>("/admin/tenants");
    if (sequence !== tenantLoadSequence) return false;
    if (!Array.isArray(result)) throw new Error("商家选项响应格式无效");
    tenants.value = result;
    return true;
  } catch (error: unknown) {
    if (sequence !== tenantLoadSequence) return false;
    merchantError.value = requestErrorText(error, "加载商家列表失败");
    return false;
  }
}

async function loadMerchants() {
  const sequence = ++merchantLoadSequence;
  const tenantId = Number(filters.tenantId || 0);
  merchantLoading.value = true;
  merchantError.value = "";
  merchants.value = [];
  clearInventoryData();
  try {
    const result = await api.get<any, Merchant[]>("/admin/mall/accessible-merchants", { params: { tenantId: isPlatformAdmin() ? filters.tenantId : undefined, enabled: "true" } });
    if (sequence !== merchantLoadSequence || Number(filters.tenantId || 0) !== tenantId) return false;
    if (!Array.isArray(result)) throw new Error("可管理库存店铺响应格式无效");
    merchants.value = result;
    const requestedMerchantId = routeMerchantId();
    deepLinkWarning.value = "";
    if (requestedMerchantId && merchants.value.some((merchant) => merchant.id === requestedMerchantId)) filters.merchantId = requestedMerchantId;
    else if (requestedMerchantId) {
      filters.merchantId = undefined;
      deepLinkWarning.value = merchantLinkWarning(requestedMerchantId);
      clearInventoryData();
      return false;
    } else if (filters.merchantId && !merchants.value.some((merchant) => merchant.id === filters.merchantId)) filters.merchantId = undefined;
    if (!filters.merchantId && !isPlatformAdmin() && merchants.value.length === 1) filters.merchantId = merchants.value[0].id;
    return true;
  } catch (error: unknown) {
    if (sequence !== merchantLoadSequence || Number(filters.tenantId || 0) !== tenantId) return false;
    merchantError.value = requestErrorText(error, "加载可管理库存的店铺失败");
    return false;
  } finally {
    if (sequence === merchantLoadSequence) merchantLoading.value = false;
  }
}

async function loadInventoryData() {
  if (deepLinkWarning.value) return;
  if (!isPlatformAdmin() && !filters.merchantId) {
    clearInventoryData();
    return;
  }
  await Promise.all([loadProducts(), loadLowStock(), loadInventoryLogs(), loadInventoryAnomalies()]);
  await syncRouteQuery();
}

async function loadProducts() {
  if (deepLinkWarning.value) return;
  const sequence = ++productLoadSequence;
  const tenantId = Number(filters.tenantId || selectedMerchant.value?.tenant?.id || 0);
  const merchantId = Number(filters.merchantId || 0);
  loading.value = true;
  productsError.value = "";
  products.value = [];
  total.value = 0;
  try {
    const result = await api.get<any, any>("/admin/mall/products", {
      params: currentMallParams({
        status: filters.status || undefined,
        keyword: filters.keyword.trim() || undefined,
        page: filters.page,
        pageSize: filters.pageSize
      })
    });
    if (sequence !== productLoadSequence || !currentInventoryScopeMatches(tenantId, merchantId)) return;
    const items = listResponse(result);
    if (!items || typeof result !== "object") throw new Error("商品库存响应格式无效");
    products.value = items;
    total.value = Number(result.total || items.length);
  } catch (error: unknown) {
    if (sequence !== productLoadSequence || !currentInventoryScopeMatches(tenantId, merchantId)) return;
    productsError.value = requestErrorText(error, "加载商品库存失败");
  } finally {
    if (sequence === productLoadSequence) loading.value = false;
  }
}

async function loadLowStock() {
  if (deepLinkWarning.value) return;
  const sequence = ++lowStockLoadSequence;
  const tenantId = Number(filters.tenantId || selectedMerchant.value?.tenant?.id || 0);
  const merchantId = Number(filters.merchantId || 0);
  lowStockLoading.value = true;
  lowStockError.value = "";
  lowStockItems.value = [];
  try {
    const result = await api.get<any, any>("/admin/mall/products/low-stock", {
      params: currentMallParams({
        keyword: filters.keyword.trim() || undefined,
        lowStockThreshold: filters.lowStockThreshold,
        pageSize: 100
      })
    });
    if (sequence !== lowStockLoadSequence || !currentInventoryScopeMatches(tenantId, merchantId)) return;
    const items = listResponse(result);
    if (!items) throw new Error("低库存预警响应格式无效");
    lowStockItems.value = items;
  } catch (error: unknown) {
    if (sequence !== lowStockLoadSequence || !currentInventoryScopeMatches(tenantId, merchantId)) return;
    lowStockError.value = requestErrorText(error, "加载低库存预警失败");
  } finally {
    if (sequence === lowStockLoadSequence) lowStockLoading.value = false;
  }
}

async function loadInventoryLogs() {
  if (deepLinkWarning.value) return;
  const sequence = ++inventoryLogLoadSequence;
  const tenantId = Number(filters.tenantId || selectedMerchant.value?.tenant?.id || 0);
  const merchantId = Number(filters.merchantId || 0);
  logLoading.value = true;
  logsError.value = "";
  inventoryLogs.value = [];
  try {
    const result = await api.get<any, any>("/admin/mall/inventory-logs", {
      params: currentMallParams({
        keyword: filters.logKeyword.trim() || filters.keyword.trim() || undefined
      })
    });
    if (sequence !== inventoryLogLoadSequence || !currentInventoryScopeMatches(tenantId, merchantId)) return;
    const items = listResponse(result);
    if (!items) throw new Error("库存流水响应格式无效");
    inventoryLogs.value = items;
  } catch (error: unknown) {
    if (sequence !== inventoryLogLoadSequence || !currentInventoryScopeMatches(tenantId, merchantId)) return;
    logsError.value = requestErrorText(error, "加载库存流水失败");
  } finally {
    if (sequence === inventoryLogLoadSequence) logLoading.value = false;
  }
}

async function reloadScope() {
  if (merchantLoading.value) return;
  const tenantsReady = await loadTenants();
  if (!tenantsReady) return;
  const merchantsReady = await loadMerchants();
  if (merchantsReady) await loadInventoryData();
}

async function loadInventoryAnomalies() {
  if (deepLinkWarning.value) return;
  const sequence = ++anomalyLoadSequence;
  const tenantId = Number(filters.tenantId || selectedMerchant.value?.tenant?.id || 0);
  const merchantId = Number(filters.merchantId || 0);
  anomalyLoading.value = true;
  anomaliesError.value = "";
  inventoryAnomalies.value = [];
  anomalyOpenCount.value = 0;
  try {
    const result = await api.get<any, any>("/admin/mall/inventory-anomalies", { params: currentMallParams({ status: anomalyStatus.value, keyword: anomalyKeyword.value.trim() || undefined, pageSize: 100 }) });
    if (sequence !== anomalyLoadSequence || !currentInventoryScopeMatches(tenantId, merchantId)) return;
    const items = listResponse(result);
    if (!items || typeof result !== "object") throw new Error("库存一致性异常响应格式无效");
    inventoryAnomalies.value = items;
    anomalyOpenCount.value = Number(result.openCount || 0);
  } catch (error: unknown) {
    if (sequence !== anomalyLoadSequence || !currentInventoryScopeMatches(tenantId, merchantId)) return;
    anomaliesError.value = requestErrorText(error, "加载库存一致性异常失败");
  } finally {
    if (sequence === anomalyLoadSequence) anomalyLoading.value = false;
  }
}

async function scanInventoryAnomalies() {
  if (deepLinkWarning.value) return;
  if (anomalyScanning.value || anomalyActionId.value !== null || stockAdjusting.value) return;
  const tenantId = Number(filters.tenantId || selectedMerchant.value?.tenant?.id || 0);
  const merchantId = Number(filters.merchantId || 0);
  anomalyScanning.value = true;
  try {
    const result = await api.post<any, any>("/admin/mall/inventory-anomalies/scan", currentMallParams());
    if (!currentInventoryScopeMatches(tenantId, merchantId)) return;
    ElMessage.success(`扫描完成：检查 ${result.scannedSkuCount || 0} 个规格，发现 ${result.issueCount || 0} 项异常`);
    await loadInventoryAnomalies();
  } catch (error: any) {
    ElMessage.error(error.message || "库存一致性扫描失败");
  } finally {
    anomalyScanning.value = false;
  }
}

async function resolveInventoryAnomaly(row: any, action: "repair" | "ignore") {
  if (anomalyActionId.value !== null || anomalyScanning.value) return;
  const anomalyId = Number(row.id);
  const contextSequence = anomalyLoadSequence;
  anomalyActionId.value = anomalyId;
  try {
    const defaultRemark = action === "repair" ? "按待履约订单锁定量和库存约束修复" : "人工复核后忽略本次异常";
    const result = await ElMessageBox.prompt(`确认处理「${row.title}」？`, action === "repair" ? "修复库存异常" : "忽略库存异常", { confirmButtonText: action === "repair" ? "确认修复" : "确认忽略", cancelButtonText: "取消", type: action === "repair" ? "warning" : "info", inputType: "textarea", inputValue: defaultRemark, inputValidator: (value) => String(value || "").trim() ? true : "处理说明不能为空" });
    if (contextSequence !== anomalyLoadSequence || !inventoryAnomalies.value.some((item) => Number(item.id) === anomalyId)) return ElMessage.warning("库存异常列表已变化，请重新选择处理目标");
    await api.post(`/admin/mall/inventory-anomalies/${anomalyId}/resolve`, { action, remark: result.value.trim() });
    ElMessage.success(action === "repair" ? "库存异常已修复并记录流水" : "库存异常已忽略");
    await loadInventoryData();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(error.message || "处理库存异常失败");
  } finally {
    anomalyActionId.value = null;
  }
}

async function handleTenantChange() {
  invalidateInventoryScope();
  filters.merchantId = undefined;
  filters.page = 1;
  await syncRouteQuery();
  const ok = await loadMerchants();
  if (ok) await loadInventoryData();
}

async function handleMerchantChange() {
  invalidateInventoryScope();
  deepLinkWarning.value = "";
  filters.page = 1;
  await syncRouteQuery();
  await loadInventoryData();
}

function requireInventoryOperation(merchant?: Merchant | null) {
  if (deepLinkWarning.value) {
    ElMessage.error("当前店铺链接不可用，请先确认店铺授权后再操作。");
    return false;
  }
  if (!merchantOperational(merchant)) {
    ElMessage.error(merchantDisabledReason(merchant));
    return false;
  }
  return true;
}

function selectedAdjustSku() {
  return stockSkus.value.find((sku) => sku.id === stockForm.skuId);
}

function openProductStockAdjust(row: any, sku?: any) {
  const merchant = rowMerchant(row);
  if (!requireInventoryOperation(merchant)) return;
  stockMerchant.value = merchant || null;
  stockSkus.value = row.skus || [];
  stockTarget.value = {
    productId: Number(row.id || 0),
    tenantId: Number(row.tenant?.id || filters.tenantId || selectedMerchant.value?.tenant?.id || 0),
    merchantId: Number(row.merchant?.id || filters.merchantId || 0),
    skuIds: stockSkus.value.map((item) => Number(item.id)).filter(Boolean)
  };
  if (!stockTarget.value.productId || !stockTarget.value.tenantId || !stockTarget.value.merchantId || !stockTarget.value.skuIds.length) {
    closeStockDialog();
    return ElMessage.error("库存调整商品归属或 SKU 信息不完整");
  }
  const selectedSku = sku || stockSkus.value[0];
  Object.assign(stockForm, { productTitle: row.title, skuId: selectedSku?.id, stock: Number(selectedSku?.stock || 0), remark: "", businessKey: newBusinessKey() });
  stockDialogVisible.value = true;
}

function openLowStockAdjust(row: any) {
  const merchant = rowMerchant(row);
  if (!requireInventoryOperation(merchant)) return;
  stockMerchant.value = merchant || null;
  stockSkus.value = [{ ...row, product: row.product }];
  stockTarget.value = {
    productId: Number(row.product?.id || 0),
    tenantId: Number(row.tenant?.id || row.product?.tenant?.id || filters.tenantId || selectedMerchant.value?.tenant?.id || 0),
    merchantId: Number(row.merchant?.id || row.product?.merchant?.id || filters.merchantId || 0),
    skuIds: [Number(row.id)].filter(Boolean)
  };
  if (!stockTarget.value.productId || !stockTarget.value.tenantId || !stockTarget.value.merchantId || !stockTarget.value.skuIds.length) {
    closeStockDialog();
    return ElMessage.error("低库存调整目标归属不完整");
  }
  Object.assign(stockForm, { productTitle: row.product?.title || "-", skuId: row.id, stock: Number(row.stock || 0), remark: "低库存预警补货", businessKey: newBusinessKey() });
  stockDialogVisible.value = true;
}

function handleAdjustSkuChange() {
  const sku = selectedAdjustSku();
  stockForm.stock = Number(sku?.stock || 0);
}

async function submitStockAdjust() {
  const target = stockTarget.value;
  if (stockAdjusting.value || anomalyScanning.value || anomalyActionId.value !== null) return;
  if (!requireInventoryOperation(stockMerchant.value || selectedMerchant.value)) return;
  if (!target?.productId || !target.tenantId || !target.merchantId) return ElMessage.error("库存调整目标已失效，请关闭后重新打开");
  if (!stockForm.skuId) return ElMessage.error("请选择规格");
  if (!target.skuIds.includes(Number(stockForm.skuId))) return ElMessage.error("所选 SKU 不属于当前商品，请关闭后重新打开");
  if (!stockForm.remark.trim()) return ElMessage.error("请填写调整原因，方便后续核对库存流水");
  stockAdjusting.value = true;
  try {
    await api.post(`/admin/mall/skus/${stockForm.skuId}/adjust-stock`, { stock: stockForm.stock, remark: stockForm.remark.trim(), businessKey: stockForm.businessKey });
    if (stockTarget.value?.productId !== target.productId || stockTarget.value?.merchantId !== target.merchantId) return;
    ElMessage.success("库存已调整，流水已记录");
    stockDialogVisible.value = false;
    await loadInventoryData();
  } catch (error: any) {
    ElMessage.error(error.message || "调整库存失败");
  } finally {
    stockAdjusting.value = false;
  }
}

function openProductInventoryLogs(row: any) {
  filters.logKeyword = row.title || "";
  void loadInventoryLogs();
}

function openProductManage(row: any) {
  router.push({ path: "/mall-products", query: { tenantId: row.tenant?.id || filters.tenantId, merchantId: row.merchant?.id || filters.merchantId, keyword: row.title || "" } });
}

function goMerchantAdmin(path: string, query: Record<string, any> = {}) {
  if (!selectedMerchant.value && !isPlatformAdmin()) return;
  router.push({
    path,
    query: {
      tenantId: selectedMerchant.value?.tenant?.id || filters.tenantId,
      merchantId: selectedMerchant.value?.id || filters.merchantId,
      ...query
    }
  });
}

function merchantWorkbenchUrl() {
  if (!selectedMerchant.value) return `${window.location.origin}/admin/mall-inventory`;
  const query = new URLSearchParams();
  if (selectedMerchant.value.tenant?.id) query.set("tenantId", String(selectedMerchant.value.tenant.id));
  query.set("merchantId", String(selectedMerchant.value.id));
  return `${window.location.origin}/admin/mall-inventory?${query.toString()}`;
}

function merchantH5Url() {
  if (!selectedMerchant.value) return "";
  return h5RoutePreviewUrl(selectedMerchant.value.tenant?.code || "", `/pages/mall/merchant?id=${selectedMerchant.value.id}`);
}

function openMerchantH5() {
  const url = merchantH5Url();
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}

async function copyWorkbenchLink() {
  await copyToClipboard(merchantWorkbenchUrl());
  ElMessage.success("商城库存后台链接已复制，可发给已授权的商家/代理账号。");
}

function availableStock(sku?: any) {
  return Math.max(Number(sku?.stock || 0) - Number(sku?.lockedStock || 0), 0);
}

function statusText(value: string) {
  return ({ draft: "草稿", pending_review: "待审核", published: "已上架", offline: "已下架" } as any)[value] || value || "-";
}

function inventoryTypeText(value: string) {
  return ({ lock: "锁定", release: "释放", deduct: "扣减", return: "回补", adjust: "调整" } as any)[value] || value || "-";
}

function inventoryTypeTag(value: string) {
  return value === "deduct" ? "success" : value === "return" ? "warning" : value === "adjust" ? "primary" : "info";
}

function anomalyStatusText(value: string) {
  return ({ open: "待处理", resolved: "已修复", ignored: "已忽略" } as any)[value] || value || "-";
}

function compactState(value: any) {
  return Object.entries(value || {}).map(([key, item]) => `${key}=${item}`).join("，") || "-";
}

function newBusinessKey() {
  return globalThis.crypto?.randomUUID?.() || `inventory-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatTime(value: any) {
  return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "-";
}

onMounted(reloadScope);

watch(() => [route.query.tenantId, route.query.merchantId, route.query.keyword], async () => {
  const nextTenantId = routeTenantId();
  const nextMerchantId = routeMerchantId();
  const nextKeyword = routeKeyword();
  const tenantChanged = nextTenantId !== filters.tenantId;
  const merchantChanged = nextMerchantId !== filters.merchantId;
  const keywordChanged = nextKeyword !== filters.keyword;
  if (!tenantChanged && !merchantChanged && !keywordChanged) return;
  invalidateInventoryScope();
  filters.keyword = nextKeyword;
  if (tenantChanged) {
    filters.tenantId = nextTenantId;
    filters.merchantId = nextMerchantId;
    filters.page = 1;
    const ok = await loadMerchants();
    if (ok) await loadInventoryData();
    return;
  }
  if (merchantChanged && nextMerchantId && merchants.value.some((item) => item.id === nextMerchantId)) {
    deepLinkWarning.value = "";
    filters.merchantId = nextMerchantId;
    filters.page = 1;
    await loadInventoryData();
  } else if (merchantChanged && nextMerchantId) {
    filters.merchantId = undefined;
    deepLinkWarning.value = merchantLinkWarning(nextMerchantId);
    clearInventoryData();
  } else if (merchantChanged) {
    deepLinkWarning.value = "";
    filters.merchantId = undefined;
    filters.page = 1;
    await loadInventoryData();
  } else if (keywordChanged) {
    filters.page = 1;
    await loadInventoryData();
  }
});
</script>

<style scoped>
.mall-inventory-page { padding: 24px; display: grid; gap: 16px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.page-header h2 { margin: 0 0 6px; color: #111827; }
.page-header p { margin: 0; color: #64748b; }
.header-actions, .filter-row { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.filter-row { justify-content: flex-start; }
.scope-alert { margin-bottom: 2px; }
.section-error { margin-bottom: 12px; }
.merchant-card { border-color: #bbf7d0; background: linear-gradient(135deg, #f0fdf4 0%, #fff 72%); }
.merchant-card :deep(.el-card__body) { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; }
.merchant-card strong { color: #0f172a; }
.merchant-card p { margin: 4px 0 0; color: #64748b; }
.merchant-tags, .merchant-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.merchant-actions { grid-column: 1 / -1; }
.filter-card :deep(.el-card__body) { display: grid; gap: 10px; }
.inventory-tip { margin-top: 2px; }
.summary-grid { display: grid; grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 12px; }
.summary-grid :deep(.el-card__body) { display: grid; gap: 4px; }
.summary-grid small, .summary-grid span { color: #64748b; }
.summary-grid strong { color: #0f172a; font-size: 22px; }
.inventory-card small, .muted-line { display: block; color: #64748b; margin-top: 3px; }
.section-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.section-header small { color: #64748b; }
.anomaly-toolbar { justify-content: flex-start; margin-bottom: 12px; }
.product-cell { display: flex; gap: 10px; align-items: center; }
.product-cell img, .cover-placeholder { width: 52px; height: 52px; border-radius: 12px; object-fit: cover; background: #dcfce7; color: #166534; display: grid; place-items: center; font-weight: 700; }
.sku-list { display: grid; gap: 5px; }
.sku-line { display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px dashed #e5e7eb; padding: 2px 0; }
.pager-row { display: flex; justify-content: flex-end; padding-top: 14px; }
@media (max-width: 1280px) {
  .page-header { display: grid; }
  .header-actions { justify-content: flex-start; }
  .summary-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .mall-inventory-page { padding: 14px; }
  .page-header { grid-template-columns: minmax(0, 1fr); }
  .page-header > div:first-child, .page-header h2, .page-header p { min-width: 0; overflow-wrap: anywhere; }
  .header-actions, .filter-row { width: 100%; align-items: stretch; flex-direction: column; }
  .header-actions :deep(.el-select), .header-actions :deep(.el-input), .header-actions > .el-button,
  .filter-row :deep(.el-select), .filter-row :deep(.el-input), .filter-row :deep(.el-input-number), .filter-row > .el-button { width: 100% !important; margin-left: 0; }
  .summary-grid { grid-template-columns: 1fr; }
  .merchant-card :deep(.el-card__body) { grid-template-columns: 1fr; }
  .merchant-tags, .merchant-actions { justify-content: flex-start; }
  .merchant-actions > .el-button { margin-left: 0; }
  .section-header { align-items: flex-start; flex-direction: column; }
}
</style>
