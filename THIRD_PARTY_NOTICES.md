# 第三方代码与设计适配说明

## Mizuki 音乐浮层

本博客的紧凑音乐浮层参考并适配自 [LyraVoid/Mizuki](https://github.com/LyraVoid/Mizuki), commit `dbdd3eb039e5e92f9375f5f8f79c3589cdf6ca16`:

- `src/components/widgets/music-player/FabMusicPanel.svelte`
- `src/components/widgets/music-player/MusicPlayer.svelte` 的 FAB 浮入/收起交互
- `src/components/widgets/music-sidebar/components/SidebarTrackInfo.svelte`、`SidebarControls.svelte`

Copyright 2025 Matsuzaka Yuki. 原代码依据 Apache License 2.0 发布,许可证副本见 `licenses/Mizuki-Apache-2.0.txt`。

本地改动:使用 Shirone 的既有共享音乐引擎、十语言词典和 M3E 配色/间距令牌;移除总歌曲数与列表编号,默认收起歌曲列表;补充键盘和减少动效适配。不使用原站音乐 API、账户或素材地址。

## Mizuki 外观设置

外观扩展对照同一 commit 的以下源码适配功能语义、分组和交互：

- `src/components/features/settings/SettingsPanel.svelte`
- `src/utils/setting-utils.ts`
- `src/layouts/partials/GridScripts.astro`
- `src/styles/banner.css`、`layout-responsive.css`、`post-content-rails.css`

Copyright 2025 Matsuzaka Yuki. Apache License 2.0，许可证副本同上。

本地改动：四种模式复用 Shirone 的同一壁纸媒体层；新增三个效果滑块、横幅标题与波浪、宽屏文章布局和分组重置；保留 Shirone 的配色风格、规范及纹理。使用本地十语言词典、M3E 令牌和原生键盘控件，并补充首帧恢复、Swup 同步、加载取消、减少动效及关闭状态的资源门控。落樱绘制为本地实现，不复制原站图片或缺少生命周期保护的动画脚本；默认关闭、无外部请求。
