import pino from 'pino';
import { IS_PRODUCTION } from '../constants';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: IS_PRODUCTION
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      },
  base: {
    pid: false,
  },
});

export const createLogger = (name: string) =>
  logger.child({ name: name.toUpperCase() });
