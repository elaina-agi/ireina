# Shirone Blog

> **基于 [Shirone](https://github.com/LyraVoid/Shirone) 主题的个人博客**  
> 本项目使用 Shirone 主题（MIT 许可证）进行二次开发和定制。  
> 原作者 [@LyraVoid](https://github.com/LyraVoid) 

This site runs on [Shirone](https://github.com/LyraVoid/Shirone) — an
anime-inspired, Material 3 Expressive blog theme for Astro, installed as the
`shirones` npm package.

## Commands

```bash
pnpm install   # install dependencies (run once after init)
pnpm dev       # start the dev server at http://localhost:4321
pnpm build     # static build → dist/
pnpm preview   # preview the production build locally
```

## Project layout

| Path                    | What it is                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| `shirones/config/`      | site configuration — URL, title, theme colour, sidebar, fonts (TypeScript, fully typed)     |
| `shirones/config/data/` | friends, projects, skills, timeline, …                                                      |
| `shirones/content/`     | your posts, moments and other collections                                                   |
| `src/components/`       | drop a file here to override a theme component (mirrors the theme's `src/components/` tree) |
| `src/layouts/`          | …same for layouts                                                                           |
| `public/`               | static assets (favicons, banners, images)                                                   |

## Updating the theme

```bash
npx shirones init            # report drift only
npx shirones init --update   # add missing files without replacement
npx shirones init --force    # replace the template after backing up the old copy
```

`--force` moves the previous `shirones/`, `public/` and project scaffold files
to `.shirones-backup/` before copying the installed template. See the package
documentation for the full configuration reference and component-override rules.

## 博客内容

已清理主题自带的 22 篇示例文章（包括草稿与加密演示）、4 个示例相册，以及这些演示专用的图片、音频片段、系列说明和 include 片段。文章、相册、系列功能本身仍保留；动态、关于、音乐、壁纸和看板娘未改动。

- 新文章放在 `shirones/content/posts/`，可写 `.md` 或 `.mdx`；当前目录为空，不会自动发布示例文章。
- 新相册放在 `public/images/albums/<相册名>/`，填写 `info.json` 并放入图片即可；当前没有相册内容。格式说明见 `docs/albums/README.md`（已移出 `public/`，不会被发布到网站）。
- 主题依赖包中的示例模板保留不动，它们不是这个博客的发布内容。
- 注意：`shirones init --update` / `--force` 会补回缺失的模板文件，可能重新带回示例；日常写文章不需要运行初始化命令。

## 看板娘

左下角的诺瓦来自同级目录的 `kanban-widget` 项目,没有改动任何主题文件:

| 位置                                  | 内容                                                |
| ------------------------------------- | --------------------------------------------------- |
| `astro.config.mjs` 里的 `kanban` 集成 | 给每个页面注入 `src/kanban/boot.js`                 |
| `src/kanban/config.js`                | 台词、点击区域、悬停提示                            |
| `src/kanban/vendor/`                  | 组件打包结果,来自 kanban-widget 的 `dist/`          |
| `public/live2d/noir/`                 | Live2D 模型(只放网页要用的运行文件,贴图已缩到 1024) |

- **更新组件**:在 kanban-widget 里 `npm run build`,删掉 `vendor/` 里旧的 `l2d-*.js`,再把 `dist/kanban.js` 和 `dist/l2d-*.js` 复制进来。
- **主题升级**:`pnpm add shirones@latest` 不影响看板娘;但 `npx shirones init --force` 会把整个 `public/` 挪进备份,之后要把 `public/live2d/` 拿回来。
- **鼠标跟随**:在 `src/kanban/config.js` 的模型 `look` 中调节。`sensitivity` 越大脸附近越灵敏;`headResponse` / `eyeResponse` 越小响应越快;`headMax` / `eyeMax` 控制头部和眼珠限幅。当前按画布比例计算,正常动效下眼睛先看过去、脑袋稍后跟上。诺瓦配置为 `sensitivity: 1.3`。开启博客「减少动态效果」后由 `src/kanban/motion.js` 暂停模型渲染，保留角色静态画面；关闭后恢复同一个模型，不唤醒手动休眠的角色。`idleDelay: 0` 让鼠标停留时保持指向;离开页面先等待 `leaveDelay: 180`,快速重入会取消,真正离开后再平滑回正。只监听根元素 `pointerleave`,内部控件之间移动不触发回正。从任务栏等页面外跨位置重入时,`reentryDuration: 180` 用短衔接从当前姿态转向新位置;连续移动不重启计时,掉帧时限制单帧推进,结束后恢复原有灵敏跟随。模型、1024 贴图和 l2d 渲染库均未改动。
- **出场 / 退场动画**：`src/kanban/config.js` 的 `entranceMotion` / `exitMotion` 为 `"auto"`。正常动效下按 `transition: 1500` 从底部滑入/滑出；博客减少动效开启时立即完成出入场与休眠流程，不再强制保留滑动。气泡打字、浮动也服从同一个博客开关。舞台缓动沿用主题令牌；Swup 站内跳转不重复出场。
- **版权**:模型是《星空列车与白的旅行》的角色诺瓦,美术版权属于原作;公开仓库或上线前确认授权和署名要求。

## 右侧三按钮快捷栏

使用 `src/components/organisms/FloatingControls.astro` 和 `src/components/molecules/FloatingActionButton.astro` 覆盖主题组件,没有编辑主题依赖。按音乐、返回首页、返回顶部竖排,图标、浅色面板和边框使用主题令牌;按钮支持键盘焦点。首页入口在所有设备和首页本身都保留,回顶仍按滚动阈值出现。

- 音乐入口的独立开关在 `src/floating/config.ts`。同时要求原有 `musicConfig` 和侧栏音乐 widget 已启用,否则不输出入口或加载快捷面板。
- 点击音乐按钮后才加载 `FloatingMusicPanel.svelte`,使用主题 `getMusicRuntime()` 的同一单例,不创建第二个音频实例。浮层采用 Mizuki 的紧凑结构:封面、曲名/歌手、时间与音量、细进度条和一排控制按钮;不显示歌曲总数或编号,歌曲列表默认收起,点列表按钮才展开。
- 浮层位于音乐按钮上方，正常展开时淡入并上移 16px、收起时淡出并下移，保留 280ms 节奏；博客减少动效开启时立即完成，不位移。`panelMotion` 保留配置类型兼容，但 `"slide"` 不再绕过总开关。点音符、Esc、点击外部或站内导航可收起；Esc/音符归还焦点，关闭面板不暂停音乐。Swup 切页不重建播放器或快捷栏。
- 原组件出处与适配许可证见 `THIRD_PARTY_NOTICES.md` 和 `licenses/Mizuki-Apache-2.0.txt`。
- `shirones/config/fabConfig.ts` 当前仅保留首页和回顶项,目录/评论快捷按钮关闭,文章侧栏目录与评论功能本身未改。
- `astro-icon` 已作为直接依赖声明,导航图标为 SSR 输出,无需在线图标请求。当前歌单配置保持原样,没有新增音乐 API 或修改为其他来源。

## 外观设置与壁纸模式

外观面板对照 Mizuki commit `dbdd3eb039e5e92f9375f5f8f79c3589cdf6ca16` 的设置与布局源码适配，保留 Shirone 配色风格、配色规范、背景纹理和减少动效，不更换整个主题。

- **横幅模式**：原有顶部横幅与内容重叠布局。
- **全屏模式**：同一个横幅占满一屏，正文接在下面；不是浏览器全屏 API，也不是固定背景。桌面站内跳转到非首页时定位正文；手机非首页沿用 Shirone 紧凑布局。
- **叠加模式**：同一媒体层固定铺在内容后面，正文从顶栏下方开始；壁纸不透明度（20–100%）、背景模糊（0–12px）和卡片不透明度（20–100%）仅此模式显示。模糊只作用壁纸，卡片只改变背景 alpha，不降低文字 opacity。内层代码/控件与音乐快捷浮层保持正常表面对比度。
- **隐藏壁纸**：恢复主题纯色；停止新随机请求与视频播放、取消在途加载。
- **首页标题／波浪动画**：横幅和全屏模式提供开关；首页标题开关不隐藏非首页的上下文标题。能力仍由 `siteConfig.banner.homeText.enable` / `waves.enable` 控制，完全禁用时访客不能复活。
- **宽屏布局**：只扩展文章页，依据浏览器 CSS 视口宽度（1920px 起、3200px 起第二档），不是显示器物理分辨率。关闭回到主题自动解析的 85/96rem，保留侧栏与独立阅读宽度；首页和索引页不跟着变宽。
- **落樱特效**：默认关闭；用户主动开启后才加载本地绘制模块，不请求原站图片。落樱只由博客「减少动态效果」总开关制约：落樱开且总开关关时飘落，总开关开时暂停；与其他站点动效一样，总开关在访客没选过时跟随系统设置（见「统一动态效果策略」）。省流量及后台标签页时仍不运行；关闭释放 Canvas 和动画循环。
- 主题色、壁纸、效果、横幅和列表布局各有局部重置；面板底部提供完整恢复默认。访客偏好保存在本浏览器 `wallpaper-mode` 与 `ireina-appearance`，刷新和 Swup 导航保持，不修改站点默认配置。

扩展默认值和分项可见性在 `src/appearance/config.ts`。`enable: false` 回退为主题原有面板；实际模式、能力与词条覆盖通过 `src/appearance/overlay.mjs` 补上 `shirones@0.1.5` 未覆盖 utils/i18n 的边界。组件、布局覆盖均在用户仓库中，不编辑依赖。升级主题需复验这些边界，署名见 `THIRD_PARTY_NOTICES.md`。

> **覆盖机制分工**：本站有两套覆盖机制同时生效。shirones 自带机制负责 `src/components/`、`src/layouts/` 下的同名文件；`src/appearance/overlay.mjs`（名字叫 appearance，实际是通用覆盖插件）负责主题不处理的 `src/i18n/` 和 `src/utils/setting-utils.ts`、`src/utils/banner-state.ts`，同时也覆盖组件和布局（与主题自带机制重叠，结果一致），并让本站新增组件能用 `@components/` 别名引用。排查「为什么用的是这个文件」时两处都要看，详细范围见该文件开头的注释。

## 随机壁纸源

横幅、全屏与叠加复用同一随机图片或视频，不因切模式和站内跳转重抽或重建媒体。
脚本在 `src/wallpaper/banner.js`，壁纸源和选项在 `src/wallpaper/config.js`。
默认 `mobile: false`，手机仍用主题本地竖图；减少动效、省流量和手机不下载视频。所有随机源不可用/关闭时不请求源、媒体或随机层样式。

- 访客可以在调色板设置的“壁纸来源”中选择“随机来源”或某个可用源，点击“换一张”从当前选择重新加载。
- 默认来源由 `source` 指定，目前为 `alcy`（栗次元 API）。`source: "random"` 表示每次打乱可用来源；省略 `source` 时兼容原有 `pick` 设置。
- 指定来源失败时，依次尝试 `fallback` 中的来源和其他可用来源。切换失败保留当前画面；没有随机画面时保留主题原图。面板显示实际成功加载的来源。
- 增删壁纸源：在 `sources` 中添加或删除配置，使用稳定且唯一的 `id`；暂时不用时设置 `enable: false`。未配置地址的 R2 Worker 不显示在选择列表中。
- 选择保存在浏览器的 `ireina-wallpaper-source` 中，刷新和站内跳转后保留。来源分组的重置按钮和总重置均恢复配置默认值。
- `sourcePicker.enable: false` 或省略该开关时，不加载来源选择界面，也不使用访客保存的来源偏好；所有来源不可用时不初始化随机壁纸。
- 默认 `mobile: false`：手机可以保存来源选择，但不下载随机壁纸；隐藏壁纸时也只保存选择，重新显示后再加载。
- 固定的几张图片直接放主题的 `banner.src`（会自动压缩、轮播）；固定视频用 `type: "list"` 的源。来源选择不会额外改变媒体类型、轮换间隔或减少动效设置。

来源偏好与可用来源校验在 `src/wallpaper/source-preference.ts`，面板在 `src/components/organisms/WallpaperSourceControls.svelte`；运行时复用原有随机壁纸层，不另建播放器。

**自定义 Worker 的地址、名称和默认来源在部署时配置，不需要把个人配置写进仓库。** 在托管平台（如 Cloudflare Pages）的构建环境变量中设置：

| 变量                      | 用途                                                                                         | 未配置时                                    |
| ------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `PUBLIC_WALLPAPER_API`    | Worker 根地址，例如 `https://your-worker.your-subdomain.workers.dev`；不要添加 `/api/random` | 跳过 `r2` 来源，不显示入口、不请求该 Worker |
| `PUBLIC_WALLPAPER_NAME`   | 前端展示名称，可以自由改名；来源 id 仍为 `r2`                                                | 沿用“我的 R2 壁纸”                          |
| `PUBLIC_WALLPAPER_SOURCE` | 新访客默认来源，填 `r2` 使用自定义源；也可填 `random`、`alcy`、`loli`、`paugram`             | 沿用 `alcy`                                 |

- 本地测试可在被 Git 忽略的 `.env` 中填写；仓库中的 `.env.example` 仅保留注释示例，不填写真实地址或个人名称。
- 静态站点在构建时读取这些变量：修改后重启开发服务，线上重新构建部署；只改运行时环境不会改变已生成的页面。
- 仅填写名称或把默认设为 `r2`，但没有接口地址时，不会显示自定义源；默认会退回可用公共来源。来源请求失败仍按既有 `fallback` 顺序尝试。
- 访客已保存的来源选择仍优先；改展示名称不会重置选择。要体验部署默认值，可点击来源重置或使用无痕窗口。
- `PUBLIC_` 配置会进入浏览器，不是密钥。真实地址不进入 Git 不代表对访客保密；限制 CORS 不是鉴权，防滥用需要 Worker 限流、签名等保护。

## 显示设置的语言

`shirones/config/siteConfig.ts` 的 `lang` 控制整个站点的界面语言；简体中文使用 `zh_CN`，英文使用 `en`。修改后刷新页面，已打开的持久面板也需要重新加载。

当前 `shirones` 0.1.5 在开发预打包时会绕过用户配置覆盖，把主题默认的英文配置打进客户端，导致导航中文、显示设置英文。博客在 `astro.config.mjs` 的 `vite.optimizeDeps.exclude` 中排除了主题包及其源码别名，让它们经过正常的 overlay 解析；Svelte 等第三方依赖仍可预打包，生产构建不受这项开发设置影响。不要编辑 `node_modules/.vite` 或依赖包里的配置作为修复。

显示设置中主题色和九种配色风格的中文补充仍在 `shirones/config/i18nConfig.ts`，通过主题原有覆盖机制生效。新增外观词条在 `src/i18n/i18nKey.ts` 和十种语言模块；`translation.ts` 保留原站点词典覆盖与英文回退。外观入口及重置按钮已使用本地化无障碍标签，所有新图标使用主题离线集合。

升级主题后应复验中文、英文、直接加载、站内导航和正式构建。主题集成修好预打包问题后，才考虑移除这段博客侧规避配置。

本次验证中英文开发页面与正式页面、布局切换、Swup 导航均通过，中文面板的明暗无障碍检查无违规。Astro check 为 0 errors / 0 warnings（现有看板娘 vendor 有提示）。另发现 Windows 构建时主题的 Pagefind 写入输出目录报 `InvalidFilename`，命令虽然返回 0，但没有生成搜索索引；该独立问题未在本次语言修复中处理，不能把返回码当作搜索索引成功。



## 统一动态效果策略

- 访客**没有手动选过**时，默认跟随操作系统的「减少动态效果」设置（`prefers-reduced-motion`），浏览中途改了系统设置也会实时跟随。访客在外观设置里切换过「减少动态效果」后，以这个选择为准，保存在浏览器存储 `mc-motion`（`reduced` / `full`），之后不再受系统设置影响。只有亲手切换才会记录，打开页面不会自动写入；面板底部的「恢复默认设置」会清除这个选择，重新跟随系统。
- 减少动效开启时：CSS 过渡即时完成、首页打字机显示全文、壁纸运镜/视频暂停、加载形状停止变形、歌单和音乐浮层不位移、看板娘保留静态画面，正在进行的 Swup 滚动也会结束。
- 关闭后恢复正常效果；刷新、Swup 导航、跨标签页与返回缓存保持偏好。落樱默认关闭，波浪/标题等独立开关不变；省流量、后台暂停和移动端资源限制仍保留。允许动画不代表自动播放音乐。
- `src/motion/policy.ts` 维护博客偏好、系统默认值和可清理订阅；它是唯一读取原生系统动效查询的模块（构建期适配器不处理 `src/motion/`），不覆盖 `window.matchMedia`，系统明暗、窗口大小等查询完全不变。首屏在本地布局中用同样的规则（先看选择，再看系统）恢复偏好，`runtime.ts` / `swup.ts` 负责即时完成、系统设置变化跟随与持久壳同步。
- `src/motion/plugin.mjs` 在构建期适配主题和选定第三方：组件源代码在 load 阶段处理，CSS 在 PostCSS 阶段转为博客选择器；Shadow DOM 使用 host 状态。`patches.mjs` 补齐加载动画、目录滚动、同页打字机恢复及看板娘计时器的缺口。不编辑 `node_modules` 或本地 vendor 打包原文。
- **升级边界**：当前验收 `shirones@0.1.5`、Astro 7、Svelte 5、Swup ScrollPlugin 3.3 / scrl 2、已检入的看板娘 Cubism 6 renderer。限定补丁不匹配会报错，需要先审阅再更新，不能把检查改为静默跳过。看板娘的渲染暂停使用带守卫的私有接口，替换组件时需特别复验。

验证命令（WSL 使用 `pnpm`；Windows 使用 `pnpm.cmd`）：

```sh
pnpm test:motion
pnpm build
# 已开着 pnpm dev（4321 端口）时直接复用；没开时自动启动开发服务器，测完自动关闭
pnpm test:site
# 测试其他地址（如 preview）时指定 TEST_BASE_URL，此时不会自动启动服务器
# TEST_BASE_URL=http://127.0.0.1:4322 pnpm test:site
pnpm check   # 等同 astro check --minimumSeverity warning
```

本轮检查说明：完整 Astro 检查保持全部源码范围，使用 `--minimumSeverity warning` 输出错误和警告；默认 hint 输出会在 Volar 打印大型 Live2D vendor 的多条提示时重复创建 AST 并耗尽内存。这不跳过类型诊断。当前验证为 0 errors / 0 warnings，构建及开发/生产动效回归均通过。
