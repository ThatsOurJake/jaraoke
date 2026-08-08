import fs from 'node:fs';
import path from 'node:path';
import { directories } from '../constants';
import { createLogger } from '../utils/logger';

const logger = createLogger('clean-temp-dir');

export const cleanTempDir = () => {
  if (!fs.existsSync(directories.temp)) {
    return;
  }

  logger.debug('Cleaning up files in temp directory');
  const files = fs.readdirSync(directories.temp);
  for (const f of files) {
    fs.rmSync(path.join(directories.temp, f));
  }

  logger.info(`Cleaned up temp directory`);
};
