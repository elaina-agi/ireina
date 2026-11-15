import type { ProfileConfig } from "@/types/config";
import { withUserConfig } from "@/utils/config-overlay.ts";

/**
 * 博主资料：头像 / 名称 / 简介 / 社交链接（侧栏 Profile 卡片、页脚、RSS 作者等消费）。
 * 类型见 src/types/config.ts。
 */
export const profileConfig: ProfileConfig = withUserConfig("profile", {
	avatar: "../shirones/assets/images/elaina-avatar.png", // 用户头像，使用主题的用户素材解析与响应式 WebP
	name: "Elaina",
	bio: "The rain remembers what the sky forgot to say.",
	links: [
		/* 暂未配置 X 和 Steam，先隐藏；需要时取消这段注释。
		{
			name: "X",
			icon: "fa6-brands:x-twitter", // Visit https://icones.js.org/ for icon codes
			// You will need to install the corresponding icon set if it's not already included
			// `pnpm add @iconify-json/<icon-set-name>`
			url: "https://x.com",
		},
		{
			name: "Steam",
			icon: "fa6-brands:steam",
			url: "https://store.steampowered.com",
		},
		*/
		{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/elaina-agi",
		},
	],
});
