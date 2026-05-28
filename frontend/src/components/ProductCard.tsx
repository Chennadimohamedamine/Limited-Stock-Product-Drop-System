import React from 'react';
import { Product, ReservationStatus } from '../types';
import { StockBadge } from './StockBadge';
import { ReserveButton } from './ReserveButton';

interface ProductCardProps {
  product: Product;
  reservationStatus: ReservationStatus;
  onReserve: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, reservationStatus, onReserve }) => {
  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '1.5rem',
      maxWidth: '400px',
      backgroundColor: '#ffffff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h2 style={{ margin: '0 0 0.5rem 0' }}>{product.name}</h2>
      <p style={{ color: '#4b5563', margin: '0 0 1rem 0' }}>{product.description}</p>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: '0 0 1rem 0' }}>
        ${product.price.toFixed(2)}
      </div>
      <StockBadge availableStock={product.availableStock} />
      <div style={{ marginTop: '1rem' }}>
        <ReserveButton 
          status={reservationStatus} 
          availableStock={product.availableStock} 
          onClick={onReserve} 
        />
      </div>
    </div>
  );
};