# cosmomap-render

Server-side map render service for CityMap (cosmomap.ru).
Renders poster-quality map PNGs with symbol compositing, used by the .NET backend for PDF generation.

## License

**AGPL-3.0** — this service derives from [Terraink](https://github.com/aspankz/terraink)
(the map style engine: `generateMapStyle`, theme repository, color utilities, symbol paths).
Source code is available in this repository per AGPL requirements.

## What it does

- `POST /render` — accepts RenderParams JSON, returns a raw `image/png` (map + symbols, no plaque)
- `GET /health` — returns 200 with queue/cache stats
- Engine: `@maplibre/maplibre-gl-native` v6.4.1 (headless, no browser)
- Tiles: public OpenFreeMap (`tiles.openfreemap.org/planet`) with in-memory LRU cache + retry
- Symbol compositing: Web Mercator projection, center anchor, via `sharp`

## RenderParams contract

```jsonc
{
  "center": [37.6173, 55.7558],   // [lng, lat] — REQUIRED (with framingZoom)
  "framingZoom": 11.0,            // device-independent framing zoom — REQUIRED
  "bounds": null,                 // alt to center+zoom (unused this phase)
  "overzoomScale": 5.5,           // detail multiplier; renders at zoom = framingZoom + log2(overzoomScale)
  "width": 595,                   // logical px — REQUIRED
  "height": 850,                  // logical px — REQUIRED
  "ratio": 4,                     // DPI multiplier; device px = width*ratio x height*ratio
  "orientation": "portrait",      // "portrait" | "landscape" — explicit, not derived
  "themeId": "classic_night",     // theme id (see themes.json) — REQUIRED
  "colorOverrides": {},           // ThemeColorKey → hex
  "layerOptions": {},             // include-flags (all true by default)
  "distanceMeters": null,         // building min-zoom control
  "symbols": [
    {
      "type": "PIN",              // EMapSymbol: HEART|PIN|PIN2|STAR|PIN3|FLAG|HOUSE|PLANE
      "color": "#121927",         // hex
      "lng": 37.6173,
      "lat": 55.7558,
      "size": 1.0                 // logical multiplier 0.5–3.0
    }
  ]
}
```

Validation: 400 if center+framingZoom and bounds both missing, or width/height/themeId missing,
or device pixels exceed ~40MP. 422 on tile/render failure.

## Running locally (macOS — no xvfb needed, headless EGL works natively)

```bash
npm install
npm run dev         # tsx src/server.ts, port 3030 by default

# or build + start:
npm run build && npm start
```

Environment variables:
- `PORT` — HTTP port (default `3030`)
- `HOST` — bind host (default `0.0.0.0`)
- `LOG_LEVEL` — fastify log level (default `info`)

## Running in Docker (Linux/amd64 — requires xvfb, Ubuntu 24.04 base)

```bash
npm run build
docker build -t cosmomap-render .
docker run -p 3030:3030 cosmomap-render
```

The Dockerfile wraps the server in `xvfb-run -a` (required for the GLX backend on Linux).
Base image must be Ubuntu 24.04 — the `mbgl.node` prebuilt is built against glibc 2.38 / ICU 74 / libjpeg.so.8.

## Vendored modules

The `src/vendored/` directory contains a derivative of the Terraink map style engine, adapted for
Node.js (stripped FSD `@/` path aliases, removed `maplibre-gl` type-only import, replaced
`StyleSpecification` return type with `unknown`). Original: `apps/frontend/src/entities/cityMap/`.
