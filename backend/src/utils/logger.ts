import winston from 'winston';

const silent = process.env.NODE_ENV === 'test' || process.env.WINSTON_SILENT === 'true';

const logger = winston.createLogger({
  level: silent ? 'error' : process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf((info) => {
      const { timestamp, level, message, ...meta } = info;
      const msg = typeof message === 'object'
        ? JSON.stringify(message)
        : String(message ?? '');
      const filtered = Object.fromEntries(
        Object.entries(meta).filter(([k]) => k !== 'splat' && k !== 'Symbol(splat)')
      );
      const metaStr = Object.keys(filtered).length ? ' ' + JSON.stringify(filtered) : '';
      return `${timestamp as string} [${level}]: ${msg}${metaStr}`;
    })
  ),
  transports: [
    new winston.transports.Console({ silent }),
  ],
});

export default logger;
