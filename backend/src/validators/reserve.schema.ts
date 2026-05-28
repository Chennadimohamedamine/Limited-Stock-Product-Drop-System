import { z } from 'zod';

export const reserveSchema = z.object({
  productId: z.string().min(1, 'productId is required'),
  quantity: z
    .number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(10, 'Cannot reserve more than 10 at once'),
});

export const checkoutSchema = z.object({
  reservationId: z.string().min(1, 'reservationId is required'),
});

export type ReserveInput = z.infer<typeof reserveSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
