/**
 * cosmomap-render — CityMap server-side render service.
 * POST /render  → image/png
 * GET  /health  → 200 JSON
 *
 * Derives from Terraink; licensed AGPL-3.0.
 */
import Fastify from 'fastify';
import { normalizeAndValidateParams, ValidationError } from './renderParams';
import { renderMap, getQueueStats } from './renderQueue';
import { getCacheStats } from './tileClient';

const PORT = parseInt(process.env['PORT'] ?? '3030', 10);
const HOST = process.env['HOST'] ?? '0.0.0.0';

const app = Fastify({ logger: { level: process.env['LOG_LEVEL'] ?? 'info' } });

// Health
app.get('/health', async (_req, reply) => {
  reply.send({
    status: 'ok',
    queue: getQueueStats(),
    tileCache: getCacheStats(),
  });
});

// Render
app.post('/render', {
  config: {},
}, async (req, reply) => {
  let params;
  try {
    params = normalizeAndValidateParams(req.body);
  } catch (err) {
    if (err instanceof ValidationError) {
      return reply.status(400).send({ error: err.message });
    }
    return reply.status(400).send({ error: 'Invalid request body' });
  }

  try {
    const png = await renderMap(params);
    return reply
      .header('Content-Type', 'image/png')
      .header('Content-Length', png.length)
      .send(png);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err ?? 'unknown');
    req.log.error({ err }, 'Render failed');
    // 422 so .NET Polly retry fires on tile/render failure
    return reply.status(422).send({ error: 'Render failed', detail: msg });
  }
});

// Start
async function start(): Promise<void> {
  await app.listen({ port: PORT, host: HOST });
  console.log(`cosmomap-render listening on http://${HOST}:${PORT}`);
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
