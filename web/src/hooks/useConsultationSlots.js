import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { toISODateString } from '../utils/dates';

export function useConsultationSlotDates() {
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/settings/consultation-slots/dates')
      .then((r) => {
        const configured = (r.data.dates || [])
          .map(toISODateString)
          .filter(Boolean);
        // Only dates returned by admin-configured slots (no inferred ranges).
        setDates([...new Set(configured)]);
      })
      .catch(() => setDates([]))
      .finally(() => setLoading(false));
  }, []);

  return { dates, loading };
}

export function useConsultationSlotsForDate(date) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!date) {
      setSlots([]);
      return;
    }
    setLoading(true);
    api.get('/settings/consultation-slots', { params: { date } })
      .then((r) => setSlots(r.data.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [date]);

  return { slots, loading };
}

export function useAdminConsultationSlots() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const authHeader = { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/consultation-slots', { headers: authHeader });
      setSlots(data.slots || []);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const preview = async (params) => {
    try {
      const { data } = await api.post('/admin/consultation-slots/preview', params, { headers: authHeader });
      return { ok: true, slots: data.slots || [] };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message || 'Could not generate slots.' };
    }
  };

  const create = async (slotsToCreate) => {
    setSubmitting(true);
    try {
      const { data } = await api.post(
        '/admin/consultation-slots',
        { slots: slotsToCreate },
        { headers: authHeader }
      );
      setSlots(data.slots || []);
      return { ok: true, created: data.created, skipped: data.skipped };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message || 'Could not create slots.' };
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/admin/consultation-slots/${id}`, { headers: authHeader });
      setSlots((prev) => prev.filter((s) => s.id !== id));
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message || 'Could not delete slot.' };
    }
  };

  const bulkDelete = async ({ slot_ids, from_date, to_date }) => {
    setSubmitting(true);
    try {
      const { data } = await api.post(
        '/admin/consultation-slots/bulk-delete',
        { slot_ids, from_date, to_date },
        { headers: authHeader }
      );
      await load();
      return { ok: true, deleted: data.deleted, skipped: data.skipped };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message || 'Could not delete slots.' };
    } finally {
      setSubmitting(false);
    }
  };

  return { slots, loading, submitting, preview, create, remove, bulkDelete, reload: load };
}
