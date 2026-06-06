import { useState } from 'react';
import toast from 'react-hot-toast';
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
  const [placedOrderId, setPlacedOrderId] = useState(null);

  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const onSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const orderItems = items.map(({ id, qty, size }) => ({ id, qty, ...(size ? { size } : {}) }));
      const { data } = await api.post('/shop/orders', { ...form, items: orderItems, total });
      setPlacedOrderId(data.order?.id || null);
      setDone(true);
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not place order');
    } finally {
      setLoading(false);
    }
  };

  return { form, onChange, onSubmit, loading, done, placedOrderId };
}
