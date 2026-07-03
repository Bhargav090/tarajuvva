import { useEffect, useState } from 'react';
import api from '../utils/api';
import { resolveChartKey } from '../utils/sizeConstants';

export function useSizeChart(product) {
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(false);
  const key = resolveChartKey(product);

  useEffect(() => {
    if (!key) {
      setChart(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get(`/shop/size-charts/${key}`)
      .then((r) => {
        if (!cancelled) setChart(r.data.chart || null);
      })
      .catch(() => {
        if (!cancelled) setChart(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, product?.id]);

  const canShow = Boolean(chart?.rows?.length && chart?.columns?.length);

  return { chart, loading, canShow, chartKey: key };
}
