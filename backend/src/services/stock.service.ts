import prisma from '../utils/prisma';
import { AppError } from '../utils/AppError';
import { PaginationQuery } from '../types';

interface ProductRow {
  id: string;
  name: string;
  description: string;
  totalStock: number;
  reservedStock: number;
  price: number;
  createdAt: Date;
}

interface EnrichedProduct extends ProductRow {
  availableStock: number;
}

export async function getProductById(id: string): Promise<EnrichedProduct> {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError('Product not found', 404);
  return { ...product, availableStock: product.totalStock - product.reservedStock };
}

export async function listProducts(query: PaginationQuery) {
  const page = Math.max(1, parseInt(query.page ?? '1'));
  const limit = Math.min(50, Math.max(1, parseInt(query.limit ?? '10')));
  const skip = (page - 1) * limit;

  const sortField = ['name', 'price', 'totalStock', 'createdAt'].includes(query.sort ?? '')
    ? query.sort!
    : 'createdAt';

  const order: 'asc' | 'desc' = query.order === 'asc' ? 'asc' : 'desc';
  const minStock = query.minStock ? parseInt(query.minStock) : undefined;

  const [products, total] = await Promise.all([
    prisma.product.findMany({ orderBy: { [sortField]: order }, skip, take: limit }),
    prisma.product.count(),
  ]);

  const enriched: EnrichedProduct[] = (products as ProductRow[])
    .map((p: ProductRow): EnrichedProduct => ({ ...p, availableStock: p.totalStock - p.reservedStock }))
    .filter((p: EnrichedProduct) => minStock === undefined || p.availableStock >= minStock);

  return {
    data: enriched,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
