/**
 * RenderParams — the finalized contract (plan §1).
 * camelCase JSON, same object travels frontend → .NET → render service.
 */

export interface SymbolParam {
  /** EMapSymbol string value: HEART | PIN | PIN2 | STAR | PIN3 | FLAG | HOUSE | PLANE */
  type: string;
  /** hex color, e.g. "#121927" */
  color: string;
  lng: number;
  lat: number;
  /** logical multiplier 0.5–3.0, default 1.0 */
  size: number;
}

export interface LayerOptions {
  includeLandcover?: boolean;
  includeBuildings?: boolean;
  includeWater?: boolean;
  includeParks?: boolean;
  includeAeroway?: boolean;
  includeRail?: boolean;
  includeRoads?: boolean;
  includeRoadPath?: boolean;
  includeRoadMinorLow?: boolean;
  includeRoadOutline?: boolean;
}

export interface RenderParams {
  // ---- framing ----
  center: [number, number]; // [lng, lat]
  framingZoom: number;
  bounds?: [[number, number], [number, number]] | null;
  overzoomScale: number; // default 5.5

  // ---- output size ----
  width: number;  // logical px
  height: number; // logical px
  ratio: number;  // DPI multiplier, default 4
  orientation: 'portrait' | 'landscape';

  // ---- theme ----
  themeId: string;
  colorOverrides: Record<string, string>;
  layerOptions: LayerOptions;
  distanceMeters?: number | null;

  // ---- symbols ----
  symbols: SymbolParam[];
}

export const MAX_DEVICE_PIXELS = 70_000_000; // 70MP cap (50×70 @ 300 DPI ≈ 48.8MP)

/** Apply defaults and return a normalized params object. Throws on invalid input. */
export function normalizeAndValidateParams(raw: unknown): RenderParams {
  if (typeof raw !== 'object' || raw === null) {
    throw new ValidationError('Request body must be a JSON object');
  }
  const r = raw as Record<string, unknown>;

  // center + framingZoom OR bounds required
  const center = r['center'];
  const framingZoom = r['framingZoom'];
  const rawBounds = r['bounds'] ?? null;

  // Validate bounds if provided
  let bounds: [[number, number], [number, number]] | null = null;
  if (rawBounds !== null && rawBounds !== undefined) {
    if (
      !Array.isArray(rawBounds) || rawBounds.length !== 2 ||
      !Array.isArray(rawBounds[0]) || rawBounds[0].length !== 2 ||
      !Array.isArray(rawBounds[1]) || rawBounds[1].length !== 2 ||
      typeof rawBounds[0][0] !== 'number' || typeof rawBounds[0][1] !== 'number' ||
      typeof rawBounds[1][0] !== 'number' || typeof rawBounds[1][1] !== 'number'
    ) {
      throw new ValidationError('bounds must be [[wLng,sLat],[eLng,nLat]] numbers');
    }
    bounds = rawBounds as [[number, number], [number, number]];
  }

  if ((center === undefined || framingZoom === undefined) && bounds === null) {
    throw new ValidationError('Must provide center+framingZoom or bounds');
  }

  if (center !== undefined) {
    if (!Array.isArray(center) || center.length !== 2 ||
        typeof center[0] !== 'number' || typeof center[1] !== 'number') {
      throw new ValidationError('center must be [lng, lat] numbers');
    }
  }
  if (framingZoom !== undefined && (typeof framingZoom !== 'number' || framingZoom < 0 || framingZoom > 24)) {
    throw new ValidationError('framingZoom must be a number 0–24');
  }

  const width = r['width'];
  const height = r['height'];
  const themeId = r['themeId'];

  if (typeof width !== 'number' || width <= 0) throw new ValidationError('width is required (positive number)');
  if (typeof height !== 'number' || height <= 0) throw new ValidationError('height is required (positive number)');
  if (typeof themeId !== 'string' || !themeId) throw new ValidationError('themeId is required (string)');

  const ratio = typeof r['ratio'] === 'number' ? r['ratio'] : 1;
  if (ratio <= 0 || ratio > 8) throw new ValidationError('ratio must be 1–8');

  const devicePx = Math.round(width * ratio) * Math.round(height * ratio);
  if (devicePx > MAX_DEVICE_PIXELS) {
    throw new ValidationError(
      `Device pixel count ${devicePx} exceeds cap ${MAX_DEVICE_PIXELS}. Reduce width/height or ratio.`
    );
  }

  const overzoomScale = typeof r['overzoomScale'] === 'number' ? r['overzoomScale'] : 5.5;
  if (overzoomScale <= 0 || overzoomScale > 16) throw new ValidationError('overzoomScale must be 0–16');

  const colorOverrides = (r['colorOverrides'] && typeof r['colorOverrides'] === 'object' && !Array.isArray(r['colorOverrides']))
    ? r['colorOverrides'] as Record<string, string>
    : {};

  const layerOptions = (r['layerOptions'] && typeof r['layerOptions'] === 'object' && !Array.isArray(r['layerOptions']))
    ? r['layerOptions'] as LayerOptions
    : {};

  const rawSymbols = Array.isArray(r['symbols']) ? r['symbols'] : [];
  const symbols: SymbolParam[] = rawSymbols.map((s: unknown, i: number) => {
    if (typeof s !== 'object' || s === null) throw new ValidationError(`symbols[${i}] must be an object`);
    const sym = s as Record<string, unknown>;
    if (typeof sym['type'] !== 'string') throw new ValidationError(`symbols[${i}].type is required`);
    if (typeof sym['color'] !== 'string') throw new ValidationError(`symbols[${i}].color is required`);
    if (typeof sym['lng'] !== 'number') throw new ValidationError(`symbols[${i}].lng is required`);
    if (typeof sym['lat'] !== 'number') throw new ValidationError(`symbols[${i}].lat is required`);
    return {
      type: sym['type'] as string,
      color: sym['color'] as string,
      lng: sym['lng'] as number,
      lat: sym['lat'] as number,
      size: typeof sym['size'] === 'number' ? sym['size'] : 1.0,
    };
  });

  const orientation = r['orientation'] === 'landscape' ? 'landscape' : 'portrait';

  return {
    center: center as [number, number],
    framingZoom: framingZoom as number,
    bounds,
    overzoomScale,
    width,
    height,
    ratio,
    orientation,
    themeId,
    colorOverrides,
    layerOptions,
    distanceMeters: typeof r['distanceMeters'] === 'number' ? r['distanceMeters'] : null,
    symbols,
  };
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
