import { useState, useEffect } from 'react';
import api from '../utils/api';

export function useProducts({ featured, limit, category } = {}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (featured) params.set('featured', '1');
    if (limit)    params.set('limit', String(limit));
    if (category) params.set('category', category);

    api.get(`/shop/products?${params}`)
      .then((r) => {
        const list = r.data?.products;
        if (!Array.isArray(list)) {
          console.error('[useProducts] Unexpected response shape', r.data);
          setProducts([]);
          return;
        }
        setProducts(list);
      })
      .catch((err) => {
        console.error('[useProducts]', err.response?.status, err.response?.data || err.message);
        setProducts([]);
      })
      .finally(() => setLoading(false));
  }, [featured, limit, category]);

  return { products, loading };
}
