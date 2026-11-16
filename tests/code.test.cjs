/* SPDX-License-Identifier: GPL-2.0-or-later */
const {test,before,after} = require('node:test');
const assert = require('node:assert/strict');
const {readFile} = require('node:fs/promises');
const path = require('node:path');
const {chromium} = require('playwright');

let browser;
before(async () => { browser = await chromium.launch({executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined}); });
after(async () => { await browser?.close(); });

async function fixture(t, {body, width=390, textScale=1, theme='dark', language='en', mobile=width<768}) {
  const context = await browser.newContext({viewport:{width,height:844},isMobile:mobile,hasTouch:mobile});
  t.after(() => context.close());
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(language => localStorage.setItem('zaryob-language', language), language);
  await page.route('http://console-code.test/**',async route=>{
    const pathname = new URL(route.request().url()).pathname;
    if(pathname === '/') {
      await route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html lang="en" data-theme="${theme}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/assets/console/theme.css"><style>html{font-size:${textScale*100}%}</style><script src="/assets/console/language.js"></script><script src="/assets/console/i18n.js"></script><script src="/assets/console/theme.js"></script></head><body class="console-site"><main style="padding:16px">${body}</main></body></html>`});
    } else if(pathname.startsWith('/assets/console/')) {
      const type = {'.css':'text/css','.js':'text/javascript','.woff2':'font/woff2','.svg':'image/svg+xml'}[path.extname(pathname)];
      await route.fulfill({contentType:type,body:await readFile(path.join(__dirname,'..',pathname.slice(1)))});
    } else throw new Error(`Unexpected code fixture request: ${pathname}`);
  });
  await page.goto('http://console-code.test/');
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(300);
  t.after(()=>assert.deepEqual(errors,[]));
  return page;
}

// Long enough to hide code in a 1440px window whatever the platform's glyph widths: a shorter
// line hid code on macOS but fitted on Linux once Copy had its own row.
const longLine = 'const result = compute_the_answer(first_argument, second_argument, third_argument, fourth_argument, fifth_argument, sixth_argument, seventh_argument, eighth_argument); // a trailing comment that runs on and on';
const blocks = `<pre id="long"><code>${longLine}\nshort();</code></pre><pre id="short"><code>ok();</code></pre>`;
const state = page => page.evaluate(() => [...document.querySelectorAll('.console-code')].map(block => {
  const pre = block.querySelector('pre'), toggle = block.querySelector('.console-code-toggle'), copy = block.querySelector('.console-copy');
  const end = getComputedStyle(block.querySelector('.console-code-fade--end')), start = getComputedStyle(block.querySelector('.console-code-fade--start'));
  const rect = el => el.getBoundingClientRect();
  // Any non-blank character of the first line under a button counts as covered.
  const covered = [toggle, copy].filter(el => el && !el.hidden).some(button => {
    const b = rect(button); const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT); let node;
    while ((node = walker.nextNode())) for (let i = 0; i < node.length; i++) { if (/\s/.test(node.data[i])) continue; const r = document.createRange(); r.setStart(node, i); r.setEnd(node, i + 1); const c = r.getBoundingClientRect(); const p = rect(pre);
      if (c.right <= p.right && c.left >= p.left && c.right > b.left && c.left < b.right && c.bottom > b.top && c.top < b.bottom) return true; }
    return false; });
  return {id: pre.id, overflow: pre.scrollWidth > pre.clientWidth, toggle: toggle && !toggle.hidden ? {text: toggle.textContent, label: toggle.getAttribute('aria-label'), pressed: toggle.getAttribute('aria-pressed'), height: rect(toggle).height, controls: toggle.getAttribute('aria-controls'), inside: rect(toggle).left >= rect(pre).left && rect(toggle).right <= rect(pre).right} : null,
    fadeEnd: +end.opacity, fadeStart: +start.opacity, fadeColor: end.backgroundImage, surface: getComputedStyle(pre).backgroundColor, covered, copy: Boolean(copy), whiteSpace: getComputedStyle(pre).whiteSpace};
}));

for (const [width, textScale] of [[390, 1], [320, 2], [1440, 1]]) {
  test(`only an overflowing block gets the edge fade and a wrap toggle at ${width}px, ${textScale*100}% text`, async t => {
    const page = await fixture(t, {body: blocks, width, textScale});
    let [long, short] = await state(page);
    assert.equal(long.overflow, true);
    assert.equal(long.fadeEnd, 1, 'right fade shows hidden code');
    assert.equal(long.fadeStart, 0, 'no left fade before scrolling');
    assert.deepEqual({text: long.toggle.text, label: long.toggle.label, pressed: long.toggle.pressed, controls: long.toggle.controls}, {text: '↔ wrap', label: 'Wrap long lines', pressed: 'false', controls: 'long'});
    if (width < 768) assert.ok(long.toggle.height >= 44, `toggle is ${long.toggle.height}px tall`);
    assert.equal(long.covered, false, 'buttons never cover code');
    assert.equal(long.toggle.inside, true, 'toggle stays inside the block');
    assert.ok(long.copy);
    assert.equal(short.toggle, null);
    assert.equal(short.fadeEnd, 0);
    await page.evaluate(() => { const pre = document.getElementById('long'); pre.scrollLeft = pre.scrollWidth; });
    await page.waitForTimeout(300);
    [long] = await state(page);
    assert.deepEqual([long.fadeStart, long.fadeEnd], [1, 0], 'scrolled to the end: left fade only');
    // Keyboard: Tab reaches the toggle, Space presses it.
    await page.locator('#long').evaluate(pre => pre.closest('.console-code').querySelector('.console-code-toggle').focus());
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    [long] = await state(page);
    assert.equal(long.whiteSpace, 'pre-wrap');
    assert.equal(long.overflow, false);
    assert.equal(long.toggle.pressed, 'true');
    assert.deepEqual([long.fadeStart, long.fadeEnd], [0, 0]);
    assert.equal(long.covered, false);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    [long] = await state(page);
    assert.equal(long.whiteSpace, 'pre');
    assert.equal(long.toggle.pressed, 'false');
  });
}

test('a line that fits once Copy moves to its own row keeps that row and never sits under Copy', async t => {
  // The line reaches into the end padding kept for Copy but fits once Copy has its own row
  // and that padding drops. Glyph widths differ between platforms, so size the line from the
  // measured character width rather than a fixed length.
  const probe = await fixture(t, {body: blocks, width: 1440});
  const {advance, box} = await probe.evaluate(() => {
    const text = document.querySelector('#short code').firstChild; const range = document.createRange();
    range.setStart(text, 0); range.setEnd(text, text.length);
    const pre = document.getElementById('long');
    return {advance: range.getBoundingClientRect().width / text.length, box: pre.clientWidth};
  });
  // Text starts after 18px of padding; Copy keeps 84px at the end without the row, 18px with it.
  const length = Math.floor((box - 18 - 51) / advance);
  const page = await fixture(t, {body: `<pre id="long"><code>${'x'.repeat(length)}</code></pre>`, width: 1440});
  const frames = await page.evaluate(async () => { const seen = [];
    for (let i = 0; i < 12; i++) { await new Promise(requestAnimationFrame); seen.push(document.querySelector('.console-code').classList.contains('console-code--actions-row')); }
    return seen; });
  assert.deepEqual(frames, frames.map(() => true), 'Copy keeps its own row without flipping back');
  const [long] = await state(page);
  assert.equal(long.covered, false, 'Copy never covers code');
  assert.equal(long.fadeEnd, 0, 'no fade: no code is hidden once the row is in place');
});

for (const [into, expected] of [[2, true], [-2, false]]) {
  test(`a line that ends ${Math.abs(into)}px ${into > 0 ? 'inside' : 'short of'} the padding kept for Copy ${expected ? 'gets' : 'does not need'} the action row`, async t => {
    // Size the block from the measured line so its end lands a set distance from the 84px end
    // padding: a few pixels into that padding already put a character under Copy.
    const text = 'x'.repeat(60);
    const probe = await fixture(t, {body: `<pre><code>${text}</code></pre>`, width: 1440});
    const width = await probe.evaluate(() => { const range = document.createRange(); range.selectNodeContents(document.querySelector('pre code')); return range.getBoundingClientRect().width; });
    // Border 1px each side, 18px start padding, 84px end padding.
    const box = 1 + 18 + width + 84 - into + 1;
    const page = await fixture(t, {body: `<div style="width:${box}px"><pre id="edge"><code>${text}</code></pre></div>`, width: 1440});
    const frames = await page.evaluate(async () => { const seen = [];
      for (let i = 0; i < 12; i++) { await new Promise(requestAnimationFrame); seen.push(document.querySelector('.console-code').classList.contains('console-code--actions-row')); }
      return seen; });
    assert.deepEqual(frames, frames.map(() => expected), 'the decision holds without flipping');
    const [edge] = await state(page);
    assert.equal(Boolean(edge.toggle), expected);
    assert.equal(edge.covered, false, 'Copy never covers code');
  });
}

test('Copy wider than the end padding beside the first line still keeps code out from under it', async t => {
  // A longer label (as after copying, or in another language) widens Copy past the 84px padding.
  const text = 'x'.repeat(60);
  const probe = await fixture(t, {body: `<pre><code>${text}</code></pre>`, width: 1440});
  const width = await probe.evaluate(() => { const range = document.createRange(); range.selectNodeContents(document.querySelector('pre code')); return range.getBoundingClientRect().width; });
  const page = await fixture(t, {body: `<style>.console-copy{min-width:140px}</style><div style="width:${1 + 18 + width + 100 + 1}px"><pre id="edge"><code>${text}</code></pre></div>`, width: 1440});
  const [edge] = await state(page);
  assert.ok(edge.toggle, 'the line runs under the wide Copy, so the block gets the row');
  assert.equal(edge.covered, false);
});

test('the toggle and fade follow language and theme, and resizing rechecks overflow', async t => {
  const page = await fixture(t, {body: blocks, language: 'tr', theme: 'light'});
  let [long] = await state(page);
  assert.equal(long.toggle.text, '↔ sar');
  assert.equal(long.toggle.label, 'Uzun satırları sar');
  const light = long.fadeColor;
  assert.match(light, /rgb\(238, 236, 229\)/, light);
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  [long] = await state(page);
  assert.match(long.fadeColor, /rgb\(32, 36, 43\)/, long.fadeColor);
  await page.setViewportSize({width: 1900, height: 844});
  await page.evaluate(() => { document.querySelector('main').style.maxWidth = 'none'; document.getElementById('long').querySelector('code').textContent = 'short_again();'; });
  await page.waitForTimeout(300);
  [long] = await state(page);
  assert.equal(long.toggle, null, 'no toggle once nothing overflows');
  assert.equal(long.fadeEnd, 0);
});

test('a site code bar that holds Copy also gets the toggle beside it', async t => {
  // Mirrors kilavuzlar: a site script moves Copy into its own bar on DOMContentLoaded.
  const bar = `<script>document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('.console-code').forEach(block => { const bar = document.createElement('div'); bar.className = 'site-bar'; bar.style.display = 'flex'; bar.append(document.createTextNode('cpp'), block.querySelector('.console-copy')); block.prepend(bar); }));</script>`;
  const page = await fixture(t, {body: `${bar}<pre id="long"><code>${longLine}</code></pre>`});
  const placed = await page.evaluate(() => { const toggle = document.querySelector('.console-code-toggle'); return {parent: toggle.parentElement.className, next: toggle.nextElementSibling?.className, hidden: toggle.hidden}; });
  assert.deepEqual(placed, {parent: 'site-bar', next: 'console-copy', hidden: false});
});

test('a block whose Copy floats over a site header puts the toggle in that header', async t => {
  // Mirrors execmap: the header precedes the block and Copy is lifted into it.
  const page = await fixture(t, {body: `<style>.console-site .console-copy{top:-40px}</style><div><div class="site-head" style="display:flex;min-height:44px;padding-right:100px"><span>file.c</span><a href="#d" style="margin-left:auto">Download ↓</a></div><pre id="long"><code>${longLine}</code></pre></div>`});
  const placed = await page.evaluate(() => { const toggle = document.querySelector('.console-code-toggle'); const download = document.querySelector('.site-head a').getBoundingClientRect(); const t = toggle.getBoundingClientRect(); const copy = document.querySelector('.console-copy').getBoundingClientRect();
    return {parent: toggle.parentElement.className, overlapsDownload: t.left < download.right && t.right > download.left, overlapsCopy: t.right > copy.left && t.left < copy.right && t.bottom > copy.top && t.top < copy.bottom}; });
  assert.deepEqual(placed, {parent: 'site-head', overlapsDownload: false, overlapsCopy: false});
});

const tallCode = Array.from({length: 120}, (_, i) => i === 3 ? longLine : `line_${i}();`).join('\n');
const header = '<header class="console-header"><div class="console-header__inner">header</div></header>';
const stickyState = (page, where) => page.evaluate(where => {
  const block = document.querySelector('[data-tall]'), span = block.closest('.site-block') || block;
  const r = span.getBoundingClientRect();
  const top = scrollY + r.top;
  scrollTo({top: where === 'middle' ? top + r.height / 2 - innerHeight / 2 : top + r.height - 120, behavior: 'instant'});
  return new Promise(resolve => setTimeout(() => {
    const copy = span.querySelector('.console-copy').getBoundingClientRect(), b = span.getBoundingClientRect(), h = document.querySelector('.console-header').getBoundingClientRect();
    const pre = block.querySelector('pre'); pre.scrollLeft = 300;
    const moved = Math.abs(span.querySelector('.console-copy').getBoundingClientRect().left - copy.left) > 0.5;
    resolve({under: Math.round(copy.top - h.bottom), inside: copy.top >= b.top && copy.bottom <= b.bottom + 0.5, visible: copy.bottom <= innerHeight, moved, floating: Boolean(span.querySelector('[data-console-floating]'))});
  }, 200));
}, where);

for (const width of [390, 1440]) {
  test(`Copy and the toggle stay under the sticky header through a tall block at ${width}px`, async t => {
    const page = await fixture(t, {width, body: `${header}<pre id="short"><code>ok();</code></pre><pre id="tall" data-tall><code>${tallCode}</code></pre><p style="height:1200px">after</p>`});
    await page.evaluate(() => document.getElementById('tall').closest('.console-code').setAttribute('data-tall', ''));
    const order = await page.evaluate(() => [...document.querySelector('[data-tall]').querySelectorAll('button')].map(b => b.className.split(' ')[0]));
    assert.deepEqual(order, ['console-code-toggle', 'console-copy'], 'Tab reaches the toggle, then Copy');
    const middle = await stickyState(page, 'middle');
    assert.ok(middle.under >= 0 && middle.under <= 12, `Copy sits ${middle.under}px under the header`);
    assert.deepEqual([middle.inside, middle.visible, middle.moved, middle.floating], [true, true, false, true]);
    const end = await stickyState(page, 'end');
    assert.equal(end.inside, true, 'Copy stops at the bottom edge of its block');
    const short = await page.evaluate(() => { const g = document.getElementById('short').closest('.console-code').querySelector('.console-code-actions'); return getComputedStyle(g).position; });
    assert.notEqual(short, 'sticky', 'a short block keeps its buttons in place');
  });
}

test('a site code bar or code header holding Copy sticks through a tall block', async t => {
  const bar = `<script>document.addEventListener('DOMContentLoaded', () => document.querySelectorAll('#barred').forEach(pre => { const block = pre.closest('.console-code'); const bar = document.createElement('div'); bar.className = 'site-bar'; bar.style.cssText = 'display:flex;background:var(--paper)'; bar.append(document.createTextNode('bash'), block.querySelector('.console-copy')); block.prepend(bar); block.setAttribute('data-tall', ''); }));</script>`;
  const page = await fixture(t, {width: 1440, body: `<style>.site-bar .console-copy{position:static;margin-inline-start:auto}</style>${header}${bar}<pre id="barred"><code>${tallCode}</code></pre><p style="height:1200px">after</p>`});
  const middle = await stickyState(page, 'middle');
  assert.ok(middle.under >= 0 && middle.under <= 12, `bar Copy sits ${middle.under}px under the header`);
  assert.deepEqual([middle.inside, middle.visible, middle.floating], [true, true, true]);
  assert.equal((await stickyState(page, 'end')).inside, true, 'the bar stops at the bottom edge of its block');

  const head = await fixture(t, {width: 1440, body: `<style>.console-site .console-copy{top:-40px}</style>${header}<div class="site-block"><div class="site-head" style="display:flex;min-height:44px;padding-right:100px;background:var(--surface)"><span>file.c</span></div><pre id="headed"><code>${tallCode}</code></pre><button type="button" style="height:40px">fold</button></div><p style="height:1200px">after</p>`});
  await head.evaluate(() => document.getElementById('headed').closest('.console-code').setAttribute('data-tall', ''));
  const headed = await stickyState(head, 'middle');
  const gap = await head.evaluate(() => { const h = document.querySelector('.site-head').getBoundingClientRect(), c = document.querySelector('.console-copy').getBoundingClientRect(); return {inHead: c.top >= h.top && c.bottom <= h.bottom + 0.5}; });
  assert.ok(headed.under >= 0 && headed.under <= 12, `header Copy sits ${headed.under}px under the page header`);
  assert.deepEqual([headed.inside, headed.visible, headed.floating, gap.inHead], [true, true, true, true]);
  assert.equal((await stickyState(head, 'end')).inside, true, 'Copy stays inside the block at its end');
});
