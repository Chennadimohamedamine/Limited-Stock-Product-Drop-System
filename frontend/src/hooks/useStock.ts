import { useState, useEffect } from 'react';
import { Product } from '../types';
import { productApi } from '../api/productApi';

export function useStock(productId: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const fetchStock = async () => {
      try {
        const res = await productApi.getProduct(productId);
        if (isMounted) {
          setProduct(res.data);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setError('Connection error. Retrying...');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchStock();
    const interval = setInterval(fetchStock, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [productId]);

  return { product, isLoading, error };
}