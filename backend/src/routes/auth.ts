import { Router, Response, NextFunction, RequestHandler } from 'express';
import { validate } from '../middleware/validate';
import { authSchema } from '../validators/auth.schema';
import * as authService from '../services/auth.service';

const router = Router();

const registerHandler: RequestHandler = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.register(email, password);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

const loginHandler: RequestHandler = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

router.post('/register', validate(authSchema), registerHandler);
router.post('/login', validate(authSchema), loginHandler);

export default router;
