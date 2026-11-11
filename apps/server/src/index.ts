import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fastifyStatic from '@fastify/static';
import { createApp } from './app.js';
export { createApp } from './app.js';

async function start() {
  const app = createApp({ logger: true });
  const webRoot = fileURLToPath(new URL('../../web/dist/', import.meta.url));
  if (existsSync(webRoot)) {
    await app.register(fastifyStatic, { root: webRoot });
  }
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => { void app.close().then(() => process.exit(0)); });
  }
  try { await app.listen({ host: process.env.HOST ?? '127.0.0.1', port: Number(process.env.PORT ?? 3001) }); }
  catch (error) { app.log.error(error); await app.close(); process.exitCode = 1; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void start();
