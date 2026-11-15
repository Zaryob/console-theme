/* SPDX-License-Identifier: GPL-2.0-or-later */
const {test,before,after} = require('node:test');
const assert = require('node:assert/strict');
const {readFile} = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');
const projects = require('../_data/console_projects.json');

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

function projectHeader(project) {
  return `<header class="console-header"><div class="console-header__inner"><div class="console-identity"><a class="console-brand" href="/">zaryob</a><span class="console-prompt-separator">:</span><details class="console-projects" data-console-projects><summary aria-label="Switch project"><span class="console-project-path">${project.prompt}</span><span class="console-prompt-dollar">$</span><span class="console-prompt-cursor" aria-hidden="true"></span><svg class="console-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></svg></summary><nav class="console-project-menu">${projects.map(p=>`<a href="${p.path}">${p.title}<small>${p.prompt}</small></a>`).join('')}</nav></details></div><div class="console-header-actions"><button class="console-search-compact" aria-label="Search">/</button><button class="console-menu" data-console-menu aria-label="Open menu" aria-expanded="false" aria-controls="console-navigation">≡</button></div><nav class="console-nav" id="console-navigation"><a href="/">Start</a><div class="console-tools"><select data-console-theme aria-label="Theme"><option value="system">System</option><option value="dark">Dark</option><option value="light">Light</option></select></div></nav></div></header>`;
}

for(const width of [320,390]) {
  for(const textScale of [1,2]) {
    test(`project identity leaves mobile controls usable at ${width}px and ${textScale*100}% text`,async t=>{
      for(const project of [...projects,{prompt:'~/a-project-with-a-much-longer-name'}]) {
        const page=await fixture(t,{body:projectHeader(project),width,textScale,script:true});
        const geometry=await page.evaluate(()=>{
          const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
          return {pageWidth:document.documentElement.scrollWidth,header:rect('.console-header'),summary:rect('.console-projects > summary'),actions:rect('.console-header-actions')};
        });
        assert.ok(geometry.pageWidth<=width,`${project.prompt}: page overflow`);
        assert.ok(geometry.summary.right<=geometry.actions.x,`${project.prompt}: controls overlap`);
        assert.ok(geometry.summary.width>=44,`${project.prompt}: project control is too narrow`);
        assert.ok(geometry.actions.right<=width,`${project.prompt}: actions are cut off`);
        if(textScale===1)assert.ok(geometry.header.height<=80,`${project.prompt}: header is ${geometry.header.height}px`);
        const summary=page.locator('[data-console-projects] summary');
        const context=await summary.getAttribute('aria-describedby');
        assert.equal(await page.locator(`#${context}`).textContent(),project.prompt);
        await summary.focus();
        await summary.press('Enter');
        await page.locator('.console-project-menu').waitFor({state:'visible'});
        const menu=await page.locator('.console-project-menu').boundingBox();
        assert.ok(menu.x>=0&&menu.x+menu.width<=width,`${project.prompt}: project menu is clipped`);
        await summary.press('Escape');
        assert.equal(await page.locator('[data-console-projects]').getAttribute('open'),null);
        assert.equal(await summary.evaluate(e=>e===document.activeElement),true);
        await page.close();
      }
    });
  }
}
