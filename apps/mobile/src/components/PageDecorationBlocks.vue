<script setup lang="ts">
import type { HomepageSectionView } from "@activity/shared";
import { goDecoratedLink, quickInitial } from "../decoration";

defineProps<{
  sections: HomepageSectionView[];
}>();

function sectionStyle(section: HomepageSectionView, fallback = "#fff") {
  const layout = section.layout || {};
  const background = layout.backgroundImage ? `url(${layout.backgroundImage}) center/cover no-repeat, ${layout.backgroundColor || fallback}` : layout.backgroundColor || fallback;
  return {
    background,
    borderRadius: `${Number(layout.borderRadius ?? 8)}px`,
    marginBottom: `${Number(layout.spacingBottom ?? 18)}rpx`
  };
}

function heroStyle(section: HomepageSectionView) {
  const config = section.config || {};
  return {
    ...sectionStyle({ ...section, layout: { ...(section.layout || {}), backgroundImage: config.backgroundImage || section.layout?.backgroundImage } }, String(config.backgroundColor || "#0f766e")),
    color: "#fff"
  };
}

function itemLink(item: Record<string, unknown>) {
  return String(item.link || item.path || "");
}

function heroButtonText(section: HomepageSectionView) {
  return String(section.config.primaryButtonText || section.config.buttonText || "");
}

function heroButtonLink(section: HomepageSectionView) {
  return String(section.config.primaryButtonLink || section.config.link || "/pages/activity/list");
}

function richTextLines(content: unknown) {
  return String(content || "").split("\n").filter(Boolean);
}

function sectionRows(section: HomepageSectionView, key: string) {
  const rows = ((section.data || {}) as Record<string, unknown>)[key];
  return Array.isArray(rows) ? rows : [];
}

function categories(section: HomepageSectionView) {
  return sectionRows(section, "categories");
}

function activities(section: HomepageSectionView) {
  return sectionRows(section, "activities");
}

function goActivity(id?: number | string) {
  if (id) goDecoratedLink(`/pages/activity/detail?id=${id}`);
}

function priceText(price: string | number) {
  return Number(price) > 0 ? `¥${Number(price).toFixed(2)}` : "免费";
}

function formatTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace("T", " ").slice(0, 16);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hour}:${minute}`;
}
</script>

<template>
  <template v-for="section in sections" :key="section.id">
    <view v-if="section.type === 'hero'" class="decor-hero" :style="heroStyle(section)">
      <view class="decor-eyebrow">{{ section.config.eyebrow || "七维文化" }}</view>
      <view class="decor-title">{{ section.title }}</view>
      <view v-if="section.subtitle" class="decor-copy">{{ section.subtitle }}</view>
      <view v-if="heroButtonText(section)" class="decor-button" @click="goDecoratedLink(heroButtonLink(section))">
        {{ heroButtonText(section) }}
      </view>
    </view>

    <view v-else-if="section.type === 'quick_nav'" class="decor-quick-grid" :style="{ gridTemplateColumns: `repeat(${Number(section.layout.columns || 4)}, 1fr)` }">
      <view v-for="item in ((section.config.items as any[]) || []).slice(0, 8)" :key="item.label" class="decor-quick-item" @click="goDecoratedLink(itemLink(item), item.action)">
        <text class="decor-quick-icon" :style="{ background: `${item.color || '#0f766e'}18`, color: item.color || '#0f766e' }">{{ quickInitial(item.label, item.icon) }}</text>
        <text>{{ item.label }}</text>
      </view>
    </view>

    <view v-else-if="section.type === 'image_banner'" class="decor-banner" :style="sectionStyle(section, '#dff4ee')" @click="goDecoratedLink(String(section.config.link || ''))">
      <image v-if="section.config.imageUrl" :src="String(section.config.imageUrl)" mode="widthFix" />
      <text v-else>{{ section.title || "图片 Banner" }}</text>
    </view>

    <view v-else-if="section.type === 'rich_text'" class="decor-rich" :style="sectionStyle(section)">
      <view v-if="section.title" class="decor-section-title">{{ section.title }}</view>
      <image v-if="section.config.imageUrl" :src="String(section.config.imageUrl)" mode="widthFix" />
      <view v-for="line in richTextLines(section.config.content)" :key="line" class="decor-rich-line">{{ line }}</view>
    </view>

    <view v-else-if="section.type === 'announcement_bar'" class="decor-notice" :style="sectionStyle(section)" @click="goDecoratedLink(String(section.config.link || '/pages/announcement/list'))">
      <text>{{ section.title || "公告" }}</text>
      <text>{{ section.subtitle || "查看最新通知" }}</text>
    </view>

    <view v-else-if="section.type === 'search_bar'" class="decor-search" :style="sectionStyle(section)" @click="goDecoratedLink('/pages/activity/list?focus=1')">
      <text>{{ section.config.cityLabel || "本地" }}</text>
      <text>{{ section.config.placeholder || "搜索活动" }}</text>
    </view>
    <view v-else-if="section.type === 'category_grid' && categories(section).length" class="decor-card-block" :style="sectionStyle(section)">
      <view v-if="section.title" class="decor-section-title">{{ section.title }}</view>
      <view v-if="section.subtitle" class="decor-section-copy">{{ section.subtitle }}</view>
      <scroll-view scroll-x class="decor-category-scroll" :show-scrollbar="false">
        <view class="decor-category-track">
          <view v-for="item in categories(section)" :key="item.id" class="decor-category" @click="goDecoratedLink(`/pages/activity/list?categoryId=${item.id}`)">
            {{ item.name }}
          </view>
        </view>
      </scroll-view>
    </view>

    <view v-else-if="section.type === 'activity_tabs' && categories(section).length" class="decor-tabs">
      <view v-if="section.config.includeHot !== false" class="decor-tab" @click="goDecoratedLink('/pages/activity/list')">热门</view>
      <view v-for="item in categories(section)" :key="item.id" class="decor-tab" @click="goDecoratedLink(`/pages/activity/list?categoryId=${item.id}`)">
        {{ item.name }}
      </view>
    </view>

    <view v-else-if="['featured_activities', 'activity_feed'].includes(section.type) && activities(section).length" class="decor-card-block" :style="sectionStyle(section)">
      <view v-if="section.title" class="decor-section-title">{{ section.title }}</view>
      <view v-if="section.subtitle" class="decor-section-copy">{{ section.subtitle }}</view>
      <view class="decor-activity-list">
        <view v-for="item in activities(section).slice(0, Number(section.config.limit || 6))" :key="item.id" class="decor-activity" @click="goActivity(item.id)">
          <image v-if="item.coverUrl" :src="item.coverUrl" mode="aspectFill" />
          <view v-else class="decor-cover-fallback">活动</view>
          <view class="decor-activity-body">
            <view class="decor-activity-title">{{ item.title }}</view>
            <view class="decor-activity-meta">{{ formatTime(item.startTime) }} · {{ item.location }}</view>
            <view class="decor-activity-foot">
              <text>{{ priceText(item.price) }}</text>
              <text>余 {{ item.remainingSeats }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </template>
</template>

<style scoped>
.decor-hero { position: relative; overflow: hidden; padding: 42rpx 32rpx; background: #0f766e; box-shadow: 0 22rpx 54rpx rgba(91, 47, 36, 0.18); }
.decor-hero::after { content: ""; position: absolute; right: -70rpx; bottom: -90rpx; width: 260rpx; height: 260rpx; border-radius: 999px; background: rgba(255,255,255,0.12); }
.decor-eyebrow { color: rgba(255,255,255,0.78); font-size: 23rpx; font-weight: 800; }
.decor-title { margin-top: 10rpx; font-size: 40rpx; line-height: 1.22; font-weight: 900; }
.decor-copy { margin-top: 12rpx; color: rgba(255,255,255,0.84); font-size: 25rpx; line-height: 1.55; }
.decor-button { position: relative; z-index: 1; display: inline-flex; margin-top: 22rpx; padding: 14rpx 26rpx; border-radius: 999px; background: rgba(255,255,255,0.92); color: #5b2f24; font-size: 24rpx; font-weight: 900; box-shadow: 0 10rpx 26rpx rgba(91, 47, 36, 0.18); }
.decor-quick-grid { display: grid; gap: 14rpx; margin-bottom: 18rpx; }
.decor-quick-item { min-height: 122rpx; display: grid; gap: 9rpx; justify-items: center; align-content: center; border-radius: 16px; background: linear-gradient(180deg, #fff 0%, #fffbf5 100%); color: #3f3428; font-size: 23rpx; font-weight: 800; box-shadow: 0 14rpx 34rpx rgba(91, 47, 36, 0.08); border: 1px solid rgba(139, 90, 43, 0.08); }
.decor-quick-icon { width: 54rpx; height: 54rpx; display: flex; align-items: center; justify-content: center; border-radius: 999px; font-size: 24rpx; font-weight: 900; }
.decor-banner, .decor-rich, .decor-notice, .decor-search { padding: 24rpx; margin-bottom: 18rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); }
.decor-banner { overflow: hidden; box-shadow: 0 14rpx 34rpx rgba(91, 47, 36, 0.08); }
.decor-banner image, .decor-rich image { width: 100%; border-radius: 12px; }
.decor-section-title { color: var(--text-color, #111827); font-size: 30rpx; font-weight: 900; margin-bottom: 12rpx; }
.decor-section-copy { margin: -4rpx 0 14rpx; color: var(--muted-color, #667085); font-size: 24rpx; line-height: 1.45; }
.decor-rich-line { color: var(--muted-color, #667085); font-size: 25rpx; line-height: 1.65; }
.decor-notice, .decor-search { display: grid; grid-template-columns: auto 1fr; gap: 14rpx; align-items: center; color: #344054; font-size: 25rpx; }
.decor-notice text:first-child, .decor-search text:first-child { color: var(--primary-color, #0f766e); font-weight: 900; }
.decor-card-block { padding: 26rpx; margin-bottom: 18rpx; border-radius: var(--card-radius, 8px); background: var(--card-bg, #fff); box-shadow: 0 14rpx 34rpx rgba(91, 47, 36, 0.07); }
.decor-category-scroll { width: 100%; height: 68rpx; white-space: nowrap; }
.decor-category-track, .decor-tabs { display: inline-flex; gap: 14rpx; padding-right: 24rpx; }
.decor-tabs { width: 100%; overflow-x: auto; margin-bottom: 18rpx; }
.decor-category, .decor-tab { flex: 0 0 auto; padding: 14rpx 24rpx; border-radius: 999px; background: #fff7ec; color: var(--primary-color, #8b5a2b); font-size: 25rpx; font-weight: 800; border: 1px solid rgba(139, 90, 43, 0.12); }
.decor-activity-list { display: grid; gap: 16rpx; }
.decor-activity { display: grid; grid-template-columns: 154rpx 1fr; gap: 16rpx; min-height: 154rpx; padding: 14rpx; border-radius: 14px; background: linear-gradient(135deg, #fff 0%, #fffaf3 100%); border: 1px solid rgba(139, 90, 43, 0.08); }
.decor-activity image, .decor-cover-fallback { width: 154rpx; height: 154rpx; border-radius: 12px; }
.decor-cover-fallback { display: flex; align-items: center; justify-content: center; background: var(--primary-soft, #e6f2ef); color: var(--primary-color, #0f766e); font-weight: 900; }
.decor-activity-body { min-width: 0; display: grid; align-content: space-between; gap: 8rpx; }
.decor-activity-title { color: var(--text-color, #111827); font-size: 27rpx; line-height: 1.35; font-weight: 900; display: -webkit-box; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.decor-activity-meta { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--muted-color, #667085); font-size: 23rpx; }
.decor-activity-foot { display: flex; justify-content: space-between; gap: 12rpx; color: var(--primary-color, #0f766e); font-size: 24rpx; font-weight: 900; }
</style>
