<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { getCurrentTenantCode, request } from "../../api";
import { usePageDecoration } from "../../decoration";
import { loadPageTheme } from "../../theme";
import TenantSwitcher from "../../components/TenantSwitcher.vue";
import AppBottomNav from "../../components/AppBottomNav.vue";
import PageDecorationBlocks from "../../components/PageDecorationBlocks.vue";

const setting = ref<any>();
const loading = ref(true);
const mounted = ref(false);
const lastLoadedTenantCode = ref("");
const { tenant, bottomNavSection, contentSections, innerPageConfig, innerPageLayout, showBottomNav, loadDecoration } = usePageDecoration("partner_page", "/pages/partner/index");

const contactText = computed(() => {
  const parts = [setting.value?.customerServiceName, setting.value?.customerServiceWechat, setting.value?.customerServicePhone].filter(Boolean);
  return parts.length ? parts.join(" / ") : "请在服务中心配置客服微信或电话";
});

async function load() {
  loading.value = true;
  try {
    setting.value = await request("/public/settings/operation");
  } finally {
    loading.value = false;
  }
}

function copy(text?: string) {
  if (!text) return;
  uni.setClipboardData({ data: text, success: () => uni.showToast({ title: "已复制", icon: "success" }) });
}

function callPhone() {
  const phone = setting.value?.customerServicePhone;
  if (!phone) {
    uni.showToast({ title: "暂无电话", icon: "none" });
    return;
  }
  uni.makePhoneCall({ phoneNumber: phone });
}

async function refreshTenantScopedPage() {
  lastLoadedTenantCode.value = getCurrentTenantCode();
  await Promise.all([load(), loadDecoration()]);
}

async function handleTenantChanged() {
  await loadPageTheme();
  await refreshTenantScopedPage();
}

onMounted(() => {
  mounted.value = true;
  refreshTenantScopedPage();
});

onShow(() => {
  if (!mounted.value) return;
  if (getCurrentTenantCode() === lastLoadedTenantCode.value) return;
  loadPageTheme();
  refreshTenantScopedPage();
});
</script>

<template>
  <view class="partner-page" :class="{ 'has-custom-nav': showBottomNav }">
    <TenantSwitcher :tenant="tenant" title="当前城市" @changed="handleTenantChanged" />

    <view class="hero" :style="{ background: String(innerPageLayout.headerBackgroundColor || '#8e2d28') }">
      <view class="eyebrow">七维文化城市合伙人</view>
      <view class="headline" :style="{ color: String(innerPageLayout.headerTextColor || '#fff8f0') }">{{ innerPageConfig.title || "把一座城市的好活动，装进自己的运营后台" }}</view>
      <view class="desc" :style="{ color: String(innerPageLayout.headerSubtitleColor || 'rgba(255,248,240,0.84)') }">{{ innerPageConfig.subtitle || "适合文化空间、书院、培训机构、书法教室、读书会主理人和本地社群运营者，用 SaaS 后台独立发布活动、管理报名、收款对账和沉淀会员。" }}</view>
      <view class="hero-actions">
        <view class="primary-action" @click="copy(setting?.customerServiceWechat || setting?.customerServicePhone)">咨询合作</view>
        <view class="secondary-action" @click="callPhone">电话沟通</view>
      </view>
    </view>

    <PageDecorationBlocks :sections="contentSections" />

    <view class="section">
      <view class="section-title">合作对象</view>
      <view class="target-grid">
        <view class="target-item">文化空间</view>
        <view class="target-item">书院/读书会</view>
        <view class="target-item">书法美育机构</view>
        <view class="target-item">家庭教育机构</view>
        <view class="target-item">健康养生工作室</view>
        <view class="target-item">创业技能社群</view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">你能获得</view>
      <view class="benefit-list">
        <view class="benefit">
          <view class="benefit-title">独立商家后台</view>
          <view class="benefit-desc">管理自己的活动、报名、订单、会员、公告、首页模块和员工账号。</view>
        </view>
        <view class="benefit">
          <view class="benefit-title">独立收款与财务</view>
          <view class="benefit-desc">绑定自己的收款方式，订单支付到对应商家，后台可查看流水、退款和对账。</view>
        </view>
        <view class="benefit">
          <view class="benefit-title">活动审核与平台背书</view>
          <view class="benefit-desc">平台可统一审核活动与监管合规，帮助城市活动更稳地上线。</view>
        </view>
        <view class="benefit">
          <view class="benefit-title">会员与复购工具</view>
          <view class="benefit-desc">用会员等级、积分、优惠码、优先报名和通知中心提升复购。</view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">首批活动方向</view>
      <view class="activity-stack">
        <view class="activity-card">
          <view class="activity-title">国学 / 东方哲学与传统文化</view>
          <view class="activity-desc">经典导读、节气文化、民俗文化、传统哲学，不做算命、改运、预测类宣传。</view>
        </view>
        <view class="activity-card">
          <view class="activity-title">书法 / 美育</view>
          <view class="activity-desc">硬笔、毛笔、亲子书法、成人美育、作品创作和线下体验课。</view>
        </view>
        <view class="activity-card">
          <view class="activity-title">家庭教育 / 健康养生 / 创业技能</view>
          <view class="activity-desc">每个城市先选择一个更容易变现的方向，跑通活动报名和复购。</view>
        </view>
      </view>
    </view>

    <view class="section">
      <view class="section-title">合作流程</view>
      <view class="steps">
        <view class="step"><text>1</text><view>沟通城市资源、内容方向和首批活动主题</view></view>
        <view class="step"><text>2</text><view>平台开通商家后台、配置权限和收款资料</view></view>
        <view class="step"><text>3</text><view>发布 2-3 场样板活动，完成报名、支付、签到和复盘</view></view>
        <view class="step"><text>4</text><view>按月复盘 GMV、复购、退款和用户反馈，决定扩张节奏</view></view>
      </view>
    </view>

    <view class="section contact">
      <view class="section-title">联系合作</view>
      <view v-if="loading" class="contact-line">加载中...</view>
      <template v-else>
        <view class="contact-line">{{ contactText }}</view>
        <view class="contact-actions">
          <view class="primary-action" @click="copy(setting?.customerServiceWechat || setting?.customerServicePhone)">复制联系方式</view>
          <view class="secondary-action" @click="callPhone">拨打电话</view>
        </view>
      </template>
    </view>

    <AppBottomNav v-if="showBottomNav" :section="bottomNavSection" current-path="/pages/partner/index" />
  </view>
</template>

<style scoped>
.partner-page { min-height: 100vh; padding: 24rpx; background: var(--page-bg-layer, #f5f0e8); background-size: var(--page-bg-size, cover); background-position: var(--page-bg-position, center top); background-attachment: fixed; color: var(--text-color, #333333); }
.partner-page.has-custom-nav { padding-bottom: 160rpx; }
.hero {
  position: relative;
  overflow: hidden;
  padding: 42rpx 30rpx 32rpx;
  border-radius: 24rpx;
  box-shadow: 0 18rpx 44rpx rgba(91, 47, 36, 0.16);
}
.hero::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(34, 24, 19, 0.04), rgba(34, 24, 19, 0.22));
  pointer-events: none;
}
.hero > view {
  position: relative;
  z-index: 1;
}
.eyebrow { color: rgba(255, 248, 240, 0.78); font-size: 25rpx; font-weight: 900; }
.headline { margin-top: 16rpx; color: #fff8f0; font-size: 46rpx; line-height: 1.18; font-weight: 700; font-family: "STKaiti", "KaiTi", serif; }
.desc { margin-top: 18rpx; color: #475467; font-size: 27rpx; line-height: 1.7; }
.hero-actions, .contact-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 18rpx; margin-top: 28rpx; }
.primary-action, .secondary-action { min-height: 82rpx; border-radius: 18rpx; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 900; }
.primary-action { color: #fff; background: #c43d3d; }
.hero .primary-action { background: rgba(255, 248, 240, 0.22); color: #fff8f0; border: 1px solid rgba(255, 248, 240, 0.22); }
.secondary-action { color: #4a6b8a; background: rgba(74, 107, 138, 0.12); }
.hero .secondary-action { color: #fff8f0; background: rgba(255, 248, 240, 0.12); border: 1px solid rgba(255, 248, 240, 0.16); }
.section { margin-top: 22rpx; padding: 26rpx; border-radius: 24rpx; background: var(--card-bg, #fff); box-shadow: 0 12rpx 34rpx rgba(91, 47, 36, 0.07); }
.section-title { color: var(--text-color, #333333); font-size: 32rpx; font-weight: 900; margin-bottom: 18rpx; font-family: "STKaiti", "KaiTi", serif; }
.target-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14rpx; }
.target-item { min-height: 72rpx; padding: 0 18rpx; border-radius: 18rpx; display: flex; align-items: center; background: #f9f4ee; color: #666666; font-size: 26rpx; font-weight: 800; }
.benefit-list { display: grid; gap: 18rpx; }
.benefit { padding-bottom: 18rpx; border-bottom: 1px solid #e8e0d8; }
.benefit:last-child { padding-bottom: 0; border-bottom: 0; }
.benefit-title, .activity-title { color: #333333; font-size: 28rpx; font-weight: 900; }
.benefit-desc, .activity-desc { margin-top: 8rpx; color: #666666; font-size: 26rpx; line-height: 1.65; }
.activity-stack { display: grid; gap: 16rpx; }
.activity-card { padding: 20rpx; border-radius: 18rpx; background: #fffaf4; border: 1px solid #e8e0d8; }
.steps { display: grid; gap: 18rpx; }
.step { display: grid; grid-template-columns: 48rpx 1fr; gap: 16rpx; align-items: start; color: #666666; font-size: 26rpx; line-height: 1.6; }
.step text { width: 48rpx; height: 48rpx; border-radius: 999px; background: #4a6b8a; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 900; }
.contact { margin-bottom: 30rpx; }
.contact-line { color: #666666; font-size: 27rpx; line-height: 1.7; overflow-wrap: anywhere; }
</style>
