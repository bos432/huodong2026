<script setup lang="ts">
import MobileShell from "../../components/layout/MobileShell.vue";
import IconGlyph from "../../components/ui/IconGlyph.vue";
import { mockProfile } from "../../mock/profile";
import { mobileTabRoute } from "../../mobile-tab-routes";
import { withTenantCode } from "../../api";

const demoCounts = [
  { label: "参加活动", value: "—", note: "暂无真实记录" },
  { label: "活动记录", value: "0", note: "待真实参与" },
  { label: "关注", value: "—", note: "暂未接入" },
  { label: "粉丝", value: "—", note: "暂未接入" },
  { label: "组织活动", value: "0", note: "未申请主理人" }
];
const todos = [
  { icon: "calendar", title: "待参加", description: "已报名的活动会出现在这里", count: "0" },
  { icon: "star", title: "待评价", description: "参加并签到后留下感受", count: "0" },
  { icon: "ticket", title: "票夹", description: "查看报名凭证和活动安排", count: "0" },
  { icon: "book", title: "活动记录", description: "只记录真实参与过的活动", count: "0" }
];
const settings = [
  { icon: "bell", label: "消息与提醒", hint: "活动提醒和通知偏好" },
  { icon: "shield", label: "隐私设置", hint: "管理个人资料展示范围" },
  { icon: "help", label: "客服与帮助", hint: "需要帮助时联系我们" },
  { icon: "star", label: "关于慢π", hint: "了解产品和活动原则" }
];

function toast(title: string) { uni.showToast({ title, icon: "none" }); }
function discover() { uni.reLaunch({ url: "/pages/home/index" }); }
function selectTab(tab: "home" | "checkin" | "messages" | "me" | "publish") {
  if (tab === "home") uni.reLaunch({ url: withTenantCode(mobileTabRoute("home")) });
  else if (tab === "checkin") uni.reLaunch({ url: withTenantCode(mobileTabRoute("checkin")) });
  else if (tab === "messages") uni.reLaunch({ url: withTenantCode(mobileTabRoute("messages")) });
  else if (tab === "publish") { uni.setStorageSync("open_publish_sheet", "1"); uni.reLaunch({ url: withTenantCode(mobileTabRoute("home")) }); }
}
</script>

<template>
  <MobileShell active-tab="me" @tab="selectTab">
    <view class="me-page">
      <view class="identity">
        <view class="identity-head"><view class="identity-main"><image v-if="mockProfile.avatar" class="avatar" :src="mockProfile.avatar" mode="aspectFill" /><view v-else class="avatar avatar-fallback"><IconGlyph name="user" :size="30" label="头像" /></view><view class="identity-copy"><text class="eyebrow">演示用户 · 慢π体验者</text><text class="name">{{ mockProfile.nickname }}</text><view class="city"><IconGlyph name="pin" :size="13" label="城市" /><text>重庆 · 个人活动记录中心</text></view><text class="intro">{{ mockProfile.introduction }}</text></view></view><button class="edit-button" @click="toast('资料编辑为本地演示')">编辑资料</button></view>
        <view class="tag-row"><text v-for="tag in mockProfile.tags" :key="tag">{{ tag }}</text></view>
      </view>

      <view class="section stats-section"><view class="section-head"><view><text class="section-title">我的活动数据</text><text class="section-note">真实数据接入后会在这里更新</text></view></view><view class="stats"><view v-for="item in demoCounts" :key="item.label" class="stat"><b>{{ item.value }}</b><text>{{ item.label }}</text><small>{{ item.note }}</small></view></view></view>

      <view class="section"><view class="section-head"><view><text class="section-title">当前待办</text><text class="section-note">先把一次真实参与照顾好</text></view></view><view class="todo-grid"><view v-for="item in todos" :key="item.title" class="todo" @click="toast(`${item.title}暂时没有真实数据`)"><view class="todo-icon"><IconGlyph :name="item.icon" :size="20" :label="item.title" /></view><view class="todo-copy"><b>{{ item.title }}</b><small>{{ item.description }}</small></view><em>{{ item.count }}</em></view></view></view>

      <view class="section"><view class="section-head"><view><text class="section-title">活动记录</text><text class="section-note">只展示真实报名、签到和完成记录</text></view><button @click="discover">去发现</button></view><view class="record-empty"><view class="empty-icon"><IconGlyph name="calendar" :size="28" label="暂无活动记录" /></view><b>暂无真实活动记录</b><text>当前显示的是演示状态，还没有连接报名和签到数据。</text><button class="primary-button" @click="discover">去首页发现活动</button></view></view>

      <view class="section growth"><view class="section-head"><view><text class="section-title">我的成长</text><text class="section-note">演示功能，等真实参与后开启</text></view></view><view class="growth-grid"><view><IconGlyph name="checkin" :size="22" label="打卡" /><b>打卡进度</b><small>暂无真实进度</small></view><view><IconGlyph name="book" :size="22" label="回顾" /><b>活动回顾</b><small>完成活动后生成</small></view><view><IconGlyph name="award" :size="22" label="纪念章" /><b>纪念章</b><small>暂无可展示内容</small></view></view></view>

      <view class="section host-entry"><view class="host-copy"><text class="eyebrow">主理人入口</text><text class="section-title">申请成为主理人</text><text class="section-note">提交资料后由慢π审核，审核通过才能发起活动。</text></view><button @click="uni.setStorageSync('open_publish_sheet', '1'); uni.reLaunch({ url: '/pages/home/index' })">申请或查看进度</button></view>

      <view class="section settings-section"><view class="section-head"><view><text class="section-title">设置</text><text class="section-note">管理你的慢π体验</text></view></view><view class="setting-list"><view v-for="item in settings" :key="item.label" class="setting" @click="toast(`${item.label}为本地演示`)"><IconGlyph :name="item.icon" :size="18" :label="item.label" /><view><b>{{ item.label }}</b><small>{{ item.hint }}</small></view><IconGlyph name="chevron" :size="15" label="打开" /></view><view class="setting" @click="toast('演示状态下无需退出登录')"><IconGlyph name="user" :size="18" label="退出登录" /><view><b>退出登录</b><small>当前为本地演示用户</small></view><IconGlyph name="chevron" :size="15" label="打开" /></view></view></view>
    </view>
  </MobileShell>
</template>

<style scoped>
@import "../../styles/tokens.css";
.me-page{min-height:100vh;padding:16px 14px 128px;background:var(--mp-bg-page);font-family:var(--mp-font-family)}
.identity{padding:16px;border-radius:18px;background:var(--mp-surface);box-shadow:var(--mp-shadow-card)}.identity-head{display:flex;align-items:flex-start;gap:10px}.identity-main{display:flex;min-width:0;flex:1;gap:12px;align-items:flex-start}.avatar{width:72px;height:72px;flex:0 0 72px;border-radius:50%;object-fit:cover;background:var(--mp-brand-soft)}.avatar-fallback{display:grid;place-items:center;color:var(--mp-brand-primary)}.identity-copy{display:grid;min-width:0;gap:5px}.eyebrow{color:var(--mp-brand-primary-dark);font-size:11px;font-weight:700}.name{color:var(--mp-text-primary);font-size:23px;font-weight:700}.city{display:flex;align-items:center;gap:4px;color:var(--mp-text-secondary);font-size:12px}.intro{color:var(--mp-text-muted);font-size:12px;line-height:1.5}.edit-button{flex:0 0 auto;min-height:30px;margin:0;padding:0 10px;border:1px solid var(--mp-border);border-radius:15px;background:transparent;color:var(--mp-text-secondary);font-size:11px}.tag-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:13px}.tag-row text{padding:5px 9px;border-radius:999px;background:var(--mp-brand-soft);color:var(--mp-brand-primary-dark);font-size:11px}.section{margin-top:22px}.section-head{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:10px}.section-title{display:block;color:var(--mp-text-primary);font-size:17px;font-weight:700}.section-note{display:block;margin-top:3px;color:var(--mp-text-muted);font-size:11px;line-height:1.45}.section-head button{padding:0;border:0;background:transparent;color:var(--mp-brand-primary-dark);font-size:12px}.stats{display:grid;grid-template-columns:repeat(5,1fr);gap:1px;overflow:hidden;border:1px solid var(--mp-border);border-radius:14px;background:var(--mp-border)}.stat{min-width:0;padding:12px 3px;background:var(--mp-surface);text-align:center}.stat b,.stat text,.stat small{display:block}.stat b{color:var(--mp-text-primary);font-size:18px}.stat text{margin-top:4px;color:var(--mp-text-secondary);font-size:10px;white-space:nowrap}.stat small{margin-top:3px;color:var(--mp-text-muted);font-size:8px;line-height:1.2}.todo-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px}.todo{position:relative;display:flex;min-height:84px;align-items:flex-start;gap:9px;padding:13px 11px;border-radius:14px;background:var(--mp-surface);box-shadow:var(--mp-shadow-card)}.todo-icon{display:grid;width:30px;height:30px;flex:0 0 30px;place-items:center;border-radius:10px;background:var(--mp-brand-soft);color:var(--mp-brand-primary-dark)}.todo-copy{display:grid;min-width:0;gap:4px}.todo-copy b{color:var(--mp-text-primary);font-size:13px}.todo-copy small{color:var(--mp-text-muted);font-size:10px;line-height:1.35}.todo em{position:absolute;top:10px;right:11px;color:var(--mp-text-muted);font-size:11px;font-style:normal}.record-empty{display:grid;justify-items:center;gap:7px;padding:28px 18px;border:1px dashed var(--mp-border);border-radius:16px;background:rgb(255 255 255 / 55%);text-align:center}.empty-icon{display:grid;width:52px;height:52px;place-items:center;border-radius:16px;background:var(--mp-brand-soft);color:var(--mp-brand-primary)}.record-empty b{color:var(--mp-text-primary);font-size:14px}.record-empty text{color:var(--mp-text-muted);font-size:11px;line-height:1.5}.primary-button{min-height:38px;margin-top:5px;padding:0 16px;border:0;border-radius:19px;background:var(--mp-brand-primary);color:#fff;font-size:12px}.growth{padding:15px;border-radius:16px;background:#eef8f3}.growth-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.growth-grid>view{display:grid;justify-items:center;gap:5px;padding:12px 3px;border-radius:12px;background:rgb(255 255 255 / 76%);color:var(--mp-brand-primary-dark);text-align:center}.growth-grid b{color:var(--mp-text-primary);font-size:11px}.growth-grid small{color:var(--mp-text-muted);font-size:9px}.host-entry{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px;border-radius:16px;background:var(--mp-text-primary);color:#fff}.host-copy{min-width:0}.host-entry .section-title{color:#fff;font-size:16px}.host-entry .section-note{color:#c9d6cf}.host-entry button{min-height:36px;padding:0 12px;border:0;border-radius:18px;background:var(--mp-brand-primary);color:#073d29;font-size:11px;white-space:nowrap}.setting-list{overflow:hidden;border-radius:14px;background:var(--mp-surface);box-shadow:var(--mp-shadow-card)}.setting{display:flex;min-height:56px;align-items:center;gap:10px;padding:0 13px;border-bottom:1px solid var(--mp-border);color:var(--mp-brand-primary-dark)}.setting:last-child{border-bottom:0}.setting view{display:grid;flex:1;gap:2px}.setting b{color:var(--mp-text-primary);font-size:13px}.setting small{color:var(--mp-text-muted);font-size:10px}.setting>.icon-chevron{color:var(--mp-text-muted)}
</style>
