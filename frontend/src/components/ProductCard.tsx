import { useCallback, useEffect } from 'react';
import { Product } from '../types';
import { StockBadge } from './StockBadge';
import { ReserveButton } from './ReserveButton';
import { CountdownTimer } from './CountdownTimer';
import { useReservation } from '../hooks/useReservation';
import { toast } from './Toast';
import { checkout } from '../api/checkoutApi';

interface Props {
  product: Product;
  isAuthenticated: boolean;
  onRequireAuth: () => void;
}

export function ProductCard({ product, isAuthenticated, onRequireAuth }: Props) {
  const {
    status, reservation, order, error,
    makeReservation, markExpired, reset,
  } = useReservation();

  const isSoldOut = product.availableStock <= 0;

  useEffect(() => {
    if (error) {
      const isRace = error.toLowerCase().includes('insufficient') || error.toLowerCase().includes('stock');
      if (isRace) toast('Someone just grabbed the last one!', 'error');
      else if (error.toLowerCase().includes('already')) toast(error, 'info');
      else toast(error, 'error');
    }
  }, [error]);

  const handleReserve = useCallback(() => {
    if (!isAuthenticated) { onRequireAuth(); return; }
    if (status === 'idle' || status === 'error' || status === 'expired') {
      makeReservation(product.id, 1);
    }
  }, [isAuthenticated, onRequireAuth, status, makeReservation, product.id]);

  const handleCheckout = useCallback(async () => {
    if (!reservation) return;
    try {
      await checkout(reservation.reservationId);
      toast('Purchase complete! 🎉', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Checkout failed', 'error');
    }
  }, [reservation]);

  const handleExpired = useCallback(() => {
    markExpired();
    toast('Your reservation expired. Stock restored.', 'info');
  }, [markExpired]);

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
      animation: 'fadeUp 400ms ease',
    }}>
      {/* Product header strip */}
      <div style={{
        padding: '24px 24px 0',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '24px',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', marginBottom: '12px',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px',
            color: 'var(--text-muted)', textTransform: 'uppercase',
            letterSpacing: '0.14em',
          }}>
            Drop #{product.id.slice(-6).toUpperCase()}
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px',
            color: 'var(--accent)', textTransform: 'uppercase',
            letterSpacing: '0.14em',
            animation: isSoldOut ? 'none' : 'pulse 3s ease infinite',
          }}>
            {isSoldOut ? '● SOLD OUT' : '● LIVE'}
          </div>
        </div>

        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 5vw, 48px)',
          letterSpacing: '0.03em',
          lineHeight: 0.95,
          color: 'var(--text)',
          marginBottom: '12px',
          textTransform: 'uppercase',
        }}>
          {product.name}
        </h2>

        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          color: 'var(--text-muted)',
          lineHeight: 1.6,
          fontWeight: 300,
        }}>
          {product.description}
        </p>
      </div>

      {/* Price + stock */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '16px' }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '10px',
              color: 'var(--text-muted)', textTransform: 'uppercase',
              letterSpacing: '0.12em', marginBottom: '2px',
            }}>Price</div>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: '32px',
              letterSpacing: '0.05em', color: 'var(--text)',
            }}>
              ${product.price.toFixed(2)}
            </div>
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '11px',
            color: 'var(--text-muted)',
          }}>
            Refreshes every 5s
          </div>
        </div>
        <StockBadge available={product.availableStock} total={product.totalStock} />
      </div>

      {/* Action area */}
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Countdown */}
        {status === 'reserved' && reservation && (
          <CountdownTimer expiresAt={reservation.expiresAt} onExpired={handleExpired} />
        )}

        {/* Expired message */}
        {status === 'expired' && (
          <div style={{
            padding: '12px 16px',
            background: '#1a0808',
            border: '1px solid var(--red)',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-mono)', fontSize: '12px',
            color: 'var(--red)',
            animation: 'fadeUp 200ms ease',
          }}>
            ✗ Reservation expired — stock released back
          </div>
        )}

        {/* Completed */}
        {status === 'completed' && order && (
          <div style={{
            padding: '12px 16px',
            background: '#081a0d',
            border: '1px solid var(--green)',
            borderRadius: 'var(--radius)',
            fontFamily: 'var(--font-mono)', fontSize: '12px',
            color: 'var(--green)',
            animation: 'fadeUp 200ms ease',
          }}>
            ✓ Order confirmed — #{order.orderId.slice(-8).toUpperCase()}
          </div>
        )}

        <ReserveButton status={status} isSoldOut={isSoldOut} onClick={handleReserve} />

        {/* Checkout button */}
        {status === 'reserved' && reservation && (
          <button
            onClick={handleCheckout}
            style={{
              width: '100%', padding: '14px',
              background: 'transparent',
              border: '1px solid var(--border-bright)',
              borderRadius: 'var(--radius)',
              color: 'var(--text)',
              fontFamily: 'var(--font-display)',
              fontSize: '18px', letterSpacing: '0.12em',
              cursor: 'pointer',
              transition: 'all var(--transition)',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = 'var(--text)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.borderColor = 'var(--border-bright)';
            }}
          >
            COMPLETE PURCHASE
          </button>
        )}

        {/* Reset */}
        {(status === 'expired' || status === 'error') && (
          <button
            onClick={reset}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              cursor: 'pointer', textDecoration: 'underline',
              padding: '4px 0',
            }}
          >
            clear
          </button>
        )}

        {/* Auth hint */}
        {!isAuthenticated && (
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '11px',
            color: 'var(--text-muted)', textAlign: 'center',
          }}>
            Sign in required to reserve
          </p>
        )}
      </div>
    </div>
  );
}
