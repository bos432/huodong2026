import {
  API_BASE,
  TENANT_CODE,
  SCENARIO,
  api,
  assert,
  auth,
  cover,
  env,
  loginPlatformAdmin,
  loginUser,
  pickList,
  reportStep,
  tenantHeader,
  todayDate,
  userAuth
} from "./online-showcase-lib.mjs";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const showcasePassword = env("SHOWCASE_PASSWORD");
const root = process.cwd();
const apiRequire = createRequire(path.join(root, "apps/api/package.json"));
const ExcelJS = apiRequire("exceljs");
const resultFile = process.env.MALL_MULTI_MERCHANT_SMOKE_RESULT_FILE || "deploy/mall-multi-merchant-smoke-result.json";
const smokeChecks = {};
const requiredSmokeChecks = [
  "merchantSetup",
  "storeProducts",
  "productAudit",
  "adminIsolation",
  "publicStorefront",
  "categoryMerchantAvailabilityGuard",
  "paymentReadiness",
  "paymentAccountManagement",
  "merchantOperationReadiness",
  "merchantIdentityGuard",
  "userPrivatePayloadSafety",
  "merchantOpenGuard",
  "merchantDirectOpenGuard",
  "cartMerchantAvailabilityGuard",
  "favoriteBrowseMerchantAvailabilityGuard",
  "productSkuAvailabilityGuard",
  "paymentModeSwitchGuard",
  "merchantCloseGuard",
  "disabledMerchantOperationGuard",
  "merchantAccessTenantGuard",
  "couponStoreIsolation",
  "couponMerchantAvailabilityGuard",
  "promotionStoreIsolation",
  "flashGroupStoreIsolation",
  "marketingProductAvailabilityGuard",
  "logisticsStoreIsolation",
  "crossStoreCheckout",
  "crossStoreBalanceGuard",
  "checkoutGroupIdempotencyGuard",
  "paymentTaskRouting",
  "directIdOperationIsolation",
  "batchOperationScope",
  "orderFulfillment",
  "checkoutGroupStatusSync",
  "checkoutGroupAdminTrace",
  "reviewStoreIsolation",
  "settlementLifecycle",
  "settlementPaidEvidenceGuard",
  "settlementPaymentModeAccounting",
  "settlementRefundChargebackAccounting",
  "operationalAdmin"
];

const mallOperatorPermissions = [
  "dashboard.view",
  "mall.merchant.view",
  "mall.merchant.manage",
  "mall.product.manage",
  "mall.review.manage",
  "mall.logistics.manage",
  "mall.order.view",
  "mall.order.manage",
  "mall.refund.manage",
  "mall.finance.view",
  "mall.payment.manage",
  "mall.settlement.manage",
  "mall.statistics.view",
  "upload.image"
];

async function main() {
  console.log(`多商户商城 smoke target：${TENANT_CODE}`);
  const platform = await loginPlatformAdmin();
  const tenant = await requireShowcaseTenant(platform.token);
  const accounts = await ensureStoreAccounts(platform.token, tenant.id);
  const agent = await ensureAgent(platform.token, tenant.id);
  const selfStorePayload = {
    tenantId: tenant.id,
    ownerType: "tenant",
    code: "qiwai-showcase-self",
    name: "七维书院自营商城",
    status: "active",
    mallEnabled: true,
    productAuditRequired: false,
    paymentMode: "platform_collect",
    region: "重庆市铜梁区",
    contactName: "七维自营店长",
    contactPhone: "13990008881",
    notice: "平台自营书院好物，支持平台统一代收和履约。",
    remark: `demoScenario:${SCENARIO} multi-merchant self store`
  };
  const existingAgentStore = await findMerchantByCode(platform.token, tenant.id, "qiwai-showcase-agent-south");
  const agentStorePayload = {
    tenantId: tenant.id,
    agentId: agent.id,
    ownerType: "agent",
    code: "qiwai-showcase-agent-south",
    name: "南城代理精选店",
    status: "active",
    mallEnabled: true,
    productAuditRequired: true,
    paymentMode: existingAgentStore?.paymentMode || "platform_collect",
    region: "重庆市南岸区",
    contactName: "南城代理店长",
    contactPhone: "13990008882",
    notice: "代理授权店铺，可独立维护商品、订单和履约。",
    remark: `demoScenario:${SCENARIO} multi-merchant agent store`
  };
  let selfStore = await ensureMerchantSetupDraft(platform.token, selfStorePayload);
  let agentStore = await ensureMerchantSetupDraft(platform.token, agentStorePayload);
  await ensureMerchantAccess(platform.token, accounts.selfOwner.id, selfStore.id, "manager");
  await ensureMerchantAccess(platform.token, accounts.agentOwner.id, agentStore.id, "manager");
  await ensureMerchantAccess(platform.token, accounts.selfFinance.id, selfStore.id, "finance");
  selfStore = await ensureMerchant(platform.token, selfStorePayload);
  agentStore = await ensureMerchant(platform.token, agentStorePayload);
  markSmokeCheck("merchantSetup", { selfStoreId: selfStore.id, agentStoreId: agentStore.id });
  reportStep("多商户店铺与授权已准备", `${selfStore.name} / ${agentStore.name}`);
  const accessGuardEvidence = await assertMerchantAccessTenantGuard(platform.token, selfStore);
  markSmokeCheck("merchantAccessTenantGuard", accessGuardEvidence);
  reportStep("店铺授权商家归属保护通过", "平台不能把其他商家的后台账号误授权到当前店铺");
  const disabledGuardEvidence = await assertDisabledMerchantOperationGuard(platform.token, tenant.id);
  markSmokeCheck("disabledMerchantOperationGuard", disabledGuardEvidence);
  reportStep("停用店铺运营写入保护通过", "店铺停用后，授权账号不能继续新增商品/分类/营销等运营内容");
  const openGuardEvidence = await assertMerchantOpenGuard(platform.token, tenant.id, accounts.selfOwner.id);
  markSmokeCheck("merchantOpenGuard", openGuardEvidence);
  reportStep("店铺开通前授权保护通过", "没有授权后台账号时，后端会拒绝直接开放店铺");
  const directOpenGuardEvidence = await assertMerchantDirectOpenGuard(platform.token, tenant.id, accounts.selfOwner.id);
  markSmokeCheck("merchantDirectOpenGuard", directOpenGuardEvidence);
  reportStep("商户直收开通源头保护通过", "没有启用店铺收款账户时，后端会拒绝开放商户直收店铺");

  const selfOwner = await loginAdmin("showcase_store_owner");
  const agentOwner = await loginAdmin("showcase_agent_owner");
  const selfFinance = await loginAdmin("showcase_store_finance");
  const selfProduct = await ensureStoreProduct(selfOwner.token, selfStore, "【多商户】自营晨读手账", "自营文创", 36, 68, 21);
  const agentProduct = await ensureStoreProduct(agentOwner.token, agentStore, "【多商户】代理节气茶礼", "代理好物", 58, 98, 22);
  markSmokeCheck("storeProducts", { selfProductId: selfProduct.id, agentProductId: agentProduct.id });
  reportStep("两个授权店铺商品已创建/更新", `${selfProduct.title} / ${agentProduct.title}`);
  await assertProductAuditFlow(platform.token, agentOwner.token, agentProduct);
  markSmokeCheck("productAudit", { agentProductId: agentProduct.id });
  reportStep("店铺商品审核流通过", "代理店铺提交后由平台审核，店铺账号不能自审");
  const operationReadinessEvidence = await assertMerchantOperationReadiness(platform.token, selfOwner.token, selfStore, agentStore);
  markSmokeCheck("merchantOperationReadiness", operationReadinessEvidence);
  reportStep("店铺上线状态摘要通过", "店铺列表可直接判断商品、授权、收款和运营状态");

  await assertAdminIsolation(selfOwner.token, agentOwner.token, selfProduct, agentProduct, selfStore, agentStore);
  markSmokeCheck("adminIsolation", { selfStoreId: selfStore.id, agentStoreId: agentStore.id });
  reportStep("后台店铺授权隔离通过", "店铺账号只能看到和操作自己的商品");

  const publicStores = pickList(await api(`/public/mall/merchants?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() }));
  assert(publicStores.some((item) => item.id === selfStore.id), "前台店铺列表缺少自营店");
  assert(publicStores.some((item) => item.id === agentStore.id), "前台店铺列表缺少代理店");
  const publicAgentStoreDetail = await api(`/public/mall/merchants/${agentStore.id}?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() });
  assert(publicAgentStoreDetail.id === agentStore.id && Number(publicAgentStoreDetail.productCount || 0) >= 0, "前台店铺主页详情接口缺少代理店或商品数量");
  const publicSelfProducts = pickList(await api(`/public/mall/products?tenantCode=${TENANT_CODE}&merchantId=${selfStore.id}&pageSize=20`, { headers: tenantHeader() }));
  const publicAgentProducts = pickList(await api(`/public/mall/products?tenantCode=${TENANT_CODE}&merchantId=${agentStore.id}&pageSize=20`, { headers: tenantHeader() }));
  assert(publicSelfProducts.some((item) => item.id === selfProduct.id), "前台自营店商品流缺少自营商品");
  assert(publicAgentProducts.some((item) => item.id === agentProduct.id), "前台代理店商品流缺少代理商品");
  assertPublicMallPayloadSafe("前台店铺列表", publicStores);
  assertPublicMallPayloadSafe("前台店铺详情", publicAgentStoreDetail);
  assertPublicMallPayloadSafe("前台商品流", [...publicSelfProducts, ...publicAgentProducts]);
  markSmokeCheck("publicStorefront", { selfStoreId: selfStore.id, agentStoreId: agentStore.id, publicPayloadGuard: true });
  reportStep("前台店铺列表与店铺商品流通过");
  const categoryAvailabilityEvidence = await assertCategoryMerchantAvailabilityGuard(platform.token, tenant.id, accounts.selfOwner.id);
  markSmokeCheck("categoryMerchantAvailabilityGuard", categoryAvailabilityEvidence);
  reportStep("商城分类店铺可见性保护通过", categoryAvailabilityEvidence.blockedMessage);

  const agentPaymentAccount = await assertMerchantPaymentAccountManagement(selfOwner.token, agentOwner.token, selfStore, agentStore);
  agentStore = await ensureMerchant(platform.token, {
    tenantId: tenant.id,
    agentId: agent.id,
    ownerType: "agent",
    code: "qiwai-showcase-agent-south",
    name: "南城代理精选店",
    status: "active",
    mallEnabled: true,
    productAuditRequired: true,
    paymentMode: "merchant_direct",
    region: "重庆市南岸区",
    contactName: "南城代理店长",
    contactPhone: "13990008882",
    notice: "代理授权店铺，可独立维护商品、订单和履约。",
    remark: `demoScenario:${SCENARIO} multi-merchant agent store`
  });
  const configuredReadiness = await api(`/admin/mall/payment-readiness?merchantId=${agentStore.id}`, { headers: auth(platform.token) });
  assert(configuredReadiness.collectionMode === "merchant_direct", "代理店铺支付 readiness 未识别为商户直收");
  assert(configuredReadiness.direct?.account?.id === agentPaymentAccount.id, "商户直收 readiness 未使用店铺自己的收款账户");
  assert(Array.isArray(configuredReadiness.direct?.unreadableFiles) && configuredReadiness.direct.unreadableFiles.includes("WECHAT_PAY_PRIVATE_KEY_PATH"), "店铺收款账户证书路径不可读时 readiness 应明确返回 unreadableFiles");
  const configuredPaymentMethods = pickList(await api(`/public/mall/payment-methods?tenantCode=${TENANT_CODE}&merchantId=${agentStore.id}`, { headers: tenantHeader() }));
  const configuredWechatMethod = configuredPaymentMethods.find((item) => item.value === "wechat");
  assert(configuredWechatMethod && configuredWechatMethod.enabled === false && String(configuredWechatMethod.disabledReason || "").includes("店铺运营"), "店铺收款账户证书不可读时前台应展示用户可理解的禁用原因");
  assertPublicMallPaymentMethodsSafe("前台商城店铺收款账户支付方式", configuredPaymentMethods);
  const accountDisableGuard = await assertMerchantPaymentAccountDisableGuard(agentOwner.token, agentStore, agentPaymentAccount);
  markSmokeCheck("paymentReadiness", { agentStoreId: agentStore.id, disabledReason: configuredWechatMethod.disabledReason });
  markSmokeCheck("paymentAccountManagement", { accountId: agentPaymentAccount.id, agentStoreId: agentStore.id, accountDisableGuard });
  reportStep("店铺收款账户自主管理通过", configuredWechatMethod.disabledReason);
  await assertMerchantIdentityGuard(platform.token, agentStore);
  markSmokeCheck("merchantIdentityGuard", { agentStoreId: agentStore.id });
  reportStep("店铺主体稳定性保护通过", "已有经营数据的店铺不能改编码、所属商家或绑定代理");

  const user = await loginUser("13990008991", "多商户验收用户");
  const userPrivatePayloadEvidence = await assertUserPrivatePayloadSafety(user.userAccessToken, selfProduct);
  markSmokeCheck("userPrivatePayloadSafety", userPrivatePayloadEvidence);
  reportStep("用户侧商城私有数据 DTO 通过", "收藏、浏览足迹、收货地址均未公开内部实体关系");
  const cartAvailabilityEvidence = await assertCartMerchantAvailabilityGuard(platform.token, user.userAccessToken, tenant.id, accounts.selfOwner.id);
  markSmokeCheck("cartMerchantAvailabilityGuard", cartAvailabilityEvidence);
  reportStep("购物车店铺可售状态保护通过", cartAvailabilityEvidence.unavailableReason);
  const favoriteBrowseAvailabilityEvidence = await assertFavoriteBrowseMerchantAvailabilityGuard(platform.token, user.userAccessToken, tenant.id, accounts.selfOwner.id);
  markSmokeCheck("favoriteBrowseMerchantAvailabilityGuard", favoriteBrowseAvailabilityEvidence);
  reportStep("收藏与浏览足迹店铺可见性保护通过", favoriteBrowseAvailabilityEvidence.blockedMessage);
  const productSkuAvailabilityEvidence = await assertProductSkuAvailabilityGuard(platform.token, user.userAccessToken, tenant.id, accounts.selfOwner.id);
  markSmokeCheck("productSkuAvailabilityGuard", productSkuAvailabilityEvidence);
  reportStep("商品可售规格可见性保护通过", productSkuAvailabilityEvidence.blockedMessage);
  const agentCoupon = await ensureStoreCoupon(agentOwner.token, agentStore, "南城代理店专属券");
  await assertCouponStoreIsolation(selfOwner.token, agentOwner.token, user.userAccessToken, selfProduct, agentProduct, selfStore, agentStore, agentCoupon);
  markSmokeCheck("couponStoreIsolation", { couponId: agentCoupon.id, agentStoreId: agentStore.id });
  reportStep("店铺优惠券隔离通过", "店铺券只在所属店铺展示、领取和使用");
  const couponAvailabilityEvidence = await assertCouponMerchantAvailabilityGuard(platform.token, user.userAccessToken, tenant.id, accounts.selfOwner.id);
  markSmokeCheck("couponMerchantAvailabilityGuard", couponAvailabilityEvidence);
  reportStep("优惠券店铺可见性保护通过", couponAvailabilityEvidence.blockedMessage);
  const agentPromotion = await ensureStorePromotionCode(agentOwner.token, agentStore, agent);
  const promotionEvidence = await assertPromotionStoreIsolation(selfOwner.token, agentOwner.token, user.userAccessToken, selfProduct, agentProduct, selfStore, agentStore, agentPromotion);
  markSmokeCheck("promotionStoreIsolation", promotionEvidence);
  reportStep("店铺推广码和佣金隔离通过", "推广码只归属本店，佣金统计/导出/结算按店铺过滤");
  const agentFlashSale = await ensureStoreFlashSale(agentOwner.token, agentStore, agentProduct);
  const agentGroupBuy = await ensureStoreGroupBuy(agentOwner.token, agentStore, agentProduct);
  const activityEvidence = await assertFlashGroupStoreIsolation(user.userAccessToken, selfProduct, agentProduct, selfStore, agentStore, agentFlashSale, agentGroupBuy);
  markSmokeCheck("flashGroupStoreIsolation", activityEvidence);
  reportStep("店铺秒杀/拼团隔离通过", "活动只在所属店铺公共接口展示，跨店参团列表不可读取");
  const marketingAvailabilityEvidence = await assertMarketingProductAvailabilityGuard(platform.token, user.userAccessToken, tenant.id, accounts.selfOwner.id);
  markSmokeCheck("marketingProductAvailabilityGuard", marketingAvailabilityEvidence);
  reportStep("营销活动商品可见性保护通过", marketingAvailabilityEvidence.blockedMessage);
  const logisticsEvidence = await assertLogisticsStoreIsolation(selfOwner.token, agentOwner.token, selfStore, agentStore);
  markSmokeCheck("logisticsStoreIsolation", { selfLogisticsId: logisticsEvidence.selfLogistics.id, agentLogisticsId: logisticsEvidence.agentLogistics.id });
  reportStep("店铺物流配置隔离通过", "物流公司按店铺维护，前台和后台都不会串店展示");

  const checkoutGroup = await createCrossStoreCheckout(user.userAccessToken, selfProduct, agentProduct, selfStore, agentStore);
  markSmokeCheck("crossStoreCheckout", { groupNo: checkoutGroup.groupNo, orderCount: checkoutGroup.orders.length });
  reportStep("跨店购物车拆单通过", `${checkoutGroup.groupNo} -> ${checkoutGroup.orders.map((item) => item.orderNo).join(" / ")}`);
  const idempotencyEvidence = await assertCrossStoreCheckoutIdempotency(user.userAccessToken, checkoutGroup);
  markSmokeCheck("checkoutGroupIdempotencyGuard", idempotencyEvidence);
  reportStep("跨店重复提交幂等保护通过", `${idempotencyEvidence.groupNo} 未重复生成子订单`);
  const balanceGuardEvidence = await assertCrossStoreBalanceGuard(user.userAccessToken, selfProduct, agentProduct);
  markSmokeCheck("crossStoreBalanceGuard", balanceGuardEvidence);
  reportStep("跨店余额支付防半扣款守卫通过", balanceGuardEvidence.message);
  const paymentTaskEvidence = assertPaymentTaskRouting(checkoutGroup, selfStore, agentStore);
  markSmokeCheck("paymentTaskRouting", paymentTaskEvidence);
  reportStep("跨店支付任务路由通过", "平台代收店铺和商户直收店铺都有独立、可读的支付任务");
  const selfOrder = checkoutGroup.orders.find((item) => item.merchant?.id === selfStore.id);
  const agentOrder = checkoutGroup.orders.find((item) => item.merchant?.id === agentStore.id);
  assert(selfOrder && agentOrder, "跨店结算组缺少店铺子订单");
  const directIdEvidence = await assertDirectIdOperationIsolation(selfOwner.token, selfProduct, agentProduct, selfOrder, agentOrder, selfStore, agentStore, agentCoupon);
  markSmokeCheck("directIdOperationIsolation", directIdEvidence);
  reportStep("后台直接 ID 操作隔离通过", "店铺账号不能绕过列表筛选读取或操作其他店铺商品、库存、营销和订单信息");
  const batchScopeEvidence = await assertBatchOperationScope(selfFinance.token, selfStore, agentStore);
  markSmokeCheck("batchOperationScope", batchScopeEvidence);
  reportStep("后台批量任务授权范围通过", "租户财务触发批量任务时只作用于已授权店铺");
  const completedSelfOrder = await fulfillStoreOrder(selfOwner.token, user.userAccessToken, selfOrder, "自营店", logisticsEvidence.selfLogistics);
  const completedAgentOrder = await fulfillStoreOrder(agentOwner.token, user.userAccessToken, agentOrder, "代理店", logisticsEvidence.agentLogistics);
  markSmokeCheck("orderFulfillment", { selfOrderNo: selfOrder.orderNo, agentOrderNo: agentOrder.orderNo });
  reportStep("跨店子订单履约闭环通过", "店铺确认收款 -> 发货 -> 用户确认收货");
  const paymentModeSwitchEvidence = await assertPaymentModeSwitchGuard(platform.token, tenant.id, agentStore, completedAgentOrder);
  markSmokeCheck("paymentModeSwitchGuard", paymentModeSwitchEvidence);
  reportStep("店铺收款模式切换保护通过", paymentModeSwitchEvidence.blockedMessage);
  const merchantCloseEvidence = await assertMerchantCloseGuard(platform.token, tenant.id, agentStore, completedAgentOrder);
  markSmokeCheck("merchantCloseGuard", merchantCloseEvidence);
  reportStep("店铺关闭保护通过", merchantCloseEvidence.blockedMessage);
  const groupStatusEvidence = await assertCheckoutGroupStatusSync(platform.token, checkoutGroup, completedSelfOrder, completedAgentOrder);
  markSmokeCheck("checkoutGroupStatusSync", groupStatusEvidence);
  reportStep("跨店结算组状态同步通过", `${groupStatusEvidence.groupNo} -> ${groupStatusEvidence.status}`);
  const adminTraceEvidence = await assertCheckoutGroupAdminTrace(platform.token, checkoutGroup, selfStore, agentStore);
  markSmokeCheck("checkoutGroupAdminTrace", adminTraceEvidence);
  reportStep("后台结算组追踪接口通过", `${adminTraceEvidence.groupNo} -> ${adminTraceEvidence.orderCount} 个子订单`);
  const reviewEvidence = await assertReviewStoreIsolation(selfOwner.token, agentOwner.token, user.userAccessToken, completedSelfOrder, completedAgentOrder, selfStore, agentStore);
  markSmokeCheck("reviewStoreIsolation", reviewEvidence);
  reportStep("商城评价店铺隔离通过", "店铺账号只能查看和审核本店评价");
  const agentBalanceOrder = await createAgentBalanceSettlementOrder(platform.token, agentOwner.token, user.userAccessToken, user.user?.id, agentProduct, agentStore, logisticsEvidence.agentLogistics);
  reportStep("代理店余额支付结算样本已准备", agentBalanceOrder.orderNo);

  await assertSettlementGuard(agentOwner.token, agentStore);
  const selfSettlement = await assertSettlementLifecycle(platform.token, selfStore, "自营店");
  const agentSettlement = await assertSettlementLifecycle(platform.token, agentStore, "代理店");
  markSmokeCheck("settlementLifecycle", { selfSettlementNo: selfSettlement.settlementNo, agentSettlementNo: agentSettlement.settlementNo });
  markSmokeCheck("settlementPaidEvidenceGuard", {
    selfSettlementNo: selfSettlement.settlementNo,
    agentSettlementNo: agentSettlement.settlementNo,
    selfMessage: selfSettlement.paidEvidenceGuardMessage,
    agentMessage: agentSettlement.paidEvidenceGuardMessage
  });
  reportStep("多商户结算闭环通过", `${selfSettlement.settlementNo} / ${agentSettlement.settlementNo}`);
  const accountingEvidence = assertSettlementPaymentModeAccounting(agentSettlement, agentStore, agentBalanceOrder);
  markSmokeCheck("settlementPaymentModeAccounting", accountingEvidence);
  reportStep("商户直收店铺平台代收结算口径通过", `平台代收净额 ${accountingEvidence.platformCollectedNetAmount}，应打款 ${accountingEvidence.payableAmount}`);
  const chargebackEvidence = await assertSettlementRefundChargebackAccounting(platform.token, user.userAccessToken, agentStore, agentBalanceOrder);
  markSmokeCheck("settlementRefundChargebackAccounting", chargebackEvidence);
  reportStep("已结算后退款冲抵结算通过", `退款 ${chargebackEvidence.refundAmount}，应扣回/冲抵 ${chargebackEvidence.payableAmount}`);
  await assertMallOperationalAdminEndpoints(platform.token, selfOwner.token, agentOwner.token, selfStore, agentStore, selfSettlement, agentSettlement);
  markSmokeCheck("operationalAdmin", { selfStoreId: selfStore.id, agentStoreId: agentStore.id });
  reportStep("商城运营后台接口通过", "统计、支付日志、结算列表、结算导出和店铺隔离均可用");
  writeSmokeResult();

  console.log("\n多商户商城 smoke 通过。");
  console.log("已验证：店铺主体、店铺授权、店铺商品、前台店铺列表/主页、跨店购物车、子订单履约、平台结算审核打款、已结算后退款冲抵、运营后台统计/日志/导出。");
}

function resolveResultFile() {
  return path.isAbsolute(resultFile) ? resultFile : path.join(root, resultFile);
}

function markSmokeCheck(key, evidence = {}) {
  smokeChecks[key] = { status: "passed", checkedAt: new Date().toISOString(), evidence };
}

function writeSmokeResult(extra = {}) {
  const passed = requiredSmokeChecks.every((key) => smokeChecks[key]?.status === "passed") && extra.failed !== true;
  const output = {
    passed,
    checkedAt: new Date().toISOString(),
    apiBase: API_BASE,
    tenantCode: TENANT_CODE,
    scenario: SCENARIO,
    checks: smokeChecks,
    ...extra
  };
  const file = resolveResultFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`多商户商城 smoke 结果已写入：${path.relative(root, file) || file}`);
  return output;
}

function assertPublicMallPayloadSafe(label, value) {
  const text = JSON.stringify(value || {});
  for (const key of ["settlementConfig", "paymentMode", "contactName", "contactPhone", "remark", "agent", "config", "providerRefundPayload", "lockedStock"]) {
    assert(!text.includes(`"${key}":`), `${label} 不应向 H5/小程序公开内部字段：${key}`);
  }
  assertPublicMallStockPayloadSafe(label, value);
}

function assertPublicMallStockPayloadSafe(label, value) {
  const visit = (node, path = label) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (Object.prototype.hasOwnProperty.call(node, "stock") && Object.prototype.hasOwnProperty.call(node, "availableStock")) {
      assert(Number(node.stock || 0) === Number(node.availableStock || 0), `${path} 公开 stock 必须等于 availableStock，不能暴露总库存`);
    }
    for (const [key, child] of Object.entries(node)) visit(child, `${path}.${key}`);
  };
  visit(value);
}

function assertPublicMallUserGroupBuyTeamsSafe(label, value) {
  const visit = (node, path = label) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (Array.isArray(node.groupBuyTeams)) {
      node.groupBuyTeams.forEach((team, index) => {
        const text = JSON.stringify(team || {});
        for (const key of ["id", "status", "quantity", "amount", "groupPrice", "paidAt", "refundedAt", "groupBuy"]) {
          assert(!text.includes(`"${key}":`), `${path}.groupBuyTeams[${index}] 不应向用户侧公开拼团内部字段：${key}`);
        }
        assert(Object.prototype.hasOwnProperty.call(team || {}, "remainingPeople"), `${path}.groupBuyTeams[${index}] 应公开 remainingPeople 供用户理解成团缺口`);
      });
    }
    for (const [key, child] of Object.entries(node)) {
      if (key !== "groupBuyTeams") visit(child, `${path}.${key}`);
    }
  };
  visit(value);
}

function assertPublicMallUserPayloadSafe(label, value) {
  assertPublicMallPayloadSafe(label, value);
  assertPublicMallUserGroupBuyTeamsSafe(label, value);
  const text = JSON.stringify(value || {});
  for (const key of ["adminRemark", "transactionNo", "clientOrderKey", "couponSnapshot", "promotionSnapshot", "reviewRemark", "reviewedBy", "reviewedAt", "providerRefundNo", "providerRefundStatus", "providerRefundSyncedAt", "providerRefundFailureReason", "providerRefundRetryCount", "providerRefundNextQueryAt", "receiver", "tenantId", "agentId", "user"]) {
    assert(!text.includes(`"${key}":`), `${label} 不应向用户侧公开后台/支付/身份内部字段：${key}`);
  }
}

function assertPublicMallPaymentMethodsSafe(label, value) {
  assertPublicMallPayloadSafe(label, value);
  const text = JSON.stringify(value || {});
  for (const key of ["issues", "direct", "real", "account", "requiredKeys", "missingKeys", "unreadableFiles", "routeGuardEvidence", "notifyUrl", "refundNotifyUrl"]) {
    assert(!new RegExp(`"${key}"\\s*:`).test(text), `${label} 不应向 H5/小程序公开支付配置诊断字段：${key}`);
  }
  for (const key of ["WECHAT_PAY", "PRIVATE_KEY", "CERT", "API_V3"]) {
    assert(!text.includes(key), `${label} 不应向 H5/小程序公开支付配置敏感字样：${key}`);
  }
}

async function loginAdmin(username) {
  const result = await api("/admin/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password: showcasePassword })
  });
  assert(result.token, `${username} 登录后没有返回 token`);
  return result;
}

async function requireShowcaseTenant(token) {
  const tenants = await api("/admin/tenants", { headers: auth(token) });
  const tenant = tenants.find((item) => item.code === TENANT_CODE);
  assert(tenant, `缺少演示商家 ${TENANT_CODE}，请先执行 npm run seed:online-showcase`);
  return tenant;
}

async function ensureTenant(token, payload) {
  const tenants = await api("/admin/tenants", { headers: auth(token) });
  const existing = tenants.find((item) => item.code === payload.code);
  return existing
    ? api(`/admin/tenants/${existing.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(payload) })
    : api("/admin/tenants", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
}

async function ensureStoreAccounts(token, tenantId) {
  const admins = pickList(await api("/admin/admins?includeSmoke=true&pageSize=300", { headers: auth(token) }));
  const selfOwner = await upsertAdmin(token, admins, tenantId, "showcase_store_owner", "自营店铺运营");
  const agentOwner = await upsertAdmin(token, admins, tenantId, "showcase_agent_owner", "代理店铺运营");
  const selfFinance = await upsertAdmin(token, admins, tenantId, "showcase_store_finance", "自营店铺财务", "finance");
  return { selfOwner, agentOwner, selfFinance };
}

async function upsertAdmin(token, admins, tenantId, username, displayName, role = "operator", permissions = mallOperatorPermissions) {
  const existing = admins.find((item) => item.username === username);
  const payload = { username, password: showcasePassword, role, tenantId, permissions };
  if (existing) {
    const saved = await api(`/admin/admins/${existing.id}`, {
      method: "PATCH",
      headers: auth(token),
      body: JSON.stringify({ role, tenantId, enabled: true, permissions })
    });
    await api(`/admin/admins/${existing.id}/password`, { method: "POST", headers: auth(token), body: JSON.stringify({ password: showcasePassword }) });
    return saved;
  }
  return api("/admin/admins", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
}

async function ensureAgent(token, tenantId) {
  const agents = pickList(await api(`/admin/agents?includeDisabled=true&tenantId=${tenantId}`, { headers: auth(token) }));
  const payload = {
    tenantId,
    name: "七维南城代理",
    region: "重庆市南岸区",
    contactName: "南城代理负责人",
    contactPhone: "13990008882",
    enabled: true,
    settlementConfig: { mode: "commission", rate: 0.12, scenario: SCENARIO }
  };
  const existing = agents.find((item) => item.name === payload.name);
  return existing
    ? api(`/admin/agents/${existing.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(payload) })
    : api("/admin/agents", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
}

async function findMerchantByCode(token, tenantId, code) {
  const merchants = pickList(await api(`/admin/mall/merchants?tenantId=${tenantId}`, { headers: auth(token) }));
  return merchants.find((item) => item.code === code) || null;
}

async function ensureMerchant(token, payload) {
  const merchants = pickList(await api(`/admin/mall/merchants?tenantId=${payload.tenantId}`, { headers: auth(token) }));
  const existing = merchants.find((item) => item.code === payload.code);
  return existing
    ? api(`/admin/mall/merchants/${existing.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(payload) })
    : api("/admin/mall/merchants", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
}

async function ensureMerchantSetupDraft(token, payload) {
  const merchants = pickList(await api(`/admin/mall/merchants?tenantId=${payload.tenantId}`, { headers: auth(token) }));
  const existing = merchants.find((item) => item.code === payload.code);
  if (existing) return existing;
  return api("/admin/mall/merchants", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({ ...payload, status: "disabled", mallEnabled: false })
  });
}

async function ensureMerchantAccess(token, adminId, merchantId, accessRole) {
  return api("/admin/mall/merchant-access", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({ adminId, merchantId, accessRole, enabled: true })
  });
}

async function assertMerchantAccessTenantGuard(token, targetStore) {
  const guardTenant = await ensureTenant(token, {
    code: "qiwai-mall-access-guard",
    name: "多商户授权隔离测试商家",
    region: "重庆市",
    contactName: "授权隔离测试",
    contactPhone: "13990008883",
    enabled: true,
    settings: { mallEnabled: true },
    remark: `demoScenario:${SCENARIO} multi-merchant access tenant guard`
  });
  const admins = pickList(await api("/admin/admins?includeSmoke=true&pageSize=300", { headers: auth(token) }));
  const outsider = await upsertAdmin(token, admins, guardTenant.id, "showcase_cross_tenant_operator", "跨商家误授权测试账号");
  const result = await tryApi("/admin/mall/merchant-access", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({ adminId: outsider.id, merchantId: targetStore.id, accessRole: "manager", enabled: true })
  });
  assert(!result.ok, "其他商家的后台账号不应被授权到当前店铺");
  const message = String(result.error?.message || result.body?.message || "");
  assert(message.includes("不能授权管理") || message.includes("所属商家"), "跨商家店铺授权被拒绝时应返回运营可读原因");
  const lastAccessGuard = await assertLastMerchantAccessDisableGuard(token, admins, targetStore.tenant?.id);
  return { guardTenantId: guardTenant.id, outsiderAdminId: outsider.id, targetStoreId: targetStore.id, lastAccessGuard };
}

async function assertLastMerchantAccessDisableGuard(token, admins, tenantId) {
  assert(tenantId, "最后授权账号保护缺少目标商家 ID");
  const guardOwner = await upsertAdmin(token, admins, tenantId, "showcase_last_access_guard", "店铺最后授权保护测试账号");
  const guardStorePayload = {
    tenantId,
    ownerType: "tenant",
    code: "qiwai-last-access-guard",
    name: "最后授权账号保护店铺",
    status: "active",
    mallEnabled: true,
    productAuditRequired: true,
    paymentMode: "platform_collect",
    region: "重庆市铜梁区",
    contactName: "授权保护测试",
    contactPhone: "13990008886",
    notice: "用于验证开放店铺不能停用最后一个授权后台账号。",
    remark: `demoScenario:${SCENARIO} last merchant access guard`
  };
  const guardStoreDraft = await ensureMerchant(token, { ...guardStorePayload, status: "disabled", mallEnabled: false });
  const access = await ensureMerchantAccess(token, guardOwner.id, guardStoreDraft.id, "manager");
  const guardStore = await ensureMerchant(token, guardStorePayload);
  const disabled = await tryApi(`/admin/mall/merchant-access/${access.id}`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({ adminId: guardOwner.id, merchantId: guardStore.id, accessRole: "manager", enabled: false })
  });
  assert(!disabled.ok, "开放店铺不应允许停用最后一个授权后台账号");
  const blockedMessage = String(disabled.error?.message || disabled.body?.message || "");
  assert(blockedMessage.includes("不能停用最后一个授权后台账号"), "停用最后一个店铺授权账号被拒绝时应返回运营可读原因");
  await ensureMerchant(token, { ...guardStorePayload, status: "disabled", mallEnabled: false, notice: "最后授权账号保护验证完成，已关闭展示。" });
  return { guardStoreId: guardStore.id, accessId: access.id, blockedMessage };
}

async function assertMerchantOpenGuard(token, tenantId, managerAdminId) {
  const guardCode = `qiwai-open-guard-${Date.now()}`;
  const payload = {
    tenantId,
    ownerType: "tenant",
    code: guardCode,
    name: "店铺开通授权保护",
    status: "disabled",
    mallEnabled: false,
    productAuditRequired: true,
    paymentMode: "platform_collect",
    region: "重庆市铜梁区",
    contactName: "开通保护测试",
    contactPhone: "13990008887",
    notice: "用于验证没有授权后台账号时不能开放商城。",
    remark: `demoScenario:${SCENARIO} merchant open guard`
  };
  const guardStore = await api("/admin/mall/merchants", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify(payload)
  });
  const blocked = await tryApi(`/admin/mall/merchants/${guardStore.id}`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({ ...payload, status: "active", mallEnabled: true })
  });
  assert(!blocked.ok, "没有授权后台账号的店铺不应允许直接开通商城");
  const blockedMessage = String(blocked.error?.message || blocked.body?.message || "");
  assert(blockedMessage.includes("授权后台账号") && blockedMessage.includes("不能开通商城"), "无授权账号开店被拒绝时应返回运营可读原因");
  const latestBeforeAccess = await findMerchantByCode(token, tenantId, guardCode);
  assert(latestBeforeAccess?.status !== "active" || latestBeforeAccess.mallEnabled === false, "开通被拒绝后，店铺不应进入开放状态");
  await ensureMerchantAccess(token, managerAdminId, guardStore.id, "manager");
  const opened = await api(`/admin/mall/merchants/${guardStore.id}`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({ ...payload, status: "active", mallEnabled: true })
  });
  assert(opened.status === "active" && opened.mallEnabled !== false, "配置授权后台账号后，平台代收店铺应允许开通商城");
  const publicStores = pickList(await api(`/public/mall/merchants?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() }));
  assert(!publicStores.some((item) => item.id === guardStore.id), "没有已上架商品的开放店铺不应出现在前台商城店铺列表");
  const directDetail = await tryApi(`/public/mall/merchants/${guardStore.id}?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() });
  assert(!directDetail.ok && String(directDetail.error?.message || "").includes("暂无已上架商品"), "没有已上架商品的开放店铺不应通过前台店铺直链展示");
  const directProducts = await tryApi(`/public/mall/products?tenantCode=${TENANT_CODE}&merchantId=${guardStore.id}`, { headers: tenantHeader() });
  assert(!directProducts.ok && String(directProducts.error?.message || "").includes("暂无已上架商品"), "没有已上架商品的开放店铺不应通过前台店铺商品流展示");
  await api(`/admin/mall/merchants/${guardStore.id}`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({ ...payload, status: "disabled", mallEnabled: false, notice: "店铺开通授权保护验证完成，已关闭展示。" })
  });
  return { guardStoreId: guardStore.id, blockedMessage, opened: true };
}

async function assertCartMerchantAvailabilityGuard(token, userToken, tenantId, managerAdminId) {
  const guardCode = `qiwai-cart-availability-${Date.now()}`;
  const payload = {
    tenantId,
    ownerType: "tenant",
    code: guardCode,
    name: "购物车店铺状态保护",
    status: "disabled",
    mallEnabled: false,
    productAuditRequired: false,
    paymentMode: "platform_collect",
    region: "重庆市铜梁区",
    contactName: "购物车保护测试",
    contactPhone: "13990008888",
    notice: "用于验证停用店铺商品不能继续加购或结算。",
    remark: `demoScenario:${SCENARIO} cart merchant availability guard`
  };
  const draft = await api("/admin/mall/merchants", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify(payload)
  });
  await ensureMerchantAccess(token, managerAdminId, draft.id, "manager");
  const guardStore = await api(`/admin/mall/merchants/${draft.id}`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({ ...payload, status: "active", mallEnabled: true })
  });
  const guardProduct = await ensureStoreProduct(token, guardStore, "【多商户】购物车停用保护商品", "购物车保护", 19, 29, 33);
  const sku = guardProduct.skus?.find((item) => Number(item.stock || 0) - Number(item.lockedStock || 0) > 0);
  assert(sku?.id, "购物车保护商品缺少可售 SKU");
  const cartItem = await api(`/public/me/mall/cart?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify({ skuId: sku.id, quantity: 1 })
  });
  assert(cartItem.id && cartItem.purchasable !== false, "开放店铺商品应允许加入购物车");
  await api(`/admin/mall/merchants/${guardStore.id}`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({ ...payload, status: "disabled", mallEnabled: false, notice: "购物车店铺状态保护验证完成，已关闭展示。" })
  });
  const cartRows = pickList(await api(`/public/me/mall/cart?tenantCode=${TENANT_CODE}`, { headers: userAuth(userToken) }));
  const staleCart = cartRows.find((item) => item.id === cartItem.id);
  assert(staleCart && staleCart.purchasable === false, "店铺停用后，已有购物车项应标记为不可购买");
  const unavailableReason = String(staleCart.unavailableReason || "");
  assert(unavailableReason.includes("店铺暂未开放"), "店铺停用后的购物车项应返回用户可读原因");
  const updateResult = await tryApi(`/public/me/mall/cart/${cartItem.id}?tenantCode=${TENANT_CODE}`, {
    method: "PATCH",
    headers: userAuth(userToken),
    body: JSON.stringify({ quantity: 2 })
  });
  assert(!updateResult.ok && String(updateResult.error?.message || "").includes("店铺暂未开放"), "店铺停用后不应允许调整购物车数量继续结算");
  const addAgain = await tryApi(`/public/me/mall/cart?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify({ skuId: sku.id, quantity: 1 })
  });
  assert(!addAgain.ok && String(addAgain.error?.message || "").includes("店铺暂未开放"), "店铺停用后不应允许继续加购该店铺商品");
  await api(`/public/me/mall/cart/${cartItem.id}?tenantCode=${TENANT_CODE}`, { method: "DELETE", headers: userAuth(userToken) });
  return { guardStoreId: guardStore.id, productId: guardProduct.id, cartItemId: cartItem.id, unavailableReason };
}

async function assertFavoriteBrowseMerchantAvailabilityGuard(token, userToken, tenantId, managerAdminId) {
  const guardCode = `qiwai-favorite-browse-${Date.now()}`;
  const payload = {
    tenantId,
    ownerType: "tenant",
    code: guardCode,
    name: "收藏足迹店铺状态保护",
    status: "disabled",
    mallEnabled: false,
    productAuditRequired: false,
    paymentMode: "platform_collect",
    region: "重庆市铜梁区",
    contactName: "收藏足迹保护测试",
    contactPhone: "13990008889",
    notice: "用于验证停用店铺商品不能继续通过收藏、足迹或详情访问。",
    remark: `demoScenario:${SCENARIO} favorite browse merchant availability guard`
  };
  const draft = await api("/admin/mall/merchants", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify(payload)
  });
  await ensureMerchantAccess(token, managerAdminId, draft.id, "manager");
  const guardStore = await api(`/admin/mall/merchants/${draft.id}`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({ ...payload, status: "active", mallEnabled: true })
  });
  const guardProduct = await ensureStoreProduct(token, guardStore, "【多商户】收藏足迹停用保护商品", "收藏足迹保护", 23, 39, 34);
  const detailBefore = await api(`/public/mall/products/${guardProduct.id}?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() });
  assert(detailBefore.id === guardProduct.id, "开放店铺商品详情应可访问");
  await api(`/public/me/mall/products/${guardProduct.id}/favorite?tenantCode=${TENANT_CODE}`, { method: "POST", headers: userAuth(userToken) });
  await api(`/public/me/mall/products/${guardProduct.id}/browse?tenantCode=${TENANT_CODE}`, { method: "POST", headers: userAuth(userToken) });
  const [favoritesBefore, historiesBefore] = await Promise.all([
    api(`/public/me/mall/favorites?tenantCode=${TENANT_CODE}`, { headers: userAuth(userToken) }),
    api(`/public/me/mall/browse-histories?tenantCode=${TENANT_CODE}`, { headers: userAuth(userToken) })
  ]);
  assert(pickList(favoritesBefore).some((item) => item.product?.id === guardProduct.id), "开放店铺商品应出现在用户商城收藏");
  assert(pickList(historiesBefore).some((item) => item.product?.id === guardProduct.id), "开放店铺商品应出现在用户浏览足迹");
  await api(`/admin/mall/merchants/${guardStore.id}`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({ ...payload, status: "disabled", mallEnabled: false, notice: "收藏足迹店铺状态保护验证完成，已关闭展示。" })
  });
  const [detailAfter, reviewsAfter, favoriteAgain, browseAgain, favoriteStatus, favoritesAfter, historiesAfter] = await Promise.all([
    tryApi(`/public/mall/products/${guardProduct.id}?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() }),
    tryApi(`/public/mall/products/${guardProduct.id}/reviews?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() }),
    tryApi(`/public/me/mall/products/${guardProduct.id}/favorite?tenantCode=${TENANT_CODE}`, { method: "POST", headers: userAuth(userToken) }),
    tryApi(`/public/me/mall/products/${guardProduct.id}/browse?tenantCode=${TENANT_CODE}`, { method: "POST", headers: userAuth(userToken) }),
    api(`/public/me/mall/products/${guardProduct.id}/favorite?tenantCode=${TENANT_CODE}`, { headers: userAuth(userToken) }),
    api(`/public/me/mall/favorites?tenantCode=${TENANT_CODE}`, { headers: userAuth(userToken) }),
    api(`/public/me/mall/browse-histories?tenantCode=${TENANT_CODE}`, { headers: userAuth(userToken) })
  ]);
  const blockedMessage = String(detailAfter.error?.message || detailAfter.body?.message || "");
  assert(!detailAfter.ok && blockedMessage.includes("店铺未开放"), "店铺停用后，商品详情直链不应继续展示");
  assert(!reviewsAfter.ok && String(reviewsAfter.error?.message || reviewsAfter.body?.message || "").includes("店铺未开放"), "店铺停用后，商品评价直链不应继续展示");
  assert(!favoriteAgain.ok && String(favoriteAgain.error?.message || favoriteAgain.body?.message || "").includes("店铺未开放"), "店铺停用后不应允许继续收藏该店铺商品");
  assert(!browseAgain.ok && String(browseAgain.error?.message || browseAgain.body?.message || "").includes("店铺未开放"), "店铺停用后不应允许继续记录该店铺商品浏览足迹");
  assert(favoriteStatus.favorited === false && !favoriteStatus.favoriteId, "店铺停用后收藏状态接口不应继续暴露旧收藏");
  assert(!pickList(favoritesAfter).some((item) => item.product?.id === guardProduct.id), "店铺停用后，用户商城收藏列表不应继续暴露该商品");
  assert(!pickList(historiesAfter).some((item) => item.product?.id === guardProduct.id), "店铺停用后，用户浏览足迹列表不应继续暴露该商品");
  assertPublicMallUserPayloadSafe("店铺停用后的用户商城收藏", favoritesAfter);
  assertPublicMallUserPayloadSafe("店铺停用后的用户浏览足迹", historiesAfter);
  return { guardStoreId: guardStore.id, productId: guardProduct.id, blockedMessage };
}

async function assertProductSkuAvailabilityGuard(token, userToken, tenantId, managerAdminId) {
  const guardCode = `qiwai-product-sku-${Date.now()}`;
  const payload = {
    tenantId,
    ownerType: "tenant",
    code: guardCode,
    name: "商品规格可售保护",
    status: "disabled",
    mallEnabled: false,
    productAuditRequired: false,
    paymentMode: "platform_collect",
    region: "重庆市铜梁区",
    contactName: "规格保护测试",
    contactPhone: "13990008890",
    notice: "用于验证商品所有 SKU 停用后不再通过详情、评价、收藏或足迹继续暴露。",
    remark: `demoScenario:${SCENARIO} product sku availability guard`
  };
  const draft = await api("/admin/mall/merchants", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify(payload)
  });
  await ensureMerchantAccess(token, managerAdminId, draft.id, "manager");
  const guardStore = await api(`/admin/mall/merchants/${draft.id}`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({ ...payload, status: "active", mallEnabled: true })
  });
  const guardProduct = await ensureStoreProduct(token, guardStore, "【多商户】商品规格停用保护商品", "规格停用保护", 25, 45, 35);
  const detailBefore = await api(`/public/mall/products/${guardProduct.id}?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() });
  assert(detailBefore.id === guardProduct.id && pickList(detailBefore.skus).length > 0, "有启用 SKU 的商品详情应可访问");
  await api(`/public/me/mall/products/${guardProduct.id}/favorite?tenantCode=${TENANT_CODE}`, { method: "POST", headers: userAuth(userToken) });
  await api(`/public/me/mall/products/${guardProduct.id}/browse?tenantCode=${TENANT_CODE}`, { method: "POST", headers: userAuth(userToken) });
  const [favoritesBefore, historiesBefore] = await Promise.all([
    api(`/public/me/mall/favorites?tenantCode=${TENANT_CODE}`, { headers: userAuth(userToken) }),
    api(`/public/me/mall/browse-histories?tenantCode=${TENANT_CODE}`, { headers: userAuth(userToken) })
  ]);
  assert(pickList(favoritesBefore).some((item) => item.product?.id === guardProduct.id), "有启用 SKU 的商品应出现在用户商城收藏");
  assert(pickList(historiesBefore).some((item) => item.product?.id === guardProduct.id), "有启用 SKU 的商品应出现在用户浏览足迹");

  await api(`/admin/mall/products/${guardProduct.id}`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({
      merchantId: guardStore.id,
      categoryId: guardProduct.category?.id,
      title: guardProduct.title,
      coverUrl: guardProduct.coverUrl,
      description: guardProduct.description,
      brandName: guardProduct.brandName,
      price: guardProduct.price,
      originalPrice: guardProduct.originalPrice,
      status: "published",
      featured: guardProduct.featured,
      sortOrder: guardProduct.sortOrder,
      deliveryNote: guardProduct.deliveryNote,
      afterSaleNote: guardProduct.afterSaleNote,
      skus: guardProduct.skus.map((item) => ({
        id: item.id,
        name: item.name,
        skuCode: item.skuCode,
        price: item.price,
        originalPrice: item.originalPrice,
        stock: item.stock,
        enabled: false,
        sortOrder: item.sortOrder
      }))
    })
  });

  const [detailAfter, reviewsAfter, favoriteAgain, browseAgain, favoriteStatus, favoritesAfter, historiesAfter, productFeedAfter] = await Promise.all([
    tryApi(`/public/mall/products/${guardProduct.id}?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() }),
    tryApi(`/public/mall/products/${guardProduct.id}/reviews?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() }),
    tryApi(`/public/me/mall/products/${guardProduct.id}/favorite?tenantCode=${TENANT_CODE}`, { method: "POST", headers: userAuth(userToken) }),
    tryApi(`/public/me/mall/products/${guardProduct.id}/browse?tenantCode=${TENANT_CODE}`, { method: "POST", headers: userAuth(userToken) }),
    api(`/public/me/mall/products/${guardProduct.id}/favorite?tenantCode=${TENANT_CODE}`, { headers: userAuth(userToken) }),
    api(`/public/me/mall/favorites?tenantCode=${TENANT_CODE}`, { headers: userAuth(userToken) }),
    api(`/public/me/mall/browse-histories?tenantCode=${TENANT_CODE}`, { headers: userAuth(userToken) }),
    tryApi(`/public/mall/products?tenantCode=${TENANT_CODE}&merchantId=${guardStore.id}&pageSize=20`, { headers: tenantHeader() })
  ]);
  const blockedMessage = String(detailAfter.error?.message || detailAfter.body?.message || "");
  assert(!detailAfter.ok && blockedMessage.includes("可售规格"), "SKU 全部停用后，商品详情直链应返回可售规格提示");
  assert(!reviewsAfter.ok && String(reviewsAfter.error?.message || reviewsAfter.body?.message || "").includes("可售规格"), "SKU 全部停用后，商品评价直链不应继续展示");
  assert(!favoriteAgain.ok && String(favoriteAgain.error?.message || favoriteAgain.body?.message || "").includes("可售规格"), "SKU 全部停用后不应允许继续收藏该商品");
  assert(!browseAgain.ok && String(browseAgain.error?.message || browseAgain.body?.message || "").includes("可售规格"), "SKU 全部停用后不应允许继续记录该商品浏览足迹");
  assert(favoriteStatus.favorited === false && !favoriteStatus.favoriteId, "SKU 全部停用后收藏状态接口不应继续暴露旧收藏");
  assert(!pickList(favoritesAfter).some((item) => item.product?.id === guardProduct.id), "SKU 全部停用后，用户商城收藏列表不应继续暴露该商品");
  assert(!pickList(historiesAfter).some((item) => item.product?.id === guardProduct.id), "SKU 全部停用后，用户浏览足迹列表不应继续暴露该商品");
  if (productFeedAfter.ok) {
    assert(!pickList(productFeedAfter.body).some((item) => item.id === guardProduct.id), "SKU 全部停用后，前台商品流不应继续展示该商品");
  } else {
    const feedBlockedMessage = String(productFeedAfter.error?.message || productFeedAfter.body?.message || "");
    assert(feedBlockedMessage.includes("暂无已上架商品") || feedBlockedMessage.includes("可售规格"), "SKU 全部停用后，前台商品流应返回空店铺或可售规格提示");
  }
  assertPublicMallUserPayloadSafe("SKU 全部停用后的用户商城收藏", favoritesAfter);
  assertPublicMallUserPayloadSafe("SKU 全部停用后的用户浏览足迹", historiesAfter);
  assertPublicMallPayloadSafe("SKU 全部停用后的前台商品流", productFeedAfter);
  return { guardStoreId: guardStore.id, productId: guardProduct.id, disabledSkuCount: guardProduct.skus.length, blockedMessage };
}

async function assertCategoryMerchantAvailabilityGuard(token, tenantId, managerAdminId) {
  const guardCode = `qiwai-category-guard-${Date.now()}`;
  const payload = {
    tenantId,
    ownerType: "tenant",
    code: guardCode,
    name: "分类入口店铺状态保护",
    status: "disabled",
    mallEnabled: false,
    productAuditRequired: false,
    paymentMode: "platform_collect",
    region: "重庆市铜梁区",
    contactName: "分类保护测试",
    contactPhone: "13990008883",
    notice: "用于验证停用店铺的商城分类不会继续出现在首页。",
    remark: `demoScenario:${SCENARIO} category merchant availability guard`
  };
  const draft = await api("/admin/mall/merchants", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify(payload)
  });
  await ensureMerchantAccess(token, managerAdminId, draft.id, "manager");
  const guardStore = await api(`/admin/mall/merchants/${draft.id}`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({ ...payload, status: "active", mallEnabled: true })
  });
  const emptyCategory = await api("/admin/mall/categories", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({ merchantId: guardStore.id, name: "分类空类目保护", sortOrder: 1, enabled: true })
  });
  const disabledSkuCategory = await api("/admin/mall/categories", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({ merchantId: guardStore.id, name: "分类无启用规格保护", sortOrder: 2, enabled: true })
  });
  const disabledSkuProduct = await api("/admin/mall/products", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({
      merchantId: guardStore.id,
      categoryId: disabledSkuCategory.id,
      title: "【多商户】无启用规格保护商品",
      coverUrl: cover(35),
      description: "用于验证已上架但无启用 SKU 的商品不会出现在前台商城。",
      brandName: "书院自营",
      price: 31,
      originalPrice: 51,
      status: "published",
      featured: true,
      sortOrder: 35,
      deliveryNote: "无启用 SKU 时不应公开展示。",
      afterSaleNote: "无启用 SKU 时不可下单。",
      skus: [{ name: "停用规格", price: 31, originalPrice: 51, stock: 100, enabled: false }]
    })
  });
  const guardProduct = await ensureStoreProduct(token, guardStore, "【多商户】分类停用保护商品", "分类状态保护", 29, 49, 33);
  const categoryId = guardProduct.category?.id;
  assert(categoryId, "分类店铺状态保护缺少商品分类");

  const [allBefore, storeBefore, disabledSkuProducts, disabledSkuDetail] = await Promise.all([
    api(`/public/mall/categories?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() }),
    api(`/public/mall/categories?tenantCode=${TENANT_CODE}&merchantId=${guardStore.id}`, { headers: tenantHeader() }),
    api(`/public/mall/products?tenantCode=${TENANT_CODE}&merchantId=${guardStore.id}&categoryId=${disabledSkuCategory.id}`, { headers: tenantHeader() }),
    tryApi(`/public/mall/products/${disabledSkuProduct.id}?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() })
  ]);
  assert(pickList(allBefore).some((item) => item.id === categoryId), "开放店铺分类应出现在商城首页分类入口");
  assert(pickList(storeBefore).some((item) => item.id === categoryId), "开放店铺分类应出现在店铺主页分类入口");
  assert(!pickList(allBefore).some((item) => item.id === emptyCategory.id), "没有已上架商品的店铺分类不应出现在商城首页分类入口");
  assert(!pickList(storeBefore).some((item) => item.id === emptyCategory.id), "没有已上架商品的店铺分类不应出现在店铺主页分类入口");
  assert(!pickList(allBefore).some((item) => item.id === disabledSkuCategory.id), "没有启用 SKU 的店铺分类不应出现在商城首页分类入口");
  assert(!pickList(storeBefore).some((item) => item.id === disabledSkuCategory.id), "没有启用 SKU 的店铺分类不应出现在店铺主页分类入口");
  assert(!pickList(disabledSkuProducts).some((item) => item.id === disabledSkuProduct.id), "没有启用 SKU 的商品不应出现在前台商品流");
  assert(!disabledSkuDetail.ok && String(disabledSkuDetail.error?.message || disabledSkuDetail.body?.message || "").includes("可售规格"), "没有启用 SKU 的商品详情直链应返回可售规格提示");

  await api(`/admin/mall/merchants/${guardStore.id}`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({ ...payload, status: "disabled", mallEnabled: false, notice: "分类入口店铺状态保护验证完成，已关闭展示。" })
  });
  const [allAfter, storeAfter] = await Promise.all([
    api(`/public/mall/categories?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() }),
    tryApi(`/public/mall/categories?tenantCode=${TENANT_CODE}&merchantId=${guardStore.id}`, { headers: tenantHeader() })
  ]);
  const blockedMessage = String(storeAfter.error?.message || storeAfter.body?.message || "");
  assert(!pickList(allAfter).some((item) => item.id === categoryId), "店铺停用后，商城首页分类入口不应继续展示该店铺分类");
  assert(!storeAfter.ok && blockedMessage.includes("未开通商城"), "店铺停用后，店铺分类直链应返回运营可读的未开通提示");
  return { guardStoreId: guardStore.id, categoryId, emptyCategoryId: emptyCategory.id, disabledSkuCategoryId: disabledSkuCategory.id, disabledSkuProductId: disabledSkuProduct.id, productId: guardProduct.id, blockedMessage };
}

async function assertDisabledMerchantOperationGuard(token, tenantId) {
  const admins = pickList(await api("/admin/admins?includeSmoke=true&pageSize=300", { headers: auth(token) }));
  const disabledOwner = await upsertAdmin(token, admins, tenantId, "showcase_disabled_store_owner", "停用店铺运营测试账号");
  const disabledStore = await ensureMerchant(token, {
    tenantId,
    ownerType: "tenant",
    code: "qiwai-showcase-disabled-store",
    name: "停用店铺运营保护",
    status: "disabled",
    mallEnabled: false,
    productAuditRequired: true,
    paymentMode: "platform_collect",
    region: "重庆市铜梁区",
    contactName: "停用店铺测试",
    contactPhone: "13990008884",
    notice: "用于验证停用店铺不能继续写入商城运营内容。",
    remark: `demoScenario:${SCENARIO} disabled merchant operation guard`
  });
  await ensureMerchantAccess(token, disabledOwner.id, disabledStore.id, "manager");
  const disabledLogin = await loginAdmin("showcase_disabled_store_owner");
  const implicitWrite = await tryApi("/admin/mall/categories", {
    method: "POST",
    headers: auth(disabledLogin.token),
    body: JSON.stringify({ name: "停用店铺不应新增分类", sortOrder: 1, enabled: true })
  });
  assert(!implicitWrite.ok, "停用店铺授权账号不应通过唯一店铺自动选择继续写入运营内容");
  const message = String(implicitWrite.error?.message || implicitWrite.error || "");
  assert(message.includes("当前店铺未开通商城") || message.includes("启用"), "停用店铺写入被拒绝时应返回运营可读原因");
  const publicStores = pickList(await api(`/public/mall/merchants?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() }));
  assert(!publicStores.some((item) => item.id === disabledStore.id), "停用店铺不应出现在前台商城店铺列表");
  return { disabledStoreId: disabledStore.id, disabledOwnerId: disabledOwner.id, blockedMessage: message };
}

async function assertMerchantDirectOpenGuard(token, tenantId, managerAdminId) {
  const guardCode = `qiwai-direct-open-guard-${Date.now()}`;
  const guardStore = await api("/admin/mall/merchants", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({
      tenantId,
      ownerType: "tenant",
      code: guardCode,
      name: "商户直收开通保护",
      status: "disabled",
      mallEnabled: false,
      productAuditRequired: true,
      paymentMode: "merchant_direct",
      region: "重庆市铜梁区",
      contactName: "直收保护测试",
      contactPhone: "13990008885",
      notice: "用于验证商户直收无启用收款账户时不能开放商城。",
      remark: `demoScenario:${SCENARIO} merchant direct open guard`
    })
  });
  await ensureMerchantAccess(token, managerAdminId, guardStore.id, "manager");
  const result = await tryApi(`/admin/mall/merchants/${guardStore.id}`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({
      tenantId,
      ownerType: "tenant",
      code: guardCode,
      name: "商户直收开通保护",
      status: "active",
      mallEnabled: true,
      productAuditRequired: true,
      paymentMode: "merchant_direct",
      region: "重庆市铜梁区",
      contactName: "直收保护测试",
      contactPhone: "13990008885",
      notice: "用于验证商户直收无启用收款账户时不能开放商城。",
      remark: `demoScenario:${SCENARIO} merchant direct open guard`
    })
  });
  assert(!result.ok, "无启用收款账户的商户直收店铺不应允许开放商城");
  const message = String(result.error?.message || result.body?.message || "");
  assert(message.includes("商户直收店铺必须先") && message.includes("收款账户"), "商户直收开放被拒绝时应返回运营可读原因");
  const alipayConfig = demoAlipayPaymentConfig(guardStore);
  const alipayAccount = await api("/admin/mall/merchant-payment-accounts", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({
      merchantId: guardStore.id,
      provider: "alipay",
      merchantName: `${guardStore.name}支付宝商户`,
      merchantNo: `ALI${guardStore.id}`,
      enabled: true,
      config: alipayConfig
    })
  });
  assert(alipayAccount.id, "未开放店铺应允许先配置启用的支付宝预留账户");
  const alipayOnlyOpen = await tryApi(`/admin/mall/merchants/${guardStore.id}`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({
      tenantId,
      ownerType: "tenant",
      code: guardCode,
      name: "商户直收开通保护",
      status: "active",
      mallEnabled: true,
      productAuditRequired: true,
      paymentMode: "merchant_direct",
      region: "重庆市铜梁区",
      contactName: "直收保护测试",
      contactPhone: "13990008885",
      notice: "用于验证商户直收仅配置支付宝预留账户时不能开放商城。",
      remark: `demoScenario:${SCENARIO} merchant direct open guard`
    })
  });
  assert(!alipayOnlyOpen.ok, "仅配置支付宝账户的商户直收店铺不应允许开放商城");
  const alipayOnlyMessage = String(alipayOnlyOpen.error?.message || alipayOnlyOpen.body?.message || "");
  assert(alipayOnlyMessage.includes("完整的微信支付收款账户"), "商户直收仅有支付宝账户时应提示先配置微信支付收款账户");
  const config = demoWechatPaymentConfig(guardStore);
  const account = await api("/admin/mall/merchant-payment-accounts", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify({
      merchantId: guardStore.id,
      provider: "wechat",
      merchantName: `${guardStore.name}微信商户`,
      merchantNo: config.WECHAT_PAY_MCH_ID,
      enabled: true,
      config
    })
  });
  assert(account.id, "未开放店铺应允许先配置启用的店铺收款账户");
  const readiness = await api(`/admin/mall/payment-readiness?merchantId=${guardStore.id}`, { headers: auth(token) });
  assert(readiness.collectionMode === "merchant_direct", "未开放商户直收店铺应允许查看支付就绪状态");
  assert(readiness.direct?.account?.id === account.id, "未开放店铺支付就绪状态应识别已配置的收款账户");
  const opened = await api(`/admin/mall/merchants/${guardStore.id}`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({
      tenantId,
      ownerType: "tenant",
      code: guardCode,
      name: "商户直收开通保护",
      status: "active",
      mallEnabled: true,
      productAuditRequired: true,
      paymentMode: "merchant_direct",
      region: "重庆市铜梁区",
      contactName: "直收保护测试",
      contactPhone: "13990008885",
      notice: "用于验证商户直收配置启用收款账户后才能开放商城。",
      remark: `demoScenario:${SCENARIO} merchant direct open guard`
    })
  });
  assert(opened.status === "active" && opened.mallEnabled !== false, "配置启用收款账户后，商户直收店铺应允许开放商城");
  return { guardStoreId: guardStore.id, paymentAccountId: account.id, alipayAccountId: alipayAccount.id, blockedMessage: message, opened: true };
}

async function assertPaymentModeSwitchGuard(token, tenantId, merchant, completedOrder) {
  assert(merchant.paymentMode === "merchant_direct", "收款模式切换保护需要使用已开通商户直收的代理店铺");
  const result = await tryApi(`/admin/mall/merchants/${merchant.id}`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({
      tenantId,
      agentId: merchant.agent?.id,
      ownerType: merchant.ownerType || "agent",
      code: merchant.code,
      name: merchant.name,
      status: merchant.status || "active",
      mallEnabled: merchant.mallEnabled !== false,
      productAuditRequired: merchant.productAuditRequired !== false,
      paymentMode: "platform_collect",
      region: merchant.region,
      contactName: merchant.contactName,
      contactPhone: merchant.contactPhone,
      notice: merchant.notice,
      remark: `demoScenario:${SCENARIO} payment mode switch guard`
    })
  });
  assert(!result.ok, "已有未结算经营数据的店铺不应允许切换收款模式");
  const message = String(result.error?.message || result.body?.message || "");
  assert(message.includes("暂不能") && message.includes("收款模式") && (message.includes("订单") || message.includes("结算")), "收款模式切换被拒绝时应返回运营可读原因");
  const latest = await findMerchantByCode(token, tenantId, merchant.code);
  assert(latest?.paymentMode === merchant.paymentMode, "收款模式切换被拒绝后，店铺原收款模式应保持不变");
  return {
    merchantId: merchant.id,
    orderNo: completedOrder.orderNo,
    from: merchant.paymentMode,
    attempted: "platform_collect",
    blockedMessage: message
  };
}

async function assertMerchantCloseGuard(token, tenantId, merchant, completedOrder) {
  const result = await tryApi(`/admin/mall/merchants/${merchant.id}`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({
      tenantId,
      agentId: merchant.agent?.id,
      ownerType: merchant.ownerType || "agent",
      code: merchant.code,
      name: merchant.name,
      status: "disabled",
      mallEnabled: false,
      productAuditRequired: merchant.productAuditRequired !== false,
      paymentMode: merchant.paymentMode,
      region: merchant.region,
      contactName: merchant.contactName,
      contactPhone: merchant.contactPhone,
      notice: merchant.notice,
      remark: `demoScenario:${SCENARIO} merchant close guard`
    })
  });
  assert(!result.ok, "已有未结算经营数据的店铺不应允许关闭商城或停用店铺");
  const message = String(result.error?.message || result.body?.message || "");
  assert(message.includes("暂不能关闭商城") && (message.includes("订单") || message.includes("结算")), "关闭店铺被拒绝时应返回运营可读原因");
  const latest = await findMerchantByCode(token, tenantId, merchant.code);
  assert(latest?.status === "active" && latest.mallEnabled !== false, "关闭店铺被拒绝后，店铺应继续保持开放状态");
  return {
    merchantId: merchant.id,
    orderNo: completedOrder.orderNo,
    attemptedStatus: "disabled",
    blockedMessage: message
  };
}

async function assertMerchantOperationReadiness(platformToken, selfToken, selfStore, agentStore) {
  const platformRows = pickList(await api(`/admin/mall/merchants?merchantId=${selfStore.id}`, { headers: auth(platformToken) }));
  const selfRow = platformRows.find((item) => item.id === selfStore.id);
  assert(selfRow?.operationSummary, "平台店铺列表应返回店铺上线运营摘要 operationSummary");
  assert(Number(selfRow.operationSummary.productCount || 0) >= 1, "店铺上线摘要应统计商品总数");
  assert(Number(selfRow.operationSummary.publishedProductCount || 0) >= 1, "店铺上线摘要应统计已上架商品数");
  assert(Number(selfRow.operationSummary.enabledAccessCount || 0) >= 1, "店铺上线摘要应统计已启用授权账号数");
  assert(String(selfRow.operationSummary.received30dAmount || "").includes("."), "店铺上线摘要应返回 30 天收款金额");

  const selfRows = pickList(await api("/admin/mall/accessible-merchants", { headers: auth(selfToken) }));
  assert(selfRows.some((item) => item.id === selfStore.id && item.operationSummary), "店铺账号应能看到自己店铺的上线运营摘要");
  assert(!selfRows.some((item) => item.id === agentStore.id), "店铺账号不应看到未授权代理店铺的上线运营摘要");
  return {
    selfStoreId: selfStore.id,
    productCount: Number(selfRow.operationSummary.productCount || 0),
    publishedProductCount: Number(selfRow.operationSummary.publishedProductCount || 0),
    enabledAccessCount: Number(selfRow.operationSummary.enabledAccessCount || 0)
  };
}

async function ensureStoreProduct(token, merchant, title, categoryName, price, originalPrice, coverSeed) {
  const categories = pickList(await api(`/admin/mall/categories?merchantId=${merchant.id}`, { headers: auth(token) }));
  const categoryPayload = { merchantId: merchant.id, name: categoryName, sortOrder: 1, enabled: true };
  const existingCategory = categories.find((item) => item.name === categoryName);
  const category = existingCategory
    ? await api(`/admin/mall/categories/${existingCategory.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(categoryPayload) })
    : await api("/admin/mall/categories", { method: "POST", headers: auth(token), body: JSON.stringify(categoryPayload) });

  const products = pickList(await api(`/admin/mall/products?merchantId=${merchant.id}&pageSize=100`, { headers: auth(token) }));
  const existingProduct = products.find((item) => item.title === title);
  const payload = {
    merchantId: merchant.id,
    categoryId: category.id,
    title,
    coverUrl: cover(coverSeed),
    description: `${merchant.name} 多商户验收商品：用于验证店铺独立发布、前台按店铺展示、跨店购物车拆单。`,
    brandName: merchant.ownerType === "agent" ? "代理严选" : "书院自营",
    price,
    originalPrice,
    status: "published",
    featured: true,
    sortOrder: coverSeed,
    deliveryNote: "多商户验收商品，后台按店铺独立发货。",
    afterSaleNote: "售后按子订单和店铺独立处理。",
    skus: [
      { name: "标准款", price, originalPrice, stock: 200, enabled: true },
      { name: "礼盒款", price: price + 18, originalPrice: originalPrice + 20, stock: 120, enabled: true }
    ]
  };
  if (existingProduct) {
    return api(`/admin/mall/products/${existingProduct.id}`, {
      method: "PATCH",
      headers: auth(token),
      body: JSON.stringify({ ...payload, skus: payload.skus.map((sku, index) => ({ ...sku, id: existingProduct.skus?.[index]?.id })) })
    });
  }
  return api("/admin/mall/products", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
}

async function ensureStoreCoupon(token, merchant, name) {
  const code = `MMAGENT${merchant.id}`;
  const coupons = pickList(await api(`/admin/mall/coupons?merchantId=${merchant.id}`, { headers: auth(token) }));
  const existing = coupons.find((item) => item.code === code);
  const payload = {
    merchantId: merchant.id,
    code,
    name,
    minAmount: 20,
    discountAmount: 8,
    scope: "all",
    usageLimit: 0,
    perUserLimit: 0,
    enabled: true,
    startsAt: null,
    endsAt: null
  };
  return existing
    ? api(`/admin/mall/coupons/${existing.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(payload) })
    : api("/admin/mall/coupons", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
}

async function ensureStorePromotionCode(token, merchant, agent) {
  const code = `MMAGENTPROMO${merchant.id}`;
  const rows = pickList(await api(`/admin/mall/promotion-codes?merchantId=${merchant.id}`, { headers: auth(token) }));
  const existing = rows.find((item) => item.code === code);
  const payload = {
    merchantId: merchant.id,
    code,
    name: `${merchant.name}推广码`,
    agentId: agent?.id || merchant.agent?.id || undefined,
    commissionRate: 0.12,
    enabled: true,
    remark: "多商户 smoke：验证推广码只能用于所属店铺，佣金只能归属所属店铺"
  };
  return existing
    ? api(`/admin/mall/promotion-codes/${existing.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(payload) })
    : api("/admin/mall/promotion-codes", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
}

async function ensureStoreFlashSale(token, merchant, product) {
  const sku = product.skus?.[0];
  assert(sku?.id, "秒杀隔离验收缺少商品 SKU");
  const title = `多商户秒杀-${merchant.id}`;
  const rows = pickList(await api(`/admin/mall/flash-sales?merchantId=${merchant.id}&pageSize=100`, { headers: auth(token) }));
  const existing = rows.find((item) => item.title === title);
  const skuPrice = Number(sku.price || product.price || 0);
  const payload = {
    merchantId: merchant.id,
    productId: product.id,
    skuId: sku.id,
    title,
    salePrice: Math.max(skuPrice - 3, 1).toFixed(2),
    saleStock: 30,
    perUserLimit: 2,
    startsAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
    sortOrder: 10
  };
  return existing
    ? api(`/admin/mall/flash-sales/${existing.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(payload) })
    : api("/admin/mall/flash-sales", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
}

async function ensureStoreGroupBuy(token, merchant, product) {
  const sku = product.skus?.[0];
  assert(sku?.id, "拼团隔离验收缺少商品 SKU");
  const title = `多商户拼团-${merchant.id}`;
  const rows = pickList(await api(`/admin/mall/group-buys?merchantId=${merchant.id}&pageSize=100`, { headers: auth(token) }));
  const existing = rows.find((item) => item.title === title);
  const skuPrice = Number(sku.price || product.price || 0);
  const payload = {
    merchantId: merchant.id,
    productId: product.id,
    skuId: sku.id,
    title,
    groupPrice: Math.max(skuPrice - 5, 1).toFixed(2),
    minPeople: 2,
    groupStock: 30,
    perUserLimit: 2,
    startsAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: "active",
    sortOrder: 11
  };
  return existing
    ? api(`/admin/mall/group-buys/${existing.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(payload) })
    : api("/admin/mall/group-buys", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
}

async function ensureStoreLogisticsCompany(token, merchant, label) {
  const code = `MMLOG${merchant.id}`;
  const rows = pickList(await api(`/admin/mall/logistics-companies?merchantId=${merchant.id}&keyword=${encodeURIComponent(code)}`, { headers: auth(token) }));
  const existing = rows.find((item) => item.code === code);
  const payload = {
    merchantId: merchant.id,
    name: `${label}履约专线`,
    code,
    servicePhone: merchant.contactPhone || "400-000-0000",
    trackingUrl: `https://rd.chaimen666.com/mock-logistics/${merchant.id}/${code}`,
    sortOrder: 1,
    enabled: true
  };
  return existing
    ? api(`/admin/mall/logistics-companies/${existing.id}`, { method: "PATCH", headers: auth(token), body: JSON.stringify(payload) })
    : api("/admin/mall/logistics-companies", { method: "POST", headers: auth(token), body: JSON.stringify(payload) });
}

async function assertAdminIsolation(selfToken, agentToken, selfProduct, agentProduct, selfStore, agentStore) {
  const selfProducts = pickList(await api(`/admin/mall/products?merchantId=${selfStore.id}&pageSize=100`, { headers: auth(selfToken) }));
  const agentProducts = pickList(await api(`/admin/mall/products?merchantId=${agentStore.id}&pageSize=100`, { headers: auth(agentToken) }));
  assert(selfProducts.some((item) => item.id === selfProduct.id), "自营店账号看不到自己的商品");
  assert(!selfProducts.some((item) => item.id === agentProduct.id), "自营店账号不应看到代理店商品");
  assert(agentProducts.some((item) => item.id === agentProduct.id), "代理店账号看不到自己的商品");
  assert(!agentProducts.some((item) => item.id === selfProduct.id), "代理店账号不应看到自营店商品");

  const crossAccess = await tryApi(`/admin/mall/products?merchantId=${agentStore.id}&pageSize=20`, { headers: auth(selfToken) });
  assert(!crossAccess.ok, "自营店账号不应能指定查看代理店商品");
  const selfAccess = await api(`/admin/mall/products?merchantId=${selfStore.id}&pageSize=20`, { headers: auth(selfToken) });
  assert(pickList(selfAccess).some((item) => item.id === selfProduct.id), "自营店账号指定自己的店铺后应能查看商品");

  const selfPaymentMerchants = pickList(await api("/admin/mall/payment-merchants", { headers: auth(selfToken) }));
  const agentPaymentMerchants = pickList(await api("/admin/mall/payment-merchants", { headers: auth(agentToken) }));
  assert(selfPaymentMerchants.some((item) => item.id === selfStore.id), "自营店账号收款配置页应能选择自己的店铺");
  assert(!selfPaymentMerchants.some((item) => item.id === agentStore.id), "自营店账号收款配置页不应看到代理店铺");
  assert(agentPaymentMerchants.some((item) => item.id === agentStore.id), "代理店账号收款配置页应能选择自己的店铺");
  assert(!agentPaymentMerchants.some((item) => item.id === selfStore.id), "代理店账号收款配置页不应看到自营店铺");

  const selfAccessibleMerchants = pickList(await api("/admin/mall/accessible-merchants", { headers: auth(selfToken) }));
  const agentAccessibleMerchants = pickList(await api("/admin/mall/accessible-merchants", { headers: auth(agentToken) }));
  assert(selfAccessibleMerchants.some((item) => item.id === selfStore.id), "自营店账号商品/订单页应能选择自己的店铺");
  assert(!selfAccessibleMerchants.some((item) => item.id === agentStore.id), "自营店账号商品/订单页不应看到代理店铺");
  assert(agentAccessibleMerchants.some((item) => item.id === agentStore.id), "代理店账号商品/订单页应能选择自己的店铺");
  assert(!agentAccessibleMerchants.some((item) => item.id === selfStore.id), "代理店账号商品/订单页不应看到自营店铺");
}

async function assertCouponStoreIsolation(selfToken, agentToken, userToken, selfProduct, agentProduct, selfStore, agentStore, agentCoupon) {
  const selfCoupons = pickList(await api(`/admin/mall/coupons?merchantId=${selfStore.id}&pageSize=100`, { headers: auth(selfToken) }));
  assert(!selfCoupons.some((item) => item.id === agentCoupon.id), "自营店账号不应在优惠券列表看到代理店优惠券");
  const crossAdminList = await tryApi(`/admin/mall/coupons?merchantId=${agentStore.id}`, { headers: auth(selfToken) });
  assert(!crossAdminList.ok, "自营店账号不应指定查看代理店优惠券");
  const agentCoupons = pickList(await api(`/admin/mall/coupons?merchantId=${agentStore.id}&pageSize=100`, { headers: auth(agentToken) }));
  assert(agentCoupons.some((item) => item.id === agentCoupon.id), "代理店账号应能看到自己的店铺优惠券");

  const publicAgentCoupons = pickList(await api(`/public/me/mall/coupons?tenantCode=${TENANT_CODE}&merchantId=${agentStore.id}&amount=58`, { headers: userAuth(userToken) }));
  assert(publicAgentCoupons.some((item) => item.id === agentCoupon.id), "前台进入代理店时应能看到代理店优惠券");
  const publicSelfCoupons = pickList(await api(`/public/me/mall/coupons?tenantCode=${TENANT_CODE}&merchantId=${selfStore.id}&amount=58`, { headers: userAuth(userToken) }));
  assert(!publicSelfCoupons.some((item) => item.id === agentCoupon.id), "前台进入自营店时不应看到代理店优惠券");
  const publicTenantCoupons = pickList(await api(`/public/me/mall/coupons?tenantCode=${TENANT_CODE}&amount=58`, { headers: userAuth(userToken) }));
  assert(!publicTenantCoupons.some((item) => item.id === agentCoupon.id), "未选择店铺的领券中心不应展示店铺专属券");

  const claimWithoutMerchant = await tryApi(`/public/me/mall/coupons/${agentCoupon.id}/claim?tenantCode=${TENANT_CODE}`, { method: "POST", headers: userAuth(userToken) });
  assert(!claimWithoutMerchant.ok && String(claimWithoutMerchant.error?.message || "").includes("所属店铺"), "店铺券未带 merchantId 领取时应返回运营可读原因");
  const claimWithMerchant = await api(`/public/me/mall/coupons/${agentCoupon.id}/claim?tenantCode=${TENANT_CODE}&merchantId=${agentStore.id}`, { method: "POST", headers: userAuth(userToken) });
  assert(claimWithMerchant.coupon?.id === agentCoupon.id, "带店铺上下文领取店铺券应成功");

  const selfSku = selfProduct.skus?.[0];
  const agentSku = agentProduct.skus?.[0];
  assert(selfSku?.id && agentSku?.id, "优惠券隔离验收缺少商品 SKU");
  const selfQuote = await tryApi(`/public/mall/quote?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify({ items: [{ skuId: selfSku.id, quantity: 1 }], couponCode: agentCoupon.code })
  });
  assert(!selfQuote.ok && String(selfQuote.error?.message || "").includes("仅限所属店铺"), "代理店优惠券不应能用于自营店商品");
  const agentQuote = await api(`/public/mall/quote?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify({ items: [{ skuId: agentSku.id, quantity: 1 }], couponCode: agentCoupon.code })
  });
  assert(agentQuote.coupon?.id === agentCoupon.id && Number(agentQuote.couponDiscountAmount || 0) > 0, "代理店优惠券应用于代理店商品时应产生优惠");
}

async function assertCouponMerchantAvailabilityGuard(token, userToken, tenantId, managerAdminId) {
  const guardCode = `qiwai-coupon-availability-${Date.now()}`;
  const payload = {
    tenantId,
    ownerType: "tenant",
    code: guardCode,
    name: "优惠券店铺状态保护",
    status: "disabled",
    mallEnabled: false,
    productAuditRequired: false,
    paymentMode: "platform_collect",
    region: "重庆市铜梁区",
    contactName: "优惠券保护测试",
    contactPhone: "13990008890",
    notice: "用于验证停用店铺优惠券不能继续展示、领取或校验。",
    remark: `demoScenario:${SCENARIO} coupon merchant availability guard`
  };
  const draft = await api("/admin/mall/merchants", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify(payload)
  });
  await ensureMerchantAccess(token, managerAdminId, draft.id, "manager");
  const guardStore = await api(`/admin/mall/merchants/${draft.id}`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({ ...payload, status: "active", mallEnabled: true })
  });
  await ensureStoreProduct(token, guardStore, "【多商户】优惠券停用保护商品", "优惠券保护", 25, 45, 35);
  const guardCoupon = await ensureStoreCoupon(token, guardStore, "优惠券店铺状态保护券");
  const couponsBefore = pickList(await api(`/public/me/mall/coupons?tenantCode=${TENANT_CODE}&merchantId=${guardStore.id}&amount=25`, { headers: userAuth(userToken) }));
  assert(couponsBefore.some((item) => item.id === guardCoupon.id), "开放店铺优惠券应在店铺领券入口展示");
  const claimBefore = await api(`/public/me/mall/coupons/${guardCoupon.id}/claim?tenantCode=${TENANT_CODE}&merchantId=${guardStore.id}`, { method: "POST", headers: userAuth(userToken) });
  assert(claimBefore.coupon?.id === guardCoupon.id, "开放店铺优惠券应允许领取");
  await api(`/admin/mall/merchants/${guardStore.id}`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({ ...payload, status: "disabled", mallEnabled: false, notice: "优惠券店铺状态保护验证完成，已关闭展示。" })
  });
  const [claimsAfter, couponsAfter, claimAfterClose, validateAfterClose] = await Promise.all([
    api(`/public/me/mall/coupon-claims?tenantCode=${TENANT_CODE}`, { headers: userAuth(userToken) }),
    tryApi(`/public/me/mall/coupons?tenantCode=${TENANT_CODE}&merchantId=${guardStore.id}&amount=25`, { headers: userAuth(userToken) }),
    tryApi(`/public/me/mall/coupons/${guardCoupon.id}/claim?tenantCode=${TENANT_CODE}`, { method: "POST", headers: userAuth(userToken) }),
    tryApi(`/public/mall/coupons/validate?tenantCode=${TENANT_CODE}&code=${encodeURIComponent(guardCoupon.code)}&amount=25`, { headers: tenantHeader() })
  ]);
  assert(!pickList(claimsAfter).some((item) => item.coupon?.id === guardCoupon.id), "店铺停用后，用户券包不应继续展示该店铺优惠券");
  assert(!couponsAfter.ok && String(couponsAfter.error?.message || couponsAfter.body?.message || "").includes("店铺不存在或未开通商城"), "店铺停用后，店铺领券入口应不可访问");
  const blockedMessage = String(claimAfterClose.error?.message || claimAfterClose.body?.message || "");
  assert(!claimAfterClose.ok && blockedMessage.includes("所属店铺未开通商城"), "店铺停用后，不应允许继续领取该店铺优惠券");
  assert(!validateAfterClose.ok && String(validateAfterClose.error?.message || validateAfterClose.body?.message || "").includes("所属店铺未开通商城"), "店铺停用后，公开优惠券校验应拒绝该店铺优惠券");
  assertPublicMallUserPayloadSafe("店铺停用后的用户商城券包", claimsAfter);
  return { guardStoreId: guardStore.id, couponId: guardCoupon.id, blockedMessage };
}

async function assertFlashGroupStoreIsolation(userToken, selfProduct, agentProduct, selfStore, agentStore, agentFlashSale, agentGroupBuy) {
  const selfSku = selfProduct.skus?.[0];
  const agentSku = agentProduct.skus?.[0];
  assert(selfSku?.id && agentSku?.id, "秒杀/拼团隔离验收缺少商品 SKU");

  const agentFlashSales = pickList(await api(`/public/mall/flash-sales?tenantCode=${TENANT_CODE}&merchantId=${agentStore.id}`, { headers: tenantHeader() }));
  const selfFlashSales = pickList(await api(`/public/mall/flash-sales?tenantCode=${TENANT_CODE}&merchantId=${selfStore.id}`, { headers: tenantHeader() }));
  assert(agentFlashSales.some((item) => item.id === agentFlashSale.id), "代理店公共秒杀列表应展示代理店秒杀活动");
  assert(!selfFlashSales.some((item) => item.id === agentFlashSale.id), "自营店公共秒杀列表不应展示代理店秒杀活动");
  assertPublicMallPayloadSafe("前台商城秒杀活动", [...agentFlashSales, ...selfFlashSales]);

  const agentGroupBuys = pickList(await api(`/public/mall/group-buys?tenantCode=${TENANT_CODE}&merchantId=${agentStore.id}`, { headers: tenantHeader() }));
  const selfGroupBuys = pickList(await api(`/public/mall/group-buys?tenantCode=${TENANT_CODE}&merchantId=${selfStore.id}`, { headers: tenantHeader() }));
  assert(agentGroupBuys.some((item) => item.id === agentGroupBuy.id), "代理店公共拼团列表应展示代理店拼团活动");
  assert(!selfGroupBuys.some((item) => item.id === agentGroupBuy.id), "自营店公共拼团列表不应展示代理店拼团活动");
  assertPublicMallPayloadSafe("前台商城拼团活动", [...agentGroupBuys, ...selfGroupBuys]);

  const selfScopeTeams = await api(`/public/mall/group-buys/${agentGroupBuy.id}/teams?tenantCode=${TENANT_CODE}&merchantId=${selfStore.id}`, { headers: tenantHeader() });
  assert(Array.isArray(selfScopeTeams) && selfScopeTeams.length === 0, "自营店上下文不应读取代理店拼团队伍");
  const agentScopeTeams = await api(`/public/mall/group-buys/${agentGroupBuy.id}/teams?tenantCode=${TENANT_CODE}&merchantId=${agentStore.id}`, { headers: tenantHeader() });
  assert(Array.isArray(agentScopeTeams), "代理店上下文应能读取自己的拼团队伍列表");
  assertPublicMallPayloadSafe("前台商城拼团队伍", [...selfScopeTeams, ...agentScopeTeams]);

  const crossFlashQuote = await tryApi(`/public/mall/quote?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify({ items: [{ skuId: selfSku.id, quantity: 1, flashSaleId: agentFlashSale.id }] })
  });
  assert(!crossFlashQuote.ok, "代理店秒杀活动不应能用于自营店商品");
  const crossGroupQuote = await tryApi(`/public/mall/quote?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify({ items: [{ skuId: selfSku.id, quantity: 1, groupBuyId: agentGroupBuy.id }] })
  });
  assert(!crossGroupQuote.ok, "代理店拼团活动不应能用于自营店商品");

  return { flashSaleId: agentFlashSale.id, groupBuyId: agentGroupBuy.id, agentStoreId: agentStore.id };
}

async function assertMarketingProductAvailabilityGuard(token, userToken, tenantId, managerAdminId) {
  const guardCode = `qiwai-marketing-product-${Date.now()}`;
  const payload = {
    tenantId,
    ownerType: "tenant",
    code: guardCode,
    name: "营销商品状态保护店铺",
    status: "disabled",
    mallEnabled: false,
    productAuditRequired: false,
    paymentMode: "platform_collect",
    region: "重庆市铜梁区",
    contactName: "营销保护测试",
    contactPhone: "13990008891",
    notice: "用于验证商品下架后秒杀/拼团活动不会继续公开展示或参与下单。",
    remark: `demoScenario:${SCENARIO} marketing product availability guard`
  };
  const draft = await api("/admin/mall/merchants", {
    method: "POST",
    headers: auth(token),
    body: JSON.stringify(payload)
  });
  await ensureMerchantAccess(token, managerAdminId, draft.id, "manager");
  const guardStore = await api(`/admin/mall/merchants/${draft.id}`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({ ...payload, status: "active", mallEnabled: true })
  });
  const guardProduct = await ensureStoreProduct(token, guardStore, "【多商户】营销活动下架保护商品", "营销活动保护", 31, 49, 36);
  await ensureStoreProduct(token, guardStore, "【多商户】营销店铺保底展示商品", "营销活动保护", 33, 59, 37);
  const flashSale = await ensureStoreFlashSale(token, guardStore, guardProduct);
  const groupBuy = await ensureStoreGroupBuy(token, guardStore, guardProduct);
  const sku = guardProduct.skus?.[0];
  assert(sku?.id, "营销活动商品状态保护缺少商品 SKU");
  const [flashBefore, groupBefore] = await Promise.all([
    api(`/public/mall/flash-sales?tenantCode=${TENANT_CODE}&merchantId=${guardStore.id}`, { headers: tenantHeader() }),
    api(`/public/mall/group-buys?tenantCode=${TENANT_CODE}&merchantId=${guardStore.id}`, { headers: tenantHeader() })
  ]);
  assert(pickList(flashBefore).some((item) => item.id === flashSale.id), "商品上架时秒杀活动应公开展示");
  assert(pickList(groupBefore).some((item) => item.id === groupBuy.id), "商品上架时拼团活动应公开展示");
  await api(`/admin/mall/products/${guardProduct.id}`, {
    method: "PATCH",
    headers: auth(token),
    body: JSON.stringify({
      merchantId: guardStore.id,
      categoryId: guardProduct.category?.id,
      title: guardProduct.title,
      coverUrl: guardProduct.coverUrl,
      description: guardProduct.description,
      brandName: guardProduct.brandName,
      price: guardProduct.price,
      originalPrice: guardProduct.originalPrice,
      status: "offline",
      featured: guardProduct.featured,
      sortOrder: guardProduct.sortOrder,
      deliveryNote: guardProduct.deliveryNote,
      afterSaleNote: guardProduct.afterSaleNote,
      skus: guardProduct.skus.map((item) => ({
        id: item.id,
        name: item.name,
        skuCode: item.skuCode,
        price: item.price,
        originalPrice: item.originalPrice,
        stock: item.stock,
        enabled: item.enabled,
        sortOrder: item.sortOrder
      }))
    })
  });
  const [flashAfter, groupAfter, teamsAfter, flashQuote, groupQuote] = await Promise.all([
    api(`/public/mall/flash-sales?tenantCode=${TENANT_CODE}&merchantId=${guardStore.id}`, { headers: tenantHeader() }),
    api(`/public/mall/group-buys?tenantCode=${TENANT_CODE}&merchantId=${guardStore.id}`, { headers: tenantHeader() }),
    api(`/public/mall/group-buys/${groupBuy.id}/teams?tenantCode=${TENANT_CODE}&merchantId=${guardStore.id}`, { headers: tenantHeader() }),
    tryApi(`/public/mall/quote?tenantCode=${TENANT_CODE}`, {
      method: "POST",
      headers: userAuth(userToken),
      body: JSON.stringify({ items: [{ skuId: sku.id, quantity: 1, flashSaleId: flashSale.id }] })
    }),
    tryApi(`/public/mall/quote?tenantCode=${TENANT_CODE}`, {
      method: "POST",
      headers: userAuth(userToken),
      body: JSON.stringify({ items: [{ skuId: sku.id, quantity: 1, groupBuyId: groupBuy.id }] })
    })
  ]);
  assert(!pickList(flashAfter).some((item) => item.id === flashSale.id), "商品下架后秒杀活动不应继续公开展示");
  assert(!pickList(groupAfter).some((item) => item.id === groupBuy.id), "商品下架后拼团活动不应继续公开展示");
  assert(Array.isArray(teamsAfter) && teamsAfter.length === 0, "商品下架后拼团队伍入口不应继续展示");
  const blockedMessage = String(flashQuote.error?.message || flashQuote.body?.message || "");
  assert(!flashQuote.ok && blockedMessage.includes("已下架"), "商品下架后不应允许继续使用秒杀活动报价");
  assert(!groupQuote.ok && String(groupQuote.error?.message || groupQuote.body?.message || "").includes("已下架"), "商品下架后不应允许继续使用拼团活动报价");
  return { guardStoreId: guardStore.id, productId: guardProduct.id, flashSaleId: flashSale.id, groupBuyId: groupBuy.id, blockedMessage };
}

async function assertLogisticsStoreIsolation(selfToken, agentToken, selfStore, agentStore) {
  const selfLogistics = await ensureStoreLogisticsCompany(selfToken, selfStore, "自营店");
  const agentLogistics = await ensureStoreLogisticsCompany(agentToken, agentStore, "代理店");

  const selfAdminRows = pickList(await api(`/admin/mall/logistics-companies?merchantId=${selfStore.id}`, { headers: auth(selfToken) }));
  assert(selfAdminRows.some((item) => item.id === selfLogistics.id), "自营店账号应能看到自己的物流公司");
  assert(!selfAdminRows.some((item) => item.id === agentLogistics.id), "自营店账号不应看到代理店物流公司");
  const crossAdminRows = await tryApi(`/admin/mall/logistics-companies?merchantId=${agentStore.id}`, { headers: auth(selfToken) });
  assert(!crossAdminRows.ok, "自营店账号不应指定查看代理店物流公司");

  const publicSelfRows = pickList(await api(`/public/mall/logistics-companies?tenantCode=${TENANT_CODE}&merchantId=${selfStore.id}`, { headers: tenantHeader() }));
  const publicAgentRows = pickList(await api(`/public/mall/logistics-companies?tenantCode=${TENANT_CODE}&merchantId=${agentStore.id}`, { headers: tenantHeader() }));
  const publicTenantRows = pickList(await api(`/public/mall/logistics-companies?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() }));
  assert(publicSelfRows.some((item) => item.id === selfLogistics.id), "自营店前台物流列表应展示自营店物流公司");
  assert(!publicSelfRows.some((item) => item.id === agentLogistics.id), "自营店前台物流列表不应展示代理店物流公司");
  assert(publicAgentRows.some((item) => item.id === agentLogistics.id), "代理店前台物流列表应展示代理店物流公司");
  assert(!publicAgentRows.some((item) => item.id === selfLogistics.id), "代理店前台物流列表不应展示自营店物流公司");
  assert(!publicTenantRows.some((item) => item.id === selfLogistics.id || item.id === agentLogistics.id), "未选择店铺时不应公开店铺专属物流公司");

  return { selfLogistics, agentLogistics };
}

async function assertPromotionStoreIsolation(selfToken, agentToken, userToken, selfProduct, agentProduct, selfStore, agentStore, agentPromotion) {
  const selfSku = selfProduct.skus?.[0];
  const agentSku = agentProduct.skus?.[0];
  assert(selfSku?.id && agentSku?.id, "推广码隔离验收缺少商品 SKU");
  const address = {
    receiverName: "多商户推广码验收",
    receiverPhone: "13990008991",
    province: "重庆市",
    city: "重庆市",
    district: "铜梁区",
    detail: "多商户商城推广码验收地址"
  };

  const selfUseAgentPromotion = await tryApi(`/public/mall/checkout-groups?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify({
      items: [{ skuId: selfSku.id, quantity: 1 }],
      paymentMethod: "offline",
      promotionCode: agentPromotion.code,
      address,
      buyerRemark: "不应允许自营店使用代理店推广码"
    })
  });
  assert(!selfUseAgentPromotion.ok && String(selfUseAgentPromotion.error?.message || "").includes("仅限所属店铺"), "代理店推广码不应能用于自营店商品");

  const agentOrder = await api(`/public/mall/checkout-groups?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify({
      items: [{ skuId: agentSku.id, quantity: 1 }],
      paymentMethod: "offline",
      promotionCode: agentPromotion.code,
      address,
      buyerRemark: "代理店推广码佣金隔离 smoke"
    })
  });
  assert(agentOrder.id && agentOrder.merchant?.id === agentStore.id, "代理店推广码订单应生成代理店子订单");
  const paid = await api(`/admin/mall/orders/${agentOrder.id}/confirm-offline-payment`, { method: "POST", headers: auth(agentToken) });
  assert(paid.status === "paid", "代理店推广码订单确认收款后应为 paid");

  const agentCommissions = pickList(await api(`/admin/mall/commissions?merchantId=${agentStore.id}&keyword=${encodeURIComponent(agentPromotion.code)}`, { headers: auth(agentToken) }));
  const commission = agentCommissions.find((item) => item.order?.id === agentOrder.id && item.code === agentPromotion.code);
  assert(commission?.id && commission.merchant?.id === agentStore.id, "代理店推广码订单应生成代理店佣金记录");
  const selfCommissions = pickList(await api(`/admin/mall/commissions?merchantId=${selfStore.id}&keyword=${encodeURIComponent(agentPromotion.code)}`, { headers: auth(selfToken) }));
  assert(!selfCommissions.some((item) => item.id === commission.id), "自营店佣金列表不应看到代理店佣金");

  const crossCommissions = await tryApi(`/admin/mall/commissions?merchantId=${agentStore.id}&keyword=${encodeURIComponent(agentPromotion.code)}`, { headers: auth(selfToken) });
  assert(!crossCommissions.ok, "自营店账号不应指定查看代理店佣金");
  const crossPromoterSummary = await tryApi(`/admin/mall/commissions/by-promoter?merchantId=${agentStore.id}`, { headers: auth(selfToken) });
  assert(!crossPromoterSummary.ok, "自营店账号不应指定查看代理店推广对象汇总");
  const selfPromoterSummary = pickList(await api(`/admin/mall/commissions/by-promoter?merchantId=${selfStore.id}&keyword=${encodeURIComponent(agentPromotion.code)}`, { headers: auth(selfToken) }));
  assert(!selfPromoterSummary.some((item) => Number(item.commissionAmount || 0) > 0), "自营店推广对象汇总不应包含代理店佣金");

  const selfExport = await downloadWorkbookText(`/admin/mall/commissions/export?merchantId=${selfStore.id}&keyword=${encodeURIComponent(agentPromotion.code)}`, selfToken, "自营店佣金导出");
  assert(!selfExport.includes(agentPromotion.code), "自营店佣金导出不应包含代理店推广码");
  const agentExport = await downloadWorkbookText(`/admin/mall/commissions/export?merchantId=${agentStore.id}&keyword=${encodeURIComponent(agentPromotion.code)}`, agentToken, "代理店佣金导出");
  assert(agentExport.includes(agentPromotion.code) && agentExport.includes(agentStore.name), "代理店佣金导出应包含自己的推广码和店铺名称");

  const crossBatchSettle = await tryApi("/admin/mall/commissions/batch-settle", {
    method: "POST",
    headers: auth(selfToken),
    body: JSON.stringify({ merchantId: agentStore.id, keyword: agentPromotion.code, remark: "不应跨店批量结算" })
  });
  assert(!crossBatchSettle.ok, "自营店账号不应批量结算代理店佣金");

  return { promotionCodeId: agentPromotion.id, commissionId: commission.id, agentOrderNo: paid.orderNo };
}

async function assertProductAuditFlow(platformToken, storeToken, product) {
  assert(product.status === "pending_review", "开启审核的店铺发布商品后应进入待审核状态");
  const selfApprove = await tryApi(`/admin/mall/products/${product.id}/approve`, { method: "POST", headers: auth(storeToken) });
  assert(!selfApprove.ok, "店铺账号不应能审核自己的商品");
  const approved = await api(`/admin/mall/products/${product.id}/approve`, { method: "POST", headers: auth(platformToken) });
  assert(approved.status === "published", "平台审核通过后商品应上架");
  product.status = approved.status;
}

async function assertMerchantPaymentAccountManagement(selfToken, agentToken, selfStore, agentStore) {
  const crossList = await tryApi(`/admin/mall/merchant-payment-accounts?merchantId=${agentStore.id}`, { headers: auth(selfToken) });
  assert(!crossList.ok, "未授权店铺账号不应查看代理店铺收款账户");

  const incompleteEnabled = await tryApi("/admin/mall/merchant-payment-accounts", {
    method: "POST",
    headers: auth(agentToken),
    body: JSON.stringify({
      merchantId: agentStore.id,
      provider: "wechat",
      merchantName: `${agentStore.name}空壳商户`,
      merchantNo: "",
      enabled: true,
      config: {}
    })
  });
  assert(!incompleteEnabled.ok, "启用的店铺收款账户不应允许缺少商户号或支付配置");
  const incompleteMessage = String(incompleteEnabled.error?.message || incompleteEnabled.body?.message || "");
  assert(incompleteMessage.includes("启用微信支付收款账户前") && incompleteMessage.includes("停用草稿"), "启用空壳收款账户被拒绝时应提示运营先保存为停用草稿");

  const draftAccount = await api("/admin/mall/merchant-payment-accounts", {
    method: "POST",
    headers: auth(agentToken),
    body: JSON.stringify({
      merchantId: agentStore.id,
      provider: "alipay",
      merchantName: `${agentStore.name}支付宝草稿`,
      merchantNo: "",
      enabled: false,
      config: {}
    })
  });
  assert(draftAccount.enabled === false, "资料未完整的店铺收款账户应允许保存为停用草稿");

  const config = demoWechatPaymentConfig(agentStore);
  const saved = await api("/admin/mall/merchant-payment-accounts", {
    method: "POST",
    headers: auth(agentToken),
    body: JSON.stringify({
      merchantId: agentStore.id,
      provider: "wechat",
      merchantName: `${agentStore.name}微信商户`,
      merchantNo: config.WECHAT_PAY_MCH_ID,
      enabled: true,
      config
    })
  });
  assert(saved.provider === "wechat" && saved.enabled !== false, "店铺账号保存微信收款账户失败");
  assert(saved.config?.WECHAT_PAY_API_V3_KEY === "***", "店铺收款账户敏感字段应掩码返回");

  const rows = pickList(await api(`/admin/mall/merchant-payment-accounts?merchantId=${agentStore.id}`, { headers: auth(agentToken) }));
  const row = rows.find((item) => item.provider === "wechat");
  assert(row?.id, "店铺账号保存后应能查看自己的微信收款账户");
  assert(row.config?.WECHAT_PAY_PRIVATE_KEY_PATH === "***", "私钥路径应掩码返回，避免后台明文泄露敏感配置");

  const updated = await api(`/admin/mall/merchant-payment-accounts/${row.id}`, {
    method: "PATCH",
    headers: auth(agentToken),
    body: JSON.stringify({
      merchantId: agentStore.id,
      provider: "wechat",
      merchantName: `${agentStore.name}微信商户-已复核`,
      merchantNo: config.WECHAT_PAY_MCH_ID,
      enabled: true,
      config: row.config
    })
  });
  assert(updated.merchantName?.includes("已复核"), "店铺账号二次保存收款账户失败");

  const crossUpdate = await tryApi(`/admin/mall/merchant-payment-accounts/${row.id}`, {
    method: "PATCH",
    headers: auth(selfToken),
    body: JSON.stringify({
      merchantId: selfStore.id,
      provider: "wechat",
      merchantName: "越权修改",
      merchantNo: "NOPE",
      enabled: true,
      config: row.config
    })
  });
  assert(!crossUpdate.ok, "未授权店铺账号不应修改其他店铺收款账户");
  return { ...updated, draftAccountId: draftAccount.id, incompleteBlocked: true };
}

async function assertMerchantPaymentAccountDisableGuard(agentToken, agentStore, account) {
  const result = await tryApi(`/admin/mall/merchant-payment-accounts/${account.id}`, {
    method: "PATCH",
    headers: auth(agentToken),
    body: JSON.stringify({
      merchantId: agentStore.id,
      provider: "wechat",
      merchantName: account.merchantName,
      merchantNo: account.merchantNo,
      enabled: false
    })
  });
  assert(!result.ok, "已开放商户直收店铺不应允许停用最后一个微信支付收款账户");
  const message = String(result.error?.message || result.body?.message || "");
  assert(message.includes("不能停用最后一个微信支付收款账户"), "停用最后一个微信直收账户被拒绝时应返回运营可读原因");
  const rows = pickList(await api(`/admin/mall/merchant-payment-accounts?merchantId=${agentStore.id}`, { headers: auth(agentToken) }));
  const latest = rows.find((item) => item.id === account.id);
  assert(latest?.enabled === true, "停用最后一个微信直收账户被拒绝后，账户应继续保持启用");
  return { accountId: account.id, blockedMessage: message };
}

async function assertMerchantIdentityGuard(platformToken, agentStore) {
  const movedCode = `${agentStore.code}-moved`;
  const payload = {
    tenantId: agentStore.tenant?.id,
    agentId: agentStore.agent?.id,
    ownerType: agentStore.ownerType,
    code: movedCode,
    name: agentStore.name,
    status: agentStore.status,
    mallEnabled: agentStore.mallEnabled !== false,
    productAuditRequired: agentStore.productAuditRequired !== false,
    paymentMode: agentStore.paymentMode,
    region: agentStore.region,
    contactName: agentStore.contactName,
    contactPhone: agentStore.contactPhone,
    notice: agentStore.notice,
    remark: agentStore.remark
  };
  const result = await tryApi(`/admin/mall/merchants/${agentStore.id}`, {
    method: "PATCH",
    headers: auth(platformToken),
    body: JSON.stringify(payload)
  });
  if (result.ok) {
    await api(`/admin/mall/merchants/${agentStore.id}`, {
      method: "PATCH",
      headers: auth(platformToken),
      body: JSON.stringify({ ...payload, code: agentStore.code })
    });
  }
  assert(!result.ok, "已有商品、收款账户或订单的店铺不应允许修改店铺编码或主体归属");
  assert(String(result.body?.message || result.error || "").includes("不能修改店铺编码"), "店铺主体变更被拒绝时应返回运营可读原因");
}

function demoWechatPaymentConfig(merchant) {
  return {
    WECHAT_PAY_APP_ID: `wx_smoke_${merchant.id}`,
    WECHAT_PAY_MCH_ID: `190000${String(merchant.id).padStart(4, "0")}`,
    WECHAT_PAY_API_V3_KEY: `smoke-api-v3-key-${merchant.id}`,
    WECHAT_PAY_PRIVATE_KEY_PATH: `/tmp/qiwai-smoke-${merchant.id}-apiclient_key.pem`,
    WECHAT_PAY_CERT_SERIAL_NO: `SMOKECERT${merchant.id}`,
    WECHAT_PAY_PLATFORM_CERT_PATH: `/tmp/qiwai-smoke-${merchant.id}-platform.pem`
  };
}

function demoAlipayPaymentConfig(merchant) {
  return {
    ALIPAY_APP_ID: `ali_smoke_${merchant.id}`,
    ALIPAY_PRIVATE_KEY_PATH: `/tmp/qiwai-smoke-${merchant.id}-alipay-private.pem`,
    ALIPAY_PUBLIC_CERT_PATH: `/tmp/qiwai-smoke-${merchant.id}-alipay-public.pem`,
    ALIPAY_ROOT_CERT_PATH: `/tmp/qiwai-smoke-${merchant.id}-alipay-root.pem`
  };
}

async function createCrossStoreCheckout(userToken, selfProduct, agentProduct, selfStore, agentStore) {
  const cartRows = pickList(await api(`/public/me/mall/cart?tenantCode=${TENANT_CODE}`, { headers: userAuth(userToken) }));
  for (const row of cartRows) {
    await api(`/public/me/mall/cart/${row.id}?tenantCode=${TENANT_CODE}`, { method: "DELETE", headers: userAuth(userToken) });
  }
  const selfSku = selfProduct.skus?.find((item) => Number(item.stock || 0) - Number(item.lockedStock || 0) > 0);
  const agentSku = agentProduct.skus?.find((item) => Number(item.stock || 0) - Number(item.lockedStock || 0) > 0);
  assert(selfSku?.id, "自营商品缺少可售 SKU");
  assert(agentSku?.id, "代理商品缺少可售 SKU");
  const selfCart = await api(`/public/me/mall/cart?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify({ skuId: selfSku.id, quantity: 1 })
  });
  const agentCart = await api(`/public/me/mall/cart?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify({ skuId: agentSku.id, quantity: 1 })
  });
  const clientOrderKey = `multi_merchant_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const payload = {
    cartItemIds: [selfCart.id, agentCart.id],
    paymentMethod: "offline",
    address: {
      receiverName: "多商户验收用户",
      receiverPhone: "13990008991",
      province: "重庆市",
      city: "重庆市",
      district: "铜梁区",
      detail: "多商户商城验收地址"
    },
    buyerRemark: "多商户跨店购物车拆单 smoke",
    clientOrderKey
  };
  const group = await api(`/public/mall/checkout-groups?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify(payload)
  });
  assert(group.groupNo, "跨店下单未返回结算组号");
  assert(Array.isArray(group.orders) && group.orders.length === 2, "跨店下单应拆成 2 个子订单");
  assert(Array.isArray(group.paymentTasks) && group.paymentTasks.length === 2, "跨店结算组应生成 2 个支付任务");
  const merchantIds = new Set(group.orders.map((item) => item.merchant?.id));
  assert(merchantIds.has(selfStore.id) && merchantIds.has(agentStore.id), "跨店子订单没有按店铺拆分");
  assert(group.orders.every((item) => item.status === "pending_confirm"), "线下支付跨店子订单应为待确认状态");
  assertPublicMallUserPayloadSafe("用户侧跨店结算组", group);
  return { ...group, __idempotencyPayload: payload };
}

async function assertCrossStoreCheckoutIdempotency(userToken, group) {
  assert(group.__idempotencyPayload?.clientOrderKey, "跨店幂等检查缺少 clientOrderKey");
  const repeated = await api(`/public/mall/checkout-groups?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify(group.__idempotencyPayload)
  });
  assert(repeated.groupNo === group.groupNo, "跨店重复提交应返回同一个结算组号");
  assert(Array.isArray(repeated.orders) && repeated.orders.length === group.orders.length, "跨店重复提交应返回原子订单列表");
  const originalOrderNos = group.orders.map((item) => item.orderNo).sort();
  const repeatedOrderNos = repeated.orders.map((item) => item.orderNo).sort();
  assert(JSON.stringify(repeatedOrderNos) === JSON.stringify(originalOrderNos), "跨店重复提交不应生成新的子订单号");
  const originalOrderIds = group.orders.map((item) => item.id).sort((a, b) => Number(a) - Number(b));
  const repeatedOrderIds = repeated.orders.map((item) => item.id).sort((a, b) => Number(a) - Number(b));
  assert(JSON.stringify(repeatedOrderIds) === JSON.stringify(originalOrderIds), "跨店重复提交不应生成新的子订单 ID");
  assert(Array.isArray(repeated.paymentTasks) && repeated.paymentTasks.length === group.paymentTasks.length, "跨店重复提交应保留原支付任务");
  assertPublicMallUserPayloadSafe("用户侧跨店幂等结算组", repeated);
  return {
    groupNo: group.groupNo,
    clientOrderKey: group.__idempotencyPayload.clientOrderKey,
    orderNos: originalOrderNos
  };
}

async function assertCrossStoreBalanceGuard(userToken, selfProduct, agentProduct) {
  const selfSku = selfProduct.skus?.find((item) => Number(item.stock || 0) - Number(item.lockedStock || 0) > 0);
  const agentSku = agentProduct.skus?.find((item) => Number(item.stock || 0) - Number(item.lockedStock || 0) > 0);
  assert(selfSku?.id && agentSku?.id, "跨店余额守卫缺少可售 SKU");
  const result = await tryApi(`/public/mall/checkout-groups?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify({
      items: [
        { skuId: selfSku.id, quantity: 1 },
        { skuId: agentSku.id, quantity: 1 }
      ],
      paymentMethod: "balance",
      address: {
        receiverName: "多商户验收用户",
        receiverPhone: "13990008991",
        province: "重庆市",
        city: "重庆市",
        district: "铜梁区",
        detail: "多商户商城余额守卫验收地址"
      },
      buyerRemark: "多商户跨店余额支付应被拦截，避免分单扣款不一致"
    })
  });
  const message = String(result.error?.message || "");
  assert(!result.ok, "跨店结算不应允许余额支付，否则可能出现子订单部分扣款");
  assert(message.includes("跨店结算暂不支持余额支付"), "跨店余额支付被拒绝时应返回运营可读原因");
  return { message };
}

async function assertUserPrivatePayloadSafety(userToken, product) {
  assert(product?.id, "用户侧私有数据 DTO 检查缺少商品");
  const favoriteStatus = await api(`/public/me/mall/products/${product.id}/favorite?tenantCode=${TENANT_CODE}`, { headers: userAuth(userToken) });
  if (!favoriteStatus.favorited) {
    await api(`/public/me/mall/products/${product.id}/favorite?tenantCode=${TENANT_CODE}`, { method: "POST", headers: userAuth(userToken) });
  }
  await api(`/public/me/mall/products/${product.id}/browse?tenantCode=${TENANT_CODE}`, { method: "POST", headers: userAuth(userToken) });
  const addressPayload = {
    receiverName: "多商户 DTO 验收",
    receiverPhone: "13990008991",
    province: "重庆市",
    city: "重庆市",
    district: "铜梁区",
    detail: `用户侧私有数据 DTO 验收 ${Date.now()}`,
    isDefault: false
  };
  const savedAddress = await api(`/public/me/mall/addresses?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify(addressPayload)
  });
  const [favorites, histories, addresses] = await Promise.all([
    api(`/public/me/mall/favorites?tenantCode=${TENANT_CODE}`, { headers: userAuth(userToken) }),
    api(`/public/me/mall/browse-histories?tenantCode=${TENANT_CODE}`, { headers: userAuth(userToken) }),
    api(`/public/me/mall/addresses?tenantCode=${TENANT_CODE}`, { headers: userAuth(userToken) })
  ]);
  assert(pickList(favorites).some((item) => item.product?.id === product.id), "用户收藏列表应包含刚收藏的商城商品");
  assert(pickList(histories).some((item) => item.product?.id === product.id), "用户浏览足迹应包含刚浏览的商城商品");
  assert(savedAddress.id && pickList(addresses).some((item) => item.id === savedAddress.id), "用户收货地址列表应包含刚保存的地址");
  assertPublicMallUserPayloadSafe("用户侧商城收藏", favorites);
  assertPublicMallUserPayloadSafe("用户侧商城浏览足迹", histories);
  assertPublicMallUserPayloadSafe("用户侧商城收货地址", [savedAddress, ...pickList(addresses)]);
  return {
    favoriteProductId: product.id,
    savedAddressId: savedAddress.id,
    favorites: pickList(favorites).length,
    histories: pickList(histories).length,
    addresses: pickList(addresses).length
  };
}

function assertPaymentTaskRouting(group, selfStore, agentStore) {
  assert(Array.isArray(group.paymentTasks) && group.paymentTasks.length === 2, "跨店结算组应返回 2 个支付任务");
  const selfTask = group.paymentTasks.find((item) => item.merchantId === selfStore.id);
  const agentTask = group.paymentTasks.find((item) => item.merchantId === agentStore.id);
  assert(selfTask && agentTask, "跨店支付任务没有按店铺返回");
  assert(String(selfTask.collectionModeText || "").includes("平台代收"), "自营店支付任务应向用户明文说明平台代收");
  assert(String(agentTask.collectionModeText || "").includes("商户直收"), "代理店支付任务应向用户明文说明商户直收");
  assert(String(selfTask.receiverText || "").includes("平台代收"), "平台代收支付任务应返回用户可读收款主体");
  assert(String(agentTask.receiverText || "").includes("店铺直收"), "商户直收支付任务应返回用户可读收款主体");
  assert(String(selfTask.paymentRouteText || "").includes("线下收款") && String(agentTask.paymentRouteText || "").includes("线下收款"), "线下跨店支付任务应明确走后台确认路径");
  assert(selfTask.manualConfirmationRequired === true && agentTask.manualConfirmationRequired === true, "线下跨店支付任务应要求后台确认收款");
  assert(String(selfTask.nextAction || "").includes("商城订单") && String(agentTask.nextAction || "").includes("商城订单"), "支付任务应返回运营可读的下一步处理说明");
  assertPublicMallUserPayloadSafe("用户侧跨店支付任务", group.paymentTasks);
  return {
    groupNo: group.groupNo,
    selfTask: { orderNo: selfTask.orderNo, merchantId: selfTask.merchantId, collectionModeText: selfTask.collectionModeText, receiverText: selfTask.receiverText },
    agentTask: { orderNo: agentTask.orderNo, merchantId: agentTask.merchantId, collectionModeText: agentTask.collectionModeText, receiverText: agentTask.receiverText }
  };
}

async function assertDirectIdOperationIsolation(selfToken, selfProduct, agentProduct, selfOrder, agentOrder, selfStore, agentStore, agentCoupon) {
  const ownProductDetail = await api(`/admin/mall/products/${selfProduct.id}`, { headers: auth(selfToken) });
  assert(ownProductDetail.id === selfProduct.id, "店铺账号应能读取自己的商品详情");
  const crossProductDetail = await tryApi(`/admin/mall/products/${agentProduct.id}`, { headers: auth(selfToken) });
  assert(!crossProductDetail.ok, "店铺账号不应通过商品 ID 读取其他店铺商品详情");

  const agentSku = agentProduct.skus?.[0];
  assert(agentSku?.id, "代理店商品缺少可用于越权检查的 SKU");
  const crossStockAdjust = await tryApi(`/admin/mall/skus/${agentSku.id}/adjust-stock`, {
    method: "POST",
    headers: auth(selfToken),
    body: JSON.stringify({ stock: Number(agentSku.stock || 0), remark: "多商户 smoke 越权库存调整应失败" })
  });
  assert(!crossStockAdjust.ok, "店铺账号不应通过 SKU ID 调整其他店铺库存");

  const crossCouponUpdate = await tryApi(`/admin/mall/coupons/${agentCoupon.id}`, {
    method: "PATCH",
    headers: auth(selfToken),
    body: JSON.stringify({
      merchantId: selfStore.id,
      code: agentCoupon.code,
      name: agentCoupon.name,
      minAmount: Number(agentCoupon.minAmount || 1),
      discountAmount: Number(agentCoupon.discountAmount || 8),
      scope: agentCoupon.scope || "all",
      usageLimit: Number(agentCoupon.usageLimit || 0),
      perUserLimit: Number(agentCoupon.perUserLimit || 0),
      enabled: agentCoupon.enabled !== false,
      startsAt: agentCoupon.startsAt || null,
      endsAt: agentCoupon.endsAt || null
    })
  });
  assert(!crossCouponUpdate.ok, "店铺账号不应通过优惠券 ID 编辑其他店铺营销配置");

  const ownLogistics = await api(`/admin/mall/orders/${selfOrder.id}/logistics`, { headers: auth(selfToken) });
  assert(ownLogistics.orderNo === selfOrder.orderNo, "店铺账号应能读取自己的订单物流详情");
  const crossOrderLogistics = await tryApi(`/admin/mall/orders/${agentOrder.id}/logistics`, { headers: auth(selfToken) });
  assert(!crossOrderLogistics.ok, "店铺账号不应通过订单 ID 读取其他店铺订单物流详情");

  return { selfStoreId: selfStore.id, agentStoreId: agentStore.id, checkedProductId: agentProduct.id, checkedSkuId: agentSku.id, checkedCouponId: agentCoupon.id, checkedOrderNo: agentOrder.orderNo };
}

async function assertBatchOperationScope(financeToken, selfStore, agentStore) {
  const closeExpired = await api("/admin/mall/orders/close-expired", { method: "POST", headers: auth(financeToken) });
  assertAuthorizedBatchScope(closeExpired, selfStore, agentStore, "自动关单");
  const completeShipped = await api("/admin/mall/orders/complete-expired-shipped", { method: "POST", headers: auth(financeToken) });
  assertAuthorizedBatchScope(completeShipped, selfStore, agentStore, "自动完成已发货");
  const failGroupBuy = await api("/admin/mall/group-buys/fail-expired", { method: "POST", headers: auth(financeToken) });
  assertAuthorizedBatchScope(failGroupBuy, selfStore, agentStore, "拼团失败处理");
  return {
    merchantIds: closeExpired.scope.merchantIds,
    closeCheckedCount: closeExpired.checkedCount,
    completeCheckedCount: completeShipped.checkedCount,
    groupBuyCheckedTeamCount: failGroupBuy.checkedTeamCount
  };
}

function assertAuthorizedBatchScope(result, selfStore, agentStore, label) {
  const scope = result?.scope;
  assert(scope?.type === "authorized_merchants", `${label}应返回授权店铺作用域，方便运营确认批量任务范围`);
  assert(Array.isArray(scope.merchantIds) && scope.merchantIds.includes(selfStore.id), `${label}应包含当前财务账号授权的自营店铺`);
  assert(!scope.merchantIds.includes(agentStore.id), `${label}不应包含未授权的代理店铺`);
}

async function fulfillStoreOrder(storeToken, userToken, order, label, logistics) {
  const paid = await api(`/admin/mall/orders/${order.id}/confirm-offline-payment`, {
    method: "POST",
    headers: auth(storeToken)
  });
  assert(paid.status === "paid", `${label}订单确认收款后状态应为 paid`);
  const shipped = await api(`/admin/mall/orders/${order.id}/ship`, {
    method: "POST",
    headers: auth(storeToken),
    body: JSON.stringify({
      expressCompany: logistics.name,
      expressNo: `SF${Date.now()}${order.id}`,
      remark: `${label}多商户 smoke 发货`
    })
  });
  assert(shipped.status === "shipped", `${label}订单发货后状态应为 shipped`);
  const logisticsDetail = await api(`/admin/mall/orders/${order.id}/logistics`, { headers: auth(storeToken) });
  assert(logisticsDetail.trackingUrl === logistics.trackingUrl, `${label}订单物流查询链接应来自本店物流配置`);
  const completed = await api(`/public/me/mall/orders/${order.id}/confirm-received?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken)
  });
  assert(completed.status === "completed", `${label}订单确认收货后状态应为 completed`);
  assertPublicMallUserPayloadSafe(`${label}用户侧订单详情`, completed);
  return completed;
}

async function assertCheckoutGroupStatusSync(platformToken, group, selfOrder, agentOrder) {
  const latestSelf = await fetchAdminOrderByNo(platformToken, selfOrder.orderNo);
  const latestAgent = await fetchAdminOrderByNo(platformToken, agentOrder.orderNo);
  const selfGroup = latestSelf.checkoutGroup || {};
  const agentGroup = latestAgent.checkoutGroup || {};
  assert(selfGroup.groupNo === group.groupNo && agentGroup.groupNo === group.groupNo, "跨店子订单应保留同一个结算组");
  assert(selfGroup.status === "completed" && agentGroup.status === "completed", "跨店子订单全部完成后结算组应同步为 completed");
  const tasks = Array.isArray(selfGroup.paymentTasks) ? selfGroup.paymentTasks : [];
  assert(tasks.length === 2, "跨店结算组完成后仍应保留两个支付任务");
  assert(tasks.every((task) => task.status === "completed"), "跨店结算组支付任务状态应随子订单同步为 completed");
  return {
    groupNo: group.groupNo,
    status: selfGroup.status,
    taskStatuses: tasks.map((task) => ({ orderNo: task.orderNo, status: task.status, statusText: task.statusText }))
  };
}

async function assertCheckoutGroupAdminTrace(platformToken, group, selfStore, agentStore) {
  const groupNo = encodeURIComponent(group.groupNo);
  const [ordersResult, summary, refunds, transactions, callbacks, refundLogs, commissions, commissionSummary] = await Promise.all([
    api(`/admin/mall/orders?checkoutGroupNo=${groupNo}&pageSize=20`, { headers: auth(platformToken) }),
    api(`/admin/mall/orders/summary?checkoutGroupNo=${groupNo}`, { headers: auth(platformToken) }),
    api(`/admin/mall/refunds?checkoutGroupNo=${groupNo}`, { headers: auth(platformToken) }),
    api(`/admin/mall/payment-transactions?checkoutGroupNo=${groupNo}`, { headers: auth(platformToken) }),
    api(`/admin/mall/payment-callback-logs?checkoutGroupNo=${groupNo}`, { headers: auth(platformToken) }),
    api(`/admin/mall/refund-logs?checkoutGroupNo=${groupNo}`, { headers: auth(platformToken) }),
    api(`/admin/mall/commissions?checkoutGroupNo=${groupNo}`, { headers: auth(platformToken) }),
    api(`/admin/mall/commissions/summary?checkoutGroupNo=${groupNo}`, { headers: auth(platformToken) })
  ]);
  const rows = pickList(ordersResult);
  const orderNos = rows.map((item) => item.orderNo);
  const expectedOrderNos = group.orders.map((item) => item.orderNo);
  assert(expectedOrderNos.every((orderNo) => orderNos.includes(orderNo)), "后台结算组号筛选应能定位同组所有店铺子订单");
  assert(rows.every((item) => item.checkoutGroup?.groupNo === group.groupNo), "后台结算组号筛选结果不应混入其他订单");
  assert(Number(summary.orderCount || 0) >= expectedOrderNos.length, "后台结算组订单汇总应统计同组子订单");
  assert(Array.isArray(refunds), "后台结算组售后查询应返回列表");
  assert(Array.isArray(transactions), "后台结算组支付流水查询应返回列表");
  assert(Array.isArray(callbacks), "后台结算组支付回调查询应返回列表");
  assert(Array.isArray(refundLogs), "后台结算组退款日志查询应返回列表");
  assert(Array.isArray(commissions), "后台结算组佣金查询应返回列表");
  assert(commissionSummary && typeof commissionSummary === "object", "后台结算组佣金汇总应返回对象");

  const selfRows = pickList(await api(`/admin/mall/orders?merchantId=${selfStore.id}&checkoutGroupNo=${groupNo}&pageSize=20`, { headers: auth(platformToken) }));
  const agentRows = pickList(await api(`/admin/mall/orders?merchantId=${agentStore.id}&checkoutGroupNo=${groupNo}&pageSize=20`, { headers: auth(platformToken) }));
  assert(selfRows.length >= 1 && selfRows.every((item) => item.merchant?.id === selfStore.id), "结算组号叠加自营店铺筛选时只能返回自营店子订单");
  assert(agentRows.length >= 1 && agentRows.every((item) => item.merchant?.id === agentStore.id), "结算组号叠加代理店铺筛选时只能返回代理店子订单");

  return {
    groupNo: group.groupNo,
    orderCount: rows.length,
    refundCount: refunds.length,
    transactionCount: transactions.length,
    callbackCount: callbacks.length,
    refundLogCount: refundLogs.length,
    commissionCount: commissions.length
  };
}

async function fetchAdminOrderByNo(token, orderNo) {
  const rows = pickList(await api(`/admin/mall/orders?keyword=${encodeURIComponent(orderNo)}&pageSize=20`, { headers: auth(token) }));
  const order = rows.find((item) => item.orderNo === orderNo);
  assert(order, `后台商城订单列表缺少订单：${orderNo}`);
  return order;
}

async function assertReviewStoreIsolation(selfToken, agentToken, userToken, selfOrder, agentOrder, selfStore, agentStore) {
  const selfItem = firstOrderItem(selfOrder);
  const agentItem = firstOrderItem(agentOrder);
  const selfReview = await api(`/public/me/mall/reviews?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify({ orderItemId: selfItem.id, rating: 5, content: "自营店商品质量稳定，适合多商户上线验收。" })
  });
  const agentReview = await api(`/public/me/mall/reviews?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify({ orderItemId: agentItem.id, rating: 5, content: "代理店履约及时，适合验证店铺评价隔离。" })
  });
  assert(selfReview.merchant?.id === selfStore.id, "自营店评价应写入自营店 merchantId");
  assert(agentReview.merchant?.id === agentStore.id, "代理店评价应写入代理店 merchantId");
  assertPublicMallUserPayloadSafe("用户侧商城评价", [selfReview, agentReview]);

  const selfReviews = pickList(await api(`/admin/mall/reviews?merchantId=${selfStore.id}&status=pending`, { headers: auth(selfToken) }));
  const agentReviews = pickList(await api(`/admin/mall/reviews?merchantId=${agentStore.id}&status=pending`, { headers: auth(agentToken) }));
  assert(selfReviews.some((item) => item.id === selfReview.id), "自营店账号应能看到自己的待审评价");
  assert(!selfReviews.some((item) => item.id === agentReview.id), "自营店账号不应看到代理店评价");
  assert(agentReviews.some((item) => item.id === agentReview.id), "代理店账号应能看到自己的待审评价");
  assert(!agentReviews.some((item) => item.id === selfReview.id), "代理店账号不应看到自营店评价");

  const crossList = await tryApi(`/admin/mall/reviews?merchantId=${agentStore.id}`, { headers: auth(selfToken) });
  assert(!crossList.ok, "自营店账号不应指定查看代理店评价");
  const crossModerate = await tryApi(`/admin/mall/reviews/${agentReview.id}`, {
    method: "PATCH",
    headers: auth(selfToken),
    body: JSON.stringify({ status: "approved", reviewRemark: "越权审核", merchantReply: "不应成功" })
  });
  assert(!crossModerate.ok, "自营店账号不应审核代理店评价");

  const approvedSelf = await api(`/admin/mall/reviews/${selfReview.id}`, {
    method: "PATCH",
    headers: auth(selfToken),
    body: JSON.stringify({ status: "approved", reviewRemark: "本店评价已核验", merchantReply: "感谢支持自营店。" })
  });
  const approvedAgent = await api(`/admin/mall/reviews/${agentReview.id}`, {
    method: "PATCH",
    headers: auth(agentToken),
    body: JSON.stringify({ status: "approved", reviewRemark: "本店评价已核验", merchantReply: "感谢支持代理店。" })
  });
  assert(approvedSelf.status === "approved" && approvedAgent.status === "approved", "店铺账号应能审核自己店铺评价");
  return { selfReviewId: selfReview.id, agentReviewId: agentReview.id };
}

function firstOrderItem(order) {
  const item = Array.isArray(order?.items) ? order.items[0] : null;
  assert(item?.id, `订单 ${order?.orderNo || order?.id || ""} 缺少可评价商品明细`);
  return item;
}

async function createAgentBalanceSettlementOrder(platformToken, agentToken, userToken, userId, agentProduct, agentStore, logistics) {
  assert(userId, "余额结算样本缺少用户 ID");
  await api(`/admin/users/${userId}/wallet/adjust`, {
    method: "POST",
    headers: auth(platformToken),
    body: JSON.stringify({ tenantId: agentStore.tenant?.id, amount: 300, type: "recharge", remark: "多商户商城余额支付结算口径 smoke 充值" })
  });
  const agentSku = agentProduct.skus?.find((item) => Number(item.stock || 0) - Number(item.lockedStock || 0) > 0);
  assert(agentSku?.id, "余额结算样本缺少代理店可售 SKU");
  const paidOrder = await api(`/public/mall/checkout-groups?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify({
      items: [{ skuId: agentSku.id, quantity: 1 }],
      paymentMethod: "balance",
      address: {
        receiverName: "多商户余额结算验收",
        receiverPhone: "13990008991",
        province: "重庆市",
        city: "重庆市",
        district: "铜梁区",
        detail: "多商户商城余额支付结算验收地址"
      },
      buyerRemark: "商户直收店铺的余额支付应进入平台代收结算口径",
      clientOrderKey: `agent_balance_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    })
  });
  assert(paidOrder.id && paidOrder.status === "paid", "代理店余额支付订单应立即支付成功");
  assert(paidOrder.paymentMethod === "balance" && paidOrder.merchant?.id === agentStore.id, "余额结算样本应属于代理店且支付方式为余额");
  assertPublicMallUserPayloadSafe("用户侧余额支付订单", paidOrder);
  const shipped = await api(`/admin/mall/orders/${paidOrder.id}/ship`, {
    method: "POST",
    headers: auth(agentToken),
    body: JSON.stringify({
      expressCompany: logistics.name,
      expressNo: `BAL${Date.now()}${paidOrder.id}`,
      remark: "代理店余额支付结算样本发货"
    })
  });
  assert(shipped.status === "shipped", "代理店余额支付订单发货后应为 shipped");
  const completed = await api(`/public/me/mall/orders/${paidOrder.id}/confirm-received?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken)
  });
  assert(completed.status === "completed", "代理店余额支付订单确认收货后应为 completed");
  assertPublicMallUserPayloadSafe("用户侧余额支付完成订单", completed);
  return completed;
}

async function assertSettlementGuard(storeToken, merchant) {
  const today = todayDate();
  const result = await tryApi("/admin/mall/settlements/generate", {
    method: "POST",
    headers: auth(storeToken),
    body: JSON.stringify({
      merchantId: merchant.id,
      periodStart: today,
      periodEnd: today,
      remark: "店铺账号不应能生成自己的商城结算单"
    })
  });
  assert(!result.ok && String(result.error?.message || "").includes("平台财务"), "店铺账号不应能生成、审核或打款自己的商城结算单");
}

async function assertSettlementLifecycle(platformToken, merchant, label) {
  const today = todayDate();
  const query = `merchantId=${merchant.id}&startDate=${today}&endDate=${today}`;
  const before = await api(`/admin/mall/settlements?${query}`, { headers: auth(platformToken) });
  const pending = pickList(before.pending);
  const pendingRow = pending.find((item) => item.merchant?.id === merchant.id);
  assert(pendingRow && Number(pendingRow.orderCount || 0) >= 1, `${label}缺少待结算订单`);
  const draft = await api("/admin/mall/settlements/generate", {
    method: "POST",
    headers: auth(platformToken),
    body: JSON.stringify({
      merchantId: merchant.id,
      periodStart: today,
      periodEnd: today,
      remark: `${label}多商户 smoke 结算批次`
    })
  });
  assert(draft.status === "draft" && Number(draft.orderCount || 0) >= 1, `${label}结算单生成后应为草稿且包含订单`);
  const approved = await api(`/admin/mall/settlements/${draft.id}/approve`, {
    method: "POST",
    headers: auth(platformToken),
    body: JSON.stringify({ remark: `${label}多商户 smoke 审核通过` })
  });
  assert(approved.status === "approved", `${label}结算单审核后应为 approved`);
  const missingEvidence = await tryApi(`/admin/mall/settlements/${draft.id}/mark-paid`, {
    method: "POST",
    headers: auth(platformToken),
    body: JSON.stringify({ remark: `${label}多商户 smoke 空凭证应失败` })
  });
  const evidenceMessage = String(missingEvidence.error?.message || "");
  assert(!missingEvidence.ok && evidenceMessage.includes("凭证"), `${label}结算单标记完成必须填写打款或扣回凭证`);
  const paid = await api(`/admin/mall/settlements/${draft.id}/mark-paid`, {
    method: "POST",
    headers: auth(platformToken),
    body: JSON.stringify({
      paidReference: `SMOKE-${Date.now()}-${draft.id}`,
      remark: `${label}多商户 smoke 标记打款`
    })
  });
  assert(paid.status === "paid", `${label}结算单标记打款后应为 paid`);
  const after = await api(`/admin/mall/settlements?${query}`, { headers: auth(platformToken) });
  const afterPending = pickList(after.pending).find((item) => item.merchant?.id === merchant.id);
  assert(!afterPending || Number(afterPending.orderCount || 0) === 0, `${label}已结算订单不应继续出现在待结算汇总`);
  return { ...paid, paidEvidenceGuardMessage: evidenceMessage };
}

function assertSettlementPaymentModeAccounting(agentSettlement, agentStore, balanceOrder) {
  assert(agentStore.paymentMode === "merchant_direct", "结算口径检查需要使用商户直收店铺");
  const snapshot = parseJsonObject(agentSettlement.snapshot);
  const orderIds = Array.isArray(snapshot.orderIds) ? snapshot.orderIds.map((item) => Number(item || 0)) : [];
  const platformCollectedNetAmount = Number(snapshot.platformCollectedNetAmount || 0);
  const merchantDirectNetAmount = Number(snapshot.merchantDirectNetAmount || 0);
  const serviceFeeAmount = Number(agentSettlement.serviceFeeAmount || 0);
  const payableAmount = Number(agentSettlement.payableAmount || 0);
  const expectedPayableAmount = platformCollectedNetAmount - serviceFeeAmount;
  assert(orderIds.includes(balanceOrder.id), "代理店余额支付订单必须进入本期商城结算单快照");
  assert(platformCollectedNetAmount > 0, "商户直收店铺通过余额支付收款时，结算单必须记录平台钱包代收净额");
  assert(Math.abs(payableAmount - expectedPayableAmount) < 0.01, "商户直收店铺的余额支付订单应按平台代收净额扣服务费后生成应打款，不能因为店铺直收模式归零");
  return {
    settlementNo: agentSettlement.settlementNo,
    merchantId: agentStore.id,
    balanceOrderNo: balanceOrder.orderNo,
    paymentMode: agentStore.paymentMode,
    platformCollectedNetAmount: platformCollectedNetAmount.toFixed(2),
    merchantDirectNetAmount: merchantDirectNetAmount.toFixed(2),
    serviceFeeAmount: serviceFeeAmount.toFixed(2),
    payableAmount: payableAmount.toFixed(2)
  };
}

async function assertSettlementRefundChargebackAccounting(platformToken, userToken, agentStore, settledBalanceOrder) {
  const refundAmount = Number(settledBalanceOrder.amount || 0);
  assert(refundAmount > 0, "已结算后退款冲抵样本缺少有效退款金额");
  const refund = await api(`/public/me/mall/orders/${settledBalanceOrder.id}/refund-request?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(userToken),
    body: JSON.stringify({
      type: "refund_only",
      amount: refundAmount,
      reason: "多商户商城 smoke：已结算打款后退款，应生成负向冲抵结算"
    })
  });
  assert(refund.id && refund.status === "pending", "已结算订单申请售后后应生成待审核售后单");
  assertPublicMallUserPayloadSafe("用户侧商城售后单", refund);
  const approvedRefund = await api(`/admin/mall/refunds/${refund.id}/approve`, {
    method: "POST",
    headers: auth(platformToken),
    body: JSON.stringify({ remark: "多商户商城 smoke：财务审核通过已结算后退款" })
  });
  assert(approvedRefund.status === "approved", "已结算后退款经平台财务审核后应为 approved");

  const today = todayDate();
  const draft = await api("/admin/mall/settlements/generate", {
    method: "POST",
    headers: auth(platformToken),
    body: JSON.stringify({
      merchantId: agentStore.id,
      periodStart: today,
      periodEnd: today,
      remark: "多商户商城 smoke：已结算后退款冲抵批次"
    })
  });
  assert(draft.status === "draft", "已结算后退款应能单独生成冲抵结算草稿");
  const snapshot = parseJsonObject(draft.snapshot);
  const orderIds = Array.isArray(snapshot.orderIds) ? snapshot.orderIds.map((item) => Number(item || 0)) : [];
  const refundIds = Array.isArray(snapshot.refundIds) ? snapshot.refundIds.map((item) => Number(item || 0)) : [];
  const orderCount = Number(draft.orderCount || 0);
  const settlementRefundAmount = Number(draft.refundAmount || 0);
  const platformCollectedNetAmount = Number(snapshot.platformCollectedNetAmount || 0);
  const serviceFeeAmount = Number(draft.serviceFeeAmount || 0);
  const payableAmount = Number(draft.payableAmount || 0);
  const expectedPayableAmount = platformCollectedNetAmount - serviceFeeAmount;
  assert(refundIds.includes(approvedRefund.id), "已结算后退款必须进入新的冲抵结算单快照");
  assert(!orderIds.includes(settledBalanceOrder.id), "已结算订单不能在退款冲抵结算单中重复进入订单快照");
  assert(orderCount === 0, "已结算后退款冲抵结算单不应重复统计原订单");
  assert(settlementRefundAmount > 0, "已结算后退款冲抵结算单必须记录退款金额");
  assert(platformCollectedNetAmount < 0, "平台代收余额订单已结算后退款时，平台代收净额必须为负数用于冲抵");
  assert(payableAmount < 0, "已结算后退款应生成负向应打款，供财务扣回或冲抵后续结算");
  assert(Math.abs(payableAmount - expectedPayableAmount) < 0.01, "已结算后退款冲抵应按平台代收净额减服务费反向计算，不能被归零");

  const approvedSettlement = await api(`/admin/mall/settlements/${draft.id}/approve`, {
    method: "POST",
    headers: auth(platformToken),
    body: JSON.stringify({ remark: "财务已核对已结算后退款冲抵金额" })
  });
  assert(approvedSettlement.status === "approved", "已结算后退款冲抵结算单应可审核通过");
  const missingChargebackEvidence = await tryApi(`/admin/mall/settlements/${draft.id}/mark-paid`, {
    method: "POST",
    headers: auth(platformToken),
    body: JSON.stringify({ remark: "缺少扣回/冲抵凭证应失败" })
  });
  assert(!missingChargebackEvidence.ok && String(missingChargebackEvidence.error?.message || "").includes("凭证"), "已结算后退款冲抵结算单标记完成必须填写扣回/冲抵凭证");
  const paidSettlement = await api(`/admin/mall/settlements/${draft.id}/mark-paid`, {
    method: "POST",
    headers: auth(platformToken),
    body: JSON.stringify({
      paidReference: `SMOKE-CHARGEBACK-${Date.now()}-${draft.id}`,
      remark: "财务已记录扣回/冲抵凭证"
    })
  });
  assert(paidSettlement.status === "paid", "已结算后退款冲抵结算单应可标记为已完成");

  return {
    settlementNo: paidSettlement.settlementNo,
    merchantId: agentStore.id,
    refundedOrderNo: settledBalanceOrder.orderNo,
    refundNo: approvedRefund.refundNo,
    refundAmount: settlementRefundAmount.toFixed(2),
    platformCollectedNetAmount: platformCollectedNetAmount.toFixed(2),
    serviceFeeAmount: serviceFeeAmount.toFixed(2),
    payableAmount: payableAmount.toFixed(2)
  };
}

function parseJsonObject(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" && !Array.isArray(value) ? value : {};
}

async function assertMallOperationalAdminEndpoints(platformToken, selfToken, agentToken, selfStore, agentStore, selfSettlement, agentSettlement) {
  const today = todayDate();
  const selfQuery = `merchantId=${selfStore.id}&startDate=${today}&endDate=${today}`;
  const agentQuery = `merchantId=${agentStore.id}&startDate=${today}&endDate=${today}`;
  const [analytics, transactions, callbacks, refundLogs, settlements] = await Promise.all([
    api(`/admin/mall/analytics?merchantId=${selfStore.id}`, { headers: auth(platformToken) }),
    api(`/admin/mall/payment-transactions?${selfQuery}`, { headers: auth(platformToken) }),
    api(`/admin/mall/payment-callback-logs?${selfQuery}`, { headers: auth(platformToken) }),
    api(`/admin/mall/refund-logs?${selfQuery}`, { headers: auth(platformToken) }),
    api(`/admin/mall/settlements?${selfQuery}`, { headers: auth(platformToken) })
  ]);
  assert(analytics?.summary && Array.isArray(analytics.trend), "商城统计接口应返回 summary 和 trend");
  assert(Array.isArray(transactions), "商城支付流水接口应返回列表");
  assert(Array.isArray(callbacks), "商城支付回调日志接口应返回列表");
  assert(Array.isArray(refundLogs), "商城退款日志接口应返回列表");
  assert(pickList(settlements.items).some((item) => item.merchant?.id === selfStore.id), "商城结算列表应包含自营店结算单");
  const platformExportText = await downloadWorkbookText(`/admin/mall/settlements/export?${selfQuery}`, platformToken, "平台商城结算导出");
  assert(platformExportText.includes(selfSettlement.settlementNo), "平台商城结算导出应包含自营店结算单号");
  assert(platformExportText.includes(selfStore.name), "平台商城结算导出应包含自营店店铺名称");
  assert(!platformExportText.includes(agentSettlement.settlementNo), "平台按自营店筛选导出时不应包含代理店结算单号");
  const selfOrderExportText = await downloadWorkbookText(`/admin/mall/orders/export?${selfQuery}`, platformToken, "平台商城订单导出");
  assert(selfOrderExportText.includes("结算组号") && selfOrderExportText.includes("店铺名称") && selfOrderExportText.includes("收款模式"), "商城订单导出应包含多商户对账字段");
  assert(selfOrderExportText.includes(selfStore.name), "商城订单导出应包含自营店店铺名称");
  assert(selfOrderExportText.includes("平台代收"), "商城订单导出应标明平台代收模式");
  assert(!selfOrderExportText.includes(agentStore.name), "平台按自营店筛选订单导出时不应包含代理店订单");

  const selfAnalytics = await api(`/admin/mall/analytics?merchantId=${selfStore.id}`, { headers: auth(selfToken) });
  assert(selfAnalytics?.summary, "店铺账号应能查看自己店铺商城统计");
  const selfSettlements = await api(`/admin/mall/settlements?${selfQuery}`, { headers: auth(selfToken) });
  assert(pickList(selfSettlements.items).every((item) => item.merchant?.id === selfStore.id), "店铺账号结算列表只能包含自己的店铺");
  const selfExportText = await downloadWorkbookText(`/admin/mall/settlements/export?${selfQuery}`, selfToken, "店铺商城结算导出");
  assert(selfExportText.includes(selfSettlement.settlementNo), "店铺商城结算导出应包含自己的结算单号");
  assert(selfExportText.includes(selfStore.name), "店铺商城结算导出应包含自己的店铺名称");
  assert(!selfExportText.includes(agentSettlement.settlementNo), "店铺商城结算导出不应包含代理店结算单号");

  const crossAnalytics = await tryApi(`/admin/mall/analytics?merchantId=${agentStore.id}`, { headers: auth(selfToken) });
  assert(!crossAnalytics.ok, "自营店账号不应查看代理店统计");
  const crossSettlements = await tryApi(`/admin/mall/settlements?${agentQuery}`, { headers: auth(selfToken) });
  assert(!crossSettlements.ok, "自营店账号不应查看代理店结算列表");
  const crossExport = await tryDownload(`/admin/mall/settlements/export?${agentQuery}`, selfToken);
  assert(!crossExport.ok, "自营店账号不应导出代理店结算");

  const agentPayments = await api(`/admin/mall/payment-transactions?${agentQuery}`, { headers: auth(agentToken) });
  assert(Array.isArray(agentPayments), "代理店账号应能打开自己的支付日志页");
}

async function downloadWorkbookText(path, token, label) {
  const result = await tryDownload(path, token);
  assert(result.ok, `${label}失败：${result.error?.message || result.status || "未知错误"}`);
  assert(result.bytes > 100, `${label}文件内容为空或过小`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(result.buffer);
  const values = [];
  for (const worksheet of workbook.worksheets) {
    worksheet.eachRow((row) => {
      row.eachCell((cell) => values.push(cellText(cell.value)));
    });
  }
  return values.join("\n");
}

function cellText(value) {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value.richText)) return value.richText.map((item) => item.text || "").join("");
  if ("text" in value) return String(value.text || "");
  if ("result" in value) return cellText(value.result);
  return JSON.stringify(value);
}

async function tryDownload(path, token) {
  try {
    const res = await fetch(`${API_BASE}${path}`, { headers: auth(token) });
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!res.ok) {
      const text = buffer.toString("utf8");
      return { ok: false, status: res.status, error: new Error(text || res.statusText) };
    }
    return { ok: true, status: res.status, bytes: buffer.byteLength, buffer, contentType: res.headers.get("content-type") || "" };
  } catch (error) {
    return { ok: false, error };
  }
}

async function tryApi(path, options = {}) {
  try {
    return { ok: true, data: await api(path, options) };
  } catch (error) {
    return { ok: false, error };
  }
}

main().catch((error) => {
  console.error("\n多商户商城 smoke 失败：");
  console.error(error.message);
  console.error("请先执行 npm run seed:online-showcase，并确认 API_BASE、账号密码环境变量正确。");
  writeSmokeResult({ failed: true, error: error.message });
  process.exitCode = 1;
});
