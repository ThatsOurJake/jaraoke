import { spawn } from 'node:child_process';

import { store } from '../../data/store';
import { createLogger } from '../../utils/logger';

const logger = createLogger('probe-video-codec');

export const probeVideoCodec = async (
  filePath: string,
): Promise<string | undefined> => {
  try {
    const { ffprobePath } = store.settings;

    const args = [
      '-v',
      'error',
      '-select_streams',
      'v:0',
      '-show_entries',
      'stream=codec_name',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ];

    return await new Promise<string | undefined>((resolve, reject) => {
      const ffprobe = spawn(ffprobePath, args);

      let output = '';
      let errorOutput = '';

      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          reject(
            new Error(
              `ffprobe exited with code ${code}: ${errorOutput.trim()}`,
            ),
          );
          return;
        }

        const codec = output.trim().toLowerCase();
        resolve(codec || undefined);
      });
    });
  } catch (err) {
    const error = err as Error;

    logger.error(
      { stack: error.stack },
      `Error probing codec for file: "${filePath}" - ${error.message}`,
    );
    return undefined;
  }
};
