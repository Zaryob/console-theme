/* SPDX-License-Identifier: GPL-2.0-or-later */
const {test,before,after} = require('node:test');
const assert = require('node:assert/strict');
const {readFile} = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');

let browser;
before(async () => { browser = await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined}); });
after(async () => { await browser?.close(); });

async function fixture(t, {body, width=390, height=844, textScale=1, theme='dark', mobile=width<768}) {
  const context = await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile});
  t.after(() => context.close());
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('http://console-panels.test/**',async route=>{
    const pathname = new URL(route.request().url()).pathname;
    if(pathname === '/') {
      await route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html lang="en" data-theme="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/assets/console/theme.css"><style>html{font-size:${textScale*100}%;scroll-behavior:auto}</style><script src="/assets/console/theme.js" defer></script></head><body class="console-site">${body}</body></html>`});
    } else if(pathname.startsWith('/assets/console/')) {
      const type = {'.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.svg':'image/svg+xml'}[path.extname(pathname)];
      await route.fulfill({contentType:type,body:await readFile(path.join(__dirname,'..',pathname.slice(1)))});
    } else throw new Error(`Unexpected panel fixture request: ${pathname}`);
  });
  await page.goto('http://console-panels.test/');
  await page.evaluate(()=>document.fonts.ready);
  t.after(()=>assert.deepEqual(errors,[]));
  return page;
}

const links = count => Array.from({length:count},(_,i)=>`<a href="#l${i}">Link ${i}</a>`).join('');
const header = `<header class="console-header"><div class="console-header__inner"><div class="console-identity"><a class="console-brand" href="/">zaryob</a><span class="console-prompt-separator">:</span><details class="console-projects" data-console-projects><summary aria-label="Switch project" aria-controls="console-project-menu"><span class="console-project-path">~/site</span><span class="console-prompt-dollar">$</span></summary><nav class="console-project-menu" id="console-project-menu">${links(6)}</nav></details></div><div class="console-header-actions"><button class="console-menu" type="button" data-console-menu aria-label="Open menu" aria-expanded="false" aria-controls="console-navigation">≡</button></div><nav class="console-nav" id="console-navigation">${links(24)}<div class="console-tools"><button type="button" id="last-tool">Last</button></div></nav></div></header>`;
const page = `${header}<main><p id="before-main"><a href="#x" id="page-link">Page link</a></p><div style="height:4000px"></div></main>`;
const tapOn = async (page, selector) => { const box = await page.locator(selector).boundingBox(); await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await page.waitForTimeout(100); };
const swipe = async (page, x, y) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.synthesizeScrollGesture', {x, y, yDistance:-300, gestureSourceType:'touch', speed:1200});
  await page.mouse.move(x, y); await page.mouse.wheel(0, 400); await page.waitForTimeout(300);
};

for (const [width, height, textScale] of [[390, 844, 1], [320, 568, 2]]) {
  test(`the open phone menu fills the viewport and the page does not scroll behind it at ${width}px, ${textScale*100}% text`, async t => {
    const p = await fixture(t, {body:page, width, height, textScale});
    await p.evaluate(() => scrollTo(0, 600));
    const widthBefore = await p.evaluate(() => document.querySelector('main').getBoundingClientRect().width);
    await tapOn(p, '[data-console-menu]');
    const open = await p.evaluate(() => {
      const nav = document.getElementById('console-navigation').getBoundingClientRect();
      const header = document.querySelector('.console-header').getBoundingClientRect();
      const style = getComputedStyle(document.getElementById('console-navigation'));
      return {locked: getComputedStyle(document.documentElement).overflowY, top: nav.top, bottom: nav.bottom, left: nav.left, right: nav.right, headerBottom: header.bottom,
        position: style.position, overscroll: style.overscrollBehaviorY, scrolls: document.getElementById('console-navigation').scrollHeight > document.getElementById('console-navigation').clientHeight,
        mainWidth: document.querySelector('main').getBoundingClientRect().width};
    });
    assert.equal(open.locked, 'hidden');
    assert.equal(open.position, 'fixed');
    assert.equal(open.overscroll, 'contain');
    assert.ok(Math.abs(open.top - open.headerBottom) <= 1, `panel starts at ${open.top}, header ends at ${open.headerBottom}`);
    assert.ok(Math.abs(open.bottom - height) <= 1 && open.left === 0 && Math.abs(open.right - width) <= 1, JSON.stringify(open));
    assert.ok(open.scrolls, 'a long menu scrolls inside the panel');
    assert.equal(open.mainWidth, widthBefore, 'no layout jump');
    await swipe(p, width / 2, height - 40);
    assert.equal(await p.evaluate(() => scrollY), 600, 'page stayed put behind the open menu');
    assert.ok(await p.evaluate(() => document.getElementById('console-navigation').scrollTop) > 0, 'the panel itself scrolled');
    // Every link stays reachable inside the panel.
    await p.locator('#last-tool').scrollIntoViewIfNeeded();
    assert.ok(await p.locator('#last-tool').isVisible());
    await p.keyboard.press('Escape');
    const closed = await p.evaluate(() => ({y: scrollY, locked: document.documentElement.classList.contains('console-scroll-locked'), expanded: document.querySelector('[data-console-menu]').getAttribute('aria-expanded'), focus: document.activeElement?.matches('[data-console-menu]')}));
    assert.deepEqual(closed, {y: 600, locked: false, expanded: 'false', focus: true});
    // The menu button closes it too, and a tap on the panel's empty ground counts as outside.
    await tapOn(p, '[data-console-menu]');
    await tapOn(p, '[data-console-menu]');
    assert.equal(await p.locator('[data-console-menu]').getAttribute('aria-expanded'), 'false');
    assert.equal(await p.evaluate(() => getComputedStyle(document.documentElement).overflowY), 'visible');
    await tapOn(p, '[data-console-menu]');
    await p.evaluate(() => { const nav = document.getElementById('console-navigation'); nav.scrollTop = nav.scrollHeight; });
    const ground = await p.evaluate(() => { const r = document.getElementById('console-navigation').getBoundingClientRect(); return {x: r.right - 4, y: r.bottom - 4}; });
    await p.mouse.click(ground.x, ground.y); await p.waitForTimeout(100);
    assert.equal(await p.locator('[data-console-menu]').getAttribute('aria-expanded'), 'false');
    assert.equal(await p.evaluate(() => scrollY), 600);
  });

  test(`the project list is an on-screen panel that locks the page at ${width}px, ${textScale*100}% text`, async t => {
    const p = await fixture(t, {body:page, width, height, textScale});
    await p.evaluate(() => scrollTo(0, 600));
    await tapOn(p, '[data-console-menu]');
    await tapOn(p, '[data-console-projects] > summary');
    const box = await p.evaluate(() => { const r = document.querySelector('.console-project-menu').getBoundingClientRect(); return {left: r.left, right: r.right, bottom: r.bottom, locked: getComputedStyle(document.documentElement).overflowY, menu: document.querySelector('[data-console-menu]').getAttribute('aria-expanded')}; });
    assert.ok(box.left >= 0 && box.right <= width && box.bottom <= height + 1, JSON.stringify(box));
    assert.equal(box.locked, 'hidden');
    assert.equal(box.menu, 'false', 'opening the project list closes the menu panel');
    await swipe(p, width / 2, height - 40);
    assert.equal(await p.evaluate(() => scrollY), 600);
    await p.keyboard.press('Escape');
    assert.deepEqual(await p.evaluate(() => ({open: document.querySelector('[data-console-projects]').open, focus: document.activeElement?.matches('[data-console-projects] > summary'), y: scrollY, locked: document.documentElement.classList.contains('console-scroll-locked')})), {open: false, focus: true, y: 600, locked: false});
  });
}

test('tabbing out of the open phone menu closes it instead of reaching hidden page controls', async t => {
  const p = await fixture(t, {body:page});
  await tapOn(p, '[data-console-menu]');
  await p.locator('#last-tool').focus();
  await p.keyboard.press('Tab');
  assert.equal(await p.locator('[data-console-menu]').getAttribute('aria-expanded'), 'false');
  assert.equal(await p.evaluate(() => document.documentElement.classList.contains('console-scroll-locked')), false);
});

test('desktop keeps the dropdown project list and never locks the page', async t => {
  const p = await fixture(t, {body:page, width:1440, height:900});
  await p.evaluate(() => scrollTo(0, 600));
  await tapOn(p, '[data-console-projects] > summary');
  const state = await p.evaluate(() => ({position: getComputedStyle(document.querySelector('.console-project-menu')).position, locked: getComputedStyle(document.documentElement).overflowY, width: document.querySelector('.console-project-menu').getBoundingClientRect().width}));
  assert.deepEqual(state, {position: 'absolute', locked: 'visible', width: 300});
  const start = await p.evaluate(() => scrollY);
  await p.mouse.move(700, 800); await p.mouse.wheel(0, 300); await p.waitForTimeout(300);
  assert.ok(await p.evaluate(() => scrollY) > start, 'desktop page still scrolls');
});
