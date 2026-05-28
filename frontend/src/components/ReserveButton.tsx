
import { ReservationStatus } from '../types';

interface Props {
  status: ReservationStatus;
  isSoldOut: boolean;
  onClick: () => void;
}

export function ReserveButton({ status, isSoldOut, onClick }: Props) {
  const disabled =
    isSoldOut ||
    status === 'loading' ||
    status === 'reserved' ||
    status === 'completed';

  const label = () => {
    if (isSoldOut) return 'SOLD OUT';
    if (status === 'loading') return 'PROCESSING...';
    if (status === 'reserved') return 'RESERVED ✓';
    if (status === 'completed') return 'PURCHASED ✓';
    if (status === 'error') return 'TRY AGAIN';
    if (status === 'expired') return 'RESERVE NOW';
    return 'RESERVE NOW';
  };

  const bg = () => {
    if (isSoldOut || disabled) return 'transparent';
    return 'var(--accent)';
  };

  const color = () => {
    if (isSoldOut) return 'var(--text-dim)';
    if (status === 'completed') return 'var(--green)';
    if (disabled) return 'var(--text-muted)';
    return '#000';
  };

  const border = () => {
    if (isSoldOut) return 'var(--border)';
    if (status === 'reserved') return 'var(--accent)';
    if (status === 'completed') return 'var(--green)';
    return 'transparent';
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '16px',
        background: bg(),
        color: color(),
        border: `1px solid ${border()}`,
        borderRadius: 'var(--radius)',
        fontFamily: 'var(--font-display)',
        fontSize: '20px',
        letterSpacing: '0.12em',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all var(--transition)',
        position: 'relative',
        overflow: 'hidden',
        animation: status === 'loading' ? 'pulse 1s ease infinite' :
                   status === 'error' ? 'shake 300ms ease' : 'none',
      }}
    >
      {status === 'loading' && (
        <span style={{
          display: 'inline-block',
          width: '14px', height: '14px',
          border: '2px solid #000',
          borderTopColor: 'transparent',
          borderRadius: '50%',
          animation: 'spin 600ms linear infinite',
          verticalAlign: 'middle',
          marginRight: '8px',
        }} />
      )}
      {label()}
    </button>
  );
}
