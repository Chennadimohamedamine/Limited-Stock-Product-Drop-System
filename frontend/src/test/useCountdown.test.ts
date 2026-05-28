import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCountdown } from '../hooks/useCountdown';

describe('useCountdown', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns 0 and not expired when expiresAt is null', () => {
    const { result } = renderHook(() => useCountdown(null));
    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.isExpired).toBe(false);
    expect(result.current.formatted).toBe('00:00');
  });

  it('counts down correctly and formats MM:SS', () => {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    const { result } = renderHook(() => useCountdown(expiresAt));

    expect(result.current.secondsLeft).toBeGreaterThan(295);
    expect(result.current.formatted).toMatch(/^\d{2}:\d{2}$/);

    // Advance 60 seconds
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(result.current.secondsLeft).toBeLessThan(241);
  });

  it('sets isExpired when time runs out', () => {
    const expiresAt = new Date(Date.now() + 2000).toISOString();
    const { result } = renderHook(() => useCountdown(expiresAt));

    expect(result.current.isExpired).toBe(false);

    act(() => { vi.advanceTimersByTime(3000); });
    expect(result.current.secondsLeft).toBe(0);
    expect(result.current.isExpired).toBe(true);
  });

  it('shows urgent format correctly', () => {
    const expiresAt = new Date(Date.now() + 90 * 1000).toISOString();
    const { result } = renderHook(() => useCountdown(expiresAt));
    expect(result.current.formatted).toBe('01:30');
  });
});
