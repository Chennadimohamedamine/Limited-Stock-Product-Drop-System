import React from 'react';
import { useStock } from '../hooks/useStock';
import { useReservation } from '../hooks/useReservation';
import { ProductCard } from '../components/ProductCard';
import { CountdownTimer } from '../components/CountdownTimer';

interface DropPageProps {
  token: string;
  productId: string;
}

export const DropPage: React.FC<DropPageProps> = ({ token, productId }) => {
  const { product, error: stockError } = useStock(productId);
  const { status, reservation, errorMsg, orderId, reserve, executeCheckout, setExpired } = useReservation(token);

  if (!product) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading live drops data sync...</div>;
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <header style={{ marginBottom: '2rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem' }}>
        <h1>Exclusive Flash Drop Event</h1>
        {stockError && <div style={{ color: '#ea580c', fontWeight: 'bold' }}>{stockError}</div>}
      </header>

      <ProductCard 
        product={product} 
        reservationStatus={status} 
        onReserve={() => reserve(product.id, 1)} 
      />

      {errorMsg && (
        <div style={{
          marginTop: '1rem', padding: '1rem', backgroundColor: '#fee2e2', color: '#dc2626',
          borderRadius: '4px', fontWeight: 'bold'
        }}>
          {errorMsg}
        </div>
      )}

      {status === 'reserved' && reservation && (
        <div style={{ marginTop: '1.5rem', padding: '1.5rem', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#16a34a' }}>Item Secured Temporarily!</h3>
          <CountdownTimer expiresAt={reservation.expiresAt} onExpire={setExpired} />
          <button
            onClick={executeCheckout}
            style={{
              backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '0.75rem 1.5rem',
              borderRadius: '4px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer', width: '100%'
            }}
          >
            Complete Instant Payment
          </button>
        </div>
      )}

      {status === 'completed' && orderId && (
        <div style={{
          marginTop: '1.5rem', padding: '1.5rem', backgroundColor: '#dcfce7', color: '#15803d',
          borderRadius: '8px', textAlign: 'center'
        }}>
          <h2>Order Confirmed! 🎉</h2>
          <p>Your unique tokenized ticket receipt ID: <strong>{orderId}</strong></p>
        </div>
      )}
    </div>
  );
};