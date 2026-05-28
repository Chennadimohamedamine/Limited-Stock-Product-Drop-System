import { z } from 'zod';

export const checkoutSchema = z.object({
  reservationId: z.string().cuid()
});
