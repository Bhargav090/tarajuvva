import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { uploadUrl } from '../utils/uploadUrl';

const EMPTY = { garments: {}, presets: {} };

export function useReimagineImages() {
  const [images, setImages] = useState(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/settings/reimagine-images')
      .then((r) => setImages({ garments: r.data.garments || {}, presets: r.data.presets || {} }))
      .catch(() => setImages(EMPTY))
      .finally(() => setLoading(false));
  }, []);

  const garmentImage = (garmentId, fallback) => {
    const path = images.garments[garmentId];
    return path ? uploadUrl(path) : fallback;
  };

  const presetImage = (garmentId, transformation, fallback) => {
    const path = images.presets[garmentId]?.[transformation];
    return path ? uploadUrl(path) : fallback;
  };

  return { loading, garmentImage, presetImage };
}

export function useAdminReimagineImages() {
  const [garments, setGarments] = useState([]);
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState(null);
  const authHeader = { Authorization: `Bearer ${localStorage.getItem('admin_token')}` };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/reimagine-images', { headers: authHeader });
      setGarments(data.garments || []);
      setPresets(data.presets || []);
    } catch {
      setGarments([]);
      setPresets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const slotKey = (garment_type, transformation = '') => `${garment_type}|${transformation}`;

  const upload = async (garment_type, transformation, file) => {
    const key = slotKey(garment_type, transformation);
    setUploadingKey(key);
    try {
      const form = new FormData();
      form.append('image', file);
      form.append('garment_type', garment_type);
      form.append('transformation', transformation);
      const { data } = await api.post('/admin/reimagine-images', form, {
        headers: { ...authHeader, 'Content-Type': 'multipart/form-data' },
      });
      const row = data.image;
      const patch = (list) =>
        list.map((s) =>
          s.garment_type === garment_type && (s.transformation || '') === (transformation || '')
            ? { ...s, id: row.id, image_path: row.image_path, updated_at: row.updated_at }
            : s
        );
      if (transformation) setPresets(patch);
      else setGarments(patch);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message || 'Upload failed.' };
    } finally {
      setUploadingKey(null);
    }
  };

  const remove = async (garment_type, transformation = '') => {
    const key = slotKey(garment_type, transformation);
    setUploadingKey(key);
    try {
      await api.delete('/admin/reimagine-images/slot', {
        headers: authHeader,
        data: { garment_type, transformation },
      });
      const patch = (list) =>
        list.map((s) =>
          s.garment_type === garment_type && (s.transformation || '') === (transformation || '')
            ? { ...s, id: null, image_path: null, updated_at: null }
            : s
        );
      if (transformation) setPresets(patch);
      else setGarments(patch);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message || 'Remove failed.' };
    } finally {
      setUploadingKey(null);
    }
  };

  return { garments, presets, loading, uploadingKey, upload, remove, reload: load };
}
