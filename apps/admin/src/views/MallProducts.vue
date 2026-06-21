<template>
  <div class="mall-page">
    <div class="page-header">
      <div>
        <h2>{{ pageTitle }}</h2>
        <p>{{ pageSubtitle }}</p>
      </div>
      <div class="header-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="选择商家" style="width: 220px" @change="handleTenantChange">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-select v-model="filters.merchantId" clearable filterable placeholder="全部店铺" style="width: 220px" @change="handleMerchantChange">
          <el-option v-for="merchant in merchants" :key="merchant.id" :label="merchantLabel(merchant)" :value="merchant.id" />
        </el-select>
        <el-button @click="openCategoryManagement">店铺分类</el-button>
        <el-button :disabled="selectedMerchant && !selectedMerchantOpen" @click="openCouponDialog">优惠券</el-button>
        <el-button :type="lowStockItems.length ? 'danger' : 'default'" @click="openLowStockDialog">低库存提醒{{ lowStockItems.length ? `（${lowStockItems.length}）` : "" }}</el-button>
        <el-button @click="exportProductSales">导出销售统计</el-button>
        <el-button type="primary" :disabled="selectedMerchant && !selectedMerchantOpen" @click="createProduct">新增商品</el-button>
      </div>
    </div>

    <el-alert
      v-if="deepLinkWarning"
      class="deep-link-alert"
      type="error"
      show-icon
      :closable="false"
      title="商品管理店铺链接不可用"
      :description="deepLinkWarning"
    />

    <el-card v-if="selectedMerchant && !deepLinkWarning" shadow="never" class="merchant-context-card">
      <div class="merchant-context-main">
        <div>
          <strong>当前运营店铺：{{ selectedMerchant.name || selectedMerchant.code }}</strong>
          <p>{{ selectedMerchant.tenant?.name || selectedMerchant.tenant?.code || "平台店铺" }} · {{ merchantOwnerText(selectedMerchant) }} · {{ selectedMerchant.region || "未设置区域" }}</p>
        </div>
        <div class="merchant-context-tags">
          <el-tag :type="selectedMerchant.mallEnabled === false || selectedMerchant.status !== 'active' ? 'info' : 'success'">{{ selectedMerchant.mallEnabled === false || selectedMerchant.status !== 'active' ? "商城未开放" : "商城已开放" }}</el-tag>
          <el-tag type="warning" effect="plain">{{ paymentModeText(selectedMerchant.paymentMode) }}</el-tag>
          <el-tag v-if="merchantProductAuditRequired(selectedMerchant)" type="warning" effect="plain">商品需审核</el-tag>
        </div>
      </div>
      <div class="merchant-context-actions">
        <el-button size="small" type="primary" plain @click="goMerchantAdmin('/mall-payments')">收款配置</el-button>
        <el-button size="small" type="primary" plain @click="goMerchantAdmin('/mall-categories')">店铺分类</el-button>
        <el-button size="small" type="primary" plain @click="goMerchantAdmin('/mall-orders')">订单管理</el-button>
        <el-button size="small" type="warning" plain @click="goMerchantAdmin('/mall-refunds')">售后处理</el-button>
        <el-button size="small" type="success" plain @click="goMerchantAdmin('/mall-marketing')">营销工具</el-button>
        <el-button size="small" type="info" plain @click="goMerchantAdmin('/mall-statistics')">经营统计</el-button>
        <el-button size="small" @click="openMerchantH5">打开 H5 店铺</el-button>
        <el-button size="small" @click="copyMerchantPageLink">复制当前后台链接</el-button>
      </div>
    </el-card>
    <el-alert
      v-if="selectedMerchant && !deepLinkWarning && !selectedMerchantOpen"
      class="merchant-disabled-alert"
      type="warning"
      show-icon
      :closable="false"
      title="当前店铺未开放商城"
      :description="selectedMerchantDisabledReason"
    />

    <div class="filter-bar">
      <el-select v-model="filters.categoryId" clearable placeholder="全部分类" style="width: 160px" @change="applyProductFilters">
        <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
      <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 140px" @change="applyProductFilters">
        <el-option label="草稿" value="draft" />
        <el-option label="待审核" value="pending_review" />
        <el-option label="已上架" value="published" />
        <el-option label="已下架" value="offline" />
      </el-select>
      <el-input v-model="filters.keyword" clearable placeholder="商品名/品牌名" style="width: 220px" @keyup.enter="applyProductFilters" @clear="applyProductFilters" />
      <el-button @click="applyProductFilters">筛选</el-button>
    </div>

    <el-alert v-if="lowStockItems.length" type="warning" show-icon :closable="false" class="low-stock-alert">
      <template #title>
        当前有 {{ lowStockItems.length }} 个上架规格可售库存低于 {{ lowStockThreshold }} 件，建议及时补货或下架。
      </template>
    </el-alert>

    <el-table v-loading="loading" :data="products" stripe>
      <el-table-column label="商品" min-width="260">
        <template #default="{ row }">
          <div class="product-cell">
            <img v-if="row.coverUrl" :src="row.coverUrl" alt="" />
            <div v-else class="cover-placeholder">商</div>
            <div>
              <strong>{{ row.title }}</strong>
              <small>{{ row.brandName || "未设品牌" }} · {{ row.category?.name || "未分类" }} · 库存 {{ row.stock || 0 }}</small>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column v-if="isPlatformAdmin()" label="商家" min-width="160"><template #default="{ row }">{{ row.tenant?.name || row.tenant?.code }}</template></el-table-column>
      <el-table-column label="店铺" min-width="160"><template #default="{ row }">{{ row.merchant?.name || "默认店铺" }}</template></el-table-column>
      <el-table-column label="价格" width="110"><template #default="{ row }">¥{{ money(row.price) }}</template></el-table-column>
      <el-table-column label="销售" width="130">
        <template #default="{ row }">
          <strong>{{ row.salesStats?.salesCount || 0 }} 件</strong>
          <small>¥{{ money(row.salesStats?.salesAmount) }}</small>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="row.status === 'published' ? 'success' : row.status === 'offline' ? 'info' : 'warning'">{{ statusText(row.status) }}</el-tag></template></el-table-column>
      <el-table-column label="推荐" width="80"><template #default="{ row }">{{ row.featured ? "是" : "否" }}</template></el-table-column>
      <el-table-column prop="sortOrder" label="排序" width="80" />
      <el-table-column label="创建时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
      <el-table-column label="操作" width="300" fixed="right">
        <template #default="{ row }">
          <el-button v-if="canAuditProducts && row.status === 'pending_review'" size="small" type="success" @click="approveProduct(row)">通过</el-button>
          <el-button v-if="canAuditProducts && row.status === 'pending_review'" size="small" type="danger" plain @click="rejectProduct(row)">驳回</el-button>
          <el-button size="small" :disabled="!rowMerchantOperational(row)" @click="editProduct(row)">编辑</el-button>
          <el-button size="small" type="warning" plain :disabled="!rowMerchantOperational(row)" @click="openStockAdjust(row)">调整库存</el-button>
          <el-button size="small" @click="openInventoryLogs(row)">库存流水</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="productDialogVisible" :title="form.id ? '编辑商品' : '新增商品'" width="760px" destroy-on-close>
      <el-form label-width="96px">
        <el-form-item v-if="isPlatformAdmin()" label="所属商家" required>
          <el-select v-model="form.tenantId" filterable placeholder="请选择商家" @change="handleFormTenantChange">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属店铺" required>
          <el-select v-model="form.merchantId" filterable placeholder="请选择要发布商品的店铺" @change="loadCategories">
            <el-option v-for="merchant in formMerchants" :key="merchant.id" :label="merchantLabel(merchant)" :value="merchant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="商品名称" required><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="品牌名称"><el-input v-model="form.brandName" placeholder="如七维书院严选/合作品牌" /></el-form-item>
        <el-form-item label="分类"><el-select v-model="form.categoryId" clearable placeholder="未分类"><el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" /></el-select></el-form-item>
        <el-form-item label="封面图"><el-input v-model="form.coverUrl" placeholder="图片 URL，后续可接上传组件" /></el-form-item>
        <el-form-item label="商品介绍"><el-input v-model="form.description" type="textarea" :rows="4" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status">
            <el-option v-for="option in productStatusOptions" :key="option.value" :label="option.label" :value="option.value" :disabled="option.disabled" />
          </el-select>
          <span v-if="productStatusHint" class="form-hint">{{ productStatusHint }}</span>
        </el-form-item>
        <el-form-item label="推荐"><el-switch v-model="form.featured" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sortOrder" :precision="0" /><span class="form-hint">数字越小越靠前，推荐商品仍优先展示</span></el-form-item>
        <el-form-item label="配送说明"><el-input v-model="form.deliveryNote" /></el-form-item>
        <el-form-item label="售后说明"><el-input v-model="form.afterSaleNote" /></el-form-item>
        <el-divider>规格 / SKU</el-divider>
        <div v-for="(sku, index) in form.skus" :key="index" class="sku-row">
          <el-input v-model="sku.name" placeholder="规格名，如默认/礼盒装" />
          <el-input-number v-model="sku.price" :min="0" :precision="2" placeholder="价格" />
          <el-input-number v-model="sku.originalPrice" :min="0" :precision="2" placeholder="划线价" />
          <el-input-number v-model="sku.stock" :min="0" :precision="0" placeholder="库存" />
          <el-switch v-model="sku.enabled" />
          <el-button text type="danger" @click="removeSku(index)">删除</el-button>
        </div>
        <el-button @click="addSku">新增规格</el-button>
      </el-form>
      <template #footer>
        <el-button @click="productDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" :disabled="formMerchant && !merchantOperational(formMerchant)" @click="saveProduct">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="couponDialogVisible" title="商城优惠券" width="980px">
      <div class="coupon-toolbar">
        <el-input v-model="couponFilters.keyword" clearable placeholder="券码/名称" style="width:220px" @keyup.enter="loadCoupons" @clear="loadCoupons" />
        <el-select v-model="couponFilters.enabled" clearable placeholder="全部状态" style="width:130px" @change="loadCoupons">
          <el-option label="启用" value="true" />
          <el-option label="停用" value="false" />
        </el-select>
        <el-select v-model="couponFilters.status" clearable placeholder="运营状态" style="width:150px" @change="loadCoupons">
          <el-option label="可领取/可使用" value="active" />
          <el-option label="未开始" value="not_started" />
          <el-option label="已过期" value="expired" />
          <el-option label="已用完" value="exhausted" />
          <el-option label="已停用" value="disabled" />
        </el-select>
        <el-button @click="loadCoupons">刷新</el-button>
      </div>
      <div class="coupon-form">
        <el-input v-model="couponForm.code" placeholder="券码，如 SHOWCASE10" />
        <el-input v-model="couponForm.name" placeholder="优惠券名称" />
        <el-input-number v-model="couponForm.minAmount" :min="0" :precision="2" placeholder="满多少" />
        <el-input-number v-model="couponForm.discountAmount" :min="0" :precision="2" placeholder="减多少" />
        <el-input-number v-model="couponForm.usageLimit" :min="0" :precision="0" placeholder="总次数，0不限" />
        <el-switch v-model="couponForm.enabled" active-text="启用" />
        <el-date-picker v-model="couponForm.startsAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="开始时间" />
        <el-date-picker v-model="couponForm.endsAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="结束时间" />
        <el-button type="primary" :loading="couponSaving" :disabled="selectedMerchant && !selectedMerchantOpen" @click="saveCoupon">{{ couponForm.id ? "保存优惠券" : "新增优惠券" }}</el-button>
        <el-button v-if="couponForm.id" @click="resetCouponForm">取消编辑</el-button>
      </div>
      <el-table v-loading="couponLoading" :data="coupons" size="small" border>
        <el-table-column label="券码" width="150"><template #default="{ row }"><strong>{{ row.code }}</strong></template></el-table-column>
        <el-table-column prop="name" label="名称" min-width="180" />
        <el-table-column label="门槛" width="100"><template #default="{ row }">满 ¥{{ money(row.minAmount) }}</template></el-table-column>
        <el-table-column label="优惠" width="100"><template #default="{ row }">减 ¥{{ money(row.discountAmount) }}</template></el-table-column>
        <el-table-column label="使用" width="150"><template #default="{ row }">{{ row.usedCount || 0 }} / {{ row.usageLimit || "不限" }}<small>剩余 {{ row.remainingCount === null || row.remainingCount === undefined ? "不限" : row.remainingCount }}</small></template></el-table-column>
        <el-table-column label="运营状态" width="120"><template #default="{ row }"><el-tag :type="couponStatusTag(row.runtimeStatus)">{{ couponStatusText(row.runtimeStatus) }}</el-tag></template></el-table-column>
        <el-table-column label="有效期" min-width="210"><template #default="{ row }">{{ formatDate(row.startsAt) }} 至 {{ formatDate(row.endsAt) }}</template></el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editCoupon(row)">编辑</el-button>
            <el-button size="small" :type="row.enabled ? 'warning' : 'success'" plain :disabled="selectedMerchant && !selectedMerchantOpen" @click="toggleCoupon(row)">{{ row.enabled ? "停用" : "启用" }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="inventoryDialogVisible" title="库存流水" width="860px">
      <div class="inventory-toolbar">
        <el-select v-model="inventoryFilters.skuId" placeholder="选择规格" style="width:220px" @change="loadInventoryLogs">
          <el-option v-for="sku in inventorySkus" :key="sku.id" :label="`${sku.name}（库存 ${sku.stock}，锁定 ${sku.lockedStock}）`" :value="sku.id" />
        </el-select>
        <el-input v-model="inventoryFilters.keyword" clearable placeholder="订单号/商品/规格" style="width:240px" @keyup.enter="loadInventoryLogs" @clear="loadInventoryLogs" />
        <el-button @click="loadInventoryLogs">刷新</el-button>
      </div>
      <el-table :data="inventoryLogs" size="small" border>
        <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        <el-table-column label="类型" width="100"><template #default="{ row }">{{ inventoryTypeText(row.type) }}</template></el-table-column>
        <el-table-column label="商品/规格" min-width="210"><template #default="{ row }">{{ row.sku?.product?.title || "-" }} / {{ row.sku?.name || "-" }}</template></el-table-column>
        <el-table-column label="订单号" width="180"><template #default="{ row }">{{ row.order?.orderNo || "-" }}</template></el-table-column>
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column label="库存变化" width="150"><template #default="{ row }">{{ row.stockBefore }} → {{ row.stockAfter }}</template></el-table-column>
        <el-table-column label="锁定变化" width="150"><template #default="{ row }">{{ row.lockedBefore }} → {{ row.lockedAfter }}</template></el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
      </el-table>
    </el-dialog>

    <el-dialog v-model="lowStockDialogVisible" title="低库存提醒 / 补货运营" width="900px">
      <div class="inventory-toolbar">
        <span>预警阈值</span>
        <el-input-number v-model="lowStockThreshold" :min="0" :precision="0" @change="loadLowStock" />
        <el-button @click="loadLowStock">刷新</el-button>
        <span class="form-hint">只统计已上架商品的启用规格，按可售库存从低到高排列。</span>
      </div>
      <el-table :data="lowStockItems" size="small" border>
        <el-table-column label="商品/规格" min-width="260">
          <template #default="{ row }">
            <strong>{{ row.product?.title || "-" }}</strong>
            <small>{{ row.name || "-" }} · {{ row.product?.category?.name || "未分类" }}</small>
          </template>
        </el-table-column>
        <el-table-column v-if="isPlatformAdmin()" label="商家" min-width="150"><template #default="{ row }">{{ row.tenant?.name || row.tenant?.code }}</template></el-table-column>
        <el-table-column label="总库存" width="90"><template #default="{ row }">{{ row.stock || 0 }}</template></el-table-column>
        <el-table-column label="锁定" width="90"><template #default="{ row }">{{ row.lockedStock || 0 }}</template></el-table-column>
        <el-table-column label="可售" width="90">
          <template #default="{ row }"><el-tag :type="Number(row.availableStock || 0) === 0 ? 'danger' : 'warning'">{{ row.availableStock || 0 }}</el-tag></template>
        </el-table-column>
        <el-table-column label="建议" min-width="150">
          <template #default="{ row }">{{ Number(row.availableStock || 0) === 0 ? "立即补货或下架" : "关注销售速度，准备补货" }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }"><el-button size="small" type="warning" plain :disabled="!rowMerchantOperational(row)" @click="openLowStockAdjust(row)">调整库存</el-button></template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="stockDialogVisible" title="调整 SKU 库存" width="520px">
      <el-form label-width="96px">
        <el-form-item label="商品">
          <strong>{{ stockForm.productTitle || "-" }}</strong>
        </el-form-item>
        <el-form-item label="规格" required>
          <el-select v-model="stockForm.skuId" placeholder="请选择规格" @change="handleAdjustSkuChange">
            <el-option v-for="sku in stockSkus" :key="sku.id" :label="`${sku.name}（库存 ${sku.stock}，锁定 ${sku.lockedStock}）`" :value="sku.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="当前状态">
          <span>总库存 {{ selectedAdjustSku()?.stock || 0 }}，锁定 {{ selectedAdjustSku()?.lockedStock || 0 }}，可售 {{ Math.max(Number(selectedAdjustSku()?.stock || 0) - Number(selectedAdjustSku()?.lockedStock || 0), 0) }}</span>
        </el-form-item>
        <el-form-item label="目标库存" required>
          <el-input-number v-model="stockForm.stock" :min="Number(selectedAdjustSku()?.lockedStock || 0)" :precision="0" />
        </el-form-item>
        <el-form-item label="调整原因" required>
          <el-input v-model="stockForm.remark" type="textarea" :rows="3" placeholder="例如：盘点补库存、损耗扣减、录入错误修正" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stockDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="stockAdjusting" :disabled="stockMerchant && !merchantOperational(stockMerchant)" @click="submitStockAdjust">确认调整</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { api, downloadFile } from "../api";
import { copyToClipboard, h5RoutePreviewUrl } from "../h5-preview";
import { hasPermission, isPlatformAdmin } from "../permissions";

const route = useRoute();
const router = useRouter();
const products = ref<any[]>([]);
const categories = ref<any[]>([]);
const tenants = ref<any[]>([]);
const merchants = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const productDialogVisible = ref(false);
const couponDialogVisible = ref(false);
const inventoryDialogVisible = ref(false);
const lowStockDialogVisible = ref(false);
const stockDialogVisible = ref(false);
const stockAdjusting = ref(false);
const couponSaving = ref(false);
const couponLoading = ref(false);
const inventoryLogs = ref<any[]>([]);
const coupons = ref<any[]>([]);
const lowStockItems = ref<any[]>([]);
const inventorySkus = ref<any[]>([]);
const stockSkus = ref<any[]>([]);
const stockMerchant = ref<any | null>(null);
const lowStockThreshold = ref(10);
const deepLinkWarning = ref("");
const routeTenantId = () => {
  const id = typeof route.query.tenantId === "string" ? Number(route.query.tenantId) : 0;
  return isPlatformAdmin() && id ? id : undefined;
};
const routeMerchantId = () => {
  const id = typeof route.query.merchantId === "string" ? Number(route.query.merchantId) : 0;
  return id || undefined;
};
const routeCategoryId = () => {
  const id = typeof route.query.categoryId === "string" ? Number(route.query.categoryId) : 0;
  return id || undefined;
};
const routeKeyword = () => typeof route.query.keyword === "string" ? route.query.keyword : "";
const filters = reactive({ tenantId: routeTenantId() as number | undefined, merchantId: routeMerchantId() as number | undefined, categoryId: routeCategoryId() as number | undefined, status: "", keyword: routeKeyword() });
const couponFilters = reactive({ keyword: "", enabled: "", status: "" });
const couponForm = reactive<any>({ id: null, code: "", name: "", minAmount: 0, discountAmount: 0, usageLimit: 0, enabled: true, startsAt: null, endsAt: null });
const form = reactive<any>({ skus: [] });
const inventoryFilters = reactive({ tenantId: undefined as number | undefined, merchantId: undefined as number | undefined, skuId: undefined as number | undefined, keyword: "" });
const stockForm = reactive({ productTitle: "", skuId: undefined as number | undefined, stock: 0, remark: "" });
const selectedMerchant = computed(() => merchants.value.find((merchant) => merchant.id === filters.merchantId));
const formMerchants = computed(() => merchants.value.filter((merchant) => !form.tenantId || merchant.tenant?.id === form.tenantId));
const formMerchant = computed(() => formMerchants.value.find((merchant) => merchant.id === form.merchantId) || selectedMerchant.value);
const selectedMerchantOpen = computed(() => merchantOperational(selectedMerchant.value));
const selectedMerchantDisabledReason = computed(() => merchantDisabledReason(selectedMerchant.value));
const canAuditProducts = computed(() => isPlatformAdmin() && hasPermission("mall.product.audit"));
const isAuditPage = computed(() => route.path === "/mall-product-audits" || String(route.query.panel || "") === "product-audits");
const pageTitle = computed(() => isAuditPage.value ? "商城商品审核" : "商城商品");
const pageSubtitle = computed(() =>
  isAuditPage.value
    ? "审核商家/代理店铺提交的商品。通过后前台展示，驳回后退回草稿，店铺可修改后重新提交。"
    : "管理商品、SKU、价格、库存和上下架。分类已拆到「店铺分类」独立维护，商品按店铺隔离，前台只展示已上架商品。"
);
const productStatusOptions = computed(() => {
  const auditRequired = merchantProductAuditRequired(formMerchant.value);
  if (auditRequired && !isPlatformAdmin()) {
    return [
      { label: "草稿", value: "draft", disabled: false },
      { label: "提交平台审核", value: "pending_review", disabled: false },
      ...(form.status === "published" ? [{ label: "已上架（保存修改将重新审核）", value: "published", disabled: false }] : []),
      { label: "已下架", value: "offline", disabled: false }
    ];
  }
  return [
    { label: "草稿", value: "draft", disabled: false },
    { label: "待审核", value: "pending_review", disabled: false },
    { label: "已上架", value: "published", disabled: false },
    { label: "已下架", value: "offline", disabled: false }
  ];
});
const productStatusHint = computed(() => {
  const auditRequired = merchantProductAuditRequired(formMerchant.value);
  if (!auditRequired) return "该店铺免审核：保存为已上架后会直接在 H5/小程序展示。";
  if (isPlatformAdmin()) return "该店铺开启商品审核：平台账号可直接上架，也可保存为待审核。";
  if (form.status === "published") return "该店铺开启商品审核：保存已上架商品的修改后会重新进入待审核，平台通过前不展示。";
  return "该店铺开启商品审核：提交后进入待审核，平台通过后才在 H5/小程序展示。";
});

function tenantLabel(tenant: any) { return `${tenant.name || tenant.code}（${tenant.code}）`; }
function merchantLabel(merchant: any) {
  const owner = merchant.ownerType === "agent" ? "代理店铺" : "商家店铺";
  const status = merchant.mallEnabled === false || merchant.status !== "active" ? " · 未开放" : "";
  return `${merchant.name || merchant.code}（${owner}${merchant.region ? ` · ${merchant.region}` : ""}${status}）`;
}
function merchantOwnerText(merchant: any) { return merchant?.ownerType === "agent" ? "代理店铺" : "商家店铺"; }
function merchantOperational(merchant: any) { return !!merchant && merchant.status === "active" && merchant.mallEnabled !== false; }
function merchantDisabledReason(merchant: any) {
  if (!merchant) return "请先选择要运营的店铺。平台可在「商城店铺」为商家/代理开店并授权账号。";
  if (merchant.status !== "active") return "当前店铺已被平台停用，不能新增商品、调整库存或配置优惠券；分类请到「店铺分类」查看历史配置。";
  if (merchant.mallEnabled === false) return "当前店铺未开放商城，不能新增商品、调整库存或配置优惠券；请联系平台管理员在「商城店铺」开通商城后再操作。";
  return "";
}
function requireOpenMerchant(action: string, merchant = selectedMerchant.value) {
  if (deepLinkWarning.value) {
    ElMessage.error("当前店铺链接不可用，请先确认店铺授权后再操作。");
    return false;
  }
  if (!merchant) {
    ElMessage.error(`请先选择要${action}的店铺。平台可在「商城店铺」为商家/代理开店并授权账号。`);
    return false;
  }
  if (!merchantOperational(merchant)) {
    ElMessage.error(merchantDisabledReason(merchant));
    return false;
  }
  return true;
}
function rowMerchant(row: any) { return row?.merchant?.status || row?.merchant?.mallEnabled !== undefined ? row.merchant : selectedMerchant.value; }
function rowMerchantOperational(row: any) { return merchantOperational(rowMerchant(row)); }
function merchantProductAuditRequired(merchant: any) { return merchant?.productAuditRequired !== false; }
function paymentModeText(value: string) { return value === "merchant_direct" ? "商户直收" : "平台代收"; }
function money(value: any) { return Number(value || 0).toFixed(2); }
function statusText(status: string) { return ({ draft: "草稿", pending_review: "待审核", published: "已上架", offline: "已下架" } as any)[status] || status; }
function couponStatusText(status: string) { return ({ active: "可使用", not_started: "未开始", expired: "已过期", exhausted: "已用完", disabled: "已停用" } as any)[status] || status || "-"; }
function couponStatusTag(status: string) { return ({ active: "success", not_started: "warning", expired: "info", exhausted: "danger", disabled: "info" } as any)[status] || "info"; }
function inventoryTypeText(type: string) { return ({ lock: "锁定", release: "释放", deduct: "扣减", return: "回补", adjust: "调整" } as any)[type] || type; }
function formatTime(value: any) { return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "-"; }
function formatDate(value: any) { return value ? new Date(value).toLocaleDateString("zh-CN") : "长期"; }
function merchantLinkWarning(requestedMerchantId: number) {
  return `当前链接指定的店铺 #${requestedMerchantId} 对当前账号不可见，或已被商家/关键词筛选条件过滤。为避免误操作，系统不会自动切换到其它店铺；请联系平台管理员确认店铺授权，或清空筛选后重试。`;
}
function clearProductScopeData() {
  products.value = [];
  categories.value = [];
  lowStockItems.value = [];
  coupons.value = [];
  inventoryLogs.value = [];
}
function blockInvalidMerchantLink() {
  if (!deepLinkWarning.value) return false;
  clearProductScopeData();
  return true;
}
function merchantPageUrl(path = route.path) {
  if (!selectedMerchant.value) return "";
  const query = new URLSearchParams();
  if (selectedMerchant.value.tenant?.id) query.set("tenantId", String(selectedMerchant.value.tenant.id));
  query.set("merchantId", String(selectedMerchant.value.id));
  return `${window.location.origin}/admin${path}?${query.toString()}`;
}
function merchantH5Url() {
  if (!selectedMerchant.value) return "";
  return h5RoutePreviewUrl(selectedMerchant.value.tenant?.code || "", `/pages/mall/merchant?id=${selectedMerchant.value.id}`);
}
function goMerchantAdmin(path: string) {
  if (!selectedMerchant.value) return;
  router.push({ path, query: { tenantId: selectedMerchant.value.tenant?.id, merchantId: selectedMerchant.value.id } });
}
function openCategoryManagement() {
  const query: Record<string, string> = {};
  const tenantId = selectedMerchant.value?.tenant?.id || filters.tenantId;
  const merchantId = selectedMerchant.value?.id || filters.merchantId;
  if (tenantId) query.tenantId = String(tenantId);
  if (merchantId) query.merchantId = String(merchantId);
  router.push({ path: "/mall-categories", query });
}
function openMerchantH5() {
  const url = merchantH5Url();
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}
async function copyMerchantPageLink() {
  const url = merchantPageUrl();
  if (!url) return;
  await copyToClipboard(url);
  ElMessage.success("当前店铺后台链接已复制，可发给已授权的商家/代理账号。");
}
function normalizedProductStatus() {
  if (merchantProductAuditRequired(formMerchant.value) && !isPlatformAdmin() && form.status === "published") return "pending_review";
  return form.status || "draft";
}

async function loadTenants() {
  tenants.value = isPlatformAdmin() ? await api.get<any, any[]>("/admin/tenants") : [];
}
async function loadMerchants(tenantId = filters.tenantId, honorRouteMerchant = tenantId === filters.tenantId) {
  merchants.value = await api.get<any, any[]>("/admin/mall/accessible-merchants", { params: { tenantId: isPlatformAdmin() ? tenantId : undefined, enabled: "true" } });
  const requestedMerchantId = honorRouteMerchant ? routeMerchantId() : undefined;
  if (honorRouteMerchant) deepLinkWarning.value = "";
  if (requestedMerchantId && merchants.value.some((merchant) => merchant.id === requestedMerchantId)) {
    filters.merchantId = requestedMerchantId;
  } else if (requestedMerchantId) {
    filters.merchantId = undefined;
    deepLinkWarning.value = merchantLinkWarning(requestedMerchantId);
    clearProductScopeData();
    return false;
  } else if (filters.merchantId && !merchants.value.some((merchant) => merchant.id === filters.merchantId)) filters.merchantId = undefined;
  if (!filters.merchantId && !isPlatformAdmin() && merchants.value.length === 1) filters.merchantId = merchants.value[0].id;
  return true;
}
function currentMallParams(extra: Record<string, any> = {}) {
  return {
    tenantId: isPlatformAdmin() ? filters.tenantId || selectedMerchant.value?.tenant?.id : undefined,
    merchantId: filters.merchantId || undefined,
    ...extra
  };
}
async function loadCategories() {
  if (blockInvalidMerchantLink()) return;
  const merchantId = form.merchantId || filters.merchantId;
  if (!merchantId) {
    categories.value = [];
    return;
  }
  categories.value = await api.get<any, any[]>("/admin/mall/categories", { params: currentMallParams({ tenantId: isPlatformAdmin() ? form.tenantId || selectedMerchant.value?.tenant?.id || filters.tenantId : undefined, merchantId }) });
}
async function loadProducts() {
  if (blockInvalidMerchantLink()) return;
  loading.value = true;
  try {
    const result = await api.get<any, any>("/admin/mall/products", {
      params: {
        ...currentMallParams(),
        categoryId: filters.categoryId || undefined,
        status: filters.status || undefined,
        keyword: filters.keyword.trim() || undefined,
        pageSize: 100
      }
    });
    products.value = result.items || [];
  } catch (error: any) {
    ElMessage.error(error.message || "加载商品失败");
  } finally {
    loading.value = false;
  }
}
async function applyProductFilters() {
  if (blockInvalidMerchantLink()) return;
  await loadProducts();
  await loadLowStock();
}
async function loadLowStock() {
  if (blockInvalidMerchantLink()) return;
  try {
    const result = await api.get<any, any>("/admin/mall/products/low-stock", {
      params: {
        ...currentMallParams(),
        categoryId: filters.categoryId || undefined,
        keyword: filters.keyword.trim() || undefined,
        lowStockThreshold: lowStockThreshold.value,
        pageSize: 100
      }
    });
    lowStockItems.value = result.items || [];
  } catch (error: any) {
    ElMessage.error(error.message || "加载低库存提醒失败");
  }
}
async function loadCoupons() {
  if (blockInvalidMerchantLink()) return;
  couponLoading.value = true;
  try {
    coupons.value = await api.get<any, any[]>("/admin/mall/coupons", { params: currentMallParams({ keyword: couponFilters.keyword.trim() || undefined, enabled: couponFilters.enabled || undefined, status: couponFilters.status || undefined }) });
  } catch (error: any) {
    ElMessage.error(error.message || "加载优惠券失败");
  } finally {
    couponLoading.value = false;
  }
}
async function exportProductSales() {
  if (blockInvalidMerchantLink()) return ElMessage.error("当前商品管理店铺链接不可用，请先确认店铺授权后再导出。");
  try {
    const params = new URLSearchParams();
    const scopedTenantId = filters.tenantId || selectedMerchant.value?.tenant?.id;
    if (isPlatformAdmin() && scopedTenantId) params.set("tenantId", String(scopedTenantId));
    if (filters.merchantId) params.set("merchantId", String(filters.merchantId));
    if (filters.categoryId) params.set("categoryId", String(filters.categoryId));
    if (filters.status) params.set("status", filters.status);
    if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
    await downloadFile(`/admin/mall/products/export-sales?${params.toString()}`, "mall-product-sales.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出销售统计失败");
  }
}
async function handleTenantChange() {
  deepLinkWarning.value = "";
  const query = { ...route.query };
  if (filters.tenantId) query.tenantId = String(filters.tenantId);
  else delete query.tenantId;
  delete query.merchantId;
  delete query.categoryId;
  filters.merchantId = undefined;
  await router.replace({ path: route.path, query });
  await loadMerchants(filters.tenantId, false);
  filters.categoryId = undefined;
  await loadCategories();
  await loadProducts();
  if (couponDialogVisible.value) loadCoupons();
}
function handleMerchantChange() {
  deepLinkWarning.value = "";
  const merchant = selectedMerchant.value;
  if (merchant?.tenant?.id && isPlatformAdmin()) filters.tenantId = merchant.tenant.id;
  const query = { ...route.query };
  if (filters.tenantId) query.tenantId = String(filters.tenantId);
  else delete query.tenantId;
  if (filters.merchantId) query.merchantId = String(filters.merchantId);
  else delete query.merchantId;
  delete query.categoryId;
  router.replace({ path: route.path, query });
  filters.categoryId = undefined;
  loadCategories();
  loadProducts();
  loadLowStock();
  if (couponDialogVisible.value) loadCoupons();
}
async function handleFormTenantChange() {
  form.merchantId = undefined;
  await loadMerchants(form.tenantId, false);
  await loadCategories();
}
function resetForm() {
  Object.assign(form, { id: null, tenantId: filters.tenantId || selectedMerchant.value?.tenant?.id, merchantId: filters.merchantId, title: "", brandName: "", categoryId: undefined, coverUrl: "", description: "", status: "draft", featured: false, sortOrder: 0, deliveryNote: "默认快递发货，偏远地区请联系客服", afterSaleNote: "支持未发货退款，已发货请联系书院处理", skus: [{ name: "默认规格", price: 0, originalPrice: 0, stock: 100, enabled: true }] });
}
function createProduct() {
  if (!requireOpenMerchant("发布商品")) return;
  resetForm();
  productDialogVisible.value = true;
  loadCategories();
}
function editProduct(row: any) {
  if (!requireOpenMerchant("编辑商品", rowMerchant(row))) return;
  Object.assign(form, { ...row, tenantId: row.tenant?.id, merchantId: row.merchant?.id, categoryId: row.category?.id, skus: (row.skus || []).map((sku: any) => ({ ...sku, price: Number(sku.price), originalPrice: Number(sku.originalPrice), stock: Number(sku.stock) })) });
  productDialogVisible.value = true;
  loadCategories();
}
async function openInventoryLogs(row: any) {
  inventorySkus.value = row.skus || [];
  inventoryFilters.tenantId = row.tenant?.id || filters.tenantId;
  inventoryFilters.merchantId = row.merchant?.id || filters.merchantId;
  inventoryFilters.skuId = inventorySkus.value[0]?.id;
  inventoryFilters.keyword = "";
  inventoryDialogVisible.value = true;
  await loadInventoryLogs();
}
async function loadInventoryLogs() {
  if (blockInvalidMerchantLink()) return;
  try {
    inventoryLogs.value = await api.get<any, any[]>("/admin/mall/inventory-logs", {
      params: {
        tenantId: isPlatformAdmin() ? inventoryFilters.tenantId : undefined,
        merchantId: inventoryFilters.merchantId || filters.merchantId || undefined,
        skuId: inventoryFilters.skuId,
        keyword: inventoryFilters.keyword.trim() || undefined
      }
    });
  } catch (error: any) {
    ElMessage.error(error.message || "加载库存流水失败");
  }
}
function selectedAdjustSku() {
  return stockSkus.value.find((sku) => sku.id === stockForm.skuId);
}
function openStockAdjust(row: any) {
  if (!requireOpenMerchant("调整库存", rowMerchant(row))) return;
  stockMerchant.value = rowMerchant(row);
  stockSkus.value = row.skus || [];
  const firstSku = stockSkus.value[0];
  Object.assign(stockForm, { productTitle: row.title, skuId: firstSku?.id, stock: Number(firstSku?.stock || 0), remark: "" });
  stockDialogVisible.value = true;
}
function openLowStockAdjust(row: any) {
  if (!requireOpenMerchant("调整库存", rowMerchant(row))) return;
  stockMerchant.value = rowMerchant(row);
  stockSkus.value = [{ ...row, product: row.product }];
  Object.assign(stockForm, { productTitle: row.product?.title || "-", skuId: row.id, stock: Number(row.stock || 0), remark: "低库存预警补货" });
  stockDialogVisible.value = true;
}
function handleAdjustSkuChange() {
  const sku = selectedAdjustSku();
  stockForm.stock = Number(sku?.stock || 0);
}
async function submitStockAdjust() {
  if (!requireOpenMerchant("调整库存", stockMerchant.value || selectedMerchant.value)) return;
  if (!stockForm.skuId) return ElMessage.error("请选择规格");
  if (!stockForm.remark.trim()) return ElMessage.error("请填写调整原因");
  stockAdjusting.value = true;
  try {
    await api.post(`/admin/mall/skus/${stockForm.skuId}/adjust-stock`, { stock: stockForm.stock, remark: stockForm.remark.trim() });
    ElMessage.success("库存已调整，流水已记录");
    stockDialogVisible.value = false;
    await loadProducts();
    await loadLowStock();
    if (inventoryDialogVisible.value) await loadInventoryLogs();
  } catch (error: any) {
    ElMessage.error(error.message || "调整库存失败");
  } finally {
    stockAdjusting.value = false;
  }
}
async function openLowStockDialog() {
  lowStockDialogVisible.value = true;
  await loadLowStock();
}
async function openRoutePanel() {
  if (blockInvalidMerchantLink()) return;
  const panel = String(route.query.panel || route.path.replace("/mall-", ""));
  if (panel === "product-audits") {
    filters.status = "pending_review";
    await loadProducts();
  }
  if (panel === "inventory") await openLowStockDialog();
  if (panel === "categories") openCategoryManagement();
  if (panel === "coupons") openCouponDialog();
}
function addSku() { form.skus.push({ name: "", price: 0, originalPrice: 0, stock: 0, enabled: true }); }
function removeSku(index: number) { if (form.skus.length > 1) form.skus.splice(index, 1); }
function openCouponDialog() {
  if (!requireOpenMerchant("运营优惠券")) return;
  resetCouponForm();
  couponDialogVisible.value = true;
  loadCoupons();
}
function resetCouponForm() {
  Object.assign(couponForm, { id: null, code: "", name: "", minAmount: 0, discountAmount: 0, usageLimit: 0, enabled: true, startsAt: null, endsAt: null });
}
function editCoupon(row: any) {
  Object.assign(couponForm, { id: row.id, code: row.code, name: row.name, minAmount: Number(row.minAmount || 0), discountAmount: Number(row.discountAmount || 0), usageLimit: Number(row.usageLimit || 0), enabled: row.enabled, startsAt: row.startsAt, endsAt: row.endsAt });
}
async function saveCoupon() {
  if (!requireOpenMerchant("运营优惠券")) return;
  if (!couponForm.code?.trim()) return ElMessage.error("请输入优惠券码");
  if (!couponForm.name?.trim()) return ElMessage.error("请输入优惠券名称");
  if (Number(couponForm.discountAmount || 0) <= 0) return ElMessage.error("优惠金额必须大于 0");
  couponSaving.value = true;
  try {
    const payload = { ...couponForm, code: couponForm.code.trim(), name: couponForm.name.trim(), ...currentMallParams() };
    if (couponForm.id) await api.patch(`/admin/mall/coupons/${couponForm.id}`, payload);
    else await api.post("/admin/mall/coupons", payload);
    ElMessage.success("优惠券已保存");
    resetCouponForm();
    await loadCoupons();
  } catch (error: any) {
    ElMessage.error(error.message || "保存优惠券失败");
  } finally {
    couponSaving.value = false;
  }
}
async function toggleCoupon(row: any) {
  if (!requireOpenMerchant("运营优惠券", rowMerchant(row))) return;
  try {
    await api.patch(`/admin/mall/coupons/${row.id}`, { ...row, tenantId: isPlatformAdmin() ? row.tenant?.id || filters.tenantId : undefined, merchantId: row.merchant?.id || filters.merchantId || undefined, enabled: !row.enabled });
    ElMessage.success(row.enabled ? "优惠券已停用" : "优惠券已启用");
    await loadCoupons();
  } catch (error: any) {
    ElMessage.error(error.message || "操作失败");
  }
}
async function approveProduct(row: any) {
  try {
    await ElMessageBox.confirm(`确认通过商品「${row.title}」的上架审核？通过后会在前台展示。`, "通过商品审核", { confirmButtonText: "通过", cancelButtonText: "取消", type: "success" });
    await api.post(`/admin/mall/products/${row.id}/approve`);
    ElMessage.success("商品审核已通过");
    await loadProducts();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(error.message || "商品审核通过失败");
  }
}
async function rejectProduct(row: any) {
  try {
    await ElMessageBox.confirm(`确认驳回商品「${row.title}」？商品会退回草稿，店铺可修改后重新提交。`, "驳回商品审核", { confirmButtonText: "驳回", cancelButtonText: "取消", type: "warning" });
    await api.post(`/admin/mall/products/${row.id}/reject`);
    ElMessage.success("商品已驳回为草稿");
    await loadProducts();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(error.message || "商品审核驳回失败");
  }
}
async function saveProduct() {
  if (!requireOpenMerchant("保存商品", formMerchant.value)) return;
  if (!form.title?.trim()) return ElMessage.error("请输入商品名称");
  if (!form.merchantId) return ElMessage.error("请选择要发布商品的店铺");
  saving.value = true;
  try {
    const submitStatus = normalizedProductStatus();
    const payload = { ...form, status: submitStatus, title: form.title.trim(), brandName: form.brandName?.trim() || undefined, sortOrder: Number(form.sortOrder || 0), tenantId: isPlatformAdmin() ? form.tenantId : undefined, merchantId: form.merchantId, categoryId: form.categoryId || null };
    if (form.id) await api.patch(`/admin/mall/products/${form.id}`, payload);
    else await api.post("/admin/mall/products", payload);
    ElMessage.success(submitStatus === "pending_review" && merchantProductAuditRequired(formMerchant.value) && !isPlatformAdmin() ? "商品已提交平台审核，通过后会在 H5/小程序展示。" : "商品已保存");
    productDialogVisible.value = false;
    await loadProducts();
  } catch (error: any) {
    ElMessage.error(error.message || "保存商品失败");
  } finally {
    saving.value = false;
  }
}
onMounted(async () => {
  await loadTenants();
  const merchantScopeReady = await loadMerchants();
  if (!merchantScopeReady) return;
  await loadCategories();
  await loadProducts();
  await loadLowStock();
  await openRoutePanel();
});
watch(() => [route.query.tenantId, route.query.merchantId, route.query.categoryId, route.query.keyword], async () => {
  filters.tenantId = routeTenantId();
  filters.merchantId = routeMerchantId();
  filters.categoryId = routeCategoryId();
  filters.keyword = routeKeyword();
  const merchantScopeReady = await loadMerchants();
  if (!merchantScopeReady) return;
  await loadCategories();
  await loadProducts();
  await loadLowStock();
  if (couponDialogVisible.value) loadCoupons();
  openRoutePanel();
});
watch(() => [route.path, route.query.panel], () => {
  openRoutePanel();
});
</script>

<style scoped>
.mall-page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
.page-header p { margin: 6px 0 0; color: #64748b; }
.header-actions { display: flex; gap: 10px; align-items: center; }
.filter-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
.deep-link-alert { margin-bottom: 16px; }
.merchant-disabled-alert { margin-bottom: 16px; }
.merchant-context-card { margin-bottom: 16px; border-color: #dbeafe; background: linear-gradient(135deg, #eff6ff, #fff); }
.merchant-context-card :deep(.el-card__body) { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; }
.merchant-context-main { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.merchant-context-main strong { color: #0f172a; }
.merchant-context-main p { margin: 4px 0 0; color: #64748b; }
.merchant-context-tags, .merchant-context-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.low-stock-alert { margin-bottom: 16px; }
.product-cell { display: flex; align-items: center; gap: 12px; }
.product-cell img, .cover-placeholder { width: 54px; height: 54px; border-radius: 12px; object-fit: cover; background: #f1f5f9; display: grid; place-items: center; color: #9a3412; font-weight: 800; }
.product-cell small { display: block; margin-top: 4px; color: #64748b; }
.el-table small { display: block; margin-top: 4px; color: #64748b; }
.form-hint { margin-left: 10px; color: #94a3b8; font-size: 12px; }
.sku-row { display: grid; grid-template-columns: 1.3fr 130px 130px 120px 70px 64px; gap: 8px; align-items: center; margin-bottom: 10px; }
.coupon-toolbar { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.coupon-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 14px; align-items: center; }
.inventory-toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
</style>
