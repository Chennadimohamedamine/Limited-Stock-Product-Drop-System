import app from './app';
import { startExpiryJob } from './jobs/expireReservations';
import logger from './utils/logger';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const PORT = process.env.PORT || 3000;

startExpiryJob();

app.listen(PORT, () => {
  logger.info({ message: `Production Drop Server running natively on port ${PORT}` });

  initCleanupWorker();
});

const prisma = new PrismaClient();

export async function reclaimExpiredReservations() {
  try {
    // We run this inside a transaction to prevent race conditions during updates
    await prisma.$transaction(async (tx) => {
      const expiredReservations = await tx.reservation.findMany({
        where: {
          status: 'PENDING',
          expiresAt: { lt: new Date() }
        }
      });

      if (expiredReservations.length === 0) return;

      for (const res of expiredReservations) {
        // Reclaim stock
        await tx.product.update({
          where: { id: res.productId },
          data: { reservedStock: { decrement: res.quantity } }
        });

        // Log the release
        await tx.inventoryLog.create({
          data: {
            productId: res.productId,
            event: 'SYSTEM_RELEASED',
            delta: res.quantity,
            note: `Expired reservation ${res.id} cleaned up automatically.`
          }
        });
      }

      // Update statuses in batch
      await tx.reservation.updateMany({
        where: { id: { in: expiredReservations.map(r => r.id) } },
        data: { status: 'EXPIRED' }
      });
      
      console.log(`[Worker] Successfully reclaimed ${expiredReservations.length} expired reservations.`);
    });
  } catch (error) {
    console.error('[Worker Error] Failed to reclaim reservations:', error);
  }
}

// Initialize the cron schedule
export function initCleanupWorker() {
  // Cron expression for "every minute": * * * * *
  cron.schedule('* * * * *', async () => {
    console.log('[Worker] Checking for expired reservations...');
    await reclaimExpiredReservations();
  });
}
