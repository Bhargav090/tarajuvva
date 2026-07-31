import { useState, useEffect } from 'react';
import api from '../utils/api';

export function useProduct(id) {
  const [product, setProduct] = useState(null);
  const [sizeChart, setSizeChart] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setSizeChart(null);
    api.get(`/shop/products/${id}`)
      .then((r) => {
        setProduct(r.data.product);
        setSizeChart(r.data.size_chart || null);
      })
      .catch(() => {
        setProduct(null);
        setSizeChart(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  return { product, sizeChart, loading };
}
