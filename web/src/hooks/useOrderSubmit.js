import { useState } from 'react';
import api from '../utils/api';

export function useOrderSubmit({ items, total, user, onSuccess }) {
  const [form, setForm] = useState({
    user_name:  user?.name  || '',
    user_email: user?.email || '',
    user_phone: user?.phone || '',
    address:    user?.address || '',
    notes:      '',
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/shop/orders', { ...form, items, total });
      setDone(true);
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  };

  return { form, onChange, onSubmit, loading, done };
}
