import path from 'node:path';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import mount from 'koa-mount';
import serve from 'koa-static';

import { bootstrap } from './bootstrap';
import { IS_PRODUCTION, PORT } from './constants';
import { apiRouter } from './routers/api';
import { publicRouter } from './routers/public';
import { createLogger } from './utils/logger';

const app = new Koa();
const logger = createLogger('server');

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  const route = ctx._matchedRoute || ctx.url;
  const method = ctx.method;
  logger.info(`${method} ${route} - ${ms}ms`);
});

app.use(bodyParser());
app.use(apiRouter.routes()).use(apiRouter.allowedMethods());

if (IS_PRODUCTION) {
  logger.info('Env is production - serving public and assets');
  app.use(mount('/public', serve(path.join(__dirname, 'public'))));
  app.use(mount('/assets', serve(path.join(__dirname, 'assets'))));
  app.use(publicRouter.routes()).use(publicRouter.allowedMethods());
}

app.listen(PORT, () => {
  logger.info(`Jaraoke backend started on port: ${PORT}`);
  bootstrap();
});

process.on('uncaughtException', (err) => {
  if (err) {
    logger.error({ stack: err.stack }, err.message);
  }
});
