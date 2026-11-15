/**
 * 本地调试用：把 Twikoo 评论接口挂到 `pnpm dev` 的开发服务器上，地址和上线后一样 (/api/twikoo)。
 * 上线后这段不参与，由 Vercel 运行 api/twikoo.js。两边调用的是同一个 twikoo-vercel 程序包。
 *
 * 环境变量每次请求时读一遍根目录的 .env，所以改了数据库地址不用重启；命令行里设置的变量优先。
 *
 * 本地没有 MongoDB 时，访问评论接口会返回错误，但博客页面照常能打开，不影响调试其他功能。
 * 要在本地测试评论，需要先建好 MongoDB 数据库，把连接地址填进 .env 的 MONGODB_URI。
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEnv } from "node:util";

const TWIKOO_PATH = "/api/twikoo";

/** 多读一点就停，超长的内容交给 twikoo-vercel 按它的规则拒绝 */
const MAX_READ_BYTES = 32768;

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

/**
 * Vite 插件，只在开发服务器里起作用，不影响构建。
 * @param {string} root 仓库根目录
 * @returns {import("vite").Plugin}
 */
export function twikooDevServer(root) {
  const envFile = join(root, ".env");
  return {
    name: "ireina-twikoo-dev",
    apply: "serve",
    enforce: "post",
    configureServer(server) {
      // 本站网址统一以 / 结尾，Astro 会把不带 / 的地址直接判成 404，而且它把这项检查插在最前面。
      // 接口地址不带 /（和 Vercel 上一致），所以要等 Astro 插完之后，再把接口插到它前面。
      return () => {
        server.middlewares.stack.unshift({
          route: "",
          handle: async (req, res, next) => {
            if (new URL(req.url || "/", "http://localhost").pathname !== TWIKOO_PATH) return next();

            try {
              // twikoo-vercel 1.7.x 导出的是 (req, res) => void 函数，直接调用
              const twikoo = (await import("twikoo-vercel")).default;
              const fileEnv = existsSync(envFile) ? parseEnv(readFileSync(envFile, "utf8")) : {};
              const savedEnv = { ...process.env };
              Object.assign(process.env, fileEnv, savedEnv);

              // 模拟 Vercel 的 req.body 自动解析（1.7.x 期望 req.body 已经是对象）
              const hasBody = req.method !== "GET" && req.method !== "HEAD";
              if (hasBody) {
                const raw = await readBody(req);
                try {
                  req.body = raw.length > 0 ? JSON.parse(raw.toString("utf8")) : {};
                } catch {
                  req.body = {};
                }
              }

              await twikoo(req, res);
            } catch (error) {
              console.error("[twikoo] 本地接口出错", error);
              if (res.headersSent || res.writableEnded) return;
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(JSON.stringify({ code: 1, message: "server error" }));
            }
          },
        });
      };
    },
  };
}
