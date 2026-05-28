import { useEffect } from 'react';
import { useCountdown } from '../hooks/useCountdown';

interface Props {
  expiresAt: string;
  onExpired: () => void;
}

export function CountdownTimer({ expiresAt, onExpired }: Props) {
  const { formatted, isExpired, secondsLeft } = useCountdown(expiresAt);

  useEffect(() => {
    if (isExpired) onExpired();
  }, [isExpired, onExpired]);

  const isUrgent = secondsLeft <= 60;

  return (
    <div style={{
      background: 'var(--surface-2)',
      border: `1px solid ${isUrgent ? 'var(--orange)' : 'var(--border)'}`,
      borderRadius: 'var(--radius)',
      padding: '12px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      transition: 'border-color 300ms ease',
    }}>
      <div>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: '10px',
          color: 'var(--text-muted)', textTransform: 'uppercase',
          letterSpacing: '0.12em', marginBottom: '2px',
        }}>
          Reserved — expires in
        </div>
        <div style={{
          fontFamily: 'var(--font-display)', fontSize: '36px',
          color: isUrgent ? 'var(--orange)' : 'var(--accent)',
          letterSpacing: '0.05em', lineHeight: 1,
          animation: isUrgent ? 'tick 1s ease infinite' : 'none',
        }}>
          {formatted}
        </div>
      </div>
      <div style={{
        width: '8px', height: '8px', borderRadius: '50%',
        background: isUrgent ? 'var(--orange)' : 'var(--green)',
        animation: 'pulse 1.5s ease infinite',
        flexShrink: 0,
      }} />
    </div>
  );
}
