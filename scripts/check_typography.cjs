/* SPDX-License-Identifier: GPL-2.0-or-later */
/* Run against the five built sites served by scripts/preview_suite.py. */
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const origin = process.env.ZARYOB_PREVIEW_URL || 'http://127.0.0.1:4180';
const cases = [
  ['home', '/'],
  ['projects', '/projeler/'],
  ['about', '/hakkinda/'],
  ['bookshelf', '/kitapligim/'],
  ['post archive', '/posts/'],
  ['guides', '/kilavuzlar/'],
  ['guide article', '/kilavuzlar/cpp/tasinabilir-cmake-projesi/'],
  ['syscall library', '/syscall/'],
  ['syscall summary', '/syscall/?arch=x64'],
  ['syscall arguments', '/syscall/?arch=x64&view=args'],
  ['board library', '/pin-atlas/'],
  ['board workspace', '/pin-atlas/#board=pico-family&profile=pico&pin=1'],
  ['execmap', '/execmap/'],
  ['execmap article', '/execmap/rehberler/elf-dosyadan-bellege.html'],
];

async function checkPage(context, name, path, width, scale) {
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const label = `${name}, ${width}px, ${scale * 100}% text`;
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith(origin) && response.status() >= 400) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  try {
    await page.setViewportSize({ width, height: 960 });
    const url = new URL(path, origin);
    url.searchParams.set('lang', 'tr');
    await page.goto(url.href, { waitUntil: 'networkidle' });
    await page.locator('h1:visible').first().waitFor({ state: 'visible' });
    if (scale !== 1) await page.addStyleTag({ content: `html { font-size: ${scale * 100}% !important; }` });
    await page.evaluate(async () => {
      await new Promise(requestAnimationFrame);
      await document.fonts.ready;
      // A terminal cursor may blink forever; only finite layout transitions settle.
      await Promise.all(document.getAnimations()
        .filter(animation => Number.isFinite(animation.effect?.getComputedTiming().endTime))
        .map(animation => animation.finished.catch(() => {})));
      await new Promise(requestAnimationFrame);
    });
    const metrics = await page.evaluate(() => {
      const visible = selector => [...document.querySelectorAll(selector)].filter(element => element.checkVisibility());
      const size = element => parseFloat(getComputedStyle(element).fontSize);
      return {
        body: size(document.body),
        overflow: document.documentElement.scrollWidth - innerWidth,
        smallText: visible('main p, main li, main button').filter(element => !element.closest('svg') && size(element) < 13).map(element => element.outerHTML.slice(0, 100)),
        smallFields: visible('input:not([type=radio],[type=checkbox]), select, textarea').filter(element => size(element) < 16).map(element => element.outerHTML.slice(0, 100)),
        prose: visible('.post-content, .guide-content article').map(size),
        monoLoaded: [...document.fonts].some(face => face.family === 'IBM Plex Mono' && face.status === 'loaded'),
      };
    });
    assert.deepEqual(errors, [], label);
    assert.equal(metrics.body, 16 * scale, `${label}: body should follow the reader's text size`);
    assert.ok(metrics.overflow <= 1, `${label}: page overflows by ${metrics.overflow}px`);
    assert.deepEqual(metrics.smallText, [], `${label}: undersized text`);
    assert.deepEqual(metrics.smallFields, [], `${label}: undersized form fields`);
    assert.ok(metrics.prose.every(size => size >= 18 * scale), `${label}: article text is too small`);
    assert.ok(metrics.monoLoaded, `${label}: bundled font did not load`);
  } finally {
    await page.close();
  }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined });
  try {
    const context = await browser.newContext({ locale: 'tr-TR', colorScheme: 'light' });
    await context.route('https://**', route => route.abort());
    const home = await context.newPage();
    await home.goto(origin, { waitUntil: 'networkidle' });
    const article = await home.locator('.blog-post h3 a').first().getAttribute('href');
    cases.push(['blog article', new URL(article, origin).pathname]);
    await home.close();
    const jobs = [];
    for (const width of [320, 390, 768, 1181, 1440]) {
      for (const scale of [1, 2]) {
        for (const [name, path] of cases) {
          if (!process.argv[2] || name.includes(process.argv[2])) jobs.push([name, path, width, scale]);
        }
      }
    }
    const count = jobs.length;
    const failures = [];
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (jobs.length) {
        const job = jobs.shift();
        try { await checkPage(context, ...job); }
        catch (error) { failures.push(error.message); }
      }
    }));
    assert.deepEqual(failures, [], failures.join('\n'));
    console.log(`Typography verified across ${count} page, viewport and text-size combinations.`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
