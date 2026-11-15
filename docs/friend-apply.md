# 友链申请

友链页下方有一个申请表单。访客填完提交后,博主会收到一封邮件。表单只负责通知,**不会自动添加友链**。

```
访客填表提交 → 本站接口 /api/friend-apply(来源检查、内容检查、人机验证)→ Resend 发信 → 你的邮箱
```

邮件设置了「回复给申请人」,在邮箱里直接点回复就行。同意的话,把邮件末尾那一行加进
`shirones/config/data/friends.ts`,重新部署。

## 代码在哪

| 文件 | 作用 |
| --- | --- |
| `src/components/organisms/FriendApplyForm.svelte` | 申请表单 |
| `src/components/organisms/FriendSection.svelte` | 友链页覆盖文件,把表单挂上去 |
| `src/friends/validate.js` | 填写规则,表单和接口共用 |
| `src/friends/config.js` | 表单开关(读 `PUBLIC_TURNSTILE_SITE_KEY`) |
| `src/friends/handler.js` | 接口的全部逻辑:检查、人机验证、调 Resend 发信 |
| `api/friend-apply.js` | Vercel 的入口。Vercel 把 `api/` 下的文件部署成接口,**文件名和位置不能改** |
| `src/friends/dev-server.mjs` | 本地调试时把接口挂到 `pnpm dev` 上 |

博客页面是静态的,只有这一个接口在服务器上运行,而且只在有人提交时才运行。

## 环境变量

| 变量 | 填什么 | 是否保密 |
| --- | --- | --- |
| `PUBLIC_TURNSTILE_SITE_KEY` | Turnstile 的 site key。填了才显示表单 | 公开 |
| `TURNSTILE_SECRET_KEY` | Turnstile 的 secret key | 保密 |
| `RESEND_API_KEY` | Resend 的 API Key | 保密 |
| `MAIL_FROM` | 发件人,如 `友链申请 <noreply@send.你的域名>`,域名要在 Resend 验证过 | 保密 |
| `MAIL_TO` | 收申请的邮箱 | 保密 |

表单显不显示只看第一项。后四项没填全时,表单照常显示,但提交会失败。

## 本地调试

1. 在根目录 `.env` 里填上面五项(示例见 `.env.example`)。两个 Turnstile 值用 Cloudflare 官方的测试 key:

   ```
   PUBLIC_TURNSTILE_SITE_KEY="1x00000000000000000000AA"
   TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"
   ```

   这对 key 永远验证通过,必须配对使用,只能用于本地。正式 key 在 `localhost` 上用不了。

2. `pnpm dev`,打开 `http://localhost:4321/friends/` 提交一次,会真的发出一封邮件。

只需要这一个终端。接口每次请求都会重新读 `.env`,改了密钥不用重启;
但 `PUBLIC_TURNSTILE_SITE_KEY` 是给网页用的,改了它要重启 `pnpm dev`。

## 上线(Vercel)

`.env` 只在本机生效,不会跟着代码上传,上线要用的值得在 Vercel 再填一次。

1. **准备**:Resend 里验证好域名、拿到 API Key;Cloudflare Turnstile 里建好小组件(域名填 `blog.eriiagi.com`)。
2. **填环境变量**:Vercel 项目 → Settings → Environment Variables,把上面五项都填上。
   两个 Turnstile 值换成你自己的**正式** key,不要用测试 key。
3. **重新部署**。`PUBLIC_TURNSTILE_SITE_KEY` 是构建时写进网页的,改了它必须重新部署才生效。
4. **加限频规则**(建议):Vercel 项目 → Firewall → Configure → New Rule
   - If:Request Path 等于 `/api/friend-apply`
   - Then:Rate Limit,Fixed Window,60 秒内 3 次,按 IP 计数,超出返回 429
   - 保存后要点 Review Changes → Publish 才生效。免费版可以建 1 条限频规则。
5. **验证**:打开正式站的友链页,自己提交一次,确认邮箱收到。

注意:

- Vercel 的预览地址(`xxx.vercel.app`)不在 Turnstile 小组件的域名里,人机验证过不了,表单在预览地址上提交会失败。
  要在预览地址上测试,就把那个域名也加进小组件。
- 不需要 `vercel.json`。接口地址是 `/api/friend-apply`,末尾没有 `/`。
- 换到别的托管平台时,`api/friend-apply.js` 不会自动生效,要按那个平台的方式另写一个入口来调用 `src/friends/handler.js`。

## 防刷

- Turnstile 人机验证:没通过的请求不会调用 Resend,不消耗发信额度。
- Vercel 防火墙的限频规则(上面第 4 步)。代码里不做限频,因为 Vercel 的函数之间不共享内存,计数不可靠。
- 隐藏的蜜罐输入框:填了就假装成功、不发信。
- 来源检查:只接受从本站页面发来的请求。它只能挡掉别的网站直接调用,不算鉴权。

## 测试

- `pnpm test:friends`:接口的单元测试,Turnstile 和 Resend 都是假的。
- `pnpm test:site`:包含表单的浏览器测试,接口是假的,不会真的发邮件。
