import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { readFileSync, realpathSync } from "node:fs";
import { createMotionPostcssPlugin, transformMotionSource } from "./transform.mjs";
import { patchKanbanMotion, patchThemeMotion } from "./patches.mjs";

/** Site-owned adapter: dependencies stay immutable and upgrades are checked by tests. */
export function motionPlugin(root) {
  const require = createRequire(import.meta.url);
  const themeRoot = resolve(dirname(require.resolve("shirones/package.json")), "src").replaceAll("\\", "/");
  const localRoot = resolve(root, "src").replaceAll("\\", "/");
  const policyId = `${localRoot}/motion/policy.ts`;
  const options = { themeRoot, localRoot, policyId };
  function canonicalId(id) {
    const [file, ...query] = id.split("?");
    try { return realpathSync(file).replaceAll("\\", "/") + (query.length ? `?${query.join("?")}` : ""); }
    catch { return id.replaceAll("\\", "/"); }
  }
  return {
    name: "ireina:site-motion",
    enforce: "pre",
    config() {
      return {
        css: { postcss: { plugins: [createMotionPostcssPlugin()] } },
        optimizeDeps: { exclude: ["@swup/a11y-plugin", "@swup/astro/client/SwupA11yPlugin", "@fancyapps/ui"] },
      };
    },
    async load(id) {
      // Astro's own pre-transform precedes user pre-transforms. Adapt the original
      // dependency component at load time, before Astro/Svelte produce virtual modules.
      // Do not intercept local layouts: the theme owns their relative-style fallback.
      if (id.includes("?") || !/\.(astro|svelte)$/.test(id)) return null;
      const canonical = canonicalId(id);
      if (!canonical.startsWith(`${themeRoot}/`)) return null;
      const code = readFileSync(canonical, "utf8");
      let next = patchThemeMotion(code, canonical, options) ?? code;
      next = await transformMotionSource(next, canonical, options) ?? next;
      return next === code ? null : { code: next, map: null };
    },
    async transform(code, id) {
      if (id.includes("type=style")) return null;
      // Main components have already been compiled here; their load hook owns source edits.
      if (!id.includes("?") && /\.(astro|svelte)$/.test(id)) return null;
      const canonical = canonicalId(id);
      let next = patchKanbanMotion(code, canonical, policyId) ?? code;
      next = await transformMotionSource(next, canonical, options) ?? next;
      return next === code ? null : { code: next, map: null };
    },
  };
}
