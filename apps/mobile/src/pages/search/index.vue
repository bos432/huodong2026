<template>
  <view class="container">
    <view class="search-bar">
      <view class="search-input-wrap">
        <text style="font-size:28rpx; margin-right:12rpx;">🔍</text>
        <input class="search-input" v-model="keyword" placeholder="搜索课程、讲师..." confirm-type="search" @confirm="doSearch" />
      </view>
      <text class="search-cancel" @click="goBack">取消</text>
    </view>

    <view v-if="!keyword">
      <view class="section-title"><text class="title-md">🔥 热门搜索</text></view>
      <view class="tags-cloud">
        <text v-for="tag in hotTags" :key="tag" class="tag tag-secondary" style="margin:8rpx;" @click="keyword=tag">{{ tag }}</text>
      </view>
      <view class="section-title" style="margin-top:32rpx;"><text class="title-md">🕐 搜索历史</text></view>
      <view class="tags-cloud">
        <text v-for="(h, i) in history" :key="i" class="tag" style="background:#E8E0D8; color:#666; margin:8rpx;" @click="keyword=h">{{ h }}</text>
      </view>
      <text v-if="history.length" class="subtle" style="display:block; text-align:center; margin-top:24rpx;" @click="history=[]">清空搜索历史</text>
    </view>

    <view v-else>
      <text class="subtle" style="display:block; margin-bottom:16rpx;">搜索 "{{ keyword }}" 共 {{ results.length }} 个结果</text>
      <view v-for="(r, i) in results" :key="i" class="card search-result-item" @click="goCourse(r)">
        <view class="row" style="justify-content:flex-start; gap:16rpx;">
          <view style="width:160rpx; height:100rpx; background:r.color; border-radius:12rpx; display:flex; align-items:center; justify-content:center;">
            <text style="font-size:40rpx;">{{ r.icon }}</text>
          </view>
          <view style="flex:1;">
            <text style="font-size:28rpx; font-weight:600; color:#333; display:block;">{{ r.title }}</text>
            <text class="subtle">by {{ r.teacher }}</text>
            <text class="price" style="font-size:28rpx;">¥{{ r.price }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
const keyword = ref("");
const hotTags = ["国学入门","书法基础","道德经","易经","论语","静坐","家庭教育","中医养生"];
const history = ref(["国学","书法","论语"]);
const allCourses = [
  { id:1, title:"国学入门七讲", teacher:"张明远", price:0, icon:"📜", color:"#F5E6D3" },
  { id:2, title:"论语精讲100讲", teacher:"张明远", price:399, icon:"📚", color:"#F5E6D3" },
  { id:3, title:"道德经导读", teacher:"王守拙", price:199, icon:"☯", color:"#DCE8E0" },
  { id:4, title:"楷书入门到精通", teacher:"李墨白", price:599, icon:"🖌", color:"#E8E0D8" }
];
const results = computed(() => allCourses.filter(c => c.title.includes(keyword.value)));
function doSearch() { if (keyword.value && !history.value.includes(keyword.value)) history.value.unshift(keyword.value); }
function goBack() { uni.navigateBack(); }
function goCourse(r:any) { uni.navigateTo({ url:"/pages/course/detail?id="+r.id }); }
</script>
<style scoped>
.search-bar { display:flex; align-items:center; gap:16rpx; padding:16rpx 0; }
.search-input-wrap { flex:1; display:flex; align-items:center; background:#F5F0E8; border-radius:40rpx; padding:0 24rpx; height:80rpx; }
.search-input { flex:1; height:80rpx; font-size:28rpx; }
.search-cancel { font-size:28rpx; color:#4A6B8A; }
.section-title { margin:24rpx 0 16rpx; }
.tags-cloud { display:flex; flex-wrap:wrap; gap:8rpx; }
.search-result-item { margin-bottom:12rpx; }
</style>
