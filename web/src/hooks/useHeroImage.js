import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export function useHeroImage(context = 'home') {
  const [hero, setHero] = useState(null);
  const [loading, setLoading] = useState(true);
  const endpoint = context === 'reimagine' ? '/settings/reimagine-hero' : '/settings/hero';

  useEffect(() => {
    api.get(endpoint)
      .then((r) => setHero(r.data.hero || null))
      .catch(() => setHero(null))
      .finally(() => setLoading(false));
  }, [endpoint]);

  return { hero, loading };
}

export function useReimagineHeroImage() {
  return useHeroImage('reimagine');
}

export function useAdminHeroImages(context = 'home') {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const authHeader = { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/hero-images', {
        headers: authHeader,
        params: { context },
      });
      setImages(data.images || []);
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, [context]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = async (file) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      form.append('context', context);
      const { data } = await api.post('/admin/hero-images', form, {
        headers: { ...authHeader, 'Content-Type': 'multipart/form-data' },
        params: { context },
      });
      setImages((prev) => [data.image, ...prev]);
      return { ok: true, image: data.image };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message || 'Upload failed.' };
    } finally {
      setUploading(false);
    }
  };

  const activate = async (id) => {
    try {
      const { data } = await api.patch(`/admin/hero-images/${id}/activate`, {}, { headers: authHeader });
      setImages((prev) =>
        prev.map((img) => ({ ...img, is_active: img.id === id ? 1 : 0 }))
      );
      return { ok: true, image: data.image };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message || 'Could not activate image.' };
    }
  };

  return { images, loading, uploading, upload, activate, reload: load };
}
