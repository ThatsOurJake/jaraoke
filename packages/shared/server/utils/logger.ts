import pino from 'pino';
import { isProd } from './is-prod';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isProd()
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
