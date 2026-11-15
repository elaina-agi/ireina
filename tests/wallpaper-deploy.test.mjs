import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const configSource = fs.readFileSync(new URL('../src/wallpaper/config.js', import.meta.url), 'utf8');
const preferenceSource = fs.readFileSync(new URL('../src/wallpaper/source-preference.ts', import.meta.url), 'utf8');
function load(env = {}, stored = null) {
  const source = configSource.replaceAll('import.meta.env.', 'env.').replace('export const wallpaperConfig', 'const wallpaperConfig');
  const config = vm.runInNewContext(source + '\nwallpaperConfig;', { env });
  const compiled = ts.transpileModule(preferenceSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const storage = new Map(stored === null ? [] : [['ireina-wallpaper-source', stored]]);
  const context = { exports: {}, require: name => { assert.equal(name, './config.js'); return { wallpaperConfig: config }; }, localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }, document: { documentElement: { dataset: {} } }, window: new EventTarget(), CustomEvent };
  vm.runInNewContext(compiled, context);
  return { config, api: context.exports, storage };
}

test('no deployment settings keeps existing public default and hides Worker', () => {
  const { config, api } = load();
  assert.equal(config.source, 'alcy');
  assert.equal(api.getDefaultWallpaperSource(), 'alcy');
  assert.equal(api.getWallpaperSourceOptions().some(source => source.id === 'r2'), false);
  assert.deepEqual(Array.from(config.fallback), ['alcy', 'loli', 'paugram']);
});

test('deployment settings configure Worker name, address and default without editing source', () => {
  const { config, api } = load({ PUBLIC_WALLPAPER_API: 'https://wallpaper.example.invalid', PUBLIC_WALLPAPER_NAME: '测试收藏', PUBLIC_WALLPAPER_SOURCE: 'r2' });
  const option = api.getWallpaperSourceOptions().find(source => source.id === 'r2');
  assert.equal(option.name, '测试收藏');
  assert.deepEqual(Array.from(option.supports), ['image', 'video']);
  assert.equal(config.sources[0].api, 'https://wallpaper.example.invalid');
  assert.equal(api.getDefaultWallpaperSource(), 'r2');
});

test('name and r2 default alone cannot activate an unconfigured Worker', () => {
  const { api } = load({ PUBLIC_WALLPAPER_NAME: '尚未配置', PUBLIC_WALLPAPER_SOURCE: 'r2' });
  assert.equal(api.getWallpaperSourceOptions().some(source => source.id === 'r2'), false);
  assert.equal(api.getDefaultWallpaperSource(), 'alcy');
});

test('blank names and defaults retain backward-compatible fallbacks', () => {
  const { config, api } = load({ PUBLIC_WALLPAPER_API: 'https://wallpaper.example.invalid', PUBLIC_WALLPAPER_NAME: '   ', PUBLIC_WALLPAPER_SOURCE: '  ' });
  assert.equal(config.sources[0].name, '我的 R2 壁纸');
  assert.equal(api.getDefaultWallpaperSource(), 'alcy');
});

test('deployment labels and default source are trimmed', () => {
  const { config, api } = load({ PUBLIC_WALLPAPER_API: 'https://wallpaper.example.invalid', PUBLIC_WALLPAPER_NAME: '  测试收藏  ', PUBLIC_WALLPAPER_SOURCE: '  r2  ' });
  assert.equal(config.sources[0].name, '测试收藏');
  assert.equal(api.getDefaultWallpaperSource(), 'r2');
});

test('invalid default or unavailable Worker safely falls back', () => {
  assert.equal(load({ PUBLIC_WALLPAPER_SOURCE: 'not-a-source' }).api.getDefaultWallpaperSource(), 'alcy');
  assert.equal(load({ PUBLIC_WALLPAPER_API: '  ', PUBLIC_WALLPAPER_SOURCE: 'r2' }).api.getDefaultWallpaperSource(), 'alcy');
});

test('explicit random or another public default remains supported', () => {
  assert.equal(load({ PUBLIC_WALLPAPER_SOURCE: 'random' }).api.getDefaultWallpaperSource(), 'random');
  assert.equal(load({ PUBLIC_WALLPAPER_SOURCE: 'loli' }).api.getDefaultWallpaperSource(), 'loli');
});

test('visitor choice wins over deployment default and survives renaming', () => {
  const first = load({ PUBLIC_WALLPAPER_API: 'https://wallpaper.example.invalid', PUBLIC_WALLPAPER_NAME: '旧名称', PUBLIC_WALLPAPER_SOURCE: 'r2' }, 'loli');
  assert.equal(first.api.getStoredWallpaperSource(), 'loli');
  const renamed = load({ PUBLIC_WALLPAPER_API: 'https://wallpaper.example.invalid', PUBLIC_WALLPAPER_NAME: '新名称', PUBLIC_WALLPAPER_SOURCE: 'alcy' }, 'r2');
  assert.equal(renamed.api.getStoredWallpaperSource(), 'r2');
});
