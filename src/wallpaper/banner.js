/**
 * 随机壁纸的持久媒体层：banner / fullscreen / overlay 共用同一元素。
 * 主题图始终留在下方，随机源失败、移动端禁用或减少动效切图片时可立即回退。
 * 媒体加载由一个可取消的世代拥有；Swup 不重新创建这个运行时。
 */
import { wallpaperConfig as cfg } from "./config.js";
import { prefersReducedMotion, subscribeMotionPreference } from "../motion/policy";
import {
  getWallpaperSourceId, getWallpaperSourceOptions, getWallpaperSourceSupports,
  getDefaultWallpaperSource, getStoredWallpaperSource, setWallpaperSource, refreshWallpaperSource,
  isWallpaperSourcePickerEnabled, RANDOM_WALLPAPER_SOURCE, WALLPAPER_SOURCE_CHANGE_EVENT,
  WALLPAPER_SOURCE_STORAGE_KEY, WALLPAPER_STATE_EVENT, WALLPAPER_SOURCE_RESET_EVENT,
} from "./source-preference";

const sources = (Array.isArray(cfg.sources) ? cfg.sources : []).map((source, index) => ({ ...source, id: getWallpaperSourceId(source, index) }));
const apiOf = (source) => typeof source.api === "string" ? source.api.trim().replace(/\/+$/, "") : "";
const poolOf = (source, type) => (Array.isArray(type === "video" ? source.videos : source.images) ? type === "video" ? source.videos : source.images : []).filter((url) => typeof url === "string" && url.trim());
function supports(source, type) { return getWallpaperSourceSupports(source).includes(type); }

const media = document.querySelector("#banner-wrapper .banner-stage__media");
const sourceIds = new Set(getWallpaperSourceOptions().map(source => source.id));
const activeSources = sources.filter((source, index) => sourceIds.has(source.id) && sources.findIndex(item => item.id === source.id) === index);
// 没有可用源时不加载 CSS，不注册监听器，不创建 DOM。
if (media && activeSources.length && document.documentElement.dataset.ireinaWallpaperBound !== "true") initWallpaper(media, activeSources);

function initWallpaper(media, activeSources) {
  const html = document.documentElement;
  const stage = media.closest("#banner-wrapper");
  const mobileMq = matchMedia("(max-width: 1023.98px)");
  const connection = navigator.connection;
  const retiring = new Map();
  let current = null;
  let suspendedVideo = null;
  let operation = null;
  let generation = 0;
  let attempted = false;
  let intervalTimer = null;
  let cssPromise;
  let previousMobile = mobileMq.matches;
  let previousVideoAllowed;
  const pickerEnabled = isWallpaperSourcePickerEnabled();
  let selectedSource = pickerEnabled ? getStoredWallpaperSource() : getDefaultWallpaperSource();
  let needsRefresh = false;
  let status = "idle";
  let lastSnapshot = "";
  // A1：等页面自身资源加载完、浏览器空闲后再请求随机壁纸，不和首屏抢网速；期间显示主题原图。
  let started = false;
  // A2：同一标签页内刷新时，复用上一张 Worker / 列表壁纸（地址固定，可走浏览器缓存），
  // 不重新抽取下载。「换一张」、换来源、定时轮换仍会抽新的。直链随机 API 不复用：
  // 它的真实图片地址藏在跳转后面，页面读不到，复用同一个地址也拿不到同一张图。
  const SESSION_KEY = "ireina-wallpaper-session";
  let sessionReuse = true;
  // A4：一次 Swup 跳转会连续触发多个事件，合并成每帧最多一次 sync()。
  let syncFrame = 0;

  const mode = () => html.dataset.wallpaperMode || "banner";
  const viewport = () => mobileMq.matches ? "mobile" : "desktop";
  const saveData = () => connection?.saveData === true;
  const allowVideo = () => !mobileMq.matches && !saveData() && !prefersReducedMotion();
  const currentPage = () => document.querySelector("#swup-container")?.dataset.currentPage || document.body.dataset.currentPage;
  const requestAllowed = () => {
    if (document.hidden || mode() === "none" || !media.isConnected) return false;
    if (!mobileMq.matches) return true;
    if (!cfg.mobile) return false;
    return mode() === "overlay" || currentPage() === "home";
  };
  function getSnapshot() {
    const reason = document.hidden ? "background" : mode() === "none" ? "hidden" : mobileMq.matches && (!cfg.mobile || (mode() !== "overlay" && currentPage() !== "home")) ? "mobile" : null;
    return {
      selectedSource, defaultSource: getDefaultWallpaperSource(), busy: !!operation,
      canChange: !operation && requestAllowed(), reason, status,
      current: current && { source: current.dataset.source, sourceId: current.dataset.sourceId, type: current.tagName === "VIDEO" ? "video" : "image", src: current.dataset.src },
    };
  }
  function emit() {
    if (!pickerEnabled) return;
    const snapshot = getSnapshot();
    const key = JSON.stringify(snapshot);
    if (key === lastSnapshot) return;
    lastSnapshot = key;
    window.dispatchEvent(new CustomEvent(WALLPAPER_STATE_EVENT, { detail: snapshot }));
  }
  function rememberAsset(source, asset, run) {
    if (source.type === "direct") return;
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ sourceId: source.id, type: asset.type, src: asset.src, viewport: run.viewport })); }
    catch { /* 存储不可用时只是不复用。 */ }
  }
  function forgetAsset() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* 存储不可用。 */ }
  }
  function recallAsset(run) {
    let saved;
    try { saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
    if (!saved || typeof saved.src !== "string" || saved.viewport !== run.viewport) return null;
    const source = activeSources.find(item => item.id === saved.sourceId);
    if (!source || source.type === "direct") return null;
    if (selectedSource !== RANDOM_WALLPAPER_SOURCE && selectedSource !== source.id) return null;
    const type = saved.type === "video" ? "video" : "image";
    if (!supports(source, type) || (type === "video" && (cfg.mode === "image" || !allowVideo()))) return null;
    try {
      const url = new URL(saved.src, location.href);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    } catch { return null; }
    return { source, asset: { type, src: saved.src } };
  }
  function orderedSources() {
    if (selectedSource === RANDOM_WALLPAPER_SOURCE) return shuffle(activeSources);
    const order = [selectedSource, ...(Array.isArray(cfg.fallback) ? cfg.fallback : []), ...activeSources.map(source => source.id)];
    return [...new Set(order)].map(id => activeSources.find(source => source.id === id)).filter(Boolean);
  }
  const visible = () => {
    if (document.hidden || mode() === "none" || !stage || getComputedStyle(stage).display === "none") return false;
    if (mode() === "overlay") return true;
    const rect = stage.getBoundingClientRect();
    return rect.height > 0 && rect.bottom > 0 && rect.top < innerHeight;
  };
  const pick = (items) => items[Math.floor(Math.random() * items.length)];
  const shuffle = (items) => items.map((value) => [Math.random(), value]).sort((a, b) => a[0] - b[0]).map((pair) => pair[1]);
  const bust = (url) => `${url}${url.includes("?") ? "&" : "?"}_=${Math.random().toString(36).slice(2, 10)}`;
  const aborted = () => new DOMException("壁纸加载已取消", "AbortError");
  const valid = (run) => operation === run && run.generation === generation && !run.controller.signal.aborted && run.viewport === viewport() && requestAllowed();
  const assertValid = (run) => { if (!valid(run)) throw aborted(); };

  function release(element) {
    if (!element) return;
    const timer = retiring.get(element);
    if (timer) clearTimeout(timer);
    retiring.delete(element);
    if (element.tagName === "VIDEO") {
      element.pause();
      element.removeAttribute("src");
      element.load();
    }
    element.remove();
  }
  function cancelPending() {
    generation += 1;
    const pending = operation;
    operation = null;
    pending?.controller.abort();
    if (pending) { needsRefresh = true; attempted = false; status = current ? "ready" : "idle"; }
  }
  function stopInterval() {
    if (intervalTimer !== null) clearTimeout(intervalTimer);
    intervalTimer = null;
  }
  function scheduleInterval() {
    stopInterval();
    if (!(cfg.interval > 0) || prefersReducedMotion() || !requestAllowed() || !visible()) return;
    intervalTimer = setTimeout(() => {
      intervalTimer = null;
      void next().finally(scheduleInterval);
    }, Math.max(Number(cfg.interval), 10) * 1000);
  }

  async function resolve(source, type, run) {
    const signal = run.controller.signal;
    assertValid(run);
    if (source.type === "direct") return { type: "image", src: bust((run.viewport === "mobile" && source.mobileUrl) || source.url) };
    if (source.type === "list") {
      const all = poolOf(source, type);
      const candidates = all.filter((url) => url !== current?.dataset.src && url !== suspendedVideo?.dataset.src);
      return { type, src: pick(candidates.length ? candidates : all) };
    }
    const controller = new AbortController();
    const cancel = () => controller.abort();
    signal.addEventListener("abort", cancel, { once: true });
    const timer = setTimeout(cancel, 8000);
    try {
      const api = apiOf(source);
      const response = await fetch(`${api}/api/random?type=${type}`, { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      assertValid(run);
      if (typeof data?.url !== "string" || !data.url.trim()) throw new Error("接口没有返回有效 url");
      const url = new URL(data.url, `${api}/`);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("接口返回了不支持的地址");
      return { type: data.type === "video" ? "video" : "image", src: url.href };
    } finally {
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
    }
  }

  function loadElement(asset, run) {
    const signal = run.controller.signal;
    return new Promise((resolve, reject) => {
      const element = document.createElement(asset.type === "video" ? "video" : "img");
      let settled = false;
      const cleanup = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", cancel);
        element.removeEventListener("error", error);
        element.removeEventListener(asset.type === "video" ? "loadeddata" : "load", loaded);
      };
      const fail = (reason) => {
        if (settled) return;
        settled = true;
        cleanup();
        element.removeAttribute("src");
        release(element);
        reject(reason);
      };
      const finish = () => {
        if (settled) return;
        if (!valid(run) || (asset.type === "video" && !allowVideo())) return fail(aborted());
        settled = true;
        cleanup();
        resolve(element);
      };
      const cancel = () => fail(aborted());
      const error = () => fail(new Error("文件加载失败"));
      const loaded = () => {
        if (asset.type === "video") finish();
        else element.decode().catch(() => {}).then(finish);
      };
      const timer = setTimeout(() => fail(new Error("加载超时")), asset.type === "video" ? 20000 : 15000);
      element.className = "ireina-wall";
      element.setAttribute("aria-hidden", "true");
      element.dataset.src = asset.src;
      element.dataset.viewport = run.viewport;
      element.addEventListener("error", error, { once: true });
      element.addEventListener(asset.type === "video" ? "loadeddata" : "load", loaded, { once: true });
      signal.addEventListener("abort", cancel, { once: true });
      if (asset.type === "video") {
        element.muted = true;
        element.loop = true;
        element.playsInline = true;
        // 保留 "auto"：要等到第一帧（loadeddata）才淡入，紧接着就开始播放，并不浪费；
        // 改成 "metadata" 时部分浏览器不加载第一帧，会等到 20 秒超时、视频永远不出现。
        element.preload = "auto";
        element.setAttribute("muted", "");
      } else {
        element.alt = "";
        element.decoding = "async";
      }
      if (signal.aborted) return cancel();
      element.src = asset.src;
    });
  }

  function show(element) {
    const old = current;
    current = element;
    element.hidden = false;
    if (cfg.kenBurns && element.tagName === "IMG") element.classList.add("ireina-wall--kenburns");
    media.append(element);
    // Reduced motion settles immediately; full motion also fades in a restored cached video.
    if (prefersReducedMotion()) element.classList.add("is-on");
    else {
      element.classList.remove("is-on");
      void element.offsetWidth;
      requestAnimationFrame(() => { if (current === element && mode() !== "none") element.classList.add("is-on"); });
    }
    if (old && old !== element) {
      if (old.tagName === "VIDEO") old.pause();
      if (prefersReducedMotion()) release(old);
      else retiring.set(old, setTimeout(() => release(old), 1500));
    }
    syncPlayback();
  }

  async function next(imageOnly = false) {
    if (operation || !requestAllowed()) { emit(); return false; }
    attempted = true;
    needsRefresh = false;
    stopInterval();
    const run = { controller: new AbortController(), generation: ++generation, viewport: viewport() };
    operation = run;
    status = "loading";
    emit();
    let success = false;
    try {
      cssPromise ??= import("./wallpaper.css?inline").then((module) => module.default);
      const css = await cssPromise;
      assertValid(run);
      if (!document.getElementById("ireina-wallpaper-style")) {
        const style = document.createElement("style");
        style.id = "ireina-wallpaper-style";
        style.textContent = css;
        document.head.append(style);
      }
      // A2：只有本页第一次自动加载才尝试复用；失败就忘掉记录，按正常顺序重新抽取。
      const reuse = !imageOnly && sessionReuse ? recallAsset(run) : null;
      sessionReuse = false;
      if (reuse) {
        let element;
        try {
          element = await loadElement(reuse.asset, run);
          assertValid(run);
          element.dataset.source = reuse.source.name;
          element.dataset.sourceId = reuse.source.id;
          if (suspendedVideo) { release(suspendedVideo); suspendedVideo = null; }
          show(element);
          success = true;
          return true;
        } catch (error) {
          if (element) release(element);
          if (!valid(run)) return false;
          forgetAsset();
          console.warn("[壁纸] 上一张壁纸没加载出来，改为重新抽取:", error.message);
        }
      }
      for (const source of orderedSources()) {
        // Source priority comes before media type: a selected image API must not be
        // skipped merely because another source can provide video in mixed mode.
        const firstType = imageOnly || cfg.mode === "image" || !allowVideo() || !supports(source, "video")
          ? "image" : cfg.mode === "video" || Math.random() < .5 ? "video" : "image";
        const types = (firstType === "video" ? ["video", "image"] : ["image"]).filter(type => supports(source, type));
        for (const type of types) {
          let element;
          try {
            assertValid(run);
            const asset = await resolve(source, type, run);
            assertValid(run);
            if (asset.type === "video" && !allowVideo()) throw new Error("当前偏好不允许视频，回退图片源");
            element = await loadElement(asset, run);
            assertValid(run);
            element.dataset.source = source.name;
            element.dataset.sourceId = source.id;
            // Keep a preference-suspended video while its temporary image fallback loads.
            // Explicit refresh/source changes still replace the old selection.
            if (suspendedVideo && !imageOnly) { release(suspendedVideo); suspendedVideo = null; }
            show(element);
            // 临时图片（视频被暂时挂起时的替身）不记录，刷新后仍以视频为准。
            if (!imageOnly) rememberAsset(source, asset, run);
            success = true;
            return true;
          } catch (error) {
            if (element) release(element);
            if (!valid(run)) return false;
            console.warn(`[壁纸] ${source.name}(${type === "video" ? "视频" : "图片"})没加载出来:`, error.message);
          }
        }
      }
      return false;
    } catch (error) {
      if (valid(run)) console.warn("[壁纸] 壁纸层初始化失败:", error.message);
      return false;
    } finally {
      // Cancelled older requests cannot overwrite the newer request's state.
      if (operation === run) {
        operation = null;
        status = success ? "ready" : "error";
        scheduleInterval();
        emit();
      }
    }
  }

  function syncPlayback() {
    const playing = !prefersReducedMotion() && visible() && requestAllowed();
    for (const element of [current, suspendedVideo, ...retiring.keys()]) {
      if (!element) continue;
      const active = element === current && playing;
      element.classList.toggle("is-paused", !active);
      if (element.tagName !== "VIDEO") continue;
      if (!active || !allowVideo()) element.pause();
      else element.play().catch(() => {});
    }
  }

  function scheduleSync() {
    // 后台标签页没有动画帧，立即执行，保证取消加载、暂停视频不被推迟。
    if (document.hidden) {
      if (syncFrame) cancelAnimationFrame(syncFrame);
      syncFrame = 0;
      sync();
      return;
    }
    if (syncFrame) return;
    syncFrame = requestAnimationFrame(() => { syncFrame = 0; sync(); });
  }

  function sync() {
    // A1：启动前只同步面板状态，不发请求。
    if (!started) { emit(); return; }
    if (prefersReducedMotion()) {
      for (const element of [...retiring.keys()]) release(element);
    }
    const mobile = mobileMq.matches;
    const videoAllowed = allowVideo();
    if (mobile !== previousMobile) {
      previousMobile = mobile;
      cancelPending();
      release(current); current = null;
      release(suspendedVideo); suspendedVideo = null;
      for (const element of [...retiring.keys()]) release(element);
      attempted = false;
    }
    if (!requestAllowed()) {
      cancelPending();
      if (!current) attempted = false;
      stopInterval();
      if (mode() === "none") {
        if (current?.tagName === "VIDEO") { release(current); current = null; attempted = false; }
        release(suspendedVideo); suspendedVideo = null;
        for (const element of [...retiring.keys()]) if (element.tagName === "VIDEO") release(element);
      }
      previousVideoAllowed = videoAllowed;
      syncPlayback();
      emit();
      return;
    }
    if (previousVideoAllowed !== undefined && videoAllowed !== previousVideoAllowed) cancelPending();
    previousVideoAllowed = videoAllowed;
    if (!videoAllowed && current?.tagName === "VIDEO") {
      release(suspendedVideo);
      suspendedVideo = current;
      suspendedVideo.pause();
      suspendedVideo.hidden = true;
      suspendedVideo.classList.remove("is-on");
      current = null;
      attempted = false;
    } else if (videoAllowed && suspendedVideo) {
      cancelPending();
      const restored = suspendedVideo;
      suspendedVideo = null;
      show(restored);
      attempted = true;
      needsRefresh = false;
      status = "ready";
    }
    if ((needsRefresh || (!current && !attempted)) && !operation) void next(!!suspendedVideo);
    else if (current) current.classList.add("is-on");
    syncPlayback();
    scheduleInterval();
    emit();
  }

  function sourceChanged() {
    const nextSource = getStoredWallpaperSource();
    if (nextSource === selectedSource) { emit(); return; }
    sessionReuse = false;
    selectedSource = nextSource;
    html.dataset.wallpaperSource = selectedSource;
    cancelPending();
    stopInterval();
    release(suspendedVideo); suspendedVideo = null;
    for (const element of [...retiring.keys()]) release(element);
    needsRefresh = true;
    attempted = false;
    status = current ? "ready" : "idle";
    if (requestAllowed()) void next();
    emit();
  }
  html.dataset.ireinaWallpaperBound = "true";
  if (pickerEnabled) {
    html.dataset.wallpaperSource = selectedSource;
    window.addEventListener(WALLPAPER_SOURCE_CHANGE_EVENT, sourceChanged);
    window.addEventListener(WALLPAPER_SOURCE_RESET_EVENT, () => setWallpaperSource(getDefaultWallpaperSource()));
    window.addEventListener("storage", event => {
      if (event.key === WALLPAPER_SOURCE_STORAGE_KEY || event.key === null) refreshWallpaperSource();
    });
  }
  previousVideoAllowed = allowVideo();
  new MutationObserver(scheduleSync).observe(html, { attributes: true, attributeFilter: ["data-wallpaper-mode", "data-ireina-page"] });
  new MutationObserver(scheduleSync).observe(document.body, { attributes: true, attributeFilter: ["data-current-page", "data-banner-visible", "data-banner-layout"] });
  if (stage && typeof IntersectionObserver !== "undefined") new IntersectionObserver(() => { syncPlayback(); scheduleInterval(); }, { threshold: [0, .01] }).observe(stage);
  else window.addEventListener("scroll", syncPlayback, { passive: true });
  document.addEventListener("visibilitychange", scheduleSync);
  document.addEventListener("swup:content:replace", scheduleSync);
  document.addEventListener("swup:page:view", scheduleSync);
  mobileMq.addEventListener("change", scheduleSync);
  // This subscription lives with the persistent media shell, like the Swup/visibility listeners.
  subscribeMotionPreference(scheduleSync);
  connection?.addEventListener("change", scheduleSync);
  window.wallpaper = {
    // 「换一张」总是抽新的，不复用会话里的上一张。
    next: () => { sessionReuse = false; return next(); },
    setSource: id => { if (pickerEnabled) setWallpaperSource(id); },
    getSnapshot,
    get current() { return getSnapshot().current; },
  };
  // A1：页面 load 后等浏览器空闲（最多 2 秒）再开始；load 迟迟不来时 8 秒兜底。
  const start = () => { if (started) return; started = true; sync(); };
  const afterLoad = () => "requestIdleCallback" in window ? requestIdleCallback(start, { timeout: 2000 }) : setTimeout(start, 200);
  if (document.readyState === "complete") afterLoad();
  else window.addEventListener("load", afterLoad, { once: true });
  setTimeout(start, 8000);
  emit();
}
