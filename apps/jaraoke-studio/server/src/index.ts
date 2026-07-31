import fs from 'node:fs/promises';
import path from 'node:path';
import getAppDataPath from 'appdata-path';
import Router from '@koa/router';
import Koa from 'koa';
import serve from 'koa-static';
import pino from 'pino';
import {
  getSharedGreeting,
  type StudioHealthResponse,
} from 'jaraoke-shared/hello';

const PORT = parseInt(process.env['PORT'] ?? '9898', 10);
const HOST = process.env['HOST'] ?? '127.0.0.1';
const IS_PRODUCTION = process.env['NODE_ENV'] === 'production';
const APP_NAME = IS_PRODUCTION ? 'jaraoke-studio' : 'jaraoke-studio-dev';
const rootDir = getAppDataPath(APP_NAME);

const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  transport: IS_PRODUCTION
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      },
  base: {
    pid: false,
  },
}).child({ name: 'STUDIO' });

const app = new Koa();
const router = new Router({ prefix: '/api' });

router.get('/health', (ctx) => {
  const body: StudioHealthResponse = {
    product: 'jaraoke-studio',
    appName: APP_NAME,
    greeting: getSharedGreeting('jaraoke-studio'),
    status: 'ok',
  };

  ctx.body = body;
});

router.get('/projects', (ctx) => {
  ctx.body = {
    product: 'jaraoke-studio',
    items: [],
  };
});

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  logger.info(`${ctx.method} ${ctx.path} ${ctx.status} ${Date.now() - start}ms`);
});

app.use(router.routes()).use(router.allowedMethods());

if (IS_PRODUCTION) {
  const publicDir = path.join(__dirname, 'public');
  const indexPath = path.join(publicDir, 'index.html');

  app.use(serve(publicDir));
  app.use(async (ctx, next) => {
    if (ctx.path.startsWith('/api')) {
      await next();
      return;
    }

    ctx.type = 'html';
    ctx.body = await fs.readFile(indexPath, 'utf8');
  });
}

app.listen(PORT, HOST, () => {
  logger.info(`Jaraoke Studio backend listening on ${HOST}:${PORT}`);
  logger.info(`Studio app data root: ${rootDir}`);
});
