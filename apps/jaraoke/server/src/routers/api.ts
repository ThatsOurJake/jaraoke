import fs, { createReadStream } from 'node:fs';
import path from 'node:path';
import Router from '@koa/router';

import { directories } from '../constants';
import { store } from '../data/store';
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
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = ctx.headers.range;

  ctx.set('Accept-Ranges', 'bytes');
  ctx.set('Content-Type', fileExtToMimeTypes(fileExt));

  if (range) {
    // Parse range header (e.g., "bytes=0-1023")
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    ctx.status = 206;
    ctx.set('Content-Range', `bytes ${start}-${end}/${fileSize}`);
    ctx.set('Content-Length', chunkSize.toString());
    ctx.body = createReadStream(filePath, { start, end });
  } else {
    // No range requested, send full file
    ctx.set('Content-Length', fileSize.toString());
    ctx.body = createReadStream(filePath);
  }
});

apiRouter.get('/client-settings', (ctx) => {
  const { settings } = store;

  ctx.body = {
    player: settings.player,
  };
});

apiRouter.get('/health', (ctx) => {
  const { karaokeFiles, readyState } = store;

  ctx.body = {
    ready: readyState.isReady,
    importedTracks: karaokeFiles.length,
  };
});
