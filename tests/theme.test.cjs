/* SPDX-License-Identifier: GPL-2.0-or-later */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

let browser;
before(async () => {
  browser = await chromium.launch({
    headless: true,
    ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}),
  });
});
after(async () => { await browser?.close(); });

for (const pagefind of [true, false]) {
  for (const language of ['fallback', 'en', 'tr']) {
    test(`${language} controls preserve English Execmap results, Pagefind ${pagefind ? 'available' : 'unavailable'}`, async () => {
      const context = await browser.newContext({ locale: 'tr-TR', viewport: { width: 390, height: 844 } });
      try {
        const page = await context.newPage();
        const errors = [];
        const requests = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(() => localStorage.setItem('zaryob-language', 'tr'));
        await page.route('http://console-contract.test/**', async route => {
          const pathname = new URL(route.request().url()).pathname;
          requests.push(pathname);
          if (pathname === '/') {
            const adapters = language === 'fallback' ? ''
              : '<script src="/assets/console/language.js"></script><script src="/assets/console/i18n.js"></script>';
            await route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<!doctype html><html lang="en"><head><meta charset="utf-8">
              ${adapters}<script src="/assets/console/theme.js" defer></script></head><body>
              <header class="console-header"><button data-console-menu aria-expanded="false">Menu</button><nav id="console-navigation"></nav>
              <button data-console-search data-suite-root="/">Search</button></header></body></html>` });
          } else if (pathname.startsWith('/assets/console/')) {
            await route.fulfill({ contentType: 'text/javascript', body: await readFile(path.join(__dirname, '..', pathname.slice(1))) });
          } else if (pathname === '/pagefind/pagefind.js') {
            await route.fulfill(pagefind ? { contentType: 'text/javascript', body: `export function createInstance() {
              return { mergeIndex: async () => {}, search: async () => ({ results: [] }) };
            }` } : { status: 404, body: 'Unavailable for fallback regression' });
          } else if (pathname.endsWith('/search.json')) {
            await route.fulfill({ json: pathname === '/execmap/search.json'
              ? [{ title: 'English ELF proof', description: 'elfproof', text: 'elfproof', url: 'rehberler/proof.html', type: 'execmap/', lang: 'en' }]
              : pathname === '/wire/search.json' ? [null, { title: 'Türkçe TCP kanıtı', description: 'wireproof', url: 'tcp/', lang: 'tr' }] : [] });
          } else {
            throw new Error(`Unexpected contract fixture request: ${pathname}`);
          }
        });
        const preference = language === 'fallback' ? 'tr' : language;
        await page.goto(`http://console-contract.test/?lang=${preference}`);
        const menu = page.locator('[data-console-menu]');
        await menu.click();
        assert.equal(await menu.getAttribute('aria-label'), language === 'tr' ? 'Menüyü kapat' : 'Close menu');
        await page.locator('[data-console-search]').click();
        const dialog = page.locator('dialog');
        assert.equal(await dialog.locator('h2').textContent(), language === 'tr' ? 'Zaryob / Ara' : 'Zaryob / Search');
        assert.equal(await dialog.locator('[data-search-close]').getAttribute('aria-label'), language === 'tr' ? 'Aramayı kapat' : 'Close search');
        await dialog.locator('input').fill('elfproof');
        const result = dialog.locator('a', { hasText: 'English ELF proof' });
        await result.waitFor();
        assert.equal(await result.getAttribute('lang'), 'en');
        const address = new URL(await result.getAttribute('href'));
        assert.equal(address.pathname, '/execmap/rehberler/proof.html');
        assert.equal(address.searchParams.has('lang'), false);
        assert.equal(address.searchParams.get('highlight'), 'elfproof');
        assert.doesNotMatch(await dialog.textContent(), /\{(?:count|query)\}/);
        if (pagefind && language !== 'tr') assert.equal(await dialog.locator('[role="status"]').textContent(), '1 content results');
        assert.ok(requests.includes('/pagefind/pagefind.js'));
        assert.equal(requests.includes('/search.json'), !pagefind);
        await dialog.locator('input').fill('wireproof');
        const wire = dialog.locator('a', { hasText: 'Türkçe TCP kanıtı' });
        await wire.waitFor();
        assert.equal(await wire.getAttribute('lang'), 'tr');
        const wireAddress = new URL(await wire.getAttribute('href'));
        assert.equal(wireAddress.pathname, '/wire/tcp/');
        assert.equal(wireAddress.searchParams.get('highlight'), 'wireproof');
        assert.ok(requests.includes('/wire/search.json'));
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });
  }
}

// A Turkish page with an English edition, a page without one, and the search fixtures.
const scripts = '<script src="/assets/console/language.js"></script><script src="/assets/console/i18n.js"></script><script src="/assets/console/theme.js" defer></script>';
const header = `<header class="console-header"><details data-console-projects><summary>~</summary><nav><a href="/syscall/">syscall</a></nav></details>
  <button data-console-menu aria-expanded="false">Menu</button><nav id="console-navigation"></nav>
  <button data-console-search data-suite-root="/">Search</button>
  <select data-console-language><option value="tr">TR</option><option value="en">EN</option></select></header>`;
const pages = {
  '/': `<!doctype html><html lang="tr"><head><meta charset="utf-8"><link rel="alternate" hreflang="tr" href="/"><link rel="alternate" hreflang="en" href="/en/"><link rel="alternate" hreflang="x-default" href="/">${scripts}</head><body>${header}
    <aside data-content-language="tr"><span data-translation-missing hidden>missing</span><a href="/en/?lang=en" data-translation-lang="en">English</a></aside>
    <main><article lang="tr"><p>Türkçe gövde</p></article></main></body></html>`,
  '/en/': `<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="alternate" hreflang="tr" href="/"><link rel="alternate" hreflang="en" href="/en/">${scripts}</head><body>${header}
    <main><article lang="en"><p>English body</p></article></main></body></html>`,
  '/solo/': `<!doctype html><html lang="tr"><head><meta charset="utf-8">${scripts}</head><body>${header}
    <aside data-content-language="tr"><span data-translation-missing hidden>missing</span></aside>
    <main><article><p>needle in prose</p><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 20"><text x="0" y="15">needle pin</text></svg>
    <pre><code>needle()</code></pre></article></main></body></html>`,
  '/execmap/rehberler/proof.html': '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>proof</title></head><body>proof</body></html>',
};
async function open(t, { locale = 'en-US', stored, pagefind = true, records = [] } = {}) {
  const context = await browser.newContext({ locale, viewport: { width: 1280, height: 800 } });
  t.after(() => context.close());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  if (stored) await page.addInitScript(value => localStorage.setItem('zaryob-language', value), stored);
  await page.route('http://console-contract.test/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pages[pathname]) {
      await route.fulfill({ contentType: 'text/html; charset=utf-8', body: pages[pathname] });
    } else if (pathname.startsWith('/assets/console/')) {
      await route.fulfill({ contentType: 'text/javascript', body: await readFile(path.join(__dirname, '..', pathname.slice(1))) });
    } else if (pathname === '/pagefind/pagefind.js') {
      await route.fulfill(pagefind ? { contentType: 'text/javascript', body: `export function createInstance() {
        (window.indexLanguages ||= []).push(document.documentElement.lang);
        return { mergeIndex: async (url, options) => { window.mergedLanguage = options.language; }, search: async () => ({ results: [] }) };
      }` } : { status: 404, body: 'Unavailable' });
    } else if (pathname === '/execmap/search.json') {
      await route.fulfill({ json: [{ title: 'English ELF proof', description: 'elfproof', text: 'elfproof', url: 'rehberler/proof.html', lang: 'en' }] });
    } else if (pathname === '/search.json') {
      await route.fulfill({ json: records });
    } else if (pathname.endsWith('/search.json')) {
      await route.fulfill({ json: [] });
    } else {
      throw new Error(`Unexpected contract fixture request: ${pathname}`);
    }
  });
  const state = () => page.evaluate(() => ({
    path: location.pathname, query: location.search, lang: document.documentElement.lang, ui: document.documentElement.dataset.uiLanguage,
    explicit: window.ZaryobLanguage.explicit, project: document.querySelector('[data-console-projects] a').getAttribute('href'),
  }));
  return { page, errors, state };
}
const settle = page => page.waitForTimeout(250);

test('a browser-language guess translates controls but never leaves the page', async t => {
  const { page, errors, state } = await open(t);
  await page.goto('http://console-contract.test/');
  await settle(page);
  const guessed = await state();
  assert.deepEqual([guessed.path, guessed.query, guessed.ui, guessed.explicit], ['/', '', 'en', false]);
  assert.doesNotMatch(guessed.project, /lang=/, 'a guess is not handed to the next project as a preference');
  // The content-language note still offers the other edition.
  assert.equal(await page.locator('[data-content-language]').isHidden(), false);
  assert.equal(await page.locator('[data-translation-missing]').isHidden(), true);
  assert.equal(await page.evaluate(() => localStorage.getItem('zaryob-language')), null);
  // The reader's own selection is explicit and does navigate.
  await page.locator('[data-console-language]').selectOption('en');
  await page.waitForURL('**/en/?lang=en');
  assert.equal((await state()).explicit, true);
  assert.deepEqual(errors, []);
});

test('a saved choice or an explicit ?lang= still follows the other edition', async t => {
  for (const [options, address] of [[{ stored: 'en' }, '/'], [{}, '/?lang=en'], [{ locale: 'tr-TR', stored: 'en' }, '/']]) {
    const { page, errors, state } = await open(t, options);
    await page.goto(`http://console-contract.test${address}`);
    await page.waitForURL('**/en/?lang=en');
    const current = await state();
    assert.equal(current.explicit, true);
    assert.match(current.project, /\?lang=en$/);
    assert.deepEqual(errors, []);
  }
  // A Turkish browser on the English edition is not sent back either.
  const { page, state } = await open(t, { locale: 'tr-TR' });
  await page.goto('http://console-contract.test/en/');
  await settle(page);
  assert.deepEqual([(await state()).path, (await state()).ui], ['/en/', 'tr']);
});

test('the interface language never rewrites <html lang>; search still follows the interface language', async t => {
  const { page, errors, state } = await open(t);
  await page.goto('http://console-contract.test/solo/?lang=en');
  await settle(page);
  assert.deepEqual([(await state()).lang, (await state()).ui], ['tr', 'en']);
  await page.locator('[data-console-search]').click();
  const dialog = page.locator('dialog');
  await dialog.locator('input').fill('elfproof');
  const result = dialog.locator('a', { hasText: 'English ELF proof' });
  await result.waitFor();
  assert.equal(new URL(await result.getAttribute('href')).searchParams.has('lang'), false);
  assert.equal(await dialog.getAttribute('lang'), 'en');
  assert.deepEqual(await page.evaluate(() => [window.indexLanguages, window.mergedLanguage]), [['en'], 'en']);
  assert.equal((await state()).lang, 'tr');
  await page.keyboard.press('Escape');
  await page.locator('[data-console-language]').selectOption('tr');
  assert.deepEqual([(await state()).lang, (await state()).ui], ['tr', 'tr']);
  assert.deepEqual(errors, []);
});

test('search links carry no language when the preference is only a guess', async t => {
  const { page, errors } = await open(t);
  await page.goto('http://console-contract.test/solo/');
  await page.locator('[data-console-search]').click();
  const dialog = page.locator('dialog');
  await dialog.locator('input').fill('elfproof');
  const result = dialog.locator('a', { hasText: 'English ELF proof' });
  await result.waitFor();
  for (const href of await dialog.locator('a').evaluateAll(links => links.map(link => link.href))) {
    assert.equal(new URL(href).searchParams.has('lang'), false, href);
  }
  assert.deepEqual(errors, []);
});

test('?highlight= marks prose and leaves SVG text untouched', async t => {
  const { page, errors } = await open(t);
  await page.goto('http://console-contract.test/solo/?highlight=needle');
  await page.locator('mark.console-highlight').first().waitFor();
  assert.deepEqual(await page.evaluate(() => ({
    prose: document.querySelectorAll('p mark.console-highlight').length,
    code: document.querySelectorAll('pre mark.console-highlight').length,
    inSvg: document.querySelectorAll('svg mark').length,
    svgText: document.querySelector('svg text').innerHTML,
  })), { prose: 1, code: 1, inSvg: 0, svgText: 'needle pin' });
  assert.deepEqual(errors, []);
});

test('malformed index records are skipped and a failing render reports an error', async t => {
  const records = [
    null, 'text', { title: 7, url: '/numeric/', text: 'typeless' }, { title: 'Bad address typeless', url: 'http://[', type: 'yazılar/' },
    { title: 'Typeless record', url: '/typeless/', text: 'typeless' }, { title: 'Typed typeless record', url: '/typed/', type: 'yazılar/' },
  ];
  const { page, errors } = await open(t, { pagefind: false, records });
  await page.goto('http://console-contract.test/solo/');
  await page.locator('[data-console-search]').click();
  const dialog = page.locator('dialog');
  const status = dialog.locator('[role="status"]');
  await dialog.locator('input').fill('typeless');
  await dialog.locator('a', { hasText: 'Typed typeless record' }).waitFor();
  assert.equal(await dialog.locator('a', { hasText: 'Typeless record' }).first().locator('small').first().textContent(), 'Page');
  assert.equal(await dialog.locator('a', { hasText: 'Bad address' }).count(), 0);
  assert.equal(await dialog.locator('li').count(), 4);
  assert.equal(await status.textContent(), 'Full-text search unavailable. Showing title and topic matches.');
  // Any unexpected failure must end in an error status, never a permanent "Searching…".
  await page.evaluate(() => { String.prototype.toLocaleLowerCase = () => { throw new Error('render failure'); }; });
  await dialog.locator('input').fill('typeless again');
  await page.waitForFunction(() => document.querySelector('dialog [role="status"]').textContent === 'Search failed. Try again.');
  assert.deepEqual(errors, []);
});

test('Enter before results settle opens the first real result, not a placeholder link', async t => {
  const { page, errors } = await open(t);
  await page.goto('http://console-contract.test/solo/');
  await page.locator('[data-console-search]').click();
  const input = page.locator('dialog input');
  await input.fill('elfproof');
  await input.press('Enter');
  await page.waitForURL('**/execmap/rehberler/proof.html?highlight=elfproof');
  assert.deepEqual(errors, []);
});

test('focused results show an outline, copy feedback is announced and reduced motion is honoured', async t => {
  const { page, errors } = await open(t);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    const scroll = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (options) { window.scrollBehavior = options?.behavior; return scroll.call(this, options); };
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => {} } });
  });
  await page.goto('http://console-contract.test/solo/?highlight=needle');
  await page.addStyleTag({ content: await readFile(path.join(__dirname, '../assets/console/theme.css'), 'utf8') });
  await page.waitForFunction(() => window.scrollBehavior);
  assert.equal(await page.evaluate(() => window.scrollBehavior), 'auto');
  await page.locator('.console-copy').click();
  const live = page.locator('body > [role="status"][aria-live="polite"]');
  await page.waitForFunction(() => document.querySelector('body > [role="status"]')?.textContent === 'Copied');
  assert.equal(await live.getAttribute('class'), 'console-sr-only');
  await page.locator('[data-console-search]').click();
  await page.locator('dialog input').fill('elfproof');
  await page.locator('dialog a', { hasText: 'English ELF proof' }).waitFor();
  await page.keyboard.press('ArrowDown');
  const outline = await page.evaluate(() => { const style = getComputedStyle(document.activeElement); return [document.activeElement.tagName, style.outlineStyle, style.outlineWidth]; });
  assert.deepEqual(outline, ['A', 'solid', '2px']);
  assert.deepEqual(errors, []);
});
