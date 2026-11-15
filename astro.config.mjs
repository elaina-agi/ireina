import { defineConfig } from "astro/config";
import shirones from "shirones";
import { appearanceOverlay } from "./src/appearance/overlay.mjs";
import { motionPlugin } from "./src/motion/plugin.mjs";
import { friendApplyDevServer } from "./src/friends/dev-server.mjs";
import { twikooDevServer } from "./src/comment/dev-server.mjs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

// 博客扩展通过脚本和构建适配接入，不改主题文件；升级后需复验动效适配契约。
const extras = {
  name: "ireina-extras",
  hooks: {
    "astro:config:setup": ({ injectScript }) => {
      injectScript("page", 'import "/src/motion/runtime.ts";');
      // 看板娘(配置:src/kanban/config.js)
      injectScript("page", 'import "/src/kanban/boot.js";');
      // 顶部横幅换成自己的 Cloudflare 壁纸接口(配置:src/wallpaper/config.js)
      injectScript("page", 'import "/src/wallpaper/banner.js";');
    },
  },
};

// Site-level settings (site URL, base, title, theme colour, fonts, …) live in
// `shirones/config/` so they stay typed and version-controlled with your
// content. This file only wires the theme in.
export default defineConfig({
  vite: {
    plugins: [
      motionPlugin(root),
      appearanceOverlay(root),
      // 友链申请接口:本地由开发服务器提供,上线由 Vercel 运行 api/friend-apply.js(说明:docs/friend-apply.md)
      friendApplyDevServer(root),
      // Twikoo 评论接口:本地由开发服务器提供,上线由 Vercel 运行 api/twikoo.js(说明:docs/twikoo.md)
      twikooDevServer(root),
    ],
    optimizeDeps: {
      // shirones 的源码和别名必须经过主题 overlay；预打包会绕过它并内联默认配置。
      // 只排除主题自身，Svelte 等第三方依赖仍可正常预打包；生产构建不受影响。
      exclude: [
        "shirones",
        "@",
        "@components",
        "@layouts",
        "@utils",
        "@i18n",
        "@constants",
        "@assets",
      ],
    },
  },
  integrations: [
    shirones({
      // Override individual components by mirroring the theme's structure in
      // `src/components/`, or point at them explicitly:
      // components: { "atoms/blog/PostCard": "./src/components/PostCard.astro" },
    }),
    extras,
  ],
});
