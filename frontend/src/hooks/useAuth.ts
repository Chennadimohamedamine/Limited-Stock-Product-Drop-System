import { useState, useCallback } from 'react';
import { User } from '../types';
import * as authApi from '../api/authApi';

interface AuthState {
  token: string | null;
  user: User | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    token: sessionStorage.getItem('token'),
    user: (() => {
      try {
        const u = sessionStorage.getItem('user');
        return u ? (JSON.parse(u) as User) : null;
      } catch {
        return null;
      }
    })(),
  });

  const persist = useCallback((token: string, user: User) => {
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(user));
    setState({ token, user });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login(email, password);
      persist(res.token, res.user);
      return res;
    },
    [persist]
  );

  const register = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.register(email, password);
      persist(res.token, res.user);
      return res;
    },
    [persist]
  );

  const logout = useCallback(() => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setState({ token: null, user: null });
  }, []);

  return { token: state.token, user: state.user, login, register, logout };
}
