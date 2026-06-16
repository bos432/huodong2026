<template>
  <view class="container has-custom-nav">
    <view class="page-header">
      <text class="title-lg">共修</text>
    </view>

    <!-- 文化大使入口 -->
    <view class="ambassador-card" @click="goAmbassador">
      <text style="font-size:30rpx; color:#fff; font-weight:600;">🏮 加入文化大使计划</text>
      <text style="font-size:24rpx; color:rgba(255,255,255,0.8); margin-top:6rpx;">让热爱发光 &gt;</text>
    </view>

    <!-- 近期活动 -->
    <view class="section-title"><text class="title-md">📅 近期活动</text></view>
    <view v-for="(act, idx) in activities" :key="idx" class="activity-card" @click="goActivity(act)">
      <view class="activity-date-block">
        <text class="date-month">{{ act.month }}</text>
        <text class="date-day">{{ act.day }}</text>
      </view>
      <view class="activity-info">
        <text class="activity-name">{{ act.title }}</text>
        <text class="activity-meta">🕐 {{ act.time }}</text>
        <text class="activity-meta">📍 {{ act.location }}</text>
        <view class="row" style="justify-content:flex-start; margin-top:8rpx;">
          <text class="subtle">已报名 {{ act.registered }} 人</text>
          <view class="button sm secondary" style="margin-left:auto;">立即报名</view>
        </view>
      </view>
    </view>

    <!-- 今日打卡 -->
    <view class="card checkin-card">
      <text class="title-md">📝 今日打卡</text>
      <text class="body-text" style="margin-top:12rpx;">今日任务：抄写《道德经》第一章</text>
      <view class="progress-bar" style="margin-top:12rpx;">
        <view class="progress-fill" style="width: 67%;"></view>
      </view>
      <text class="subtle" style="margin-top:8rpx;">今日已有 128 人完成打卡</text>
      <view class="button block" style="margin-top:16rpx;" @click="goCheckin">去打卡</view>
    </view>

    <!-- 动态广场 -->
    <view class="section-title" style="margin-top:8rpx;"><text class="title-md">📖 学员动态</text></view>
    <view v-for="(post, idx) in posts" :key="idx" class="card post-card" @click="toggleLike(post)">
      <view class="row" style="justify-content:flex-start; gap:12rpx;">
        <image class="avatar-sm" :src="post.avatar" mode="aspectFill" />
        <view style="flex:1;">
          <text class="body-text" style="font-weight:600;">{{ post.nickname }}</text>
          <text class="subtle" style="display:block;">{{ post.time }}</text>
        </view>
      </view>
      <text class="body-text" style="margin-top:12rpx; display:block;">{{ post.content }}</text>
      <view class="row" style="margin-top:12rpx; justify-content:flex-start; gap:32rpx;">
        <view class="interact-btn" @click.stop="toggleLike(post)">
          <text>{{ post.liked ? '❤️' : '🤍' }}</text>
          <text class="subtle">{{ post.likes }}</text>
        </view>
        <view class="interact-btn">
          <text>💬</text>
          <text class="subtle">{{ post.comments }}</text>
        </view>
      </view>
    </view>

    <view style="height:120rpx;"></view>
    <TabBar current="community" />
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { loadPageTheme } from "../../theme";
import TabBar from "../../components/TabBar.vue";

onShow(() => { loadPageTheme(); });

const activities = [
  { id:1, month:"7月", day:"15", title:"线上共读会：《论语》精读", time:"2026-07-15 19:30-21:00", location:"线上·腾讯会议", registered:128 },
  { id:2, month:"7月", day:"22", title:"书法打卡营（第3期）", time:"2026-07-22 10:00-12:00", location:"七维书院·线下教室", registered:56 },
  { id:3, month:"8月", day:"5", title:"中医养生沙龙", time:"2026-08-05 14:00-17:00", location:"七维书院·活动厅", registered:34 }
];

const posts = reactive([
  { id:1, avatar:"/static/avatar1.png", nickname:"学而时习", time:"2小时前", content:"今日抄写《论语》学而篇第一，深感温故而知新。", likes:12, comments:3, liked:false },
  { id:2, avatar:"/static/avatar2.png", nickname:"书道中人", time:"昨天", content:"楷书练习第21天，继续加油！", likes:8, comments:1, liked:false },
  { id:3, avatar:"/static/avatar3.png", nickname:"静心养性", time:"3天前", content:"静坐第7天，感觉心静了很多。", likes:15, comments:4, liked:false }
]);

function toggleLike(post: any) {
  post.liked = !post.liked;
  post.likes += post.liked ? 1 : -1;
}
function goActivity(act: any) { uni.navigateTo({ url:`/pages/community/detail?id=${act.id}` }); }
function goCheckin() { uni.navigateTo({ url:"/pages/community/checkin" }); }
function goAmbassador() { uni.navigateTo({ url:"/pages/ambassador/index" }); }
</script>

<style scoped>
.page-header { padding: 20rpx 0 16rpx; }
.ambassador-card {
  background: linear-gradient(135deg, #C43D3D, #A52A2A);
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
}
.section-title { margin-bottom: 16rpx; }
.activity-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  display: flex;
  gap: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.04);
}
.activity-date-block {
  width: 100rpx;
  height: 100rpx;
  background: #C43D3D;
  border-radius: 12rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.date-month { font-size: 24rpx; color: #fff; }
.date-day { font-size: 44rpx; font-weight: 700; color: #fff; line-height: 1; }
.activity-info { flex: 1; min-width: 0; }
.activity-name { font-size: 30rpx; font-weight: 600; color: #333; display: block; }
.activity-meta { font-size: 24rpx; color: #999; display: block; margin-top: 4rpx; }
.checkin-card { margin-bottom: 24rpx; }
.post-card { margin-bottom: 16rpx; }
.interact-btn { display: flex; align-items: center; gap: 8rpx; }
</style>
