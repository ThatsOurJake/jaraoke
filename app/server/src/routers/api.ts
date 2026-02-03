import fs, { createReadStream } from 'node:fs';
import path from 'node:path';

import Router from '@koa/router';
import type { PlayPayload } from 'jaraoke-shared/types';
import { directories } from '../constants';
import { store } from '../data/store';
import { playKaraoke } from '../services/mpv/play-karaoke';
import { fileExtToMimeTypes } from '../utils/mime-type';

export const apiRouter = new Router({
  prefix: '/api',
});

apiRouter.get('/songs', (ctx) => {
  // TODO: Sort method
  const output = store.karaokeFiles.sort((a, b) =>
    a.metadata.title.localeCompare(b.metadata.title),
  );

  ctx.body = output;
});

apiRouter.get('/song/:id', (ctx) => {
  const { id } = ctx.params;
  const song = store.karaokeFiles.find((x) => x.id === id);

  if (!id || !song) {
    ctx.status = 404;
    ctx.body = {
      errors: ['Song is not found with that that id'],
    };

    return;
  }

  ctx.body = song;
});

apiRouter.get('/song/:id/:fileName', (ctx) => {
  const { id, fileName } = ctx.params;
  const song = store.karaokeFiles.find((x) => x.id === id);

  if (!id || !song) {
    ctx.status = 404;
    ctx.body = {
      errors: ['Song is not found with that that id'],
    };

    return;
  }

  const songDir = path.join(directories.songs, song.parentDir!);
  const filePath = path.join(songDir, fileName);

  if (!fs.existsSync(filePath)) {
    ctx.status = 404;
    ctx.body = {
      errors: ['File Path does not exist'],
    };

    return;
  }

  const fileExt = path.extname(fileName);
  const stream = createReadStream(filePath);
  ctx.headers['content-type'] = fileExtToMimeTypes(fileExt);
  ctx.body = stream;
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

  const foundSong = store.karaokeFiles.find((x) => x.id === payload.id);

  if (!foundSong) {
    ctx.status = 404;

    ctx.body = {
      errors: [`Cannot find tracks with id: ${payload.id}`],
    };

    return;
  }

  playKaraoke(foundSong, payload.trackVolumes);

  ctx.status = 202;
});

apiRouter.get('/client-settings', (ctx) => {
  const { settings } = store;

  ctx.body = {
    player: settings.player,
  };
});
