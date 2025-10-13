import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { bootstrap } from './bootstrap';
import { PORT } from './constants';
import { apiRouter } from './routers/api';
import { createLogger } from './utils/logger';

const app = new Koa();
const logger = createLogger('SERVER');

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

app.listen(PORT, () => {
  logger.info(`Jaraoke backend started on port: ${PORT}`);
  bootstrap();
});
