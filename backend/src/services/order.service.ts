import { PrismaClient } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError } from '../utils/AppError';

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export async function checkout(reservationId: string, userId: string) {
  return prisma.$transaction(
    async (tx: TxClient) => {
      const reservation = await tx.reservation.findFirst({
        where: { id: reservationId, userId },
      });

      if (!reservation) throw new AppError('Reservation not found', 404);

      if (reservation.status === 'COMPLETED') {
        throw new AppError('Reservation already completed', 409);
      }

      if (reservation.status === 'EXPIRED') {
        throw new AppError('Reservation has expired', 409);
      }

      if (reservation.expiresAt < new Date()) {
        throw new AppError('Reservation has expired', 409);
      }

      const [order] = await Promise.all([
        tx.order.create({
          data: {
            reservationId: reservation.id,
            userId: reservation.userId,
            productId: reservation.productId,
            quantity: reservation.quantity,
          },
        }),
        tx.reservation.update({
          where: { id: reservation.id },
          data: { status: 'COMPLETED' },
        }),
        // Stock is now permanently sold — decrement reservedStock
        tx.product.update({
          where: { id: reservation.productId },
          data: {
            reservedStock: { decrement: reservation.quantity },
            totalStock: { decrement: reservation.quantity },
          },
        }),
        tx.inventoryLog.create({
          data: {
            productId: reservation.productId,
            event: 'PURCHASED',
            delta: -reservation.quantity,
            note: `Order by user ${userId}`,
          },
        }),
      ]);

      return order;
    },
    {
      isolationLevel: 'Serializable',
      timeout: 10000,
    }
  );
}
