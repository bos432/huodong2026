<template>
  <view class="container">
    <view class="custom-nav"><view class="nav-back" @click="goBack">‹ 返回</view><text class="title-md" style="flex:1; text-align:center;">我的收藏</text></view>
    <view class="course-grid">
      <view v-for="c in favorites" :key="c.id" class="course-card" @click="goDetail(c)">
        <view class="course-cover" :style="{background:c.color}"><text style="font-size:48rpx;">{{ c.icon }}</text></view>
        <view class="course-info">
          <text class="course-title">{{ c.title }}</text>
          <text class="course-teacher">by {{ c.teacher }}</text>
          <text class="price" style="font-size:28rpx;">¥{{ c.price }}</text>
        </view>
      </view>
    </view>
    <empty-state v-if="!favorites.length" icon="❤" text="暂无收藏" />
  </view>
</template>
<script setup lang="ts">
const favorites = [
  { id:1, title:"国学入门七讲", teacher:"张明远", price:0, icon:"📜", color:"#F5E6D3" },
  { id:5, title:"楷书入门到精通", teacher:"李墨白", price:599, icon:"🖌", color:"#E8E0D8" }
];
function goBack() { uni.navigateBack(); }
function goDetail(c:any) { uni.navigateTo({ url:"/pages/course/detail?id="+c.id }); }
</script>
<style scoped>
.custom-nav { display:flex; align-items:center; padding:16rpx 0; }
.nav-back { font-size:28rpx; color:#4A6B8A; }
.course-grid { display:grid; grid-template-columns:1fr 1fr; gap:20rpx; }
.course-card { background:#fff; border-radius:20rpx; overflow:hidden; box-shadow:0 4rpx 20rpx rgba(0,0,0,0.04); }
.course-cover { height:180rpx; display:flex; align-items:center; justify-content:center; }
.course-info { padding:16rpx; }
.course-title { font-size:26rpx; font-weight:600; color:#333; display:block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.course-teacher { font-size:22rpx; color:#999; }
</style>
