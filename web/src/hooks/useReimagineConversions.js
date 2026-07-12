import { useCallback, useEffect, useState } from 'react';
import api from '../utils/api';

export function useReimagineConversions({ admin = false } = {}) {
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = admin ? '/reimagine/admin/conversions' : '/reimagine/conversions';
      const headers = admin
        ? { Authorization: `Bearer ${localStorage.getItem('admin_token')}` }
        : undefined;
      const { data } = await api.get(url, { headers });
      setConversions(data.conversions || []);
    } catch (err) {
      setError(err);
      setConversions([]);
    } finally {
      setLoading(false);
    }
  }, [admin]);

  useEffect(() => {
    load();
  }, [load]);

  const fromOptions = (() => {
    const map = new Map();
    for (const c of conversions) {
      const key = c.from_label;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          label: c.from_label,
          image: c.from_image || null,
        });
        continue;
      }
      // Prefer a real image if the first conversion for this label had none
      const existing = map.get(key);
      if (!existing.image && c.from_image) {
        existing.image = c.from_image;
      }
    }
    return [...map.values()];
  })();

  const optionsForFrom = (fromLabel) =>
    conversions.filter((c) => c.from_label === fromLabel && (admin || c.active));

  return { conversions, fromOptions, optionsForFrom, loading, error, reload: load };
}
