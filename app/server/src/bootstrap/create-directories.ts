import fs from 'node:fs';
import { directories } from '../constants';
import { sendEvent } from '../utils/event-system';
import { createLogger } from '../utils/logger';

const logger = createLogger('bootstrap:create-directories');

export const createDirectories = () => {
  sendEvent('bootstrap:create-directories');

  for (const entry of Object.entries(directories)) {
    const [key, value] = entry;

    if (fs.existsSync(value)) {
      logger.info(`"${key}" directory located @ "${value}"`);
      continue;
    }

    fs.mkdirSync(value, { recursive: true });
    logger.info(`Created "${key}" directory @ "${value}"`);
  }
};
