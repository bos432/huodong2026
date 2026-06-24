import { request } from "./api";
import { ref } from "vue";

type PageTheme = {
  brandName?: string;
  brandLogoUrl?: string;
  brandSlogan?: string;
  adminTitle?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundOverlayColor?: string;
  backgroundOverlayOpacity?: number;
  cardBackgroundColor?: string;
  cardOpacity?: number;
  cardRadius?: number;
  textColor?: string;
  mutedColor?: string;
  primaryColor?: string;
};

const defaultTheme: Required<PageTheme> = {
  brandName: "慢π",
  brandLogoUrl: "",
  brandSlogan: "和慢π一起，让热爱发光",
  adminTitle: "",
  backgroundColor: "#F5F0E8",
  backgroundImage: "",
  backgroundOverlayColor: "#F5F0E8",
  backgroundOverlayOpacity: 0,
  cardBackgroundColor: "#FFFFFF",
  cardOpacity: 100,
  cardRadius: 20,
  textColor: "#333333",
  mutedColor: "#666666",
  primaryColor: "#C43D3D"
};

export const pageBrand = ref({
  name: defaultTheme.brandName,
  logoUrl: defaultTheme.brandLogoUrl,
  slogan: defaultTheme.brandSlogan
});

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(numeric, min), max);
}

function hexToRgb(hex?: string) {
  const normalized = (hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return { r: 255, g: 255, b: 255 };
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
}

function rgba(hex: string, opacityPercent: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(opacityPercent, 0, 100, 100) / 100})`;
}

function normalizeTheme(theme?: PageTheme | null) {
  return { ...defaultTheme, ...(theme || {}) };
}

export function applyPageTheme(theme?: PageTheme | null) {
  const normalized = normalizeTheme(theme);
  const brandTitle = String(normalized.brandName || defaultTheme.brandName).trim() || defaultTheme.brandName;
  pageBrand.value = {
    name: brandTitle,
    logoUrl: String(normalized.brandLogoUrl || ""),
    slogan: String(normalized.brandSlogan || defaultTheme.brandSlogan)
  };
  const cardOpacity = clamp(normalized.cardOpacity, 40, 100, defaultTheme.cardOpacity);
  const overlayOpacity = clamp(normalized.backgroundOverlayOpacity, 0, 90, defaultTheme.backgroundOverlayOpacity);
  const cardRadius = clamp(normalized.cardRadius, 0, 24, defaultTheme.cardRadius);
  const cardBg = rgba(normalized.cardBackgroundColor, cardOpacity);
  const overlay = rgba(normalized.backgroundOverlayColor, overlayOpacity);
  const imageLayer = normalized.backgroundImage ? `linear-gradient(${overlay}, ${overlay}), url("${normalized.backgroundImage}")` : "none";
  const pageBgLayer = normalized.backgroundImage ? `${imageLayer}, ${normalized.backgroundColor}` : normalized.backgroundColor;

  // #ifdef H5
  const root = document.documentElement;
  document.title = brandTitle;
  root.style.setProperty("--page-bg", normalized.backgroundColor);
  root.style.setProperty("--page-bg-layer", pageBgLayer);
  root.style.setProperty("--page-bg-image", imageLayer);
  root.style.setProperty("--page-bg-size", "cover");
  root.style.setProperty("--page-bg-position", "center top");
  root.style.setProperty("--card-bg", cardBg);
  root.style.setProperty("--card-radius", `${cardRadius}px`);
  root.style.setProperty("--text-color", normalized.textColor);
  root.style.setProperty("--muted-color", normalized.mutedColor);
  root.style.setProperty("--primary-color", normalized.primaryColor);
  root.style.setProperty("--primary-soft", rgba(normalized.primaryColor, 14));
  // #endif
  uni.setNavigationBarTitle({ title: brandTitle });
}

export async function loadPageTheme() {
  try {
    const setting = await request<{ pageTheme?: PageTheme }>("/public/settings/operation");
    applyPageTheme(setting?.pageTheme);
  } catch {
    applyPageTheme(defaultTheme);
  }
}
