<template>
  <div class="mall-marketing-page">
    <div class="page-header">
      <div>
        <h2>商城营销中心</h2>
        <p>按店铺管理优惠券、秒杀、拼团和推广码；平台可查看全局，新增或编辑营销活动必须落到一个具体店铺。</p>
      </div>
      <div class="header-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" :disabled="writeLocked" clearable filterable placeholder="全部商家/代理" style="width:220px" @change="handleTenantChange">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-select v-model="filters.merchantId" :disabled="writeLocked" clearable filterable placeholder="查看全部店铺；操作前请选择店铺" style="width:280px" @change="handleMerchantChange">
          <el-option v-for="merchant in merchants" :key="merchant.id" :label="merchantLabel(merchant)" :value="merchant.id" />
        </el-select>
        <el-input v-model="keyword" :disabled="writeLocked" clearable placeholder="券码/活动/推广码" style="width:220px" @keyup.enter="reload" @clear="reload" />
        <el-button :loading="loadingAny" :disabled="writeLocked" @click="reload">刷新</el-button>
      </div>
    </div>

    <el-alert v-if="tenantError" class="scope-alert section-error" type="error" show-icon :closable="false" title="商家/代理范围加载失败">
      <template #default><span>{{ tenantError }}</span><el-button size="small" @click="loadTenants">重试商家范围</el-button></template>
    </el-alert>
    <el-alert v-if="merchantError" class="scope-alert section-error" type="error" show-icon :closable="false" title="可运营店铺加载失败">
      <template #default><span>{{ merchantError }}</span><el-button size="small" @click="retryMarketingScope">重试店铺范围</el-button></template>
    </el-alert>

    <el-alert
      v-if="deepLinkWarning"
      class="scope-alert"
      type="error"
      show-icon
      :closable="false"
      title="商城营销店铺链接不可用"
      :description="deepLinkWarning"
    />

    <el-alert
      v-else-if="!selectedMerchant && isPlatformAdmin()"
      class="scope-alert"
      type="info"
      show-icon
      :closable="false"
      title="当前是全局查看模式"
      description="平台账号可以不选店铺查看所有营销数据；新增、编辑、启停优惠券、秒杀、拼团和推广码时必须先选择店铺，避免运营内容写错商户。"
    />
    <el-alert
      v-else-if="!selectedMerchant && merchants.length > 1"
      class="scope-alert"
      type="warning"
      show-icon
      :closable="false"
      title="请选择要运营营销的店铺"
      description="当前账号可管理多个商城店铺。为避免把优惠券、秒杀、拼团或推广码写到错误店铺，系统不会自动默认选择，请先在页面顶部选择具体店铺。"
    />
    <el-alert
      v-else-if="!selectedMerchant"
      class="scope-alert"
      type="warning"
      show-icon
      :closable="false"
      title="当前账号暂无可运营店铺"
      description="请联系平台管理员在「商城店铺」为该账号授权店铺；授权后才能新增、编辑或启停营销活动。"
    />

    <el-card v-if="selectedMerchant && !deepLinkWarning" shadow="never" class="merchant-card">
      <div>
        <strong>当前运营店铺：{{ selectedMerchant.name || selectedMerchant.code }}</strong>
        <p>{{ selectedMerchant.tenant?.name || selectedMerchant.tenant?.code || "平台店铺" }} · {{ merchantOwnerText(selectedMerchant) }} · {{ selectedMerchant.region || "未设置区域" }}</p>
      </div>
      <div class="merchant-tags">
        <el-tag :type="selectedMerchantOpen ? 'success' : 'info'">{{ selectedMerchantOpen ? "商城已开放" : "商城未开放" }}</el-tag>
        <el-tag type="warning" effect="plain">{{ paymentModeText(selectedMerchant.paymentMode) }}</el-tag>
        <el-tag v-if="selectedMerchant.productAuditRequired !== false" type="warning" effect="plain">商品需审核</el-tag>
      </div>
      <div class="merchant-actions">
        <el-button size="small" type="primary" plain @click="goMerchantAdmin('/mall-products')">商品管理</el-button>
        <el-button size="small" type="primary" plain @click="goMerchantAdmin('/mall-categories')">店铺分类</el-button>
        <el-button size="small" type="primary" plain @click="goMerchantAdmin('/mall-orders')">订单管理</el-button>
        <el-button size="small" type="success" plain @click="goMerchantAdmin('/mall-payments')">收款配置</el-button>
        <el-button size="small" @click="openMerchantH5">打开 H5 店铺</el-button>
        <el-button size="small" @click="copyWorkbenchLink">复制营销后台链接</el-button>
      </div>
    </el-card>

    <el-alert v-if="catalogError" class="scope-alert section-error" type="error" show-icon :closable="false" title="店铺营销商品或分类加载失败">
      <template #default><span>{{ catalogError }}</span><el-button size="small" @click="loadProductsAndCategories">重试商品与分类</el-button></template>
    </el-alert>
    <el-alert v-if="platformCatalogError && couponForm.issuerScope === 'platform'" class="scope-alert section-error" type="warning" show-icon :closable="false" title="平台券适用范围加载不完整">
      <template #default><span>{{ platformCatalogError }}</span><el-button size="small" @click="loadProductsAndCategories">重试平台范围</el-button></template>
    </el-alert>

    <el-alert
      v-if="selectedMerchant && !selectedMerchantOpen"
      class="scope-alert"
      type="warning"
      show-icon
      :closable="false"
      title="当前店铺未开放商城"
      :description="selectedMerchantDisabledReason"
    />

    <div class="summary-grid">
      <el-card v-for="item in summaryCards" :key="item.label" shadow="never">
        <small>{{ item.label }}</small>
        <strong>{{ item.value }}</strong>
        <span>{{ item.desc }}</span>
      </el-card>
    </div>

    <el-tabs v-model="activeTab" class="marketing-tabs" :before-leave="guardMarketingTabChange" @tab-change="loadActiveTab">
      <el-tab-pane label="优惠券" name="coupons">
        <section class="tool-section">
          <el-card shadow="never" class="form-card">
            <template #header>
              <div class="section-header">
                <span>{{ couponForm.id ? "编辑优惠券" : "新增优惠券" }}</span>
                <el-button v-if="couponForm.id" size="small" :disabled="writeLocked" @click="resetCouponForm">取消编辑</el-button>
              </div>
            </template>
            <el-form label-width="92px">
              <el-form-item label="归属店铺" required><span class="form-scope">{{ selectedMerchantName }}</span></el-form-item>
              <el-form-item label="发行方">
                <el-segmented v-model="couponForm.issuerScope" :options="[{ label: '平台券', value: 'platform' }, { label: '店铺券', value: 'merchant' }]" @change="handleCouponIssuerChange" />
              </el-form-item>
              <el-form-item label="券码" required><el-input v-model="couponForm.code" maxlength="40" placeholder="如 QIWAI20" /></el-form-item>
              <el-form-item label="名称" required><el-input v-model="couponForm.name" maxlength="80" placeholder="如 新客满减券" /></el-form-item>
              <el-form-item label="门槛/优惠">
                <div class="inline-fields">
                  <el-input-number v-model="couponForm.minAmount" :min="0" :precision="2" placeholder="满多少" />
                  <el-input-number v-model="couponForm.discountAmount" :min="0" :precision="2" placeholder="减多少" />
                </div>
              </el-form-item>
              <el-form-item label="适用范围">
                <div class="inline-fields">
                  <el-select v-model="couponForm.scope" style="width:150px">
                    <el-option label="全店通用" value="all" />
                    <el-option label="指定分类" value="category" />
                    <el-option label="指定商品" value="product" />
                  </el-select>
                  <el-select v-if="couponForm.scope === 'category'" v-model="couponForm.scopeCategoryId" filterable placeholder="选择分类" style="width:220px">
                    <el-option v-for="category in couponCategoryOptions" :key="category.id" :label="category.name" :value="category.id" />
                  </el-select>
                  <el-select v-if="couponForm.scope === 'product'" v-model="couponForm.scopeProductId" filterable placeholder="选择商品" style="width:260px">
                    <el-option v-for="product in couponProductOptions" :key="product.id" :label="product.title" :value="product.id" />
                  </el-select>
                </div>
              </el-form-item>
              <el-form-item label="限制">
                <div class="inline-fields">
                  <el-input-number v-model="couponForm.issuanceLimit" :min="0" :precision="0" placeholder="发放总量，0不限" />
                  <el-input-number v-model="couponForm.usageLimit" :min="0" :precision="0" placeholder="核销总量，0不限" />
                  <el-input-number v-model="couponForm.perUserLimit" :min="0" :precision="0" placeholder="每人限用，0不限" />
                </div>
              </el-form-item>
              <el-form-item label="有效期">
                <div class="inline-fields">
                  <el-date-picker v-model="couponForm.startsAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="开始时间" />
                  <el-date-picker v-model="couponForm.endsAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="结束时间" />
                </div>
              </el-form-item>
              <el-form-item label="退款返券">
                <el-select v-model="couponForm.refundReleasePolicy" style="width:260px">
                  <el-option label="全额退款后返还" value="full_refund" />
                  <el-option label="退款后不返还" value="never" />
                </el-select>
              </el-form-item>
              <el-form-item label="启用"><el-switch v-model="couponForm.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
              <el-button type="primary" :loading="couponSaving" :disabled="!canOperateSelectedMerchant || writeLocked" :title="operationScopeTip" @click="saveCoupon">{{ couponForm.id ? "保存优惠券" : "新增优惠券" }}</el-button>
            </el-form>
          </el-card>

          <el-card shadow="never" class="table-card">
            <template #header>
              <div class="section-header">
                <span>优惠券列表</span>
                <div>
                  <el-select v-model="couponFilters.status" :disabled="writeLocked" clearable placeholder="运营状态" size="small" style="width:140px" @change="loadCoupons">
                    <el-option label="可领取/可使用" value="active" />
                    <el-option label="未开始" value="not_started" />
                    <el-option label="已过期" value="expired" />
                    <el-option label="已用完" value="exhausted" />
                    <el-option label="已停用" value="disabled" />
                  </el-select>
                  <el-button size="small" :loading="couponLoading" :disabled="writeLocked" @click="loadCoupons">刷新</el-button>
                </div>
              </div>
            </template>
            <el-alert v-if="couponError" class="section-error" type="error" show-icon :closable="false" title="优惠券列表加载失败"><template #default><span>{{ couponError }}</span><el-button size="small" @click="loadCoupons">重试优惠券</el-button></template></el-alert>
            <el-table v-loading="couponLoading" :data="coupons" stripe empty-text="暂无优惠券">
              <el-table-column label="券码" width="150"><template #default="{ row }"><strong>{{ row.code }}</strong><small>{{ row.name }}</small></template></el-table-column>
              <el-table-column label="发行方" min-width="160"><template #default="{ row }"><strong>{{ couponIssuerText(row) }}</strong><small>{{ row.merchant?.name || row.tenant?.name || "租户平台" }}</small></template></el-table-column>
              <el-table-column label="优惠" width="130"><template #default="{ row }">满 ¥{{ money(row.minAmount) }} 减 ¥{{ money(row.discountAmount) }}</template></el-table-column>
              <el-table-column label="范围" min-width="150"><template #default="{ row }">{{ couponScopeText(row) }}</template></el-table-column>
              <el-table-column label="领取" width="130"><template #default="{ row }">{{ row.claimedCount || 0 }} / {{ row.issuanceLimit || "不限" }}</template></el-table-column>
              <el-table-column label="使用" width="130"><template #default="{ row }">{{ row.usedCount || 0 }} / {{ row.usageLimit || "不限" }}</template></el-table-column>
              <el-table-column label="退款返券" width="130"><template #default="{ row }">{{ couponRefundPolicyText(row.refundReleasePolicy) }}</template></el-table-column>
              <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="couponStatusType(row.runtimeStatus)">{{ couponStatusText(row.runtimeStatus) }}</el-tag></template></el-table-column>
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="{ row }">
                  <el-button size="small" :disabled="writeLocked" @click="editCoupon(row)">编辑</el-button>
                  <el-button size="small" :type="row.enabled ? 'warning' : 'success'" plain :loading="actionKey === `coupon:toggle:${row.id}`" :disabled="writeLocked" @click="toggleCoupon(row)">{{ row.enabled ? "停用" : "启用" }}</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-divider>使用记录</el-divider>
            <el-alert v-if="couponUsageError" class="section-error" type="error" show-icon :closable="false" title="优惠券使用记录加载失败"><template #default><span>{{ couponUsageError }}</span><el-button size="small" @click="loadCouponUsages">重试使用记录</el-button></template></el-alert>
            <el-table v-loading="couponUsageLoading" :data="couponUsages" size="small" border empty-text="暂无使用记录">
              <el-table-column label="券码" width="140"><template #default="{ row }">{{ row.code }}</template></el-table-column>
              <el-table-column label="订单" width="180"><template #default="{ row }">{{ row.order?.orderNo || "-" }}</template></el-table-column>
              <el-table-column label="用户" width="130"><template #default="{ row }">{{ row.user?.phone ? maskPhone(row.user.phone) : row.user?.nickname || "-" }}</template></el-table-column>
              <el-table-column label="优惠" width="100"><template #default="{ row }">¥{{ money(row.discountAmount) }}</template></el-table-column>
              <el-table-column label="状态" width="100"><template #default="{ row }">{{ couponUsageStatusText(row.status) }}</template></el-table-column>
              <el-table-column label="时间" min-width="160"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
            </el-table>
          </el-card>
        </section>
      </el-tab-pane>

      <el-tab-pane label="秒杀" name="flash">
        <section class="tool-section">
          <el-card shadow="never" class="form-card">
            <template #header><div class="section-header"><span>{{ flashSaleForm.id ? "编辑秒杀" : "新增秒杀" }}</span><el-button v-if="flashSaleForm.id" size="small" :disabled="writeLocked" @click="resetFlashSaleForm">取消编辑</el-button></div></template>
            <activity-form type="flash" />
          </el-card>
          <el-card shadow="never" class="table-card">
            <template #header>
              <div class="section-header">
                <span>秒杀活动</span>
                <div>
                  <el-select v-model="flashSaleFilters.status" :disabled="writeLocked" clearable placeholder="全部状态" size="small" style="width:130px" @change="loadFlashSales">
                    <el-option label="草稿" value="draft" />
                    <el-option label="进行中" value="active" />
                    <el-option label="已停用" value="disabled" />
                  </el-select>
                  <el-button size="small" :loading="flashSaleLoading" :disabled="writeLocked" @click="loadFlashSales">刷新</el-button>
                </div>
              </div>
            </template>
            <el-alert v-if="flashSaleError" class="section-error" type="error" show-icon :closable="false" title="秒杀活动加载失败"><template #default><span>{{ flashSaleError }}</span><el-button size="small" @click="loadFlashSales">重试秒杀活动</el-button></template></el-alert>
            <el-table v-loading="flashSaleLoading" :data="flashSales" stripe empty-text="暂无秒杀活动">
              <el-table-column label="活动" min-width="220"><template #default="{ row }"><strong>{{ row.title }}</strong><small>{{ row.product?.title || "-" }} / {{ row.sku?.name || "-" }}</small></template></el-table-column>
              <el-table-column label="店铺" min-width="150"><template #default="{ row }">{{ row.merchant?.name || "-" }}</template></el-table-column>
              <el-table-column label="价格/库存" width="140"><template #default="{ row }">¥{{ money(row.salePrice) }} · {{ row.soldStock || 0 }}/{{ row.saleStock || 0 }}</template></el-table-column>
              <el-table-column label="时间" min-width="210"><template #default="{ row }">{{ formatTime(row.startsAt) }} 至 {{ formatTime(row.endsAt) }}</template></el-table-column>
              <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="activityStatusType(row.runtimeStatus || row.status)">{{ activityStatusText(row.runtimeStatus || row.status) }}</el-tag></template></el-table-column>
              <el-table-column label="操作" width="150" fixed="right"><template #default="{ row }"><el-button size="small" :disabled="writeLocked" @click="editFlashSale(row)">编辑</el-button><el-button size="small" :type="row.status === 'active' ? 'warning' : 'success'" plain :loading="actionKey === `flash:toggle:${row.id}`" :disabled="writeLocked" @click="toggleFlashSale(row)">{{ row.status === "active" ? "停用" : "启用" }}</el-button></template></el-table-column>
            </el-table>
          </el-card>
        </section>
      </el-tab-pane>

      <el-tab-pane label="拼团" name="group">
        <section class="tool-section">
          <el-card shadow="never" class="form-card">
            <template #header><div class="section-header"><span>{{ groupBuyForm.id ? "编辑拼团" : "新增拼团" }}</span><el-button v-if="groupBuyForm.id" size="small" :disabled="writeLocked" @click="resetGroupBuyForm">取消编辑</el-button></div></template>
            <activity-form type="group" />
          </el-card>
          <el-card shadow="never" class="table-card">
            <template #header>
              <div class="section-header">
                <span>拼团活动</span>
                <div>
                  <el-select v-model="groupBuyFilters.status" :disabled="writeLocked" clearable placeholder="全部状态" size="small" style="width:130px" @change="loadGroupBuys">
                    <el-option label="草稿" value="draft" />
                    <el-option label="进行中" value="active" />
                    <el-option label="已停用" value="disabled" />
                  </el-select>
                  <el-button size="small" :loading="groupBuyLoading" :disabled="writeLocked" @click="loadGroupBuys">刷新</el-button>
                </div>
              </div>
            </template>
            <el-alert v-if="groupBuyError" class="section-error" type="error" show-icon :closable="false" title="拼团活动加载失败"><template #default><span>{{ groupBuyError }}</span><el-button size="small" @click="loadGroupBuys">重试拼团活动</el-button></template></el-alert>
            <el-table v-loading="groupBuyLoading" :data="groupBuys" stripe empty-text="暂无拼团活动">
              <el-table-column label="活动" min-width="220"><template #default="{ row }"><strong>{{ row.title }}</strong><small>{{ row.product?.title || "-" }} / {{ row.sku?.name || "-" }}</small></template></el-table-column>
              <el-table-column label="店铺" min-width="150"><template #default="{ row }">{{ row.merchant?.name || "-" }}</template></el-table-column>
              <el-table-column label="价格/人数" width="150"><template #default="{ row }">¥{{ money(row.groupPrice) }} · {{ row.minPeople || 2 }}人成团</template></el-table-column>
              <el-table-column label="库存" width="120"><template #default="{ row }">{{ row.soldStock || 0 }}/{{ row.groupStock || 0 }}</template></el-table-column>
              <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="activityStatusType(row.runtimeStatus || row.status)">{{ activityStatusText(row.runtimeStatus || row.status) }}</el-tag></template></el-table-column>
              <el-table-column label="操作" width="150" fixed="right"><template #default="{ row }"><el-button size="small" :disabled="writeLocked" @click="editGroupBuy(row)">编辑</el-button><el-button size="small" :type="row.status === 'active' ? 'warning' : 'success'" plain :loading="actionKey === `group:toggle:${row.id}`" :disabled="writeLocked" @click="toggleGroupBuy(row)">{{ row.status === "active" ? "停用" : "启用" }}</el-button></template></el-table-column>
            </el-table>
            <el-divider>参团记录</el-divider>
            <el-alert v-if="groupBuyRecordError" class="section-error" type="error" show-icon :closable="false" title="参团记录加载失败"><template #default><span>{{ groupBuyRecordError }}</span><el-button size="small" @click="loadGroupBuyRecords">重试参团记录</el-button></template></el-alert>
            <el-table v-loading="groupBuyRecordLoading" :data="groupBuyRecords" size="small" border empty-text="暂无参团记录">
              <el-table-column label="团号" width="150"><template #default="{ row }">{{ row.teamNo || "-" }}</template></el-table-column>
              <el-table-column label="活动" min-width="180"><template #default="{ row }">{{ row.title || row.groupBuy?.title || "-" }}</template></el-table-column>
              <el-table-column label="用户" width="130"><template #default="{ row }">{{ row.user?.phone ? maskPhone(row.user.phone) : row.user?.nickname || "-" }}</template></el-table-column>
              <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="groupBuyTeamStatusType(row.teamStatus)">{{ groupBuyTeamStatusText(row.teamStatus) }}</el-tag></template></el-table-column>
              <el-table-column label="订单" width="180"><template #default="{ row }">{{ row.order?.orderNo || "-" }}</template></el-table-column>
              <el-table-column label="时间" min-width="160"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
            </el-table>
          </el-card>
        </section>
      </el-tab-pane>

      <el-tab-pane label="推广码" name="promotions">
        <section class="tool-section">
          <el-card shadow="never" class="form-card">
            <template #header>
              <div class="section-header">
                <span>{{ promotionForm.id ? "编辑推广码" : "新增推广码" }}</span>
                <el-button v-if="promotionForm.id" size="small" :disabled="writeLocked" @click="resetPromotionForm">取消编辑</el-button>
              </div>
            </template>
            <el-form label-width="92px">
              <el-form-item label="归属店铺" required><span class="form-scope">{{ selectedMerchantName }}</span></el-form-item>
              <el-form-item label="推广码" required><el-input v-model="promotionForm.code" maxlength="40" placeholder="如 AGENT001" /></el-form-item>
              <el-form-item label="名称" required><el-input v-model="promotionForm.name" maxlength="80" placeholder="如 铜梁代理推广" /></el-form-item>
              <el-form-item label="代理">
                <el-select v-model="promotionForm.agentId" clearable filterable placeholder="可选：绑定代理" style="width:260px">
                  <el-option v-for="agent in agents" :key="agent.id" :label="agentLabel(agent)" :value="agent.id" />
                </el-select>
              </el-form-item>
              <el-form-item label="佣金比例"><el-input-number v-model="promotionForm.commissionRatePercent" :min="0" :max="100" :precision="2" /><span class="form-hint">%</span></el-form-item>
              <el-form-item label="有效期">
                <div class="inline-fields">
                  <el-date-picker v-model="promotionForm.startsAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="开始时间（可选）" />
                  <el-date-picker v-model="promotionForm.endsAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="结束时间（可选）" />
                </div>
              </el-form-item>
              <el-alert v-if="agentError" class="section-error" type="error" show-icon :closable="false" title="推广代理加载失败"><template #default><span>{{ agentError }}</span><el-button size="small" @click="loadAgents">重试推广代理</el-button></template></el-alert>
              <el-form-item label="备注"><el-input v-model="promotionForm.remark" type="textarea" :rows="3" placeholder="内部结算说明、合作范围或风控备注" /></el-form-item>
              <el-form-item label="启用"><el-switch v-model="promotionForm.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
              <el-button type="primary" :loading="promotionSaving" :disabled="!canOperateSelectedMerchant || writeLocked" :title="operationScopeTip" @click="savePromotionCode">{{ promotionForm.id ? "保存推广码" : "新增推广码" }}</el-button>
            </el-form>
          </el-card>
          <el-card shadow="never" class="table-card">
            <template #header>
              <div class="section-header">
                <span>推广码列表</span>
                <div>
                  <el-select v-model="promotionFilters.enabled" :disabled="writeLocked" clearable placeholder="全部状态" size="small" style="width:120px" @change="loadPromotionCodes">
                    <el-option label="启用" value="true" />
                    <el-option label="停用" value="false" />
                  </el-select>
                  <el-button size="small" :loading="promotionLoading" :disabled="writeLocked" @click="loadPromotionCodes">刷新</el-button>
                </div>
              </div>
            </template>
            <el-alert v-if="promotionError" class="section-error" type="error" show-icon :closable="false" title="推广码加载失败"><template #default><span>{{ promotionError }}</span><el-button size="small" @click="loadPromotionCodes">重试推广码</el-button></template></el-alert>
            <el-table v-loading="promotionLoading" :data="promotionCodes" stripe empty-text="暂无推广码">
              <el-table-column label="推广码" width="160"><template #default="{ row }"><strong>{{ row.code }}</strong><small>{{ row.name }}</small></template></el-table-column>
              <el-table-column label="店铺" min-width="160"><template #default="{ row }">{{ row.merchant?.name || "-" }}</template></el-table-column>
              <el-table-column label="代理/推广人" min-width="180"><template #default="{ row }">{{ row.agent?.name || maskPhone(row.promoterUser?.phone) }}</template></el-table-column>
              <el-table-column label="佣金" width="100"><template #default="{ row }">{{ percent(row.commissionRate) }}%</template></el-table-column>
              <el-table-column label="有效期" min-width="210"><template #default="{ row }">{{ promotionValidityText(row) }}</template></el-table-column>
              <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "启用" : "停用" }}</el-tag></template></el-table-column>
              <el-table-column label="操作" width="150" fixed="right"><template #default="{ row }"><el-button size="small" :disabled="writeLocked" @click="editPromotionCode(row)">编辑</el-button><el-button size="small" :type="row.enabled ? 'warning' : 'success'" plain :loading="actionKey === `promotion:toggle:${row.id}`" :disabled="writeLocked" @click="togglePromotionCode(row)">{{ row.enabled ? "停用" : "启用" }}</el-button></template></el-table-column>
            </el-table>
            <el-divider>促销请求风控记录</el-divider>
            <div class="promotion-toolbar">
              <el-select v-model="promotionRiskFilters.outcome" :disabled="writeLocked" clearable placeholder="全部结果" size="small" style="width:130px" @change="loadPromotionRiskEvents">
                <el-option label="已放行" value="allowed" />
                <el-option label="待复核" value="review" />
                <el-option label="已拦截" value="blocked" />
              </el-select>
              <el-button size="small" :loading="promotionRiskLoading" :disabled="writeLocked" @click="loadPromotionRiskEvents">刷新风控记录</el-button>
            </div>
            <el-alert v-if="promotionRiskError" class="section-error" type="error" show-icon :closable="false" title="促销风控记录加载失败"><template #default><span>{{ promotionRiskError }}</span><el-button size="small" @click="loadPromotionRiskEvents">重试风控记录</el-button></template></el-alert>
            <el-table v-loading="promotionRiskLoading" :data="promotionRiskEvents" size="small" border empty-text="暂无促销风控记录">
              <el-table-column label="结果" width="90"><template #default="{ row }"><el-tag :type="promotionRiskOutcomeType(row.outcome)">{{ promotionRiskOutcomeText(row.outcome) }}</el-tag></template></el-table-column>
              <el-table-column label="业务" width="140"><template #default="{ row }">{{ promotionRiskTypeText(row.promotionType) }} #{{ row.promotionId || "-" }}</template></el-table-column>
              <el-table-column label="用户" min-width="150"><template #default="{ row }">{{ row.user?.phone ? maskPhone(row.user.phone) : row.user?.nickname || row.user?.id || "-" }}</template></el-table-column>
              <el-table-column label="窗口计数" min-width="180"><template #default="{ row }">用户 {{ row.detail?.counts?.user || 0 }} / 设备 {{ row.detail?.counts?.device || 0 }} / IP {{ row.detail?.counts?.ip || 0 }}</template></el-table-column>
              <el-table-column label="设备/IP 指纹" min-width="190"><template #default="{ row }">{{ row.deviceFingerprint || "-" }} / {{ row.ipFingerprint || "-" }}</template></el-table-column>
              <el-table-column prop="reason" label="原因" min-width="220" show-overflow-tooltip />
              <el-table-column label="请求" min-width="190"><template #default="{ row }">{{ row.requestId || row.clientOrderKey || "-" }}</template></el-table-column>
              <el-table-column label="时间" min-width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
            </el-table>
            <el-divider>营销风险告警</el-divider>
            <div class="promotion-toolbar">
              <el-select v-model="promotionAlertFilters.status" :disabled="writeLocked" clearable placeholder="全部告警" size="small" style="width:130px" @change="loadPromotionRiskAlerts">
                <el-option label="待处理" value="open" />
                <el-option label="已解决" value="resolved" />
                <el-option label="已忽略" value="ignored" />
              </el-select>
              <el-button size="small" :loading="promotionAlertLoading" :disabled="writeLocked" @click="loadPromotionRiskAlerts">刷新告警</el-button>
            </div>
            <el-alert v-if="promotionAlertError" class="section-error" type="error" show-icon :closable="false" title="营销风险告警加载失败"><template #default><span>{{ promotionAlertError }}</span><el-button size="small" @click="loadPromotionRiskAlerts">重试风险告警</el-button></template></el-alert>
            <el-table v-loading="promotionAlertLoading" :data="promotionRiskAlerts" size="small" border empty-text="暂无营销风险告警">
              <el-table-column label="等级" width="90"><template #default="{ row }"><el-tag :type="promotionAlertSeverityType(row.severity)">{{ promotionAlertSeverityText(row.severity) }}</el-tag></template></el-table-column>
              <el-table-column label="状态" width="90"><template #default="{ row }">{{ promotionAlertStatusText(row.status) }}</template></el-table-column>
              <el-table-column prop="title" label="告警" min-width="210" show-overflow-tooltip />
              <el-table-column prop="message" label="说明" min-width="260" show-overflow-tooltip />
              <el-table-column label="发生次数" width="100"><template #default="{ row }">{{ row.occurrenceCount || 1 }}</template></el-table-column>
              <el-table-column label="最近发现" min-width="170"><template #default="{ row }">{{ formatTime(row.lastDetectedAt) }}</template></el-table-column>
              <el-table-column label="处理记录" min-width="200"><template #default="{ row }">{{ row.resolvedBy || "-" }}<small>{{ row.resolutionRemark || "" }}</small></template></el-table-column>
              <el-table-column label="操作" width="190" fixed="right">
                <template #default="{ row }">
                  <template v-if="row.status === 'open'">
                    <el-button size="small" type="success" plain :loading="actionKey === `alert:resolved:${row.id}`" :disabled="writeLocked" @click="reviewPromotionRiskAlert(row, 'resolved')">解决</el-button>
                    <el-button size="small" :loading="actionKey === `alert:ignored:${row.id}`" :disabled="writeLocked" @click="reviewPromotionRiskAlert(row, 'ignored')">忽略</el-button>
                  </template>
                  <el-button v-else size="small" type="warning" plain :loading="actionKey === `alert:open:${row.id}`" :disabled="writeLocked" @click="reviewPromotionRiskAlert(row, 'open')">重新打开</el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>
        </section>
      </el-tab-pane>

      <el-tab-pane v-if="canManageCommissionRules" label="佣金规则" name="commissions">
        <section class="tool-section">
          <el-card shadow="never" class="form-card">
            <template #header><div class="section-header"><span>{{ commissionRuleForm.sourceId ? "发布规则新版本" : "新增佣金规则" }}</span><el-button v-if="commissionRuleForm.sourceId" size="small" :disabled="writeLocked" @click="resetCommissionRuleForm">取消</el-button></div></template>
            <el-form label-width="96px">
              <el-form-item label="规则范围" required>
                <el-segmented v-model="commissionRuleForm.scopeType" :options="commissionScopeOptions" @change="handleCommissionScopeChange" />
              </el-form-item>
              <el-form-item label="规则标识"><el-input v-model="commissionRuleForm.ruleKey" maxlength="64" placeholder="同一标识每次保存自动递增版本" /></el-form-item>
              <el-form-item label="规则名称" required><el-input v-model="commissionRuleForm.name" maxlength="120" placeholder="如 夏季课程商品推广规则" /></el-form-item>
              <el-form-item v-if="commissionRuleForm.scopeType === 'merchant'" label="适用店铺" required><span class="form-scope">{{ selectedMerchantName }}</span></el-form-item>
              <el-form-item v-if="commissionRuleForm.scopeType === 'product'" label="适用商品" required>
                <el-select v-model="commissionRuleForm.productId" filterable style="width:100%" placeholder="选择商品"><el-option v-for="item in products" :key="item.id" :label="item.title" :value="item.id" /></el-select>
              </el-form-item>
              <el-form-item v-if="commissionRuleForm.scopeType === 'channel'" label="推广渠道" required>
                <el-select v-model="commissionRuleForm.promotionCodeId" filterable style="width:100%" placeholder="选择推广码"><el-option v-for="item in promotionCodes" :key="item.id" :label="`${item.code} · ${item.name}`" :value="item.id" /></el-select>
              </el-form-item>
              <el-form-item label="直接佣金"><el-input-number v-model="commissionRuleForm.directRatePercent" :min="0" :max="100" :precision="2" /><span class="form-hint">%</span></el-form-item>
              <el-form-item label="代理层级">
                <div class="inline-fields commission-levels">
                  <el-input-number v-for="(_, index) in commissionRuleForm.agentLevelRatesPercent" :key="index" v-model="commissionRuleForm.agentLevelRatesPercent[index]" :min="0" :max="100" :precision="2" :placeholder="`L${index + 1}%`" />
                </div>
              </el-form-item>
              <el-form-item label="优先级/有效期">
                <div class="inline-fields">
                  <el-input-number v-model="commissionRuleForm.priority" :precision="0" placeholder="同范围优先级" />
                  <el-date-picker v-model="commissionRuleForm.startsAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="开始时间" />
                  <el-date-picker v-model="commissionRuleForm.endsAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="结束时间" />
                </div>
              </el-form-item>
              <el-form-item label="备注"><el-input v-model="commissionRuleForm.remark" type="textarea" :rows="3" maxlength="500" /></el-form-item>
              <el-button type="primary" :loading="commissionRuleSaving" :disabled="!canSaveCommissionRule || writeLocked" @click="saveCommissionRule">{{ commissionRuleForm.sourceId ? "发布新版本" : "发布规则" }}</el-button>
            </el-form>
          </el-card>
          <el-card shadow="never" class="table-card">
            <template #header><div class="section-header"><span>佣金规则版本</span><div><el-select v-model="commissionRuleFilters.status" :disabled="writeLocked" clearable size="small" placeholder="全部状态" style="width:130px" @change="loadCommissionRules"><el-option label="生效中" value="active" /><el-option label="已停用" value="retired" /></el-select><el-button size="small" :loading="commissionRuleLoading" :disabled="writeLocked" @click="loadCommissionRules">刷新</el-button></div></div></template>
            <el-alert v-if="commissionRuleError" class="section-error" type="error" show-icon :closable="false" title="佣金规则加载失败"><template #default><span>{{ commissionRuleError }}</span><el-button size="small" @click="loadCommissionRules">重试佣金规则</el-button></template></el-alert>
            <el-table v-loading="commissionRuleLoading" :data="commissionRules" stripe empty-text="暂无佣金规则">
              <el-table-column label="规则/版本" min-width="210"><template #default="{ row }"><strong>{{ row.name }}</strong><small>{{ row.ruleKey }} · v{{ row.version }}</small></template></el-table-column>
              <el-table-column label="范围" min-width="180"><template #default="{ row }">{{ commissionScopeText(row) }}</template></el-table-column>
              <el-table-column label="直接/代理" min-width="190"><template #default="{ row }">{{ bpsPercent(row.directRateBps) }}%<small>代理 {{ (row.agentLevelRatesBps || []).map(bpsPercent).join('% / ') || '无' }}{{ row.agentLevelRatesBps?.length ? '%' : '' }}</small></template></el-table-column>
              <el-table-column label="有效期" min-width="220"><template #default="{ row }">{{ promotionValidityText(row) }}</template></el-table-column>
              <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.status === 'active' ? 'success' : 'info'">{{ row.status === "active" ? "生效中" : "已停用" }}</el-tag></template></el-table-column>
              <el-table-column label="操作" width="180" fixed="right"><template #default="{ row }"><el-button size="small" :disabled="writeLocked" @click="versionCommissionRule(row)">新版本</el-button><el-button v-if="row.status === 'active'" size="small" type="warning" plain :loading="actionKey === `rule:retire:${row.id}`" :disabled="writeLocked" @click="retireCommissionRule(row)">停用</el-button></template></el-table-column>
            </el-table>
          </el-card>
        </section>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElButton, ElDatePicker, ElForm, ElFormItem, ElInput, ElInputNumber, ElMessage, ElMessageBox, ElOption, ElSelect } from "element-plus";
import { api } from "../api";
import { hasPermission, isPlatformAdmin } from "../permissions";
import { copyToClipboard, h5RoutePreviewUrl } from "../h5-preview";
import { maskPhone } from "../privacy";

type Merchant = {
  id: number;
  code?: string;
  name?: string;
  ownerType?: string;
  status?: string;
  mallEnabled?: boolean;
  paymentMode?: string;
  productAuditRequired?: boolean;
  region?: string | null;
  tenant?: { id?: number; name?: string; code?: string } | null;
};

const route = useRoute();
const router = useRouter();
const tenants = ref<any[]>([]);
const merchants = ref<Merchant[]>([]);
const products = ref<any[]>([]);
const categories = ref<any[]>([]);
const platformProducts = ref<any[]>([]);
const platformCategories = ref<any[]>([]);
const coupons = ref<any[]>([]);
const couponUsages = ref<any[]>([]);
const flashSales = ref<any[]>([]);
const groupBuys = ref<any[]>([]);
const groupBuyRecords = ref<any[]>([]);
const promotionCodes = ref<any[]>([]);
const promotionRiskEvents = ref<any[]>([]);
const promotionRiskAlerts = ref<any[]>([]);
const commissionRules = ref<any[]>([]);
const agents = ref<any[]>([]);
const canManageCommissionRules = computed(() => hasPermission("mall.settlement.manage"));
const marketingTabs = computed(() => ["coupons", "flash", "group", "promotions", ...(canManageCommissionRules.value ? ["commissions"] : [])]);
const activeTab = ref(routeTab());
const keyword = ref("");
const deepLinkWarning = ref("");
const tenantError = ref("");
const merchantError = ref("");
const catalogError = ref("");
const platformCatalogError = ref("");
const couponError = ref("");
const couponUsageError = ref("");
const flashSaleError = ref("");
const groupBuyError = ref("");
const groupBuyRecordError = ref("");
const agentError = ref("");
const promotionError = ref("");
const promotionRiskError = ref("");
const promotionAlertError = ref("");
const commissionRuleError = ref("");
const actionKey = ref("");
const merchantLoading = ref(false);
const productLoading = ref(false);
const couponLoading = ref(false);
const couponUsageLoading = ref(false);
const couponSaving = ref(false);
const flashSaleLoading = ref(false);
const flashSaleSaving = ref(false);
const groupBuyLoading = ref(false);
const groupBuyRecordLoading = ref(false);
const groupBuySaving = ref(false);
const promotionLoading = ref(false);
const promotionSaving = ref(false);
const promotionRiskLoading = ref(false);
const promotionAlertLoading = ref(false);
const commissionRuleLoading = ref(false);
const commissionRuleSaving = ref(false);
let tenantLoadSequence = 0;
let merchantLoadSequence = 0;
let catalogLoadSequence = 0;
let couponLoadSequence = 0;
let couponUsageLoadSequence = 0;
let flashSaleLoadSequence = 0;
let groupBuyLoadSequence = 0;
let groupBuyRecordLoadSequence = 0;
let agentLoadSequence = 0;
let promotionLoadSequence = 0;
let promotionRiskLoadSequence = 0;
let promotionAlertLoadSequence = 0;
let commissionRuleLoadSequence = 0;
const filters = reactive({ tenantId: routeTenantId(), merchantId: routeMerchantId() });
const couponFilters = reactive({ status: "" });
const flashSaleFilters = reactive({ status: "" });
const groupBuyFilters = reactive({ status: "" });
const promotionFilters = reactive({ enabled: "" });
const promotionRiskFilters = reactive({ outcome: "" });
const promotionAlertFilters = reactive({ status: "open" });
const commissionRuleFilters = reactive({ status: "active" });
const couponForm = reactive<any>({ id: null, code: "", name: "", issuerScope: "merchant", refundReleasePolicy: "full_refund", minAmount: 0, discountAmount: 0, scope: "all", scopeCategoryId: null, scopeProductId: null, issuanceLimit: 0, claimedCount: 0, usageLimit: 0, perUserLimit: 0, startsAt: "", endsAt: "", enabled: true });
const flashSaleForm = reactive<any>({ id: null, title: "", originalTitle: "", productId: null, skuId: null, originalSkuId: null, salePrice: 0, saleStock: 1, lockedStock: 0, soldStock: 0, perUserLimit: 1, startsAt: "", endsAt: "", status: "draft", sortOrder: 0 });
const groupBuyForm = reactive<any>({ id: null, title: "", originalTitle: "", productId: null, skuId: null, originalSkuId: null, groupPrice: 0, minPeople: 2, groupStock: 1, lockedStock: 0, soldStock: 0, perUserLimit: 1, startsAt: "", endsAt: "", status: "draft", sortOrder: 0 });
const promotionForm = reactive<any>({ id: null, code: "", name: "", commissionRatePercent: 0, promoterUserId: null, agentId: null, startsAt: "", endsAt: "", enabled: true, remark: "", orderCount: 0, originalCode: "", originalAgentId: null, originalPromoterUserId: null, originalCommissionRatePercent: 0 });
const commissionRuleForm = reactive<any>({ sourceId: null, ruleKey: "", name: "", scopeType: "channel", productId: null, promotionCodeId: null, directRatePercent: 0, agentLevelRatesPercent: [0, 0, 0], priority: 0, startsAt: "", endsAt: "", remark: "" });
const commissionScopeOptions = [{ label: "租户", value: "tenant" }, { label: "店铺", value: "merchant" }, { label: "推广渠道", value: "channel" }, { label: "商品", value: "product" }];
const selectedMerchant = computed(() => merchants.value.find((merchant) => merchant.id === filters.merchantId));
const selectedMerchantOpen = computed(() => merchantOperational(selectedMerchant.value));
const selectedMerchantDisabledReason = computed(() => merchantDisabledReason(selectedMerchant.value));
const selectedMerchantName = computed(() => selectedMerchant.value ? `${selectedMerchant.value.name || selectedMerchant.value.code}（${merchantOwnerText(selectedMerchant.value)}）` : "请先在页面顶部选择店铺");
const canOperateSelectedMerchant = computed(() => !deepLinkWarning.value && !!filters.merchantId && selectedMerchantOpen.value);
const canSaveCommissionRule = computed(() => {
  if (!canManageCommissionRules.value) return false;
  if (!commissionRuleForm.name.trim()) return false;
  if (commissionRuleForm.scopeType === "tenant") return Boolean(!isPlatformAdmin() || filters.tenantId || selectedMerchant.value?.tenant?.id);
  if (!canOperateSelectedMerchant.value) return false;
  if (commissionRuleForm.scopeType === "product") return Boolean(commissionRuleForm.productId);
  if (commissionRuleForm.scopeType === "channel") return Boolean(commissionRuleForm.promotionCodeId);
  return true;
});
const operationScopeTip = computed(() => {
  if (deepLinkWarning.value) return "当前商城营销店铺链接不可用，请先确认店铺授权后再操作。";
  if (!selectedMerchant.value && isPlatformAdmin()) return "当前是平台全局查看模式；新增、编辑、启停营销内容前，请先选择具体店铺。";
  if (!selectedMerchant.value && merchants.value.length > 1) return "当前账号可管理多个商城店铺，请先选择具体店铺后再操作。";
  if (!selectedMerchant.value) return "当前账号暂无可运营店铺，请联系平台管理员授权。";
  if (!selectedMerchantOpen.value) return selectedMerchantDisabledReason.value;
  return "";
});
const selectedFlashSaleSkus = computed(() => products.value.find((item) => item.id === flashSaleForm.productId)?.skus || []);
const selectedGroupBuySkus = computed(() => products.value.find((item) => item.id === groupBuyForm.productId)?.skus || []);
const selectedFlashSaleSku = computed(() => selectedFlashSaleSkus.value.find((sku: any) => sku.id === flashSaleForm.skuId));
const selectedGroupBuySku = computed(() => selectedGroupBuySkus.value.find((sku: any) => sku.id === groupBuyForm.skuId));
const couponCategoryOptions = computed(() => couponForm.issuerScope === "platform" ? platformCategories.value : categories.value);
const couponProductOptions = computed(() => couponForm.issuerScope === "platform" ? platformProducts.value : products.value);
const loadingAny = computed(() => merchantLoading.value || productLoading.value || couponLoading.value || couponUsageLoading.value || flashSaleLoading.value || groupBuyLoading.value || groupBuyRecordLoading.value || promotionLoading.value || promotionRiskLoading.value || promotionAlertLoading.value || commissionRuleLoading.value);
const writeLocked = computed(() => Boolean(actionKey.value || couponSaving.value || flashSaleSaving.value || groupBuySaving.value || promotionSaving.value || commissionRuleSaving.value));
const summaryCards = computed(() => [
  { label: "优惠券", value: coupons.value.length, desc: `${coupons.value.filter((item) => item.runtimeStatus === "active").length} 张可用` },
  { label: "秒杀活动", value: flashSales.value.length, desc: `${flashSales.value.filter((item) => item.status === "active" || item.runtimeStatus === "active").length} 个启用` },
  { label: "拼团活动", value: groupBuys.value.length, desc: `${groupBuys.value.filter((item) => item.status === "active" || item.runtimeStatus === "active").length} 个启用` },
  { label: "推广码", value: promotionCodes.value.length, desc: `${promotionCodes.value.filter((item) => item.enabled).length} 个启用` }
]);

const ActivityForm = defineComponent({
  name: "ActivityForm",
  props: { type: { type: String, required: true } },
  setup(props) {
    return () => {
      const isFlash = props.type === "flash";
      const form = isFlash ? flashSaleForm : groupBuyForm;
      const skus = isFlash ? selectedFlashSaleSkus.value : selectedGroupBuySkus.value;
      const save = isFlash ? saveFlashSale : saveGroupBuy;
      return h(ElForm, { labelWidth: "92px" }, () => [
        h(ElFormItem, { label: "归属店铺", required: true }, () => h("span", { class: "form-scope" }, selectedMerchantName.value)),
        h(ElFormItem, { label: "标题", required: true }, () => h(ElInput, { modelValue: form.title, "onUpdate:modelValue": (value: string) => (form.title = value), maxlength: 80, placeholder: isFlash ? "如 周末限时秒杀" : "如 三人成团慢π好物" })),
        h(ElFormItem, { label: "商品/规格", required: true }, () => h("div", { class: "inline-fields" }, [
          h(ElSelect, { modelValue: form.productId, "onUpdate:modelValue": (value: number) => { form.productId = value; form.skuId = null; }, filterable: true, placeholder: "选择商品", style: "width:260px" }, () => products.value.map((product) => h(ElOption, { key: product.id, label: product.title, value: product.id }))),
          h(ElSelect, { modelValue: form.skuId, "onUpdate:modelValue": (value: number) => (form.skuId = value), filterable: true, placeholder: "选择规格", style: "width:220px" }, () => skus.map((sku: any) => h(ElOption, { key: sku.id, label: `${sku.name}（可售 ${sku.availableStock ?? sku.stock ?? 0}）`, value: sku.id })))
        ])),
        h(ElFormItem, { label: isFlash ? "秒杀价/库存" : "拼团价/库存" }, () => h("div", { class: "inline-fields" }, [
          h(ElInputNumber, { modelValue: isFlash ? form.salePrice : form.groupPrice, "onUpdate:modelValue": (value?: number) => isFlash ? (form.salePrice = Number(value || 0)) : (form.groupPrice = Number(value || 0)), min: 0, precision: 2 }),
          h(ElInputNumber, { modelValue: isFlash ? form.saleStock : form.groupStock, "onUpdate:modelValue": (value?: number) => isFlash ? (form.saleStock = Number(value || 1)) : (form.groupStock = Number(value || 1)), min: 1, precision: 0 }),
          !isFlash ? h(ElInputNumber, { modelValue: form.minPeople, "onUpdate:modelValue": (value?: number) => (form.minPeople = Number(value || 2)), min: 2, precision: 0 }) : null
        ])),
        h(ElFormItem, { label: "限购/排序" }, () => h("div", { class: "inline-fields" }, [
          h(ElInputNumber, { modelValue: form.perUserLimit, "onUpdate:modelValue": (value?: number) => (form.perUserLimit = Number(value || 0)), min: 0, precision: 0 }),
          h(ElInputNumber, { modelValue: form.sortOrder, "onUpdate:modelValue": (value?: number) => (form.sortOrder = Number(value || 0)), precision: 0 })
        ])),
        h(ElFormItem, { label: "时间", required: true }, () => h("div", { class: "inline-fields" }, [
          h(ElDatePicker, { modelValue: form.startsAt, "onUpdate:modelValue": (value: string) => (form.startsAt = value), type: "datetime", valueFormat: "YYYY-MM-DD HH:mm:ss", placeholder: "开始时间" }),
          h(ElDatePicker, { modelValue: form.endsAt, "onUpdate:modelValue": (value: string) => (form.endsAt = value), type: "datetime", valueFormat: "YYYY-MM-DD HH:mm:ss", placeholder: "结束时间" })
        ])),
        h(ElFormItem, { label: "状态" }, () => h(ElSelect, { modelValue: form.status, "onUpdate:modelValue": (value: string) => (form.status = value), style: "width:160px" }, () => [
          h(ElOption, { label: "草稿", value: "draft" }),
          h(ElOption, { label: "启用", value: "active" }),
          h(ElOption, { label: "停用", value: "disabled" })
        ])),
        h(ElButton, { type: "primary", loading: isFlash ? flashSaleSaving.value : groupBuySaving.value, disabled: !canOperateSelectedMerchant.value || writeLocked.value, title: operationScopeTip.value, onClick: save }, () => (form.id ? "保存活动" : "新增活动"))
      ]);
    };
  }
});

function routeTenantId() {
  const id = typeof route.query.tenantId === "string" ? Number(route.query.tenantId) : 0;
  return isPlatformAdmin() && id ? id : undefined;
}
function routeMerchantId() {
  const id = typeof route.query.merchantId === "string" ? Number(route.query.merchantId) : 0;
  return id || undefined;
}
function routeTab() {
  const tab = typeof route.query.tab === "string" ? route.query.tab : "coupons";
  return marketingTabs.value.includes(tab) ? tab : "coupons";
}
function tenantLabel(tenant: any) { return `${tenant.name || tenant.code}（${tenant.code}）`; }
function merchantOwnerText(merchant?: Merchant) { return merchant?.ownerType === "agent" ? "代理店铺" : "商家店铺"; }
function merchantLabel(merchant: Merchant) {
  const status = merchantOperational(merchant) ? "已开放" : "未开放";
  return `${merchant.name || merchant.code}（${merchantOwnerText(merchant)} · ${status}${merchant.region ? ` · ${merchant.region}` : ""}）`;
}
function merchantOperational(merchant?: Merchant) { return !!merchant && merchant.status === "active" && merchant.mallEnabled !== false; }
function merchantDisabledReason(merchant?: Merchant) {
  if (!merchant) return "请先选择要运营的店铺。平台可在「商城店铺」为商家/代理开店并授权账号。";
  if (merchant.status !== "active") return "当前店铺已被平台停用，不能新增、编辑或启停营销活动；如需恢复，请平台管理员先启用店铺。";
  if (merchant.mallEnabled === false) return "当前店铺未开放商城，不能新增、编辑或启停营销活动；请先在「商城店铺」完成开通和授权。";
  return "";
}
function paymentModeText(value?: string) { return value === "merchant_direct" ? "商户直收" : "平台代收"; }
function merchantLinkWarning(requestedMerchantId: number) {
  return `当前链接指定的店铺 #${requestedMerchantId} 对当前账号不可见，或已被商家筛选条件过滤。为避免误操作，系统不会自动切换到其它店铺；请联系平台管理员确认店铺授权，或清空筛选后重试。`;
}
function money(value: any) { return Number(value || 0).toFixed(2); }
function percent(value: any) { return (Number(value || 0) * 100).toFixed(2).replace(/\.?0+$/, ""); }
function bpsPercent(value: any) { return (Number(value || 0) / 100).toFixed(2).replace(/\.?0+$/, ""); }
function formatTime(value: any) { return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "-"; }
function couponStatusText(value: string) { return ({ active: "可用", not_started: "未开始", expired: "已过期", exhausted: "已用完", disabled: "已停用" } as any)[value] || value || "-"; }
function couponStatusType(value: string) { return value === "active" ? "success" : value === "not_started" ? "warning" : "info"; }
function couponUsageStatusText(value: string) { return ({ used: "已使用", released: "已释放" } as any)[value] || value || "-"; }
function activityStatusText(value: string) { return ({ active: "进行中", not_started: "未开始", ended: "已结束", sold_out: "已售罄", draft: "草稿", disabled: "已停用" } as any)[value] || value || "-"; }
function activityStatusType(value: string) { return value === "active" ? "success" : value === "not_started" || value === "draft" ? "warning" : "info"; }
function groupBuyTeamStatusText(value: string) { return ({ forming: "组团中", success: "已成团", failed: "未成团" } as any)[value] || value || "-"; }
function groupBuyTeamStatusType(value: string) { return value === "success" ? "success" : value === "failed" ? "info" : "warning"; }
function promotionRiskOutcomeText(value: string) { return ({ allowed: "已放行", review: "待复核", blocked: "已拦截" } as any)[value] || value || "-"; }
function promotionRiskOutcomeType(value: string) { return value === "blocked" ? "danger" : value === "review" ? "warning" : "success"; }
function promotionRiskTypeText(value: string) { return ({ flash_sale: "秒杀", group_buy: "拼团", promotion_code: "推广码", coupon: "优惠券" } as any)[value] || value || "营销"; }
function promotionAlertSeverityText(value: string) { return ({ medium: "中", high: "高", critical: "严重" } as any)[value] || value || "-"; }
function promotionAlertSeverityType(value: string) { return value === "critical" ? "danger" : value === "high" ? "warning" : "info"; }
function promotionAlertStatusText(value: string) { return ({ open: "待处理", resolved: "已解决", ignored: "已忽略" } as any)[value] || value || "-"; }
function agentLabel(agent: any) { return `${agent.name || agent.phone || agent.id}${agent.region ? `（${agent.region}）` : ""}`; }
function commissionScopeText(row: any) {
  if (row.scopeType === "product") return `商品：${row.product?.title || row.product?.id || "-"}`;
  if (row.scopeType === "channel") return `渠道：${row.promotionCode?.code || row.promotionCode?.id || "-"}`;
  if (row.scopeType === "merchant") return `店铺：${row.merchant?.name || row.merchant?.id || "-"}`;
  return `租户：${row.tenant?.name || row.tenant?.code || "-"}`;
}
function couponIssuerText(row: any) { return row.issuerScope === "platform" ? "平台券" : "店铺券"; }
function couponRefundPolicyText(value: string) { return value === "never" ? "退款不返还" : "全额退款返还"; }
function promotionValidityText(row: any) {
  if (!row.startsAt && !row.endsAt) return "长期有效";
  return `${row.startsAt ? formatTime(row.startsAt) : "立即生效"} 至 ${row.endsAt ? formatTime(row.endsAt) : "长期"}`;
}
function handleCouponIssuerChange() {
  couponForm.scopeCategoryId = null;
  couponForm.scopeProductId = null;
}
function marketingTimeValue(value: any) {
  if (!value) return NaN;
  const time = new Date(String(value).replace(" ", "T")).getTime();
  return Number.isFinite(time) ? time : NaN;
}
function validateMarketingTimeRange(startsAt: any, endsAt: any, label: string, required: boolean, allowEqual = false) {
  if (!startsAt || !endsAt) {
    if (required) ElMessage.error(`请设置${label}开始和结束时间`);
    return !required;
  }
  const startTime = marketingTimeValue(startsAt);
  const endTime = marketingTimeValue(endsAt);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) {
    ElMessage.error(`请检查${label}时间格式`);
    return false;
  }
  if (allowEqual ? startTime > endTime : startTime >= endTime) {
    ElMessage.error(allowEqual ? `${label}结束时间不能早于开始时间` : `${label}结束时间必须晚于开始时间`);
    return false;
  }
  return true;
}
function validateCouponConfiguration() {
  const minAmount = Number(couponForm.minAmount || 0);
  const discountAmount = Number(couponForm.discountAmount || 0);
  const usageLimit = Math.trunc(Number(couponForm.usageLimit || 0));
  const issuanceLimit = Math.trunc(Number(couponForm.issuanceLimit || 0));
  const perUserLimit = Math.trunc(Number(couponForm.perUserLimit || 0));
  if (minAmount > 0 && discountAmount > minAmount) {
    ElMessage.error("有门槛优惠券的优惠金额不能大于使用门槛；如需无门槛券，请把门槛设置为 0。");
    return false;
  }
  if (usageLimit > 0 && perUserLimit > usageLimit) {
    ElMessage.error("每人可用次数不能大于总可用次数；如需不限每人次数，请把每人次数设置为 0。");
    return false;
  }
  if (issuanceLimit > 0 && issuanceLimit < Number(couponForm.claimedCount || 0)) {
    ElMessage.error(`发放总量不能小于已领取数量 ${couponForm.claimedCount}；如需停止领取，请直接停用优惠券。`);
    return false;
  }
  return true;
}
function validatePromotionCodeConfiguration() {
  if (promotionForm.agentId && promotionForm.promoterUserId) {
    ElMessage.error("推广码不能同时绑定代理和推广用户，请只保留一个佣金归属对象。");
    return false;
  }
  if (promotionForm.id && Number(promotionForm.orderCount || 0) > 0) {
    const codeChanged = String(promotionForm.code || "").trim().toUpperCase() !== String(promotionForm.originalCode || "").trim().toUpperCase();
    const agentChanged = Number(promotionForm.agentId || 0) !== Number(promotionForm.originalAgentId || 0);
    const promoterChanged = Number(promotionForm.promoterUserId || 0) !== Number(promotionForm.originalPromoterUserId || 0);
    const rateChanged = Math.abs(Number(promotionForm.commissionRatePercent || 0) - Number(promotionForm.originalCommissionRatePercent || 0)) > 0.0001;
    if (codeChanged || agentChanged || promoterChanged || rateChanged) {
      ElMessage.error("该推广码已有订单或佣金记录，不能修改推广码、绑定对象或佣金比例；如需调整，请停用旧推广码后新建。");
      return false;
    }
  }
  return true;
}
function validateActivityStockWithinSku(form: any, sku: any, stockField: string, label: string) {
  const activityStock = Math.trunc(Number(form[stockField] || 0));
  const lockedStock = Math.trunc(Number(form.lockedStock || 0));
  const soldStock = Math.trunc(Number(form.soldStock || 0));
  const minStock = lockedStock + soldStock;
  const skuAvailableStock = Math.trunc(Number(sku?.availableStock ?? sku?.stock ?? 0));
  if (activityStock < minStock) {
    ElMessage.error(`${label}库存不能小于已售 ${soldStock} + 已锁 ${lockedStock}，请先处理订单或调大活动库存。`);
    return false;
  }
  if (activityStock - minStock > skuAvailableStock) {
    ElMessage.error(`${label}剩余可售库存不能超过当前规格可售库存 ${skuAvailableStock}。`);
    return false;
  }
  return true;
}
function validateActivityPriceWithinSku(form: any, sku: any, priceField: string, label: string) {
  const activityPrice = Number(form[priceField] || 0);
  const skuPrice = Number(sku?.price || 0);
  if (skuPrice > 0 && activityPrice >= skuPrice) {
    ElMessage.error(`${label}价必须低于当前规格售价 ¥${money(skuPrice)}，否则前台活动优惠会变成无效营销。`);
    return false;
  }
  return true;
}
function validateActivityIdentityCanChange(form: any, label: string) {
  const trackedStock = Math.trunc(Number(form.lockedStock || 0)) + Math.trunc(Number(form.soldStock || 0));
  if (!form.id || trackedStock <= 0) return true;
  const skuChanged = Number(form.skuId || 0) !== Number(form.originalSkuId || 0);
  const titleChanged = String(form.title || "").trim() !== String(form.originalTitle || "").trim();
  if (skuChanged) {
    ElMessage.error(`${label}已有订单或锁定库存，不能更换商品规格；如需调整商品，请停用旧活动后新建。`);
    return false;
  }
  if (titleChanged) {
    ElMessage.error(`${label}已有订单或锁定库存，不能修改活动标题；如需调整前台展示文案，请停用旧活动后新建。`);
    return false;
  }
  return true;
}
function validateActivityTitleUniqueForSku(form: any, rows: any[], label: string) {
  const skuId = Number(form.skuId || 0);
  const title = String(form.title || "").trim();
  const currentId = Number(form.id || 0);
  if (!skuId || !title) return true;
  const conflict = rows.find((row) => {
    const rowSkuId = Number(row.sku?.id || row.skuId || 0);
    const rowTitle = String(row.title || "").trim();
    return rowSkuId === skuId && rowTitle === title && Number(row.id || 0) !== currentId;
  });
  if (conflict) {
    ElMessage.error(`同一商品规格下已存在同名${label}「${title}」，请使用包含日期或批次的唯一标题，避免订单库存追踪串活动。`);
    return false;
  }
  return true;
}
function validateActivityTimeNotOverlapping(form: any, rows: any[], label: string) {
  if (form.status !== "active") return true;
  const skuId = Number(form.skuId || 0);
  const startTime = marketingTimeValue(form.startsAt);
  const endTime = marketingTimeValue(form.endsAt);
  const currentId = Number(form.id || 0);
  const conflict = rows.find((row) => {
    const rowSkuId = Number(row.sku?.id || row.skuId || 0);
    if (!rowSkuId || rowSkuId !== skuId || Number(row.id || 0) === currentId || row.status !== "active") return false;
    const rowStartTime = marketingTimeValue(row.startsAt);
    const rowEndTime = marketingTimeValue(row.endsAt);
    return Number.isFinite(rowStartTime) && Number.isFinite(rowEndTime) && rowStartTime < endTime && rowEndTime > startTime;
  });
  if (conflict) {
    ElMessage.error(`同一商品规格在该时间段已有启用${label}「${conflict.title || conflict.id}」，请调整时间或停用旧活动。`);
    return false;
  }
  return true;
}
function couponScopeText(row: any) {
  const categoryRows = row.issuerScope === "platform" ? platformCategories.value : categories.value;
  const productRows = row.issuerScope === "platform" ? platformProducts.value : products.value;
  if (row.scope === "category") return `指定分类：${categoryRows.find((item) => item.id === row.scopeCategoryId)?.name || row.scopeCategoryId || "-"}`;
  if (row.scope === "product") return `指定商品：${productRows.find((item) => item.id === row.scopeProductId)?.title || row.scopeProductId || "-"}`;
  return row.issuerScope === "platform" ? "租户全场通用" : "全店通用";
}
function currentMallParams(extra: Record<string, any> = {}) {
  return {
    tenantId: isPlatformAdmin() ? filters.tenantId || selectedMerchant.value?.tenant?.id : undefined,
    merchantId: filters.merchantId || undefined,
    ...extra
  };
}
function currentTenantParams(extra: Record<string, any> = {}) {
  return {
    tenantId: isPlatformAdmin() ? filters.tenantId || selectedMerchant.value?.tenant?.id : undefined,
    ...extra
  };
}
function marketingScopeKey(extra: Record<string, any> = {}) {
  return JSON.stringify({
    tenantId: filters.tenantId || null,
    merchantId: filters.merchantId || null,
    keyword: keyword.value.trim(),
    ...extra
  });
}
function requireMerchantSelection(action: string, row?: any) {
  if (deepLinkWarning.value) {
    ElMessage.error("当前商城营销店铺链接不可用，请先确认店铺授权后再操作。");
    return false;
  }
  if (row?.merchant?.id && row.merchant.id !== filters.merchantId) {
    ElMessage.error(rowMerchantUnavailableMessage(row, action));
    return false;
  }
  if (filters.merchantId && selectedMerchantOpen.value) return true;
  if (filters.merchantId) {
    ElMessage.error(selectedMerchantDisabledReason.value);
    return false;
  }
  ElMessage.error(`请先选择要${action}的店铺。平台可以全局查看营销数据，但新增、编辑、启停都必须指定一个店铺。`);
  return false;
}
function rowMerchantUnavailableMessage(row: any, action: string) {
  const merchant = row?.merchant;
  const label = merchant?.name || merchant?.code || (merchant?.id ? `#${merchant.id}` : "未归属店铺");
  return `这条${action}记录属于店铺「${label}」，但当前账号没有该店铺授权，或店铺已停用/未开放商城；为避免跨店误操作，不能继续处理。请先到「商城店铺」确认授权和上线状态。`;
}
function marketingRowName(row: any) {
  return row?.name || row?.title || row?.code || `#${row?.id || "-"}`;
}
async function confirmMarketingToggle(row: any, action: string, type: string) {
  const merchantName = row?.merchant?.name || row?.merchant?.code || selectedMerchant.value?.name || selectedMerchant.value?.code || "当前店铺";
  try {
    await ElMessageBox.confirm(
      `确认要${action}「${marketingRowName(row)}」吗？该操作会立即影响店铺「${merchantName}」前台${type}展示、下单或佣金识别。`,
      `${action}${type}`,
      { confirmButtonText: action, cancelButtonText: "取消", type: action === "启用" ? "warning" : "info" }
    );
    return true;
  } catch {
    return false;
  }
}
function clearMarketingData() {
  catalogLoadSequence += 1;
  couponLoadSequence += 1;
  couponUsageLoadSequence += 1;
  flashSaleLoadSequence += 1;
  groupBuyLoadSequence += 1;
  groupBuyRecordLoadSequence += 1;
  agentLoadSequence += 1;
  promotionLoadSequence += 1;
  promotionRiskLoadSequence += 1;
  promotionAlertLoadSequence += 1;
  commissionRuleLoadSequence += 1;
  productLoading.value = false;
  couponLoading.value = false;
  couponUsageLoading.value = false;
  flashSaleLoading.value = false;
  groupBuyLoading.value = false;
  groupBuyRecordLoading.value = false;
  promotionLoading.value = false;
  promotionRiskLoading.value = false;
  promotionAlertLoading.value = false;
  commissionRuleLoading.value = false;
  products.value = [];
  categories.value = [];
  platformProducts.value = [];
  platformCategories.value = [];
  coupons.value = [];
  couponUsages.value = [];
  flashSales.value = [];
  groupBuys.value = [];
  groupBuyRecords.value = [];
  promotionCodes.value = [];
  promotionRiskEvents.value = [];
  promotionRiskAlerts.value = [];
  commissionRules.value = [];
  agents.value = [];
  catalogError.value = "";
  platformCatalogError.value = "";
  couponError.value = "";
  couponUsageError.value = "";
  flashSaleError.value = "";
  groupBuyError.value = "";
  groupBuyRecordError.value = "";
  agentError.value = "";
  promotionError.value = "";
  promotionRiskError.value = "";
  promotionAlertError.value = "";
  commissionRuleError.value = "";
}
type MarketingTargetKind = "coupon" | "flash" | "group" | "promotion" | "alert" | "rule";
function marketingRows(kind: MarketingTargetKind) {
  if (kind === "coupon") return coupons.value;
  if (kind === "flash") return flashSales.value;
  if (kind === "group") return groupBuys.value;
  if (kind === "promotion") return promotionCodes.value;
  if (kind === "alert") return promotionRiskAlerts.value;
  return commissionRules.value;
}
function marketingSequence(kind: MarketingTargetKind) {
  if (kind === "coupon") return couponLoadSequence;
  if (kind === "flash") return flashSaleLoadSequence;
  if (kind === "group") return groupBuyLoadSequence;
  if (kind === "promotion") return promotionLoadSequence;
  if (kind === "alert") return promotionAlertLoadSequence;
  return commissionRuleLoadSequence;
}
function marketingListScopeKey(kind: MarketingTargetKind) {
  if (kind === "coupon") return marketingScopeKey({ status: couponFilters.status });
  if (kind === "flash") return marketingScopeKey({ status: flashSaleFilters.status });
  if (kind === "group") return marketingScopeKey({ status: groupBuyFilters.status });
  if (kind === "promotion") return marketingScopeKey({ enabled: promotionFilters.enabled });
  if (kind === "alert") return marketingScopeKey({ status: promotionAlertFilters.status });
  return marketingScopeKey({ status: commissionRuleFilters.status });
}
function rowMarketingMerchantId(row: any) {
  return Number(row?.merchant?.id || row?.merchantId || 0);
}
function captureMarketingTarget(kind: MarketingTargetKind, row: any) {
  return {
    kind,
    id: Number(row?.id || 0),
    merchantId: rowMarketingMerchantId(row),
    tenantId: Number(row?.tenant?.id || row?.tenantId || row?.merchant?.tenant?.id || 0),
    scopeKey: marketingListScopeKey(kind),
    sequence: marketingSequence(kind)
  };
}
function assertMarketingTarget(target: ReturnType<typeof captureMarketingTarget>, label: string) {
  const current = marketingRows(target.kind).find((row) => Number(row.id) === target.id);
  if (!current || target.sequence !== marketingSequence(target.kind) || target.scopeKey !== marketingListScopeKey(target.kind) || rowMarketingMerchantId(current) !== target.merchantId || Number(current?.tenant?.id || current?.tenantId || current?.merchant?.tenant?.id || 0) !== target.tenantId) {
    throw new Error(`${label}列表或店铺范围已变化，请刷新后重新操作`);
  }
}
function captureMarketingFormTarget(kind: Exclude<MarketingTargetKind, "alert" | "rule">, id: any) {
  return { kind, id: Number(id || 0), merchantId: Number(filters.merchantId || 0), scopeKey: marketingListScopeKey(kind), sequence: marketingSequence(kind) };
}
function assertMarketingFormTarget(target: ReturnType<typeof captureMarketingFormTarget>, label: string) {
  if (!target.merchantId || Number(filters.merchantId || 0) !== target.merchantId || target.scopeKey !== marketingListScopeKey(target.kind)) throw new Error(`${label}店铺或筛选范围已变化，请重新操作`);
  if (target.id && (target.sequence !== marketingSequence(target.kind) || !marketingRows(target.kind).some((row) => Number(row.id) === target.id))) throw new Error(`${label}编辑目标已变化，请刷新后重新操作`);
}
function guardMarketingTabChange() {
  if (!writeLocked.value) return true;
  ElMessage.warning("当前营销操作尚未结束，请完成或取消后再切换功能");
  return false;
}
async function retryMarketingScope() {
  await loadTenants();
  const ok = await loadMerchants();
  if (ok) await reload();
}
function merchantWorkbenchUrl() {
  if (!selectedMerchant.value) return "";
  const query = new URLSearchParams();
  if (selectedMerchant.value.tenant?.id) query.set("tenantId", String(selectedMerchant.value.tenant.id));
  query.set("merchantId", String(selectedMerchant.value.id));
  return `${window.location.origin}/admin/mall-marketing?${query.toString()}`;
}
function merchantH5Url() {
  if (!selectedMerchant.value) return "";
  return h5RoutePreviewUrl(selectedMerchant.value.tenant?.code || "", `/pages/mall/merchant?id=${selectedMerchant.value.id}`);
}
function goMerchantAdmin(path: string) {
  if (!selectedMerchant.value) return;
  router.push({ path, query: { tenantId: selectedMerchant.value.tenant?.id, merchantId: selectedMerchant.value.id } });
}
function openMerchantH5() {
  const url = merchantH5Url();
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}
async function copyWorkbenchLink() {
  const url = merchantWorkbenchUrl();
  if (!url) return;
  await copyToClipboard(url);
  ElMessage.success("商城营销后台链接已复制，可发给已授权的商家/代理账号。");
}
async function syncRouteQuery() {
  const query: Record<string, string> = {};
  if (filters.tenantId) query.tenantId = String(filters.tenantId);
  if (filters.merchantId) query.merchantId = String(filters.merchantId);
  if (activeTab.value !== "coupons") query.tab = activeTab.value;
  await router.replace({ path: route.path, query });
}
async function loadTenants() {
  const sequence = ++tenantLoadSequence;
  tenantError.value = "";
  tenants.value = [];
  if (!isPlatformAdmin()) return true;
  try {
    const rows = await api.get<any, any[]>("/admin/tenants");
    if (sequence !== tenantLoadSequence) return false;
    tenants.value = Array.isArray(rows) ? rows : [];
    return true;
  } catch (error: any) {
    if (sequence !== tenantLoadSequence) return false;
    tenantError.value = error.message || "加载商家/代理范围失败";
    return false;
  }
}
async function loadMerchants() {
  const sequence = ++merchantLoadSequence;
  const tenantId = filters.tenantId;
  merchantLoading.value = true;
  merchantError.value = "";
  merchants.value = [];
  clearMarketingData();
  try {
    const rows = await api.get<any, Merchant[]>("/admin/mall/accessible-merchants", { params: { tenantId: isPlatformAdmin() ? tenantId : undefined, enabled: "true" } });
    if (sequence !== merchantLoadSequence || tenantId !== filters.tenantId) return false;
    merchants.value = Array.isArray(rows) ? rows : [];
    const requestedMerchantId = routeMerchantId();
    deepLinkWarning.value = "";
    if (requestedMerchantId && merchants.value.some((merchant) => merchant.id === requestedMerchantId)) filters.merchantId = requestedMerchantId;
    else if (requestedMerchantId) {
      filters.merchantId = undefined;
      deepLinkWarning.value = merchantLinkWarning(requestedMerchantId);
      clearMarketingData();
      return false;
    } else if (filters.merchantId && !merchants.value.some((merchant) => merchant.id === filters.merchantId)) filters.merchantId = undefined;
    if (!filters.merchantId && !isPlatformAdmin() && merchants.value.length === 1) filters.merchantId = merchants.value[0].id;
    return true;
  } catch (error: any) {
    if (sequence !== merchantLoadSequence || tenantId !== filters.tenantId) return false;
    filters.merchantId = undefined;
    merchants.value = [];
    clearMarketingData();
    merchantError.value = error.message || "加载可运营店铺失败";
    return false;
  } finally {
    if (sequence === merchantLoadSequence) merchantLoading.value = false;
  }
}
async function loadProductsAndCategories() {
  if (deepLinkWarning.value) return;
  if (!filters.merchantId) {
    products.value = [];
    categories.value = [];
    platformProducts.value = [];
    platformCategories.value = [];
    return;
  }
  const sequence = ++catalogLoadSequence;
  const scopeKey = marketingScopeKey();
  productLoading.value = true;
  catalogError.value = "";
  platformCatalogError.value = "";
  products.value = [];
  categories.value = [];
  platformProducts.value = [];
  platformCategories.value = [];
  const requests = [
    { label: "店铺分类", run: () => api.get<any, any[]>("/admin/mall/categories", { params: currentMallParams({ scope: "merchant" }) }) },
    { label: "店铺商品", run: () => api.get<any, any>("/admin/mall/products", { params: currentMallParams({ pageSize: 200 }) }) },
    { label: "平台分类", run: () => api.get<any, any[]>("/admin/mall/categories", { params: currentTenantParams({ scope: "platform", enabled: "true" }) }) },
    { label: "平台商品", run: () => api.get<any, any>("/admin/mall/products", { params: currentTenantParams({ scope: "platform", pageSize: 100 }) }) }
  ];
  const results = await Promise.allSettled(requests.map((request) => request.run()));
  if (sequence !== catalogLoadSequence || scopeKey !== marketingScopeKey()) {
    if (sequence === catalogLoadSequence) productLoading.value = false;
    return;
  }
  const failed: string[] = [];
  const platformFailed: string[] = [];
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      const message = `${requests[index].label}：${result.reason?.message || "加载失败"}`;
      if (index < 2) failed.push(message);
      else platformFailed.push(message);
      return;
    }
    if (index === 0) categories.value = Array.isArray(result.value) ? result.value : [];
    if (index === 1) products.value = Array.isArray(result.value) ? result.value : Array.isArray(result.value?.items) ? result.value.items : [];
    if (index === 2) platformCategories.value = Array.isArray(result.value) ? result.value : [];
    if (index === 3) platformProducts.value = Array.isArray(result.value) ? result.value : Array.isArray(result.value?.items) ? result.value.items : [];
  });
  catalogError.value = failed.join("；");
  platformCatalogError.value = platformFailed.join("；");
  productLoading.value = false;
}
async function loadCoupons() {
  if (deepLinkWarning.value) return;
  const sequence = ++couponLoadSequence;
  const scopeKey = marketingScopeKey({ status: couponFilters.status });
  couponLoading.value = true;
  couponError.value = "";
  coupons.value = [];
  try {
    const rows = await api.get<any, any[]>("/admin/mall/coupons", { params: currentMallParams({ status: couponFilters.status || undefined, keyword: keyword.value.trim() || undefined }) });
    if (sequence !== couponLoadSequence || scopeKey !== marketingScopeKey({ status: couponFilters.status })) return;
    coupons.value = Array.isArray(rows) ? rows : [];
  } catch (error: any) {
    if (sequence !== couponLoadSequence || scopeKey !== marketingScopeKey({ status: couponFilters.status })) return;
    couponError.value = error.message || "加载优惠券失败";
  } finally {
    if (sequence === couponLoadSequence) couponLoading.value = false;
  }
}
async function loadCouponUsages() {
  if (deepLinkWarning.value) return;
  const sequence = ++couponUsageLoadSequence;
  const scopeKey = marketingScopeKey();
  couponUsageLoading.value = true;
  couponUsageError.value = "";
  couponUsages.value = [];
  try {
    const rows = await api.get<any, any[]>("/admin/mall/coupon-usages", { params: currentMallParams({ keyword: keyword.value.trim() || undefined }) });
    if (sequence !== couponUsageLoadSequence || scopeKey !== marketingScopeKey()) return;
    couponUsages.value = Array.isArray(rows) ? rows : [];
  } catch (error: any) {
    if (sequence !== couponUsageLoadSequence || scopeKey !== marketingScopeKey()) return;
    couponUsageError.value = error.message || "加载优惠券使用记录失败";
  } finally {
    if (sequence === couponUsageLoadSequence) couponUsageLoading.value = false;
  }
}
async function loadFlashSales() {
  if (deepLinkWarning.value) return;
  const sequence = ++flashSaleLoadSequence;
  const scopeKey = marketingScopeKey({ status: flashSaleFilters.status });
  flashSaleLoading.value = true;
  flashSaleError.value = "";
  flashSales.value = [];
  try {
    const rows = await api.get<any, any[]>("/admin/mall/flash-sales", { params: currentMallParams({ status: flashSaleFilters.status || undefined, keyword: keyword.value.trim() || undefined }) });
    if (sequence !== flashSaleLoadSequence || scopeKey !== marketingScopeKey({ status: flashSaleFilters.status })) return;
    flashSales.value = Array.isArray(rows) ? rows : [];
  } catch (error: any) {
    if (sequence !== flashSaleLoadSequence || scopeKey !== marketingScopeKey({ status: flashSaleFilters.status })) return;
    flashSaleError.value = error.message || "加载秒杀活动失败";
  } finally {
    if (sequence === flashSaleLoadSequence) flashSaleLoading.value = false;
  }
}
async function loadGroupBuys() {
  if (deepLinkWarning.value) return;
  const sequence = ++groupBuyLoadSequence;
  const scopeKey = marketingScopeKey({ status: groupBuyFilters.status });
  groupBuyLoading.value = true;
  groupBuyError.value = "";
  groupBuys.value = [];
  try {
    const rows = await api.get<any, any[]>("/admin/mall/group-buys", { params: currentMallParams({ status: groupBuyFilters.status || undefined, keyword: keyword.value.trim() || undefined }) });
    if (sequence !== groupBuyLoadSequence || scopeKey !== marketingScopeKey({ status: groupBuyFilters.status })) return;
    groupBuys.value = Array.isArray(rows) ? rows : [];
  } catch (error: any) {
    if (sequence !== groupBuyLoadSequence || scopeKey !== marketingScopeKey({ status: groupBuyFilters.status })) return;
    groupBuyError.value = error.message || "加载拼团活动失败";
  } finally {
    if (sequence === groupBuyLoadSequence) groupBuyLoading.value = false;
  }
}
async function loadGroupBuyRecords() {
  if (deepLinkWarning.value) return;
  const sequence = ++groupBuyRecordLoadSequence;
  const scopeKey = marketingScopeKey();
  groupBuyRecordLoading.value = true;
  groupBuyRecordError.value = "";
  groupBuyRecords.value = [];
  try {
    const rows = await api.get<any, any[]>("/admin/mall/group-buy-records", { params: currentMallParams({ keyword: keyword.value.trim() || undefined }) });
    if (sequence !== groupBuyRecordLoadSequence || scopeKey !== marketingScopeKey()) return;
    groupBuyRecords.value = Array.isArray(rows) ? rows : [];
  } catch (error: any) {
    if (sequence !== groupBuyRecordLoadSequence || scopeKey !== marketingScopeKey()) return;
    groupBuyRecordError.value = error.message || "加载参团记录失败";
  } finally {
    if (sequence === groupBuyRecordLoadSequence) groupBuyRecordLoading.value = false;
  }
}
async function loadAgents() {
  const sequence = ++agentLoadSequence;
  const scopeKey = marketingScopeKey();
  agentError.value = "";
  agents.value = [];
  if (!filters.merchantId) return;
  try {
    const result = await api.get<any, any>("/admin/agents", { params: { includeDisabled: true, tenantId: isPlatformAdmin() ? filters.tenantId || selectedMerchant.value?.tenant?.id || undefined : undefined, page: 1, pageSize: 100 } });
    if (sequence !== agentLoadSequence || scopeKey !== marketingScopeKey()) return;
    const rows = Array.isArray(result) ? result : result?.items;
    agents.value = Array.isArray(rows) ? rows : [];
  } catch (error: any) {
    if (sequence !== agentLoadSequence || scopeKey !== marketingScopeKey()) return;
    agentError.value = error.message || "加载推广代理失败";
  }
}
async function loadPromotionCodes() {
  if (deepLinkWarning.value) return;
  const sequence = ++promotionLoadSequence;
  const scopeKey = marketingScopeKey({ enabled: promotionFilters.enabled });
  promotionLoading.value = true;
  promotionError.value = "";
  promotionCodes.value = [];
  try {
    const rows = await api.get<any, any[]>("/admin/mall/promotion-codes", { params: currentMallParams({ enabled: promotionFilters.enabled || undefined, keyword: keyword.value.trim() || undefined }) });
    if (sequence !== promotionLoadSequence || scopeKey !== marketingScopeKey({ enabled: promotionFilters.enabled })) return;
    promotionCodes.value = Array.isArray(rows) ? rows : [];
  } catch (error: any) {
    if (sequence !== promotionLoadSequence || scopeKey !== marketingScopeKey({ enabled: promotionFilters.enabled })) return;
    promotionError.value = error.message || "加载推广码失败";
  } finally {
    if (sequence === promotionLoadSequence) promotionLoading.value = false;
  }
}
async function loadPromotionRiskEvents() {
  if (deepLinkWarning.value) return;
  const sequence = ++promotionRiskLoadSequence;
  const scopeKey = marketingScopeKey({ outcome: promotionRiskFilters.outcome });
  promotionRiskLoading.value = true;
  promotionRiskError.value = "";
  promotionRiskEvents.value = [];
  try {
    const rows = await api.get<any, any[]>("/admin/mall/promotion-risk-events", { params: currentMallParams({ status: promotionRiskFilters.outcome || undefined, keyword: keyword.value.trim() || undefined }) });
    if (sequence !== promotionRiskLoadSequence || scopeKey !== marketingScopeKey({ outcome: promotionRiskFilters.outcome })) return;
    promotionRiskEvents.value = Array.isArray(rows) ? rows : [];
  } catch (error: any) {
    if (sequence !== promotionRiskLoadSequence || scopeKey !== marketingScopeKey({ outcome: promotionRiskFilters.outcome })) return;
    promotionRiskError.value = error.message || "加载促销风控记录失败";
  } finally {
    if (sequence === promotionRiskLoadSequence) promotionRiskLoading.value = false;
  }
}
async function loadPromotionRiskAlerts() {
  if (deepLinkWarning.value) return;
  const sequence = ++promotionAlertLoadSequence;
  const scopeKey = marketingScopeKey({ status: promotionAlertFilters.status });
  promotionAlertLoading.value = true;
  promotionAlertError.value = "";
  promotionRiskAlerts.value = [];
  try {
    const rows = await api.get<any, any[]>("/admin/mall/promotion-risk-alerts", { params: currentMallParams({ status: promotionAlertFilters.status || undefined, keyword: keyword.value.trim() || undefined }) });
    if (sequence !== promotionAlertLoadSequence || scopeKey !== marketingScopeKey({ status: promotionAlertFilters.status })) return;
    promotionRiskAlerts.value = Array.isArray(rows) ? rows : [];
  } catch (error: any) {
    if (sequence !== promotionAlertLoadSequence || scopeKey !== marketingScopeKey({ status: promotionAlertFilters.status })) return;
    promotionAlertError.value = error.message || "加载营销风险告警失败";
  } finally {
    if (sequence === promotionAlertLoadSequence) promotionAlertLoading.value = false;
  }
}
async function loadCommissionRules() {
  if (!canManageCommissionRules.value) {
    commissionRules.value = [];
    return;
  }
  if (deepLinkWarning.value) return;
  const sequence = ++commissionRuleLoadSequence;
  const scopeKey = marketingScopeKey({ status: commissionRuleFilters.status });
  commissionRuleLoading.value = true;
  commissionRuleError.value = "";
  commissionRules.value = [];
  try {
    const rows = await api.get<any, any[]>("/admin/mall/commission-rules", { params: currentTenantParams({ merchantId: filters.merchantId || undefined, status: commissionRuleFilters.status || undefined, keyword: keyword.value.trim() || undefined }) });
    if (sequence !== commissionRuleLoadSequence || scopeKey !== marketingScopeKey({ status: commissionRuleFilters.status })) return;
    commissionRules.value = Array.isArray(rows) ? rows : [];
  } catch (error: any) {
    if (sequence !== commissionRuleLoadSequence || scopeKey !== marketingScopeKey({ status: commissionRuleFilters.status })) return;
    commissionRuleError.value = error.message || "加载佣金规则失败";
  } finally {
    if (sequence === commissionRuleLoadSequence) commissionRuleLoading.value = false;
  }
}
async function saveCommissionRule() {
  if (!canManageCommissionRules.value) return ElMessage.error("当前账号无商城结算规则管理权限");
  if (!canSaveCommissionRule.value) return ElMessage.warning("请补齐佣金规则范围和名称");
  const levels = commissionRuleForm.agentLevelRatesPercent.map((value: number) => Math.round(Number(value || 0) * 100));
  const directRateBps = Math.round(Number(commissionRuleForm.directRatePercent || 0) * 100);
  if (directRateBps + levels.reduce((sum: number, value: number) => sum + value, 0) > 10000) return ElMessage.error("直接佣金和多级代理佣金合计不能超过 100%");
  if (!validateMarketingTimeRange(commissionRuleForm.startsAt, commissionRuleForm.endsAt, "佣金规则", false)) return;
  const sourceRow = commissionRuleForm.sourceId ? commissionRules.value.find((row) => Number(row.id) === Number(commissionRuleForm.sourceId)) : null;
  const sourceTarget = sourceRow ? captureMarketingTarget("rule", sourceRow) : null;
  const formScopeKey = marketingListScopeKey("rule");
  const merchantId = Number(filters.merchantId || 0);
  commissionRuleSaving.value = true;
  try {
    if (sourceTarget) assertMarketingTarget(sourceTarget, "佣金规则");
    if (formScopeKey !== marketingListScopeKey("rule") || merchantId !== Number(filters.merchantId || 0)) throw new Error("佣金规则店铺或筛选范围已变化，请重新操作");
    if (commissionRuleForm.scopeType === "product" && !products.value.some((row) => Number(row.id) === Number(commissionRuleForm.productId))) throw new Error("佣金规则商品目标已变化，请刷新后重新操作");
    if (commissionRuleForm.scopeType === "channel" && !promotionCodes.value.some((row) => Number(row.id) === Number(commissionRuleForm.promotionCodeId))) throw new Error("佣金规则推广渠道已变化，请刷新后重新操作");
    await api.post("/admin/mall/commission-rules", {
      tenantId: isPlatformAdmin() ? filters.tenantId || selectedMerchant.value?.tenant?.id : undefined,
      merchantId: commissionRuleForm.scopeType === "merchant" ? filters.merchantId : undefined,
      productId: commissionRuleForm.scopeType === "product" ? commissionRuleForm.productId : undefined,
      promotionCodeId: commissionRuleForm.scopeType === "channel" ? commissionRuleForm.promotionCodeId : undefined,
      ruleKey: commissionRuleForm.ruleKey.trim() || undefined,
      name: commissionRuleForm.name.trim(),
      scopeType: commissionRuleForm.scopeType,
      priority: Number(commissionRuleForm.priority || 0),
      directRateBps,
      agentLevelRatesBps: levels.filter((value: number) => value > 0),
      startsAt: commissionRuleForm.startsAt || undefined,
      endsAt: commissionRuleForm.endsAt || undefined,
      remark: commissionRuleForm.remark.trim() || undefined
    });
    ElMessage.success(commissionRuleForm.sourceId ? "佣金规则新版本已发布" : "佣金规则已发布");
    resetCommissionRuleForm();
    await loadCommissionRules();
  } catch (error: any) {
    ElMessage.error(error.message || "发布佣金规则失败");
  } finally {
    commissionRuleSaving.value = false;
  }
}
async function retireCommissionRule(row: any) {
  if (!canManageCommissionRules.value) return ElMessage.error("当前账号无商城结算规则管理权限");
  if (actionKey.value) return;
  const target = captureMarketingTarget("rule", row);
  actionKey.value = `rule:retire:${row.id}`;
  try {
    await ElMessageBox.confirm(`确认停用佣金规则「${row.name} v${row.version}」？已支付订单仍保留原规则快照。`, "停用佣金规则", { confirmButtonText: "停用", cancelButtonText: "取消", type: "warning" });
    assertMarketingTarget(target, "佣金规则");
    await api.post(`/admin/mall/commission-rules/${row.id}/retire`);
    ElMessage.success("佣金规则已停用");
    await loadCommissionRules();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(error.message || "停用佣金规则失败");
  } finally {
    actionKey.value = "";
  }
}
async function reviewPromotionRiskAlert(row: any, status: "open" | "resolved" | "ignored") {
  if (actionKey.value) return;
  const target = captureMarketingTarget("alert", row);
  actionKey.value = `alert:${status}:${row.id}`;
  try {
    let remark = status === "open" ? "重新打开继续核查" : status === "resolved" ? "风险已核查并完成处理" : "确认属于可接受的正常营销行为";
    if (status !== "open") {
      const result = await ElMessageBox.prompt("请填写处理结论，便于后续审计。", status === "resolved" ? "解决营销风险告警" : "忽略营销风险告警", { inputValue: remark, confirmButtonText: "确认", cancelButtonText: "取消" });
      remark = result.value || remark;
    } else {
      await ElMessageBox.confirm("确认重新打开该营销风险告警？", "重新打开告警", { confirmButtonText: "重新打开", cancelButtonText: "取消", type: "warning" });
    }
    assertMarketingTarget(target, "营销风险告警");
    await api.patch(`/admin/mall/promotion-risk-alerts/${row.id}`, { status, remark });
    ElMessage.success("营销风险告警已更新");
    await loadPromotionRiskAlerts();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(error.message || "处理营销风险告警失败");
  } finally {
    actionKey.value = "";
  }
}
async function loadActiveTab() {
  await syncRouteQuery();
  if (activeTab.value === "coupons") await Promise.allSettled([loadCoupons(), loadCouponUsages()]);
  if (activeTab.value === "flash") await loadFlashSales();
  if (activeTab.value === "group") await Promise.allSettled([loadGroupBuys(), loadGroupBuyRecords()]);
  if (activeTab.value === "promotions") {
    await Promise.allSettled([loadAgents(), loadPromotionCodes(), loadPromotionRiskEvents(), loadPromotionRiskAlerts()]);
  }
  if (activeTab.value === "commissions" && canManageCommissionRules.value) await Promise.allSettled([loadPromotionCodes(), loadCommissionRules()]);
}
async function reload() {
  if (deepLinkWarning.value) return;
  await Promise.allSettled([
    loadProductsAndCategories(),
    loadCoupons(),
    loadCouponUsages(),
    loadFlashSales(),
    loadGroupBuys(),
    loadGroupBuyRecords(),
    loadPromotionCodes(),
    loadPromotionRiskEvents(),
    loadPromotionRiskAlerts(),
    ...(canManageCommissionRules.value ? [loadCommissionRules()] : []),
    ...(filters.merchantId ? [loadAgents()] : [])
  ]);
}
async function handleTenantChange() {
  filters.merchantId = undefined;
  resetAllForms();
  await syncRouteQuery();
  const ok = await loadMerchants();
  if (ok) await reload();
}
async function handleMerchantChange() {
  deepLinkWarning.value = "";
  resetAllForms();
  await syncRouteQuery();
  await loadProductsAndCategories();
  await reload();
}
async function handleRouteQueryChange() {
  const nextTenantId = routeTenantId();
  const nextMerchantId = routeMerchantId();
  const nextTab = routeTab();
  const scopeChanged = nextTenantId !== filters.tenantId || nextMerchantId !== filters.merchantId;
  const tabChanged = nextTab !== activeTab.value;
  if (!scopeChanged && !tabChanged) return;
  activeTab.value = nextTab;
  if (scopeChanged) {
    filters.tenantId = nextTenantId;
    filters.merchantId = nextMerchantId;
    resetAllForms();
    const ok = await loadMerchants();
    if (ok) await reload();
    return;
  }
  if (tabChanged) await loadActiveTab();
}
function resetAllForms() {
  resetCouponForm();
  resetFlashSaleForm();
  resetGroupBuyForm();
  resetPromotionForm();
  resetCommissionRuleForm();
}
function resetCouponForm() {
  Object.assign(couponForm, { id: null, code: "", name: "", issuerScope: "merchant", refundReleasePolicy: "full_refund", minAmount: 0, discountAmount: 0, scope: "all", scopeCategoryId: null, scopeProductId: null, issuanceLimit: 0, claimedCount: 0, usageLimit: 0, perUserLimit: 0, startsAt: "", endsAt: "", enabled: true });
}
function resetFlashSaleForm() {
  Object.assign(flashSaleForm, { id: null, title: "", originalTitle: "", productId: null, skuId: null, originalSkuId: null, salePrice: 0, saleStock: 1, lockedStock: 0, soldStock: 0, perUserLimit: 1, startsAt: "", endsAt: "", status: "draft", sortOrder: 0 });
}
function resetGroupBuyForm() {
  Object.assign(groupBuyForm, { id: null, title: "", originalTitle: "", productId: null, skuId: null, originalSkuId: null, groupPrice: 0, minPeople: 2, groupStock: 1, lockedStock: 0, soldStock: 0, perUserLimit: 1, startsAt: "", endsAt: "", status: "draft", sortOrder: 0 });
}
function resetPromotionForm() {
  Object.assign(promotionForm, { id: null, code: "", name: "", commissionRatePercent: 0, promoterUserId: null, agentId: null, startsAt: "", endsAt: "", enabled: true, remark: "", orderCount: 0, originalCode: "", originalAgentId: null, originalPromoterUserId: null, originalCommissionRatePercent: 0 });
}
function resetCommissionRuleForm() {
  Object.assign(commissionRuleForm, { sourceId: null, ruleKey: "", name: "", scopeType: "channel", productId: null, promotionCodeId: null, directRatePercent: 0, agentLevelRatesPercent: [0, 0, 0], priority: 0, startsAt: "", endsAt: "", remark: "" });
}
function handleCommissionScopeChange() {
  commissionRuleForm.productId = null;
  commissionRuleForm.promotionCodeId = null;
}
function versionCommissionRule(row: any) {
  Object.assign(commissionRuleForm, {
    sourceId: row.id,
    ruleKey: row.ruleKey,
    name: row.name,
    scopeType: row.scopeType,
    productId: row.product?.id || null,
    promotionCodeId: row.promotionCode?.id || null,
    directRatePercent: Number(row.directRateBps || 0) / 100,
    agentLevelRatesPercent: [...(row.agentLevelRatesBps || []), 0, 0, 0].slice(0, 3).map((value: number) => Number(value || 0) / 100),
    priority: Number(row.priority || 0),
    startsAt: row.startsAt || "",
    endsAt: row.endsAt || "",
    remark: row.remark || ""
  });
}
async function selectRowMerchant(row: any, action: string) {
  if (row?.issuerScope === "platform") {
    const tenantId = Number(row?.tenant?.id || 0);
    const currentMerchant = selectedMerchant.value;
    if (tenantId && currentMerchant?.tenant?.id === tenantId && merchantOperational(currentMerchant)) return true;
    const merchant = merchants.value.find((item) => item.tenant?.id === tenantId && merchantOperational(item));
    if (!merchant) {
      ElMessage.error(`这张平台券属于「${row?.tenant?.name || `租户 #${tenantId || "-"}`}」，请先选择该租户下已开放且有权限的店铺后再${action}。`);
      return false;
    }
    filters.tenantId = isPlatformAdmin() ? tenantId : filters.tenantId;
    filters.merchantId = merchant.id;
    deepLinkWarning.value = "";
    await syncRouteQuery();
    await loadProductsAndCategories();
    return true;
  }
  const merchantId = row?.merchant?.id;
  if (!merchantId) {
    ElMessage.error(rowMerchantUnavailableMessage(row, action));
    return false;
  }
  if (merchantId === filters.merchantId && selectedMerchantOpen.value) return true;
  const merchant = merchants.value.find((item) => item.id === merchantId);
  if (!merchant || !merchantOperational(merchant)) {
    ElMessage.error(rowMerchantUnavailableMessage(row, action));
    return false;
  }
  filters.merchantId = merchantId;
  deepLinkWarning.value = "";
  await syncRouteQuery();
  await loadProductsAndCategories();
  return true;
}
async function editCoupon(row: any) {
  if (!(await selectRowMerchant(row, "编辑优惠券"))) return false;
  if (!requireMerchantSelection("编辑优惠券", row)) return false;
  Object.assign(couponForm, {
    id: row.id,
    code: row.code || "",
    name: row.name || "",
    issuerScope: row.issuerScope === "platform" ? "platform" : "merchant",
    refundReleasePolicy: row.refundReleasePolicy === "never" ? "never" : "full_refund",
    minAmount: Number(row.minAmount || 0),
    discountAmount: Number(row.discountAmount || 0),
    scope: row.scope || "all",
    scopeCategoryId: row.scopeCategoryId || null,
    scopeProductId: row.scopeProductId || null,
    issuanceLimit: Number(row.issuanceLimit || 0),
    claimedCount: Number(row.claimedCount || 0),
    usageLimit: Number(row.usageLimit || 0),
    perUserLimit: Number(row.perUserLimit || 0),
    startsAt: row.startsAt ? String(row.startsAt).slice(0, 19).replace("T", " ") : "",
    endsAt: row.endsAt ? String(row.endsAt).slice(0, 19).replace("T", " ") : "",
    enabled: row.enabled
  });
  return true;
}
async function editFlashSale(row: any) {
  if (!(await selectRowMerchant(row, "编辑秒杀活动"))) return false;
  if (!requireMerchantSelection("编辑秒杀活动", row)) return false;
  Object.assign(flashSaleForm, {
    id: row.id,
    title: row.title || "",
    originalTitle: row.title || "",
    productId: row.product?.id || row.productId || null,
    skuId: row.sku?.id || row.skuId || null,
    originalSkuId: row.sku?.id || row.skuId || null,
    salePrice: Number(row.salePrice || 0),
    saleStock: Number(row.saleStock || 1),
    lockedStock: Number(row.lockedStock || 0),
    soldStock: Number(row.soldStock || 0),
    perUserLimit: Number(row.perUserLimit || 0),
    startsAt: row.startsAt ? String(row.startsAt).slice(0, 19).replace("T", " ") : "",
    endsAt: row.endsAt ? String(row.endsAt).slice(0, 19).replace("T", " ") : "",
    status: row.status || "draft",
    sortOrder: Number(row.sortOrder || 0)
  });
  return true;
}
async function editGroupBuy(row: any) {
  if (!(await selectRowMerchant(row, "编辑拼团活动"))) return false;
  if (!requireMerchantSelection("编辑拼团活动", row)) return false;
  Object.assign(groupBuyForm, {
    id: row.id,
    title: row.title || "",
    originalTitle: row.title || "",
    productId: row.product?.id || row.productId || null,
    skuId: row.sku?.id || row.skuId || null,
    originalSkuId: row.sku?.id || row.skuId || null,
    groupPrice: Number(row.groupPrice || 0),
    minPeople: Number(row.minPeople || 2),
    groupStock: Number(row.groupStock || 1),
    lockedStock: Number(row.lockedStock || 0),
    soldStock: Number(row.soldStock || 0),
    perUserLimit: Number(row.perUserLimit || 0),
    startsAt: row.startsAt ? String(row.startsAt).slice(0, 19).replace("T", " ") : "",
    endsAt: row.endsAt ? String(row.endsAt).slice(0, 19).replace("T", " ") : "",
    status: row.status || "draft",
    sortOrder: Number(row.sortOrder || 0)
  });
  return true;
}
async function editPromotionCode(row: any) {
  if (!(await selectRowMerchant(row, "编辑推广码"))) return false;
  if (!requireMerchantSelection("编辑推广码", row)) return false;
  Object.assign(promotionForm, {
    id: row.id,
    code: row.code || "",
    name: row.name || "",
    commissionRatePercent: Number(row.commissionRate || 0) * 100,
    promoterUserId: row.promoterUser?.id || null,
    agentId: row.agent?.id || null,
    startsAt: row.startsAt ? String(row.startsAt).slice(0, 19).replace("T", " ") : "",
    endsAt: row.endsAt ? String(row.endsAt).slice(0, 19).replace("T", " ") : "",
    enabled: row.enabled,
    remark: row.remark || "",
    orderCount: Number(row.orderCount || 0),
    originalCode: row.code || "",
    originalAgentId: row.agent?.id || null,
    originalPromoterUserId: row.promoterUser?.id || null,
    originalCommissionRatePercent: Number(row.commissionRate || 0) * 100
  });
  return true;
}
async function saveCoupon() {
  if (!requireMerchantSelection("配置优惠券")) return;
  if (!couponForm.code?.trim()) return ElMessage.error("请输入优惠券码");
  if (!couponForm.name?.trim()) return ElMessage.error("请输入优惠券名称");
  if (Number(couponForm.discountAmount || 0) <= 0) return ElMessage.error("优惠金额必须大于 0");
  if (!validateCouponConfiguration()) return;
  if (couponForm.scope === "category" && !couponForm.scopeCategoryId) return ElMessage.error("请选择适用分类");
  if (couponForm.scope === "product" && !couponForm.scopeProductId) return ElMessage.error("请选择适用商品");
  if (!validateMarketingTimeRange(couponForm.startsAt, couponForm.endsAt, "优惠券", false, true)) return;
  const target = captureMarketingFormTarget("coupon", couponForm.id);
  couponSaving.value = true;
  try {
    const payload = {
      code: couponForm.code.trim(),
      name: couponForm.name.trim(),
      ...currentMallParams(),
      issuerScope: couponForm.issuerScope,
      refundReleasePolicy: couponForm.refundReleasePolicy,
      minAmount: Number(couponForm.minAmount || 0),
      discountAmount: Number(couponForm.discountAmount || 0),
      scope: couponForm.scope,
      scopeCategoryId: couponForm.scope === "category" ? couponForm.scopeCategoryId : null,
      scopeProductId: couponForm.scope === "product" ? couponForm.scopeProductId : null,
      issuanceLimit: Number(couponForm.issuanceLimit || 0),
      usageLimit: Number(couponForm.usageLimit || 0),
      perUserLimit: Number(couponForm.perUserLimit || 0),
      startsAt: couponForm.startsAt || null,
      endsAt: couponForm.endsAt || null,
      enabled: couponForm.enabled
    };
    assertMarketingFormTarget(target, "优惠券");
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
async function saveFlashSale() {
  if (!requireMerchantSelection("配置秒杀活动")) return;
  if (!flashSaleForm.title?.trim()) return ElMessage.error("请输入秒杀标题");
  if (!flashSaleForm.productId || !flashSaleForm.skuId) return ElMessage.error("请选择秒杀商品和规格");
  if (!validateActivityTitleUniqueForSku(flashSaleForm, flashSales.value, "秒杀")) return;
  if (!validateActivityIdentityCanChange(flashSaleForm, "秒杀")) return;
  if (Number(flashSaleForm.salePrice || 0) <= 0) return ElMessage.error("秒杀价必须大于 0");
  if (Number(flashSaleForm.saleStock || 0) <= 0) return ElMessage.error("秒杀库存必须大于 0");
  if (!validateActivityPriceWithinSku(flashSaleForm, selectedFlashSaleSku.value, "salePrice", "秒杀")) return;
  if (!validateActivityStockWithinSku(flashSaleForm, selectedFlashSaleSku.value, "saleStock", "秒杀")) return;
  if (!validateMarketingTimeRange(flashSaleForm.startsAt, flashSaleForm.endsAt, "秒杀", true)) return;
  if (!validateActivityTimeNotOverlapping(flashSaleForm, flashSales.value, "秒杀")) return;
  const target = captureMarketingFormTarget("flash", flashSaleForm.id);
  flashSaleSaving.value = true;
  try {
    const payload = {
      ...currentMallParams(),
      productId: flashSaleForm.productId,
      skuId: flashSaleForm.skuId,
      title: flashSaleForm.title.trim(),
      salePrice: Number(flashSaleForm.salePrice || 0),
      saleStock: Number(flashSaleForm.saleStock || 0),
      perUserLimit: Number(flashSaleForm.perUserLimit || 0),
      startsAt: flashSaleForm.startsAt,
      endsAt: flashSaleForm.endsAt,
      status: flashSaleForm.status,
      sortOrder: Number(flashSaleForm.sortOrder || 0)
    };
    assertMarketingFormTarget(target, "秒杀活动");
    if (flashSaleForm.id) await api.patch(`/admin/mall/flash-sales/${flashSaleForm.id}`, payload);
    else await api.post("/admin/mall/flash-sales", payload);
    ElMessage.success("秒杀活动已保存");
    resetFlashSaleForm();
    await loadFlashSales();
  } catch (error: any) {
    ElMessage.error(error.message || "保存秒杀活动失败");
  } finally {
    flashSaleSaving.value = false;
  }
}
async function saveGroupBuy() {
  if (!requireMerchantSelection("配置拼团活动")) return;
  if (!groupBuyForm.title?.trim()) return ElMessage.error("请输入拼团标题");
  if (!groupBuyForm.productId || !groupBuyForm.skuId) return ElMessage.error("请选择拼团商品和规格");
  if (!validateActivityTitleUniqueForSku(groupBuyForm, groupBuys.value, "拼团")) return;
  if (!validateActivityIdentityCanChange(groupBuyForm, "拼团")) return;
  if (Number(groupBuyForm.groupPrice || 0) <= 0) return ElMessage.error("拼团价必须大于 0");
  if (Number(groupBuyForm.minPeople || 0) < 2) return ElMessage.error("成团人数至少 2 人");
  if (Number(groupBuyForm.groupStock || 0) <= 0) return ElMessage.error("拼团库存必须大于 0");
  if (!validateActivityPriceWithinSku(groupBuyForm, selectedGroupBuySku.value, "groupPrice", "拼团")) return;
  if (!validateActivityStockWithinSku(groupBuyForm, selectedGroupBuySku.value, "groupStock", "拼团")) return;
  if (!validateMarketingTimeRange(groupBuyForm.startsAt, groupBuyForm.endsAt, "拼团", true)) return;
  if (!validateActivityTimeNotOverlapping(groupBuyForm, groupBuys.value, "拼团")) return;
  const target = captureMarketingFormTarget("group", groupBuyForm.id);
  groupBuySaving.value = true;
  try {
    const payload = {
      ...currentMallParams(),
      productId: groupBuyForm.productId,
      skuId: groupBuyForm.skuId,
      title: groupBuyForm.title.trim(),
      groupPrice: Number(groupBuyForm.groupPrice || 0),
      minPeople: Number(groupBuyForm.minPeople || 0),
      groupStock: Number(groupBuyForm.groupStock || 0),
      perUserLimit: Number(groupBuyForm.perUserLimit || 0),
      startsAt: groupBuyForm.startsAt,
      endsAt: groupBuyForm.endsAt,
      status: groupBuyForm.status,
      sortOrder: Number(groupBuyForm.sortOrder || 0)
    };
    assertMarketingFormTarget(target, "拼团活动");
    if (groupBuyForm.id) await api.patch(`/admin/mall/group-buys/${groupBuyForm.id}`, payload);
    else await api.post("/admin/mall/group-buys", payload);
    ElMessage.success("拼团活动已保存");
    resetGroupBuyForm();
    await loadGroupBuys();
  } catch (error: any) {
    ElMessage.error(error.message || "保存拼团活动失败");
  } finally {
    groupBuySaving.value = false;
  }
}
async function savePromotionCode() {
  if (!requireMerchantSelection("配置推广码")) return;
  if (!promotionForm.code?.trim()) return ElMessage.error("请输入推广码");
  if (!promotionForm.name?.trim()) return ElMessage.error("请输入推广码名称");
  if (Number(promotionForm.commissionRatePercent || 0) < 0 || Number(promotionForm.commissionRatePercent || 0) > 100) return ElMessage.error("佣金比例必须在 0% 到 100% 之间");
  if (!validateMarketingTimeRange(promotionForm.startsAt, promotionForm.endsAt, "推广码", false, true)) return;
  if (!validatePromotionCodeConfiguration()) return;
  const target = captureMarketingFormTarget("promotion", promotionForm.id);
  promotionSaving.value = true;
  try {
    const payload = {
      code: promotionForm.code.trim(),
      name: promotionForm.name.trim(),
      ...currentMallParams(),
      promoterUserId: promotionForm.promoterUserId || null,
      agentId: promotionForm.agentId || null,
      commissionRate: Number(promotionForm.commissionRatePercent || 0) / 100,
      startsAt: promotionForm.startsAt || null,
      endsAt: promotionForm.endsAt || null,
      enabled: promotionForm.enabled,
      remark: promotionForm.remark?.trim() || undefined
    };
    assertMarketingFormTarget(target, "推广码");
    if (promotionForm.id) await api.patch(`/admin/mall/promotion-codes/${promotionForm.id}`, payload);
    else await api.post("/admin/mall/promotion-codes", payload);
    ElMessage.success("推广码已保存");
    resetPromotionForm();
    await loadPromotionCodes();
  } catch (error: any) {
    ElMessage.error(error.message || "保存推广码失败");
  } finally {
    promotionSaving.value = false;
  }
}
async function toggleCoupon(row: any) {
  if (actionKey.value) return;
  if (!(await editCoupon(row))) return;
  if (!requireMerchantSelection("启停优惠券", row)) return;
  const target = captureMarketingTarget("coupon", row);
  actionKey.value = `coupon:toggle:${row.id}`;
  try {
    if (!(await confirmMarketingToggle(row, row.enabled ? "停用" : "启用", "优惠券"))) return;
    assertMarketingTarget(target, "优惠券");
    couponForm.enabled = !row.enabled;
    await saveCoupon();
  } catch (error: any) {
    ElMessage.error(error.message || "启停优惠券失败");
  } finally {
    actionKey.value = "";
  }
}
async function toggleFlashSale(row: any) {
  if (actionKey.value) return;
  if (!(await editFlashSale(row))) return;
  if (!requireMerchantSelection("启停秒杀活动", row)) return;
  const target = captureMarketingTarget("flash", row);
  actionKey.value = `flash:toggle:${row.id}`;
  try {
    if (!(await confirmMarketingToggle(row, row.status === "active" ? "停用" : "启用", "秒杀活动"))) return;
    assertMarketingTarget(target, "秒杀活动");
    flashSaleForm.status = row.status === "active" ? "disabled" : "active";
    await saveFlashSale();
  } catch (error: any) {
    ElMessage.error(error.message || "启停秒杀活动失败");
  } finally {
    actionKey.value = "";
  }
}
async function toggleGroupBuy(row: any) {
  if (actionKey.value) return;
  if (!(await editGroupBuy(row))) return;
  if (!requireMerchantSelection("启停拼团活动", row)) return;
  const target = captureMarketingTarget("group", row);
  actionKey.value = `group:toggle:${row.id}`;
  try {
    if (!(await confirmMarketingToggle(row, row.status === "active" ? "停用" : "启用", "拼团活动"))) return;
    assertMarketingTarget(target, "拼团活动");
    groupBuyForm.status = row.status === "active" ? "disabled" : "active";
    await saveGroupBuy();
  } catch (error: any) {
    ElMessage.error(error.message || "启停拼团活动失败");
  } finally {
    actionKey.value = "";
  }
}
async function togglePromotionCode(row: any) {
  if (actionKey.value) return;
  if (!(await editPromotionCode(row))) return;
  if (!requireMerchantSelection("启停推广码", row)) return;
  const target = captureMarketingTarget("promotion", row);
  actionKey.value = `promotion:toggle:${row.id}`;
  try {
    if (!(await confirmMarketingToggle(row, row.enabled ? "停用" : "启用", "推广码"))) return;
    assertMarketingTarget(target, "推广码");
    promotionForm.enabled = !row.enabled;
    await savePromotionCode();
  } catch (error: any) {
    ElMessage.error(error.message || "启停推广码失败");
  } finally {
    actionKey.value = "";
  }
}

onMounted(async () => {
  await loadTenants();
  const ok = await loadMerchants();
  if (!ok) return;
  await reload();
});
watch(() => [route.query.tenantId, route.query.merchantId, route.query.tab], handleRouteQueryChange);
</script>

<style scoped>
.mall-marketing-page { padding: 24px; display: grid; gap: 16px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.page-header h2 { margin: 0 0 6px; color: #111827; }
.page-header p { margin: 0; color: #64748b; }
.header-actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.scope-alert { margin-bottom: 2px; }
.section-error { margin-bottom: 12px; }
.section-error :deep(.el-alert__content) { min-width: 0; }
.section-error :deep(.el-alert__description), .section-error span { overflow-wrap: anywhere; }
.section-error :deep(.el-alert__description) { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.merchant-card { border-color: #dbeafe; background: linear-gradient(135deg, #eff6ff 0%, #fff 72%); }
.merchant-card :deep(.el-card__body) { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; }
.merchant-card strong { color: #0f172a; }
.merchant-card p { margin: 4px 0 0; color: #64748b; }
.merchant-tags, .merchant-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.merchant-actions { grid-column: 1 / -1; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.summary-grid :deep(.el-card__body) { display: grid; gap: 4px; }
.summary-grid small, .summary-grid span { color: #64748b; }
.summary-grid strong { color: #0f172a; font-size: 24px; }
.marketing-tabs { background: #fff; border-radius: 10px; padding: 14px 16px 18px; border: 1px solid #e5e7eb; }
.tool-section { display: grid; grid-template-columns: 360px minmax(0, 1fr); gap: 16px; align-items: start; }
.form-card, .table-card { min-width: 0; }
.section-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.section-header > div { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.inline-fields { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.commission-levels :deep(.el-input-number) { width: 104px; }
.form-scope { color: #334155; font-size: 13px; line-height: 1.5; }
.form-hint { margin-left: 6px; color: #64748b; }
.table-card small, .form-card small { display: block; color: #64748b; margin-top: 3px; }
@media (max-width: 1100px) {
  .page-header { display: grid; }
  .header-actions { justify-content: flex-start; }
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .tool-section { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .mall-marketing-page { padding: 14px; }
  .summary-grid { grid-template-columns: 1fr; }
  .merchant-card :deep(.el-card__body) { grid-template-columns: 1fr; }
  .merchant-tags, .merchant-actions { justify-content: flex-start; }
}
</style>
