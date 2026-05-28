import { useState, useEffect, useRef } from 'react';

interface UseReservationProps {
  productId: string;
  userId: string;
  onExpiration: () => void;
}

export function useReservation({ productId, userId, onExpiration }: UseReservationProps) {
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0); // countdown in seconds
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clearActiveTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const createReservation = async (quantity: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, userId, quantity })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to complete reservation action.');

      setReservationId(data.reservationId);
      
      const durationMs = new Date(data.expiresAt).getTime() - Date.now();
      const durationSec = Math.max(Math.floor(durationMs / 1000), 0);
      setTimeLeft(durationSec);
    } catch (err: any) {
      setError(err.message || 'An unexpected execution issue occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (timeLeft > 0 && !timerRef.current) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearActiveTimer();
            onExpiration();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearActiveTimer();
  }, [timeLeft, onExpiration]);

  return {
    reservationId,
    timeLeft,
    isLoading,
    error,
    createReservation,
    resetState: () => { setReservationId(null); setTimeLeft(0); setError(null); }
  };
}