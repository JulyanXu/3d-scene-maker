export default async function checkFerry(page, assert, capture) {
  const inspect = () => page.evaluate(() => window.sceneMaker.inspect());
  const before = await inspect();
  assert.equal(before.boatCount, 2);
  assert.equal(before.ferryName, '乌篷渡船');
  assert.equal(before.stepHeights.length, 7);
  assert.ok(before.stepHeights.every((height, i, all) => i === 0 || height < all[i - 1]));
  assert.ok(before.roofedHouses >= 6);
  assert.equal(before.willowTrees, 2);
  assert.equal(before.waterReflection, true);
  await page.getByRole('button', { name: '轻摇船橹' }).click();
  await page.waitForFunction(() => window.sceneMaker.inspect().oarAngle > .10, null, { timeout: 30000 });
  const during = await inspect();
  assert.equal(during.strokeCount, before.strokeCount + 1);
  assert.ok(during.wakeAge >= 0 && during.wakeAge < 4);
  assert.ok(Math.abs(during.strokeAge - during.wakeAge) < .001);
  await capture('oar');
  await page.getByRole('combobox', { name: '视角' }).selectOption({ label: '桥畔回望' });
  await capture('bridge');
}
