import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

export const checkoutApi = {
  checkout: (reservationId: string, token: string) =>
    axios.post<{ orderId: string }>(
      `${API_URL}/checkout`,
      { reservationId },
      { headers: { Authorization: `Bearer ${token}` } }
    )
};