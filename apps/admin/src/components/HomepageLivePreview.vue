<script setup lang="ts">
import type { HomepageSectionView } from "@activity/shared";

const props = withDefaults(defineProps<{
  rows: HomepageSectionView[];
  focusedId?: number | null;
  fallback?: boolean;
  device?: "standard" | "large";
  pageLabel?: string;
}>(), {
  focusedId: null,
  fallback: false,
  device: "standard",
  pageLabel: "首页"
});
const emit = defineEmits<{ select: [row: HomepageSectionView] }>();

const sampleCategories = [{ id: 1, name: "文化雅集" }, { id: 2, name: "城市漫游" }, { id: 3, name: "公益共建" }];
const sampleActivities = [
  { id: 1, title: "东方生活美学体验", startTime: "2026-08-25T14:00:00+08:00", location: "城市文化空间", price: 0, remainingSeats: 12, registeredCount: 8, coverUrl: "" },
  { id: 2, title: "周末主题共修会", startTime: "2026-08-27T09:30:00+08:00", location: "慢π活动中心", price: 68, remainingSeats: 8, registeredCount: 6, coverUrl: "" }
];
const samplePosts = [
  { id: 1, content: "一次安静、充实的线下相遇，也认识了新的朋友。", likes: 18, comments: 4, activity: { title: "参与者活动心得" } },
  { id: 2, content: "从体验到共建，活动内容和现场服务都很完整。", likes: 12, comments: 3, activity: { title: "城市共建记录" } }
];

function clamp(value: unknown, fallback: number) {
  const number = Number(value ?? fallback);
  return Number.isFinite(number) ? Math.min(Math.max(number, 0), 100) : fallback;
}

function hexToRgb(value: unknown) {
  const match = String(value || "").trim().match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  return match ? `${parseInt(match[1], 16)}, ${parseInt(match[2], 16)}, ${parseInt(match[3], 16)}` : "15, 118, 110";
}

function rgba(color: unknown, opacity: unknown, fallback = 100) {
  return `rgba(${hexToRgb(color)}, ${clamp(opacity, fallback) / 100})`;
}

function sectionStyle(section: HomepageSectionView, fallback = "#ffffff") {
  const layout = (section.layout || {}) as Record<string, any>;
  const background = layout.backgroundImage
    ? `url(${layout.backgroundImage}) center/cover no-repeat, ${layout.backgroundColor || fallback}`
    : layout.backgroundColor || fallback;
  return {
    background,
    borderRadius: `${Number(layout.borderRadius ?? 8)}px`,
    marginBottom: `${Number(layout.spacingBottom ?? 14)}px`,
    color: String(layout.textColor || "#111827"),
    fontFamily: layout.fontStyle === "kaiti" ? '"STKaiti","KaiTi",serif' : layout.fontStyle === "serif" ? '"Noto Serif SC",serif' : "inherit",
    boxShadow: layout.cardStyle === "elevated" ? "0 12px 28px rgba(91,47,36,.14)" : layout.cardStyle === "outlined" ? "none" : "0 8px 18px rgba(91,47,36,.07)",
    border: layout.cardStyle === "outlined" || layout.dividerStyle === "line" ? "1px solid rgba(15,23,42,.1)" : "1px solid transparent",
    "--preview-primary": String(layout.primaryColor || "#0f766e"),
    "--preview-accent": String(layout.accentColor || "#c43d3d"),
    "--preview-muted": String(layout.mutedColor || "#667085"),
    "--preview-item": String(layout.itemBackgroundColor || "#fffaf3"),
    "--preview-chip": String(layout.chipBackgroundColor || "#fff7ec")
  };
}

function heroStyle(section: HomepageSectionView) {
  const config = (section.config || {}) as Record<string, any>;
  const layout = (section.layout || {}) as Record<string, any>;
  const base = config.backgroundColor || layout.backgroundColor || "#0f766e";
  const overlay = rgba(config.overlayColor || "#0f2327", config.overlayOpacity, config.backgroundImage ? 42 : 0);
  return {
    ...sectionStyle(section, base),
    background: config.backgroundImage ? `linear-gradient(90deg,${overlay},${overlay}),url(${config.backgroundImage}) center/${config.backgroundFit === "contain" ? "contain" : "cover"} no-repeat,${base}` : base,
    color: String(layout.textColor || "#ffffff")
  };
}

function quickStyle(section: HomepageSectionView) {
  const layout = (section.layout || {}) as Record<string, any>;
  return {
    ...sectionStyle(section, "transparent"),
    gridTemplateColumns: `repeat(${Math.min(Math.max(Number(layout.columns || 4), 2), 4)},1fr)`
  };
}

function sectionRows(section: HomepageSectionView, key: string) {
  const value = (section.data as Record<string, any> | undefined)?.[key];
  return Array.isArray(value) && value.length ? value : key === "activities" ? sampleActivities : key === "posts" ? samplePosts : sampleCategories;
}

function isHomeActivityFocus(section: HomepageSectionView) {
  return section.pageKey === "home" && section.type === "featured_activities" && section.config?.display !== "list";
}

function bannerImages(section: HomepageSectionView) {
  const config = (section.config || {}) as Record<string, any>;
  const rows = Array.isArray(config.images) ? config.images : [];
  const urls = rows.map((item: any) => typeof item === "string" ? item : item?.imageUrl || item?.url).filter(Boolean);
  if (config.imageUrl) urls.push(config.imageUrl);
  return [...new Set(urls.map(String))];
}

function enabledNav(section: HomepageSectionView) {
  return (((section.config as any)?.items || []) as any[]).filter((item) => item?.enabled !== false).slice(0, 5);
}

function title(section: HomepageSectionView) {
  const labels: Record<string, string> = {
    category_grid: "活动分类", featured_activities: "精选活动", activity_feed: "近期活动",
    testimonial_feed: "参与者心得", featured_testimonials: "精选心得", activity_testimonials: "活动口碑",
    charity_summary: "公益公示", course_recommendations: "专题推荐", mall_showcase: "商城精选"
  };
  return section.title || labels[section.type] || "内容模块";
}

function activityDateParts(value: unknown) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) return { month: "日期", day: "待定", time: "时间" };
  return {
    month: `${date.getMonth() + 1}月`,
    day: String(date.getDate()).padStart(2, "0"),
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
  };
}

function select(section: HomepageSectionView) {
  emit("select", section);
}
</script>

<template>
  <div class="device-frame" :class="{ large: device === 'large' }">
    <div class="device-status"><span>9:41</span><i></i></div>
    <div class="frontend-page">
      <div class="frontend-head">
        <div><small>慢π · {{ pageLabel }}</small><strong>发现值得参与的城市生活</strong></div>
        <b>搜</b>
      </div>

      <button
        v-for="section in rows"
        :key="section.id"
        type="button"
        class="preview-block"
        :class="{ focused: focusedId === section.id, fallback }"
        @click="select(section)"
      >
        <div v-if="section.type === 'search_bar'" class="decor-search" :style="sectionStyle(section)">
          <strong>{{ section.config?.cityLabel || "本地" }}</strong><span>{{ section.config?.placeholder || "搜索活动" }}</span><i>⌕</i>
        </div>

        <div v-else-if="section.type === 'hero'" class="decor-hero" :style="heroStyle(section)">
          <small :style="{ opacity: clamp(section.config?.textOpacity, 100) / 100 }">{{ section.config?.eyebrow || "慢π" }}</small>
          <h3 :style="{ opacity: clamp(section.config?.titleOpacity, 100) / 100 }">{{ section.title }}</h3>
          <p v-if="section.subtitle" :style="{ opacity: clamp(section.config?.subtitleOpacity, 86) / 100 }">{{ section.subtitle }}</p>
          <span v-if="section.config?.primaryButtonText" class="decor-action">{{ section.config.primaryButtonText }}</span>
          <div v-if="section.config?.showStats !== false" class="decor-stats"><span><b>9</b>报名中</span><span><b>10</b>全部活动</span></div>
        </div>

        <div v-else-if="section.type === 'announcement_bar'" class="decor-notice" :style="sectionStyle(section)">
          <strong>{{ title(section) }}</strong><span>{{ section.subtitle || "查看最新活动通知与现场须知" }}</span><b>›</b>
        </div>

        <div v-else-if="section.type === 'quick_nav'" class="decor-quick" :style="quickStyle(section)">
          <span v-for="item in ((section.config?.items as any[]) || []).slice(0, 8)" :key="item.label">
            <b :style="{ color: item.color || 'var(--preview-primary)', background: `${item.color || '#0f766e'}18` }">{{ item.icon || item.label?.slice(0,1) }}</b>{{ item.label }}
          </span>
        </div>

        <div v-else-if="section.type === 'image_banner'" class="decor-banner" :style="sectionStyle(section, '#dff4ee')">
          <img v-if="bannerImages(section)[0]" :src="bannerImages(section)[0]" alt="" />
          <div v-else><strong>{{ title(section) }}</strong><span>运营图片 Banner</span></div>
        </div>

        <div v-else-if="section.type === 'rich_text'" class="decor-card" :style="sectionStyle(section)">
          <h4>{{ title(section) }}</h4><img v-if="section.config?.imageUrl" :src="String(section.config.imageUrl)" alt="" /><p>{{ section.config?.content || section.subtitle || "报名须知与页面说明" }}</p>
        </div>

        <div v-else-if="section.type === 'category_grid'" class="decor-card" :style="sectionStyle(section)">
          <h4>{{ title(section) }}</h4><p v-if="section.subtitle">{{ section.subtitle }}</p>
          <div class="decor-chips"><span v-for="item in sectionRows(section, 'categories').slice(0, 5)" :key="item.id">{{ item.name }}</span></div>
        </div>

        <div v-else-if="section.type === 'activity_tabs'" class="decor-tabs" :style="sectionStyle(section, 'transparent')">
          <span>热门</span><span v-for="item in sectionRows(section, 'categories').slice(0, 4)" :key="item.id">{{ item.name }}</span>
        </div>

        <div v-else-if="isHomeActivityFocus(section)" class="activity-focus" :style="sectionStyle(section, '#eef7f4')">
          <img v-if="sectionRows(section, 'activities')[0]?.coverUrl" :src="sectionRows(section, 'activities')[0].coverUrl" alt="" />
          <div v-else class="activity-focus-cover">活动报名</div>
          <i class="focus-mask"></i>
          <small>{{ sectionRows(section, 'activities')[0]?.category?.name || "本周主推" }}</small>
          <aside><span>{{ activityDateParts(sectionRows(section, 'activities')[0]?.startTime).month }}</span><b>{{ activityDateParts(sectionRows(section, 'activities')[0]?.startTime).day }}</b><span>{{ activityDateParts(sectionRows(section, 'activities')[0]?.startTime).time }}</span></aside>
          <section>
            <h4>{{ sectionRows(section, 'activities')[0]?.title }}</h4>
            <p>{{ sectionRows(section, 'activities')[0]?.location || "地点待确认" }}</p>
            <footer><em>{{ sectionRows(section, 'activities')[0]?.registeredCount || 0 }} 人已报 · 余 {{ sectionRows(section, 'activities')[0]?.remainingSeats }}</em><span><strong>{{ Number(sectionRows(section, 'activities')[0]?.price) > 0 ? `¥${Number(sectionRows(section, 'activities')[0]?.price).toFixed(2)}` : "免费" }}</strong> 立即报名</span></footer>
          </section>
          <div v-if="section.config?.display === 'lead_rail'" class="activity-focus-rail">
            <article v-for="item in sectionRows(section, 'activities').slice(1, 3)" :key="item.id">
              <img v-if="item.coverUrl" :src="item.coverUrl" alt="" />
              <span v-else class="activity-focus-rail-cover">活动</span>
              <strong>{{ item.title }}</strong>
            </article>
          </div>
        </div>

        <div v-else-if="['featured_activities','activity_feed'].includes(section.type)" class="decor-card" :style="sectionStyle(section)">
          <h4>{{ title(section) }}</h4><p v-if="section.subtitle">{{ section.subtitle }}</p>
          <div class="activity-list">
            <article v-for="(item, index) in sectionRows(section, 'activities').slice(0, section.type === 'featured_activities' ? 2 : 3)" :key="item.id">
              <time><span>{{ activityDateParts(item.startTime).month }}</span><b>{{ activityDateParts(item.startTime).day }}</b><span>{{ activityDateParts(item.startTime).time }}</span></time>
              <img v-if="item.coverUrl" :src="item.coverUrl" alt="" /><span v-else class="activity-cover">{{ index === 0 ? "雅" : "集" }}</span>
              <div><strong>{{ item.title }}</strong><small>{{ item.location || "地点待确认" }}</small><footer><b>{{ Number(item.price) > 0 ? `¥${Number(item.price).toFixed(2)}` : "免费" }}</b><span>{{ item.registeredCount || 0 }} 人已报 · 余 {{ item.remainingSeats }}</span></footer></div>
            </article>
          </div>
        </div>

        <div v-else-if="['testimonial_feed','featured_testimonials','activity_testimonials'].includes(section.type)" class="decor-card" :style="sectionStyle(section)">
          <h4>{{ title(section) }}</h4><p v-if="section.subtitle">{{ section.subtitle }}</p>
          <div class="post-list">
            <article v-for="item in sectionRows(section, 'posts').slice(0, 2)" :key="item.id"><span>心得</span><div><strong>{{ item.activity?.title || "活动心得" }}</strong><p>{{ item.content }}</p><small>点赞 {{ item.likes || 0 }} · 评论 {{ item.comments || 0 }}</small></div></article>
          </div>
        </div>

        <div v-else-if="section.type === 'brand_story_entry'" class="story-entry" :style="sectionStyle(section, '#fff7ec')">
          <img v-if="section.config?.imageUrl" :src="String(section.config.imageUrl)" alt="" /><div><h4>{{ title(section) }}</h4><p>{{ section.subtitle || "了解慢π理念与城市共建方式" }}</p><span>{{ section.config?.buttonText || "了解更多" }}</span></div>
        </div>

        <div v-else-if="['charity_summary','course_recommendations','mall_showcase'].includes(section.type)" class="decor-card" :style="sectionStyle(section)">
          <h4>{{ title(section) }}</h4><p v-if="section.subtitle">{{ section.subtitle }}</p>
          <div class="link-grid"><span v-for="item in ((section.config?.items as any[]) || []).slice(0, 3)" :key="item.label"><b>{{ item.icon || item.label?.slice(0,1) }}</b>{{ item.label }}</span></div>
        </div>

        <div v-else-if="section.type === 'my_page'" class="my-preview" :style="{ background: String(section.layout?.heroBackgroundColor || '#fff7ec'), color: String(section.layout?.heroTextColor || '#5b2f24') }">
          <small>下午好</small><h3>{{ section.config?.greeting || section.title || "我的活动" }}</h3>
          <div><span v-for="item in ((section.config?.tools as any[]) || []).slice(0, 4)" :key="item.label"><b>{{ item.icon || item.label?.slice(0,1) }}</b>{{ item.label }}</span></div>
        </div>

        <div v-else-if="section.type === 'inner_pages'" class="decor-card" :style="sectionStyle(section)">
          <h4>{{ title(section) }}</h4><div class="inner-list"><span v-for="item in ((section.config?.pages as any[]) || []).slice(0, 5)" :key="item.key">{{ item.title }}<b>{{ item.showBottomNav === false ? "无底栏" : "有底栏" }}</b></span></div>
        </div>

        <div v-else-if="section.type === 'bottom_nav'" class="bottom-nav" :style="{ gridTemplateColumns: `repeat(${Math.max(enabledNav(section).length,1)},1fr)` }">
          <span v-for="item in enabledNav(section)" :key="item.label"><b>{{ item.icon || item.label?.slice(0,1) }}</b>{{ item.label }}</span>
        </div>
      </button>
      <div v-if="!rows.length" class="preview-empty">当前页面没有可见模块</div>
    </div>
  </div>
</template>

<style scoped>
.device-frame { width:357px; max-width:100%; height:min(680px,calc(100vh - 250px)); min-height:520px; display:flex; flex-direction:column; border:9px solid #172033; border-radius:30px; background:#f5f6f8; overflow:hidden; box-shadow:0 18px 40px rgba(16,24,40,.18); transition:width .2s ease; }
.device-frame.large { width:412px; }
.device-status { height:25px; flex:0 0 25px; display:flex; align-items:center; justify-content:space-between; padding:0 16px; background:#fff; color:#344054; font-size:10px; font-weight:800; }
.device-status i { width:54px; height:15px; border-radius:0 0 12px 12px; background:#172033; }
.frontend-page { flex:1; min-height:0; overflow-y:auto; padding:13px; scrollbar-width:thin; color:#111827; text-align:left; }
.frontend-head { display:flex; align-items:center; justify-content:space-between; padding:4px 2px 14px; }
.frontend-head div { min-width:0; }
.frontend-head small,.frontend-head strong { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.frontend-head small { color:#8b5a2b; font-size:10px; }
.frontend-head strong { margin-top:3px; font-family:"STKaiti","KaiTi",serif; font-size:15px; }
.frontend-head>b { width:30px; height:30px; display:grid; place-items:center; border-radius:8px; background:#edf1f5; color:#4a6b8a; font-size:11px; }
.preview-block { position:relative; display:block; width:100%; margin:0; padding:2px; border:2px solid transparent; border-radius:11px; background:transparent; color:inherit; text-align:left; cursor:pointer; }
.preview-block.focused { border-color:#16836f; box-shadow:0 0 0 3px rgba(22,131,111,.12); }
.preview-block.focused::after { content:"正在编辑"; position:absolute; z-index:4; top:-7px; right:7px; padding:2px 6px; border-radius:999px; background:#16836f; color:#fff; font-size:8px; }
.preview-block.fallback { opacity:.9; }
.decor-search,.decor-notice { display:grid; grid-template-columns:auto 1fr auto; gap:8px; align-items:center; padding:11px 12px; font-size:11px; }
.decor-search strong,.decor-notice strong { color:var(--preview-primary); }
.decor-search span,.decor-notice span { min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#667085; }
.decor-search i { color:#98a2b3; font-style:normal; }
.decor-hero { position:relative; overflow:hidden; padding:24px 18px; }
.decor-hero small { position:relative; z-index:1; color:rgba(255,255,255,.78); font-size:10px; font-weight:800; }
.decor-hero h3 { position:relative; z-index:1; margin:6px 0; max-width:92%; font-size:21px; line-height:1.2; }
.decor-hero p { position:relative; z-index:1; margin:0; color:rgba(255,255,255,.84); font-size:11px; line-height:1.5; }
.decor-action { position:relative; z-index:1; display:inline-flex; margin-top:13px; padding:7px 12px; border-radius:999px; background:rgba(255,255,255,.92); color:var(--preview-accent); font-size:10px; font-weight:900; }
.decor-stats { position:relative; z-index:1; display:grid; grid-template-columns:1fr 1fr; gap:7px; margin-top:14px; }
.decor-stats span { display:flex; align-items:center; gap:5px; padding:8px; border-radius:7px; background:rgba(255,255,255,.13); color:rgba(255,255,255,.8); font-size:9px; }
.decor-stats b { color:#fff; font-size:13px; }
.decor-quick { display:grid; gap:7px; padding:10px; }
.decor-quick>span { min-width:0; min-height:62px; display:grid; place-items:center; align-content:center; gap:4px; border-radius:8px; background:var(--preview-item); color:#344054; font-size:9px; font-weight:800; text-align:center; }
.decor-quick b { width:27px; height:27px; display:grid; place-items:center; border-radius:50%; font-size:11px; }
.decor-banner { min-height:88px; display:grid; place-items:center; overflow:hidden; padding:0; }
.decor-banner img { width:100%; height:100%; min-height:88px; object-fit:cover; }
.decor-banner div { display:grid; gap:4px; justify-items:center; color:var(--preview-primary); font-size:10px; }
.decor-card { padding:14px; }
.decor-card h4,.story-entry h4 { margin:0 0 5px; color:inherit; font-size:14px; }
.decor-card>p,.story-entry p { margin:0 0 10px; color:var(--preview-muted); font-size:10px; line-height:1.45; }
.decor-card>img { width:100%; max-height:130px; margin-bottom:8px; border-radius:7px; object-fit:cover; }
.decor-chips,.decor-tabs { display:flex; gap:6px; overflow:hidden; }
.decor-chips span,.decor-tabs span { flex:0 0 auto; padding:6px 9px; border-radius:999px; background:var(--preview-chip,#fff7ec); color:var(--preview-primary,#0f766e); font-size:9px; font-weight:800; }
.decor-tabs { margin-bottom:12px; padding:8px 4px; }
.activity-focus { position:relative; overflow:hidden; margin-bottom:12px; background:#173f3a; text-align:left; }
.activity-focus>small { position:absolute; z-index:2; top:10px; left:10px; padding:4px 7px; border-radius:6px; background:rgba(15,118,110,.92); color:#fff; font-size:8px; font-weight:900; }
.activity-focus>img,.activity-focus-cover { width:100%; height:146px; display:grid; place-items:center; object-fit:cover; background:linear-gradient(135deg,#d8ebe5,#f3e2cb); color:#0f766e; font-size:17px; font-weight:900; }
.activity-focus .focus-mask { position:absolute; inset:0 0 auto; height:146px; background:linear-gradient(180deg,rgba(8,37,34,.02),rgba(8,37,34,.65)); }
.activity-focus>aside { position:absolute; z-index:2; top:10px; right:10px; width:42px; display:grid; justify-items:center; padding:5px 3px; border-radius:7px; background:rgba(255,255,255,.94); color:var(--preview-primary); font-size:7px; font-style:normal; font-weight:800; }
.activity-focus>aside b { margin:2px 0; color:#173f3a; font-size:20px; line-height:1; }
.activity-focus>section { position:relative; z-index:2; margin-top:-44px; padding:11px 12px 12px; border-radius:11px 11px 0 0; background:#fff; }
.activity-focus h4 { margin:0 0 4px; color:#111827; font-size:14px; }
.activity-focus p { margin:0; color:#667085; font-size:9px; }
.activity-focus footer { display:flex; align-items:center; justify-content:space-between; gap:6px; margin-top:10px; }
.activity-focus footer em { overflow:hidden; color:#667085; font-size:8px; font-style:normal; text-overflow:ellipsis; white-space:nowrap; }
.activity-focus footer strong { color:#fff4d6; font-size:10px; }
.activity-focus footer span { flex:0 0 auto; padding:6px 8px; border-radius:6px; background:var(--preview-primary); color:#fff; font-size:8px; font-weight:900; }
.activity-focus-rail { display:flex; gap:8px; overflow:hidden; padding:0 10px 10px; background:#fff; }
.activity-focus-rail article { min-width:112px; display:grid; grid-template-columns:40px minmax(0,1fr); align-items:center; gap:7px; padding:6px; border:1px solid rgba(15,118,110,.1); border-radius:7px; background:#f8fbfa; }
.activity-focus-rail img,.activity-focus-rail-cover { width:40px; height:32px; display:grid; place-items:center; border-radius:5px; object-fit:cover; background:#d9e9e4; color:#0f766e; font-size:8px; }
.activity-focus-rail strong { overflow:hidden; color:#173f3a; font-size:9px; text-overflow:ellipsis; white-space:nowrap; }
.activity-list,.post-list { display:grid; gap:8px; }
.activity-list article { display:grid; grid-template-columns:34px 60px 1fr; gap:8px; min-width:0; min-height:60px; padding:7px; border:1px solid rgba(15,118,110,.08); border-radius:8px; background:#fff; }
.activity-list time { display:grid; align-content:center; justify-items:center; color:var(--preview-primary); font-size:7px; font-style:normal; font-weight:800; }
.activity-list time b { margin:2px 0; color:#173f3a; font-size:17px; line-height:1; }
.activity-list img,.activity-cover { width:60px; height:60px; display:grid; place-items:center; border-radius:6px; object-fit:cover; background:linear-gradient(135deg,#d9e9e4,#f3e2cb); color:#5b2f24; font-family:"KaiTi",serif; font-size:22px; }
.activity-list article>div { min-width:0; }
.activity-list strong,.activity-list small { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.activity-list strong { font-size:11px; }
.activity-list small { margin-top:5px; color:#667085; font-size:8px; }
.activity-list footer { display:flex; justify-content:space-between; margin-top:7px; color:#667085; font-size:8px; }
.activity-list footer b { color:var(--preview-accent); }
.post-list article { display:grid; grid-template-columns:48px 1fr; gap:8px; padding:8px; border-radius:8px; background:var(--preview-item); }
.post-list article>span { height:48px; display:grid; place-items:center; border-radius:7px; background:#e6efe9; color:#315c4c; font-size:10px; font-weight:800; }
.post-list strong { font-size:10px; }
.post-list p { display:-webkit-box; margin:4px 0; overflow:hidden; -webkit-line-clamp:2; -webkit-box-orient:vertical; color:#475467; font-size:9px; line-height:1.4; }
.post-list small { color:#98a2b3; font-size:8px; }
.link-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; }
.link-grid span { display:grid; justify-items:center; gap:5px; padding:9px 4px; border-radius:7px; background:var(--preview-item); font-size:9px; font-weight:800; }
.link-grid b { width:28px; height:28px; display:grid; place-items:center; border-radius:50%; background:var(--preview-chip); color:var(--preview-primary); font-size:11px; }
.story-entry { display:grid; grid-template-columns:auto 1fr; gap:10px; padding:14px; }
.story-entry img { width:74px; height:82px; border-radius:8px; object-fit:cover; }
.story-entry span { display:inline-flex; padding:5px 9px; border-radius:999px; background:var(--preview-primary,#8b5a2b); color:#fff; font-size:9px; font-weight:800; }
.my-preview { padding:18px 14px; border-radius:10px; margin-bottom:12px; }
.my-preview small { opacity:.68; font-size:9px; }
.my-preview h3 { margin:4px 0 14px; font-size:20px; }
.my-preview>div { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; }
.my-preview span { display:grid; justify-items:center; gap:4px; font-size:8px; }
.my-preview b { width:28px; height:28px; display:grid; place-items:center; border-radius:8px; background:rgba(255,255,255,.45); }
.inner-list { display:grid; gap:6px; }
.inner-list span { display:flex; justify-content:space-between; padding:7px 8px; border-radius:6px; background:#f8fafc; font-size:9px; }
.inner-list b { color:#98a2b3; font-weight:500; }
.bottom-nav { position:sticky; z-index:3; bottom:-13px; display:grid; gap:3px; margin-top:6px; padding:8px 5px 10px; border-top:1px solid #eaecf0; background:#fff; box-shadow:0 -8px 20px rgba(15,23,42,.08); }
.bottom-nav span { min-width:0; display:grid; justify-items:center; gap:3px; color:#667085; font-size:8px; }
.bottom-nav b { width:24px; height:24px; display:grid; place-items:center; border-radius:50%; background:#f2f4f7; color:#c43d3d; font-size:10px; }
.preview-empty { padding:60px 20px; color:#98a2b3; font-size:11px; text-align:center; }
@media (max-width:1024px) { .device-frame { width:min(357px,100%); height:620px; } .device-frame.large { width:min(412px,100%); } }
</style>
