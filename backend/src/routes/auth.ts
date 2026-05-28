import { Router, Request, Response, NextFunction } from 'express';
import { validate } from '../middleware/validate';
import { authRateLimiter } from '../middleware/rateLimiter';
import { registerSchema, loginSchema } from '../validators/auth.schema';
import * as authService from '../services/auth.service';

const router = Router();

// POST /api/auth/register
router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const result = await authService.register(email, password);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body as { email: string; password: string };
      const result = await authService.login(email, password);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
