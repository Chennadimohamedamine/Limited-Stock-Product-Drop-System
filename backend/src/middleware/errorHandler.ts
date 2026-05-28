import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../types';
import logger from '../utils/logger';

export const errorHandler: ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    path: req.path
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err.message && err.message.includes('Prisma')) {
    return res.status(500).json({ error: 'Database operations error.' });
  }

  return res.status(500).json({ error: 'Internal server error' });
};
