import { PrismaClient } from '@prisma/client';
import prisma from '../utils/prisma';
import { AppError } from '../utils/AppError';

const RESERVATION_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface ProductRow {
  id: string;
  totalStock: number;
  reservedStock: number;
}

type TxClient = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export async function createReservation(
  userId: string,
  productId: string,
  quantity: number
) {
  return prisma.$transaction(
    async (tx: TxClient) => {
      // Row-level lock: prevents any other transaction from reading or writing
      // this product row until our transaction commits or rolls back.
      // This is the KEY to preventing race conditions / overselling.
      const products = await tx.$queryRaw<ProductRow[]>`
        SELECT id, "totalStock", "reservedStock"
        FROM "Product"
        WHERE id = ${productId}
        FOR UPDATE
      `;

      if (products.length === 0) {
        throw new AppError('Product not found', 404);
      }

      const product = products[0];
      const available = product.totalStock - product.reservedStock;

      if (available < quantity) {
        throw new AppError(
          `Insufficient stock. Available: ${available}, requested: ${quantity}`,
          409
        );
      }

      // Check for existing active reservation by this user for this product
      const existing = await tx.reservation.findFirst({
        where: {
          userId,
          productId,
          status: 'PENDING',
          expiresAt: { gt: new Date() },
        },
      });
      if (existing) {
        throw new AppError('You already have an active reservation for this product', 409);
      }

      const expiresAt = new Date(Date.now() + RESERVATION_TTL_MS);

      // All three writes are atomic — either all succeed or all roll back
      const [reservation] = await Promise.all([
        tx.reservation.create({
          data: { userId, productId, quantity, status: 'PENDING', expiresAt },
        }),
        tx.product.update({
          where: { id: productId },
          data: { reservedStock: { increment: quantity } },
        }),
        tx.inventoryLog.create({
          data: {
            productId,
            event: 'RESERVED',
            delta: -quantity,
            note: `Reserved by user ${userId}`,
          },
        }),
      ]);

      return reservation;
    },
    {
      isolationLevel: 'ReadCommitted', // Changed from 'Serializable'
      timeout: 10000,
    }
  );
}

export async function getReservationById(id: string, userId: string) {
  const reservation = await prisma.reservation.findFirst({
    where: { id, userId },
    include: { product: true },
  });
  if (!reservation) throw new AppError('Reservation not found', 404);
  return reservation;
}