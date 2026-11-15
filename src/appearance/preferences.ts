import { APPEARANCE_RANGES, appearanceConfig as config, type AppearancePreferences, WALLPAPER_MODES, type WallpaperMode } from "./config";
import { getAppearanceCapabilities, getAppearanceDefaults } from "./defaults";

export const APPEARANCE_CHANGE_EVENT = "ireina:appearance-change";
export const APPEARANCE_STORAGE_KEY = "ireina-appearance";
export { getAppearanceCapabilities, WALLPAPER_MODES };
export const isWallpaperMode = (value: unknown): value is WallpaperMode => WALLPAPER_MODES.includes(value as WallpaperMode);

export function readStorage(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function writeStorage(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* 隐私模式禁止存储时仍可在当前页面使用。 */ }
}
export function getDefaultPreferences(): AppearancePreferences {
  return getAppearanceDefaults();
}
/** 规则与 AppearanceHead.astro 的首屏内联脚本一致：范围和模式列表都来自 config.ts。 */
export function normalizePreferences(value: unknown, defaults: AppearancePreferences): AppearancePreferences {
  const object = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const number = (key: keyof typeof APPEARANCE_RANGES) => {
    const raw = object[key];
    const { min, max, step } = APPEARANCE_RANGES[key];
    return typeof raw === "number" && Number.isFinite(raw) ? Math.round(Math.min(max, Math.max(min, raw)) / step) * step : defaults[key];
  };
  const boolean = (key: "wideScreen" | "bannerTitle" | "waves" | "sakura") => typeof object[key] === "boolean" ? object[key] as boolean : defaults[key];
  const capabilities = getAppearanceCapabilities();
  return {
    opacity: config.wallpaperEffects.opacity ? number("opacity") : defaults.opacity,
    blur: config.wallpaperEffects.blur ? number("blur") : defaults.blur,
    cardOpacity: config.wallpaperEffects.cardOpacity ? number("cardOpacity") : defaults.cardOpacity,
    wideScreen: config.controls.wideScreen ? boolean("wideScreen") : defaults.wideScreen,
    bannerTitle: capabilities.bannerTitle ? (config.controls.bannerTitle ? boolean("bannerTitle") : defaults.bannerTitle) : false,
    waves: capabilities.waves ? (config.controls.waves ? boolean("waves") : defaults.waves) : false,
    sakura: config.controls.sakura ? boolean("sakura") : defaults.sakura,
  };
}
let sessionPreferences: AppearancePreferences | undefined;
export function getAppearancePreferences(): AppearancePreferences {
  if (sessionPreferences) return { ...sessionPreferences };
  const defaults = getDefaultPreferences();
  try { return normalizePreferences(JSON.parse(readStorage(APPEARANCE_STORAGE_KEY) || "null"), defaults); }
  catch { return defaults; }
}
export function setAppearancePreferences(value: AppearancePreferences): void {
  const normalized = normalizePreferences(value, getDefaultPreferences());
  sessionPreferences = normalized;
  writeStorage(APPEARANCE_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(APPEARANCE_CHANGE_EVENT, { detail: normalized }));
}
export function refreshAppearancePreferences(): void {
  sessionPreferences = undefined;
  window.dispatchEvent(new CustomEvent(APPEARANCE_CHANGE_EVENT, { detail: getAppearancePreferences() }));
}
