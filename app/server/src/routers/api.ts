import { PassThrough } from 'node:stream';
import Router from '@koa/router';
import { eventEmitter, sendEvent } from '../utils/event-system';

export const apiRouter = new Router({
  prefix: '/api',
});

apiRouter.get('/events', (ctx) => {
  const stream = new PassThrough();

  eventEmitter.on('event', (data: string) => stream.write(data));

  sendEvent('connected');

  ctx.request.socket.setTimeout(0);
  ctx.req.socket.setNoDelay(true);
  ctx.req.socket.setKeepAlive(true);

  ctx.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  ctx.req.on('close', () => stream.end());

  ctx.body = stream;
});
