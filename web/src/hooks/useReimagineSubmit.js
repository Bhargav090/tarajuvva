import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const VALID_STEPS = [0, 1, 3];

function parseStep(raw) {
  const n = Number(raw);
  return VALID_STEPS.includes(n) ? n : 0;
}

function emptyDetails() {
  return {
    user_name: '',
    user_phone: '',
    user_email: '',
    address: '',
    notes: '',
  };
}

export function useReimagineSubmit() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isCustomize = searchParams.get('mode') === 'customize';
  const step = isCustomize ? 3 : parseStep(searchParams.get('step'));
  const garment = searchParams.get('garment') || '';
  const transformation = searchParams.get('transformation') || '';

  const [files, setFiles] = useState([]);
  const [details, setDetails] = useState(emptyDetails);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (prefilled || !user) return;
    setDetails((p) => ({
      ...p,
      user_name: p.user_name || user.name || '',
      user_email: p.user_email || user.email || '',
      user_phone: p.user_phone || user.phone || '',
      address: p.address || user.address || '',
    }));
    setPrefilled(true);
  }, [user, prefilled]);

  useEffect(() => {
    if (done || isCustomize) return;
    if (step === 1 && !garment) {
      setSearchParams({}, { replace: true });
    } else if (step === 3 && (!garment || !transformation)) {
      const params = new URLSearchParams();
      if (garment) {
        params.set('step', '1');
        params.set('garment', garment);
      }
      setSearchParams(params, { replace: true });
    }
  }, [step, garment, transformation, done, isCustomize, setSearchParams]);

  const goToStep = useCallback(
    (newStep, extra = {}, { replace = false } = {}) => {
      const params = new URLSearchParams(searchParams);
      params.delete('mode');
      params.set('step', String(newStep));

      if ('garment' in extra) {
        if (extra.garment) params.set('garment', extra.garment);
        else params.delete('garment');
      }
      if ('transformation' in extra) {
        if (extra.transformation) params.set('transformation', extra.transformation);
        else params.delete('transformation');
      }

      setSearchParams(params, { replace });
    },
    [searchParams, setSearchParams],
  );

  const startCustomize = useCallback(() => {
    setSearchParams({ mode: 'customize' }, { replace: false });
  }, [setSearchParams]);

  const exitCustomize = useCallback(() => {
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const goBack = useCallback(() => {
    if (isCustomize) {
      exitCustomize();
      return;
    }
    navigate(-1);
  }, [navigate, isCustomize, exitCustomize]);

  const setGarment = useCallback(
    (id) => goToStep(1, { garment: id }),
    [goToStep],
  );

  const setTransformation = useCallback(
    (t) => goToStep(3, { transformation: t }),
    [goToStep],
  );

  const addFiles = (newFiles) => setFiles((p) => [...p, ...newFiles]);
  const removeFile = (idx) => setFiles((p) => p.filter((_, i) => i !== idx));

  const submitRequest = async (payload) => {
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(payload.fields).forEach(([k, v]) => fd.append(k, v ?? ''));
      files.forEach((f) => fd.append('images', f));

      await api.post('/reimagine/requests', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setDone(true);
    } catch (err) {
      toast.error(
        err.response?.data?.message || 'Could not submit your request. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e) => {
    e?.preventDefault();

    if (isCustomize) {
      await submitRequest({
        fields: {
          garment_type: 'customize',
          transformation: 'Customize Consultation',
          is_consultation: '1',
          is_custom: '1',
          ...details,
        },
      });
      return;
    }

    await submitRequest({
      fields: {
        garment_type: garment,
        transformation,
        is_custom: transformation === 'Custom' ? '1' : '0',
        ...details,
      },
    });
  };

  return {
    step,
    isCustomize,
    goToStep,
    startCustomize,
    exitCustomize,
    goBack,
    garment,
    setGarment,
    transformation,
    setTransformation,
    files,
    addFiles,
    removeFile,
    details,
    setDetails,
    onSubmit,
    loading,
    done,
  };
}
