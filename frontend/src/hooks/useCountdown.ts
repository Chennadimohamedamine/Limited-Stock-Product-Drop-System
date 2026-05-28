import { useState, useEffect, useRef } from 'react';

interface UseCountdownResult {
  secondsLeft: number;
  isExpired: boolean;
  formatted: string; // MM:SS
}

export function useCountdown(expiresAt: string | null): UseCountdownResult {
  const getSecondsLeft = () => {
    if (!expiresAt) return 0;
    return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  };

  const [secondsLeft, setSecondsLeft] = useState(getSecondsLeft);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!expiresAt) {
      setSecondsLeft(0);
      return;
    }

    setSecondsLeft(getSecondsLeft());

    intervalRef.current = setInterval(() => {
      const remaining = getSecondsLeft();
      setSecondsLeft(remaining);
      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return { secondsLeft, isExpired: secondsLeft === 0 && expiresAt !== null, formatted };
}
