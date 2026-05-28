import { useState, useCallback } from 'react';
import { Reservation, Order, ReservationStatus } from '../types';
import { reserve } from '../api/reserveApi';
import { checkout } from '../api/checkoutApi';

interface ReservationState {
  status: ReservationStatus;
  reservation: Reservation | null;
  order: Order | null;
  error: string | null;
}

export function useReservation() {
  const [state, setState] = useState<ReservationState>({
    status: 'idle',
    reservation: null,
    order: null,
    error: null,
  });

  const makeReservation = useCallback(async (productId: string, quantity = 1) => {
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const reservation = await reserve(productId, quantity);
      setState({ status: 'reserved', reservation, order: null, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reservation failed';
      setState((s) => ({ ...s, status: 'error', error: message }));
    }
  }, []);

  const completeCheckout = useCallback(async (reservationId: string) => {
    setState((s) => ({ ...s, status: 'loading', error: null }));
    try {
      const order = await checkout(reservationId);
      setState((s) => ({ ...s, status: 'completed', order, error: null }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      setState((s) => ({ ...s, status: 'error', error: message }));
    }
  }, []);

  const markExpired = useCallback(() => {
    setState((s) => ({ ...s, status: 'expired' }));
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle', reservation: null, order: null, error: null });
  }, []);

  return {
    ...state,
    makeReservation,
    completeCheckout,
    markExpired,
    reset,
  };
}
