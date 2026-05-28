import React, { useState } from 'react';

interface Props {
  onSuccess: (email: string, password: string, mode: 'login' | 'register') => Promise<void>;
  onClose: () => void;
  error: string | null;
  loading: boolean;
}

export function AuthModal({ onSuccess, onClose, error, loading }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSuccess(email, password, mode);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 14px',
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    outline: 'none',
    transition: 'border-color var(--transition)',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: '24px',
      backdropFilter: 'blur(4px)',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-bright)',
        borderRadius: 'var(--radius)',
        width: '100%', maxWidth: '380px',
        padding: '32px',
        animation: 'fadeUp 200ms ease',
      }}>
        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '32px', letterSpacing: '0.06em',
            marginBottom: '4px',
          }}>
            {mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </h2>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '11px',
            color: 'var(--text-muted)',
          }}>
            {mode === 'login' ? 'Access your account to reserve drops' : 'Join to reserve limited drops'}
          </p>
        </div>

        {/* Tab toggle */}
        <div style={{
          display: 'flex', gap: '0',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          marginBottom: '24px', overflow: 'hidden',
        }}>
          {(['login', 'register'] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: '8px',
              background: mode === m ? 'var(--surface-2)' : 'transparent',
              border: 'none',
              color: mode === m ? 'var(--text)' : 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', fontSize: '11px',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              cursor: 'pointer',
              transition: 'all var(--transition)',
            }}>
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="email" placeholder="email@address.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
            required style={inputStyle}
            onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-bright)'; }}
            onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border)'; }}
          />
          <input
            type="password" placeholder="password (min 8 chars)"
            value={password} onChange={(e) => setPassword(e.target.value)}
            required minLength={8} style={inputStyle}
            onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-bright)'; }}
            onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border)'; }}
          />

          {error && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '12px',
              color: 'var(--red)', padding: '10px 12px',
              background: '#1a0808', border: '1px solid var(--red)',
              borderRadius: 'var(--radius)',
            }}>
              {error}
            </div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '14px',
              background: loading ? 'transparent' : 'var(--accent)',
              border: `1px solid ${loading ? 'var(--border)' : 'transparent'}`,
              borderRadius: 'var(--radius)',
              color: loading ? 'var(--text-muted)' : '#000',
              fontFamily: 'var(--font-display)',
              fontSize: '20px', letterSpacing: '0.12em',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
              transition: 'all var(--transition)',
              animation: loading ? 'pulse 1s ease infinite' : 'none',
            }}
          >
            {loading ? 'PLEASE WAIT...' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <button
          onClick={onClose}
          style={{
            display: 'block', margin: '16px auto 0',
            background: 'none', border: 'none',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)', fontSize: '11px',
            cursor: 'pointer', textDecoration: 'underline',
          }}
        >
          cancel
        </button>
      </div>
    </div>
  );
}
