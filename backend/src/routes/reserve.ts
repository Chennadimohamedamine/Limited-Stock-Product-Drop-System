import { Router, Response, NextFunction, RequestHandler } from 'express';
import { validate } from '../middleware/validate';
import { reserveSchema } from '../validators/reserve.schema';
import * as reservationService from '../services/reservation.service';
import { AuthRequest } from '../types';

const router = Router();

const createReserveHandler: RequestHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.userId!;
    const reservation = await reservationService.createReservation(userId, productId, quantity);
    res.status(201).json({
      reservationId: reservation.id,
      expiresAt: reservation.expiresAt
    });
  } catch (err) {
    next(err);
  }
};

router.post('/', validate(reserveSchema), createReserveHandler);

export default router;
