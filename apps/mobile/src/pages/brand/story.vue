<template>
  <view class="story-page">
    <view class="hero">
      <text class="eyebrow">七维书院 · 品牌故事</text>
      <text class="title">把传统文化，做成可学习、可体验、可持续运营的现代书院。</text>
      <text class="copy">七维书院连接课程、活动、共修、公益与本地服务，让每一座城市都能拥有自己的学习空间。</text>
      <view class="actions">
        <button class="primary" @click="goDean">申请成为院长</button>
        <button class="ghost" @click="goAid">了解帮扶计划</button>
      </view>
    </view>

    <view class="section">
      <text class="section-title">我们相信</text>
      <view v-for="item in beliefs" :key="item.title" class="belief-card">
        <text class="belief-title">{{ item.title }}</text>
        <text class="belief-copy">{{ item.copy }}</text>
      </view>
    </view>

    <view class="section warm">
      <text class="section-title">一套完整的书院闭环</text>
      <view class="flow">
        <view v-for="item in flow" :key="item" class="flow-item">{{ item }}</view>
      </view>
    </view>

    <view class="section">
      <text class="section-title">你可以如何参与</text>
      <view class="join-grid">
        <view class="join-card" @click="goDean">院长招募</view>
        <view class="join-card" @click="goAmbassador">大使申请</view>
        <view class="join-card" @click="goAid">帮扶申请</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { withTenantCode } from "../../api";

const beliefs = [
  { title: "文化要落到日常", copy: "不是只停留在口号里，而是变成一次晨读、一节课、一次共修和一段长期陪伴。" },
  { title: "书院要能运营", copy: "活动获客、课程交付、报名收款、退款审核、学员服务都应该有清晰后台承接。" },
  { title: "善意要可追踪", copy: "公益帮扶、学员成长和本地资源连接，都需要被记录、被服务、被持续改进。" }
];

const flow = ["品牌认知", "活动体验", "课程学习", "共修打卡", "公益帮扶", "本地书院"];

function goDean() { uni.navigateTo({ url: withTenantCode("/pages/recruit/dean") }); }
function goAmbassador() { uni.navigateTo({ url: withTenantCode("/pages/apply/ambassador") }); }
function goAid() { uni.navigateTo({ url: withTenantCode("/pages/apply/aid") }); }
</script>

<style scoped>
.story-page { min-height: 100vh; padding: 28rpx 24rpx 150rpx; background: #f7f0e5; color: #2d241c; }
.hero { padding: 44rpx 34rpx; border-radius: 28rpx; background: radial-gradient(circle at 80% 12%, rgba(216,162,74,0.34), transparent 34%), linear-gradient(135deg, #4b2d22, #8b5a2b); color: #fff8e8; box-shadow: 0 24rpx 60rpx rgba(91,47,36,0.22); }
.eyebrow { font-size: 24rpx; color: #f7d58f; font-weight: 900; }
.title { display: block; margin-top: 18rpx; font-size: 46rpx; line-height: 1.22; font-weight: 950; }
.copy { display: block; margin-top: 18rpx; color: rgba(255,248,232,0.86); font-size: 28rpx; line-height: 1.6; }
.actions { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; margin-top: 30rpx; }
.primary, .ghost { height: 78rpx; border-radius: 999px; font-size: 26rpx; font-weight: 900; }
.primary { background: #fff8e8; color: #5b2f24; }
.ghost { background: rgba(255,255,255,0.14); color: #fff8e8; border: 1px solid rgba(255,255,255,0.24); }
.section { margin-top: 26rpx; padding: 28rpx; border-radius: 24rpx; background: #fff; box-shadow: 0 14rpx 36rpx rgba(91,47,36,0.07); }
.section.warm { background: #fff8ed; }
.section-title { display: block; margin-bottom: 18rpx; color: #5b2f24; font-size: 32rpx; font-weight: 950; }
.belief-card { padding: 22rpx 0; border-top: 1px solid #f0e2d0; }
.belief-card:first-of-type { border-top: 0; }
.belief-title { display: block; color: #2d241c; font-size: 29rpx; font-weight: 900; }
.belief-copy { display: block; margin-top: 8rpx; color: #75685d; font-size: 25rpx; line-height: 1.58; }
.flow { display: flex; flex-wrap: wrap; gap: 14rpx; }
.flow-item { padding: 14rpx 20rpx; border-radius: 999px; background: #fff; color: #8b5a2b; font-size: 25rpx; font-weight: 900; border: 1px solid #efd9bd; }
.join-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14rpx; }
.join-card { min-height: 112rpx; display: flex; align-items: center; justify-content: center; border-radius: 18rpx; background: #fff7ec; color: #8b5a2b; font-size: 26rpx; font-weight: 900; }
</style>
