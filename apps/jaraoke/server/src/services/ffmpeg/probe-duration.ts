import { spawn } from 'node:child_process';

import { store } from '../../data/store';
import { createLogger } from '../../utils/logger';

const logger = createLogger('probe-duration');

export const probeDuration = async (
  filePath: string,
): Promise<number | undefined> => {
  try {
    const { ffprobePath } = store.settings;

    const args = [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath,
    ];

    return await new Promise<number | undefined>((resolve, reject) => {
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

        const duration = parseFloat(output.trim());

        if (Number.isNaN(duration)) {
          resolve(undefined);
        } else {
          resolve(Math.floor(duration));
        }
      });
    });
  } catch (err) {
    const error = err as Error;

    logger.error(
      { stack: error.stack },
      `Error probing duration for file: "${filePath}" - ${error.message}`,
    );
    return undefined;
  }
};
