import { loadLocalEnv } from './env.js';

loadLocalEnv();

const { serve } = await import('@hono/node-server');
const { default: app } = await import('./app.js');

const port = Number(process.env.PORT ?? 5174);
serve({ fetch: app.fetch, port, hostname: '0.0.0.0' }, (info) => {
  console.log(`Guess The Prompt server running on http://localhost:${info.port}`);
});
