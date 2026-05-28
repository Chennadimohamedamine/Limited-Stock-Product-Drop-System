import React from 'react';
import { ReservationStatus } from '../types';

interface ReserveButtonProps {
  status: ReservationStatus;
  availableStock: number;
  onClick: () => void;
}

export const ReserveButton: React.FC<ReserveButtonProps> = ({ status, availableStock, onClick }) => {
  const isSoldOut = availableStock <= 0;
  const isDisabled = isSoldOut || status === 'loading' || status === 'reserved' || status === 'completed';

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      style={{
        backgroundColor: isDisabled ? '#9ca3af' : '#2563eb',
        color: '#ffffff',
        padding: '0.75rem 1.5rem',
        border: 'none',
        borderRadius: '4px',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        fontSize: '1rem',
        fontWeight: 'bold',
        transition: 'background-color 0.2s'
      }}
    >
      {status === 'loading' && 'Reserving...'}
      {status === 'reserved' && 'Reserved'}
      {status === 'completed' && 'Purchased'}
      {status !== 'loading' && status !== 'reserved' && status !== 'completed' && (isSoldOut ? 'Sold Out' : 'Claim Your Drop')}
    </button>
  );
};