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
import { fitBoundsToCamera } from './fitBounds';

const RENDER_TIMEOUT_MS = 60_000; // 60 s — large 300-DPI renders can take ~30-40 s
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
  const { center: legacyCenter, framingZoom, bounds, width, height, ratio, themeId, colorOverrides, layerOptions, distanceMeters, showStreetNames, mapLanguage, symbols } = params;

  // --- Framing: bounds is primary (RP1 fitBounds fix) ---
  // output device px (callers send device px with ratio=1, or logical px with ratio>1 for back-compat)
  const deviceWidth = Math.round(width * ratio);
  const deviceHeight = Math.round(height * ratio);

  let fittedCenter: [number, number];
  let renderZoom: number;

  if (bounds) {
    // PRIMARY path: fit the geographic bounds to the output px
    const cam = fitBoundsToCamera(bounds, deviceWidth, deviceHeight);
    fittedCenter = cam.center;
    renderZoom = cam.zoom;
    console.log(
      `[fitBounds] bounds=${JSON.stringify(bounds)} output=${deviceWidth}x${deviceHeight}` +
      ` → center=[${fittedCenter[0].toFixed(5)},${fittedCenter[1].toFixed(5)}] zoom=${renderZoom.toFixed(4)}`
    );
  } else {
    // LEGACY fallback: center+framingZoom, NO overzoom addition (the RP1 bug fix applies here too)
    fittedCenter = legacyCenter;
    renderZoom = framingZoom;
  }

  // Resolve theme
  const rawTheme = getTheme(themeId);
  const theme = Object.keys(colorOverrides).length > 0
    ? applyThemeColorOverrides(rawTheme, colorOverrides)
    : rawTheme;

  // Build style — merge distanceMeters into layerOptions-compatible shape.
  // Street labels (Experiment 5): map RenderParams → generateMapStyle options.
  const styleOptions = {
    ...layerOptions,
    distanceMeters: distanceMeters ?? undefined,
    includeStreetLabels: showStreetNames,
    labelLanguage: mapLanguage,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const style = generateMapStyle(theme, styleOptions as any);

  // Create mbgl map instance (ratio=1: we render at device px directly)
  const requestCallback = makeTileRequestCallback();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = new (mbgl as any).Map({ request: requestCallback, ratio: 1 });

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.load(style as any);

    const rgbaBuffer = await new Promise<Buffer>((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (map as any).render(
        { width: deviceWidth, height: deviceHeight, center: fittedCenter, zoom: renderZoom, bearing: 0, pitch: 0 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (err: any, buf: any) => {
          if (err) return reject(err instanceof Error ? err : new Error(String(err)));
          resolve(buf as Buffer);
        }
      );
    });

    // Composite symbols — pass fitted camera and output device px (ratio=1 since we already have device px)
    const pngBuffer = await compositeSymbols(rgbaBuffer, deviceWidth, deviceHeight, {
      center: fittedCenter,
      renderZoom,
      width: deviceWidth,   // output device px — project() uses these directly
      height: deviceHeight,
      ratio: 1,             // already device px; project() multiplies by ratio, so 1 is correct
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
