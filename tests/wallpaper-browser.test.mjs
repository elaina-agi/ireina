import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createServer as createHttpServer } from 'node:http';
import { chromium } from '@playwright/test';

const root=resolve(import.meta.dirname,'..');
const require=createRequire(import.meta.url);
const astroRequire=createRequire(require.resolve('astro/package.json'));
const { createServer }=await import(pathToFileURL(astroRequire.resolve('vite')).href);
const png=fs.readFileSync(resolve(root,'public/favicon/favicon-light-32.png'));
const worker='https://wallpaper.example.invalid';

async function withPage(env, failed, run) {
  const define=Object.fromEntries(['PUBLIC_WALLPAPER_API','PUBLIC_WALLPAPER_NAME','PUBLIC_WALLPAPER_SOURCE'].map(key=>[`import.meta.env.${key}`,JSON.stringify(env[key]??'')]));
  const vite=await createServer({configFile:false,envFile:false,root,define,logLevel:'error',server:{middlewareMode:true},appType:'custom'});
  const http=createHttpServer((request,response)=>{
    if(request.url==='/wallpaper-test') {
      response.setHeader('Content-Type','text/html');
      response.end('<!doctype html><html><head><style>body{margin:0}#banner-wrapper{height:100vh}.banner-stage__media{position:relative;height:100%}</style></head><body><section id="banner-wrapper"><div class="banner-stage__media"></div></section><main id="swup-container" data-current-page="home"></main><script type="module">import "/src/wallpaper/banner.js";import{getWallpaperSourceOptions}from"/src/wallpaper/source-preference.ts";window.testSourceOptions=getWallpaperSourceOptions();</script></body></html>');
    } else vite.middlewares(request,response,()=>{response.statusCode=404;response.end();});
  });
  await new Promise(resolve=>http.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const page=await context.newPage();
  const requests=[]; const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route(/^https:\/\/(wallpaper\.example\.invalid|t\.alcy\.cc|www\.loliapi\.com|api\.paugram\.com)\//,async route=>{
    const url=route.request().url();requests.push(url);
    if(url.startsWith(worker+'/api/random')) {
      await route.fulfill({status:failed?503:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(failed?{error:'test unavailable'}:{type:'image',url:'/file/images/test.png',key:'images/test.png'})});
    } else await route.fulfill({status:200,contentType:'image/png',headers:{'Access-Control-Allow-Origin':'*'},body:png});
  });
  try {
    await page.goto(`http://127.0.0.1:${http.address().port}/wallpaper-test`);
    await page.waitForFunction(()=>window.wallpaper?.getSnapshot().status==='ready');
    await run(page,requests);
    assert.deepEqual(errors,[]);
  } finally {
    await browser.close();await vite.close();await new Promise(resolve=>http.close(resolve));
  }
}

test('unconfigured deployment shows no custom source and sends no Worker request',async()=>{
  await withPage({},false,async(page,requests)=>{
    assert.equal(await page.evaluate(()=>window.testSourceOptions.some(source=>source.id==='r2')),false);
    assert.equal(await page.evaluate(()=>window.wallpaper.current.sourceId),'alcy');
    assert.equal(requests.some(url=>url.startsWith(worker)),false);
  });
});

test('configured deployment loads custom name and resolves relative Worker file URL',async()=>{
  await withPage({PUBLIC_WALLPAPER_API:worker,PUBLIC_WALLPAPER_NAME:'测试收藏',PUBLIC_WALLPAPER_SOURCE:'r2'},false,async(page,requests)=>{
    const snapshot=await page.evaluate(()=>window.wallpaper.getSnapshot());
    assert.equal(snapshot.defaultSource,'r2');assert.equal(snapshot.current.source,'测试收藏');
    assert.equal(snapshot.current.src,worker+'/file/images/test.png');
    assert.ok(requests.some(url=>url.startsWith(worker+'/api/random?type=')));
    assert.ok(requests.includes(worker+'/file/images/test.png'));
    assert.equal(requests.some(url=>url.startsWith('https://t.alcy.cc')),false);
    const media=await page.locator('.ireina-wall').evaluate(el=>({type:el.tagName,src:el.src,animation:getComputedStyle(el).animationName}));
    assert.equal(media.type,'IMG');assert.notEqual(media.animation,'none','system reduced motion must not disable blog animation');
  });
});

test('unavailable configured Worker uses the existing public-source fallback',async()=>{
  await withPage({PUBLIC_WALLPAPER_API:worker,PUBLIC_WALLPAPER_SOURCE:'r2'},true,async(page,requests)=>{
    const snapshot=await page.evaluate(()=>window.wallpaper.getSnapshot());
    assert.equal(snapshot.selectedSource,'r2');assert.equal(snapshot.current.sourceId,'alcy');
    assert.ok(requests.some(url=>url.startsWith(worker+'/api/random')));
    assert.ok(requests.some(url=>url.startsWith('https://t.alcy.cc/pc')));
  });
});

test('random wallpaper request starts only after the page has finished loading',async()=>{
  await withPage({},false,async page=>{
    const timing=await page.evaluate(()=>{
      const load=performance.getEntriesByType('navigation')[0].loadEventEnd;
      const request=performance.getEntriesByType('resource').find(entry=>entry.name.startsWith('https://t.alcy.cc/'));
      return {load,request:request?.startTime};
    });
    assert.ok(timing.load>0,'navigation load timing is available');
    assert.ok(typeof timing.request==='number','the random source request is recorded');
    assert.ok(timing.request>=timing.load,`request ${timing.request} must not start before load ${timing.load}`);
  });
});

test('same-tab reload reuses the Worker wallpaper; change draws a new one',async()=>{
  await withPage({PUBLIC_WALLPAPER_API:worker,PUBLIC_WALLPAPER_SOURCE:'r2'},false,async(page,requests)=>{
    const randomCalls=()=>requests.filter(url=>url.startsWith(worker+'/api/random')).length;
    const first=await page.evaluate(()=>window.wallpaper.current.src);
    assert.equal(randomCalls(),1);
    await page.reload();
    await page.waitForFunction(()=>window.wallpaper?.getSnapshot().status==='ready');
    assert.equal(await page.evaluate(()=>window.wallpaper.current.src),first);
    assert.equal(randomCalls(),1,'reload in the same tab must not ask the Worker again');
    await page.evaluate(()=>window.wallpaper.next());
    await page.waitForFunction(()=>window.wallpaper.getSnapshot().status==='ready');
    assert.equal(randomCalls(),2,'"change wallpaper" always draws a new one');
  });
});

test('direct random APIs are never reused on reload',async()=>{
  await withPage({},false,async(page,requests)=>{
    const directCalls=()=>requests.filter(url=>url.startsWith('https://t.alcy.cc/')).length;
    assert.equal(directCalls(),1);
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('ireina-wallpaper-session')),null);
    await page.reload();
    await page.waitForFunction(()=>window.wallpaper?.getSnapshot().status==='ready');
    assert.equal(directCalls(),2);
  });
});
