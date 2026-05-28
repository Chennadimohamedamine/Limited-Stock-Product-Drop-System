export interface Product {
    id: string;
    name: string;
    description: string;
    totalStock: number;
    reservedStock: number;
    availableStock: number;
    price: number;
  }
  
  export interface Reservation {
    reservationId: string;
    expiresAt: string;
  }
  
  export type ReservationStatus = 'idle' | 'loading' | 'reserved' | 'expired' | 'completed' | 'error';
  
  export interface User {
    id: string;
    email: string;
  }
  
  export interface AuthResponse {
    token: string;
    user: User;
  }