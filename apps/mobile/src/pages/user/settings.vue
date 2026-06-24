<template>
  <view class="container user-subpage has-custom-nav">
    <view class="custom-nav">
      <view class="nav-back" @click="goBack">‹ 返回</view>
      <text class="nav-title">设置</text>
      <view class="nav-placeholder"></view>
    </view>
    <view class="page-hero">
      <view class="hero-kicker">偏好设置</view>
      <view class="hero-title">管理账号与通知</view>
      <view class="hero-desc">账号安全、会员权益和应用信息集中在这里。</view>
    </view>
    <view class="settings-card">
      <view class="settings-item" @click="goSecurity"><text>账号与安全</text><text class="item-arrow">›</text></view>
      <view class="settings-item" @click="goCommunityPosts"><text>我的活动心得</text><text class="item-arrow">›</text></view>
      <view class="settings-item"><text>会员中心</text><text class="item-arrow">›</text></view>
      <view class="settings-item"><text>消息通知</text><text class="item-arrow">›</text></view>
      <view class="settings-item"><text>关于慢π</text><text class="item-arrow">v0.1.0 ›</text></view>
    </view>
    <view class="logout-button" @click="logout">退出登录</view>
    <TabBar current="user" />
  </view>
</template>
<script setup lang="ts">
import { clearUser } from "../../api";
import TabBar from "../../components/TabBar.vue";

function goBack() { uni.navigateBack(); }
function goSecurity() { uni.navigateTo({ url:"/pages/user/security" }); }
function goCommunityPosts() { uni.navigateTo({ url:"/pages/user/community-posts" }); }
function logout() {
  uni.showModal({
    title:"确认退出",
    content:"确定要退出登录吗？",
    success(r){
      if (!r.confirm) return;
      clearUser();
      uni.reLaunch({ url:"/pages/user/my" });
    }
  });
}
</script>
<style scoped>
.user-subpage {
  min-height: 100vh;
  padding-bottom: 160rpx;
  background:
    linear-gradient(180deg, #f7efe3 0%, #fbf7ef 40%, #f4eadc 100%);
}

.custom-nav {
  display: flex;
  align-items: center;
  padding: 18rpx 0 20rpx;
}

.nav-back,
.nav-placeholder {
  width: 130rpx;
  color: #4a6b8a;
  font-size: 28rpx;
}

.nav-title {
  flex: 1;
  color: #263d3c;
  font-size: 32rpx;
  font-weight: 800;
  text-align: center;
}

.page-hero {
  padding: 34rpx 30rpx;
  border-radius: 30rpx;
  background:
    linear-gradient(135deg, rgba(33, 75, 78, 0.96), rgba(129, 55, 48, 0.9)),
    #214b4e;
  color: #fffaf2;
  box-shadow: 0 18rpx 46rpx rgba(36, 60, 60, 0.18);
}

.hero-kicker {
  display: inline-flex;
  padding: 8rpx 16rpx;
  border-radius: 999rpx;
  background: rgba(255, 250, 242, 0.14);
  color: rgba(255, 250, 242, 0.84);
  font-size: 22rpx;
}

.hero-title {
  margin-top: 22rpx;
  font-size: 42rpx;
  font-weight: 800;
  line-height: 1.25;
}

.hero-desc {
  margin-top: 14rpx;
  color: rgba(255, 250, 242, 0.76);
  font-size: 25rpx;
  line-height: 1.65;
}

.settings-card {
  margin-top: 22rpx;
  padding: 0 24rpx;
  border: 1rpx solid rgba(199, 181, 157, 0.58);
  border-radius: 24rpx;
  background: rgba(255, 252, 246, 0.96);
  box-shadow: 0 12rpx 34rpx rgba(72, 55, 38, 0.08);
}

.settings-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20rpx;
  padding: 28rpx 0;
  border-bottom: 1rpx solid rgba(218, 204, 184, 0.72);
  color: #263d3c;
  font-size: 28rpx;
  font-weight: 700;
}

.settings-item:last-child {
  border: none;
}

.item-arrow {
  flex-shrink: 0;
  color: #8f8172;
  font-size: 25rpx;
  font-weight: 700;
}

.logout-button {
  height: 84rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 40rpx;
  border: 1rpx solid rgba(184, 68, 53, 0.24);
  border-radius: 999rpx;
  background: rgba(255, 252, 246, 0.85);
  color: #b84435;
  font-size: 28rpx;
  font-weight: 900;
}
</style>
