# Shirone Blog

> **基于 [Shirone](https://github.com/LyraVoid/Shirone) 主题的个人博客**  
> 本项目使用 Shirone 主题（MIT 许可证）进行二次开发和定制。  
> 感谢原作者 [@LyraVoid](https://github.com/LyraVoid) 的优秀工作！

本站运行在 [Shirone](https://github.com/LyraVoid/Shirone) 上，这是一个以动漫风格为灵感、采用 Material 3 Expressive 设计的 Astro 博客主题，通过 `shirones` npm 包安装。

## 常用命令

```bash
pnpm install   # 安装依赖（初次运行后执行一次）
pnpm dev       # 启动开发服务器，访问 http://localhost:4321
pnpm build     # 静态构建 → dist/
pnpm preview   # 本地预览生产构建
```

## 项目结构

| 路径 | 说明 |
| --- | --- |
| `shirones/config/` | 站点配置 — URL、标题、主题色、侧边栏、字体（TypeScript，完全类型化） |
| `shirones/config/data/` | 友链、项目、技能、时间线等数据 |
| `shirones/content/` | 文章、动态和其他内容集合 |
| `src/components/` | 放置文件以覆盖主题组件（镜像主题的 `src/components/` 目录结构） |
| `src/layouts/` | 布局覆盖，用法同上 |
| `public/` | 静态资源（favicon、横幅、图片） |

主题安装为 npm 依赖，位于 `node_modules/shirones/`（只读，不应修改）。要自定义主题，请在 `src/` 下创建同名文件进行覆盖。

## 博客内容

已清理主题自带的示例文章和相册，功能本身保留可用。

- 新文章放在 `shirones/content/posts/`，可写 `.md` 或 `.mdx`
- 新相册放在 `public/images/albums/<相册名>/`，填写 `info.json` 并放入图片
- 相册格式说明见 `docs/albums/README.md`

**看板娘（Live2D）**：`src/kanban/` 保留看板娘接入，模型和动作数据放在 `public/live2d/` 下。

**自定义功能**：

- **友链申请表单**：基于 Cloudflare Turnstile 人机验证和 Resend 邮件服务，只强制要求填写项目链接和邮箱
- **Twikoo 评论系统**：无后端评论解决方案，配置见 `docs/twikoo.md`
- **自定义壁纸系统**：支持多种壁纸源
- **音乐播放器**：基于 APlayer 的音乐播放功能

## 验证与测试

```bash
pnpm test:motion  # 测试动画配置
pnpm build        # 构建（会进行类型检查）
pnpm test:site    # 站点集成测试
pnpm check        # Astro 类型检查
```

## 部署

构建后的 `dist/` 目录可以部署到任何静态托管服务：

- **Vercel**：连接 GitHub 仓库自动部署
- **Cloudflare Pages**：支持边缘函数
- **Netlify**：开箱即用
- **GitHub Pages**：需要配置 `base` 路径（如果不是根路径部署）

环境变量配置参考 `.env.example`。

## 许可证

本项目基于 [Shirone](https://github.com/LyraVoid/Shirone) 主题（MIT 许可证）开发。

博客内容和自定义代码遵循相应的许可证声明。
