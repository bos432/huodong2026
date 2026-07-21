<template>
  <div class="mall-payment-logs-page">
    <div class="page-header">
      <div>
        <h2>商城支付日志</h2>
        <p>核对支付流水、真实支付回调、退款日志和推广佣金；平台可全局追踪，商家/代理只看已授权店铺。</p>
      </div>
      <div class="header-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" :disabled="scopeLocked" clearable filterable placeholder="全部商家/代理" style="width:220px" @change="handleTenantChange">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-select v-model="filters.merchantId" :disabled="scopeLocked" clearable filterable placeholder="全部授权店铺；可选单店" style="width:280px" @change="handleMerchantChange">
          <el-option v-for="merchant in merchants" :key="merchant.id" :label="merchantLabel(merchant)" :value="merchant.id" />
        </el-select>
        <el-input v-model="filters.keyword" :disabled="scopeLocked" clearable placeholder="订单号/交易号/手机号/失败原因" style="width:260px" @keyup.enter="loadPaymentData" @clear="loadPaymentData" />
        <el-button :loading="loadingAny" :disabled="scopeLocked" @click="loadPaymentData">刷新日志</el-button>
      </div>
    </div>

    <el-alert v-if="tenantErrorMessage" class="scope-alert" type="error" show-icon :closable="false" :title="tenantErrorMessage">
      <template #default><el-button size="small" @click="retryScopeLoading">重试商家列表</el-button></template>
    </el-alert>
    <el-alert v-if="merchantErrorMessage" class="scope-alert" type="error" show-icon :closable="false" :title="merchantErrorMessage">
      <template #default><el-button size="small" @click="retryScopeLoading">重试店铺列表</el-button></template>
    </el-alert>
    <el-alert v-if="transactionError" class="scope-alert" type="error" show-icon :closable="false" title="支付流水加载失败">
      <template #default><span>{{ transactionError }}</span><el-button size="small" @click="loadTransactions">重试支付流水</el-button></template>
    </el-alert>
    <el-alert v-if="callbackError" class="scope-alert" type="error" show-icon :closable="false" title="支付回调加载失败">
      <template #default><span>{{ callbackError }}</span><el-button size="small" @click="loadCallbacks">重试支付回调</el-button></template>
    </el-alert>
    <el-alert v-if="refundError" class="scope-alert" type="error" show-icon :closable="false" title="退款日志加载失败">
      <template #default><span>{{ refundError }}</span><el-button size="small" @click="loadRefundLogs">重试退款日志</el-button></template>
    </el-alert>
    <el-alert v-if="commissionError" class="scope-alert" type="error" show-icon :closable="false" title="佣金数据部分或全部加载失败">
      <template #default><span>{{ commissionError }}</span><el-button size="small" @click="loadCommissions">重试佣金数据</el-button></template>
    </el-alert>
    <el-alert v-if="statementError" class="scope-alert" type="error" show-icon :closable="false" title="渠道账单加载失败">
      <template #default><span>{{ statementError }}</span><el-button size="small" @click="loadStatements">重试渠道账单</el-button></template>
    </el-alert>

    <el-alert
      v-if="deepLinkWarning"
      class="scope-alert"
      type="error"
      show-icon
      :closable="false"
      title="商城支付日志店铺链接不可用"
      :description="deepLinkWarning"
    />
    <el-alert
      v-else-if="!selectedMerchant && isPlatformAdmin()"
      class="scope-alert"
      type="info"
      show-icon
      :closable="false"
      title="当前是全局支付核对模式"
      description="平台账号可以不选店铺查看全平台或所选商家下全部店铺支付数据；导出时会沿用当前筛选条件，适合上线前真实收钱联调和财务对账。"
    />
    <el-alert
      v-else-if="!selectedMerchant && merchants.length > 1"
      class="scope-alert"
      type="warning"
      show-icon
      :closable="false"
      title="请选择要核对的店铺"
      description="当前账号可管理多个商城店铺。为避免把不同店铺的收款、回调和退款混在一起，请先选择一个店铺。"
    />

    <el-card v-if="selectedMerchant && !deepLinkWarning" shadow="never" class="merchant-card">
      <div>
        <strong>当前核对店铺：{{ selectedMerchant.name || selectedMerchant.code }}</strong>
        <p>{{ selectedMerchant.tenant?.name || selectedMerchant.tenant?.code || "平台店铺" }} · {{ merchantOwnerText(selectedMerchant) }} · {{ selectedMerchant.region || "未设置区域" }}</p>
      </div>
      <div class="merchant-tags">
        <el-tag type="success">商城已开放</el-tag>
        <el-tag type="warning" effect="plain">{{ paymentModeText(selectedMerchant.paymentMode) }}</el-tag>
      </div>
      <div class="merchant-actions">
        <el-button size="small" type="primary" plain @click="goMerchantAdmin('/mall-orders')">订单管理</el-button>
        <el-button size="small" type="success" plain @click="goMerchantAdmin('/mall-statistics')">经营统计</el-button>
        <el-button v-if="canManageStatements" size="small" type="warning" plain @click="goMerchantAdmin('/mall-payments')">收款配置</el-button>
        <el-button v-if="canManageCommissions" size="small" type="info" plain @click="goMerchantAdmin('/mall-settlements')">商城结算</el-button>
        <el-button size="small" @click="openMerchantH5">打开 H5 店铺</el-button>
        <el-button size="small" @click="copyWorkbenchLink">复制支付日志链接</el-button>
      </div>
    </el-card>

    <el-card shadow="never" class="filter-card">
      <div class="filter-row">
        <el-select v-model="filters.paymentMethod" :disabled="scopeLocked" clearable placeholder="支付方式" style="width:140px" @change="loadPaymentData">
          <el-option label="微信支付" value="wechat" />
          <el-option label="余额支付" value="balance" />
          <el-option label="线下收款" value="offline" />
          <el-option label="支付宝" value="alipay" />
        </el-select>
        <el-select v-model="filters.paymentStatus" :disabled="scopeLocked" clearable placeholder="流水状态" style="width:140px" @change="loadPaymentData">
          <el-option label="成功" value="success" />
          <el-option label="差异" value="discrepancy" />
          <el-option label="失败" value="failed" />
        </el-select>
        <el-select v-model="filters.callbackStatus" :disabled="scopeLocked" clearable placeholder="回调状态" style="width:150px" @change="loadPaymentData">
          <el-option label="成功" value="success" />
          <el-option label="失败" value="failed" />
          <el-option label="幂等" value="idempotent" />
          <el-option label="已接收" value="received" />
        </el-select>
        <el-select v-model="filters.commissionStatus" :disabled="scopeLocked" clearable placeholder="佣金状态" style="width:150px" @change="loadPaymentData">
          <el-option label="风险复核" value="risk_review" />
          <el-option label="待结算" value="pending" />
          <el-option label="已作废" value="void" />
          <el-option label="已结算" value="settled" />
        </el-select>
        <el-input v-model="filters.checkoutGroupNo" :disabled="scopeLocked" clearable placeholder="跨店结算组号" style="width:190px" @keyup.enter="loadPaymentData" @clear="loadPaymentData" />
        <el-date-picker v-model="dateRange" :disabled="scopeLocked" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" style="width:250px" @change="handleDateRangeChange" />
      </div>
      <div class="filter-row">
        <el-button :loading="exportingKey === 'transactions'" :disabled="scopeLocked" @click="exportPaymentTransactions">导出支付流水</el-button>
        <el-button :loading="exportingKey === 'callbacks'" :disabled="scopeLocked" @click="exportPaymentCallbackLogs">导出支付回调</el-button>
        <el-button :loading="exportingKey === 'commissions'" :disabled="scopeLocked" @click="exportCommissions">导出佣金明细</el-button>
        <el-button :loading="exportingKey === 'promoters'" :disabled="scopeLocked" @click="exportCommissionPromoters">导出佣金汇总</el-button>
      </div>
    </el-card>

    <div class="summary-grid">
      <el-card v-for="item in summaryCards" :key="item.label" shadow="never">
        <small>{{ item.label }}</small>
        <strong>{{ item.value }}</strong>
        <span>{{ item.desc }}</span>
      </el-card>
    </div>

    <div class="payment-log-grid">
      <el-card shadow="never">
        <template #header>
          <div class="section-header">
            <span>支付流水</span>
            <small>成功支付必须有流水，差异记录要能导出追踪</small>
          </div>
        </template>
        <el-table v-loading="transactionLoading" :data="paymentTransactions" size="small" stripe empty-text="暂无支付流水">
          <el-table-column label="订单/交易号" min-width="220">
            <template #default="{ row }">
              <strong>{{ row.order?.orderNo || "-" }}</strong>
              <small>{{ row.transactionNo || "-" }}</small>
              <small>{{ row.order?.checkoutGroup?.groupNo || "非跨店订单" }}</small>
            </template>
          </el-table-column>
          <el-table-column label="店铺" min-width="140"><template #default="{ row }">{{ row.merchant?.name || row.order?.merchant?.name || "-" }}</template></el-table-column>
          <el-table-column label="渠道" width="100"><template #default="{ row }">{{ paymentText(row.paymentMethod || row.provider) }}</template></el-table-column>
          <el-table-column label="金额" width="110"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="paymentStatusType(row.status)">{{ paymentStatusText(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="说明" min-width="190" show-overflow-tooltip><template #default="{ row }">{{ row.remark || row.discrepancyType || "-" }}</template></el-table-column>
          <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
          <el-table-column label="操作" width="90"><template #default="{ row }"><el-button size="small" text type="primary" :disabled="!relatedOrderNo(row)" @click.stop="openRelatedOrder(row)">打开订单</el-button></template></el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="section-header">
            <span>支付回调日志</span>
            <small>重复回调应幂等，签名失败要重点排查</small>
          </div>
        </template>
        <el-table v-loading="callbackLoading" :data="paymentCallbackLogs" size="small" stripe empty-text="暂无支付回调">
          <el-table-column label="订单/交易号" min-width="220">
            <template #default="{ row }">
              <strong>{{ row.orderNo || row.order?.orderNo || "-" }}</strong>
              <small>{{ row.transactionNo || "-" }}</small>
              <small>{{ row.order?.checkoutGroup?.groupNo || "非跨店订单" }}</small>
            </template>
          </el-table-column>
          <el-table-column label="渠道" width="100"><template #default="{ row }">{{ paymentText(row.provider) }}</template></el-table-column>
          <el-table-column label="金额" width="110"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          <el-table-column label="签名" width="90"><template #default="{ row }"><el-tag :type="row.signatureValid === false ? 'danger' : 'success'">{{ row.signatureValid === false ? "失败" : "通过" }}</el-tag></template></el-table-column>
          <el-table-column label="结果" width="100"><template #default="{ row }"><el-tag :type="callbackStatusType(row.resultStatus)">{{ callbackStatusText(row.resultStatus) }}</el-tag></template></el-table-column>
          <el-table-column label="原因" min-width="190" show-overflow-tooltip><template #default="{ row }">{{ row.resultMessage || "-" }}</template></el-table-column>
          <el-table-column label="处理时间" width="170"><template #default="{ row }">{{ formatTime(row.processedAt || row.createdAt) }}</template></el-table-column>
          <el-table-column label="操作" width="90"><template #default="{ row }"><el-button size="small" text type="primary" :disabled="!relatedOrderNo(row)" @click.stop="openRelatedOrder(row)">打开订单</el-button></template></el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="section-header">
            <span>退款日志</span>
            <small>原路退款、余额退回和线下退款都要留痕</small>
          </div>
        </template>
        <el-table v-loading="refundLoading" :data="refundLogs" size="small" stripe empty-text="暂无退款日志">
          <el-table-column label="售后/订单" min-width="220">
            <template #default="{ row }">
              <strong>{{ row.refund?.refundNo || "-" }}</strong>
              <small>{{ row.order?.orderNo || row.providerRefundNo || "-" }}</small>
              <small>{{ row.order?.checkoutGroup?.groupNo || "非跨店订单" }}</small>
            </template>
          </el-table-column>
          <el-table-column label="渠道" width="100"><template #default="{ row }">{{ refundProviderName(row.provider) }}</template></el-table-column>
          <el-table-column label="金额" width="110"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
          <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="refundLogStatusType(row.status)">{{ refundLogStatusText(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="说明" min-width="200" show-overflow-tooltip><template #default="{ row }">{{ row.message || "-" }}</template></el-table-column>
          <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
          <el-table-column label="操作" width="90"><template #default="{ row }"><el-button size="small" text type="primary" :disabled="!relatedOrderNo(row)" @click.stop="openRelatedOrder(row)">打开订单</el-button></template></el-table-column>
        </el-table>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <div class="section-header">
            <div><span>推广与代理佣金</span><small>按商品、规则版本和受益层级核对，风险复核记录不会进入批量结算</small></div>
            <el-button v-if="canManageCommissions" size="small" type="primary" :loading="actionKey === 'commission:batch-settle'" :disabled="!commissionSummary.pendingCount || scopeLocked" @click="batchSettleCommissions">批量结算当前筛选</el-button>
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
          <el-table-column label="订单金额" width="110"><template #default="{ row }">¥{{ money(row.orderAmount) }}</template></el-table-column>
          <el-table-column label="总佣金" width="110"><template #default="{ row }">¥{{ money(row.commissionAmount) }}</template></el-table-column>
          <el-table-column label="待结算" width="130"><template #default="{ row }">¥{{ money(row.pendingAmount) }} / {{ row.pendingCount }} 笔</template></el-table-column>
          <el-table-column label="风险复核" width="130"><template #default="{ row }">¥{{ money(row.riskReviewAmount) }} / {{ row.riskReviewCount }} 笔</template></el-table-column>
          <el-table-column label="已结算" width="130"><template #default="{ row }">¥{{ money(row.settledAmount) }} / {{ row.settledCount }} 笔</template></el-table-column>
          <el-table-column label="待扣回" width="110"><template #default="{ row }">¥{{ money(row.clawbackAmount) }}</template></el-table-column>
        </el-table>
        <el-table v-loading="commissionLoading" :data="commissions" size="small" stripe empty-text="暂无佣金明细">
          <el-table-column label="订单/推广码" min-width="220">
            <template #default="{ row }">
              <strong>{{ row.order?.orderNo || "-" }}</strong>
              <small>{{ row.code || "-" }}</small>
              <small>{{ row.order?.checkoutGroup?.groupNo || "非跨店订单" }}</small>
            </template>
          </el-table-column>
          <el-table-column label="推广人/代理" min-width="140"><template #default="{ row }">{{ row.promoterUser?.phone ? maskPhone(row.promoterUser.phone) : row.agent?.name || "-" }}</template></el-table-column>
          <el-table-column label="商品/规则" min-width="190"><template #default="{ row }"><strong>{{ row.product?.title || row.orderItem?.productTitle || "-" }}</strong><small>{{ commissionRuleText(row) }}</small></template></el-table-column>
          <el-table-column label="受益层级" width="110"><template #default="{ row }">{{ commissionBeneficiaryText(row) }}</template></el-table-column>
          <el-table-column label="计佣基数" width="110"><template #default="{ row }">¥{{ money(row.orderAmount) }}</template></el-table-column>
          <el-table-column label="佣金/扣回" width="130"><template #default="{ row }">¥{{ money(row.commissionAmount) }}<small v-if="commissionPendingClawback(row) > 0">待扣回 ¥{{ money(commissionPendingClawback(row)) }}</small></template></el-table-column>
          <el-table-column label="状态" width="100"><template #default="{ row }"><el-tag :type="commissionStatusType(row.status)">{{ commissionStatusText(row.status) }}</el-tag></template></el-table-column>
          <el-table-column label="结算/说明" min-width="180" show-overflow-tooltip><template #default="{ row }">{{ commissionRemark(row) }}</template></el-table-column>
          <el-table-column label="操作" width="280" fixed="right"><template #default="{ row }"><el-button size="small" text type="primary" :disabled="!relatedOrderNo(row) || scopeLocked" @click.stop="openRelatedOrder(row)">订单</el-button><el-button v-if="canManageCommissions && row.status === 'pending'" size="small" type="success" plain :loading="actionKey === `commission:settle:${row.id}`" :disabled="scopeLocked" @click="settleCommission(row)">结算</el-button><el-button v-if="canManageCommissions && row.clawbackStatus === 'pending'" size="small" type="warning" plain :loading="actionKey === `commission:clawback:${row.id}`" :disabled="scopeLocked" @click="settleCommissionClawback(row)">确认扣回</el-button><template v-if="canManageCommissions && row.status === 'risk_review'"><el-button size="small" type="success" plain :loading="actionKey === `commission:review:approve:${row.id}`" :disabled="scopeLocked" @click="reviewCommission(row, 'approve')">通过</el-button><el-button size="small" type="danger" plain :loading="actionKey === `commission:review:reject:${row.id}`" :disabled="scopeLocked" @click="reviewCommission(row, 'reject')">拒绝</el-button></template></template></el-table-column>
        </el-table>
        <el-divider>佣金调整流水</el-divider>
        <el-table v-loading="commissionLoading" :data="commissionAdjustments" size="small" border empty-text="暂无佣金调整流水">
          <el-table-column label="类型" width="120"><template #default="{ row }">{{ commissionAdjustmentTypeText(row.type) }}</template></el-table-column>
          <el-table-column label="订单/退款" min-width="200"><template #default="{ row }"><strong>{{ row.order?.orderNo || "-" }}</strong><small>{{ row.refund?.refundNo || row.operationKey }}</small></template></el-table-column>
          <el-table-column label="金额" width="110"><template #default="{ row }">{{ row.direction === "debit" ? "-" : "+" }}¥{{ money(row.amount) }}</template></el-table-column>
          <el-table-column label="前后值" width="150"><template #default="{ row }">¥{{ money(row.beforeAmount) }} → ¥{{ money(row.afterAmount) }}</template></el-table-column>
          <el-table-column prop="remark" label="说明" min-width="220" show-overflow-tooltip />
          <el-table-column label="时间" width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        </el-table>
      </el-card>
    </div>
    <el-card shadow="never" class="statement-card">
      <template #header><div class="section-header"><span>渠道账单勾兑</span><small>按店铺账户拉取或导入账单，差异必须认领并留处理记录</small></div></template>
      <div class="filter-row">
        <el-select v-model="filters.statementStatus" :disabled="scopeLocked" clearable placeholder="勾兑状态" style="width:150px" @change="loadPaymentData"><el-option label="已匹配" value="matched" /><el-option label="待处理" value="pending" /><el-option label="已解决" value="resolved" /><el-option label="已忽略" value="ignored" /></el-select>
        <el-button v-if="canManageStatements" :loading="actionKey === 'statement:fetch'" :disabled="!selectedMerchant || scopeLocked" @click="fetchStatements">拉取渠道账单</el-button><el-button v-if="canManageStatements" :loading="actionKey === 'statement:import'" :disabled="!selectedMerchant || scopeLocked" @click="importStatements">粘贴 JSON 导入</el-button><el-button :loading="exportingKey === 'statements'" :disabled="scopeLocked" @click="exportStatements">导出账单</el-button>
      </div>
      <el-table v-loading="statementLoading" :data="paymentStatements" size="small" stripe empty-text="暂无渠道账单">
        <el-table-column label="流水/订单" min-width="220"><template #default="{ row }"><strong>{{ row.transactionNo }}</strong><small>{{ row.orderNo || "未关联订单" }}</small><small>{{ row.batchNo || "-" }}</small></template></el-table-column>
        <el-table-column label="店铺" min-width="130"><template #default="{ row }">{{ row.merchant?.name || "-" }}</template></el-table-column><el-table-column label="金额" width="110"><template #default="{ row }">¥{{ money(row.amount) }}</template></el-table-column>
        <el-table-column label="勾兑" width="110"><template #default="{ row }"><el-tag :type="row.reconciliationStatus === 'matched' ? 'success' : row.reconciliationStatus === 'pending' ? 'danger' : 'warning'">{{ row.reconciliationStatus }}</el-tag></template></el-table-column>
        <el-table-column prop="discrepancyType" label="差异类型" width="160" /><el-table-column prop="remark" label="说明" min-width="180" show-overflow-tooltip /><el-table-column label="认领/处理" min-width="160"><template #default="{ row }">{{ row.claimedBy || "未认领" }}<small>{{ row.resolvedBy ? `${row.resolvedBy} · ${row.resolutionRemark || ''}` : '-' }}</small></template></el-table-column>
        <el-table-column v-if="canManageStatements" label="操作" width="260"><template #default="{ row }"><el-button v-if="row.reconciliationStatus === 'pending' && !row.claimedBy" size="small" :loading="actionKey === `statement:claim:${row.id}`" :disabled="scopeLocked" @click="claimStatement(row)">认领</el-button><el-button v-if="row.reconciliationStatus === 'pending'" size="small" type="primary" :loading="actionKey === `statement:recheck:${row.id}`" :disabled="scopeLocked" @click="resolveStatement(row, 'recheck')">重勾兑</el-button><el-button v-if="row.reconciliationStatus === 'pending'" size="small" type="success" :loading="actionKey === `statement:resolved:${row.id}`" :disabled="scopeLocked" @click="resolveStatement(row, 'resolved')">解决</el-button><el-button v-if="row.reconciliationStatus === 'pending'" size="small" :loading="actionKey === `statement:ignored:${row.id}`" :disabled="scopeLocked" @click="resolveStatement(row, 'ignored')">忽略</el-button></template></el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { api, downloadFile } from "../api";
import { copyToClipboard, h5RoutePreviewUrl } from "../h5-preview";
import { hasPermission, isPlatformAdmin } from "../permissions";
import { maskPhone } from "../privacy";

type Merchant = {
  id: number;
  code?: string;
  name?: string;
  ownerType?: string;
  paymentMode?: string;
  region?: string | null;
  tenant?: { id?: number; name?: string; code?: string } | null;
};

const route = useRoute();
const router = useRouter();
const tenants = ref<any[]>([]);
const merchants = ref<Merchant[]>([]);
const paymentTransactions = ref<any[]>([]);
const paymentCallbackLogs = ref<any[]>([]);
const refundLogs = ref<any[]>([]);
const commissions = ref<any[]>([]);
const commissionSummary = ref<any>({});
const commissionPromoterSummary = ref<any[]>([]);
const commissionAdjustments = ref<any[]>([]);
const paymentStatements = ref<any[]>([]);
const merchantLoading = ref(false);
const transactionLoading = ref(false);
const callbackLoading = ref(false);
const refundLoading = ref(false);
const commissionLoading = ref(false);
const statementLoading = ref(false);
const transactionError = ref("");
const callbackError = ref("");
const refundError = ref("");
const commissionError = ref("");
const statementError = ref("");
const tenantErrorMessage = ref("");
const merchantErrorMessage = ref("");
const actionKey = ref("");
const exportingKey = ref("");
const deepLinkWarning = ref("");
const dateRange = ref<string[]>([]);
const filters = reactive({
  tenantId: routeTenantId(),
  merchantId: routeMerchantId(),
  paymentMethod: "",
  paymentStatus: "",
  callbackStatus: "",
  commissionStatus: "",
  statementStatus: "",
  keyword: "",
  checkoutGroupNo: "",
  startDate: "",
  endDate: ""
});
let transactionLoadSequence = 0;
let callbackLoadSequence = 0;
let refundLoadSequence = 0;
let commissionLoadSequence = 0;
let statementLoadSequence = 0;
let merchantLoadSequence = 0;

const selectedMerchant = computed(() => merchants.value.find((merchant) => merchant.id === filters.merchantId));
const loadingAny = computed(() => merchantLoading.value || transactionLoading.value || callbackLoading.value || refundLoading.value || commissionLoading.value || statementLoading.value);
const scopeLocked = computed(() => Boolean(actionKey.value || exportingKey.value));
const canManageStatements = hasPermission("mall.payment.manage");
const canManageCommissions = hasPermission("mall.settlement.manage");
const summaryCards = computed(() => [
  { label: "支付流水", value: paymentTransactions.value.length, desc: `成功 ${paymentTransactions.value.filter((item) => item.status === "success").length} 条` },
  { label: "支付回调", value: paymentCallbackLogs.value.length, desc: `失败 ${paymentCallbackLogs.value.filter((item) => item.resultStatus === "failed").length} 条` },
  { label: "退款日志", value: refundLogs.value.length, desc: `失败 ${refundLogs.value.filter((item) => item.status === "failed").length} 条` },
  { label: "待结算佣金", value: `¥${money(commissionSummary.value.pendingAmount)}`, desc: `${commissionSummary.value.pendingCount || 0} 笔` }
]);
const commissionSummaryCards = computed(() => [
  { label: "总佣金", value: `¥${money(commissionSummary.value.totalAmount)}`, count: `${commissionSummary.value.totalCount || 0} 笔` },
  { label: "风险复核", value: `¥${money(commissionSummary.value.riskReviewAmount)}`, count: `${commissionSummary.value.riskReviewCount || 0} 笔` },
  { label: "待结算", value: `¥${money(commissionSummary.value.pendingAmount)}`, count: `${commissionSummary.value.pendingCount || 0} 笔` },
  { label: "已结算", value: `¥${money(commissionSummary.value.settledAmount)}`, count: `${commissionSummary.value.settledCount || 0} 笔` },
  { label: "待扣回", value: `¥${money(commissionSummary.value.clawbackPendingAmount)}`, count: `${commissionSummary.value.clawbackPendingCount || 0} 笔` },
  { label: "已作废", value: `¥${money(commissionSummary.value.voidAmount)}`, count: `${commissionSummary.value.voidCount || 0} 笔` }
]);

function routeTenantId() {
  const id = typeof route.query.tenantId === "string" ? Number(route.query.tenantId) : 0;
  return isPlatformAdmin() && id ? id : undefined;
}

function routeMerchantId() {
  const id = typeof route.query.merchantId === "string" ? Number(route.query.merchantId) : 0;
  return id || undefined;
}

function tenantLabel(tenant: any) {
  return `${tenant.name || tenant.code}（${tenant.code}）`;
}

function merchantOwnerText(merchant?: Merchant) {
  return merchant?.ownerType === "agent" ? "代理店铺" : "商家店铺";
}

function merchantLabel(merchant: Merchant) {
  return `${merchant.name || merchant.code}（${merchantOwnerText(merchant)}${merchant.region ? ` · ${merchant.region}` : ""}）`;
}

function paymentModeText(value?: string) {
  return value === "merchant_direct" ? "商户直收" : "平台代收";
}

function merchantLinkWarning(requestedMerchantId: number) {
  return `当前链接指定的店铺 #${requestedMerchantId} 对当前账号不可见，或已被商家筛选条件过滤。为避免误读支付和退款数据，系统不会自动切换到其它店铺；请联系平台管理员确认店铺授权，或清空筛选后重试。`;
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

function baseLogParams(extra: Record<string, any> = {}) {
  return currentMallParams({
    keyword: filters.keyword.trim() || undefined,
    checkoutGroupNo: filters.checkoutGroupNo.trim() || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    ...extra
  });
}

function appendBaseLogParams(params: URLSearchParams) {
  appendCurrentMallParams(params);
  if (filters.keyword.trim()) params.set("keyword", filters.keyword.trim());
  if (filters.checkoutGroupNo.trim()) params.set("checkoutGroupNo", filters.checkoutGroupNo.trim());
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
}

async function syncRouteQuery() {
  const query: Record<string, string> = {};
  if (filters.tenantId) query.tenantId = String(filters.tenantId);
  if (filters.merchantId) query.merchantId = String(filters.merchantId);
  await router.replace({ path: route.path, query });
}

function clearPaymentData() {
  transactionLoadSequence += 1;
  callbackLoadSequence += 1;
  refundLoadSequence += 1;
  commissionLoadSequence += 1;
  statementLoadSequence += 1;
  transactionLoading.value = false;
  callbackLoading.value = false;
  refundLoading.value = false;
  commissionLoading.value = false;
  statementLoading.value = false;
  paymentTransactions.value = [];
  paymentCallbackLogs.value = [];
  refundLogs.value = [];
  commissions.value = [];
  commissionSummary.value = {};
  commissionPromoterSummary.value = [];
  commissionAdjustments.value = [];
  paymentStatements.value = [];
  transactionError.value = "";
  callbackError.value = "";
  refundError.value = "";
  commissionError.value = "";
  statementError.value = "";
}

function paymentScopeKey() {
  return JSON.stringify({
    tenantId: filters.tenantId || null,
    merchantId: filters.merchantId || null,
    paymentMethod: filters.paymentMethod,
    paymentStatus: filters.paymentStatus,
    callbackStatus: filters.callbackStatus,
    commissionStatus: filters.commissionStatus,
    statementStatus: filters.statementStatus,
    keyword: filters.keyword.trim(),
    checkoutGroupNo: filters.checkoutGroupNo.trim(),
    startDate: filters.startDate,
    endDate: filters.endDate
  });
}

function clearCommissionData() {
  commissions.value = [];
  commissionSummary.value = {};
  commissionPromoterSummary.value = [];
  commissionAdjustments.value = [];
}

async function loadTenants() {
  tenantErrorMessage.value = "";
  try {
    tenants.value = isPlatformAdmin() ? await api.get<any, any[]>("/admin/tenants") : [];
  } catch (error: any) {
    tenants.value = [];
    tenantErrorMessage.value = error.message || "商家列表加载失败";
  }
}

async function loadMerchants() {
  const sequence = ++merchantLoadSequence;
  const requestedTenantId = filters.tenantId;
  merchantLoading.value = true;
  merchantErrorMessage.value = "";
  try {
    const rows = await api.get<any, Merchant[]>("/admin/mall/accessible-merchants", { params: { tenantId: isPlatformAdmin() ? requestedTenantId : undefined, enabled: "true" } });
    if (sequence !== merchantLoadSequence || requestedTenantId !== filters.tenantId) return false;
    merchants.value = Array.isArray(rows) ? rows : [];
    const requestedMerchantId = routeMerchantId();
    deepLinkWarning.value = "";
    if (requestedMerchantId && merchants.value.some((merchant) => merchant.id === requestedMerchantId)) filters.merchantId = requestedMerchantId;
    else if (requestedMerchantId) {
      filters.merchantId = undefined;
      deepLinkWarning.value = merchantLinkWarning(requestedMerchantId);
      clearPaymentData();
      return false;
    } else if (filters.merchantId && !merchants.value.some((merchant) => merchant.id === filters.merchantId)) filters.merchantId = undefined;
    if (!filters.merchantId && !isPlatformAdmin() && merchants.value.length === 1) filters.merchantId = merchants.value[0].id;
    return true;
  } catch (error: any) {
    if (sequence !== merchantLoadSequence || requestedTenantId !== filters.tenantId) return false;
    merchants.value = [];
    filters.merchantId = undefined;
    clearPaymentData();
    merchantErrorMessage.value = error.message || "加载可核对店铺失败";
    return false;
  } finally {
    if (sequence === merchantLoadSequence) merchantLoading.value = false;
  }
}

async function loadTransactions() {
  const sequence = ++transactionLoadSequence;
  const scopeKey = paymentScopeKey();
  transactionLoading.value = true;
  transactionError.value = "";
  paymentTransactions.value = [];
  try {
    const rows = await api.get<any, any[]>("/admin/mall/payment-transactions", { params: { ...baseLogParams(), paymentMethod: filters.paymentMethod || undefined, status: filters.paymentStatus || undefined } });
    if (sequence !== transactionLoadSequence || scopeKey !== paymentScopeKey()) return;
    paymentTransactions.value = Array.isArray(rows) ? rows : [];
  } catch (error: any) {
    if (sequence !== transactionLoadSequence || scopeKey !== paymentScopeKey()) return;
    paymentTransactions.value = [];
    transactionError.value = error.message || "支付流水加载失败";
  } finally {
    if (sequence === transactionLoadSequence) transactionLoading.value = false;
  }
}

async function loadCallbacks() {
  const sequence = ++callbackLoadSequence;
  const scopeKey = paymentScopeKey();
  callbackLoading.value = true;
  callbackError.value = "";
  paymentCallbackLogs.value = [];
  try {
    const rows = await api.get<any, any[]>("/admin/mall/payment-callback-logs", { params: { ...baseLogParams(), status: filters.callbackStatus || undefined } });
    if (sequence !== callbackLoadSequence || scopeKey !== paymentScopeKey()) return;
    paymentCallbackLogs.value = Array.isArray(rows) ? rows : [];
  } catch (error: any) {
    if (sequence !== callbackLoadSequence || scopeKey !== paymentScopeKey()) return;
    paymentCallbackLogs.value = [];
    callbackError.value = error.message || "支付回调加载失败";
  } finally {
    if (sequence === callbackLoadSequence) callbackLoading.value = false;
  }
}

async function loadRefundLogs() {
  const sequence = ++refundLoadSequence;
  const scopeKey = paymentScopeKey();
  refundLoading.value = true;
  refundError.value = "";
  refundLogs.value = [];
  try {
    const rows = await api.get<any, any[]>("/admin/mall/refund-logs", { params: baseLogParams() });
    if (sequence !== refundLoadSequence || scopeKey !== paymentScopeKey()) return;
    refundLogs.value = Array.isArray(rows) ? rows : [];
  } catch (error: any) {
    if (sequence !== refundLoadSequence || scopeKey !== paymentScopeKey()) return;
    refundLogs.value = [];
    refundError.value = error.message || "退款日志加载失败";
  } finally {
    if (sequence === refundLoadSequence) refundLoading.value = false;
  }
}

async function loadCommissions() {
  const sequence = ++commissionLoadSequence;
  const scopeKey = paymentScopeKey();
  commissionLoading.value = true;
  commissionError.value = "";
  clearCommissionData();
  const params = { ...baseLogParams(), status: filters.commissionStatus || undefined };
  const requests = [
    { label: "佣金明细", run: () => api.get<any, any[]>("/admin/mall/commissions", { params }) },
    { label: "佣金摘要", run: () => api.get<any, any>("/admin/mall/commissions/summary", { params }) },
    { label: "推广人汇总", run: () => api.get<any, any[]>("/admin/mall/commissions/by-promoter", { params }) },
    { label: "佣金调整流水", run: () => api.get<any, any[]>("/admin/mall/commission-adjustments", { params: baseLogParams() }) }
  ];
  const results = await Promise.allSettled(requests.map((request) => request.run()));
  if (sequence !== commissionLoadSequence || scopeKey !== paymentScopeKey()) {
    if (sequence === commissionLoadSequence) commissionLoading.value = false;
    return;
  }
  const failed: string[] = [];
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      failed.push(`${requests[index].label}：${result.reason?.message || "加载失败"}`);
      return;
    }
    if (index === 0) commissions.value = Array.isArray(result.value) ? result.value : [];
    if (index === 1) commissionSummary.value = result.value || {};
    if (index === 2) commissionPromoterSummary.value = Array.isArray(result.value) ? result.value : [];
    if (index === 3) commissionAdjustments.value = Array.isArray(result.value) ? result.value : [];
  });
  commissionError.value = failed.join("；");
  commissionLoading.value = false;
}

async function loadStatements() {
  const sequence = ++statementLoadSequence;
  const scopeKey = paymentScopeKey();
  statementLoading.value = true;
  statementError.value = "";
  paymentStatements.value = [];
  try {
    const rows = await api.get<any, any[]>("/admin/mall/payment-statements", { params: { ...baseLogParams(), status: filters.statementStatus || undefined } });
    if (sequence !== statementLoadSequence || scopeKey !== paymentScopeKey()) return;
    paymentStatements.value = Array.isArray(rows) ? rows : [];
  } catch (error: any) {
    if (sequence !== statementLoadSequence || scopeKey !== paymentScopeKey()) return;
    paymentStatements.value = [];
    statementError.value = error.message || "渠道账单加载失败";
  } finally {
    if (sequence === statementLoadSequence) statementLoading.value = false;
  }
}

async function loadPaymentData() {
  if (deepLinkWarning.value) return;
  if (!isPlatformAdmin() && !filters.merchantId) {
    clearPaymentData();
    return;
  }
  await Promise.allSettled([loadTransactions(), loadCallbacks(), loadRefundLogs(), loadCommissions(), loadStatements()]);
}

async function handleTenantChange() {
  filters.merchantId = undefined;
  await syncRouteQuery();
  const ok = await loadMerchants();
  if (ok) await loadPaymentData();
}

async function handleMerchantChange() {
  deepLinkWarning.value = "";
  await syncRouteQuery();
  await loadPaymentData();
}

function handleDateRangeChange() {
  filters.startDate = dateRange.value?.[0] || "";
  filters.endDate = dateRange.value?.[1] || "";
  void loadPaymentData();
}

function merchantWorkbenchUrl() {
  if (!selectedMerchant.value) return "";
  const query = new URLSearchParams();
  if (selectedMerchant.value.tenant?.id) query.set("tenantId", String(selectedMerchant.value.tenant.id));
  query.set("merchantId", String(selectedMerchant.value.id));
  return `${window.location.origin}/admin/mall-payment-logs?${query.toString()}`;
}

function merchantH5Url() {
  if (!selectedMerchant.value) return "";
  return h5RoutePreviewUrl(selectedMerchant.value.tenant?.code || "", `/pages/mall/merchant?id=${selectedMerchant.value.id}`);
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

function openMerchantH5() {
  const url = merchantH5Url();
  if (url) window.open(url, "_blank", "noopener,noreferrer");
}

async function copyWorkbenchLink() {
  const url = merchantWorkbenchUrl();
  if (!url) return;
  await copyToClipboard(url);
  ElMessage.success("商城支付日志链接已复制，可发给已授权的商家/代理账号。");
}

function relatedOrderNo(row: any) {
  return row?.order?.orderNo || row?.orderNo || "";
}

function openRelatedOrder(row: any) {
  const orderNo = relatedOrderNo(row);
  if (!orderNo) return ElMessage.error("这条记录没有可定位的商城订单号");
  goMerchantAdmin("/mall-orders", { keyword: orderNo });
}

async function exportPaymentTransactions() {
  if (exportingKey.value) return;
  exportingKey.value = "transactions";
  try {
    const clean = new URLSearchParams();
    appendBaseLogParams(clean);
    if (filters.paymentMethod) clean.set("paymentMethod", filters.paymentMethod);
    if (filters.paymentStatus) clean.set("status", filters.paymentStatus);
    await downloadFile(`/admin/mall/payment-transactions/export?${clean.toString()}`, "mall-payment-transactions.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出支付流水失败");
  } finally {
    exportingKey.value = "";
  }
}

async function exportPaymentCallbackLogs() {
  if (exportingKey.value) return;
  exportingKey.value = "callbacks";
  try {
    const clean = new URLSearchParams();
    appendBaseLogParams(clean);
    if (filters.callbackStatus) clean.set("status", filters.callbackStatus);
    await downloadFile(`/admin/mall/payment-callback-logs/export?${clean.toString()}`, "mall-payment-callback-logs.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出支付回调失败");
  } finally {
    exportingKey.value = "";
  }
}

async function exportCommissions() {
  if (exportingKey.value) return;
  exportingKey.value = "commissions";
  try {
    const clean = new URLSearchParams();
    appendBaseLogParams(clean);
    if (filters.commissionStatus) clean.set("status", filters.commissionStatus);
    await downloadFile(`/admin/mall/commissions/export?${clean.toString()}`, "mall-commissions.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出佣金失败");
  } finally {
    exportingKey.value = "";
  }
}

async function exportCommissionPromoters() {
  if (exportingKey.value) return;
  exportingKey.value = "promoters";
  try {
    const clean = new URLSearchParams();
    appendBaseLogParams(clean);
    if (filters.commissionStatus) clean.set("status", filters.commissionStatus);
    await downloadFile(`/admin/mall/commissions/by-promoter/export?${clean.toString()}`, "mall-commission-promoters.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出佣金汇总失败");
  } finally {
    exportingKey.value = "";
  }
}

async function retryScopeLoading() {
  await loadTenants();
  const ok = await loadMerchants();
  if (ok) await loadPaymentData();
}

async function fetchStatements() {
  if (!canManageStatements || actionKey.value) return;
  const target = captureSelectedMerchant();
  actionKey.value = "statement:fetch";
  try {
    if (!target.id || !target.tenantId) return ElMessage.warning("请先选择店铺");
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const { value } = await ElMessageBox.prompt("请输入渠道账单日期（YYYY-MM-DD）", "拉取商城渠道账单", { inputValue: yesterday, inputPattern: /^\d{4}-\d{2}-\d{2}$/, inputErrorMessage: "日期格式不正确" });
    assertSelectedMerchant(target);
    const result = await api.post<any, any>("/admin/mall/payment-statements/fetch", { tenantId: target.tenantId, merchantId: target.id, statementDate: value });
    ElMessage.success(`拉取并新增 ${result.importedCount || 0} 笔，更新 ${result.updatedCount || 0} 笔，差异 ${result.discrepancyCount || 0} 笔`);
    await loadStatements();
  } catch (error: any) { if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "拉取渠道账单失败"); }
  finally { actionKey.value = ""; }
}

async function exportStatements() {
  if (exportingKey.value) return;
  exportingKey.value = "statements";
  try {
    const params = new URLSearchParams(); appendBaseLogParams(params); if (filters.statementStatus) params.set("status", filters.statementStatus);
    await downloadFile(`/admin/mall/payment-statements/export?${params}`, "mall-payment-statements.xlsx");
  } catch (error: any) {
    ElMessage.error(error.message || "导出账单失败");
  } finally {
    exportingKey.value = "";
  }
}

async function importStatements() {
  if (!canManageStatements || actionKey.value) return;
  const target = captureSelectedMerchant();
  actionKey.value = "statement:import";
  try {
  if (!target.id || !target.tenantId) return ElMessage.warning("请先选择店铺");
  const example = JSON.stringify([{ transactionNo: "WX123", orderNo: "MALL123", amount: 19.9, providerStatus: "SUCCESS", tradedAt: new Date().toISOString() }], null, 2);
  const { value } = await ElMessageBox.prompt("粘贴渠道账单 JSON 数组，每项至少包含 transactionNo 和 amount。", "手工导入商城渠道账单", { inputType: "textarea", inputValue: example, inputPlaceholder: example, customClass: "statement-import-dialog" });
  let items: any[];
  try { items = JSON.parse(value); } catch { throw new Error("JSON 格式不正确"); }
  if (!Array.isArray(items) || !items.length) throw new Error("账单必须是非空 JSON 数组");
  if (items.length > 5000) throw new Error("单批不能超过 5000 笔");
  for (const [index, item] of items.entries()) if (!item?.transactionNo || !Number.isFinite(Number(item?.amount))) throw new Error(`第 ${index + 1} 笔缺少 transactionNo 或 amount`);
  assertSelectedMerchant(target);
  const date = new Date().toISOString().slice(0, 10);
  const result = await api.post<any, any>("/admin/mall/payment-statements/import", { tenantId: target.tenantId, merchantId: target.id, statementDate: date, items });
  ElMessage.success(`新增 ${result.importedCount || 0} 笔，更新 ${result.updatedCount || 0} 笔，匹配 ${result.matchedCount || 0} 笔，差异 ${result.discrepancyCount || 0} 笔`);
  await loadStatements();
  } catch (error: any) { if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "导入渠道账单失败"); }
  finally { actionKey.value = ""; }
}

async function claimStatement(row: any) {
  if (!canManageStatements || actionKey.value) return;
  const target = captureStatementTarget(row);
  actionKey.value = `statement:claim:${row.id}`;
  try {
    assertStatementTarget(target);
    await api.post(`/admin/mall/payment-statements/${row.id}/claim`, {});
    ElMessage.success("差异已认领"); await loadStatements();
  } catch (error: any) {
    ElMessage.error(error.message || "认领差异失败");
  } finally { actionKey.value = ""; }
}

async function resolveStatement(row: any, action: "resolved" | "ignored" | "recheck") {
  if (!canManageStatements || actionKey.value) return;
  const target = captureStatementTarget(row);
  actionKey.value = `statement:${action}:${row.id}`;
  let remark = "";
  try {
    if (action !== "recheck") {
      const result = await ElMessageBox.prompt(action === "resolved" ? "请填写解决依据或关联凭证" : "请填写忽略原因", action === "resolved" ? "确认解决" : "忽略差异", { inputValue: action === "resolved" ? "已核对渠道与本地凭证" : "非本店铺业务流水", inputValidator: (value) => Boolean(String(value || "").trim()) || "请填写处理依据" });
      remark = String(result.value || "").trim();
      await ElMessageBox.confirm(`账单 ${row.transactionNo}\n订单 ${row.orderNo || "未关联"}\n金额 ¥${money(row.amount)}\n动作：${action === "resolved" ? "确认解决" : "忽略差异"}\n处理依据：${remark}`, "复核并确认处理", { type: action === "resolved" ? "warning" : "error", confirmButtonText: "确认提交", cancelButtonText: "返回修改" });
    }
    assertStatementTarget(target);
    await api.post(`/admin/mall/payment-statements/${row.id}/resolve`, { action, remark });
    ElMessage.success(action === "recheck" ? "已重新勾兑" : "差异处理已记录"); await loadStatements();
  } catch (error: any) {
    if (error !== "cancel" && error !== "close") ElMessage.error(error.message || "处理渠道账单失败");
  } finally { actionKey.value = ""; }
}

function money(value: any) {
  return Number(value || 0).toFixed(2);
}

function formatTime(value: any) {
  return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "-";
}

function paymentText(value: string) {
  return ({ wechat: "微信支付", balance: "余额支付", offline: "线下收款", alipay: "支付宝" } as any)[value] || value || "-";
}

function paymentStatusText(value: string) {
  return ({ success: "成功", discrepancy: "差异", failed: "失败" } as any)[value] || value || "-";
}

function paymentStatusType(value: string) {
  return value === "success" ? "success" : value === "discrepancy" ? "warning" : "danger";
}

function callbackStatusText(value: string) {
  return ({ received: "已接收", success: "成功", failed: "失败", idempotent: "幂等" } as any)[value] || value || "-";
}

function callbackStatusType(value: string) {
  return value === "success" || value === "idempotent" ? "success" : value === "failed" ? "danger" : "warning";
}

function refundProviderName(value: string) {
  return ({ wechat: "微信原路", balance: "余额退回", offline: "线下退款", alipay: "支付宝" } as any)[value] || value || "-";
}

function refundLogStatusText(value: string) {
  return ({ success: "成功", submitted: "已提交", failed: "失败" } as any)[value] || value || "-";
}

function refundLogStatusType(value: string) {
  return value === "success" ? "success" : value === "failed" ? "danger" : "warning";
}

function commissionStatusText(value: string) {
  return ({ risk_review: "风险复核", pending: "待结算", void: "已作废", settled: "已结算" } as any)[value] || value || "-";
}

function commissionStatusType(value: string) {
  return value === "risk_review" ? "danger" : value === "pending" ? "warning" : value === "settled" ? "success" : "info";
}

function commissionRemark(row: any) {
  if (row.status === "risk_review") return row.riskReviewReason || "等待人工复核";
  if (row.status === "settled") return `${row.settledBy || "财务"}：${row.settleRemark || "已结算"}`;
  return row.voidReason || row.settleRemark || "-";
}

function commissionRuleText(row: any) {
  const snapshot = row.ruleSnapshot || {};
  return row.rule ? `${row.rule.name} v${row.rule.version}` : `${snapshot.name || "历史推广码比例"}${snapshot.version ? ` v${snapshot.version}` : ""}`;
}

function commissionBeneficiaryText(row: any) {
  const type = row.beneficiaryType === "promoter" ? "推广人" : row.beneficiaryType === "agent" ? "代理" : "未绑定";
  return `${type} L${Number(row.beneficiaryLevel || 0)}`;
}

function commissionPendingClawback(row: any) {
  return Math.max(Number(row.clawbackAmount || 0) - Number(row.clawbackSettledAmount || 0), 0);
}

function commissionAdjustmentTypeText(value: string) {
  return ({ refund_reduction: "退款减佣", refund_clawback: "退款扣回", clawback_settlement: "扣回完成", risk_release: "风险放行", risk_reject: "风险拒绝", settlement: "佣金结算" } as any)[value] || value || "-";
}

function commissionBusinessKey(prefix: string) {
  const id = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}:${id}`;
}

function rowMerchantId(row: any) {
  return Number(row?.merchant?.id || row?.merchantId || row?.order?.merchant?.id || row?.order?.merchantId || 0);
}

function captureCommissionTarget(row: any) {
  return {
    id: Number(row?.id || 0),
    orderNo: relatedOrderNo(row),
    merchantId: rowMerchantId(row),
    scopeKey: paymentScopeKey(),
    sequence: commissionLoadSequence
  };
}

function assertCommissionTarget(target: ReturnType<typeof captureCommissionTarget>) {
  const current = commissions.value.find((item) => Number(item.id) === target.id);
  if (!current || target.sequence !== commissionLoadSequence || target.scopeKey !== paymentScopeKey() || relatedOrderNo(current) !== target.orderNo || rowMerchantId(current) !== target.merchantId) {
    throw new Error("佣金列表或店铺范围已变化，请刷新后重新操作");
  }
}

function captureStatementTarget(row: any) {
  return {
    id: Number(row?.id || 0),
    transactionNo: String(row?.transactionNo || ""),
    merchantId: rowMerchantId(row),
    scopeKey: paymentScopeKey(),
    sequence: statementLoadSequence
  };
}

function assertStatementTarget(target: ReturnType<typeof captureStatementTarget>) {
  const current = paymentStatements.value.find((item) => Number(item.id) === target.id);
  if (!current || target.sequence !== statementLoadSequence || target.scopeKey !== paymentScopeKey() || String(current.transactionNo || "") !== target.transactionNo || rowMerchantId(current) !== target.merchantId) {
    throw new Error("渠道账单列表或店铺范围已变化，请刷新后重新操作");
  }
}

function captureSelectedMerchant() {
  return {
    id: Number(selectedMerchant.value?.id || 0),
    tenantId: Number(selectedMerchant.value?.tenant?.id || 0),
    scopeKey: paymentScopeKey()
  };
}

function assertSelectedMerchant(target: ReturnType<typeof captureSelectedMerchant>) {
  if (!target.id || !target.tenantId || Number(selectedMerchant.value?.id || 0) !== target.id || Number(selectedMerchant.value?.tenant?.id || 0) !== target.tenantId || target.scopeKey !== paymentScopeKey()) {
    throw new Error("当前店铺或筛选范围已变化，请重新操作");
  }
}

async function settleCommission(row: any) {
  if (!canManageCommissions || actionKey.value) return;
  const target = captureCommissionTarget(row);
  actionKey.value = `commission:settle:${row.id}`;
  try {
    const { value } = await ElMessageBox.prompt(`确认结算 ${commissionBeneficiaryText(row)} 佣金 ¥${money(row.commissionAmount)}？`, "结算佣金", { inputValue: `订单 ${row.order?.orderNo || "-"} 佣金结算`, confirmButtonText: "确认结算", cancelButtonText: "取消", inputPattern: /\S+/, inputErrorMessage: "请填写结算备注" });
    assertCommissionTarget(target);
    await api.post(`/admin/mall/commissions/${row.id}/settle`, { businessKey: commissionBusinessKey(`commission-${row.id}`), remark: value });
    ElMessage.success("佣金已结算");
    await loadCommissions();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(error.message || "结算佣金失败");
  } finally {
    actionKey.value = "";
  }
}

async function batchSettleCommissions() {
  if (!canManageCommissions || actionKey.value) return;
  const target = { scopeKey: paymentScopeKey(), sequence: commissionLoadSequence, pendingCount: Number(commissionSummary.value.pendingCount || 0) };
  actionKey.value = "commission:batch-settle";
  try {
    const { value } = await ElMessageBox.prompt(`当前筛选共有 ${commissionSummary.value.pendingCount || 0} 笔待结算佣金，风险复核记录不会进入本次结算。`, "批量结算佣金", { inputValue: "按当前财务筛选批量结算", confirmButtonText: "确认结算", cancelButtonText: "取消", inputPattern: /\S+/, inputErrorMessage: "请填写结算备注" });
    if (target.sequence !== commissionLoadSequence || target.scopeKey !== paymentScopeKey() || target.pendingCount !== Number(commissionSummary.value.pendingCount || 0)) throw new Error("待结算佣金或筛选范围已变化，请刷新后重新操作");
    const result = await api.post<any, any>("/admin/mall/commissions/batch-settle", { ...baseLogParams(), status: undefined, businessKey: commissionBusinessKey("commission-batch"), remark: value });
    ElMessage.success(`已结算 ${result.settledCount || 0} 笔，合计 ¥${money(result.settledAmount)}`);
    await loadCommissions();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(error.message || "批量结算佣金失败");
  } finally {
    actionKey.value = "";
  }
}

async function reviewCommission(row: any, decision: "approve" | "reject") {
  if (!canManageCommissions || actionKey.value) return;
  const target = captureCommissionTarget(row);
  actionKey.value = `commission:review:${decision}:${row.id}`;
  try {
    const title = decision === "approve" ? "通过佣金风险复核" : "拒绝佣金风险复核";
    const { value } = await ElMessageBox.prompt(row.riskReviewReason || "请核对推广归因风险后填写结论。", title, { inputValue: decision === "approve" ? "已核查归因与买家关系，允许进入结算" : "归因异常，拒绝生成佣金", confirmButtonText: decision === "approve" ? "通过" : "拒绝", cancelButtonText: "取消", inputPattern: /\S+/, inputErrorMessage: "请填写复核结论" });
    assertCommissionTarget(target);
    await api.post(`/admin/mall/commissions/${row.id}/risk-review`, { decision, remark: value });
    ElMessage.success(decision === "approve" ? "佣金已转为待结算" : "佣金已作废");
    await loadCommissions();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(error.message || "处理佣金风险复核失败");
  } finally {
    actionKey.value = "";
  }
}

async function settleCommissionClawback(row: any) {
  if (!canManageCommissions || actionKey.value) return;
  const target = captureCommissionTarget(row);
  actionKey.value = `commission:clawback:${row.id}`;
  try {
    const { value } = await ElMessageBox.prompt(`待扣回佣金 ¥${money(commissionPendingClawback(row))}，请填写扣款流水、冲抵批次或线下凭证。`, "确认佣金扣回", { confirmButtonText: "确认已扣回", cancelButtonText: "取消", inputPattern: /\S+/, inputErrorMessage: "必须填写扣回凭证或说明" });
    assertCommissionTarget(target);
    await api.post(`/admin/mall/commissions/${row.id}/clawback-settle`, { businessKey: commissionBusinessKey(`commission-clawback-${row.id}`), remark: value });
    ElMessage.success("佣金扣回已确认");
    await loadCommissions();
  } catch (error: any) {
    if (error === "cancel" || error === "close") return;
    ElMessage.error(error.message || "确认佣金扣回失败");
  } finally {
    actionKey.value = "";
  }
}

onMounted(async () => {
  await loadTenants();
  const ok = await loadMerchants();
  if (ok) await loadPaymentData();
});

watch(() => [route.query.tenantId, route.query.merchantId], async () => {
  const nextTenantId = routeTenantId();
  const nextMerchantId = routeMerchantId();
  if (nextTenantId !== filters.tenantId) {
    filters.tenantId = nextTenantId;
    filters.merchantId = nextMerchantId;
    const ok = await loadMerchants();
    if (ok) await loadPaymentData();
    return;
  }
  if (nextMerchantId && nextMerchantId !== filters.merchantId && merchants.value.some((item) => item.id === nextMerchantId)) {
    deepLinkWarning.value = "";
    filters.merchantId = nextMerchantId;
    await loadPaymentData();
  } else if (nextMerchantId && nextMerchantId !== filters.merchantId) {
    filters.merchantId = undefined;
    deepLinkWarning.value = merchantLinkWarning(nextMerchantId);
    clearPaymentData();
  }
});
</script>

<style scoped>
.mall-payment-logs-page { padding: 24px; display: grid; gap: 16px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.page-header h2 { margin: 0 0 6px; color: #111827; }
.page-header p { margin: 0; color: #64748b; }
.header-actions, .filter-row { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.filter-row { justify-content: flex-start; }
.scope-alert { margin-bottom: 2px; }
.merchant-card { border-color: #bfdbfe; background: linear-gradient(135deg, #eff6ff 0%, #fff 72%); }
.merchant-card :deep(.el-card__body) { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; }
.merchant-card strong { color: #0f172a; }
.merchant-card p { margin: 4px 0 0; color: #64748b; }
.merchant-tags, .merchant-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
.merchant-actions { grid-column: 1 / -1; }
.filter-card :deep(.el-card__body) { display: grid; gap: 10px; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.summary-grid :deep(.el-card__body) { display: grid; gap: 4px; }
.summary-grid small, .summary-grid span { color: #64748b; }
.summary-grid strong { color: #0f172a; font-size: 24px; }
.payment-log-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.section-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.section-header small, .payment-log-grid small, .muted-line { color: #64748b; }
.payment-log-grid strong { color: #0f172a; }
.payment-log-grid small { display: block; margin-top: 3px; }
.commission-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; margin-bottom: 10px; }
.commission-summary div { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; background: #f8fafc; display: grid; gap: 3px; }
.commission-summary strong { font-size: 18px; }
.commission-promoter-table { margin-bottom: 10px; }
@media (max-width: 1200px) {
  .page-header { display: grid; }
  .header-actions { justify-content: flex-start; }
  .summary-grid, .commission-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .payment-log-grid { grid-template-columns: 1fr; }
}
@media (max-width: 720px) {
  .mall-payment-logs-page { padding: 14px; }
  .summary-grid, .commission-summary { grid-template-columns: 1fr; }
  .merchant-card :deep(.el-card__body) { grid-template-columns: 1fr; }
  .merchant-tags, .merchant-actions { justify-content: flex-start; }
}
</style>
