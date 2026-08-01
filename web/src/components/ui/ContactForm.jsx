import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const inputClass =
  'w-full px-3.5 py-3 border border-black bg-white text-sm text-[#0a0a0a] placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-black rounded-none font-body';

export default function ContactForm({ onSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.post('/contact', {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        message: message.trim(),
      });
      toast.success(data.message || 'Thanks — we got your message.');
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3" data-testid="contact-form">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="sr-only">
            Name
          </label>
          <input
            id="contact-name"
            required
            type="text"
            name="name"
            autoComplete="name"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="sr-only">
            Email
          </label>
          <input
            id="contact-email"
            required
            type="email"
            name="email"
            autoComplete="email"
            placeholder="you@inbox.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="contact-phone" className="sr-only">
          Phone
        </label>
        <input
          id="contact-phone"
          type="tel"
          name="phone"
          autoComplete="tel"
          placeholder="Phone (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="contact-message" className="sr-only">
          Message
        </label>
        <textarea
          id="contact-message"
          required
          name="message"
          rows={4}
          placeholder="How can we help?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${inputClass} resize-none min-h-[6.5rem]`}
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="tj-btn-ink w-full sm:w-auto disabled:opacity-60"
      >
        {loading ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
