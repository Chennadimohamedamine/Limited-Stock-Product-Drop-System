import { useState, useCallback } from 'react';
import { User } from '../types';
import * as authApi from '../api/authApi';

interface AuthState {
  token: string | null;
  user: User | null;
}

// Helper to extract userId from JWT token
function extractUserIdFromToken(token: string): string | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload));
    return decoded.userId || null;
  } catch {
    return null;
  }
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

  // Validate token on mount
  if (state.token && !state.user) {
    const userId = extractUserIdFromToken(state.token);
    if (!userId) {
      console.warn('Invalid token - clearing auth');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      setState({ token: null, user: null });
    }
  }

  const persist = useCallback((token: string, user: User) => {
    // Validate token contains correct userId
    const tokenUserId = extractUserIdFromToken(token);
    if (!tokenUserId) {
      throw new Error('Invalid token - missing userId');
    }
    if (tokenUserId !== user.id) {
      throw new Error('Token userId mismatch with user id');
    }

    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(user));
    setState({ token, user });
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await authApi.login(email, password);
        persist(res.token, res.user);
        return res;
      } catch (err) {
        console.error('Login error:', err);
        throw err;
      }
    },
    [persist]
  );

  const register = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await authApi.register(email, password);
        persist(res.token, res.user);
        return res;
      } catch (err) {
        console.error('Register error:', err);
        throw err;
      }
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