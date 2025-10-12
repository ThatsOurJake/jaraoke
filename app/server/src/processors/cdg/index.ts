import fs from 'node:fs';
import path from 'node:path';
import { parseFile } from 'music-metadata';
import { CDG_COMBINED_FILE_NAME, directories } from '../../constants';
import { stitchCDGTogether } from '../../services/ffmpeg/stitch-cdg-together';
import { createJaraokeInfoFile } from '../../utils/jaraoke-info-file';
import { createLogger } from '../../utils/logger';
import { moveFiles } from '../../utils/move-files';
import type { Processor } from '../processor-map';

const logger = createLogger('cdg-processor');

export const cdgProcessor: Processor = async (
  directory: string,
): Promise<void> => {
  logger.info(`Processing: "${directory}" as a CDG type`);

  const files = fs.readdirSync(directory);

  const audio = files.find((x) => x.endsWith('mp3'));
  const video = files.find((x) => x.endsWith('cdg'));

  if (!audio || !video) {
    logger.error(
      `CDG and MP3 must be present for a CDG file in location: "${directory}"`,
    );
    return;
  }

  stitchCDGTogether(path.join(directory, audio), path.join(directory, video));

  const fileMetaData = await parseFile(path.join(directory, audio));
  const {
    common: { artist, title, year },
  } = fileMetaData;

  const infoFileLocation = createJaraokeInfoFile(
    {
      metadata: {
        title: title || audio,
        artist: artist || '',
        year: year?.toString() || '',
      },
      video: CDG_COMBINED_FILE_NAME,
    },
    directories.temp,
  );

  moveFiles(
    [infoFileLocation, path.join(directories.temp, CDG_COMBINED_FILE_NAME)],
    directory,
  );
};
