import React, { useState, useEffect } from 'react';
import { useReservation } from '../hooks/useReservation';

interface ProductData {
  id: string;
  name: string;
  totalStock: number;
  reservedStock: number;
}

export const LimitedDropPage: React.FC<{ productId: string; currentUserId: string }> = ({ productId, currentUserId }) => {
  const [product, setProduct] = useState<ProductData | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState<boolean>(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState<boolean>(false);

  const fetchProductState = async () => {
    try {
      // In production, this can be map fetched from a public product listing endpoint
      const res = await fetch(`/api/products/${productId}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
      }
    } catch (err) {
      setUiError('Failed to fetch real-time stock balances.');
    }
  };

  // Real-time stock refresh boundary from Screen Shot 2026-05-28 at 7.28.46 PM.png (every 5 seconds)
  useEffect(() => {
    fetchProductState();
    const pollingInterval = setInterval(fetchProductState, 5000);
    return () => clearInterval(pollingInterval);
  }, [productId]);

  const handleReservationExpired = () => {
    setUiError('Your 5-minute reservation window has expired! Stock returned to drop pool.');
    fetchProductState();
  };

  const {
    reservationId,
    timeLeft,
    isLoading: isReserving,
    error: reservationError,
    createReservation,
    resetState
  } = useReservation({
    productId,
    userId: currentUserId,
    onExpiration: handleReservationExpired
  });

  const handleCheckout = async () => {
    if (!reservationId) return;
    setIsCheckingOut(true);
    setUiError(null);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId, userId: currentUserId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout process rejected.');
      
      setCheckoutSuccess(true);
      resetState();
      fetchProductState();
    } catch (err: any) {
      setUiError(err.message);
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (!product) return <div>Loading limited drop details...</div>;

  const currentAvailableStock = product.totalStock - product.reservedStock;
  const isSoldOut = currentAvailableStock <= 0;

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>{product.name}</h1>
      
      <div style={{ margin: '1rem 0', padding: '1rem', background: '#f0f0f0', borderRadius: '4px' }}>
        <strong>Available Units Remaining: </strong> 
        <span style={{ color: isSoldOut ? 'red' : 'green', fontSize: '1.25rem', fontWeight: 'bold' }}>
          {isSoldOut ? 'SOLD OUT' : currentAvailableStock}
        </span>
      </div>

      {(uiError || reservationError) && (
        <div style={{ color: 'white', background: '#d9534f', padding: '0.75rem', marginBottom: '1rem', borderRadius: '4px' }}>
          {uiError || reservationError}
        </div>
      )}

      {checkoutSuccess && (
        <div style={{ color: 'white', background: '#5cb85c', padding: '0.75rem', marginBottom: '1rem', borderRadius: '4px' }}>
          Order placed successfully! Check out complete.
        </div>
      )}

      {reservationId && timeLeft > 0 ? (
        <div style={{ border: '2px dashed orange', padding: '1rem', borderRadius: '4px', textAlign: 'center' }}>
          <h3 style={{ color: 'orange', margin: '0 0 0.5rem 0' }}>Stock Locked Natively</h3>
          <p>Complete your payment inside this allocation block:</p>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', margin: '1rem 0' }}>
            {formatCountdown(timeLeft)}
          </div>
          <button
            onClick={handleCheckout}
            disabled={isCheckingOut}
            style={{ width: '100%', padding: '0.75rem', background: '#5cb85c', color: 'white', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
          >
            {isCheckingOut ? 'Processing Purchase...' : 'Complete Checkout Now'}
          </button>
        </div>
      ) : (
        <button
          onClick={() => createReservation(1)}
          disabled={isSoldOut || isReserving}
          style={{
            width: '100%',
            padding: '1rem',
            background: isSoldOut ? '#ccc' : '#0275d8',
            color: 'white',
            border: 'none',
            cursor: isSoldOut ? 'not-allowed' : 'pointer',
            fontSize: '1.1rem',
            fontWeight: 'bold'
          }}
        >
          {isReserving ? 'Securing Allocation Ticket...' : isSoldOut ? 'Sold Out' : 'Reserve Spot'}
        </button>
      )}
    </div>
  );
};