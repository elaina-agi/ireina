/**
 * Build-only motion adapter. It never writes dependencies or replaces matchMedia.
 * JS: TypeScript AST + official component parsers, restricted to owned sources.
 * CSS: PostCSS after Stylus/scoping; zero-specificity guards preserve specificity.
 * Unsupported motion-query shapes deliberately fail instead of silently diverging.
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import postcss from "postcss";
import selectorParser from "postcss-selector-parser";

const require = createRequire(import.meta.url);
const FEATURE = "prefers-reduced-motion";
const ERROR_PREFIX = "[ireina-motion]";
const fail = (id, message) => { throw new Error(`${ERROR_PREFIX} ${id}: ${message}`); };
const normalize = value => String(value).replaceAll("\\", "/").replace(/^\/@fs\//, "/").replace(/\/$/, "");
const bareId = id => normalize(id.split("?")[0]);
const inside = (id, root) => root && (id === normalize(root) || id.startsWith(`${normalize(root)}/`));

function splitTopLevel(value, delimiter, id) {
  const parts = [];
  let start = 0, depth = 0, quote = "";
  for (let index = 0; index < value.length; index++) {
    const ch = value[index];
    if (ch === "\\") { index++; continue; }
    if (quote) { if (ch === quote) quote = ""; continue; }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (depth < 0) fail(id, `Unbalanced media condition: ${value}`);
    if (!depth && (delimiter === "," ? ch === "," : /^\s+and\s+/i.test(value.slice(index)))) {
      parts.push(value.slice(start, index).trim());
      const length = delimiter === "," ? 1 : value.slice(index).match(/^\s+and\s+/i)[0].length;
      index += length - 1;
      start = index + 1;
    }
  }
  if (depth || quote) fail(id, `Unbalanced media condition: ${value}`);
  parts.push(value.slice(start).trim());
  if (parts.some(part => !part)) fail(id, `Empty media condition: ${value}`);
  return parts;
}

function mediaBranches(params, id) {
  return splitTopLevel(params, ",", id).map(branch => {
    if (!branch.toLowerCase().includes(FEATURE)) return { reduced: null, remaining: branch };
    const clauses = splitTopLevel(branch, "and", id);
    let reduced = null;
    const remaining = [];
    for (const clause of clauses) {
      if (!clause.toLowerCase().includes(FEATURE)) { remaining.push(clause); continue; }
      const match = clause.match(/^\(\s*prefers-reduced-motion\s*:\s*(reduce|no-preference)\s*\)$/i);
      if (!match || reduced !== null) fail(id, `Unsupported motion media condition: ${branch}`);
      reduced = match[1].toLowerCase() === "reduce";
    }
    // "not screen and (...)" negates the entire query, not just the screen term.
    if (remaining.some(clause => /\bnot\b|\bor\b/i.test(clause))) fail(id, `Unsupported negated/disjunctive motion condition: ${branch}`);
    return { reduced, remaining: remaining.join(" and ") };
  });
}

function guardSelector(selector, reduced, shadow, id, globalCondition = false) {
  const rootCondition = `html${reduced ? ".motion-reduced" : ":not(.motion-reduced)"}`;
  const guard = shadow
    ? (reduced ? ":host([data-motion-reduced])" : ":host(:not([data-motion-reduced]))")
    : globalCondition ? `:where(:global(${rootCondition}), :global(${rootCondition} *))` : `:where(${rootCondition}, ${rootCondition} *)`;
  try {
    return selectorParser(root => {
      root.each(rule => {
        if (shadow) {
          const hosts = rule.nodes.filter(node => node.type === "pseudo" && node.value === ":host");
          if (hosts.length > 1) fail(id, `Unsupported multiple shadow hosts: ${selector}`);
          if (hosts.length) {
            const host = hosts[0];
            if (!host.nodes?.length) host.append(selectorParser.selector());
            if (host.nodes.length !== 1) fail(id, `Unsupported host selector list: ${selector}`);
            const condition = selectorParser().astSync(reduced ? "[data-motion-reduced]" : ":not([data-motion-reduced])").first.first;
            host.first.append(condition.clone());
          } else {
            const prefix = selectorParser().astSync(guard).first.first;
            rule.prepend(selectorParser.combinator({ value: " " }));
            rule.prepend(prefix.clone());
          }
          return;
        }
        // Guard the final compound, BEFORE its pseudo-element. This also covers
        // html/:root itself, nested &, scoped classes, SVG and ::backdrop.
        let compoundStart = 0;
        rule.nodes.forEach((node, index) => { if (node.type === "combinator") compoundStart = index + 1; });
        const pseudoElement = rule.nodes.slice(compoundStart).find(node => node.type === "pseudo" &&
          (node.value.startsWith("::") || [":before", ":after", ":first-letter", ":first-line"].includes(node.value)));
        const condition = selectorParser().astSync(guard).first.first;
        if (pseudoElement) rule.insertBefore(pseudoElement, condition.clone());
        else rule.append(condition.clone());
      });
    }).processSync(selector, { lossless: true });
  } catch (error) { fail(id, `Cannot guard selector ${selector}: ${error.message}`); }
}

function guardNodes(container, reduced, shadow, id, globalCondition) {
  for (const node of [...(container.nodes ?? [])]) {
    if (node.type === "comment") continue;
    if (node.type === "rule") {
      node.selector = guardSelector(node.selector, reduced, shadow, id, globalCondition);
      // A guard on a parent selector scopes declarations and nested rules alike.
      // Reject global definitions nested in it: their semantics are not selector-local.
      node.walkAtRules(at => {
        if (/keyframes$|^(font-face|property|counter-style)$/i.test(at.name)) fail(id, `Global @${at.name} inside motion media is unsupported`);
      });
    } else if (node.type === "atrule") {
      if (!["media", "supports", "container", "layer", "starting-style"].includes(node.name.toLowerCase())) fail(id, `Unsupported @${node.name} inside motion media`);
      guardNodes(node, reduced, shadow, id, globalCondition);
    } else if (node.type === "decl") {
      fail(id, "Motion media has declarations without a rule (expected compiled CSS)");
    } else fail(id, `Unsupported CSS node ${node.type}`);
  }
}

function transformCssRoot(root, { id = "<css>", shadow = false, globalCondition = false } = {}) {
  const targets = [];
  root.walkAtRules("media", node => { if (node.params.toLowerCase().includes(FEATURE)) targets.push(node); });
  // Nested media first; OR branches are cloned independently, never flattened.
  for (const media of targets.reverse()) {
    for (const branch of mediaBranches(media.params, id)) {
      const wrapper = postcss.root({ nodes: media.nodes.map(node => node.clone()) });
      if (branch.reduced !== null) {
        const declarations = wrapper.nodes.filter(node => node.type === "decl");
        if (declarations.length) {
          // Modern nested CSS: `.a { @media (...) { color: red } }`.
          let ancestor = media.parent;
          while (ancestor && ancestor.type !== "rule") ancestor = ancestor.parent;
          if (!ancestor) fail(id, "Root-level declarations in motion media are unsupported");
          const rule = postcss.rule({ selector: "&" });
          for (const node of [...wrapper.nodes]) {
            if (node.type === "decl" || node.type === "comment") rule.append(node.clone());
            else fail(id, "Mixed nested rules/declarations inside motion media require explicit nesting");
          }
          wrapper.removeAll(); wrapper.append(rule);
        }
        guardNodes(wrapper, branch.reduced, shadow, id, globalCondition);
      }
      if (branch.remaining) media.before(postcss.atRule({ name: "media", params: branch.remaining, nodes: wrapper.nodes }));
      else for (const child of [...wrapper.nodes]) media.before(child);
    }
    media.remove();
  }
  return targets.length > 0;
}

/** Transform already-compiled CSS, or an explicitly decoded CSS string. */
export function transformMotionCss(code, options = {}) {
  if (!code.toLowerCase().includes(FEATURE)) return null;
  const root = postcss.parse(code, { from: options.id });
  return transformCssRoot(root, options) ? root.toString() : null;
}

/** Install in Vite css.postcss.plugins; AFTER preprocessors/component scoping. */
export function createMotionPostcssPlugin() {
  return {
    postcssPlugin: "ireina-motion-policy",
    OnceExit(root, { result }) {
      const id = result.opts.from || "<compiled-css>";
      // vitePreprocess runs PostCSS before Svelte adds its scope hashes.
      transformCssRoot(root, { id, globalCondition: /\.svelte\.vite-preprocess\./.test(id) });
    },
  };
}

function applyEdits(code, edits, id) {
  let boundary = code.length;
  for (const edit of edits.sort((a, b) => b.start - a.start || b.end - a.end)) {
    if (edit.end > boundary) fail(id, "Overlapping AST edits");
    code = code.slice(0, edit.start) + edit.text + code.slice(edit.end);
    boundary = edit.start;
  }
  return code;
}

const staticString = node => ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : null;
function isGlobalMediaCall(node) {
  if (!ts.isCallExpression(node)) return false;
  const callee = node.expression;
  return ts.isIdentifier(callee) && callee.text === "matchMedia" ||
    ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) &&
    ["window", "globalThis"].includes(callee.expression.text) && callee.name.text === "matchMedia";
}

/** Exported separately for focused tests and virtual compiled script modules. */
export function transformMotionJavaScript(code, { id = "<script>", policyId, shadow = false, cssStrings = false } = {}) {
  if (!code.includes(FEATURE)) return null;
  const source = ts.createSourceFile(id, code, ts.ScriptTarget.Latest, true, /\.tsx?(?:\?|$)/.test(id) ? ts.ScriptKind.TS : ts.ScriptKind.JS);
  if (source.parseDiagnostics.length) fail(id, ts.flattenDiagnosticMessageText(source.parseDiagnostics[0].messageText, " "));
  const declarations = new Map();
  const identifiers = new Set();
  function collect(node) {
    if (ts.isIdentifier(node)) identifiers.add(node.text);
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
      const name = node.name.text;
      const value = node.initializer && (node.parent.flags & ts.NodeFlags.Const) ? staticString(node.initializer) : null;
      declarations.set(name, declarations.has(name) ? null : value);
    }
    ts.forEachChild(node, collect);
  }
  collect(source);
  let alias = "__ireinaMotionMediaQuery";
  while (identifiers.has(alias)) alias += "_";
  const edits = [];
  let calls = 0;
  function visit(node) {
    if (isGlobalMediaCall(node)) {
      const argument = node.arguments[0];
      const query = argument && (staticString(argument) ?? (ts.isIdentifier(argument) ? declarations.get(argument.text) : null));
      if (typeof query === "string" && query.toLowerCase().includes(FEATURE)) {
        if (node.arguments.length !== 1 || !/^\(\s*prefers-reduced-motion\s*:\s*(reduce|no-preference)\s*\)$/i.test(query)) fail(id, `Unsupported matchMedia motion query: ${query}`);
        if (!policyId) fail(id, "policyId is required for motion matchMedia calls");
        edits.push({ start: node.getStart(source), end: node.end, text: `${alias}(${JSON.stringify(query)})` });
        calls++;
        return;
      }
      if (argument?.getText(source).includes(FEATURE)) fail(id, "Dynamic motion matchMedia query cannot be statically proven");
    }
    const value = staticString(node);
    if (cssStrings && value?.includes(FEATURE) && /@media\b/.test(value)) {
      const css = transformMotionCss(value, { id: `${id}#embedded-css`, shadow });
      if (css !== null) { edits.push({ start: node.getStart(source), end: node.end, text: JSON.stringify(css) }); return; }
    }
    if (cssStrings && ts.isTemplateExpression(node) && node.getText(source).includes(FEATURE) && node.getText(source).includes("@media")) fail(id, "Interpolated motion CSS requires a dedicated adapter");
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (!edits.length) return null;
  if (calls) {
    let insertion = code.startsWith("#!") ? code.indexOf("\n") + 1 : 0;
    for (const statement of source.statements) {
      if (ts.isExpressionStatement(statement) && ts.isStringLiteral(statement.expression)) insertion = statement.end;
      else break;
    }
    edits.push({ start: insertion, end: insertion, text: `\nimport { motionMediaQuery as ${alias} } from ${JSON.stringify(normalize(policyId))};\n` });
  }
  return applyEdits(code, edits, id);
}

let astroCompiler;
async function transformAstro(code, options) {
  const astroRequire = createRequire(require.resolve("astro/package.json"));
  astroCompiler ??= import(pathToFileURL(astroRequire.resolve("@astrojs/compiler-rs")).href);
  const { parse } = await astroCompiler;
  const parsed = parse(code);
  if (parsed.ast?.type !== "AstroRoot") fail(options.id, "Unsupported Astro AST contract; revalidate the adapter after upgrading Astro");
  if (parsed.diagnostics?.some(item => item.severity === "error" || item.severity === 1)) fail(options.id, "Astro source could not be parsed");
  const edits = [];
  function visit(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "JSXElement" && node.openingElement?.name?.name === "script") {
      const start = node.openingElement.end, end = node.closingElement?.start;
      if (!Number.isInteger(start) || !Number.isInteger(end)) fail(options.id, "Unexpected Astro script offsets");
      const contents = code.slice(start, end);
      if (contents.includes(FEATURE)) {
        const changed = transformMotionJavaScript(contents, { ...options, id: `${options.id}.ts` });
        if (changed !== null) {
          if (node.openingElement.attributes?.length) fail(options.id, "Motion query in attributed/inline Astro script cannot safely import policy");
          edits.push({ start, end, text: changed });
        }
      }
      return;
    }
    if (node.type === "AstroFrontmatter" && node.program) {
      const { start, end } = node.program;
      const changed = transformMotionJavaScript(code.slice(start, end), { ...options, id: `${options.id}.ts` });
      if (changed !== null) edits.push({ start, end, text: changed });
      return;
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    }
  }
  visit(parsed.ast);
  return edits.length ? applyEdits(code, edits, options.id) : null;
}

/**
 * Vite enforce:pre transform hook. Root arguments are absolute src directories.
 * Returns Promise<string|null>. policyId defaults to localRoot/motion/policy.ts.
 * Raw CSS exported as JS is decoded with the AST; ordinary CSS uses PostCSS too.
 */
export async function transformMotionSource(code, id, { themeRoot, localRoot, policyId = `${normalize(localRoot)}/motion/policy.ts` } = {}) {
  if (!code.includes(FEATURE)) return null;
  const filename = bareId(id);
  const owned = inside(filename, themeRoot) || inside(filename, localRoot);
  const dependency = /\/node_modules\/(?:@swup\/a11y-plugin|@fancyapps\/ui)\/(?:dist|src)\//.test(filename);
  if ((!owned && !dependency) || inside(filename, localRoot && `${normalize(localRoot)}/motion`)) return null;
  const shadow = inside(filename, localRoot && `${normalize(localRoot)}/kanban/vendor`) && filename.endsWith("/kanban.js");
  const options = { id, policyId, shadow, cssStrings: shadow || /\.(?:css|styl)(?:\?|$)/.test(id) };
  const query = new URLSearchParams(id.includes("?") ? id.slice(id.indexOf("?") + 1) : "");
  if (query.get("type") === "style") return null; // post-Stylus/scoping plugin owns it
  if (/\.css$/.test(filename)) {
    return /^\s*(?:export|import)\b/.test(code)
      ? transformMotionJavaScript(code, { ...options, cssStrings: true })
      : transformMotionCss(code, { id });
  }
  if (/\.styl$/.test(filename)) return null; // postprocessor receives compiled CSS
  if (/\.svelte$/.test(filename) && !query.has("type")) {
    const compiler = require("svelte/compiler");
    let changed = false;
    const result = await compiler.preprocess(code, {
      script: ({ content, attributes }) => {
        const transformed = transformMotionJavaScript(content, { ...options, id: attributes.lang === "ts" ? `${id}.ts` : `${id}.js` });
        if (transformed === null) return;
        changed = true;
        return { code: transformed };
      },
    }, { filename });
    return changed ? result.code : null;
  }
  if (/\.astro$/.test(filename) && !query.has("type")) return transformAstro(code, options);
  if (/\.[cm]?[jt]sx?$/.test(filename) || query.get("type") === "script") return transformMotionJavaScript(code, options);
  return null;
}