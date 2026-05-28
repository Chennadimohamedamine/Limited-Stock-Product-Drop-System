import api from './client';
import { Order } from '../types';

export async function checkout(reservationId: string): Promise<Order> {
  const res = await api.post<Order>('/checkout', { reservationId });
  return res.data;
}
