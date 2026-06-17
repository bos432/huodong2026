<template>
  <view class="container user-subpage has-custom-nav">
    <view class="custom-nav"><view class="nav-back" @click="goBack">‹ 返回</view><text class="title-md" style="flex:1; text-align:center;">设置</text></view>
    <view class="card" style="margin-top:24rpx;">
      <view class="settings-item" @click="goSecurity"><text>账号与安全</text><text>›</text></view>
      <view class="settings-item"><text>会员中心</text><text>›</text></view>
      <view class="settings-item"><text>消息通知</text><text> ›</text></view>
      <view class="settings-item"><text>关于七维书院</text><text>v0.1.0 ›</text></view>
    </view>
    <view class="button block" style="background:#ddd; color:#999; margin-top:48rpx;" @click="logout">退出登录</view>
    <TabBar current="user" />
  </view>
</template>
<script setup lang="ts">
import { clearUser } from "../../api";
import TabBar from "../../components/TabBar.vue";

function goBack() { uni.navigateBack(); }
function goSecurity() { uni.navigateTo({ url:"/pages/user/security" }); }
function logout() {
  uni.showModal({
    title:"确认退出",
    content:"确定要退出登录吗？",
    success(r){
      if (!r.confirm) return;
      clearUser();
      uni.reLaunch({ url:"/pages/user/login" });
    }
  });
}
</script>
<style scoped>
.user-subpage { padding-bottom: 160rpx; }
.custom-nav { display:flex; align-items:center; padding:16rpx 0; }
.nav-back { font-size:28rpx; color:#4A6B8A; }
.settings-item { display:flex; align-items:center; justify-content:space-between; padding:24rpx 0; border-bottom:1rpx solid #E8E0D8; font-size:28rpx; color:#333; }
.settings-item:last-child { border:none; }
</style>
