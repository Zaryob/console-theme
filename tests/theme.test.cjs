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
              : [] });
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
        assert.equal(address.searchParams.get('lang'), language === 'tr' ? 'tr' : 'en');
        assert.equal(address.searchParams.get('highlight'), 'elfproof');
        assert.doesNotMatch(await dialog.textContent(), /\{(?:count|query)\}/);
        if (pagefind && language !== 'tr') assert.equal(await dialog.locator('[role="status"]').textContent(), '1 content results');
        assert.ok(requests.includes('/pagefind/pagefind.js'));
        assert.equal(requests.includes('/search.json'), !pagefind);
        assert.deepEqual(errors, []);
      } finally {
        await context.close();
      }
    });
  }
}
