import React, { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthModal } from './components/AuthModal';
import { DropPage } from './pages/DropPage';
import { productApi } from './api/productApi';

export const App: React.FC = () => {
  const { token, login, register } = useAuth();
  const [targetProductId, setTargetProductId] = useState<string | null>(null);

  useEffect(() => {
    productApi.getProducts()
      .then(res => {
        if (res.data && res.data.length > 0) {
          setTargetProductId(res.data[0].id);
        }
      })
      .catch(err => console.error('Bootstrap failure fetching catalog', err));
  }, []);

  if (!token) {
    return <AuthModal onLogin={login} onRegister={register} />;
  }

  if (!targetProductId) {
    return <div style={{ textAlign: 'center', marginTop: '4rem' }}>Initializing active store allocations...</div>;
  }

  return <DropPage token={token} productId={targetProductId} />;
};