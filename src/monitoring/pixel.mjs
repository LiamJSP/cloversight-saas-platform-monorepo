import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

const REVIEW_PREVIEW_MAX_WIDTH = 960;
const REVIEW_PREVIEW_SCALE = 0.72;
// A 2% perceptual threshold classified sub-pixel font rasterization and tiny
// browser paint variations as real content changes. Ten percent, anti-alias
// suppression, and sparse-tile cleanup preserve meaningful UI/content changes.
// The retained mask is expanded into a translucent radial brush so evidence is
// easy to find without covering the current screenshot with hard rectangles.
const PIXEL_MATCH_THRESHOLD = 0.1;
const DIFF_TILE_SIZE = 8;
const DIFF_TILE_MIN_PIXELS = 4;
const BRUSH_CELL_SIZE = 10;
const BRUSH_RADIUS_CELLS = 8;
const BRUSH_MAX_ALPHA = 216;
const ADDED_COLOR = [19, 166, 105, 176];
const REMOVED_COLOR = [239, 72, 62, 255];
const REMOVED_LINE_HALF_WIDTH = 5;

function imageError(message, cause) {
  return Object.assign(new Error(message, cause ? { cause } : undefined), { code: 'IMAGE_PROCESSING_FAILED' });
}

function decodePng(input, label) {
  try {
    return PNG.sync.read(input);
  } catch (error) {
    throw imageError(`Unable to decode ${label} PNG: ${error.message}`, error);
  }
}

export async function pixelChangePercent(previousPng, currentPng, width, height) {
  return (await visualDiff(previousPng, currentPng, width, height)).percent;
}

export async function visualDiff(previousPng, currentPng, width, height) {
  const previous = decodePng(previousPng, 'previous screenshot');
  const current = decodePng(currentPng, 'current screenshot');
  if (Number.isInteger(width) && Number.isInteger(height) && (current.width !== width || current.height !== height)) {
    throw imageError(`Current screenshot dimensions ${current.width}x${current.height} do not match capture metadata ${width}x${height}.`);
  }
  const overlay = new PNG({ width: current.width, height: current.height });
  const dimensionsChanged = previous.width !== current.width || previous.height !== current.height;
  const dimensionChange = describeDimensionChange(previous, current);
  const comparisonPrevious = dimensionsChanged ? alignPreviousToCurrent(previous, current, dimensionChange) : previous;
  pixelmatch(comparisonPrevious.data, current.data, overlay.data, current.width, current.height, {
    threshold: PIXEL_MATCH_THRESHOLD,
    includeAA: false,
    diffMask: true,
    diffColor: [206, 35, 118],
    aaColor: [255, 151, 64],
  });
  const visibleChanged = suppressSparseDiff(overlay);
  const overlapPixels = Math.min(previous.width, current.width) * Math.min(previous.height, current.height);
  const removedOutsideCurrent = Math.max(0, previous.width * previous.height - overlapPixels);
  const addedOutsidePrevious = Math.max(0, current.width * current.height - overlapPixels);
  softenDiffMask(overlay);
  if (addedOutsidePrevious) markAddedRegions(overlay, dimensionChange);
  if (removedOutsideCurrent) markRemovedRegions(overlay, dimensionChange);
  const changed = visibleChanged + removedOutsideCurrent + addedOutsidePrevious;
  const comparisonPixels = Math.max(previous.width * previous.height, current.width * current.height);
  return {
    percent: Number((changed / Math.max(1, comparisonPixels) * 100).toFixed(4)),
    overlay: encodePng(overlay, 'visual-change overlay'),
    width: current.width,
    height: current.height,
    dimensionsChanged,
    dimensionChange,
  };
}

function suppressSparseDiff(overlay) {
  let kept = 0;
  for (let top = 0; top < overlay.height; top += DIFF_TILE_SIZE) {
    for (let left = 0; left < overlay.width; left += DIFF_TILE_SIZE) {
      const right = Math.min(overlay.width, left + DIFF_TILE_SIZE);
      const bottom = Math.min(overlay.height, top + DIFF_TILE_SIZE);
      let count = 0;
      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) if (overlay.data[(y * overlay.width + x) * 4 + 3]) count += 1;
      }
      if (count >= DIFF_TILE_MIN_PIXELS) { kept += count; continue; }
      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) overlay.data[(y * overlay.width + x) * 4 + 3] = 0;
      }
    }
  }
  return kept;
}

function describeDimensionChange(previous, current) {
  const addedHeight = Math.max(0, current.height - previous.height);
  const removedHeight = Math.max(0, previous.height - current.height);
  const addedWidth = Math.max(0, current.width - previous.width);
  const removedWidth = Math.max(0, previous.width - current.width);
  const boundaryY = addedHeight
    ? findVerticalBoundary(previous, current, addedHeight, 'added')
    : removedHeight
      ? findVerticalBoundary(previous, current, removedHeight, 'removed')
      : null;
  return {
    addedHeight, removedHeight, addedWidth, removedWidth, boundaryY,
    boundaryX: addedWidth || removedWidth ? Math.min(previous.width, current.width) : null,
  };
}

function findVerticalBoundary(previous, current, delta, mode) {
  const comparableHeight = mode === 'added' ? previous.height : current.height;
  const width = Math.min(previous.width, current.width);
  const candidateStep = Math.max(1, Math.floor(comparableHeight / 140));
  const rowStep = Math.max(1, Math.floor(comparableHeight / 110));
  const columnStep = Math.max(1, Math.floor(width / 72));
  let bestBoundary = comparableHeight;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let boundary = 0; boundary <= comparableHeight; boundary += candidateStep) {
    let score = 0;
    let samples = 0;
    for (let y = 0; y < comparableHeight; y += rowStep) {
      const previousY = mode === 'removed' && y >= boundary ? y + delta : y;
      const currentY = mode === 'added' && y >= boundary ? y + delta : y;
      for (let x = 0; x < width; x += columnStep) {
        const previousOffset = (previousY * previous.width + x) * 4;
        const currentOffset = (currentY * current.width + x) * 4;
        score += Math.abs(previous.data[previousOffset] - current.data[currentOffset]);
        score += Math.abs(previous.data[previousOffset + 1] - current.data[currentOffset + 1]);
        score += Math.abs(previous.data[previousOffset + 2] - current.data[currentOffset + 2]);
        samples += 1;
      }
    }
    const normalized = score / Math.max(1, samples);
    if (normalized < bestScore) { bestScore = normalized; bestBoundary = boundary; }
  }
  return Math.min(comparableHeight, bestBoundary);
}

function alignPreviousToCurrent(previous, current, change) {
  const fitted = new PNG({ width: current.width, height: current.height });
  fitted.data.set(current.data);
  const copyWidth = Math.min(previous.width, current.width) * 4;
  for (let currentY = 0; currentY < current.height; currentY += 1) {
    let previousY = currentY;
    if (change.addedHeight) {
      if (currentY >= change.boundaryY && currentY < change.boundaryY + change.addedHeight) continue;
      if (currentY >= change.boundaryY + change.addedHeight) previousY = currentY - change.addedHeight;
    } else if (change.removedHeight && currentY >= change.boundaryY) previousY = currentY + change.removedHeight;
    if (previousY < 0 || previousY >= previous.height) continue;
    previous.data.copy(fitted.data, currentY * current.width * 4, previousY * previous.width * 4, previousY * previous.width * 4 + copyWidth);
  }
  return fitted;
}

function markAddedRegions(overlay, change) {
  for (let y = 0; y < overlay.height; y += 1) {
    for (let x = 0; x < overlay.width; x += 1) {
      const inAddedHeight = change.addedHeight && y >= change.boundaryY && y < change.boundaryY + change.addedHeight;
      const inAddedWidth = change.addedWidth && x >= change.boundaryX;
      if (!inAddedHeight && !inAddedWidth) continue;
      const offset = (y * overlay.width + x) * 4;
      overlay.data[offset] = ADDED_COLOR[0]; overlay.data[offset + 1] = ADDED_COLOR[1];
      overlay.data[offset + 2] = ADDED_COLOR[2]; overlay.data[offset + 3] = ADDED_COLOR[3];
    }
  }
}

function paint(overlay, x, y, color = REMOVED_COLOR) {
  if (x < 0 || y < 0 || x >= overlay.width || y >= overlay.height) return;
  const offset = (Math.floor(y) * overlay.width + Math.floor(x)) * 4;
  overlay.data[offset] = color[0]; overlay.data[offset + 1] = color[1];
  overlay.data[offset + 2] = color[2]; overlay.data[offset + 3] = color[3];
}

function markRemovedRegions(overlay, change) {
  if (change.removedHeight) {
    const lineY = Math.max(REMOVED_LINE_HALF_WIDTH, Math.min(overlay.height - 1 - REMOVED_LINE_HALF_WIDTH, change.boundaryY));
    for (let y = lineY - REMOVED_LINE_HALF_WIDTH; y <= lineY + REMOVED_LINE_HALF_WIDTH; y += 1) for (let x = 0; x < overlay.width; x += 1) paint(overlay, x, y);
    for (let centerX = 34; centerX < overlay.width; centerX += 76) {
      for (let step = 0; step < 14; step += 1) {
        paint(overlay, centerX, lineY - 18 + step);
        paint(overlay, centerX - Math.floor(step / 2), lineY - 7 - Math.floor(step / 2));
        paint(overlay, centerX + Math.floor(step / 2), lineY - 7 - Math.floor(step / 2));
        paint(overlay, centerX, lineY + 18 - step);
        paint(overlay, centerX - Math.floor(step / 2), lineY + 7 + Math.floor(step / 2));
        paint(overlay, centerX + Math.floor(step / 2), lineY + 7 + Math.floor(step / 2));
      }
    }
  }
  if (change.removedWidth) {
    const lineX = Math.max(REMOVED_LINE_HALF_WIDTH, overlay.width - 1 - REMOVED_LINE_HALF_WIDTH);
    for (let x = lineX - REMOVED_LINE_HALF_WIDTH; x <= lineX + REMOVED_LINE_HALF_WIDTH; x += 1) for (let y = 0; y < overlay.height; y += 1) paint(overlay, x, y);
  }
}

function softenDiffMask(overlay) {
  const gridWidth = Math.ceil(overlay.width / BRUSH_CELL_SIZE);
  const gridHeight = Math.ceil(overlay.height / BRUSH_CELL_SIZE);
  const active = new Uint8Array(gridWidth * gridHeight);
  for (let y = 0; y < overlay.height; y += 1) {
    const gridY = Math.floor(y / BRUSH_CELL_SIZE);
    for (let x = 0; x < overlay.width; x += 1) {
      if (overlay.data[(y * overlay.width + x) * 4 + 3]) active[gridY * gridWidth + Math.floor(x / BRUSH_CELL_SIZE)] = 1;
    }
  }

  const heat = new Uint8Array(active.length);
  const radiusSquared = BRUSH_RADIUS_CELLS ** 2;
  for (let gridY = 0; gridY < gridHeight; gridY += 1) {
    for (let gridX = 0; gridX < gridWidth; gridX += 1) {
      let nearestSquared = Number.POSITIVE_INFINITY;
      for (let offsetY = -BRUSH_RADIUS_CELLS; offsetY <= BRUSH_RADIUS_CELLS; offsetY += 1) {
        const sourceY = gridY + offsetY;
        if (sourceY < 0 || sourceY >= gridHeight) continue;
        for (let offsetX = -BRUSH_RADIUS_CELLS; offsetX <= BRUSH_RADIUS_CELLS; offsetX += 1) {
          const sourceX = gridX + offsetX;
          if (sourceX < 0 || sourceX >= gridWidth || !active[sourceY * gridWidth + sourceX]) continue;
          const distanceSquared = offsetX ** 2 + offsetY ** 2;
          if (distanceSquared < nearestSquared) nearestSquared = distanceSquared;
        }
      }
      if (nearestSquared > radiusSquared) continue;
      const strength = Math.max(0, 1 - Math.sqrt(nearestSquared) / BRUSH_RADIUS_CELLS);
      const eased = strength * strength * (3 - 2 * strength);
      heat[gridY * gridWidth + gridX] = Math.round(BRUSH_MAX_ALPHA * eased);
    }
  }

  const heatAt = (x, y) => heat[Math.max(0, Math.min(gridHeight - 1, y)) * gridWidth + Math.max(0, Math.min(gridWidth - 1, x))];
  for (let y = 0; y < overlay.height; y += 1) {
    const sourceY = (y + 0.5) / BRUSH_CELL_SIZE - 0.5;
    const y0 = Math.floor(sourceY); const y1 = y0 + 1; const blendY = sourceY - y0;
    for (let x = 0; x < overlay.width; x += 1) {
      const sourceX = (x + 0.5) / BRUSH_CELL_SIZE - 0.5;
      const x0 = Math.floor(sourceX); const x1 = x0 + 1; const blendX = sourceX - x0;
      const top = heatAt(x0, y0) * (1 - blendX) + heatAt(x1, y0) * blendX;
      const bottom = heatAt(x0, y1) * (1 - blendX) + heatAt(x1, y1) * blendX;
      const alpha = Math.round(top * (1 - blendY) + bottom * blendY);
      const offset = (y * overlay.width + x) * 4;
      overlay.data[offset] = 206;
      overlay.data[offset + 1] = 35;
      overlay.data[offset + 2] = 118;
      overlay.data[offset + 3] = alpha < 2 ? 0 : alpha;
    }
  }
}

export function imageDimensions(png) {
  const image = decodePng(png, 'screenshot');
  return { width: image.width, height: image.height };
}

export async function makeReviewPreview(png) {
  const source = decodePng(png, 'source screenshot');
  const scale = Math.min(REVIEW_PREVIEW_SCALE, REVIEW_PREVIEW_MAX_WIDTH / source.width);
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  return encodePng(resizeImage(source, width, height), 'result review preview');
}

function resizeImage(source, width, height) {
  const scaleX = width / source.width;
  const scaleY = height / source.height;
  const output = new PNG({ width, height });

  // Bilinear sampling keeps text legible in gallery cards while remaining
  // architecture-independent on the ARM64 managed Lambda runtime.
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(source.height - 1, Math.max(0, (y + 0.5) / scaleY - 0.5));
    const y0 = Math.floor(sourceY);
    const y1 = Math.min(source.height - 1, y0 + 1);
    const fy = sourceY - y0;
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.max(0, (x + 0.5) / scaleX - 0.5));
      const x0 = Math.floor(sourceX);
      const x1 = Math.min(source.width - 1, x0 + 1);
      const fx = sourceX - x0;
      const targetOffset = (y * width + x) * 4;
      const topLeft = (y0 * source.width + x0) * 4;
      const topRight = (y0 * source.width + x1) * 4;
      const bottomLeft = (y1 * source.width + x0) * 4;
      const bottomRight = (y1 * source.width + x1) * 4;
      for (let channel = 0; channel < 4; channel += 1) {
        const top = source.data[topLeft + channel] * (1 - fx) + source.data[topRight + channel] * fx;
        const bottom = source.data[bottomLeft + channel] * (1 - fx) + source.data[bottomRight + channel] * fx;
        output.data[targetOffset + channel] = Math.round(top * (1 - fy) + bottom * fy);
      }
    }
  }

  return output;
}

function encodePng(image, label) {
  try { return PNG.sync.write(image); }
  catch (error) { throw imageError(`Unable to encode ${label}: ${error.message}`, error); }
}
