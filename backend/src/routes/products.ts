import { Router, Response, NextFunction, RequestHandler } from 'express';
import * as stockService from '../services/stock.service';

const router = Router();

const listProductsHandler: RequestHandler = async (req, res, next) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const minStock = req.query.minStock ? parseInt(req.query.minStock as string, 10) : undefined;
    const sort = req.query.sort as string;
    const order = req.query.order as 'asc' | 'desc';

    const products = await stockService.listProducts({ page, limit, minStock, sort, order });
    res.json(products);
  } catch (err) {
    next(err);
  }
};

const getProductHandler: RequestHandler = async (req, res, next) => {
  try {
    const product = await stockService.getProductById(req.params.id);
    res.json(product);
  } catch (err) {
    next(err);
  }
};

router.get('/', listProductsHandler);
router.get('/:id', getProductHandler);

export default router;
