<template>
  <view class="detail-page">
    <SplashAd />
    <view v-if="loading" class="page-state" role="status" aria-live="polite">商品详情加载中...</view>
    <view v-else-if="loadError" class="page-state error-state" role="alert" aria-live="assertive">
      <text>{{ loadError }}</text>
      <view class="state-retry" role="button" tabindex="0" aria-label="重新加载商品详情" @click="reload" @keyup.enter="reload" @keyup.space.prevent="reload">重新加载</view>
    </view>
    <template v-else-if="product">
    <swiper v-if="gallery.length" class="hero-swiper" indicator-dots circular>
      <swiper-item v-for="image in gallery" :key="image"><image class="hero-img" :src="image" mode="aspectFill" /></swiper-item>
    </swiper>
    <view v-else class="hero-img placeholder">慢π严选</view>
    <view class="card">
      <view class="top-row">
        <text v-if="product.brand?.name || product.brandName" class="brand">{{ product.brand?.name || product.brandName }}</text>
        <view class="favorite-btn" :class="{ active: favorited, disabled: Boolean(activeAction) }" role="button" tabindex="0" :aria-pressed="favorited" :aria-busy="activeAction === 'favorite'" :aria-label="favorited ? '取消收藏商品' : '收藏商品'" @click.stop="toggleFavorite" @keyup.enter.stop="toggleFavorite" @keyup.space.stop.prevent="toggleFavorite">{{ activeAction === "favorite" ? "处理中..." : favorited ? "已收藏" : "收藏" }}</view>
      </view>
      <text class="title">{{ product.title }}</text>
      <text class="catalog-meta">{{ product.productCode || "" }}{{ product.platformCategory?.name ? ` · ${product.platformCategory.name}` : "" }}</text>
      <view v-if="product.merchant?.name" class="merchant-box" @click="goMerchant">
        <view>
          <text class="merchant-name">{{ product.merchant.name }}</text>
          <text class="merchant-meta">{{ product.merchant.ownerType === "agent" ? "代理店铺" : "商家店铺" }}{{ product.merchant.region ? ` · ${product.merchant.region}` : "" }}</text>
        </view>
        <text class="merchant-link">进店 ›</text>
      </view>
      <view class="price-row">
        <text class="price">¥{{ money(currentSku?.price || product.price) }}</text>
        <text v-if="Number(currentSku?.originalPrice || product.originalPrice) > 0" class="origin">¥{{ money(currentSku?.originalPrice || product.originalPrice) }}</text>
      </view>
      <view class="sku-list">
        <view v-for="sku in product.skus || []" :key="sku.id" class="sku" :class="{ active: sku.id === skuId, disabled: !availableStock(sku) }" @click="selectSku(sku)"><text>{{ sku.name }} · {{ availableStock(sku) ? `库存 ${availableStock(sku)}` : "已售罄" }}</text><text v-if="attributeText(sku.attributes)" class="sku-attrs">{{ attributeText(sku.attributes) }}</text></view>
      </view>
      <view v-if="attributeRows.length" class="attribute-list"><view v-for="item in attributeRows" :key="item.key" class="attribute-row"><text>{{ item.key }}</text><text>{{ item.value }}</text></view></view>
      <text class="desc">{{ product.description || "暂无详情说明" }}</text>
      <view v-for="(block, index) in product.detailBlocks || []" :key="index" class="detail-block"><image v-if="block.type === 'image' && block.url" :src="block.url" mode="widthFix" /><text v-else>{{ block.content || block.text || "" }}</text></view>
      <view class="note">配送：{{ product.deliveryNote || "默认快递发货" }}</view>
      <view class="note">售后：{{ product.afterSaleNote || "未发货可申请退款" }}</view>
    </view>
    <view class="detail-ad-wrap">
      <AdSlotRenderer slot-key="mall_product_detail_middle" page-key="mall_product_detail" />
    </view>
    <view v-if="promotionWarning" class="page-state warning-state">
      <text>{{ promotionWarning }}</text>
      <view class="state-retry" @click="loadPromotions">重新同步优惠</view>
    </view>
    <view v-if="currentFlashSale" class="card flash-card">
      <view class="section-head">
        <view>
          <text class="flash-kicker">限时福利</text>
          <text class="section-title">{{ currentFlashSale.title }}</text>
        </view>
        <text class="flash-pill">限购 {{ currentFlashSale.perUserLimit || 1 }} 件</text>
      </view>
      <view class="group-price-row">
        <text class="group-price">秒杀价 ¥{{ money(currentFlashSale.salePrice) }}</text>
        <text class="group-origin">原价 ¥{{ money(currentSku?.price || product.price) }}</text>
      </view>
      <view class="group-meta">
        <text>剩余 {{ currentFlashSale.availableStock || 0 }} 件</text>
        <text>截止 {{ dateText(currentFlashSale.endsAt) }}</text>
      </view>
      <view class="flash-action" @click="goFlashSale">马上抢</view>
    </view>
    <view v-if="currentGroupBuy" class="card group-card">
      <view class="section-head">
        <view>
          <text class="group-kicker">多人更划算</text>
          <text class="section-title">{{ currentGroupBuy.title }}</text>
        </view>
        <text class="group-pill">{{ currentGroupBuy.minPeople || 2 }} 人团</text>
      </view>
      <view class="group-price-row">
        <text class="group-price">拼团价 ¥{{ money(currentGroupBuy.groupPrice) }}</text>
        <text class="group-origin">单买 ¥{{ money(currentSku?.price || product.price) }}</text>
      </view>
      <view class="group-meta">
        <text>剩余 {{ currentGroupBuy.availableStock || 0 }} 件</text>
        <text>截止 {{ dateText(currentGroupBuy.endsAt) }}</text>
      </view>
      <view v-if="groupBuyTeams.length" class="team-list">
        <view v-for="team in groupBuyTeams" :key="team.teamNo" class="team-row">
          <view>
            <text class="team-title">{{ team.leaderName }} 的团</text>
            <text class="team-sub">已拼 {{ team.paidPeople }} / {{ team.minPeople }} 人，还差 {{ team.remainingPeople }} 人</text>
          </view>
          <view class="team-btn" @click="joinGroupBuy(team)">去参团</view>
        </view>
      </view>
      <view class="group-action" @click="startGroupBuy">我要开团</view>
    </view>
    <view class="card reviews-card">
      <view class="section-head">
        <text class="section-title">用户评价</text>
        <text class="section-sub">{{ reviews.length ? `${reviews.length} 条已审核` : "暂无已审核评价" }}</text>
      </view>
      <view v-for="item in reviews" :key="item.id" class="review-item">
        <view class="review-row">
          <text class="stars">{{ "★".repeat(Number(item.rating || 5)) }}</text>
          <text class="review-user">{{ maskUser(item.user?.phone || item.user?.nickname) }}</text>
        </view>
        <text class="review-content">{{ item.content }}</text>
        <view v-if="item.images?.length" class="review-images">
          <image v-for="image in item.images" :key="image" class="review-image" :src="image" mode="aspectFill" />
        </view>
        <view v-if="item.appendContent" class="review-append"><text class="reply-label">用户追评</text><text class="review-content">{{ item.appendContent }}</text></view>
        <view v-if="item.merchantReply" class="merchant-reply">
          <text class="reply-label">商家回复</text>
          <text class="reply-content">{{ item.merchantReply }}</text>
        </view>
        <text class="review-report" :class="{ disabled: activeAction.startsWith('report') }" @click="reportReview(item)">{{ activeAction === `report-${item.id}` ? "提交中" : "举报" }}</text>
      </view>
    </view>
    <view class="bottom-bar">
      <view class="qty">
        <text @click="quantity = Math.max(1, quantity - 1)">-</text>
        <text>{{ quantity }}</text>
        <text @click="increaseQty">+</text>
      </view>
      <view class="cart-btn" :class="{ disabled: !canBuy || Boolean(activeAction) }" role="button" tabindex="0" :aria-disabled="!canBuy || Boolean(activeAction)" :aria-busy="activeAction === 'add-cart'" aria-label="加入购物车" @click="addCart" @keyup.enter="addCart" @keyup.space.prevent="addCart">{{ activeAction === "add-cart" ? "加入中..." : (canBuy ? "加入购物车" : "已售罄") }}</view>
      <view class="buy-btn" :class="{ disabled: !canBuy || Boolean(activeAction) }" role="button" tabindex="0" :aria-disabled="!canBuy || Boolean(activeAction)" aria-label="立即购买" @click="goCheckout" @keyup.enter="goCheckout" @keyup.space.prevent="goCheckout">{{ canBuy ? "立即购买" : "不可购买" }}</view>
    </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { ensureUser, request, withTenantCode } from "../../api";
import AdSlotRenderer from "../../components/AdSlotRenderer.vue";
import SplashAd from "../../components/SplashAd.vue";
import { createTenantLoadGuard } from "../../tenant-load-guard";

const product = ref<any | null>(null);
const productId = ref(0);
const skuId = ref(0);
const quantity = ref(1);
const favorited = ref(false);
const flashSales = ref<any[]>([]);
const groupBuys = ref<any[]>([]);
const groupBuyTeams = ref<any[]>([]);
const loading = ref(true);
const loadError = ref("");
const promotionWarning = ref("");
const activeAction = ref("");
const productLoadGuard = createTenantLoadGuard();
const promotionLoadGuard = createTenantLoadGuard();
const teamLoadGuard = createTenantLoadGuard();
const favoriteLoadGuard = createTenantLoadGuard();
const cartActionGuard = createTenantLoadGuard();
const reviews = computed(() => product.value?.reviews || []);
const gallery = computed(() => (product.value?.galleryUrls || []).filter(Boolean).length ? product.value?.galleryUrls.filter(Boolean) : product.value?.coverUrl ? [product.value.coverUrl] : []);
const attributeRows = computed(() => Object.entries(product.value?.attributes || {}).map(([key, value]) => ({ key, value })));
const currentSku = computed(() => (product.value?.skus || []).find((item: any) => item.id === skuId.value) || (product.value?.skus || [])[0]);
const currentStock = computed(() => currentSku.value ? availableStock(currentSku.value) : 0);
const currentFlashSale = computed(() => flashSales.value.find((item) => (item.sku?.id || item.skuId) === skuId.value && item.runtimeStatus === "active"));
const currentGroupBuy = computed(() => groupBuys.value.find((item) => (item.sku?.id || item.skuId) === skuId.value && item.runtimeStatus === "active"));
const canBuy = computed(() => currentStock.value > 0);
function money(value: any) { return Number(value || 0).toFixed(2); }
function dateText(value: any) { return value ? String(value).slice(0, 10) : "-"; }
function maskUser(value: any) {
  const text = String(value || "用户");
  return /^1\d{10}$/.test(text) ? `${text.slice(0, 3)}****${text.slice(-4)}` : text;
}
function availableStock(sku: any) {
  if (sku?.availableStock !== undefined && sku?.availableStock !== null) return Math.max(Number(sku.availableStock || 0), 0);
  return Math.max(Number(sku?.stock || 0) - Number(sku?.lockedStock || 0), 0);
}
async function reportReview(item: any) {
  if (!item?.id || activeAction.value) return;
  activeAction.value = `report-${item.id}-prompt`;
  try {
    await ensureUser();
  } catch (error: any) {
    activeAction.value = "";
    return uni.showToast({ title: error?.message || "请先登录", icon: "none" });
  }
  uni.showModal({
    title: "举报评价",
    editable: true,
    placeholderText: "请填写举报原因",
    success: async (result) => {
      if (!result.confirm) {
        activeAction.value = "";
        return;
      }
      const reason = String(result.content || "").trim();
      if (!reason) {
        activeAction.value = "";
        return uni.showToast({ title: "请填写举报原因", icon: "none" });
      }
      activeAction.value = `report-${item.id}`;
      try {
        await request(`/public/me/mall/reviews/${item.id}/report`, { method: "POST", data: { reason, images: [] } });
        uni.showToast({ title: "举报已提交", icon: "none" });
      } catch (error: any) { uni.showToast({ title: error.message || "举报失败", icon: "none" }); }
      finally { activeAction.value = ""; }
    },
    fail: () => { activeAction.value = ""; }
  });
}
function attributeText(value: any) { return Object.entries(value || {}).map(([key, item]) => `${key}:${item}`).join(" · "); }
async function load(id: number) {
  const token = productLoadGuard.begin();
  promotionLoadGuard.invalidate();
  teamLoadGuard.invalidate();
  favoriteLoadGuard.invalidate();
  loading.value = true;
  loadError.value = "";
  promotionWarning.value = "";
  product.value = null;
  flashSales.value = [];
  groupBuys.value = [];
  groupBuyTeams.value = [];
  try {
    if (!id) throw new Error("缺少商品ID");
    const result = await request<any>(`/public/mall/products/${id}`);
    if (!productLoadGuard.isCurrent(token)) return;
    if (!result?.id) throw new Error("商品不存在或已下架");
    product.value = result;
    skuId.value = result.skus?.[0]?.id || 0;
    void recordBrowse(id);
    void loadFavoriteStatus(id);
    void loadPromotions();
  } catch (error: any) {
    if (productLoadGuard.isCurrent(token)) loadError.value = error.message || "商品详情加载失败，请稍后重试。";
  } finally {
    if (productLoadGuard.isCurrent(token)) loading.value = false;
  }
}
async function loadPromotions() {
  if (!product.value?.id) return;
  const token = promotionLoadGuard.begin();
  const currentProductId = product.value.id;
  promotionWarning.value = "";
  const scopeQuery = activityScopeQuery();
  const [flashResult, groupResult] = await Promise.allSettled([
    request<any[]>(`/public/mall/flash-sales${scopeQuery}`),
    request<any[]>(`/public/mall/group-buys${scopeQuery}`)
  ]);
  if (!promotionLoadGuard.isCurrent(token) || product.value?.id !== currentProductId) return;
  flashSales.value = flashResult.status === "fulfilled" ? flashResult.value.filter((item) => item.product?.id === currentProductId) : [];
  groupBuys.value = groupResult.status === "fulfilled" ? groupResult.value.filter((item) => item.product?.id === currentProductId) : [];
  const failures = [flashResult, groupResult].filter((result) => result.status === "rejected").length;
  promotionWarning.value = failures ? "部分优惠活动暂未同步，商品价格与库存仍以结算页为准。" : "";
  await loadGroupBuyTeams();
}
async function loadGroupBuyTeams() {
  const token = teamLoadGuard.begin();
  const group = currentGroupBuy.value;
  if (!group) {
    groupBuyTeams.value = [];
    return;
  }
  try {
    const rows = await request<any[]>(`/public/mall/group-buys/${group.id}/teams${activityScopeQuery()}`);
    if (teamLoadGuard.isCurrent(token) && currentGroupBuy.value?.id === group.id) groupBuyTeams.value = rows;
  } catch {
    if (teamLoadGuard.isCurrent(token)) {
      groupBuyTeams.value = [];
      promotionWarning.value = "拼团进度暂未同步，开团和参团请稍后重试。";
    }
  }
}
function activityScopeQuery() {
  const merchantId = product.value?.merchant?.id || currentSku.value?.merchant?.id || 0;
  return merchantId ? `?merchantId=${merchantId}` : "";
}
async function loadFavoriteStatus(id: number) {
  const token = favoriteLoadGuard.begin();
  try {
    await ensureUser();
    const result = await request<any>(`/public/me/mall/products/${id}/favorite`);
    if (favoriteLoadGuard.isCurrent(token) && product.value?.id === id) favorited.value = Boolean(result.favorited);
  } catch {
    if (favoriteLoadGuard.isCurrent(token) && product.value?.id === id) favorited.value = false;
  }
}
async function recordBrowse(id: number) {
  try {
    await ensureUser();
    await request(`/public/me/mall/products/${id}/browse`, { method: "POST" });
  } catch {
    // 未登录用户可以继续浏览，登录后再记录足迹。
  }
}
async function toggleFavorite() {
  if (!product.value?.id || activeAction.value) return;
  const token = favoriteLoadGuard.begin();
  const id = product.value.id;
  activeAction.value = "favorite";
  try {
    await ensureUser();
    const result = await request<any>(`/public/me/mall/products/${id}/favorite`, { method: "POST" });
    if (!favoriteLoadGuard.isCurrent(token) || product.value?.id !== id) return;
    favorited.value = Boolean(result.favorited);
    uni.showToast({ title: favorited.value ? "已收藏" : "已取消收藏", icon: "none" });
  } catch (error: any) {
    uni.showToast({ title: error.message || "操作失败", icon: "none" });
  } finally {
    activeAction.value = "";
  }
}
function selectSku(sku: any) {
  skuId.value = sku.id;
  quantity.value = Math.min(quantity.value, Math.max(availableStock(sku), 1));
  loadGroupBuyTeams();
}
function increaseQty() {
  if (!currentSku.value) return;
  if (quantity.value >= currentStock.value) return uni.showToast({ title: "库存不足", icon: "none" });
  quantity.value += 1;
}
function goCheckout() {
  if (!currentSku.value) return uni.showToast({ title: "暂无可购买规格", icon: "none" });
  if (availableStock(currentSku.value) < quantity.value) return uni.showToast({ title: "库存不足", icon: "none" });
  uni.navigateTo({ url: withTenantCode(`/pages/mall/checkout?skuId=${currentSku.value.id}&quantity=${quantity.value}`) });
}
function goMerchant() {
  if (!product.value.merchant?.id) return;
  uni.navigateTo({ url: withTenantCode(`/pages/mall/merchant?id=${product.value.merchant.id}`) });
}
function goFlashSale() {
  const sale = currentFlashSale.value;
  if (!currentSku.value || !sale) return uni.showToast({ title: "当前规格暂无秒杀", icon: "none" });
  uni.navigateTo({ url: withTenantCode(`/pages/mall/checkout?skuId=${currentSku.value.id}&quantity=1&flashSaleId=${sale.id}`) });
}
function startGroupBuy() {
  const group = currentGroupBuy.value;
  if (!currentSku.value || !group) return uni.showToast({ title: "当前规格暂无拼团", icon: "none" });
  uni.navigateTo({ url: withTenantCode(`/pages/mall/checkout?skuId=${currentSku.value.id}&quantity=1&groupBuyId=${group.id}`) });
}
function joinGroupBuy(team: any) {
  const group = currentGroupBuy.value;
  if (!currentSku.value || !group || !team?.teamNo) return uni.showToast({ title: "该团暂不可加入", icon: "none" });
  uni.navigateTo({ url: withTenantCode(`/pages/mall/checkout?skuId=${currentSku.value.id}&quantity=1&groupBuyId=${group.id}&joinTeamNo=${encodeURIComponent(team.teamNo)}`) });
}
async function addCart() {
  if (activeAction.value) return;
  if (!currentSku.value) return uni.showToast({ title: "暂无可购买规格", icon: "none" });
  if (availableStock(currentSku.value) < quantity.value) return uni.showToast({ title: "库存不足", icon: "none" });
  const token = cartActionGuard.begin();
  const skuId = currentSku.value.id;
  const requestedQuantity = quantity.value;
  activeAction.value = "add-cart";
  try {
    await ensureUser();
    await request("/public/me/mall/cart", { method: "POST", data: { skuId, quantity: requestedQuantity } });
    if (!cartActionGuard.isCurrent(token) || currentSku.value?.id !== skuId) return;
    uni.showToast({ title: "已加入购物车", icon: "none" });
  } catch (error: any) {
    if (cartActionGuard.isCurrent(token)) uni.showToast({ title: error.message || "加入失败", icon: "none" });
  } finally {
    if (cartActionGuard.isCurrent(token)) activeAction.value = "";
  }
}
function reload() {
  void load(productId.value);
}
onLoad((query) => { productId.value = Number(query?.id || 0); });
onShow(reload);
</script>

<style scoped>
.detail-page { min-height:100vh; background:#f8fafc; padding-bottom:130rpx; }
.page-state { display:grid; gap:16rpx; margin:24rpx; padding:28rpx; border-radius:8px; background:#fff; color:#64748b; font-size:26rpx; line-height:1.6; }
.page-state.error-state { border:1rpx solid #fecaca; background:#fff7f7; color:#b91c1c; }
.page-state.warning-state { border:1rpx solid #fed7aa; background:#fffaf0; color:#9a3412; }
.state-retry { width:max-content; color:#9a3412; font-weight:900; }
.detail-ad-wrap { margin: 0 24rpx 24rpx; }
.hero-swiper, .hero-img { width:100%; height:560rpx; }
.hero-img { background:#fed7aa; display:grid; place-items:center; color:#9a3412; font-weight:900; }
.card { margin: -34rpx 24rpx 24rpx; background:#fff; border-radius:32rpx; padding:30rpx; position:relative; box-shadow:0 16rpx 40rpx rgba(15,23,42,.08); }
.top-row { display:flex; align-items:center; justify-content:space-between; gap:16rpx; margin-bottom:14rpx; }
.brand { display:inline-flex; width:fit-content; margin-bottom:14rpx; padding:8rpx 16rpx; border-radius:999rpx; color:#9a3412; background:#fff7ed; font-size:24rpx; font-weight:900; }
.top-row .brand { margin-bottom:0; }
.favorite-btn { padding:10rpx 20rpx; border-radius:999rpx; background:#f1f5f9; color:#475569; font-size:24rpx; font-weight:900; }
.favorite-btn.active { background:#fff7ed; color:#c2410c; }
.title { font-size:40rpx; font-weight:900; color:#111827; line-height:1.3; }
.catalog-meta { display:block; margin-top:8rpx; color:#94a3b8; font-size:22rpx; }
.sku-attrs { display:block; margin-top:4rpx; font-size:20rpx; opacity:.72; }
.attribute-list { margin-top:18rpx; border-top:1rpx solid #e5e7eb; }
.attribute-row { display:grid; grid-template-columns:180rpx 1fr; gap:18rpx; padding:16rpx 0; border-bottom:1rpx solid #e5e7eb; color:#475569; font-size:24rpx; }
.detail-block { margin-top:18rpx; color:#475569; font-size:26rpx; line-height:1.7; }
.detail-block image { width:100%; }
.merchant-box { display:flex; justify-content:space-between; align-items:center; gap:16rpx; margin-top:16rpx; padding:16rpx 18rpx; border-radius:20rpx; background:#ecfdf5; color:#0f766e; }
.merchant-name { display:block; font-size:27rpx; font-weight:900; }
.merchant-meta { display:block; margin-top:4rpx; font-size:22rpx; opacity:.75; }
.merchant-link { flex:0 0 auto; padding:8rpx 14rpx; border-radius:999rpx; background:#d1fae5; color:#047857; font-size:22rpx; font-weight:900; }
.price-row { display:flex; gap:14rpx; align-items:baseline; margin-top:18rpx; }
.price { color:#c2410c; font-size:44rpx; font-weight:900; }
.origin { color:#94a3b8; text-decoration:line-through; }
.sku-list { display:flex; flex-wrap:wrap; gap:12rpx; margin:24rpx 0; }
.sku { padding:12rpx 18rpx; border-radius:999px; background:#fff7ed; color:#9a3412; border:1rpx solid #fed7aa; font-size:24rpx; }
.sku.active { background:#9a3412; color:#fff; }
.sku.disabled { color:#94a3b8; background:#f8fafc; border-color:#e2e8f0; }
.desc { color:#475569; font-size:28rpx; line-height:1.7; white-space:pre-line; }
.note { margin-top:16rpx; color:#64748b; font-size:24rpx; }
.flash-card { margin-top:0; background:linear-gradient(135deg,#111827,#7f1d1d 56%,#ea580c); color:#fff; overflow:hidden; }
.flash-card .section-title { display:block; margin-top:4rpx; color:#fff; }
.flash-kicker { display:block; color:#fed7aa; font-size:22rpx; font-weight:900; letter-spacing:4rpx; }
.flash-pill { padding:8rpx 16rpx; border-radius:999rpx; background:rgba(255,255,255,.18); color:#fff; font-size:23rpx; font-weight:900; }
.flash-action { height:76rpx; margin-top:18rpx; border-radius:999rpx; background:#fff7ed; color:#9a3412; display:flex; align-items:center; justify-content:center; font-size:28rpx; font-weight:900; }
.group-card { margin-top:0; background:linear-gradient(135deg,#0f172a,#0f766e 58%,#f59e0b); color:#fff; overflow:hidden; }
.group-card .section-head { margin-bottom:16rpx; }
.group-card .section-title { display:block; margin-top:4rpx; color:#fff; }
.group-kicker { display:block; color:#fde68a; font-size:22rpx; font-weight:900; letter-spacing:4rpx; }
.group-pill { padding:8rpx 16rpx; border-radius:999rpx; background:rgba(255,255,255,.18); color:#fff; font-size:23rpx; font-weight:900; }
.group-price-row { display:flex; align-items:baseline; gap:14rpx; }
.group-price { color:#fff; font-size:38rpx; font-weight:900; }
.group-origin { color:rgba(255,255,255,.66); font-size:24rpx; text-decoration:line-through; }
.group-meta { display:flex; justify-content:space-between; gap:16rpx; margin-top:12rpx; color:rgba(255,255,255,.75); font-size:24rpx; }
.team-list { display:grid; gap:12rpx; margin-top:20rpx; }
.team-row { display:flex; justify-content:space-between; align-items:center; gap:16rpx; padding:16rpx; border-radius:20rpx; background:rgba(255,255,255,.12); border:1rpx solid rgba(255,255,255,.16); }
.team-title { display:block; color:#fff; font-size:27rpx; font-weight:900; }
.team-sub { display:block; margin-top:4rpx; color:rgba(255,255,255,.72); font-size:23rpx; }
.team-btn { flex:0 0 auto; padding:10rpx 18rpx; border-radius:999rpx; background:#fff7ed; color:#9a3412; font-size:24rpx; font-weight:900; }
.group-action { height:76rpx; margin-top:18rpx; border-radius:999rpx; background:#fff; color:#0f766e; display:flex; align-items:center; justify-content:center; font-size:28rpx; font-weight:900; }
.reviews-card { margin-top:0; }
.section-head { display:flex; justify-content:space-between; align-items:center; gap:16rpx; margin-bottom:10rpx; }
.section-title { color:#1f2937; font-size:30rpx; font-weight:900; }
.section-sub { color:#94a3b8; font-size:23rpx; }
.review-item { padding:18rpx 0; border-top:1rpx solid #f1f5f9; }
.review-row { display:flex; justify-content:space-between; align-items:center; gap:16rpx; }
.stars { color:#f59e0b; font-size:26rpx; letter-spacing:2rpx; }
.review-user { color:#94a3b8; font-size:23rpx; }
.review-content { display:block; margin-top:10rpx; color:#334155; font-size:26rpx; line-height:1.55; }
.review-images { display:flex; gap:10rpx; margin-top:12rpx; }
.review-image { width:120rpx; height:120rpx; border-radius:16rpx; background:#f1f5f9; }
.merchant-reply { margin-top:14rpx; padding:16rpx; border-radius:18rpx; background:#fff7ed; color:#7c2d12; display:grid; gap:6rpx; }
.review-append { margin-top:14rpx; padding:16rpx; background:#f8fafc; border-left:6rpx solid #0f766e; }
.review-report { display:block; width:fit-content; margin-top:12rpx; color:#94a3b8; font-size:23rpx; }
.review-report.disabled { opacity:.55; pointer-events:none; }
.reply-label { font-size:22rpx; font-weight:900; color:#c2410c; }
.reply-content { font-size:25rpx; line-height:1.55; }
.bottom-bar { position:fixed; left:0; right:0; bottom:0; background:#fff; padding:18rpx 28rpx 34rpx; display:flex; gap:16rpx; box-shadow:0 -10rpx 30rpx rgba(15,23,42,.08); }
.qty { display:flex; align-items:center; justify-content:space-around; width:190rpx; border-radius:999px; background:#f1f5f9; font-size:32rpx; font-weight:900; }
.cart-btn { flex:1; height:86rpx; border-radius:999px; background:#fff7ed; color:#9a3412; border:1rpx solid #fed7aa; display:flex; align-items:center; justify-content:center; font-size:28rpx; font-weight:900; }
.buy-btn { flex:1; height:86rpx; border-radius:999px; background:linear-gradient(135deg,#9a3412,#ea580c); color:#fff; display:flex; align-items:center; justify-content:center; font-size:30rpx; font-weight:900; }
.cart-btn.disabled, .buy-btn.disabled { opacity:.45; background:#e2e8f0; color:#64748b; border-color:#e2e8f0; }
</style>
