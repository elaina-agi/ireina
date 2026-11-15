import { wallpaperConfig as config } from "./config.js";

export const WALLPAPER_SOURCE_CHANGE_EVENT = "ireina:wallpaper-source-change";
export const WALLPAPER_SOURCE_STORAGE_KEY = "ireina-wallpaper-source";
export const WALLPAPER_STATE_EVENT = "ireina:wallpaper-state";
export const WALLPAPER_SOURCE_RESET_EVENT = "ireina:wallpaper-source-reset";
export const RANDOM_WALLPAPER_SOURCE = "random";

export interface WallpaperSourceOption {
  id: string;
  name: string;
  supports: readonly ("image" | "video")[];
}
export interface WallpaperRuntimeSnapshot {
  selectedSource: string;
  defaultSource: string;
  busy: boolean;
  canChange: boolean;
  reason: "hidden" | "mobile" | "background" | null;
  status: "idle" | "loading" | "ready" | "error";
  current: { source: string; sourceId: string; type: "image" | "video"; src: string } | null;
}
export interface WallpaperRuntime {
  next(): Promise<boolean>;
  setSource(id: string): void;
  getSnapshot(): WallpaperRuntimeSnapshot;
  readonly current: WallpaperRuntimeSnapshot["current"];
}

type ConfiguredSource = {
  id?: unknown; name?: unknown; type?: unknown; enable?: unknown;
  api?: unknown; url?: unknown; supports?: unknown; images?: unknown; videos?: unknown;
};
const hasMedia = (value: unknown) => Array.isArray(value) && value.some(item => typeof item === "string" && item.trim());
export function getWallpaperSourceId(source: ConfiguredSource, index: number): string {
  return typeof source.id === "string" && source.id.trim()
    ? source.id.trim()
    : `source-${typeof source.name === "string" ? encodeURIComponent(source.name) : index}`;
}
export function getWallpaperSourceSupports(source: ConfiguredSource): ("image" | "video")[] {
  if (source.enable === false) return [];
  if (source.type === "worker") {
    if (typeof source.api !== "string" || !source.api.trim()) return [];
    return Array.isArray(source.supports)
      ? [...new Set(source.supports.filter((item): item is "image" | "video" => item === "image" || item === "video"))]
      : ["image", "video"];
  }
  if (source.type === "direct") return typeof source.url === "string" && source.url.trim() ? ["image"] : [];
  if (source.type === "list") {
    const result: ("image" | "video")[] = [];
    if (hasMedia(source.images)) result.push("image");
    if (hasMedia(source.videos)) result.push("video");
    return result;
  }
  return [];
}
export function getWallpaperSourceOptions(): WallpaperSourceOption[] {
  const sources: ConfiguredSource[] = Array.isArray(config.sources) ? config.sources : [];
  const seen = new Set<string>();
  return sources.flatMap((source, index) => {
    const id = getWallpaperSourceId(source, index);
    const name = typeof source.name === "string" ? source.name.trim() : "";
    const supports = getWallpaperSourceSupports(source);
    if (!name || !supports.length || seen.has(id) || id === RANDOM_WALLPAPER_SOURCE) return [];
    seen.add(id);
    return [{ id, name, supports }];
  });
}
export function isWallpaperSourcePickerEnabled(): boolean {
  return config.sourcePicker?.enable === true && getWallpaperSourceOptions().length > 0;
}
export function getDefaultWallpaperSource(options = getWallpaperSourceOptions()): string {
  const configured = typeof config.source === "string" ? config.source.trim() : "";
  if (configured === RANDOM_WALLPAPER_SOURCE || options.some(option => option.id === configured)) return configured;
  return config.pick === "random" ? RANDOM_WALLPAPER_SOURCE : options[0]?.id ?? RANDOM_WALLPAPER_SOURCE;
}
export function normalizeWallpaperSource(value: unknown, options = getWallpaperSourceOptions()): string {
  return value === RANDOM_WALLPAPER_SOURCE || (typeof value === "string" && options.some(option => option.id === value))
    ? value as string : getDefaultWallpaperSource(options);
}
let sessionSource: string | undefined;
export function getStoredWallpaperSource(): string {
  if (!isWallpaperSourcePickerEnabled()) return getDefaultWallpaperSource();
  if (sessionSource) return sessionSource;
  let stored: string | null = null;
  try { stored = localStorage.getItem(WALLPAPER_SOURCE_STORAGE_KEY); } catch { /* Session fallback. */ }
  return normalizeWallpaperSource(stored);
}
export function setWallpaperSource(value: string): string {
  if (!isWallpaperSourcePickerEnabled()) return getDefaultWallpaperSource();
  const previous = getStoredWallpaperSource();
  const source = normalizeWallpaperSource(value);
  sessionSource = source;
  try { localStorage.setItem(WALLPAPER_SOURCE_STORAGE_KEY, source); } catch { /* Keep this session usable. */ }
  document.documentElement.dataset.wallpaperSource = source;
  if (source !== previous) window.dispatchEvent(new CustomEvent(WALLPAPER_SOURCE_CHANGE_EVENT, { detail: { source } }));
  return source;
}
export function refreshWallpaperSource(): string {
  sessionSource = undefined;
  const source = getStoredWallpaperSource();
  document.documentElement.dataset.wallpaperSource = source;
  window.dispatchEvent(new CustomEvent(WALLPAPER_SOURCE_CHANGE_EVENT, { detail: { source } }));
  return source;
}

declare global { interface Window { wallpaper?: WallpaperRuntime; } }
