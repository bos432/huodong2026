<template>
  <view class="mall-page has-custom-nav">
    <view class="mall-hero">
      <text class="eyebrow">慢π严选</text>
      <text class="hero-title">把课程、活动和好物放进同一个慢π服务闭环</text>
      <text class="hero-sub">支持余额支付与线下收款，订单状态后台可追踪。</text>
      <view class="hero-actions">
        <view class="hero-action" @click="goCart">购物车 / 地址 / 订单结算</view>
        <view class="hero-action secondary" @click="goCoupons">领券中心 / 我的券包</view>
      </view>
    </view>
    <PageDecorationBlocks :sections="decorationSections" />
    <scroll-view class="category-row" scroll-x :show-scrollbar="false">
      <view class="category-chip" :class="{ active: !categoryId }" @click="selectCategory(0)">全部</view>
      <view v-for="item in categories" :key="item.id" class="category-chip" :class="{ active: categoryId === item.id }" @click="selectCategory(item.id)">{{ item.name }}</view>
    </scroll-view>
    <view class="store-section">
      <view class="section-head compact">
        <view>
          <text class="section-kicker dark">多商户商城</text>
          <text class="section-title dark">选择店铺逛好物</text>
        </view>
        <text class="section-more dark">{{ selectedMerchantId ? "当前店铺货架" : "全部店铺商品流" }}</text>
      </view>
      <scroll-view class="merchant-row" scroll-x :show-scrollbar="false">
        <view class="merchant-chip" :class="{ active: !selectedMerchantId }" @click="selectMerchant(0)">
          <text class="merchant-name">全部店铺</text>
          <text class="merchant-meta">跨店购物车可合并结算</text>
        </view>
        <view v-for="merchant in merchants" :key="merchant.id" class="merchant-chip" :class="{ active: selectedMerchantId === merchant.id }" @click="selectMerchant(merchant.id)">
          <text class="merchant-name">{{ merchant.name }}</text>
          <text class="merchant-meta">{{ merchant.ownerType === "agent" ? "代理店铺" : "商家店铺" }}{{ merchant.region ? ` · ${merchant.region}` : "" }}</text>
          <text class="merchant-entry" @click.stop="goMerchant(merchant)">进店 ›</text>
        </view>
      </scroll-view>
    </view>
    <view class="search-row">
      <input v-model="keyword" confirm-type="search" placeholder="搜索商品或品牌" @confirm="load" />
      <view class="search-btn" @click="load">搜索</view>
    </view>
    <view v-if="recentKeywords.length" class="recent-row">
      <text class="recent-label">最近搜：</text>
      <text v-for="item in recentKeywords" :key="item" class="recent-chip" @click="useRecent(item)">{{ item }}</text>
    </view>
    <view class="sort-row">
      <view v-for="item in sortTabs" :key="item.value" class="sort-chip" :class="{ active: sort === item.value }" @click="selectSort(item.value)">{{ item.label }}</view>
    </view>
    <view v-if="flashSales.length" class="flash-section">
      <view class="section-head">
        <view>
          <text class="section-kicker">限时福利</text>
          <text class="section-title">今日秒杀</text>
        </view>
        <text class="section-more">库存锁定，售完即止</text>
      </view>
      <scroll-view scroll-x :show-scrollbar="false" class="flash-scroll">
        <view v-for="sale in flashSales" :key="sale.id" class="flash-card">
          <image v-if="sale.product?.coverUrl" class="flash-cover" :src="sale.product.coverUrl" mode="aspectFill" />
          <view v-else class="flash-cover placeholder">秒杀</view>
          <view class="flash-body">
            <text class="flash-title">{{ sale.title }}</text>
            <text class="flash-product">{{ sale.product?.title }} / {{ sale.sku?.name }}</text>
            <view class="flash-price-row">
              <text class="flash-price">¥{{ money(sale.salePrice) }}</text>
              <text class="flash-origin">¥{{ money(sale.originalPrice) }}</text>
            </view>
            <view class="flash-stock">
              <text>仅剩 {{ sale.availableStock }} 件</text>
              <text>限购 {{ sale.perUserLimit || 1 }}</text>
            </view>
            <view class="flash-btn" @click.stop="goFlashCheckout(sale)">马上抢</view>
          </view>
        </view>
      </scroll-view>
    </view>
    <view v-if="groupBuys.length" class="flash-section group-section">
      <view class="section-head">
        <view>
          <text class="section-kicker">多人更划算</text>
          <text class="section-title">拼团优选</text>
        </view>
        <text class="section-more">团购价成交，库存可追踪</text>
      </view>
      <scroll-view scroll-x :show-scrollbar="false" class="flash-scroll">
        <view v-for="group in groupBuys" :key="group.id" class="flash-card">
          <image v-if="group.product?.coverUrl" class="flash-cover" :src="group.product.coverUrl" mode="aspectFill" />
          <view v-else class="flash-cover placeholder">拼团</view>
          <view class="flash-body">
            <text class="flash-title">{{ group.title }}</text>
            <text class="flash-product">{{ group.product?.title }} / {{ group.sku?.name }}</text>
            <view class="flash-price-row">
              <text class="flash-price">¥{{ money(group.groupPrice) }}</text>
              <text class="flash-origin">¥{{ money(group.originalPrice) }}</text>
            </view>
            <view class="flash-stock">
              <text>{{ group.minPeople || 2 }} 人团</text>
              <text>剩 {{ group.availableStock }} 件</text>
            </view>
            <view class="flash-btn" @click.stop="goGroupBuyCheckout(group)">去拼团</view>
          </view>
        </view>
      </scroll-view>
    </view>
    <view class="product-grid">
      <view v-for="item in products" :key="item.id" class="product-card" @click="goDetail(item)">
        <view v-if="item.featured" class="featured-badge">推荐</view>
        <view v-if="sort === 'hot' && Number(item.salesCount || 0) > 0" class="hot-badge">已售 {{ item.salesCount }}</view>
        <view v-if="!availableProductStock(item)" class="soldout-badge">售罄</view>
        <image v-if="item.coverUrl" class="cover" :src="item.coverUrl" mode="aspectFill" />
        <view v-else class="cover placeholder">慢π好物</view>
        <text v-if="item.brandName" class="brand">{{ item.brandName }}</text>
        <text v-if="item.merchant?.name" class="merchant-tag">{{ item.merchant.name }}</text>
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
    <EmptyState v-if="!products.length && !loading" icon="🛍" text="暂无商品，请在后台商城商品中上架" />
    <view style="height:120rpx;"></view>
    <TabBar current="index" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { request, withTenantCode } from "../../api";
import { usePageDecoration } from "../../decoration";
import EmptyState from "../../components/EmptyState.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";
import TabBar from "../../components/TabBar.vue";

const categories = ref<any[]>([]);
const products = ref<any[]>([]);
const merchants = ref<any[]>([]);
const flashSales = ref<any[]>([]);
const groupBuys = ref<any[]>([]);
const categoryId = ref(0);
const selectedMerchantId = ref(0);
const loading = ref(false);
const keyword = ref("");
const sort = ref<"featured" | "newest" | "hot">("featured");
const recentKeywords = ref<string[]>([]);
const sortTabs = [
  { label: "推荐", value: "featured" as const },
  { label: "新品", value: "newest" as const },
  { label: "热销", value: "hot" as const }
];
const { contentSections, loadDecoration } = usePageDecoration("mall_home", "/pages/mall/index");
const decorationSections = computed(() => contentSections.value.filter((section) => {
  if (section.type === "hero" && section.title === "商城首页") return false;
  if (section.type === "rich_text" && section.title === "页面说明") return false;
  return true;
}));

function money(value: any) { return Number(value || 0).toFixed(2); }
function availableProductStock(item: any) { return Math.max(Number(item.stock || 0), 0); }
async function load() {
  loading.value = true;
  try {
    merchants.value = await request<any[]>("/public/mall/merchants").catch(() => []);
    const scope = selectedMerchantId.value ? `merchantId=${selectedMerchantId.value}` : "";
    categories.value = await request<any[]>(`/public/mall/categories${scope ? `?${scope}` : ""}`).catch(() => []);
    const activityScope = selectedMerchantId.value ? `?merchantId=${selectedMerchantId.value}` : "";
    flashSales.value = await request<any[]>(`/public/mall/flash-sales${activityScope}`).catch(() => []);
    groupBuys.value = await request<any[]>(`/public/mall/group-buys${activityScope}`).catch(() => []);
    const params = [`pageSize=50`];
    params.push(`sort=${sort.value}`);
    if (selectedMerchantId.value) params.push(`merchantId=${selectedMerchantId.value}`);
    if (categoryId.value) params.push(`categoryId=${categoryId.value}`);
    const searchText = keyword.value.trim();
    if (searchText) {
      params.push(`keyword=${encodeURIComponent(searchText)}`);
      saveRecentKeyword(searchText);
    }
    const result = await request<any>(`/public/mall/products?${params.join("&")}`);
    products.value = result.items || [];
  } catch (error: any) {
    products.value = [];
    uni.showToast({ title: error.message || "加载商城失败", icon: "none" });
  } finally {
    loading.value = false;
  }
}
function selectCategory(id: number) { categoryId.value = id; load(); }
function selectMerchant(id: number) {
  selectedMerchantId.value = id;
  categoryId.value = 0;
  load();
}
function selectSort(value: "featured" | "newest" | "hot") { sort.value = value; load(); }
function saveRecentKeyword(value: string) {
  recentKeywords.value = [value, ...recentKeywords.value.filter((item) => item !== value)].slice(0, 5);
  uni.setStorageSync("mall_recent_keywords", JSON.stringify(recentKeywords.value));
}
function useRecent(value: string) {
  keyword.value = value;
  load();
}
function goDetail(item: any) { uni.navigateTo({ url: withTenantCode(`/pages/mall/detail?id=${item.id}`) }); }
function goMerchant(item: any) { if (item?.id) uni.navigateTo({ url: withTenantCode(`/pages/mall/merchant?id=${item.id}`) }); }
function goFlashCheckout(sale: any) { uni.navigateTo({ url: withTenantCode(`/pages/mall/checkout?skuId=${sale.sku?.id || sale.skuId}&quantity=1&flashSaleId=${sale.id}`) }); }
function goGroupBuyCheckout(group: any) { uni.navigateTo({ url: withTenantCode(`/pages/mall/checkout?skuId=${group.sku?.id || group.skuId}&quantity=1&groupBuyId=${group.id}`) }); }
function goCart() { uni.navigateTo({ url: withTenantCode("/pages/mall/cart") }); }
function goCoupons() { uni.navigateTo({ url: withTenantCode("/pages/mall/coupons") }); }
onShow(() => {
  try {
    const stored = JSON.parse(String(uni.getStorageSync("mall_recent_keywords") || "[]"));
    recentKeywords.value = Array.isArray(stored) ? stored.slice(0, 5) : [];
  } catch {
    recentKeywords.value = [];
  }
  loadDecoration();
  load();
});
</script>

<style scoped>
.mall-page { min-height: 100vh; padding: 24rpx 28rpx; background: linear-gradient(180deg, #fff7ed 0%, #f8fafc 46%, #fff 100%); }
.mall-hero { padding: 36rpx 30rpx; border-radius: 32rpx; background: linear-gradient(135deg, #7c2d12, #c2410c); color: #fff; display: grid; gap: 12rpx; }
.eyebrow { font-size: 24rpx; opacity: .84; }
.hero-title { font-size: 40rpx; font-weight: 900; line-height: 1.25; }
.hero-sub { font-size: 25rpx; opacity: .82; }
.hero-actions { display:flex; flex-wrap:wrap; gap:12rpx; margin-top:8rpx; }
.hero-action { width: fit-content; padding: 14rpx 24rpx; border-radius: 999px; background: rgba(255,255,255,.18); font-size: 24rpx; font-weight: 800; }
.hero-action.secondary { background: rgba(255,247,237,.92); color:#9a3412; }
.category-row { margin: 24rpx 0; white-space: nowrap; }
.category-chip { display: inline-flex; padding: 14rpx 26rpx; margin-right: 14rpx; border-radius: 999px; background: #fff; color: #9a3412; border: 1rpx solid rgba(154,52,18,.14); font-size: 25rpx; }
.category-chip.active { background: #9a3412; color: #fff; }
.search-row { display:flex; gap:14rpx; align-items:center; margin-bottom:22rpx; }
.search-row input { flex:1; height:76rpx; padding:0 24rpx; border-radius:999rpx; background:#fff; color:#1f2937; font-size:26rpx; box-shadow:0 10rpx 24rpx rgba(124,45,18,.06); }
.search-btn { height:76rpx; padding:0 28rpx; border-radius:999rpx; background:#9a3412; color:#fff; display:flex; align-items:center; justify-content:center; font-size:26rpx; font-weight:900; }
.recent-row, .sort-row { display:flex; gap:12rpx; align-items:center; flex-wrap:wrap; margin-bottom:18rpx; }
.recent-label { color:#94a3b8; font-size:23rpx; }
.recent-chip, .sort-chip { padding:10rpx 18rpx; border-radius:999rpx; background:#fff; color:#9a3412; border:1rpx solid rgba(154,52,18,.12); font-size:24rpx; font-weight:800; }
.sort-chip.active { background:#9a3412; color:#fff; border-color:#9a3412; }
.flash-section { margin: 18rpx 0 26rpx; padding: 22rpx; border-radius: 30rpx; background: linear-gradient(135deg, #111827, #7f1d1d 56%, #ea580c); box-shadow: 0 18rpx 42rpx rgba(127,29,29,.18); color:#fff; overflow:hidden; }
.group-section { background: linear-gradient(135deg, #0f172a, #0f766e 58%, #f59e0b); box-shadow: 0 18rpx 42rpx rgba(15,118,110,.16); }
.section-head { display:flex; align-items:flex-end; justify-content:space-between; gap:16rpx; margin-bottom:18rpx; }
.section-head.compact { margin-bottom:14rpx; }
.section-kicker { display:block; color:#fed7aa; font-size:22rpx; font-weight:900; letter-spacing:4rpx; }
.section-kicker.dark { color:#9a3412; }
.section-title { display:block; margin-top:4rpx; color:#fff; font-size:34rpx; font-weight:900; }
.section-title.dark { color:#1f2937; }
.section-more { color:rgba(255,255,255,.72); font-size:23rpx; }
.section-more.dark { color:#94a3b8; }
.store-section { margin: 0 0 22rpx; padding: 22rpx; border-radius: 30rpx; background: rgba(255,255,255,.82); border: 1rpx solid rgba(154,52,18,.08); box-shadow: 0 14rpx 32rpx rgba(124,45,18,.06); }
.merchant-row { white-space: nowrap; }
.merchant-chip { display:inline-grid; gap:6rpx; min-width:250rpx; max-width:330rpx; margin-right:14rpx; padding:18rpx 20rpx; border-radius:24rpx; background:#fff7ed; color:#9a3412; border:1rpx solid #fed7aa; vertical-align:top; }
.merchant-chip.active { background:linear-gradient(135deg,#7c2d12,#ea580c); color:#fff; border-color:transparent; box-shadow:0 14rpx 30rpx rgba(194,65,12,.18); }
.merchant-name { font-size:27rpx; font-weight:900; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.merchant-meta { font-size:22rpx; opacity:.72; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.merchant-entry { width:fit-content; margin-top:4rpx; padding:6rpx 14rpx; border-radius:999rpx; background:rgba(255,255,255,.72); color:#9a3412; font-size:21rpx; font-weight:900; }
.merchant-chip.active .merchant-entry { background:rgba(255,247,237,.22); color:#fff7ed; }
.flash-scroll { white-space:nowrap; }
.flash-card { display:inline-flex; width:610rpx; margin-right:18rpx; padding:14rpx; border-radius:24rpx; background:rgba(255,255,255,.12); border:1rpx solid rgba(255,255,255,.18); backdrop-filter: blur(12rpx); vertical-align:top; }
.flash-cover { width:180rpx; height:180rpx; border-radius:18rpx; background:#fed7aa; color:#9a3412; display:flex; align-items:center; justify-content:center; font-weight:900; flex:0 0 auto; }
.flash-body { min-width:0; flex:1; padding-left:18rpx; display:grid; gap:8rpx; }
.flash-title { color:#fff; font-size:29rpx; font-weight:900; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.flash-product { color:rgba(255,255,255,.72); font-size:23rpx; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.flash-price-row { display:flex; align-items:baseline; gap:10rpx; }
.flash-price { color:#fff7ed; font-size:40rpx; font-weight:900; }
.flash-origin { color:rgba(255,255,255,.48); font-size:23rpx; text-decoration:line-through; }
.flash-stock { display:flex; gap:10rpx; flex-wrap:wrap; color:#fed7aa; font-size:22rpx; font-weight:800; }
.flash-btn { width:fit-content; margin-top:2rpx; padding:12rpx 22rpx; border-radius:999rpx; background:#fff7ed; color:#9a3412; font-size:24rpx; font-weight:900; }
.product-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18rpx; }
.product-card { position: relative; background: #fff; border-radius: 24rpx; padding: 14rpx; box-shadow: 0 12rpx 30rpx rgba(124,45,18,.08); overflow: hidden; }
.featured-badge { position: absolute; z-index: 2; top: 22rpx; left: 22rpx; padding: 6rpx 14rpx; border-radius: 999rpx; color: #fff; background: linear-gradient(135deg, #dc2626, #f97316); font-size: 21rpx; font-weight: 900; box-shadow: 0 8rpx 20rpx rgba(220, 38, 38, .22); }
.hot-badge { position:absolute; z-index:2; top:22rpx; left:22rpx; padding:6rpx 14rpx; border-radius:999rpx; color:#fff; background:linear-gradient(135deg,#0f766e,#14b8a6); font-size:21rpx; font-weight:900; box-shadow:0 8rpx 20rpx rgba(15,118,110,.22); }
.soldout-badge { position:absolute; z-index:2; top:22rpx; right:22rpx; padding:6rpx 14rpx; border-radius:999rpx; color:#fff; background:rgba(15,23,42,.72); font-size:21rpx; font-weight:900; }
.cover { width: 100%; height: 230rpx; border-radius: 18rpx; background: #fed7aa; display: grid; place-items: center; color: #9a3412; font-size: 26rpx; font-weight: 900; }
.brand { display: inline-flex; width: fit-content; margin-top: 14rpx; padding: 6rpx 12rpx; border-radius: 999rpx; color: #9a3412; background: #fff7ed; font-size: 21rpx; font-weight: 800; }
.merchant-tag { display:inline-flex; width:fit-content; margin-top:10rpx; padding:5rpx 11rpx; border-radius:999rpx; color:#0f766e; background:#ecfdf5; font-size:21rpx; font-weight:800; }
.title { display: block; margin-top: 14rpx; font-size: 28rpx; font-weight: 800; color: #1f2937; min-height: 72rpx; line-height: 1.3; }
.row { display:flex; justify-content:space-between; align-items:center; margin-top: 10rpx; }
.price-stack { display:flex; align-items:baseline; gap:8rpx; flex-wrap:wrap; }
.price { color: #c2410c; font-size: 32rpx; font-weight: 900; }
.origin { color:#cbd5e1; font-size:22rpx; text-decoration:line-through; }
.stock { color: #94a3b8; font-size: 22rpx; }
.stock.soldout { color:#64748b; font-weight:800; }
</style>
