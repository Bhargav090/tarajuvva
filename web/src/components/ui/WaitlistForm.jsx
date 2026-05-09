import { Input } from './FormField';
import Button from './Button';

export default function WaitlistForm({ config, form, onChange, onSubmit, loading, success }) {
  if (success) {
    return (
      <div className="text-center py-12 px-6 bg-white rounded-2xl border border-[#341631]/10">
        <div className="text-5xl mb-4">✅</div>
        <h3 className="text-2xl font-black text-[#0b4722] font-[Outfit] mb-2">You're on the list!</h3>
        <p className="text-[#341631]/60 font-[Poppins] text-sm">
          We'll notify you as soon as {config.type} goes live.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input label="Full Name" name="name" value={form.name} onChange={onChange} required placeholder="Your full name" />
      <Input label="Email" name="email" type="email" value={form.email} onChange={onChange} required placeholder="you@example.com" />
      <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={onChange} placeholder="+91 98765 43210" />
      <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
        {config.ctaLabel}
      </Button>
    </form>
  );
}
