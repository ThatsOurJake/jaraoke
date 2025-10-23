import fs from 'node:fs';
import path from 'node:path';
import { parseFile, selectCover } from 'music-metadata';
import { directories, LYRICS_FILE_NAME } from '../../constants';
import { bufferToBase64 } from '../../utils/image-to-base64';
import { createJaraokeInfoFile } from '../../utils/jaraoke-info-file';
import { createLogger } from '../../utils/logger';
import { moveFiles } from '../../utils/move-files';
import type { Processor } from '../processor-map';
import { lrcLyricBuilder } from './lrc-lyrics-builder';

const logger = createLogger('lrc-processor');

export const lrcProcessor: Processor = async (
  directory: string,
): Promise<void> => {
  logger.info(`Processing: "${directory}" as LRC type`);
  const files = fs.readdirSync(directory);

  const lrcFile = files.find((x: string) => x.endsWith('lrc'));
  const audioFile =
    files.find((x: string) => x.endsWith('mp3')) ||
    files.find((x: string) => x.endsWith('ogg')) ||
    files.find((x: string) => x.endsWith('flac'));

  if (!lrcFile || !audioFile) {
    logger.error(`LRC and audio file not found inside of: "${directory}"`);
    return;
  }

  const fullLrcPath = path.join(directory, lrcFile);
  const fullAudioPath = path.join(directory, audioFile);

  const destLRCFile = path.join(directories.temp, lrcFile);
  const destAudioFile = path.join(directories.temp, audioFile);

  fs.cpSync(fullLrcPath, destLRCFile);
  fs.cpSync(fullAudioPath, destAudioFile);

  try {
    const { common, format } = await parseFile(fullAudioPath);
    const { title, artist, year, picture } = common;
    const { duration } = format;

    const albumCover = selectCover(picture);

    const lyricsBuilder = lrcLyricBuilder({
      lrcFile: fullLrcPath,
    });

    const lyrics = lyricsBuilder.toAss({
      paddingTiming: 150,
      highlightColour: '&HFFFFFF&',
    });

    const infoFileLocation = createJaraokeInfoFile(
      {
        metadata: {
          title: title || audioFile,
          artist: artist,
          year: year?.toString(),
          duration: Math.floor(duration || 0),
        },
        tracks: [
          {
            fileName: audioFile,
            name: 'main',
          },
        ],
        lyrics: LYRICS_FILE_NAME,
        coverPhoto: albumCover
          ? bufferToBase64(albumCover.data, albumCover.format)
          : undefined,
      },
      directories.temp,
    );

    const lyricsLoc = path.join(directories.temp, LYRICS_FILE_NAME);
    fs.writeFileSync(lyricsLoc, lyrics);
    logger.debug(`Saved lyrics @ "${lyricsLoc}"`);

    moveFiles([destAudioFile, lyricsLoc, infoFileLocation], directory);
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
