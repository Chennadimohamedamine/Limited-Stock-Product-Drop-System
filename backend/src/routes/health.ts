import { Router, Request, Response, RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

const healthHandler: RequestHandler = (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
};

const metricsHandler: RequestHandler = async (req: Request, res: Response, next) => {
  try {
    const [totalReservations, pendingReservations, expiredReservations, completedOrders, totalProducts] = await Promise.all([
      prisma.reservation.count(),
      prisma.reservation.count({ where: { status: 'PENDING' } }),
      prisma.reservation.count({ where: { status: 'EXPIRED' } }),
      prisma.order.count(),
      prisma.product.count()
    ]);

    res.json({
      totalReservations,
      pendingReservations,
      expiredReservations,
      completedOrders,
      totalProducts
    });
  } catch (err) {
    next(err);
  }
};

router.get('/health', healthHandler);
router.get('/metrics', metricsHandler);

export default router;