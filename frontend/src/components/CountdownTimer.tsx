import React, { useEffect } from 'react';
import { useCountdown } from '../hooks/useCountdown';

interface CountdownTimerProps {
  expiresAt: string;
  onExpire: () => void;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ expiresAt, onExpire }) => {
  const { secondsLeft, isExpired } = useCountdown(expiresAt);

  useEffect(() => {
    if (isExpired) {
      onExpire();
    }
  }, [isExpired, onExpire]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ margin: '1rem 0', color: '#ea580c', fontWeight: 'bold' }}>
      {isExpired ? (
        <span>Your reservation has expired. Try again.</span>
      ) : (
        <span>Time remaining to complete buy: {formatTime(secondsLeft)}</span>
      )}
    </div>
  );
};