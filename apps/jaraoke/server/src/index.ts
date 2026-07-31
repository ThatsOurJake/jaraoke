import path from 'node:path';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import mount from 'koa-mount';
import serve from 'koa-static';

import { bootstrap } from './bootstrap';
import { HOST, PORT } from './constants';
import { apiRouter } from './routers/api';
import { publicRouter } from './routers/public';
import { isProd } from 'jaraoke-shared/server/utils/is-prod.js';
import { createLogger } from 'jaraoke-shared/server/utils/logger';
import { routeResponseTime } from 'jaraoke-shared/server/middlewares/route-response-time.js';

const app = new Koa();
const logger = createLogger('server');

app.use(routeResponseTime(logger));

app.use(bodyParser());
app.use(apiRouter.routes()).use(apiRouter.allowedMethods());

if (isProd()) {
  logger.info('Env is production - serving public and assets');
  app.use(mount('/public', serve(path.join(__dirname, 'public'))));
  app.use(mount('/assets', serve(path.join(__dirname, 'assets'))));
  app.use(publicRouter.routes()).use(publicRouter.allowedMethods());
}

app.listen(PORT, HOST, () => {
  logger.info(`Jaraoke backend listening on ${HOST}:${PORT}`);
  // Defer bootstrap so the event loop can serve at least one tick
  // (e.g. the splash-screen request) before any sync bootstrap work starts.
  setImmediate(async () => {
    try {
      await bootstrap();
      logger.info('Bootstrap complete — server is ready');
    } catch (err: unknown) {
      logger.error({ err }, 'Bootstrap failed');
    }
  });
});

process.on('uncaughtException', (err) => {
  if (err) {
    logger.error({ stack: err.stack }, err.message);
  }
});
