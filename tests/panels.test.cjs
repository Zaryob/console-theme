/* SPDX-License-Identifier: GPL-2.0-or-later */
const {test,before,after} = require('node:test');
const assert = require('node:assert/strict');
const {readFile} = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');

let browser;
before(async () => { browser = await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined}); });
after(async () => { await browser?.close(); });

async function fixture(t, {body, width=390, height=844, textScale=1, theme='dark', mobile=width<768, init}) {
  const context = await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile});
  t.after(() => context.close());
  const page = await context.newPage();
  if (init) await page.addInitScript(init);
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

// Safari on iPhone keeps the layout viewport when its keyboard opens; only visualViewport shrinks.
// Stand in for it so the keyboard can be opened and closed from the test.
const keyboardStub = () => {
  // Defined before theme.js runs, as Safari provides it.
  const target = new EventTarget();
  const state = {height: innerHeight, offsetTop: 0, scale: 1};
  for (const key of ['height', 'offsetTop', 'scale']) Object.defineProperty(target, key, {get: () => state[key]});
  Object.defineProperty(target, 'width', {get: () => innerWidth});
  Object.defineProperty(window, 'visualViewport', {value: target, configurable: true});
  window.setKeyboard = height => { state.height = innerHeight - height; target.dispatchEvent(new Event('resize')); return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); };
};
const searchPage = `${header.replace('<div class="console-header-actions">', '<div class="console-header-actions"><button class="console-search-compact" type="button" data-console-search-compact aria-label="Search">/</button>')}<main><div style="height:2000px"></div></main>`;

test('the search dialog and the phone menu end above an on-screen keyboard and are unchanged without one', async t => {
  const p = await fixture(t, {body: searchPage, init: keyboardStub});
  await p.evaluate(() => window.setKeyboard(0));
  const geometry = () => p.evaluate(() => {
    const box = selector => { const el = document.querySelector(selector); return el && el.getClientRects().length ? el.getBoundingClientRect().toJSON() : null; };
    return {inset: getComputedStyle(document.documentElement).getPropertyValue('--console-keyboard-inset').trim(), dialog: box('.console-search[open]'), input: box('.console-search[open] input'), first: box('.console-search[open] .console-search__results li'), nav: box('#console-navigation.is-open')};
  });
  assert.equal((await geometry()).inset, '0px');
  await tapOn(p, '[data-console-menu]');
  const menuWithout = (await geometry()).nav;
  await p.evaluate(() => window.setKeyboard(320));
  const menuWith = await geometry();
  assert.equal(menuWith.inset, '320px');
  assert.ok(menuWith.nav.bottom <= 844 - 320 + 0.5, `menu ends at ${menuWith.nav.bottom}, keyboard starts at ${844 - 320}`);
  assert.equal(menuWith.nav.top, menuWithout.top);
  await p.evaluate(() => window.setKeyboard(0));
  assert.deepEqual((await geometry()).nav, menuWithout, 'closing the keyboard restores the panel');
  await tapOn(p, '[data-console-menu]');

  await tapOn(p, '[data-console-search-compact]');
  const fill = () => p.evaluate(() => { const list = document.querySelector('.console-search__results'); list.innerHTML = Array.from({length: 30}, (_, i) => `<li><a href="#r${i}"><small>Post</small>Result ${i}</a></li>`).join(''); });
  await fill();
  const searchWithout = await geometry();
  await p.evaluate(() => window.setKeyboard(320));
  const searchWith = await geometry();
  const visible = 844 - 320;
  assert.ok(searchWith.dialog.bottom <= visible + 0.5, `dialog ends at ${searchWith.dialog.bottom}, keyboard starts at ${visible}`);
  assert.ok(searchWith.input.top >= searchWith.dialog.top && searchWith.input.bottom <= visible, 'the field stays in view');
  assert.ok(searchWith.first.bottom <= visible, 'the first result stays in view');
  assert.equal(searchWith.input.top, searchWithout.input.top, 'the field does not move');
  assert.equal(await p.evaluate(() => { const list = document.querySelector('.console-search__results'); return list.scrollHeight > list.clientHeight; }), true, 'the other results scroll inside the list');
  await p.evaluate(() => window.setKeyboard(0));
  assert.deepEqual(await geometry(), searchWithout, 'closing the keyboard restores the dialog');
});

test('a desktop window without a keyboard gets no inset', async t => {
  const p = await fixture(t, {body: searchPage, width: 1440, height: 900});
  assert.equal(await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--console-keyboard-inset').trim()), '0px');
  assert.equal(await p.evaluate(() => document.documentElement.hasAttribute('data-console-keyboard')), false);
});

// The shared header's search button, as the include renders it (Liquid tags and the icon dropped).
const includeSearchButton = require('node:fs').readFileSync(path.join(__dirname, '..', '_includes', 'console-header.html'), 'utf8')
  .match(/<button class="console-search-open"[\s\S]*?<\/button>/)[0].replace(/\{%[\s\S]*?%\}|\{\{[\s\S]*?\}\}/g, '');
const hintsPage = `${header.replace('<button type="button" id="last-tool">Last</button>', includeSearchButton)}<main><div style="height:400px"></div></main><footer class="suite-footer" id="site-footer"><span class="console-hints"><kbd>/</kbd> search <kbd>Tab</kbd> navigate</span></footer>`;

for (const touch of [true, false]) {
  test(`keyboard hints are ${touch ? 'dropped on a touch-only device' : 'kept with a fine pointer'}, and never join the search button's name`, async t => {
    const p = await fixture(t, {body: hintsPage, width: touch ? 390 : 1440, height: 844, mobile: touch});
    assert.equal(await p.evaluate(() => matchMedia('(hover: none) and (pointer: coarse)').matches), touch);
    if (touch) await tapOn(p, '[data-console-menu]');
    const shown = () => p.evaluate(() => [...document.querySelectorAll('kbd, .console-key-hint, .console-hints')].filter(e => e.getClientRects().length).map(e => e.textContent.trim()));
    const search = p.locator('.console-search-open');
    assert.ok(await search.isVisible());
    assert.equal(await search.getAttribute('aria-keyshortcuts'), '/ Control+K Meta+K');
    assert.equal(await search.evaluate(e => e.querySelector('kbd').getAttribute('aria-hidden')), 'true');
    // The include's own text (no vocabulary loaded here): the visual "/" stays out of the name.
    assert.equal(await search.ariaSnapshot(), '- button "Ara — Zaryob içerikleri"');
    assert.deepEqual(await shown(), touch ? [] : ['/', '/ search Tab navigate', '/', 'Tab']);
    await search.click();
    const close = p.locator('dialog[open] [data-search-close]');
    assert.equal(await close.getAttribute('aria-label'), 'Close search');
    assert.equal((await close.innerText()).trim(), touch ? 'Close' : 'Esc / Close');
    assert.deepEqual(await shown(), touch ? [] : ['/', '/ search Tab navigate', '/', 'Tab', 'Esc /']);
  });
}
