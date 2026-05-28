import { Router, Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { reserveSchema } from '../validators/reserve.schema';
import * as reservationService from '../services/reservation.service';
import logger from '../utils/logger';

const router = Router();

// POST /api/reserve  (protected)
router.post(
  '/',
  authenticate,
  validate(reserveSchema),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      logger.info({
        message: 'Reserve request received',
        userId: req.userId,
        body: req.body,
      });

      const { productId, quantity } = req.body as { productId: string; quantity: number };
      
      logger.info({
        message: 'Creating reservation',
        userId: req.userId,
        productId,
        quantity,
      });

      const reservation = await reservationService.createReservation(
        req.userId!,
        productId,
        quantity
      );

      logger.info({
        message: 'Reservation created successfully',
        reservationId: reservation.id,
        expiresAt: reservation.expiresAt,
      });

      res.status(201).json({
        reservationId: reservation.id,
        expiresAt: reservation.expiresAt,
        status: reservation.status,
      });
    } catch (err) {
      logger.error({
        message: 'Reserve error',
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
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