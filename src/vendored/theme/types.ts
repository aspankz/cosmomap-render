// Vendored from apps/frontend/src/entities/cityMap/theme/types.ts
// Ported from Terraink (features/theme/domain/types.ts) for the CityMap engine.
export interface ThemeUiColors {
  bg: string;
  text: string;
}

export interface ThemeRoadColors {
  major: string;
  minor_high: string;
  minor_mid: string;
  minor_low: string;
  path: string;
  outline: string;
}

export interface ThemeMapColors {
  land: string;
  landcover: string;
  water: string;
  waterway: string;
  parks: string;
  buildings: string;
  aeroway: string;
  rail: string;
  roads: ThemeRoadColors;
}

export interface ThemeColors {
  ui: ThemeUiColors;
  map: ThemeMapColors;
}

export interface ResolvedTheme extends ThemeColors {
  name: string;
  description: string;
}

export type ThemeColorKey =
  | 'ui.bg'
  | 'ui.text'
  | 'map.land'
  | 'map.landcover'
  | 'map.water'
  | 'map.waterway'
  | 'map.parks'
  | 'map.buildings'
  | 'map.aeroway'
  | 'map.rail'
  | 'map.roads.major'
  | 'map.roads.minor_high'
  | 'map.roads.minor_mid'
  | 'map.roads.minor_low'
  | 'map.roads.path'
  | 'map.roads.outline';

export interface ThemeOption {
  id: string;
  name: string;
  description: string;
  palette: string[];
}

export const DISPLAY_PALETTE_KEYS: ThemeColorKey[] = [
  'ui.bg',
  'ui.text',
  'map.land',
  'map.landcover',
  'map.water',
  'map.waterway',
  'map.parks',
  'map.buildings',
  'map.aeroway',
  'map.rail',
  'map.roads.major',
  'map.roads.minor_high',
  'map.roads.minor_mid',
  'map.roads.minor_low',
  'map.roads.path',
  'map.roads.outline',
];
