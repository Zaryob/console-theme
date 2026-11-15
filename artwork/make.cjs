// SPDX-License-Identifier: GPL-2.0-or-later
// Renders the suite's social cards and the home hero image from the HTML templates beside this file.
// Usage: node artwork/make.cjs [outDir]   (needs Playwright with Chromium; see package.json)
const path = require('path');
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '@playwright/test');
const out = path.resolve(process.argv[2] || path.join(__dirname, 'out'));
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  const card = 'file://' + path.join(__dirname, 'card.html');
  await page.goto(card);
  for (const key of await page.evaluate(() => window.cardKeys)) {
    await page.goto(`${card}?card=${key}`);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(out, `card-${key}.png`) });
  }
  const hero = 'file://' + path.join(__dirname, 'hero.html');
  for (const [mode, width, height] of [['wide', 2400, 700], ['stacked', 1200, 900], ['plain', 2400, 700]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${hero}?mode=${mode}`);
    await page.waitForSelector('body[data-ready]');
    await page.screenshot({ path: path.join(out, `hero-${mode}.png`) });
  }
  await browser.close();
})();
