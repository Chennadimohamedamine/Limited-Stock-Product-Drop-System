import { Request, Response, NextFunction } from 'express';

export const metrics = {
  totalRequests: 0,
  activeConnections: 0,
  reclaimedReservationsTotal: 0
};

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  metrics.totalRequests++;
  metrics.activeConnections++;
  
  res.on('finish', () => {
    metrics.activeConnections--;
  });
  
  next();
}