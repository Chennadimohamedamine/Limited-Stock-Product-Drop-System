import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { reserveProductStock, processCheckout } from './services/reservation.service';
import { metricsMiddleware, metrics } from './middleware/metrics.middleware';
import { logger } from './utils/logger';
import { AppError } from './types';
import { startInternalScheduler } from './workers/cleanup.worker';

const app = express();

// Security Configurations
app.use(cors({ origin: process.env.ALLOWED_ORIGINS || '*' }));
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests execution flags raised.' }
});
app.use('/api/', apiLimiter);
app.use(metricsMiddleware);

// Request Logging Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info({ method: req.method, path: req.url, ip: req.ip });
  next();
});

// Input Validation Schemas
const ReserveSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  userId: z.string().uuid() // In production derived cleanly from verified req.user auth payload
});

const CheckoutSchema = z.object({
  reservationId: z.string().uuid(),
  userId: z.string().uuid()
});

// Endpoints
app.post('/api/reserve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = ReserveSchema.parse(req.body);
    const reservation = await reserveProductStock(parsed.userId, parsed.productId, parsed.quantity);
    res.status(201).json({ reservationId: reservation.id, expiresAt: reservation.expiresAt });
  } catch (err) { next(err); }
});

app.post('/api/checkout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CheckoutSchema.parse(req.body);
    const order = await processCheckout(parsed.reservationId, parsed.userId);
    res.status(200).json({ orderId: order.id, status: 'SUCCESS' });
  } catch (err) { next(err); }
});

app.get('/metrics', (req: Request, res: Response) => {
  res.status(200).json(metrics);
});

app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'HEALTHY', timestamp: new Date() });
});

// Centralized Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: 'Validation failed', details: err.errors });
    return;
  }
  if (err instanceof AppError) {
    logger.warn({ message: err.message, statusCode: err.statusCode, path: req.path });
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  logger.error({ error: err.message, stack: err.stack, path: req.path });
  res.status(500).json({ error: 'Internal Server Error' });
});

// Bootstrap scheduler execution concurrently alongside standard runtime execution vectors
startInternalScheduler();

export default app;