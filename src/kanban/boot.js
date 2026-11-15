/**
 * 看板娘启动脚本:astro.config.mjs 里的 kanban 集成把它注入到每个页面
 * 组件是 kanban-widget 项目的打包结果(vendor/);更新组件时,把它 dist/ 里的
 * kanban.js 和 l2d-*.js 换进 vendor/(先删掉旧的 l2d-*.js)
 *
 * 站内跳转走 Swup,只替换页面中间的内容,看板娘挂在 body 上不会被重建
 */
import { kanbanConfig } from "./config.js";
import { createKanban } from "./vendor/kanban.js";
import { bindKanbanMotion } from "./motion.js";
import "./kanban.css";

// 站点部署在子路径(siteConfig 里的 base)时,模型地址要跟着加前缀
const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");
// Capture only the host created by this instance; do not bind another widget on the page.
const existingHosts = new Set(document.querySelectorAll("kanban-widget"));
const kanban = createKanban({
  ...kanbanConfig,
  models: kanbanConfig.models.map((m) => ({ ...m, path: base + m.path })),
});
const host = [...document.querySelectorAll("kanban-widget")].find(element => !existingHosts.has(element));
const unbindMotion = bindKanbanMotion(kanban, host);
if (import.meta.hot) import.meta.hot.dispose(unbindMotion);

// 方便在浏览器控制台里玩:kanban.say('...')
window.kanban = kanban;
