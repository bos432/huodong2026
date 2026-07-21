<template>
  <div class="mall-page">
    <div class="page-header">
      <div>
        <h2>{{ pageHeader.title }}</h2>
        <p>{{ pageHeader.desc }}</p>
        <p class="finance-note">{{ pageHeader.note }}</p>
      </div>
      <div class="header-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家" style="width:220px" @change="handleTenantChange">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-select v-model="filters.merchantId" clearable filterable placeholder="全部店铺" style="width:220px" @change="handleMerchantChange">
          <el-option v-for="merchant in merchants" :key="merchant.id" :label="merchantLabel(merchant)" :value="merchant.id" />
        </el-select>
        <el-select v-model="filters.status" clearable placeholder="全部状态" style="width:150px" @change="loadOrders">
          <el-option v-for="item in statuses" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="filters.paymentMethod" clearable placeholder="全部支付" style="width:130px" @change="loadOrders">
          <el-option v-for="item in paymentMethods" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-select v-model="filters.refundStatus" clearable placeholder="全部售后" style="width:140px" @change="loadOrders">
          <el-option v-for="item in refundStatuses" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width:250px" @change="onDateRangeChange" />
        <el-input v-model="filters.keyword" clearable placeholder="订单号/手机号" style="width:220px" @keyup.enter="loadOrders" @clear="loadOrders" />
        <el-input v-model="filters.checkoutGroupNo" clearable placeholder="跨店结算组号" style="width:180px" @keyup.enter="loadOrders" @clear="loadOrders" />
        <el-button v-if="canManageLogistics" :disabled="selectedMerchant && !selectedMerchantOpen" @click="openLogisticsDialog">物流设置</el-button>
        <el-button v-if="canManageProducts" type="success" plain :disabled="selectedMerchant && !selectedMerchantOpen" @click="openCouponDialog">优惠券管理</el-button>
        <el-button v-if="canManageProducts" type="danger" plain :disabled="selectedMerchant && !selectedMerchantOpen" @click="openFlashSaleDialog">秒杀管理</el-button>
        <el-button v-if="canManageProducts" type="warning" plain :disabled="selectedMerchant && !selectedMerchantOpen" @click="openGroupBuyDialog">拼团管理</el-button>
        <el-button type="warning" plain @click="openGroupBuyRecordDialog">参团记录</el-button>
        <el-button v-if="canManageProducts" type="primary" plain :disabled="selectedMerchant && !selectedMerchantOpen" @click="openPromotionDialog">推广码管理</el-button>
        <el-button v-if="canManageOrders" :loading="closingExpired" type="warning" plain :disabled="selectedMerchant && !selectedMerchantOpen" @click="closeExpiredOrders">清理超时订单</el-button>
        <el-button v-if="canManageProducts" :loading="failingGroupBuys" type="warning" plain :disabled="selectedMerchant && !selectedMerchantOpen" @click="failExpiredGroupBuys">处理未成团</el-button>
        <el-button v-if="canManageOrders" :loading="completingShipped" type="success" plain :disabled="selectedMerchant && !selectedMerchantOpen" @click="completeExpiredShippedOrders">自动完成已发货</el-button>
        <el-button @click="exportOrders">导出订单</el-button>
        <el-button :loading="loading" @click="reload">刷新</el-button>
      </div>
    </div>

    <el-alert
      v-if="isPlatformAdmin()"
      class="scope-hint"
      type="info"
      show-icon
      :closable="false"
      title="平台视角可直接查看全部商家的商城订单、售后和财务；只有配置物流、优惠券、秒杀、拼团、推广码等商家运营内容时，才需要先在上方选择具体商家。"
    />

    <el-alert
      v-if="deepLinkWarning"
      class="deep-link-alert"
      type="error"
      show-icon
      :closable="false"
      title="订单管理店铺链接不可用"
      :description="deepLinkWarning"
    />
    <el-alert v-if="scopeError" class="page-error" type="error" show-icon :closable="false" title="商城店铺范围同步失败" aria-live="assertive">
      <template #default><p>{{ scopeError }}</p><el-button size="small" @click="reloadMerchantScope">重新同步店铺范围</el-button></template>
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
        <el-button v-if="canManageProducts" size="small" type="primary" plain @click="goMerchantAdmin('/mall-products')">商品管理</el-button>
        <el-button v-if="canManagePayments" size="small" type="primary" plain @click="goMerchantAdmin('/mall-payments')">收款配置</el-button>
        <el-button v-if="canManageRefunds" size="small" type="warning" plain @click="goMerchantAdmin('/mall-refunds')">售后处理</el-button>
        <el-button v-if="canManageProducts" size="small" type="success" plain @click="goMerchantAdmin('/mall-marketing')">营销工具</el-button>
        <el-button v-if="canViewStatistics" size="small" type="info" plain @click="goMerchantAdmin('/mall-statistics')">经营统计</el-button>
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

    <div class="summary-row">
      <el-card v-for="item in summaryCards" :key="item.label" shadow="never" class="summary-card">
        <small>{{ item.label }}</small>
        <strong>{{ item.value }}</strong>
      </el-card>
    </div>

    <el-card v-if="checkoutGroupTraceNo" v-loading="checkoutGroupTraceLoading" shadow="never" class="checkout-trace-card">
      <template #header>
        <div class="card-header-line">
          <span>跨店结算组追踪：{{ checkoutGroupTraceNo }}</span>
          <el-button size="small" :loading="checkoutGroupTraceLoading" @click="loadCheckoutGroupTrace">刷新本组</el-button>
        </div>
      </template>
      <el-alert
        class="checkout-trace-tip"
        type="info"
        :closable="false"
        show-icon
        title="本卡片按结算组号独立汇总子订单、售后、支付、退款和佣金，不受顶部状态/日期筛选影响；如需追完整跨店交易，平台视角请保持“全部店铺”。"
      />
      <el-alert v-if="checkoutGroupTraceError" class="page-error" type="error" show-icon :closable="false" title="跨店结算组追踪失败" aria-live="assertive">
        <template #default><p>{{ checkoutGroupTraceError }}</p><el-button size="small" :loading="checkoutGroupTraceLoading" @click="loadCheckoutGroupTrace">重新加载本组</el-button></template>
      </el-alert>
      <div class="checkout-trace-grid">
        <div v-for="item in checkoutGroupTraceCards" :key="item.label">
          <small>{{ item.label }}</small>
          <strong>{{ item.value }}</strong>
        </div>
      </div>
      <el-table :data="checkoutGroupTrace.orders" size="small" border>
        <el-table-column label="子订单" min-width="180">
          <template #default="{ row }">
            <strong>{{ row.orderNo }}</strong>
            <div class="muted-line">{{ row.checkoutGroup?.status ? checkoutGroupStatusText(row.checkoutGroup.status) : "非跨店订单" }}</div>
          </template>
        </el-table-column>
        <el-table-column label="店铺" min-width="160"><template #default="{ row }">{{ row.merchant?.name || "默认店铺" }}</template></el-table-column>
        <el-table-column label="用户" width="130"><template #default="{ row }">{{ maskedPhone(row.user?.phone) || row.user?.nickname || "-" }}</template></el-table-column>
        <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template></el-table-column>
        <el-table-column label="支付" width="100"><template #default="{ row }">{{ paymentText(row.paymentMethod) }}</template></el-table-column>
        <el-table-column label="金额" width="110"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
        <el-table-column label="售后" min-width="160"><template #default="{ row }">{{ refundSummary(row.refund) }}</template></el-table-column>
        <el-table-column label="操作" width="100"><template #default="{ row }"><el-button size="small" text type="primary" @click.stop="openDetail(row)">打开订单</el-button></template></el-table-column>
      </el-table>
      <div class="checkout-trace-foot">
        <el-tag effect="plain">售后 {{ checkoutGroupTrace.refunds.length }} 条</el-tag>
        <el-tag effect="plain">支付流水 {{ checkoutGroupTrace.paymentTransactions.length }} 条</el-tag>
        <el-tag effect="plain">支付回调 {{ checkoutGroupTrace.paymentCallbackLogs.length }} 条</el-tag>
        <el-tag effect="plain">退款日志 {{ checkoutGroupTrace.refundLogs.length }} 条</el-tag>
        <el-tag effect="plain">佣金 {{ checkoutGroupTrace.commissions.length }} 条 / ¥{{ money(checkoutGroupTrace.commissionSummary.totalAmount) }}</el-tag>
      </div>
    </el-card>

    <el-card shadow="never" class="analytics-card">
      <template #header>
        <div class="card-header-line">
          <span>商城运营看板（近 30 天）</span>
          <el-button size="small" :loading="analyticsLoading" @click="loadAnalytics">刷新看板</el-button>
        </div>
      </template>
      <el-alert v-if="analyticsError" class="page-error" type="error" show-icon :closable="false" title="商城运营看板加载失败" aria-live="assertive">
        <template #default><p>{{ analyticsError }}</p><el-button size="small" :loading="analyticsLoading" @click="loadAnalytics">重新加载看板</el-button></template>
      </el-alert>
      <div class="analytics-summary">
        <div v-for="item in analyticsCards" :key="item.label">
          <small>{{ item.label }}</small>
          <strong>{{ item.value }}</strong>
        </div>
      </div>
      <div class="analytics-grid">
        <el-card shadow="never">
          <template #header>销售趋势</template>
          <el-table :data="mallAnalytics.trend || []" size="small" max-height="260">
            <el-table-column prop="date" label="日期" width="120" />
            <el-table-column label="订单" width="90"><template #default="{ row }">{{ row.orderCount }}</template></el-table-column>
            <el-table-column label="实收" width="110"><template #default="{ row }">¥{{ money(row.receivedAmount) }}</template></el-table-column>
            <el-table-column label="优惠" width="110"><template #default="{ row }">¥{{ money(row.discountAmount) }}</template></el-table-column>
          </el-table>
        </el-card>
        <el-card shadow="never">
          <template #header>支付方式</template>
          <el-table :data="mallAnalytics.byPaymentMethod || []" size="small" max-height="260">
            <el-table-column label="渠道" min-width="110"><template #default="{ row }">{{ paymentText(row.paymentMethod) }}</template></el-table-column>
            <el-table-column label="订单" width="90"><template #default="{ row }">{{ row.orderCount }}</template></el-table-column>
            <el-table-column label="金额" width="120"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          </el-table>
        </el-card>
        <el-card shadow="never">
          <template #header>热销商品</template>
          <el-table :data="mallAnalytics.topProducts || []" size="small" max-height="260">
            <el-table-column prop="productTitle" label="商品" min-width="170" show-overflow-tooltip />
            <el-table-column label="销量" width="80"><template #default="{ row }">{{ row.quantity }}</template></el-table-column>
            <el-table-column label="销售额" width="110"><template #default="{ row }">¥{{ money(row.grossAmount) }}</template></el-table-column>
          </el-table>
        </el-card>
        <el-card shadow="never">
          <template #header>优惠券转化</template>
          <el-table :data="mallAnalytics.couponStats || []" size="small" max-height="260">
            <el-table-column label="券" min-width="150">
              <template #default="{ row }">
                <strong>{{ row.code }}</strong>
                <div class="muted-line">{{ row.name }}</div>
              </template>
            </el-table-column>
            <el-table-column label="领/用" width="100"><template #default="{ row }">{{ row.claimedCount }} / {{ row.usedCount }}</template></el-table-column>
            <el-table-column label="转化" width="80"><template #default="{ row }">{{ row.useRate }}</template></el-table-column>
          </el-table>
        </el-card>
      </div>
    </el-card>

    <el-card v-if="paymentReadiness" shadow="never" class="readiness-card" :class="`readiness-${paymentReadiness.status}`">
      <div class="readiness-head">
        <div>
          <strong>微信支付配置体检：{{ paymentReadiness.statusText }}</strong>
          <p>{{ paymentReadiness.nextAction }}</p>
        </div>
        <el-tag :type="paymentReadinessTagType(paymentReadiness.status)">{{ paymentReadiness.statusText }}</el-tag>
      </div>
      <div class="readiness-metrics">
        <span>收款模式：{{ paymentReadiness.collectionMode === "merchant_direct" ? "商户直收" : "平台代收" }}</span>
        <span v-if="paymentReadiness.merchant">店铺：{{ paymentReadiness.merchant.name }}</span>
        <span v-if="paymentReadiness.collectionMode === 'merchant_direct'">直收账户：{{ paymentReadiness.direct?.account?.merchantNo || paymentReadiness.direct?.account?.merchantName || "未绑定" }}</span>
        <span>前台开关：{{ paymentReadiness.enabledInOperation ? "已开启" : "未开启" }}</span>
        <span>沙箱：{{ paymentReadiness.sandbox?.enabled && paymentReadiness.sandbox?.secretReady ? "可用" : "未就绪" }}</span>
        <span>真实支付：{{ paymentReadiness.real?.realPaymentEnabled && paymentReadiness.real?.wechatEnabled ? "已开启" : "未开启" }}</span>
        <span>回调地址：{{ paymentReadiness.real?.notifyUrl || "未配置" }}</span>
      </div>
      <div v-if="paymentReadiness.issues?.length" class="readiness-issues">
        <el-tag v-for="issue in paymentReadiness.issues" :key="issue" type="warning" effect="plain">{{ issue }}</el-tag>
      </div>
    </el-card>

    <el-card shadow="never" class="settlement-card">
      <template #header>
        <div class="card-header-line">
          <span>店铺结算单</span>
          <span>
            <el-select v-model="settlementFilters.status" clearable placeholder="全部结算状态" size="small" style="width:150px" @change="loadSettlements">
              <el-option label="草稿" value="draft" />
              <el-option label="已审核" value="approved" />
              <el-option label="已打款" value="paid" />
              <el-option label="已拒绝" value="rejected" />
            </el-select>
            <el-button size="small" :loading="settlementLoading" @click="loadSettlements">刷新结算</el-button>
            <el-button size="small" @click="exportSettlements">导出结算</el-button>
          </span>
        </div>
      </template>
      <el-alert v-if="settlementError" class="page-error" type="error" show-icon :closable="false" title="商城结算加载失败" aria-live="assertive">
        <template #default><p>{{ settlementError }}</p><el-button size="small" :loading="settlementLoading" @click="loadSettlements">重新加载结算</el-button></template>
      </el-alert>
      <el-alert class="settlement-tip" type="info" :closable="false" show-icon :title="canManageMallSettlements ? '生成结算单前请先选择上方日期范围；系统只统计已完成商城订单，并扣减已通过售后。正数为应打款，负数为应扣回/冲抵。' : '当前账号可查看店铺结算状态；生成、审核、打款和扣回由平台财务处理。'" />
      <el-table v-if="settlementPending.length" :data="settlementPending" size="small" border class="settlement-pending">
        <el-table-column label="待生成店铺" min-width="170"><template #default="{ row }">{{ row.merchant?.name || "默认店铺" }}</template></el-table-column>
        <el-table-column label="模式" width="110"><template #default="{ row }">{{ row.paymentMode === "merchant_direct" ? "商户直收" : "平台代收" }}</template></el-table-column>
        <el-table-column label="订单" width="90"><template #default="{ row }">{{ row.orderCount }}</template></el-table-column>
        <el-table-column label="订单金额" width="110"><template #default="{ row }">¥{{ money(row.orderAmount) }}</template></el-table-column>
        <el-table-column label="退款" width="100"><template #default="{ row }">¥{{ money(row.refundAmount) }}</template></el-table-column>
        <el-table-column label="服务费" width="120"><template #default="{ row }">¥{{ money(row.serviceFeeAmount) }}</template></el-table-column>
        <el-table-column label="应打款/扣回" width="130"><template #default="{ row }">{{ settlementAmountText(row.payableAmount) }}</template></el-table-column>
        <el-table-column v-if="canManageMallSettlements" label="操作" width="130"><template #default="{ row }"><el-button size="small" type="primary" plain :disabled="!row.merchant?.id" @click="generateSettlement(row)">生成结算单</el-button></template></el-table-column>
      </el-table>
      <el-table :data="mallSettlements" size="small" stripe>
        <el-table-column prop="settlementNo" label="结算单号" width="180" />
        <el-table-column label="店铺" min-width="160"><template #default="{ row }">{{ row.merchant?.name || "-" }}</template></el-table-column>
        <el-table-column label="周期" width="190"><template #default="{ row }">{{ row.periodStart }} 至 {{ row.periodEnd }}</template></el-table-column>
        <el-table-column label="模式" width="110"><template #default="{ row }">{{ row.paymentMode === "merchant_direct" ? "商户直收" : "平台代收" }}</template></el-table-column>
        <el-table-column label="应打款/扣回" width="130"><template #default="{ row }">{{ settlementAmountText(row.payableAmount) }}</template></el-table-column>
        <el-table-column label="服务费" width="110"><template #default="{ row }">¥{{ money(row.serviceFeeAmount) }}</template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="settlementStatusType(row.status)">{{ settlementStatusText(row.status) }}</el-tag></template></el-table-column>
        <el-table-column label="审核/打款" min-width="210"><template #default="{ row }">{{ row.reviewedBy || row.generatedBy || "-" }}<div class="muted-line">{{ row.paidReference || row.remark || "-" }}</div></template></el-table-column>
        <el-table-column v-if="canManageMallSettlements" label="操作" width="230">
          <template #default="{ row }">
            <el-button size="small" type="success" plain :disabled="row.status !== 'draft'" @click="approveSettlement(row)">审核</el-button>
            <el-button size="small" type="danger" plain :disabled="row.status !== 'draft'" @click="rejectSettlement(row)">拒绝</el-button>
            <el-button size="small" type="primary" plain :disabled="row.status !== 'approved'" @click="markSettlementPaid(row)">{{ settlementFinishActionText(row) }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-alert v-if="orderError" class="page-error" type="error" show-icon :closable="false" title="商城订单加载失败" aria-live="assertive">
      <template #default><p>{{ orderError }}</p><el-button size="small" :loading="loading" @click="loadOrders">重新加载订单</el-button></template>
    </el-alert>
    <el-table v-loading="loading" :data="orders" stripe empty-text="暂无匹配商城订单" @row-click="openDetail">
      <el-table-column prop="orderNo" label="订单号" width="190" />
      <el-table-column label="结算组" width="180">
        <template #default="{ row }">
          <span>{{ row.checkoutGroup?.groupNo || "-" }}</span>
          <div v-if="row.checkoutGroup?.status" class="muted-line">{{ checkoutGroupStatusText(row.checkoutGroup.status) }}</div>
        </template>
      </el-table-column>
      <el-table-column label="商品" min-width="260">
        <template #default="{ row }">
          <div v-for="item in row.items || []" :key="item.id" class="item-line">{{ item.productTitle }} / {{ item.skuName }} × {{ item.quantity }}</div>
        </template>
      </el-table-column>
      <el-table-column label="用户" min-width="140"><template #default="{ row }">{{ maskedPhone(row.user?.phone) || row.user?.nickname || "-" }}</template></el-table-column>
      <el-table-column label="店铺" min-width="150"><template #default="{ row }">{{ row.merchant?.name || "默认店铺" }}</template></el-table-column>
      <el-table-column label="收货人" min-width="170"><template #default="{ row }">{{ receiverText(row) }}</template></el-table-column>
      <el-table-column label="金额" width="130">
        <template #default="{ row }">
          <strong>¥{{ money(row.amount) }}</strong>
          <small v-if="Number(row.discountAmount || 0) > 0">商品 ¥{{ money(row.goodsAmount) }} / 优惠 ¥{{ money(row.discountAmount) }} / 积分 {{ row.pointsUsed || 0 }}</small>
        </template>
      </el-table-column>
      <el-table-column label="支付" width="110"><template #default="{ row }">{{ paymentText(row.paymentMethod) }}</template></el-table-column>
      <el-table-column label="推广码" width="110"><template #default="{ row }">{{ row.promotionCode || "-" }}</template></el-table-column>
      <el-table-column label="状态" width="120"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template></el-table-column>
      <el-table-column label="处理建议" min-width="190"><template #default="{ row }"><span class="action-tip">{{ orderActionTip(row) }}</span></template></el-table-column>
      <el-table-column label="物流" min-width="150"><template #default="{ row }">{{ row.expressCompany || "" }} {{ row.expressNo || "-" }}</template></el-table-column>
      <el-table-column label="创建时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
      <el-table-column label="操作" width="330" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click.stop="openDetail(row)">详情</el-button>
          <el-button v-if="canManageOrders" size="small" type="success" :disabled="row.status !== 'pending_confirm'" @click.stop="confirmOffline(row)">确认收款</el-button>
          <el-button v-if="canManageOrders" size="small" :disabled="row.status !== 'paid'" @click.stop="openShip(row)">发货</el-button>
          <el-button v-if="canManageOrders" size="small" type="danger" plain :disabled="!['pending_payment','pending_confirm'].includes(row.status)" @click.stop="closeOrder(row)">关闭</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-divider>售后申请</el-divider>
    <div class="refund-toolbar">
      <el-select v-model="refundFilters.status" clearable placeholder="全部售后状态" style="width:150px" @change="loadRefunds">
        <el-option label="待处理" value="pending" />
        <el-option label="待买家寄回" value="awaiting_buyer_return" />
        <el-option label="退货运输中" value="returning" />
        <el-option label="待商家收货" value="awaiting_merchant_receipt" />
        <el-option label="待寄换货商品" value="awaiting_exchange_shipment" />
        <el-option label="换货已发出" value="exchange_shipped" />
        <el-option label="平台介入" value="platform_intervening" />
        <el-option label="处理中" value="processing" />
        <el-option label="已通过" value="approved" />
        <el-option label="失败" value="failed" />
        <el-option label="已拒绝" value="rejected" />
      </el-select>
      <el-input v-model="refundFilters.keyword" clearable placeholder="售后单/订单号/手机号/原因" style="width:260px" @keyup.enter="loadRefunds" @clear="loadRefunds" />
      <el-button @click="exportRefunds">导出售后</el-button>
      <el-button @click="loadRefunds">刷新售后</el-button>
    </div>
    <el-alert v-if="refundError" class="page-error" type="error" show-icon :closable="false" title="商城售后加载失败" aria-live="assertive">
      <template #default><p>{{ refundError }}</p><el-button size="small" @click="loadRefunds">重新加载售后</el-button></template>
    </el-alert>
    <el-table :data="refunds" stripe empty-text="暂无匹配售后申请" @row-click="openRefundOrder">
      <el-table-column type="expand" width="44">
        <template #default="{ row }">
          <div class="after-sale-detail" @click.stop>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="责任归属">{{ refundResponsibilityText(row.responsibility) }}</el-descriptions-item>
              <el-descriptions-item label="响应期限">{{ formatTime(row.responseDeadlineAt) }}</el-descriptions-item>
              <el-descriptions-item label="退货地址" :span="2">{{ refundAddressText(row.returnAddressSnapshot) || "-" }}</el-descriptions-item>
              <el-descriptions-item label="买家寄回">{{ row.returnExpressNo ? `${row.returnExpressCompany || '快递'} ${row.returnExpressNo}` : "-" }}</el-descriptions-item>
              <el-descriptions-item label="换货物流">{{ row.exchangeShipment ? `${row.exchangeShipment.expressCompany || '快递'} ${row.exchangeShipment.expressNo}` : "-" }}</el-descriptions-item>
            </el-descriptions>
            <el-table :data="row.items || []" size="small" border>
              <el-table-column label="售后商品" min-width="220"><template #default="{ row: item }">{{ item.itemSnapshot?.productTitle || "商品" }} {{ item.itemSnapshot?.skuName || "" }}</template></el-table-column>
              <el-table-column prop="requestedQuantity" label="申请数量" width="90" />
              <el-table-column prop="receivedQuantity" label="收货数量" width="90" />
              <el-table-column label="可退金额" width="100"><template #default="{ row: item }">¥{{ money(item.refundableAmount) }}</template></el-table-column>
            </el-table>
            <el-timeline v-if="row.messages?.length" class="refund-message-timeline">
              <el-timeline-item v-for="message in row.messages" :key="message.id" :timestamp="formatTime(message.createdAt)" placement="top"><strong>{{ message.actorName || message.actorType }}</strong><div>{{ message.content }}</div></el-timeline-item>
            </el-timeline>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="refundNo" label="售后单号" width="190" />
      <el-table-column label="订单/结算组" width="190">
        <template #default="{ row }">
          <strong>{{ row.order?.orderNo }}</strong>
          <div class="muted-line">{{ row.order?.checkoutGroup?.groupNo || "非跨店订单" }}</div>
        </template>
      </el-table-column>
      <el-table-column label="店铺" min-width="150"><template #default="{ row }">{{ row.merchant?.name || row.order?.merchant?.name || "默认店铺" }}</template></el-table-column>
      <el-table-column label="用户" width="140"><template #default="{ row }">{{ maskedPhone(row.user?.phone) || "-" }}</template></el-table-column>
      <el-table-column label="类型" width="100"><template #default="{ row }">{{ refundTypeText(row.type) }}</template></el-table-column>
      <el-table-column label="金额" width="100"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
      <el-table-column prop="reason" label="原因" min-width="200" show-overflow-tooltip />
      <el-table-column label="凭证" min-width="150">
        <template #default="{ row }">
          <div v-if="row.images?.length" class="review-image-list">
            <el-image v-for="image in row.images" :key="image" class="review-thumb" :src="image" :preview-src-list="row.images" preview-teleported fit="cover" />
          </div>
          <span v-else class="muted-line">无凭证</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="refundStatusType(row.status)">{{ refundText(row.status) }}</el-tag></template></el-table-column>
      <el-table-column label="退款渠道" min-width="220">
        <template #default="{ row }">
          <strong>{{ refundProviderText(row) }}</strong>
          <small>{{ row.providerRefundNo || row.providerRefundFailureReason || row.providerRefundStatus || "-" }}</small>
        </template>
      </el-table-column>
      <el-table-column label="审核" min-width="220"><template #default="{ row }">{{ row.reviewedBy || "-" }} {{ formatTime(row.reviewedAt) }}<div class="muted-line">{{ row.reviewRemark || "-" }}</div></template></el-table-column>
      <el-table-column v-if="canManageRefunds" label="操作" width="430">
        <template #default="{ row }">
          <el-button size="small" type="success" :disabled="!['pending','platform_intervening'].includes(row.status)" @click.stop="approveRefund(row)">通过</el-button>
          <el-button size="small" type="success" plain :disabled="!['returning','awaiting_merchant_receipt'].includes(row.status)" @click.stop="receiveRefundReturn(row)">确认收货</el-button>
          <el-button size="small" type="primary" plain :disabled="row.status !== 'awaiting_exchange_shipment'" @click.stop="shipRefundExchange(row)">寄出换货</el-button>
          <el-button size="small" type="primary" text :disabled="['approved','rejected','cancelled'].includes(row.status)" @click.stop="addRefundMessage(row)">协商</el-button>
          <el-button size="small" type="warning" plain :disabled="!['processing','failed'].includes(row.status)" @click.stop="retryRefund(row)">重试退款</el-button>
          <el-button size="small" type="danger" :disabled="!['pending','platform_intervening'].includes(row.status)" @click.stop="rejectRefund(row)">拒绝</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-divider>支付流水与回调日志</el-divider>
    <div class="refund-toolbar">
      <el-select v-model="paymentFilters.status" clearable placeholder="流水状态" style="width:140px" @change="loadPaymentData">
        <el-option label="成功" value="success" />
        <el-option label="差异" value="discrepancy" />
      </el-select>
      <el-select v-model="callbackFilters.status" clearable placeholder="回调状态" style="width:150px" @change="loadPaymentData">
        <el-option label="成功" value="success" />
        <el-option label="失败" value="failed" />
        <el-option label="幂等" value="idempotent" />
        <el-option label="已接收" value="received" />
      </el-select>
      <el-select v-model="commissionFilters.status" clearable placeholder="佣金状态" style="width:150px" @change="loadPaymentData">
        <el-option label="待结算" value="pending" />
        <el-option label="已作废" value="void" />
        <el-option label="已结算" value="settled" />
      </el-select>
      <el-input v-model="paymentKeyword" clearable placeholder="订单号/交易号/手机号/失败原因" style="width:320px" @keyup.enter="loadPaymentData" @clear="loadPaymentData" />
      <el-button @click="exportPaymentTransactions">导出流水</el-button>
      <el-button @click="exportPaymentCallbackLogs">导出回调</el-button>
      <el-button @click="loadPaymentData">刷新支付日志</el-button>
    </div>
    <el-alert v-if="paymentError" class="page-error" type="error" show-icon :closable="false" title="商城支付与佣金数据加载失败" aria-live="assertive">
      <template #default><p>{{ paymentError }}</p><el-button size="small" @click="loadPaymentData">重新加载支付数据</el-button></template>
    </el-alert>
    <div class="payment-log-grid">
      <el-card shadow="never">
        <template #header>支付流水</template>
        <el-table :data="paymentTransactions" size="small" stripe>
          <el-table-column label="订单/交易号" min-width="210">
            <template #default="{ row }">
              <strong>{{ row.order?.orderNo || "-" }}</strong>
              <small>{{ row.transactionNo }}</small>
              <small>{{ row.order?.checkoutGroup?.groupNo || "非跨店订单" }}</small>
            </template>
          </el-table-column>
          <el-table-column label="渠道" width="90"><template #default="{ row }">{{ paymentText(row.paymentMethod || row.provider) }}</template></el-table-column>
          <el-table-column label="金额" width="100"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.status === 'success' ? 'success' : 'danger'">{{ paymentStatusText(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="说明" min-width="180"><template #default="{ row }">{{ row.remark || row.discrepancyType || "-" }}</template></el-table-column>
          <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
          <el-table-column label="操作" width="90"><template #default="{ row }"><el-button size="small" text type="primary" :disabled="!relatedOrderIdentity(row)" @click.stop="openRelatedOrder(row)">打开订单</el-button></template></el-table-column>
        </el-table>
      </el-card>
      <el-card shadow="never">
        <template #header>支付回调日志</template>
        <el-table :data="paymentCallbackLogs" size="small" stripe>
          <el-table-column label="订单/交易号" min-width="210">
            <template #default="{ row }">
              <strong>{{ row.orderNo || row.order?.orderNo || "-" }}</strong>
              <small>{{ row.transactionNo || "-" }}</small>
              <small>{{ row.order?.checkoutGroup?.groupNo || "非跨店订单" }}</small>
            </template>
          </el-table-column>
          <el-table-column label="渠道" width="90"><template #default="{ row }">{{ paymentText(row.provider) }}</template></el-table-column>
          <el-table-column label="金额" width="100"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          <el-table-column label="签名" width="80"><template #default="{ row }"><el-tag :type="row.signatureValid === false ? 'danger' : 'success'">{{ row.signatureValid === false ? "失败" : "通过" }}</el-tag></template></el-table-column>
          <el-table-column label="结果" width="100"><template #default="{ row }"><el-tag :type="callbackStatusType(row.resultStatus)">{{ callbackStatusText(row.resultStatus) }}</el-tag></template></el-table-column>
          <el-table-column label="原因" min-width="180" show-overflow-tooltip><template #default="{ row }">{{ row.resultMessage || "-" }}</template></el-table-column>
          <el-table-column label="处理时间" width="170"><template #default="{ row }">{{ formatTime(row.processedAt || row.createdAt) }}</template></el-table-column>
          <el-table-column label="操作" width="90"><template #default="{ row }"><el-button size="small" text type="primary" :disabled="!relatedOrderIdentity(row)" @click.stop="openRelatedOrder(row)">打开订单</el-button></template></el-table-column>
        </el-table>
      </el-card>
      <el-card shadow="never">
        <template #header>退款日志</template>
        <el-table :data="refundLogs" size="small" stripe>
          <el-table-column label="售后/订单" min-width="210">
            <template #default="{ row }">
              <strong>{{ row.refund?.refundNo || "-" }}</strong>
              <small>{{ row.order?.orderNo || row.providerRefundNo || "-" }}</small>
              <small>{{ row.order?.checkoutGroup?.groupNo || "非跨店订单" }}</small>
            </template>
          </el-table-column>
          <el-table-column label="渠道" width="90"><template #default="{ row }">{{ refundProviderName(row.provider) }}</template></el-table-column>
          <el-table-column label="金额" width="100"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="refundLogStatusType(row.status)">{{ refundLogStatusText(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="说明" min-width="190" show-overflow-tooltip><template #default="{ row }">{{ row.message || "-" }}</template></el-table-column>
          <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
          <el-table-column label="操作" width="90"><template #default="{ row }"><el-button size="small" text type="primary" :disabled="!relatedOrderIdentity(row)" @click.stop="openRelatedOrder(row)">打开订单</el-button></template></el-table-column>
        </el-table>
      </el-card>
      <el-card shadow="never">
        <template #header>
          <div class="card-header-line">
            <span>推广佣金</span>
            <span>
              <el-button v-if="canManageCommissions" size="small" type="success" plain :disabled="!Number(commissionSummary.pendingCount || 0)" @click.stop="batchSettleCommissions">批量结算待结算</el-button>
              <el-button size="small" @click.stop="exportCommissionPromoters">导出汇总</el-button>
              <el-button size="small" @click.stop="exportCommissions">导出明细</el-button>
            </span>
          </div>
        </template>
        <div class="commission-summary">
          <div v-for="item in commissionSummaryCards" :key="item.label">
            <small>{{ item.label }}</small>
            <strong>{{ item.value }}</strong>
            <span>{{ item.count }}</span>
          </div>
        </div>
        <el-table v-if="commissionPromoterSummary.length" :data="commissionPromoterSummary" size="small" border class="commission-promoter-table">
          <el-table-column label="代理/推广人" min-width="150">
            <template #default="{ row }">
              <strong>{{ row.displayName }}</strong>
              <div class="muted-line">{{ row.type === "agent" ? "代理" : row.type === "promoter" ? "推广用户" : "未绑定" }}</div>
            </template>
          </el-table-column>
          <el-table-column label="订单金额" width="100"><template #default="{ row }">¥{{ money(row.orderAmount) }}</template></el-table-column>
          <el-table-column label="总佣金" width="100"><template #default="{ row }">¥{{ money(row.commissionAmount) }}</template></el-table-column>
          <el-table-column label="待结算" width="120"><template #default="{ row }">¥{{ money(row.pendingAmount) }} / {{ row.pendingCount }} 笔</template></el-table-column>
          <el-table-column label="已结算" width="120"><template #default="{ row }">¥{{ money(row.settledAmount) }} / {{ row.settledCount }} 笔</template></el-table-column>
          <el-table-column label="已作废" width="120"><template #default="{ row }">¥{{ money(row.voidAmount) }} / {{ row.voidCount }} 笔</template></el-table-column>
          <el-table-column v-if="canManageCommissions" label="操作" width="120">
            <template #default="{ row }">
              <el-button size="small" type="success" plain :disabled="!Number(row.pendingCount || 0)" @click="batchSettleCommissions(row)">结算该对象</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-table :data="commissions" size="small" stripe>
          <el-table-column label="订单/推广码" min-width="210">
            <template #default="{ row }">
              <strong>{{ row.order?.orderNo || "-" }}</strong>
              <small>{{ row.code }}</small>
              <small>{{ row.order?.checkoutGroup?.groupNo || "非跨店订单" }}</small>
            </template>
          </el-table-column>
          <el-table-column label="推广人/代理" min-width="140"><template #default="{ row }">{{ row.promoterUser?.phone ? maskedPhone(row.promoterUser.phone) : row.agent?.name || "-" }}</template></el-table-column>
          <el-table-column label="订单金额" width="100"><template #default="{ row }">¥{{ money(row.orderAmount) }}</template></el-table-column>
          <el-table-column label="佣金" width="110"><template #default="{ row }">¥{{ money(row.commissionAmount) }}</template></el-table-column>
          <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="commissionStatusType(row.status)">{{ commissionStatusText(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="结算/说明" min-width="190" show-overflow-tooltip>
            <template #default="{ row }">
              {{ commissionRemark(row) }}
              <div class="muted-line">{{ row.settledAt ? formatTime(row.settledAt) : "" }}</div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160">
            <template #default="{ row }">
              <el-button size="small" text type="primary" :disabled="!relatedOrderIdentity(row)" @click.stop="openRelatedOrder(row)">打开</el-button>
              <el-button v-if="canManageCommissions" size="small" type="success" plain :disabled="row.status !== 'pending'" @click="settleCommission(row)">结算</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <el-drawer v-model="detailVisible" v-loading="detailLoading" title="商城订单详情" size="560px">
      <el-alert v-if="detailError" class="dialog-error" type="error" show-icon :closable="false" title="商城订单详情加载失败" aria-live="assertive">
        <template #default><p>{{ detailError }}</p><el-button size="small" :loading="detailLoading" @click="retryCurrentOrderDetail">重新加载订单详情</el-button></template>
      </el-alert>
      <template v-if="currentOrder">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="订单号">{{ currentOrder.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="状态"><el-tag :type="statusType(currentOrder.status)">{{ statusText(currentOrder.status) }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="用户">{{ maskedPhone(currentOrder.user?.phone) || currentOrder.user?.nickname || "-" }}</el-descriptions-item>
          <el-descriptions-item label="支付方式">{{ paymentText(currentOrder.paymentMethod) }}</el-descriptions-item>
          <el-descriptions-item label="商品金额">¥{{ money(currentOrder.goodsAmount || currentOrder.amount) }}</el-descriptions-item>
          <el-descriptions-item label="优惠金额">¥{{ money(currentOrder.discountAmount) }} {{ currentOrder.couponSnapshot ? `（${currentOrder.couponSnapshot.name || ""} ${currentOrder.couponSnapshot.code || ""}）` : "" }}</el-descriptions-item>
          <el-descriptions-item label="积分抵扣">{{ currentOrder.pointsUsed || 0 }} 分 / ¥{{ money(currentOrder.pointsDiscountAmount) }}</el-descriptions-item>
          <el-descriptions-item label="推广来源">{{ currentOrder.promotionCode || "-" }} {{ currentOrder.promotionSnapshot ? `（${currentOrder.promotionSnapshot.name || ""}）` : "" }}</el-descriptions-item>
          <el-descriptions-item label="实付金额">¥{{ money(currentOrder.amount) }}</el-descriptions-item>
          <el-descriptions-item label="买家备注">{{ currentOrder.buyerRemark || "-" }}</el-descriptions-item>
          <el-descriptions-item label="后台备注">{{ currentOrder.adminRemark || "-" }}</el-descriptions-item>
          <el-descriptions-item label="关闭原因">{{ currentOrder.closeReason || "-" }}</el-descriptions-item>
        </el-descriptions>

        <template v-if="currentOrder.checkoutGroup?.groupNo">
          <h3>跨店拆单</h3>
          <el-alert type="info" :closable="false" class="ship-alert">
            <template #default>结算组 {{ currentOrder.checkoutGroup.groupNo }}，同组子订单按店铺独立支付、发货和售后。客服可在这里切换查看每个店铺子订单。</template>
          </el-alert>
          <el-table v-loading="checkoutGroupLoading" :data="checkoutGroupOrders" size="small" border>
            <el-table-column label="子订单" min-width="170">
              <template #default="{ row }">
                <strong>{{ row.orderNo }}</strong>
                <div class="muted-line">{{ row.merchant?.name || "默认店铺" }}</div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag></template></el-table-column>
            <el-table-column label="金额" width="100"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
            <el-table-column label="处理建议" min-width="150"><template #default="{ row }">{{ orderActionTip(row) }}</template></el-table-column>
            <el-table-column label="操作" width="90">
              <template #default="{ row }">
                <el-button size="small" text type="primary" :disabled="row.id === currentOrder.id" @click="selectCheckoutGroupOrder(row)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-alert v-if="checkoutGroupError" class="dialog-error" type="error" show-icon :closable="false" title="跨店子订单加载失败" aria-live="assertive">
            <template #default><p>{{ checkoutGroupError }}</p><el-button size="small" :loading="checkoutGroupLoading" @click="loadCheckoutGroupOrders(currentOrder)">重新加载跨店子单</el-button></template>
          </el-alert>
        </template>

        <h3>订单进度</h3>
        <div class="timeline">
          <div v-for="step in orderTimeline(currentOrder)" :key="step.label" class="timeline-step" :class="{ active: step.active }">
            <span class="timeline-dot"></span>
            <div>
              <strong>{{ step.label }}</strong>
              <p>{{ step.time || step.tip }}</p>
            </div>
          </div>
        </div>

        <h3>收货地址</h3>
        <div class="address-box">{{ fullAddress(currentOrder) || "-" }}</div>

        <h3>商品明细</h3>
        <el-table :data="currentOrder.items || []" size="small" border>
          <el-table-column prop="productTitle" label="商品" min-width="180" />
          <el-table-column prop="skuName" label="规格" width="120" />
          <el-table-column label="单价" width="90"><template #default="{ row }">¥{{ money(row.price) }}</template></el-table-column>
          <el-table-column prop="quantity" label="数量" width="70" />
          <el-table-column label="小计" width="90"><template #default="{ row }">¥{{ money(row.totalAmount) }}</template></el-table-column>
        </el-table>

        <h3>物流/售后</h3>
        <el-table v-if="currentOrder.shipments?.length" :data="currentOrder.shipments" size="small" border class="shipment-table">
          <el-table-column prop="shipmentNo" label="包裹号" min-width="155" />
          <el-table-column label="物流" min-width="220"><template #default="{ row }"><div>{{ row.expressCompany || "快递" }} {{ row.expressNo }}</div><div v-if="row.trackingEvents?.length" class="muted-line">最新：{{ row.trackingEvents[row.trackingEvents.length - 1].description }}</div></template></el-table-column>
          <el-table-column label="商品" min-width="180"><template #default="{ row }"><div v-for="item in row.items || []" :key="item.id">{{ item.itemSnapshot?.productTitle || `商品明细 ${item.orderItemId}` }} × {{ item.quantity }}</div></template></el-table-column>
          <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.status === 'delivered' ? 'success' : row.status === 'cancelled' ? 'info' : 'warning'">{{ row.status === "delivered" ? "已签收" : row.status === "cancelled" ? "已取消" : "运输中" }}</el-tag></template></el-table-column>
          <el-table-column label="发货时间" width="165"><template #default="{ row }">{{ formatTime(row.shippedAt) }}</template></el-table-column>
          <el-table-column v-if="canManageLogistics" label="操作" width="150"><template #default="{ row }"><el-button link type="primary" :disabled="row.status === 'cancelled'" @click="openEditShipment(row)">改单号</el-button><el-button link type="success" :disabled="row.status !== 'shipped'" @click="syncShipmentTracking(row)">同步轨迹</el-button></template></el-table-column>
        </el-table>
        <el-timeline v-if="currentOrder.events?.length" class="order-event-timeline">
          <el-timeline-item v-for="event in currentOrder.events" :key="event.id" :timestamp="formatTime(event.occurredAt)" placement="top">
            <strong>{{ orderEventText(event.eventType) }}</strong>
            <div class="muted-line">{{ event.remark || `${event.fromStatus || '-'} → ${event.toStatus}` }}<span v-if="event.operator"> · {{ event.operator }}</span></div>
          </el-timeline-item>
        </el-timeline>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="履约进度">{{ currentOrder.shippedQuantity || 0 }} / {{ currentOrder.totalQuantity || orderTotalQuantity(currentOrder) }}，{{ fulfillmentStatusText(currentOrder.fulfillmentStatus) }}</el-descriptions-item>
          <el-descriptions-item v-if="!currentOrder.shipments?.length" label="物流">{{ currentOrder.expressCompany || "" }} {{ currentOrder.expressNo || "-" }}</el-descriptions-item>
          <el-descriptions-item label="售后">共 {{ currentOrder.refunds?.length || 0 }} 笔，{{ refundSummary(currentOrder.refund) }}</el-descriptions-item>
        </el-descriptions>
        <el-table v-if="currentOrder.refunds?.length" :data="currentOrder.refunds" size="small" border class="shipment-table">
          <el-table-column prop="refundNo" label="售后单" min-width="170" />
          <el-table-column label="类型/状态" min-width="150"><template #default="{ row }">{{ refundTypeText(row.type) }} · {{ refundText(row.status) }}</template></el-table-column>
          <el-table-column label="商品" min-width="190"><template #default="{ row }"><div v-for="item in row.items || []" :key="item.id">{{ item.itemSnapshot?.productTitle || "商品" }} × {{ item.requestedQuantity }}</div></template></el-table-column>
          <el-table-column label="协商" min-width="200"><template #default="{ row }"><div v-for="message in row.messages || []" :key="message.id">{{ message.actorName || message.actorType }}：{{ message.content }}</div></template></el-table-column>
        </el-table>

        <div v-if="canManageOrders" class="drawer-actions">
          <el-button type="success" :disabled="currentOrder.status !== 'pending_confirm'" @click="confirmOffline(currentOrder)">确认线下收款</el-button>
          <el-button type="primary" :disabled="currentOrder.status !== 'paid'" @click="openShip(currentOrder)">发货</el-button>
          <el-button type="danger" plain :disabled="!['pending_payment','pending_confirm'].includes(currentOrder.status)" @click="closeOrder(currentOrder)">关闭订单</el-button>
        </div>
      </template>
    </el-drawer>

    <el-dialog v-model="shipDialogVisible" v-loading="shipLoading" :title="shipForm.shipmentId ? '修改包裹物流' : '商城订单分包发货'" width="620px">
      <el-alert v-if="shipError" class="dialog-error" type="error" show-icon :closable="false" title="发货上下文加载失败" aria-live="assertive">
        <template #default><p>{{ shipError }}</p><el-button v-if="shipTargetRow" size="small" :loading="shipLoading" @click="openShip(shipTargetRow)">重新加载发货订单</el-button></template>
      </el-alert>
      <el-alert v-if="shipLogisticsError" class="dialog-error" type="error" show-icon :closable="false" title="发货物流选项加载失败" aria-live="assertive">
        <template #default><p>{{ shipLogisticsError }}</p><el-button v-if="shipOrderTarget" size="small" :loading="shipLogisticsLoading" @click="loadShipLogisticsCompanies(shipOrderTarget)">重新加载物流选项</el-button></template>
      </el-alert>
      <el-alert v-if="shipOrderTarget" type="info" :closable="false" class="ship-alert">
        <template #default>订单 {{ shipOrderTarget.orderNo }}，收货地址：{{ fullAddress(shipOrderTarget) || "-" }}</template>
      </el-alert>
      <el-form label-width="90px">
        <el-form-item label="快递公司">
          <el-select v-model="shipForm.expressCompany" filterable allow-create default-first-option placeholder="选择或输入快递公司" @visible-change="(visible: boolean) => visible && shipOrderTarget && loadShipLogisticsCompanies(shipOrderTarget)">
            <el-option v-for="item in enabledShipLogisticsCompanies" :key="item.id" :label="item.name" :value="item.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="快递单号" required><el-input v-model="shipForm.expressNo" /></el-form-item>
        <el-form-item v-if="shipForm.shipmentId" label="修改原因" required><el-input v-model="shipForm.reason" placeholder="请说明改单号原因，系统将写入审计历史" /></el-form-item>
        <el-form-item v-else label="备注"><el-input v-model="shipForm.remark" /></el-form-item>
        <el-form-item v-if="!shipForm.shipmentId" label="包裹商品">
          <el-table :data="shipForm.items" size="small" border>
            <el-table-column prop="productTitle" label="商品" min-width="180" />
            <el-table-column prop="skuName" label="规格" width="110" />
            <el-table-column label="已发/总数" width="100"><template #default="{ row }">{{ row.shippedQuantity }} / {{ row.totalQuantity }}</template></el-table-column>
            <el-table-column label="本次发货" width="120"><template #default="{ row }"><el-input-number v-model="row.quantity" :min="0" :max="row.remainingQuantity" :precision="0" controls-position="right" /></template></el-table-column>
          </el-table>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipDialogVisible = false">取消</el-button>
        <el-button type="primary" :disabled="shipLoading || shipLogisticsLoading || !shipOrderTarget || !!shipError || !!shipLogisticsError" @click="shipOrder">{{ shipForm.shipmentId ? "保存修改" : "创建包裹" }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="logisticsDialogVisible" title="商城物流设置" width="920px">
      <el-alert v-if="logisticsError" class="dialog-error" type="error" show-icon :closable="false" title="商城物流设置加载失败" aria-live="assertive">
        <template #default><p>{{ logisticsError }}</p><el-button size="small" :loading="logisticsLoading" @click="loadLogisticsCompanies">重新加载物流设置</el-button></template>
      </el-alert>
      <div class="logistics-form">
        <el-input v-model="logisticsForm.name" placeholder="物流公司，如顺丰速运" />
        <el-input v-model="logisticsForm.code" placeholder="编码，可选，如 SF" />
        <el-input v-model="logisticsForm.servicePhone" placeholder="客服电话，可选" />
        <el-input v-model="logisticsForm.trackingUrl" placeholder="查询网址，可选" />
        <el-input-number v-model="logisticsForm.sortOrder" :precision="0" placeholder="排序" />
        <el-switch v-model="logisticsForm.enabled" active-text="启用" />
        <el-button type="primary" :loading="logisticsSaving" :disabled="logisticsLoading || !!logisticsError || (selectedMerchant && !selectedMerchantOpen)" @click="saveLogisticsCompany">{{ logisticsForm.id ? "保存" : "新增" }}</el-button>
        <el-button v-if="logisticsForm.id" @click="resetLogisticsForm">取消编辑</el-button>
      </div>
      <el-table v-loading="logisticsLoading" :data="logisticsCompanies" size="small" border>
        <el-table-column label="公司" min-width="150"><template #default="{ row }"><strong>{{ row.name }}</strong><div class="muted-line">{{ row.code || "-" }}</div></template></el-table-column>
        <el-table-column prop="servicePhone" label="客服电话" width="130" />
        <el-table-column prop="trackingUrl" label="查询网址" min-width="240" show-overflow-tooltip />
        <el-table-column prop="sortOrder" label="排序" width="80" />
        <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "启用" : "停用" }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :disabled="selectedMerchant && !selectedMerchantOpen" @click="editLogisticsCompany(row)">编辑</el-button>
            <el-button size="small" :type="row.enabled ? 'warning' : 'success'" plain :disabled="selectedMerchant && !selectedMerchantOpen" @click="toggleLogisticsCompany(row)">{{ row.enabled ? "停用" : "启用" }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="couponDialogVisible" title="商城优惠券管理" width="1080px">
      <el-alert v-if="couponOptionsError" class="dialog-error" type="error" show-icon :closable="false" title="优惠券适用范围加载失败" aria-live="assertive">
        <template #default><p>{{ couponOptionsError }}</p><el-button size="small" @click="loadCouponOptions">重新加载适用范围</el-button></template>
      </el-alert>
      <el-alert v-if="couponError" class="dialog-error" type="error" show-icon :closable="false" title="优惠券列表加载失败" aria-live="assertive">
        <template #default><p>{{ couponError }}</p><el-button size="small" :loading="couponLoading" @click="loadCoupons">重新加载优惠券</el-button></template>
      </el-alert>
      <el-alert v-if="couponUsageError" class="dialog-error" type="error" show-icon :closable="false" title="优惠券使用记录加载失败" aria-live="assertive">
        <template #default><p>{{ couponUsageError }}</p><el-button size="small" :loading="couponUsageLoading" @click="loadCouponUsages">重新加载使用记录</el-button></template>
      </el-alert>
      <el-alert type="info" :closable="false" class="ship-alert">
        <template #default>支持全场券、指定分类券、指定商品券、总限量和每人限用。下单会生成使用记录，未支付/未确认订单关闭后自动释放，方便运营对账。</template>
      </el-alert>
      <div class="promotion-toolbar">
        <el-input v-model="couponFilters.keyword" clearable placeholder="券码/名称" style="width:240px" @keyup.enter="loadCoupons" @clear="loadCoupons" />
        <el-select v-model="couponFilters.status" clearable placeholder="全部状态" style="width:140px" @change="loadCoupons">
          <el-option label="可用" value="active" />
          <el-option label="未开始" value="not_started" />
          <el-option label="已过期" value="expired" />
          <el-option label="已用完" value="exhausted" />
          <el-option label="已停用" value="disabled" />
        </el-select>
        <el-button :loading="couponLoading" @click="loadCoupons">刷新</el-button>
      </div>
      <div class="coupon-form">
        <el-select v-model="couponForm.issuerScope" placeholder="发行方" @change="handleCouponIssuerChange">
          <el-option label="平台券" value="platform" />
          <el-option label="店铺券" value="merchant" />
        </el-select>
        <el-input v-model="couponForm.code" placeholder="券码，如 STUDY8" />
        <el-input v-model="couponForm.name" placeholder="名称，如 学习用品满减券" />
        <el-input-number v-model="couponForm.minAmount" :min="0" :precision="2" placeholder="门槛" />
        <el-input-number v-model="couponForm.discountAmount" :min="0" :precision="2" placeholder="优惠" />
        <el-select v-model="couponForm.scope" placeholder="适用范围">
          <el-option label="全场通用" value="all" />
          <el-option label="指定分类" value="category" />
          <el-option label="指定商品" value="product" />
        </el-select>
        <el-select v-if="couponForm.scope === 'category'" v-model="couponForm.scopeCategoryId" filterable placeholder="选择分类">
          <el-option v-for="category in couponCategoryOptions" :key="category.id" :label="category.name" :value="category.id" />
        </el-select>
        <el-select v-if="couponForm.scope === 'product'" v-model="couponForm.scopeProductId" filterable placeholder="选择商品">
          <el-option v-for="product in couponProductOptions" :key="product.id" :label="product.title" :value="product.id" />
        </el-select>
        <el-input-number v-model="couponForm.issuanceLimit" :min="0" :precision="0" placeholder="发放总量" />
        <el-input-number v-model="couponForm.usageLimit" :min="0" :precision="0" placeholder="核销总量" />
        <el-input-number v-model="couponForm.perUserLimit" :min="0" :precision="0" placeholder="每人限用" />
        <el-date-picker v-model="couponForm.startsAt" type="datetime" placeholder="开始时间" value-format="YYYY-MM-DD HH:mm:ss" />
        <el-date-picker v-model="couponForm.endsAt" type="datetime" placeholder="结束时间" value-format="YYYY-MM-DD HH:mm:ss" />
        <el-select v-model="couponForm.refundReleasePolicy" placeholder="退款返券">
          <el-option label="全额退款后返还" value="full_refund" />
          <el-option label="退款后不返还" value="never" />
        </el-select>
        <el-switch v-model="couponForm.enabled" active-text="启用" inactive-text="停用" />
        <el-button type="primary" :loading="couponSaving" :disabled="!!couponOptionsError || !!couponError || (selectedMerchant && !selectedMerchantOpen)" @click="saveCoupon">{{ couponForm.id ? "保存" : "新增" }}</el-button>
        <el-button v-if="couponForm.id" @click="resetCouponForm">取消编辑</el-button>
      </div>
      <el-table v-loading="couponLoading" :data="coupons" size="small" border>
        <el-table-column label="优惠券" min-width="180">
          <template #default="{ row }">
            <strong>{{ row.code }}</strong>
            <div class="muted-line">{{ row.name }}</div>
          </template>
        </el-table-column>
        <el-table-column label="规则" min-width="170">
          <template #default="{ row }">满 ¥{{ money(row.minAmount) }} 减 ¥{{ money(row.discountAmount) }}</template>
        </el-table-column>
        <el-table-column label="发行/退款" min-width="150">
          <template #default="{ row }">
            {{ couponIssuerText(row) }}
            <div class="muted-line">{{ couponRefundPolicyText(row.refundReleasePolicy) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="适用范围" min-width="170"><template #default="{ row }">{{ couponScopeText(row) }}</template></el-table-column>
        <el-table-column label="领取/使用" width="170">
          <template #default="{ row }">
            领 {{ row.claimedCount || 0 }} / {{ row.issuanceLimit || "不限" }}
            <div class="muted-line">用 {{ row.usedCount || 0 }} / {{ row.usageLimit || "不限" }}</div>
            <div class="muted-line">每人 {{ row.perUserLimit || "不限" }}</div>
          </template>
        </el-table-column>
        <el-table-column label="有效期" min-width="210"><template #default="{ row }">{{ formatTime(row.startsAt) }} 至 {{ formatTime(row.endsAt) }}</template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="couponStatusType(row.runtimeStatus)">{{ couponStatusText(row.runtimeStatus) }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :disabled="selectedMerchant && !selectedMerchantOpen" @click="editCoupon(row)">编辑</el-button>
            <el-button size="small" :type="row.enabled ? 'warning' : 'success'" plain :disabled="selectedMerchant && !selectedMerchantOpen" @click="toggleCoupon(row)">{{ row.enabled ? "停用" : "启用" }}</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-divider>优惠券使用记录</el-divider>
      <div class="promotion-toolbar">
        <el-input v-model="couponUsageFilters.keyword" clearable placeholder="券码/订单号/手机号" style="width:260px" @keyup.enter="loadCouponUsages" @clear="loadCouponUsages" />
        <el-select v-model="couponUsageFilters.status" clearable placeholder="全部记录" style="width:140px" @change="loadCouponUsages">
          <el-option label="已使用" value="used" />
          <el-option label="已释放" value="released" />
        </el-select>
        <el-button :loading="couponUsageLoading" @click="loadCouponUsages">刷新记录</el-button>
      </div>
      <el-table v-loading="couponUsageLoading" :data="couponUsages" size="small" border>
        <el-table-column label="券码/名称" min-width="170">
          <template #default="{ row }">
            <strong>{{ row.code }}</strong>
            <div class="muted-line">{{ row.coupon?.name || "-" }}</div>
          </template>
        </el-table-column>
        <el-table-column label="订单" min-width="180"><template #default="{ row }">{{ row.order?.orderNo || "-" }}</template></el-table-column>
        <el-table-column label="用户" width="140"><template #default="{ row }">{{ maskedPhone(row.user?.phone) || row.user?.nickname || "-" }}</template></el-table-column>
        <el-table-column label="优惠" width="100"><template #default="{ row }">¥{{ money(row.discountAmount) }}</template></el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><el-tag :type="row.status === 'used' ? 'success' : 'info'">{{ couponUsageStatusText(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="释放原因" min-width="180" show-overflow-tooltip><template #default="{ row }">{{ row.releaseReason || "-" }}</template></el-table-column>
        <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="flashSaleDialogVisible" title="商城秒杀管理" width="1080px">
      <el-alert v-if="couponOptionsError" class="dialog-error" type="error" show-icon :closable="false" title="秒杀商品选项加载失败" aria-live="assertive">
        <template #default><p>{{ couponOptionsError }}</p><el-button size="small" @click="loadCouponOptions">重新加载商品选项</el-button></template>
      </el-alert>
      <el-alert v-if="flashSaleError" class="dialog-error" type="error" show-icon :closable="false" title="秒杀活动加载失败" aria-live="assertive">
        <template #default><p>{{ flashSaleError }}</p><el-button size="small" :loading="flashSaleLoading" @click="loadFlashSales">重新加载秒杀活动</el-button></template>
      </el-alert>
      <el-alert type="warning" :closable="false" class="ship-alert">
        <template #default>秒杀会单独锁定活动库存，并按秒杀价成交。订单关闭会释放锁定库存，支付成功扣减已售库存，退款会回补已售库存。</template>
      </el-alert>
      <div class="promotion-toolbar">
        <el-input v-model="flashSaleFilters.keyword" clearable placeholder="活动标题/商品" style="width:260px" @keyup.enter="loadFlashSales" @clear="loadFlashSales" />
        <el-select v-model="flashSaleFilters.status" clearable placeholder="全部状态" style="width:130px" @change="loadFlashSales">
          <el-option label="启用" value="active" />
          <el-option label="草稿" value="draft" />
          <el-option label="停用" value="disabled" />
        </el-select>
        <el-button :loading="flashSaleLoading" @click="loadFlashSales">刷新</el-button>
      </div>
      <div class="flash-sale-form">
        <el-input v-model="flashSaleForm.title" placeholder="秒杀标题" />
        <el-select v-model="flashSaleForm.productId" filterable placeholder="选择商品" @change="flashSaleForm.skuId = null">
          <el-option v-for="product in couponProducts" :key="product.id" :label="product.title" :value="product.id" />
        </el-select>
        <el-select v-model="flashSaleForm.skuId" filterable placeholder="选择规格">
          <el-option v-for="sku in selectedFlashSaleSkus" :key="sku.id" :label="`${sku.name} / ¥${money(sku.price)} / 库存 ${sku.stock}`" :value="sku.id" />
        </el-select>
        <el-input-number v-model="flashSaleForm.salePrice" :min="0" :precision="2" placeholder="秒杀价" />
        <el-input-number v-model="flashSaleForm.saleStock" :min="1" :precision="0" placeholder="活动库存" />
        <el-input-number v-model="flashSaleForm.perUserLimit" :min="0" :precision="0" placeholder="每人限购" />
        <el-date-picker v-model="flashSaleForm.startsAt" type="datetime" placeholder="开始时间" value-format="YYYY-MM-DD HH:mm:ss" />
        <el-date-picker v-model="flashSaleForm.endsAt" type="datetime" placeholder="结束时间" value-format="YYYY-MM-DD HH:mm:ss" />
        <el-select v-model="flashSaleForm.status" placeholder="状态">
          <el-option label="启用" value="active" />
          <el-option label="草稿" value="draft" />
          <el-option label="停用" value="disabled" />
        </el-select>
        <el-input-number v-model="flashSaleForm.sortOrder" :precision="0" placeholder="排序" />
        <el-button type="primary" :loading="flashSaleSaving" :disabled="!!couponOptionsError || !!flashSaleError || (selectedMerchant && !selectedMerchantOpen)" @click="saveFlashSale">{{ flashSaleForm.id ? "保存" : "新增" }}</el-button>
        <el-button v-if="flashSaleForm.id" @click="resetFlashSaleForm">取消编辑</el-button>
      </div>
      <el-table v-loading="flashSaleLoading" :data="flashSales" size="small" border>
        <el-table-column label="活动" min-width="190">
          <template #default="{ row }">
            <strong>{{ row.title }}</strong>
            <div class="muted-line">{{ row.product?.title || "-" }} / {{ row.sku?.name || "-" }}</div>
          </template>
        </el-table-column>
        <el-table-column label="价格" width="130">
          <template #default="{ row }">
            <strong>¥{{ money(row.salePrice) }}</strong>
            <div class="muted-line">原 ¥{{ money(row.originalPrice) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="库存" width="160">
          <template #default="{ row }">
            可售 {{ row.availableStock || 0 }} / 总 {{ row.saleStock || 0 }}
            <div class="muted-line">锁 {{ row.lockedStock || 0 }} / 售 {{ row.soldStock || 0 }}</div>
          </template>
        </el-table-column>
        <el-table-column label="限购" width="90"><template #default="{ row }">{{ row.perUserLimit || "不限" }}</template></el-table-column>
        <el-table-column label="时间" min-width="210"><template #default="{ row }">{{ formatTime(row.startsAt) }} 至 {{ formatTime(row.endsAt) }}</template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="flashSaleStatusType(row.runtimeStatus)">{{ flashSaleStatusText(row.runtimeStatus) }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :disabled="selectedMerchant && !selectedMerchantOpen" @click="editFlashSale(row)">编辑</el-button>
            <el-button size="small" :type="row.status === 'active' ? 'warning' : 'success'" plain :disabled="selectedMerchant && !selectedMerchantOpen" @click="toggleFlashSale(row)">{{ row.status === "active" ? "停用" : "启用" }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="groupBuyDialogVisible" title="商城拼团管理" width="1080px">
      <el-alert v-if="couponOptionsError" class="dialog-error" type="error" show-icon :closable="false" title="拼团商品选项加载失败" aria-live="assertive">
        <template #default><p>{{ couponOptionsError }}</p><el-button size="small" @click="loadCouponOptions">重新加载商品选项</el-button></template>
      </el-alert>
      <el-alert v-if="groupBuyError" class="dialog-error" type="error" show-icon :closable="false" title="拼团活动加载失败" aria-live="assertive">
        <template #default><p>{{ groupBuyError }}</p><el-button size="small" :loading="groupBuyLoading" @click="loadGroupBuys">重新加载拼团活动</el-button></template>
      </el-alert>
      <el-alert type="warning" :closable="false" class="ship-alert">
        <template #default>当前为拼团第一版：按拼团价成交并锁定活动库存，先覆盖运营价、活动库存、限购和订单履约；多人组队失败自动退款后续独立增强。</template>
      </el-alert>
      <div class="promotion-toolbar">
        <el-input v-model="groupBuyFilters.keyword" clearable placeholder="活动标题/商品" style="width:260px" @keyup.enter="loadGroupBuys" @clear="loadGroupBuys" />
        <el-select v-model="groupBuyFilters.status" clearable placeholder="全部状态" style="width:130px" @change="loadGroupBuys">
          <el-option label="启用" value="active" />
          <el-option label="草稿" value="draft" />
          <el-option label="停用" value="disabled" />
        </el-select>
        <el-button :loading="groupBuyLoading" @click="loadGroupBuys">刷新</el-button>
      </div>
      <div class="flash-sale-form">
        <el-input v-model="groupBuyForm.title" placeholder="拼团标题" />
        <el-select v-model="groupBuyForm.productId" filterable placeholder="选择商品" @change="groupBuyForm.skuId = null">
          <el-option v-for="product in couponProducts" :key="product.id" :label="product.title" :value="product.id" />
        </el-select>
        <el-select v-model="groupBuyForm.skuId" filterable placeholder="选择规格">
          <el-option v-for="sku in selectedGroupBuySkus" :key="sku.id" :label="`${sku.name} / ¥${money(sku.price)} / 库存 ${sku.stock}`" :value="sku.id" />
        </el-select>
        <el-input-number v-model="groupBuyForm.groupPrice" :min="0" :precision="2" placeholder="拼团价" />
        <el-input-number v-model="groupBuyForm.minPeople" :min="2" :precision="0" placeholder="成团人数" />
        <el-input-number v-model="groupBuyForm.groupStock" :min="1" :precision="0" placeholder="活动库存" />
        <el-input-number v-model="groupBuyForm.perUserLimit" :min="0" :precision="0" placeholder="每人限购" />
        <el-date-picker v-model="groupBuyForm.startsAt" type="datetime" placeholder="开始时间" value-format="YYYY-MM-DD HH:mm:ss" />
        <el-date-picker v-model="groupBuyForm.endsAt" type="datetime" placeholder="结束时间" value-format="YYYY-MM-DD HH:mm:ss" />
        <el-select v-model="groupBuyForm.status" placeholder="状态">
          <el-option label="启用" value="active" />
          <el-option label="草稿" value="draft" />
          <el-option label="停用" value="disabled" />
        </el-select>
        <el-input-number v-model="groupBuyForm.sortOrder" :precision="0" placeholder="排序" />
        <el-button type="primary" :loading="groupBuySaving" :disabled="!!couponOptionsError || !!groupBuyError || (selectedMerchant && !selectedMerchantOpen)" @click="saveGroupBuy">{{ groupBuyForm.id ? "保存" : "新增" }}</el-button>
        <el-button v-if="groupBuyForm.id" @click="resetGroupBuyForm">取消编辑</el-button>
      </div>
      <el-table v-loading="groupBuyLoading" :data="groupBuys" size="small" border>
        <el-table-column label="活动" min-width="190">
          <template #default="{ row }">
            <strong>{{ row.title }}</strong>
            <div class="muted-line">{{ row.product?.title || "-" }} / {{ row.sku?.name || "-" }}</div>
          </template>
        </el-table-column>
        <el-table-column label="团价" width="130">
          <template #default="{ row }">
            <strong>¥{{ money(row.groupPrice) }}</strong>
            <div class="muted-line">{{ row.minPeople || 2 }} 人团 / 原 ¥{{ money(row.originalPrice) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="库存" width="160">
          <template #default="{ row }">
            可售 {{ row.availableStock || 0 }} / 总 {{ row.groupStock || 0 }}
            <div class="muted-line">锁 {{ row.lockedStock || 0 }} / 售 {{ row.soldStock || 0 }}</div>
          </template>
        </el-table-column>
        <el-table-column label="限购" width="90"><template #default="{ row }">{{ row.perUserLimit || "不限" }}</template></el-table-column>
        <el-table-column label="时间" min-width="210"><template #default="{ row }">{{ formatTime(row.startsAt) }} 至 {{ formatTime(row.endsAt) }}</template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="flashSaleStatusType(row.runtimeStatus)">{{ flashSaleStatusText(row.runtimeStatus) }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :disabled="selectedMerchant && !selectedMerchantOpen" @click="editGroupBuy(row)">编辑</el-button>
            <el-button size="small" :type="row.status === 'active' ? 'warning' : 'success'" plain :disabled="selectedMerchant && !selectedMerchantOpen" @click="toggleGroupBuy(row)">{{ row.status === "active" ? "停用" : "启用" }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="groupBuyRecordDialogVisible" title="拼团参团记录" width="1080px">
      <el-alert v-if="groupBuyRecordError" class="dialog-error" type="error" show-icon :closable="false" title="参团记录加载失败" aria-live="assertive">
        <template #default><p>{{ groupBuyRecordError }}</p><el-button size="small" :loading="groupBuyRecordLoading" @click="loadGroupBuyRecords">重新加载参团记录</el-button></template>
      </el-alert>
      <el-alert type="info" :closable="false" class="ship-alert">
        <template #default>这里展示用户通过拼团入口产生的订单记录，便于运营核对活动、用户、订单、成交金额和后续退款状态。</template>
      </el-alert>
      <div class="promotion-toolbar">
        <el-input v-model="groupBuyRecordFilters.keyword" clearable placeholder="活动/订单号/手机号/商品" style="width:280px" @keyup.enter="loadGroupBuyRecords" @clear="loadGroupBuyRecords" />
        <el-select v-model="groupBuyRecordFilters.status" clearable placeholder="全部状态" style="width:130px" @change="loadGroupBuyRecords">
          <el-option label="待支付" value="pending" />
          <el-option label="已支付" value="paid" />
          <el-option label="已关闭" value="closed" />
          <el-option label="已退款" value="refunded" />
        </el-select>
        <el-button :loading="groupBuyRecordLoading" @click="loadGroupBuyRecords">刷新</el-button>
      </div>
      <el-table v-loading="groupBuyRecordLoading" :data="groupBuyRecords" size="small" border>
        <el-table-column label="拼团活动" min-width="190">
          <template #default="{ row }">
            <strong>{{ row.title }}</strong>
            <div class="muted-line">{{ row.teamNo || "-" }}</div>
            <div class="muted-line">{{ formatTime(row.createdAt) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="用户/订单" min-width="190">
          <template #default="{ row }">
            <strong>{{ row.user?.nickname || maskedPhone(row.user?.phone) || "-" }}</strong>
            <div class="muted-line">{{ maskedPhone(row.user?.phone) || "-" }} / {{ row.order?.orderNo || "-" }}</div>
          </template>
        </el-table-column>
        <el-table-column label="商品" min-width="190">
          <template #default="{ row }">
            {{ row.product?.title || "-" }}
            <div class="muted-line">{{ row.sku?.name || "-" }}</div>
          </template>
        </el-table-column>
        <el-table-column label="数量" width="80"><template #default="{ row }">{{ row.quantity }}</template></el-table-column>
        <el-table-column label="成团进度" width="120">
          <template #default="{ row }">
            {{ row.paidPeople || 0 }} / {{ row.minPeople || 2 }}
            <div class="muted-line"><el-tag size="small" :type="groupBuyTeamStatusType(row.teamStatus)">{{ groupBuyTeamStatusText(row.teamStatus) }}</el-tag></div>
          </template>
        </el-table-column>
        <el-table-column label="金额" width="120">
          <template #default="{ row }">
            ¥{{ money(row.amount) }}
            <div class="muted-line">团价 ¥{{ money(row.groupPrice) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><el-tag :type="groupBuyRecordStatusType(row.status)">{{ groupBuyRecordStatusText(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="支付/退款时间" min-width="170">
          <template #default="{ row }">
            <div>{{ row.paidAt ? `付 ${formatTime(row.paidAt)}` : "-" }}</div>
            <div v-if="row.refundedAt" class="muted-line">退 {{ formatTime(row.refundedAt) }}</div>
            <div v-else-if="row.closedAt" class="muted-line">关 {{ formatTime(row.closedAt) }}</div>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="promotionDialogVisible" title="商城推广码管理" width="980px">
      <el-alert v-if="agentError" class="dialog-error" type="error" show-icon :closable="false" title="推广代理选项加载失败" aria-live="assertive">
        <template #default><p>{{ agentError }}</p><el-button size="small" @click="loadAgents">重新加载代理选项</el-button></template>
      </el-alert>
      <el-alert v-if="promotionError" class="dialog-error" type="error" show-icon :closable="false" title="推广码加载失败" aria-live="assertive">
        <template #default><p>{{ promotionError }}</p><el-button size="small" :loading="promotionLoading" @click="loadPromotionCodes">重新加载推广码</el-button></template>
      </el-alert>
      <el-alert type="info" :closable="false" class="ship-alert">
        <template #default>用于商品推广、代理归因和佣金计算。用户下单填写推广码后，支付成功会生成待结算佣金；订单退款后佣金会自动作废。</template>
      </el-alert>
      <div class="promotion-toolbar">
        <el-input v-model="promotionFilters.keyword" clearable placeholder="推广码/名称/手机号/代理" style="width:260px" @keyup.enter="loadPromotionCodes" @clear="loadPromotionCodes" />
        <el-select v-model="promotionFilters.enabled" clearable placeholder="全部状态" style="width:130px" @change="loadPromotionCodes">
          <el-option label="启用" value="true" />
          <el-option label="停用" value="false" />
        </el-select>
        <el-button :loading="promotionLoading" @click="loadPromotionCodes">刷新</el-button>
      </div>
      <div class="promotion-form">
        <el-input v-model="promotionForm.code" placeholder="推广码，如 SHOWMALL5" />
        <el-input v-model="promotionForm.name" placeholder="名称，如 演示推广码 5%" />
        <el-input-number v-model="promotionForm.commissionRatePercent" :min="0" :max="100" :precision="2" placeholder="佣金%" />
        <el-select v-model="promotionForm.agentId" clearable filterable placeholder="绑定代理（可选）">
          <el-option v-for="agent in agents" :key="agent.id" :label="agentLabel(agent)" :value="agent.id" />
        </el-select>
        <el-input-number v-model="promotionForm.promoterUserId" :min="1" :precision="0" placeholder="推广用户ID（可选）" />
        <el-date-picker v-model="promotionForm.startsAt" type="datetime" placeholder="开始时间（可选）" value-format="YYYY-MM-DD HH:mm:ss" />
        <el-date-picker v-model="promotionForm.endsAt" type="datetime" placeholder="结束时间（可选）" value-format="YYYY-MM-DD HH:mm:ss" />
        <el-switch v-model="promotionForm.enabled" active-text="启用" inactive-text="停用" />
        <el-input v-model="promotionForm.remark" placeholder="运营备注，可选" />
        <el-button type="primary" :loading="promotionSaving" :disabled="!!agentError || !!promotionError || (selectedMerchant && !selectedMerchantOpen)" @click="savePromotionCode">{{ promotionForm.id ? "保存" : "新增" }}</el-button>
        <el-button v-if="promotionForm.id" @click="resetPromotionForm">取消编辑</el-button>
      </div>
      <el-table v-loading="promotionLoading" :data="promotionCodes" size="small" border>
        <el-table-column label="推广码" width="150">
          <template #default="{ row }">
            <strong>{{ row.code }}</strong>
            <div class="muted-line">{{ row.name }}</div>
          </template>
        </el-table-column>
        <el-table-column label="归属" min-width="170">
          <template #default="{ row }">
            <span>{{ row.agent?.name || (row.promoterUser?.phone ? maskedPhone(row.promoterUser.phone) : "未绑定") }}</span>
            <div class="muted-line">{{ row.agent?.region || row.promoterUser?.nickname || "-" }}</div>
          </template>
        </el-table-column>
        <el-table-column label="佣金比例" width="110"><template #default="{ row }">{{ percent(row.commissionRate) }}%</template></el-table-column>
        <el-table-column label="推广订单" width="110"><template #default="{ row }">{{ row.orderCount || 0 }} 单</template></el-table-column>
        <el-table-column label="推广金额" width="120"><template #default="{ row }">¥{{ money(row.orderAmount) }}</template></el-table-column>
        <el-table-column label="有效期" min-width="210"><template #default="{ row }">{{ promotionValidityText(row) }}</template></el-table-column>
        <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "启用" : "停用" }}</el-tag></template></el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :disabled="selectedMerchant && !selectedMerchantOpen" @click="editPromotionCode(row)">编辑</el-button>
            <el-button size="small" :type="row.enabled ? 'warning' : 'success'" plain :disabled="selectedMerchant && !selectedMerchantOpen" @click="togglePromotionCode(row)">{{ row.enabled ? "停用" : "启用" }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { api, downloadFile } from "../api";
import { copyToClipboard, h5RoutePreviewUrl } from "../h5-preview";
import { currentTenantId, hasPermission, isPlatformAdmin } from "../permissions";

const tenants = ref<any[]>([]);
const route = useRoute();
const router = useRouter();
const orders = ref<any[]>([]);
const refunds = ref<any[]>([]);
const paymentTransactions = ref<any[]>([]);
const paymentCallbackLogs = ref<any[]>([]);
const refundLogs = ref<any[]>([]);
const commissions = ref<any[]>([]);
const commissionPromoterSummary = ref<any[]>([]);
const mallSettlements = ref<any[]>([]);
const settlementPending = ref<any[]>([]);
const canManageOrders = computed(() => hasPermission("mall.order.manage"));
const canManageRefunds = computed(() => hasPermission("mall.refund.manage"));
const canManageProducts = computed(() => hasPermission("mall.product.manage"));
const canManageLogistics = computed(() => hasPermission("mall.logistics.manage"));
const canManagePayments = computed(() => hasPermission("mall.payment.manage"));
const canViewStatistics = computed(() => hasPermission("mall.statistics.view"));
const canManageCommissions = computed(() => hasPermission("mall.settlement.manage"));
const canManageMallSettlements = computed(() => !currentTenantId() && hasPermission("mall.settlement.manage"));
const coupons = ref<any[]>([]);
const couponUsages = ref<any[]>([]);
const couponCategories = ref<any[]>([]);
const couponProducts = ref<any[]>([]);
const platformCouponCategories = ref<any[]>([]);
const platformCouponProducts = ref<any[]>([]);
const flashSales = ref<any[]>([]);
const groupBuys = ref<any[]>([]);
const groupBuyRecords = ref<any[]>([]);
const promotionCodes = ref<any[]>([]);
const agents = ref<any[]>([]);
const merchants = ref<any[]>([]);
const orderSummary = ref<any>({});
const commissionSummary = ref<any>({});
const mallAnalytics = ref<any>({});
const paymentReadiness = ref<any>(null);
const scopeError = ref("");
const orderError = ref("");
const analyticsError = ref("");
const refundError = ref("");
const paymentError = ref("");
const settlementError = ref("");
const checkoutGroupTraceError = ref("");
const detailError = ref("");
const checkoutGroupError = ref("");
const shipError = ref("");
const shipLogisticsError = ref("");
const logisticsError = ref("");
const couponOptionsError = ref("");
const couponError = ref("");
const couponUsageError = ref("");
const flashSaleError = ref("");
const groupBuyError = ref("");
const groupBuyRecordError = ref("");
const agentError = ref("");
const promotionError = ref("");
const loading = ref(false);
const analyticsLoading = ref(false);
const logisticsLoading = ref(false);
const logisticsSaving = ref(false);
const couponLoading = ref(false);
const couponUsageLoading = ref(false);
const couponSaving = ref(false);
const flashSaleLoading = ref(false);
const flashSaleSaving = ref(false);
const groupBuyLoading = ref(false);
const groupBuySaving = ref(false);
const groupBuyRecordLoading = ref(false);
const promotionLoading = ref(false);
const settlementLoading = ref(false);
const promotionSaving = ref(false);
const closingExpired = ref(false);
const failingGroupBuys = ref(false);
const completingShipped = ref(false);
const detailVisible = ref(false);
const shipDialogVisible = ref(false);
const logisticsDialogVisible = ref(false);
const couponDialogVisible = ref(false);
const flashSaleDialogVisible = ref(false);
const groupBuyDialogVisible = ref(false);
const groupBuyRecordDialogVisible = ref(false);
const promotionDialogVisible = ref(false);
const currentOrder = ref<any>(null);
const checkoutGroupOrders = ref<any[]>([]);
const checkoutGroupLoading = ref(false);
const checkoutGroupTraceLoading = ref(false);
const detailLoading = ref(false);
const shipLoading = ref(false);
const shipLogisticsLoading = ref(false);
const checkoutGroupTrace = ref<any>({
  orders: [],
  summary: {},
  refunds: [],
  paymentTransactions: [],
  paymentCallbackLogs: [],
  refundLogs: [],
  commissions: [],
  commissionSummary: {}
});
const logisticsCompanies = ref<any[]>([]);
const shipLogisticsCompanies = ref<any[]>([]);
const detailTargetRow = ref<any>(null);
const shipTargetRow = ref<any>(null);
const shipOrderTarget = ref<any>(null);
const deepLinkWarning = ref("");
let scopeLoadSequence = 0;
let orderLoadSequence = 0;
let analyticsLoadSequence = 0;
let refundLoadSequence = 0;
let paymentLoadSequence = 0;
let settlementLoadSequence = 0;
let checkoutGroupTraceLoadSequence = 0;
let detailLoadSequence = 0;
let checkoutGroupLoadSequence = 0;
let shipLoadSequence = 0;
let shipLogisticsLoadSequence = 0;
let logisticsLoadSequence = 0;
let couponOptionsLoadSequence = 0;
let couponLoadSequence = 0;
let couponUsageLoadSequence = 0;
let flashSaleLoadSequence = 0;
let groupBuyLoadSequence = 0;
let groupBuyRecordLoadSequence = 0;
let agentLoadSequence = 0;
let promotionLoadSequence = 0;
const routeTenantId = () => {
  const id = typeof route.query.tenantId === "string" ? Number(route.query.tenantId) : 0;
  return isPlatformAdmin() && id ? id : undefined;
};
const routeMerchantId = () => {
  const id = typeof route.query.merchantId === "string" ? Number(route.query.merchantId) : 0;
  return id || undefined;
};
const routeKeyword = () => typeof route.query.keyword === "string" ? route.query.keyword : "";
const filters = reactive({ tenantId: routeTenantId() as number | undefined, merchantId: routeMerchantId() as number | undefined, status: "", paymentMethod: "", refundStatus: "", keyword: routeKeyword(), checkoutGroupNo: "", startDate: "", endDate: "", page: 1, pageSize: 50 });
const dateRange = ref<string[]>([]);
const refundFilters = reactive({ status: "", keyword: "" });
const paymentFilters = reactive({ status: "" });
const callbackFilters = reactive({ status: "" });
const commissionFilters = reactive({ status: "" });
const settlementFilters = reactive({ status: "" });
const couponFilters = reactive({ status: "", keyword: "" });
const couponUsageFilters = reactive({ status: "", keyword: "" });
const flashSaleFilters = reactive({ status: "", keyword: "" });
const groupBuyFilters = reactive({ status: "", keyword: "" });
const groupBuyRecordFilters = reactive({ status: "", keyword: "" });
const promotionFilters = reactive({ enabled: "", keyword: "" });
const paymentKeyword = ref("");
const shipForm = reactive<any>({ shipmentId: null, businessKey: "", expressCompany: "", expressNo: "", remark: "", reason: "", items: [] });
const logisticsForm = reactive<any>({ id: null, name: "", code: "", servicePhone: "", trackingUrl: "", sortOrder: 0, enabled: true });
const couponForm = reactive<any>({ id: null, code: "", name: "", issuerScope: "merchant", refundReleasePolicy: "full_refund", minAmount: 0, discountAmount: 0, scope: "all", scopeCategoryId: null, scopeProductId: null, issuanceLimit: 0, claimedCount: 0, usageLimit: 0, perUserLimit: 0, startsAt: "", endsAt: "", enabled: true });
const flashSaleForm = reactive<any>({ id: null, title: "", productId: null, skuId: null, salePrice: 0, saleStock: 1, perUserLimit: 1, startsAt: "", endsAt: "", status: "draft", sortOrder: 0 });
const groupBuyForm = reactive<any>({ id: null, title: "", productId: null, skuId: null, groupPrice: 0, minPeople: 2, groupStock: 1, perUserLimit: 1, startsAt: "", endsAt: "", status: "draft", sortOrder: 0 });
const promotionForm = reactive<any>({ id: null, code: "", name: "", commissionRatePercent: 0, promoterUserId: null, agentId: null, startsAt: "", endsAt: "", enabled: true, remark: "" });
const enabledShipLogisticsCompanies = computed(() => shipLogisticsCompanies.value.filter((item) => item.enabled));
const selectedMerchant = computed(() => merchants.value.find((merchant) => merchant.id === filters.merchantId));
const selectedMerchantOpen = computed(() => merchantOperational(selectedMerchant.value));
const selectedMerchantDisabledReason = computed(() => merchantDisabledReason(selectedMerchant.value));
const selectedFlashSaleSkus = computed(() => couponProducts.value.find((item) => item.id === flashSaleForm.productId)?.skus || []);
const selectedGroupBuySkus = computed(() => couponProducts.value.find((item) => item.id === groupBuyForm.productId)?.skus || []);
const couponCategoryOptions = computed(() => couponForm.issuerScope === "platform" ? platformCouponCategories.value : couponCategories.value);
const couponProductOptions = computed(() => couponForm.issuerScope === "platform" ? platformCouponProducts.value : couponProducts.value);
const activePanel = computed(() => String(route.query.panel || route.path.replace("/mall-", "") || "orders"));
const pageHeader = computed(() => {
  const headers: Record<string, { title: string; desc: string; note: string }> = {
    refunds: { title: "商城售后退款", desc: "处理仅退款、退货退款、微信原路退款、余额退回和线下退款备注。", note: "售后口径：待处理要及时审核，已通过退款会同步影响订单、库存、余额/支付流水和结算。" },
    logistics: { title: "商城物流设置", desc: "维护快递公司、单号查询链接、手动发货和确认收货履约。", note: "履约口径：已收款订单先发货，已发货订单可由用户确认收货或按规则自动完成。" },
    marketing: { title: "商城营销管理", desc: "管理优惠券、秒杀、拼团、推广码和参团记录。", note: "营销口径：优惠、活动库存、推广佣金会进入订单、库存和财务结算链路。" },
    "payment-logs": { title: "商城支付日志", desc: "核对支付流水、微信回调、退款日志和推广佣金，定位真实收钱链路问题。", note: "支付口径：支付成功必须有流水和回调留痕；重复回调应幂等，异常要能导出追踪。" },
    settlements: { title: "商城结算管理", desc: "按店铺生成、审核、打款/扣回商城结算单，区分平台代收和商户直收。", note: "结算口径：平台代收生成应打款；已结算后退款会生成负向扣回/冲抵金额，商户直收记录平台服务费。" },
    statistics: { title: "商城统计看板", desc: "查看订单、实收、净收、支付方式、热销商品和优惠券转化。", note: "统计口径：近 30 天按当前商家/店铺筛选；正式运营对账仍以订单、流水、结算导出为准。" },
    finance: { title: "商城财务总览", desc: "集中查看订单财务、支付日志、退款、佣金和店铺结算。", note: "财务口径：实收=已确认收款订单金额，净收=实收-已通过退款；余额/线下/微信按支付方式拆分。" }
  };
  return headers[activePanel.value] || { title: "商城订单 / 售后", desc: "处理余额支付、线下收款确认、发货、售后退款，并核对收货地址和订单明细。", note: "财务口径：实收=已确认收款订单金额，净收=实收-已通过退款；余额/线下按支付方式拆分。" };
});
const statuses = [
  { label: "待线下确认", value: "pending_confirm" },
  { label: "待付款", value: "pending_payment" },
  { label: "已支付", value: "paid" },
  { label: "已发货", value: "shipped" },
  { label: "已完成", value: "completed" },
  { label: "售后中", value: "refund_pending" },
  { label: "已退款", value: "refunded" },
  { label: "已关闭", value: "closed" }
];
const paymentMethods = [
  { label: "微信支付", value: "wechat" },
  { label: "余额支付", value: "balance" },
  { label: "线下收款", value: "offline" }
];
const refundStatuses = [
  { label: "无售后", value: "none" },
  { label: "待处理", value: "pending" },
  { label: "待买家寄回", value: "awaiting_buyer_return" },
  { label: "退货运输中", value: "returning" },
  { label: "待商家收货", value: "awaiting_merchant_receipt" },
  { label: "待寄换货商品", value: "awaiting_exchange_shipment" },
  { label: "换货已发出", value: "exchange_shipped" },
  { label: "平台介入", value: "platform_intervening" },
  { label: "处理中", value: "processing" },
  { label: "已通过", value: "approved" },
  { label: "已拒绝", value: "rejected" },
  { label: "失败", value: "failed" }
];
const summaryCards = computed(() => [
  { label: "筛选订单数", value: orderSummary.value.orderCount || 0 },
  { label: "实收金额", value: `¥${money(orderSummary.value.receivedAmount ?? orderSummary.value.paidAmount)}` },
  { label: "净收金额", value: `¥${money(orderSummary.value.netReceivedAmount)}` },
  { label: "微信收款", value: `¥${money(orderSummary.value.wechatReceivedAmount)}` },
  { label: "余额收款", value: `¥${money(orderSummary.value.balanceReceivedAmount)}` },
  { label: "线下收款", value: `¥${money(orderSummary.value.offlineReceivedAmount)}` },
  { label: "已退金额", value: `¥${money(orderSummary.value.approvedRefundAmount)}` },
  { label: "待处理售后", value: orderSummary.value.pendingRefundCount || 0 }
]);
const commissionSummaryCards = computed(() => [
  { label: "总佣金", value: `¥${money(commissionSummary.value.totalAmount)}`, count: `${commissionSummary.value.totalCount || 0} 笔` },
  { label: "待结算", value: `¥${money(commissionSummary.value.pendingAmount)}`, count: `${commissionSummary.value.pendingCount || 0} 笔` },
  { label: "已结算", value: `¥${money(commissionSummary.value.settledAmount)}`, count: `${commissionSummary.value.settledCount || 0} 笔` },
  { label: "已作废", value: `¥${money(commissionSummary.value.voidAmount)}`, count: `${commissionSummary.value.voidCount || 0} 笔` }
]);
const checkoutGroupTraceNo = computed(() => filters.checkoutGroupNo.trim());
const checkoutGroupTraceCards = computed(() => [
  { label: "子订单", value: checkoutGroupTrace.value.orders.length || 0 },
  { label: "实收金额", value: `¥${money(checkoutGroupTrace.value.summary.receivedAmount)}` },
  { label: "净收金额", value: `¥${money(checkoutGroupTrace.value.summary.netReceivedAmount)}` },
  { label: "待付款/待确认", value: `${checkoutGroupTrace.value.summary.pendingPaymentCount || 0} / ${checkoutGroupTrace.value.summary.pendingConfirmCount || 0}` },
  { label: "待处理售后", value: checkoutGroupTrace.value.summary.pendingRefundCount || 0 },
  { label: "已退金额", value: `¥${money(checkoutGroupTrace.value.summary.approvedRefundAmount)}` }
]);
const analyticsCards = computed(() => [
  { label: "30天订单", value: mallAnalytics.value.summary?.orderCount || 0 },
  { label: "30天实收", value: `¥${money(mallAnalytics.value.summary?.receivedAmount)}` },
  { label: "30天净收", value: `¥${money(mallAnalytics.value.summary?.netReceivedAmount)}` },
  { label: "优惠让利", value: `¥${money(mallAnalytics.value.summary?.discountAmount)}` },
  { label: "已退金额", value: `¥${money(mallAnalytics.value.summary?.approvedRefundAmount)}` }
]);

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
  if (merchant.status !== "active") return "当前店铺已被平台停用，不能继续配置物流、优惠券、秒杀、拼团、推广码或执行运营批处理；历史订单履约和售后仍可按权限处理。";
  if (merchant.mallEnabled === false) return "当前店铺未开放商城，不能继续配置物流、优惠券、秒杀、拼团、推广码或执行运营批处理；请联系平台管理员在「商城店铺」开通商城后再操作。";
  return "";
}
function merchantProductAuditRequired(merchant: any) { return merchant?.productAuditRequired !== false; }
function agentLabel(agent: any) { return `${agent.name}${agent.region ? `（${agent.region}）` : ""}`; }
function money(value: any) { return Number(value || 0).toFixed(2); }
function orderTotalQuantity(row: any) { return (row?.items || []).reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0); }
function fulfillmentStatusText(value: string) { return value === "partial_shipped" ? "部分发货" : value === "shipped" ? "已全部发货" : value === "received" ? "已签收" : value === "cancelled" ? "已取消" : "待发货"; }
function orderEventText(value: string) { const labels: Record<string, string> = { order_created: "订单创建", payment_confirmed: "收款确认", order_partially_shipped: "部分发货", order_shipped: "全部发货", shipment_tracking_updated: "修改物流单号", shipment_delivered: "包裹签收", shipment_auto_delivered: "包裹自动签收", order_completed: "订单完成", order_auto_completed: "订单自动完成", order_closed: "订单关闭" }; return labels[value] || value; }
function orderItemShippedQuantity(row: any, orderItemId: number) {
  return (row?.shipments || []).filter((shipment: any) => shipment.status !== "cancelled").flatMap((shipment: any) => shipment.items || []).filter((item: any) => Number(item.orderItemId) === Number(orderItemId)).reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);
}
function createShipmentBusinessKey(orderId: number) { return `shipment:${orderId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`; }
function settlementAmountText(value: any) {
  const amount = Number(value || 0);
  return `${amount < 0 ? "应扣回" : "应打款"} ¥${Math.abs(amount).toFixed(2)}`;
}
function settlementFinishActionText(row: any) {
  return Number(row?.payableAmount || 0) < 0 ? "扣回/冲抵" : "打款";
}
function percent(value: any) { return (Number(value || 0) * 100).toFixed(2).replace(/\.?0+$/, ""); }
function formatTime(value: any) { return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "-"; }
function paymentText(value: string) { return ({ wechat: "微信支付", balance: "余额支付", offline: "线下收款", alipay: "支付宝" } as any)[value] || value; }
function paymentModeText(value: string) { return value === "merchant_direct" ? "商户直收" : "平台代收"; }
function statusText(value: string) { return Object.fromEntries(statuses.map((item) => [item.value, item.label]))[value] || value; }
function checkoutGroupStatusText(value: string) { return ({ pending_payment: "待付款", partial_paid: "部分支付", paid: "已支付", completed: "已完成", closed: "已关闭", refunded: "已退款" } as any)[value] || value; }
function refundText(value: string) { return ({ pending: "待处理", awaiting_buyer_return: "待买家寄回", returning: "退货运输中", awaiting_merchant_receipt: "待商家收货", awaiting_exchange_shipment: "待寄换货商品", exchange_shipped: "换货已发出", platform_intervening: "平台介入", processing: "退款处理中", approved: "已完成", rejected: "已拒绝", failed: "退款失败", cancelled: "已取消" } as any)[value] || value; }
function refundStatusType(value: string) { return value === "approved" ? "success" : value === "failed" || value === "platform_intervening" ? "danger" : ["pending", "processing", "awaiting_buyer_return", "returning", "awaiting_merchant_receipt", "awaiting_exchange_shipment", "exchange_shipped"].includes(value) ? "warning" : "info"; }
function paymentStatusText(value: string) { return ({ success: "成功", discrepancy: "差异", failed: "失败" } as any)[value] || value || "-"; }
function callbackStatusText(value: string) { return ({ received: "已接收", success: "成功", failed: "失败", idempotent: "幂等" } as any)[value] || value || "-"; }
function callbackStatusType(value: string) { return value === "success" || value === "idempotent" ? "success" : value === "failed" ? "danger" : "warning"; }
function refundLogStatusText(value: string) { return ({ success: "成功", submitted: "已提交", failed: "失败" } as any)[value] || value || "-"; }
function refundLogStatusType(value: string) { return value === "success" ? "success" : value === "failed" ? "danger" : "warning"; }
function couponStatusText(value: string) { return ({ active: "可用", not_started: "未开始", expired: "已过期", exhausted: "已用完", disabled: "已停用" } as any)[value] || value || "-"; }
function couponStatusType(value: string) { return value === "active" ? "success" : value === "disabled" || value === "expired" || value === "exhausted" ? "info" : "warning"; }
function flashSaleStatusText(value: string) { return ({ active: "进行中", not_started: "未开始", ended: "已结束", sold_out: "已售罄", draft: "草稿", disabled: "已停用" } as any)[value] || value || "-"; }
function flashSaleStatusType(value: string) { return value === "active" ? "success" : value === "sold_out" || value === "ended" || value === "disabled" ? "info" : "warning"; }
function groupBuyRecordStatusText(value: string) { return ({ pending: "待支付", paid: "已支付", closed: "已关闭", refunded: "已退款" } as any)[value] || value || "-"; }
function groupBuyRecordStatusType(value: string) { return value === "paid" ? "success" : value === "pending" ? "warning" : "info"; }
function groupBuyTeamStatusText(value: string) { return ({ forming: "组团中", success: "已成团", failed: "未成团" } as any)[value] || value || "-"; }
function groupBuyTeamStatusType(value: string) { return value === "success" ? "success" : value === "failed" ? "info" : "warning"; }
function couponUsageStatusText(value: string) { return ({ used: "已使用", released: "已释放" } as any)[value] || value || "-"; }
function commissionStatusText(value: string) { return ({ pending: "待结算", void: "已作废", settled: "已结算" } as any)[value] || value || "-"; }
function commissionStatusType(value: string) { return value === "pending" ? "warning" : value === "settled" ? "success" : "info"; }
function commissionRemark(row: any) { return row.status === "settled" ? `${row.settledBy || "财务"}：${row.settleRemark || "已结算"}` : row.voidReason || "-"; }
function settlementStatusText(value: string) { return ({ draft: "草稿", approved: "已审核", paid: "已打款", rejected: "已拒绝", cancelled: "已取消" } as any)[value] || value || "-"; }
function settlementStatusType(value: string) { return value === "paid" ? "success" : value === "approved" ? "warning" : value === "rejected" || value === "cancelled" ? "danger" : "info"; }
function paymentReadinessTagType(value: string) { return value === "real_ready" ? "success" : value === "sandbox_ready" ? "warning" : value === "disabled" ? "info" : "danger"; }
function refundTypeText(value: string) { return ({ refund_only: "仅退款", return_refund: "退货退款", exchange: "换货" } as any)[value] || value || "-"; }
function refundResponsibilityText(value: string) { return ({ undetermined: "待判定", buyer: "买家责任", merchant: "商家责任", logistics: "物流责任", platform: "平台责任" } as any)[value] || value || "待判定"; }
function refundAddressText(value: any) { return [value?.receiverName, maskedPhone(value?.receiverPhone), value?.province, value?.city, value?.district, value?.detail].filter(Boolean).join(" "); }
function refundProviderName(value: string) { return ({ wechat: "微信", balance: "余额", offline: "线下" } as any)[value] || value || "-"; }
function refundProviderText(row: any) {
  const provider = row.order?.paymentMethod || row.providerRefundPayload?.provider || "";
  const mode = row.providerRefundPayload?.mode ? ` / ${row.providerRefundPayload.mode}` : "";
  return `${refundProviderName(provider)}${mode}`;
}
function couponScopeText(row: any) {
  const categoryRows = row.issuerScope === "platform" ? platformCouponCategories.value : couponCategories.value;
  const productRows = row.issuerScope === "platform" ? platformCouponProducts.value : couponProducts.value;
  if (row.scope === "category") return `指定分类：${categoryRows.find((item) => item.id === row.scopeCategoryId)?.name || row.scopeCategoryId || "-"}`;
  if (row.scope === "product") return `指定商品：${productRows.find((item) => item.id === row.scopeProductId)?.title || row.scopeProductId || "-"}`;
  return row.issuerScope === "platform" ? "租户全场通用" : "全店通用";
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
function validOptionalTimeRange(startsAt: any, endsAt: any, label: string) {
  if (!startsAt || !endsAt) return true;
  const start = new Date(String(startsAt).replace(" ", "T")).getTime();
  const end = new Date(String(endsAt).replace(" ", "T")).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    ElMessage.error(`${label}结束时间不能早于开始时间`);
    return false;
  }
  return true;
}
function statusType(value: string) { return value === "paid" || value === "shipped" || value === "completed" ? "success" : value === "closed" || value === "refunded" ? "info" : "warning"; }
function maskedPhone(value?: string | null) { const phone = String(value || ""); return /^1\d{10}$/.test(phone) ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone || ""; }
function receiverText(row: any) { const address = row.addressSnapshot || {}; return [address.receiverName, maskedPhone(address.receiverPhone)].filter(Boolean).join(" ") || "-"; }
function orderActionTip(row: any) {
  if (row.status === "pending_payment") return row.paymentMethod === "wechat" ? "等待微信支付回调，可关闭释放库存" : "等待用户余额支付，可关闭释放库存";
  if (row.status === "pending_confirm") return "核对线下收款后确认";
  if (row.status === "paid" && row.fulfillmentStatus === "partial_shipped") return `已部分发货 ${row.shippedQuantity || 0}/${row.totalQuantity || orderTotalQuantity(row)}，继续创建剩余包裹`;
  if (row.status === "paid") return "已收款，尽快填写物流发货";
  if (row.status === "shipped") return "等待用户确认收货";
  if (row.status === "completed") return "履约完成，可用于对账";
  if (row.status === "refund_pending") return "售后待审核，请财务处理";
  if (row.status === "refunded") return "已退款，核对库存和流水";
  if (row.status === "closed") return row.closeReason ? `已关闭：${row.closeReason}` : "已关闭";
  return "查看详情";
}
function fullAddress(row: any) {
  const address = row?.addressSnapshot || {};
  return [address.receiverName, maskedPhone(address.receiverPhone), address.province, address.city, address.district, address.detail].filter(Boolean).join(" ");
}
function orderTimeline(row: any) {
  const status = row?.status;
  return [
    { label: "提交订单", active: true, time: formatTime(row?.createdAt), tip: "订单已创建" },
    { label: "确认收款", active: ["paid", "shipped", "completed", "refund_pending", "refunded"].includes(status) || Boolean(row?.paidAt), time: formatTime(row?.paidAt), tip: row?.paymentMethod === "offline" ? "等待线下收款确认" : row?.paymentMethod === "wechat" ? "等待微信支付回调" : "等待余额支付" },
    { label: "发货履约", active: ["shipped", "completed"].includes(status) || Boolean(row?.shippedAt), time: formatTime(row?.shippedAt), tip: "等待运营发货" },
    { label: "完成/售后", active: ["completed", "refund_pending", "refunded"].includes(status) || Boolean(row?.completedAt), time: formatTime(row?.completedAt), tip: "等待收货或售后处理" }
  ];
}
function refundSummary(refund: any) {
  if (!refund) return "无";
  return `${refundText(refund.status)} · ${refundTypeText(refund.type)} · ¥${money(refund.amount)} · ${refund.reason || "无原因"}`;
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
function merchantLinkWarning(requestedMerchantId: number) {
  return `当前链接指定的店铺 #${requestedMerchantId} 对当前账号不可见，或已被商家/关键词筛选条件过滤。为避免误操作，系统不会自动切换到其它店铺；请联系平台管理员确认店铺授权，或清空筛选后重试。`;
}
function clearMallScopeData() {
  orderLoadSequence += 1;
  analyticsLoadSequence += 1;
  refundLoadSequence += 1;
  paymentLoadSequence += 1;
  settlementLoadSequence += 1;
  checkoutGroupTraceLoadSequence += 1;
  detailLoadSequence += 1;
  checkoutGroupLoadSequence += 1;
  shipLoadSequence += 1;
  shipLogisticsLoadSequence += 1;
  logisticsLoadSequence += 1;
  couponOptionsLoadSequence += 1;
  couponLoadSequence += 1;
  couponUsageLoadSequence += 1;
  flashSaleLoadSequence += 1;
  groupBuyLoadSequence += 1;
  groupBuyRecordLoadSequence += 1;
  agentLoadSequence += 1;
  promotionLoadSequence += 1;
  orders.value = [];
  refunds.value = [];
  paymentTransactions.value = [];
  paymentCallbackLogs.value = [];
  refundLogs.value = [];
  commissions.value = [];
  commissionPromoterSummary.value = [];
  mallSettlements.value = [];
  settlementPending.value = [];
  coupons.value = [];
  couponUsages.value = [];
  couponCategories.value = [];
  couponProducts.value = [];
  platformCouponCategories.value = [];
  platformCouponProducts.value = [];
  flashSales.value = [];
  groupBuys.value = [];
  groupBuyRecords.value = [];
  promotionCodes.value = [];
  logisticsCompanies.value = [];
  shipLogisticsCompanies.value = [];
  orderSummary.value = {};
  commissionSummary.value = {};
  mallAnalytics.value = {};
  paymentReadiness.value = null;
  currentOrder.value = null;
  checkoutGroupOrders.value = [];
  orderError.value = "";
  analyticsError.value = "";
  refundError.value = "";
  paymentError.value = "";
  settlementError.value = "";
  checkoutGroupTraceError.value = "";
  detailError.value = "";
  checkoutGroupError.value = "";
  shipError.value = "";
  shipLogisticsError.value = "";
  logisticsError.value = "";
  couponOptionsError.value = "";
  couponError.value = "";
  couponUsageError.value = "";
  flashSaleError.value = "";
  groupBuyError.value = "";
  groupBuyRecordError.value = "";
  agentError.value = "";
  promotionError.value = "";
  loading.value = false;
  analyticsLoading.value = false;
  settlementLoading.value = false;
  checkoutGroupTraceLoading.value = false;
  detailLoading.value = false;
  shipLoading.value = false;
  shipLogisticsLoading.value = false;
  logisticsLoading.value = false;
  detailVisible.value = false;
  shipDialogVisible.value = false;
  logisticsDialogVisible.value = false;
  couponDialogVisible.value = false;
  flashSaleDialogVisible.value = false;
  groupBuyDialogVisible.value = false;
  groupBuyRecordDialogVisible.value = false;
  promotionDialogVisible.value = false;
  detailTargetRow.value = null;
  shipTargetRow.value = null;
  shipOrderTarget.value = null;
  resetCheckoutGroupTrace();
}
function blockInvalidMerchantLink() {
  if (!deepLinkWarning.value) return false;
  clearMallScopeData();
  return true;
}
function merchantPageUrl(path = route.path) {
  if (!selectedMerchant.value) return "";
  const query = new URLSearchParams();
  if (selectedMerchant.value.tenant?.id) query.set("tenantId", String(selectedMerchant.value.tenant.id));
  query.set("merchantId", String(selectedMerchant.value.id));
  if (typeof route.query.panel === "string") query.set("panel", route.query.panel);
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
async function loadMerchants() {
  const sequence = ++scopeLoadSequence;
  scopeError.value = "";
  merchants.value = [];
  clearMallScopeData();
  try {
    const result = await api.get<any, any[]>("/admin/mall/accessible-merchants", { params: { tenantId: isPlatformAdmin() ? filters.tenantId : undefined, enabled: "true" } });
    if (sequence !== scopeLoadSequence) return false;
    if (!Array.isArray(result)) throw new Error("可运营店铺响应格式无效");
    merchants.value = result;
    const requestedMerchantId = routeMerchantId();
    deepLinkWarning.value = "";
    if (requestedMerchantId && merchants.value.some((merchant) => merchant.id === requestedMerchantId)) {
      filters.merchantId = requestedMerchantId;
    } else if (requestedMerchantId) {
      filters.merchantId = undefined;
      deepLinkWarning.value = merchantLinkWarning(requestedMerchantId);
      clearMallScopeData();
      return false;
    } else if (filters.merchantId && !merchants.value.some((merchant) => merchant.id === filters.merchantId)) filters.merchantId = undefined;
    if (!filters.merchantId && !isPlatformAdmin() && merchants.value.length === 1) filters.merchantId = merchants.value[0].id;
    return true;
  } catch (error: unknown) {
    if (sequence !== scopeLoadSequence) return false;
    filters.merchantId = undefined;
    deepLinkWarning.value = "";
    scopeError.value = requestErrorText(error, "加载可运营店铺失败");
    clearMallScopeData();
    return false;
  }
}
async function reloadMerchantScope() {
  scopeError.value = "";
  const tenantsReady = await loadTenants();
  if (!tenantsReady) return;
  const merchantScopeReady = await loadMerchants();
  if (!merchantScopeReady) return;
  reload();
  await openRoutePanel();
}
function currentMallParams(extra: Record<string, any> = {}) {
  return {
    tenantId: isPlatformAdmin() ? filters.tenantId || selectedMerchant.value?.tenant?.id : undefined,
    merchantId: filters.merchantId || undefined,
    ...extra
  };
}
function appendCurrentMallParams(params: URLSearchParams) {
  const tenantId = filters.tenantId || selectedMerchant.value?.tenant?.id;
  if (isPlatformAdmin() && tenantId) params.set("tenantId", String(tenantId));
  if (filters.merchantId) params.set("merchantId", String(filters.merchantId));
}
function requireMerchantSelection(action: string) {
  if (deepLinkWarning.value) {
    ElMessage.error("当前店铺链接不可用，请先确认店铺授权后再操作。");
    return false;
  }
  if (filters.merchantId && selectedMerchantOpen.value) return true;
  if (filters.merchantId) {
    ElMessage.error(selectedMerchantDisabledReason.value);
    return false;
  }
  ElMessage.error(`请先选择要${action}的店铺。平台可在「商城店铺」为商家/代理开店并授权账号。`);
  return false;
}
function requireOpenMerchant(action: string) {
  if (!filters.merchantId && isPlatformAdmin()) return true;
  return requireMerchantSelection(action);
}
async function handleTenantChange() {
  deepLinkWarning.value = "";
  filters.merchantId = undefined;
  const query = { ...route.query };
  if (filters.tenantId) query.tenantId = String(filters.tenantId);
  else delete query.tenantId;
  delete query.merchantId;
  await router.replace({ path: route.path, query });
  await loadMerchants();
  reload();
}
async function handleMerchantChange() {
  deepLinkWarning.value = "";
  const merchant = selectedMerchant.value;
  if (merchant?.tenant?.id && isPlatformAdmin()) filters.tenantId = merchant.tenant.id;
  const query = { ...route.query };
  if (filters.tenantId) query.tenantId = String(filters.tenantId);
  else delete query.tenantId;
  if (filters.merchantId) query.merchantId = String(filters.merchantId);
  else delete query.merchantId;
  await router.replace({ path: route.path, query });
  reload();
}
function orderQueryParams() {
  return {
    ...currentMallParams(),
    status: filters.status || undefined,
    paymentMethod: filters.paymentMethod || undefined,
    refundStatus: filters.refundStatus || undefined,
    keyword: filters.keyword.trim() || undefined,
    checkoutGroupNo: filters.checkoutGroupNo.trim() || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined
  };
}
function emptyCheckoutGroupTrace() {
  return {
    orders: [],
    summary: {},
    refunds: [],
    paymentTransactions: [],
    paymentCallbackLogs: [],
    refundLogs: [],
    commissions: [],
    commissionSummary: {}
  };
}
function resetCheckoutGroupTrace() {
  checkoutGroupTrace.value = emptyCheckoutGroupTrace();
}
async function loadCheckoutGroupTrace() {
  if (blockInvalidMerchantLink()) return;
  const groupNo = checkoutGroupTraceNo.value;
  if (!groupNo) {
    checkoutGroupTraceError.value = "";
    resetCheckoutGroupTrace();
    return;
  }
  const sequence = ++checkoutGroupTraceLoadSequence;
  checkoutGroupTraceLoading.value = true;
  checkoutGroupTraceError.value = "";
  resetCheckoutGroupTrace();
  try {
    const params = currentMallParams({ checkoutGroupNo: groupNo });
    const results = await Promise.allSettled([
      api.get<any, any>("/admin/mall/orders", { params: { ...params, page: 1, pageSize: 100 } }),
      api.get<any, any>("/admin/mall/orders/summary", { params }),
      api.get<any, any[]>("/admin/mall/refunds", { params }),
      api.get<any, any[]>("/admin/mall/payment-transactions", { params }),
      api.get<any, any[]>("/admin/mall/payment-callback-logs", { params }),
      api.get<any, any[]>("/admin/mall/refund-logs", { params }),
      api.get<any, any[]>("/admin/mall/commissions", { params }),
      api.get<any, any>("/admin/mall/commissions/summary", { params })
    ]);
    if (sequence !== checkoutGroupTraceLoadSequence || groupNo !== checkoutGroupTraceNo.value) return;
    const labels = ["子订单", "汇总", "售后", "支付流水", "支付回调", "退款日志", "佣金", "佣金汇总"];
    const failures = results.flatMap((result, index) => result.status === "rejected" ? [`${labels[index]}：${requestErrorText(result.reason, "读取失败")}`] : []);
    const value = (index: number) => results[index].status === "fulfilled" ? (results[index] as PromiseFulfilledResult<any>).value : undefined;
    const orderResult = value(0);
    const summary = value(1);
    const refundRows = value(2);
    const transactionRows = value(3);
    const callbackRows = value(4);
    const refundLogRows = value(5);
    const commissionRows = value(6);
    const commissionSummaryRow = value(7);
    checkoutGroupTrace.value = {
      orders: Array.isArray(orderResult?.items) ? orderResult.items : [],
      summary: summary || {},
      refunds: Array.isArray(refundRows) ? refundRows : [],
      paymentTransactions: Array.isArray(transactionRows) ? transactionRows : [],
      paymentCallbackLogs: Array.isArray(callbackRows) ? callbackRows : [],
      refundLogs: Array.isArray(refundLogRows) ? refundLogRows : [],
      commissions: Array.isArray(commissionRows) ? commissionRows : [],
      commissionSummary: commissionSummaryRow || {}
    };
    checkoutGroupTraceError.value = failures.join("；");
  } catch (error: any) {
    if (sequence !== checkoutGroupTraceLoadSequence || groupNo !== checkoutGroupTraceNo.value) return;
    checkoutGroupTraceError.value = requestErrorText(error, "加载跨店结算组追踪失败");
  } finally {
    if (sequence === checkoutGroupTraceLoadSequence) checkoutGroupTraceLoading.value = false;
  }
}
function onDateRangeChange(value?: string[]) {
  filters.startDate = value?.[0] || "";
  filters.endDate = value?.[1] || "";
  loadOrders();
  loadSettlements();
}
async function loadOrders() {
  if (blockInvalidMerchantLink()) return;
  const sequence = ++orderLoadSequence;
  loading.value = true;
  orderError.value = "";
  orders.value = [];
  orderSummary.value = {};
  try {
    const params = { ...orderQueryParams(), page: filters.page, pageSize: filters.pageSize };
    const [orderResult, summaryResult] = await Promise.allSettled([
      api.get<any, any>("/admin/mall/orders", { params }),
      api.get<any, any>("/admin/mall/orders/summary", { params: orderQueryParams() })
    ]);
    if (sequence !== orderLoadSequence) return;
    const failures: string[] = [];
    if (orderResult.status === "fulfilled" && Array.isArray(orderResult.value?.items)) orders.value = orderResult.value.items;
    else failures.push(`订单列表：${orderResult.status === "rejected" ? requestErrorText(orderResult.reason, "读取失败") : "响应格式无效"}`);
    if (summaryResult.status === "fulfilled" && summaryResult.value && typeof summaryResult.value === "object") orderSummary.value = summaryResult.value;
    else failures.push(`订单汇总：${summaryResult.status === "rejected" ? requestErrorText(summaryResult.reason, "读取失败") : "响应格式无效"}`);
    orderError.value = failures.join("；");
    await loadCheckoutGroupTrace();
  } catch (error: any) {
    if (sequence !== orderLoadSequence) return;
    orderError.value = requestErrorText(error, "加载商城订单失败");
  } finally {
    if (sequence === orderLoadSequence) loading.value = false;
  }
}
async function loadAnalytics() {
  if (blockInvalidMerchantLink()) return;
  const sequence = ++analyticsLoadSequence;
  analyticsLoading.value = true;
  analyticsError.value = "";
  mallAnalytics.value = {};
  try {
    const result = await api.get<any, any>("/admin/mall/analytics", { params: currentMallParams() });
    if (sequence !== analyticsLoadSequence) return;
    if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("商城运营看板响应格式无效");
    mallAnalytics.value = result;
  } catch (error: any) {
    if (sequence !== analyticsLoadSequence) return;
    analyticsError.value = requestErrorText(error, "加载商城运营看板失败");
  } finally {
    if (sequence === analyticsLoadSequence) analyticsLoading.value = false;
  }
}
async function loadRefunds() {
  if (blockInvalidMerchantLink()) return;
  const sequence = ++refundLoadSequence;
  refundError.value = "";
  refunds.value = [];
  try {
    const result = await api.get<any, any[]>("/admin/mall/refunds", { params: currentMallParams({ status: refundFilters.status || undefined, paymentMethod: filters.paymentMethod || undefined, checkoutGroupNo: filters.checkoutGroupNo.trim() || undefined, startDate: filters.startDate || undefined, endDate: filters.endDate || undefined, keyword: refundFilters.keyword.trim() || filters.keyword.trim() || undefined }) });
    if (sequence !== refundLoadSequence) return;
    if (!Array.isArray(result)) throw new Error("商城售后响应格式无效");
    refunds.value = result;
  } catch (error: any) {
    if (sequence !== refundLoadSequence) return;
    refundError.value = requestErrorText(error, "加载售后失败");
  }
}
async function loadPaymentData() {
  if (blockInvalidMerchantLink()) return;
  const sequence = ++paymentLoadSequence;
  paymentError.value = "";
  paymentTransactions.value = [];
  paymentCallbackLogs.value = [];
  refundLogs.value = [];
  commissions.value = [];
  commissionSummary.value = {};
  commissionPromoterSummary.value = [];
  paymentReadiness.value = null;
  try {
    const baseParams = currentMallParams({ keyword: paymentKeyword.value.trim() || filters.keyword.trim() || undefined, checkoutGroupNo: filters.checkoutGroupNo.trim() || undefined });
    const results = await Promise.allSettled([
      api.get<any, any[]>("/admin/mall/payment-transactions", { params: { ...baseParams, status: paymentFilters.status || undefined } }),
      api.get<any, any[]>("/admin/mall/payment-callback-logs", { params: { ...baseParams, status: callbackFilters.status || undefined } }),
      api.get<any, any[]>("/admin/mall/refund-logs", { params: baseParams }),
      api.get<any, any[]>("/admin/mall/commissions", { params: { ...baseParams, status: commissionFilters.status || undefined } }),
      api.get<any, any>("/admin/mall/commissions/summary", { params: { ...baseParams, status: commissionFilters.status || undefined } }),
      api.get<any, any[]>("/admin/mall/commissions/by-promoter", { params: { ...baseParams, status: commissionFilters.status || undefined } }),
      api.get<any, any>("/admin/mall/payment-readiness", { params: currentMallParams() })
    ]);
    if (sequence !== paymentLoadSequence) return;
    const labels = ["支付流水", "支付回调", "退款日志", "佣金明细", "佣金汇总", "推广人汇总", "支付就绪度"];
    const failures = results.flatMap((result, index) => result.status === "rejected" ? [`${labels[index]}：${requestErrorText(result.reason, "读取失败")}`] : []);
    const value = (index: number) => results[index].status === "fulfilled" ? (results[index] as PromiseFulfilledResult<any>).value : undefined;
    const transactions = value(0);
    const callbackLogs = value(1);
    const refundLogRows = value(2);
    const commissionRows = value(3);
    const commissionSummaryRow = value(4);
    const promoterSummaryRows = value(5);
    const readiness = value(6);
    paymentTransactions.value = Array.isArray(transactions) ? transactions : [];
    paymentCallbackLogs.value = Array.isArray(callbackLogs) ? callbackLogs : [];
    refundLogs.value = Array.isArray(refundLogRows) ? refundLogRows : [];
    commissions.value = Array.isArray(commissionRows) ? commissionRows : [];
    commissionSummary.value = commissionSummaryRow && typeof commissionSummaryRow === "object" ? commissionSummaryRow : {};
    commissionPromoterSummary.value = Array.isArray(promoterSummaryRows) ? promoterSummaryRows : [];
    paymentReadiness.value = readiness && typeof readiness === "object" ? readiness : null;
    results.forEach((result, index) => {
      if (result.status !== "fulfilled") return;
      const responseInvalid = index < 4 || index === 5 ? !Array.isArray(result.value) : !result.value || typeof result.value !== "object" || Array.isArray(result.value);
      if (responseInvalid) failures.push(`${labels[index]}：响应格式无效`);
    });
    paymentError.value = failures.join("；");
    await loadCheckoutGroupTrace();
    await loadSettlements();
  } catch (error: any) {
    if (sequence !== paymentLoadSequence) return;
    paymentError.value = requestErrorText(error, "加载支付日志失败");
  }
}

async function loadSettlements() {
  if (blockInvalidMerchantLink()) return;
  const sequence = ++settlementLoadSequence;
  settlementLoading.value = true;
  settlementError.value = "";
  mallSettlements.value = [];
  settlementPending.value = [];
  try {
    const result = await api.get<any, any>("/admin/mall/settlements", {
      params: currentMallParams({ status: settlementFilters.status || undefined, startDate: filters.startDate || undefined, endDate: filters.endDate || undefined })
    });
    if (sequence !== settlementLoadSequence) return;
    if (!result || !Array.isArray(result.items) || !Array.isArray(result.pending)) throw new Error("商城结算响应格式无效");
    mallSettlements.value = result.items;
    settlementPending.value = result.pending;
  } catch (error: any) {
    if (sequence !== settlementLoadSequence) return;
    settlementError.value = requestErrorText(error, "加载商城结算失败");
  } finally {
    if (sequence === settlementLoadSequence) settlementLoading.value = false;
  }
}

function mallSettlementOperationKey(action: string, id?: number) {
  const uuid = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `mall-settlement:${action}:${id || 0}:${uuid}`;
}

async function generateSettlement(row?: any) {
  if (!canManageMallSettlements.value) return ElMessage.error("商城结算生成、审核和打款由平台财务处理");
  const merchantId = row?.merchant?.id || filters.merchantId;
  if (!merchantId) return ElMessage.error("请先选择或指定要生成结算单的店铺");
  if (!filters.startDate || !filters.endDate) return ElMessage.error("请先在顶部选择结算周期日期范围");
  try {
    await api.post("/admin/mall/settlements/generate", {
      tenantId: isPlatformAdmin() ? filters.tenantId || row?.merchant?.tenant?.id || selectedMerchant.value?.tenant?.id : undefined,
      merchantId,
      periodStart: filters.startDate,
      periodEnd: filters.endDate,
      businessKey: mallSettlementOperationKey("generate", merchantId),
      remark: "后台商城财务生成结算单"
    });
    ElMessage.success("结算单已生成");
    await loadSettlements();
  } catch (error: any) {
    ElMessage.error(error.message || "生成结算单失败");
  }
}

async function approveSettlement(row: any) {
  if (!canManageMallSettlements.value) return ElMessage.error("商城结算审核由平台财务处理");
  const { value } = await ElMessageBox.prompt(`审核通过结算单 ${row.settlementNo}？${settlementAmountText(row.payableAmount)}`, "审核商城结算", { inputValue: "财务已核对订单、退款和服务费", confirmButtonText: "通过", cancelButtonText: "取消" });
  await api.post(`/admin/mall/settlements/${row.id}/approve`, { remark: value, businessKey: mallSettlementOperationKey("approve", row.id) });
  ElMessage.success("结算单已审核");
  await loadSettlements();
}

async function rejectSettlement(row: any) {
  if (!canManageMallSettlements.value) return ElMessage.error("商城结算审核由平台财务处理");
  const { value } = await ElMessageBox.prompt(`拒绝结算单 ${row.settlementNo}？`, "拒绝商城结算", { inputValue: "结算数据需重新核对", confirmButtonText: "拒绝", cancelButtonText: "取消" });
  await api.post(`/admin/mall/settlements/${row.id}/reject`, { remark: value, businessKey: mallSettlementOperationKey("reject", row.id) });
  ElMessage.success("结算单已拒绝");
  await loadSettlements();
}

async function markSettlementPaid(row: any) {
  if (!canManageMallSettlements.value) return ElMessage.error("商城结算打款/扣回由平台财务处理");
  const actionText = settlementFinishActionText(row);
  const { value } = await ElMessageBox.prompt(`标记结算单 ${row.settlementNo} 已${actionText}？`, "标记商城结算完成", { inputValue: row.paidReference || "", inputPlaceholder: actionText === "扣回/冲抵" ? "填写扣回/冲抵凭证号或后续抵扣说明" : "填写打款流水号或线下凭证号", confirmButtonText: `确认${actionText}`, cancelButtonText: "取消", inputValidator: (value) => Boolean(String(value || "").trim()) || `请填写${actionText}凭证号或说明，方便财务对账` });
  await api.post(`/admin/mall/settlements/${row.id}/mark-paid`, { paidReference: value, remark: actionText === "扣回/冲抵" ? "财务确认已扣回/冲抵" : "财务确认已打款", businessKey: mallSettlementOperationKey("paid", row.id) });
  ElMessage.success(`结算单已标记${actionText}`);
  await loadSettlements();
}
async function exportSettlements() {
  if (blockInvalidMerchantLink()) return ElMessage.error("当前订单管理店铺链接不可用，请先确认店铺授权后再导出。");
  try {
    const clean = new URLSearchParams();
    appendCurrentMallParams(clean);
    if (settlementFilters.status) clean.set("status", settlementFilters.status);
    if (filters.startDate) clean.set("startDate", filters.startDate);
    if (filters.endDate) clean.set("endDate", filters.endDate);
    await downloadFile(`/admin/mall/settlements/export?${clean.toString()}`, "mall-settlements.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出商城结算失败");
  }
}
async function settleCommission(row: any) {
  if (!canManageCommissions.value) return ElMessage.error("当前账号无商城佣金结算权限");
  try {
    const result = await ElMessageBox.prompt(`确认将推广码 ${row.code} 的 ¥${money(row.commissionAmount)} 佣金标记为已结算？`, "结算商城佣金", { inputValue: "财务确认已结算", confirmButtonText: "确认结算", cancelButtonText: "取消" });
    await api.post(`/admin/mall/commissions/${row.id}/settle`, { remark: result.value || "财务确认已结算" });
    ElMessage.success("佣金已结算");
    await loadPaymentData();
  } catch (error: any) {
    if (error === "cancel") return;
    ElMessage.error(error.message || "结算失败");
  }
}
async function batchSettleCommissions(target?: any) {
  if (!canManageCommissions.value) return ElMessage.error("当前账号无商城佣金结算权限");
  try {
    const pendingCount = Number(target?.pendingCount ?? commissionSummary.value.pendingCount ?? 0);
    const pendingAmount = money(target?.pendingAmount ?? commissionSummary.value.pendingAmount);
    const scopeText = target?.displayName ? `“${target.displayName}”` : "当前商家和搜索条件";
    const result = await ElMessageBox.prompt(`确认按${scopeText}批量结算 ${pendingCount} 笔待结算佣金，共 ¥${pendingAmount}？一次最多处理 200 笔。`, "批量结算商城佣金", { inputValue: target?.displayName ? `财务确认结算 ${target.displayName}` : "财务批量确认已结算", confirmButtonText: "确认结算", cancelButtonText: "取消", inputValidator: (value) => Boolean(String(value || "").trim()) || "请填写结算备注" });
    const payload = {
      ...currentMallParams(),
      keyword: paymentKeyword.value.trim() || filters.keyword.trim() || undefined,
      agentId: target?.agentId || undefined,
      promoterUserId: target?.promoterUserId || undefined,
      unassigned: target?.type === "unassigned" || undefined,
      remark: result.value || "财务批量确认已结算"
    };
    const settled = await api.post<any, any>("/admin/mall/commissions/batch-settle", payload);
    ElMessage.success(`已批量结算 ${settled.settledCount || 0} 笔，金额 ¥${money(settled.settledAmount)}`);
    await loadPaymentData();
  } catch (error: any) {
    if (error === "cancel") return;
    ElMessage.error(error.message || "批量结算失败");
  }
}
async function loadLogisticsCompanies() {
  if (blockInvalidMerchantLink()) return;
  const merchantId = Number(filters.merchantId || 0);
  const tenantId = Number(selectedMerchant.value?.tenant?.id || filters.tenantId || 0);
  const sequence = ++logisticsLoadSequence;
  logisticsLoading.value = true;
  logisticsError.value = "";
  logisticsCompanies.value = [];
  try {
    const result = await api.get<any, any[]>("/admin/mall/logistics-companies", { params: { tenantId: isPlatformAdmin() && tenantId ? tenantId : undefined, merchantId: merchantId || undefined } });
    if (sequence !== logisticsLoadSequence || !logisticsDialogVisible.value || Number(filters.merchantId || 0) !== merchantId) return;
    if (!Array.isArray(result)) throw new Error("商城物流设置响应格式无效");
    logisticsCompanies.value = result;
  } catch (error: any) {
    if (sequence !== logisticsLoadSequence || !logisticsDialogVisible.value || Number(filters.merchantId || 0) !== merchantId) return;
    logisticsError.value = requestErrorText(error, "加载物流设置失败");
  } finally {
    if (sequence === logisticsLoadSequence) logisticsLoading.value = false;
  }
}
async function loadShipLogisticsCompanies(order: any) {
  const orderId = Number(order?.id || 0);
  const merchantId = Number(order?.merchant?.id || filters.merchantId || 0);
  const tenantId = Number(order?.tenant?.id || order?.merchant?.tenant?.id || filters.tenantId || 0);
  const sequence = ++shipLogisticsLoadSequence;
  shipLogisticsLoading.value = true;
  shipLogisticsError.value = "";
  shipLogisticsCompanies.value = [];
  try {
    const result = await api.get<any, any[]>("/admin/mall/logistics-companies", { params: { tenantId: isPlatformAdmin() && tenantId ? tenantId : undefined, merchantId: merchantId || undefined } });
    if (sequence !== shipLogisticsLoadSequence || !shipDialogVisible.value || Number(shipOrderTarget.value?.id || 0) !== orderId) return;
    if (!Array.isArray(result)) throw new Error("发货物流选项响应格式无效");
    shipLogisticsCompanies.value = result;
  } catch (error: any) {
    if (sequence !== shipLogisticsLoadSequence || !shipDialogVisible.value || Number(shipOrderTarget.value?.id || 0) !== orderId) return;
    shipLogisticsError.value = requestErrorText(error, "加载发货物流选项失败");
  } finally {
    if (sequence === shipLogisticsLoadSequence) shipLogisticsLoading.value = false;
  }
}
function merchantContextMatches(merchantId: number, tenantId: number) {
  const currentMerchantId = Number(filters.merchantId || 0);
  const currentTenant = Number(filters.tenantId || selectedMerchant.value?.tenant?.id || 0);
  return currentMerchantId === merchantId && currentTenant === tenantId;
}
async function loadCouponOptions() {
  if (blockInvalidMerchantLink()) return;
  const sequence = ++couponOptionsLoadSequence;
  const merchantId = Number(filters.merchantId || 0);
  const tenantId = Number(filters.tenantId || selectedMerchant.value?.tenant?.id || 0);
  couponOptionsError.value = "";
  couponCategories.value = [];
  couponProducts.value = [];
  platformCouponCategories.value = [];
  platformCouponProducts.value = [];
  try {
    const params = currentMallParams();
    const results = await Promise.allSettled([
      api.get<any, any[]>("/admin/mall/categories", { params: { ...params, scope: "merchant" } }),
      api.get<any, any>("/admin/mall/products", { params: { ...params, pageSize: 100 } }),
      api.get<any, any[]>("/admin/mall/categories", { params: currentTenantParams({ scope: "platform", enabled: "true" }) }),
      api.get<any, any>("/admin/mall/products", { params: currentTenantParams({ scope: "platform", pageSize: 100 }) })
    ]);
    if (sequence !== couponOptionsLoadSequence || !merchantContextMatches(merchantId, tenantId)) return;
    const labels = ["店铺分类", "店铺商品", "平台分类", "平台商品"];
    const failures = results.flatMap((result, index) => result.status === "rejected" ? [`${labels[index]}：${requestErrorText(result.reason, "读取失败")}`] : []);
    const value = (index: number) => results[index].status === "fulfilled" ? (results[index] as PromiseFulfilledResult<any>).value : undefined;
    const list = (value: any) => Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : [];
    couponCategories.value = list(value(0));
    couponProducts.value = list(value(1));
    platformCouponCategories.value = list(value(2));
    platformCouponProducts.value = list(value(3));
    results.forEach((result, index) => {
      if (result.status === "fulfilled" && !Array.isArray(result.value) && !Array.isArray(result.value?.items)) failures.push(`${labels[index]}：响应格式无效`);
    });
    couponOptionsError.value = failures.join("；");
  } catch (error: any) {
    if (sequence !== couponOptionsLoadSequence || !merchantContextMatches(merchantId, tenantId)) return;
    couponOptionsError.value = requestErrorText(error, "加载优惠券适用范围失败");
  }
}
async function loadCoupons() {
  if (blockInvalidMerchantLink()) return;
  const sequence = ++couponLoadSequence;
  const merchantId = Number(filters.merchantId || 0);
  const tenantId = Number(filters.tenantId || selectedMerchant.value?.tenant?.id || 0);
  couponLoading.value = true;
  couponError.value = "";
  coupons.value = [];
  try {
    const result = await api.get<any, any[]>("/admin/mall/coupons", { params: currentMallParams({ status: couponFilters.status || undefined, keyword: couponFilters.keyword.trim() || undefined }) });
    if (sequence !== couponLoadSequence || !merchantContextMatches(merchantId, tenantId)) return;
    if (!Array.isArray(result)) throw new Error("优惠券列表响应格式无效");
    coupons.value = result;
  } catch (error: any) {
    if (sequence !== couponLoadSequence || !merchantContextMatches(merchantId, tenantId)) return;
    couponError.value = requestErrorText(error, "加载优惠券失败");
  } finally {
    if (sequence === couponLoadSequence) couponLoading.value = false;
  }
}
async function loadFlashSales() {
  if (blockInvalidMerchantLink()) return;
  const sequence = ++flashSaleLoadSequence;
  const merchantId = Number(filters.merchantId || 0);
  const tenantId = Number(filters.tenantId || selectedMerchant.value?.tenant?.id || 0);
  flashSaleLoading.value = true;
  flashSaleError.value = "";
  flashSales.value = [];
  try {
    const result = await api.get<any, any[]>("/admin/mall/flash-sales", { params: currentMallParams({ status: flashSaleFilters.status || undefined, keyword: flashSaleFilters.keyword.trim() || undefined }) });
    if (sequence !== flashSaleLoadSequence || !merchantContextMatches(merchantId, tenantId)) return;
    if (!Array.isArray(result)) throw new Error("秒杀活动响应格式无效");
    flashSales.value = result;
  } catch (error: any) {
    if (sequence !== flashSaleLoadSequence || !merchantContextMatches(merchantId, tenantId)) return;
    flashSaleError.value = requestErrorText(error, "加载秒杀活动失败");
  } finally {
    if (sequence === flashSaleLoadSequence) flashSaleLoading.value = false;
  }
}
async function loadGroupBuys() {
  if (blockInvalidMerchantLink()) return;
  const sequence = ++groupBuyLoadSequence;
  const merchantId = Number(filters.merchantId || 0);
  const tenantId = Number(filters.tenantId || selectedMerchant.value?.tenant?.id || 0);
  groupBuyLoading.value = true;
  groupBuyError.value = "";
  groupBuys.value = [];
  try {
    const result = await api.get<any, any[]>("/admin/mall/group-buys", { params: currentMallParams({ status: groupBuyFilters.status || undefined, keyword: groupBuyFilters.keyword.trim() || undefined }) });
    if (sequence !== groupBuyLoadSequence || !merchantContextMatches(merchantId, tenantId)) return;
    if (!Array.isArray(result)) throw new Error("拼团活动响应格式无效");
    groupBuys.value = result;
  } catch (error: any) {
    if (sequence !== groupBuyLoadSequence || !merchantContextMatches(merchantId, tenantId)) return;
    groupBuyError.value = requestErrorText(error, "加载拼团活动失败");
  } finally {
    if (sequence === groupBuyLoadSequence) groupBuyLoading.value = false;
  }
}
async function loadGroupBuyRecords() {
  if (blockInvalidMerchantLink()) return;
  const sequence = ++groupBuyRecordLoadSequence;
  const merchantId = Number(filters.merchantId || 0);
  const tenantId = Number(filters.tenantId || selectedMerchant.value?.tenant?.id || 0);
  groupBuyRecordLoading.value = true;
  groupBuyRecordError.value = "";
  groupBuyRecords.value = [];
  try {
    const result = await api.get<any, any[]>("/admin/mall/group-buy-records", { params: currentMallParams({ status: groupBuyRecordFilters.status || undefined, keyword: groupBuyRecordFilters.keyword.trim() || undefined }) });
    if (sequence !== groupBuyRecordLoadSequence || !merchantContextMatches(merchantId, tenantId)) return;
    if (!Array.isArray(result)) throw new Error("参团记录响应格式无效");
    groupBuyRecords.value = result;
  } catch (error: any) {
    if (sequence !== groupBuyRecordLoadSequence || !merchantContextMatches(merchantId, tenantId)) return;
    groupBuyRecordError.value = requestErrorText(error, "加载参团记录失败");
  } finally {
    if (sequence === groupBuyRecordLoadSequence) groupBuyRecordLoading.value = false;
  }
}
async function loadCouponUsages() {
  if (blockInvalidMerchantLink()) return;
  const sequence = ++couponUsageLoadSequence;
  const merchantId = Number(filters.merchantId || 0);
  const tenantId = Number(filters.tenantId || selectedMerchant.value?.tenant?.id || 0);
  couponUsageLoading.value = true;
  couponUsageError.value = "";
  couponUsages.value = [];
  try {
    const result = await api.get<any, any[]>("/admin/mall/coupon-usages", { params: currentMallParams({ status: couponUsageFilters.status || undefined, keyword: couponUsageFilters.keyword.trim() || couponFilters.keyword.trim() || undefined }) });
    if (sequence !== couponUsageLoadSequence || !merchantContextMatches(merchantId, tenantId)) return;
    if (!Array.isArray(result)) throw new Error("优惠券使用记录响应格式无效");
    couponUsages.value = result;
  } catch (error: any) {
    if (sequence !== couponUsageLoadSequence || !merchantContextMatches(merchantId, tenantId)) return;
    couponUsageError.value = requestErrorText(error, "加载优惠券使用记录失败");
  } finally {
    if (sequence === couponUsageLoadSequence) couponUsageLoading.value = false;
  }
}
async function loadAgents() {
  if (blockInvalidMerchantLink()) return;
  const sequence = ++agentLoadSequence;
  const merchantId = Number(filters.merchantId || 0);
  const tenantId = Number(filters.tenantId || selectedMerchant.value?.tenant?.id || 0);
  agentError.value = "";
  agents.value = [];
  try {
    const result = await api.get<any, any[] | { items?: any[] }>("/admin/agents", { params: { includeDisabled: true, tenantId: isPlatformAdmin() ? tenantId || undefined : undefined, page: 1, pageSize: 100 } });
    if (sequence !== agentLoadSequence || !merchantContextMatches(merchantId, tenantId)) return;
    const items = Array.isArray(result) ? result : result?.items;
    if (!Array.isArray(items)) throw new Error("推广代理选项响应格式无效");
    agents.value = items;
  } catch (error: any) {
    if (sequence !== agentLoadSequence || !merchantContextMatches(merchantId, tenantId)) return;
    agentError.value = requestErrorText(error, "加载推广代理选项失败");
  }
}
async function loadPromotionCodes() {
  if (blockInvalidMerchantLink()) return;
  const sequence = ++promotionLoadSequence;
  const merchantId = Number(filters.merchantId || 0);
  const tenantId = Number(filters.tenantId || selectedMerchant.value?.tenant?.id || 0);
  promotionLoading.value = true;
  promotionError.value = "";
  promotionCodes.value = [];
  try {
    const result = await api.get<any, any[]>("/admin/mall/promotion-codes", { params: currentMallParams({ enabled: promotionFilters.enabled || undefined, keyword: promotionFilters.keyword.trim() || undefined }) });
    if (sequence !== promotionLoadSequence || !merchantContextMatches(merchantId, tenantId)) return;
    if (!Array.isArray(result)) throw new Error("推广码响应格式无效");
    promotionCodes.value = result;
  } catch (error: any) {
    if (sequence !== promotionLoadSequence || !merchantContextMatches(merchantId, tenantId)) return;
    promotionError.value = requestErrorText(error, "加载推广码失败");
  } finally {
    if (sequence === promotionLoadSequence) promotionLoading.value = false;
  }
}
function reload() {
  if (blockInvalidMerchantLink()) return;
  const panel = activePanel.value;
  if (panel === "refunds") {
    loadRefunds();
    return;
  }
  if (panel === "logistics") {
    loadLogisticsCompanies();
    return;
  }
  if (panel === "marketing") {
    loadCouponOptions();
    loadCoupons();
    loadFlashSales();
    loadGroupBuys();
    loadPromotionCodes();
    return;
  }
  if (panel === "payment-logs") {
    loadPaymentData();
    return;
  }
  if (panel === "settlements") {
    loadSettlements();
    return;
  }
  if (panel === "statistics") {
    loadOrders();
    loadAnalytics();
    return;
  }
  if (panel === "finance") {
    loadAnalytics();
    loadPaymentData();
    return;
  }
  loadOrders();
  loadAnalytics();
}
async function openRoutePanel() {
  if (blockInvalidMerchantLink()) return;
  const panel = activePanel.value;
  if (panel === "refunds") {
    refundFilters.status = refundFilters.status || "pending";
    filters.refundStatus = filters.refundStatus || "pending";
    await loadRefunds();
  }
  if (panel === "logistics") openLogisticsDialog();
  if (panel === "marketing") openFlashSaleDialog();
  if (panel === "payment-logs" || panel === "finance") await loadPaymentData();
  if (panel === "settlements") await loadSettlements();
  if (panel === "statistics") await loadAnalytics();
}
async function exportOrders() {
  if (blockInvalidMerchantLink()) return ElMessage.error("当前订单管理店铺链接不可用，请先确认店铺授权后再导出。");
  try {
    const clean = new URLSearchParams();
    const params = orderQueryParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== "") clean.set(key, String(value));
    });
    await downloadFile(`/admin/mall/orders/export?${clean.toString()}`, "mall-orders.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出失败");
  }
}
async function exportRefunds() {
  if (blockInvalidMerchantLink()) return ElMessage.error("当前订单管理店铺链接不可用，请先确认店铺授权后再导出。");
  try {
    const clean = new URLSearchParams();
    appendCurrentMallParams(clean);
    if (refundFilters.status) clean.set("status", refundFilters.status);
    if (filters.paymentMethod) clean.set("paymentMethod", filters.paymentMethod);
    if (filters.checkoutGroupNo.trim()) clean.set("checkoutGroupNo", filters.checkoutGroupNo.trim());
    if (filters.startDate) clean.set("startDate", filters.startDate);
    if (filters.endDate) clean.set("endDate", filters.endDate);
    const keyword = refundFilters.keyword.trim() || filters.keyword.trim();
    if (keyword) clean.set("keyword", keyword);
    await downloadFile(`/admin/mall/refunds/export?${clean.toString()}`, "mall-refunds.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出售后失败");
  }
}
async function exportPaymentTransactions() {
  if (blockInvalidMerchantLink()) return ElMessage.error("当前订单管理店铺链接不可用，请先确认店铺授权后再导出。");
  try {
    const clean = new URLSearchParams();
    appendCurrentMallParams(clean);
    if (paymentFilters.status) clean.set("status", paymentFilters.status);
    if (filters.paymentMethod) clean.set("paymentMethod", filters.paymentMethod);
    if (filters.checkoutGroupNo.trim()) clean.set("checkoutGroupNo", filters.checkoutGroupNo.trim());
    if (filters.startDate) clean.set("startDate", filters.startDate);
    if (filters.endDate) clean.set("endDate", filters.endDate);
    const keyword = paymentKeyword.value.trim() || filters.keyword.trim();
    if (keyword) clean.set("keyword", keyword);
    await downloadFile(`/admin/mall/payment-transactions/export?${clean.toString()}`, "mall-payment-transactions.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出支付流水失败");
  }
}
async function exportPaymentCallbackLogs() {
  if (blockInvalidMerchantLink()) return ElMessage.error("当前订单管理店铺链接不可用，请先确认店铺授权后再导出。");
  try {
    const clean = new URLSearchParams();
    appendCurrentMallParams(clean);
    if (callbackFilters.status) clean.set("status", callbackFilters.status);
    if (filters.checkoutGroupNo.trim()) clean.set("checkoutGroupNo", filters.checkoutGroupNo.trim());
    if (filters.startDate) clean.set("startDate", filters.startDate);
    if (filters.endDate) clean.set("endDate", filters.endDate);
    const keyword = paymentKeyword.value.trim() || filters.keyword.trim();
    if (keyword) clean.set("keyword", keyword);
    await downloadFile(`/admin/mall/payment-callback-logs/export?${clean.toString()}`, "mall-payment-callback-logs.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出支付回调失败");
  }
}
async function exportCommissions() {
  if (blockInvalidMerchantLink()) return ElMessage.error("当前订单管理店铺链接不可用，请先确认店铺授权后再导出。");
  try {
    const clean = new URLSearchParams();
    appendCurrentMallParams(clean);
    if (commissionFilters.status) clean.set("status", commissionFilters.status);
    if (filters.checkoutGroupNo.trim()) clean.set("checkoutGroupNo", filters.checkoutGroupNo.trim());
    const keyword = paymentKeyword.value.trim() || filters.keyword.trim();
    if (keyword) clean.set("keyword", keyword);
    await downloadFile(`/admin/mall/commissions/export?${clean.toString()}`, "mall-commissions.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出佣金失败");
  }
}
async function exportCommissionPromoters() {
  if (blockInvalidMerchantLink()) return ElMessage.error("当前订单管理店铺链接不可用，请先确认店铺授权后再导出。");
  try {
    const clean = new URLSearchParams();
    appendCurrentMallParams(clean);
    if (commissionFilters.status) clean.set("status", commissionFilters.status);
    if (filters.checkoutGroupNo.trim()) clean.set("checkoutGroupNo", filters.checkoutGroupNo.trim());
    const keyword = paymentKeyword.value.trim() || filters.keyword.trim();
    if (keyword) clean.set("keyword", keyword);
    await downloadFile(`/admin/mall/commissions/by-promoter/export?${clean.toString()}`, "mall-commission-promoters.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出佣金汇总失败");
  }
}
async function closeExpiredOrders() {
  if (!canManageOrders.value) return ElMessage.error("当前账号无商城订单处理权限");
  if (!requireOpenMerchant("清理超时订单")) return;
  try {
    await ElMessageBox.confirm("系统会扫描超过配置时间仍待支付/待确认的商城订单，自动关闭并释放库存和优惠券占用。确认立即执行一次？", "清理超时订单", { type: "warning", confirmButtonText: "立即清理", cancelButtonText: "取消" });
    closingExpired.value = true;
    const result = await api.post<any, any>("/admin/mall/orders/close-expired");
    const summary = `共 ${result.batchCount || 0} 批，检查 ${result.checkedCount || 0} 单，关闭 ${result.closedCount || 0} 单，并发跳过 ${result.skippedConcurrentCount || 0} 单`;
    if (Number(result.failedCount || 0) > 0 || result.hasMore) {
      const failedOrders = (result.failures || []).map((item: any) => item.orderNo).filter(Boolean).join("、");
      ElMessage.error(`清理未完全收口：${summary}，失败 ${result.failedCount || 0} 单${failedOrders ? `（${failedOrders}）` : ""}${result.hasMore ? "，仍有后续批次" : ""}，请查看操作日志后重试`);
    } else {
      ElMessage.success(`清理完成：${summary}`);
    }
    await reload();
  } catch (error: any) {
    if (error === "cancel") return;
    ElMessage.error(error.message || "清理失败");
  } finally {
    closingExpired.value = false;
  }
}
async function failExpiredGroupBuys() {
  if (!canManageProducts.value) return ElMessage.error("当前账号无商城营销管理权限");
  if (!requireOpenMerchant("处理未成团拼团")) return;
  try {
    await ElMessageBox.confirm("系统会扫描已过结束时间但仍未成团的拼团队伍。余额支付订单会自动退款并回补库存；其他支付方式会标记未成团并保留人工处理。确认立即执行一次？", "处理未成团拼团", { type: "warning", confirmButtonText: "立即处理", cancelButtonText: "取消" });
    failingGroupBuys.value = true;
    const result = await api.post<any, any>("/admin/mall/group-buys/fail-expired");
    ElMessage.success(`处理完成：检查 ${result.checkedTeamCount || 0} 团，失败 ${result.failedTeamCount || 0} 团，自动退款 ${result.refundedOrderCount || 0} 单，待人工 ${result.manualRefundOrderCount || 0} 单，跳过 ${result.skippedOrderCount || 0} 单`);
    await reload();
    if (groupBuyRecordDialogVisible.value) await loadGroupBuyRecords();
  } catch (error: any) {
    if (error === "cancel") return;
    ElMessage.error(error.message || "处理未成团失败");
  } finally {
    failingGroupBuys.value = false;
  }
}
async function completeExpiredShippedOrders() {
  if (!canManageOrders.value) return ElMessage.error("当前账号无商城订单处理权限");
  if (!requireOpenMerchant("自动完成已发货订单")) return;
  try {
    await ElMessageBox.confirm("系统会扫描超过配置天数仍未确认收货的已发货订单，自动标记为已完成。售后中的订单不会被处理。确认立即执行一次？", "自动完成已发货订单", { type: "warning", confirmButtonText: "立即执行", cancelButtonText: "取消" });
    completingShipped.value = true;
    const result = await api.post<any, any>("/admin/mall/orders/complete-expired-shipped");
    ElMessage.success(`处理完成：检查 ${result.checkedCount || 0} 单，完成 ${result.completedCount || 0} 单，规则 ${result.shippedDays || 0} 天`);
    await reload();
  } catch (error: any) {
    if (error === "cancel") return;
    ElMessage.error(error.message || "自动完成失败");
  } finally {
    completingShipped.value = false;
  }
}
async function refreshCurrentOrder(id: number) {
  if (!detailVisible.value || Number(detailTargetRow.value?.id || 0) !== Number(id)) return;
  const next = orders.value.find((item) => item.id === id) || detailTargetRow.value;
  if (next) await loadOrderDetail(next);
}
function currentTenantParams(extra: Record<string, any> = {}) {
  return {
    tenantId: isPlatformAdmin() ? filters.tenantId || selectedMerchant.value?.tenant?.id : undefined,
    ...extra
  };
}
async function loadOrderDetail(row: any) {
  const orderId = Number(row?.id || 0);
  if (!orderId) return;
  const sequence = ++detailLoadSequence;
  detailTargetRow.value = row;
  detailVisible.value = true;
  detailLoading.value = true;
  detailError.value = "";
  checkoutGroupError.value = "";
  currentOrder.value = null;
  checkoutGroupOrders.value = [];
  checkoutGroupLoadSequence += 1;
  try {
    const result = await api.get<any, any>(`/admin/mall/orders/${orderId}`);
    if (sequence !== detailLoadSequence || !detailVisible.value || Number(detailTargetRow.value?.id || 0) !== orderId) return;
    if (!result || typeof result !== "object" || Number(result.id || 0) !== orderId) throw new Error("商城订单详情响应格式无效");
    currentOrder.value = result;
    await loadCheckoutGroupOrders(result);
  } catch (error: any) {
    if (sequence !== detailLoadSequence || !detailVisible.value || Number(detailTargetRow.value?.id || 0) !== orderId) return;
    detailError.value = requestErrorText(error, "加载商城订单详情失败");
  } finally {
    if (sequence === detailLoadSequence) detailLoading.value = false;
  }
}
async function openDetail(row: any) {
  await loadOrderDetail(row);
}
async function retryCurrentOrderDetail() {
  if (detailTargetRow.value) await loadOrderDetail(detailTargetRow.value);
}
async function loadCheckoutGroupOrders(row: any) {
  const orderId = Number(row?.id || 0);
  const groupNo = row?.checkoutGroup?.groupNo;
  const sequence = ++checkoutGroupLoadSequence;
  checkoutGroupOrders.value = [];
  checkoutGroupError.value = "";
  if (!groupNo || !orderId) return;
  checkoutGroupLoading.value = true;
  try {
    const params = {
      tenantId: isPlatformAdmin() ? row?.tenant?.id || filters.tenantId || undefined : undefined,
      merchantId: !isPlatformAdmin() && filters.merchantId ? filters.merchantId : undefined,
      checkoutGroupNo: groupNo,
      page: 1,
      pageSize: 100
    };
    const result = await api.get<any, any>("/admin/mall/orders", { params });
    if (sequence !== checkoutGroupLoadSequence || !detailVisible.value || Number(currentOrder.value?.id || 0) !== orderId || currentOrder.value?.checkoutGroup?.groupNo !== groupNo) return;
    if (!result || !Array.isArray(result.items)) throw new Error("跨店子订单响应格式无效");
    checkoutGroupOrders.value = result.items;
  } catch (error: any) {
    if (sequence !== checkoutGroupLoadSequence || !detailVisible.value || Number(currentOrder.value?.id || 0) !== orderId || currentOrder.value?.checkoutGroup?.groupNo !== groupNo) return;
    checkoutGroupError.value = requestErrorText(error, "加载跨店拆单失败");
  } finally {
    if (sequence === checkoutGroupLoadSequence) checkoutGroupLoading.value = false;
  }
}
async function selectCheckoutGroupOrder(row: any) {
  await loadOrderDetail(row);
}
function relatedOrderIdentity(row: any) {
  return row?.order?.id || row?.order?.orderNo || row?.orderNo || "";
}
function cachedMallOrders() {
  return [...orders.value, ...checkoutGroupOrders.value, ...(checkoutGroupTrace.value.orders || [])];
}
async function openRelatedOrder(row: any) {
  const related = row?.order || row;
  const orderId = related?.id;
  const orderNo = related?.orderNo || row?.orderNo;
  const cached = cachedMallOrders().find((item) => (orderId && item.id === orderId) || (orderNo && item.orderNo === orderNo));
  if (cached) {
    openDetail(cached);
    return;
  }
  if (!orderNo) {
    ElMessage.error("这条记录没有可定位的商城订单号");
    return;
  }
  try {
    const result = await api.get<any, any>("/admin/mall/orders", { params: currentMallParams({ keyword: orderNo, page: 1, pageSize: 10 }) });
    const order = (result.items || []).find((item: any) => item.orderNo === orderNo) || result.items?.[0];
    if (!order) {
      ElMessage.error("未找到对应商城订单，请检查当前店铺权限或筛选范围");
      return;
    }
    openDetail(order);
  } catch (error: any) {
    ElMessage.error(error.message || "打开商城订单失败");
  }
}
function openRefundOrder(row: any) {
  openRelatedOrder(row);
}
async function confirmOffline(row: any) {
  if (!canManageOrders.value) return ElMessage.error("当前账号无商城订单处理权限");
  try {
    await ElMessageBox.confirm(`确认商城订单 ${row.orderNo} 已线下收款？`, "确认收款", { type: "warning" });
    await api.post(`/admin/mall/orders/${row.id}/confirm-offline-payment`);
    ElMessage.success("已确认收款");
    await loadOrders();
    refreshCurrentOrder(row.id);
  } catch (error: any) {
    if (error === "cancel") return;
    ElMessage.error(error.message || "确认失败");
  }
}
async function closeOrder(row: any) {
  if (!canManageOrders.value) return ElMessage.error("当前账号无商城订单处理权限");
  try {
    const result = await ElMessageBox.prompt("请输入关闭原因，关闭后会释放已锁定库存，订单不可继续支付。", `关闭订单 ${row.orderNo}`, { inputValue: "后台确认关闭", confirmButtonText: "确认关闭", cancelButtonText: "取消", inputValidator: (value) => Boolean(String(value || "").trim()) || "请填写关闭原因" });
    await api.post(`/admin/mall/orders/${row.id}/close`, { reason: result.value?.trim() || "后台确认关闭" });
    ElMessage.success("订单已关闭，库存已释放");
    await loadOrders();
    refreshCurrentOrder(row.id);
  } catch (error: any) {
    if (error === "cancel") return;
    ElMessage.error(error.message || "关闭失败");
  }
}
async function openShip(row: any) {
  if (!canManageOrders.value) return ElMessage.error("当前账号无商城订单处理权限");
  const orderId = Number(row?.id || 0);
  if (!orderId) return ElMessage.error("发货订单标识无效");
  const sequence = ++shipLoadSequence;
  shipTargetRow.value = row;
  shipOrderTarget.value = null;
  shipError.value = "";
  shipLogisticsError.value = "";
  shipLogisticsCompanies.value = [];
  Object.assign(shipForm, { shipmentId: null, businessKey: "", expressCompany: "", expressNo: "", remark: "", reason: "", items: [] });
  shipDialogVisible.value = true;
  shipLoading.value = true;
  try {
    const detail = await api.get<any, any>(`/admin/mall/orders/${orderId}`);
    if (sequence !== shipLoadSequence || !shipDialogVisible.value || Number(shipTargetRow.value?.id || 0) !== orderId) return;
    if (!detail || typeof detail !== "object" || Number(detail.id || 0) !== orderId || !Array.isArray(detail.items)) throw new Error("发货订单详情响应格式无效");
    shipOrderTarget.value = detail;
    Object.assign(shipForm, { shipmentId: null, businessKey: createShipmentBusinessKey(detail.id), expressCompany: "", expressNo: "", remark: "", reason: "", items: detail.items.map((item: any) => {
      const shippedQuantity = orderItemShippedQuantity(detail, item.id);
      const totalQuantity = Number(item.quantity || 0);
      const remainingQuantity = Math.max(totalQuantity - shippedQuantity, 0);
      return { orderItemId: item.id, productTitle: item.productTitle, skuName: item.skuName, shippedQuantity, totalQuantity, remainingQuantity, quantity: remainingQuantity };
    }).filter((item: any) => item.remainingQuantity > 0) });
    await loadShipLogisticsCompanies(detail);
  } catch (error: any) {
    if (sequence !== shipLoadSequence || !shipDialogVisible.value || Number(shipTargetRow.value?.id || 0) !== orderId) return;
    shipError.value = requestErrorText(error, "加载发货订单失败");
  } finally {
    if (sequence === shipLoadSequence) shipLoading.value = false;
  }
}
function openEditShipment(shipment: any) {
  if (!canManageLogistics.value) return ElMessage.error("当前账号无商城物流管理权限");
  if (!currentOrder.value?.id) return ElMessage.error("当前订单详情不可用，请重新加载后再修改物流");
  shipLoadSequence += 1;
  shipTargetRow.value = currentOrder.value;
  shipOrderTarget.value = currentOrder.value;
  shipError.value = "";
  shipLogisticsError.value = "";
  shipLogisticsCompanies.value = [];
  Object.assign(shipForm, { shipmentId: shipment.id, businessKey: "", expressCompany: shipment.expressCompany || "", expressNo: shipment.expressNo || "", remark: "", reason: "", items: [] });
  shipDialogVisible.value = true;
  loadShipLogisticsCompanies(currentOrder.value);
}
async function shipOrder() {
  if (!canManageOrders.value && !shipForm.shipmentId) return ElMessage.error("当前账号无商城订单处理权限");
  if (!canManageLogistics.value && shipForm.shipmentId) return ElMessage.error("当前账号无商城物流管理权限");
  if (!shipForm.expressNo.trim()) return ElMessage.error("请输入快递单号");
  const orderId = Number(shipOrderTarget.value?.id || 0);
  if (!orderId || Number(shipTargetRow.value?.id || 0) !== orderId) return ElMessage.error("发货订单上下文已失效，请关闭弹窗后重新打开");
  if (shipError.value || shipLogisticsError.value) return ElMessage.error("发货上下文尚未恢复，请先重新加载失败分区");
  if (shipForm.shipmentId && !shipForm.reason.trim()) return ElMessage.error("请填写修改物流单号的原因");
  const selectedItems = (shipForm.items || []).filter((item: any) => Number(item.quantity || 0) > 0).map((item: any) => ({ orderItemId: item.orderItemId, quantity: Number(item.quantity) }));
  if (!shipForm.shipmentId && !selectedItems.length) return ElMessage.error("请至少选择一个商品数量发货");
  try {
    if (shipForm.shipmentId) await api.patch(`/admin/mall/orders/${orderId}/shipments/${shipForm.shipmentId}`, { expressCompany: shipForm.expressCompany, expressNo: shipForm.expressNo, reason: shipForm.reason });
    else await api.post(`/admin/mall/orders/${orderId}/ship`, { businessKey: shipForm.businessKey, expressCompany: shipForm.expressCompany, expressNo: shipForm.expressNo, remark: shipForm.remark, items: selectedItems });
    ElMessage.success(shipForm.shipmentId ? "物流单号已修改" : "包裹已创建");
    shipDialogVisible.value = false;
    await loadOrders();
    refreshCurrentOrder(orderId);
  } catch (error: any) {
    ElMessage.error(error.message || "发货失败");
  }
}
async function syncShipmentTracking(shipment: any) {
  if (!canManageLogistics.value) return ElMessage.error("当前账号无商城物流管理权限");
  try {
    const result = await api.post<any, any>(`/admin/mall/orders/${currentOrder.value.id}/shipments/${shipment.id}/sync-tracking`);
    ElMessage.success(`物流轨迹已同步，新增 ${result.addedCount || 0} 条`);
    currentOrder.value = result.order;
    await loadOrders();
  } catch (error: any) {
    ElMessage.error(error.message || "同步物流轨迹失败");
  }
}
async function approveRefund(row: any) {
  if (!canManageRefunds.value) return ElMessage.error("当前账号无商城售后处理权限");
  try {
    let returnAddress: any = undefined;
    if (["return_refund", "exchange"].includes(row.type)) {
      const result = await ElMessageBox.prompt("请输入退货地址，格式：收件人|电话|省|市|区|详细地址", row.type === "exchange" ? "同意换货" : "同意退货退款", { inputValue: "售后收货人|||||", inputValidator: (value) => String(value || "").split("|").length >= 6 || "请按指定格式填写完整地址" });
      const [receiverName, receiverPhone, province, city, district, detail] = String(result.value || "").split("|").map((item) => item.trim());
      returnAddress = { receiverName, receiverPhone, province, city, district, detail };
    } else {
      await ElMessageBox.confirm(`确认通过售后 ${row.refundNo}？系统会按支付方式发起退款，并仅回补符合条件的商品库存。`, "通过售后", { type: "warning" });
    }
    await api.post(`/admin/mall/refunds/${row.id}/approve`, { remark: row.status === "platform_intervening" ? "平台介入裁决通过" : "后台审核通过", responsibility: row.status === "platform_intervening" ? "merchant" : "undetermined", returnAddress });
    ElMessage.success(row.type === "refund_only" ? "退款已进入处理" : "已同意售后，等待买家寄回");
    reload();
  } catch (error: any) {
    if (error === "cancel") return;
    ElMessage.error(error.message || "处理失败");
  }
}
async function receiveRefundReturn(row: any) {
  if (!canManageRefunds.value) return ElMessage.error("当前账号无商城售后处理权限");
  try {
    const result = await ElMessageBox.prompt(`确认已收到售后 ${row.refundNo} 的退货商品？退货退款将进入原路退款，换货将进入待发货。`, "确认退货收货", { inputValue: "已核对商品和数量，确认收货", inputValidator: (value) => Boolean(String(value || "").trim()) || "请填写验收说明" });
    await api.post(`/admin/mall/refunds/${row.id}/receive-return`, { remark: result.value, responsibility: "merchant" });
    ElMessage.success(row.type === "exchange" ? "已确认收货，请寄出换货商品" : "已确认收货，退款已进入处理");
    reload();
  } catch (error: any) { if (error !== "cancel") ElMessage.error(error.message || "确认收货失败"); }
}
async function shipRefundExchange(row: any) {
  if (!canManageRefunds.value) return ElMessage.error("当前账号无商城售后处理权限");
  try {
    const result = await ElMessageBox.prompt("请输入换货物流，格式：快递公司|物流单号", `寄出换货商品 ${row.refundNo}`, { inputValidator: (value) => String(value || "").split("|").filter(Boolean).length >= 2 || "请填写快递公司和物流单号" });
    const [expressCompany, expressNo] = String(result.value || "").split("|").map((item) => item.trim());
    await api.post(`/admin/mall/refunds/${row.id}/ship-exchange`, { expressCompany, expressNo, businessKey: `exchange:${row.id}`, remark: "售后换货发货" });
    ElMessage.success("换货商品已寄出");
    reload();
  } catch (error: any) { if (error !== "cancel") ElMessage.error(error.message || "换货发货失败"); }
}
async function addRefundMessage(row: any) {
  if (!canManageRefunds.value) return ElMessage.error("当前账号无商城售后处理权限");
  try {
    const result = await ElMessageBox.prompt("请输入要发送给买家的协商说明或补充材料说明。", `售后协商 ${row.refundNo}`, { inputValidator: (value) => Boolean(String(value || "").trim()) || "请填写协商内容" });
    await api.post(`/admin/mall/refunds/${row.id}/messages`, { content: result.value, images: [] });
    ElMessage.success("协商记录已发送");
    reload();
  } catch (error: any) { if (error !== "cancel") ElMessage.error(error.message || "发送失败"); }
}
async function retryRefund(row: any) {
  if (!canManageRefunds.value) return ElMessage.error("当前账号无商城售后处理权限");
  try {
    const result = await ElMessageBox.prompt(`确认重试售后 ${row.refundNo} 的退款？系统会重新调用当前退款通道并写入退款日志。`, "重试商城退款", { inputValue: "财务重试退款", confirmButtonText: "确认重试", cancelButtonText: "取消" });
    await api.post(`/admin/mall/refunds/${row.id}/retry`, { remark: result.value || "财务重试退款" });
    ElMessage.success("退款重试已提交");
    reload();
  } catch (error: any) {
    if (error === "cancel") return;
    ElMessage.error(error.message || "重试失败");
  }
}
async function rejectRefund(row: any) {
  if (!canManageRefunds.value) return ElMessage.error("当前账号无商城售后处理权限");
  try {
    const result = await ElMessageBox.prompt("请输入拒绝原因，方便客服回访用户。", "拒绝售后", { inputValue: "后台审核拒绝", confirmButtonText: "确认拒绝", cancelButtonText: "取消" });
    await api.post(`/admin/mall/refunds/${row.id}/reject`, { remark: result.value || "后台审核拒绝" });
    ElMessage.success("售后已拒绝");
    reload();
  } catch (error: any) {
    if (error === "cancel") return;
    ElMessage.error(error.message || "处理失败");
  }
}
function openLogisticsDialog() {
  if (!canManageLogistics.value) return ElMessage.error("当前账号无商城物流管理权限");
  if (!requireMerchantSelection("配置物流")) return;
  resetLogisticsForm();
  logisticsDialogVisible.value = true;
  loadLogisticsCompanies();
}
function openCouponDialog() {
  if (!canManageProducts.value) return ElMessage.error("当前账号无商城营销管理权限");
  if (!requireMerchantSelection("配置优惠券")) return;
  resetCouponForm();
  couponDialogVisible.value = true;
  loadCouponOptions();
  loadCoupons();
  loadCouponUsages();
}
function openFlashSaleDialog() {
  if (!canManageProducts.value) return ElMessage.error("当前账号无商城营销管理权限");
  if (!requireMerchantSelection("配置秒杀活动")) return;
  resetFlashSaleForm();
  flashSaleDialogVisible.value = true;
  loadCouponOptions();
  loadFlashSales();
}
function openGroupBuyDialog() {
  if (!canManageProducts.value) return ElMessage.error("当前账号无商城营销管理权限");
  if (!requireMerchantSelection("配置拼团活动")) return;
  resetGroupBuyForm();
  groupBuyDialogVisible.value = true;
  loadCouponOptions();
  loadGroupBuys();
}
function openGroupBuyRecordDialog() {
  groupBuyRecordDialogVisible.value = true;
  loadGroupBuyRecords();
}
function openPromotionDialog() {
  if (!canManageProducts.value) return ElMessage.error("当前账号无商城营销管理权限");
  if (!requireMerchantSelection("配置推广码")) return;
  resetPromotionForm();
  promotionDialogVisible.value = true;
  loadAgents();
  loadPromotionCodes();
}
function resetLogisticsForm() {
  Object.assign(logisticsForm, { id: null, name: "", code: "", servicePhone: "", trackingUrl: "", sortOrder: 0, enabled: true });
}
function resetCouponForm() {
  Object.assign(couponForm, { id: null, code: "", name: "", issuerScope: "merchant", refundReleasePolicy: "full_refund", minAmount: 0, discountAmount: 0, scope: "all", scopeCategoryId: null, scopeProductId: null, issuanceLimit: 0, claimedCount: 0, usageLimit: 0, perUserLimit: 0, startsAt: "", endsAt: "", enabled: true });
}
function resetFlashSaleForm() {
  Object.assign(flashSaleForm, { id: null, title: "", productId: null, skuId: null, salePrice: 0, saleStock: 1, perUserLimit: 1, startsAt: "", endsAt: "", status: "draft", sortOrder: 0 });
}
function resetGroupBuyForm() {
  Object.assign(groupBuyForm, { id: null, title: "", productId: null, skuId: null, groupPrice: 0, minPeople: 2, groupStock: 1, perUserLimit: 1, startsAt: "", endsAt: "", status: "draft", sortOrder: 0 });
}
function resetPromotionForm() {
  Object.assign(promotionForm, { id: null, code: "", name: "", commissionRatePercent: 0, promoterUserId: null, agentId: null, startsAt: "", endsAt: "", enabled: true, remark: "" });
}
function editLogisticsCompany(row: any) {
  if (!requireMerchantSelection("配置物流")) return;
  Object.assign(logisticsForm, { id: row.id, name: row.name, code: row.code || "", servicePhone: row.servicePhone || "", trackingUrl: row.trackingUrl || "", sortOrder: Number(row.sortOrder || 0), enabled: row.enabled });
}
function editCoupon(row: any) {
  if (!requireMerchantSelection("配置优惠券")) return;
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
}
function editFlashSale(row: any) {
  if (!requireMerchantSelection("配置秒杀活动")) return;
  Object.assign(flashSaleForm, {
    id: row.id,
    title: row.title || "",
    productId: row.product?.id || row.productId || null,
    skuId: row.sku?.id || row.skuId || null,
    salePrice: Number(row.salePrice || 0),
    saleStock: Number(row.saleStock || 1),
    perUserLimit: Number(row.perUserLimit || 0),
    startsAt: row.startsAt ? String(row.startsAt).slice(0, 19).replace("T", " ") : "",
    endsAt: row.endsAt ? String(row.endsAt).slice(0, 19).replace("T", " ") : "",
    status: row.status || "draft",
    sortOrder: Number(row.sortOrder || 0)
  });
}
function editGroupBuy(row: any) {
  if (!requireMerchantSelection("配置拼团活动")) return;
  Object.assign(groupBuyForm, {
    id: row.id,
    title: row.title || "",
    productId: row.product?.id || row.productId || null,
    skuId: row.sku?.id || row.skuId || null,
    groupPrice: Number(row.groupPrice || 0),
    minPeople: Number(row.minPeople || 2),
    groupStock: Number(row.groupStock || 1),
    perUserLimit: Number(row.perUserLimit || 0),
    startsAt: row.startsAt ? String(row.startsAt).slice(0, 19).replace("T", " ") : "",
    endsAt: row.endsAt ? String(row.endsAt).slice(0, 19).replace("T", " ") : "",
    status: row.status || "draft",
    sortOrder: Number(row.sortOrder || 0)
  });
}
function editPromotionCode(row: any) {
  if (!requireMerchantSelection("配置推广码")) return;
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
    remark: row.remark || ""
  });
}
async function saveLogisticsCompany() {
  if (!canManageLogistics.value) return ElMessage.error("当前账号无商城物流管理权限");
  if (!requireMerchantSelection("配置物流")) return;
  if (!logisticsForm.name?.trim()) return ElMessage.error("请输入物流公司名称");
  logisticsSaving.value = true;
  try {
    const payload = {
      ...currentMallParams(),
      name: logisticsForm.name.trim(),
      code: logisticsForm.code?.trim() || undefined,
      servicePhone: logisticsForm.servicePhone?.trim() || undefined,
      trackingUrl: logisticsForm.trackingUrl?.trim() || undefined,
      sortOrder: Number(logisticsForm.sortOrder || 0),
      enabled: logisticsForm.enabled
    };
    if (logisticsForm.id) await api.patch(`/admin/mall/logistics-companies/${logisticsForm.id}`, payload);
    else await api.post("/admin/mall/logistics-companies", payload);
    ElMessage.success("物流公司已保存");
    resetLogisticsForm();
    await loadLogisticsCompanies();
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  } finally {
    logisticsSaving.value = false;
  }
}
async function saveCoupon() {
  if (!canManageProducts.value) return ElMessage.error("当前账号无商城营销管理权限");
  if (!requireMerchantSelection("配置优惠券")) return;
  if (!couponForm.code?.trim()) return ElMessage.error("请输入优惠券码");
  if (!couponForm.name?.trim()) return ElMessage.error("请输入优惠券名称");
  if (Number(couponForm.discountAmount || 0) <= 0) return ElMessage.error("优惠金额必须大于 0");
  if (couponForm.scope === "category" && !couponForm.scopeCategoryId) return ElMessage.error("请选择适用分类");
  if (couponForm.scope === "product" && !couponForm.scopeProductId) return ElMessage.error("请选择适用商品");
  if (!validOptionalTimeRange(couponForm.startsAt, couponForm.endsAt, "优惠券")) return;
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
    if (couponForm.id) await api.patch(`/admin/mall/coupons/${couponForm.id}`, payload);
    else await api.post("/admin/mall/coupons", payload);
    ElMessage.success("优惠券已保存");
    resetCouponForm();
    await Promise.all([loadCoupons(), loadCouponUsages()]);
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  } finally {
    couponSaving.value = false;
  }
}
async function saveFlashSale() {
  if (!canManageProducts.value) return ElMessage.error("当前账号无商城营销管理权限");
  if (!requireMerchantSelection("配置秒杀活动")) return;
  if (!flashSaleForm.title?.trim()) return ElMessage.error("请输入秒杀标题");
  if (!flashSaleForm.productId || !flashSaleForm.skuId) return ElMessage.error("请选择秒杀商品和规格");
  if (Number(flashSaleForm.salePrice || 0) <= 0) return ElMessage.error("秒杀价必须大于 0");
  if (Number(flashSaleForm.saleStock || 0) <= 0) return ElMessage.error("秒杀库存必须大于 0");
  if (!flashSaleForm.startsAt || !flashSaleForm.endsAt) return ElMessage.error("请设置秒杀时间");
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
    if (flashSaleForm.id) await api.patch(`/admin/mall/flash-sales/${flashSaleForm.id}`, payload);
    else await api.post("/admin/mall/flash-sales", payload);
    ElMessage.success("秒杀活动已保存");
    resetFlashSaleForm();
    await loadFlashSales();
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  } finally {
    flashSaleSaving.value = false;
  }
}
async function saveGroupBuy() {
  if (!canManageProducts.value) return ElMessage.error("当前账号无商城营销管理权限");
  if (!requireMerchantSelection("配置拼团活动")) return;
  if (!groupBuyForm.title?.trim()) return ElMessage.error("请输入拼团标题");
  if (!groupBuyForm.productId || !groupBuyForm.skuId) return ElMessage.error("请选择拼团商品和规格");
  if (Number(groupBuyForm.groupPrice || 0) <= 0) return ElMessage.error("拼团价必须大于 0");
  if (Number(groupBuyForm.minPeople || 0) < 2) return ElMessage.error("成团人数至少 2 人");
  if (Number(groupBuyForm.groupStock || 0) <= 0) return ElMessage.error("拼团库存必须大于 0");
  if (!groupBuyForm.startsAt || !groupBuyForm.endsAt) return ElMessage.error("请设置拼团时间");
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
    if (groupBuyForm.id) await api.patch(`/admin/mall/group-buys/${groupBuyForm.id}`, payload);
    else await api.post("/admin/mall/group-buys", payload);
    ElMessage.success("拼团活动已保存");
    resetGroupBuyForm();
    await loadGroupBuys();
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  } finally {
    groupBuySaving.value = false;
  }
}
async function savePromotionCode() {
  if (!canManageProducts.value) return ElMessage.error("当前账号无商城营销管理权限");
  if (!requireMerchantSelection("配置推广码")) return;
  if (!promotionForm.code?.trim()) return ElMessage.error("请输入推广码");
  if (!promotionForm.name?.trim()) return ElMessage.error("请输入推广码名称");
  if (!validOptionalTimeRange(promotionForm.startsAt, promotionForm.endsAt, "推广码")) return;
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
    if (promotionForm.id) await api.patch(`/admin/mall/promotion-codes/${promotionForm.id}`, payload);
    else await api.post("/admin/mall/promotion-codes", payload);
    ElMessage.success("推广码已保存");
    resetPromotionForm();
    await Promise.all([loadPromotionCodes(), loadPaymentData()]);
  } catch (error: any) {
    ElMessage.error(error.message || "保存失败");
  } finally {
    promotionSaving.value = false;
  }
}
async function toggleLogisticsCompany(row: any) {
  if (!canManageLogistics.value) return ElMessage.error("当前账号无商城物流管理权限");
  if (!requireMerchantSelection("配置物流")) return;
  try {
    await api.patch(`/admin/mall/logistics-companies/${row.id}`, {
      tenantId: isPlatformAdmin() ? row.tenant?.id || filters.tenantId : undefined,
      merchantId: row.merchant?.id || filters.merchantId || undefined,
      name: row.name,
      code: row.code || undefined,
      servicePhone: row.servicePhone || undefined,
      trackingUrl: row.trackingUrl || undefined,
      sortOrder: Number(row.sortOrder || 0),
      enabled: !row.enabled
    });
    ElMessage.success(row.enabled ? "物流公司已停用" : "物流公司已启用");
    await loadLogisticsCompanies();
  } catch (error: any) {
    ElMessage.error(error.message || "操作失败");
  }
}
async function toggleCoupon(row: any) {
  if (!canManageProducts.value) return ElMessage.error("当前账号无商城营销管理权限");
  if (!requireMerchantSelection("配置优惠券")) return;
  try {
    await api.patch(`/admin/mall/coupons/${row.id}`, {
      code: row.code,
      name: row.name,
      tenantId: isPlatformAdmin() ? row.tenant?.id || filters.tenantId : undefined,
      merchantId: row.merchant?.id || filters.merchantId || undefined,
      issuerScope: row.issuerScope === "platform" ? "platform" : "merchant",
      refundReleasePolicy: row.refundReleasePolicy === "never" ? "never" : "full_refund",
      minAmount: Number(row.minAmount || 0),
      discountAmount: Number(row.discountAmount || 0),
      scope: row.scope || "all",
      scopeCategoryId: row.scopeCategoryId || null,
      scopeProductId: row.scopeProductId || null,
      issuanceLimit: Number(row.issuanceLimit || 0),
      usageLimit: Number(row.usageLimit || 0),
      perUserLimit: Number(row.perUserLimit || 0),
      startsAt: row.startsAt || null,
      endsAt: row.endsAt || null,
      enabled: !row.enabled
    });
    ElMessage.success(row.enabled ? "优惠券已停用" : "优惠券已启用");
    await Promise.all([loadCoupons(), loadCouponUsages()]);
  } catch (error: any) {
    ElMessage.error(error.message || "操作失败");
  }
}
async function toggleFlashSale(row: any) {
  if (!canManageProducts.value) return ElMessage.error("当前账号无商城营销管理权限");
  if (!requireMerchantSelection("配置秒杀活动")) return;
  try {
    await api.patch(`/admin/mall/flash-sales/${row.id}`, {
      title: row.title,
      tenantId: isPlatformAdmin() ? row.tenant?.id || filters.tenantId : undefined,
      merchantId: row.merchant?.id || filters.merchantId || undefined,
      productId: row.product?.id,
      skuId: row.sku?.id,
      salePrice: Number(row.salePrice || 0),
      saleStock: Number(row.saleStock || 0),
      perUserLimit: Number(row.perUserLimit || 0),
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      status: row.status === "active" ? "disabled" : "active",
      sortOrder: Number(row.sortOrder || 0)
    });
    ElMessage.success(row.status === "active" ? "秒杀活动已停用" : "秒杀活动已启用");
    await loadFlashSales();
  } catch (error: any) {
    ElMessage.error(error.message || "操作失败");
  }
}
async function toggleGroupBuy(row: any) {
  if (!canManageProducts.value) return ElMessage.error("当前账号无商城营销管理权限");
  if (!requireMerchantSelection("配置拼团活动")) return;
  try {
    await api.patch(`/admin/mall/group-buys/${row.id}`, {
      title: row.title,
      tenantId: isPlatformAdmin() ? row.tenant?.id || filters.tenantId : undefined,
      merchantId: row.merchant?.id || filters.merchantId || undefined,
      productId: row.product?.id,
      skuId: row.sku?.id,
      groupPrice: Number(row.groupPrice || 0),
      minPeople: Number(row.minPeople || 2),
      groupStock: Number(row.groupStock || 0),
      perUserLimit: Number(row.perUserLimit || 0),
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      status: row.status === "active" ? "disabled" : "active",
      sortOrder: Number(row.sortOrder || 0)
    });
    ElMessage.success(row.status === "active" ? "拼团活动已停用" : "拼团活动已启用");
    await loadGroupBuys();
  } catch (error: any) {
    ElMessage.error(error.message || "操作失败");
  }
}
async function togglePromotionCode(row: any) {
  if (!canManageProducts.value) return ElMessage.error("当前账号无商城营销管理权限");
  if (!requireMerchantSelection("配置推广码")) return;
  try {
    await api.patch(`/admin/mall/promotion-codes/${row.id}`, {
      code: row.code,
      name: row.name,
      tenantId: isPlatformAdmin() ? row.tenant?.id || filters.tenantId : undefined,
      merchantId: row.merchant?.id || filters.merchantId || undefined,
      promoterUserId: row.promoterUser?.id || null,
      agentId: row.agent?.id || null,
      commissionRate: Number(row.commissionRate || 0),
      startsAt: row.startsAt || null,
      endsAt: row.endsAt || null,
      enabled: !row.enabled,
      remark: row.remark || undefined
    });
    ElMessage.success(row.enabled ? "推广码已停用" : "推广码已启用");
    await loadPromotionCodes();
  } catch (error: any) {
    ElMessage.error(error.message || "操作失败");
  }
}
onMounted(async () => {
  const tenantsReady = await loadTenants();
  if (!tenantsReady) return;
  const merchantScopeReady = await loadMerchants();
  if (!merchantScopeReady) return;
  reload();
  await openRoutePanel();
});
watch(() => [route.path, route.query.panel, route.query.tenantId, route.query.merchantId], async () => {
  filters.tenantId = routeTenantId();
  filters.merchantId = routeMerchantId();
  const merchantScopeReady = await loadMerchants();
  if (!merchantScopeReady) return;
  reload();
  await openRoutePanel();
});
watch(detailVisible, (visible) => {
  if (visible) return;
  detailLoadSequence += 1;
  checkoutGroupLoadSequence += 1;
  detailLoading.value = false;
  checkoutGroupLoading.value = false;
  detailError.value = "";
  checkoutGroupError.value = "";
  detailTargetRow.value = null;
  currentOrder.value = null;
  checkoutGroupOrders.value = [];
});
watch(shipDialogVisible, (visible) => {
  if (visible) return;
  shipLoadSequence += 1;
  shipLogisticsLoadSequence += 1;
  shipLoading.value = false;
  shipLogisticsLoading.value = false;
  shipError.value = "";
  shipLogisticsError.value = "";
  shipTargetRow.value = null;
  shipOrderTarget.value = null;
  shipLogisticsCompanies.value = [];
});
watch(logisticsDialogVisible, (visible) => {
  if (visible) return;
  logisticsLoadSequence += 1;
  logisticsLoading.value = false;
  logisticsError.value = "";
  logisticsCompanies.value = [];
  resetLogisticsForm();
});
watch(couponDialogVisible, (visible) => {
  if (visible) return;
  couponOptionsLoadSequence += 1;
  couponLoadSequence += 1;
  couponUsageLoadSequence += 1;
  couponLoading.value = false;
  couponUsageLoading.value = false;
  couponOptionsError.value = "";
  couponError.value = "";
  couponUsageError.value = "";
  coupons.value = [];
  couponUsages.value = [];
  couponCategories.value = [];
  couponProducts.value = [];
  platformCouponCategories.value = [];
  platformCouponProducts.value = [];
  resetCouponForm();
});
watch(flashSaleDialogVisible, (visible) => {
  if (visible) return;
  couponOptionsLoadSequence += 1;
  flashSaleLoadSequence += 1;
  flashSaleLoading.value = false;
  couponOptionsError.value = "";
  flashSaleError.value = "";
  couponProducts.value = [];
  platformCouponProducts.value = [];
  flashSales.value = [];
  resetFlashSaleForm();
});
watch(groupBuyDialogVisible, (visible) => {
  if (visible) return;
  couponOptionsLoadSequence += 1;
  groupBuyLoadSequence += 1;
  groupBuyLoading.value = false;
  couponOptionsError.value = "";
  groupBuyError.value = "";
  couponProducts.value = [];
  platformCouponProducts.value = [];
  groupBuys.value = [];
  resetGroupBuyForm();
});
watch(groupBuyRecordDialogVisible, (visible) => {
  if (visible) return;
  groupBuyRecordLoadSequence += 1;
  groupBuyRecordLoading.value = false;
  groupBuyRecordError.value = "";
  groupBuyRecords.value = [];
});
watch(promotionDialogVisible, (visible) => {
  if (visible) return;
  agentLoadSequence += 1;
  promotionLoadSequence += 1;
  promotionLoading.value = false;
  agentError.value = "";
  promotionError.value = "";
  agents.value = [];
  promotionCodes.value = [];
  resetPromotionForm();
});
</script>

<style scoped>
.mall-page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
.page-header p { margin: 6px 0 0; color: #64748b; }
.finance-note { font-size: 12px; color: #94a3b8 !important; }
.scope-hint { margin-bottom: 16px; }
.deep-link-alert { margin-bottom: 16px; }
.page-error { margin-bottom: 14px; overflow-wrap: anywhere; }
.page-error p { margin: 0 0 8px; line-height: 1.6; }
.merchant-disabled-alert { margin-bottom: 16px; }
.merchant-context-card { margin-bottom: 16px; border-color: #dbeafe; background: linear-gradient(135deg, #eff6ff, #fff); }
.merchant-context-card :deep(.el-card__body) { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; }
.merchant-context-main { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.merchant-context-main strong { color: #0f172a; }
.merchant-context-main p { margin: 4px 0 0; color: #64748b; }
.merchant-context-tags, .merchant-context-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
.summary-row { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.summary-card :deep(.el-card__body) { display: grid; gap: 6px; padding: 14px 16px; }
.summary-card small { color: #64748b; }
.summary-card strong { color: #0f172a; font-size: 22px; }
.analytics-card { margin-bottom: 16px; border-color: #fed7aa; background: linear-gradient(180deg, #fff7ed, #fff); }
.analytics-card :deep(.el-card__body) { display: grid; gap: 14px; }
.analytics-summary { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
.analytics-summary div { padding: 12px; border-radius: 12px; background: #fff; border: 1px solid #ffedd5; display: grid; gap: 4px; }
.analytics-summary small { color: #9a3412; font-weight: 700; }
.analytics-summary strong { color: #0f172a; font-size: 20px; }
.analytics-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.readiness-card { margin-bottom: 16px; border-color: #e5e7eb; }
.readiness-card :deep(.el-card__body) { display: grid; gap: 12px; }
.readiness-real_ready { border-color: #bbf7d0; background: #f0fdf4; }
.readiness-sandbox_ready { border-color: #fed7aa; background: #fff7ed; }
.readiness-not_ready { border-color: #fecaca; background: #fef2f2; }
.readiness-disabled { background: #f8fafc; }
.readiness-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
.readiness-head strong { color: #0f172a; font-size: 16px; }
.readiness-head p { margin: 6px 0 0; color: #475569; line-height: 1.5; }
.readiness-metrics { display: flex; flex-wrap: wrap; gap: 8px 18px; color: #64748b; font-size: 13px; }
.readiness-issues { display: flex; flex-wrap: wrap; gap: 8px; }
.settlement-card { margin-bottom: 16px; border-color: #dbeafe; background: linear-gradient(180deg, #eff6ff, #fff); }
.settlement-card :deep(.el-card__body) { display: grid; gap: 12px; }
.settlement-tip, .settlement-pending { margin-bottom: 6px; }
.item-line { line-height: 1.7; color: #334155; }
.action-tip { color: #475569; line-height: 1.5; }
.refund-toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
.after-sale-detail { padding: 12px 18px 18px; display: grid; gap: 12px; background: #f8fafc; }
.refund-message-timeline { padding: 8px 12px 0; background: #fff; border: 1px solid #e5e7eb; }
.payment-log-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.card-header-line { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.commission-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 10px; }
.commission-summary div { padding: 10px; border-radius: 10px; background: #f8fafc; border: 1px solid #e5e7eb; display: grid; gap: 3px; }
.commission-summary small { color: #64748b; }
.commission-summary strong { color: #0f172a; font-size: 18px; }
.commission-summary span { color: #94a3b8; font-size: 12px; }
.commission-promoter-table { margin-bottom: 10px; }
.muted-line { margin-top: 4px; color: #94a3b8; font-size: 12px; }
.review-image-list { display: flex; gap: 6px; flex-wrap: wrap; }
.review-thumb { width: 42px; height: 42px; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; background: #f8fafc; }
h3 { margin: 22px 0 10px; color: #0f172a; }
.address-box { padding: 12px; border-radius: 10px; background: #f8fafc; color: #334155; line-height: 1.6; }
.timeline { display: grid; gap: 12px; padding: 12px; border-radius: 12px; background: #f8fafc; }
.timeline-step { display: flex; gap: 10px; opacity: .48; }
.timeline-step.active { opacity: 1; }
.timeline-dot { width: 10px; height: 10px; margin-top: 6px; border-radius: 999px; background: #cbd5e1; flex: 0 0 auto; }
.timeline-step.active .timeline-dot { background: #c2410c; box-shadow: 0 0 0 5px #ffedd5; }
.timeline-step p { margin: 2px 0 0; color: #64748b; font-size: 12px; }
.drawer-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
.ship-alert { margin-bottom: 14px; }
.logistics-form { display: grid; grid-template-columns: 150px 110px 130px minmax(180px, 1fr) 100px 90px auto auto; gap: 10px; align-items: center; margin-bottom: 14px; }
.promotion-toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
.coupon-form { display: grid; grid-template-columns: 140px 180px 110px 110px 130px 180px 100px 180px 180px 90px auto auto; gap: 10px; align-items: center; margin-bottom: 14px; }
.promotion-form { display: grid; grid-template-columns: 150px 180px 120px 180px 150px 90px minmax(180px, 1fr) auto auto; gap: 10px; align-items: center; margin-bottom: 14px; }
@media (max-width: 900px) {
  .page-header { display: block; }
  .header-actions { justify-content: flex-start; margin-top: 12px; }
  .summary-row, .payment-log-grid, .commission-summary, .analytics-summary, .analytics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .logistics-form, .coupon-form, .promotion-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 700px) {
  .payment-log-grid, .commission-summary, .analytics-summary, .analytics-grid { grid-template-columns: 1fr; }
  .logistics-form, .coupon-form, .promotion-form { grid-template-columns: 1fr; }
}
</style>
