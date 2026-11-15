// 音乐快捷入口只接现有侧栏播放器;关闭后不加载快捷面板。
export const floatingMusicConfig = {
  enable: true,
  // 保留 slide 配置兼容；auto/slide 均遵循博客“减少动态效果”，不读取系统偏好。
  panelMotion: "slide" as "auto" | "slide",
  // 正常动效沿用 Mizuki 实测 280ms；减少动效时立即完成，不用于其他控件。
  panelDuration: 280,
};
