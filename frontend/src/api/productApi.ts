import api from './client';
import { Product } from '../types';

export async function getProduct(id: string): Promise<Product> {
  const res = await api.get<Product>(`/products/${id}`);
  return res.data;
}

export async function listProducts(): Promise<{ data: Product[] }> {
  const res = await api.get<{ data: Product[] }>('/products');
  return res.data;
}
