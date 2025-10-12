import fs from 'node:fs';
import path from 'node:path';
import {
  directories,
  LYRICS_FILE_NAME,
  US_TEMP_AUDIO_FILE,
  US_TEMP_INFO_FILE,
} from '../../constants';
import { createJaraokeInfoFile } from '../../utils/jaraoke-info-file';
import { createLogger } from '../../utils/logger';
import { moveFiles } from '../../utils/move-files';
import type { Processor } from '../processor-map';
import { usLyricsBuilder } from './us-lyrics-builder';
import { usReader } from './us-reader';

const logger = createLogger('us-processor');

export const ultastarProcessor: Processor = async (
  directory: string,
): Promise<void> => {
  logger.info(`Processing: "${directory}" as a Ultrastar type`);
  const files = fs.readdirSync(directory);

  const ultrastarFile = files.find((x) => x.endsWith('txt'));
  const audioFile = files.find((x) => x.endsWith('mp3'));

  if (!ultrastarFile || !audioFile) {
    logger.error(
      `Text and mp3 file is not found to safely assume this is ultrastar director: "${directory}"`,
    );
    return;
  }

  const destUsInfoFile = path.join(directories.temp, US_TEMP_INFO_FILE);
  const destUsAudioFile = path.join(directories.temp, US_TEMP_AUDIO_FILE);

  fs.cpSync(path.join(directory, ultrastarFile), destUsInfoFile);
  fs.cpSync(path.join(directory, audioFile), destUsAudioFile);

  try {
    const reader = usReader(destUsInfoFile);
    const details = reader.getDetails();
    const { metadata } = details;

    const lyricBuilder = usLyricsBuilder(details);
    const lyrics = lyricBuilder.toAss();

    const infoFileLocation = createJaraokeInfoFile(
      {
        metadata: {
          title: metadata.title,
          artist: metadata.artist,
          year: metadata.year,
        },
        tracks: [
          {
            fileName: US_TEMP_AUDIO_FILE,
            name: 'main',
          },
        ],
        lyrics: LYRICS_FILE_NAME,
      },
      directories.temp,
    );

    const lyricsLoc = path.join(directories.temp, LYRICS_FILE_NAME);
    fs.writeFileSync(lyricsLoc, lyrics);
    logger.debug(`Saved lyrics @ "${lyricsLoc}"`);

    moveFiles([destUsAudioFile, lyricsLoc, infoFileLocation], directory);
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
