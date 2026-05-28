import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

const prisma = new PrismaClient();

export function startExpiryJob() {
  cron.schedule('* * * * *', async () => {
    const now = new Date();

    const expired = await prisma.reservation.findMany({
      where: { status: 'PENDING', expiresAt: { lt: now } }
    });

    if (expired.length === 0) return;

    try {
      await prisma.$transaction(async (tx) => {
        for (const r of expired) {
          await tx.reservation.update({
            where: { id: r.id },
            data: { status: 'EXPIRED' }
          });

          await tx.product.update({
            where: { id: r.productId },
            data: { reservedStock: { decrement: r.quantity } }
          });

          await tx.inventoryLog.create({
            data: {
              productId: r.productId,
              event: 'EXPIRED',
              delta: r.quantity,
              note: 'Auto-expired via cron system'
            }
          });
        }
      });
      logger.info({ message: 'Reservations expired system execution finished', count: expired.length });
    } catch (err: any) {
      logger.error({ message: 'Failed to auto-expire reservations', error: err.message });
    }
  });
}
