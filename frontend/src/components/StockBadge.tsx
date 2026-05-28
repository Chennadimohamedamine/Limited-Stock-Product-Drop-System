import React from 'react';

interface StockBadgeProps {
  availableStock: number;
}

export const StockBadge: React.FC<StockBadgeProps> = ({ availableStock }) => {
  const isSoldOut = availableStock <= 0;
  return (
    <div style={{
      padding: '0.5rem 1rem',
      borderRadius: '4px',
      fontWeight: 'bold',
      backgroundColor: isSoldOut ? '#fee2e2' : '#dcfce7',
      color: isSoldOut ? '#dc2626' : '#16a34a',
      display: 'inline-block',
      margin: '0.5rem 0'
    }}>
      {isSoldOut ? 'Sold out' : `${availableStock} left`}
    </div>
  );
};