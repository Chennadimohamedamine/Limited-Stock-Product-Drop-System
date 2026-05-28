import axios from 'axios';
import { Reservation } from '../types';

const API_URL = 'http://localhost:3000/api';

export const reserveApi = {
  reserve: (productId: string, quantity: number, token: string) =>
    axios.post<Reservation>(
      `${API_URL}/reserve`,
      { productId, quantity },
      { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
    )
};