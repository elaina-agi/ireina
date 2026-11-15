# Twikoo 评论

博客的文章页下方有评论区。访客填昵称和邮箱就能评论，不用注册登录。

```
访客发评论 → /api/twikoo 接口（检查、存进数据库）→ 后台自调用（垃圾检测、发邮件通知博主）
```

评论数据存在 MongoDB 数据库里。博客本身还是静态的，只有这一个评论接口在服务器上运行。

## 代码在哪

| 文件 | 作用 |
| --- | --- |
| `api/twikoo.js` | Vercel 的入口。Vercel 把 `api/` 下的文件部署成接口，**文件名和位置不能改** |
| `src/comment/dev-server.mjs` | 本地调试时把接口挂到 `pnpm dev` 上 |
| `shirones/config/commentConfig.ts` | 评论开关和配置。`enable: true` 且 `provider: "twikoo"` 才显示评论区 |
| `twikoo-vercel` (npm 包) | Twikoo 的全部后端逻辑。版本锁定在 1.7.24，和主题自带的前端 1.7.20 匹配 |

## 环境变量

| 变量 | 填什么 | 是否保密 |
| --- | --- | --- |
| `MONGODB_URI` | MongoDB 连接串，如 `mongodb+srv://user:pass@cluster.mongodb.net/dbname` | 保密 |
| `TWIKOO_SELF_URL` | 评论接口自己的完整地址，如 `https://blog.eriiagi.com/api/twikoo` | 公开 |
| `PUBLIC_TWIKOO_BACKEND_URL` | 【可选】本地调试时覆盖前端调用的后端地址 | 公开 |

第一项通过 Vercel Marketplace 集成 MongoDB Atlas 时会自动填好。第二项必须手动填，不填的话评论能发出来，但新评论的邮件通知和垃圾检测会失效且不报错。第三项只在本地 `pnpm dev` 时生效。

## 本地调试

1. **建数据库**：先在 MongoDB Atlas 注册、建一个免费的 M0 集群，拿到连接地址（形如 `mongodb+srv://...`）。
2. **填 .env**：在根目录 `.env` 里填两项（示例见 `.env.example`）：
   ```
   MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/dbname"
   TWIKOO_SELF_URL="http://localhost:4321/api/twikoo"
   PUBLIC_TWIKOO_BACKEND_URL="http://localhost:4321/api/twikoo"
   ```
3. **开启评论**：在 `shirones/config/commentConfig.ts` 里改成：
   ```ts
   enable: true,
   provider: "twikoo",
   ```
4. **启动**：`pnpm dev`，打开一篇文章（如果有的话，没有就先写一篇），滚动到评论区，发一条评论。

只需要这一个终端。接口每次请求都会重新读 `.env`，改了数据库地址不用重启。

## 上线（Vercel）

`.env` 只在本机生效，不会跟着代码上传，上线要用的值得在 Vercel 再填一次。

### 方案一：通过 Vercel Marketplace 集成（推荐）

1. **部署博客**：先把博客部署到 Vercel（如果还没部署的话）。
2. **集成 MongoDB Atlas**：
   - Vercel 项目 → Marketplace → 搜索 "MongoDB Atlas" → Install
   - 选择 **Create New MongoDB Atlas Account** → 选择 **Free** 集成
   - Vercel 会自动建好数据库，并把 `MONGODB_URI` 填进环境变量
3. **填 TWIKOO_SELF_URL**：
   - Vercel 项目 → Settings → Environment Variables → Add
   - Name: `TWIKOO_SELF_URL`
   - Value: `https://你的域名/api/twikoo`（如 `https://blog.eriiagi.com/api/twikoo`）
   - 三个环境都勾上（Production / Preview / Development）
4. **开启评论**：在 `shirones/config/commentConfig.ts` 里改成 `enable: true, provider: "twikoo"`，提交代码。
5. **重新部署**。
6. **验证**：打开正式站的任意文章，滚动到评论区，发一条评论，确认能发出来。

### 方案二：单独注册 MongoDB Atlas

1. 去 MongoDB Atlas 官网注册、建 M0 免费集群，拿到连接地址。
2. 在 Vercel 项目 → Settings → Environment Variables 里填两项：
   - `MONGODB_URI`：你的 MongoDB 连接串
   - `TWIKOO_SELF_URL`：`https://你的域名/api/twikoo`
3. 后续步骤同方案一的第 4、5、6 步。

注意：

- Vercel 的预览地址（`xxx.vercel.app`）也能用评论，数据和正式站存在同一个数据库里。
- `TWIKOO_SELF_URL` 必须填正式域名或预览域名，不能填 `localhost`。本地调试时用 `.env` 里的 `TWIKOO_SELF_URL=http://localhost:4321/api/twikoo`。
- 不需要 `vercel.json`。接口地址是 `/api/twikoo`，末尾没有 `/`。
- 换到别的托管平台时，`api/twikoo.js` 可能不会自动生效，要按那个平台的方式另写一个入口来调用 `twikoo-vercel`。

## MongoDB Atlas 免费档限制

- **容量 0.5 GB**：评论是纯文字，能放几十万条。
- **连续 30 天没有任何连接会自动暂停**：只要有访客看到评论区，就会连一次数据库，正常有人访问的博客基本碰不到。暂停后去后台手动恢复即可。
- **可选备份**：每天一份，最多保留 4 份，建议在 Atlas 后台开启。

## Twikoo 后台管理

评论发出来后，你可以在 Twikoo 的管理面板里审核、删除、回复评论，以及配置邮件通知、反垃圾、敏感词等。

访问地址：打开博客任意文章，滚动到评论区，点右下角的齿轮图标 ⚙️（或在评论区输入框下方看到「Twikoo 管理面板」链接）。

**首次登录**：
- 第一次打开管理面板时会要求设置密码。
- 这个密码存在数据库里，以后在任何设备上登录都用这个密码。
- 密码不要丢，丢了只能去数据库里手动删记录重置。

**常用功能**：
- **评论管理**：查看、删除、隐藏评论，回复评论
- **邮件通知**：配置 SMTP 或 HTTP 邮件服务（支持 Resend），新评论时给博主发邮件
- **反垃圾**：接入 Akismet 或腾讯云内容安全，自动过滤垃圾评论
- **敏感词**：设置关键词黑名单，匹配的评论自动隐藏

详细配置见 [Twikoo 官方文档](https://twikoo.js.org/)。

## 测试

评论接口是第三方程序包 `twikoo-vercel`，已有完整的测试，这里不再写单元测试。验证方式是实际发评论：

- **本地**：`pnpm dev`，打开文章，发一条评论。
- **上线后**：打开正式站的文章，发一条评论，确认能发出来。

浏览器测试（`pnpm test:site`）不测评论区，因为那需要真实的数据库，而测试用的假数据库装不下 Twikoo 的全部功能。

## 升级 Twikoo

Twikoo 的前端（主题自带的 JS）和后端（`twikoo-vercel` 程序包）版本要匹配。主题锁定在前端 1.7.20，所以后端也锁定在 1.7.24。

如果以后主题升级到 Twikoo 2.x 前端，再一起升级后端：

1. 改 `package.json`：`"twikoo-vercel": "^2.0.17"` 或更新的版本
2. `pnpm install`
3. 改 `shirones/config/commentConfig.ts` 里的 `scriptUrl`，指向 2.x 的 CDN
4. 重新部署

升级后数据库里的老评论会自动迁移，不用手动处理。

## 防刷

- **Akismet 或腾讯云内容安全**：在 Twikoo 管理面板里配置，自动过滤垃圾评论。
- **敏感词黑名单**：在管理面板里设置。
- **评论审核**：在管理面板里开启「评论需审核后才显示」。
- **限频**：Twikoo 自带简单的 IP 限频，在管理面板的「其他配置」里设置。
- **Vercel 防火墙限频规则**（可选）：和友链接口一样，可以在 Vercel 后台加一条针对 `/api/twikoo` 的限频规则。

具体配置见 [Twikoo 官方文档 - 反垃圾配置](https://twikoo.js.org/anti-spam.html)。
