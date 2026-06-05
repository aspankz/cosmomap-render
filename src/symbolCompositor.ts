/**
 * Projects symbols (lng/lat) to device pixels and composites SVG icons onto the map image.
 * Plan §1.2 — Web Mercator projection, tile size 512, bottom-center anchor.
 */
import sharp from 'sharp';
import { EMapSymbol } from './vendored/model/mapSymbols';
import { getSymbolPath } from './vendored/lib/symbolToSvg';
import type { SymbolParam } from './renderParams';

const TILE_SIZE = 512;

/**
 * Reference long-side in device px for symbol sizing parity.
 * At REFERENCE_LONG_SIDE output, symbol base size = 40 device px (size=1.0).
 * Scales proportionally for larger outputs (300-DPI prints etc.).
 * ~1000 is close to typical map-box preview long side.
 */
const REFERENCE_LONG_SIDE = 1000;

/**
 * Web Mercator projection.
 * Returns device-pixel {x, y} relative to the top-left corner of the rendered image.
 * Verified: center projects to exactly (W/2 * ratio, H/2 * ratio) = (W_device/2, H_device/2).
 */
function project(
  lng: number,
  lat: number,
  center: [number, number],
  zoom: number,
  width: number,
  height: number,
  ratio: number
): { x: number; y: number } {
  const scale = TILE_SIZE * Math.pow(2, zoom);

  const worldX = (l: number) => ((l + 180) / 360) * scale;
  const worldY = (la: number) => {
    const s = Math.sin((la * Math.PI) / 180);
    return (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale;
  };

  const cx = worldX(center[0]);
  const cy = worldY(center[1]);

  // logical px offset from center
  const px = worldX(lng) - cx + width / 2;
  const py = worldY(lat) - cy + height / 2;

  // device px
  return { x: px * ratio, y: py * ratio };
}

function makeSymbolSvg(type: string, color: string, sizeDevicePx: number): Buffer {
  // Normalize symbol type to enum (case-insensitive)
  const enumKey = type.toUpperCase() as keyof typeof EMapSymbol;
  const symbolEnum = EMapSymbol[enumKey] ?? EMapSymbol.PIN;

  const path = getSymbolPath(symbolEnum, color);

  const svg = `<svg width="${sizeDevicePx}" height="${sizeDevicePx}" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${path}
</svg>`;

  return Buffer.from(svg, 'utf-8');
}

export interface CompositeInput {
  input: Buffer | { create: { width: number; height: number; channels: 4; background: { r: number; g: number; b: number; alpha: number } } };
  left: number;
  top: number;
}

/** WebP quality for previews — visually lossless on flat map art, ~½–⅓ PNG weight. */
const WEBP_QUALITY = 82;

/**
 * Composites symbols onto the RGBA buffer from mbgl.
 * Returns a PNG Buffer ('png') or a WebP Buffer ('webp', previews).
 */
export async function compositeSymbols(
  rgbaBuffer: Buffer,
  deviceWidth: number,
  deviceHeight: number,
  params: {
    center: [number, number];
    renderZoom: number;
    width: number;  // logical px
    height: number; // logical px
    ratio: number;
    symbols: SymbolParam[];
    format: 'png' | 'webp';
  }
): Promise<Buffer> {
  const { center, renderZoom, width, height, ratio, symbols, format } = params;
  const encode = (s: sharp.Sharp): Promise<Buffer> =>
    format === 'webp' ? s.webp({ quality: WEBP_QUALITY }).toBuffer() : s.png().toBuffer();

  let img = sharp(rgbaBuffer, {
    raw: { width: deviceWidth, height: deviceHeight, channels: 4 },
  });

  if (symbols.length === 0) {
    return encode(img);
  }

  const composites: sharp.OverlayOptions[] = [];

  // Symbol size scales with output resolution for visual parity (RP1 §1.4 / R-F)
  const outputLongSide = Math.max(deviceWidth, deviceHeight);
  const symbolScale = outputLongSide / REFERENCE_LONG_SIDE;

  for (const sym of symbols) {
    const { x, y } = project(sym.lng, sym.lat, center, renderZoom, width, height, ratio);
    const sizeDevicePx = Math.round(40 * sym.size * symbolScale);

    if (sizeDevicePx <= 0) continue;

    const left = Math.round(x - sizeDevicePx / 2);
    const top = Math.round(y - sizeDevicePx);

    // Skip symbols that are completely out of frame
    if (left + sizeDevicePx < 0 || left > deviceWidth || top + sizeDevicePx < 0 || top > deviceHeight) {
      continue;
    }

    const svgBuf = makeSymbolSvg(sym.type, sym.color, sizeDevicePx);

    // Rasterize SVG to PNG via sharp, then composite
    const rasterBuf = await sharp(svgBuf).png().toBuffer();

    composites.push({ input: rasterBuf, left, top });
  }

  if (composites.length === 0) {
    return encode(img);
  }

  return encode(img.composite(composites));
}
