/** 用户仓库的外观扩展；关闭后回到 Shirone 原有面板，不改主题依赖。 */
export const appearanceConfig = {
  enable: true,
  // 未指定时沿用 shirones/config/siteConfig.ts 的默认背景；可改成 fullscreen / overlay / none。
  defaultMode: undefined as WallpaperMode | undefined,
  wallpaperEffects: { opacity: true, blur: true, cardOpacity: true },
  defaults: { opacity: 0.8, blur: 1.5, cardOpacity: 0.8, wideScreen: true, bannerTitle: true, waves: true, sakura: false },
  controls: { wideScreen: true, bannerTitle: true, waves: true, sakura: true },
  // 1920 CSS 像素及以上只扩展文章页；正文保留独立的可读宽度约束。
  wideScreen: { pageWidth: "clamp(104rem, 82vw, 132rem)", largePageWidth: "clamp(132rem, 64vw, 152rem)", readingWidth: "clamp(48rem, 40vw, 64rem)", largeReadingWidth: "clamp(64rem, calc(20vw + 24rem), 72rem)" },
  // 装饰按需加载，无外部资源；默认不飘花，博客「减少动态效果」/省流量/后台时不运行。
  sakura: { desktopCount: 24, mobileCount: 10 },
} satisfies AppearanceConfig;

/** 壁纸模式与效果取值范围的唯一来源；首屏内联脚本通过 define:vars 拿到同一份数据。 */
export const WALLPAPER_MODES = ["banner", "fullscreen", "overlay", "none"] as const;
export type WallpaperMode = (typeof WALLPAPER_MODES)[number];
export const APPEARANCE_RANGES = {
  opacity: { min: 0.2, max: 1, step: 0.01 },
  blur: { min: 0, max: 12, step: 0.5 },
  cardOpacity: { min: 0.2, max: 1, step: 0.01 },
} as const;
export interface AppearancePreferences {
  opacity: number;
  blur: number;
  cardOpacity: number;
  wideScreen: boolean;
  bannerTitle: boolean;
  waves: boolean;
  sakura: boolean;
}
export interface AppearanceConfig {
  enable: boolean;
  defaultMode?: WallpaperMode;
  wallpaperEffects: { opacity: boolean; blur: boolean; cardOpacity: boolean };
  defaults: AppearancePreferences;
  controls: { wideScreen: boolean; bannerTitle: boolean; waves: boolean; sakura: boolean };
  wideScreen: { pageWidth: string; largePageWidth: string; readingWidth: string; largeReadingWidth: string };
  sakura: { desktopCount: number; mobileCount: number };
}
