/// <reference path="../node_modules/shirones/src/global.d.ts" />
// 用户覆盖组件需要主题已声明的 Swup 持久运行时类型。

// 友链申请表单用到的 Cloudflare Turnstile 全局对象(脚本由 FriendApplyForm 按需加载)。
interface Window {
	turnstile?: {
		render(container: HTMLElement | string, options: Record<string, unknown>): string;
		reset(widgetId?: string): void;
		remove(widgetId?: string): void;
	};
}
