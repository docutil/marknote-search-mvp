const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf } = format;

const simpleFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} ${level}: ${message}`;
});

exports.logger = createLogger({
  format: combine(timestamp(), simpleFormat),
  transports: [new transports.Console(), new transports.File({ filename: 'searchserver.log' })],
});
