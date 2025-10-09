import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
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
