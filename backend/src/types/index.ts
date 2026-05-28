export interface JwtPayload {
  userId: string;
  email: string;
  iat?: number;
  exp?: number;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  minStock?: string;
}

export type ReservationStatus = 'PENDING' | 'COMPLETED' | 'EXPIRED';
export type InventoryEvent = 'RESERVED' | 'EXPIRED' | 'PURCHASED';
