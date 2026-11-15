import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";

/**
 * 本站的通用覆盖解析插件（名字沿用 appearance，但作用不限于外观设置）。
 *
 * 作用：构建时，主题源码引用下面这些路径的文件时，如果本站 `src/` 下有同路径文件，
 * 就改用本站的文件。覆盖范围（四类）：
 *   - i18n/**       主题自带覆盖机制不处理；本站的 i18nKey、translation 和 10 个语言文件靠它生效
 *   - utils/setting-utils、utils/banner-state
 *                   主题自带覆盖机制不处理；本站这两个工具文件靠它生效（其他 utils 不覆盖）
 *   - components/** 与 shirones 自带的组件覆盖机制（在 src/components/ 放同名文件）范围重叠，
 *                   两者结果一致；此外也让本站新增的组件（如 system/AppearanceHead.astro）
 *                   能通过 @components/ 别名被引用
 *   - layouts/**    与 shirones 自带的布局覆盖机制范围重叠，两者结果一致
 * 匹配方式：@i18n/、@utils/、@components/、@/ 别名，主题 src 的绝对路径，以及主题文件内部的相对路径。
 * 本站文件按 原路径、.ts、.mjs、.svelte、.astro 依次查找，找不到就交还主题原文件。
 *
 * 注意：这里覆盖的文件都是整份复制后修改的，主题升级时不会报错但会停在旧版本，
 * 需要和新版主题逐个对比（见 docs/optimization-review.md 第 10、11 条）。
 */
export function appearanceOverlay(root) {
  const require = createRequire(import.meta.url);
  const themeSrc = resolve(dirname(require.resolve("shirones/package.json")), "src").replaceAll("\\", "/");
  const themeRoots = [themeSrc, resolve(root, "node_modules/shirones/src").replaceAll("\\", "/")];
  const local = resolve(root, "src");
  const aliases = [["@i18n/", "i18n/"], ["@utils/", "utils/"], ["@components/", "components/"], ["@/", ""]];
  return {
    name: "ireina:appearance-overlay",
    enforce: "pre",
    resolveId(source, importer) {
      const [specifier, query = ""] = source.split(/\?(.*)/s);
      let relative;
      for (const [alias, prefix] of aliases) {
        if (specifier.startsWith(alias)) { relative = prefix + specifier.slice(alias.length); break; }
      }
      for (const themeRoot of themeRoots) {
        if (!relative && specifier.replaceAll("\\", "/").startsWith(themeRoot + "/")) relative = specifier.replaceAll("\\", "/").slice(themeRoot.length + 1);
        if (!relative && specifier.startsWith(".") && importer?.replaceAll("\\", "/").startsWith(themeRoot + "/")) {
          const absolute = resolve(dirname(importer.split("?")[0]), specifier).replaceAll("\\", "/");
          if (absolute.startsWith(themeRoot + "/")) relative = absolute.slice(themeRoot.length + 1);
        }
      }
      if (!relative || !(relative.startsWith("i18n/") || relative.startsWith("components/") || relative.startsWith("layouts/") || /^utils\/(setting-utils|banner-state)(\.[tj]s)?$/.test(relative))) return null;
      const base = resolve(local, relative);
      const target = [base, `${base}.ts`, `${base}.mjs`, `${base}.svelte`, `${base}.astro`].find(path => existsSync(path));
      return target ? `${target.replaceAll("\\", "/")}${query ? "?" + query : ""}` : null;
    },
  };
}
