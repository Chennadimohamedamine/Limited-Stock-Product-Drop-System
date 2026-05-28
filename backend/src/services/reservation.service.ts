import { Prisma, PrismaClient, Product } from '@prisma/client';
import { AppError } from '../types';

const prisma = new PrismaClient();

async function runWithRetry<T>(fn: () => Promise<T>, retries = 5, delay = 50): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Catch P2034 (Write conflict/deadlock) or P2010 (Raw query execution error / serialization 40001)
      const isTransientConflict = 
        error.code === 'P2034' || 
        (error.code === 'P2010' && error.message?.includes('40001'));

      if (isTransientConflict && retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay * (6 - retries)));
        return runWithRetry(fn, retries - 1, delay);
      }
    }
    throw error;
  }
}

export async function reserveProductStock(userId: string, productId: string, quantity: number) {
  return await runWithRetry(async () => {
    return await prisma.$transaction(async (tx) => {
      // 1. Row-level lock acquired safely on the singular target entity row
      const products = await tx.$queryRaw<Product[]>`
        SELECT * FROM "Product" WHERE id = ${productId} FOR UPDATE
      `;
      const product = products[0];

      if (!product) throw new AppError('Product not found', 404);

      // 2. Compute dynamic operational availability bounds
      const availableStock = product.totalStock - product.reservedStock;
      if (availableStock < quantity) {
        throw new AppError('Insufficient stock', 409);
      }

      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 Minutes strict lifetime

      // 3. Persist modifications atomically inside transaction bounds
      const reservation = await tx.reservation.create({
        data: {
          userId,
          productId,
          quantity,
          status: 'PENDING',
          expiresAt
        }
      });

      await tx.product.update({
        where: { id: productId },
        data: { reservedStock: { increment: quantity } }
      });

      await tx.inventoryLog.create({
        data: {
          productId,
          event: 'RESERVED',
          delta: -quantity,
          note: `Reservation ID ${reservation.id} established for user ${userId}`
        }
      });

      return reservation;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted
    });
  });
}

export async function processCheckout(reservationId: string, userId: string) {
  return await runWithRetry(async () => {
    return await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: { product: true }
      });

      if (!reservation) throw new AppError('Reservation not found', 404);
      if (reservation.userId !== userId) throw new AppError('Unauthorized reservation access', 403);
      if (reservation.status === 'EXPIRED') throw new AppError('Reservation has expired', 410);
      if (reservation.status === 'COMPLETED') throw new AppError('Reservation already processed', 400);

      // Transition Reservation State
      const updatedReservation = await tx.reservation.update({
        where: { id: reservationId },
        data: { status: 'COMPLETED' }
      });

      // Deduct permanently from overall totals, clear allocations out of reserved tracking
      await tx.product.update({
        where: { id: reservation.productId },
        data: {
          totalStock: { decrement: reservation.quantity },
          reservedStock: { decrement: reservation.quantity }
        }
      });

      const order = await tx.order.create({
        data: {
          userId,
          reservationId: reservation.id,
          totalAmount: 1000 // Placeholder structural numeric value
        }
      });

      await tx.inventoryLog.create({
        data: {
          productId: reservation.productId,
          event: 'CHECKOUT',
          delta: 0,
          note: `Order ${order.id} verified and locked successfully.`
        }
      });

      return order;
    });
  });
}