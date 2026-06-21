<template>
  <view class="detail-page">
    <image v-if="product.coverUrl" class="hero-img" :src="product.coverUrl" mode="aspectFill" />
    <view v-else class="hero-img placeholder">七维书院严选</view>
    <view class="card">
      <view class="top-row">
        <text v-if="product.brandName" class="brand">{{ product.brandName }}</text>
        <view class="favorite-btn" :class="{ active: favorited }" @click.stop="toggleFavorite">{{ favorited ? "已收藏" : "收藏" }}</view>
      </view>
      <text class="title">{{ product.title }}</text>
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
        <view v-for="sku in product.skus || []" :key="sku.id" class="sku" :class="{ active: sku.id === skuId, disabled: !availableStock(sku) }" @click="selectSku(sku)">{{ sku.name }} · {{ availableStock(sku) ? `库存 ${availableStock(sku)}` : "已售罄" }}</view>
      </view>
      <text class="desc">{{ product.description || "暂无详情说明" }}</text>
      <view class="note">配送：{{ product.deliveryNote || "默认快递发货" }}</view>
      <view class="note">售后：{{ product.afterSaleNote || "未发货可申请退款" }}</view>
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
        <view v-if="item.merchantReply" class="merchant-reply">
          <text class="reply-label">商家回复</text>
          <text class="reply-content">{{ item.merchantReply }}</text>
        </view>
      </view>
    </view>
    <view class="bottom-bar">
      <view class="qty">
        <text @click="quantity = Math.max(1, quantity - 1)">-</text>
        <text>{{ quantity }}</text>
        <text @click="increaseQty">+</text>
      </view>
      <view class="cart-btn" :class="{ disabled: !canBuy }" @click="addCart">{{ canBuy ? "加入购物车" : "已售罄" }}</view>
      <view class="buy-btn" :class="{ disabled: !canBuy }" @click="goCheckout">{{ canBuy ? "立即购买" : "不可购买" }}</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { ensureUser, request, withTenantCode } from "../../api";

const product = ref<any>({});
const skuId = ref(0);
const quantity = ref(1);
const favorited = ref(false);
const flashSales = ref<any[]>([]);
const groupBuys = ref<any[]>([]);
const groupBuyTeams = ref<any[]>([]);
const reviews = computed(() => product.value.reviews || []);
const currentSku = computed(() => (product.value.skus || []).find((item: any) => item.id === skuId.value) || (product.value.skus || [])[0]);
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
async function load(id: number) {
  try {
    product.value = await request<any>(`/public/mall/products/${id}`);
    skuId.value = product.value.skus?.[0]?.id || 0;
    recordBrowse(id);
    loadFavoriteStatus(id);
    loadFlashSales();
    loadGroupBuys();
  } catch (error: any) {
    uni.showToast({ title: error.message || "商品不存在", icon: "none" });
  }
}
async function loadFlashSales() {
  flashSales.value = await request<any[]>(`/public/mall/flash-sales${activityScopeQuery()}`).then((rows) => rows.filter((item) => item.product?.id === product.value.id)).catch(() => []);
}
async function loadGroupBuys() {
  groupBuys.value = await request<any[]>(`/public/mall/group-buys${activityScopeQuery()}`).then((rows) => rows.filter((item) => item.product?.id === product.value.id)).catch(() => []);
  await loadGroupBuyTeams();
}
async function loadGroupBuyTeams() {
  const group = currentGroupBuy.value;
  groupBuyTeams.value = group ? await request<any[]>(`/public/mall/group-buys/${group.id}/teams${activityScopeQuery()}`).catch(() => []) : [];
}
function activityScopeQuery() {
  const merchantId = product.value.merchant?.id || currentSku.value?.merchant?.id || 0;
  return merchantId ? `?merchantId=${merchantId}` : "";
}
async function loadFavoriteStatus(id: number) {
  try {
    await ensureUser();
    const result = await request<any>(`/public/me/mall/products/${id}/favorite`);
    favorited.value = Boolean(result.favorited);
  } catch {
    favorited.value = false;
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
  if (!product.value.id) return;
  try {
    await ensureUser();
    const result = await request<any>(`/public/me/mall/products/${product.value.id}/favorite`, { method: "POST" });
    favorited.value = Boolean(result.favorited);
    uni.showToast({ title: favorited.value ? "已收藏" : "已取消收藏", icon: "none" });
  } catch (error: any) {
    uni.showToast({ title: error.message || "操作失败", icon: "none" });
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
  if (!currentSku.value) return uni.showToast({ title: "暂无可购买规格", icon: "none" });
  if (availableStock(currentSku.value) < quantity.value) return uni.showToast({ title: "库存不足", icon: "none" });
  try {
    await ensureUser();
    await request("/public/me/mall/cart", { method: "POST", data: { skuId: currentSku.value.id, quantity: quantity.value } });
    uni.showToast({ title: "已加入购物车", icon: "none" });
  } catch (error: any) {
    uni.showToast({ title: error.message || "加入失败", icon: "none" });
  }
}
onLoad((query) => load(Number(query?.id || 0)));
</script>

<style scoped>
.detail-page { min-height:100vh; background:#f8fafc; padding-bottom:130rpx; }
.hero-img { width:100%; height:560rpx; background:#fed7aa; display:grid; place-items:center; color:#9a3412; font-weight:900; }
.card { margin: -34rpx 24rpx 24rpx; background:#fff; border-radius:32rpx; padding:30rpx; position:relative; box-shadow:0 16rpx 40rpx rgba(15,23,42,.08); }
.top-row { display:flex; align-items:center; justify-content:space-between; gap:16rpx; margin-bottom:14rpx; }
.brand { display:inline-flex; width:fit-content; margin-bottom:14rpx; padding:8rpx 16rpx; border-radius:999rpx; color:#9a3412; background:#fff7ed; font-size:24rpx; font-weight:900; }
.top-row .brand { margin-bottom:0; }
.favorite-btn { padding:10rpx 20rpx; border-radius:999rpx; background:#f1f5f9; color:#475569; font-size:24rpx; font-weight:900; }
.favorite-btn.active { background:#fff7ed; color:#c2410c; }
.title { font-size:40rpx; font-weight:900; color:#111827; line-height:1.3; }
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
.reply-label { font-size:22rpx; font-weight:900; color:#c2410c; }
.reply-content { font-size:25rpx; line-height:1.55; }
.bottom-bar { position:fixed; left:0; right:0; bottom:0; background:#fff; padding:18rpx 28rpx 34rpx; display:flex; gap:16rpx; box-shadow:0 -10rpx 30rpx rgba(15,23,42,.08); }
.qty { display:flex; align-items:center; justify-content:space-around; width:190rpx; border-radius:999px; background:#f1f5f9; font-size:32rpx; font-weight:900; }
.cart-btn { flex:1; height:86rpx; border-radius:999px; background:#fff7ed; color:#9a3412; border:1rpx solid #fed7aa; display:flex; align-items:center; justify-content:center; font-size:28rpx; font-weight:900; }
.buy-btn { flex:1; height:86rpx; border-radius:999px; background:linear-gradient(135deg,#9a3412,#ea580c); color:#fff; display:flex; align-items:center; justify-content:center; font-size:30rpx; font-weight:900; }
.cart-btn.disabled, .buy-btn.disabled { opacity:.45; background:#e2e8f0; color:#64748b; border-color:#e2e8f0; }
</style>
