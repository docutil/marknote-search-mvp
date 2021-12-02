import { createLogger, format, transports } from 'winston';

const { combine, timestamp, splat, printf } = format;

const simpleFormat = () =>
  printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
  });

export const logger = createLogger({
  format: combine(timestamp(), splat(), simpleFormat()),
  transports: [new transports.Console(), new transports.File({ filename: 'searchserver.log' })],
});
