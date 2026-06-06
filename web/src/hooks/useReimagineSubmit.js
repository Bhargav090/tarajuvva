import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../utils/api';

const VALID_STEPS = [0, 1, 3];

function parseStep(raw) {
  const n = Number(raw);
  return VALID_STEPS.includes(n) ? n : 0;
}

export function useReimagineSubmit() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const step = parseStep(searchParams.get('step'));
  const garment = searchParams.get('garment') || '';
  const transformation = searchParams.get('transformation') || '';

  const [files, setFiles] = useState([]);
  const [details, setDetails] = useState({
    user_name: '',
    user_phone: '',
    user_email: '',
    address: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Guard invalid deep-links (e.g. step=3 without prior selections).
  useEffect(() => {
    if (done) return;
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
  }, [step, garment, transformation, done, setSearchParams]);

  const goToStep = useCallback(
    (newStep, extra = {}, { replace = false } = {}) => {
      const params = new URLSearchParams(searchParams);
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

  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

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

  const onSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('garment_type', garment);
      fd.append('transformation', transformation);
      fd.append('is_custom', transformation === 'Custom' ? '1' : '0');
      Object.entries(details).forEach(([k, v]) => fd.append(k, v ?? ''));
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

  return {
    step,
    goToStep,
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
