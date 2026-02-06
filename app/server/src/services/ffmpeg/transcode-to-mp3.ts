import { execSync } from 'node:child_process';
import path, { basename, extname } from 'node:path';
import { directories } from '../../constants';
import { store } from '../../data/store';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ffmpeg:transcode-to-mp4');

export const transcodeToMp3 = (fullAudioPath: string) => {
  const ext = extname(fullAudioPath);
  const fullFileName = basename(fullAudioPath);
  const fileName = fullFileName.replace(ext, '');
  const newFileName = `${fileName}.mp3`;

  const output = path.join(directories.temp, newFileName);
  const { ffmpegPath } = store.settings;

  logger.info(`Converting "${fileName}" to MP3 file`);
  const startTime = Date.now();

  execSync(
    `${ffmpegPath} -i "${fullAudioPath}" -vn -c:a libmp3lame -q:a 4 "${output}"`,
    {
      env: { ...process.env },
    },
  );

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  logger.info(`Completed transcode - Duration: ${duration} seconds`);

  return { filename: newFileName, absolutePath: output };
};
