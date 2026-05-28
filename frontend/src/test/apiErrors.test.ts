import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/client', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

import api from '../api/client';
import { reserve } from '../api/reserveApi';
import { checkout } from '../api/checkoutApi';
import { login } from '../api/authApi';

const mockPost = vi.mocked(api.post);

beforeEach(() => { vi.clearAllMocks(); });

describe('API error handling', () => {
  it('reserve throws on 409 insufficient stock', async () => {
    mockPost.mockRejectedValueOnce(new Error('Insufficient stock'));
    await expect(reserve('product-1', 1)).rejects.toThrow('Insufficient stock');
  });

  it('reserve throws on network failure', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network error'));
    await expect(reserve('product-1', 1)).rejects.toThrow('Network error');
  });

  it('reserve throws on timeout', async () => {
    mockPost.mockRejectedValueOnce(new Error('Request timed out'));
    await expect(reserve('product-1', 1)).rejects.toThrow('Request timed out');
  });

  it('checkout throws on expired reservation', async () => {
    mockPost.mockRejectedValueOnce(new Error('Reservation has expired'));
    await expect(checkout('reservation-1')).rejects.toThrow('Reservation has expired');
  });

  it('checkout throws on already completed reservation', async () => {
    mockPost.mockRejectedValueOnce(new Error('Reservation already completed'));
    await expect(checkout('reservation-1')).rejects.toThrow('Reservation already completed');
  });

  it('login throws on wrong credentials', async () => {
    mockPost.mockRejectedValueOnce(new Error('Invalid email or password'));
    await expect(login('bad@email.com', 'wrongpass')).rejects.toThrow('Invalid email or password');
  });

  it('reserve returns data on success', async () => {
    const mockReservation = {
      reservationId: 'res-123',
      expiresAt: new Date(Date.now() + 300_000).toISOString(),
      status: 'PENDING',
    };
    mockPost.mockResolvedValueOnce({ data: mockReservation });
    const result = await reserve('product-1', 1);
    expect(result.reservationId).toBe('res-123');
    expect(result.status).toBe('PENDING');
  });
});
