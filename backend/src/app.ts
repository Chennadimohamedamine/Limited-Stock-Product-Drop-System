import express from 'express';
import cors from 'cors';

import { rateLimiter } from './middleware/rateLimiter';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import reserveRoutes from './routes/reserve';
import checkoutRoutes from './routes/checkout';
import healthRoutes from './routes/health';

const app = express();

// --- Core middleware ---
app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(requestLogger);
app.use(rateLimiter);

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/reserve', reserveRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/', healthRoutes);

// --- Error handler (must be last) ---
app.use(errorHandler);

export default app;
