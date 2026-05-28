import cron from 'node-cron';
import prisma from '../utils/prisma';
import logger from '../utils/logger';

interface ReservationRow {
  id: string;
  productId: string;
  quantity: number;
  status: string;
  expiresAt: Date;
}

export function startExpiryJob(): void {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      const expiredReservations: ReservationRow[] = await prisma.reservation.findMany({
        where: { status: 'PENDING', expiresAt: { lt: now } },
      });

      if (expiredReservations.length === 0) return;

      const reservationUpdates = expiredReservations.map((r: ReservationRow) =>
        prisma.reservation.update({ where: { id: r.id }, data: { status: 'EXPIRED' } })
      );

      const stockRestores = expiredReservations.map((r: ReservationRow) =>
        prisma.product.update({
          where: { id: r.productId },
          data: { reservedStock: { decrement: r.quantity } },
        })
      );

      const logEntries = expiredReservations.map((r: ReservationRow) =>
        prisma.inventoryLog.create({
          data: {
            productId: r.productId,
            event: 'EXPIRED',
            delta: r.quantity,
            note: `Auto-expired reservation ${r.id}`,
          },
        })
      );

      await prisma.$transaction([...reservationUpdates, ...stockRestores, ...logEntries]);

      logger.info({
        message: 'Reservations expired and stock restored',
        count: expiredReservations.length,
        reservationIds: expiredReservations.map((r: ReservationRow) => r.id),
      });
    } catch (err) {
      logger.error({ message: 'Expiry job failed', error: err });
    }
  });

  logger.info({ message: 'Reservation expiry cron job started (every 1 minute)' });
}
