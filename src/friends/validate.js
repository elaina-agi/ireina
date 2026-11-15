/**
 * 友链申请的填写规则。网页表单和后端(src/friends/handler.js)共用这一份,
 * 这样两边的长度上限、格式要求永远一致。后端那边的检查才是最终把关,
 * 网页这边只是为了提前提示访客。
 *
 * 这个文件不能依赖浏览器或 Astro 的东西:后端打包时也会把它带进去。
 */

/** 表单提交到的地址。由 api/friend-apply.js 的文件名决定,两处要一致 */
export const APPLY_PATH = "/api/friend-apply";

export const LIMITS = { name: 40, url: 200, avatar: 300, desc: 120, email: 120 };

/** 表单字段,顺序就是页面上的显示顺序 */
export const FIELDS = ["name", "url", "avatar", "desc", "email"];

const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;

/** 去掉控制字符(含换行),把连续空白压成一个空格,防止往邮件标题里塞换行 */
function clean(value) {
  if (typeof value !== "string") return "";
  // biome-ignore lint/suspicious/noControlCharactersInRegex: 就是要清掉控制字符
  return value.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

/**
 * @param {Record<string, unknown>} input
 * @returns {{ values: Record<string, string>, errors: Record<string, "required" | "too_long" | "url" | "email"> }}
 */
export function validateApplication(input) {
  const values = {};
  const errors = {};
  for (const field of FIELDS) {
    const value = clean(input?.[field]);
    values[field] = value;

    // 只有 url 和 email 是必填的，其他可选
    const isRequired = field === "url" || field === "email";

    if (!value && isRequired) {
      errors[field] = "required";
    } else if (value && value.length > LIMITS[field]) {
      errors[field] = "too_long";
    } else if (value && (field === "url" || field === "avatar") && !isHttpUrl(value)) {
      errors[field] = "url";
    } else if (value && field === "email" && !EMAIL.test(value)) {
      errors[field] = "email";
    }
  }
  return { values, errors };
}
