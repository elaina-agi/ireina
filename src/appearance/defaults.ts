import { siteConfig } from "@/config/siteConfig.ts";
import { appearanceConfig as config, type AppearancePreferences } from "./config";

/**
 * 站点能力：首页标题 / 波浪在 siteConfig 里完全关闭时，访客不能在面板里重新打开。
 * 服务器端（Layout、AppearanceHead）和浏览器端（preferences.ts）共用，不再往页面里额外输出一份 JSON。
 */
export function getAppearanceCapabilities(): { bannerTitle: boolean; waves: boolean } {
  return { bannerTitle: siteConfig.banner.homeText.enable, waves: siteConfig.banner.waves.enable };
}

/** 外观偏好的站点默认值（已按站点能力收紧）。 */
export function getAppearanceDefaults(): AppearancePreferences {
  const capabilities = getAppearanceCapabilities();
  return {
    ...config.defaults,
    bannerTitle: config.defaults.bannerTitle && capabilities.bannerTitle,
    waves: config.defaults.waves && capabilities.waves,
  };
}
