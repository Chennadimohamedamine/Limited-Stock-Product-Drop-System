import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { reserveSchema } from '../validators/reserve.schema';
import * as reservationService from '../services/reservation.service';

const router = Router();

// POST /api/reserve  (protected)
router.post(
  '/',
  authenticate,
  validate(reserveSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { productId, quantity } = req.body as { productId: string; quantity: number };
      const reservation = await reservationService.createReservation(
        req.userId!,
        productId,
        quantity
      );
      res.status(201).json({
        reservationId: reservation.id,
        expiresAt: reservation.expiresAt,
        status: reservation.status,
      });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/reserve/:id  (protected) — check reservation status
router.get(
  '/:id',
  authenticate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const reservation = await reservationService.getReservationById(
        req.params.id,
        req.userId!
      );
      res.json(reservation);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
