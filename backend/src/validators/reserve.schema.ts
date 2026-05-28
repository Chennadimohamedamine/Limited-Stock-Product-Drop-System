import { z } from 'zod';

export const reserveSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().positive()
});
