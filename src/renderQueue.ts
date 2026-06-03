/**
 * Render queue — serializes mbgl renders (not concurrency-safe).
 * Concurrency 1 + per-request timeout.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mbgl = require('@maplibre/maplibre-gl-native');
import { makeTileRequestCallback } from './tileClient';
import { getTheme } from './vendored/theme/themeRepository';
import { applyThemeColorOverrides } from './vendored/theme/colorPaths';
import { generateMapStyle } from './vendored/theme/maplibreStyle';
import { compositeSymbols } from './symbolCompositor';
import type { RenderParams } from './renderParams';

const RENDER_TIMEOUT_MS = 30_000;
const QUEUE_CONCURRENCY = 1;

type RenderJob = () => Promise<Buffer>;

let activeCount = 0;
const queue: Array<{ job: RenderJob; resolve: (b: Buffer) => void; reject: (e: Error) => void }> = [];

function drainQueue(): void {
  while (activeCount < QUEUE_CONCURRENCY && queue.length > 0) {
    const item = queue.shift()!;
    activeCount++;
    item.job()
      .then(item.resolve, item.reject)
      .finally(() => {
        activeCount--;
        drainQueue();
      });
  }
}

function enqueue(job: RenderJob): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    queue.push({ job, resolve, reject });
    drainQueue();
  });
}

async function doRender(params: RenderParams): Promise<Buffer> {
  const { center, framingZoom, overzoomScale, width, height, ratio, themeId, colorOverrides, layerOptions, distanceMeters, symbols } = params;

  const renderZoom = framingZoom + Math.log2(overzoomScale);
  const deviceWidth = Math.round(width * ratio);
  const deviceHeight = Math.round(height * ratio);

  // Resolve theme
  const rawTheme = getTheme(themeId);
  const theme = Object.keys(colorOverrides).length > 0
    ? applyThemeColorOverrides(rawTheme, colorOverrides)
    : rawTheme;

  // Build style — merge distanceMeters into layerOptions-compatible shape
  const styleOptions = {
    ...layerOptions,
    distanceMeters: distanceMeters ?? undefined,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const style = generateMapStyle(theme, styleOptions as any);

  // Create mbgl map instance
  const requestCallback = makeTileRequestCallback();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = new (mbgl as any).Map({ request: requestCallback, ratio });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.load(style as any);

    const rgbaBuffer = await new Promise<Buffer>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any).render(
        { width, height, center, zoom: renderZoom, bearing: 0, pitch: 0 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err: any, buf: any) => {
          if (err) return reject(err instanceof Error ? err : new Error(String(err)));
          resolve(buf as Buffer);
        }
      );
    });

    // Composite symbols
    const pngBuffer = await compositeSymbols(rgbaBuffer, deviceWidth, deviceHeight, {
      center,
      renderZoom,
      width,
      height,
      ratio,
      symbols,
    });

    return pngBuffer;
  } finally {
    map.release();
  }
}

/** Public API: enqueue a render job with a timeout. */
export function renderMap(params: RenderParams): Promise<Buffer> {
  return enqueue(() => {
    return Promise.race([
      doRender(params),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Render timed out after ${RENDER_TIMEOUT_MS}ms`)), RENDER_TIMEOUT_MS)
      ),
    ]);
  });
}

export function getQueueStats(): { active: number; queued: number } {
  return { active: activeCount, queued: queue.length };
}
