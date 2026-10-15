import teaImage from "../../assets/weekend-inspiration/tea-table.jpg";
import walkImage from "../../assets/weekend-inspiration/city-walk.jpg";
import craftImage from "../../assets/weekend-inspiration/craft-bookmark.jpg";
import readingImage from "../../assets/weekend-inspiration/reading-weekend.jpg";
import writingImage from "../../assets/weekend-inspiration/handwriting.jpg";
import photoImage from "../../assets/weekend-inspiration/phone-photo.jpg";

export interface WeekendInspiration {
  id: string;
  category: string;
  title: string;
  place: string;
  summary: string;
  body: string;
  context: string;
  image: string;
  sourceName: string;
  sourceUrl: string;
}

export interface RealActivityReview {
  title: string;
  date: string;
  place: string;
  summary: string;
  sourceName: string;
  sourceUrl: string;
}

export const tongliangActivityReviews: RealActivityReview[] = [{
  title: "铜梁平滩 2026 年龙柚文化季",
  date: "2026-10-12",
  place: "平滩镇九龙街小广场",
  summary: "铜梁区融媒体中心报道：现场包含文艺汇演、亲子创意手作和村级特色展台。活动已经结束，不开放报名。",
  sourceName: "华龙网 / 铜梁区融媒体中心（2026-10-12）",
  sourceUrl: "https://www.cqnews.net/web/content_1559307961814040576.html"
}];

export function queryRealActivityReviews(tenantCode: string) {
  return tenantCode === "cq_tongliang" ? tongliangActivityReviews : [];
}

export const weekendInspirations: WeekendInspiration[] = [
  {
    id: "old-town", category: "城市漫步", title: "安居古城，沿老街慢慢走", place: "铜梁 · 安居古城",
    summary: "从街巷、会馆到江岸，把半天留给古城的日常。",
    body: "安居古城的看点不止一处地标。古县城、巴渝与移民文化在街巷中交汇，适合把步行、观察建筑和江边休息串成一段轻松的城市漫步。\n\n可以为自己设三个观察主题：门楣上的纹样、老街的生活细节、江岸的光影。行程长短按体力决定，开放范围与场馆安排出发前向景区确认。",
    context: "地点灵感 · 无固定场次，不提供报名", image: teaImage,
    sourceName: "重庆市政府 · 铜梁之旅", sourceUrl: "https://www.cq.gov.cn/zjcq/cycq/jplyxl/zby/bhtt/202408/t20240808_13482547.html"
  },
  {
    id: "lake", category: "轻户外", title: "玄天湖，走一段有风的绿道", place: "铜梁 · 玄天湖",
    summary: "巴岳山下，不赶全程，挑一段风景把脚步慢下来。",
    body: "玄天湖位于巴岳山脚下，官方介绍的环湖绿道近十公里。湖面、小岛与山色构成适合步行观察的景观。\n\n不必把走完全程当作目标，可以按天气和体力选一段折返路线，沿途看看水鸟与植物。带好饮水，穿防滑鞋；观鸟保持距离，不投喂、不靠近水边危险区域。当天通行情况以现场提示为准。",
    context: "路线灵感 · 无固定场次，不提供报名", image: walkImage,
    sourceName: "重庆市政府 · 铜梁区玄天湖环湖绿道", sourceUrl: "https://www.cq.gov.cn/zjcq/ydjs/scbd/202408/t20240808_13482641.html"
  },
  {
    id: "dragon", category: "手作体验", title: "从一盏龙灯，认识铜梁非遗", place: "铜梁 · 龙乡文化",
    summary: "看看造型与用色，画一张自己的龙乡观察卡。",
    body: "铜梁的龙文化既在舞动的长龙里，也在龙灯彩扎的手艺中。可以先从公开资料认识龙舞与龙灯，再在参观时留意龙头、龙鳞、用色和结构，记录自己最喜欢的细节。\n\n画纹样、做纸面拼贴，是适合延伸的创作想法；这不是已经开设的体验课。线下展演、场馆与手作预约应以主办方最新公告为准。",
    context: "文化与创作灵感 · 不提供预约", image: craftImage,
    sourceName: "铜梁区政府 · 旅游资源", sourceUrl: "https://www.cqstl.gov.cn/qq_171/dlhj/lyzy/202203/t20220304_10465525.html"
  },
  {
    id: "reading", category: "阅读分享", title: "亲子共读，把故事带进周末", place: "铜梁 · 公共阅读空间",
    summary: "一段绘本共读，一个小小提问，让故事有回声。",
    body: "铜梁区图书馆公开活动预告中曾安排小龙人“铜”读一本书等绘本分享。把这种阅读方式带进自己的周末：选一本适龄绘本，轮流读一段，聊聊最喜欢的角色，再画下一个故事场景。\n\n若想参加馆内活动，请查看图书馆最新通知与报名规则。所引资料为2026年8月历史预告，不代表本周仍有同名场次。",
    context: "阅读灵感 · 引用场次已结束（2026年8月）", image: readingImage,
    sourceName: "铜梁区文旅委 · 8月群文活动预告（2026-07-29）", sourceUrl: "https://www.cqstl.gov.cn/bm/qwhlyw_71115/zwgk_70831/fdzdgknr_70834/qtgknr/jczwgk/ggwhfwlyxxgk/ggfw3/zczx258/202607/t20260729_15869409.html"
  },
  {
    id: "autumn", category: "自然体验", title: "节气手作，留住秋天的颜色", place: "铜梁 · 秋日生活",
    summary: "认识节气、观察叶色，用纸和黏土记录一季变化。",
    body: "铜梁区博物馆历史群文活动曾把节气知识与手工制作结合，例如寒露主题花糕、霜降主题黏土柿子树。\n\n可以从这些做法获得灵感：读一段节气介绍，观察身边的秋色，再用纸或黏土做一件小作品。这里介绍的是居家创作思路，2025年10月的历史场次已经结束；馆内下一期安排以官方新公告为准。",
    context: "节气灵感 · 引用场次已结束（2025年10月）", image: writingImage,
    sourceName: "铜梁区文旅委 · 10月群文活动预告（2025年）", sourceUrl: "https://www.cqstl.gov.cn/bm/qwhlyw_71115/zwgk_70831/fdzdgknr_70834/qtgknr/jczwgk/ggwhfwlyxxgk/ggfw3/zczx258/202509/t20250928_15049501.html"
  },
  {
    id: "harvest", category: "影像记录", title: "柚见龙乡，一场秋日丰收记录", place: "铜梁 · 平滩镇",
    summary: "龙舞、亲子彩绘与本地农产，看看龙乡的秋日聚会。",
    body: "据铜梁区融媒体中心报道，2026年10月12日，龙柚文化季在平滩镇九龙街小广场启幕。现场把文艺表演、亲子创意手作和本地农产展台结合起来，出现了柚子彩绘、黏土造型和主题手串等内容。\n\n这是一则已发生的活动记录，可以作为认识当地文化与秋日创作的素材；报道没有确认后续场次，不提供当前报名或采摘承诺。",
    context: "活动记录 · 2026-10-12，不代表仍在举办", image: photoImage,
    sourceName: "华龙网 / 铜梁区融媒体中心（2026-10-12）", sourceUrl: "https://www.cqnews.net/web/content_1559307961814040576.html"
  }
];

export function queryInspirations(tenantCode: string, category: string, keyword: string) {
  if (!["cq_tongliang", "qiwai-showcase", "manpi-demo"].includes(tenantCode)) return [];
  const query = keyword.trim().toLowerCase();
  return weekendInspirations.filter(item => (category === "推荐" || item.category === category)
    && (!query || `${item.title}${item.place}${item.summary}${item.body}${item.category}`.toLowerCase().includes(query)));
}
