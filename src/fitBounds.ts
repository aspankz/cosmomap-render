/**
 * fitBounds — derives the mbgl camera (center + zoom) that fits a geographic
 * bounding box into the given output dimensions.
 *
 * Web Mercator, tile size 512. Uses min(zoomX, zoomY) so the WHOLE bounds is
 * always visible — never crops the user's frame (may add ≤ few % margin on
 * one axis when bounds aspect ≠ output aspect).
 *
 * Plan §1.2 / RP1.
 */

const TILE_SIZE = 512;

/** Normalized mercator X in [0,1]. */
function mercX(lng: number): number {
  return (lng + 180) / 360;
}

/** Normalized mercator Y in [0,1] (north = smaller value). */
function mercY(lat: number): number {
  return 0.5 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / (2 * Math.PI);
}

/** Inverse mercator Y: normalized Y → latitude. */
function invMercY(y: number): number {
  return (Math.atan(Math.exp((0.5 - y) * 2 * Math.PI)) - Math.PI / 4) * (360 / Math.PI);
}

export interface FittedCamera {
  center: [number, number]; // [lng, lat]
  zoom: number;
}

/**
 * Compute the camera that fits `bounds` into `outputWidthPx × outputHeightPx`.
 *
 * @param bounds [[wLng, sLat], [eLng, nLat]]
 * @param outputWidthPx  — output device px (logical × ratio already applied)
 * @param outputHeightPx — output device px
 */
export function fitBoundsToCamera(
  bounds: [[number, number], [number, number]],
  outputWidthPx: number,
  outputHeightPx: number,
): FittedCamera {
  const [[wLng, sLat], [eLng, nLat]] = bounds;

  // Mercator fractions
  let fracX = mercX(eLng) - mercX(wLng);
  // Antimeridian guard
  if (fracX < 0) fracX += 1;

  // mercY(nLat) < mercY(sLat) because Y is flipped (north = smaller)
  const fracY = mercY(sLat) - mercY(nLat);

  if (fracX <= 0 || fracY <= 0) {
    throw new Error('bounds has zero or negative extent');
  }

  const zoomX = Math.log2(outputWidthPx / (TILE_SIZE * fracX));
  const zoomY = Math.log2(outputHeightPx / (TILE_SIZE * fracY));
  const zoom = Math.min(zoomX, zoomY);

  // Center: mercator-midpoint for correct projected latitude
  const centerLng = (wLng + eLng) / 2;
  const centerLat = invMercY((mercY(nLat) + mercY(sLat)) / 2);

  return { center: [centerLng, centerLat], zoom };
}
