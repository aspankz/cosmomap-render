// Vendored from apps/frontend/src/entities/cityMap/model/mapSymbols.ts
export enum EMapSymbol {
  HEART = 'HEART',
  PIN = 'PIN',
  PIN2 = 'PIN2',
  STAR = 'STAR',
  PIN3 = 'PIN3',
  FLAG = 'FLAG',
  HOUSE = 'HOUSE',
  PLANE = 'PLANE',
}

export const MAP_SYMBOL_COLORS = [
  '#121927',
  '#5E45FF',
  '#2CB833',
  '#FFCC41',
  '#FD4949',
] as const;

export type MapSymbolColor = (typeof MAP_SYMBOL_COLORS)[number];

export interface MapSymbol {
  id: string;
  symbol: EMapSymbol;
  color: MapSymbolColor;
  position: [number, number];
  size?: number;
}
