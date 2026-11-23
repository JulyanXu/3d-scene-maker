import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, rm, writeFile, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { PNG } from 'pngjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const isolated = await mkdtemp(join(tmpdir(), 'offline-scene-'));
const channel = process.env.SCENE_BROWSER_CHANNEL || 'chrome';
const evidence = resolve(root, process.env.SCENE_QA_DIR || 'verification/' + channel);
const file = join(isolated, 'scene.html');
const url = pathToFileURL(file).href;
let browser;

function imageDetail(buffer) {
  const png = PNG.sync.read(buffer);
  const colors = new Set();
  // Exclude the interface at the edges when measuring rendered content.
  for (let y = Math.floor(png.height * 0.2); y < png.height * 0.82; y += 7) {
    for (let x = Math.floor(png.width * 0.1); x < png.width * 0.9; x += 7) {
      const i = (y * png.width + x) * 4;
      colors.add((png.data[i] >> 3) * 1024 + (png.data[i + 1] >> 3) * 32 + (png.data[i + 2] >> 3));
    }
  }
  return colors.size;
}

try {
  await copyFile(join(root, 'scene.html'), file);
  await mkdir(evidence, { recursive: true });
  browser = await chromium.launch({
    ...(process.env.SCENE_BROWSER_PATH ? { executablePath: process.env.SCENE_BROWSER_PATH } : { channel }),
    headless: true, args: ['--enable-unsafe-swiftshader']
  });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1,
    offline: true, serviceWorkers: 'block' });
  const page = await context.newPage();
  const issues = [];
  page.on('request', request => {
    const u = request.url();
    if (u !== url && !/^(?:blob:|data:|about:)/.test(u)) issues.push('外部请求 ' + u);
  });
  page.on('requestfailed', request => issues.push('加载失败 ' + request.url().slice(0, 250)));
  page.on('pageerror', err => issues.push(err.message));
  page.on('console', msg => { if (msg.type() === 'error') issues.push(msg.text()); });
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.sceneMaker?.status().frames >= 2 || document.querySelector('#error')?.textContent, null, { timeout: 120000 });
  assert.deepEqual(issues, []);
  assert.equal(await page.locator('#error').textContent(), '');
  const status = () => page.evaluate(() => window.sceneMaker.status());
  const frame = async () => {
    const { frames } = await status();
    await page.waitForFunction(n => window.sceneMaker.status().frames > n, frames, { timeout: 45000 });
  };
  const capture = async name => {
    if (!/^[\p{L}\p{N}_-]+$/u.test(name)) throw new Error('截图名称只能含文字、数字、下划线和连字符。');
    await frame();
    const data = await page.screenshot({ path: join(evidence, name + '.png'), timeout: 60000 });
    return imageDetail(data);
  };
  const opening = await status();
  assert.ok(opening.draws > 0, '首帧应有绘制调用');
  const firstColors = await capture('opening');
  assert.ok(firstColors > 5, '画布中部颜色单一，请核对首帧是否可见');
  const menu = page.getByRole('combobox', { name: '视角' });
  const labels = await menu.locator('option').allTextContents();
  assert.ok(labels.length >= 2, '至少要有一个可检查空间深度的第二视角');
  for (let i = 1; i < labels.length; i++) {
    await menu.selectOption({ label: labels[i] });
    await frame();
    assert.equal((await status()).view, labels[i]);
    if (i === 1) {
      assert.notDeepEqual((await status()).camera, opening.camera);
      await capture('secondary');
    }
  }
  const reset = page.getByRole('button', { name: '复位', exact: true });
  await reset.click();
  await page.mouse.move(660, 355);
  await page.mouse.down();
  await page.mouse.move(745, 390, { steps: 5 });
  await page.mouse.up();
  await frame();
  assert.ok((await status()).camera.some((v, i) => Math.abs(v - opening.camera[i]) > 0.0001), '拖动镜头应改变观察位置');
  const beforeZoom = (await status()).camera;
  await page.mouse.wheel(0, -205);
  await page.waitForFunction(p => window.sceneMaker.status().camera.some((v, i) => Math.abs(v - p[i]) > 0.0001), beforeZoom);
  await reset.click();
  await frame();
  const restored = await status();
  assert.ok(restored.camera.every((v, i) => Math.abs(v - opening.camera[i]) < 0.001), '复位应准确恢复开场相机');
  assert.equal(restored.view, labels[0]);
  const checkFile = join(root, 'scene-check.mjs');
  if (await access(checkFile).then(() => true, err => { if (err.code === 'ENOENT') return false; throw err; })) {
    const check = (await import(pathToFileURL(checkFile).href)).default;
    await check(page, assert, capture);
  }
  assert.deepEqual(issues, []);
  const result = { browser: browser.version(), channel, protocol: 'file:', offline: true, viewport: [1366, 768],
    opening, views: labels, openingColorBins: firstColors, issues };
  await writeFile(join(evidence, 'result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log('离线浏览器验收通过 · ' + channel + ' · ' + labels.join(' / '));
} finally {
  try { await browser?.close(); }
  finally { await rm(isolated, { recursive: true, force: true }); }
}
