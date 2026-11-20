import test from 'node:test';
import assert from 'node:assert/strict';
import { PNG } from 'pngjs';
import { makeReviewPreview, pixelChangePercent, visualDiff } from '../src/monitoring/pixel.mjs';

function image(width, height, color = [255, 255, 255, 255]) {
  const png = new PNG({ width, height });
  for (let offset = 0; offset < png.data.length; offset += 4) {
    png.data.set(color, offset);
  }
  return png;
}

function encoded(png) { return PNG.sync.write(png); }

test('result review preview reduces a capture without native image commands', async () => {
  const preview = PNG.sync.read(await makeReviewPreview(encoded(image(1440, 900, [12, 34, 56, 255]))));
  assert.equal(preview.width, 960);
  assert.equal(preview.height, 600);
  assert.deepEqual([...preview.data.subarray(0, 4)], [12, 34, 56, 255]);
});

test('pixel comparison reports an exact changed-pixel percentage', async () => {
  const previous = image(100, 100);
  const current = image(100, 100);
  for (let y = 0; y < 10; y += 1) {
    for (let x = 0; x < 10; x += 1) current.data.set([0, 0, 0, 255], (y * 100 + x) * 4);
  }
  assert.equal(await pixelChangePercent(encoded(previous), encoded(current), 100, 100), 1);
});

test('a screenshot dimension change counts and marks only the added canvas', async () => {
  const result = await visualDiff(encoded(image(60, 20)), encoded(image(120, 20)), 120, 20);
  const overlay = PNG.sync.read(result.overlay);
  assert.equal(result.percent, 50);
  assert.equal(result.dimensionsChanged, true);
  assert.equal(overlay.data[(10 * 120 + 5) * 4 + 3], 0);
  assert.deepEqual([...overlay.data.subarray((10 * 120 + 90) * 4, (10 * 120 + 90) * 4 + 4)], [19, 166, 105, 176]);
});

test('visual comparison returns a wide, high-visibility feather around changed pixels', async () => {
  const previous = image(100, 100);
  const current = image(100, 100);
  for (let y = 40; y < 42; y += 1) for (let x = 40; x < 42; x += 1) current.data.set([0, 0, 0, 255], (y * 100 + x) * 4);
  const result = await visualDiff(encoded(previous), encoded(current), 100, 100);
  const overlay = PNG.sync.read(result.overlay);
  assert.equal(result.percent, 0.04);
  assert.equal(result.dimensionsChanged, false);
  const changedAlpha = overlay.data[(40 * 100 + 40) * 4 + 3];
  const featherAlpha = overlay.data[(40 * 100 + 20) * 4 + 3];
  const distantAlpha = overlay.data[3];
  assert.ok(changedAlpha > 0 && changedAlpha <= 216);
  assert.ok(featherAlpha > 0 && featherAlpha < changedAlpha);
  assert.ok(distantAlpha > 0 && distantAlpha < featherAlpha);
});
