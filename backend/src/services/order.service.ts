import { PrismaClient } from '@prisma/client';
import { AppError } from '../types';

const prisma = new PrismaClient();

export async function completeCheckout(userId: string, reservationId: string) {
  return prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id: reservationId }
    });

    if (!reservation || reservation.userId !== userId) {
      throw new AppError('Reservation not found', 404);
    }

    if (reservation.status !== 'PENDING') {
      throw new AppError('Reservation already used or expired', 409);
    }

    if (new Date() > reservation.expiresAt) {
      throw new AppError('Reservation expired', 409);
    }

    const order = await tx.order.create({
      data: {
        reservationId: reservation.id,
        userId: reservation.userId,
        productId: reservation.productId,
        quantity: reservation.quantity
      }
    });

    await tx.reservation.update({
      where: { id: reservationId },
      data: { status: 'COMPLETED' }
    });

    await tx.product.update({
      where: { id: reservation.productId },
      data: {
        totalStock: { decrement: reservation.quantity },
        reservedStock: { decrement: reservation.quantity }
      }
    });

    await tx.inventoryLog.create({
      data: {
        productId: reservation.productId,
        event: 'PURCHASED',
        delta: -reservation.quantity,
        note: `Order unified ${order.id}`
      }
    });

    return order;
  });
}