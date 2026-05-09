import { useState } from 'react';
import api from '../utils/api';

export function useWaitlist(type) {
  const [form, setForm]       = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/waitlist', { ...form, type });
      setSuccess(true);
      setForm({ name: '', email: '', phone: '' });
    } finally {
      setLoading(false);
    }
  };

  return { form, onChange, onSubmit, loading, success };
}
