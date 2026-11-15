/* SPDX-License-Identifier: GPL-2.0-or-later */
const {test,before,after} = require('node:test');
const assert = require('node:assert/strict');
const {readFile} = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');

let browser;
before(async () => { browser = await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined}); });
after(async () => { await browser?.close(); });

async function fixture(t, {body, theme, colorScheme='light', width=1280, textScale=1, script=false}) {
  const context = await browser.newContext({viewport:{width,height:844},colorScheme});
  t.after(() => context.close());
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('http://console-layout.test/**',async route=>{
    const pathname = new URL(route.request().url()).pathname;
    if(pathname === '/') {
      await route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html lang="en" class="console-js"${theme?` data-theme="${theme}"`:''}><head><meta charset="utf-8"><link rel="stylesheet" href="/assets/console/theme.css"><style>html{font-size:${textScale*100}%}</style>${script?'<script src="/assets/console/theme.js" defer></script>':''}</head><body class="console-site">${body}</body></html>`});
    } else if(pathname.startsWith('/assets/console/')) {
      const type = {'.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.svg':'image/svg+xml'}[path.extname(pathname)];
      await route.fulfill({contentType:type,body:await readFile(path.join(__dirname,'..',pathname.slice(1)))});
    } else throw new Error(`Unexpected layout fixture request: ${pathname}`);
  });
  await page.goto('http://console-layout.test/');
  await page.evaluate(()=>document.fonts.ready);
  t.after(()=>assert.deepEqual(errors,[]));
  return page;
}

for(const mode of [{theme:'light'},{theme:'dark'},{colorScheme:'dark'}]) {
  test(`status text is readable on its actual surface: ${mode.theme || 'system dark'}`,async t=>{
    const page=await fixture(t,{...mode,body:['success','warning','danger','info'].map(tone=>`<span class="console-badge console-badge--${tone}">${tone}</span>`).join('')});
    const samples=await page.locator('.console-badge').evaluateAll(elements=>elements.map(e=>{
      const s=getComputedStyle(e),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
      const rgb=color=>{ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3);};
      const lum=values=>values.map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
      const a=lum(rgb(s.color)),b=lum(rgb(s.backgroundColor));
      return {tone:e.textContent,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),alpha:s.backgroundColor};
    }));
    for(const sample of samples)assert.ok(sample.ratio>=4.5,`${sample.tone}: ${sample.ratio}`);
  });
}

test('prose roles leave surrounding controls and content headings at their own scale',async t=>{
  const page=await fixture(t,{body:'<h1 class="console-hero__title">Landing</h1><section class="console-prose"><h1>Article</h1><p>Readable explanation <strong>with emphasis</strong>.</p><code>command()</code></section><p id="plain">Interface text</p><p class="console-meta">Version</p><section class="console-prose console-prose--compact"><p>Short description</p></section>'});
  const styles=await page.evaluate(()=>Object.fromEntries(['.console-hero__title','.console-prose h1','.console-prose p','.console-prose code','#plain','.console-meta','.console-prose--compact p'].map(selector=>{const s=getComputedStyle(document.querySelector(selector));return [selector,{font:s.fontFamily,size:parseFloat(s.fontSize)}];})));
  assert.equal(styles['.console-hero__title'].size,60);
  assert.equal(styles['.console-prose h1'].size,36);
  assert.equal(styles['.console-prose p'].size,18);
  assert.match(styles['.console-prose p'].font,/IBM Plex Sans/);
  for(const selector of ['.console-prose h1','.console-prose code','#plain','.console-meta'])assert.match(styles[selector].font,/IBM Plex Mono/);
  assert.equal(styles['#plain'].size,16);
  assert.equal(styles['.console-meta'].size,14);
  assert.equal(styles['.console-prose--compact p'].size,16);
});
