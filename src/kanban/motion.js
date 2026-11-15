import { prefersReducedMotion, subscribeMotionPreference } from "../motion/policy";

const bindings = new WeakMap();

/**
 * Narrow adapter for the checked-in kanban.js + l2d-BS92TdHz.js pair only.
 * The public widget has no render-pause API. This version's Cubism 6 renderer
 * uses null for a stopped _drawFrameId and exposes run()/stop() + _released.
 * Unknown/future renderers fail closed: do not guess at private fields or start
 * a second loop. Recheck this contract when replacing the bundled widget.
 */
function getBundledCubism6Renderer(kanban) {
  const renderer = kanban.l2d?._state?.l2d6Model;
  if (!renderer || typeof renderer.run !== "function" || typeof renderer.stop !== "function" ||
    typeof renderer._released !== "boolean" ||
    !(renderer._drawFrameId === null || (typeof renderer._drawFrameId === "number" && Number.isFinite(renderer._drawFrameId)))) return null;
  return renderer._released ? null : renderer;
}

/** Own one persistent widget's shadow CSS preference and its visible render loop. */
export function bindKanbanMotion(kanban, host) {
  if (!host || typeof kanban?.on !== "function") return () => {};
  const previous = bindings.get(kanban);
  if (previous) return previous;

  let disposed = false;
  let queued = false;
  let ownedPause = null;
  const removers = [];

  const syncHost = () => {
    const reduced = prefersReducedMotion();
    host.toggleAttribute("data-motion-reduced", reduced);
    // The compile-time adapter supplies this narrow method on the bundled
    // widget. Never overwrite the span: outstanding vendor timers would append
    // partial text again. Finishing typing retains the bubble's timed dismissal.
    if (reduced) kanban.finishTyping?.();
  };

  const syncRenderer = () => {
    if (disposed) return;
    if (kanban.state === "destroyed" || !host.isConnected) { cleanup(); return; }
    const renderer = getBundledCubism6Renderer(kanban);
    if (renderer !== ownedPause) ownedPause = null;
    if (!renderer) return;

    const active = kanban.state === "active" && !host.hidden;
    if (prefersReducedMotion() || document.hidden || !active) {
      if (renderer._drawFrameId !== null) {
        renderer.stop();
        // Record ownership only when this adapter stopped an active widget.
        // A sleeping/released/replaced model must never be restarted by full.
        ownedPause = active && renderer._drawFrameId === null ? renderer : null;
      }
      return;
    }

    if (ownedPause !== renderer) return;
    ownedPause = null;
    if (renderer._drawFrameId === null && !renderer._released) renderer.run();
  };

  const scheduleRenderer = () => {
    if (disposed || queued) return;
    queued = true;
    // ready may fire inside run()'s synchronous draw. Pause after that call has
    // stored the next frame id; stopping directly in ready leaves a live loop.
    queueMicrotask(() => { queued = false; syncRenderer(); });
  };
  const sync = () => { if (!disposed) { syncHost(); scheduleRenderer(); } };
  const observeDisconnect = new MutationObserver(() => {
    if (!host.isConnected) cleanup();
  });
  const observeVisibility = new MutationObserver(scheduleRenderer);

  function cleanup() {
    if (disposed) return;
    disposed = true;
    for (const remove of removers) remove();
    observeDisconnect.disconnect();
    observeVisibility.disconnect();
    bindings.delete(kanban);
    ownedPause = null;
  }

  bindings.set(kanban, cleanup);
  removers.push(subscribeMotionPreference(sync));
  for (const event of ["ready", "sleep", "wake", "switch", "error"]) removers.push(kanban.on(event, sync));
  // onSay precedes the vendor's timer setup. Defer finishing so its new timers
  // can be cleared too if the preference changed in the same task.
  removers.push(kanban.on("say", () => queueMicrotask(() => { if (!disposed && prefersReducedMotion()) kanban.finishTyping?.(); })));
  document.addEventListener("visibilitychange", scheduleRenderer);
  removers.push(() => document.removeEventListener("visibilitychange", scheduleRenderer));
  observeVisibility.observe(host, { attributes: true, attributeFilter: ["hidden"] });
  if (host.parentNode) observeDisconnect.observe(host.parentNode, { childList: true });
  sync();
  return cleanup;
}
