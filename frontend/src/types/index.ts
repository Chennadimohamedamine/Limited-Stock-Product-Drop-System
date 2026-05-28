export interface Product {
  id: string;
  name: string;
  description: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number;
  price: number;
  createdAt: string;
}

export interface Reservation {
  reservationId: string;
  expiresAt: string;
  status: string;
}

export interface Order {
  orderId: string;
  productId: string;
  quantity: number;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiError {
  error: string;
  details?: unknown;
}

export type ReservationStatus =
  | 'idle'
  | 'loading'
  | 'reserved'
  | 'expired'
  | 'completed'
  | 'error';
