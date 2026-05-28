import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { checkoutSchema } from '../validators/reserve.schema';
import * as orderService from '../services/order.service';

const router = Router();

// POST /api/checkout  (protected)
router.post(
  '/',
  authenticate,
  validate(checkoutSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { reservationId } = req.body as { reservationId: string };
      const order = await orderService.checkout(reservationId, req.userId!);
      res.status(201).json({
        orderId: order.id,
        productId: order.productId,
        quantity: order.quantity,
        createdAt: order.createdAt,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
