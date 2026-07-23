import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { TESTIMONIALS } from '../utils/constants';
import { uploadUrl } from '../utils/uploadUrl';

function mapTestimonial(row) {
  const paths = Array.isArray(row.image_paths)
    ? row.image_paths
    : row.image_path
      ? [row.image_path]
      : [];
  return {
    id: row.id,
    name: row.name,
    city: row.city,
    quote: row.quote,
    vertical: row.vertical === 'shop' ? 'shop' : 'reimagine',
    images: paths.map((p) => uploadUrl(p)).filter(Boolean),
    googleReviewUrl: row.google_review_url || null,
  };
}

/** Prefer 1 Shop + 2 Reimagine testimonials for the homepage carousel. */
function pickHomeTestimonials(list) {
  const shop = list.filter((t) => t.vertical === 'shop');
  const reimagine = list.filter((t) => t.vertical !== 'shop');
  const picked = [...shop.slice(0, 1), ...reimagine.slice(0, 2)];
  if (picked.length >= 3) return picked;
  const rest = list.filter((t) => !picked.includes(t));
  return [...picked, ...rest].slice(0, 3);
}

/** Public — DB testimonials when present, else built-in defaults. */
export function useTestimonials() {
  const [items, setItems] = useState(
    pickHomeTestimonials(TESTIMONIALS.map((t, i) => ({ ...t, id: `default-${i}`, images: [], googleReviewUrl: null })))
  );
  const [loading, setLoading] = useState(true);
  const [fromDb, setFromDb] = useState(false);

  useEffect(() => {
    api.get('/settings/testimonials')
      .then((r) => {
        const rows = r.data.testimonials || [];
        if (rows.length > 0) {
          setItems(pickHomeTestimonials(rows.map(mapTestimonial)));
          setFromDb(true);
        } else {
          setItems(
            pickHomeTestimonials(
              TESTIMONIALS.map((t, i) => ({ ...t, id: `default-${i}`, images: [], googleReviewUrl: null }))
            )
          );
          setFromDb(false);
        }
      })
      .catch(() => {
        setItems(
          pickHomeTestimonials(
            TESTIMONIALS.map((t, i) => ({ ...t, id: `default-${i}`, images: [], googleReviewUrl: null }))
          )
        );
        setFromDb(false);
      })
      .finally(() => setLoading(false));
  }, []);

  return { testimonials: items, loading, fromDb };
}

export function useAdminTestimonials() {
  const [testimonials, setTestimonials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const authHeader = { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/testimonials', { headers: authHeader });
      setTestimonials(data.testimonials || []);
    } catch {
      setTestimonials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (payload, { id, imageSlots } = {}) => {
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('name', payload.name);
      form.append('city', payload.city);
      form.append('quote', payload.quote);
      form.append('vertical', payload.vertical === 'shop' ? 'shop' : 'reimagine');
      form.append('google_review_url', payload.google_review_url || '');
      form.append('sort_order', String(payload.sort_order ?? 0));
      form.append('is_active', payload.is_active ? '1' : '0');

      (imageSlots || []).forEach((slot, i) => {
        if (slot.file) form.append(`image_${i}`, slot.file);
        else if (slot.existingPath) form.append(`retain_${i}`, slot.existingPath);
      });

      if (id) {
        const { data } = await api.put(`/admin/testimonials/${id}`, form, {
          headers: { ...authHeader, 'Content-Type': 'multipart/form-data' },
        });
        setTestimonials((prev) => prev.map((t) => (t.id === id ? data.testimonial : t)));
      } else {
        const { data } = await api.post('/admin/testimonials', form, {
          headers: { ...authHeader, 'Content-Type': 'multipart/form-data' },
        });
        setTestimonials((prev) => [...prev, data.testimonial].sort((a, b) => a.sort_order - b.sort_order));
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message || 'Save failed.' };
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/admin/testimonials/${id}`, { headers: authHeader });
      setTestimonials((prev) => prev.filter((t) => t.id !== id));
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message || 'Delete failed.' };
    }
  };

  return { testimonials, loading, submitting, save, remove, reload: load };
}
