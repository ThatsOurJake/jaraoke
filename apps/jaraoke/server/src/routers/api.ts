import fs, { createReadStream } from 'node:fs';
import path from 'node:path';
import Router from '@koa/router';
import type { CombinedJaraokeFiles } from 'jaraoke-shared/types';
import { directories } from '../constants';
import { store } from '../data/store';
import { createLogger } from '../utils/logger';
import { fileExtToMimeTypes } from '../utils/mime-type';
import { reprocessSong } from '../utils/song-dir-processor';

export const apiRouter = new Router({
  prefix: '/api',
});

const logger = createLogger('api-router');

apiRouter.get('/songs', (ctx) => {
  const { includeIncompatible = 'false' } = ctx.query;
  // TODO: Sort method
  const output = store.karaokeFiles.sort((a, b) =>
    a.metadata.title.localeCompare(b.metadata.title),
  );

  if (includeIncompatible !== 'true') {
    ctx.body = output.filter((x) => x.isCompatibleWithCurrentVersion);
    return;
  }

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

  if (!song.parentDir) {
    ctx.status = 400;
    ctx.body = {
      errors: ['Parent directory is not present in the store'],
    };

    return;
  }

  const songDir = path.join(directories.songs, song.parentDir);
  const filePath = path.join(songDir, fileName);

  if (!fs.existsSync(filePath)) {
    logger.debug(`/song/id/filename: Could not find path: ${filePath}`);
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

apiRouter.put('/song/:id/reimport', async (ctx) => {
  const { id } = ctx.params;
  const song = store.karaokeFiles.find((x) => x.id === id);

  if (!id || !song) {
    ctx.status = 404;
    ctx.body = {
      errors: ['Song is not found with that that id'],
    };

    return;
  }

  const { parentDir } = song;

  if (!parentDir) {
    ctx.status = 400;
    ctx.body = {
      errors: ['Parent directory is not present in the store'],
    };

    return;
  }

  ctx.status = 202;

  reprocessSong(song as Required<CombinedJaraokeFiles>);
});

apiRouter.get('/health', (ctx) => {
  const { karaokeFiles, readyState } = store;

  ctx.body = {
    ready: readyState.isReady,
    importedTracks: karaokeFiles.length,
  };
});
