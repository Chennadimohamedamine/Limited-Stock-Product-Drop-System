import api from './client';
import { AuthResponse } from '../types';

export async function register(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/register', { email, password });
  return res.data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/auth/login', { email, password });
  return res.data;
}
