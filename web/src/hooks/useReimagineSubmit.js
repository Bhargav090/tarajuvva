import { useState } from 'react';
import api from '../utils/api';

export function useReimagineSubmit() {
  const [step, setStep]               = useState(0);
  const [garment, setGarment]         = useState('');
  const [transformation, setTransformation] = useState('');
  const [files, setFiles]             = useState([]);
  const [details, setDetails]         = useState({ user_name: '', user_phone: '', user_email: '', address: '', notes: '' });
  const [loading, setLoading]         = useState(false);
  const [done, setDone]               = useState(false);

  const addFiles = newFiles => setFiles(p => [...p, ...newFiles]);
  const removeFile = idx    => setFiles(p => p.filter((_, i) => i !== idx));

  const onSubmit = async e => {
    e?.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('garment_type', garment);
      fd.append('transformation', transformation);
      Object.entries(details).forEach(([k, v]) => fd.append(k, v));
      files.forEach(f => fd.append('images', f));

      await api.post('/reimagine/requests', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  return { step, setStep, garment, setGarment, transformation, setTransformation, files, addFiles, removeFile, details, setDetails, onSubmit, loading, done };
}
