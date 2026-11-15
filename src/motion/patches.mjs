/** Small, version-checked fixes for animation owners not covered by CSS or media queries.
 * Theme files remain untouched. A changed upstream contract fails the build for review.
 */
function replaceOnce(code, before, after, id) {
  if (code.split(before).length !== 2) throw new Error(`[ireina-motion] Upstream contract changed: ${id}: ${before.slice(0, 70)}`);
  return code.replace(before, after);
}
function addScriptImport(code, names, policyId, id) {
  return replaceOnce(code, '<script lang="ts">', `<script lang="ts">\nimport { ${names} } from ${JSON.stringify(policyId)};`, id);
}
export function patchThemeMotion(code, id, { themeRoot, policyId }) {
  const clean = id.split('?')[0].replaceAll('\\', '/');
  if (!clean.startsWith(themeRoot.replaceAll('\\', '/') + '/')) return null;
  const file = clean.slice(themeRoot.length + 1);
  let next = code;
  if (file === 'components/organisms/BannerStage.astro') {
    // Reduced mode completes the subtitle. Invalidate its same-page guard when
    // full motion returns so typing restarts without requiring a route change.
    next = replaceOnce(next, '\t\t\t\t\t\tshowSubtitleImmediately();\n\t\t\t\t\t}\n\t\t\t\t\tsyncBanner();', '\t\t\t\t\t\tshowSubtitleImmediately();\n\t\t\t\t\t} else { runtime.subtitlePage = null; }\n\t\t\t\t\tsyncBanner();', id);
  } else if (file === 'components/atoms/feedback/LoadingIndicator.svelte') {
    next = addScriptImport(next, 'prefersReducedMotion, subscribeMotionPreference', policyId, id);
    next = replaceOnce(next, 'if (document.hidden) {\n\t\t\traf = requestAnimationFrame(frame);\n\t\t\treturn;\n\t\t}', 'if (document.hidden || prefersReducedMotion()) { raf = 0; return; }', id);
    next = replaceOnce(next, '\traf = requestAnimationFrame(frame);\n\treturn () => cancelAnimationFrame(raf);', `
  // Keep a visible static loading symbol in reduced mode, with no running frame loop.
  indetPath = buildPath(morphs[0], 0);
  const syncMotion = () => {
    cancelAnimationFrame(raf); raf = 0;
    if (document.hidden || prefersReducedMotion()) return;
    phaseStart = globalStart = lastFrame = performance.now();
    raf = requestAnimationFrame(frame);
  };
  const unsubscribeMotion = subscribeMotionPreference(syncMotion);
  document.addEventListener("visibilitychange", syncMotion);
  syncMotion();
  return () => { cancelAnimationFrame(raf); unsubscribeMotion(); document.removeEventListener("visibilitychange", syncMotion); };`, id);
  } else if (file === 'components/atoms/feedback/ProgressIndicator.svelte') {
    next = addScriptImport(next, 'prefersReducedMotion, subscribeMotionPreference', policyId, id);
    next = replaceOnce(next, 'import { untrack } from "svelte";', 'import { onMount, untrack } from "svelte";\nlet motionReduced = $state(prefersReducedMotion());\nonMount(() => subscribeMotionPreference(value => { motionReduced = value; }));', id);
    next = replaceOnce(next, '\tconst target = wavyAmpTarget;\n', '\tconst target = wavyAmpTarget;\n\tif (motionReduced) { cleanup(); wavyAmp = target; return cleanup; }\n', id);
  } else if (file === 'components/molecules/SidebarTOC.astro') {
    next = replaceOnce(next, '<script>', `<script>\nimport { prefersReducedMotion } from ${JSON.stringify(policyId)};`, id);
    const count = next.split('behavior: "smooth"').length - 1;
    if (count !== 2) throw Error(`[ireina-motion] TOC scroll contract changed: ${count}`);
    next = next.replaceAll('behavior: "smooth"', 'behavior: prefersReducedMotion() ? "instant" : "smooth"');
  } else if (file === 'components/atoms/navigation/Tabs.svelte' || file === 'components/atoms/navigation/Carousel.svelte') {
    next = addScriptImport(next, 'prefersReducedMotion', policyId, id);
    next = next.replaceAll('behavior: "smooth"', 'behavior: prefersReducedMotion() ? "instant" : "smooth"');
  } else if (file === 'components/atoms/input/SearchView.svelte') {
    next = addScriptImport(next, 'prefersReducedMotion', policyId, id);
    next = replaceOnce(next, 'import { fade } from "svelte/transition";', `import { fade as originalFade } from "svelte/transition";
function fade(node: Element, options: Parameters<typeof originalFade>[1]) {
  return originalFade(node, prefersReducedMotion() ? { ...options, duration: 0, delay: 0 } : options);
}`, id);
    next = replaceOnce(next, 'duration: 600,', 'duration: prefersReducedMotion() ? 0 : 600,', id);
    next = replaceOnce(next, 'duration: 350,', 'duration: prefersReducedMotion() ? 0 : 350,', id);
    next = next.replaceAll('delay: 100,', 'delay: prefersReducedMotion() ? 0 : 100,');
  }
  return next === code ? null : next;
}

/** Complete mascot speech without leaving stale character/mouth timers running. */
export function patchKanbanMotion(code, id, policyId) {
  if (!id.split('?')[0].replaceAll('\\', '/').endsWith('/kanban/vendor/kanban.js')) return null;
  let next = replaceOnce(code, 'textEl;\n\tpriority = 0;', 'textEl;\n\tfullText = "";\n\tpriority = 0;', id);
  next = replaceOnce(next, '\t\tthis.clear();\n\t\tlet r = a()', '\t\tthis.clear();\n\t\tthis.fullText = e;\n\t\tlet r = a()', id);
  next = replaceOnce(next, '\thide() {\n\t\tthis.clear()', '\tfinishTyping() {\n\t\tif (!this.el.classList.contains("typing")) return;\n\t\tthis.clear(); this.textEl.textContent = this.fullText;\n\t\tthis.el.classList.remove("typing", "pop");\n\t\tthis.busyUntil = Date.now() + this.opts.duration;\n\t\tthis.protectUntil = Math.min(this.protectUntil, this.busyUntil);\n\t\tthis.later(() => this.hide(), this.opts.duration);\n\t}\n\thide() {\n\t\tthis.clear()', id);
  next = replaceOnce(next, '\t\tsay: (e, t) => void B(e, t?.priority ?? G.say, t?.duration),', '\t\tsay: (e, t) => void B(e, t?.priority ?? G.say, t?.duration),\n\t\tfinishTyping: () => z.finishTyping(),', id);
  // Sleeping in reduced mode is immediate, not an invisible 1.5-second wait.
  next = replaceOnce(next, 'e && await n(s.transition)', 'e && !__ireinaKanbanReduced() && await n(s.transition)', id);
  return `import { prefersReducedMotion as __ireinaKanbanReduced } from ${JSON.stringify(policyId)};\n` + next;
}
