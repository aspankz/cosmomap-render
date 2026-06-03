/**
 * BYO tile fetcher for maplibre-gl-native.
 * - Follows redirects
 * - Real User-Agent
 * - In-memory LRU cache keyed by URL
 * - Retry 3x with exponential backoff
 */
import { request as httpsRequest, get as httpsGet } from 'node:https';
import { request as httpRequest } from 'node:http';
import { URL } from 'node:url';

const CACHE_MAX_SIZE = 512;
const TILE_CACHE = new Map<string, Buffer>();
const CACHE_ORDER: string[] = [];

const USER_AGENT = 'cosmomap-render/1.0 (https://cosmomap.ru)';
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 500;

function cacheGet(url: string): Buffer | undefined {
  return TILE_CACHE.get(url);
}

function cacheSet(url: string, data: Buffer): void {
  if (TILE_CACHE.has(url)) return; // already present
  if (CACHE_ORDER.length >= CACHE_MAX_SIZE) {
    const evict = CACHE_ORDER.shift()!;
    TILE_CACHE.delete(evict);
  }
  TILE_CACHE.set(url, data);
  CACHE_ORDER.push(url);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetchUrl(url: string, redirectDepth = 0): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    if (redirectDepth > 5) return reject(new Error('Too many redirects'));

    const parsed = new URL(url);
    const lib = parsed.protocol === 'https:' ? httpsRequest : httpRequest;

    const req = lib(
      url,
      {
        headers: { 'User-Agent': USER_AGENT },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        const { statusCode = 0, headers } = res;

        if (statusCode >= 300 && statusCode < 400 && headers.location) {
          res.resume();
          const redirectUrl = headers.location.startsWith('http')
            ? headers.location
            : new URL(headers.location, url).toString();
          return fetchUrl(redirectUrl, redirectDepth + 1).then(resolve, reject);
        }

        if (statusCode < 200 || statusCode >= 300) {
          res.resume();
          return reject(new Error(`HTTP ${statusCode} for ${url}`));
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${url}`));
    });
    req.on('error', reject);
    req.end();
  });
}

async function fetchWithRetry(url: string): Promise<Buffer> {
  const cached = cacheGet(url);
  if (cached) return cached;

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(RETRY_BASE_MS * Math.pow(2, attempt - 1));
    try {
      const data = await fetchUrl(url);
      cacheSet(url, data);
      return data;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

/** The request callback for new mbgl.Map({ request, ratio }) */
export function makeTileRequestCallback() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function requestCallback(req: any, callback: any): void {
    fetchWithRetry(String(req.url))
      .then((data: Buffer) => callback(undefined, { data }))
      .catch((err: unknown) => callback(err instanceof Error ? err : new Error(String(err))));
  };
}

export function getCacheStats(): { size: number; maxSize: number } {
  return { size: TILE_CACHE.size, maxSize: CACHE_MAX_SIZE };
}
