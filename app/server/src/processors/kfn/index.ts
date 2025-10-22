import fs from 'node:fs';
import path from 'node:path';
import type { JaraokeTrack } from 'jaraoke-shared/types';
import { directories, LYRICS_FILE_NAME } from '../../constants';
import { probeDuration } from '../../services/ffmpeg/probe-duration';
import { createJaraokeInfoFile } from '../../utils/jaraoke-info-file';
import { createLogger } from '../../utils/logger';
import { moveFiles } from '../../utils/move-files';
import type { Processor } from '../processor-map';
import { kfnLyricsBuilder } from './kfn-lyrics-builder';
import { kfnReader } from './kfn-reader';
import { kfnSongIniReader } from './kfn-song-ini-reader';

const logger = createLogger('kfn-processor');

export const kfnProcessor: Processor = async (
  directory: string,
): Promise<void> => {
  logger.info(`Processing: "${directory}" as a Karafun type`);
  const files = fs.readdirSync(directory);
  const kfnFile = files.find((x) => x.endsWith('kfn'));

  if (!kfnFile) {
    logger.error(`KFN file not found inside of: "${directory}"`);
    return;
  }

  const fullKfnPath = path.join(directory, kfnFile);

  try {
    const reader = kfnReader(fullKfnPath, directories.temp);
    await reader.extractFiles(true);
    logger.info(`Extracted relevant files from KFN file`);

    const infoFile = kfnSongIniReader({
      kfnDirectory: directories.temp,
    });

    const lyricBuilder = kfnLyricsBuilder({ songIniInstance: infoFile });

    const metadata = infoFile.getMetadata();
    const tracks = infoFile.getTracks();
    const lyrics = lyricBuilder.toAss();
    const headers = await reader.getHeader();

    let duration = 0;

    if (headers.MUSL && headers.MUSL !== '0') {
      const parsed = parseInt(headers.MUSL, 10);

      if (!Number.isNaN(parsed)) {
        duration = Math.floor(parsed);
      }
    } else {
      const probeResp = await probeDuration(
        path.join(directories.temp, tracks[0].fileName),
      );
      duration = probeResp || 0;
    }

    const mappedTracks: JaraokeTrack[] = tracks.map((x) => {
      return {
        // TODO: Better naming
        name: x.type.toString(),
        fileName: x.fileName,
      };
    });

    const infoFileLocation = createJaraokeInfoFile(
      {
        metadata: {
          title: metadata?.title,
          artist: metadata?.artist,
          year: metadata?.year,
          duration: Math.floor(duration || 0),
        },
        tracks: mappedTracks,
        lyrics: LYRICS_FILE_NAME,
      },
      directories.temp,
    );

    const lyricsLoc = path.join(directories.temp, LYRICS_FILE_NAME);
    fs.writeFileSync(lyricsLoc, lyrics);
    logger.debug(`Saved lyrics @ "${lyricsLoc}"`);

    moveFiles(
      [
        ...tracks.map((x) => path.join(directories.temp, x.fileName)),
        lyricsLoc,
        infoFileLocation,
      ],
      directory,
    );
  } catch (err) {
    const error = err as Error;
    logger.error(
      { stack: error.stack },
      `Failed to process: "${directory}" - Reason: ${error.message}`,
    );

    return;
  }

  logger.info(`Processed successfully`);
};
