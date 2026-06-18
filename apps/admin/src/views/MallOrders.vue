<template>
  <div class="mall-page">
    <div class="page-header">
      <div>
        <h2>商城订单 / 售后</h2>
        <p>处理余额支付、线下收款确认、发货、售后退款，并核对收货地址和订单明细。</p>
        <p class="finance-note">财务口径：实收=已确认收款订单金额，净收=实收-已通过退款；余额/线下按支付方式拆分。</p>
      </div>
      <div class="header-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家" style="width:220px" @change="reload">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
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
        <el-button @click="openLogisticsDialog">物流设置</el-button>
        <el-button type="success" plain @click="openCouponDialog">优惠券管理</el-button>
        <el-button type="danger" plain @click="openFlashSaleDialog">秒杀管理</el-button>
        <el-button type="warning" plain @click="openGroupBuyDialog">拼团管理</el-button>
        <el-button type="warning" plain @click="openGroupBuyRecordDialog">参团记录</el-button>
        <el-button type="primary" plain @click="openPromotionDialog">推广码管理</el-button>
        <el-button :loading="closingExpired" type="warning" plain @click="closeExpiredOrders">清理超时订单</el-button>
        <el-button :loading="failingGroupBuys" type="warning" plain @click="failExpiredGroupBuys">处理未成团</el-button>
        <el-button :loading="completingShipped" type="success" plain @click="completeExpiredShippedOrders">自动完成已发货</el-button>
        <el-button @click="exportOrders">导出订单</el-button>
        <el-button :loading="loading" @click="reload">刷新</el-button>
      </div>
    </div>

    <div class="summary-row">
      <el-card v-for="item in summaryCards" :key="item.label" shadow="never" class="summary-card">
        <small>{{ item.label }}</small>
        <strong>{{ item.value }}</strong>
      </el-card>
    </div>

    <el-card shadow="never" class="analytics-card">
      <template #header>
        <div class="card-header-line">
          <span>商城运营看板（近 30 天）</span>
          <el-button size="small" :loading="analyticsLoading" @click="loadAnalytics">刷新看板</el-button>
        </div>
      </template>
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
        <span>前台开关：{{ paymentReadiness.enabledInOperation ? "已开启" : "未开启" }}</span>
        <span>沙箱：{{ paymentReadiness.sandbox?.enabled && paymentReadiness.sandbox?.secretReady ? "可用" : "未就绪" }}</span>
        <span>真实支付：{{ paymentReadiness.real?.realPaymentEnabled && paymentReadiness.real?.wechatEnabled ? "已开启" : "未开启" }}</span>
        <span>回调地址：{{ paymentReadiness.real?.notifyUrl || "未配置" }}</span>
      </div>
      <div v-if="paymentReadiness.issues?.length" class="readiness-issues">
        <el-tag v-for="issue in paymentReadiness.issues" :key="issue" type="warning" effect="plain">{{ issue }}</el-tag>
      </div>
    </el-card>

    <el-table v-loading="loading" :data="orders" stripe @row-click="openDetail">
      <el-table-column prop="orderNo" label="订单号" width="190" />
      <el-table-column label="商品" min-width="260">
        <template #default="{ row }">
          <div v-for="item in row.items || []" :key="item.id" class="item-line">{{ item.productTitle }} / {{ item.skuName }} × {{ item.quantity }}</div>
        </template>
      </el-table-column>
      <el-table-column label="用户" min-width="140"><template #default="{ row }">{{ row.user?.phone || row.user?.nickname || "-" }}</template></el-table-column>
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
          <el-button size="small" type="success" :disabled="row.status !== 'pending_confirm'" @click.stop="confirmOffline(row)">确认收款</el-button>
          <el-button size="small" :disabled="row.status !== 'paid'" @click.stop="openShip(row)">发货</el-button>
          <el-button size="small" type="danger" plain :disabled="!['pending_payment','pending_confirm'].includes(row.status)" @click.stop="closeOrder(row)">关闭</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-divider>售后申请</el-divider>
    <div class="refund-toolbar">
      <el-select v-model="refundFilters.status" clearable placeholder="全部售后状态" style="width:150px" @change="loadRefunds">
        <el-option label="待处理" value="pending" />
        <el-option label="处理中" value="processing" />
        <el-option label="已通过" value="approved" />
        <el-option label="失败" value="failed" />
        <el-option label="已拒绝" value="rejected" />
      </el-select>
      <el-input v-model="refundFilters.keyword" clearable placeholder="售后单/订单号/手机号/原因" style="width:260px" @keyup.enter="loadRefunds" @clear="loadRefunds" />
      <el-button @click="exportRefunds">导出售后</el-button>
      <el-button @click="loadRefunds">刷新售后</el-button>
    </div>
    <el-table :data="refunds" stripe @row-click="openRefundOrder">
      <el-table-column prop="refundNo" label="售后单号" width="190" />
      <el-table-column label="订单号" width="180"><template #default="{ row }">{{ row.order?.orderNo }}</template></el-table-column>
      <el-table-column label="用户" width="140"><template #default="{ row }">{{ row.user?.phone || "-" }}</template></el-table-column>
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
      <el-table-column label="操作" width="280">
        <template #default="{ row }">
          <el-button size="small" type="success" :disabled="row.status !== 'pending'" @click.stop="approveRefund(row)">通过</el-button>
          <el-button size="small" type="warning" plain :disabled="!['processing','failed'].includes(row.status)" @click.stop="retryRefund(row)">重试退款</el-button>
          <el-button size="small" type="danger" :disabled="row.status !== 'pending'" @click.stop="rejectRefund(row)">拒绝</el-button>
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
    <div class="payment-log-grid">
      <el-card shadow="never">
        <template #header>支付流水</template>
        <el-table :data="paymentTransactions" size="small" stripe>
          <el-table-column label="订单/交易号" min-width="210">
            <template #default="{ row }">
              <strong>{{ row.order?.orderNo || "-" }}</strong>
              <small>{{ row.transactionNo }}</small>
            </template>
          </el-table-column>
          <el-table-column label="渠道" width="90"><template #default="{ row }">{{ paymentText(row.paymentMethod || row.provider) }}</template></el-table-column>
          <el-table-column label="金额" width="100"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.status === 'success' ? 'success' : 'danger'">{{ paymentStatusText(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="说明" min-width="180"><template #default="{ row }">{{ row.remark || row.discrepancyType || "-" }}</template></el-table-column>
          <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        </el-table>
      </el-card>
      <el-card shadow="never">
        <template #header>支付回调日志</template>
        <el-table :data="paymentCallbackLogs" size="small" stripe>
          <el-table-column label="订单/交易号" min-width="210">
            <template #default="{ row }">
              <strong>{{ row.orderNo || row.order?.orderNo || "-" }}</strong>
              <small>{{ row.transactionNo || "-" }}</small>
            </template>
          </el-table-column>
          <el-table-column label="渠道" width="90"><template #default="{ row }">{{ paymentText(row.provider) }}</template></el-table-column>
          <el-table-column label="金额" width="100"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          <el-table-column label="签名" width="80"><template #default="{ row }"><el-tag :type="row.signatureValid === false ? 'danger' : 'success'">{{ row.signatureValid === false ? "失败" : "通过" }}</el-tag></template></el-table-column>
          <el-table-column label="结果" width="100"><template #default="{ row }"><el-tag :type="callbackStatusType(row.resultStatus)">{{ callbackStatusText(row.resultStatus) }}</el-tag></template></el-table-column>
          <el-table-column label="原因" min-width="180" show-overflow-tooltip><template #default="{ row }">{{ row.resultMessage || "-" }}</template></el-table-column>
          <el-table-column label="处理时间" width="170"><template #default="{ row }">{{ formatTime(row.processedAt || row.createdAt) }}</template></el-table-column>
        </el-table>
      </el-card>
      <el-card shadow="never">
        <template #header>退款日志</template>
        <el-table :data="refundLogs" size="small" stripe>
          <el-table-column label="售后/订单" min-width="210">
            <template #default="{ row }">
              <strong>{{ row.refund?.refundNo || "-" }}</strong>
              <small>{{ row.order?.orderNo || row.providerRefundNo || "-" }}</small>
            </template>
          </el-table-column>
          <el-table-column label="渠道" width="90"><template #default="{ row }">{{ refundProviderName(row.provider) }}</template></el-table-column>
          <el-table-column label="金额" width="100"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="refundLogStatusType(row.status)">{{ refundLogStatusText(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="说明" min-width="190" show-overflow-tooltip><template #default="{ row }">{{ row.message || "-" }}</template></el-table-column>
          <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        </el-table>
      </el-card>
      <el-card shadow="never">
        <template #header>
          <div class="card-header-line">
            <span>推广佣金</span>
            <span>
              <el-button size="small" type="success" plain :disabled="!Number(commissionSummary.pendingCount || 0)" @click.stop="batchSettleCommissions">批量结算待结算</el-button>
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
          <el-table-column label="操作" width="120">
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
            </template>
          </el-table-column>
          <el-table-column label="推广人/代理" min-width="140"><template #default="{ row }">{{ row.promoterUser?.phone || row.agent?.name || "-" }}</template></el-table-column>
          <el-table-column label="订单金额" width="100"><template #default="{ row }">¥{{ money(row.orderAmount) }}</template></el-table-column>
          <el-table-column label="佣金" width="110"><template #default="{ row }">¥{{ money(row.commissionAmount) }}</template></el-table-column>
          <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="commissionStatusType(row.status)">{{ commissionStatusText(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="结算/说明" min-width="190" show-overflow-tooltip>
            <template #default="{ row }">
              {{ commissionRemark(row) }}
              <div class="muted-line">{{ row.settledAt ? formatTime(row.settledAt) : "" }}</div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100">
            <template #default="{ row }">
              <el-button size="small" type="success" plain :disabled="row.status !== 'pending'" @click="settleCommission(row)">结算</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <el-divider>商品评价审核</el-divider>
    <div class="refund-toolbar">
      <el-select v-model="reviewFilters.status" clearable placeholder="全部评价状态" style="width:150px" @change="loadReviews">
        <el-option label="待审核" value="pending" />
        <el-option label="已展示" value="approved" />
        <el-option label="已拒绝" value="rejected" />
      </el-select>
      <el-input v-model="reviewFilters.keyword" clearable placeholder="商品/订单号/手机号/内容" style="width:260px" @keyup.enter="loadReviews" @clear="loadReviews" />
      <el-button @click="loadReviews">刷新评价</el-button>
    </div>
    <el-table :data="reviews" stripe>
      <el-table-column label="商品" min-width="220"><template #default="{ row }">{{ row.product?.title }} / {{ row.sku?.name }}</template></el-table-column>
      <el-table-column label="用户" width="140"><template #default="{ row }">{{ row.user?.phone || row.user?.nickname || "-" }}</template></el-table-column>
      <el-table-column label="评分" width="90"><template #default="{ row }">{{ "★".repeat(Number(row.rating || 5)) }}</template></el-table-column>
      <el-table-column prop="content" label="评价内容" min-width="240" show-overflow-tooltip />
      <el-table-column label="晒图" min-width="150">
        <template #default="{ row }">
          <div v-if="row.images?.length" class="review-image-list">
            <el-image v-for="image in row.images" :key="image" class="review-thumb" :src="image" :preview-src-list="row.images" preview-teleported fit="cover" />
          </div>
          <span v-else class="muted-line">无晒图</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="row.status === 'pending' ? 'warning' : row.status === 'approved' ? 'success' : 'info'">{{ reviewText(row.status) }}</el-tag></template></el-table-column>
      <el-table-column label="审核备注" min-width="180"><template #default="{ row }">{{ row.reviewRemark || "-" }}</template></el-table-column>
      <el-table-column label="商家回复" min-width="220">
        <template #default="{ row }">
          {{ row.merchantReply || "-" }}
          <div v-if="row.repliedAt" class="muted-line">{{ row.repliedBy || "-" }} {{ formatTime(row.repliedAt) }}</div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="190">
        <template #default="{ row }">
          <el-button size="small" type="success" :disabled="row.status === 'approved'" @click.stop="moderateReview(row, 'approved')">通过</el-button>
          <el-button size="small" type="danger" :disabled="row.status === 'rejected'" @click.stop="moderateReview(row, 'rejected')">拒绝</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-drawer v-model="detailVisible" title="商城订单详情" size="560px">
      <template v-if="currentOrder">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="订单号">{{ currentOrder.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="状态"><el-tag :type="statusType(currentOrder.status)">{{ statusText(currentOrder.status) }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="用户">{{ currentOrder.user?.phone || currentOrder.user?.nickname || "-" }}</el-descriptions-item>
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
        <el-descriptions :column="1" border>
          <el-descriptions-item label="物流">{{ currentOrder.expressCompany || "" }} {{ currentOrder.expressNo || "-" }}</el-descriptions-item>
          <el-descriptions-item label="售后">{{ refundSummary(currentOrder.refund) }}</el-descriptions-item>
          <el-descriptions-item v-if="currentOrder.refund?.images?.length" label="售后凭证">
            <div class="review-image-list">
              <el-image v-for="image in currentOrder.refund.images" :key="image" class="review-thumb" :src="image" :preview-src-list="currentOrder.refund.images" preview-teleported fit="cover" />
            </div>
          </el-descriptions-item>
          <el-descriptions-item v-if="currentOrder.refund" label="售后审核">{{ currentOrder.refund.reviewedBy || "-" }} {{ formatTime(currentOrder.refund.reviewedAt) }} {{ currentOrder.refund.reviewRemark || "" }}</el-descriptions-item>
        </el-descriptions>

        <div class="drawer-actions">
          <el-button type="success" :disabled="currentOrder.status !== 'pending_confirm'" @click="confirmOffline(currentOrder)">确认线下收款</el-button>
          <el-button type="primary" :disabled="currentOrder.status !== 'paid'" @click="openShip(currentOrder)">发货</el-button>
          <el-button type="danger" plain :disabled="!['pending_payment','pending_confirm'].includes(currentOrder.status)" @click="closeOrder(currentOrder)">关闭订单</el-button>
        </div>
      </template>
    </el-drawer>

    <el-dialog v-model="shipDialogVisible" title="商城订单发货" width="420px">
      <el-alert v-if="currentOrder" type="info" :closable="false" class="ship-alert">
        <template #default>订单 {{ currentOrder.orderNo }}，收货地址：{{ fullAddress(currentOrder) || "-" }}</template>
      </el-alert>
      <el-form label-width="90px">
        <el-form-item label="快递公司">
          <el-select v-model="shipForm.expressCompany" filterable allow-create default-first-option placeholder="选择或输入快递公司" @visible-change="(visible: boolean) => visible && loadLogisticsCompanies()">
            <el-option v-for="item in enabledLogisticsCompanies" :key="item.id" :label="item.name" :value="item.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="快递单号" required><el-input v-model="shipForm.expressNo" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="shipForm.remark" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="shipDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="shipOrder">确认发货</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="logisticsDialogVisible" title="商城物流设置" width="920px">
      <div class="logistics-form">
        <el-input v-model="logisticsForm.name" placeholder="物流公司，如顺丰速运" />
        <el-input v-model="logisticsForm.code" placeholder="编码，可选，如 SF" />
        <el-input v-model="logisticsForm.servicePhone" placeholder="客服电话，可选" />
        <el-input v-model="logisticsForm.trackingUrl" placeholder="查询网址，可选" />
        <el-input-number v-model="logisticsForm.sortOrder" :precision="0" placeholder="排序" />
        <el-switch v-model="logisticsForm.enabled" active-text="启用" />
        <el-button type="primary" :loading="logisticsSaving" @click="saveLogisticsCompany">{{ logisticsForm.id ? "保存" : "新增" }}</el-button>
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
            <el-button size="small" @click="editLogisticsCompany(row)">编辑</el-button>
            <el-button size="small" :type="row.enabled ? 'warning' : 'success'" plain @click="toggleLogisticsCompany(row)">{{ row.enabled ? "停用" : "启用" }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="couponDialogVisible" title="商城优惠券管理" width="1080px">
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
          <el-option v-for="category in couponCategories" :key="category.id" :label="category.name" :value="category.id" />
        </el-select>
        <el-select v-if="couponForm.scope === 'product'" v-model="couponForm.scopeProductId" filterable placeholder="选择商品">
          <el-option v-for="product in couponProducts" :key="product.id" :label="product.title" :value="product.id" />
        </el-select>
        <el-input-number v-model="couponForm.usageLimit" :min="0" :precision="0" placeholder="限量" />
        <el-input-number v-model="couponForm.perUserLimit" :min="0" :precision="0" placeholder="每人限用" />
        <el-date-picker v-model="couponForm.startsAt" type="datetime" placeholder="开始时间" value-format="YYYY-MM-DD HH:mm:ss" />
        <el-date-picker v-model="couponForm.endsAt" type="datetime" placeholder="结束时间" value-format="YYYY-MM-DD HH:mm:ss" />
        <el-switch v-model="couponForm.enabled" active-text="启用" inactive-text="停用" />
        <el-button type="primary" :loading="couponSaving" @click="saveCoupon">{{ couponForm.id ? "保存" : "新增" }}</el-button>
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
        <el-table-column label="适用范围" min-width="170"><template #default="{ row }">{{ couponScopeText(row) }}</template></el-table-column>
        <el-table-column label="用量" width="140">
          <template #default="{ row }">
            {{ row.usedCount || 0 }} / {{ row.usageLimit || "不限" }}
            <div class="muted-line">每人 {{ row.perUserLimit || "不限" }}</div>
          </template>
        </el-table-column>
        <el-table-column label="有效期" min-width="210"><template #default="{ row }">{{ formatTime(row.startsAt) }} 至 {{ formatTime(row.endsAt) }}</template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="couponStatusType(row.runtimeStatus)">{{ couponStatusText(row.runtimeStatus) }}</el-tag></template></el-table-column>
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editCoupon(row)">编辑</el-button>
            <el-button size="small" :type="row.enabled ? 'warning' : 'success'" plain @click="toggleCoupon(row)">{{ row.enabled ? "停用" : "启用" }}</el-button>
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
        <el-table-column label="用户" width="140"><template #default="{ row }">{{ row.user?.phone || row.user?.nickname || "-" }}</template></el-table-column>
        <el-table-column label="优惠" width="100"><template #default="{ row }">¥{{ money(row.discountAmount) }}</template></el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }"><el-tag :type="row.status === 'used' ? 'success' : 'info'">{{ couponUsageStatusText(row.status) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="释放原因" min-width="180" show-overflow-tooltip><template #default="{ row }">{{ row.releaseReason || "-" }}</template></el-table-column>
        <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="flashSaleDialogVisible" title="商城秒杀管理" width="1080px">
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
        <el-button type="primary" :loading="flashSaleSaving" @click="saveFlashSale">{{ flashSaleForm.id ? "保存" : "新增" }}</el-button>
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
            <el-button size="small" @click="editFlashSale(row)">编辑</el-button>
            <el-button size="small" :type="row.status === 'active' ? 'warning' : 'success'" plain @click="toggleFlashSale(row)">{{ row.status === "active" ? "停用" : "启用" }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="groupBuyDialogVisible" title="商城拼团管理" width="1080px">
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
        <el-button type="primary" :loading="groupBuySaving" @click="saveGroupBuy">{{ groupBuyForm.id ? "保存" : "新增" }}</el-button>
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
            <el-button size="small" @click="editGroupBuy(row)">编辑</el-button>
            <el-button size="small" :type="row.status === 'active' ? 'warning' : 'success'" plain @click="toggleGroupBuy(row)">{{ row.status === "active" ? "停用" : "启用" }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="groupBuyRecordDialogVisible" title="拼团参团记录" width="1080px">
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
            <strong>{{ row.user?.nickname || row.user?.phone || "-" }}</strong>
            <div class="muted-line">{{ row.user?.phone || "-" }} / {{ row.order?.orderNo || "-" }}</div>
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
        <el-switch v-model="promotionForm.enabled" active-text="启用" inactive-text="停用" />
        <el-input v-model="promotionForm.remark" placeholder="运营备注，可选" />
        <el-button type="primary" :loading="promotionSaving" @click="savePromotionCode">{{ promotionForm.id ? "保存" : "新增" }}</el-button>
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
            <span>{{ row.agent?.name || row.promoterUser?.phone || "未绑定" }}</span>
            <div class="muted-line">{{ row.agent?.region || row.promoterUser?.nickname || "-" }}</div>
          </template>
        </el-table-column>
        <el-table-column label="佣金比例" width="110"><template #default="{ row }">{{ percent(row.commissionRate) }}%</template></el-table-column>
        <el-table-column label="推广订单" width="110"><template #default="{ row }">{{ row.orderCount || 0 }} 单</template></el-table-column>
        <el-table-column label="推广金额" width="120"><template #default="{ row }">¥{{ money(row.orderAmount) }}</template></el-table-column>
        <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "启用" : "停用" }}</el-tag></template></el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="170" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editPromotionCode(row)">编辑</el-button>
            <el-button size="small" :type="row.enabled ? 'warning' : 'success'" plain @click="togglePromotionCode(row)">{{ row.enabled ? "停用" : "启用" }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { api, downloadFile } from "../api";
import { isPlatformAdmin } from "../permissions";

const tenants = ref<any[]>([]);
const route = useRoute();
const orders = ref<any[]>([]);
const refunds = ref<any[]>([]);
const reviews = ref<any[]>([]);
const paymentTransactions = ref<any[]>([]);
const paymentCallbackLogs = ref<any[]>([]);
const refundLogs = ref<any[]>([]);
const commissions = ref<any[]>([]);
const commissionPromoterSummary = ref<any[]>([]);
const coupons = ref<any[]>([]);
const couponUsages = ref<any[]>([]);
const couponCategories = ref<any[]>([]);
const couponProducts = ref<any[]>([]);
const flashSales = ref<any[]>([]);
const groupBuys = ref<any[]>([]);
const groupBuyRecords = ref<any[]>([]);
const promotionCodes = ref<any[]>([]);
const agents = ref<any[]>([]);
const orderSummary = ref<any>({});
const commissionSummary = ref<any>({});
const mallAnalytics = ref<any>({});
const paymentReadiness = ref<any>(null);
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
const logisticsCompanies = ref<any[]>([]);
const routeTenantId = () => {
  const id = typeof route.query.tenantId === "string" ? Number(route.query.tenantId) : 0;
  return isPlatformAdmin() && id ? id : undefined;
};
const filters = reactive({ tenantId: routeTenantId() as number | undefined, status: "", paymentMethod: "", refundStatus: "", keyword: "", startDate: "", endDate: "", page: 1, pageSize: 50 });
const dateRange = ref<string[]>([]);
const refundFilters = reactive({ status: "", keyword: "" });
const reviewFilters = reactive({ status: "pending", keyword: "" });
const paymentFilters = reactive({ status: "" });
const callbackFilters = reactive({ status: "" });
const commissionFilters = reactive({ status: "" });
const couponFilters = reactive({ status: "", keyword: "" });
const couponUsageFilters = reactive({ status: "", keyword: "" });
const flashSaleFilters = reactive({ status: "", keyword: "" });
const groupBuyFilters = reactive({ status: "", keyword: "" });
const groupBuyRecordFilters = reactive({ status: "", keyword: "" });
const promotionFilters = reactive({ enabled: "", keyword: "" });
const paymentKeyword = ref("");
const shipForm = reactive({ expressCompany: "", expressNo: "", remark: "" });
const logisticsForm = reactive<any>({ id: null, name: "", code: "", servicePhone: "", trackingUrl: "", sortOrder: 0, enabled: true });
const couponForm = reactive<any>({ id: null, code: "", name: "", minAmount: 0, discountAmount: 0, scope: "all", scopeCategoryId: null, scopeProductId: null, usageLimit: 0, perUserLimit: 0, startsAt: "", endsAt: "", enabled: true });
const flashSaleForm = reactive<any>({ id: null, title: "", productId: null, skuId: null, salePrice: 0, saleStock: 1, perUserLimit: 1, startsAt: "", endsAt: "", status: "draft", sortOrder: 0 });
const groupBuyForm = reactive<any>({ id: null, title: "", productId: null, skuId: null, groupPrice: 0, minPeople: 2, groupStock: 1, perUserLimit: 1, startsAt: "", endsAt: "", status: "draft", sortOrder: 0 });
const promotionForm = reactive<any>({ id: null, code: "", name: "", commissionRatePercent: 0, promoterUserId: null, agentId: null, enabled: true, remark: "" });
const enabledLogisticsCompanies = computed(() => logisticsCompanies.value.filter((item) => item.enabled));
const selectedFlashSaleSkus = computed(() => couponProducts.value.find((item) => item.id === flashSaleForm.productId)?.skus || []);
const selectedGroupBuySkus = computed(() => couponProducts.value.find((item) => item.id === groupBuyForm.productId)?.skus || []);
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
const analyticsCards = computed(() => [
  { label: "30天订单", value: mallAnalytics.value.summary?.orderCount || 0 },
  { label: "30天实收", value: `¥${money(mallAnalytics.value.summary?.receivedAmount)}` },
  { label: "30天净收", value: `¥${money(mallAnalytics.value.summary?.netReceivedAmount)}` },
  { label: "优惠让利", value: `¥${money(mallAnalytics.value.summary?.discountAmount)}` },
  { label: "已退金额", value: `¥${money(mallAnalytics.value.summary?.approvedRefundAmount)}` }
]);

function tenantLabel(tenant: any) { return `${tenant.name || tenant.code}（${tenant.code}）`; }
function agentLabel(agent: any) { return `${agent.name}${agent.region ? `（${agent.region}）` : ""}`; }
function money(value: any) { return Number(value || 0).toFixed(2); }
function percent(value: any) { return (Number(value || 0) * 100).toFixed(2).replace(/\.?0+$/, ""); }
function formatTime(value: any) { return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "-"; }
function paymentText(value: string) { return ({ wechat: "微信支付", balance: "余额支付", offline: "线下收款", alipay: "支付宝" } as any)[value] || value; }
function statusText(value: string) { return Object.fromEntries(statuses.map((item) => [item.value, item.label]))[value] || value; }
function refundText(value: string) { return ({ pending: "待处理", processing: "处理中", approved: "已通过", rejected: "已拒绝", failed: "失败" } as any)[value] || value; }
function refundStatusType(value: string) { return value === "approved" ? "success" : value === "failed" ? "danger" : value === "pending" || value === "processing" ? "warning" : "info"; }
function reviewText(value: string) { return ({ pending: "待审核", approved: "已展示", rejected: "已拒绝" } as any)[value] || value; }
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
function paymentReadinessTagType(value: string) { return value === "real_ready" ? "success" : value === "sandbox_ready" ? "warning" : value === "disabled" ? "info" : "danger"; }
function refundTypeText(value: string) { return ({ refund_only: "仅退款", return_refund: "退货退款" } as any)[value] || value || "-"; }
function refundProviderName(value: string) { return ({ wechat: "微信", balance: "余额", offline: "线下" } as any)[value] || value || "-"; }
function refundProviderText(row: any) {
  const provider = row.order?.paymentMethod || row.providerRefundPayload?.provider || "";
  const mode = row.providerRefundPayload?.mode ? ` / ${row.providerRefundPayload.mode}` : "";
  return `${refundProviderName(provider)}${mode}`;
}
function couponScopeText(row: any) {
  if (row.scope === "category") return `指定分类：${couponCategories.value.find((item) => item.id === row.scopeCategoryId)?.name || row.scopeCategoryId || "-"}`;
  if (row.scope === "product") return `指定商品：${couponProducts.value.find((item) => item.id === row.scopeProductId)?.title || row.scopeProductId || "-"}`;
  return "全场通用";
}
function statusType(value: string) { return value === "paid" || value === "shipped" || value === "completed" ? "success" : value === "closed" || value === "refunded" ? "info" : "warning"; }
function receiverText(row: any) { const address = row.addressSnapshot || {}; return [address.receiverName, address.receiverPhone].filter(Boolean).join(" ") || "-"; }
function orderActionTip(row: any) {
  if (row.status === "pending_payment") return row.paymentMethod === "wechat" ? "等待微信支付回调，可关闭释放库存" : "等待用户余额支付，可关闭释放库存";
  if (row.status === "pending_confirm") return "核对线下收款后确认";
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
  return [address.receiverName, address.receiverPhone, address.province, address.city, address.district, address.detail].filter(Boolean).join(" ");
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

async function loadTenants() { tenants.value = isPlatformAdmin() ? await api.get<any, any[]>("/admin/tenants") : []; }
function orderQueryParams() {
  return {
    tenantId: isPlatformAdmin() ? filters.tenantId : undefined,
    status: filters.status || undefined,
    paymentMethod: filters.paymentMethod || undefined,
    refundStatus: filters.refundStatus || undefined,
    keyword: filters.keyword.trim() || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined
  };
}
function onDateRangeChange(value?: string[]) {
  filters.startDate = value?.[0] || "";
  filters.endDate = value?.[1] || "";
  loadOrders();
}
async function loadOrders() {
  loading.value = true;
  try {
    const params = { ...orderQueryParams(), page: filters.page, pageSize: filters.pageSize };
    const [result, summary] = await Promise.all([
      api.get<any, any>("/admin/mall/orders", { params }),
      api.get<any, any>("/admin/mall/orders/summary", { params: orderQueryParams() })
    ]);
    orders.value = result.items || [];
    orderSummary.value = summary || {};
  } catch (error: any) {
    ElMessage.error(error.message || "加载商城订单失败");
  } finally {
    loading.value = false;
  }
}
async function loadAnalytics() {
  analyticsLoading.value = true;
  try {
    mallAnalytics.value = await api.get<any, any>("/admin/mall/analytics", { params: { tenantId: isPlatformAdmin() ? filters.tenantId : undefined } });
  } catch (error: any) {
    ElMessage.error(error.message || "加载商城运营看板失败");
  } finally {
    analyticsLoading.value = false;
  }
}
async function loadRefunds() {
  try {
    refunds.value = await api.get<any, any[]>("/admin/mall/refunds", { params: { tenantId: isPlatformAdmin() ? filters.tenantId : undefined, status: refundFilters.status || undefined, paymentMethod: filters.paymentMethod || undefined, startDate: filters.startDate || undefined, endDate: filters.endDate || undefined, keyword: refundFilters.keyword.trim() || filters.keyword.trim() || undefined } });
  } catch (error: any) {
    ElMessage.error(error.message || "加载售后失败");
  }
}
async function loadReviews() {
  try {
    reviews.value = await api.get<any, any[]>("/admin/mall/reviews", { params: { tenantId: isPlatformAdmin() ? filters.tenantId : undefined, status: reviewFilters.status || undefined, keyword: reviewFilters.keyword.trim() || undefined } });
  } catch (error: any) {
    ElMessage.error(error.message || "加载评价失败");
  }
}
async function loadPaymentData() {
  try {
    const baseParams = { tenantId: isPlatformAdmin() ? filters.tenantId : undefined, keyword: paymentKeyword.value.trim() || filters.keyword.trim() || undefined };
    const [transactions, callbackLogs, refundLogRows, commissionRows, commissionSummaryRow, promoterSummaryRows, readiness] = await Promise.all([
      api.get<any, any[]>("/admin/mall/payment-transactions", { params: { ...baseParams, status: paymentFilters.status || undefined } }),
      api.get<any, any[]>("/admin/mall/payment-callback-logs", { params: { ...baseParams, status: callbackFilters.status || undefined } }),
      api.get<any, any[]>("/admin/mall/refund-logs", { params: baseParams }),
      api.get<any, any[]>("/admin/mall/commissions", { params: { ...baseParams, status: commissionFilters.status || undefined } }),
      api.get<any, any>("/admin/mall/commissions/summary", { params: { ...baseParams, status: commissionFilters.status || undefined } }),
      api.get<any, any[]>("/admin/mall/commissions/by-promoter", { params: { ...baseParams, status: commissionFilters.status || undefined } }),
      api.get<any, any>("/admin/mall/payment-readiness", { params: { tenantId: isPlatformAdmin() ? filters.tenantId : undefined } })
    ]);
    paymentTransactions.value = transactions || [];
    paymentCallbackLogs.value = callbackLogs || [];
    refundLogs.value = refundLogRows || [];
    commissions.value = commissionRows || [];
    commissionSummary.value = commissionSummaryRow || {};
    commissionPromoterSummary.value = promoterSummaryRows || [];
    paymentReadiness.value = readiness || null;
  } catch (error: any) {
    ElMessage.error(error.message || "加载支付日志失败");
  }
}
async function settleCommission(row: any) {
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
  try {
    const pendingCount = Number(target?.pendingCount ?? commissionSummary.value.pendingCount ?? 0);
    const pendingAmount = money(target?.pendingAmount ?? commissionSummary.value.pendingAmount);
    const scopeText = target?.displayName ? `“${target.displayName}”` : "当前商家和搜索条件";
    const result = await ElMessageBox.prompt(`确认按${scopeText}批量结算 ${pendingCount} 笔待结算佣金，共 ¥${pendingAmount}？一次最多处理 200 笔。`, "批量结算商城佣金", { inputValue: target?.displayName ? `财务确认结算 ${target.displayName}` : "财务批量确认已结算", confirmButtonText: "确认结算", cancelButtonText: "取消", inputValidator: (value) => Boolean(String(value || "").trim()) || "请填写结算备注" });
    const payload = {
      tenantId: isPlatformAdmin() ? filters.tenantId : undefined,
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
  logisticsLoading.value = true;
  try {
    logisticsCompanies.value = await api.get<any, any[]>("/admin/mall/logistics-companies", { params: { tenantId: isPlatformAdmin() ? filters.tenantId : undefined } });
  } catch (error: any) {
    ElMessage.error(error.message || "加载物流设置失败");
  } finally {
    logisticsLoading.value = false;
  }
}
async function loadCouponOptions() {
  try {
    const params = { tenantId: isPlatformAdmin() ? filters.tenantId : undefined };
    const [categories, productResult] = await Promise.all([
      api.get<any, any[]>("/admin/mall/categories", { params }),
      api.get<any, any>("/admin/mall/products", { params: { ...params, pageSize: 200 } })
    ]);
    couponCategories.value = categories || [];
    couponProducts.value = productResult?.items || productResult || [];
  } catch (error: any) {
    ElMessage.error(error.message || "加载优惠券适用范围失败");
  }
}
async function loadCoupons() {
  couponLoading.value = true;
  try {
    coupons.value = await api.get<any, any[]>("/admin/mall/coupons", { params: { tenantId: isPlatformAdmin() ? filters.tenantId : undefined, status: couponFilters.status || undefined, keyword: couponFilters.keyword.trim() || undefined } });
  } catch (error: any) {
    ElMessage.error(error.message || "加载优惠券失败");
  } finally {
    couponLoading.value = false;
  }
}
async function loadFlashSales() {
  flashSaleLoading.value = true;
  try {
    flashSales.value = await api.get<any, any[]>("/admin/mall/flash-sales", { params: { tenantId: isPlatformAdmin() ? filters.tenantId : undefined, status: flashSaleFilters.status || undefined, keyword: flashSaleFilters.keyword.trim() || undefined } });
  } catch (error: any) {
    ElMessage.error(error.message || "加载秒杀活动失败");
  } finally {
    flashSaleLoading.value = false;
  }
}
async function loadGroupBuys() {
  groupBuyLoading.value = true;
  try {
    groupBuys.value = await api.get<any, any[]>("/admin/mall/group-buys", { params: { tenantId: isPlatformAdmin() ? filters.tenantId : undefined, status: groupBuyFilters.status || undefined, keyword: groupBuyFilters.keyword.trim() || undefined } });
  } catch (error: any) {
    ElMessage.error(error.message || "加载拼团活动失败");
  } finally {
    groupBuyLoading.value = false;
  }
}
async function loadGroupBuyRecords() {
  groupBuyRecordLoading.value = true;
  try {
    groupBuyRecords.value = await api.get<any, any[]>("/admin/mall/group-buy-records", { params: { tenantId: isPlatformAdmin() ? filters.tenantId : undefined, status: groupBuyRecordFilters.status || undefined, keyword: groupBuyRecordFilters.keyword.trim() || undefined } });
  } catch (error: any) {
    ElMessage.error(error.message || "加载参团记录失败");
  } finally {
    groupBuyRecordLoading.value = false;
  }
}
async function loadCouponUsages() {
  couponUsageLoading.value = true;
  try {
    couponUsages.value = await api.get<any, any[]>("/admin/mall/coupon-usages", { params: { tenantId: isPlatformAdmin() ? filters.tenantId : undefined, status: couponUsageFilters.status || undefined, keyword: couponUsageFilters.keyword.trim() || couponFilters.keyword.trim() || undefined } });
  } catch (error: any) {
    ElMessage.error(error.message || "加载优惠券使用记录失败");
  } finally {
    couponUsageLoading.value = false;
  }
}
async function loadAgents() {
  try {
    agents.value = await api.get<any, any[]>("/admin/agents", { params: { includeDisabled: true, tenantId: isPlatformAdmin() ? filters.tenantId || undefined : undefined } });
  } catch {
    agents.value = [];
  }
}
async function loadPromotionCodes() {
  promotionLoading.value = true;
  try {
    promotionCodes.value = await api.get<any, any[]>("/admin/mall/promotion-codes", { params: { tenantId: isPlatformAdmin() ? filters.tenantId : undefined, enabled: promotionFilters.enabled || undefined, keyword: promotionFilters.keyword.trim() || undefined } });
  } catch (error: any) {
    ElMessage.error(error.message || "加载推广码失败");
  } finally {
    promotionLoading.value = false;
  }
}
function reload() { loadOrders(); loadAnalytics(); loadRefunds(); loadReviews(); loadPaymentData(); }
async function openRoutePanel() {
  const panel = String(route.query.panel || route.path.replace("/mall-", ""));
  if (panel === "refunds") {
    refundFilters.status = refundFilters.status || "pending";
    filters.refundStatus = filters.refundStatus || "pending";
    await loadRefunds();
  }
  if (panel === "logistics") openLogisticsDialog();
  if (panel === "marketing") openFlashSaleDialog();
  if (panel === "finance") await loadPaymentData();
}
async function exportOrders() {
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
  try {
    const clean = new URLSearchParams();
    if (isPlatformAdmin() && filters.tenantId) clean.set("tenantId", String(filters.tenantId));
    if (refundFilters.status) clean.set("status", refundFilters.status);
    if (filters.paymentMethod) clean.set("paymentMethod", filters.paymentMethod);
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
  try {
    const clean = new URLSearchParams();
    if (isPlatformAdmin() && filters.tenantId) clean.set("tenantId", String(filters.tenantId));
    if (paymentFilters.status) clean.set("status", paymentFilters.status);
    if (filters.paymentMethod) clean.set("paymentMethod", filters.paymentMethod);
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
  try {
    const clean = new URLSearchParams();
    if (isPlatformAdmin() && filters.tenantId) clean.set("tenantId", String(filters.tenantId));
    if (callbackFilters.status) clean.set("status", callbackFilters.status);
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
  try {
    const clean = new URLSearchParams();
    if (isPlatformAdmin() && filters.tenantId) clean.set("tenantId", String(filters.tenantId));
    if (commissionFilters.status) clean.set("status", commissionFilters.status);
    const keyword = paymentKeyword.value.trim() || filters.keyword.trim();
    if (keyword) clean.set("keyword", keyword);
    await downloadFile(`/admin/mall/commissions/export?${clean.toString()}`, "mall-commissions.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出佣金失败");
  }
}
async function exportCommissionPromoters() {
  try {
    const clean = new URLSearchParams();
    if (isPlatformAdmin() && filters.tenantId) clean.set("tenantId", String(filters.tenantId));
    if (commissionFilters.status) clean.set("status", commissionFilters.status);
    const keyword = paymentKeyword.value.trim() || filters.keyword.trim();
    if (keyword) clean.set("keyword", keyword);
    await downloadFile(`/admin/mall/commissions/by-promoter/export?${clean.toString()}`, "mall-commission-promoters.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出佣金汇总失败");
  }
}
async function closeExpiredOrders() {
  try {
    await ElMessageBox.confirm("系统会扫描超过配置时间仍待支付/待确认的商城订单，自动关闭并释放库存和优惠券占用。确认立即执行一次？", "清理超时订单", { type: "warning", confirmButtonText: "立即清理", cancelButtonText: "取消" });
    closingExpired.value = true;
    const result = await api.post<any, any>("/admin/mall/orders/close-expired");
    ElMessage.success(`清理完成：检查 ${result.checkedCount || 0} 单，关闭 ${result.closedCount || 0} 单`);
    await reload();
  } catch (error: any) {
    if (error === "cancel") return;
    ElMessage.error(error.message || "清理失败");
  } finally {
    closingExpired.value = false;
  }
}
async function failExpiredGroupBuys() {
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
function refreshCurrentOrder(id: number) {
  currentOrder.value = orders.value.find((item) => item.id === id) || currentOrder.value;
}
function openDetail(row: any) {
  currentOrder.value = row;
  detailVisible.value = true;
}
function openRefundOrder(row: any) {
  const order = orders.value.find((item) => item.id === row.order?.id);
  if (order) openDetail(order);
}
async function confirmOffline(row: any) {
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
function openShip(row: any) {
  currentOrder.value = row;
  Object.assign(shipForm, { expressCompany: row.expressCompany || "", expressNo: row.expressNo || "", remark: "" });
  shipDialogVisible.value = true;
  loadLogisticsCompanies();
}
async function shipOrder() {
  if (!shipForm.expressNo.trim()) return ElMessage.error("请输入快递单号");
  try {
    await api.post(`/admin/mall/orders/${currentOrder.value.id}/ship`, shipForm);
    ElMessage.success("已发货");
    shipDialogVisible.value = false;
    await loadOrders();
    refreshCurrentOrder(currentOrder.value.id);
  } catch (error: any) {
    ElMessage.error(error.message || "发货失败");
  }
}
async function approveRefund(row: any) {
  try {
    await ElMessageBox.confirm(`确认通过售后 ${row.refundNo}？余额支付订单会退回余额，库存会回补。`, "通过售后", { type: "warning" });
    await api.post(`/admin/mall/refunds/${row.id}/approve`, { remark: "后台审核通过" });
    ElMessage.success("售后已通过");
    reload();
  } catch (error: any) {
    if (error === "cancel") return;
    ElMessage.error(error.message || "处理失败");
  }
}
async function retryRefund(row: any) {
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
async function moderateReview(row: any, status: "approved" | "rejected") {
  try {
    const result = await ElMessageBox.prompt(status === "approved" ? "通过后评价会展示在商品详情页，可填写审核备注。若要展示商家回复，请用“审核备注 || 商家回复”格式填写。" : "请输入拒绝原因，方便后续客服回访。", status === "approved" ? "通过评价" : "拒绝评价", { inputValue: status === "approved" ? "评价审核通过 || 感谢您的认可，七维书院会继续把好物和服务做好。" : "评价内容不适合展示", confirmButtonText: "确认", cancelButtonText: "取消" });
    const [reviewRemark, merchantReply] = String(result.value || "").split("||").map((item) => item.trim());
    await api.patch(`/admin/mall/reviews/${row.id}`, { status, reviewRemark: reviewRemark || "", merchantReply: status === "approved" ? merchantReply || "" : "" });
    ElMessage.success(status === "approved" ? "评价已展示" : "评价已拒绝");
    loadReviews();
  } catch (error: any) {
    if (error === "cancel") return;
    ElMessage.error(error.message || "审核失败");
  }
}
function openLogisticsDialog() {
  if (isPlatformAdmin() && !filters.tenantId) return ElMessage.error("请先选择商家，再配置该商家的物流公司");
  resetLogisticsForm();
  logisticsDialogVisible.value = true;
  loadLogisticsCompanies();
}
function openCouponDialog() {
  if (isPlatformAdmin() && !filters.tenantId) return ElMessage.error("请先选择商家，再配置该商家的优惠券");
  resetCouponForm();
  couponDialogVisible.value = true;
  loadCouponOptions();
  loadCoupons();
  loadCouponUsages();
}
function openFlashSaleDialog() {
  if (isPlatformAdmin() && !filters.tenantId) return ElMessage.error("请先选择商家，再配置该商家的秒杀活动");
  resetFlashSaleForm();
  flashSaleDialogVisible.value = true;
  loadCouponOptions();
  loadFlashSales();
}
function openGroupBuyDialog() {
  if (isPlatformAdmin() && !filters.tenantId) return ElMessage.error("请先选择商家，再配置该商家的拼团活动");
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
  if (isPlatformAdmin() && !filters.tenantId) return ElMessage.error("请先选择商家，再配置该商家的推广码");
  resetPromotionForm();
  promotionDialogVisible.value = true;
  loadAgents();
  loadPromotionCodes();
}
function resetLogisticsForm() {
  Object.assign(logisticsForm, { id: null, name: "", code: "", servicePhone: "", trackingUrl: "", sortOrder: 0, enabled: true });
}
function resetCouponForm() {
  Object.assign(couponForm, { id: null, code: "", name: "", minAmount: 0, discountAmount: 0, scope: "all", scopeCategoryId: null, scopeProductId: null, usageLimit: 0, perUserLimit: 0, startsAt: "", endsAt: "", enabled: true });
}
function resetFlashSaleForm() {
  Object.assign(flashSaleForm, { id: null, title: "", productId: null, skuId: null, salePrice: 0, saleStock: 1, perUserLimit: 1, startsAt: "", endsAt: "", status: "draft", sortOrder: 0 });
}
function resetGroupBuyForm() {
  Object.assign(groupBuyForm, { id: null, title: "", productId: null, skuId: null, groupPrice: 0, minPeople: 2, groupStock: 1, perUserLimit: 1, startsAt: "", endsAt: "", status: "draft", sortOrder: 0 });
}
function resetPromotionForm() {
  Object.assign(promotionForm, { id: null, code: "", name: "", commissionRatePercent: 0, promoterUserId: null, agentId: null, enabled: true, remark: "" });
}
function editLogisticsCompany(row: any) {
  Object.assign(logisticsForm, { id: row.id, name: row.name, code: row.code || "", servicePhone: row.servicePhone || "", trackingUrl: row.trackingUrl || "", sortOrder: Number(row.sortOrder || 0), enabled: row.enabled });
}
function editCoupon(row: any) {
  Object.assign(couponForm, {
    id: row.id,
    code: row.code || "",
    name: row.name || "",
    minAmount: Number(row.minAmount || 0),
    discountAmount: Number(row.discountAmount || 0),
    scope: row.scope || "all",
    scopeCategoryId: row.scopeCategoryId || null,
    scopeProductId: row.scopeProductId || null,
    usageLimit: Number(row.usageLimit || 0),
    perUserLimit: Number(row.perUserLimit || 0),
    startsAt: row.startsAt ? String(row.startsAt).slice(0, 19).replace("T", " ") : "",
    endsAt: row.endsAt ? String(row.endsAt).slice(0, 19).replace("T", " ") : "",
    enabled: row.enabled
  });
}
function editFlashSale(row: any) {
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
  Object.assign(promotionForm, {
    id: row.id,
    code: row.code || "",
    name: row.name || "",
    commissionRatePercent: Number(row.commissionRate || 0) * 100,
    promoterUserId: row.promoterUser?.id || null,
    agentId: row.agent?.id || null,
    enabled: row.enabled,
    remark: row.remark || ""
  });
}
async function saveLogisticsCompany() {
  if (!logisticsForm.name?.trim()) return ElMessage.error("请输入物流公司名称");
  logisticsSaving.value = true;
  try {
    const payload = { ...logisticsForm, name: logisticsForm.name.trim(), tenantId: isPlatformAdmin() ? filters.tenantId : undefined };
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
  if (!couponForm.code?.trim()) return ElMessage.error("请输入优惠券码");
  if (!couponForm.name?.trim()) return ElMessage.error("请输入优惠券名称");
  if (Number(couponForm.discountAmount || 0) <= 0) return ElMessage.error("优惠金额必须大于 0");
  if (couponForm.scope === "category" && !couponForm.scopeCategoryId) return ElMessage.error("请选择适用分类");
  if (couponForm.scope === "product" && !couponForm.scopeProductId) return ElMessage.error("请选择适用商品");
  couponSaving.value = true;
  try {
    const payload = {
      code: couponForm.code.trim(),
      name: couponForm.name.trim(),
      tenantId: isPlatformAdmin() ? filters.tenantId : undefined,
      minAmount: Number(couponForm.minAmount || 0),
      discountAmount: Number(couponForm.discountAmount || 0),
      scope: couponForm.scope,
      scopeCategoryId: couponForm.scope === "category" ? couponForm.scopeCategoryId : null,
      scopeProductId: couponForm.scope === "product" ? couponForm.scopeProductId : null,
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
  if (!flashSaleForm.title?.trim()) return ElMessage.error("请输入秒杀标题");
  if (!flashSaleForm.productId || !flashSaleForm.skuId) return ElMessage.error("请选择秒杀商品和规格");
  if (Number(flashSaleForm.salePrice || 0) <= 0) return ElMessage.error("秒杀价必须大于 0");
  if (Number(flashSaleForm.saleStock || 0) <= 0) return ElMessage.error("秒杀库存必须大于 0");
  if (!flashSaleForm.startsAt || !flashSaleForm.endsAt) return ElMessage.error("请设置秒杀时间");
  flashSaleSaving.value = true;
  try {
    const payload = { ...flashSaleForm, title: flashSaleForm.title.trim(), tenantId: isPlatformAdmin() ? filters.tenantId : undefined };
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
  if (!groupBuyForm.title?.trim()) return ElMessage.error("请输入拼团标题");
  if (!groupBuyForm.productId || !groupBuyForm.skuId) return ElMessage.error("请选择拼团商品和规格");
  if (Number(groupBuyForm.groupPrice || 0) <= 0) return ElMessage.error("拼团价必须大于 0");
  if (Number(groupBuyForm.minPeople || 0) < 2) return ElMessage.error("成团人数至少 2 人");
  if (Number(groupBuyForm.groupStock || 0) <= 0) return ElMessage.error("拼团库存必须大于 0");
  if (!groupBuyForm.startsAt || !groupBuyForm.endsAt) return ElMessage.error("请设置拼团时间");
  groupBuySaving.value = true;
  try {
    const payload = { ...groupBuyForm, title: groupBuyForm.title.trim(), tenantId: isPlatformAdmin() ? filters.tenantId : undefined };
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
  if (!promotionForm.code?.trim()) return ElMessage.error("请输入推广码");
  if (!promotionForm.name?.trim()) return ElMessage.error("请输入推广码名称");
  promotionSaving.value = true;
  try {
    const payload = {
      code: promotionForm.code.trim(),
      name: promotionForm.name.trim(),
      tenantId: isPlatformAdmin() ? filters.tenantId : undefined,
      promoterUserId: promotionForm.promoterUserId || null,
      agentId: promotionForm.agentId || null,
      commissionRate: Number(promotionForm.commissionRatePercent || 0) / 100,
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
  try {
    await api.patch(`/admin/mall/logistics-companies/${row.id}`, { ...row, tenantId: isPlatformAdmin() ? row.tenant?.id || filters.tenantId : undefined, enabled: !row.enabled });
    ElMessage.success(row.enabled ? "物流公司已停用" : "物流公司已启用");
    await loadLogisticsCompanies();
  } catch (error: any) {
    ElMessage.error(error.message || "操作失败");
  }
}
async function toggleCoupon(row: any) {
  try {
    await api.patch(`/admin/mall/coupons/${row.id}`, {
      code: row.code,
      name: row.name,
      tenantId: isPlatformAdmin() ? row.tenant?.id || filters.tenantId : undefined,
      minAmount: Number(row.minAmount || 0),
      discountAmount: Number(row.discountAmount || 0),
      scope: row.scope || "all",
      scopeCategoryId: row.scopeCategoryId || null,
      scopeProductId: row.scopeProductId || null,
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
  try {
    await api.patch(`/admin/mall/flash-sales/${row.id}`, {
      title: row.title,
      tenantId: isPlatformAdmin() ? row.tenant?.id || filters.tenantId : undefined,
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
  try {
    await api.patch(`/admin/mall/group-buys/${row.id}`, {
      title: row.title,
      tenantId: isPlatformAdmin() ? row.tenant?.id || filters.tenantId : undefined,
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
  try {
    await api.patch(`/admin/mall/promotion-codes/${row.id}`, {
      code: row.code,
      name: row.name,
      tenantId: isPlatformAdmin() ? row.tenant?.id || filters.tenantId : undefined,
      promoterUserId: row.promoterUser?.id || null,
      agentId: row.agent?.id || null,
      commissionRate: Number(row.commissionRate || 0),
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
  await loadTenants();
  reload();
  await openRoutePanel();
});
watch(() => [route.path, route.query.panel, route.query.tenantId], async () => {
  filters.tenantId = routeTenantId();
  reload();
  await openRoutePanel();
});
</script>

<style scoped>
.mall-page { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
.page-header p { margin: 6px 0 0; color: #64748b; }
.finance-note { font-size: 12px; color: #94a3b8 !important; }
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
.item-line { line-height: 1.7; color: #334155; }
.action-tip { color: #475569; line-height: 1.5; }
.refund-toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 12px; }
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
