import { Router, Request, Response, NextFunction } from 'express';
import * as stockService from '../services/stock.service';
import { PaginationQuery } from '../types';

const router = Router();

// GET /api/products  — list with pagination, filtering, sorting
router.get(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await stockService.listProducts(req.query as PaginationQuery);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/products/:id  — single product with available stock
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await stockService.getProductById(req.params.id);
      res.json(product);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
