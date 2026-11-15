/**
 * 友链申请接口(Vercel 函数)。Vercel 会把 api/ 目录下的文件部署成后端接口,
 * 这个文件对应的地址就是 /api/friend-apply,所以**文件名不能改**。
 * 真正的逻辑在 src/friends/handler.js;部署步骤和环境变量见 docs/friend-apply.md。
 */
import { handle } from "../src/friends/handler.js";

export default {
  fetch: (request) => handle(request, process.env),
};
