import { useState, useEffect } from 'react';
import api from '../utils/api';
import { DELIVERY_FEES } from '../utils/delivery';

const DEFAULTS = {
  shop: { ...DELIVERY_FEES.shop },
  reimagine: { ...DELIVERY_FEES.reimagine },
};

export function useDeliverySettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/settings/delivery')
      .then((r) => {
        if (r.data.settings) setSettings(r.data.settings);
      })
      .catch(() => setSettings(DEFAULTS))
      .finally(() => setLoading(false));
  }, []);

  return { settings, loading };
}

export function useAdminDeliverySettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const authHeader = { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };

  const load = () => {
    setLoading(true);
    api
      .get('/admin/settings/delivery', { headers: authHeader })
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
      const { data } = await api.put('/admin/settings/delivery', payload, { headers: authHeader });
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
