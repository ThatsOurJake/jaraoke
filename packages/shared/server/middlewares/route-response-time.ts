import type { Logger } from "pino";
import type { Context, Next } from 'koa';

export const routeResponseTime = (logger: Logger) => async (ctx: Context, next: Next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  const route = ctx._matchedRoute || ctx.url;
  const method = ctx.method;
  logger.info(`${method} ${route} - ${ms}ms`);
};
