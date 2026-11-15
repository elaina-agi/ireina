/**
 * 顶部横幅壁纸:从下面的壁纸源随机取图片 / 视频,加载好后淡入盖住主题横幅原图
 * 所有源都失败时,横幅继续显示 shirones/config/siteConfig.ts 里 banner.src 配的图
 *
 * 增删壁纸源:往 sources 里加一项 / 删掉一项;暂时不用就写 enable: false
 * 源的类型:
 *   worker:你的 Cloudflare Worker,GET {api}/api/random?type=image|video → { type, url: "/file/<key>" }
 *   direct:打开就是一张随机图片的公共接口;mobileUrl = 手机竖屏图(可选)
 *   list  :固定的一组视频 / 图片地址(固定图片更推荐直接放主题的 banner.src,构建时会自动压缩)
 */
export const wallpaperConfig = {
  // 来源选择器独立开关；关闭时不显示来源分组，不读取访客来源偏好。
  sourcePicker: { enable: true },
  // 访客默认来源 id；"random" = 每次换壁纸都随机挑一个可用源。外观面板选择会覆盖并保存。
  // 部署环境可指定默认来源；未配置仍用 alcy，访客已保存的选择优先。
  source: import.meta.env.PUBLIC_WALLPAPER_SOURCE?.trim() || "alcy",
  // 指定来源失败后按这些 id 继续尝试；未列出的其余可用源最后也会作为兜底。
  fallback: ["alcy", "loli", "paugram"],
  // "order" 仅保留为无访客偏好时的兼容策略；面板选 random 时总是随机来源顺序。
  pick: "order",
  // "image" 只要图片 / "video" 优先视频 / "mix" 图片视频随机;只有 worker 和 list 能提供视频
  mode: "mix",
  // 自动换一张的间隔(秒);0 = 只在打开网站时随机一次
  interval: 0,
  // 手机上(宽度 < 1024px)是否也换;换的话 direct 源会用 mobileUrl 的竖屏图
  mobile: false,
  // 图片缓慢推拉(视频不加);访客开了「减少动效」时自动停
  kenBurns: true,

  sources: [
    {
      id: "r2",
      // 部署时可改展示名称；稳定 id 保持 r2，改名不影响访客的来源偏好。
      name: import.meta.env.PUBLIC_WALLPAPER_NAME?.trim() || "我的 R2 壁纸",
      type: "worker",
      // 地址不进仓库:写在 .env 或部署平台的环境变量 PUBLIC_WALLPAPER_API 里;没填就自动跳过这个源。
      // PUBLIC_ 值会进入浏览器；域名 CORS 限制不是鉴权，防滥用另做限流/签名。
      api: import.meta.env.PUBLIC_WALLPAPER_API,
      supports: ["image", "video"],
    },
    { id: "alcy", name: "栗次元 API", type: "direct", url: "https://t.alcy.cc/pc", mobileUrl: "https://t.alcy.cc/mp" },
    { id: "loli", name: "LoliAPI", type: "direct", url: "https://www.loliapi.com/acg/pc/", mobileUrl: "https://www.loliapi.com/acg/pe/" },
    { id: "paugram", name: "保罗 API", type: "direct", url: "https://api.paugram.com/wallpaper/" },
    // 固定视频列表的写法(视频放 public/wallpapers/ 里,或者写网上的地址):
    // { name: "本地视频", type: "list", videos: ["/wallpapers/a.mp4"], enable: false },
  ],
};
