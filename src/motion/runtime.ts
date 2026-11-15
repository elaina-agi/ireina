import { applyMotionPreference, getMotionPreference, MOTION_CHANGE_EVENT, MOTION_KEY, prefersReducedMotion, resolveMotionPreference, subscribeMotionPreference, watchSystemMotion } from "./policy";
import "./motion.css";
import { bindSwupMotion, cancelSwupScroll } from "./swup";

/** Finish finite WAAPI transitions so elements reach their intended visible/hidden state.
 * CSS animations are handled by the stylesheet; owners handle perpetual JS loops.
 */
export function settleMotion(root: Document | ShadowRoot = document): void {
  for (const animation of root.getAnimations()) {
    if (animation instanceof CSSAnimation || animation instanceof CSSTransition) continue;
    const end = animation.effect?.getComputedTiming().endTime;
    if (typeof end === "number" && Number.isFinite(end)) {
      try { animation.finish(); } catch { /* An owner may already have disposed its animation. */ }
    }
  }
  if (root instanceof Document) {
    for (const host of document.querySelectorAll("kanban-widget")) if (host.shadowRoot) settleMotion(host.shadowRoot);
  }
}

export function initMotionRuntime(): void {
  const html = document.documentElement;
  if (html.dataset.ireinaMotionBound === "true") return;
  html.dataset.ireinaMotionBound = "true";
  applyMotionPreference(getMotionPreference());
  let previous = prefersReducedMotion();
  const sync = (reduced: boolean) => {
    previous = reduced;
    if (reduced) {
      cancelSwupScroll();
      settleMotion();
      // Finish a native smooth scroll already in progress without changing its position.
      window.scrollTo({ top: scrollY, left: scrollX, behavior: "instant" });
    }
  };
  subscribeMotionPreference(sync);
  sync(previous);
  bindSwupMotion();
  document.addEventListener("swup:enable", bindSwupMotion);
  // Also support the theme changing the root class directly, without duplicate broadcasts.
  new MutationObserver(() => {
    const reduced = prefersReducedMotion();
    if (reduced !== previous) window.dispatchEvent(new CustomEvent(MOTION_CHANGE_EVENT, { detail: { reduced } }));
  }).observe(html, { attributes: true, attributeFilter: ["class"] });
  // Explicit choice first, then the system setting; storage failures fall back to the session choice.
  const restore = () => applyMotionPreference(resolveMotionPreference());
  window.addEventListener("storage", event => { if (event.key === MOTION_KEY || event.key === null) restore(); });
  window.addEventListener("pageshow", event => { if (event.persisted) restore(); });
  // Visitors who never chose follow the system setting live; explicit choices are unaffected.
  watchSystemMotion();
}

if (typeof document !== "undefined") initMotionRuntime();
