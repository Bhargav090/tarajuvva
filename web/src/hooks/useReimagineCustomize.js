import { useState, useEffect } from 'react';
import api from '../utils/api';

const DEFAULTS = {
  price: 199,
  feature: '15 min consultation call',
  description:
    'Book a one-on-one call with our remake team. Show us your garment, share references, and get a clear plan — fit, fabric, timeline, and quote — before we cut a single thread.',
};

export function useReimagineCustomizeSettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/settings/reimagine-customize')
      .then((r) => {
        if (r.data.settings) setSettings(r.data.settings);
      })
      .catch(() => setSettings(DEFAULTS))
      .finally(() => setLoading(false));
  }, []);

  return { settings, loading };
}

export function useAdminReimagineCustomizeSettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const authHeader = { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };

  const load = () => {
    setLoading(true);
    api.get('/admin/settings/reimagine-customize', { headers: authHeader })
      .then((r) => setSettings(r.data.settings || DEFAULTS))
      .catch(() => setSettings(DEFAULTS))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (payload) => {
    setSubmitting(true);
    try {
      const { data } = await api.put('/admin/settings/reimagine-customize', payload, { headers: authHeader });
      setSettings(data.settings);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message || 'Save failed.' };
    } finally {
      setSubmitting(false);
    }
  };

  return { settings, loading, submitting, save, reload: load };
}
