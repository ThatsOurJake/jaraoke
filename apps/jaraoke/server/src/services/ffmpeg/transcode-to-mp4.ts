import { spawn } from 'node:child_process';
import path, { basename } from 'node:path';
import { directories, VIDEO_FILE_NAME } from '../../constants';
import { store } from '../../data/store';
import { createLogger } from 'jaraoke-shared/server/utils/logger';

const logger = createLogger('ffmpeg:transcode-to-mp4');

export const transcodeToMp4 = (fullVideoPath: string): Promise<void> => {
  const output = path.join(directories.temp, VIDEO_FILE_NAME);
  const { ffmpegPath } = store.settings;

  const fileName = basename(fullVideoPath);

  logger.info(`Converting "${fileName}" to MP4 file`);
  const startTime = Date.now();

  return new Promise<void>((resolve, reject) => {
    const args = [
      '-i',
      fullVideoPath,
      '-preset',
      'fast',
      '-crf',
      '20',
      '-vf',
      'scale=1920:1080',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      output,
    ];

    const ffmpeg = spawn(ffmpegPath, args, { env: { ...process.env } });

    ffmpeg.on('close', (code) => {
      const duration = (Date.now() - startTime) / 1000;
      if (code === 0) {
        logger.info(`Completed transcode - Duration: ${duration} seconds`);
        resolve();
      } else {
        reject(
          new Error(
            `ffmpeg exited with code ${code} after ${duration} seconds`,
          ),
        );
      }
    });

    ffmpeg.on('error', reject);
  });
};
