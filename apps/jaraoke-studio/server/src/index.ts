import { routeResponseTime } from 'jaraoke-shared/server/middlewares/route-response-time';
import { isProd } from 'jaraoke-shared/server/utils/is-prod';
import { createLogger } from 'jaraoke-shared/server/utils/logger';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { HOST, PORT } from './constants';
import { apiRouter } from './routers/api';
import { publicRouter } from './routers/public';

const app = new Koa();

const logger = createLogger('server');

app.use(routeResponseTime(logger));

app.use(bodyParser());
app.use(apiRouter.routes()).use(apiRouter.allowedMethods());

if (isProd()) {
  logger.info('Env is production - serving public and assets');
  app.use(publicRouter.routes()).use(publicRouter.allowedMethods());
}

app.listen(PORT, HOST, () => {
  logger.info(`Jaraoke Studio backend listening on ${HOST}:${PORT}`);
});

process.on('uncaughtException', (err) => {
  if (err) {
    logger.error({ stack: err.stack }, err.message);
  }
});
