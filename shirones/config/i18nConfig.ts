import I18nKey from "@i18n/i18nKey";
import type { I18nConfig } from "@/types/i18nConfig.ts";
import { withUserConfig } from "@/utils/config-overlay.ts";

// 只覆盖简体中文的显示设置文案，英文及其他语言继续使用主题词典。
export const i18nConfig: I18nConfig = withUserConfig("i18n", {
	zh_CN: {
		[I18nKey.themeColor]: "主题色",
		[I18nKey.styleTonalSpot]: "柔和",
		[I18nKey.styleVibrant]: "鲜艳",
		[I18nKey.styleContent]: "内容取色",
		[I18nKey.styleExpressive]: "灵动",
		[I18nKey.styleRainbow]: "彩虹",
		[I18nKey.styleFruitSalad]: "缤纷",
		[I18nKey.styleMonochrome]: "单色",
		[I18nKey.styleNeutral]: "中性",
		[I18nKey.styleFidelity]: "忠实原色",
		[I18nKey.resetConfirmMessage]: "将恢复为站点默认的色相、配色风格与配色规范。",
	},
});
