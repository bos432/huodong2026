import { request } from "./api";

export type CourseCard = {
  id: number;
  title: string;
  teacher: string;
  teacherAvatar?: string;
  price: number;
  originalPrice: number;
  coverUrl: string;
  icon: string;
  color: string;
  category: string;
  rating: string;
  reviewCount: number;
  tag: string;
  hot: number;
  createdAt: string;
  progress?: number;
};

const palette = ["#F5E6D3", "#E8E0D8", "#DCE8E0", "#E0DCE8", "#F0E8E0"];
const icons = ["📜", "📚", "☯", "🖌", "🌿", "🧘", "⛰", "✍"];
const FAVORITE_COURSE_IDS_KEY = "favorite_course_ids";

export function normalizeCourse(row: any, index = 0): CourseCard {
  const tags = Array.isArray(row?.tags) ? row.tags : [];
  const price = Number(row?.price || 0);
  const id = Number(row?.id || 0);
  return {
    id,
    title: row?.title || "未命名课程",
    teacher: row?.teacherName || "慢π",
    teacherAvatar: row?.teacherAvatar || "",
    price,
    originalPrice: Number(row?.originalPrice || 0),
    coverUrl: row?.coverUrl || "",
    icon: icons[(id || index) % icons.length],
    color: palette[(id || index) % palette.length],
    category: row?.categoryName || "全部",
    rating: Number(row?.rating || 0).toFixed(1),
    reviewCount: Number(row?.reviewCount || 0),
    tag: tags[0] || (price === 0 ? "限时免费" : ""),
    hot: Number(row?.hotCount || 0),
    createdAt: row?.createdAt || "",
    progress: Number(row?.progress || 0)
  };
}

export async function fetchPublishedCourses() {
  const rows = await request<any[]>("/public/courses");
  return (Array.isArray(rows) ? rows : []).map(normalizeCourse);
}

export async function fetchPublishedCourse(id: number) {
  const row = await request<any>(`/public/courses/${id}`);
  return row ? normalizeCourse(row) : null;
}

export function priceText(value: number | string) {
  const price = Number(value || 0);
  return price > 0 ? `¥${price.toFixed(2)}` : "免费";
}

export function favoriteCourseIds() {
  const raw = uni.getStorageSync(FAVORITE_COURSE_IDS_KEY);
  if (!Array.isArray(raw)) return [] as number[];
  return raw.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0);
}

export function isFavoriteCourse(id: number) {
  return favoriteCourseIds().includes(Number(id));
}

export function toggleFavoriteCourse(id: number) {
  const courseId = Number(id);
  if (!courseId) return false;
  const ids = favoriteCourseIds();
  const exists = ids.includes(courseId);
  const next = exists ? ids.filter((item) => item !== courseId) : [courseId, ...ids];
  uni.setStorageSync(FAVORITE_COURSE_IDS_KEY, next);
  return !exists;
}
