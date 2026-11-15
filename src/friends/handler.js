/**
 * 友链申请的后端:接收友链页的申请表单,检查后用 Resend 发一封邮件给博主。
 *
 * 流程:来源检查 → 检查填写内容 → Turnstile 人机验证 → Resend 发信
 *
 * 这个文件只用标准的 Request / Response,不依赖任何平台:
 *   上线:由 api/friend-apply.js 交给 Vercel 运行
 *   本地:由 src/friends/dev-server.mjs 挂在 `pnpm dev` 的开发服务器上
 * 需要的环境变量和部署步骤见 docs/friend-apply.md。密钥只放环境变量,不写进仓库。
 *
 * 限频不在这里做:Vercel 的函数之间不共享内存,在代码里计数不可靠,
 * 改用 Vercel 后台的防火墙限频规则(设置方法见 docs/friend-apply.md)。
 */
import { validateApplication } from "./validate.js";

const MAX_BODY_BYTES = 8192;
const TURNSTILE_VERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const RESEND_SEND = "https://api.resend.com/emails";

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

/**
 * 只接受博客自己的页面发来的申请:浏览器带来的 Origin 要和这次请求访问的域名一致。
 * 这样正式域名、Vercel 预览地址、本地地址都不用另外配置。
 * 这不是鉴权(Origin 可以伪造),真正防刷靠人机验证和 Vercel 的限频规则。
 */
function sameOrigin(request) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || new URL(request.url).host;
  try {
    return new URL(request.headers.get("Origin") || "").host === host;
  } catch {
    return false;
  }
}

/** Vercel 会用访客的真实 IP 覆盖 x-forwarded-for;本地没有这个头,就不带 IP */
function clientIp(request) {
  return (request.headers.get("x-forwarded-for") || "").split(",")[0].trim();
}

function mailText(values) {
  const entry = `{ id: 0, title: ${JSON.stringify(values.name)}, imgurl: ${JSON.stringify(values.avatar)}, desc: ${JSON.stringify(values.desc)}, siteurl: ${JSON.stringify(values.url)}, tags: [] },`;
  return [
    "收到一份新的友链申请:",
    "",
    `站点名称:${values.name}`,
    `站点地址:${values.url}`,
    `头像地址:${values.avatar}`,
    `一句话简介:${values.desc}`,
    `联系邮箱:${values.email}`,
    "",
    "直接回复这封邮件就能联系申请人。",
    "",
    "同意的话,把下面这行加进 shirones/config/data/friends.ts 的 friendsData(id 改成不重复的数字):",
    entry,
    "",
  ].join("\n");
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env 环境变量(上线是 process.env,本地还会并入根目录的 .env)
 * @param {typeof fetch} fetchImpl 测试时换成假的 fetch
 */
export async function handle(request, env, fetchImpl = fetch) {
  if (request.method !== "POST") return json(405, { ok: false, error: "method" });
  if (!sameOrigin(request)) return json(403, { ok: false, error: "origin" });

  if (!env.RESEND_API_KEY || !env.TURNSTILE_SECRET_KEY || !env.MAIL_TO || !env.MAIL_FROM) {
    console.error("[friend-apply] 缺少环境变量:RESEND_API_KEY / TURNSTILE_SECRET_KEY / MAIL_TO / MAIL_FROM");
    return json(500, { ok: false, error: "server" });
  }

  if (Number(request.headers.get("Content-Length") || 0) > MAX_BODY_BYTES) return json(413, { ok: false, error: "invalid" });
  let input;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return json(413, { ok: false, error: "invalid" });
    input = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, error: "invalid" });
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) return json(400, { ok: false, error: "invalid" });

  // 蜜罐:真人看不到这个输入框,填了的基本是机器人。假装成功,不发信。
  if (typeof input.website === "string" && input.website.trim()) return json(200, { ok: true });

  const { values, errors } = validateApplication(input);
  if (Object.keys(errors).length > 0) return json(400, { ok: false, error: "invalid", fields: errors });

  const token = typeof input.token === "string" ? input.token : "";
  if (!token || token.length > 2048) return json(400, { ok: false, error: "captcha" });
  const ip = clientIp(request);
  try {
    const verify = await fetchImpl(TURNSTILE_VERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token, ...(ip ? { remoteip: ip } : {}) }),
    });
    const outcome = await verify.json();
    if (!outcome.success) return json(400, { ok: false, error: "captcha" });
  } catch (error) {
    console.error("[friend-apply] Turnstile 验证请求失败", error);
    return json(502, { ok: false, error: "server" });
  }

  try {
    const sent = await fetchImpl(RESEND_SEND, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: [env.MAIL_TO],
        reply_to: values.email,
        subject: `[友链申请] ${values.name}`,
        text: mailText(values),
      }),
    });
    if (!sent.ok) {
      console.error("[friend-apply] Resend 发信失败", sent.status, await sent.text());
      return json(502, { ok: false, error: "server" });
    }
  } catch (error) {
    console.error("[friend-apply] Resend 请求失败", error);
    return json(502, { ok: false, error: "server" });
  }

  return json(200, { ok: true });
}
