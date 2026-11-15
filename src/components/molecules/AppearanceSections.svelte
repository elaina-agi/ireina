<script lang="ts">
import Icon from "@components/atoms/display/Icon.svelte";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { appearanceConfig as config, type AppearancePreferences, type WallpaperMode } from "../../appearance/config";
let { wallpaperMode = $bindable(), preferences, defaults, capabilities, defaultWallpaperMode, showWallpaper = true, onchange }: {
  wallpaperMode: WallpaperMode;
  preferences: AppearancePreferences;
  defaults: AppearancePreferences;
  capabilities: { bannerTitle: boolean; waves: boolean };
  defaultWallpaperMode: WallpaperMode;
  showWallpaper?: boolean;
  onchange: (value: AppearancePreferences) => void;
} = $props();
const modes: { value: WallpaperMode; label: I18nKey; icon: string }[] = [
  { value: "banner", label: I18nKey.wallpaperModeBanner, icon: "material-symbols:image-outline-rounded" },
  { value: "fullscreen", label: I18nKey.wallpaperModeFullscreen, icon: "material-symbols:fullscreen-rounded" },
  { value: "overlay", label: I18nKey.wallpaperModeOverlay, icon: "material-symbols:open-in-full-rounded" },
  { value: "none", label: I18nKey.wallpaperModeNone, icon: "material-symbols:image-outline-rounded" },
];
const effects: { key: "opacity" | "blur" | "cardOpacity"; label: I18nKey; min: number; max: number; step: number; scale: number }[] = [
  { key: "opacity", label: I18nKey.wallpaperOpacity, min: 20, max: 100, step: 1, scale: 100 },
  { key: "blur", label: I18nKey.wallpaperBlur, min: 0, max: 12, step: .5, scale: 1 },
  { key: "cardOpacity", label: I18nKey.cardOpacity, min: 20, max: 100, step: 1, scale: 100 },
];
const overlayDirty = $derived(effects.some(item => config.wallpaperEffects[item.key] && preferences[item.key] !== defaults[item.key]));
const bannerDirty = $derived(preferences.bannerTitle !== defaults.bannerTitle || preferences.waves !== defaults.waves);
function resetEffects() { onchange({ ...preferences, opacity: defaults.opacity, blur: defaults.blur, cardOpacity: defaults.cardOpacity }); }
function setBoolean(key: "bannerTitle" | "waves" | "sakura" | "wideScreen", value: boolean) { onchange({ ...preferences, [key]: value }); }
</script>

{#snippet reset(disabled: boolean, onclick: () => void)}
  <button type="button" class="ireina-settings-reset m3-state-layer" {disabled} {onclick} title={i18n(I18nKey.resetToDefault)} aria-label={i18n(I18nKey.resetToDefault)}><Icon icon="material-symbols:refresh-rounded" /></button>
{/snippet}

{#if showWallpaper}
<section class="ireina-settings-section" aria-label={i18n(I18nKey.wallpaperMode)}>
  <div class="ireina-settings-heading"><h2>{i18n(I18nKey.wallpaperMode)}</h2>{@render reset(wallpaperMode === defaultWallpaperMode, () => (wallpaperMode = defaultWallpaperMode))}</div>
  <div class="ireina-wallpaper-modes" role="radiogroup" aria-label={i18n(I18nKey.wallpaperMode)}>
    {#each modes as mode}
      <label class={`ireina-wallpaper-option m3-state-layer${wallpaperMode === mode.value ? " is-selected" : ""}`}>
        <input type="radio" name="ireina-wallpaper-mode" value={mode.value} bind:group={wallpaperMode} />
        <Icon icon={mode.icon} /><span>{i18n(mode.label)}</span>
        {#if wallpaperMode === mode.value}<Icon icon="material-symbols:check-rounded" />{/if}
      </label>
    {/each}
  </div>
</section>
{/if}

{#if wallpaperMode === "overlay" && effects.some(item => config.wallpaperEffects[item.key])}
<section class="ireina-settings-section" aria-label={i18n(I18nKey.wallpaperEffects)}>
  <div class="ireina-settings-heading"><h2>{i18n(I18nKey.wallpaperEffects)}</h2>{@render reset(!overlayDirty, resetEffects)}</div>
  {#each effects.filter(item => config.wallpaperEffects[item.key]) as item}
    <label class="ireina-settings-slider">
      <span><span>{i18n(item.label)}</span><output>{item.key === "blur" ? `${preferences[item.key].toFixed(1)}px` : `${Math.round(preferences[item.key] * 100)}%`}</output></span>
      <input type="range" aria-label={i18n(item.label)} min={item.min} max={item.max} step={item.step} value={preferences[item.key] * item.scale}
        style={`--ireina-range-progress: ${(preferences[item.key] * item.scale - item.min) / (item.max - item.min) * 100}%`}
        oninput={event => onchange({ ...preferences, [item.key]: Number(event.currentTarget.value) / item.scale })} />
    </label>
  {/each}
</section>
{/if}

{#if (wallpaperMode === "banner" || wallpaperMode === "fullscreen") && ((config.controls.bannerTitle && capabilities.bannerTitle) || (config.controls.waves && capabilities.waves))}
<section class="ireina-settings-section" aria-label={i18n(I18nKey.bannerSettings)}>
  <div class="ireina-settings-heading"><h2>{i18n(I18nKey.bannerSettings)}</h2>{@render reset(!bannerDirty, () => onchange({ ...preferences, bannerTitle: defaults.bannerTitle, waves: defaults.waves }))}</div>
  {#if config.controls.bannerTitle && capabilities.bannerTitle}
    <label class="ireina-settings-native-toggle"><span><Icon icon="material-symbols:image-outline-rounded" />{i18n(I18nKey.bannerTitle)}</span><input type="checkbox" role="switch" aria-label={i18n(I18nKey.bannerTitle)} checked={preferences.bannerTitle} onchange={event => setBoolean("bannerTitle", event.currentTarget.checked)} /></label>
  {/if}
  {#if config.controls.waves && capabilities.waves}
    <label class="ireina-settings-native-toggle"><span><Icon icon="material-symbols:waves-rounded" />{i18n(I18nKey.wavesAnimation)}</span><input type="checkbox" role="switch" aria-label={i18n(I18nKey.wavesAnimation)} checked={preferences.waves} onchange={event => setBoolean("waves", event.currentTarget.checked)} /></label>
  {/if}
</section>
{/if}

{#if config.controls.sakura}
<section class="ireina-settings-section" aria-label={i18n(I18nKey.effectsSettings)}>
  <div class="ireina-settings-heading"><h2>{i18n(I18nKey.effectsSettings)}</h2></div>
  <label class="ireina-settings-native-toggle"><span><Icon icon="material-symbols:local-florist-outline-rounded" /><span>{i18n(I18nKey.sakuraEffect)}<small>{i18n(I18nKey.sakuraReducedHint)}</small></span></span><input type="checkbox" role="switch" aria-label={i18n(I18nKey.sakuraEffect)} checked={preferences.sakura} onchange={event => setBoolean("sakura", event.currentTarget.checked)} /></label>
</section>
{/if}

{#if config.controls.wideScreen}
<section class="ireina-settings-section" aria-label={i18n(I18nKey.featuresSettings)}>
  <div class="ireina-settings-heading"><h2>{i18n(I18nKey.featuresSettings)}</h2></div>
  <label class="ireina-settings-native-toggle"><span><Icon icon="material-symbols:fullscreen-rounded" /><span>{i18n(I18nKey.wideScreenLayout)}<small>{i18n(I18nKey.wideScreenLayoutHint)}</small></span></span><input type="checkbox" role="switch" aria-label={i18n(I18nKey.wideScreenLayout)} checked={preferences.wideScreen} onchange={event => setBoolean("wideScreen", event.currentTarget.checked)} /></label>
</section>
{/if}


