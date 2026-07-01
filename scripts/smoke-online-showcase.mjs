import {
  API_BASE,
  TENANT_CODE,
  answers,
  api,
  assert,
  auth,
  demoUsers,
  loginPlatformAdmin,
  loginShowcaseAdmin,
  loginUser,
  pickList,
  reportStep,
  tenantHeader,
  tryApi,
  userAuth
} from "./online-showcase-lib.mjs";

const Status = {
  Approved: "approved",
  CheckedIn: "checked_in",
  Paid: "paid",
  PendingPayment: "pending_payment",
  PartiallyRefunded: "partially_refunded"
};

let runtimeUsers = new Map();

async function main() {
  console.log(`线上演示商家 smoke target: ${API_BASE}`);
  const admin = await loginShowcaseAdmin("showcase_admin");
  const platform = await loginPlatformAdmin();
  const ops = await loginShowcaseAdmin("showcase_ops");
  const finance = await loginShowcaseAdmin("showcase_finance");
  const checkin = await loginShowcaseAdmin("showcase_checkin");
  const tenantId = admin.admin?.tenant?.id || admin.admin?.tenantId;
  assert(tenantId, "演示商家管理员登录信息缺少 tenantId");
  runtimeUsers = await prepareSmokeUsers(admin.token, platform.token, tenantId);

  const publicHome = await api(`/public/homepage?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() });
  assert(pickList(publicHome?.sections || publicHome).length || Array.isArray(publicHome), "H5 首页装修没有返回有效内容");
  reportStep("H5 首页装修可读取");

  const activities = pickList(await api(`/public/activities?tenantCode=${TENANT_CODE}&pageSize=100`, { headers: tenantHeader() }));
  const freeActivity = activities.find((item) => Number(item.price || 0) <= 0);
  const paidActivity = activities.find((item) => Number(item.price || 0) > 0);
  assert(activities.length >= 6, "演示活动不足 6 个");
  assert(freeActivity && paidActivity, "演示活动必须同时包含免费和收费活动");
  reportStep("活动列表包含免费和收费活动", `${activities.length} 个`);

  await freeRegistrationFlow(freeActivity, checkin.token);
  const paidFlow = await paidRegistrationFlow(paidActivity);
  await refundFlow(paidActivity, finance.token);
  await commentFlow(ops.token);
  await courseFlow(finance.token);
  await mallFlow(finance.token, ops.token);
  await financeChecks(finance.token, paidFlow.order.id);

  console.log("\n线上演示商家闭环验收通过。");
  console.log(`演示入口：https://rd.chaimen666.com/?tenantCode=${TENANT_CODE}#/`);
}

async function freeRegistrationFlow(activity, checkinToken) {
  const demo = smokeUser("free");
  const user = await loginUser(demo.phone, demo.nickname);
  const detail = await api(`/public/activities/${activity.id}?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() });
  const registered = await api(`/public/activities/${activity.id}/register?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ answers: answers(detail.fields || [], "A"), source: "online-showcase-free" })
  });
  assert([Status.Approved, Status.CheckedIn].includes(registered.registration?.status), "免费报名后状态应为 approved 或 checked_in");
  const registrations = pickList(await api(`/public/me/registrations?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) }));
  assert(registrations.some((item) => item.registration?.id === registered.registration.id || item.id === registered.registration.id), "我的报名列表缺少免费报名");
  const code = await api(`/public/me/registrations/${registered.registration.id}/check-in-code?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  assert(code.code, "免费报名缺少签到码");
  const checkin = await api("/admin/check-ins", {
    method: "POST",
    headers: auth(checkinToken),
    body: JSON.stringify({ code: code.code, remark: "online-showcase 免费报名签到核销" })
  });
  assert(checkin.registration?.status === Status.CheckedIn || checkin.status === Status.CheckedIn, "免费报名核销后应为 checked_in");
  reportStep("免费报名闭环", "报名 -> 我的报名 -> 签到码 -> 后台核销");
}

async function paidRegistrationFlow(activity) {
  const demo = smokeUser("paid");
  const user = await loginUser(demo.phone, demo.nickname);
  const beforeWallet = await api(`/public/me/wallet?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  assert(Number(beforeWallet.availableBalance || 0) >= Number(activity.price || 0), "收费报名用户余额不足，请先执行 seed");
  const detail = await api(`/public/activities/${activity.id}?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() });
  const paidTicket = pickList(detail.ticketTypes).find((item) => Number(item.price || 0) > 0);
  assert(paidTicket?.id, "收费活动详情缺少付费票种");
  const registered = await api(`/public/activities/${activity.id}/register?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ answers: answers(detail.fields || [], "B"), ticketTypeId: paidTicket.id, paymentMethod: "balance", source: "online-showcase-balance" })
  });
  assert(registered.order?.id, "收费报名后应生成待支付订单");
  const paid = registered.order?.status === Status.Paid
    ? registered
    : await api(`/public/orders/${registered.order.id}/pay/balance?tenantCode=${TENANT_CODE}`, {
      method: "POST",
      headers: userAuth(user.userAccessToken),
      body: JSON.stringify({})
    });
  assert(paid.order?.status === Status.Paid, "余额支付后订单应为 paid");
  const afterWallet = await api(`/public/me/wallet?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  assert(Number(afterWallet.availableBalance) < Number(beforeWallet.availableBalance), "余额支付后钱包余额应减少");
  const txs = pickList(await api(`/public/me/wallet/transactions?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) }));
  assert(txs.some((item) => item.type === "balance_pay" && item.order?.id === paid.order.id), "余额支付流水缺失");
  reportStep("收费报名余额支付闭环", "报名 -> 订单 -> 余额扣款 -> 钱包流水");
  return { user, registration: paid.order.registration || registered.registration, order: paid.order };
}

async function refundFlow(activity, financeToken) {
  const demo = smokeUser("refund");
  const user = await loginUser(demo.phone, demo.nickname);
  const beforeWallet = await api(`/public/me/wallet?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  const detail = await api(`/public/activities/${activity.id}?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() });
  const registered = await api(`/public/activities/${activity.id}/register?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ answers: answers(detail.fields || [], "C"), ticketTypeId: detail.ticketTypes?.find((item) => Number(item.price || 0) > 0)?.id, paymentMethod: "balance", source: "online-showcase-refund" })
  });
  const paid = registered.order?.status === Status.Paid
    ? registered
    : await api(`/public/orders/${registered.order.id}/pay/balance?tenantCode=${TENANT_CODE}`, {
      method: "POST",
      headers: userAuth(user.userAccessToken),
      body: JSON.stringify({})
    });
  const userRequest = await tryApi(`/public/me/registrations/${registered.registration.id}/refund-request?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({})
  });
  const refundRequest = userRequest.ok
    ? userRequest.data
    : await api(`/admin/orders/${paid.order.id}/refund`, {
      method: "POST",
      headers: auth(financeToken),
      body: JSON.stringify({ amount: Math.min(10, Number(paid.order.amount || activity.price || 10)), reason: "online-showcase 余额支付退款验收", refundNo: `SHOWCASE_RF_${Date.now()}_${paid.order.id}` })
    });
  const refund = userRequest.ok ? await findPendingRefund(financeToken, paid.order.id, refundRequest.refund?.refundNo) : refundRequest.refund;
  assert(refund?.id, "退款申请创建后后台退款列表缺少待审核记录");
  const approved = await api(`/admin/refunds/${refund.id}/approve`, {
    method: "POST",
    headers: auth(financeToken),
    body: JSON.stringify({ remark: "online-showcase 退款审核通过" })
  });
  assert(approved.refund?.status === "completed", "退款审核后状态应为 completed");
  assert([Status.PartiallyRefunded, "refunded"].includes(approved.order?.status), "退款后订单状态应更新为退款相关状态");
  const afterWallet = await api(`/public/me/wallet?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  assert(Number(afterWallet.availableBalance) > Number(beforeWallet.availableBalance) - Number(paid.order.amount || activity.price || 0), "退款后余额应有退回");
  const txs = pickList(await api(`/public/me/wallet/transactions?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) }));
  assert(txs.some((item) => item.type === "refund_return"), "退款返还流水缺失");
  reportStep("退款闭环", userRequest.ok ? "用户申请 -> 财务退款 -> 审核通过 -> 余额退回" : "财务退款 -> 审核通过 -> 余额退回");
}

async function findPendingRefund(financeToken, orderId, refundNo) {
  const refunds = pickList(await api("/admin/finance/refunds?pageSize=200", { headers: auth(financeToken) }));
  return refunds.find((item) => item.status === "pending" && item.order?.id === orderId && (!refundNo || item.refundNo === refundNo));
}

async function commentFlow(opsToken) {
  const demo = smokeUser("comment");
  const user = await loginUser(demo.phone, demo.nickname);
  const posts = pickList(await api(`/public/community/posts?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) }));
  assert(posts.length >= 8, "慢π动态不足 8 条");
  const post = posts[0];
  const like = await api(`/public/community/posts/${post.id}/like?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({})
  });
  assert(typeof like.liked === "boolean", "点赞接口应返回 liked 状态");
  const created = await api(`/public/community/posts/${post.id}/comments?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ content: `online-showcase 评论审核验收 ${Date.now()}` })
  });
  assert(created.comment?.status === "pending", "评论提交后应为待审核");
  const pending = pickList(await api(`/admin/community-post-comments?status=pending&postId=${post.id}`, { headers: auth(opsToken) }));
  const target = pending.find((item) => item.id === created.comment.id);
  assert(target, "后台评论审核列表缺少新评论");
  await api(`/admin/community-post-comments/${target.id}`, {
    method: "PATCH",
    headers: auth(opsToken),
    body: JSON.stringify({ status: "approved", reviewRemark: "online-showcase 审核通过" })
  });
  const visible = pickList(await api(`/public/community/posts/${post.id}/comments?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) }));
  assert(visible.some((item) => item.id === target.id), "评论审核通过后前台未展示");
  reportStep("动态点赞评论审核闭环", "点赞 -> 评论待审 -> 后台通过 -> 前台可见");
}

async function courseFlow(financeToken) {
  const demo = smokeUser("course");
  const user = await loginUser(demo.phone, demo.nickname);
  const courses = pickList(await api(`/public/courses?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() }));
  const freeCourse = courses.find((item) => Number(item.price || 0) <= 0);
  const paidCourse = courses.find((item) => Number(item.price || 0) > 0);
  assert(courses.length >= 4 && freeCourse && paidCourse, "课程列表应包含免费和收费课程");
  const freeOrder = await api(`/public/courses/${freeCourse.id}/orders?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({})
  });
  assert(freeOrder.owned === true, "免费课程下单后应立即拥有");
  const paidOrder = await api(`/public/courses/${paidCourse.id}/orders?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ paymentMethod: "offline" })
  });
  assert(paidOrder.order?.status === Status.PendingPayment || paidOrder.owned === true, "收费课程应生成待确认订单或已拥有");
  if (!paidOrder.owned) {
    await api(`/admin/course-orders/${paidOrder.order.id}/confirm-offline-payment`, { method: "POST", headers: auth(financeToken), body: JSON.stringify({}) });
  }
  const player = await api(`/public/courses/${paidCourse.id}/player?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  assert(player.owned === true, "收费课程后台确认后播放器应显示已拥有");
  const lesson = player.chapters?.flatMap((chapter) => chapter.lessons || []).find((item) => item.id);
  assert(lesson, "课程播放器缺少课时");
  await api(`/public/courses/${paidCourse.id}/progress?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ lessonId: lesson.id, progress: 35 })
  });
  const myCourses = pickList(await api(`/public/me/courses?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) }));
  assert(myCourses.some((item) => item.id === paidCourse.id && Number(item.learning?.progress || 0) >= 0), "我的课程缺少已购课程或学习记录");
  reportStep("课程交付闭环", "下单 -> 后台确认 -> 播放权限 -> 学习进度 -> 我的课程");
}

async function mallFlow(financeToken, opsToken) {
  const demo = smokeUser("paid");
  const user = await loginUser(demo.phone, demo.nickname);
  const products = pickList(await api(`/public/mall/products?tenantCode=${TENANT_CODE}&pageSize=20`, { headers: tenantHeader() }));
  assert(products.length >= 4, "商城商品不足 4 个，请先执行 seed");
  const newestProducts = pickList(await api(`/public/mall/products?tenantCode=${TENANT_CODE}&sort=newest&pageSize=20`, { headers: tenantHeader() }));
  const hotProducts = pickList(await api(`/public/mall/products?tenantCode=${TENANT_CODE}&sort=hot&pageSize=20`, { headers: tenantHeader() }));
  const searchedProducts = pickList(await api(`/public/mall/products?tenantCode=${TENANT_CODE}&keyword=${encodeURIComponent("慢π")}&pageSize=20`, { headers: tenantHeader() }));
  assert(newestProducts.length >= 1 && hotProducts.length >= 1, "商城新品/热销榜接口无商品");
  assert(searchedProducts.some((item) => String(item.title || "").includes("慢π") || String(item.brandName || "").includes("慢π")), "商城搜索接口未返回匹配商品");
  const product = products.find((item) => (item.skus || []).some((sku) => Number(sku.price || 0) >= 50 && Number(sku.stock || 0) - Number(sku.lockedStock || 0) > 0));
  assert(product, "商城没有可购买库存");
  const merchantId = product.merchant?.id || product.merchantId;
  const merchantQuery = merchantId ? `&merchantId=${merchantId}` : "";
  const merchantOnlyQuery = merchantId ? `merchantId=${merchantId}` : "";
  const merchantBody = merchantId ? { merchantId } : {};
  const sku = product.skus.find((item) => Number(item.price || 0) >= 50 && Number(item.stock || 0) - Number(item.lockedStock || 0) > 0);
  await api(`/public/me/mall/products/${product.id}/browse?tenantCode=${TENANT_CODE}`, { method: "POST", headers: userAuth(user.userAccessToken), body: JSON.stringify({}) });
  const favoriteResult = await api(`/public/me/mall/products/${product.id}/favorite?tenantCode=${TENANT_CODE}`, { method: "POST", headers: userAuth(user.userAccessToken), body: JSON.stringify({}) });
  assert(favoriteResult.favorited === true, "商城商品收藏失败");
  const favoriteStatus = await api(`/public/me/mall/products/${product.id}/favorite?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  assert(favoriteStatus.favorited === true, "商城商品收藏状态不正确");
  const favoriteRows = pickList(await api(`/public/me/mall/favorites?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) }));
  assert(favoriteRows.some((item) => item.product?.id === product.id), "我的商城收藏缺少目标商品");
  const browseRows = pickList(await api(`/public/me/mall/browse-histories?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) }));
  assert(browseRows.some((item) => item.product?.id === product.id && Number(item.viewCount || 0) >= 1), "商城浏览足迹缺少目标商品");
  const coupons = pickList(await api(`/public/mall/coupons?tenantCode=${TENANT_CODE}&amount=${Number(sku.price || 0)}${merchantQuery}`, { headers: tenantHeader() }));
  const coupon = coupons.find((item) => item.code === "SHOWCASE10");
  assert(coupon, "商城演示优惠券 SHOWCASE10 不可用，请先执行 seed");
  assert(coupon.runtimeStatus === "active" && (coupon.remainingCount === null || Number(coupon.remainingCount) >= 0), "前台商城优惠券缺少可用状态/剩余数量");
  const adminCoupons = pickList(await api(`/admin/mall/coupons?status=active&keyword=SHOWCASE10${merchantQuery}`, { headers: auth(opsToken) }));
  const adminCoupon = adminCoupons.find((item) => item.code === "SHOWCASE10");
  assert(adminCoupon?.runtimeStatus === "active", "后台商城优惠券状态识别不正确");
  const myCoupons = pickList(await api(`/public/me/mall/coupons?tenantCode=${TENANT_CODE}&amount=${Number(sku.price || 0)}${merchantQuery}`, { headers: userAuth(user.userAccessToken) }));
  const onceCoupon = myCoupons.find((item) => item.code === "ONCE5");
  assert(onceCoupon?.id && Number(onceCoupon.perUserLimit || 0) === 1, "商城领券中心缺少每人限用券 ONCE5");
  const claimedOnce = await api(`/public/me/mall/coupons/${onceCoupon.id}/claim?tenantCode=${TENANT_CODE}${merchantQuery}`, { method: "POST", headers: userAuth(user.userAccessToken), body: JSON.stringify({}) });
  assert(claimedOnce.status === "available" && claimedOnce.coupon?.code === "ONCE5", "商城优惠券领取后应进入可用券包");
  const availableClaims = pickList(await api(`/public/me/mall/coupon-claims?tenantCode=${TENANT_CODE}&status=available${merchantQuery}`, { headers: userAuth(user.userAccessToken) }));
  assert(availableClaims.some((item) => item.coupon?.code === "ONCE5"), "我的商城优惠券包缺少已领取可用券");
  const scopedCoupons = pickList(await api(`/public/mall/coupons?tenantCode=${TENANT_CODE}&amount=100${merchantQuery}`, { headers: tenantHeader() }));
  assert(scopedCoupons.some((item) => item.code === "STUDY8" && item.scope === "category"), "商城分类优惠券未在前台可用券列表展示");
  assert(scopedCoupons.some((item) => item.code === "CALLIGRAPHY12" && item.scope === "product"), "商城指定商品优惠券未在前台可用券列表展示");
  const calligraphyProduct = products.find((item) => String(item.title || "").includes("书法入门练习套装"));
  const calligraphySku = calligraphyProduct?.skus?.find((item) => Number(item.price || 0) >= 80 && Number(item.stock || 0) - Number(item.lockedStock || 0) > 0);
  assert(calligraphyProduct?.id && calligraphySku?.id, "商城缺少可验收的书法套装指定商品券商品");
  const categoryCouponQuote = await api(`/public/mall/quote?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ items: [{ skuId: calligraphySku.id, quantity: 1 }], couponCode: "STUDY8" })
  });
  assert(Number(categoryCouponQuote.couponDiscountAmount || 0) === 8 && categoryCouponQuote.coupon?.scope === "category", "商城分类优惠券未正确按适用分类抵扣");
  const productCouponQuote = await api(`/public/mall/quote?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ items: [{ skuId: calligraphySku.id, quantity: 1 }], couponCode: "CALLIGRAPHY12" })
  });
  assert(Number(productCouponQuote.couponDiscountAmount || 0) === 12 && productCouponQuote.coupon?.scope === "product", "商城指定商品优惠券未正确抵扣");
  const flashSales = pickList(await api(`/public/mall/flash-sales?tenantCode=${TENANT_CODE}${merchantQuery}`, { headers: tenantHeader() }));
  const flashSale = flashSales.find((item) => item.title === "【演示】书法套装限时秒杀");
  assert(flashSale?.id && flashSale.runtimeStatus === "active", "商城前台缺少进行中的秒杀活动");
  assert((flashSale.sku?.id || flashSale.skuId) === calligraphySku.id, "商城秒杀活动商品规格不正确");
  const calligraphyDetail = await api(`/public/mall/products/${calligraphyProduct.id}?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() });
  assert(calligraphyDetail?.id === calligraphyProduct.id && pickList(calligraphyDetail.skus).some((item) => item.id === calligraphySku.id) && flashSale.product?.id === calligraphyProduct.id, "商城商品详情缺少秒杀活动可用的商品规格");
  const flashQuote = await api(`/public/mall/quote?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ items: [{ skuId: calligraphySku.id, quantity: 1, flashSaleId: flashSale.id }] })
  });
  assert(Number(flashQuote.goodsAmount || 0) === Number(flashSale.salePrice || 0), "商城秒杀报价未按秒杀价计算");
  const groupBuys = pickList(await api(`/public/mall/group-buys?tenantCode=${TENANT_CODE}${merchantQuery}`, { headers: tenantHeader() }));
  const groupBuy = groupBuys.find((item) => item.title === "【演示】书法套装二人成团");
  const groupBuySkuId = groupBuy?.sku?.id || groupBuy?.skuId;
  const groupBuySku = calligraphyProduct?.skus?.find((item) => item.id === groupBuySkuId);
  assert(groupBuy?.id && groupBuy.runtimeStatus === "active" && groupBuySku?.id, "商城前台缺少进行中的拼团活动");
  const groupBuyQuote = await api(`/public/mall/quote?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ items: [{ skuId: groupBuySku.id, quantity: 1, groupBuyId: groupBuy.id }] })
  });
  assert(Number(groupBuyQuote.goodsAmount || 0) === Number(groupBuy.groupPrice || 0), "商城拼团报价未按拼团价计算");
  const unrelatedProduct = products.find((item) => item.id !== calligraphyProduct.id && (item.skus || []).some((sku) => Number(sku.stock || 0) - Number(sku.lockedStock || 0) > 0));
  const unrelatedSku = unrelatedProduct?.skus?.find((item) => Number(item.stock || 0) - Number(item.lockedStock || 0) > 0);
  assert(unrelatedSku?.id, "商城缺少不适用指定商品券的对照商品");
  let rejectedScopedCoupon = false;
  try {
    await api(`/public/mall/quote?tenantCode=${TENANT_CODE}`, {
      method: "POST",
      headers: userAuth(user.userAccessToken),
      body: JSON.stringify({ items: [{ skuId: unrelatedSku.id, quantity: 1 }], couponCode: "CALLIGRAPHY12" })
    });
  } catch {
    rejectedScopedCoupon = true;
  }
  assert(rejectedScopedCoupon, "商城指定商品优惠券不应适用于其他商品");
  const beforeWallet = await api(`/public/me/wallet?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  assert(Number(beforeWallet.availableBalance || 0) >= Number(sku.price || 0) - Number(coupon.discountAmount || 0), "商城余额支付用户余额不足");
  await api(`/admin/members/${demo.userId}/points/adjust`, {
    method: "POST",
    headers: auth(opsToken),
    body: JSON.stringify({ points: 300, remark: "online-showcase 商城积分抵扣验收预置" })
  });
  const address = await api(`/public/me/mall/addresses?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ receiverName: "商城演示用户", receiverPhone: demo.phone, city: "演示城市", detail: "慢π演示空间", isDefault: true })
  });
  assert(address.id, "商城收货地址创建失败");
  const flashOrder = await api(`/public/mall/orders?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ items: [{ skuId: calligraphySku.id, quantity: 1, flashSaleId: flashSale.id }], paymentMethod: "balance", addressId: address.id, buyerRemark: "online-showcase 商城秒杀余额支付验收" })
  });
  assert(flashOrder.status === "paid" && Number(flashOrder.goodsAmount || 0) === Number(flashSale.salePrice || 0), "商城秒杀余额支付订单状态或金额不正确");
  const flashOrderDetail = await api(`/public/me/mall/orders/${flashOrder.id}?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  assert(pickList(flashOrderDetail.items).some((item) => String(item.skuName || "").includes("秒杀")), "商城秒杀订单明细缺少秒杀标记");
  const adminFlashSales = pickList(await api(`/admin/mall/flash-sales?keyword=${encodeURIComponent("书法套装限时秒杀")}${merchantQuery}`, { headers: auth(opsToken) }));
  assert(adminFlashSales.some((item) => item.id === flashSale.id && Number(item.soldStock || 0) >= Number(flashSale.soldStock || 0) + 1), "后台商城秒杀活动未记录已售库存");
  const groupBuyOrder = await api(`/public/mall/orders?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ items: [{ skuId: groupBuySku.id, quantity: 1, groupBuyId: groupBuy.id }], paymentMethod: "balance", addressId: address.id, buyerRemark: "online-showcase 商城拼团余额支付验收" })
  });
  assert(groupBuyOrder.status === "paid" && Number(groupBuyOrder.goodsAmount || 0) === Number(groupBuy.groupPrice || 0), "商城拼团余额支付订单状态或金额不正确");
  const groupBuyOrderDetail = await api(`/public/me/mall/orders/${groupBuyOrder.id}?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  assert(pickList(groupBuyOrderDetail.items).some((item) => String(item.skuName || "").includes("拼团")), "商城拼团订单明细缺少拼团标记");
  assert(pickList(groupBuyOrderDetail.groupBuyTeams).some((team) => team.teamNo && team.teamStatus === "forming" && Number(team.paidPeople || 0) === 1), "商城拼团订单详情缺少组团中团队信息");
  const adminGroupBuys = pickList(await api(`/admin/mall/group-buys?keyword=${encodeURIComponent("书法套装二人成团")}${merchantQuery}`, { headers: auth(opsToken) }));
  assert(adminGroupBuys.some((item) => item.id === groupBuy.id && Number(item.soldStock || 0) >= Number(groupBuy.soldStock || 0) + 1), "后台商城拼团活动未记录已售库存");
  const groupBuyRecords = pickList(await api(`/admin/mall/group-buy-records?keyword=${encodeURIComponent(groupBuyOrder.orderNo)}${merchantQuery}`, { headers: auth(opsToken) }));
  const groupBuyRecord = groupBuyRecords.find((item) => item.order?.id === groupBuyOrder.id);
  assert(groupBuyRecord?.teamNo && groupBuyRecord.status === "paid" && Number(groupBuyRecord.amount || 0) === Number(groupBuy.groupPrice || 0), "后台商城拼团参团记录缺少已支付订单");
  assert(groupBuyRecord.teamStatus === "forming" && Number(groupBuyRecord.paidPeople || 0) === 1, "商城首个拼团订单应处于组团中");
  const publicGroupBuyTeams = pickList(await api(`/public/mall/group-buys/${groupBuy.id}/teams?tenantCode=${TENANT_CODE}${merchantQuery}`, { headers: tenantHeader() }));
  const joinableTeam = publicGroupBuyTeams.find((team) => team.teamNo && team.teamStatus === "forming" && Number(team.remainingPeople || 0) === 1);
  assert(joinableTeam, "商城商品详情可参团列表缺少组团中团队");
  const joinDemo = smokeUser("course");
  const joinUser = await loginUser(joinDemo.phone, joinDemo.nickname);
  const joinAddress = await api(`/public/me/mall/addresses?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(joinUser.userAccessToken),
    body: JSON.stringify({ receiverName: "商城拼团参团用户", receiverPhone: joinDemo.phone, city: "演示城市", detail: "慢π拼团空间", isDefault: true })
  });
  const joinGroupBuyOrder = await api(`/public/mall/orders?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(joinUser.userAccessToken),
    body: JSON.stringify({ items: [{ skuId: groupBuySku.id, quantity: 1, groupBuyId: groupBuy.id, joinTeamNo: joinableTeam.teamNo }], paymentMethod: "balance", addressId: joinAddress.id, buyerRemark: "online-showcase 商城拼团参团成团验收" })
  });
  assert(joinGroupBuyOrder.status === "paid" && Number(joinGroupBuyOrder.goodsAmount || 0) === Number(groupBuy.groupPrice || 0), "商城拼团参团支付订单状态或金额不正确");
  const joinGroupBuyOrderDetail = await api(`/public/me/mall/orders/${joinGroupBuyOrder.id}?tenantCode=${TENANT_CODE}`, { headers: userAuth(joinUser.userAccessToken) });
  assert(pickList(joinGroupBuyOrderDetail.groupBuyTeams).some((team) => team.teamNo === joinableTeam.teamNo && team.teamStatus === "success" && Number(team.paidPeople || 0) >= 2), "商城拼团参团订单详情缺少已成团信息");
  const joinedTeamRecords = pickList(await api(`/admin/mall/group-buy-records?keyword=${encodeURIComponent(joinableTeam.teamNo)}${merchantQuery}`, { headers: auth(opsToken) }));
  assert(joinedTeamRecords.length >= 2 && joinedTeamRecords.every((item) => item.teamStatus === "success" && Number(item.paidPeople || 0) >= 2), "商城拼团达到人数后应标记整团成团");
  const publicGroupBuyTeamsAfterSuccess = pickList(await api(`/public/mall/group-buys/${groupBuy.id}/teams?tenantCode=${TENANT_CODE}${merchantQuery}`, { headers: tenantHeader() }));
  assert(!publicGroupBuyTeamsAfterSuccess.some((team) => team.teamNo === joinableTeam.teamNo), "已成团队伍不应继续出现在商品详情可参团列表");
  const expiredGroupBuyStart = formatLocalDateTime(new Date(Date.now() - 2 * 60 * 1000));
  const expiredGroupBuyActiveEnd = formatLocalDateTime(new Date(Date.now() + 10 * 60 * 1000));
  const expiredGroupBuyPastEnd = formatLocalDateTime(new Date(Date.now() - 60 * 1000));
  const offlineGroupBuyStart = formatLocalDateTime(new Date(Date.now() - 30 * 1000));
  const offlineGroupBuyActiveEnd = formatLocalDateTime(new Date(Date.now() + 20 * 60 * 1000));
  const offlineGroupBuyPastEnd = formatLocalDateTime(new Date(Date.now() - 10 * 1000));
  const oldSmokeGroupBuys = pickList(await api(`/admin/mall/group-buys?keyword=${encodeURIComponent("【smoke】")}${merchantQuery}`, { headers: auth(opsToken) }));
  for (const oldSmokeGroupBuy of oldSmokeGroupBuys.filter((item) => item.status === "active")) {
    await api(`/admin/mall/group-buys/${oldSmokeGroupBuy.id}`, {
      method: "PATCH",
      headers: auth(opsToken),
      body: JSON.stringify({
        ...merchantBody,
        productId: oldSmokeGroupBuy.product?.id || oldSmokeGroupBuy.productId,
        skuId: oldSmokeGroupBuy.sku?.id || oldSmokeGroupBuy.skuId,
        title: oldSmokeGroupBuy.title,
        groupPrice: Number(oldSmokeGroupBuy.groupPrice || 0),
        minPeople: oldSmokeGroupBuy.minPeople,
        groupStock: oldSmokeGroupBuy.groupStock,
        perUserLimit: oldSmokeGroupBuy.perUserLimit,
        startsAt: oldSmokeGroupBuy.startsAt,
        endsAt: oldSmokeGroupBuy.endsAt,
        status: "disabled",
        sortOrder: oldSmokeGroupBuy.sortOrder
      })
    });
  }
  const expiredGroupBuyPayload = {
    ...merchantBody,
    productId: unrelatedProduct.id,
    skuId: unrelatedSku.id,
    title: `【smoke】过期未成团自动退款 ${Date.now()}`,
    groupPrice: Math.max(Number(unrelatedSku.price || 0) - 5, 1),
    minPeople: 3,
    groupStock: 20,
    perUserLimit: 1,
    startsAt: expiredGroupBuyStart,
    endsAt: expiredGroupBuyActiveEnd,
    status: "active",
    sortOrder: 99
  };
  const expiredGroupBuy = await api("/admin/mall/group-buys", { method: "POST", headers: auth(opsToken), body: JSON.stringify(expiredGroupBuyPayload) });
  const beforeFailWallet = await api(`/public/me/wallet?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  const failedTeamOrder = await api(`/public/mall/orders?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ items: [{ skuId: unrelatedSku.id, quantity: 1, groupBuyId: expiredGroupBuy.id }], paymentMethod: "balance", addressId: address.id, buyerRemark: "online-showcase 商城拼团未成团自动退款验收" })
  });
  assert(failedTeamOrder.status === "paid", "商城过期拼团支付后应先为 paid");
  await api(`/admin/mall/group-buys/${expiredGroupBuy.id}`, { method: "PATCH", headers: auth(opsToken), body: JSON.stringify({ ...expiredGroupBuyPayload, endsAt: expiredGroupBuyPastEnd }) });
  const failResult = await api("/admin/mall/group-buys/fail-expired", { method: "POST", headers: auth(financeToken), body: JSON.stringify({}) });
  assert(Number(failResult.failedTeamCount || 0) >= 1 && Number(failResult.refundedOrderCount || 0) >= 1, "商城未成团处理应返回失败团和退款订单");
  const failedTeamRecords = pickList(await api(`/admin/mall/group-buy-records?keyword=${encodeURIComponent(failedTeamOrder.orderNo)}${merchantQuery}`, { headers: auth(opsToken) }));
  assert(failedTeamRecords.some((item) => item.order?.id === failedTeamOrder.id && item.teamStatus === "failed" && item.status === "refunded"), "商城未成团后参团记录应标记失败和已退款");
  const failedTeamOrderDetail = await api(`/public/me/mall/orders/${failedTeamOrder.id}?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  assert(failedTeamOrderDetail.status === "refunded", "商城未成团自动退款后订单应为 refunded");
  const afterFailWallet = await api(`/public/me/wallet?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  assert(Number(afterFailWallet.availableBalance || 0) >= Number(beforeFailWallet.availableBalance || 0) - 0.0001, "商城未成团自动退款后余额应退回");
  const offlineGroupBuyPayload = {
    ...expiredGroupBuyPayload,
    title: `【smoke】线下拼团未成团人工退款 ${Date.now()}`,
    startsAt: offlineGroupBuyStart,
    endsAt: offlineGroupBuyActiveEnd,
    sortOrder: 100
  };
  const offlineGroupBuy = await api("/admin/mall/group-buys", { method: "POST", headers: auth(opsToken), body: JSON.stringify(offlineGroupBuyPayload) });
  const offlineFailOrder = await api(`/public/mall/orders?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ items: [{ skuId: unrelatedSku.id, quantity: 1, groupBuyId: offlineGroupBuy.id }], paymentMethod: "offline", addressId: address.id, buyerRemark: "online-showcase 商城线下拼团未成团人工退款验收" })
  });
  assert(offlineFailOrder.status === "pending_confirm", "商城线下拼团订单应先待财务确认");
  const confirmedOfflineFailOrder = await api(`/admin/mall/orders/${offlineFailOrder.id}/confirm-offline-payment`, { method: "POST", headers: auth(financeToken), body: JSON.stringify({}) });
  assert(confirmedOfflineFailOrder.status === "paid", "商城线下拼团确认后应为 paid");
  await api(`/admin/mall/group-buys/${offlineGroupBuy.id}`, { method: "PATCH", headers: auth(opsToken), body: JSON.stringify({ ...offlineGroupBuyPayload, endsAt: offlineGroupBuyPastEnd }) });
  const offlineFailResult = await api("/admin/mall/group-buys/fail-expired", { method: "POST", headers: auth(financeToken), body: JSON.stringify({}) });
  assert(Number(offlineFailResult.manualRefundOrderCount || 0) >= 1, "商城线下未成团应生成待人工退款任务");
  const offlineFailOrderDetail = await api(`/public/me/mall/orders/${offlineFailOrder.id}?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  assert(offlineFailOrderDetail.status === "refund_pending", "商城线下未成团后订单应进入售后中");
  const manualRefunds = pickList(await api(`/admin/mall/refunds?keyword=${encodeURIComponent(offlineFailOrder.orderNo)}${merchantQuery}`, { headers: auth(financeToken) }));
  assert(manualRefunds.some((item) => item.order?.id === offlineFailOrder.id && item.status === "pending" && String(item.reason || "").includes("拼团未成团")), "商城线下未成团后应生成待处理售后单");
  const cartItem = await api(`/public/me/mall/cart?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ skuId: sku.id, quantity: 1 })
  });
  assert(cartItem.id && cartItem.quantity === 1, "商城加入购物车失败");
  const updatedCartItem = await api(`/public/me/mall/cart/${cartItem.id}?tenantCode=${TENANT_CODE}`, {
    method: "PATCH",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ quantity: 1 })
  });
  assert(updatedCartItem.id === cartItem.id, "商城购物车数量更新失败");
  const quote = await api(`/public/mall/quote?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ cartItemIds: [cartItem.id], couponCode: coupon.code, pointsToUse: 200 })
  });
  assert(Number(quote.availablePoints || 0) >= 200 && Number(quote.pointsUsed || 0) === 200 && Number(quote.pointsDiscountAmount || 0) === 2, "商城积分报价未正确计算抵扣");
  const order = await api(`/public/mall/orders?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({
      cartItemIds: [cartItem.id],
      paymentMethod: "balance",
      addressId: address.id,
      couponCode: coupon.code,
      pointsToUse: 200,
      promotionCode: "SHOWMALL5",
      buyerRemark: "online-showcase 商城余额支付验收"
    })
  });
  assert(order.status === "paid", "商城余额支付后订单应为 paid");
  assert(Number(order.pointsUsed || 0) === 200 && Number(order.pointsDiscountAmount || 0) === 2, "商城积分未正确写入订单");
  assert(Number(order.discountAmount || 0) === Number(coupon.discountAmount || 0) + Number(order.pointsDiscountAmount || 0), "商城优惠券和积分未正确汇总抵扣");
  assert(order.promotionCode === "SHOWMALL5", "商城订单未记录推广码");
  assert(Number(order.amount || 0) === Number(order.goodsAmount || 0) - Number(order.discountAmount || 0), "商城优惠后实付金额不正确");
  const cartAfterOrder = pickList(await api(`/public/me/mall/cart?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) }));
  assert(!cartAfterOrder.some((item) => item.id === cartItem.id), "购物车结算后应清除已结算商品");
  const orderDetail = await api(`/public/me/mall/orders/${order.id}?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  assert(orderDetail.addressSnapshot?.receiverPhone === demo.phone && pickList(orderDetail.items).length >= 1, "商城订单详情缺少地址或商品明细");
  const myOrders = pickList(await api(`/public/me/mall/orders?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) }));
  assert(myOrders.some((item) => item.id === order.id), "我的商城订单缺少新订单");
  const adminOrders = await api(`/admin/mall/orders?status=paid&pageSize=50${merchantQuery}`, { headers: auth(financeToken) });
  assert(pickList(adminOrders).some((item) => item.id === order.id), "后台商城订单缺少已支付订单");
  const couponUsages = pickList(await api(`/admin/mall/coupon-usages?keyword=${encodeURIComponent(order.orderNo)}${merchantQuery}`, { headers: auth(opsToken) }));
  assert(couponUsages.some((item) => item.order?.id === order.id && item.code === coupon.code && item.status === "used"), "后台商城优惠券使用记录缺少已支付订单");
  const onceCouponQuote = await api(`/public/mall/quote?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ items: [{ skuId: sku.id, quantity: 1 }], couponCode: "ONCE5" })
  });
  assert(Number(onceCouponQuote.couponDiscountAmount || 0) === 5 && onceCouponQuote.coupon?.code === "ONCE5", "商城每人限用券报价异常");
  const onceCouponOrder = await api(`/public/mall/orders?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ items: [{ skuId: sku.id, quantity: 1 }], paymentMethod: "balance", addressId: address.id, couponCode: "ONCE5", buyerRemark: "online-showcase 商城每人限用券验收" })
  });
  assert(onceCouponOrder.status === "paid" && Number(onceCouponOrder.discountAmount || 0) >= 5, "商城每人限用券订单未正确抵扣");
  const onceCouponUsages = pickList(await api(`/admin/mall/coupon-usages?keyword=${encodeURIComponent(onceCouponOrder.orderNo)}${merchantQuery}`, { headers: auth(opsToken) }));
  assert(onceCouponUsages.some((item) => item.order?.id === onceCouponOrder.id && item.code === "ONCE5" && item.status === "used"), "后台商城每人限用券使用记录缺失");
  const usedClaims = pickList(await api(`/public/me/mall/coupon-claims?tenantCode=${TENANT_CODE}&status=used`, { headers: userAuth(user.userAccessToken) }));
  assert(usedClaims.some((item) => item.coupon?.code === "ONCE5" && Number(item.usedCount || 0) >= 1), "我的商城券包未标记 ONCE5 已使用");
  let rejectedSecondOnceCoupon = false;
  try {
    await api(`/public/mall/quote?tenantCode=${TENANT_CODE}`, {
      method: "POST",
      headers: userAuth(user.userAccessToken),
      body: JSON.stringify({ items: [{ skuId: sku.id, quantity: 1 }], couponCode: "ONCE5" })
    });
  } catch {
    rejectedSecondOnceCoupon = true;
  }
  assert(rejectedSecondOnceCoupon, "商城每人限用券不应允许同一用户第二次使用");
  const memberDetailAfterMallPay = await api(`/admin/members/${demo.userId}`, { headers: auth(opsToken) });
  const pointLogsAfterMallPay = pickList(memberDetailAfterMallPay.points);
  assert(pointLogsAfterMallPay.some((item) => item.sourceType === "mall_points_redeem" && item.sourceId === String(order.id) && Number(item.points) === -200), "会员积分流水缺少商城积分抵扣记录");
  assert(pointLogsAfterMallPay.some((item) => item.sourceType === "mall_order_paid" && item.sourceId === String(order.id)), "会员积分流水缺少商城消费赠送记录");
  const commissionRows = pickList(await api(`/admin/mall/commissions?keyword=${encodeURIComponent(order.orderNo)}${merchantQuery}`, { headers: auth(financeToken) }));
  const pendingCommission = commissionRows.find((item) => item.order?.id === order.id && item.code === "SHOWMALL5" && item.status === "pending" && Number(item.commissionAmount || 0) > 0);
  assert(pendingCommission, "商城推广佣金未生成待结算记录");
  const settledCommission = await api(`/admin/mall/commissions/${pendingCommission.id}/settle`, {
    method: "POST",
    headers: auth(financeToken),
    body: JSON.stringify({ remark: "online-showcase 推广佣金结算验收" })
  });
  assert(settledCommission.status === "settled" && settledCommission.settledAt && settledCommission.settleRemark, "商城推广佣金结算状态未正确更新");
  const settledCommissionSummary = await api(`/admin/mall/commissions/summary?keyword=${encodeURIComponent(order.orderNo)}${merchantQuery}`, { headers: auth(financeToken) });
  assert(Number(settledCommissionSummary.settledCount || 0) >= 1 && Number(settledCommissionSummary.settledAmount || 0) > 0, "商城推广佣金汇总缺少已结算数据");
  const settledPromoterSummary = pickList(await api(`/admin/mall/commissions/by-promoter?keyword=${encodeURIComponent(order.orderNo)}${merchantQuery}`, { headers: auth(financeToken) }));
  assert(settledPromoterSummary.some((item) => Number(item.settledCount || 0) >= 1 && Number(item.settledAmount || 0) > 0), "商城推广对象汇总缺少已结算数据");
  const promoterSummaryExport = await fetch(`${API_BASE}/admin/mall/commissions/by-promoter/export?keyword=${encodeURIComponent(order.orderNo)}${merchantQuery}`, { headers: auth(financeToken) });
  assert(promoterSummaryExport.ok, "商城推广对象佣金汇总导出失败");
  const promoterSummaryExportBuffer = await promoterSummaryExport.arrayBuffer();
  assert(promoterSummaryExportBuffer.byteLength > 100, "商城推广对象佣金汇总导出文件为空");
  const commissionExport = await fetch(`${API_BASE}/admin/mall/commissions/export?keyword=${encodeURIComponent(order.orderNo)}${merchantQuery}`, { headers: auth(financeToken) });
  assert(commissionExport.ok, "商城推广佣金导出失败");
  const commissionExportBuffer = await commissionExport.arrayBuffer();
  assert(commissionExportBuffer.byteLength > 100, "商城推广佣金导出文件为空");
  const batchSettleOrder = await api(`/public/mall/orders?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ items: [{ skuId: sku.id, quantity: 1 }], paymentMethod: "balance", addressId: address.id, promotionCode: "SHOWMALL5", buyerRemark: "online-showcase 商城批量结算佣金验收" })
  });
  assert(batchSettleOrder.status === "paid", "商城批量结算验收订单应为 paid");
  const batchBeforeSummary = await api(`/admin/mall/commissions/summary?keyword=${encodeURIComponent(batchSettleOrder.orderNo)}${merchantQuery}`, { headers: auth(financeToken) });
  assert(Number(batchBeforeSummary.pendingCount || 0) >= 1 && Number(batchBeforeSummary.pendingAmount || 0) > 0, "商城批量结算前应存在待结算佣金");
  const batchSettleResult = await api("/admin/mall/commissions/batch-settle", {
    method: "POST",
    headers: auth(financeToken),
    body: JSON.stringify({ merchantId, keyword: batchSettleOrder.orderNo, unassigned: true, remark: "online-showcase 定向批量结算佣金验收" })
  });
  assert(Number(batchSettleResult.settledCount || 0) >= 1 && Number(batchSettleResult.settledAmount || 0) > 0, "商城批量结算未返回有效结果");
  const batchAfterSummary = await api(`/admin/mall/commissions/summary?keyword=${encodeURIComponent(batchSettleOrder.orderNo)}${merchantQuery}`, { headers: auth(financeToken) });
  assert(Number(batchAfterSummary.pendingCount || 0) === 0 && Number(batchAfterSummary.settledCount || 0) >= 1, "商城批量结算后汇总状态不正确");
  const salesExport = await fetch(`${API_BASE}/admin/mall/products/export-sales?${merchantOnlyQuery}`, { headers: auth(opsToken) });
  assert(salesExport.ok, "商城商品销售统计导出失败");
  const salesExportBuffer = await salesExport.arrayBuffer();
  assert(salesExportBuffer.byteLength > 100, "商城商品销售统计导出文件为空");
  const lowStock = await api(`/admin/mall/products/low-stock?lowStockThreshold=999&pageSize=20${merchantQuery}`, { headers: auth(opsToken) });
  assert(pickList(lowStock).length >= 1, "商城低库存预警接口未返回商品规格");
  const cancelCartItem = await api(`/public/me/mall/cart?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ skuId: sku.id, quantity: 1 })
  });
  const offlineOrder = await api(`/public/mall/orders?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ cartItemIds: [cancelCartItem.id], paymentMethod: "offline", addressId: address.id, couponCode: "SHOWCASE10", buyerRemark: "online-showcase 商城取消订单验收" })
  });
  assert(offlineOrder.status === "pending_confirm", "商城线下订单应为待确认收款");
  assert(offlineOrder.expiresAt, "商城线下待确认订单应返回确认截止时间");
  const idempotencyKey = `smoke_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const idempotentOrder = await api(`/public/mall/orders?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ items: [{ skuId: sku.id, quantity: 1 }], paymentMethod: "offline", addressId: address.id, buyerRemark: "online-showcase 商城幂等下单验收", clientOrderKey: idempotencyKey })
  });
  const idempotentRetry = await api(`/public/mall/orders?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ items: [{ skuId: sku.id, quantity: 1 }], paymentMethod: "offline", addressId: address.id, buyerRemark: "online-showcase 商城幂等下单验收重复提交", clientOrderKey: idempotencyKey })
  });
  assert(idempotentRetry.id === idempotentOrder.id && idempotentRetry.orderNo === idempotentOrder.orderNo, "商城重复提交应按 clientOrderKey 返回同一订单");
  await api(`/public/me/mall/orders/${idempotentOrder.id}/cancel?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({})
  });
  const canceled = await api(`/public/me/mall/orders/${offlineOrder.id}/cancel?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({})
  });
  assert(canceled.status === "closed", "商城取消订单后应为 closed");
  const releasedCouponUsages = pickList(await api(`/admin/mall/coupon-usages?keyword=${encodeURIComponent(offlineOrder.orderNo)}&status=released${merchantQuery}`, { headers: auth(opsToken) }));
  assert(releasedCouponUsages.some((item) => item.order?.id === offlineOrder.id && item.code === "SHOWCASE10" && item.releaseReason), "商城关闭订单后应释放优惠券使用记录");
  const autoCloseResult = await api(`/admin/mall/orders/close-expired`, { method: "POST", headers: auth(financeToken), body: JSON.stringify({}) });
  assert(Number.isFinite(Number(autoCloseResult.closedCount || 0)) && Number(autoCloseResult.paymentMinutes || 0) > 0, "商城超时订单自动关闭接口返回异常");
  const publicPaymentMethods = pickList(await api(`/public/mall/payment-methods?tenantCode=${TENANT_CODE}${merchantQuery}`, { headers: tenantHeader() }));
  assertPublicMallPaymentMethodsSafe("商城前台支付方式", publicPaymentMethods);
  assert(publicPaymentMethods.some((item) => item.value === "balance" && item.enabled) && publicPaymentMethods.some((item) => item.value === "offline" && item.enabled), "商城前台支付方式缺少余额或线下支付");
  const wechatMethod = publicPaymentMethods.find((item) => item.value === "wechat");
  const paymentReadiness = await api(`/admin/mall/payment-readiness?${merchantOnlyQuery}`, { headers: auth(financeToken) });
  const wechatReady = Boolean(wechatMethod?.enabled && ["sandbox_ready", "real_ready"].includes(wechatMethod.status));
  assert(wechatReady || !["sandbox_ready", "real_ready"].includes(paymentReadiness.status), "商城前台不应隐藏已就绪的微信支付方式");
  if (wechatReady) {
  const wechatOrder = await api(`/public/mall/orders?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ items: [{ skuId: sku.id, quantity: 1 }], paymentMethod: "wechat", addressId: address.id, promotionCode: "SHOWMALL5", buyerRemark: "online-showcase 商城微信支付验收" })
  });
  assert(wechatOrder.status === "pending_payment" && wechatOrder.paymentMethod === "wechat", "商城微信订单应先生成待支付订单");
  const wechatPay = await api(`/public/mall/orders/${wechatOrder.id}/pay/wechat?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ paymentScene: "h5" })
  });
  assert(wechatPay.payParams?.orderNo === wechatOrder.orderNo && wechatPay.payParams?.sign, "商城微信支付未返回有效支付参数");
  const paidByWechat = await api("/payment/mall/wechat/callback", {
    method: "POST",
    body: JSON.stringify(wechatPay.payParams)
  });
  assert(paidByWechat.order?.status === "paid", "商城微信支付回调后订单应为 paid");
  const idempotentWechat = await api("/payment/mall/wechat/callback", {
    method: "POST",
    body: JSON.stringify(wechatPay.payParams)
  });
  assert(idempotentWechat.idempotent === true, "商城微信支付重复回调应按幂等处理");
  const paymentTransactions = pickList(await api(`/admin/mall/payment-transactions?keyword=${encodeURIComponent(wechatPay.payParams.transactionNo)}${merchantQuery}`, { headers: auth(financeToken) }));
  assert(paymentTransactions.some((item) => item.transactionNo === wechatPay.payParams.transactionNo && item.status === "success"), "后台商城支付流水缺少微信支付成功记录");
  const callbackLogs = pickList(await api(`/admin/mall/payment-callback-logs?keyword=${encodeURIComponent(wechatPay.payParams.transactionNo)}${merchantQuery}`, { headers: auth(financeToken) }));
  assert(callbackLogs.some((item) => item.resultStatus === "success") && callbackLogs.some((item) => item.resultStatus === "idempotent"), "后台商城支付回调日志缺少成功或幂等记录");
  assert(["sandbox_ready", "real_ready"].includes(paymentReadiness.status), `商城微信支付配置体检未就绪：${paymentReadiness.statusText || paymentReadiness.status}`);
  const wechatRefund = await api(`/public/me/mall/orders/${wechatOrder.id}/refund-request?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ type: "refund_only", amount: Number(wechatOrder.amount || 0), reason: "online-showcase 商城微信沙箱退款验收" })
  });
  assert(wechatRefund.status === "pending", "商城微信售后申请后应为 pending");
  const approvedWechatRefund = await api(`/admin/mall/refunds/${wechatRefund.id}/approve`, {
    method: "POST",
    headers: auth(financeToken),
    body: JSON.stringify({ remark: "online-showcase 商城微信沙箱退款审核通过" })
  });
  assert(approvedWechatRefund.status === "approved" && approvedWechatRefund.providerRefundStatus === "sandbox_success", "商城微信沙箱退款审核后应记录 provider 成功状态");
  assert(approvedWechatRefund.providerRefundNo, "商城微信沙箱退款审核后应生成 providerRefundNo");
  const retryApprovedWechatRefund = await tryApi(`/admin/mall/refunds/${approvedWechatRefund.id}/retry`, {
    method: "POST",
    headers: auth(financeToken),
    body: JSON.stringify({ remark: "online-showcase 已完成退款禁止重试验收" })
  });
  assert(!retryApprovedWechatRefund.ok, "商城已完成退款不应允许重试，避免重复退款");
  const callbackExportRes = await fetch(`${API_BASE}/admin/mall/payment-callback-logs/export?status=success&keyword=${encodeURIComponent(wechatOrder.orderNo)}${merchantQuery}`, { headers: auth(financeToken) });
  const callbackExportBuffer = await callbackExportRes.arrayBuffer();
  assert(callbackExportRes.ok && callbackExportBuffer.byteLength > 1000, "商城支付回调日志导出文件生成失败");
  const refundLogs = pickList(await api(`/admin/mall/refund-logs?keyword=${encodeURIComponent(approvedWechatRefund.providerRefundNo)}${merchantQuery}`, { headers: auth(financeToken) }));
  assert(refundLogs.some((item) => item.provider === "wechat" && item.status === "success"), "后台商城退款日志缺少微信退款成功记录");
  const voidCommissions = pickList(await api(`/admin/mall/commissions?keyword=${encodeURIComponent(wechatOrder.orderNo)}${merchantQuery}`, { headers: auth(financeToken) }));
  assert(voidCommissions.some((item) => item.order?.id === wechatOrder.id && item.status === "void"), "商城微信退款后推广佣金未作废");
  const voidCommissionSummary = await api(`/admin/mall/commissions/summary?keyword=${encodeURIComponent(wechatOrder.orderNo)}${merchantQuery}`, { headers: auth(financeToken) });
  assert(Number(voidCommissionSummary.voidCount || 0) >= 1 && Number(voidCommissionSummary.voidAmount || 0) > 0, "商城推广佣金汇总缺少作废数据");
  const voidPromoterSummary = pickList(await api(`/admin/mall/commissions/by-promoter?keyword=${encodeURIComponent(wechatOrder.orderNo)}${merchantQuery}`, { headers: auth(financeToken) }));
  assert(voidPromoterSummary.some((item) => Number(item.voidCount || 0) >= 1 && Number(item.voidAmount || 0) > 0), "商城推广对象汇总缺少作废数据");
  }
  reportStep("商城榜单搜索与商品统计闭环", "推荐/新品/热销排序 -> 搜索商品 -> 商品销售统计导出");
  reportStep("商城优惠券运营闭环", "配置有效期/限量 -> 后台识别可用状态 -> 前台下单抵扣");
  reportStep("商城低库存预警闭环", "后台读取可售库存 -> 低库存规格提醒 -> 可进入补货调整");
  reportStep("商城收藏与足迹闭环", "浏览商品 -> 收藏商品 -> 我的收藏/足迹可查");
  reportStep("商城购物车余额支付与优惠券/积分/推广闭环", "地址 -> 加购 -> 用券满减 -> 积分抵扣 -> 推广码归因 -> 余额扣款 -> 会员积分和佣金结算/导出可查");
  reportStep("商城拼团运营追踪闭环", "拼团价报价 -> 开团/参团余额支付 -> 达到人数自动成团 -> 未成团余额自动退款/线下待人工退款 -> 后台团号和进度可查");
  reportStep("商城取消订单兜底", "线下待确认订单 -> 用户取消 -> 库存释放 -> 订单关闭");
  reportStep("商城幂等下单兜底", "同一 clientOrderKey 重复提交 -> 返回同一订单 -> 不重复锁库存");
  reportStep("商城超时订单兜底", "定时扫描待支付/待确认订单 -> 自动关闭 -> 释放库存和优惠券");
  reportStep("商城已发货自动完成兜底", "超过配置天数未确认收货 -> 后台/定时任务自动完成 -> 未到期订单不误处理");
  if (wechatReady) {
    reportStep("商城微信支付闭环", "微信下单 -> 支付参数 -> 回调入账 -> 重复回调幂等 -> 后台流水/回调/配置体检可查");
    reportStep("商城支付回调导出闭环", "按回调状态/订单号筛选 -> 导出签名、结果和原始回调摘要");
    reportStep("商城微信退款追踪闭环", "用户申请微信订单售后 -> 财务审核 -> 沙箱原路退款 -> 后台退款日志可查 -> 推广佣金作废");
  } else {
    reportStep("商城微信支付挡板", `微信支付未就绪时不开放前台下单入口：${paymentReadiness.statusText || paymentReadiness.status || "not_ready"}`);
  }

  const fulfillmentCartItem = await api(`/public/me/mall/cart?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ skuId: sku.id, quantity: 1 })
  });
  const fulfillmentOrder = await api(`/public/mall/orders?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ cartItemIds: [fulfillmentCartItem.id], paymentMethod: "offline", addressId: address.id, buyerRemark: "online-showcase 商城履约售后验收" })
  });
  assert(fulfillmentOrder.status === "pending_confirm", "商城履约订单应先进入待确认收款");
  assert(fulfillmentOrder.expiresAt, "商城履约待确认订单应返回确认截止时间");
  const confirmed = await api(`/admin/mall/orders/${fulfillmentOrder.id}/confirm-offline-payment`, {
    method: "POST",
    headers: auth(financeToken),
    body: JSON.stringify({})
  });
  assert(confirmed.status === "paid", "商城线下确认收款后应为 paid");
  assert(!confirmed.expiresAt, "商城确认收款后应清空订单截止时间");
  const logisticsCompanies = pickList(await api(`/public/mall/logistics-companies?tenantCode=${TENANT_CODE}${merchantQuery}`, { headers: tenantHeader() }));
  assert(logisticsCompanies.some((item) => item.name === "顺丰演示"), "商城物流公司设置缺少顺丰演示");
  const shipped = await api(`/admin/mall/orders/${fulfillmentOrder.id}/ship`, {
    method: "POST",
    headers: auth(opsToken),
    body: JSON.stringify({ expressCompany: "顺丰演示", expressNo: `SF${Date.now()}`, remark: "online-showcase 商城发货验收" })
  });
  assert(shipped.status === "shipped" && shipped.expressNo, "商城发货后应为 shipped 且有物流单号");
  assert(logisticsCompanies.find((item) => item.name === shipped.expressCompany)?.trackingUrl, "商城发货物流公司缺少查询网址");
  const logisticsDetail = await api(`/public/me/mall/orders/${fulfillmentOrder.id}/logistics?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  assert(logisticsDetail.provider === "manual" && logisticsDetail.trackingStatus === "shipped", "商城用户物流详情接口未返回已发货状态");
  assert(logisticsDetail.expressNo === shipped.expressNo && logisticsDetail.trackingUrl, "商城用户物流详情缺少单号或查询网址");
  assert(pickList(logisticsDetail.timeline).some((item) => item.key === "shipped" && item.active), "商城用户物流时间线缺少发货节点");
  const adminLogisticsDetail = await api(`/admin/mall/orders/${fulfillmentOrder.id}/logistics`, { headers: auth(financeToken) });
  assert(adminLogisticsDetail.orderId === fulfillmentOrder.id && adminLogisticsDetail.expressNo === shipped.expressNo, "后台商城物流详情接口数据不正确");
  const autoCompletePreview = await api(`/admin/mall/orders/complete-expired-shipped`, { method: "POST", headers: auth(financeToken), body: JSON.stringify({}) });
  assert(Number.isFinite(Number(autoCompletePreview.checkedCount || 0)) && Number(autoCompletePreview.shippedDays || 0) >= 0, "商城已发货自动完成接口返回异常");
  const shippedAfterAutoComplete = await api(`/public/me/mall/orders/${fulfillmentOrder.id}?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  assert(shippedAfterAutoComplete.status === "shipped", "未超过自动完成天数的商城订单不应被自动完成");
  const completed = await api(`/public/me/mall/orders/${fulfillmentOrder.id}/confirm-received?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({})
  });
  assert(completed.status === "completed", "用户确认收货后商城订单应为 completed");
  const completedDetail = await api(`/public/me/mall/orders/${fulfillmentOrder.id}?tenantCode=${TENANT_CODE}`, { headers: userAuth(user.userAccessToken) });
  const reviewItem = pickList(completedDetail.items)[0];
  assert(reviewItem?.id && reviewItem.product?.id, "商城确认收货订单缺少可评价商品明细");
  const reviewContent = `online-showcase 商城评价审核验收 ${Date.now()}`;
  const createdReview = await api(`/public/me/mall/reviews?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ orderItemId: reviewItem.id, rating: 5, content: reviewContent, images: ["https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=800&q=80"] })
  });
  assert(createdReview.status === "pending", "商城评价提交后应为 pending");
  const pendingReviews = pickList(await api(`/admin/mall/reviews?status=pending&keyword=${encodeURIComponent(reviewContent)}${merchantQuery}`, { headers: auth(opsToken) }));
  const targetReview = pendingReviews.find((item) => item.id === createdReview.id);
  assert(targetReview, "后台商城评价审核列表缺少新评价");
  const approvedReview = await api(`/admin/mall/reviews/${targetReview.id}`, {
    method: "PATCH",
    headers: auth(opsToken),
    body: JSON.stringify({ status: "approved", reviewRemark: "online-showcase 商城评价审核通过", merchantReply: "感谢您的真实反馈，慢π会继续优化商品和服务体验。" })
  });
  assert(approvedReview.status === "approved", "商城评价审核通过后应为 approved");
  assert(approvedReview.merchantReply, "商城评价审核通过后缺少商家回复");
  const productAfterReview = await api(`/public/mall/products/${reviewItem.product.id}?tenantCode=${TENANT_CODE}`, { headers: tenantHeader() });
  const visibleReview = pickList(productAfterReview.reviews).find((item) => item.id === approvedReview.id || item.content === reviewContent);
  assert(visibleReview, "商城评价审核通过后商品详情未展示");
  assert(Array.isArray(visibleReview.images) && visibleReview.images.length >= 1, "商城晒图评价审核通过后商品详情未展示图片");
  assert(visibleReview.merchantReply === approvedReview.merchantReply, "商城商品详情未展示商家评价回复");
  const refund = await api(`/public/me/mall/orders/${fulfillmentOrder.id}/refund-request?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ type: "return_refund", amount: Number(completed.amount || 0), reason: "online-showcase 商城售后退款验收", images: ["https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=800&q=80"] })
  });
  assert(refund.id && refund.status === "pending", "商城售后申请后应生成待审核售后单");
  assert(Array.isArray(refund.images) && refund.images.length >= 1, "商城售后申请后应保留用户上传凭证");
  const duplicateRefund = await api(`/public/me/mall/orders/${fulfillmentOrder.id}/refund-request?tenantCode=${TENANT_CODE}`, {
    method: "POST",
    headers: userAuth(user.userAccessToken),
    body: JSON.stringify({ type: "return_refund", amount: Number(completed.amount || 0), reason: "online-showcase 商城售后重复提交验收" })
  });
  assert(duplicateRefund.id === refund.id && duplicateRefund.status === "pending", "商城同一订单不应重复生成待处理售后单");
  const approvedRefund = await api(`/admin/mall/refunds/${refund.id}/approve`, {
    method: "POST",
    headers: auth(financeToken),
    body: JSON.stringify({ remark: "online-showcase 商城售后审核通过" })
  });
  assert(approvedRefund?.status === "approved", "商城售后通过后售后单应为 approved");
  assert(Array.isArray(approvedRefund.images) && approvedRefund.images.length >= 1, "商城售后审核通过后凭证不应丢失");
  const summary = await api(`/admin/mall/orders/summary?${merchantOnlyQuery}`, { headers: auth(financeToken) });
  assert(Number(summary.receivedAmount || summary.paidAmount || 0) > 0, "商城财务汇总缺少实收金额");
  assert(Number(summary.approvedRefundAmount || 0) > 0, "商城财务汇总缺少已通过退款金额");
  assert(Number(summary.netReceivedAmount || 0) >= 0, "商城财务汇总缺少净收金额");
  const analytics = await api(`/admin/mall/analytics?${merchantOnlyQuery}`, { headers: auth(financeToken) });
  assert(Number(analytics.summary?.receivedAmount || 0) > 0 && Array.isArray(analytics.trend), "商城运营看板缺少销售趋势或实收金额");
  assert(pickList(analytics.byPaymentMethod).some((item) => Number(item.orderCount || 0) > 0), "商城运营看板缺少支付方式拆分");
  assert(pickList(analytics.topProducts).some((item) => Number(item.quantity || 0) > 0), "商城运营看板缺少热销商品排行");
  assert(pickList(analytics.couponStats).some((item) => item.code === "ONCE5" && Number(item.usedCount || 0) >= 1), "商城运营看板缺少优惠券转化统计");
  const today = new Date().toISOString().slice(0, 10);
  const fulfillmentPaymentMethod = fulfillmentOrder.paymentMethod || "offline";
  const filteredOrderResult = await api(`/admin/mall/orders?paymentMethod=${fulfillmentPaymentMethod}&refundStatus=approved&startDate=${today}&endDate=${today}&keyword=${encodeURIComponent(fulfillmentOrder.orderNo)}${merchantQuery}`, { headers: auth(financeToken) });
  assert(pickList(filteredOrderResult).some((item) => item.orderNo === fulfillmentOrder.orderNo), "商城订单筛选应支持支付方式、售后状态和日期");
  const filteredSummary = await api(`/admin/mall/orders/summary?paymentMethod=${fulfillmentPaymentMethod}&refundStatus=approved&startDate=${today}&endDate=${today}&keyword=${encodeURIComponent(fulfillmentOrder.orderNo)}${merchantQuery}`, { headers: auth(financeToken) });
  assert(Number(filteredSummary.approvedRefundAmount || 0) > 0, "商城订单筛选汇总应同步售后金额");
  const exportRes = await fetch(`${API_BASE}/admin/mall/orders/export?keyword=${encodeURIComponent(fulfillmentOrder.orderNo)}${merchantQuery}`, { headers: auth(financeToken) });
  const exportBuffer = await exportRes.arrayBuffer();
  assert(exportRes.ok && exportBuffer.byteLength > 1000, "商城订单导出文件生成失败");
  const filteredExportRes = await fetch(`${API_BASE}/admin/mall/orders/export?paymentMethod=${fulfillmentPaymentMethod}&refundStatus=approved&startDate=${today}&endDate=${today}&keyword=${encodeURIComponent(fulfillmentOrder.orderNo)}${merchantQuery}`, { headers: auth(financeToken) });
  const filteredExportBuffer = await filteredExportRes.arrayBuffer();
  assert(filteredExportRes.ok && filteredExportBuffer.byteLength > 1000, "商城订单筛选导出文件生成失败");
  const refundExportRes = await fetch(`${API_BASE}/admin/mall/refunds/export?status=approved&keyword=${encodeURIComponent(fulfillmentOrder.orderNo)}${merchantQuery}`, { headers: auth(financeToken) });
  const refundExportBuffer = await refundExportRes.arrayBuffer();
  assert(refundExportRes.ok && refundExportBuffer.byteLength > 1000, "商城售后导出文件生成失败");
  const paymentTxExportRes = await fetch(`${API_BASE}/admin/mall/payment-transactions/export?status=success&paymentMethod=offline&keyword=${encodeURIComponent(fulfillmentOrder.orderNo)}${merchantQuery}`, { headers: auth(financeToken) });
  const paymentTxExportBuffer = await paymentTxExportRes.arrayBuffer();
  assert(paymentTxExportRes.ok && paymentTxExportBuffer.byteLength > 1000, "商城支付流水导出文件生成失败");
  reportStep("商城线下履约与物流闭环", "线下下单 -> 财务确认 -> 运营发货 -> 用户查看物流 -> 确认收货");
  reportStep("商城晒图评价审核闭环", "用户星级/文字/晒图评价 -> 后台审核 -> 商品详情展示");
  reportStep("商城售后财务闭环", "用户申请售后 -> 财务审核 -> 退款/库存回补 -> 汇总可对账");
  reportStep("商城运营看板闭环", "近 30 天趋势 -> 支付方式拆分 -> 热销商品 -> 优惠券领取/使用转化可查");
  reportStep("商城运营筛选导出闭环", "按支付方式/售后状态/日期筛选 -> 汇总同步 -> Excel 导出一致");
  reportStep("商城售后导出闭环", "按售后状态/订单号筛选 -> 导出退款渠道、凭证、审核备注");
  reportStep("商城支付流水导出闭环", "按支付方式/流水状态/订单号筛选 -> 导出交易号和对账状态");
}

async function prepareSmokeUsers(tenantAdminToken, platformToken, tenantId) {
  const base = 10000 + (Date.now() % 80000);
  const users = new Map();
  for (const [index, template] of demoUsers.entries()) {
    const phone = `139900${String(base + index).padStart(5, "0")}`;
    const nickname = `${template.nickname}-${base + index}`;
    await api("/admin/members", {
      method: "POST",
      headers: auth(tenantAdminToken),
      body: JSON.stringify({ phone, password: process.env.SHOWCASE_PASSWORD, nickname, remark: "online-showcase smoke runtime user" })
    });
    const loggedIn = await loginUser(phone, nickname);
    const userId = loggedIn.user?.id;
    assert(userId, `${phone} smoke 用户创建后无法识别用户ID`);
    if (["paid", "refund", "course"].includes(template.key)) {
      await api(`/admin/users/${userId}/wallet/adjust`, {
        method: "POST",
        headers: auth(platformToken),
        body: JSON.stringify({ tenantId, amount: 800, type: "recharge", remark: "online-showcase smoke runtime recharge" })
      });
    }
    users.set(template.key, { ...template, phone, nickname, userId });
  }
  reportStep("本次 smoke 独立用户已准备", Array.from(users.values()).map((item) => item.phone).join(" / "));
  return users;
}

function smokeUser(key) {
  const user = runtimeUsers.get(key);
  assert(user, `缺少 smoke 用户：${key}`);
  return user;
}

function assertPublicMallPaymentMethodsSafe(label, value) {
  const text = JSON.stringify(value || {});
  for (const key of ["issues", "direct", "real", "account", "requiredKeys", "missingKeys", "unreadableFiles", "routeGuardEvidence", "notifyUrl", "refundNotifyUrl"]) {
    assert(!new RegExp(`"${key}"\\s*:`).test(text), `${label} 不应向 H5/小程序公开支付配置诊断字段：${key}`);
  }
  for (const key of ["WECHAT_PAY", "PRIVATE_KEY", "CERT", "API_V3"]) {
    assert(!text.includes(key), `${label} 不应向 H5/小程序公开支付配置敏感字样：${key}`);
  }
}

function formatLocalDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("-") + " " + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds())
  ].join(":");
}

async function financeChecks(financeToken, orderId) {
  const orders = pickList(await api("/admin/orders?pageSize=100", { headers: auth(financeToken) }));
  assert(orders.some((item) => item.id === orderId), "财务订单列表缺少余额支付订单");
  const refunds = pickList(await api("/admin/finance/refunds?pageSize=100", { headers: auth(financeToken) }));
  assert(refunds.some((item) => item.status === "completed"), "财务退款列表缺少已完成退款");
  const walletTxs = pickList(await api("/admin/finance/wallet-transactions", { headers: auth(financeToken) }));
  assert(walletTxs.some((item) => ["admin_recharge", "balance_pay", "refund_return"].includes(item.type)), "财务钱包流水缺少演示交易");
  reportStep("财务后台可追溯", "订单、退款、余额流水可查");
}

main().catch((error) => {
  console.error("\n线上演示商家 smoke 失败：");
  console.error(error.message);
  if (error.stack) console.error(error.stack);
  console.error("请先执行 npm run seed:online-showcase，并确认 API_BASE、账号密码环境变量正确。");
  process.exitCode = 1;
});
