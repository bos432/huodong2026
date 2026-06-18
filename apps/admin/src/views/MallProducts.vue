<template>
  <div class="mall-page">
    <div class="page-header">
      <div>
        <h2>商城商品</h2>
        <p>管理商品分类、SKU、价格、库存和上下架。商品按商家隔离，前台只展示已上架商品。</p>
      </div>
      <div class="header-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="选择商家" style="width: 220px" @change="handleTenantChange">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-button @click="categoryDialogVisible = true">分类管理</el-button>
        <el-button @click="openCouponDialog">优惠券</el-button>
        <el-button :type="lowStockItems.length ? 'danger' : 'default'" @click="openLowStockDialog">低库存提醒{{ lowStockItems.length ? `（${lowStockItems.length}）` : "" }}</el-button>
        <el-button @click="exportProductSales">导出销售统计</el-button>
        <el-button type="primary" @click="createProduct">新增商品</el-button>
      </div>
    </div>

    <div class="filter-bar">
      <el-select v-model="filters.categoryId" clearable placeholder="全部分类" style="width: 160px" @change="applyProductFilters">
        <el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
      <el-select v-model="filters.status" clearable placeholder="全部状态" style="width: 140px" @change="applyProductFilters">
        <el-option label="草稿" value="draft" />
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
          <el-button size="small" @click="editProduct(row)">编辑</el-button>
          <el-button size="small" type="warning" plain @click="openStockAdjust(row)">调整库存</el-button>
          <el-button size="small" @click="openInventoryLogs(row)">库存流水</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="productDialogVisible" :title="form.id ? '编辑商品' : '新增商品'" width="760px" destroy-on-close>
      <el-form label-width="96px">
        <el-form-item v-if="isPlatformAdmin()" label="所属商家" required>
          <el-select v-model="form.tenantId" filterable placeholder="请选择商家" @change="loadCategories">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="商品名称" required><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="品牌名称"><el-input v-model="form.brandName" placeholder="如七维书院严选/合作品牌" /></el-form-item>
        <el-form-item label="分类"><el-select v-model="form.categoryId" clearable placeholder="未分类"><el-option v-for="item in categories" :key="item.id" :label="item.name" :value="item.id" /></el-select></el-form-item>
        <el-form-item label="封面图"><el-input v-model="form.coverUrl" placeholder="图片 URL，后续可接上传组件" /></el-form-item>
        <el-form-item label="商品介绍"><el-input v-model="form.description" type="textarea" :rows="4" /></el-form-item>
        <el-form-item label="状态"><el-select v-model="form.status"><el-option label="草稿" value="draft" /><el-option label="已上架" value="published" /><el-option label="已下架" value="offline" /></el-select></el-form-item>
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
        <el-button type="primary" :loading="saving" @click="saveProduct">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="categoryDialogVisible" title="商城分类" width="760px">
      <div class="category-header">
        <el-input v-model="categoryForm.name" placeholder="分类名称" />
        <el-input v-model="categoryForm.iconUrl" placeholder="图标 URL，可选" />
        <el-input-number v-model="categoryForm.sortOrder" :precision="0" placeholder="排序" />
        <el-button type="primary" @click="saveCategory">新增分类</el-button>
      </div>
      <el-table :data="categories" size="small">
        <el-table-column label="分类名称" min-width="150">
          <template #default="{ row }"><el-input v-model="row.name" /></template>
        </el-table-column>
        <el-table-column label="图标 URL" min-width="220">
          <template #default="{ row }"><el-input v-model="row.iconUrl" placeholder="可选" /></template>
        </el-table-column>
        <el-table-column label="排序" width="110">
          <template #default="{ row }"><el-input-number v-model="row.sortOrder" :precision="0" /></template>
        </el-table-column>
        <el-table-column label="启用" width="80">
          <template #default="{ row }"><el-switch v-model="row.enabled" /></template>
        </el-table-column>
        <el-table-column label="操作" width="90">
          <template #default="{ row }"><el-button size="small" type="primary" @click="updateCategory(row)">保存</el-button></template>
        </el-table-column>
      </el-table>
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
        <el-button type="primary" :loading="couponSaving" @click="saveCoupon">{{ couponForm.id ? "保存优惠券" : "新增优惠券" }}</el-button>
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
            <el-button size="small" :type="row.enabled ? 'warning' : 'success'" plain @click="toggleCoupon(row)">{{ row.enabled ? "停用" : "启用" }}</el-button>
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
          <template #default="{ row }"><el-button size="small" type="warning" plain @click="openLowStockAdjust(row)">调整库存</el-button></template>
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
        <el-button type="primary" :loading="stockAdjusting" @click="submitStockAdjust">确认调整</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { api, downloadFile } from "../api";
import { isPlatformAdmin } from "../permissions";

const route = useRoute();
const router = useRouter();
const products = ref<any[]>([]);
const categories = ref<any[]>([]);
const tenants = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const productDialogVisible = ref(false);
const categoryDialogVisible = ref(false);
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
const lowStockThreshold = ref(10);
const routeTenantId = () => {
  const id = typeof route.query.tenantId === "string" ? Number(route.query.tenantId) : 0;
  return isPlatformAdmin() && id ? id : undefined;
};
const filters = reactive({ tenantId: routeTenantId() as number | undefined, categoryId: undefined as number | undefined, status: "", keyword: "" });
const categoryForm = reactive({ name: "", iconUrl: "", sortOrder: 0 });
const couponFilters = reactive({ keyword: "", enabled: "", status: "" });
const couponForm = reactive<any>({ id: null, code: "", name: "", minAmount: 0, discountAmount: 0, usageLimit: 0, enabled: true, startsAt: null, endsAt: null });
const form = reactive<any>({ skus: [] });
const inventoryFilters = reactive({ tenantId: undefined as number | undefined, skuId: undefined as number | undefined, keyword: "" });
const stockForm = reactive({ productTitle: "", skuId: undefined as number | undefined, stock: 0, remark: "" });

function tenantLabel(tenant: any) { return `${tenant.name || tenant.code}（${tenant.code}）`; }
function money(value: any) { return Number(value || 0).toFixed(2); }
function statusText(status: string) { return ({ draft: "草稿", published: "已上架", offline: "已下架" } as any)[status] || status; }
function couponStatusText(status: string) { return ({ active: "可使用", not_started: "未开始", expired: "已过期", exhausted: "已用完", disabled: "已停用" } as any)[status] || status || "-"; }
function couponStatusTag(status: string) { return ({ active: "success", not_started: "warning", expired: "info", exhausted: "danger", disabled: "info" } as any)[status] || "info"; }
function inventoryTypeText(type: string) { return ({ lock: "锁定", release: "释放", deduct: "扣减", return: "回补", adjust: "调整" } as any)[type] || type; }
function formatTime(value: any) { return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "-"; }
function formatDate(value: any) { return value ? new Date(value).toLocaleDateString("zh-CN") : "长期"; }

async function loadTenants() {
  tenants.value = isPlatformAdmin() ? await api.get<any, any[]>("/admin/tenants") : [];
}
async function loadCategories() {
  if (isPlatformAdmin() && !(form.tenantId || filters.tenantId)) {
    categories.value = [];
    return;
  }
  categories.value = await api.get<any, any[]>("/admin/mall/categories", { params: { tenantId: isPlatformAdmin() ? form.tenantId || filters.tenantId : undefined } });
}
async function loadProducts() {
  loading.value = true;
  try {
    const result = await api.get<any, any>("/admin/mall/products", {
      params: {
        tenantId: isPlatformAdmin() ? filters.tenantId : undefined,
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
  await loadProducts();
  await loadLowStock();
}
async function loadLowStock() {
  try {
    const result = await api.get<any, any>("/admin/mall/products/low-stock", {
      params: {
        tenantId: isPlatformAdmin() ? filters.tenantId : undefined,
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
  couponLoading.value = true;
  try {
    coupons.value = await api.get<any, any[]>("/admin/mall/coupons", { params: { tenantId: isPlatformAdmin() ? filters.tenantId : undefined, keyword: couponFilters.keyword.trim() || undefined, enabled: couponFilters.enabled || undefined, status: couponFilters.status || undefined } });
  } catch (error: any) {
    ElMessage.error(error.message || "加载优惠券失败");
  } finally {
    couponLoading.value = false;
  }
}
async function exportProductSales() {
  try {
    const params = new URLSearchParams();
    if (isPlatformAdmin() && filters.tenantId) params.set("tenantId", String(filters.tenantId));
    if (filters.categoryId) params.set("categoryId", String(filters.categoryId));
    if (filters.status) params.set("status", filters.status);
    if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
    await downloadFile(`/admin/mall/products/export-sales?${params.toString()}`, "mall-product-sales.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出销售统计失败");
  }
}
function handleTenantChange() {
  const query = { ...route.query };
  if (filters.tenantId) query.tenantId = String(filters.tenantId);
  else delete query.tenantId;
  router.replace({ path: route.path, query });
  filters.categoryId = undefined;
  loadCategories();
  loadProducts();
  if (couponDialogVisible.value) loadCoupons();
}
function resetForm() {
  Object.assign(form, { id: null, tenantId: filters.tenantId, title: "", brandName: "", categoryId: undefined, coverUrl: "", description: "", status: "draft", featured: false, sortOrder: 0, deliveryNote: "默认快递发货，偏远地区请联系客服", afterSaleNote: "支持未发货退款，已发货请联系书院处理", skus: [{ name: "默认规格", price: 0, originalPrice: 0, stock: 100, enabled: true }] });
}
function createProduct() {
  resetForm();
  productDialogVisible.value = true;
  loadCategories();
}
function editProduct(row: any) {
  Object.assign(form, { ...row, tenantId: row.tenant?.id, categoryId: row.category?.id, skus: (row.skus || []).map((sku: any) => ({ ...sku, price: Number(sku.price), originalPrice: Number(sku.originalPrice), stock: Number(sku.stock) })) });
  productDialogVisible.value = true;
  loadCategories();
}
async function openInventoryLogs(row: any) {
  inventorySkus.value = row.skus || [];
  inventoryFilters.tenantId = row.tenant?.id || filters.tenantId;
  inventoryFilters.skuId = inventorySkus.value[0]?.id;
  inventoryFilters.keyword = "";
  inventoryDialogVisible.value = true;
  await loadInventoryLogs();
}
async function loadInventoryLogs() {
  try {
    inventoryLogs.value = await api.get<any, any[]>("/admin/mall/inventory-logs", {
      params: {
        tenantId: isPlatformAdmin() ? inventoryFilters.tenantId : undefined,
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
  stockSkus.value = row.skus || [];
  const firstSku = stockSkus.value[0];
  Object.assign(stockForm, { productTitle: row.title, skuId: firstSku?.id, stock: Number(firstSku?.stock || 0), remark: "" });
  stockDialogVisible.value = true;
}
function openLowStockAdjust(row: any) {
  stockSkus.value = [{ ...row, product: row.product }];
  Object.assign(stockForm, { productTitle: row.product?.title || "-", skuId: row.id, stock: Number(row.stock || 0), remark: "低库存预警补货" });
  stockDialogVisible.value = true;
}
function handleAdjustSkuChange() {
  const sku = selectedAdjustSku();
  stockForm.stock = Number(sku?.stock || 0);
}
async function submitStockAdjust() {
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
function addSku() { form.skus.push({ name: "", price: 0, originalPrice: 0, stock: 0, enabled: true }); }
function removeSku(index: number) { if (form.skus.length > 1) form.skus.splice(index, 1); }
function openCouponDialog() {
  if (isPlatformAdmin() && !filters.tenantId) return ElMessage.error("请先在顶部选择商家，再管理该商家的优惠券");
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
  if (!couponForm.code?.trim()) return ElMessage.error("请输入优惠券码");
  if (!couponForm.name?.trim()) return ElMessage.error("请输入优惠券名称");
  if (Number(couponForm.discountAmount || 0) <= 0) return ElMessage.error("优惠金额必须大于 0");
  couponSaving.value = true;
  try {
    const payload = { ...couponForm, code: couponForm.code.trim(), name: couponForm.name.trim(), tenantId: isPlatformAdmin() ? filters.tenantId : undefined };
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
  try {
    await api.patch(`/admin/mall/coupons/${row.id}`, { ...row, tenantId: isPlatformAdmin() ? row.tenant?.id || filters.tenantId : undefined, enabled: !row.enabled });
    ElMessage.success(row.enabled ? "优惠券已停用" : "优惠券已启用");
    await loadCoupons();
  } catch (error: any) {
    ElMessage.error(error.message || "操作失败");
  }
}
async function saveProduct() {
  if (!form.title?.trim()) return ElMessage.error("请输入商品名称");
  if (isPlatformAdmin() && !form.tenantId) return ElMessage.error("请选择所属商家");
  saving.value = true;
  try {
    const payload = { ...form, title: form.title.trim(), brandName: form.brandName?.trim() || undefined, sortOrder: Number(form.sortOrder || 0), tenantId: isPlatformAdmin() ? form.tenantId : undefined, categoryId: form.categoryId || null };
    if (form.id) await api.patch(`/admin/mall/products/${form.id}`, payload);
    else await api.post("/admin/mall/products", payload);
    ElMessage.success("商品已保存");
    productDialogVisible.value = false;
    await loadProducts();
  } catch (error: any) {
    ElMessage.error(error.message || "保存商品失败");
  } finally {
    saving.value = false;
  }
}
async function saveCategory() {
  if (!categoryForm.name.trim()) return ElMessage.error("请输入分类名称");
  if (isPlatformAdmin() && !filters.tenantId) return ElMessage.error("请先在顶部选择商家");
  try {
    await api.post("/admin/mall/categories", { name: categoryForm.name.trim(), iconUrl: categoryForm.iconUrl.trim() || undefined, sortOrder: Number(categoryForm.sortOrder || 0), tenantId: isPlatformAdmin() ? filters.tenantId : undefined });
    Object.assign(categoryForm, { name: "", iconUrl: "", sortOrder: 0 });
    await loadCategories();
    ElMessage.success("分类已新增");
  } catch (error: any) {
    ElMessage.error(error.message || "新增分类失败");
  }
}
async function updateCategory(row: any) {
  if (!row.name?.trim()) return ElMessage.error("请输入分类名称");
  try {
    await api.patch(`/admin/mall/categories/${row.id}`, { name: row.name.trim(), iconUrl: row.iconUrl || undefined, sortOrder: Number(row.sortOrder || 0), enabled: row.enabled, tenantId: isPlatformAdmin() ? row.tenant?.id || filters.tenantId : undefined });
    await loadCategories();
    await loadProducts();
    ElMessage.success("分类已保存");
  } catch (error: any) {
    ElMessage.error(error.message || "保存分类失败");
  }
}

onMounted(async () => {
  await loadTenants();
  await loadCategories();
  await loadProducts();
  await loadLowStock();
});
watch(() => route.query.tenantId, () => {
  filters.tenantId = routeTenantId();
  loadCategories();
  loadProducts();
  loadLowStock();
  if (couponDialogVisible.value) loadCoupons();
});
</script>

<style scoped>
.mall-page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
.page-header p { margin: 6px 0 0; color: #64748b; }
.header-actions { display: flex; gap: 10px; align-items: center; }
.filter-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
.low-stock-alert { margin-bottom: 16px; }
.product-cell { display: flex; align-items: center; gap: 12px; }
.product-cell img, .cover-placeholder { width: 54px; height: 54px; border-radius: 12px; object-fit: cover; background: #f1f5f9; display: grid; place-items: center; color: #9a3412; font-weight: 800; }
.product-cell small { display: block; margin-top: 4px; color: #64748b; }
.el-table small { display: block; margin-top: 4px; color: #64748b; }
.form-hint { margin-left: 10px; color: #94a3b8; font-size: 12px; }
.sku-row { display: grid; grid-template-columns: 1.3fr 130px 130px 120px 70px 64px; gap: 8px; align-items: center; margin-bottom: 10px; }
.category-header { display: grid; grid-template-columns: minmax(140px, 1fr) minmax(180px, 1.4fr) 120px auto; gap: 10px; margin-bottom: 12px; align-items: center; }
.coupon-toolbar { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.coupon-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 14px; align-items: center; }
.inventory-toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
</style>
