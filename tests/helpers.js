'use strict';

// Shared helpers for the browser tests: open the app in Chromium, record checks, and catch
// page errors. Each *.test.js file exports async (t) => { ... } and is run by tests/run.js.
// Set CHROMIUM_PATH to use a Chromium that is already installed.

const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const APP_URL = pathToFileURL(path.join(ROOT, 'index.html')).href;

// A small coloured picture, made in the page, as a PNG Blob (pass the string to page.evaluate + eval).
const pngSource = color => `(async () => { const c = document.createElement('canvas'); c.width = 400; c.height = 300;
  const x = c.getContext('2d'); x.fillStyle = '${color}'; x.fillRect(0, 0, 400, 300);
  x.fillStyle = '#fff8'; x.fillRect(120, 90, 160, 120); return await new Promise(r => c.toBlob(r, 'image/png')); })()`;

class TestRun {
  constructor(name) {
    this.name = name;
    this.checks = [];
    this.errors = [];
    this.browsers = [];
  }

  check(what, cond, detail = '') {
    this.checks.push({ what, pass: !!cond, detail: cond ? '' : typeof detail === 'object' ? JSON.stringify(detail) : String(detail) });
  }

  // Opens the app on a tab. welcome: 'skip' closes the first-run welcome, 'keep' leaves it.
  // Dialogs are accepted unless dialogs(d) says otherwise.
  async open({ viewport = { width: 1280, height: 860 }, tab = 'learn', welcome = 'skip', dialogs } = {}) {
    const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
    this.browsers.push(browser);
    const context = await browser.newContext({ viewport, acceptDownloads: true });
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    const page = await context.newPage();
    page.on('pageerror', e => this.errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') this.errors.push(`console: ${m.text()}`); });
    page.on('dialog', d => (dialogs ? dialogs(d) : d.type() === 'prompt' ? d.accept('Test') : d.accept()));
    await page.goto(`${APP_URL}#${tab}`);
    await page.waitForSelector('body.ready');
    if (welcome === 'skip' && tab === 'learn') await page.click('#welcomeDone');
    page.toast = () => page.textContent('#toast');
    page.saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('minecraftBuildHelper')));
    return page;
  }

  // Reloads the page and waits for the app to start again.
  async reload(page) {
    await page.evaluate(() => imagesSaved());
    await page.reload();
    await page.waitForSelector('body.ready');
  }

  // Ctrl + V with a picture, sent to the page.
  async paste(page, color = '#7a5') {
    await page.evaluate(async src => {
      const blob = await eval(src);
      const dt = new DataTransfer();
      dt.items.add(new File([blob], 'shot.png', { type: 'image/png' }));
      document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
    }, pngSource(color));
  }

  // A picture file for file choosers.
  async file(page, color = '#58a', name = 'pic.png') {
    const bytes = await page.evaluate(async src => Array.from(new Uint8Array(await (await eval(src)).arrayBuffer())), pngSource(color));
    return { name, mimeType: 'image/png', buffer: Buffer.from(bytes) };
  }

  // No part of the page sticks out sideways (which would make it scroll left and right).
  async noSideScroll(page) {
    return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  }

  async close() {
    for (const b of this.browsers) await b.close().catch(() => {});
  }
}

module.exports = { TestRun, ROOT, APP_URL, pngSource };
