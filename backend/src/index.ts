import './instrument.js';
import { serve } from '@hono/node-server';
import { app } from './app.js';
import { env } from './config/index.js';

console.log(`Starting O Meu Banco API on port ${env.PORT}...`);

serve({
  fetch: app.fetch,
  port: env.PORT,
});

console.log(`API running at http://localhost:${env.PORT}`);
