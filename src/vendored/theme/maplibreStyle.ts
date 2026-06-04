// Vendored from apps/frontend/src/entities/cityMap/theme/maplibreStyle.ts
// Ported from Terraink (features/map/infrastructure/maplibreStyle.ts).
// Adaptation: removed `import type { StyleSpecification } from 'maplibre-gl'`
// (type-only, no runtime dep). Return type is `unknown` — engine validates at runtime.

import { blendHex } from './color';
import { MAP_OVERZOOM_SCALE } from './constants';
import type { ResolvedTheme } from './types';

const OPENFREEMAP_SOURCE = 'https://tiles.openfreemap.org/planet';
const SOURCE_ID = 'openfreemap';

// ─── Street labels (Experiment 5) ──────────────────────────────────────────────
// SYNC INVARIANT: the block between this banner and its closing banner is
// byte-equivalent to the frontend copy (apps/frontend/src/entities/cityMap/theme/maplibreStyle.ts).
// It is self-contained (no render-only imports) so it can be copied verbatim.

/**
 * OpenFreeMap glyph (font) endpoint. Confirmed by Stage-0 spike: full Cyrillic
 * coverage (range 1024-1279) on "Noto Sans Regular"/"Noto Sans Bold"; "Noto Sans
 * Medium" and "Roboto" 404 — do not reference them. Public URL works for both the
 * browser preview (maplibre-gl-js) and the native render service (no localhost).
 */
const OPENFREEMAP_GLYPHS =
  'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';

/** OMT source-layer carrying road names (separate from `transportation` geometry). */
const TRANSPORTATION_NAME_SOURCE_LAYER = 'transportation_name';
const ROAD_LABELS_LAYER_ID = 'road-labels';
const STREET_LABEL_FONT = 'Noto Sans Regular';

/**
 * Road classes worth labeling on a poster. `service`/`path`/`track` are
 * courtyard/pedestrian noise at over-zoom and are intentionally excluded.
 */
const STREET_LABEL_CLASSES = [
  'primary',
  'primary_link',
  'secondary',
  'secondary_link',
  'tertiary',
  'tertiary_link',
  'minor',
];

const STREET_LABEL_MIN_ZOOM = 12;

// RU (default): local Cyrillic `name`. EN: latin where present, Cyrillic fallback
// (mixed-script accepted per spike — there is no clean all-Latin Russia).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STREET_LABEL_TEXT_FIELD_RU: any = ['coalesce', ['get', 'name'], ''];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STREET_LABEL_TEXT_FIELD_EN: any = [
  'coalesce',
  ['get', 'name:latin'],
  ['get', 'name:en'],
  ['get', 'name'],
  '',
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STREET_LABEL_FILTER: any = [
  'all',
  ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false],
  ['match', ['get', 'class'], STREET_LABEL_CLASSES, true, false],
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STREET_LABEL_TEXT_SIZE: any = [
  'interpolate',
  ['linear'],
  ['zoom'],
  12,
  11,
  14,
  13,
  16,
  15,
];
// ─── End street labels ─────────────────────────────────────────────────────────

const SOURCE_MAX_ZOOM = 14;

const BUILDING_BLEND_FACTOR = 0.14;
const BUILDING_FILL_OPACITY = 1;
const MAP_BUILDING_MIN_ZOOM_DEFAULT = 8;
const MAP_BUILDING_MIN_ZOOM_PRESERVE = 8.2;
const DETAIL_PRESERVE_DISTANCE_METERS = 30_000;

const MAP_WATERWAY_WIDTH_STOPS: [number, number][] = [
  [0, 0.2], [6, 0.34], [12, 0.8], [18, 2.4],
];
const MAP_RAIL_WIDTH_STOPS: [number, number][] = [
  [3, 0.4], [6, 0.7], [10, 1], [18, 1.5],
];
const MAP_ROAD_MAJOR_CLASSES = ['motorway'];
const MAP_ROAD_MINOR_HIGH_CLASSES = ['primary', 'primary_link', 'secondary', 'secondary_link', 'motorway_link', 'trunk', 'trunk_link'];
const MAP_ROAD_MINOR_MID_CLASSES = ['tertiary', 'tertiary_link', 'minor'];
const MAP_ROAD_MINOR_LOW_CLASSES = ['residential', 'living_street', 'unclassified', 'road', 'street', 'street_limited', 'service'];
const MAP_ROAD_PATH_CLASSES = ['path', 'pedestrian', 'cycleway', 'track'];
const MAP_RAIL_CLASSES = ['rail', 'transit'];

const MAP_ROAD_MINOR_HIGH_OVERVIEW_WIDTH_STOPS: [number, number][] = [[0, 0.1], [4, 0.18], [8, 0.3], [11, 0.46]];
const MAP_ROAD_MINOR_MID_OVERVIEW_WIDTH_STOPS: [number, number][] = [[0, 0.08], [4, 0.14], [8, 0.24], [11, 0.36]];
const MAP_ROAD_MINOR_LOW_OVERVIEW_WIDTH_STOPS: [number, number][] = [[0, 0.06], [4, 0.1], [8, 0.18], [11, 0.3]];
const MAP_ROAD_MINOR_HIGH_DETAIL_WIDTH_STOPS: [number, number][] = [[6, 0.46], [10, 0.8], [14, 1.48], [18, 2.7]];
const MAP_ROAD_MINOR_MID_DETAIL_WIDTH_STOPS: [number, number][] = [[6, 0.34], [10, 0.62], [14, 1.2], [18, 2.35]];
const MAP_ROAD_MINOR_LOW_DETAIL_WIDTH_STOPS: [number, number][] = [[6, 0.24], [10, 0.44], [14, 0.84], [18, 1.65]];
const MAP_ROAD_PATH_OVERVIEW_WIDTH_STOPS: [number, number][] = [[5, 0.06], [8, 0.1], [11, 0.2]];
const MAP_ROAD_PATH_DETAIL_WIDTH_STOPS: [number, number][] = [[8, 0.2], [12, 0.42], [16, 0.85], [18, 1.3]];
const MAP_ROAD_MAJOR_WIDTH_STOPS: [number, number][] = [[0, 0.36], [3, 0.52], [9, 1.1], [14, 2.05], [18, 3.3]];

const ROAD_MINOR_OVERVIEW_MIN_ZOOM = 0;
const ROAD_MINOR_DETAIL_MIN_ZOOM = 6;
const ROAD_PATH_OVERVIEW_MIN_ZOOM = 5;
const ROAD_PATH_DETAIL_MIN_ZOOM = 8;
const ROAD_OVERVIEW_MAX_ZOOM = 11.8;

const LINE_GEOMETRY_FILTER = ['match', ['geometry-type'], ['LineString', 'MultiLineString'], true, false] as const;
const OVERZOOM_LINE_WIDTH_SCALE = Math.pow(MAP_OVERZOOM_SCALE, 0.8);

function resolveBuildingMinZoom(distanceMeters?: number): number {
  if (Number.isFinite(distanceMeters) && Number(distanceMeters) <= DETAIL_PRESERVE_DISTANCE_METERS) {
    return MAP_BUILDING_MIN_ZOOM_PRESERVE;
  }
  return MAP_BUILDING_MIN_ZOOM_DEFAULT;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function widthExpr(stops: [number, number][]): any {
  const flat = stops.flatMap(([zoom, width]) => [zoom, width]);
  return ['interpolate', ['linear'], ['zoom'], ...flat];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function opacityExpr(stops: [number, number][]): any {
  const flat = stops.flatMap(([zoom, opacity]) => [zoom, opacity]);
  return ['interpolate', ['linear'], ['zoom'], ...flat];
}

function scaledStops(stops: [number, number][], scale: number): [number, number][] {
  return stops.map(([zoom, width]) => [zoom, width * scale]);
}

function compensateLineWidthStops(stops: [number, number][]): [number, number][] {
  return scaledStops(stops, OVERZOOM_LINE_WIDTH_SCALE);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lineClassFilter(classes: string[]): any {
  return ['all', LINE_GEOMETRY_FILTER, ['match', ['get', 'class'], classes, true, false]];
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
  distanceMeters?: number;
  /** Street labels (Experiment 5). Default true. */
  includeStreetLabels?: boolean;
  /** Label text language. 'en' = latin-with-fallback; anything else → 'ru'. */
  labelLanguage?: 'ru' | 'en';
  /** Reserved (DECISION 6): place labels. Default false; layer NOT emitted in Exp-5. */
  includePlaceLabels?: boolean;
}

// Return type is `unknown` — StyleSpecification type-only dep removed (was maplibre-gl import).
// MapLibre validates the object at runtime via map.load().
export function generateMapStyle(theme: ResolvedTheme, options?: LayerOptions): unknown {
  const buildingFill =
    theme.map.buildings ||
    blendHex(theme.map.land || '#ffffff', theme.ui.text || '#111111', BUILDING_BLEND_FACTOR);

  const includeLandcover = options?.includeLandcover ?? true;
  const includeBuildings = options?.includeBuildings ?? true;
  const includeWater = options?.includeWater ?? true;
  const includeParks = options?.includeParks ?? true;
  const includeAeroway = options?.includeAeroway ?? true;
  const includeRail = options?.includeRail ?? true;
  const includeRoads = options?.includeRoads ?? true;
  const includeRoadPath = options?.includeRoadPath ?? true;
  const includeRoadMinorLow = options?.includeRoadMinorLow ?? true;
  const includeRoadOutline = options?.includeRoadOutline ?? true;
  const includeStreetLabels = options?.includeStreetLabels ?? true;
  // Normalize in one place: any non-'en' value is treated as 'ru' (guards against
  // stale-persisted language strings).
  const labelLanguage = options?.labelLanguage === 'en' ? 'en' : 'ru';
  const buildingMinZoom = resolveBuildingMinZoom(options?.distanceMeters);

  const minorHighCasingStops = scaledStops(MAP_ROAD_MINOR_HIGH_DETAIL_WIDTH_STOPS, 1.45);
  const minorMidCasingStops = scaledStops(MAP_ROAD_MINOR_MID_DETAIL_WIDTH_STOPS, 1.15);
  const pathCasingStops = scaledStops(MAP_ROAD_PATH_DETAIL_WIDTH_STOPS, 1.6);
  const majorCasingStops = scaledStops(MAP_ROAD_MAJOR_WIDTH_STOPS, 1.38);
  const waterwayWidthStops = compensateLineWidthStops(MAP_WATERWAY_WIDTH_STOPS);
  const railWidthStops = compensateLineWidthStops(MAP_RAIL_WIDTH_STOPS);
  const roadMinorOverviewHighWidthStops = compensateLineWidthStops(MAP_ROAD_MINOR_HIGH_OVERVIEW_WIDTH_STOPS);
  const roadMinorOverviewMidWidthStops = compensateLineWidthStops(MAP_ROAD_MINOR_MID_OVERVIEW_WIDTH_STOPS);
  const roadMinorOverviewLowWidthStops = compensateLineWidthStops(MAP_ROAD_MINOR_LOW_OVERVIEW_WIDTH_STOPS);
  const roadPathOverviewWidthStops = compensateLineWidthStops(MAP_ROAD_PATH_OVERVIEW_WIDTH_STOPS);
  const roadMinorDetailHighWidthStops = compensateLineWidthStops(MAP_ROAD_MINOR_HIGH_DETAIL_WIDTH_STOPS);
  const roadMinorDetailMidWidthStops = compensateLineWidthStops(MAP_ROAD_MINOR_MID_DETAIL_WIDTH_STOPS);
  const roadMinorDetailLowWidthStops = compensateLineWidthStops(MAP_ROAD_MINOR_LOW_DETAIL_WIDTH_STOPS);
  const roadPathDetailWidthStops = compensateLineWidthStops(MAP_ROAD_PATH_DETAIL_WIDTH_STOPS);
  const roadMajorWidthStops = compensateLineWidthStops(MAP_ROAD_MAJOR_WIDTH_STOPS);
  const roadMinorHighCasingStops = compensateLineWidthStops(minorHighCasingStops);
  const roadMinorMidCasingStops = compensateLineWidthStops(minorMidCasingStops);
  const roadPathCasingStops = compensateLineWidthStops(pathCasingStops);
  const roadMajorCasingStops = compensateLineWidthStops(majorCasingStops);

  const roadMinorHighColor = theme.map.roads.minor_high;
  const roadMinorMidColor = theme.map.roads.minor_mid;
  const roadMinorLowColor = theme.map.roads.minor_low;
  const roadPathColor = theme.map.roads.path;
  const roadOutlineColor = theme.map.roads.outline;
  const V = (b: boolean) => b ? 'visible' : 'none';
  const roadsVis = V(includeRoads);

  return {
    version: 8,
    glyphs: OPENFREEMAP_GLYPHS,
    sources: {
      [SOURCE_ID]: { type: 'vector', url: OPENFREEMAP_SOURCE, maxzoom: SOURCE_MAX_ZOOM },
    },
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': theme.map.land } },
      { id: 'landcover', source: SOURCE_ID, 'source-layer': 'landcover', type: 'fill', layout: { visibility: V(includeLandcover) }, paint: { 'fill-color': theme.map.landcover, 'fill-opacity': 1 } },
      { id: 'park', source: SOURCE_ID, 'source-layer': 'park', type: 'fill', layout: { visibility: V(includeParks) }, paint: { 'fill-color': theme.map.parks } },
      { id: 'water', source: SOURCE_ID, 'source-layer': 'water', type: 'fill', layout: { visibility: V(includeWater) }, paint: { 'fill-color': theme.map.water } },
      { id: 'waterway', source: SOURCE_ID, 'source-layer': 'waterway', type: 'line', filter: lineClassFilter(['river', 'canal', 'stream', 'ditch']), paint: { 'line-color': theme.map.waterway, 'line-width': widthExpr(waterwayWidthStops) }, layout: { visibility: V(includeWater), 'line-cap': 'round', 'line-join': 'round' } },
      { id: 'aeroway', source: SOURCE_ID, 'source-layer': 'aeroway', type: 'fill', filter: ['match', ['geometry-type'], ['MultiPolygon', 'Polygon'], true, false], layout: { visibility: V(includeAeroway) }, paint: { 'fill-color': theme.map.aeroway, 'fill-opacity': 1 } },
      { id: 'building', source: SOURCE_ID, 'source-layer': 'building', type: 'fill', minzoom: buildingMinZoom, layout: { visibility: V(includeBuildings) }, paint: { 'fill-color': buildingFill, 'fill-opacity': BUILDING_FILL_OPACITY } },
      { id: 'rail', source: SOURCE_ID, 'source-layer': 'transportation', type: 'line', filter: lineClassFilter(MAP_RAIL_CLASSES), paint: { 'line-color': theme.map.rail, 'line-width': widthExpr(railWidthStops), 'line-opacity': opacityExpr([[0, 0.56], [12, 0.62], [18, 0.72]]), 'line-dasharray': [2, 1.6] }, layout: { visibility: V(includeRail), 'line-cap': 'round', 'line-join': 'round' } },
      { id: 'road-minor-overview-high', source: SOURCE_ID, 'source-layer': 'transportation', type: 'line', minzoom: ROAD_MINOR_OVERVIEW_MIN_ZOOM, maxzoom: ROAD_OVERVIEW_MAX_ZOOM, filter: lineClassFilter(MAP_ROAD_MINOR_HIGH_CLASSES), paint: { 'line-color': roadMinorHighColor, 'line-width': widthExpr(roadMinorOverviewHighWidthStops), 'line-opacity': opacityExpr([[0, 0.66], [8, 0.76], [12, 0]]) }, layout: { visibility: roadsVis, 'line-cap': 'round', 'line-join': 'round' } },
      { id: 'road-minor-overview-mid', source: SOURCE_ID, 'source-layer': 'transportation', type: 'line', minzoom: ROAD_MINOR_OVERVIEW_MIN_ZOOM, maxzoom: ROAD_OVERVIEW_MAX_ZOOM, filter: lineClassFilter(MAP_ROAD_MINOR_MID_CLASSES), paint: { 'line-color': roadMinorMidColor, 'line-width': widthExpr(roadMinorOverviewMidWidthStops), 'line-opacity': opacityExpr([[0, 0.46], [8, 0.56], [12, 0]]) }, layout: { visibility: roadsVis, 'line-cap': 'round', 'line-join': 'round' } },
      { id: 'road-minor-overview-low', source: SOURCE_ID, 'source-layer': 'transportation', type: 'line', minzoom: ROAD_MINOR_OVERVIEW_MIN_ZOOM, maxzoom: ROAD_OVERVIEW_MAX_ZOOM, filter: lineClassFilter(MAP_ROAD_MINOR_LOW_CLASSES), paint: { 'line-color': roadMinorLowColor, 'line-width': widthExpr(roadMinorOverviewLowWidthStops), 'line-opacity': includeRoadMinorLow ? opacityExpr([[0, 0.26], [8, 0.34], [12, 0]]) : 0 }, layout: { visibility: roadsVis, 'line-cap': 'round', 'line-join': 'round' } },
      { id: 'road-path-overview', source: SOURCE_ID, 'source-layer': 'transportation', type: 'line', minzoom: ROAD_PATH_OVERVIEW_MIN_ZOOM, maxzoom: ROAD_OVERVIEW_MAX_ZOOM, filter: lineClassFilter(MAP_ROAD_PATH_CLASSES), paint: { 'line-color': roadPathColor, 'line-width': widthExpr(roadPathOverviewWidthStops), 'line-opacity': includeRoadPath ? opacityExpr([[5, 0.45], [9, 0.58], [12, 0]]) : 0 }, layout: { visibility: roadsVis, 'line-cap': 'round', 'line-join': 'round' } },
      { id: 'road-major-casing', source: SOURCE_ID, 'source-layer': 'transportation', type: 'line', filter: lineClassFilter(MAP_ROAD_MAJOR_CLASSES), paint: { 'line-color': roadOutlineColor, 'line-width': widthExpr(roadMajorCasingStops), 'line-opacity': includeRoadOutline ? 0.95 : 0 }, layout: { visibility: roadsVis, 'line-cap': 'round', 'line-join': 'round' } },
      { id: 'road-minor-high-casing', source: SOURCE_ID, 'source-layer': 'transportation', type: 'line', minzoom: ROAD_MINOR_DETAIL_MIN_ZOOM, filter: lineClassFilter(MAP_ROAD_MINOR_HIGH_CLASSES), paint: { 'line-color': roadOutlineColor, 'line-width': widthExpr(roadMinorHighCasingStops), 'line-opacity': includeRoadOutline ? opacityExpr([[6, 0.72], [12, 0.85], [18, 0.92]]) : 0 }, layout: { visibility: roadsVis, 'line-cap': 'round', 'line-join': 'round' } },
      { id: 'road-minor-mid-casing', source: SOURCE_ID, 'source-layer': 'transportation', type: 'line', minzoom: ROAD_MINOR_DETAIL_MIN_ZOOM, filter: lineClassFilter(MAP_ROAD_MINOR_MID_CLASSES), paint: { 'line-color': roadOutlineColor, 'line-width': widthExpr(roadMinorMidCasingStops), 'line-opacity': includeRoadOutline ? opacityExpr([[6, 0.42], [12, 0.56], [18, 0.66]]) : 0 }, layout: { visibility: roadsVis, 'line-cap': 'round', 'line-join': 'round' } },
      { id: 'road-path-casing', source: SOURCE_ID, 'source-layer': 'transportation', type: 'line', minzoom: ROAD_PATH_DETAIL_MIN_ZOOM, filter: lineClassFilter(MAP_ROAD_PATH_CLASSES), paint: { 'line-color': roadOutlineColor, 'line-width': widthExpr(roadPathCasingStops), 'line-opacity': (includeRoadOutline && includeRoadPath) ? opacityExpr([[8, 0.62], [12, 0.72], [18, 0.85]]) : 0 }, layout: { visibility: roadsVis, 'line-cap': 'round', 'line-join': 'round' } },
      { id: 'road-major', source: SOURCE_ID, 'source-layer': 'transportation', type: 'line', filter: lineClassFilter(MAP_ROAD_MAJOR_CLASSES), paint: { 'line-color': theme.map.roads.major, 'line-width': widthExpr(roadMajorWidthStops) }, layout: { visibility: roadsVis, 'line-cap': 'round', 'line-join': 'round' } },
      { id: 'road-minor-high', source: SOURCE_ID, 'source-layer': 'transportation', type: 'line', minzoom: ROAD_MINOR_DETAIL_MIN_ZOOM, filter: lineClassFilter(MAP_ROAD_MINOR_HIGH_CLASSES), paint: { 'line-color': roadMinorHighColor, 'line-width': widthExpr(roadMinorDetailHighWidthStops), 'line-opacity': opacityExpr([[6, 0.84], [10, 0.92], [18, 1]]) }, layout: { visibility: roadsVis, 'line-cap': 'round', 'line-join': 'round' } },
      { id: 'road-minor-mid', source: SOURCE_ID, 'source-layer': 'transportation', type: 'line', minzoom: ROAD_MINOR_DETAIL_MIN_ZOOM, filter: lineClassFilter(MAP_ROAD_MINOR_MID_CLASSES), paint: { 'line-color': roadMinorMidColor, 'line-width': widthExpr(roadMinorDetailMidWidthStops), 'line-opacity': opacityExpr([[6, 0.62], [10, 0.74], [18, 0.86]]) }, layout: { visibility: roadsVis, 'line-cap': 'round', 'line-join': 'round' } },
      { id: 'road-minor-low', source: SOURCE_ID, 'source-layer': 'transportation', type: 'line', minzoom: ROAD_MINOR_DETAIL_MIN_ZOOM, filter: lineClassFilter(MAP_ROAD_MINOR_LOW_CLASSES), paint: { 'line-color': roadMinorLowColor, 'line-width': widthExpr(roadMinorDetailLowWidthStops), 'line-opacity': includeRoadMinorLow ? opacityExpr([[6, 0.34], [10, 0.46], [18, 0.58]]) : 0 }, layout: { visibility: roadsVis, 'line-cap': 'round', 'line-join': 'round' } },
      { id: 'road-path', source: SOURCE_ID, 'source-layer': 'transportation', type: 'line', minzoom: ROAD_PATH_DETAIL_MIN_ZOOM, filter: lineClassFilter(MAP_ROAD_PATH_CLASSES), paint: { 'line-color': roadPathColor, 'line-width': widthExpr(roadPathDetailWidthStops), 'line-opacity': includeRoadPath ? opacityExpr([[8, 0.7], [12, 0.82], [18, 0.95]]) : 0 }, layout: { visibility: roadsVis, 'line-cap': 'round', 'line-join': 'round' } },

      // ─── road-labels (Experiment 5) — SYNC INVARIANT with frontend copy ───────
      // Self-contained symbol layer drawn last (on top of geometry). Toggled at
      // build time by `includeStreetLabels`; `labelLanguage` switches text-field.
      // The only non-literal input is `theme.map.label` (a resolved {text,halo}).
      {
        id: ROAD_LABELS_LAYER_ID,
        source: SOURCE_ID,
        'source-layer': TRANSPORTATION_NAME_SOURCE_LAYER,
        type: 'symbol' as const,
        minzoom: STREET_LABEL_MIN_ZOOM,
        filter: STREET_LABEL_FILTER,
        layout: {
          visibility: includeStreetLabels
            ? ('visible' as const)
            : ('none' as const),
          'symbol-placement': 'line' as const,
          'symbol-spacing': 250,
          'text-field':
            labelLanguage === 'en'
              ? STREET_LABEL_TEXT_FIELD_EN
              : STREET_LABEL_TEXT_FIELD_RU,
          'text-font': [STREET_LABEL_FONT],
          'text-size': STREET_LABEL_TEXT_SIZE,
          'text-padding': 2,
        },
        paint: {
          'text-color': theme.map.label.text,
          'text-halo-color': theme.map.label.halo,
          'text-halo-width': 1.4,
          'text-halo-blur': 0.4,
        },
      },
      // ─── End road-labels ──────────────────────────────────────────────────────
    ],
  };
}
