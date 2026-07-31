import fs from 'node:fs/promises';
import path from 'node:path';
import Router from '@koa/router';
import Koa from 'koa';
import serve from 'koa-static';
import { createLogger } from 'jaraoke-shared/server/utils/logger';
import { routeResponseTime } from 'jaraoke-shared/server/middlewares/route-response-time';
import { isProd } from 'jaraoke-shared/server/utils/is-prod.js';
import { HOST, PORT } from './constants';

const app = new Koa();
const router = new Router({ prefix: '/api' });

const logger = createLogger('server');

app.use(routeResponseTime(logger));

app.use(router.routes()).use(router.allowedMethods());

if (isProd()) {
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
});

process.on('uncaughtException', (err) => {
  if (err) {
    logger.error({ stack: err.stack }, err.message);
  }
});
