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
};

const DEFAULT_POSTS: CommunityPost[] = [
  { id: 1, avatar: "/static/avatar1.png", nickname: "学而时习", time: "2小时前", content: "今日抄写《论语》学而篇第一，深感温故而知新。纸上得来终觉浅，绝知此事要躬行。", likes: 12, comments: 3, liked: false, images: ["/static/post1.png"] },
  { id: 2, avatar: "/static/avatar2.png", nickname: "书道中人", time: "昨天", content: "楷书练习第21天，终于找到一点感觉了。老师说得对，功夫在字外。", likes: 8, comments: 2, liked: false, images: [] }
];

const STORAGE_KEY = "community_post_interactions";

function interactionState(): Record<string, { liked?: boolean; commentsAdded?: number }> {
  const raw = uni.getStorageSync(STORAGE_KEY);
  return raw && typeof raw === "object" ? raw as Record<string, { liked?: boolean; commentsAdded?: number }> : {};
}

function saveInteractionState(value: Record<string, { liked?: boolean; commentsAdded?: number }>) {
  uni.setStorageSync(STORAGE_KEY, value);
}

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
  return applyCommunityInteractions(DEFAULT_POSTS.map((post) => ({ ...post, images: [...(post.images || [])] })));
}

export function normalizeCommunityPosts(payload: any) {
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
  if (!rows.length) return [];
  return applyCommunityInteractions(rows.map((item: any, index: number) => ({
    id: Number(item.id || index + 1),
    avatar: item.avatar || `/static/avatar${(index % 3) + 1}.png`,
    nickname: item.nickname || item.user?.nickname || "书院同学",
    time: relativeTime(item.createdAt || item.time),
    content: item.content || "",
    likes: Number(item.likes || 0),
    comments: Number(item.comments || 0),
    liked: false,
    images: Array.isArray(item.images) ? item.images : []
  })));
}

export function applyCommunityInteractions(posts: CommunityPost[]) {
  const state = interactionState();
  return posts.map((post) => {
    const saved = state[String(post.id)] || {};
    return {
      ...post,
      liked: Boolean(saved.liked),
      likes: Math.max(0, post.likes + (saved.liked ? 1 : 0)),
      comments: post.comments + Number(saved.commentsAdded || 0)
    };
  });
}

export function toggleCommunityLike(post: CommunityPost) {
  const state = interactionState();
  const key = String(post.id);
  const nextLiked = !post.liked;
  state[key] = { ...(state[key] || {}), liked: nextLiked };
  saveInteractionState(state);
  post.liked = nextLiked;
  post.likes = Math.max(0, post.likes + (nextLiked ? 1 : -1));
}

export function addCommunityComment(post: CommunityPost) {
  const state = interactionState();
  const key = String(post.id);
  state[key] = { ...(state[key] || {}), commentsAdded: Number(state[key]?.commentsAdded || 0) + 1 };
  saveInteractionState(state);
  post.comments += 1;
}
