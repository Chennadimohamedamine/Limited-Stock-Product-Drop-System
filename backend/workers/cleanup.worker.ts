import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { metrics } from '../middleware/metrics.middleware';

const prisma = new PrismaClient();

export async function reclaimExpiredReservations() {
  try {
    await prisma.$transaction(async (tx) => {
      const targetTime = new Date();
      
      const expiredReservations = await tx.reservation.findMany({
        where: {
          status: 'PENDING',
          expiresAt: { lt: targetTime }
        }
      });

      if (expiredReservations.length === 0) return;

      logger.info(`Found ${expiredReservations.length} expired reservations to reclaim.`);

      for (const res of expiredReservations) {
        // Revert temporary hold
        await tx.product.update({
          where: { id: res.productId },
          data: { reservedStock: { decrement: res.quantity } }
        });

        // Audit log
        await tx.inventoryLog.create({
          data: {
            productId: res.productId,
            event: 'SYSTEM_RELEASED',
            delta: res.quantity,
            note: `Automated cleanup of expired reservation: ${res.id}`
          }
        });
      }

      await tx.reservation.updateMany({
        where: { id: { in: expiredReservations.map(r => r.id) } },
        data: { status: 'EXPIRED' }
      });

      metrics.reclaimedReservationsTotal += expiredReservations.length;
      logger.info(`Successfully completed cleanup cycle for ${expiredReservations.length} items.`);
    });
  } catch (error) {
    logger.error('CRITICAL: Internal background worker validation loop error caught:', error);
  }
}

export function startInternalScheduler(intervalMs = 10000) {
  // Built-in resilient interval strategy to counter production environments that restrict root crons
  setInterval(async () => {
    await reclaimExpiredReservations();
  }, intervalMs);
}