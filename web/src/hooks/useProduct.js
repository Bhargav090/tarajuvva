import { useState, useEffect } from 'react';
import api from '../utils/api';

export function useProduct(id) {
  const [product, setProduct] = useState(null);
  const [sizeChart, setSizeChart] = useState(null);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setSizeChart(null);
    setRecommended([]);
    api.get(`/shop/products/${id}`)
      .then((r) => {
        setProduct(r.data.product);
        setSizeChart(r.data.size_chart || null);
        setRecommended(Array.isArray(r.data.recommended) ? r.data.recommended : []);
      })
      .catch(() => {
        setProduct(null);
        setSizeChart(null);
        setRecommended([]);
      })
      .finally(() => setLoading(false));
  }, [id]);

  return { product, sizeChart, recommended, loading };
}
