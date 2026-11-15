import { appearanceConfig, type WallpaperMode } from "../appearance/config";
import type { SidebarPage } from "@/types/sidebarConfig";

export type BannerViewport = "desktop" | "mobile";
export type BannerContentLayout = "banner" | "compact";

export type BannerCopyMode = "home" | "context" | null;

export interface BannerStateInput {
	mode: WallpaperMode;
	page: SidebarPage | undefined;
	viewport: BannerViewport;
	imageCount: number;
	carouselEnabled: boolean;
	reducedMotion: boolean;
}

export interface BannerState {
	visible: boolean;
	assetGroup: BannerViewport | null;
	copyMode: BannerCopyMode;
	rotate: boolean;
	transparentTopAppBar: boolean;
	contentLayout: BannerContentLayout;
}

export function resolveBannerState(input: BannerStateInput): BannerState {
	const isHome = input.page === "home";
	const overlay = appearanceConfig.enable && input.mode === "overlay";
	const visible = input.imageCount > 0 && (overlay ||
		((input.mode === "banner" || (appearanceConfig.enable && input.mode === "fullscreen")) &&
		(input.viewport === "desktop" || isHome)));
	const homeTitleVisible = typeof document === "undefined" || document.documentElement.dataset.ireinaBannerTitle !== "false";

	const copyMode: BannerCopyMode = !visible || overlay || (isHome && !homeTitleVisible)
		? null
		: isHome
			? "home"
			: "context";

	return {
		visible,
		assetGroup: visible ? input.viewport : null,
		copyMode,
		rotate:
			visible &&
			input.carouselEnabled &&
			input.imageCount > 1 &&
			!input.reducedMotion,
		transparentTopAppBar: visible && !overlay,
		contentLayout: visible && !overlay ? "banner" : "compact",
	};
}
