<template>
  <div class="mall-merchant-page">
    <div class="page-header">
      <div>
        <h2>商城店铺</h2>
        <p>把商家和代理授权为独立店铺。商品、订单、营销、物流和支付配置都会按店铺隔离。</p>
      </div>
      <div class="header-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家" style="width:220px" @change="reload">
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
        <el-button :loading="loading" :disabled="loading" @click="reload">刷新</el-button>
        <el-button v-if="canViewFinance" :loading="readinessLoading" @click="loadPaymentReadiness">刷新支付状态</el-button>
        <el-button type="success" plain @click="openApplications">入驻申请</el-button>
        <el-button type="warning" plain :loading="governanceRunning" @click="runGovernanceLifecycle">到期扫描</el-button>
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
    <el-alert v-if="optionError" class="page-error" type="error" show-icon :closable="false" title="店铺筛选选项同步失败" aria-live="assertive"><template #default><p>{{ optionError }}</p><el-button size="small" :disabled="loading" @click="reload">重新同步选项</el-button></template></el-alert>
    <el-alert v-if="merchantError" class="page-error" type="error" show-icon :closable="false" title="商城店铺加载失败" aria-live="assertive"><template #default><p>{{ merchantError }}</p><el-button size="small" :loading="loading" :disabled="loading" @click="loadMerchants">重新加载店铺</el-button></template></el-alert>
    <el-alert v-if="readinessError" class="page-error" type="warning" show-icon :closable="false" title="部分支付状态未同步" aria-live="polite"><template #default><p>{{ readinessError }}</p><el-button size="small" :loading="readinessLoading" :disabled="readinessLoading" @click="loadPaymentReadiness">重新检测支付状态</el-button></template></el-alert>

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
      <el-table-column label="入驻治理" min-width="150"><template #default="{ row }"><el-tag :type="onboardingTag(row.onboardingStatus)">{{ onboardingText(row.onboardingStatus) }}</el-tag><small class="governance-fee">{{ rateText(row.serviceFeeBps) }} 服务费</small></template></el-table-column>
      <el-table-column label="商品审核" width="110"><template #default="{ row }">{{ row.productAuditRequired ? "需要审核" : "免审核" }}</template></el-table-column>
      <el-table-column label="收款模式" width="130"><template #default="{ row }">{{ paymentModeText(row.paymentMode) }}</template></el-table-column>
      <el-table-column label="运费" width="140"><template #default="{ row }">{{ freightText(row) }}</template></el-table-column>
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
      <el-table-column label="联系人" min-width="160"><template #default="{ row }">{{ row.contactName || "-" }} {{ maskPhone(row.contactPhone) }}</template></el-table-column>
      <el-table-column label="操作" width="390" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-button v-if="canManageProducts" size="small" type="primary" plain @click="goProducts(row)">商品</el-button>
          <el-button v-if="canManagePayments" size="small" type="warning" plain @click="openPayment(row)">收款</el-button>
          <el-button size="small" type="success" plain @click="openAccess(row)">授权</el-button>
          <el-button size="small" type="info" plain @click="openGovernance(row)">资质/合同</el-button>
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
            <el-radio-button value="tenant">商家店铺</el-radio-button>
            <el-radio-button value="agent">代理店铺</el-radio-button>
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
            <el-radio-button value="platform_collect">平台代收</el-radio-button>
            <el-radio-button value="merchant_direct">商户直收</el-radio-button>
          </el-radio-group>
          <span class="form-hint">商户直收需先完成店铺支付配置和上线验收。</span>
        </el-form-item>
        <el-form-item label="运费规则">
          <el-switch v-model="form.freightEnabled" active-text="启用运费" inactive-text="免运费" />
          <el-input-number v-model="form.baseFreight" :min="0" :precision="2" :step="1" :disabled="!form.freightEnabled" style="margin-left:12px" />
          <span class="form-hint">基础运费（元）</span>
        </el-form-item>
        <el-form-item label="包邮门槛">
          <el-input-number v-model="form.freeShippingThreshold" :min="0" :precision="2" :step="10" :disabled="!form.freightEnabled" />
          <span class="form-hint">元；填 0 表示不按金额包邮。</span>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio-button value="active">启用</el-radio-button>
            <el-radio-button value="disabled">停用</el-radio-button>
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
      <el-alert v-if="accessError" class="dialog-error" type="error" show-icon :closable="false" title="店铺授权数据加载失败" aria-live="assertive"><template #default><p>{{ accessError }}</p><el-button size="small" :loading="accessLoading" @click="reloadAccessDialog">重试授权数据</el-button></template></el-alert>
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
        <el-date-picker v-model="accessForm.validUntil" type="datetime" clearable placeholder="授权到期时间" />
        <el-select v-model="accessForm.permissions" multiple collapse-tags placeholder="细分权限" style="min-width:260px">
          <el-option v-for="item in accessPermissionOptions" :key="item.value" :label="item.label" :value="item.value" />
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
        <el-table-column label="有效期" min-width="180"><template #default="{ row }">{{ row.validUntil ? formatTime(row.validUntil) : '长期' }}</template></el-table-column>
        <el-table-column label="授权时间" width="180"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editAccess(row)">编辑</el-button>
            <el-button size="small" :type="row.enabled ? 'warning' : 'success'" plain @click="toggleAccess(row)">{{ row.enabled ? "停用" : "启用" }}</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="applicationDialogVisible" title="商户入驻申请" width="1100px" destroy-on-close>
      <div class="access-form"><el-select v-model="applicationStatus" clearable placeholder="全部状态" @change="loadApplications"><el-option label="待审核" value="pending" /><el-option label="已通过" value="approved" /><el-option label="已驳回" value="rejected" /></el-select><el-button @click="loadApplications">刷新</el-button></div>
      <el-alert v-if="applicationError" class="dialog-error" type="error" show-icon :closable="false" title="入驻申请加载失败" aria-live="assertive"><template #default><p>{{ applicationError }}</p><el-button size="small" :loading="applicationLoading" @click="loadApplications">重新加载申请</el-button></template></el-alert>
      <el-table v-loading="applicationLoading" :data="applications" stripe empty-text="暂无入驻申请">
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="店铺/主体" min-width="250"><template #default="{row}"><strong>{{ row.desiredName }}</strong><small>{{ row.legalName }} · {{ row.unifiedSocialCreditCode }}</small></template></el-table-column>
        <el-table-column label="联系人" min-width="150"><template #default="{row}">{{ row.contactName }} {{ maskPhone(row.contactPhone) }}</template></el-table-column>
        <el-table-column label="申请用户" width="120"><template #default="{row}">#{{ row.applicantUserId }}</template></el-table-column>
        <el-table-column label="状态" width="100"><template #default="{row}"><el-tag :type="row.status === 'pending' ? 'warning' : row.status === 'approved' ? 'success' : 'danger'">{{ applicationStatusText(row.status) }}</el-tag></template></el-table-column>
        <el-table-column prop="reviewRemark" label="审核说明" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="180"><template #default="{row}"><el-button v-if="row.status === 'pending'" size="small" type="success" @click="reviewApplication(row, 'approved')">通过</el-button><el-button v-if="row.status === 'pending'" size="small" type="danger" @click="reviewApplication(row, 'rejected')">驳回</el-button><el-button size="small" text type="primary" @click="openFile(row.businessLicenseUrl)">执照</el-button></template></el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="governanceDialogVisible" :title="`资质与合同：${governanceMerchant?.name || ''}`" width="1050px" destroy-on-close>
      <el-alert v-if="governanceError" class="dialog-error" type="error" show-icon :closable="false" title="资质或合同数据未完全同步" aria-live="assertive"><template #default><p>{{ governanceError }}</p><el-button size="small" @click="loadGovernanceRows">重新加载治理数据</el-button></template></el-alert>
      <el-tabs v-model="governanceTab">
        <el-tab-pane label="资质证照" name="qualifications">
          <div class="governance-form"><el-input v-model="qualificationForm.type" placeholder="资质类型" /><el-input v-model="qualificationForm.name" placeholder="资质名称" /><el-input v-model="qualificationForm.certificateNo" placeholder="证照号" /><el-input v-model="qualificationForm.fileUrlsText" placeholder="文件 URL，多个逗号分隔" /><el-date-picker v-model="qualificationForm.validUntil" type="date" clearable placeholder="到期日期" /><el-button type="primary" @click="saveQualification">提交资质</el-button></div>
          <el-table :data="qualifications" stripe><el-table-column prop="name" label="资质" min-width="180" /><el-table-column prop="certificateNo" label="证照号" min-width="150" /><el-table-column prop="validUntil" label="到期日" width="120" /><el-table-column label="状态" width="100"><template #default="{row}">{{ qualificationStatusText(row.status) }}</template></el-table-column><el-table-column label="操作" width="190"><template #default="{row}"><el-button v-if="row.status === 'pending'" size="small" type="success" @click="reviewQualification(row, 'approved')">通过</el-button><el-button v-if="row.status === 'pending'" size="small" type="danger" @click="reviewQualification(row, 'rejected')">驳回</el-button><el-button v-if="row.fileUrls?.[0]" size="small" text @click="openFile(row.fileUrls[0])">查看</el-button></template></el-table-column></el-table>
        </el-tab-pane>
        <el-tab-pane label="合同与费率" name="contracts">
          <div class="contract-form"><el-input v-model="contractForm.contractNo" placeholder="合同编号" /><el-input-number v-model="contractForm.version" :min="1" /><el-input v-model="contractForm.name" placeholder="合同名称" /><el-input v-model="contractForm.fileUrl" placeholder="合同 URL" /><el-date-picker v-model="contractForm.period" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始" end-placeholder="结束" /><el-input-number v-model="contractForm.platformCommissionBps" :min="0" :max="10000" /><el-input-number v-model="contractForm.serviceFeeBps" :min="0" :max="10000" /><el-input-number v-model="contractForm.settlementCycleDays" :min="1" :max="365" /><el-button type="primary" @click="saveContract">新建合同</el-button></div>
          <el-table :data="contracts" stripe><el-table-column label="合同" min-width="220"><template #default="{row}"><strong>{{ row.name }}</strong><small>{{ row.contractNo }} v{{ row.version }}</small></template></el-table-column><el-table-column label="有效期" min-width="190"><template #default="{row}">{{ row.startsAt }} 至 {{ row.endsAt }}</template></el-table-column><el-table-column label="费率" min-width="170"><template #default="{row}">佣金 {{ rateText(row.platformCommissionBps) }} / 服务费 {{ rateText(row.serviceFeeBps) }}</template></el-table-column><el-table-column prop="settlementCycleDays" label="结算周期(天)" width="120" /><el-table-column prop="status" label="状态" width="100" /><el-table-column label="操作" width="150"><template #default="{row}"><el-button v-if="row.status === 'draft'" size="small" type="success" @click="activateContract(row)">启用</el-button><el-button size="small" text @click="openFile(row.fileUrl)">查看合同</el-button></template></el-table-column></el-table>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

    <el-dialog v-model="paymentDialogVisible" :title="`店铺收款账户：${paymentMerchant?.name || ''}`" width="900px" destroy-on-close>
      <el-alert
        type="warning"
        show-icon
        :closable="false"
        class="scope-hint"
        title="商户直收会优先使用这里的店铺收款账户；真实支付开启前，请用小额订单完成下单、回调、退款和对账留档。"
      />
      <el-alert v-if="paymentError" class="dialog-error" type="error" show-icon :closable="false" title="店铺收款账户加载失败" aria-live="assertive"><template #default><p>{{ paymentError }}</p><el-button size="small" :loading="paymentLoading" @click="loadPaymentAccounts">重新加载收款账户</el-button></template></el-alert>
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
import { currentTenantId, hasPermission, isPlatformAdmin } from "../permissions";
import { maskPhone } from "../privacy";

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
  onboardingStatus?: "legacy_approved" | "pending" | "approved" | "rejected" | "suspended" | "expired";
  contractRequired?: boolean;
  platformCommissionBps?: number;
  serviceFeeBps?: number;
  settlementCycleDays?: number;
  suspensionReason?: string | null;
  mallEnabled: boolean;
  productAuditRequired: boolean;
  paymentMode: "platform_collect" | "merchant_direct";
  region?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  logoUrl?: string | null;
  notice?: string | null;
  remark?: string | null;
  freightConfig?: { enabled?: boolean; baseFreightFen?: number; freeThresholdFen?: number } | null;
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
const merchantError = ref("");
const tenantError = ref("");
const agentError = ref("");
const readinessError = ref("");
const accessAdminError = ref("");
const accessRowsError = ref("");
const applicationError = ref("");
const qualificationError = ref("");
const contractError = ref("");
const paymentError = ref("");
let merchantLoadSequence = 0;
let readinessLoadSequence = 0;
let applicationLoadSequence = 0;
const saving = ref(false);
const accessLoading = ref(false);
const accessSaving = ref(false);
const readinessLoading = ref(false);
const paymentLoading = ref(false);
const paymentSaving = ref(false);
const governanceRunning = ref(false);
const canManageProducts = computed(() => hasPermission("mall.product.manage"));
const canManagePayments = computed(() => hasPermission("mall.payment.manage"));
const canViewFinance = computed(() => hasPermission("mall.finance.view"));
const applicationLoading = ref(false);
const dialogVisible = ref(false);
const accessDialogVisible = ref(false);
const paymentDialogVisible = ref(false);
const applicationDialogVisible = ref(false);
const governanceDialogVisible = ref(false);
const rows = ref<Merchant[]>([]);
const paymentReadiness = ref<Record<number, PaymentReadiness>>({});
const paymentRows = ref<MerchantPaymentAccount[]>([]);
const tenants = ref<Tenant[]>([]);
const agents = ref<Agent[]>([]);
const adminRows = ref<any[]>([]);
const accessRows = ref<any[]>([]);
const applications = ref<any[]>([]);
const qualifications = ref<any[]>([]);
const contracts = ref<any[]>([]);
const accessMerchant = ref<Merchant | null>(null);
const paymentMerchant = ref<Merchant | null>(null);
const governanceMerchant = ref<Merchant | null>(null);
const governanceTab = ref("qualifications");
const applicationStatus = ref("pending");
const filters = reactive({ tenantId: (isPlatformAdmin() ? Number(localStorage.getItem("admin_selected_tenant_id") || 0) : currentTenantId()) || undefined as number | undefined, status: "", launchStatus: "", keyword: "" });
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
  remark: "",
  freightEnabled: true,
  baseFreight: 0,
  freeShippingThreshold: 0
});
const accessForm = reactive({ id: 0, adminId: undefined as number | undefined, accessRole: "manager", enabled: true, validUntil: null as Date | null, permissions: [] as string[] });
const paymentForm = reactive({ id: 0, provider: "wechat" as "wechat" | "alipay", merchantName: "", merchantNo: "", enabled: true, configText: "" });
const qualificationForm = reactive({ type: "business_license", name: "", certificateNo: "", fileUrlsText: "", validUntil: null as Date | null });
const contractForm = reactive({ contractNo: "", version: 1, name: "", fileUrl: "", period: [] as string[], platformCommissionBps: 0, serviceFeeBps: 0, settlementCycleDays: 30 });
const accessPermissionOptions = [
  { label: "店铺配置", value: "merchant.manage" }, { label: "商品管理", value: "product.manage" }, { label: "订单查看", value: "order.view" },
  { label: "订单管理", value: "order.manage" }, { label: "物流查看", value: "shipment.view" }, { label: "发货物流", value: "shipment.manage" },
  { label: "售后查看", value: "refund.view" }, { label: "售后处理", value: "refund.manage" }, { label: "评价处理", value: "review.manage" },
  { label: "营销管理", value: "marketing.manage" }, { label: "财务查看", value: "finance.view" }, { label: "结算查看", value: "settlement.view" }
];

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
const optionError = computed(() => [tenantError.value, agentError.value].filter(Boolean).join("；"));
const accessError = computed(() => [accessAdminError.value, accessRowsError.value].filter(Boolean).join("；"));
const governanceError = computed(() => [qualificationError.value, contractError.value].filter(Boolean).join("；"));

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
    if (canViewFinance.value) await loadPaymentReadiness();
    else paymentReadiness.value = {};
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
function freightText(row: Merchant) {
  const config = row.freightConfig || {};
  if (config.enabled === false || !Number(config.baseFreightFen || 0)) return "免运费";
  const base = Number(config.baseFreightFen || 0) / 100;
  const threshold = Number(config.freeThresholdFen || 0) / 100;
  return threshold > 0 ? `¥${base.toFixed(2)} / 满¥${threshold.toFixed(2)}包邮` : `¥${base.toFixed(2)}`;
}

function onboardingText(value?: string) {
  return ({ legacy_approved: "历史店铺", pending: "待审核", approved: "已通过", rejected: "已驳回", suspended: "已暂停", expired: "已到期" } as any)[value || "legacy_approved"] || value || "历史店铺";
}

function onboardingTag(value?: string) {
  if (value === "approved" || value === "legacy_approved") return "success";
  if (value === "pending") return "warning";
  return "danger";
}

function rateText(value?: number) { return `${(Number(value || 0) / 100).toFixed(2)}%`; }
function applicationStatusText(value: string) { return value === "approved" ? "已通过" : value === "rejected" ? "已驳回" : value === "withdrawn" ? "已撤回" : "待审核"; }
function qualificationStatusText(value: string) { return value === "approved" ? "已通过" : value === "rejected" ? "已驳回" : value === "expired" ? "已到期" : "待审核"; }
function openFile(url?: string) { if (url) window.open(url, "_blank", "noopener,noreferrer"); }

function formatTime(value: any) {
  return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "-";
}

async function loadTenants() {
  tenantError.value = "";
  tenants.value = [];
  if (!isPlatformAdmin()) return;
  try {
    const result = await api.get<any, Tenant[]>("/admin/tenants");
    if (!Array.isArray(result)) throw new Error("商家选项响应格式无效");
    tenants.value = result;
  } catch (error: any) {
    tenantError.value = error.message || "加载商家选项失败";
  }
}

async function loadAgents() {
  agentError.value = "";
  agents.value = [];
  try {
    const result = await api.get<any, Agent[] | { items?: Agent[] }>("/admin/agents", { params: { includeDisabled: true, tenantId: form.tenantId || filters.tenantId || undefined, page: 1, pageSize: 100 } });
    const items = Array.isArray(result) ? result : result?.items;
    if (!Array.isArray(items)) throw new Error("代理选项响应格式无效");
    agents.value = items;
  } catch (error: any) {
    agentError.value = error.message || "加载代理选项失败";
  }
}

async function loadMerchants() {
  const sequence = ++merchantLoadSequence;
  loading.value = true;
  merchantError.value = "";
  rows.value = [];
  paymentReadiness.value = {};
  try {
    const result = await api.get<any, Merchant[]>("/admin/mall/merchants", { params: { tenantId: filters.tenantId || undefined, status: filters.status || undefined, keyword: filters.keyword.trim() || undefined } });
    if (sequence !== merchantLoadSequence) return;
    if (!Array.isArray(result)) throw new Error("商城店铺响应格式无效");
    rows.value = result;
    await loadPaymentReadiness();
  } catch (error: any) {
    if (sequence !== merchantLoadSequence) return;
    rows.value = [];
    paymentReadiness.value = {};
    merchantError.value = error.message || "加载商城店铺失败";
  } finally {
    if (sequence === merchantLoadSequence) loading.value = false;
  }
}

async function loadPaymentReadiness() {
  const sequence = ++readinessLoadSequence;
  const merchantRows = [...rows.value];
  readinessError.value = "";
  paymentReadiness.value = {};
  if (!canViewFinance.value) {
    return;
  }
  if (!merchantRows.length) return;
  readinessLoading.value = true;
  const next: Record<number, PaymentReadiness> = {};
  const failures: string[] = [];
  try {
    await mapWithConcurrency(merchantRows, 8, async (row) => {
      try {
        next[row.id] = await api.get<any, PaymentReadiness>("/admin/mall/payment-readiness", { params: { merchantId: row.id } });
      } catch (error: any) {
        const message = error.message || "支付状态读取失败，请确认当前账号有商城财务/支付配置权限";
        failures.push(`${row.name || row.code}：${message}`);
        next[row.id] = { status: "not_ready", statusText: "读取失败", collectionMode: row.paymentMode, issues: [message] };
      }
    });
    if (sequence !== readinessLoadSequence) return;
    paymentReadiness.value = next;
    if (failures.length) readinessError.value = `${failures.length}/${merchantRows.length} 个店铺的支付状态读取失败，失败店铺已明确标记为“读取失败”。${failures.slice(0, 3).join("；")}${failures.length > 3 ? "；其余失败请重试后查看" : ""}`;
  } finally {
    if (sequence === readinessLoadSequence) readinessLoading.value = false;
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
  accessAdminError.value = "";
  adminRows.value = [];
  try {
    const result = await api.get<any, any>("/admin/admins", { params: { tenantId: row.tenant?.id, includeSmoke: "false", page: 1, pageSize: 200 } });
    if (accessMerchant.value?.id !== row.id) return;
    if (!Array.isArray(result?.items)) throw new Error("后台账号响应格式无效");
    adminRows.value = result.items;
  } catch (error: any) {
    if (accessMerchant.value?.id !== row.id) return;
    accessAdminError.value = error.message || "加载可授权后台账号失败";
  }
}

async function loadAccessRows() {
  if (!accessMerchant.value) return;
  const merchantId = accessMerchant.value.id;
  accessLoading.value = true;
  accessRowsError.value = "";
  accessRows.value = [];
  try {
    const result = await api.get<any, any[]>("/admin/mall/merchant-access", { params: { merchantId } });
    if (accessMerchant.value?.id !== merchantId) return;
    if (!Array.isArray(result)) throw new Error("店铺授权响应格式无效");
    accessRows.value = result;
  } catch (error: any) {
    if (accessMerchant.value?.id !== merchantId) return;
    accessRowsError.value = error.message || "加载店铺授权失败";
  } finally {
    if (accessMerchant.value?.id === merchantId) accessLoading.value = false;
  }
}

async function reloadAccessDialog() {
  if (!accessMerchant.value) return;
  await Promise.all([loadAdminsForMerchant(accessMerchant.value), loadAccessRows()]);
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
    remark: "",
    freightEnabled: true,
    baseFreight: 0,
    freeShippingThreshold: 0
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
  Object.assign(accessForm, { id: 0, adminId: undefined, accessRole: "manager", enabled: true, validUntil: null, permissions: [] });
}

function resetPaymentForm() {
  Object.assign(paymentForm, { id: 0, provider: "wechat", merchantName: "", merchantNo: "", enabled: true, configText: paymentConfigTemplate("wechat") });
}

function resetPaymentTemplate() {
  paymentForm.configText = paymentConfigTemplate(paymentForm.provider);
}

async function openApplications() {
  applicationDialogVisible.value = true;
  await loadApplications();
}

async function loadApplications() {
  const sequence = ++applicationLoadSequence;
  applicationLoading.value = true;
  applicationError.value = "";
  applications.value = [];
  try {
    const result = await api.get<any, any[]>("/admin/mall/merchant-applications", { params: { tenantId: filters.tenantId || undefined, status: applicationStatus.value || undefined } });
    if (sequence !== applicationLoadSequence) return;
    if (!Array.isArray(result)) throw new Error("入驻申请响应格式无效");
    applications.value = result;
  } catch (error: any) {
    if (sequence !== applicationLoadSequence) return;
    applicationError.value = error.message || "加载入驻申请失败";
  } finally {
    if (sequence === applicationLoadSequence) applicationLoading.value = false;
  }
}

async function reviewApplication(row: any, status: "approved" | "rejected") {
  try {
    const result = await ElMessageBox.prompt("请填写审核说明", status === "approved" ? "通过入驻" : "驳回入驻", { inputType: "textarea" });
    await api.post(`/admin/mall/merchant-applications/${row.id}/review`, { status, reviewRemark: result.value });
    await Promise.all([loadApplications(), loadMerchants()]);
    ElMessage.success("入驻申请已处理");
  } catch (error: any) {
    if (error !== "cancel") ElMessage.error(error.message || "处理入驻申请失败");
  }
}

async function runGovernanceLifecycle() {
  governanceRunning.value = true;
  try {
    const result = await api.post<any, any>("/admin/mall/merchant-governance/run", {});
    await loadMerchants();
    ElMessage.success(`扫描完成：合同到期 ${result.expiredContractCount || 0}，资质到期 ${result.expiredQualificationCount || 0}，授权到期 ${result.expiredAccessCount || 0}`);
  } catch (error: any) {
    ElMessage.error(error.message || "到期扫描失败");
  } finally {
    governanceRunning.value = false;
  }
}

function resetGovernanceForms() {
  Object.assign(qualificationForm, { type: "business_license", name: "", certificateNo: "", fileUrlsText: "", validUntil: null });
  Object.assign(contractForm, { contractNo: "", version: 1, name: "", fileUrl: "", period: [], platformCommissionBps: 0, serviceFeeBps: 0, settlementCycleDays: 30 });
}

async function openGovernance(row: Merchant) {
  governanceMerchant.value = row;
  governanceTab.value = "qualifications";
  resetGovernanceForms();
  governanceDialogVisible.value = true;
  await loadGovernanceRows();
}

async function loadGovernanceRows() {
  if (!governanceMerchant.value) return;
  const merchantId = governanceMerchant.value.id;
  qualificationError.value = "";
  contractError.value = "";
  qualifications.value = [];
  contracts.value = [];
  const results = await Promise.allSettled([
    api.get<any, any[]>("/admin/mall/merchant-qualifications", { params: { merchantId: governanceMerchant.value.id } }),
    api.get<any, any[]>("/admin/mall/merchant-contracts", { params: { merchantId: governanceMerchant.value.id } })
  ]);
  if (governanceMerchant.value?.id !== merchantId) return;
  const [qualificationResult, contractResult] = results;
  if (qualificationResult.status === "fulfilled" && Array.isArray(qualificationResult.value)) qualifications.value = qualificationResult.value;
  else qualificationError.value = qualificationResult.status === "rejected" ? qualificationResult.reason?.message || "加载资质证照失败" : "资质证照响应格式无效";
  if (contractResult.status === "fulfilled" && Array.isArray(contractResult.value)) contracts.value = contractResult.value;
  else contractError.value = contractResult.status === "rejected" ? contractResult.reason?.message || "加载合同列表失败" : "合同列表响应格式无效";
}

async function saveQualification() {
  if (!governanceMerchant.value) return;
  if (!qualificationForm.name.trim() || !qualificationForm.fileUrlsText.trim()) return ElMessage.warning("请填写资质名称和文件 URL");
  try {
    await api.post("/admin/mall/merchant-qualifications", { merchantId: governanceMerchant.value.id, type: qualificationForm.type.trim() || "other", name: qualificationForm.name.trim(), certificateNo: qualificationForm.certificateNo.trim() || undefined, fileUrls: qualificationForm.fileUrlsText.split(/[,\n，]+/).map((item) => item.trim()).filter(Boolean), validUntil: qualificationForm.validUntil ? formatDateOnly(qualificationForm.validUntil) : undefined });
    resetGovernanceForms();
    await loadGovernanceRows();
    ElMessage.success("资质已提交审核");
  } catch (error: any) { ElMessage.error(error.message || "保存资质失败"); }
}

async function reviewQualification(row: any, status: "approved" | "rejected") {
  try {
    const result = await ElMessageBox.prompt("请填写审核说明", status === "approved" ? "通过资质" : "驳回资质", { inputType: "textarea" });
    await api.post(`/admin/mall/merchant-qualifications/${row.id}/review`, { status, reviewRemark: result.value });
    await loadGovernanceRows();
  } catch (error: any) { if (error !== "cancel") ElMessage.error(error.message || "审核资质失败"); }
}

async function saveContract() {
  if (!governanceMerchant.value) return;
  if (!contractForm.contractNo.trim() || !contractForm.name.trim() || !contractForm.fileUrl.trim() || contractForm.period.length !== 2) return ElMessage.warning("请完整填写合同信息");
  try {
    await api.post("/admin/mall/merchant-contracts", { merchantId: governanceMerchant.value.id, contractNo: contractForm.contractNo.trim(), version: contractForm.version, name: contractForm.name.trim(), fileUrl: contractForm.fileUrl.trim(), startsAt: contractForm.period[0], endsAt: contractForm.period[1], platformCommissionBps: contractForm.platformCommissionBps, serviceFeeBps: contractForm.serviceFeeBps, settlementCycleDays: contractForm.settlementCycleDays });
    resetGovernanceForms();
    await loadGovernanceRows();
    ElMessage.success("合同草稿已创建");
  } catch (error: any) { ElMessage.error(error.message || "保存合同失败"); }
}

async function activateContract(row: any) {
  try {
    await ElMessageBox.confirm("启用后将作为当前费率和结算周期，原生效合同会自动终止。", "启用合同", { type: "warning" });
    await api.post(`/admin/mall/merchant-contracts/${row.id}/activate`, {});
    await Promise.all([loadGovernanceRows(), loadMerchants()]);
    ElMessage.success("合同已生效");
  } catch (error: any) { if (error !== "cancel") ElMessage.error(error.message || "启用合同失败"); }
}

function formatDateOnly(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
    remark: row.remark || "",
    freightEnabled: row.freightConfig?.enabled !== false,
    baseFreight: Number(row.freightConfig?.baseFreightFen || 0) / 100,
    freeShippingThreshold: Number(row.freightConfig?.freeThresholdFen || 0) / 100
  });
  await loadAgents();
  dialogVisible.value = true;
}

async function openAccess(row: Merchant) {
  accessMerchant.value = row;
  resetAccessForm();
  accessDialogVisible.value = true;
  await reloadAccessDialog();
}

async function openPayment(row: Merchant) {
  if (!canManagePayments.value) return ElMessage.error("当前账号无商城支付配置权限");
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
    const payload = {
      tenantId: form.tenantId,
      agentId: form.ownerType === "agent" ? form.agentId : null,
      ownerType: form.ownerType,
      code: form.code.trim() || undefined,
      name: form.name.trim(),
      status: form.status,
      mallEnabled: form.mallEnabled,
      productAuditRequired: form.productAuditRequired,
      paymentMode: form.paymentMode,
      region: form.region.trim() || undefined,
      contactName: form.contactName.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      logoUrl: form.logoUrl.trim() || undefined,
      notice: form.notice.trim() || undefined,
      remark: form.remark.trim() || undefined,
      freightEnabled: form.freightEnabled,
      baseFreight: Number(form.baseFreight || 0),
      freeShippingThreshold: Number(form.freeShippingThreshold || 0)
    };
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
    enabled: row.enabled !== false,
    validUntil: row.validUntil ? new Date(row.validUntil) : null,
    permissions: Array.isArray(row.permissions) ? [...row.permissions] : []
  });
}

async function saveAccess() {
  if (!accessMerchant.value) return;
  if (!accessForm.adminId) return ElMessage.warning("请选择要授权的后台账号");
  accessSaving.value = true;
  try {
    const payload = { adminId: accessForm.adminId, merchantId: accessMerchant.value.id, accessRole: accessForm.accessRole, enabled: accessForm.enabled, validUntil: accessForm.validUntil?.toISOString(), permissions: accessForm.permissions };
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
    await api.patch(`/admin/mall/merchant-access/${row.id}`, { adminId: row.admin?.id, merchantId: row.merchant?.id || accessMerchant.value?.id, accessRole: row.accessRole || "manager", enabled: !row.enabled, validUntil: row.validUntil || undefined, permissions: row.permissions || [] });
    ElMessage.success(row.enabled ? "店铺授权已停用" : "店铺授权已启用");
    await loadAccessRows();
  } catch (error: any) {
    ElMessage.error(error.message || "操作店铺授权失败");
  }
}

async function loadPaymentAccounts() {
  if (!paymentMerchant.value) return;
  const merchantId = paymentMerchant.value.id;
  paymentLoading.value = true;
  paymentError.value = "";
  paymentRows.value = [];
  try {
    const result = await api.get<any, MerchantPaymentAccount[]>("/admin/mall/merchant-payment-accounts", { params: { merchantId } });
    if (paymentMerchant.value?.id !== merchantId) return;
    if (!Array.isArray(result)) throw new Error("店铺收款账户响应格式无效");
    paymentRows.value = result;
  } catch (error: any) {
    if (paymentMerchant.value?.id !== merchantId) return;
    paymentError.value = error.message || "加载店铺收款账户失败";
  } finally {
    if (paymentMerchant.value?.id === merchantId) paymentLoading.value = false;
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
  if (!canManagePayments.value) return ElMessage.error("当前账号无商城支付配置权限");
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
.page-error, .dialog-error { overflow-wrap: anywhere; }
.page-error p, .dialog-error p { margin: 0 0 8px; line-height: 1.6; }
.dialog-error { margin: 14px 0; }
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
.governance-fee { display:block; margin-top:5px; color:#64748b; }
.governance-form { display:grid; grid-template-columns: 130px 160px 140px minmax(220px,1fr) 170px auto; gap:10px; margin-bottom:14px; align-items:center; }
.contract-form { display:grid; grid-template-columns: 150px 90px 160px minmax(180px,1fr) 250px 120px 120px 110px auto; gap:10px; margin-bottom:14px; align-items:center; }
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
@media (max-width: 640px) {
  .page-header { display: grid; grid-template-columns: minmax(0, 1fr); }
  .page-header > div:first-child { min-width: 0; }
  .header-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); width: 100%; }
  .header-actions :deep(.el-select), .header-actions :deep(.el-input) { grid-column: 1 / -1; width: 100% !important; }
  .header-actions :deep(.el-button) { width: 100%; margin-left: 0; }
}
</style>
