<script lang="ts">
  // 适配 Mizuki FabMusicPanel 的紧凑结构 (Apache-2.0),改用 Shirone 共享引擎、翻译和令牌。
  // 原作: https://github.com/LyraVoid/Mizuki/blob/dbdd3eb039e5e92f9375f5f8f79c3589cdf6ca16/src/components/widgets/music-player/FabMusicPanel.svelte
  import { onMount } from "svelte";
  import "./floating-music-panel.css";
  import Icon from "@components/atoms/display/Icon.svelte";
  import { collapse } from "@utils/motion";
  import type { MusicRuntime, PlaybackMode } from "@/types/musicConfig";
  import type { FloatingMusicLabels } from "./floating-music-types";
  let { runtime, labels }: { runtime: MusicRuntime; labels: FloatingMusicLabels } = $props();
  let snapshot = $state(runtime.getSnapshot());
  let playlistOpen = $state(false);
  let coverFailed = $state(false);
  const playing = $derived(snapshot.status === "playing");
  const duration = $derived(Math.max(0, snapshot.duration));
  const progress = $derived(duration > 0 ? Math.min(100, snapshot.currentTime / duration * 100) : 0);
  const progressLabel = $derived(labels.progress.replace("{current}", formatTime(snapshot.currentTime)).replace("{duration}", formatTime(duration)));
  const modes: PlaybackMode[] = ["sequence", "repeat-one", "shuffle"];
  const modeLabel = $derived(snapshot.mode === "sequence" ? labels.modeSequence : snapshot.mode === "repeat-one" ? labels.modeRepeatOne : labels.modeShuffle);
  const modeIcon = $derived(snapshot.mode === "sequence" ? "material-symbols:repeat-rounded" : snapshot.mode === "repeat-one" ? "material-symbols:repeat-one-rounded" : "material-symbols:shuffle-rounded");
  const cover = $derived(snapshot.currentTrack?.cover);
  $effect(() => { void cover; coverFailed = false; });
  onMount(() => runtime.subscribe(next => { snapshot = next; }));
  function formatTime(time: number) { const seconds = Math.floor(Math.max(0, Number.isFinite(time) ? time : 0)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
</script>
<section id="floating-music-panel" class="floating-music-panel" role="dialog" aria-label={labels.title} tabindex="-1">
  <div class="music-header">
    <button type="button" class="music-cover" aria-label={playing ? labels.pause : labels.play} title={playing ? labels.pause : labels.play} onclick={() => void runtime.toggle()}>
      {#if cover && !coverFailed}
        <img src={cover} srcset={snapshot.currentTrack?.coverSrcset} sizes="64px" alt="" class:spinning={playing} onerror={() => { coverFailed = true; }} />
      {:else}<Icon icon="material-symbols:music-note-rounded" aria-hidden="true" />{/if}
      <span class="music-cover-action" aria-hidden="true"><Icon icon={playing ? "material-symbols:pause-rounded" : "material-symbols:play-arrow-rounded"} /></span>
    </button>
    <div class="music-track">
      <strong title={snapshot.currentTrack?.title}>{snapshot.currentTrack?.title ?? (snapshot.status === "loading" ? labels.loading : labels.empty)}</strong>
      <span>{snapshot.currentTrack?.artist ?? "—"}</span>
      <div class="music-meta">
        <span class="music-time" aria-hidden="true">{formatTime(snapshot.currentTime)} / {formatTime(duration)}</span>
        <div class="music-volume">
          <button type="button" class="music-mute m3-state-layer" aria-label={snapshot.muted ? labels.unmute : labels.mute} title={snapshot.muted ? labels.unmute : labels.mute} onclick={() => runtime.setMuted(!snapshot.muted)}>
            <Icon icon={snapshot.muted ? "material-symbols:volume-off-rounded" : "material-symbols:volume-up-rounded"} aria-hidden="true" />
          </button>
          <input type="range" min="0" max="1" step="0.01" value={snapshot.volume} style={`--range-fill: ${snapshot.muted ? 0 : snapshot.volume * 100}%`}
            aria-label={labels.volume.replace("{volume}", String(Math.round(snapshot.volume * 100)))} oninput={event => runtime.setVolume(Number(event.currentTarget.value))} />
        </div>
      </div>
    </div>
  </div>
  <div class="music-progress">
    <input type="range" min="0" max={duration || 1} step="0.1" value={Math.min(snapshot.currentTime, duration || 1)} disabled={duration <= 0} style={`--range-fill: ${progress}%`}
      aria-label={progressLabel} onchange={event => runtime.seek(Number(event.currentTarget.value))} />
  </div>
  <div class="music-transport">
    <button type="button" class="music-control m3-state-layer" aria-label={`${labels.playbackMode}: ${modeLabel}`} title={modeLabel} onclick={() => runtime.setMode(modes[(modes.indexOf(snapshot.mode) + 1) % modes.length]!)}>
      <Icon icon={modeIcon} aria-hidden="true" />
    </button>
    <button type="button" class="music-control m3-state-layer" aria-label={labels.previous} title={labels.previous} disabled={!snapshot.playlist.length} onclick={() => void runtime.previous()}>
      <Icon icon="material-symbols:skip-previous-rounded" aria-hidden="true" />
    </button>
    <button type="button" class="music-control music-play m3-state-layer" aria-label={playing ? labels.pause : labels.play} title={playing ? labels.pause : labels.play} onclick={() => void runtime.toggle()}>
      <Icon icon={playing ? "material-symbols:pause-rounded" : "material-symbols:play-arrow-rounded"} aria-hidden="true" />
    </button>
    <button type="button" class="music-control m3-state-layer" aria-label={labels.next} title={labels.next} disabled={!snapshot.playlist.length} onclick={() => void runtime.next()}>
      <Icon icon="material-symbols:skip-next-rounded" aria-hidden="true" />
    </button>
    <button type="button" class="music-control m3-state-layer" aria-label={playlistOpen ? labels.hidePlaylist : labels.playlist} title={playlistOpen ? labels.hidePlaylist : labels.playlist} aria-expanded={playlistOpen} aria-controls="floating-music-playlist" onclick={() => { playlistOpen = !playlistOpen; }}>
      <Icon icon="material-symbols:queue-music-rounded" aria-hidden="true" />
    </button>
  </div>
  {#if snapshot.error && snapshot.status === "error"}<p class="music-error" role="status">{labels.errors[snapshot.error]}</p>{/if}
  <div id="floating-music-playlist" class="music-playlist-drawer" inert={!playlistOpen} aria-hidden={!playlistOpen} use:collapse={{ open: playlistOpen }}>
    <ol class="music-playlist" aria-label={labels.playlist}>
      {#each snapshot.playlist as track, index (track.id)}
        <li><button type="button" class="m3-state-layer" aria-current={index === snapshot.currentIndex ? "true" : undefined} onclick={() => void runtime.select(index)}>
          <span class="music-copy"><strong>{track.title}</strong>{#if track.artist}<span>{track.artist}</span>{/if}</span>
        </button></li>
      {/each}
    </ol>
  </div>
</section>
