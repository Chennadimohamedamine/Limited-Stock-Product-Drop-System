import { useState, useEffect, useCallback } from 'react';
import { Product } from '../types';
import { getProduct } from '../api/productApi';

const POLL_INTERVAL = 5000;

interface UseStockResult {
  product: Product | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useStock(productId: string | null): UseStockResult {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    // Don't fetch if productId is null or empty
    if (!productId) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await getProduct(productId);
      setProduct(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetch();
    const interval = setInterval(fetch, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetch]);

  return { product, isLoading, error, refetch: fetch };
}