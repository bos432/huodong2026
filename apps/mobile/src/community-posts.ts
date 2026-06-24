export type CommunityPost = {
  id: number;
  avatar: string;
  nickname: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
  liked: boolean;
  images?: string[];
  source?: string;
  status?: string;
  shareCount?: number;
  activity?: {
    id: number;
    title: string;
    coverUrl?: string | null;
    startTime?: string;
    endTime?: string;
    location?: string;
  } | null;
};

function relativeTime(value?: string) {
  if (!value) return "刚刚";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return value;
  const diff = Date.now() - time;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(Math.floor(diff / minute), 1)}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}天前`;
  return new Date(value).toISOString().slice(0, 10);
}

export function defaultCommunityPosts() {
  return [];
}

export function normalizeCommunityPosts(payload: any) {
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
  if (!rows.length) return [];
  return rows.map((item: any, index: number) => ({
    id: Number(item.id || index + 1),
    avatar: item.avatar || `/static/avatar${(index % 3) + 1}.png`,
    nickname: item.nickname || item.user?.nickname || "慢π同学",
    time: relativeTime(item.createdAt || item.time),
    content: item.content || "",
    likes: Number(item.likes || 0),
    comments: Number(item.comments || 0),
    liked: Boolean(item.liked),
    images: Array.isArray(item.images) ? item.images : [],
    source: item.source || "official",
    status: item.status || "approved",
    shareCount: Number(item.shareCount || 0),
    activity: item.activity || null
  }));
}
