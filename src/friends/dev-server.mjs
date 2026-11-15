/**
 * 本地调试用:把友链申请的后端挂到 `pnpm dev` 的开发服务器上,地址和上线后一样(/api/friend-apply)。
 * 在 astro.config.mjs 的 vite.plugins 里接入。
 * 上线后这段不参与,由 Vercel 运行 api/friend-apply.js。两边调用的是同一份 src/friends/handler.js。
 *
 * 环境变量每次请求时读一遍根目录的 .env,所以改了密钥不用重启;命令行里设置的变量优先。
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";
import { handle } from "./handler.js";
import { APPLY_PATH } from "./validate.js";

/** 多读一点就停,超长的内容交给 handler 按 413 拒绝 */
const MAX_READ_BYTES = 16384;

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_READ_BYTES) break;
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function respond(req, res, envFile) {
  try {
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
    }
    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const request = new Request(`http://${req.headers.host || "localhost"}${APPLY_PATH}`, {
      method: req.method,
      headers,
      body: hasBody ? await readBody(req) : undefined,
    });
    const fileEnv = existsSync(envFile) ? parseEnv(readFileSync(envFile, "utf8")) : {};
    const response = await handle(request, { ...fileEnv, ...process.env });
    res.statusCode = response.status;
    response.headers.forEach((value, name) => res.setHeader(name, value));
    res.end(await response.text());
  } catch (error) {
    console.error("[friend-apply] 本地接口出错", error);
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ ok: false, error: "server" }));
  }
}

/**
 * Vite 插件,只在开发服务器里起作用,不影响构建。
 * @param {string} root 仓库根目录
 * @returns {import("vite").Plugin}
 */
export function friendApplyDevServer(root) {
  const envFile = join(root, ".env");
  return {
    name: "ireina-friend-apply-dev",
    apply: "serve",
    enforce: "post",
    configureServer(server) {
      // 本站网址统一以 / 结尾,Astro 会把不带 / 的地址直接判成 404,而且它把这项检查插在最前面。
      // 接口地址不带 /(和 Vercel 上一致),所以要等 Astro 插完之后,再把接口插到它前面。
      return () => {
        server.middlewares.stack.unshift({
          route: "",
          handle: (req, res, next) => {
            if (new URL(req.url || "/", "http://localhost").pathname !== APPLY_PATH) return next();
            respond(req, res, envFile);
          },
        });
      };
    },
  };
}
