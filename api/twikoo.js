/**
 * Twikoo 评论接口（Vercel 函数）。Vercel 会把 api/ 目录下的文件部署成后端接口，
 * 这个文件对应的地址是 /api/twikoo，所以**文件名不能改**。
 * 
 * Twikoo 的全部逻辑在 twikoo-vercel 这个程序包里，这个文件只是转发。
 * 部署步骤、环境变量和本地调试见 docs/twikoo.md。
 */
import twikoo from "twikoo-vercel";

export default twikoo;
