import axios from 'axios';
import { AuthResponse } from '../types';

const API_URL = 'http://localhost:3000/api';

export const authApi = {
  login: (email: string, password: string) => 
    axios.post<AuthResponse>(`${API_URL}/auth/login`, { email, password }),
  register: (email: string, password: string) => 
    axios.post<AuthResponse>(`${API_URL}/auth/register`, { email, password })
};
