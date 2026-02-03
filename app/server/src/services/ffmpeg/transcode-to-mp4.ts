import { execSync } from 'node:child_process';
import path, { basename } from 'node:path';
import { directories, VIDEO_FILE_NAME } from '../../constants';
import { store } from '../../data/store';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ffmpeg:transcode-to-mp4');

export const transcodeToMp4 = (fullVideoPath: string) => {
  const output = path.join(directories.temp, VIDEO_FILE_NAME);
  const { ffmpegPath } = store.settings;

  const fileName = basename(fullVideoPath);

  logger.info(`Converting "${fileName}" to MP4 file`);
  const startTime = Date.now();

  execSync(
    `${ffmpegPath} -i "${fullVideoPath}" -preset fast -crf 20 -vf scale=1920:1080 "${output}"`,
    {
      env: { ...process.env },
    },
  );

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  logger.info(`Completed transcode - Duration: ${duration} seconds`);
};
