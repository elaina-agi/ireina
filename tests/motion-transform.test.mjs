import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";
import ts from "typescript";
import { createMotionPostcssPlugin, transformMotionCss, transformMotionJavaScript, transformMotionSource } from "../src/motion/transform.mjs";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const themeRoot = resolve(dirname(require.resolve("shirones/package.json")), "src");
const localRoot = resolve(root, "src");
const policyId = resolve(localRoot, "motion/policy.ts");
const options = { themeRoot, localRoot, policyId };
const parse = code => ts.createSourceFile("test.ts", code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const motionCalls = code => {
  const nodes = [];
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText().includes("matchMedia")) nodes.push(node.getText());
    ts.forEachChild(node, visit);
  }
  visit(parse(code));
  return nodes.filter(code => code.includes("prefers-reduced-motion"));
};

test("AST adapter touches only exact motion queries, not comments, strings or other media", () => {
  const input = `// matchMedia('(prefers-reduced-motion: reduce)')\nconst sample = "matchMedia('(prefers-reduced-motion: reduce)')";\nconst a=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;\nconst b=matchMedia('(prefers-color-scheme: dark)');\nconst c=globalThis.matchMedia('(prefers-reduced-motion: no-preference)');`;
  const output = transformMotionJavaScript(input, { policyId });
  assert.match(output, /import \{ motionMediaQuery as __ireinaMotionMediaQuery \}/);
  assert.ok(output.includes("// matchMedia('(prefers-reduced-motion: reduce)')"), "comment fixture remains unchanged");
  assert.match(output, /matchMedia\('\(prefers-color-scheme: dark\)'\)/);
  assert.match(output, /const a=__ireinaMotionMediaQuery\("\(prefers-reduced-motion: reduce\)"\)\.matches/);
  assert.equal(motionCalls(output).length, 0);
  assert.equal(parse(output).parseDiagnostics.length, 0);
});

test("supports uniquely declared constant queries and rejects unknown motion expressions", () => {
  const output = transformMotionJavaScript(`const query='(prefers-reduced-motion: reduce)'; const a=window.matchMedia(query);`, { policyId });
  assert.match(output, /const a=__ireinaMotionMediaQuery/);
  assert.throws(() => transformMotionJavaScript(`window.matchMedia('(prefers-reduced-motion: reduce) and (hover: hover)')`, { policyId }), /Unsupported matchMedia/);
  assert.throws(() => transformMotionJavaScript('window.matchMedia(`(prefers-reduced-motion: ${value})`)', { policyId }), /cannot be statically proven/);
});

test("CSS guard preserves class specificity, root selectors and pseudo elements", () => {
  const output = transformMotionCss(`@media (prefers-reduced-motion: reduce) { html, :root, .a:hover::before, dialog::backdrop { animation: none !important; } }`);
  const css = postcss.parse(output);
  assert.equal(css.first.type, "rule");
  assert.match(output, /html:where\(html\.motion-reduced, html\.motion-reduced \*\)/);
  assert.match(output, /:root:where/);
  assert.match(output, /:where\([^\n]+\)::before/);
  assert.match(output, /:where\([^\n]+\)::backdrop/);
  assert.match(output, /animation: none !important/);
  assert.doesNotMatch(output, /@media/);
});

test("preserves AND conditions, unrelated OR branches, nested groups and no-preference", () => {
  const output = transformMotionCss(`@supports(display:grid){@media screen and (min-width: 800px) and (prefers-reduced-motion: no-preference), print {.a{animation:spin 1s}}}`);
  assert.match(output, /@supports\(display:grid\)/);
  assert.match(output, /@media screen and \(min-width: 800px\)/);
  assert.match(output, /html:not\(\.motion-reduced\)/);
  assert.match(output, /@media print\s*\{\.a\{/);
  assert.equal((output.match(/animation:spin 1s/g) || []).length, 2);
});

test("nested motion media and modern nested declarations preserve their guards", () => {
  const output = transformMotionCss(`.parent { @media (prefers-reduced-motion: reduce) { transition: none } } @media (prefers-reduced-motion: reduce) { @media (min-width: 1px) {.b {opacity:1}} }`);
  assert.match(output, /&:where/);
  assert.match(output, /@media \(min-width: 1px\)/);
  assert.doesNotMatch(output, /prefers-reduced-motion/);
});

test("unknown motion CSS semantics fail rather than drop conditions", () => {
  for (const code of [
    `@media not screen and (prefers-reduced-motion: reduce){.a{opacity:0}}`,
    `@media ((prefers-reduced-motion: reduce) or (width > 10px)){.a{opacity:0}}`,
    `@media (prefers-reduced-motion: reduce){@keyframes x{to{opacity:0}}}`,
    `@media (prefers-reduced-motion: reduce){@font-face{font-family:a}}`,
  ]) assert.throws(() => transformMotionCss(code), /\[ireina-motion\]/);
});

test("shadow CSS uses host state, merging existing host conditions", () => {
  const output = transformMotionCss(`@media (prefers-reduced-motion: reduce) {.bubble::before{animation:none}:host([data-float]) .bubble{animation:none}:host{opacity:1}}`, { shadow: true });
  assert.match(output, /:host\(\[data-motion-reduced\]\) \.bubble::before/);
  assert.match(output, /:host\(\[data-float\]\[data-motion-reduced\]\) \.bubble/);
  assert.doesNotMatch(output, /html/);
});

test("real kanban AST converts only motion calls and its decoded shadow stylesheet", async () => {
  const filename = resolve(localRoot, "kanban/vendor/kanban.js");
  const code = fs.readFileSync(filename, "utf8");
  const output = await transformMotionSource(code, filename, options);
  assert.equal(motionCalls(output).length, 0);
  assert.match(output, /matchMedia\("\(prefers-color-scheme: dark\)"\)/);
  assert.match(output, /matchMedia\("\(max-width: 767px\)"\)/);
  assert.match(output, /data-motion-reduced/);
  assert.doesNotMatch(output, /@media \(prefers-reduced-motion/);
  assert.equal(parse(output).parseDiagnostics.length, 0);
});

test("raw CSS JS exports are decoded, transformed and safely encoded", async () => {
  const input = `export default ${JSON.stringify(`@media (prefers-reduced-motion: reduce){.a{animation:none}}`)};`;
  const output = await transformMotionSource(input, resolve(themeRoot, "styles/textures.css") + "?raw", options);
  assert.match(output, /motion-reduced/);
  assert.doesNotMatch(output, /prefers-reduced-motion/);
  assert.equal(parse(output).parseDiagnostics.length, 0);
});

test("official Svelte preprocess isolates scripts and leaves Stylus untouched", async () => {
  const code = `<script lang="ts">let reduced: boolean = window.matchMedia('(prefers-reduced-motion: reduce)').matches;</script><div>{reduced}</div><style lang="stylus">@media (prefers-reduced-motion: reduce)\n .a\n  animation none</style>`;
  const output = await transformMotionSource(code, resolve(themeRoot, "components/test.svelte"), options);
  assert.match(output, /__ireinaMotionMediaQuery/);
  assert.match(output, /<style lang="stylus">@media \(prefers-reduced-motion: reduce\)/);
});

test("Astro parser isolates actual scripts and preserves markup/style content", async () => {
  const code = `---\nconst title='中文';\n---\n<!-- <script>not code</script> -->\n<p>matchMedia('(prefers-reduced-motion: reduce)')</p><script>/*中文*/ const r=window.matchMedia('(prefers-reduced-motion: reduce)');</script><style>@media (prefers-reduced-motion: reduce){.a{opacity:0}}</style>`;
  const output = await transformMotionSource(code, resolve(themeRoot, "components/test.astro"), options);
  assert.match(output, /<script>\nimport/);
  assert.match(output, /<p>matchMedia/);
  assert.match(output, /<style>@media/);
});

test("PostCSS plugin transforms compiled scoped CSS, idempotently", async () => {
  const code = `@media(prefers-reduced-motion:reduce){.a.svelte-hash::after{transition:none}}`;
  const result = await postcss([createMotionPostcssPlugin()]).process(code, { from: "Example.svelte.css" });
  assert.match(result.css, /\.a\.svelte-hash:where/);
  assert.equal(transformMotionCss(result.css), null);
});

test("source scope excludes arbitrary dependencies and the policy module", async () => {
  const code = `matchMedia('(prefers-reduced-motion: reduce)')`;
  assert.equal(await transformMotionSource(code, "/outside/node_modules/random/index.js", options), null);
  assert.equal(await transformMotionSource(code, policyId, options), null);
});

test("real theme direct motion-call modules compile with no native motion calls", async () => {
  for (const path of ["utils/motion.ts", "utils/option-groups.ts", "components/atoms/action/FABMenu.svelte", "components/organisms/BannerStage.astro"]) {
    const filename = resolve(themeRoot, path);
    const output = await transformMotionSource(fs.readFileSync(filename, "utf8"), filename, options);
    assert.ok(output, path);
    assert.match(output, /__ireinaMotionMediaQuery/, path);
  }
});

test("all real pure CSS motion rules in installed theme and local sources are supported", () => {
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (path.endsWith(".css")) {
        const code = fs.readFileSync(path, "utf8");
        if (code.includes("prefers-reduced-motion")) {
          const result = transformMotionCss(code, { id: path });
          if (result) assert.doesNotMatch(result, /@media[^\{]*prefers-reduced-motion/, path);
        }
      }
    }
  }
  walk(themeRoot); walk(localRoot);
});
test("Svelte preprocessor guards stay global after official compiler scopes selectors", async () => {
  const input = `@media(prefers-reduced-motion:reduce){.a::before{transition:none}}`;
  const preprocessed = await postcss([createMotionPostcssPlugin()]).process(input, { from: "Widget.svelte.vite-preprocess.stylus" });
  const { compile } = require("svelte/compiler");
  const compiled = compile(`<div class="a">x</div><style>${preprocessed.css}</style>`, { filename: "Widget.svelte" });
  assert.equal(compiled.warnings.filter(item => item.code === "css_unused_selector").length, 0);
  assert.match(compiled.css.code, /:where\(html\.motion-reduced, html\.motion-reduced \*\)/);
  assert.doesNotMatch(compiled.css.code, /:global/);
  assert.doesNotMatch(compiled.css.code, /html\.motion-reduced[^,]*svelte-/);
});

test("actual Svelte Stylus media rules compile with matching non-scoped root guards", async () => {
  const themeRequire = createRequire(require.resolve("shirones/package.json"));
  const stylus = themeRequire("stylus");
  const compiler = require("svelte/compiler");
  for (const path of ["components/molecules/AnimeCard.svelte", "components/molecules/AlbumCard.svelte", "components/molecules/MomentGallery.svelte", "components/organisms/AlbumGallery.svelte", "components/organisms/PasswordGate.svelte"]) {
    const filename = resolve(themeRoot, path);
    const source = fs.readFileSync(filename, "utf8");
    const preprocessed = await compiler.preprocess(source, {
      style: async ({ content, attributes }) => {
        const css = attributes.lang === "stylus" ? stylus.render(content, { filename }) : content;
        const result = await postcss([createMotionPostcssPlugin()]).process(css, { from: `${filename}.vite-preprocess.${attributes.lang || "css"}` });
        return { code: result.css };
      },
    }, { filename });
    const compiled = compiler.compile(preprocessed.code, { filename });
    assert.doesNotMatch(compiled.css?.code || "", /@media[^\{]*prefers-reduced-motion/, path);
    assert.doesNotMatch(compiled.css?.code || "", /:global/, path);
  }
});

test("actual Swup a11y ESM query is scoped without changing plugin accessibility behavior", async () => {
  const themeRequire = createRequire(require.resolve("shirones/package.json"));
  const astroSwupRequire = createRequire(themeRequire.resolve("@swup/astro/package.json"));
  const filename = astroSwupRequire.resolve("@swup/a11y-plugin");
  const code = fs.readFileSync(filename, "utf8");
  const output = await transformMotionSource(code, filename, options);
  assert.ok(output);
  assert.equal(motionCalls(output).length, 0);
  assert.match(output, /respectReducedMotion/);
  assert.match(output, /content:announce/);
});