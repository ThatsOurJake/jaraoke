import { execSync } from 'node:child_process';
import path from 'node:path';
import { CDG_COMBINED_FILE_NAME, directories } from '../../constants';
import { store } from '../../data/store';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ffmpeg:stitch-cdg-together');

export const stitchCDGTogether = (audioPath: string, cdgPath: string) => {
  const output = path.join(directories.temp, CDG_COMBINED_FILE_NAME);
  const { ffmpegPath } = store.settings;

  logger.info(`Stitching: "${audioPath}" & "${cdgPath}" together`);
  const startTime = Date.now();

  execSync(
    `${ffmpegPath} -i "${cdgPath}" -i "${audioPath}" -preset veryfast -pix_fmt yuv420p -vf scale=640:480 "${output}"`,
    {
      env: { ...process.env },
    },
  );

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  logger.info(
    `Stitching: "${audioPath}" & "${cdgPath}" together - Duration: ${duration} seconds`,
  );
};
