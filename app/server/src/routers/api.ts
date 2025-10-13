import { PassThrough } from 'node:stream';
import Router from '@koa/router';
import type { PlayPayload } from 'jaraoke-shared/types';
import { store } from '../data/store';
import { playKaraoke } from '../services/mpv/play-karaoke';
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

apiRouter.get('/songs', (ctx) => {
  ctx.body = store.karaokeFiles;
});

apiRouter.post('/play', (ctx) => {
  const payload = ctx.request.body as PlayPayload;

  if (!payload.id) {
    ctx.status = 400;
    ctx.body = {
      errors: ['Id is required'],
    };

    return;
  }

  const foundTrack = store.karaokeFiles.find((x) => x.id === payload.id);

  if (!foundTrack) {
    ctx.status = 404;

    ctx.body = {
      errors: [`Cannot find tracks with id: ${payload.id}`],
    };

    return;
  }

  playKaraoke(foundTrack, payload.trackVolumes);

  ctx.status = 202;
});
