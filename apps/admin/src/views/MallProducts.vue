<template>
  <div class="mall-page">
    <div class="page-header">
      <div>
        <h2>{{ pageTitle }}</h2>
        <p>{{ pageSubtitle }}</p>
      </div>
      <div class="header-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="选择商家" style="width: 220px" :disabled="scopedMutationPending" @change="handleTenantChange">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-select v-model="filters.merchantId" clearable filterable placeholder="全部店铺" style="width: 220px" :disabled="scopedMutationPending" @change="handleMerchantChange">
          <el-option v-for="merchant in merchants" :key="merchant.id" :label="merchantLabel(merchant)" :value="merchant.id" />
        </el-select>
        <el-button @click="openCategoryManagement">店铺分类</el-button>
        <el-button v-if="isPlatformAdmin()" @click="catalogDialogVisible = true">平台类目 / 品牌</el-button>
        <el-button :disabled="selectedMerchant && !selectedMerchantOpen" @click="openCouponDialog">优惠券</el-button>
        <el-button :type="lowStockItems.length ? 'danger' : 'default'" @click="openLowStockDialog">低库存提醒{{ lowStockItems.length ? `（${lowStockItems.length}）` : "" }}</el-button>
        <el-button :type="inventoryAnomalyOpenCount ? 'danger' : 'default'" @click="openInventoryGovernance">库存治理{{ inventoryAnomalyOpenCount ? `（${inventoryAnomalyOpenCount}）` : "" }}</el-button>
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
    <el-alert v-if="scopeError" class="page-error" type="error" show-icon :closable="false" title="商城商品店铺范围同步失败" aria-live="assertive">
      <template #default><p>{{ scopeError }}</p><el-button size="small" @click="reloadProductScope">重新同步店铺范围</el-button></template>
    </el-alert>

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
      <el-select v-model="filters.platformCategoryId" clearable placeholder="全部平台类目" style="width: 170px" @change="applyProductFilters">
        <el-option v-for="item in platformCategories" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
      <el-select v-model="filters.brandId" clearable placeholder="全部品牌" style="width: 160px" @change="applyProductFilters">
        <el-option v-for="item in brands" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
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

    <el-alert v-if="catalogError" class="page-error" type="error" show-icon :closable="false" title="商品分类与品牌选项加载失败" aria-live="assertive">
      <template #default><p>{{ catalogError }}</p><el-button size="small" @click="loadCategories">重新加载分类与品牌</el-button></template>
    </el-alert>

    <el-alert v-if="lowStockError" class="page-error" type="error" show-icon :closable="false" title="低库存提醒加载失败" aria-live="assertive">
      <template #default><p>{{ lowStockError }}</p><el-button size="small" @click="loadLowStock">重新加载低库存</el-button></template>
    </el-alert>

    <el-alert v-if="lowStockItems.length" type="warning" show-icon :closable="false" class="low-stock-alert">
      <template #title>
        当前有 {{ lowStockItems.length }} 个上架规格可售库存低于 {{ lowStockThreshold }} 件，建议及时补货或下架。
      </template>
    </el-alert>

    <el-alert v-if="productError" class="page-error" type="error" show-icon :closable="false" title="商城商品加载失败" aria-live="assertive">
      <template #default><p>{{ productError }}</p><el-button size="small" :loading="loading" @click="loadProducts">重新加载商品</el-button></template>
    </el-alert>
    <el-table v-loading="loading" :data="products" stripe>
      <el-table-column label="商品" min-width="260">
        <template #default="{ row }">
          <div class="product-cell">
            <img v-if="row.coverUrl" :src="row.coverUrl" alt="" />
            <div v-else class="cover-placeholder">商</div>
            <div>
              <strong>{{ row.title }}</strong>
              <small>{{ row.productCode || `P${row.id}` }} · {{ row.brand?.name || row.brandName || "未设品牌" }} · {{ row.platformCategory?.name || "未设平台类目" }}</small>
              <small>{{ row.category?.name || "未设店铺分类" }} · 库存 {{ row.stock || 0 }}</small>
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
      <el-table-column label="操作" width="370" fixed="right">
        <template #default="{ row }">
          <el-button v-if="canAuditProducts && row.status === 'pending_review'" size="small" type="success" @click="approveProduct(row)">通过</el-button>
          <el-button v-if="canAuditProducts && row.status === 'pending_review'" size="small" type="danger" plain @click="rejectProduct(row)">驳回</el-button>
          <el-button size="small" :disabled="!rowMerchantOperational(row)" @click="editProduct(row)">编辑</el-button>
          <el-button size="small" type="warning" plain :disabled="!rowMerchantOperational(row)" @click="openStockAdjust(row)">调整库存</el-button>
          <el-button size="small" @click="openInventoryLogs(row)">库存流水</el-button>
          <el-button size="small" @click="openAuditHistory(row)">审核记录</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="productDialogVisible" :title="form.id ? '编辑商品' : '新增商品'" width="1040px" destroy-on-close @closed="closeProductDialog">
      <el-alert v-if="productFormError" class="dialog-error" type="error" show-icon :closable="false" title="商品详情或选项加载失败" aria-live="assertive">
        <template #default><p>{{ productFormError }}</p><el-button v-if="productFormTarget?.id" size="small" :loading="productFormLoading" @click="reloadProductForm">重新加载商品详情</el-button></template>
      </el-alert>
      <el-form v-loading="productFormLoading" label-width="96px">
        <el-form-item v-if="isPlatformAdmin()" label="所属商家" required>
          <el-select v-model="form.tenantId" filterable placeholder="请选择商家" :disabled="!!form.id" @change="handleFormTenantChange">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="所属店铺" required>
          <el-select v-model="form.merchantId" filterable placeholder="请选择要发布商品的店铺" :disabled="!!form.id" @change="handleFormMerchantChange">
            <el-option v-for="merchant in formMerchants" :key="merchant.id" :label="merchantLabel(merchant)" :value="merchant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="SPU 编码" required><el-input v-model="form.productCode" maxlength="80" placeholder="店铺内唯一，如 TEA-GIFT-001" /></el-form-item>
        <el-form-item label="商品名称" required><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="品牌"><el-select v-model="form.brandId" clearable filterable placeholder="选择平台品牌"><el-option v-for="item in formBrands" :key="item.id" :label="`${item.name}（${item.code}）`" :value="item.id" /></el-select></el-form-item>
        <el-form-item label="平台类目"><el-select v-model="form.platformCategoryId" clearable filterable placeholder="选择平台标准类目"><el-option v-for="item in formPlatformCategories" :key="item.id" :label="item.parent ? `${item.parent.name} / ${item.name}` : item.name" :value="item.id" /></el-select></el-form-item>
        <el-form-item label="店铺分类"><el-select v-model="form.categoryId" clearable placeholder="未分类"><el-option v-for="item in formCategories" :key="item.id" :label="item.name" :value="item.id" /></el-select></el-form-item>
        <el-form-item label="封面图"><el-input v-model="form.coverUrl" placeholder="图片 URL，后续可接上传组件" /></el-form-item>
        <el-form-item label="商品图集"><el-input v-model="form.galleryUrlsText" type="textarea" :rows="3" placeholder="每行一个图片 URL，最多 20 张" /></el-form-item>
        <el-form-item label="SPU 属性"><el-input v-model="form.attributesText" type="textarea" :rows="3" placeholder='JSON 对象，如 {"材质":"陶瓷","产地":"景德镇"}' /></el-form-item>
        <el-form-item label="商品介绍"><el-input v-model="form.description" type="textarea" :rows="4" /></el-form-item>
        <el-alert v-if="form.reviewRemark" type="warning" show-icon :closable="false" :title="`最近审核意见：${form.reviewRemark}`" />
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
          <el-input v-model="sku.skuCode" placeholder="SKU 编码" />
          <el-input v-model="sku.barcode" placeholder="商品条码" />
          <el-input v-model="sku.attributesText" placeholder='规格属性 JSON' />
          <el-input-number v-model="sku.weightGrams" :min="0" :precision="0" placeholder="重量克" />
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
        <el-button type="primary" :loading="saving" :disabled="!!productFormError || productFormLoading || (formMerchant && !merchantOperational(formMerchant))" @click="saveProduct">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="auditHistoryVisible" :title="`${auditProduct?.title || '商品'} · 审核记录`" width="860px" @closed="closeAuditHistory">
      <el-alert v-if="auditHistoryError" class="dialog-error" type="error" show-icon :closable="false" title="审核记录加载失败" aria-live="assertive">
        <template #default><p>{{ auditHistoryError }}</p><el-button size="small" :loading="auditHistoryLoading" @click="loadAuditHistory">重新加载审核记录</el-button></template>
      </el-alert>
      <el-table v-loading="auditHistoryLoading" :data="auditHistory" stripe empty-text="暂无审核记录">
        <el-table-column label="动作" width="100"><template #default="{ row }">{{ auditActionText(row.action) }}</template></el-table-column>
        <el-table-column label="状态变化" width="170"><template #default="{ row }">{{ statusText(row.fromStatus) }} → {{ statusText(row.toStatus) }}</template></el-table-column>
        <el-table-column prop="remark" label="审核说明" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作人" width="140"><template #default="{ row }">{{ row.operatorName || "系统" }}</template></el-table-column>
        <el-table-column label="时间" width="180"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="catalogDialogVisible" title="平台类目与品牌" width="980px">
      <el-alert v-if="!catalogTenantId" type="info" show-icon :closable="false" title="请先在页面顶部选择一个商家，再维护该商家的平台类目和品牌。" />
      <el-tabs v-model="catalogTab">
        <el-tab-pane label="平台类目" name="categories">
          <div class="catalog-form">
            <el-input v-model="platformCategoryForm.code" placeholder="类目编码" />
            <el-input v-model="platformCategoryForm.name" placeholder="类目名称" />
            <el-select v-model="platformCategoryForm.parentId" clearable placeholder="上级类目"><el-option v-for="item in platformCategories" :key="item.id" :label="item.name" :value="item.id" /></el-select>
            <el-input-number v-model="platformCategoryForm.sortOrder" :precision="0" placeholder="排序" />
            <el-button type="primary" :disabled="!catalogTenantId" :loading="catalogSaving" @click="savePlatformCategory">新增类目</el-button>
          </div>
          <el-table :data="platformCategories" size="small" stripe>
            <el-table-column prop="code" label="编码" width="150" />
            <el-table-column prop="name" label="名称" min-width="180" />
            <el-table-column label="上级" width="160"><template #default="{ row }">{{ row.parent?.name || "-" }}</template></el-table-column>
            <el-table-column prop="sortOrder" label="排序" width="90" />
            <el-table-column label="状态" width="90"><template #default="{ row }">{{ row.enabled === false ? "停用" : "启用" }}</template></el-table-column>
          </el-table>
        </el-tab-pane>
        <el-tab-pane label="品牌" name="brands">
          <div class="catalog-form">
            <el-input v-model="brandForm.code" placeholder="品牌编码" />
            <el-input v-model="brandForm.name" placeholder="品牌名称" />
            <el-input v-model="brandForm.logoUrl" placeholder="Logo URL" />
            <el-input-number v-model="brandForm.sortOrder" :precision="0" placeholder="排序" />
            <el-button type="primary" :disabled="!catalogTenantId" :loading="catalogSaving" @click="saveBrand">新增品牌</el-button>
          </div>
          <el-table :data="brands" size="small" stripe>
            <el-table-column prop="code" label="编码" width="150" />
            <el-table-column prop="name" label="名称" min-width="180" />
            <el-table-column prop="description" label="说明" min-width="220" show-overflow-tooltip />
            <el-table-column prop="sortOrder" label="排序" width="90" />
            <el-table-column label="状态" width="90"><template #default="{ row }">{{ row.status === "disabled" ? "停用" : "启用" }}</template></el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

    <el-dialog v-model="couponDialogVisible" title="商城优惠券" width="980px" @closed="closeCouponDialog">
      <el-alert v-if="couponError" class="dialog-error" type="error" show-icon :closable="false" title="优惠券加载失败" aria-live="assertive">
        <template #default><p>{{ couponError }}</p><el-button size="small" :loading="couponLoading" @click="loadCoupons">重新加载优惠券</el-button></template>
      </el-alert>
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
        <el-button type="primary" :loading="couponSaving" :disabled="!!couponError || (selectedMerchant && !selectedMerchantOpen)" @click="saveCoupon">{{ couponForm.id ? "保存优惠券" : "新增优惠券" }}</el-button>
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

    <el-dialog v-model="inventoryDialogVisible" :title="`${inventoryProduct?.title || '商品'} · 库存流水`" width="860px" @closed="closeInventoryLogs">
      <el-alert v-if="inventoryLogsError" class="dialog-error" type="error" show-icon :closable="false" title="库存流水加载失败" aria-live="assertive">
        <template #default><p>{{ inventoryLogsError }}</p><el-button size="small" :loading="inventoryLogsLoading" @click="loadInventoryLogs">重新加载库存流水</el-button></template>
      </el-alert>
      <div class="inventory-toolbar">
        <el-select v-model="inventoryFilters.skuId" placeholder="选择规格" style="width:220px" @change="loadInventoryLogs">
          <el-option v-for="sku in inventorySkus" :key="sku.id" :label="`${sku.name}（库存 ${sku.stock}，锁定 ${sku.lockedStock}）`" :value="sku.id" />
        </el-select>
        <el-input v-model="inventoryFilters.keyword" clearable placeholder="订单号/商品/规格" style="width:240px" @keyup.enter="loadInventoryLogs" @clear="loadInventoryLogs" />
        <el-button @click="loadInventoryLogs">刷新</el-button>
      </div>
      <el-table v-loading="inventoryLogsLoading" :data="inventoryLogs" size="small" border>
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

    <el-dialog v-model="inventoryGovernanceVisible" title="库存一致性治理" width="1080px">
      <el-alert v-if="inventoryAnomalyError" class="dialog-error" type="error" show-icon :closable="false" title="库存异常加载失败" aria-live="assertive">
        <template #default><p>{{ inventoryAnomalyError }}</p><el-button size="small" :loading="inventoryAnomalyLoading" @click="loadInventoryAnomalies">重新加载库存异常</el-button></template>
      </el-alert>
      <div class="inventory-toolbar">
        <el-select v-model="inventoryAnomalyStatus" style="width: 140px" @change="loadInventoryAnomalies">
          <el-option label="待处理" value="open" />
          <el-option label="已修复" value="resolved" />
          <el-option label="已忽略" value="ignored" />
        </el-select>
        <el-input v-model="inventoryAnomalyKeyword" clearable placeholder="商品、规格或异常说明" style="width: 260px" @keyup.enter="loadInventoryAnomalies" @clear="loadInventoryAnomalies" />
        <el-button @click="loadInventoryAnomalies">刷新</el-button>
        <el-button type="primary" :loading="inventoryScanning" @click="scanInventoryAnomalies">立即扫描</el-button>
        <span class="form-hint">扫描会核对 SKU、待支付订单锁定量、秒杀和拼团库存，不会自动改数。</span>
      </div>
      <el-table v-loading="inventoryAnomalyLoading" :data="inventoryAnomalies" size="small" border>
        <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.status === 'open' ? 'danger' : row.status === 'resolved' ? 'success' : 'info'">{{ inventoryAnomalyStatusText(row.status) }}</el-tag></template></el-table-column>
        <el-table-column label="异常" min-width="220"><template #default="{ row }"><strong>{{ row.title }}</strong><small>{{ row.message }}</small></template></el-table-column>
        <el-table-column label="商品/规格" min-width="190"><template #default="{ row }">{{ row.sku?.product?.title || row.sourceType }}<small>{{ row.sku?.name || `#${row.sourceId}` }}</small></template></el-table-column>
        <el-table-column label="当前值" min-width="170"><template #default="{ row }"><code>{{ compactState(row.actualState) }}</code></template></el-table-column>
        <el-table-column label="建议值" min-width="170"><template #default="{ row }"><code>{{ compactState(row.expectedState) }}</code></template></el-table-column>
        <el-table-column label="发现时间" width="170"><template #default="{ row }">{{ formatTime(row.lastDetectedAt) }}<small>累计 {{ row.occurrenceCount || 1 }} 次</small></template></el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === 'open'" size="small" type="primary" @click="resolveInventoryAnomaly(row, 'repair')">修复</el-button>
            <el-button v-if="row.status === 'open'" size="small" @click="resolveInventoryAnomaly(row, 'ignore')">忽略</el-button>
            <span v-else>{{ row.resolutionRemark || "-" }}</span>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="stockDialogVisible" title="调整 SKU 库存" width="520px" @closed="closeStockDialog">
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
const platformCategories = ref<any[]>([]);
const brands = ref<any[]>([]);
const formCategories = ref<any[]>([]);
const formPlatformCategories = ref<any[]>([]);
const formBrands = ref<any[]>([]);
const tenants = ref<any[]>([]);
const merchants = ref<any[]>([]);
const loading = ref(false);
const saving = ref(false);
const productDialogVisible = ref(false);
const productFormLoading = ref(false);
const productFormTarget = ref<{ id: number; tenantId: number; merchantId: number } | null>(null);
const formMerchantOptions = ref<any[]>([]);
const catalogDialogVisible = ref(false);
const auditHistoryVisible = ref(false);
const auditHistoryLoading = ref(false);
const auditHistory = ref<any[]>([]);
const auditProduct = ref<any | null>(null);
const catalogSaving = ref(false);
const catalogTab = ref("categories");
const platformCategoryForm = reactive({ code: "", name: "", parentId: undefined as number | undefined, sortOrder: 0 });
const brandForm = reactive({ code: "", name: "", logoUrl: "", sortOrder: 0 });
const couponDialogVisible = ref(false);
const couponTarget = ref<{ tenantId: number; merchantId: number } | null>(null);
const inventoryDialogVisible = ref(false);
const lowStockDialogVisible = ref(false);
const inventoryGovernanceVisible = ref(false);
const stockDialogVisible = ref(false);
const inventoryAnomalyLoading = ref(false);
const inventoryScanning = ref(false);
const stockAdjusting = ref(false);
const couponSaving = ref(false);
const couponLoading = ref(false);
const inventoryLogsLoading = ref(false);
const inventoryLogs = ref<any[]>([]);
const inventoryProduct = ref<any | null>(null);
const coupons = ref<any[]>([]);
const lowStockItems = ref<any[]>([]);
const inventoryAnomalies = ref<any[]>([]);
const inventoryAnomalyOpenCount = ref(0);
const inventoryAnomalyStatus = ref("open");
const inventoryAnomalyKeyword = ref("");
const inventorySkus = ref<any[]>([]);
const stockSkus = ref<any[]>([]);
const stockMerchant = ref<any | null>(null);
const stockTarget = ref<{ productId: number; tenantId: number; merchantId: number; skuIds: number[] } | null>(null);
const lowStockThreshold = ref(10);
const deepLinkWarning = ref("");
const scopeError = ref("");
const catalogError = ref("");
const productError = ref("");
const lowStockError = ref("");
const inventoryAnomalyError = ref("");
const productFormError = ref("");
const couponError = ref("");
const inventoryLogsError = ref("");
const auditHistoryError = ref("");
let scopeLoadSequence = 0;
let catalogLoadSequence = 0;
let productLoadSequence = 0;
let lowStockLoadSequence = 0;
let inventoryAnomalyLoadSequence = 0;
let productFormLoadSequence = 0;
let formMerchantLoadSequence = 0;
let couponLoadSequence = 0;
let inventoryLogLoadSequence = 0;
let auditHistoryLoadSequence = 0;
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
const filters = reactive({ tenantId: routeTenantId() as number | undefined, merchantId: routeMerchantId() as number | undefined, categoryId: routeCategoryId() as number | undefined, platformCategoryId: undefined as number | undefined, brandId: undefined as number | undefined, status: "", keyword: routeKeyword() });
const couponFilters = reactive({ keyword: "", enabled: "", status: "" });
const couponForm = reactive<any>({ id: null, code: "", name: "", minAmount: 0, discountAmount: 0, usageLimit: 0, enabled: true, startsAt: null, endsAt: null });
const form = reactive<any>({ skus: [] });
const inventoryFilters = reactive({ tenantId: undefined as number | undefined, merchantId: undefined as number | undefined, skuId: undefined as number | undefined, keyword: "" });
const stockForm = reactive({ productTitle: "", skuId: undefined as number | undefined, stock: 0, remark: "", businessKey: "" });
const selectedMerchant = computed(() => merchants.value.find((merchant) => merchant.id === filters.merchantId));
const formMerchants = computed(() => formMerchantOptions.value.filter((merchant) => !form.tenantId || merchant.tenant?.id === form.tenantId));
const formMerchant = computed(() => formMerchants.value.find((merchant) => merchant.id === form.merchantId) || selectedMerchant.value);
const catalogTenantId = computed(() => Number(filters.tenantId || selectedMerchant.value?.tenant?.id || 0) || undefined);
const selectedMerchantOpen = computed(() => merchantOperational(selectedMerchant.value));
const scopedMutationPending = computed(() => saving.value || couponSaving.value || stockAdjusting.value || inventoryScanning.value || catalogSaving.value);
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
function auditActionText(action: string) { return ({ submit: "提交", resubmit: "重新提交", approve: "通过", reject: "驳回", offline: "下架" } as any)[action] || action; }
function couponStatusText(status: string) { return ({ active: "可使用", not_started: "未开始", expired: "已过期", exhausted: "已用完", disabled: "已停用" } as any)[status] || status || "-"; }
function couponStatusTag(status: string) { return ({ active: "success", not_started: "warning", expired: "info", exhausted: "danger", disabled: "info" } as any)[status] || "info"; }
function inventoryTypeText(type: string) { return ({ lock: "锁定", release: "释放", deduct: "扣减", return: "回补", adjust: "调整" } as any)[type] || type; }
function inventoryAnomalyStatusText(status: string) { return ({ open: "待处理", resolved: "已修复", ignored: "已忽略" } as any)[status] || status; }
function compactState(value: any) { return Object.entries(value || {}).map(([key, item]) => `${key}=${item}`).join("，") || "-"; }
function newBusinessKey() { return globalThis.crypto?.randomUUID?.() || `inventory-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function formatTime(value: any) { return value ? new Date(value).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false }) : "-"; }
function formatDate(value: any) { return value ? new Date(value).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" }) : "长期"; }
function merchantLinkWarning(requestedMerchantId: number) {
  return `当前链接指定的店铺 #${requestedMerchantId} 对当前账号不可见，或已被商家/关键词筛选条件过滤。为避免误操作，系统不会自动切换到其它店铺；请联系平台管理员确认店铺授权，或清空筛选后重试。`;
}
function closeProductDialog() {
  productFormLoadSequence += 1;
  formMerchantLoadSequence += 1;
  productFormLoading.value = false;
  productFormError.value = "";
  productFormTarget.value = null;
  formMerchantOptions.value = [];
  formCategories.value = [];
  formPlatformCategories.value = [];
  formBrands.value = [];
}
function closeCouponDialog() {
  couponLoadSequence += 1;
  couponLoading.value = false;
  couponError.value = "";
  coupons.value = [];
  couponTarget.value = null;
  resetCouponForm();
}
function closeInventoryLogs() {
  inventoryLogLoadSequence += 1;
  inventoryLogsLoading.value = false;
  inventoryLogsError.value = "";
  inventoryLogs.value = [];
  inventorySkus.value = [];
  inventoryProduct.value = null;
}
function closeAuditHistory() {
  auditHistoryLoadSequence += 1;
  auditHistoryLoading.value = false;
  auditHistoryError.value = "";
  auditHistory.value = [];
  auditProduct.value = null;
}
function closeStockDialog() {
  stockTarget.value = null;
  stockMerchant.value = null;
  stockSkus.value = [];
}
function invalidateScopedDialogs() {
  productDialogVisible.value = false;
  couponDialogVisible.value = false;
  inventoryDialogVisible.value = false;
  auditHistoryVisible.value = false;
  stockDialogVisible.value = false;
  closeProductDialog();
  closeCouponDialog();
  closeInventoryLogs();
  closeAuditHistory();
  closeStockDialog();
}
function clearProductScopeData() {
  catalogLoadSequence += 1;
  productLoadSequence += 1;
  lowStockLoadSequence += 1;
  inventoryAnomalyLoadSequence += 1;
  couponLoadSequence += 1;
  inventoryLogLoadSequence += 1;
  auditHistoryLoadSequence += 1;
  products.value = [];
  categories.value = [];
  platformCategories.value = [];
  brands.value = [];
  lowStockItems.value = [];
  coupons.value = [];
  inventoryLogs.value = [];
  inventoryAnomalies.value = [];
  inventoryAnomalyOpenCount.value = 0;
  catalogError.value = "";
  productError.value = "";
  lowStockError.value = "";
  inventoryAnomalyError.value = "";
  couponError.value = "";
  inventoryLogsError.value = "";
  auditHistoryError.value = "";
  loading.value = false;
  couponLoading.value = false;
  inventoryLogsLoading.value = false;
  auditHistoryLoading.value = false;
  inventoryAnomalyLoading.value = false;
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
function parseJsonObject(value: any, label: string) {
  const text = String(value || "").trim();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch {
    throw new Error(`${label}必须是合法的 JSON 对象`);
  }
}
function cleanSkuPayload(sku: any) {
  const skuCode = String(sku.skuCode || "").trim();
  return {
    id: sku.id,
    name: String(sku.name || "").trim() || "默认规格",
    skuCode: skuCode || undefined,
    barcode: String(sku.barcode || "").trim() || undefined,
    attributes: parseJsonObject(sku.attributesText, `规格「${sku.name || "未命名"}」属性`),
    weightGrams: Number(sku.weightGrams || 0),
    price: Number(sku.price || 0),
    originalPrice: sku.originalPrice === null || sku.originalPrice === undefined || sku.originalPrice === "" ? undefined : Number(sku.originalPrice),
    stock: Number(sku.stock || 0),
    sortOrder: Number(sku.sortOrder || 0),
    enabled: sku.enabled !== false
  };
}
function editableProductForm(row: any) {
  return {
    id: row.id,
    tenantId: row.tenant?.id || filters.tenantId || selectedMerchant.value?.tenant?.id,
    merchantId: row.merchant?.id || filters.merchantId,
    productCode: row.productCode || `P${row.id}`,
    title: row.title || "",
    brandId: row.brand?.id || undefined,
    brandName: row.brandName || "",
    platformCategoryId: row.platformCategory?.id || undefined,
    categoryId: row.category?.id || row.categoryId || undefined,
    coverUrl: row.coverUrl || "",
    galleryUrlsText: (row.galleryUrls || []).join("\n"),
    attributesText: JSON.stringify(row.attributes || {}, null, 2),
    description: row.description || "",
    reviewRemark: row.reviewRemark || "",
    status: row.status || "draft",
    featured: !!row.featured,
    sortOrder: Number(row.sortOrder || 0),
    deliveryNote: row.deliveryNote || "默认快递发货，偏远地区请联系客服",
    afterSaleNote: row.afterSaleNote || "支持未发货退款，已发货请联系运营方处理",
    skus: (row.skus?.length ? row.skus : [{ name: "默认规格", price: row.price || 0, originalPrice: row.originalPrice || 0, stock: row.stock || 0, enabled: true }]).map((sku: any) => ({ ...sku, attributesText: JSON.stringify(sku.attributes || {}, null, 0) }))
  };
}
function productPayload(status: string) {
  return {
    tenantId: isPlatformAdmin() ? form.tenantId : undefined,
    merchantId: form.merchantId,
    productCode: String(form.productCode || "").trim(),
    platformCategoryId: form.platformCategoryId || null,
    brandId: form.brandId || null,
    categoryId: form.categoryId || null,
    title: form.title.trim(),
    coverUrl: form.coverUrl?.trim() || undefined,
    galleryUrls: String(form.galleryUrlsText || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
    attributes: parseJsonObject(form.attributesText, "SPU 属性"),
    description: form.description?.trim() || undefined,
    brandName: form.brandName?.trim() || undefined,
    status,
    featured: !!form.featured,
    sortOrder: Number(form.sortOrder || 0),
    deliveryNote: form.deliveryNote?.trim() || undefined,
    afterSaleNote: form.afterSaleNote?.trim() || undefined,
    skus: (form.skus || []).map(cleanSkuPayload)
  };
}
function couponPayload(source: any, enabled = source.enabled) {
  const payload: Record<string, any> = {
    tenantId: isPlatformAdmin() ? source.tenant?.id || couponTarget.value?.tenantId || filters.tenantId || selectedMerchant.value?.tenant?.id : undefined,
    merchantId: source.merchant?.id || couponTarget.value?.merchantId || filters.merchantId || selectedMerchant.value?.id || undefined,
    code: String(source.code || "").trim(),
    name: String(source.name || "").trim(),
    minAmount: Number(source.minAmount || 0),
    discountAmount: Number(source.discountAmount || 0),
    usageLimit: Number(source.usageLimit || 0),
    enabled,
    startsAt: source.startsAt || null,
    endsAt: source.endsAt || null
  };
  if (Object.prototype.hasOwnProperty.call(source, "scope")) payload.scope = source.scope || "all";
  if (Object.prototype.hasOwnProperty.call(source, "scopeCategoryId")) payload.scopeCategoryId = source.scopeCategoryId || null;
  if (Object.prototype.hasOwnProperty.call(source, "scopeProductId")) payload.scopeProductId = source.scopeProductId || null;
  if (Object.prototype.hasOwnProperty.call(source, "perUserLimit")) payload.perUserLimit = Number(source.perUserLimit || 0);
  return payload;
}

function requestErrorText(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
async function loadTenants() {
  if (!isPlatformAdmin()) {
    tenants.value = [];
    return true;
  }
  try {
    const result = await api.get<any, any[]>("/admin/tenants");
    if (!Array.isArray(result)) throw new Error("商家选项响应格式无效");
    tenants.value = result;
    return true;
  } catch (error: unknown) {
    tenants.value = [];
    scopeError.value = requestErrorText(error, "加载商家选项失败");
    return false;
  }
}
async function loadMerchants(tenantId = filters.tenantId, honorRouteMerchant = tenantId === filters.tenantId) {
  const sequence = ++scopeLoadSequence;
  scopeError.value = "";
  merchants.value = [];
  try {
    const result = await api.get<any, any[]>("/admin/mall/accessible-merchants", { params: { tenantId: isPlatformAdmin() ? tenantId : undefined, enabled: "true" } });
    if (sequence !== scopeLoadSequence) return false;
    if (!Array.isArray(result)) throw new Error("可运营店铺响应格式无效");
    merchants.value = result;
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
  } catch (error: unknown) {
    if (sequence !== scopeLoadSequence) return false;
    if (honorRouteMerchant) {
      filters.merchantId = undefined;
      deepLinkWarning.value = "";
      clearProductScopeData();
    }
    scopeError.value = requestErrorText(error, "加载可运营店铺失败");
    return false;
  }
}
async function loadFormMerchants(tenantId = form.tenantId) {
  const sequence = ++formMerchantLoadSequence;
  const capturedTenantId = Number(tenantId || 0);
  formMerchantOptions.value = [];
  try {
    const result = await api.get<any, any[]>("/admin/mall/accessible-merchants", { params: { tenantId: isPlatformAdmin() ? tenantId : undefined, enabled: "true" } });
    if (sequence !== formMerchantLoadSequence || !productDialogVisible.value || Number(form.tenantId || 0) !== capturedTenantId) return false;
    if (!Array.isArray(result)) throw new Error("商品表单店铺选项响应格式无效");
    formMerchantOptions.value = result;
    return true;
  } catch (error: unknown) {
    if (sequence !== formMerchantLoadSequence || !productDialogVisible.value || Number(form.tenantId || 0) !== capturedTenantId) return false;
    productFormError.value = requestErrorText(error, "加载商品表单店铺选项失败");
    return false;
  }
}
async function reloadProductScope() {
  scopeError.value = "";
  const tenantsReady = await loadTenants();
  if (!tenantsReady) return;
  const merchantsReady = await loadMerchants();
  if (!merchantsReady) return;
  await Promise.all([loadCategories(), loadProducts(), loadLowStock(), loadInventoryAnomalies()]);
  await openRoutePanel();
}
function currentProductContextMatches(merchantId: number, tenantId: number, formContext: boolean) {
  if (formContext !== productDialogVisible.value) return false;
  const currentMerchantId = Number(formContext ? form.merchantId : filters.merchantId || 0);
  const currentTenantId = Number(formContext ? form.tenantId : filters.tenantId || selectedMerchant.value?.tenant?.id || 0);
  return currentMerchantId === merchantId && currentTenantId === tenantId;
}
function listResponse(value: any) {
  return Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : null;
}
function currentListContextMatches(merchantId: number, tenantId: number) {
  const currentMerchantId = Number(filters.merchantId || 0);
  const currentTenantId = Number(filters.tenantId || selectedMerchant.value?.tenant?.id || 0);
  return currentMerchantId === merchantId && currentTenantId === tenantId;
}
async function loadCategories() {
  if (blockInvalidMerchantLink()) return;
  const formContext = productDialogVisible.value;
  const merchantId = Number(formContext ? form.merchantId : filters.merchantId || 0);
  const tenantId = Number(formContext ? form.tenantId : filters.tenantId || selectedMerchant.value?.tenant?.id || 0);
  const sequence = ++catalogLoadSequence;
  const errorTarget = formContext ? productFormError : catalogError;
  const categoryTarget = formContext ? formCategories : categories;
  const platformCategoryTarget = formContext ? formPlatformCategories : platformCategories;
  const brandTarget = formContext ? formBrands : brands;
  errorTarget.value = "";
  categoryTarget.value = [];
  platformCategoryTarget.value = [];
  brandTarget.value = [];
  if (!merchantId) return;
  try {
    const params = currentMallParams({ tenantId: isPlatformAdmin() && tenantId ? tenantId : undefined, merchantId, scope: "merchant" });
    const results = await Promise.allSettled([
      api.get<any, any[]>("/admin/mall/categories", { params }),
      api.get<any, any[]>("/admin/mall/categories", { params: { tenantId: isPlatformAdmin() && tenantId ? tenantId : undefined, scope: "platform", enabled: "true" } }),
      api.get<any, any[]>("/admin/mall/brands", { params: { tenantId: isPlatformAdmin() && tenantId ? tenantId : undefined, status: "active" } })
    ]);
    if (sequence !== catalogLoadSequence || !currentProductContextMatches(merchantId, tenantId, formContext)) return;
    const labels = ["店铺分类", "平台类目", "品牌"];
    const failures = results.flatMap((result, index) => result.status === "rejected" ? [`${labels[index]}：${requestErrorText(result.reason, "读取失败")}`] : []);
    const values = results.map((result) => result.status === "fulfilled" ? listResponse(result.value) : null);
    results.forEach((result, index) => {
      if (result.status === "fulfilled" && values[index] === null) failures.push(`${labels[index]}：响应格式无效`);
    });
    categoryTarget.value = values[0] || [];
    platformCategoryTarget.value = values[1] || [];
    brandTarget.value = values[2] || [];
    errorTarget.value = failures.join("；");
  } catch (error: unknown) {
    if (sequence !== catalogLoadSequence || !currentProductContextMatches(merchantId, tenantId, formContext)) return;
    errorTarget.value = requestErrorText(error, "加载商品分类与品牌失败");
  }
}
async function loadProducts() {
  if (blockInvalidMerchantLink()) return;
  const merchantId = Number(filters.merchantId || 0);
  const tenantId = Number(filters.tenantId || selectedMerchant.value?.tenant?.id || 0);
  const sequence = ++productLoadSequence;
  productError.value = "";
  products.value = [];
  loading.value = true;
  try {
    const result = await api.get<any, any>("/admin/mall/products", {
      params: {
        ...currentMallParams(),
        categoryId: filters.categoryId || undefined,
        platformCategoryId: filters.platformCategoryId || undefined,
        brandId: filters.brandId || undefined,
        status: filters.status || undefined,
        keyword: filters.keyword.trim() || undefined,
        pageSize: 100
      }
    });
    if (sequence !== productLoadSequence || !currentListContextMatches(merchantId, tenantId)) return;
    const items = listResponse(result);
    if (!items) throw new Error("商城商品响应格式无效");
    products.value = items;
  } catch (error: unknown) {
    if (sequence !== productLoadSequence || !currentListContextMatches(merchantId, tenantId)) return;
    productError.value = requestErrorText(error, "加载商品失败");
  } finally {
    if (sequence === productLoadSequence) loading.value = false;
  }
}
async function applyProductFilters() {
  if (blockInvalidMerchantLink()) return;
  await Promise.all([loadProducts(), loadLowStock()]);
}
async function loadLowStock() {
  if (blockInvalidMerchantLink()) return;
  const merchantId = Number(filters.merchantId || 0);
  const tenantId = Number(filters.tenantId || selectedMerchant.value?.tenant?.id || 0);
  const sequence = ++lowStockLoadSequence;
  lowStockError.value = "";
  lowStockItems.value = [];
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
    if (sequence !== lowStockLoadSequence || !currentListContextMatches(merchantId, tenantId)) return;
    const items = listResponse(result);
    if (!items) throw new Error("低库存提醒响应格式无效");
    lowStockItems.value = items;
  } catch (error: unknown) {
    if (sequence !== lowStockLoadSequence || !currentListContextMatches(merchantId, tenantId)) return;
    lowStockError.value = requestErrorText(error, "加载低库存提醒失败");
  }
}
function currentMallParams(extra: Record<string, any> = {}) {
  return {
    tenantId: isPlatformAdmin() ? filters.tenantId || selectedMerchant.value?.tenant?.id : undefined,
    merchantId: filters.merchantId || undefined,
    ...extra
  };
}
async function loadCoupons() {
  if (blockInvalidMerchantLink()) return;
  const target = couponTarget.value;
  if (!target || !couponDialogVisible.value) return;
  const sequence = ++couponLoadSequence;
  const merchantId = target.merchantId;
  const tenantId = target.tenantId;
  couponLoading.value = true;
  couponError.value = "";
  coupons.value = [];
  try {
    const result = await api.get<any, any>("/admin/mall/coupons", { params: { tenantId: isPlatformAdmin() ? tenantId : undefined, merchantId, keyword: couponFilters.keyword.trim() || undefined, enabled: couponFilters.enabled || undefined, status: couponFilters.status || undefined } });
    if (sequence !== couponLoadSequence || !couponDialogVisible.value || couponTarget.value?.merchantId !== merchantId || couponTarget.value?.tenantId !== tenantId) return;
    const items = listResponse(result);
    if (!items) throw new Error("优惠券列表响应格式无效");
    coupons.value = items;
  } catch (error: unknown) {
    if (sequence !== couponLoadSequence || !couponDialogVisible.value || couponTarget.value?.merchantId !== merchantId || couponTarget.value?.tenantId !== tenantId) return;
    couponError.value = requestErrorText(error, "加载优惠券失败");
  } finally {
    if (sequence === couponLoadSequence) couponLoading.value = false;
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
  invalidateScopedDialogs();
  deepLinkWarning.value = "";
  const query = { ...route.query };
  if (filters.tenantId) query.tenantId = String(filters.tenantId);
  else delete query.tenantId;
  delete query.merchantId;
  delete query.categoryId;
  filters.merchantId = undefined;
  await router.replace({ path: route.path, query });
  const merchantScopeReady = await loadMerchants(filters.tenantId, false);
  if (!merchantScopeReady) return;
  filters.categoryId = undefined;
  filters.platformCategoryId = undefined;
  filters.brandId = undefined;
  await Promise.all([loadCategories(), loadProducts(), loadLowStock(), loadInventoryAnomalies()]);
}
async function handleMerchantChange() {
  invalidateScopedDialogs();
  deepLinkWarning.value = "";
  const merchant = selectedMerchant.value;
  if (merchant?.tenant?.id && isPlatformAdmin()) filters.tenantId = merchant.tenant.id;
  const query = { ...route.query };
  if (filters.tenantId) query.tenantId = String(filters.tenantId);
  else delete query.tenantId;
  if (filters.merchantId) query.merchantId = String(filters.merchantId);
  else delete query.merchantId;
  delete query.categoryId;
  await router.replace({ path: route.path, query });
  filters.categoryId = undefined;
  filters.platformCategoryId = undefined;
  filters.brandId = undefined;
  await Promise.all([loadCategories(), loadProducts(), loadLowStock(), loadInventoryAnomalies()]);
}
async function handleFormTenantChange() {
  productFormError.value = "";
  form.merchantId = undefined;
  form.categoryId = undefined;
  form.platformCategoryId = undefined;
  form.brandId = undefined;
  await loadFormMerchants(form.tenantId);
}
async function handleFormMerchantChange() {
  productFormError.value = "";
  form.categoryId = undefined;
  form.platformCategoryId = undefined;
  form.brandId = undefined;
  await loadCategories();
}
function resetForm() {
  Object.assign(form, { id: null, tenantId: filters.tenantId || selectedMerchant.value?.tenant?.id, merchantId: filters.merchantId, productCode: "", title: "", brandId: undefined, brandName: "", platformCategoryId: undefined, categoryId: undefined, coverUrl: "", galleryUrlsText: "", attributesText: "{}", description: "", reviewRemark: "", status: "draft", featured: false, sortOrder: 0, deliveryNote: "默认快递发货，偏远地区请联系客服", afterSaleNote: "支持未发货退款，已发货请联系运营方处理", skus: [{ name: "默认规格", skuCode: "", barcode: "", attributesText: "{}", weightGrams: 0, price: 0, originalPrice: 0, stock: 100, enabled: true }] });
}
async function createProduct() {
  if (!requireOpenMerchant("发布商品")) return;
  resetForm();
  productFormTarget.value = null;
  productFormError.value = "";
  formMerchantOptions.value = merchants.value.filter((merchant) => !form.tenantId || merchant.tenant?.id === form.tenantId);
  productDialogVisible.value = true;
  await loadCategories();
}
async function editProduct(row: any) {
  if (!requireOpenMerchant("编辑商品", rowMerchant(row))) return;
  const target = {
    id: Number(row.id),
    tenantId: Number(row.tenant?.id || filters.tenantId || selectedMerchant.value?.tenant?.id || 0),
    merchantId: Number(row.merchant?.id || filters.merchantId || 0)
  };
  if (!target.id || !target.tenantId || !target.merchantId) return ElMessage.error("商品归属信息不完整，无法安全编辑");
  productFormTarget.value = target;
  productFormError.value = "";
  formMerchantOptions.value = [rowMerchant(row)].filter(Boolean);
  resetForm();
  Object.assign(form, { id: target.id, tenantId: target.tenantId, merchantId: target.merchantId, productCode: "", title: "", skus: [] });
  productDialogVisible.value = true;
  await reloadProductForm();
}
async function reloadProductForm() {
  const target = productFormTarget.value;
  if (!target || !productDialogVisible.value) return;
  const sequence = ++productFormLoadSequence;
  productFormLoading.value = true;
  productFormError.value = "";
  try {
    const detail = await api.get<any, any>(`/admin/mall/products/${target.id}`);
    if (sequence !== productFormLoadSequence || !productDialogVisible.value || productFormTarget.value?.id !== target.id) return;
    const detailTenantId = Number(detail?.tenant?.id || 0);
    const detailMerchantId = Number(detail?.merchant?.id || 0);
    if (Number(detail?.id) !== target.id || detailTenantId !== target.tenantId || detailMerchantId !== target.merchantId) throw new Error("商品详情归属与打开目标不一致");
    formMerchantOptions.value = [detail.merchant];
    Object.assign(form, editableProductForm(detail));
    await loadCategories();
    if (sequence !== productFormLoadSequence || !productDialogVisible.value || productFormTarget.value?.id !== target.id) return;
  } catch (error: unknown) {
    if (sequence !== productFormLoadSequence || !productDialogVisible.value || productFormTarget.value?.id !== target.id) return;
    productFormError.value = requestErrorText(error, "加载商品详情失败");
  } finally {
    if (sequence === productFormLoadSequence) productFormLoading.value = false;
  }
}
async function loadInventoryAnomalies() {
  if (blockInvalidMerchantLink()) return;
  const merchantId = Number(filters.merchantId || 0);
  const tenantId = Number(filters.tenantId || selectedMerchant.value?.tenant?.id || 0);
  const sequence = ++inventoryAnomalyLoadSequence;
  inventoryAnomalyLoading.value = true;
  inventoryAnomalyError.value = "";
  inventoryAnomalies.value = [];
  inventoryAnomalyOpenCount.value = 0;
  try {
    const result = await api.get<any, any>("/admin/mall/inventory-anomalies", { params: currentMallParams({ status: inventoryAnomalyStatus.value, keyword: inventoryAnomalyKeyword.value.trim() || undefined, pageSize: 100 }) });
    if (sequence !== inventoryAnomalyLoadSequence || !currentListContextMatches(merchantId, tenantId)) return;
    const items = listResponse(result);
    if (!items || typeof result !== "object") throw new Error("库存异常响应格式无效");
    inventoryAnomalies.value = items;
    inventoryAnomalyOpenCount.value = Number(result.openCount || 0);
  } catch (error: any) {
    if (sequence !== inventoryAnomalyLoadSequence || !currentListContextMatches(merchantId, tenantId)) return;
    inventoryAnomalyError.value = requestErrorText(error, "加载库存异常失败");
  } finally {
    if (sequence === inventoryAnomalyLoadSequence) inventoryAnomalyLoading.value = false;
  }
}
async function openInventoryGovernance() {
  inventoryGovernanceVisible.value = true;
  await loadInventoryAnomalies();
}
async function scanInventoryAnomalies() {
  if (blockInvalidMerchantLink()) return;
  inventoryScanning.value = true;
  try {
    const result = await api.post<any, any>("/admin/mall/inventory-anomalies/scan", currentMallParams());
    ElMessage.success(`扫描完成：检查 ${result.scannedSkuCount || 0} 个规格，发现 ${result.issueCount || 0} 项异常`);
    await loadInventoryAnomalies();
  } catch (error: any) {
    ElMessage.error(error.message || "库存一致性扫描失败");
  } finally {
    inventoryScanning.value = false;
  }
}
async function resolveInventoryAnomaly(row: any, action: "repair" | "ignore") {
  try {
    const label = action === "repair" ? "按待履约订单锁定量和非负约束修复" : "忽略本次异常";
    const result = await ElMessageBox.prompt(`确认${label}「${row.title}」？请填写处理说明。`, action === "repair" ? "修复库存异常" : "忽略库存异常", { confirmButtonText: action === "repair" ? "确认修复" : "确认忽略", cancelButtonText: "取消", type: action === "repair" ? "warning" : "info", inputType: "textarea", inputValue: label, inputValidator: (value) => String(value || "").trim() ? true : "处理说明不能为空" });
    await api.post(`/admin/mall/inventory-anomalies/${row.id}/resolve`, { action, remark: result.value.trim() });
    ElMessage.success(action === "repair" ? "库存异常已修复并记录流水" : "库存异常已忽略");
    await Promise.all([loadInventoryAnomalies(), loadProducts(), loadLowStock()]);
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(error.message || "处理库存异常失败");
  }
}
async function savePlatformCategory() {
  if (!catalogTenantId.value) return ElMessage.error("请先选择商家");
  if (!platformCategoryForm.code.trim() || !platformCategoryForm.name.trim()) return ElMessage.error("请填写类目编码和名称");
  catalogSaving.value = true;
  try {
    await api.post("/admin/mall/categories", { tenantId: catalogTenantId.value, scope: "platform", ...platformCategoryForm });
    Object.assign(platformCategoryForm, { code: "", name: "", parentId: undefined, sortOrder: 0 });
    await loadCategories();
    ElMessage.success("平台类目已新增");
  } catch (error: any) { ElMessage.error(error.message || "保存平台类目失败"); }
  finally { catalogSaving.value = false; }
}
async function saveBrand() {
  if (!catalogTenantId.value) return ElMessage.error("请先选择商家");
  if (!brandForm.code.trim() || !brandForm.name.trim()) return ElMessage.error("请填写品牌编码和名称");
  catalogSaving.value = true;
  try {
    await api.post("/admin/mall/brands", { tenantId: catalogTenantId.value, status: "active", ...brandForm });
    Object.assign(brandForm, { code: "", name: "", logoUrl: "", sortOrder: 0 });
    await loadCategories();
    ElMessage.success("品牌已新增");
  } catch (error: any) { ElMessage.error(error.message || "保存品牌失败"); }
  finally { catalogSaving.value = false; }
}
async function openInventoryLogs(row: any) {
  const productId = Number(row.id || 0);
  const tenantId = Number(row.tenant?.id || filters.tenantId || selectedMerchant.value?.tenant?.id || 0);
  const merchantId = Number(row.merchant?.id || filters.merchantId || 0);
  if (!productId || !tenantId || !merchantId) return ElMessage.error("商品归属信息不完整，无法读取库存流水");
  inventoryProduct.value = { id: productId, title: row.title, tenantId, merchantId };
  inventorySkus.value = row.skus || [];
  inventoryFilters.tenantId = tenantId;
  inventoryFilters.merchantId = merchantId;
  inventoryFilters.skuId = inventorySkus.value[0]?.id;
  inventoryFilters.keyword = "";
  inventoryLogsError.value = "";
  inventoryDialogVisible.value = true;
  await loadInventoryLogs();
}
async function loadInventoryLogs() {
  if (blockInvalidMerchantLink()) return;
  const target = inventoryProduct.value;
  const skuId = Number(inventoryFilters.skuId || 0);
  if (!target || !inventoryDialogVisible.value) return;
  if (skuId && !inventorySkus.value.some((sku) => Number(sku.id) === skuId)) {
    inventoryLogs.value = [];
    inventoryLogsError.value = "所选 SKU 不属于当前商品，请关闭后重新打开库存流水";
    return;
  }
  const sequence = ++inventoryLogLoadSequence;
  inventoryLogsLoading.value = true;
  inventoryLogsError.value = "";
  inventoryLogs.value = [];
  try {
    const result = await api.get<any, any>("/admin/mall/inventory-logs", {
      params: {
        tenantId: isPlatformAdmin() ? target.tenantId : undefined,
        merchantId: target.merchantId,
        skuId: skuId || undefined,
        keyword: inventoryFilters.keyword.trim() || undefined
      }
    });
    if (sequence !== inventoryLogLoadSequence || !inventoryDialogVisible.value || inventoryProduct.value?.id !== target.id) return;
    const items = listResponse(result);
    if (!items) throw new Error("库存流水响应格式无效");
    inventoryLogs.value = items;
  } catch (error: unknown) {
    if (sequence !== inventoryLogLoadSequence || !inventoryDialogVisible.value || inventoryProduct.value?.id !== target.id) return;
    inventoryLogsError.value = requestErrorText(error, "加载库存流水失败");
  } finally {
    if (sequence === inventoryLogLoadSequence) inventoryLogsLoading.value = false;
  }
}
function selectedAdjustSku() {
  return stockSkus.value.find((sku) => sku.id === stockForm.skuId);
}
function openStockAdjust(row: any) {
  if (!requireOpenMerchant("调整库存", rowMerchant(row))) return;
  stockMerchant.value = rowMerchant(row);
  stockSkus.value = row.skus || [];
  stockTarget.value = {
    productId: Number(row.id || 0),
    tenantId: Number(row.tenant?.id || filters.tenantId || selectedMerchant.value?.tenant?.id || 0),
    merchantId: Number(row.merchant?.id || filters.merchantId || 0),
    skuIds: stockSkus.value.map((sku) => Number(sku.id)).filter(Boolean)
  };
  const firstSku = stockSkus.value[0];
  Object.assign(stockForm, { productTitle: row.title, skuId: firstSku?.id, stock: Number(firstSku?.stock || 0), remark: "", businessKey: newBusinessKey() });
  stockDialogVisible.value = true;
}
function openLowStockAdjust(row: any) {
  if (!requireOpenMerchant("调整库存", rowMerchant(row))) return;
  stockMerchant.value = rowMerchant(row);
  stockSkus.value = [{ ...row, product: row.product }];
  stockTarget.value = {
    productId: Number(row.product?.id || 0),
    tenantId: Number(row.tenant?.id || filters.tenantId || selectedMerchant.value?.tenant?.id || 0),
    merchantId: Number(row.merchant?.id || filters.merchantId || 0),
    skuIds: [Number(row.id)].filter(Boolean)
  };
  Object.assign(stockForm, { productTitle: row.product?.title || "-", skuId: row.id, stock: Number(row.stock || 0), remark: "低库存预警补货", businessKey: newBusinessKey() });
  stockDialogVisible.value = true;
}
function handleAdjustSkuChange() {
  const sku = selectedAdjustSku();
  stockForm.stock = Number(sku?.stock || 0);
}
async function submitStockAdjust() {
  const target = stockTarget.value;
  if (!requireOpenMerchant("调整库存", stockMerchant.value || selectedMerchant.value)) return;
  if (!target?.productId || !target.tenantId || !target.merchantId) return ElMessage.error("库存调整目标不完整，请关闭后重新打开");
  if (!stockForm.skuId) return ElMessage.error("请选择规格");
  if (!target.skuIds.includes(Number(stockForm.skuId))) return ElMessage.error("所选 SKU 不属于当前商品，请关闭后重新打开");
  if (!stockForm.remark.trim()) return ElMessage.error("请填写调整原因");
  stockAdjusting.value = true;
  try {
    await api.post(`/admin/mall/skus/${stockForm.skuId}/adjust-stock`, { stock: stockForm.stock, remark: stockForm.remark.trim(), businessKey: stockForm.businessKey });
    ElMessage.success("库存已调整，流水已记录");
    stockDialogVisible.value = false;
    await loadProducts();
    await loadLowStock();
    await loadInventoryAnomalies();
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
  await loadInventoryAnomalies();
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
function addSku() { form.skus.push({ name: "", skuCode: "", barcode: "", attributesText: "{}", weightGrams: 0, price: 0, originalPrice: 0, stock: 0, enabled: true }); }
function removeSku(index: number) { if (form.skus.length > 1) form.skus.splice(index, 1); }
function openCouponDialog() {
  if (!requireOpenMerchant("运营优惠券")) return;
  couponTarget.value = {
    tenantId: Number(selectedMerchant.value?.tenant?.id || filters.tenantId || 0),
    merchantId: Number(selectedMerchant.value?.id || filters.merchantId || 0)
  };
  if (!couponTarget.value.tenantId || !couponTarget.value.merchantId) {
    couponTarget.value = null;
    return ElMessage.error("优惠券运营店铺归属不完整，请重新选择店铺");
  }
  resetCouponForm();
  couponError.value = "";
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
  const target = couponTarget.value;
  if (!requireOpenMerchant("运营优惠券")) return;
  if (!target || !couponDialogVisible.value) return ElMessage.error("优惠券目标已失效，请关闭后重新打开");
  if (couponError.value) return ElMessage.error("优惠券列表尚未恢复，暂不能保存");
  if (!couponForm.code?.trim()) return ElMessage.error("请输入优惠券码");
  if (!couponForm.name?.trim()) return ElMessage.error("请输入优惠券名称");
  if (Number(couponForm.discountAmount || 0) <= 0) return ElMessage.error("优惠金额必须大于 0");
  couponSaving.value = true;
  try {
    const payload = couponPayload(couponForm);
    if (couponForm.id) await api.patch(`/admin/mall/coupons/${couponForm.id}`, payload);
    else await api.post("/admin/mall/coupons", payload);
    if (!couponDialogVisible.value || couponTarget.value?.merchantId !== target.merchantId || couponTarget.value?.tenantId !== target.tenantId) return;
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
  const target = couponTarget.value;
  if (!requireOpenMerchant("运营优惠券", rowMerchant(row))) return;
  if (!target || !couponDialogVisible.value || Number(row.merchant?.id || target.merchantId) !== target.merchantId) return ElMessage.error("优惠券目标已失效，请关闭后重新打开");
  try {
    await api.patch(`/admin/mall/coupons/${row.id}`, couponPayload(row, !row.enabled));
    if (!couponDialogVisible.value || couponTarget.value?.merchantId !== target.merchantId || couponTarget.value?.tenantId !== target.tenantId) return;
    ElMessage.success(row.enabled ? "优惠券已停用" : "优惠券已启用");
    await loadCoupons();
  } catch (error: any) {
    ElMessage.error(error.message || "操作失败");
  }
}
async function approveProduct(row: any) {
  const productId = Number(row.id);
  const contextSequence = productLoadSequence;
  try {
    await ElMessageBox.confirm(`确认通过商品「${row.title}」的上架审核？通过后会在前台展示。`, "通过商品审核", { confirmButtonText: "通过", cancelButtonText: "取消", type: "success" });
    if (contextSequence !== productLoadSequence || !products.value.some((product) => Number(product.id) === productId)) return ElMessage.warning("商品列表已变化，请重新选择审核目标");
    await api.post(`/admin/mall/products/${productId}/approve`, { remark: "审核通过" });
    ElMessage.success("商品审核已通过");
    await loadProducts();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(error.message || "商品审核通过失败");
  }
}
async function rejectProduct(row: any) {
  const productId = Number(row.id);
  const contextSequence = productLoadSequence;
  try {
    const result = await ElMessageBox.prompt(`请填写商品「${row.title}」的驳回原因。商品会退回草稿，店铺修改后可重新提交。`, "驳回商品审核", { confirmButtonText: "驳回", cancelButtonText: "取消", type: "warning", inputType: "textarea", inputValidator: (value) => String(value || "").trim() ? true : "驳回原因不能为空" });
    if (contextSequence !== productLoadSequence || !products.value.some((product) => Number(product.id) === productId)) return ElMessage.warning("商品列表已变化，请重新选择审核目标");
    await api.post(`/admin/mall/products/${productId}/reject`, { remark: result.value.trim() });
    ElMessage.success("商品已驳回为草稿");
    await loadProducts();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(error.message || "商品审核驳回失败");
  }
}
async function openAuditHistory(row: any) {
  auditProduct.value = { id: Number(row.id), title: row.title };
  auditHistory.value = [];
  auditHistoryError.value = "";
  auditHistoryVisible.value = true;
  await loadAuditHistory();
}
async function loadAuditHistory() {
  const target = auditProduct.value;
  if (!target?.id || !auditHistoryVisible.value) return;
  const sequence = ++auditHistoryLoadSequence;
  auditHistoryLoading.value = true;
  auditHistoryError.value = "";
  auditHistory.value = [];
  try {
    const result = await api.get<any, any>(`/admin/mall/products/${target.id}/audit-history`);
    if (sequence !== auditHistoryLoadSequence || !auditHistoryVisible.value || auditProduct.value?.id !== target.id) return;
    const items = listResponse(result);
    if (!items) throw new Error("审核记录响应格式无效");
    auditHistory.value = items;
  } catch (error: unknown) {
    if (sequence !== auditHistoryLoadSequence || !auditHistoryVisible.value || auditProduct.value?.id !== target.id) return;
    auditHistoryError.value = requestErrorText(error, "加载审核记录失败");
  } finally {
    if (sequence === auditHistoryLoadSequence) auditHistoryLoading.value = false;
  }
}
async function saveProduct() {
  const target = productFormTarget.value;
  if (!requireOpenMerchant("保存商品", formMerchant.value)) return;
  if (form.id && (!target || Number(form.id) !== target.id || Number(form.tenantId) !== target.tenantId || Number(form.merchantId) !== target.merchantId)) return ElMessage.error("商品编辑目标已变化，请关闭后重新打开");
  if (productFormError.value) return ElMessage.error("商品详情或分类品牌选项尚未恢复，暂不能保存");
  if (!form.title?.trim()) return ElMessage.error("请输入商品名称");
  if (!form.productCode?.trim()) return ElMessage.error("请输入 SPU 编码");
  if (!form.merchantId) return ElMessage.error("请选择要发布商品的店铺");
  saving.value = true;
  try {
    const submitStatus = normalizedProductStatus();
    const payload = productPayload(submitStatus);
    if (target) await api.patch(`/admin/mall/products/${target.id}`, payload);
    else await api.post("/admin/mall/products", payload);
    if (!productDialogVisible.value || (target && productFormTarget.value?.id !== target.id)) return;
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
  const tenantsReady = await loadTenants();
  if (!tenantsReady) return;
  const merchantScopeReady = await loadMerchants();
  if (!merchantScopeReady) return;
  await Promise.all([loadCategories(), loadProducts(), loadLowStock(), loadInventoryAnomalies()]);
  await openRoutePanel();
});
watch(() => [route.query.tenantId, route.query.merchantId, route.query.categoryId, route.query.keyword], async () => {
  invalidateScopedDialogs();
  filters.tenantId = routeTenantId();
  filters.merchantId = routeMerchantId();
  filters.categoryId = routeCategoryId();
  filters.keyword = routeKeyword();
  const merchantScopeReady = await loadMerchants();
  if (!merchantScopeReady) return;
  await Promise.all([loadCategories(), loadProducts(), loadLowStock(), loadInventoryAnomalies()]);
  await openRoutePanel();
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
.sku-row { display: grid; grid-template-columns: repeat(5, minmax(120px, 1fr)) 120px 120px 110px 70px 64px; gap: 8px; align-items: center; margin-bottom: 10px; overflow-x: auto; }
.catalog-form { display: grid; grid-template-columns: repeat(4, minmax(150px, 1fr)) auto; gap: 10px; margin-bottom: 16px; align-items: center; }
.coupon-toolbar { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.coupon-form { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 14px; align-items: center; }
.inventory-toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
.page-error, .dialog-error { margin-bottom: 12px; }
.page-error p, .dialog-error p { margin: 0 0 8px; overflow-wrap: anywhere; }

@media (max-width: 768px) {
  .mall-page { padding: 16px 12px; }
  .page-header { flex-direction: column; align-items: stretch; }
  .page-header > div:first-child { width: 100%; min-width: 0; }
  .page-header h2, .page-header p { overflow-wrap: anywhere; }
  .header-actions { width: 100%; align-items: stretch; flex-direction: column; }
  .header-actions :deep(.el-select), .header-actions > .el-button { width: 100% !important; margin-left: 0; }
  .filter-bar { align-items: stretch; flex-direction: column; }
  .filter-bar :deep(.el-select), .filter-bar :deep(.el-input), .filter-bar > .el-button { width: 100% !important; margin-left: 0; }
  .merchant-context-card :deep(.el-card__body), .merchant-context-main { align-items: flex-start; flex-direction: column; }
  .merchant-context-actions { width: 100%; }
  .merchant-context-actions > .el-button { margin-left: 0; }
  .catalog-form, .coupon-form { grid-template-columns: minmax(0, 1fr); }
}
</style>
