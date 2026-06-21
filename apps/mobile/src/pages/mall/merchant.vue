<template>
  <view class="merchant-page has-custom-nav">
    <view class="merchant-hero">
      <image v-if="merchant.logoUrl" class="merchant-logo" :src="merchant.logoUrl" mode="aspectFill" />
      <view v-else class="merchant-logo placeholder">店</view>
      <view class="merchant-info">
        <text class="merchant-kicker">{{ ownerText(merchant.ownerType) }}</text>
        <text class="merchant-title">{{ merchant.name || "商城店铺" }}</text>
        <text class="merchant-meta">{{ merchant.region || "全国发货" }} · {{ merchant.productCount || products.length }} 件在售</text>
      </view>
    </view>

    <view class="merchant-actions">
      <view class="action primary" @click="goCart">购物车</view>
      <view class="action" @click="goCoupons">领券中心</view>
      <view class="action" @click="goMall">全部店铺</view>
    </view>

    <view v-if="merchant.notice" class="notice-card">
      <text class="notice-title">店铺公告</text>
      <text class="notice-copy">{{ merchant.notice }}</text>
    </view>

    <view v-if="flashSales.length" class="deal-section flash-section">
      <view class="section-head">
        <view>
          <text class="section-kicker">本店限时福利</text>
          <text class="section-title">秒杀专区</text>
        </view>
        <text class="section-more">库存实时锁定</text>
      </view>
      <scroll-view scroll-x :show-scrollbar="false" class="deal-scroll">
        <view v-for="sale in flashSales" :key="sale.id" class="deal-card">
          <image v-if="sale.product?.coverUrl" class="deal-cover" :src="sale.product.coverUrl" mode="aspectFill" />
          <view v-else class="deal-cover placeholder">秒杀</view>
          <view class="deal-body">
            <text class="deal-title">{{ sale.title }}</text>
            <text class="deal-product">{{ sale.product?.title }} / {{ sale.sku?.name }}</text>
            <view class="deal-price-row">
              <text class="deal-price">¥{{ money(sale.salePrice) }}</text>
              <text class="deal-origin">¥{{ money(sale.originalPrice) }}</text>
            </view>
            <view class="deal-meta">
              <text>剩 {{ sale.availableStock }} 件</text>
              <text>限购 {{ sale.perUserLimit || 1 }}</text>
            </view>
            <view class="deal-btn" @click.stop="goFlashCheckout(sale)">马上抢</view>
          </view>
        </view>
      </scroll-view>
    </view>

    <view v-if="groupBuys.length" class="deal-section group-section">
      <view class="section-head">
        <view>
          <text class="section-kicker">多人更划算</text>
          <text class="section-title">拼团优选</text>
        </view>
        <text class="section-more">按店铺独立成团</text>
      </view>
      <scroll-view scroll-x :show-scrollbar="false" class="deal-scroll">
        <view v-for="group in groupBuys" :key="group.id" class="deal-card">
          <image v-if="group.product?.coverUrl" class="deal-cover" :src="group.product.coverUrl" mode="aspectFill" />
          <view v-else class="deal-cover placeholder">拼团</view>
          <view class="deal-body">
            <text class="deal-title">{{ group.title }}</text>
            <text class="deal-product">{{ group.product?.title }} / {{ group.sku?.name }}</text>
            <view class="deal-price-row">
              <text class="deal-price">¥{{ money(group.groupPrice) }}</text>
              <text class="deal-origin">¥{{ money(group.originalPrice) }}</text>
            </view>
            <view class="deal-meta">
              <text>{{ group.minPeople || 2 }} 人团</text>
              <text>剩 {{ group.availableStock }} 件</text>
            </view>
            <view class="deal-btn" @click.stop="goGroupBuyCheckout(group)">去拼团</view>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="toolbar">
      <input v-model="keyword" confirm-type="search" placeholder="搜索本店商品或品牌" @confirm="load" />
      <view class="search-btn" @click="load">搜索</view>
    </view>

    <scroll-view class="category-row" scroll-x :show-scrollbar="false">
      <view class="category-chip" :class="{ active: !categoryId }" @click="selectCategory(0)">全部</view>
      <view v-for="item in categories" :key="item.id" class="category-chip" :class="{ active: categoryId === item.id }" @click="selectCategory(item.id)">{{ item.name }}</view>
    </scroll-view>

    <view class="sort-row">
      <view v-for="item in sortTabs" :key="item.value" class="sort-chip" :class="{ active: sort === item.value }" @click="selectSort(item.value)">{{ item.label }}</view>
    </view>

    <view class="product-grid">
      <view v-for="item in products" :key="item.id" class="product-card" @click="goDetail(item)">
        <view v-if="item.featured" class="featured-badge">推荐</view>
        <view v-if="!availableProductStock(item)" class="soldout-badge">售罄</view>
        <image v-if="item.coverUrl" class="cover" :src="item.coverUrl" mode="aspectFill" />
        <view v-else class="cover placeholder">书院好物</view>
        <text v-if="item.brandName" class="brand">{{ item.brandName }}</text>
        <text class="title">{{ item.title }}</text>
        <view class="row">
          <view class="price-stack">
            <text class="price">¥{{ money(item.price) }}</text>
            <text v-if="Number(item.originalPrice || 0) > Number(item.price || 0)" class="origin">¥{{ money(item.originalPrice) }}</text>
          </view>
          <text class="stock" :class="{ soldout: !availableProductStock(item) }">{{ availableProductStock(item) ? `库存 ${availableProductStock(item)}` : "已售罄" }}</text>
        </view>
      </view>
    </view>

    <EmptyState v-if="!products.length && !loading" icon="店" text="本店暂无上架商品" />
    <view style="height:80rpx;"></view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { request, withTenantCode } from "../../api";
import EmptyState from "../../components/EmptyState.vue";

const merchantId = ref(0);
const merchant = ref<any>({});
const categories = ref<any[]>([]);
const products = ref<any[]>([]);
const flashSales = ref<any[]>([]);
const groupBuys = ref<any[]>([]);
const categoryId = ref(0);
const keyword = ref("");
const loading = ref(false);
const sort = ref<"featured" | "newest" | "hot">("featured");
const sortTabs = [
  { label: "推荐", value: "featured" as const },
  { label: "新品", value: "newest" as const },
  { label: "热销", value: "hot" as const }
];

function money(value: any) { return Number(value || 0).toFixed(2); }
function availableProductStock(item: any) { return Math.max(Number(item.stock || 0), 0); }
function ownerText(value: string) { return value === "agent" ? "代理授权店铺" : "商家直营网店"; }

async function load() {
  if (!merchantId.value) {
    uni.showToast({ title: "缺少店铺信息", icon: "none" });
    return;
  }
  loading.value = true;
  try {
    const [detail, categoryRows] = await Promise.all([
      request<any>(`/public/mall/merchants/${merchantId.value}`),
      request<any[]>(`/public/mall/categories?merchantId=${merchantId.value}`).catch(() => [])
    ]);
    merchant.value = detail || {};
    categories.value = Array.isArray(categoryRows) ? categoryRows : [];
    const activityScope = `?merchantId=${merchantId.value}`;
    const [flashRows, groupRows] = await Promise.all([
      request<any[]>(`/public/mall/flash-sales${activityScope}`).catch(() => []),
      request<any[]>(`/public/mall/group-buys${activityScope}`).catch(() => [])
    ]);
    flashSales.value = Array.isArray(flashRows) ? flashRows : [];
    groupBuys.value = Array.isArray(groupRows) ? groupRows : [];
    const params = [`merchantId=${merchantId.value}`, "pageSize=50", `sort=${sort.value}`];
    if (categoryId.value) params.push(`categoryId=${categoryId.value}`);
    const searchText = keyword.value.trim();
    if (searchText) params.push(`keyword=${encodeURIComponent(searchText)}`);
    const result = await request<any>(`/public/mall/products?${params.join("&")}`);
    products.value = result.items || [];
  } catch (error: any) {
    flashSales.value = [];
    groupBuys.value = [];
    products.value = [];
    uni.showToast({ title: error.message || "加载店铺失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}

function selectCategory(id: number) {
  categoryId.value = id;
  load();
}

function selectSort(value: "featured" | "newest" | "hot") {
  sort.value = value;
  load();
}

function goDetail(item: any) { uni.navigateTo({ url: withTenantCode(`/pages/mall/detail?id=${item.id}`) }); }
function goFlashCheckout(sale: any) { uni.navigateTo({ url: withTenantCode(`/pages/mall/checkout?skuId=${sale.sku?.id || sale.skuId}&quantity=1&flashSaleId=${sale.id}`) }); }
function goGroupBuyCheckout(group: any) { uni.navigateTo({ url: withTenantCode(`/pages/mall/checkout?skuId=${group.sku?.id || group.skuId}&quantity=1&groupBuyId=${group.id}`) }); }
function goCart() { uni.navigateTo({ url: withTenantCode("/pages/mall/cart") }); }
function goCoupons() {
  const query = merchantId.value ? `?merchantId=${merchantId.value}` : "";
  uni.navigateTo({ url: withTenantCode(`/pages/mall/coupons${query}`) });
}
function goMall() { uni.navigateTo({ url: withTenantCode("/pages/mall/index") }); }

onLoad((query) => {
  merchantId.value = Number(query?.id || query?.merchantId || 0);
  keyword.value = String(query?.keyword || "").trim();
});

onShow(load);
</script>

<style scoped>
.merchant-page { min-height:100vh; padding:24rpx 28rpx; background:linear-gradient(180deg,#fff7ed 0%,#f8fafc 52%,#fff 100%); }
.merchant-hero { display:flex; align-items:center; gap:22rpx; padding:30rpx; border-radius:34rpx; background:linear-gradient(135deg,#0f172a,#7c2d12 62%,#ea580c); color:#fff; box-shadow:0 18rpx 42rpx rgba(124,45,18,.16); }
.merchant-logo { width:124rpx; height:124rpx; border-radius:28rpx; background:#fed7aa; color:#9a3412; display:flex; align-items:center; justify-content:center; font-size:46rpx; font-weight:900; flex:0 0 auto; }
.merchant-logo.placeholder { background:rgba(255,247,237,.95); }
.merchant-info { min-width:0; display:grid; gap:8rpx; }
.merchant-kicker { width:fit-content; padding:6rpx 14rpx; border-radius:999rpx; background:rgba(255,255,255,.16); color:#fed7aa; font-size:22rpx; font-weight:900; }
.merchant-title { color:#fff; font-size:40rpx; font-weight:900; line-height:1.2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.merchant-meta { color:rgba(255,255,255,.76); font-size:24rpx; }
.merchant-actions { display:flex; gap:12rpx; flex-wrap:wrap; margin:20rpx 0; }
.action { padding:14rpx 24rpx; border-radius:999rpx; background:#fff; color:#9a3412; border:1rpx solid rgba(154,52,18,.12); font-size:24rpx; font-weight:900; box-shadow:0 10rpx 24rpx rgba(124,45,18,.05); }
.action.primary { background:#9a3412; color:#fff; border-color:#9a3412; }
.notice-card { margin-bottom:20rpx; padding:20rpx 22rpx; border-radius:26rpx; background:#fff; border:1rpx solid rgba(154,52,18,.08); box-shadow:0 12rpx 28rpx rgba(124,45,18,.05); }
.notice-title { display:block; color:#9a3412; font-size:24rpx; font-weight:900; }
.notice-copy { display:block; margin-top:8rpx; color:#475569; font-size:26rpx; line-height:1.55; }
.deal-section { margin:18rpx 0 24rpx; padding:22rpx; border-radius:30rpx; background:linear-gradient(135deg,#111827,#7f1d1d 56%,#ea580c); color:#fff; box-shadow:0 18rpx 42rpx rgba(127,29,29,.16); overflow:hidden; }
.group-section { background:linear-gradient(135deg,#0f172a,#0f766e 58%,#f59e0b); box-shadow:0 18rpx 42rpx rgba(15,118,110,.14); }
.section-head { display:flex; align-items:flex-end; justify-content:space-between; gap:16rpx; margin-bottom:18rpx; }
.section-kicker { display:block; color:#fed7aa; font-size:22rpx; font-weight:900; letter-spacing:4rpx; }
.section-title { display:block; margin-top:4rpx; color:#fff; font-size:34rpx; font-weight:900; }
.section-more { color:rgba(255,255,255,.72); font-size:23rpx; }
.deal-scroll { white-space:nowrap; }
.deal-card { display:inline-flex; width:610rpx; margin-right:18rpx; padding:14rpx; border-radius:24rpx; background:rgba(255,255,255,.12); border:1rpx solid rgba(255,255,255,.18); backdrop-filter:blur(12rpx); vertical-align:top; }
.deal-cover { width:180rpx; height:180rpx; border-radius:18rpx; background:#fed7aa; color:#9a3412; display:flex; align-items:center; justify-content:center; font-weight:900; flex:0 0 auto; }
.deal-body { min-width:0; flex:1; padding-left:18rpx; display:grid; gap:8rpx; }
.deal-title { color:#fff; font-size:29rpx; font-weight:900; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.deal-product { color:rgba(255,255,255,.72); font-size:23rpx; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.deal-price-row { display:flex; align-items:baseline; gap:10rpx; }
.deal-price { color:#fff7ed; font-size:40rpx; font-weight:900; }
.deal-origin { color:rgba(255,255,255,.48); font-size:23rpx; text-decoration:line-through; }
.deal-meta { display:flex; gap:10rpx; flex-wrap:wrap; color:#fed7aa; font-size:22rpx; font-weight:800; }
.deal-btn { width:fit-content; margin-top:2rpx; padding:12rpx 22rpx; border-radius:999rpx; background:#fff7ed; color:#9a3412; font-size:24rpx; font-weight:900; }
.toolbar { display:flex; gap:14rpx; align-items:center; margin-bottom:20rpx; }
.toolbar input { flex:1; height:76rpx; padding:0 24rpx; border-radius:999rpx; background:#fff; color:#1f2937; font-size:26rpx; box-shadow:0 10rpx 24rpx rgba(124,45,18,.06); }
.search-btn { height:76rpx; padding:0 28rpx; border-radius:999rpx; background:#9a3412; color:#fff; display:flex; align-items:center; justify-content:center; font-size:26rpx; font-weight:900; }
.category-row { margin:0 0 18rpx; white-space:nowrap; }
.category-chip { display:inline-flex; padding:14rpx 26rpx; margin-right:14rpx; border-radius:999rpx; background:#fff; color:#9a3412; border:1rpx solid rgba(154,52,18,.14); font-size:25rpx; font-weight:800; }
.category-chip.active { background:#9a3412; color:#fff; }
.sort-row { display:flex; gap:12rpx; align-items:center; flex-wrap:wrap; margin-bottom:18rpx; }
.sort-chip { padding:10rpx 18rpx; border-radius:999rpx; background:#fff; color:#9a3412; border:1rpx solid rgba(154,52,18,.12); font-size:24rpx; font-weight:800; }
.sort-chip.active { background:#9a3412; color:#fff; border-color:#9a3412; }
.product-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:18rpx; }
.product-card { position:relative; background:#fff; border-radius:24rpx; padding:14rpx; box-shadow:0 12rpx 30rpx rgba(124,45,18,.08); overflow:hidden; }
.featured-badge { position:absolute; z-index:2; top:22rpx; left:22rpx; padding:6rpx 14rpx; border-radius:999rpx; color:#fff; background:linear-gradient(135deg,#dc2626,#f97316); font-size:21rpx; font-weight:900; }
.soldout-badge { position:absolute; z-index:2; top:22rpx; right:22rpx; padding:6rpx 14rpx; border-radius:999rpx; color:#fff; background:rgba(15,23,42,.72); font-size:21rpx; font-weight:900; }
.cover { width:100%; height:230rpx; border-radius:18rpx; background:#fed7aa; display:grid; place-items:center; color:#9a3412; font-size:26rpx; font-weight:900; }
.brand { display:inline-flex; width:fit-content; margin-top:14rpx; padding:6rpx 12rpx; border-radius:999rpx; color:#9a3412; background:#fff7ed; font-size:21rpx; font-weight:800; }
.title { display:block; margin-top:14rpx; font-size:28rpx; font-weight:800; color:#1f2937; min-height:72rpx; line-height:1.3; }
.row { display:flex; justify-content:space-between; align-items:center; margin-top:10rpx; gap:10rpx; }
.price-stack { display:flex; align-items:baseline; gap:8rpx; flex-wrap:wrap; }
.price { color:#c2410c; font-size:32rpx; font-weight:900; }
.origin { color:#cbd5e1; font-size:22rpx; text-decoration:line-through; }
.stock { color:#94a3b8; font-size:22rpx; }
.stock.soldout { color:#64748b; font-weight:800; }
</style>
