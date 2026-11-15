import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import { motionPlugin } from '../src/motion/plugin.mjs';
import { patchKanbanMotion } from '../src/motion/patches.mjs';
const require=createRequire(import.meta.url);
const root=resolve(import.meta.dirname,'..');
const themeRoot=resolve(dirname(require.resolve('shirones/package.json')),'src');
const policyId=resolve(root,'src/motion/policy.ts');

test('Astro source patches run in load, not after framework compilation',async()=>{
  const plugin=motionPlugin(root);
  for(const name of ['components/molecules/SidebarTOC.astro','components/organisms/BannerStage.astro','components/atoms/feedback/LoadingIndicator.svelte','components/atoms/feedback/ProgressIndicator.svelte','components/atoms/input/SearchView.svelte']) {
    const id=resolve(themeRoot,name);const result=await plugin.load(id);assert.ok(result,name);assert.match(result.code,/policy\.ts/,name);
    assert.equal(await plugin.transform('export default function(){}',id),null);
  }
  assert.equal(await plugin.load(resolve(root,'src/layouts/Layout.astro')),null,'theme fallback must retain local layout ownership');
});

test('mascot speech and immediate-sleep patches match the bundled contract',()=>{
  const id=resolve(root,'src/kanban/vendor/kanban.js');const result=patchKanbanMotion(fs.readFileSync(id,'utf8'),id,policyId);
  assert.match(result,/finishTyping: \(\) => z\.finishTyping\(\)/);
  assert.match(result,/!__ireinaKanbanReduced\(\) && await n\(s.transition\)/);
  const source=ts.createSourceFile(id,result,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);assert.equal(source.parseDiagnostics.length,0);
  assert.throws(()=>patchKanbanMotion('export const incompatible = true;',id,policyId),/contract changed/);
});
