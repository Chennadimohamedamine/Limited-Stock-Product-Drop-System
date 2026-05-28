import React, { useState } from 'react';

interface AuthModalProps {
  onLogin: (e: string, p: string) => Promise<void>;
  onRegister: (e: string, p: string) => Promise<void>;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin, onRegister }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    try {
      if (isLogin) {
        await onLogin(email, password);
      } else {
        await onRegister(email, password);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication challenge failed.');
    }
  };

  return (
    <div style={{
      maxWidth: '400px',
      margin: '4rem auto',
      padding: '2rem',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      backgroundColor: '#ffffff'
    }}>
      <div style={{ display: 'flex', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => setIsLogin(true)}
          style={{
            flex: 1, padding: '0.5rem', borderBottom: isLogin ? '2px solid #2563eb' : 'none',
            background: 'transparent', cursor: 'pointer', fontWeight: isLogin ? 'bold' : 'normal'
          }}
        >
          Login
        </button>
        <button 
          onClick={() => setIsLogin(false)}
          style={{
            flex: 1, padding: '0.5rem', borderBottom: !isLogin ? '2px solid #2563eb' : 'none',
            background: 'transparent', cursor: 'pointer', fontWeight: !isLogin ? 'bold' : 'normal'
          }}
        >
          Register
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem' }}>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required 
                 style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}/>
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.25rem' }}>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required 
                 style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box' }}/>
        </div>
        {error && <div style={{ color: '#dc2626', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
        <button type="submit" style={{
          width: '100%', backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '0.75rem',
          borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer'
        }}>
          {isLogin ? 'Sign In' : 'Create Account'}
        </button>
      </form>
    </div>
  );
};