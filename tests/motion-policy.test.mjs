import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function environment(stored = null, systemReduced = false) {
  const code = ts.transpileModule(readFileSync(new URL("../src/motion/policy.ts", import.meta.url), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const classes = new Set();
  const window = new EventTarget();
  // Native system query stand-in: only the exact reduced-motion query is supported.
  const system = new EventTarget();
  let systemMatches = systemReduced;
  Object.defineProperty(system, "matches", { get: () => systemMatches });
  window.matchMedia = query => {
    assert.equal(query, "(prefers-reduced-motion: reduce)");
    return system;
  };
  const setSystem = value => { systemMatches = value; system.dispatchEvent(new Event("change")); };
  const storage = new Map(stored === null ? [] : [["mc-motion", stored]]);
  const html = { dataset: {}, classList: { contains: key => classes.has(key), toggle(key, value) { value ? classes.add(key) : classes.delete(key); } } };
  const context = { exports: {}, document: { documentElement: html }, window, EventTarget, Event, CustomEvent, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) } };
  vm.runInNewContext(code, context);
  return { api: context.exports, context, storage, html, setSystem };
}

test("explicit choice wins; without one the default follows the system setting", () => {
  // [stored choice, system reduced, expected reduced]
  for (const [stored, system, expected] of [
    [null, false, false],
    [null, true, true],
    ["full", true, false],
    ["reduced", false, true],
    ["unknown", true, true],
  ]) {
    const { api } = environment(stored, system);
    assert.equal(api.getMotionPreference(), expected, `stored=${stored} system=${system}`);
  }
  assert.equal(environment().api.prefersReducedMotion(), false);
});

test("unchosen visitors follow live system changes; explicit choices do not", () => {
  const unchosen = environment(null, false);
  const stop = unchosen.api.watchSystemMotion();
  unchosen.api.applyMotionPreference(unchosen.api.resolveMotionPreference());
  unchosen.setSystem(true);
  assert.equal(unchosen.api.prefersReducedMotion(), true);
  unchosen.setSystem(false);
  assert.equal(unchosen.api.prefersReducedMotion(), false);
  stop();
  unchosen.setSystem(true);
  assert.equal(unchosen.api.prefersReducedMotion(), false);

  const chosen = environment("full", false);
  chosen.api.watchSystemMotion();
  chosen.api.applyMotionPreference(chosen.api.resolveMotionPreference());
  chosen.setSystem(true);
  assert.equal(chosen.api.prefersReducedMotion(), false);
  assert.equal(chosen.storage.get("mc-motion"), "full");
});

test("clearing the choice forgets it and returns to the system setting", () => {
  const { api, storage } = environment(null, true);
  api.setMotionPreference(false);
  assert.equal(api.getMotionChoice(), "full");
  assert.equal(api.prefersReducedMotion(), false);
  api.clearMotionPreference();
  assert.equal(storage.has("mc-motion"), false);
  assert.equal(api.getMotionChoice(), null);
  assert.equal(api.prefersReducedMotion(), true);
});

test("one event per actual change, live media query and unsubscribe", () => {
  const { api, storage } = environment();
  const reduced = api.motionMediaQuery();
  const full = api.motionMediaQuery("(prefers-reduced-motion: no-preference)");
  const events = [];
  const listener = event => events.push([event.matches, event.media]);
  reduced.addEventListener("change", listener);
  let count = 0;
  const unsubscribe = api.subscribeMotionPreference(() => count++);
  api.setMotionPreference(true);
  api.setMotionPreference(true);
  assert.equal(count, 1);
  assert.equal(reduced.matches, true);
  assert.equal(full.matches, false);
  assert.equal(events.length, 1);
  assert.equal(storage.get("mc-motion"), "reduced");
  reduced.removeEventListener("change", listener);
  unsubscribe();
  api.setMotionPreference(false);
  assert.equal(count, 1);
  assert.equal(events.length, 1);
  assert.equal(full.matches, true);
});

test("storage unavailable still keeps current session and emits changes", () => {
  const { api, context } = environment(null, true);
  context.localStorage = { getItem() { throw Error("denied"); }, setItem() { throw Error("denied"); }, removeItem() { throw Error("denied"); } };
  api.setMotionPreference(true);
  assert.equal(api.getMotionPreference(), true);
  api.setMotionPreference(false);
  assert.equal(api.getMotionPreference(), false);
  // The session choice still beats the system setting when it is re-resolved.
  assert.equal(api.resolveMotionPreference(), false);
  api.clearMotionPreference();
  assert.equal(api.resolveMotionPreference(), true);
});

test("legacy listener and onchange are supported and removable", () => {
  const { api } = environment();
  const media = api.motionMediaQuery();
  let count = 0;
  const listener = () => count++;
  media.addListener(listener);
  media.onchange = listener;
  api.applyMotionPreference(true);
  assert.equal(count, 2);
  media.removeListener(listener);
  media.onchange = null;
  api.applyMotionPreference(false);
  assert.equal(count, 2);
});

test("media query once, abort and event receiver match native EventTarget", () => {
  const { api } = environment();
  const media = api.motionMediaQuery();
  let count = 0;
  media.addEventListener("change", function(event) { count++; assert.equal(this, media); assert.equal(event.currentTarget, media); assert.equal(event.target, media); }, { once: true });
  const controller = new AbortController();
  media.addEventListener("change", () => assert.fail("aborted handler ran"), { signal: controller.signal });
  controller.abort();
  api.setMotionPreference(true); api.setMotionPreference(false);
  assert.equal(count, 1);
});
