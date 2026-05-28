import { Router, Response, NextFunction, RequestHandler } from 'express';
import { validate } from '../middleware/validate';
import { checkoutSchema } from '../validators/checkout.schema';
import * as orderService from '../services/order.service';
import { AuthRequest } from '../types';

const router = Router();

const checkoutHandler: RequestHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { reservationId } = req.body;
    const userId = req.userId!;
    const order = await orderService.completeCheckout(userId, reservationId);
    res.status(201).json({ orderId: order.id });
  } catch (err) {
    next(err);
  }
};

router.post('/', validate(checkoutSchema), checkoutHandler);

export default router;
