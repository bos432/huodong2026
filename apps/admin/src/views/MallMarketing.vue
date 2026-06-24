<template>
  <div class="mall-marketing-page">
    <div class="page-header">
      <div>
        <h2>商城营销中心</h2>
        <p>按店铺管理优惠券、秒杀、拼团和推广码；平台可查看全局，新增或编辑营销活动必须落到一个具体店铺。</p>
      </div>
      <div class="header-actions">
        <el-select v-if="isPlatformAdmin()" v-model="filters.tenantId" clearable filterable placeholder="全部商家/代理" style="width:220px" @change="handleTenantChange">
          <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenantLabel(tenant)" :value="tenant.id" />
        </el-select>
        <el-select v-model="filters.merchantId" clearable filterable placeholder="查看全部店铺；操作前请选择店铺" style="width:280px" @change="handleMerchantChange">
          <el-option v-for="merchant in merchants" :key="merchant.id" :label="merchantLabel(merchant)" :value="merchant.id" />
        </el-select>
        <el-input v-model="keyword" clearable placeholder="券码/活动/推广码" style="width:220px" @keyup.enter="reload" @clear="reload" />
        <el-button :loading="loadingAny" @click="reload">刷新</el-button>
      </div>
    </div>

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

    <el-tabs v-model="activeTab" class="marketing-tabs" @tab-change="loadActiveTab">
      <el-tab-pane label="优惠券" name="coupons">
        <section class="tool-section">
          <el-card shadow="never" class="form-card">
            <template #header>
              <div class="section-header">
                <span>{{ couponForm.id ? "编辑优惠券" : "新增优惠券" }}</span>
                <el-button v-if="couponForm.id" size="small" @click="resetCouponForm">取消编辑</el-button>
              </div>
            </template>
            <el-form label-width="92px">
              <el-form-item label="归属店铺" required><span class="form-scope">{{ selectedMerchantName }}</span></el-form-item>
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
                    <el-option v-for="category in categories" :key="category.id" :label="category.name" :value="category.id" />
                  </el-select>
                  <el-select v-if="couponForm.scope === 'product'" v-model="couponForm.scopeProductId" filterable placeholder="选择商品" style="width:260px">
                    <el-option v-for="product in products" :key="product.id" :label="product.title" :value="product.id" />
                  </el-select>
                </div>
              </el-form-item>
              <el-form-item label="限制">
                <div class="inline-fields">
                  <el-input-number v-model="couponForm.usageLimit" :min="0" :precision="0" placeholder="总次数，0不限" />
                  <el-input-number v-model="couponForm.perUserLimit" :min="0" :precision="0" placeholder="每人次数，0不限" />
                </div>
              </el-form-item>
              <el-form-item label="有效期">
                <div class="inline-fields">
                  <el-date-picker v-model="couponForm.startsAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="开始时间" />
                  <el-date-picker v-model="couponForm.endsAt" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="结束时间" />
                </div>
              </el-form-item>
              <el-form-item label="启用"><el-switch v-model="couponForm.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
              <el-button type="primary" :loading="couponSaving" :disabled="!canOperateSelectedMerchant" :title="operationScopeTip" @click="saveCoupon">{{ couponForm.id ? "保存优惠券" : "新增优惠券" }}</el-button>
            </el-form>
          </el-card>

          <el-card shadow="never" class="table-card">
            <template #header>
              <div class="section-header">
                <span>优惠券列表</span>
                <div>
                  <el-select v-model="couponFilters.status" clearable placeholder="运营状态" size="small" style="width:140px" @change="loadCoupons">
                    <el-option label="可领取/可使用" value="active" />
                    <el-option label="未开始" value="not_started" />
                    <el-option label="已过期" value="expired" />
                    <el-option label="已用完" value="exhausted" />
                    <el-option label="已停用" value="disabled" />
                  </el-select>
                  <el-button size="small" :loading="couponLoading" @click="loadCoupons">刷新</el-button>
                </div>
              </div>
            </template>
            <el-table v-loading="couponLoading" :data="coupons" stripe empty-text="暂无优惠券">
              <el-table-column label="券码" width="150"><template #default="{ row }"><strong>{{ row.code }}</strong><small>{{ row.name }}</small></template></el-table-column>
              <el-table-column label="店铺" min-width="160"><template #default="{ row }">{{ row.merchant?.name || "平台券" }}</template></el-table-column>
              <el-table-column label="优惠" width="130"><template #default="{ row }">满 ¥{{ money(row.minAmount) }} 减 ¥{{ money(row.discountAmount) }}</template></el-table-column>
              <el-table-column label="范围" min-width="150"><template #default="{ row }">{{ couponScopeText(row) }}</template></el-table-column>
              <el-table-column label="使用" width="130"><template #default="{ row }">{{ row.usedCount || 0 }} / {{ row.usageLimit || "不限" }}</template></el-table-column>
              <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="couponStatusType(row.runtimeStatus)">{{ couponStatusText(row.runtimeStatus) }}</el-tag></template></el-table-column>
              <el-table-column label="操作" width="150" fixed="right">
                <template #default="{ row }">
                  <el-button size="small" @click="editCoupon(row)">编辑</el-button>
                  <el-button size="small" :type="row.enabled ? 'warning' : 'success'" plain @click="toggleCoupon(row)">{{ row.enabled ? "停用" : "启用" }}</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-divider>使用记录</el-divider>
            <el-table v-loading="couponUsageLoading" :data="couponUsages" size="small" border empty-text="暂无使用记录">
              <el-table-column label="券码" width="140"><template #default="{ row }">{{ row.code }}</template></el-table-column>
              <el-table-column label="订单" width="180"><template #default="{ row }">{{ row.order?.orderNo || "-" }}</template></el-table-column>
              <el-table-column label="用户" width="130"><template #default="{ row }">{{ row.user?.phone || row.user?.nickname || "-" }}</template></el-table-column>
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
            <template #header><div class="section-header"><span>{{ flashSaleForm.id ? "编辑秒杀" : "新增秒杀" }}</span><el-button v-if="flashSaleForm.id" size="small" @click="resetFlashSaleForm">取消编辑</el-button></div></template>
            <activity-form type="flash" />
          </el-card>
          <el-card shadow="never" class="table-card">
            <template #header>
              <div class="section-header">
                <span>秒杀活动</span>
                <div>
                  <el-select v-model="flashSaleFilters.status" clearable placeholder="全部状态" size="small" style="width:130px" @change="loadFlashSales">
                    <el-option label="草稿" value="draft" />
                    <el-option label="进行中" value="active" />
                    <el-option label="已停用" value="disabled" />
                  </el-select>
                  <el-button size="small" :loading="flashSaleLoading" @click="loadFlashSales">刷新</el-button>
                </div>
              </div>
            </template>
            <el-table v-loading="flashSaleLoading" :data="flashSales" stripe empty-text="暂无秒杀活动">
              <el-table-column label="活动" min-width="220"><template #default="{ row }"><strong>{{ row.title }}</strong><small>{{ row.product?.title || "-" }} / {{ row.sku?.name || "-" }}</small></template></el-table-column>
              <el-table-column label="店铺" min-width="150"><template #default="{ row }">{{ row.merchant?.name || "-" }}</template></el-table-column>
              <el-table-column label="价格/库存" width="140"><template #default="{ row }">¥{{ money(row.salePrice) }} · {{ row.soldStock || 0 }}/{{ row.saleStock || 0 }}</template></el-table-column>
              <el-table-column label="时间" min-width="210"><template #default="{ row }">{{ formatTime(row.startsAt) }} 至 {{ formatTime(row.endsAt) }}</template></el-table-column>
              <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="activityStatusType(row.runtimeStatus || row.status)">{{ activityStatusText(row.runtimeStatus || row.status) }}</el-tag></template></el-table-column>
              <el-table-column label="操作" width="150" fixed="right"><template #default="{ row }"><el-button size="small" @click="editFlashSale(row)">编辑</el-button><el-button size="small" :type="row.status === 'active' ? 'warning' : 'success'" plain @click="toggleFlashSale(row)">{{ row.status === "active" ? "停用" : "启用" }}</el-button></template></el-table-column>
            </el-table>
          </el-card>
        </section>
      </el-tab-pane>

      <el-tab-pane label="拼团" name="group">
        <section class="tool-section">
          <el-card shadow="never" class="form-card">
            <template #header><div class="section-header"><span>{{ groupBuyForm.id ? "编辑拼团" : "新增拼团" }}</span><el-button v-if="groupBuyForm.id" size="small" @click="resetGroupBuyForm">取消编辑</el-button></div></template>
            <activity-form type="group" />
          </el-card>
          <el-card shadow="never" class="table-card">
            <template #header>
              <div class="section-header">
                <span>拼团活动</span>
                <div>
                  <el-select v-model="groupBuyFilters.status" clearable placeholder="全部状态" size="small" style="width:130px" @change="loadGroupBuys">
                    <el-option label="草稿" value="draft" />
                    <el-option label="进行中" value="active" />
                    <el-option label="已停用" value="disabled" />
                  </el-select>
                  <el-button size="small" :loading="groupBuyLoading" @click="loadGroupBuys">刷新</el-button>
                </div>
              </div>
            </template>
            <el-table v-loading="groupBuyLoading" :data="groupBuys" stripe empty-text="暂无拼团活动">
              <el-table-column label="活动" min-width="220"><template #default="{ row }"><strong>{{ row.title }}</strong><small>{{ row.product?.title || "-" }} / {{ row.sku?.name || "-" }}</small></template></el-table-column>
              <el-table-column label="店铺" min-width="150"><template #default="{ row }">{{ row.merchant?.name || "-" }}</template></el-table-column>
              <el-table-column label="价格/人数" width="150"><template #default="{ row }">¥{{ money(row.groupPrice) }} · {{ row.minPeople || 2 }}人成团</template></el-table-column>
              <el-table-column label="库存" width="120"><template #default="{ row }">{{ row.soldStock || 0 }}/{{ row.groupStock || 0 }}</template></el-table-column>
              <el-table-column label="状态" width="110"><template #default="{ row }"><el-tag :type="activityStatusType(row.runtimeStatus || row.status)">{{ activityStatusText(row.runtimeStatus || row.status) }}</el-tag></template></el-table-column>
              <el-table-column label="操作" width="150" fixed="right"><template #default="{ row }"><el-button size="small" @click="editGroupBuy(row)">编辑</el-button><el-button size="small" :type="row.status === 'active' ? 'warning' : 'success'" plain @click="toggleGroupBuy(row)">{{ row.status === "active" ? "停用" : "启用" }}</el-button></template></el-table-column>
            </el-table>
            <el-divider>参团记录</el-divider>
            <el-table v-loading="groupBuyRecordLoading" :data="groupBuyRecords" size="small" border empty-text="暂无参团记录">
              <el-table-column label="团号" width="150"><template #default="{ row }">{{ row.teamNo || "-" }}</template></el-table-column>
              <el-table-column label="活动" min-width="180"><template #default="{ row }">{{ row.title || row.groupBuy?.title || "-" }}</template></el-table-column>
              <el-table-column label="用户" width="130"><template #default="{ row }">{{ row.user?.phone || row.user?.nickname || "-" }}</template></el-table-column>
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
                <el-button v-if="promotionForm.id" size="small" @click="resetPromotionForm">取消编辑</el-button>
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
              <el-form-item label="备注"><el-input v-model="promotionForm.remark" type="textarea" :rows="3" placeholder="内部结算说明、合作范围或风控备注" /></el-form-item>
              <el-form-item label="启用"><el-switch v-model="promotionForm.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
              <el-button type="primary" :loading="promotionSaving" :disabled="!canOperateSelectedMerchant" :title="operationScopeTip" @click="savePromotionCode">{{ promotionForm.id ? "保存推广码" : "新增推广码" }}</el-button>
            </el-form>
          </el-card>
          <el-card shadow="never" class="table-card">
            <template #header>
              <div class="section-header">
                <span>推广码列表</span>
                <div>
                  <el-select v-model="promotionFilters.enabled" clearable placeholder="全部状态" size="small" style="width:120px" @change="loadPromotionCodes">
                    <el-option label="启用" value="true" />
                    <el-option label="停用" value="false" />
                  </el-select>
                  <el-button size="small" :loading="promotionLoading" @click="loadPromotionCodes">刷新</el-button>
                </div>
              </div>
            </template>
            <el-table v-loading="promotionLoading" :data="promotionCodes" stripe empty-text="暂无推广码">
              <el-table-column label="推广码" width="160"><template #default="{ row }"><strong>{{ row.code }}</strong><small>{{ row.name }}</small></template></el-table-column>
              <el-table-column label="店铺" min-width="160"><template #default="{ row }">{{ row.merchant?.name || "-" }}</template></el-table-column>
              <el-table-column label="代理/推广人" min-width="180"><template #default="{ row }">{{ row.agent?.name || row.promoterUser?.phone || "-" }}</template></el-table-column>
              <el-table-column label="佣金" width="100"><template #default="{ row }">{{ percent(row.commissionRate) }}%</template></el-table-column>
              <el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? "启用" : "停用" }}</el-tag></template></el-table-column>
              <el-table-column label="操作" width="150" fixed="right"><template #default="{ row }"><el-button size="small" @click="editPromotionCode(row)">编辑</el-button><el-button size="small" :type="row.enabled ? 'warning' : 'success'" plain @click="togglePromotionCode(row)">{{ row.enabled ? "停用" : "启用" }}</el-button></template></el-table-column>
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
import { isPlatformAdmin } from "../permissions";
import { copyToClipboard, h5RoutePreviewUrl } from "../h5-preview";

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
const coupons = ref<any[]>([]);
const couponUsages = ref<any[]>([]);
const flashSales = ref<any[]>([]);
const groupBuys = ref<any[]>([]);
const groupBuyRecords = ref<any[]>([]);
const promotionCodes = ref<any[]>([]);
const agents = ref<any[]>([]);
const marketingTabs = ["coupons", "flash", "group", "promotions"];
const activeTab = ref(routeTab());
const keyword = ref("");
const deepLinkWarning = ref("");
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
const filters = reactive({ tenantId: routeTenantId(), merchantId: routeMerchantId() });
const couponFilters = reactive({ status: "" });
const flashSaleFilters = reactive({ status: "" });
const groupBuyFilters = reactive({ status: "" });
const promotionFilters = reactive({ enabled: "" });
const couponForm = reactive<any>({ id: null, code: "", name: "", minAmount: 0, discountAmount: 0, scope: "all", scopeCategoryId: null, scopeProductId: null, usageLimit: 0, perUserLimit: 0, startsAt: "", endsAt: "", enabled: true });
const flashSaleForm = reactive<any>({ id: null, title: "", originalTitle: "", productId: null, skuId: null, originalSkuId: null, salePrice: 0, saleStock: 1, lockedStock: 0, soldStock: 0, perUserLimit: 1, startsAt: "", endsAt: "", status: "draft", sortOrder: 0 });
const groupBuyForm = reactive<any>({ id: null, title: "", originalTitle: "", productId: null, skuId: null, originalSkuId: null, groupPrice: 0, minPeople: 2, groupStock: 1, lockedStock: 0, soldStock: 0, perUserLimit: 1, startsAt: "", endsAt: "", status: "draft", sortOrder: 0 });
const promotionForm = reactive<any>({ id: null, code: "", name: "", commissionRatePercent: 0, promoterUserId: null, agentId: null, enabled: true, remark: "", orderCount: 0, originalCode: "", originalAgentId: null, originalPromoterUserId: null, originalCommissionRatePercent: 0 });
const selectedMerchant = computed(() => merchants.value.find((merchant) => merchant.id === filters.merchantId));
const selectedMerchantOpen = computed(() => merchantOperational(selectedMerchant.value));
const selectedMerchantDisabledReason = computed(() => merchantDisabledReason(selectedMerchant.value));
const selectedMerchantName = computed(() => selectedMerchant.value ? `${selectedMerchant.value.name || selectedMerchant.value.code}（${merchantOwnerText(selectedMerchant.value)}）` : "请先在页面顶部选择店铺");
const canOperateSelectedMerchant = computed(() => !deepLinkWarning.value && !!filters.merchantId && selectedMerchantOpen.value);
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
const loadingAny = computed(() => merchantLoading.value || productLoading.value || couponLoading.value || flashSaleLoading.value || groupBuyLoading.value || promotionLoading.value);
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
        h(ElButton, { type: "primary", loading: isFlash ? flashSaleSaving.value : groupBuySaving.value, disabled: !canOperateSelectedMerchant.value, title: operationScopeTip.value, onClick: save }, () => (form.id ? "保存活动" : "新增活动"))
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
  return marketingTabs.includes(tab) ? tab : "coupons";
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
function formatTime(value: any) { return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "-"; }
function couponStatusText(value: string) { return ({ active: "可用", not_started: "未开始", expired: "已过期", exhausted: "已用完", disabled: "已停用" } as any)[value] || value || "-"; }
function couponStatusType(value: string) { return value === "active" ? "success" : value === "not_started" ? "warning" : "info"; }
function couponUsageStatusText(value: string) { return ({ used: "已使用", released: "已释放" } as any)[value] || value || "-"; }
function activityStatusText(value: string) { return ({ active: "进行中", not_started: "未开始", ended: "已结束", sold_out: "已售罄", draft: "草稿", disabled: "已停用" } as any)[value] || value || "-"; }
function activityStatusType(value: string) { return value === "active" ? "success" : value === "not_started" || value === "draft" ? "warning" : "info"; }
function groupBuyTeamStatusText(value: string) { return ({ forming: "组团中", success: "已成团", failed: "未成团" } as any)[value] || value || "-"; }
function groupBuyTeamStatusType(value: string) { return value === "success" ? "success" : value === "failed" ? "info" : "warning"; }
function agentLabel(agent: any) { return `${agent.name || agent.phone || agent.id}${agent.region ? `（${agent.region}）` : ""}`; }
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
  const perUserLimit = Math.trunc(Number(couponForm.perUserLimit || 0));
  if (minAmount > 0 && discountAmount > minAmount) {
    ElMessage.error("有门槛优惠券的优惠金额不能大于使用门槛；如需无门槛券，请把门槛设置为 0。");
    return false;
  }
  if (usageLimit > 0 && perUserLimit > usageLimit) {
    ElMessage.error("每人可用次数不能大于总可用次数；如需不限每人次数，请把每人次数设置为 0。");
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
  if (row.scope === "category") return `指定分类：${categories.value.find((item) => item.id === row.scopeCategoryId)?.name || row.scopeCategoryId || "-"}`;
  if (row.scope === "product") return `指定商品：${products.value.find((item) => item.id === row.scopeProductId)?.title || row.scopeProductId || "-"}`;
  return "全店通用";
}
function currentMallParams(extra: Record<string, any> = {}) {
  return {
    tenantId: isPlatformAdmin() ? filters.tenantId || selectedMerchant.value?.tenant?.id : undefined,
    merchantId: filters.merchantId || undefined,
    ...extra
  };
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
  products.value = [];
  categories.value = [];
  coupons.value = [];
  couponUsages.value = [];
  flashSales.value = [];
  groupBuys.value = [];
  groupBuyRecords.value = [];
  promotionCodes.value = [];
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
  tenants.value = isPlatformAdmin() ? await api.get<any, any[]>("/admin/tenants") : [];
}
async function loadMerchants() {
  merchantLoading.value = true;
  try {
    merchants.value = await api.get<any, Merchant[]>("/admin/mall/accessible-merchants", { params: { tenantId: isPlatformAdmin() ? filters.tenantId : undefined, enabled: "true" } });
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
    ElMessage.error(error.message || "加载可运营店铺失败");
    return false;
  } finally {
    merchantLoading.value = false;
  }
}
async function loadProductsAndCategories() {
  if (deepLinkWarning.value) return;
  if (!filters.merchantId) {
    products.value = [];
    categories.value = [];
    return;
  }
  productLoading.value = true;
  try {
    const params = currentMallParams({ pageSize: 200 });
    const [categoryRows, productResult] = await Promise.all([
      api.get<any, any[]>("/admin/mall/categories", { params: currentMallParams() }),
      api.get<any, any>("/admin/mall/products", { params })
    ]);
    categories.value = categoryRows || [];
    products.value = productResult?.items || productResult || [];
  } catch (error: any) {
    ElMessage.error(error.message || "加载营销适用商品失败");
  } finally {
    productLoading.value = false;
  }
}
async function loadCoupons() {
  if (deepLinkWarning.value) return;
  couponLoading.value = true;
  try {
    coupons.value = await api.get<any, any[]>("/admin/mall/coupons", { params: currentMallParams({ status: couponFilters.status || undefined, keyword: keyword.value.trim() || undefined }) });
    await loadCouponUsages();
  } catch (error: any) {
    ElMessage.error(error.message || "加载优惠券失败");
  } finally {
    couponLoading.value = false;
  }
}
async function loadCouponUsages() {
  if (deepLinkWarning.value) return;
  couponUsageLoading.value = true;
  try {
    couponUsages.value = await api.get<any, any[]>("/admin/mall/coupon-usages", { params: currentMallParams({ keyword: keyword.value.trim() || undefined }) });
  } catch (error: any) {
    ElMessage.error(error.message || "加载优惠券使用记录失败");
  } finally {
    couponUsageLoading.value = false;
  }
}
async function loadFlashSales() {
  if (deepLinkWarning.value) return;
  flashSaleLoading.value = true;
  try {
    flashSales.value = await api.get<any, any[]>("/admin/mall/flash-sales", { params: currentMallParams({ status: flashSaleFilters.status || undefined, keyword: keyword.value.trim() || undefined }) });
  } catch (error: any) {
    ElMessage.error(error.message || "加载秒杀活动失败");
  } finally {
    flashSaleLoading.value = false;
  }
}
async function loadGroupBuys() {
  if (deepLinkWarning.value) return;
  groupBuyLoading.value = true;
  try {
    groupBuys.value = await api.get<any, any[]>("/admin/mall/group-buys", { params: currentMallParams({ status: groupBuyFilters.status || undefined, keyword: keyword.value.trim() || undefined }) });
    await loadGroupBuyRecords();
  } catch (error: any) {
    ElMessage.error(error.message || "加载拼团活动失败");
  } finally {
    groupBuyLoading.value = false;
  }
}
async function loadGroupBuyRecords() {
  if (deepLinkWarning.value) return;
  groupBuyRecordLoading.value = true;
  try {
    groupBuyRecords.value = await api.get<any, any[]>("/admin/mall/group-buy-records", { params: currentMallParams({ keyword: keyword.value.trim() || undefined }) });
  } catch (error: any) {
    ElMessage.error(error.message || "加载参团记录失败");
  } finally {
    groupBuyRecordLoading.value = false;
  }
}
async function loadAgents() {
  if (!filters.merchantId) return;
  try {
    agents.value = await api.get<any, any[]>("/admin/agents", { params: { includeDisabled: true, tenantId: isPlatformAdmin() ? filters.tenantId || selectedMerchant.value?.tenant?.id || undefined : undefined } });
  } catch {
    agents.value = [];
  }
}
async function loadPromotionCodes() {
  if (deepLinkWarning.value) return;
  promotionLoading.value = true;
  try {
    promotionCodes.value = await api.get<any, any[]>("/admin/mall/promotion-codes", { params: currentMallParams({ enabled: promotionFilters.enabled || undefined, keyword: keyword.value.trim() || undefined }) });
  } catch (error: any) {
    ElMessage.error(error.message || "加载推广码失败");
  } finally {
    promotionLoading.value = false;
  }
}
async function loadActiveTab() {
  await syncRouteQuery();
  if (activeTab.value === "coupons") await loadCoupons();
  if (activeTab.value === "flash") await loadFlashSales();
  if (activeTab.value === "group") await loadGroupBuys();
  if (activeTab.value === "promotions") {
    await loadAgents();
    await loadPromotionCodes();
  }
}
async function reload() {
  if (deepLinkWarning.value) return;
  await loadProductsAndCategories();
  await Promise.all([loadCoupons(), loadFlashSales(), loadGroupBuys(), loadPromotionCodes()]);
  if (activeTab.value === "promotions") await loadAgents();
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
}
function resetCouponForm() {
  Object.assign(couponForm, { id: null, code: "", name: "", minAmount: 0, discountAmount: 0, scope: "all", scopeCategoryId: null, scopeProductId: null, usageLimit: 0, perUserLimit: 0, startsAt: "", endsAt: "", enabled: true });
}
function resetFlashSaleForm() {
  Object.assign(flashSaleForm, { id: null, title: "", originalTitle: "", productId: null, skuId: null, originalSkuId: null, salePrice: 0, saleStock: 1, lockedStock: 0, soldStock: 0, perUserLimit: 1, startsAt: "", endsAt: "", status: "draft", sortOrder: 0 });
}
function resetGroupBuyForm() {
  Object.assign(groupBuyForm, { id: null, title: "", originalTitle: "", productId: null, skuId: null, originalSkuId: null, groupPrice: 0, minPeople: 2, groupStock: 1, lockedStock: 0, soldStock: 0, perUserLimit: 1, startsAt: "", endsAt: "", status: "draft", sortOrder: 0 });
}
function resetPromotionForm() {
  Object.assign(promotionForm, { id: null, code: "", name: "", commissionRatePercent: 0, promoterUserId: null, agentId: null, enabled: true, remark: "", orderCount: 0, originalCode: "", originalAgentId: null, originalPromoterUserId: null, originalCommissionRatePercent: 0 });
}
async function selectRowMerchant(row: any, action: string) {
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
  couponSaving.value = true;
  try {
    const payload = {
      code: couponForm.code.trim(),
      name: couponForm.name.trim(),
      ...currentMallParams(),
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
  flashSaleSaving.value = true;
  try {
    const payload = { ...flashSaleForm, title: flashSaleForm.title.trim(), ...currentMallParams() };
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
  groupBuySaving.value = true;
  try {
    const payload = { ...groupBuyForm, title: groupBuyForm.title.trim(), ...currentMallParams() };
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
  if (!validatePromotionCodeConfiguration()) return;
  promotionSaving.value = true;
  try {
    const payload = {
      code: promotionForm.code.trim(),
      name: promotionForm.name.trim(),
      ...currentMallParams(),
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
    await loadPromotionCodes();
  } catch (error: any) {
    ElMessage.error(error.message || "保存推广码失败");
  } finally {
    promotionSaving.value = false;
  }
}
async function toggleCoupon(row: any) {
  if (!(await editCoupon(row))) return;
  if (!requireMerchantSelection("启停优惠券", row)) return;
  if (!(await confirmMarketingToggle(row, row.enabled ? "停用" : "启用", "优惠券"))) return;
  couponForm.enabled = !row.enabled;
  await saveCoupon();
}
async function toggleFlashSale(row: any) {
  if (!(await editFlashSale(row))) return;
  if (!requireMerchantSelection("启停秒杀活动", row)) return;
  if (!(await confirmMarketingToggle(row, row.status === "active" ? "停用" : "启用", "秒杀活动"))) return;
  flashSaleForm.status = row.status === "active" ? "disabled" : "active";
  await saveFlashSale();
}
async function toggleGroupBuy(row: any) {
  if (!(await editGroupBuy(row))) return;
  if (!requireMerchantSelection("启停拼团活动", row)) return;
  if (!(await confirmMarketingToggle(row, row.status === "active" ? "停用" : "启用", "拼团活动"))) return;
  groupBuyForm.status = row.status === "active" ? "disabled" : "active";
  await saveGroupBuy();
}
async function togglePromotionCode(row: any) {
  if (!(await editPromotionCode(row))) return;
  if (!requireMerchantSelection("启停推广码", row)) return;
  if (!(await confirmMarketingToggle(row, row.enabled ? "停用" : "启用", "推广码"))) return;
  promotionForm.enabled = !row.enabled;
  await savePromotionCode();
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
