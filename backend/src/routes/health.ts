import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../utils/prisma';

const router = Router();

// GET /health
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV ?? 'development',
  });
});

// GET /metrics
router.get('/metrics', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [
      totalReservations,
      pendingReservations,
      expiredReservations,
      completedReservations,
      totalOrders,
      totalProducts,
    ] = await Promise.all([
      prisma.reservation.count(),
      prisma.reservation.count({ where: { status: 'PENDING' } }),
      prisma.reservation.count({ where: { status: 'EXPIRED' } }),
      prisma.reservation.count({ where: { status: 'COMPLETED' } }),
      prisma.order.count(),
      prisma.product.count(),
    ]);

    res.json({
      totalReservations,
      pendingReservations,
      expiredReservations,
      completedReservations,
      totalOrders,
      totalProducts,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
