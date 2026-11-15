<script lang="ts">
import Icon from "@components/atoms/display/Icon.svelte";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { onMount } from "svelte";
import {
  getWallpaperSourceOptions, getDefaultWallpaperSource, getStoredWallpaperSource,
  setWallpaperSource, WALLPAPER_STATE_EVENT, WALLPAPER_SOURCE_CHANGE_EVENT,
  type WallpaperRuntimeSnapshot,
} from "../../wallpaper/source-preference";

const options = getWallpaperSourceOptions();
const defaultSource = getDefaultWallpaperSource(options);
let selected = $state(getStoredWallpaperSource());
let snapshot = $state<WallpaperRuntimeSnapshot | null>(null);


function choose(id: string) { selected = setWallpaperSource(id); }
function changeWallpaper() { void window.wallpaper?.next(); }
let { ondirtychange }: { ondirtychange?: (dirty: boolean) => void } = $props();
$effect(() => { ondirtychange?.(selected !== defaultSource); });
onMount(() => {
  const sync = () => {
    selected = getStoredWallpaperSource();
    snapshot = window.wallpaper?.getSnapshot() ?? null;
  };
  window.addEventListener(WALLPAPER_STATE_EVENT, sync);
  window.addEventListener(WALLPAPER_SOURCE_CHANGE_EVENT, sync);
  sync();
  return () => {
    window.removeEventListener(WALLPAPER_STATE_EVENT, sync);
    window.removeEventListener(WALLPAPER_SOURCE_CHANGE_EVENT, sync);
  };
});
const message = $derived(
  snapshot?.reason === "mobile" ? i18n(I18nKey.wallpaperSourceMobilePaused) :
  snapshot?.reason === "hidden" ? i18n(I18nKey.wallpaperSourceHiddenPaused) :
  snapshot?.reason === "background" ? i18n(I18nKey.wallpaperSourceBackgroundPaused) :
  snapshot?.busy ? i18n(I18nKey.wallpaperSourceLoading) :
  snapshot?.status === "error" ? i18n(I18nKey.wallpaperSourceError) :
  snapshot?.current ? i18n(I18nKey.wallpaperSourceCurrent).replace("{source}", snapshot.current.source) : ""
);
</script>

<section class="ireina-settings-section ireina-source-section" aria-label={i18n(I18nKey.wallpaperSource)}>
  <div class="ireina-settings-heading">
    <h2>{i18n(I18nKey.wallpaperSource)}</h2>
    <button type="button" class="ireina-settings-reset m3-state-layer" disabled={selected === defaultSource} onclick={() => choose(defaultSource)} title={i18n(I18nKey.resetToDefault)} aria-label={i18n(I18nKey.resetToDefault)}><Icon icon="material-symbols:refresh-rounded" /></button>
  </div>
  <div class="ireina-wallpaper-modes" role="radiogroup" aria-label={i18n(I18nKey.wallpaperSource)}>
    <label class={`ireina-wallpaper-option ireina-source-option m3-state-layer${selected === "random" ? " is-selected" : ""}`}>
      <input type="radio" name="ireina-wallpaper-source" value="random" checked={selected === "random"} onchange={() => choose("random")} />
      <span class="ireina-source-name">{i18n(I18nKey.wallpaperSourceRandom)}</span>
      {#if selected === "random"}<Icon icon="material-symbols:check-rounded" />{/if}
    </label>
    {#each options as option (option.id)}
      <label class={`ireina-wallpaper-option ireina-source-option m3-state-layer${selected === option.id ? " is-selected" : ""}`}>
        <input type="radio" name="ireina-wallpaper-source" value={option.id} checked={selected === option.id} onchange={() => choose(option.id)} />
        <span class="ireina-source-name">{option.name}</span>
        <span class="ireina-source-tags">{#if option.supports.includes("image")}<small>{i18n(I18nKey.wallpaperSourceImage)}</small>{/if}{#if option.supports.includes("video")}<small>{i18n(I18nKey.wallpaperSourceVideo)}</small>{/if}</span>
        {#if selected === option.id}<Icon icon="material-symbols:check-rounded" />{/if}
      </label>
    {/each}
  </div>
  <button type="button" class="ireina-source-next m3-state-layer" disabled={!snapshot?.canChange} onclick={changeWallpaper}><Icon icon="material-symbols:refresh-rounded" />{i18n(I18nKey.wallpaperChange)}</button>
  <p class="ireina-source-status" role="status" aria-live="polite" aria-atomic="true">{message}</p>
  <p class="ireina-source-hint">{i18n(I18nKey.wallpaperSourceFallbackHint)}</p>
</section>
