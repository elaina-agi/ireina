import { appearanceConfig as config } from "./config";
import { APPEARANCE_CHANGE_EVENT, APPEARANCE_STORAGE_KEY, getAppearancePreferences, refreshAppearancePreferences } from "./preferences";
import { getStoredWallpaperMode, setWallpaperMode } from "../utils/setting-utils";
import { WALLPAPER_MODE_CHANGE_EVENT } from "@constants/constants";

export function initAppearance(): void {
  if (!config.enable || document.documentElement.dataset.ireinaAppearanceBound === "true") return;
  document.documentElement.dataset.ireinaAppearanceBound = "true";
  const html = document.documentElement;
  // Explicit opt-in for Sakura only: the blog's reduce-motion switch still wins.
  // Do not change the system preference or other wallpaper/UI motion policies.

  let generation = 0;
  let petals: { destroy(): void } | undefined;
  let loading = false;
  let wanted = false;
  const canAnimate = () => !html.classList.contains("motion-reduced") && !document.hidden && !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  const syncSakura = () => {
    const next = getAppearancePreferences().sakura && canAnimate();
    if (next === wanted) return;
    wanted = next;
    generation += 1;
    if (!next) { petals?.destroy(); petals = undefined; return; }
    if (loading) return;
    const start = async () => {
      loading = true;
      const token = generation;
      try {
        const { startSakura } = await import("./sakura");
        if (token === generation && wanted) petals = startSakura(config.sakura);
      } catch (error) {
        console.warn("[外观] 落樱模块暂时不可用", error);
        // Keep the latest wanted state. A new off/on action may retry;
        // a failed old generation must never turn the effect back on.
      } finally {
        loading = false;
        if (token !== generation && wanted && !petals) { wanted = false; syncSakura(); }
      }
    };
    void start();
  };
  const sync = () => {
    const value = getAppearancePreferences();
    html.dataset.ireinaPage = document.querySelector<HTMLElement>("#swup-container")?.dataset.currentPage || "";
    html.dataset.ireinaWideScreen = String(value.wideScreen);
    html.dataset.ireinaBannerTitle = String(value.bannerTitle);
    html.dataset.ireinaWaves = String(value.waves);
    html.dataset.ireinaSakura = String(value.sakura);
    html.style.setProperty("--ireina-wallpaper-opacity", String(value.opacity));
    html.style.setProperty("--ireina-wallpaper-blur", `${value.blur}px`);
    html.style.setProperty("--ireina-card-alpha", `${value.cardOpacity * 100}%`);
    html.style.setProperty("--ireina-wide-width", config.wideScreen.pageWidth);
    html.style.setProperty("--ireina-wide-large-width", config.wideScreen.largePageWidth);
    html.style.setProperty("--ireina-reading-width", config.wideScreen.readingWidth);
    html.style.setProperty("--ireina-reading-large-width", config.wideScreen.largeReadingWidth);
    syncSakura();
  };
  sync();
  window.addEventListener(APPEARANCE_CHANGE_EVENT, () => {
    sync();
    window.dispatchEvent(new CustomEvent(WALLPAPER_MODE_CHANGE_EVENT, { detail: { mode: getStoredWallpaperMode() } }));
  });
  window.addEventListener("storage", event => {
    if (event.key === APPEARANCE_STORAGE_KEY || event.key === null) refreshAppearancePreferences();
    if (event.key === "wallpaper-mode" || event.key === null) {
      delete html.dataset.wallpaperMode;
      setWallpaperMode(getStoredWallpaperMode());
    }
  });
  new MutationObserver(syncSakura).observe(html, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("visibilitychange", syncSakura);
  const bind = () => {
    if (!window.swup?.hooks || html.dataset.ireinaAppearanceSwup === "true") return;
    html.dataset.ireinaAppearanceSwup = "true";
    window.swup.hooks.on("content:replace", sync);
    window.swup.hooks.on("page:view", sync);
    window.swup.hooks.on("visit:start", () => document.getElementById("display-setting")?.classList.add("float-panel-closed"));
    window.swup.hooks.on("content:scroll", async (
      visit: { to: { hash?: string }; history: { popstate: boolean } },
      args: undefined,
      defaultHandler?: (visit: { to: { hash?: string }; history: { popstate: boolean } }, args: undefined) => boolean | Promise<boolean>,
    ) => {
      const container = document.querySelector<HTMLElement>("#swup-container");
      if (getStoredWallpaperMode() === "fullscreen" && container?.dataset.currentPage !== "home" && !visit.to.hash && !visit.history.popstate) {
        // Banner's own route synchronization runs on the next animation frame.
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        const target = document.getElementById("main-grid");
        if (target && document.body.dataset.bannerLayout === "banner") {
          const top = scrollY + target.getBoundingClientRect().top - (document.getElementById("navbar")?.offsetHeight ?? 64);
          const swup = window.swup as typeof window.swup & { scrollTo?: (top: number, animate?: boolean) => void };
          if (swup.scrollTo) swup.scrollTo(top, false);
          else window.scrollTo({ top, behavior: "instant" });
          return true;
        }
      }
      return defaultHandler?.(visit, args) ?? false;
    }, { replace: true, priority: 10 });
  };
  bind();
  document.addEventListener("swup:enable", bind, { once: true });
}
