<script lang="ts">
  import { onMount, tick } from "svelte";
  import { cubicOut } from "svelte/easing";
  import { prefersReducedMotion } from "../../../motion/policy";
  import type { TransitionConfig } from "svelte/transition";
  import type { ResolvedMusicOptions } from "@/config/musicConfig";
  import type { MusicErrorCode, MusicRuntime, MusicSnapshot } from "@/types/musicConfig";
  import type { Component, Snippet } from "svelte";
  import type { FloatingMusicLabels } from "./floating-music-types";
  let { options, labels, size = "regular", panelDuration, children }: { options: ResolvedMusicOptions; labels: FloatingMusicLabels; size?: "small" | "regular"; panelMotion?: "auto" | "slide"; panelDuration?: number; children?: Snippet } = $props();
  let open = $state(false);
  let loading = $state(false);
  let host = $state<HTMLDivElement>();
  let trigger = $state<HTMLButtonElement>();
  let Panel = $state<Component<{ runtime: MusicRuntime; labels: FloatingMusicLabels }> | null>(null);
  let runtime = $state<MusicRuntime | null>(null);
  let playing = $state(false);
  let failure = $state("");
  let generation = 0;
  let unsubscribe = () => {};
  let disposed = false;
  let sheet = $state<HTMLDivElement>();

  // 正常动效保持 280ms / 16px / 0.12→1；兼容的 auto/slide 均服从博客总开关。
  // 已在播放的 WAAPI 由中央 runtime 完成；后续进退场在 reduced 下直接到位。
  function floatPanel(node: Element): TransitionConfig {
    const style = getComputedStyle(node);
    const reduced = prefersReducedMotion();
    const tokenDuration = Number.parseFloat(style.getPropertyValue("--m3e-duration-medium")) || 250;
    const duration = reduced ? 0 : Number.isFinite(panelDuration) ? Math.min(500, Math.max(0, panelDuration!)) : tokenDuration;
    const y = reduced ? 0 : Number.parseFloat(style.getPropertyValue("--m3e-space-4")) || 16;
    const initialOpacity = reduced ? 1 : 0.12;
    return { duration, easing: cubicOut, css: (t) => `opacity: ${initialOpacity + (1 - initialOpacity) * t}; transform: translateY(${(1 - t) * y}px);` };
  }
  function updateAnchor() {
    if (!sheet || !trigger) return;
    const rect = trigger.getBoundingClientRect();
    const gap = Number.parseFloat(getComputedStyle(sheet).getPropertyValue("--m3e-space-3")) || 12;
    sheet.style.setProperty("--music-anchor-bottom", `${innerHeight - rect.top + gap}px`);
    sheet.style.setProperty("--music-anchor-right", `${Math.max(16, innerWidth - rect.right)}px`);
  }

  function close(restoreFocus = true) {
    generation++;
    open = false;
    loading = false;
    if (restoreFocus) trigger?.focus();
  }
  async function toggle() {
    if (open || loading) { close(); return; }
    const id = ++generation;
    loading = true;
    failure = "";
    try {
      const [panel, music] = await Promise.all([import("./FloatingMusicPanel.svelte"), import("@utils/music")]);
      if (disposed || id !== generation) return;
      runtime = music.getMusicRuntime(options); // 与侧栏共享单例,不创建第二个 Audio。
      Panel = panel.default;
      unsubscribe();
      unsubscribe = runtime.subscribe((snapshot: MusicSnapshot) => { playing = snapshot.status === "playing"; });
      open = true;
      await tick();
      if (id !== generation || !open) return;
      updateAnchor();
      host?.querySelector<HTMLElement>("#floating-music-panel")?.focus({ preventScroll: true });
    } catch {
      if (!disposed && id === generation) failure = labels.errors["source-unavailable" as MusicErrorCode];
    } finally { if (id === generation) loading = false; }
  }
  onMount(() => {
    const outside = (event: PointerEvent) => { if (open && event.target instanceof Node && !host?.contains(event.target)) close(false); };
    const keyboard = (event: KeyboardEvent) => { if ((open || loading) && event.key === "Escape") { event.preventDefault(); close(); } };
    const route = () => close(false);
    let unbind = () => {};
    const bind = () => {
      unbind();
      const swup = window.swup;
      if (swup) {
        swup.hooks.on("visit:start", route);
        unbind = () => swup.hooks.off("visit:start", route);
      }
    };
    bind();
    document.addEventListener("swup:enable", bind);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", keyboard);
    window.addEventListener("resize", updateAnchor, { passive: true });
    window.addEventListener("scroll", updateAnchor, { passive: true });
    return () => {
      disposed = true; generation++; unsubscribe(); unbind();
      document.removeEventListener("swup:enable", bind);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", keyboard);
      window.removeEventListener("resize", updateAnchor);
      window.removeEventListener("scroll", updateAnchor);
    };
  });
</script>
<div class="floating-music" bind:this={host}>
  <button id="floating-music-trigger" type="button" class="ireina-fab-action m3-state-layer" data-size={size}
    aria-label={labels.title} title={labels.title} aria-expanded={open} aria-controls={open ? "floating-music-panel" : undefined}
    aria-haspopup="dialog" aria-busy={loading} data-playing={playing || undefined} onclick={toggle} bind:this={trigger}>
    {#if children}{@render children()}{/if}
  </button>
  {#if open && Panel && runtime}
    <div class="floating-music-sheet" bind:this={sheet} transition:floatPanel inert={!open} aria-hidden={!open}>
      <Panel {runtime} {labels} />
    </div>
  {/if}
  {#if failure}<span class="floating-music-error" role="status">{failure}</span>{/if}
</div>
<style>
  .floating-music { position: relative; }
  .floating-music-sheet {
    position: fixed; right: var(--music-anchor-right, var(--fab-inline-offset));
    bottom: var(--music-anchor-bottom, calc(var(--fab-bottom) + 13rem));
    width: min(20rem, calc(100vw - var(--m3e-space-4) * 2));
    transform-origin: bottom right; pointer-events: auto;
  }
  .floating-music-sheet[aria-hidden="true"] { pointer-events: none; }
  button[aria-expanded="true"] { background: var(--primary-container); color: var(--on-primary-container); }
  button[data-playing] { background: var(--primary-container); color: var(--on-primary-container); }
  .floating-music-error { position: absolute; right: calc(100% + var(--m3e-space-3)); bottom: 0; width: max-content; max-width: 16rem; padding: var(--m3e-space-3); background: var(--surface-container-high); color: var(--error); border-radius: var(--shape-corner-m); font: var(--m3e-type-body-medium); }
</style>
