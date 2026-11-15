/**
 * 友链申请表单的配置。
 *   PUBLIC_TURNSTILE_SITE_KEY  Cloudflare Turnstile 的公开 site key,来自环境变量(.env 或部署平台)
 * 填了它,友链页才显示申请表单;没填,表单自动隐藏,页面和以前一样。
 *
 * PUBLIC_ 开头的值会进入网页,访客看得到,所以这里只能放公开信息。
 * 真正的密钥(Resend API Key、Turnstile secret、收件邮箱)只有后端(src/friends/handler.js)读得到。
 */
import { APPLY_PATH } from "./validate.js";

const siteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";

export const friendApplyConfig = {
  /** 表单提交到本站自己的接口,不跨域 */
  api: APPLY_PATH,
  siteKey,
  enabled: Boolean(siteKey),
};
