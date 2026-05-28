import { PrismaClient } from '@prisma/client';
import { AppError } from '../types';

const prisma = new PrismaClient();

interface ProductQueryParams {
  page?: number;
  limit?: number;
  minStock?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError('Product not found', 404);
  return {
    ...product,
    availableStock: product.totalStock - product.reservedStock
  };
}

export async function listProducts(params: ProductQueryParams) {
  const page = params.page || 1;
  const limit = params.limit || 10;
  const skip = (page - 1) * limit;
  const minStock = params.minStock || 0;
  
  const sortField = params.sort === 'price' ? 'price' : 'createdAt';
  const sortOrder = params.order === 'asc' ? 'asc' : 'desc';

  const products = await prisma.product.findMany({
    where: {
      totalStock: {
        gte: minStock
      }
    },
    skip,
    take: limit,
    orderBy: {
      [sortField]: sortOrder
    }
  });

  return products.map(p => ({
    ...p,
    availableStock: p.totalStock - p.reservedStock
  }));
}
