import { useState, useEffect } from 'react';

export function useCountdown(expiresAt: string | null) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    if (!expiresAt) {
      setSecondsLeft(0);
      setIsExpired(false);
      return;
    }

    const calculateTime = () => {
      const difference = new Date(expiresAt).getTime() - Date.now();
      const seconds = Math.max(0, Math.floor(difference / 1000));
      
      setSecondsLeft(seconds);
      if (seconds <= 0) {
        setIsExpired(true);
      } else {
        setIsExpired(false);
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  return { secondsLeft, isExpired };
}