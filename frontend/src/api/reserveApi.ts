import api from './client';
import { Reservation } from '../types';

export async function reserve(productId: string, quantity: number): Promise<Reservation> {
  const res = await api.post<Reservation>('/reserve', { productId, quantity });
  return res.data;
}
