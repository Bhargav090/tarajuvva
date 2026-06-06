import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

export default function LeadCapture({ type, testId, variant = 'default' }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async e => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/waitlist', {
        type,
        email: email.trim(),
        phone: phone.trim() || undefined,
        name: email.trim().split('@')[0],
      });
      toast.success(data.message || "You're on the list.");
      setEmail('');
      setPhone('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    'px-4 py-3 border border-black bg-white text-sm text-[#0a0a0a] placeholder:text-black/45 focus:outline-none focus:ring-2 focus:ring-black rounded-none';

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col sm:flex-row gap-2"
      data-testid={testId}
    >
      <input
        required
        type="email"
        placeholder="you@inbox.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className={`${inputClass} flex-1 min-w-0`}
      />
      <input
        type="tel"
        placeholder="Phone (optional)"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        className={`${inputClass} w-full sm:w-44 shrink-0`}
      />
      <button
        type="submit"
        disabled={loading}
        className="tj-btn-ink shrink-0 disabled:opacity-60"
      >
        {loading ? '…' : 'Notify me'}
      </button>
    </form>
  );
}
