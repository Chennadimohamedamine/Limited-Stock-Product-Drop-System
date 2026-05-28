import { useState, useEffect } from 'react';
import { useStock } from '../hooks/useStock';
import { useAuth } from '../hooks/useAuth';
import { ProductCard } from '../components/ProductCard';
import { AuthModal } from '../components/AuthModal';
import { toast } from '../components/Toast';

// Read product ID from env or default to first seeded product
const DEFAULT_PRODUCT_ID = import.meta.env.VITE_PRODUCT_ID as string | undefined;

function Header({ user, onSignIn, onSignOut }: {
  user: { email: string } | null;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  return (
    <header style={{
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
      height: '52px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0,
      background: 'rgba(10,10,10,0.95)',
      backdropFilter: 'blur(8px)',
      zIndex: 50,
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '20px', letterSpacing: '0.12em',
        color: 'var(--text)',
      }}>
        DROP<span style={{ color: 'var(--accent)' }}>SYS</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {user ? (
          <>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              color: 'var(--text-muted)',
            }}>
              {user.email}
            </span>
            <button onClick={onSignOut} style={{
              background: 'none', border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              padding: '5px 12px', borderRadius: 'var(--radius)',
              cursor: 'pointer', transition: 'all var(--transition)',
            }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.borderColor = 'var(--border-bright)'; (e.target as HTMLElement).style.color = 'var(--text)'; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--text-muted)'; }}
            >
              sign out
            </button>
          </>
        ) : (
          <button onClick={onSignIn} style={{
            background: 'none', border: '1px solid var(--border-bright)',
            color: 'var(--text)',
            fontFamily: 'var(--font-mono)', fontSize: '11px',
            padding: '5px 12px', borderRadius: 'var(--radius)',
            cursor: 'pointer', transition: 'all var(--transition)',
          }}>
            sign in
          </button>
        )}
      </div>
    </header>
  );
}

function ProductSkeleton() {
  const bar = (w: string, h: string, mt = '0') => (
    <div style={{
      width: w, height: h, background: 'var(--surface-2)',
      borderRadius: 'var(--radius)', marginTop: mt,
      animation: 'pulse 1.5s ease infinite',
    }} />
  );
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', overflow: 'hidden',
    }}>
      <div style={{ padding: '24px', borderBottom: '1px solid var(--border)' }}>
        {bar('60px', '12px')}
        {bar('80%', '40px', '14px')}
        {bar('100%', '12px', '12px')}
        {bar('70%', '12px', '6px')}
      </div>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
        {bar('80px', '32px')}
        {bar('100%', '3px', '14px')}
      </div>
      <div style={{ padding: '20px 24px' }}>
        {bar('100%', '52px')}
      </div>
    </div>
  );
}

export function DropPage() {
  const { token, user, login, register, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [productId, setProductId] = useState<string | null>(DEFAULT_PRODUCT_ID ?? null);
  const [isFetchingProductId, setIsFetchingProductId] = useState(!DEFAULT_PRODUCT_ID);

  // Only call useStock if we have a valid product ID
  const { product, isLoading, error } = useStock(productId);

  // If no product ID configured, fetch the first product
  useEffect(() => {
    if (!productId && !DEFAULT_PRODUCT_ID) {
      fetch('/api/products?limit=1')
        .then((r) => {
          if (!r.ok) throw new Error(`API returned ${r.status}`);
          return r.json();
        })
        .then((d: { data?: Array<{ id: string }> }) => {
          const firstProductId = d.data?.[0]?.id;
          if (firstProductId) {
            setProductId(firstProductId);
          } else {
            throw new Error('No products available');
          }
        })
        .catch((err) => {
          console.error('Failed to fetch products:', err);
          toast('Could not connect to server', 'error');
        })
        .finally(() => setIsFetchingProductId(false));
    } else {
      setIsFetchingProductId(false);
    }
  }, []);

  const handleAuth = async (email: string, password: string, mode: 'login' | 'register') => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password);
      setShowAuth(false);
      toast('Welcome!', 'success');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header user={user} onSignIn={() => setShowAuth(true)} onSignOut={logout} />

      <main style={{
        flex: 1, display: 'flex', alignItems: 'flex-start',
        justifyContent: 'center', padding: '48px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: '480px' }}>
          {/* Page title */}
          <div style={{ marginBottom: '32px', animation: 'fadeUp 300ms ease' }}>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '10px',
              color: 'var(--text-muted)', textTransform: 'uppercase',
              letterSpacing: '0.16em', marginBottom: '8px',
            }}>
              Limited Release
            </p>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(40px, 8vw, 72px)',
              letterSpacing: '0.04em',
              lineHeight: 0.9,
              textTransform: 'uppercase',
            }}>
              DROP<br />
              <span style={{ color: 'var(--accent)' }}>ZONE</span>
            </h1>
            <p style={{
              fontFamily: 'var(--font-body)', fontSize: '13px',
              color: 'var(--text-muted)', marginTop: '12px',
              lineHeight: 1.6,
            }}>
              100 users. Limited stock. One chance.
            </p>
          </div>

          {/* Network error */}
          {error && !isLoading && !isFetchingProductId && (
            <div style={{
              padding: '14px 16px', marginBottom: '16px',
              background: '#1a0808', border: '1px solid var(--red)',
              borderRadius: 'var(--radius)',
              fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--red)',
              animation: 'fadeUp 200ms ease',
            }}>
              ⚠ {error} — retrying automatically
            </div>
          )}

          {/* Product */}
          {isLoading || isFetchingProductId ? (
            <ProductSkeleton />
          ) : product ? (
            <ProductCard
              product={product}
              isAuthenticated={!!token}
              onRequireAuth={() => setShowAuth(true)}
            />
          ) : (
            <div style={{
              padding: '40px', textAlign: 'center',
              border: '1px solid var(--border)', borderRadius: 'var(--radius)',
              fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)',
            }}>
              Connecting to server...
            </div>
          )}

          {/* Footer */}
          <div style={{
            marginTop: '32px', paddingTop: '24px',
            borderTop: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)', fontSize: '10px',
            color: 'var(--text-dim)',
          }}>
            <span>Stock refreshes every 5s</span>
            <span>Reservations expire after 5 min</span>
          </div>
        </div>
      </main>

      {showAuth && (
        <AuthModal
          onSuccess={handleAuth}
          onClose={() => { setShowAuth(false); setAuthError(null); }}
          error={authError}
          loading={authLoading}
        />
      )}
    </div>
  );
}