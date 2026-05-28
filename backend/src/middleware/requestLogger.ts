import { Response, NextFunction, RequestHandler } from 'express';
import { AuthRequest } from '../types';
import logger from '../utils/logger';

export const requestLogger: RequestHandler = (req: AuthRequest, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      userId: req.userId || 'anonymous'
    });
  });
  next();
};
